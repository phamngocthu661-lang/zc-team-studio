'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { scanBatchInputs, scanFolder, inspectFile } = require('./media-scanner');
const { planStockSegments, InsufficientStockError, createDurationStockAllocator } = require('./stock-planner');
const { planImageSegments } = require('./image-planner');
const {
  buildRenderPlan,
  buildPrefixConcatArguments,
  buildStagedRenderPlan,
  buildLayerCacheArguments,
  rebuildWithBitrate,
  rebuildWithoutCuda,
  rebuildConservativeNvenc,
  rebuildWithGpu,
  rebuildWithCpu,
  isCudaPipelineError,
  isFfmpegProcessCrash,
  isNvencInitError,
  isPascalGtx10,
  isFullGpuMode,
  subtitleStyle
} = require('./render-planner');
const { moveFile, replaceFile } = require('./file-ops');
const { ensureDirectory, uniqueDestination } = require('./path-utils');
const { writeReport, writeCsvReport, formatDuration } = require('./report-service');
const { sanitizeFileName, deepMerge, clamp } = require('../../shared/core');
const {
  VIDEO_EXTENSIONS,
  GENTLE_TRANSITIONS,
  BATCH_STATUS,
  JOB_STATUS,
  BACKGROUND_MODE,
  IMAGE_EXTENSIONS,
  STANDARD_CANVAS_WIDTH,
  STANDARD_CANVAS_HEIGHT,
  DEFAULT_TEMPLATE
} = require('../../shared/constants');
const { subtitleFitFontSize, subtitleFontFamily, subtitleFontWeight, subtitleLetterSpacing, subtitleLineHeight, splitLongSrtCues } = require('../../shared/subtitle-preview');

const { subtitleJsonPreviewText, subtitleJsonToSrt, isKaraokeBoxEffect, buildCapCutKaraokeBoxAss } = require('./karaoke-subtitle');

const { ResourceController } = require('./resource-controller');
const { optimizeRenderConfigImageLayers } = require('./image-pre-scaler');

const JOB_GREEN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'];
const JOB_GREEN_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
const JOB_INTRO_EXTENSIONS = new Set([...VIDEO_EXTENSIONS]);
const PROJECT_IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];
const DEFAULT_GREEN_KEY_COLORS = ['0x3DAB47', '0x0CF404', '0x55B757', '0x04AC3C', '0x4C9C4C'];
const DEFAULT_LAYER_CACHE_MAX_BYTES = 8 * 1024 * 1024 * 1024;
const DEFAULT_STOCK_PLAYBACK_RATE = 0.75;
const DEFAULT_STOCK_CLONE_ZOOM = 1.1;
const DEFAULT_SUBTITLE_EXPORT_FONT_SCALE = 1;
const DEFAULT_SUBTITLE_EXPORT_BOX_SCALE = 1;
const MAX_AUTO_SRT_WORKERS = 5;
const SMALL_WHISPER_VRAM_PER_WORKER_MB = 1800;
const SMALL_WHISPER_RAM_PER_WORKER_MB = 2400;
const SMALL_WHISPER_CPU_PER_WORKER = 3;
const MAX_DISCLAIMER_DURATION_MS = 60000;
const DISCLAIMER_TYPES = {
  TYPE_1: 'dis.mp4',
  TYPE_2: 'dis-type2.mp4'
};

function normalizeDisclaimerType(value) {
  const key = String(value || 'TYPE_1').trim().toUpperCase().replace(/[-\s]+/g, '_');
  return DISCLAIMER_TYPES[key] ? key : 'TYPE_1';
}

function sanitizeCanvasSubtitle(subtitle = {}) {
  const family = String(subtitle.fontFamily || subtitle.subtitleFont || 'Arial').trim();
  const bold = subtitle.bold === true || Number(subtitle.fontWeight) >= 700;
  const karaokeBox = isKaraokeBoxEffect(subtitle);
  return {
    ...subtitle,
    subtitleEffect: karaokeBox ? 'karaoke_box' : 'none',
    karaokeBoxColor: String(subtitle.karaokeBoxColor || '#7C00FF'),
    renderer: karaokeBox ? 'libass' : 'canvas',
    stylePreset: karaokeBox ? 'karaoke_box' : 'simple',
    karaoke: karaokeBox,
    fontFamily: ['Arial', 'Calibri', 'Times New Roman'].includes(family) ? family : 'Arial',
    fontWeight: bold ? 700 : 400,
    bold,
    uppercase: subtitle.uppercase === true,
    outlineWidth: Math.max(0, Number.isFinite(Number(subtitle.outlineWidth ?? subtitle.subtitleOutline)) ? Number(subtitle.outlineWidth ?? subtitle.subtitleOutline) : 0),
    outlineColor: subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000',
    color: subtitle.color || subtitle.subtitleColor || '#FFFFFF',
    shadow: 0,
    italic: false,
    letterSpacingEm: 0
  };
}

function summarizeBackgroundSegments(segments = []) {
  const items = Array.isArray(segments) ? segments : [];
  const imageCount = items.filter((segment) => String(segment.mediaType || '').toUpperCase() === 'IMAGE').length;
  const videoCount = items.filter((segment) => String(segment.mediaType || '').toUpperCase() === 'VIDEO').length;
  const transitionCount = items.filter((segment) => segment.transitionIn && String(segment.transitionIn.type || 'none').toLowerCase() !== 'none').length;
  const durationMs = items.reduce((total, segment) => total + Math.max(0, Number(segment.durationMs || 0)), 0);
  return `${items.length} đoạn (${imageCount} ảnh, ${videoCount} video, ${transitionCount} chuyển cảnh, tổng ${formatDuration(durationMs)})`;
}

function cleanupBackgroundStageFiles(stage = {}) {
  for (const chunk of stage.chunks || []) {
    try { if (fs.existsSync(chunk.outputPath)) fs.rmSync(chunk.outputPath, { force: true }); } catch {}
  }
  for (const clip of stage.clips || []) {
    try { if (fs.existsSync(clip.outputPath)) fs.rmSync(clip.outputPath, { force: true }); } catch {}
  }
  try { if (stage.listPath && fs.existsSync(stage.listPath)) fs.rmSync(stage.listPath, { force: true }); } catch {}
  try { if (stage.outputPath && fs.existsSync(stage.outputPath)) fs.rmSync(stage.outputPath, { force: true }); } catch {}
}

function concatListPath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''");
}

function writeConcatList(listPath, files = []) {
  ensureDirectory(path.dirname(listPath));
  const lines = ['ffconcat version 1.0'];
  for (const filePath of files) {
    lines.push(`file '${concatListPath(filePath)}'`);
  }
  fs.writeFileSync(listPath, `${lines.join('\n')}\n`, 'utf8');
}

function nextBackgroundChunkLimit(config = {}) {
  const current = Math.max(8, Number(config.backgroundChunkSegmentLimit || 24));
  if (current <= 8) return null;
  return Math.max(8, Math.floor(current / 2));
}

function resolveBundledDisclaimerPath(type = 'TYPE_1') {
  const fileName = DISCLAIMER_TYPES[normalizeDisclaimerType(type)];
  const khoGreenPath = path.join(path.resolve(__dirname, '../../..'), 'Kho_Green', 'Disclaimer', fileName);
  const packagedPath = process.resourcesPath
    ? path.join(process.resourcesPath, 'disclaimer', fileName)
    : null;
  const sourcePath = path.join(__dirname, '../../../resources/disclaimer', fileName);
  return [khoGreenPath, packagedPath, sourcePath].filter(Boolean).find((candidate) => fs.existsSync(candidate)) || null;
}

function effectiveDisclaimerDurationMs(metadata = {}) {
  const durationMs = Number(metadata.durationMs || 0);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(MAX_DISCLAIMER_DURATION_MS, Math.round(durationMs));
}

function jobGreenKeyForVoice(voicePathOrName) {
  const name = path.basename(String(voicePathOrName || ''));
  return path.basename(name, path.extname(name));
}

function candidateBaseNamesForVoice(voicePathOrName) {
  const base = jobGreenKeyForVoice(voicePathOrName);
  if (!base) return [];
  const out = [base];
  const add = (v) => {
    if (v && !out.includes(v)) out.push(v);
  };
  const stripped = base.replace(/_(KB|SCRIPT|VOICE)$/i, '');
  add(stripped);
  if (/^\d+$/.test(stripped)) {
    add(String(Number(stripped)));
    add(stripped.padStart(3, '0'));
  }
  const leadingNum = stripped.match(/^(\d+)[_-](.+)$/);
  if (leadingNum) {
    add(leadingNum[2]);
    add(leadingNum[1]);
    add(String(Number(leadingNum[1])));
    add(leadingNum[1].padStart(3, '0'));
  }
  return out;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeJobGreenFolder(config = {}) {
  return config.jobGreenFolder || config.greenAssetFolder || '';
}

function normalizeJobIntroFolder(config = {}) {
  return config.jobIntroFolder || config.introVideoFolder || '';
}

function normalizeSingleJobIntroFolder(config = {}) {
  return config.singleJobIntroFolder || config.jobIntroFolder || config.introVideoFolder || '';
}

function normalizeIntroAudioMode(value) {
  const mode = String(value || 'MUTE').trim().toUpperCase();
  return mode === 'KEEP' ? 'KEEP' : 'MUTE';
}

function normalizeIntroTransition(value) {
  const mode = String(value || 'NONE').trim().toUpperCase();
  return mode === 'FADE' ? 'FADE' : 'NONE';
}

function normalizeNoiseSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US');
}

function isIntroNoiseLayer(layer = {}) {
  if (!layer || layer.visible === false || layer.visible === 0) return false;
  const type = layer.type || layer.layerType || layer.layer_type;
  if (!['OVERLAY_VIDEO', 'OVERLAY_IMAGE', 'VIDEO', 'IMAGE'].includes(type)) return false;
  const source = layer.sourceReference || layer.source || layer.source_reference || '';
  if (!source) return false;
  const haystack = normalizeNoiseSearchText(`${layer.name || ''} ${source}`);
  return /\bnoise\b/.test(haystack) || haystack.includes('nhieu');
}

function introNoiseLayerFromConfig(renderConfig = {}) {
  const layers = Array.isArray(renderConfig.layers) ? renderConfig.layers : [];
  return layers.find(isIntroNoiseLayer) || null;
}

function effectiveIntroTransitionMs(prefixItems = [], mainDurationMs = 0, config = {}) {
  if (normalizeIntroTransition(config.jobIntroTransition) !== 'FADE') return 0;
  const requested = Math.max(0, Math.min(3000, Number(config.jobIntroTransitionMs || 0)));
  if (!requested || !prefixItems.length) return 0;
  const durations = [...prefixItems.map((item) => Number(item.durationMs || 0)), Number(mainDurationMs || 0)]
    .filter((duration) => Number.isFinite(duration) && duration > 0);
  if (durations.length < 2) return 0;
  const shortest = Math.min(...durations);
  return Math.max(0, Math.min(requested, shortest - 100));
}

function effectivePrefixDurationMs(prefixItems = [], mainDurationMs = 0, config = {}) {
  const raw = prefixItems.reduce((sum, item) => sum + Number(item.durationMs || 0), 0);
  const transitionMs = effectiveIntroTransitionMs(prefixItems, mainDurationMs, config);
  return Math.max(0, raw - transitionMs * prefixItems.length);
}

function jobGreenEnabled(config = {}) {
  return Boolean(config.enableJobGreenLayer || normalizeJobGreenFolder(config) || config.singleJobGreenPath || config.defaultJobGreenPath);
}

function defaultJobGreenConfig(config = {}) {
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  return {
    x: Math.round(width * 0.04),
    y: Math.round(height * 0.04),
    width: Math.round(width * 0.24),
    height: Math.round(height * 0.24),
    rotation: 0,
    opacity: 1,
    keyColor: DEFAULT_GREEN_KEY_COLORS[0],
    keyColors: DEFAULT_GREEN_KEY_COLORS,
    similarity: 0.22,
    softness: 0.07,
    despillMix: 0.45,
    despillExpand: 0.02,
    loop: true,
    startMs: 0,
    endMs: null
  };
}

function resolveJobGreenAsset(voicePathOrName, config = {}) {
  if (config.singleMode && config.singleJobGreenPath && fs.existsSync(config.singleJobGreenPath)) {
    return config.singleJobGreenPath;
  }
  if (config.defaultJobGreenPath && fs.existsSync(config.defaultJobGreenPath)) {
    return config.defaultJobGreenPath;
  }
  const folder = normalizeJobGreenFolder(config);
  if (!folder) return null;
  const baseCandidates = candidateBaseNamesForVoice(voicePathOrName);
  for (const base of baseCandidates) {
    for (const ext of JOB_GREEN_EXTENSIONS) {
      const candidate = path.join(folder, `${base}${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  try {
    const lowerBases = baseCandidates.map((b) => b.toLocaleLowerCase('en-US'));
    const match = fs.readdirSync(folder)
      .find((name) => lowerBases.includes(path.basename(name, path.extname(name)).toLocaleLowerCase('en-US')) &&
        JOB_GREEN_EXTENSIONS.includes(path.extname(name).toLocaleLowerCase('en-US')));
    return match ? path.join(folder, match) : null;
  } catch {
    return null;
  }
}

function resolveJobIntroAsset(voicePathOrName, config = {}) {
  return resolveJobIntroAssets(voicePathOrName, config)[0] || null;
}

function resolveJobIntroAssets(voicePathOrName, config = {}) {
  const results = [];
  const addResult = (filePath) => {
    if (filePath && fs.existsSync(filePath) && !results.includes(filePath)) results.push(filePath);
  };
  if (config.singleMode && config.singleJobIntroPath) addResult(config.singleJobIntroPath);
  const folder = config.singleMode ? normalizeSingleJobIntroFolder(config) : normalizeJobIntroFolder(config);
  if (!folder) return results;
  const baseCandidates = candidateBaseNamesForVoice(voicePathOrName);
  try {
    const lowerBases = baseCandidates.map((b) => b.toLocaleLowerCase('en-US'));
    for (const name of fs.readdirSync(folder)) {
      const ext = path.extname(name).toLocaleLowerCase('en-US');
      if (!JOB_INTRO_EXTENSIONS.has(ext)) continue;
      const fileBase = path.basename(name, path.extname(name));
      const lowerFileBase = fileBase.toLocaleLowerCase('en-US');
      if (lowerBases.includes(lowerFileBase)) {
        addResult(path.join(folder, name));
        break;
      }
    }
  } catch {
    for (const base of baseCandidates) {
      for (const ext of JOB_INTRO_EXTENSIONS) {
        const target = path.join(folder, `${base}${ext}`);
        if (fs.existsSync(target)) {
          addResult(target);
          break;
        }
      }
      if (results.length) break;
    }
  }
  return results;
}

function normalizeProjectImageFolder(config = {}) {
  return config.projectImageFolder || config.voiceImageFolder || '';
}

function resolveProjectImageAsset(voicePathOrName, config = {}) {
  if (config.singleProjectImagePath && typeof config.singleProjectImagePath === 'string') {
    const ext = path.extname(config.singleProjectImagePath).toLocaleLowerCase('en-US');
    if (fs.existsSync(config.singleProjectImagePath) && PROJECT_IMAGE_EXTENSIONS.includes(ext)) {
      return config.singleProjectImagePath;
    }
  }
  const folder = normalizeProjectImageFolder(config);
  if (!folder || !fs.existsSync(folder)) return null;
  const base = jobGreenKeyForVoice(voicePathOrName);
  const baseCandidates = candidateBaseNamesForVoice(voicePathOrName);
  for (const candBase of baseCandidates) {
    for (const ext of PROJECT_IMAGE_EXTENSIONS) {
      const candidate = path.join(folder, `${candBase}${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  try {
    const lowerBases = baseCandidates.map((b) => b.toLocaleLowerCase('en-US'));
    const files = fs.readdirSync(folder);
    const match = files.find((name) => {
      const ext = path.extname(name).toLocaleLowerCase('en-US');
      return lowerBases.includes(path.basename(name, path.extname(name)).toLocaleLowerCase('en-US')) &&
        PROJECT_IMAGE_EXTENSIONS.includes(ext);
    });
    if (match) return path.join(folder, match);

    // DỰ PHÒNG THÔNG MINH CHO FARM CHUNK:
    // Chỉ fallback khi voice là dạng phân đoạn (voice_0, chunk_0...) hoặc có cờ allowFallbackMatch
    const isChunkVoice = /^(voice|chunk)[_-]\d+$/i.test(base);
    if (isChunkVoice || config.allowFallbackMatch) {
      const fallbackMatch = files.find((name) => {
        const ext = path.extname(name).toLocaleLowerCase('en-US');
        return PROJECT_IMAGE_EXTENSIONS.includes(ext) && !name.startsWith('.');
      });
      if (fallbackMatch) return path.join(folder, fallbackMatch);
    }
  } catch {
    return null;
  }

  return null;
}


function isProjectVoiceImageLayer(layer = {}) {
  const type = layer.type || layer.layerType || layer.layer_type;
  const sourceMode = layer.sourceMode || layer.source_mode;
  return type === 'VOICE_IMAGE' || sourceMode === 'VOICE_IMAGE';
}

function isDirectProjectImageLayer(layer = {}) {
  return layer.dynamicVoiceImage === true;
}

function templateLayersFromTemplate(template) {
  const config = template?.config || template || {};
  return (template?.layers?.length ? template.layers : config.layers || [])
    .filter((layer) => layer && layer.visible !== false && layer.visible !== 0);
}

function templateIdForVoice(voicePathOrName, config = {}) {
  const voiceName = path.basename(String(voicePathOrName || ''));
  return (config.jobTemplates || {})[voiceName] || config.templateId || null;
}

function projectImageMissingMessage(job, config = {}) {
  const voiceName = path.basename(job?.voice_path || job?.voicePath || job?.voice_name || job?.voiceName || 'voice');
  return config.singleMode
    ? `Ảnh Project đã chọn không tồn tại hoặc không phải file ảnh cho ${voiceName}.`
    : `Thiếu ảnh Project cùng tên với voice: ${path.basename(voiceName, path.extname(voiceName))}.`;
}

function findPerJobImageConfig(voicePathOrName, config = {}, assetPath = '') {
  const map = config?.jobGreenConfigs || {};
  if (!map || typeof map !== 'object') return null;
  const candidates = candidateBaseNamesForVoice(voicePathOrName);
  if (assetPath) {
    const assetBase = path.basename(String(assetPath), path.extname(String(assetPath))).trim();
    if (assetBase && !candidates.includes(assetBase)) candidates.push(assetBase);
  }
  for (const key of candidates) {
    if (map[key] && typeof map[key] === 'object') return map[key];
    const lowerKey = String(key).toLocaleLowerCase('en-US');
    const matchedEntry = Object.entries(map).find(([k]) => String(k).toLocaleLowerCase('en-US') === lowerKey);
    if (matchedEntry && matchedEntry[1] && typeof matchedEntry[1] === 'object') {
      return matchedEntry[1];
    }
  }
  return null;
}

function resolveProjectImageLayers({ job, config = {}, renderConfig }) {
  let layers = [...(renderConfig?.layers || [])];
  const explicitVoiceImageLayer = layers.some(isProjectVoiceImageLayer);
  const configured = Boolean(config.singleProjectImagePath || normalizeProjectImageFolder(config));

  if (!configured) {
    if (!explicitVoiceImageLayer) return renderConfig;
    return {
      ...renderConfig,
      layers: layers.filter((layer) => !isProjectVoiceImageLayer(layer))
    };
  }

  const voiceRef = job?.voice_path || job?.voicePath || job?.voice_name || job?.voiceName;
  const assetPath = resolveProjectImageAsset(voiceRef, config);
  if (!assetPath) {
    if (explicitVoiceImageLayer && config.requireProjectImage === true) {
      throw Object.assign(new Error(projectImageMissingMessage(job, config)), {
        code: 'MISSING_PROJECT_IMAGE',
        voiceName: job?.voice_name || job?.voiceName || job?.voicePath || job?.voice_path || ''
      });
    }
    return {
      ...renderConfig,
      layers: layers.filter((layer) => !isProjectVoiceImageLayer(layer))
    };
  }

  const fallbackTransform = (config.defaultFolderImageTransform && typeof config.defaultFolderImageTransform === 'object')
    ? {
        x: Number.isFinite(Number(config.defaultFolderImageTransform.x)) ? Math.round(Number(config.defaultFolderImageTransform.x)) : 80,
        y: Number.isFinite(Number(config.defaultFolderImageTransform.y)) ? Math.round(Number(config.defaultFolderImageTransform.y)) : 140,
        width: Number.isFinite(Number(config.defaultFolderImageTransform.width)) && Number(config.defaultFolderImageTransform.width) > 0
          ? Math.round(Number(config.defaultFolderImageTransform.width))
          : 620,
        height: Number.isFinite(Number(config.defaultFolderImageTransform.height)) && Number(config.defaultFolderImageTransform.height) > 0
          ? Math.round(Number(config.defaultFolderImageTransform.height))
          : 800,
        rotation: Number.isFinite(Number(config.defaultFolderImageTransform.rotation)) ? Number(config.defaultFolderImageTransform.rotation) : 0,
        opacity: Number.isFinite(Number(config.defaultFolderImageTransform.opacity)) ? Number(config.defaultFolderImageTransform.opacity) : 1
      }
    : { x: 80, y: 140, width: 620, height: 800, rotation: 0, opacity: 1 };

  if (!explicitVoiceImageLayer) {
    layers.push({
      id: 'auto-voice-image',
      type: 'VOICE_IMAGE',
      sourceMode: 'VOICE_IMAGE',
      name: 'Ảnh theo voice',
      visible: true,
      zIndex: 50,
      transform: { ...fallbackTransform },
      effect: {}
    });
  }

  const ext = path.extname(assetPath).toLocaleLowerCase('en-US');
  const isVideoAsset = VIDEO_EXTENSIONS.includes(ext);
  const globalGreenMode = String(config.projectImageMode || '').toUpperCase() === 'GREEN';
  const perJobCfg = findPerJobImageConfig(voiceRef, config, assetPath);

  return {
    ...renderConfig,
    layers: layers.map((layer) => {
      if (!isProjectVoiceImageLayer(layer)) return layer;
      const perJobMode = perJobCfg?.assetMode ? String(perJobCfg.assetMode).toUpperCase() : '';
      const layerGreenMode = perJobMode === 'GREEN'
        ? true
        : perJobMode === 'IMAGE'
          ? false
          : (globalGreenMode ||
             String(layer.effect?.projectImageMode || '').toUpperCase() === 'GREEN' ||
             layer.effect?.greenScreen === true);
      const resolvedType = layerGreenMode
        ? (isVideoAsset ? 'GREENSCREEN_VIDEO' : 'GREENSCREEN_IMAGE')
        : (isVideoAsset ? 'VIDEO' : 'IMAGE');
      const prevTransform = layer.transform || fallbackTransform;
      const hasPerJobTransform = Boolean(perJobCfg && (perJobCfg.edited || Number.isFinite(Number(perJobCfg.x)) || Number.isFinite(Number(perJobCfg.width))));
      const resolvedTransform = hasPerJobTransform
        ? {
            ...prevTransform,
            x: Number.isFinite(Number(perJobCfg.x)) ? Math.round(Number(perJobCfg.x)) : Number(prevTransform.x || 0),
            y: Number.isFinite(Number(perJobCfg.y)) ? Math.round(Number(perJobCfg.y)) : Number(prevTransform.y || 0),
            width: Number.isFinite(Number(perJobCfg.width)) && Number(perJobCfg.width) > 0
              ? Math.round(Number(perJobCfg.width))
              : Number(prevTransform.width || 460),
            height: Number.isFinite(Number(perJobCfg.height)) && Number(perJobCfg.height) > 0
              ? Math.round(Number(perJobCfg.height))
              : Number(prevTransform.height || 460),
            rotation: Number.isFinite(Number(perJobCfg.rotation))
              ? Number(perJobCfg.rotation)
              : Number(prevTransform.rotation || 0),
            opacity: Number.isFinite(Number(perJobCfg.opacity))
              ? Number(perJobCfg.opacity)
              : Number(prevTransform.opacity ?? 1)
          }
        : prevTransform;
      const prevEffect = layer.effect || {};
      const customKeyColor = perJobCfg?.keyColor || prevEffect.keyColor || DEFAULT_GREEN_KEY_COLORS[0];
      const customKeyColors = Array.isArray(perJobCfg?.keyColors) && perJobCfg.keyColors.length
        ? perJobCfg.keyColors
        : (Array.isArray(prevEffect.keyColors) && prevEffect.keyColors.length
          ? prevEffect.keyColors
          : [customKeyColor, ...DEFAULT_GREEN_KEY_COLORS].filter((v, idx, arr) => arr.indexOf(v) === idx));
      const resolvedEffect = layerGreenMode
        ? {
            ...prevEffect,
            keyColor: customKeyColor,
            keyColors: customKeyColors,
            similarity: Number(perJobCfg?.similarity ?? prevEffect.similarity ?? 0.22),
            softness: Number(perJobCfg?.softness ?? prevEffect.softness ?? 0.07),
            despillMix: Number(perJobCfg?.despillMix ?? prevEffect.despillMix ?? 0.45),
            despillExpand: Number(perJobCfg?.despillExpand ?? prevEffect.despillExpand ?? 0.02),
            blendMode: prevEffect.blendMode || 'normal'
          }
        : prevEffect;
      return {
        ...layer,
        type: resolvedType,
        sourceMode: 'VOICE_IMAGE',
        dynamicVoiceImage: true,
        transform: resolvedTransform,
        startMs: perJobCfg?.edited && Number.isFinite(Number(perJobCfg.startMs)) ? Number(perJobCfg.startMs) : (layer.startMs ?? 0),
        endMs: perJobCfg?.edited && perJobCfg.endMs !== undefined ? perJobCfg.endMs : (layer.endMs ?? null),
        loop: isVideoAsset
          ? (perJobCfg?.loop !== undefined ? Boolean(perJobCfg.loop) : layer.loop !== false)
          : Boolean(layer.loop),
        sourceReference: assetPath,
        effect: resolvedEffect,
        name: layer.name || `${layerGreenMode ? 'Green Project' : 'Ảnh Project'} · ${path.basename(assetPath)}`
      };
    })
  };
}

function resolveMatchedStockAsset(voicePathOrName, config = {}) {
  const voicePath = String(voicePathOrName || '');
  const folder = config.matchedStockFolder || (voicePath ? path.dirname(voicePath) : config.voiceFolder);
  if (!folder) return null;
  const base = path.basename(voicePath, path.extname(voicePath));
  try {
    const lowerBase = base.toLocaleLowerCase('en-US');
    const files = fs.readdirSync(folder);
    for (const ext of VIDEO_EXTENSIONS) {
      const match = files.find((name) => path.basename(name, path.extname(name)).toLocaleLowerCase('en-US') === lowerBase &&
        path.extname(name).toLocaleLowerCase('en-US') === ext);
      if (match) return path.join(folder, match);
    }
  } catch {
    for (const ext of VIDEO_EXTENSIONS) {
      const candidate = path.join(folder, `${base}${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function jobGreenLayerFromConfig({ job, assetPath, greenConfig, renderConfig }) {
  const ext = path.extname(assetPath).toLocaleLowerCase('en-US');
  const isImage = JOB_GREEN_IMAGE_EXTENSIONS.has(ext);
  const cfg = { ...defaultJobGreenConfig(renderConfig), ...(greenConfig || {}) };
  const assetMode = String(cfg.assetMode || renderConfig?.jobGreenMode || 'GREEN').toUpperCase() === 'IMAGE'
    ? 'IMAGE'
    : 'GREEN';
  const useChromaKey = assetMode === 'GREEN';
  const keyColor = cfg.keyColor || DEFAULT_GREEN_KEY_COLORS[0];
  const keyColors = Array.isArray(greenConfig?.keyColors) && greenConfig.keyColors.length
    ? greenConfig.keyColors
    : [keyColor, ...DEFAULT_GREEN_KEY_COLORS].filter((value, index, values) => values.indexOf(value) === index);
  return {
    id: `job-green-source-${job.id || job.sequence_number || job.sequenceNumber || jobGreenKeyForVoice(job.voice_name || job.voiceName)}`,
    type: useChromaKey
      ? (isImage ? 'GREENSCREEN_IMAGE' : 'GREENSCREEN_VIDEO')
      : (isImage ? 'IMAGE' : 'VIDEO'),
    name: `${useChromaKey ? 'Green' : 'Ảnh'} riêng · ${job.voice_name || job.voiceName || ''}`,
    sourceReference: assetPath,
    visible: true,
    loop: cfg.loop !== false,
    zIndex: Number(cfg.zIndex ?? 9999),
    startMs: Number(cfg.startMs || 0),
    endMs: cfg.endMs ?? null,
    transform: {
      x: Number(cfg.x || 0),
      y: Number(cfg.y || 0),
      width: Math.max(1, Number(cfg.width || 320)),
      height: Math.max(1, Number(cfg.height || 180)),
      rotation: Number(cfg.rotation || 0),
      opacity: clamp(Number(cfg.opacity ?? 1), 0, 1)
    },
    style: {},
    timing: {},
    effect: useChromaKey
      ? {
          keyColor,
          keyColors,
          similarity: Number(cfg.similarity ?? 0.22),
          softness: Number(cfg.softness ?? 0.07),
          despillMix: Number(cfg.despillMix ?? 0.45),
          despillExpand: Number(cfg.despillExpand ?? 0.02),
          blendMode: 'normal'
        }
      : { blendMode: 'normal' }
  };
}

function buildInputJobs(config) {
  const voiceMode = String(config.voiceSourceMode || 'EXISTING_AUDIO').toUpperCase();
  const includeScripts = voiceMode === 'RENDER_VOICE_THEN_VIDEO' || voiceMode === 'ONLY_RENDER_VOICE';

  if (config.singleVoicePath) {
    const autoGenerateSrt = config.autoGenerateSrt !== false;
    const isTxt = path.extname(config.singleVoicePath).toLowerCase() === '.txt';
    const baseDir = path.dirname(config.singleVoicePath);
    const baseName = path.basename(config.singleVoicePath, path.extname(config.singleVoicePath));
    const existingWav = path.join(baseDir, `${baseName}.wav`);
    const existingMp3 = path.join(baseDir, `${baseName}.mp3`);
    const isValidFile = (p) => {
      try { return Boolean(p && fs.existsSync(p) && fs.statSync(p).size > 44); } catch { return false; }
    };
    const voicePath = isTxt
      ? (isValidFile(existingWav) ? existingWav : (isValidFile(existingMp3) ? existingMp3 : existingWav))
      : config.singleVoicePath;
    const scriptPath = isTxt
      ? config.singleVoicePath
      : (() => {
          const candTxt = path.join(baseDir, `${baseName}.txt`);
          return fs.existsSync(candTxt) ? candTxt : null;
        })();
    const needsVoiceGeneration = isTxt ? (!isValidFile(voicePath) || config.forceScriptRegenerate === true) : false;
    const existingSrt = path.join(baseDir, `${baseName}.srt`);
    const resolvedSrtPath = config.singleSrtPath || (!needsVoiceGeneration && fs.existsSync(existingSrt) ? existingSrt : null);

    return [{
      sequenceNumber: 1,
      voicePath,
      voiceName: path.basename(voicePath),
      scriptPath,
      needsVoiceGeneration,
      srtPath: resolvedSrtPath,
      ready: Boolean(resolvedSrtPath) || autoGenerateSrt || voiceMode === 'ONLY_RENDER_VOICE'
    }];
  }
  const autoGenerateSrt = config.autoGenerateSrt !== false;
  return scanBatchInputs(config.voiceFolder, config.srtFolder || config.voiceFolder, {
    includeScripts,
    forceScriptRegenerate: config.forceScriptRegenerate === true
  }).map((job) => ({ ...job, ready: job.ready || autoGenerateSrt || voiceMode === 'ONLY_RENDER_VOICE' }));
}

function normalizeTemplate(template) {
  if (!template) return DEFAULT_TEMPLATE;
  const sourceConfig = template.config || template;
  const sourceCanvas = sourceConfig.canvas || DEFAULT_TEMPLATE.canvas;
  const sourceWidth = Math.max(1, Number(sourceCanvas.width || STANDARD_CANVAS_WIDTH));
  const sourceHeight = Math.max(1, Number(sourceCanvas.height || STANDARD_CANVAS_HEIGHT));
  const scaleX = STANDARD_CANVAS_WIDTH / sourceWidth;
  const scaleY = STANDARD_CANVAS_HEIGHT / sourceHeight;
  const layers = (template.layers || template.config?.layers || []).map((layer) => ({
    id: layer.id,
    type: layer.type || layer.layer_type,
    name: layer.name,
    zIndex: layer.zIndex ?? layer.z_index,
    sourceMode: layer.sourceMode ?? layer.source_mode ?? 'STATIC',
    sourceReference: layer.sourceReference ?? layer.source_reference,
    visible: layer.visible !== 0 && layer.visible !== false,
    locked: layer.locked === 1 || layer.locked === true,
    loop: layer.loop_enabled === 1 || layer.loop === true,
    startMs: layer.start_ms ?? layer.startMs ?? 0,
    endMs: layer.end_ms ?? layer.endMs ?? null,
    transform: {
      ...(layer.transform || {}),
      x: Number(layer.transform?.x || 0) * scaleX,
      y: Number(layer.transform?.y || 0) * scaleY,
      width: Number(layer.transform?.width || 0) * scaleX,
      height: Number(layer.transform?.height || 0) * scaleY
    },
    style: layer.style || {},
    timing: layer.timing || {},
    effect: layer.effect || {},
    text: layer.text || layer.style?.text || ''
  }));
  return deepMerge(DEFAULT_TEMPLATE, {
    ...sourceConfig,
    canvas: { ...sourceCanvas, width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT },
    layers
  });
}

function planManualSegments({ filePath, metadata, voiceDurationMs, seed, config }) {
  const asset = {
    id: null,
    file_path: filePath,
    file_name: path.basename(filePath),
    duration_ms: metadata.durationMs
  };
  if (!metadata.durationMs || metadata.width === 0) {
    return planImageSegments({
      assets: [asset],
      voiceDurationMs,
      seed,
      durationMs: config.imageDurationMs || 5000,
      allowFlip: false,
      transitionItems: config.transitionItems,
      minTransitionMs: config.minTransitionMs,
      maxTransitionMs: config.maxTransitionMs,
      avoidRepeatCount: config.avoidRepeatCount
    });
  }

  const segments = [];
  let timeline = 0;
  let index = 0;
  while (timeline < voiceDurationMs) {
    const overlap = index ? Number(config.minTransitionMs || 600) : 0;
    const duration = Math.min(metadata.durationMs, voiceDurationMs - timeline + overlap);
    const transition = index
      ? { type: 'fade', durationMs: Math.min(overlap, Math.max(0, duration - 100)) }
      : null;
    segments.push({
      assetId: null,
      filePath,
      mediaType: 'VIDEO',
      durationMs: duration,
      trimStartMs: 0,
      startMs: timeline,
      transitionIn: transition,
      transform: {}
    });
    timeline += index ? duration - transition.durationMs : duration;
    index += 1;
  }
  return { segments, timelineDurationMs: voiceDurationMs };
}


function planSingleStockSegment({
  filePath,
  metadata,
  voiceDurationMs,
  toleranceMs = 500,
  consumedStartMs = 0,
  consumedPhase = 1,
  playbackRate = DEFAULT_STOCK_PLAYBACK_RATE,
  extendWithClone = true,
  clonePasses = 2,
  cloneFlip = true,
  cloneZoom = DEFAULT_STOCK_CLONE_ZOOM,
  transformAllStock = true,
  forceCover = true
}) {
  if (!filePath) throw Object.assign(new Error('Chưa chọn stock đã cắt sẵn.'), { code: 'MISSING_SINGLE_STOCK' });
  if (!metadata?.durationMs || !metadata?.width || !metadata?.height) {
    throw Object.assign(new Error('File stock đã chọn không phải video hợp lệ.'), { code: 'INVALID_SINGLE_STOCK' });
  }
  const speed = clamp(Number(playbackRate || 1), 0.05, 4);
  const durationMs = Number(metadata.durationMs || 0);
  const startOffsetMs = Math.max(0, Math.min(Number(consumedStartMs || 0), durationMs));
  const maxPasses = extendWithClone ? Math.max(1, Math.min(2, Math.round(Number(clonePasses || 2)))) : 1;
  let phase = Math.max(1, Math.min(maxPasses, Math.round(Number(consumedPhase || 1))));
  let offsetMs = startOffsetMs;
  const availableSourceMs = Math.max(0, durationMs - offsetMs);
  const maxOutputMs = availableSourceMs / speed + (phase === 1 && maxPasses > 1 ? durationMs / speed : 0);
  const missingMs = voiceDurationMs - maxOutputMs;
  if (missingMs > Math.max(0, Number(toleranceMs || 0))) {
    const error = new Error(`Stock ngắn hơn voice ${formatDuration(missingMs)} sau khi làm chậm ${speed}x và dùng ${maxPasses} lượt. Hãy cắt lại stock dài hơn.`);
    error.code = 'SINGLE_STOCK_TOO_SHORT';
    error.voiceDurationMs = voiceDurationMs;
    error.stockDurationMs = metadata.durationMs;
    error.availableSourceMs = availableSourceMs;
    error.missingMs = missingMs;
    throw error;
  }
  const fps = metadata.fpsDen ? metadata.fpsNum / metadata.fpsDen : 0;
  const segments = [];
  let timelineMs = 0;
  let remainingMs = voiceDurationMs;
  let consumedEndMs = offsetMs;
  while (remainingMs > 20) {
    const availableInPhaseMs = Math.max(0, durationMs - offsetMs);
    if (availableInPhaseMs <= 20) {
      if (phase === 1 && maxPasses > 1) {
        phase = 2;
        offsetMs = 0;
        continue;
      }
      break;
    }
    const sourceNeededMs = remainingMs * speed;
    const sourceDurationMs = Math.min(availableInPhaseMs, sourceNeededMs);
    const outputDurationMs = Math.min(remainingMs, sourceDurationMs / speed);
    const currentPhase = phase;
    const passTransform = currentPhase > 1
      ? { flip: cloneFlip !== false, scale: Number(cloneZoom || DEFAULT_STOCK_CLONE_ZOOM) }
      : {};
    segments.push({
      assetId: null,
      filePath,
      mediaType: 'VIDEO',
      durationMs: outputDurationMs,
      sourceDurationMs,
      sourceTotalDurationMs: durationMs,
      trimStartMs: offsetMs,
      startMs: timelineMs,
      transitionIn: segments.length ? { type: 'none', durationMs: 0 } : null,
      transform: passTransform,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      sourceFps: fps,
      preCutSingleStock: true,
      playbackRate: speed,
      forceCover,
      stockPassIndex: currentPhase,
      stockPhase: currentPhase,
      sourceRangeStartMs: offsetMs,
      sourceRangeEndMs: offsetMs + sourceDurationMs,
      padEndMs: 0
    });
    offsetMs += sourceDurationMs;
    consumedEndMs = offsetMs;
    timelineMs += outputDurationMs;
    remainingMs = Math.max(0, voiceDurationMs - timelineMs);
    if (durationMs - offsetMs <= 20) {
      if (phase === 1 && maxPasses > 1) {
        phase = 2;
        offsetMs = 0;
      } else {
        break;
      }
    }
  }
  const padEndMs = Math.max(0, voiceDurationMs - timelineMs);
  if (padEndMs > 0 && padEndMs <= Math.max(0, Number(toleranceMs || 0)) && segments.length) {
    segments[segments.length - 1].padEndMs = padEndMs;
    segments[segments.length - 1].durationMs += padEndMs;
    timelineMs += padEndMs;
  }
  return {
    segments,
    timelineDurationMs: voiceDurationMs,
    sourceDurationMs: durationMs,
    consumedStartMs: startOffsetMs,
    consumedEndMs,
    consumedMs: Math.max(0, consumedEndMs - (phase > 1 ? 0 : startOffsetMs)),
    trimmedMs: Math.max(0, durationMs - consumedEndMs),
    phase,
    playbackRate: speed,
    cloned: segments.some((segment) => segment.stockPhase > 1)
  };
}

function estimateSubtitleCharsPerLine(renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  const usableWidth = subtitleAssBox(renderConfig).width;
  const fontSize = subtitleEffectiveFontSize(subtitle);
  return Math.max(10, Math.floor(usableWidth / Math.max(1, fontSize * 0.58)));
}

function subtitleExportFontScale(subtitle = {}) {
  const value = Number(subtitle.exportFontScale ?? subtitle.exportScale ?? DEFAULT_SUBTITLE_EXPORT_FONT_SCALE);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SUBTITLE_EXPORT_FONT_SCALE;
}

function subtitleExportBoxScale(subtitle = {}) {
  const value = Number(subtitle.exportBoxScale ?? subtitle.exportScale ?? DEFAULT_SUBTITLE_EXPORT_BOX_SCALE);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SUBTITLE_EXPORT_BOX_SCALE;
}

function subtitleEffectiveFontSize(subtitle = {}) {
  const assScale = Number(subtitle.assScale ?? 1);
  const safeAssScale = Number.isFinite(assScale) ? assScale : 1;
  return Math.max(8, Math.round(Number(subtitle.fontSize || 32) * safeAssScale * subtitleExportFontScale(subtitle)));
}

function subtitleGlyphWidthEm(char) {
  if (/\s/.test(char)) return 0.33;
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(char)) return 1;
  if (/[MW@#%&]/.test(char)) return 0.8;
  if (/[A-Z0-9]/.test(char)) return 0.62;
  if (/[ilI.,'`!|:;]/.test(char)) return 0.32;
  if (/[-()[\]{}]/.test(char)) return 0.4;
  return 0.55;
}

function estimateSubtitleTextWidth(text, fontSize, letterSpacing = 0) {
  const chars = Array.from(String(text || ''));
  const bodyWidth = chars.reduce((sum, char) => sum + subtitleGlyphWidthEm(char) * fontSize, 0);
  return bodyWidth + Math.max(0, chars.length - 1) * Math.max(0, Number(letterSpacing || 0));
}

function splitSubtitleTokenByWidth(token, { maxPixelWidth, fontSize, letterSpacing }) {
  const chunks = [];
  let current = '';
  for (const char of Array.from(token)) {
    const candidate = `${current}${char}`;
    if (current && estimateSubtitleTextWidth(candidate, fontSize, letterSpacing) > maxPixelWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function wrapSubtitleByPixelWidth(text, { maxPixelWidth, fontSize, letterSpacing = 0 }) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const hasWordSpaces = /\s/.test(normalized);
  const source = hasWordSpaces ? normalized.split(' ') : Array.from(normalized);
  const chunks = [];
  let current = '';
  for (const token of source) {
    const candidate = hasWordSpaces && current ? `${current} ${token}` : `${current}${token}`;
    if (!current || estimateSubtitleTextWidth(candidate, fontSize, letterSpacing) <= maxPixelWidth) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    if (estimateSubtitleTextWidth(token, fontSize, letterSpacing) > maxPixelWidth) {
      const split = splitSubtitleTokenByWidth(token, { maxPixelWidth, fontSize, letterSpacing });
      chunks.push(...split.slice(0, -1));
      current = split.at(-1) || '';
    } else {
      current = token;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function wrapSubtitleText(text, { maxLines = 4, maxCharsPerLine = 60, maxPixelWidth = 0, fontSize = 32, letterSpacing = 0 } = {}) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const lineLimit = Math.max(1, Number(maxLines || 4));
  const pixelWidth = Number(maxPixelWidth || 0);
  const effectiveFontSize = Math.max(1, Number(fontSize || 32));
  let chunks = [];
  if (Number.isFinite(pixelWidth) && pixelWidth > 0) {
    chunks = wrapSubtitleByPixelWidth(normalized, {
      maxPixelWidth: pixelWidth,
      fontSize: effectiveFontSize,
      letterSpacing
    });
  } else {
    const charLimit = Math.max(8, Math.min(Number(maxCharsPerLine || 60), 90));
    const pushLong = (value) => {
      const chars = Array.from(value);
      for (let index = 0; index < chars.length; index += charLimit) chunks.push(chars.slice(index, index + charLimit).join(''));
    };
    const words = normalized.split(' ');
    let current = '';
    for (const word of words) {
      if (Array.from(word).length > charLimit) {
        if (current) chunks.push(current);
        current = '';
        pushLong(word);
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (Array.from(candidate).length > charLimit) {
        if (current) chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);
  }
  if (chunks.length <= lineLimit) return chunks.join('\n');
  const kept = chunks.slice(0, lineLimit);
  kept[lineLimit - 1] = `${kept[lineLimit - 1]}...`;
  return kept.join('\n');
}

function collapseSrtCueLines(content, renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  // Subtitle video kể chuyện / YouTube chuẩn: TỐI ĐA 2 DÒNG để không bao giờ bị che hình ảnh hay tràn xuống đáy màn hình
  const maxLines = Math.min(2, Math.max(1, Math.round(Number(subtitle.maxLines || 2))));
  const maxCharsPerLine = estimateSubtitleCharsPerLine(renderConfig);
  const box = subtitleAssBox(renderConfig);
  const fontSize = subtitleEffectiveFontSize(subtitle);
  const letterSpacing = subtitleLetterSpacing(subtitle, fontSize);
  const cleanContent = String(content || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  return cleanContent.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((line) => /-->/.test(line));
    if (timingIndex < 0) return block.trim();
    const header = lines.slice(0, timingIndex + 1);
    let text = lines.slice(timingIndex + 1).map((line) => line.trim()).filter(Boolean).join(' ');
    if (subtitle.uppercase === true) text = text.toUpperCase();
    return [...header, wrapSubtitleText(text, {
      maxLines,
      maxCharsPerLine,
      maxPixelWidth: box.width,
      fontSize,
      letterSpacing
    })].join('\n').trim();
  }).filter(Boolean).join('\n\n') + '\n';
}

function parseSrtTimestampToMs(timeStr) {
  const match = String(timeStr || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return 0;
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) +
    Number(match[4].padEnd(3, '0').slice(0, 3));
}

function formatMsToSrtTimestamp(totalMs) {
  const safeMs = Math.max(0, Math.round(Number(totalMs) || 0));
  const hours = Math.floor(safeMs / 3600000);
  const rem1 = safeMs % 3600000;
  const minutes = Math.floor(rem1 / 60000);
  const rem2 = rem1 % 60000;
  const seconds = Math.floor(rem2 / 1000);
  const millis = rem2 % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function offsetSrtTimestamps(content, offsetMs = 0) {
  if (!content || typeof content !== 'string') return '';
  const safeOffset = Math.round(Number(offsetMs || 0));
  const cleanContent = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (safeOffset === 0) return cleanContent;

  const blocks = cleanContent.trim().split(/\n\s*\n+/);
  const resultBlocks = [];
  let counter = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timingIndex = lines.findIndex(l => l.includes('-->'));
    if (timingIndex < 0) continue;

    const timingLine = lines[timingIndex].trim();
    const parts = timingLine.split(/\s*-->\s*/);
    if (parts.length < 2) continue;

    const startMs = parseSrtTimestampToMs(parts[0]);
    const endMs = parseSrtTimestampToMs(parts[1]);

    const newStartMs = startMs + safeOffset;
    const newEndMs = endMs + safeOffset;

    const newTimingLine = `${formatMsToSrtTimestamp(newStartMs)} --> ${formatMsToSrtTimestamp(newEndMs)}`;
    const textLines = lines.slice(timingIndex + 1).filter(l => l.trim().length > 0);
    if (textLines.length === 0) continue;

    resultBlocks.push(`${counter++}\n${newTimingLine}\n${textLines.join('\n')}`);
  }

  return resultBlocks.join('\n\n') + '\n';
}

function exportSrtWithDisclaimerOffset({ sourceSrtPath, targetSrtPath, offsetMs = 0 }) {
  if (!sourceSrtPath || !fs.existsSync(sourceSrtPath)) return null;
  const dest = targetSrtPath || sourceSrtPath;
  const safeOffset = Math.round(Number(offsetMs || 0));
  const raw = fs.readFileSync(sourceSrtPath, 'utf8');
  if (safeOffset <= 0) {
    if (dest !== sourceSrtPath) fs.copyFileSync(sourceSrtPath, dest);
    return dest;
  }
  const shifted = offsetSrtTimestamps(raw, safeOffset);
  fs.writeFileSync(dest, shifted, 'utf8');
  return dest;
}

function subtitlePreviewText(content, renderConfig = {}) {
  const jsonPreview = subtitleJsonPreviewText(content);
  if (jsonPreview) return jsonPreview;
  const collapsed = collapseSrtCueLines(content, renderConfig);
  const block = collapsed.split(/\n{2,}/).find((item) => /-->/.test(item)) || '';
  const lines = block.split('\n');
  const timingIndex = lines.findIndex((line) => /-->/.test(line));
  return {
    text: timingIndex >= 0 ? lines.slice(timingIndex + 1).join('\n').trim() : '',
    content: collapsed
  };
}

function assColor(hex, alpha = '00') {
  const clean = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  return `&H${alpha}${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`;
}

function srtTimeToAss(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return '0:00:00.00';
  let hours = Number(match[1]);
  let minutes = Number(match[2]);
  let seconds = Number(match[3]);
  let centiseconds = Math.round(Number(match[4].padEnd(3, '0')) / 10);
  if (centiseconds >= 100) {
    seconds += 1;
    centiseconds = 0;
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        hours += 1;
      }
    }
  }
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function escapeAssText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n/g, '\\N');
}

function subtitleAssBox(renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const exportScale = subtitleExportBoxScale(subtitle);
  const baseBoxWidthPercent = clamp(Number(subtitle.boxWidthPercent || subtitle.maxWidthPercent || 96), 10, 100);
  const baseBoxHeightPercent = clamp(Number(subtitle.boxHeightPercent || 8), 1, 60);
  const boxWidthPercent = clamp(baseBoxWidthPercent * exportScale, 10, 100);
  const boxHeightPercent = clamp(baseBoxHeightPercent * exportScale, 1, 60);
  const boxWidth = Math.round(width * boxWidthPercent / 100);
  const boxHeight = Math.round(height * boxHeightPercent / 100);
  const defaultX = (width - boxWidth) / 2;
  const defaultY = height - Number(subtitle.bottomMargin ?? 20) - boxHeight;
  const xPercent = Number.isFinite(Number(subtitle.boxXPercent))
    ? Number(subtitle.boxXPercent) + baseBoxWidthPercent / 2 - boxWidthPercent / 2
    : defaultX / width * 100;
  const yPercent = Number.isFinite(Number(subtitle.boxYPercent))
    ? Number(subtitle.boxYPercent) + baseBoxHeightPercent / 2 - boxHeightPercent / 2
    : defaultY / height * 100;
  const x = clamp(Math.round(width * xPercent / 100), 0, Math.max(0, width - boxWidth));
  const y = clamp(Math.round(height * yPercent / 100), 0, Math.max(0, height - boxHeight));
  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    centerX: Math.round(x + boxWidth / 2),
    centerY: Math.round(y + boxHeight / 2)
  };
}

function srtToPositionedAss(content, renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const fontSize = subtitleEffectiveFontSize(subtitle);
  const outline = Math.max(0, Number(subtitle.outlineWidth ?? subtitle.subtitleOutline ?? 0));
  const fontWeight = subtitleFontWeight(subtitle);
  const spacing = subtitleLetterSpacing(subtitle, fontSize);
  const box = subtitleAssBox(renderConfig);
  const cleanContent = String(content || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const events = cleanContent.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timingIndex = lines.findIndex((line) => /-->/.test(line));
    if (timingIndex < 0) return null;
    const [start, end] = lines[timingIndex].split(/\s*-->\s*/);
    let text = lines.slice(timingIndex + 1).join('\n').trim();
    if (!text) return null;
    if (subtitle.uppercase === true) text = text.toUpperCase();
    const linesOfText = text.split(/\r?\n/).filter(Boolean);
    const lineCount = Math.max(1, Math.min(linesOfText.length, 2));
    const maxLineChars = Math.max(...linesOfText.map(l => Array.from(l).length), 1);
    const fittedFontSize = subtitleFitFontSize(subtitle, {
      boxWidth: box.width,
      boxHeight: box.height,
      lineCount,
      maxLineChars
    });
    const fontOverride = fittedFontSize < fontSize ? `\\fs${fittedFontSize}` : '';

    // Đảm bảo tâm posY và posX luôn nằm trong vùng an toàn tuyệt đối, cách mép đáy tối thiểu 24px
    const lineHeightPx = fittedFontSize * subtitleLineHeight(subtitle);
    const totalTextHeight = lineCount * lineHeightPx + outline * 2;
    const halfH = totalTextHeight / 2;
    const safeCenterY = Math.max(halfH + 12, Math.min(height - halfH - 24, box.centerY));
    const safeCenterX = Math.max(box.width / 2 + 8, Math.min(width - box.width / 2 - 8, box.centerX));

    return `Dialogue: 0,${srtTimeToAss(start)},${srtTimeToAss(end)},Default,,0,0,0,,{\\an5\\pos(${safeCenterX},${safeCenterY})${fontOverride}}${escapeAssText(text)}`;
  }).filter(Boolean);
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${subtitleFontFamily(subtitle)},${fontSize},${assColor(subtitle.color || subtitle.subtitleColor || '#FFFFFF')},&H000000FF,${assColor(subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000')},&H00000000,${fontWeight >= 700 ? -1 : 0},${subtitle.italic === true ? -1 : 0},0,0,100,100,${spacing},0,1,${outline},${Number(subtitle.shadow ?? 1)},5,0,0,0,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    ''
  ].join('\n');
}

function karaokeSubtitleEnabled(config = {}) {
  return isKaraokeBoxEffect(config?.subtitle || config);
}

function convertKaraokeJsonToSrtFile(jsonPath, outputPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) return null;
  const converted = subtitleJsonToSrt(fs.readFileSync(jsonPath, 'utf8'));
  if (!converted) return null;
  fs.writeFileSync(outputPath, converted, 'utf8');
  return outputPath;
}

function prepareRenderSubtitle({ job, renderConfig, tempDirectory, forceSrt = false }) {
  if (!job.srt_path) return job.srt_path;
  const ext = path.extname(job.srt_path).toLowerCase();
  if (ext === '.ass') return job.srt_path;

  // Nếu người dùng chọn Hiệu ứng Sub "Karaoke hộp" (CapCut Word-by-Word Highlight Box)
  if (!forceSrt && isKaraokeBoxEffect(renderConfig?.subtitle)) {
    const tempWordsJson = tempDirectory ? path.join(tempDirectory, `${job.id}-words.json`) : null;
    const wordsJsonPath = (job.words_json_path && fs.existsSync(job.words_json_path))
      ? job.words_json_path
      : (tempWordsJson && fs.existsSync(tempWordsJson) ? tempWordsJson : null);
    const sourceContent = wordsJsonPath
      ? fs.readFileSync(wordsJsonPath, 'utf8')
      : fs.readFileSync(job.srt_path, 'utf8');
    const outputPath = path.join(tempDirectory, `${job.id}-render.ass`);
    const assContent = buildCapCutKaraokeBoxAss(sourceContent, renderConfig, subtitleAssBox(renderConfig));
    fs.writeFileSync(outputPath, assContent, 'utf8');
    return outputPath;
  }

  let content = fs.readFileSync(job.srt_path, 'utf8');
  if (ext === '.json') {
    const converted = subtitleJsonToSrt(content);
    if (!converted) return job.srt_path;
    content = converted;
  } else if (ext !== '.srt') {
    return job.srt_path;
  }

  // Bảo toàn 100% timecode gốc của file SRT để khớp chính xác với giọng đọc Voice
  // Chỉ tự động phân tách câu nếu người dùng chủ động bật cấu hình splitLongCues: true
  const maxChars = Number(renderConfig.srtMaxChars || renderConfig.subtitle?.srtMaxChars || 42);
  const normalizedSrt = renderConfig.subtitle?.splitLongCues === true
    ? splitLongSrtCues(content, { maxChars, maxWords: 8 })
    : content;

  const prepared = renderConfig.subtitle?.collapseLines === false ? normalizedSrt : collapseSrtCueLines(normalizedSrt, renderConfig);
  if (forceSrt) {
    const outputPath = path.join(tempDirectory, `${job.id}-render.srt`);
    fs.writeFileSync(outputPath, prepared, 'utf8');
    return outputPath;
  }
  const usePositionedAss = renderConfig.subtitle?.positionMode === 'absolute' ||
    Number.isFinite(Number(renderConfig.subtitle?.boxXPercent)) ||
    Number.isFinite(Number(renderConfig.subtitle?.boxYPercent));
  const outputPath = path.join(tempDirectory, `${job.id}-render.${usePositionedAss ? 'ass' : 'srt'}`);
  fs.writeFileSync(outputPath, usePositionedAss ? srtToPositionedAss(prepared, renderConfig) : prepared, 'utf8');
  return outputPath;
}

function assertExistingFile(filePath, message, code) {
  if (filePath && fs.existsSync(filePath)) return;
  const error = new Error(message);
  error.code = code;
  error.filePath = filePath || null;
  throw error;
}

function removePathQuiet(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true });
      return true;
    }
  } catch {}
  return false;
}

function renderableLayerType(layer) {
  const type = layer.type || layer.layerType;
  return ['TEXT', 'LOGO', 'IMAGE', 'VIDEO', 'GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO', 'OVERLAY_IMAGE', 'OVERLAY_VIDEO'].includes(type);
}

function canCacheLayer(layer) {
  if (layer.visible === false || !renderableLayerType(layer)) return false;
  const startMs = Number(layer.startMs ?? layer.start_ms ?? layer.timing?.startMs ?? 0);
  const endMs = layer.endMs ?? layer.end_ms ?? layer.timing?.endMs ?? null;
  return startMs === 0 && (endMs === null || endMs === undefined || endMs === '');
}

function normalizeLayerForCache(layer) {
  return {
    id: layer.id || null,
    type: layer.type || layer.layerType,
    sourceReference: layer.sourceReference || layer.source || '',
    text: layer.text || '',
    transform: layer.transform || {},
    style: layer.style || {},
    effect: layer.effect || {},
    zIndex: layer.zIndex ?? layer.z_index ?? 0
  };
}

function shouldMoveReservedAssets(config, folders) {
  if (!folders?.usedBatchFolder) return false;
  if (config?.moveUsedStock !== true) return false;
  return true;
}

function stockDurationPoolEnabled(config) {
  return config?.backgroundMode === BACKGROUND_MODE.STOCK_VIDEO &&
    config?.singleMode !== true &&
    config?.stockAllocationMode === 'DURATION_POOL';
}

function matchedStockOptions(config = {}) {
  return {
    playbackRate: Number(config.stockPlaybackRate || DEFAULT_STOCK_PLAYBACK_RATE),
    extendWithClone: config.extendShortStock !== false,
    clonePasses: Number(config.stockClonePasses || 2),
    cloneFlip: config.stockCloneFlip !== false,
    cloneZoom: Number(config.stockCloneZoom || DEFAULT_STOCK_CLONE_ZOOM),
    transformAllStock: config.transformAllStock !== false,
    forceCover: config.forceStockCover !== false
  };
}

function stockAllocatorOptions(config = {}) {
  const options = matchedStockOptions(config);
  return {
    playbackRate: options.playbackRate,
    clonePasses: options.clonePasses,
    cloneFlip: options.cloneFlip,
    cloneZoom: options.cloneZoom,
    transformAllStock: options.transformAllStock,
    forceCover: options.forceCover
  };
}

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function selectedSrtGpu(system = {}, requestedGpuIndex = -1, sampledGpu = null) {
  const gpus = Array.isArray(system.gpus) ? system.gpus : [];
  const requested = numberOr(requestedGpuIndex, -1);
  const selectedIndex = requested >= 0 ? requested : numberOr(system.selectedGpuIndex, gpus[0]?.index ?? -1);
  const gpu = gpus.find((item) => numberOr(item.index, -1) === selectedIndex) || gpus[0] || null;
  if (!gpu && !sampledGpu) return null;
  const total = numberOr(sampledGpu?.memoryTotalMb ?? gpu?.memoryTotalMb, 0);
  const freeFromSample = total && Number.isFinite(Number(sampledGpu?.memoryUsedMb))
    ? Math.max(0, total - numberOr(sampledGpu.memoryUsedMb, 0))
    : null;
  return {
    index: numberOr(sampledGpu?.index ?? gpu?.index, selectedIndex),
    name: sampledGpu?.name || gpu?.name || system.selectedGpuName || '',
    memoryTotalMb: total,
    memoryFreeMb: numberOr(freeFromSample ?? gpu?.memoryFreeMb, total ? Math.floor(total * 0.7) : 0)
  };
}

function recommendSrtResourcePlan({
  jobCount = 0,
  system = {},
  host = {},
  sampledGpu = null,
  model = 'small',
  maxWorkers = MAX_AUTO_SRT_WORKERS
} = {}) {
  const totalJobs = Math.max(0, Math.round(numberOr(jobCount, 0)));
  const hardMax = Math.max(1, Math.min(MAX_AUTO_SRT_WORKERS, Math.round(numberOr(maxWorkers, MAX_AUTO_SRT_WORKERS))));
  if (!totalJobs) {
    return {
      workers: 0,
      maxWorkers: hardMax,
      model: 'small',
      limits: { jobs: 0, cpu: 0, ram: 0, gpu: 0 }
    };
  }

  const logicalCpuCount = Math.max(1, numberOr(host.logicalCpuCount, os.cpus().length));
  const cpuReserve = logicalCpuCount >= 8 ? 2 : 1;
  const cpuLimit = Math.max(1, Math.floor(Math.max(1, logicalCpuCount - cpuReserve) / SMALL_WHISPER_CPU_PER_WORKER));
  const freeMemoryMb = Math.max(512, numberOr(host.freeMemoryMb, Math.round(os.freemem() / 1024 / 1024)));
  const ramLimit = Math.max(1, Math.floor(freeMemoryMb / SMALL_WHISPER_RAM_PER_WORKER_MB));
  const gpu = selectedSrtGpu(system, system.gpuIndex, sampledGpu);
  const hasNvidiaGpu = Boolean(gpu?.memoryTotalMb || (Array.isArray(system.gpus) && system.gpus.length));
  const gpuLimit = hasNvidiaGpu
    ? Math.max(1, Math.floor(Math.max(0, numberOr(gpu?.memoryFreeMb, 0) - 512) / SMALL_WHISPER_VRAM_PER_WORKER_MB))
    : 1;
  const workers = Math.max(1, Math.min(totalJobs, hardMax, cpuLimit, ramLimit, gpuLimit));
  return {
    workers,
    maxWorkers: hardMax,
    model: String(model || 'small').toLowerCase() === 'small' ? 'small' : 'small',
    limits: {
      jobs: totalJobs,
      cpu: cpuLimit,
      ram: ramLimit,
      gpu: gpuLimit
    },
    host: {
      logicalCpuCount,
      freeMemoryMb
    },
    gpu
  };
}

function stockUsageCsvRows(rows) {
  return rows.map((row) => ({
    time: row.created_at ? new Date(row.created_at).toLocaleString() : '',
    voice: row.voice_name,
    source: row.source_path,
    output: row.output_path,
    pass: row.pass_index,
    action: row.action,
    status: row.status,
    source_duration: formatDuration(row.source_duration_ms),
    source_start: formatDuration(row.source_start_ms),
    source_end: formatDuration(row.source_end_ms),
    render_duration: formatDuration(row.render_duration_ms),
    speed: row.playback_rate,
    flipped: row.flipped ? 'YES' : 'NO',
    zoom: row.zoom,
    deleted_at: row.source_deleted_at ? new Date(row.source_deleted_at).toLocaleString() : ''
  }));
}

class BatchService {
  constructor({ database, ffmpegService, paths, whisperSrtService, subtitleOverlayService, resourceController, voiceStudioService, voiceValidatorService, voiceProfileManager }) {
    this.database = database;
    this.ffmpeg = ffmpegService;
    this.paths = paths;
    this.whisperSrt = whisperSrtService || null;
    this.subtitleOverlay = subtitleOverlayService || null;
    this.resourceController = resourceController || new ResourceController(this.ffmpeg);
    this.voiceStudio = voiceStudioService || null;
    this.voiceValidator = voiceValidatorService || null;
    this.voiceProfileManager = voiceProfileManager || null;
    this.pauseRequested = false;
    this.activeBatchId = null;
    this.layerCachePromises = new Map();
    this.stockSourceLocks = new Set();
    this.disclaimerInfoPromises = new Map();
    this.jobIntroInfoPromises = new Map();
  }

  _ensureVoiceServices() {
    if (!this.voiceProfileManager) {
      const { VoiceProfileManager } = require('./voice/voice-profile-manager');
      this.voiceProfileManager = new VoiceProfileManager();
    }
    if (!this.voiceStudio) {
      const { VoiceStudioService } = require('./voice/voice-studio-service');
      this.voiceStudio = new VoiceStudioService({ profileManager: this.voiceProfileManager });
    }
    if (!this.voiceValidator) {
      const { VoiceValidatorService } = require('./voice/voice-validator-service');
      this.voiceValidator = new VoiceValidatorService({
        voiceStudioService: this.voiceStudio,
        ffmpegService: this.ffmpeg
      });
    }
    return {
      voiceStudio: this.voiceStudio,
      voiceValidator: this.voiceValidator,
      voiceProfileManager: this.voiceProfileManager
    };
  }

  async prepareMissingVoices({ jobs, config = {}, folders = {}, callbacks = {}, signal }) {
    const voiceMode = String(config.voiceSourceMode || 'EXISTING_AUDIO').toUpperCase();
    const { voiceStudio, voiceValidator, voiceProfileManager } = this._ensureVoiceServices();
    const hasValidVoiceFile = (job) => {
      try {
        const p = job?.voicePath;
        if (!p || !fs.existsSync(p) || fs.statSync(p).size <= 44) return false;
        if (job?.scriptPath && fs.existsSync(job.scriptPath)) {
          const scriptText = fs.readFileSync(job.scriptPath, 'utf8');
          const consistency = voiceValidator.verifyScriptAudioConsistency({ scriptText, audioPath: p });
          if (!consistency.valid) {
            callbacks.onLog?.(
              `⚠️ [KIỂM ĐỊNH KỊCH BẢN ↔ VOICE] File voice hiện có (${path.basename(p)}: ${consistency.actualDurationMin} phút) bị hụt thời lượng so với kịch bản (${path.basename(job.scriptPath)}: ${consistency.cleanChars.toLocaleString()} ký tự, yêu cầu >= ${consistency.minExpectedMin} phút). Tự động xóa file voice lỗi để tạo lại đầy đủ!`
            );
            try { fs.unlinkSync(p); } catch {}
            const srtSibling = p.replace(/\.[^.]+$/, '.srt');
            try { if (fs.existsSync(srtSibling)) fs.unlinkSync(srtSibling); } catch {}
            job.needsVoiceGeneration = true;
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    };

    const candidates = (jobs || []).filter((job) => {
      if (!job.scriptPath || !fs.existsSync(job.scriptPath)) return false;
      if (config.forceScriptRegenerate === true) return true;
      if (job.needsVoiceGeneration || !hasValidVoiceFile(job)) return true;
      return false;
    });

    const readyCount = Math.max(0, (jobs || []).length - candidates.length);
    if (readyCount > 0 && candidates.length > 0) {
      callbacks.onLog?.(
        `⏭️ [VOICESTUDIO AI] Trong thư mục có ${readyCount} bài đã có sẵn file voice hợp lệ (giữ nguyên không tạo lại) · Chỉ tạo mới ${candidates.length} kịch bản chưa có voice.`
      );
    } else if (readyCount > 0 && candidates.length === 0 && (voiceMode === 'RENDER_VOICE_THEN_VIDEO' || voiceMode === 'ONLY_RENDER_VOICE')) {
      callbacks.onLog?.(
        `✅ [VOICESTUDIO AI] Toàn bộ ${readyCount} kịch bản trong thư mục đều đã có sẵn file voice hợp lệ, sử dụng ngay không cần tạo lại!`
      );
    }

    if (!candidates.length) {
      return { generated: 0, skippedExisting: readyCount };
    }

    const selectedProfileId = config.voiceProfileId || 'omnivoice';
    const profile = voiceProfileManager.getProfile(selectedProfileId);

    callbacks.onLog?.(`🎙️ [VOICESTUDIO AI] Bắt đầu tạo ${candidates.length} file voice (.wav) từ kịch bản (.txt) bằng giọng [${profile?.name || selectedProfileId}]...`);

    let generated = 0;
    try {
      for (let i = 0; i < candidates.length; i += 1) {
        if (signal?.aborted) {
          throw Object.assign(new Error('Đã hủy tạo voice theo yêu cầu.'), { code: 'ABORTED' });
        }
        const job = candidates[i];
        const scriptText = fs.readFileSync(job.scriptPath, 'utf8').trim();
        if (!scriptText) {
          throw new Error(`File kịch bản rỗng: ${path.basename(job.scriptPath)}`);
        }

        const isLastCandidate = i === candidates.length - 1;
        callbacks.onLog?.(`🎙️ [${i + 1}/${candidates.length}] Đang tạo voice (.wav) cho kịch bản: ${path.basename(job.scriptPath)}...`);
        await voiceValidator.generateFullScript({
          scriptText,
          voice: selectedProfileId,
          refAudio: profile?.samplePath || null,
          model: profile?.model || 'omnivoice',
          language: profile?.language || null,
          speed: profile?.speed || 1.0,
          finalOutputPath: job.voicePath,
          unloadModelAfter: isLastCandidate,
          onProgress: (p) => {
            callbacks.onProgress?.({
              stage: 'VOICE_GEN',
              percent: Math.round(((i + (Number(p?.percent || 0) / 100)) / candidates.length) * 100),
              message: `[${i + 1}/${candidates.length}] ${path.basename(job.voiceName)}: ${p?.status || ''}`
            });
          },
          onLog: (msg) => callbacks.onLog?.(`[VoiceAI · ${path.basename(job.voiceName)}] ${msg}`)
        });

        job.needsVoiceGeneration = false;
        if (voiceMode === 'ONLY_RENDER_VOICE' && folders.outputFolder) {
          const outCopy = path.join(folders.outputFolder, path.basename(job.voicePath));
          if (path.resolve(outCopy) !== path.resolve(job.voicePath)) {
            fs.copyFileSync(job.voicePath, outCopy);
          }
        }
        generated += 1;
      }
    } finally {
      // Sau khi hoàn tất tạo voice, xóa sạch toàn bộ cache tạm và giải phóng bộ nhớ GPU/RAM
      if (voiceStudio && typeof voiceStudio.cleanupVoiceCaches === 'function') {
        try {
          const cleanStat = await voiceStudio.cleanupVoiceCaches({
            scriptDir: config.voiceFolder || (config.singleVoicePath ? path.dirname(config.singleVoicePath) : null),
            unloadModel: true
          });
          if (cleanStat?.removedFiles > 0) {
            callbacks.onLog?.(
              `🧹 [VOICESTUDIO AI] Đã xóa sạch ${cleanStat.removedFiles} file tạm/cache (${(cleanStat.freedBytes / 1024 / 1024).toFixed(2)} MB) và giải phóng bộ nhớ đệm GPU/RAM. Chỉ giữ lại đúng file .wav kết quả!`
            );
          } else {
            callbacks.onLog?.(`🧹 [VOICESTUDIO AI] Đã dọn sạch bộ nhớ đệm cache & giải phóng VRAM GPU. Chỉ giữ lại đúng file .wav kết quả!`);
          }
        } catch {}
      }
    }

    callbacks.onLog?.(`✅ [VOICESTUDIO AI] Đã hoàn tất tạo ${generated}/${candidates.length} file voice (.wav)!`);
    return { generated, skippedExisting: readyCount };
  }

  async getBundledDisclaimerInfo(type = 'TYPE_1') {
    const disclaimerType = normalizeDisclaimerType(type);
    if (this.disclaimerInfoPromises.has(disclaimerType)) return this.disclaimerInfoPromises.get(disclaimerType);
    const promise = (async () => {
      const filePath = resolveBundledDisclaimerPath(disclaimerType);
      if (!filePath) {
        throw Object.assign(
          new Error(`Không tìm thấy video Disclaimer tích hợp trong ứng dụng (${disclaimerType}).`),
          { code: 'MISSING_BUNDLED_DISCLAIMER' }
        );
      }
      const metadata = await this.ffmpeg.probe(filePath);
      const durationMs = effectiveDisclaimerDurationMs(metadata);
      if (!metadata.width || !metadata.height || !durationMs) {
        throw Object.assign(
          new Error('Video Disclaimer tích hợp không hợp lệ hoặc không có thời lượng.'),
          { code: 'INVALID_BUNDLED_DISCLAIMER' }
        );
      }
      return {
        filePath,
        type: disclaimerType,
        durationMs,
        hasAudio: Boolean(metadata.hasAudio),
        width: metadata.width,
        height: metadata.height
      };
    })().catch((error) => {
      this.disclaimerInfoPromises.delete(disclaimerType);
      throw error;
    });
    this.disclaimerInfoPromises.set(disclaimerType, promise);
    return promise;
  }

  async getDisclaimerInfo(config = {}) {
    const customPath = String(config.disclaimerPath || config.disclaimerAssetPath || '').trim();
    if (!customPath) return this.getBundledDisclaimerInfo(config.disclaimerType);
    const filePath = path.resolve(customPath);
    const cacheKey = `custom:${filePath}`;
    if (this.disclaimerInfoPromises.has(cacheKey)) return this.disclaimerInfoPromises.get(cacheKey);
    const promise = (async () => {
      if (!fs.existsSync(filePath)) {
        throw Object.assign(new Error(`Không tìm thấy video Disclaimer đã chọn: ${filePath}`), { code: 'MISSING_PROJECT_DISCLAIMER' });
      }
      const metadata = await this.ffmpeg.probe(filePath);
      const durationMs = effectiveDisclaimerDurationMs(metadata);
      if (!metadata.width || !metadata.height || !durationMs) {
        throw Object.assign(new Error('Video Disclaimer đã chọn không hợp lệ hoặc không có thời lượng.'), { code: 'INVALID_PROJECT_DISCLAIMER' });
      }
      return {
        filePath,
        type: 'PROJECT_ASSET',
        durationMs,
        hasAudio: Boolean(metadata.hasAudio),
        width: metadata.width,
        height: metadata.height
      };
    })().catch((error) => {
      this.disclaimerInfoPromises.delete(cacheKey);
      throw error;
    });
    this.disclaimerInfoPromises.set(cacheKey, promise);
    return promise;
  }

  async getJobIntroInfo(job, config = {}) {
    return (await this.getJobIntroInfos(job, config))[0] || null;
  }

  async getJobIntroInfos(job, config = {}) {
    const explicitPath = config.singleMode ? String(config.singleJobIntroPath || '') : String(config.batchJobIntroPath || '');
    if (explicitPath && !fs.existsSync(explicitPath)) {
      throw Object.assign(
        new Error(`Video riêng sau Disclaimer không còn tồn tại: ${explicitPath}`),
        { code: 'MISSING_JOB_INTRO_FILE' }
      );
    }
    const filePaths = resolveJobIntroAssets(
      job.voice_path || job.voicePath || job.voice_name || job.voiceName,
      config
    );
    if (!filePaths.length) return [];
    const audioMode = normalizeIntroAudioMode(config.jobIntroAudioMode);
    const infos = await Promise.all(filePaths.map((filePath) => {
      const cacheKey = path.resolve(filePath).toLocaleLowerCase('en-US');
      if (!this.jobIntroInfoPromises.has(cacheKey)) {
        this.jobIntroInfoPromises.set(cacheKey, this.ffmpeg.probe(filePath).then((metadata) => {
          if (!metadata.width || !metadata.height || !metadata.durationMs) {
            throw Object.assign(
              new Error(`Video riêng sau Disclaimer không hợp lệ: ${filePath}`),
              { code: 'INVALID_JOB_INTRO_FILE' }
            );
          }
          return {
            filePath,
            durationMs: metadata.durationMs,
            hasAudio: Boolean(metadata.hasAudio),
            width: metadata.width,
            height: metadata.height
          };
        }).catch((error) => {
          this.jobIntroInfoPromises.delete(cacheKey);
          throw error;
        }));
      }
      return this.jobIntroInfoPromises.get(cacheKey);
    }));
    return infos.map((info, index) => ({
      ...info,
      hasAudio: audioMode === 'KEEP' && info.hasAudio,
      audioMode,
      order: index + 1
    }));
  }

  requestPause() {
    this.pauseRequested = true;
    return { accepted: true, message: 'Render sẽ tạm dừng an toàn sau các job đang chạy.' };
  }

  clearPause() {
    this.pauseRequested = false;
  }

  reserveStockSource(sourcePath) {
    const normalized = String(sourcePath || '').toLocaleLowerCase('en-US');
    if (!normalized) return () => {};
    if (this.stockSourceLocks.has(normalized)) {
      throw Object.assign(new Error(`Stock đang được job khác dùng: ${sourcePath}`), { code: 'MATCHED_STOCK_RESERVED' });
    }
    this.stockSourceLocks.add(normalized);
    return () => this.stockSourceLocks.delete(normalized);
  }

  writeMatchedStockUsageCsv(batchId, reportFolder) {
    if (typeof this.database.listMatchedStockUsage !== 'function') return null;
    const rows = this.database.listMatchedStockUsage(batchId);
    if (!rows.length) return null;
    const headers = [
      'time', 'voice', 'source', 'output', 'pass', 'action', 'status',
      'source_duration', 'source_start', 'source_end', 'render_duration',
      'speed', 'flipped', 'zoom', 'deleted_at'
    ];
    return writeCsvReport(reportFolder, 'stock-usage-log', headers, stockUsageCsvRows(rows));
  }

  async commitDirectStockUsage({ batchId, job, outputPath, mediaPlan, folders, callbacks, config = {} }) {
    if (!mediaPlan?.segments?.length) return;
    const groups = new Map();
    for (const segment of mediaPlan.segments) {
      const sourcePath = segment.filePath || mediaPlan.sourcePath;
      if (!sourcePath) continue;
      if (!groups.has(sourcePath)) groups.set(sourcePath, []);
      groups.get(sourcePath).push(segment);
    }
    for (const [sourcePath, segments] of groups.entries()) {
      const sourceDurationMs = Number(segments[0].sourceTotalDurationMs || mediaPlan.sourceDurationMs || segments[0].sourceDurationTotalMs || 0) ||
        Math.max(...segments.map((segment) => Number(segment.sourceRangeEndMs || 0)));
      this.database.recordMatchedStockUsage({
        batchId,
        jobId: job.id,
        voiceName: job.voice_name || job.voiceName,
        sourcePath,
        outputPath,
        sourceDurationMs,
        segments
      });
      const progress = typeof this.database.getMatchedStockProgress === 'function'
        ? this.database.getMatchedStockProgress(sourcePath, sourceDurationMs)
        : {
            phase: 1,
            normalConsumedMs: this.database.getMatchedStockConsumedMs(sourcePath),
            cloneConsumedMs: 0,
            consumedStartMs: this.database.getMatchedStockConsumedMs(sourcePath)
          };
      const requiredPasses = config.extendShortStock === false
        ? 1
        : Math.max(1, Math.min(2, Math.round(Number(config.stockClonePasses || 2))));
      const consumedMs = progress.consumedStartMs;
      const fullyConsumedMs = requiredPasses > 1 ? progress.cloneConsumedMs : progress.normalConsumedMs;
      const fullyConsumed = fullyConsumedMs >= Math.max(0, sourceDurationMs - Number(mediaPlan.toleranceMs || 500));
      if (fullyConsumed && config.moveUsedStock === true && fs.existsSync(sourcePath)) {
        const usedDirectory = folders.usedBatchFolder || ensureDirectory(path.join(path.dirname(sourcePath), 'Used'));
        const usedPath = await moveFile(sourcePath, usedDirectory);
        if (typeof this.database.markMatchedStockMoved === 'function') this.database.markMatchedStockMoved(sourcePath);
        if (typeof this.database.markMediaAssetUsedByPath === 'function') this.database.markMediaAssetUsedByPath(sourcePath, usedPath);
        callbacks.onLog?.(`${job.voice_name}: stock đã dùng hết, đã chuyển vào Used: ${path.basename(usedPath)}.`);
      } else {
        if (fullyConsumed) {
          if (typeof this.database.markMatchedStockMoved === 'function') this.database.markMatchedStockMoved(sourcePath);
          if (typeof this.database.markMediaAssetUsedByPath === 'function') this.database.markMediaAssetUsedByPath(sourcePath, sourcePath);
        }
        const reason = fullyConsumed ? 'đã ghi nhận dùng hết (giữ nguyên file, không chuyển folder)' : 'còn đoạn chưa dùng';
        callbacks.onLog?.(`${job.voice_name}: stock ${path.basename(sourcePath)} đã ghi nhận dùng đến ${formatDuration(consumedMs)} / ${formatDuration(sourceDurationMs)}; ${reason}.`);
      }
    }
    this.writeMatchedStockUsageCsv(batchId, folders.reportFolder);
  }

  async scan(config, callbacks = {}) {
    const jobs = buildInputJobs(config);
    const system = await this.ffmpeg.checkSystem({ gpuIndex: Number(config.gpuIndex ?? -1) });
    let media = [];
    if ([BACKGROUND_MODE.MANUAL_MEDIA, BACKGROUND_MODE.SINGLE_STOCK].includes(config.backgroundMode) && (config.manualMediaPath || config.singleStockPath)) {
      const directMediaPath = config.singleStockPath || config.manualMediaPath;
      const type = path.extname(directMediaPath).match(/\.(png|jpe?g|webp|bmp)$/i) ? 'IMAGE' : 'VIDEO';
      media = [await inspectFile(directMediaPath, this.ffmpeg, type)];
    } else if (config.backgroundMode !== BACKGROUND_MODE.MATCHED_STOCK && config.mediaFolder) {
      const libType = config.backgroundMode === BACKGROUND_MODE.IMAGE_SEQUENCE ? 'IMAGE' : 'STOCK';
      const requestedRoot = path.resolve(String(config.mediaFolder || ''));
      const matchedLib = typeof this.database?.listLibraries === 'function'
        ? this.database.listLibraries().find((l) => l.id === config.libraryId || (l.root_path && path.resolve(l.root_path).toLocaleLowerCase('en-US') === requestedRoot.toLocaleLowerCase('en-US')))
        : null;
      const cachedRows = matchedLib && typeof this.database?.listMediaAssets === 'function'
        ? this.database.listMediaAssets(matchedLib.id)
        : [];
      if (cachedRows.length > 0) {
        media = cachedRows
          .filter((r) => r.status === 'AVAILABLE' && r.file_path && fs.existsSync(r.file_path))
          .map((r) => ({
            filePath: r.file_path,
            fileName: r.file_name,
            fileSizeBytes: Number(r.file_size_bytes || 0),
            durationMs: Number(r.duration_ms || 0),
            width: Number(r.width || 0),
            height: Number(r.height || 0),
            valid: r.status === 'AVAILABLE'
          }));
      } else {
        media = await scanFolder(
          config.mediaFolder,
          this.ffmpeg,
          libType,
          callbacks.onMediaScan
        );
      }
    }

    const voiceMode = String(config.voiceSourceMode || 'EXISTING_AUDIO').toUpperCase();
    const onlyRenderVoice = voiceMode === 'ONLY_RENDER_VOICE';
    let voiceDurationMs = 0;
    for (let index = 0; index < jobs.length; index += 1) {
      try {
        let metadata = null;
        if (!fs.existsSync(jobs[index].voicePath) && jobs[index].scriptPath && fs.existsSync(jobs[index].scriptPath)) {
          const text = fs.readFileSync(jobs[index].scriptPath, 'utf8');
          const { VoiceValidatorService } = require('./voice/voice-validator-service');
          const wordCount = new VoiceValidatorService().estimateWordCount(text);
          const estimatedMs = Math.max(3000, Math.round((wordCount / 2.6) * 1000));
          metadata = { durationMs: estimatedMs };
          jobs[index].voiceEstimated = true;
        } else {
          metadata = await this.ffmpeg.probe(jobs[index].voicePath);
          if (jobs[index].scriptPath && fs.existsSync(jobs[index].scriptPath)) {
            const text = fs.readFileSync(jobs[index].scriptPath, 'utf8');
            const { VoiceValidatorService } = require('./voice/voice-validator-service');
            const validator = new VoiceValidatorService();
            const consistency = validator.verifyScriptAudioConsistency({
              scriptText: text,
              audioPath: jobs[index].voicePath,
              durationMs: Number(metadata?.durationMs || 0)
            });
            if (!consistency.valid) {
              callbacks.onLog?.(
                `⚠️ [QUÉT ĐẦU VÀO] File voice ${path.basename(jobs[index].voicePath)} (${consistency.actualDurationMin} phút) bị hụt thời lượng so với kịch bản ${path.basename(jobs[index].scriptPath)} (${consistency.cleanChars.toLocaleString()} ký tự, yêu cầu >= ${consistency.minExpectedMin} phút). Đã xóa file lỗi & đánh dấu tạo lại voice!`
              );
              try { fs.unlinkSync(jobs[index].voicePath); } catch {}
              const srtSibling = jobs[index].voicePath.replace(/\.[^.]+$/, '.srt');
              try { if (fs.existsSync(srtSibling)) fs.unlinkSync(srtSibling); } catch {}
              jobs[index].needsVoiceGeneration = true;
              const estimatedMs = Math.max(3000, Math.round((consistency.totalWords / 2.5) * 1000));
              metadata = { durationMs: estimatedMs };
              jobs[index].voiceEstimated = true;
            }
          }
        }
        jobs[index].voiceDurationMs = metadata.durationMs;
        voiceDurationMs += metadata.durationMs;
        if (onlyRenderVoice) {
          jobs[index].stockStatus = 'READY';
          jobs[index].ready = true;
        } else if (config.backgroundMode === BACKGROUND_MODE.MATCHED_STOCK) {
          const stockPath = resolveMatchedStockAsset(jobs[index].voicePath, config);
          jobs[index].matchedStockPath = stockPath;
          if (!stockPath) {
            jobs[index].ready = false;
            jobs[index].stockStatus = 'MISSING';
            jobs[index].error = `Thiếu stock cùng tên với voice: ${path.basename(jobs[index].voicePath, path.extname(jobs[index].voicePath))}`;
          } else {
            try {
              const stockMetadata = await this.ffmpeg.probe(stockPath);
              planSingleStockSegment({
                filePath: stockPath,
                metadata: stockMetadata,
                voiceDurationMs: metadata.durationMs,
                toleranceMs: Number(config.stockDurationToleranceMs ?? 500),
                consumedStartMs: this.database.getMatchedStockConsumedMs(stockPath),
                ...matchedStockOptions(config)
              });
              jobs[index].stockStatus = 'READY';
              jobs[index].stockDurationMs = stockMetadata.durationMs;
              media.push({ filePath: stockPath, fileName: path.basename(stockPath), valid: true, durationMs: stockMetadata.durationMs });
            } catch (error) {
              jobs[index].ready = false;
              jobs[index].stockStatus = 'INVALID';
              jobs[index].error = error.message;
              media.push({ filePath: stockPath, fileName: path.basename(stockPath), valid: false, error: error.message });
            }
          }
        } else if (config.backgroundMode === BACKGROUND_MODE.SINGLE_STOCK && (config.singleStockPath || config.manualMediaPath)) {
          const stockPath = config.singleStockPath || config.manualMediaPath;
          try {
            const stockMetadata = await this.ffmpeg.probe(stockPath);
            planSingleStockSegment({
              filePath: stockPath,
              metadata: stockMetadata,
              voiceDurationMs: metadata.durationMs,
              toleranceMs: Number(config.stockDurationToleranceMs ?? 500),
              consumedStartMs: this.database.getMatchedStockConsumedMs(stockPath),
              ...matchedStockOptions(config)
            });
            jobs[index].stockStatus = 'READY';
            jobs[index].stockDurationMs = stockMetadata.durationMs;
          } catch (error) {
            jobs[index].ready = false;
            jobs[index].stockStatus = 'INVALID';
            jobs[index].error = error.message;
          }
        }
      } catch (error) {
        jobs[index].ready = false;
        jobs[index].error = error.message;
      }
      callbacks.onVoiceScan?.({ index: index + 1, total: jobs.length, job: jobs[index] });
    }

    if (jobGreenEnabled(config)) {
      const configs = config.jobGreenConfigs || {};
      for (const job of jobs) {
        const key = jobGreenKeyForVoice(job.voicePath || job.voiceName);
        const assetPath = resolveJobGreenAsset(job.voicePath || job.voiceName, config);
        const greenConfig = configs[key] || null;
        job.greenKey = key;
        job.greenAssetPath = assetPath;
        job.greenStatus = assetPath ? (greenConfig?.edited ? 'EDITED' : 'FOUND') : 'MISSING';
        job.greenEdited = Boolean(greenConfig?.edited);
        job.greenConfig = greenConfig;
        if (!assetPath && config.requireJobGreenAsset !== false) job.ready = false;
        if (assetPath && config.requireJobGreenEdit === true && !greenConfig?.edited) job.ready = false;
      }
    }

    const validMedia = media.filter((item) => item.valid);
    const mediaDurationMs = config.backgroundMode === BACKGROUND_MODE.STOCK_VIDEO
      ? createDurationStockAllocator({
          assets: validMedia.map((item) => {
            const consumedStartMs = typeof this.database.getMatchedStockConsumedMs === 'function'
              ? this.database.getMatchedStockConsumedMs(item.filePath || item.file_path)
              : 0;
            return { ...item, consumedStartMs, consumed_start_ms: consumedStartMs };
          }),
          seed: Number(config.stockPoolSeed || 1),
          selectionMode: config.selectionMode || 'SEQUENTIAL',
          ...stockAllocatorOptions(config)
        }).remainingDurationMs
      : validMedia.reduce((sum, item) => sum + (item.durationMs || 0), 0);
    const missingSrtCount = jobs.filter((job) => !job.srtPath).length;
    const greenJobs = jobs.filter((job) => job.greenStatus);
    for (const job of jobs) {
      job.jobIntroPath = resolveJobIntroAsset(job.voicePath || job.voiceName, config);
      const projectImage = this.projectImageMatch(job, config);
      job.projectImagePath = projectImage.assetPath;
      job.projectImageStatus = projectImage.status;
      const perJobCfg = findPerJobImageConfig(job.voicePath || job.voiceName, config, projectImage.assetPath);
      if (perJobCfg) {
        job.greenConfig = perJobCfg;
        job.greenEdited = Boolean(perJobCfg.edited);
      }
      if (projectImage.status === 'MISSING') {
        job.ready = false;
        const message = projectImageMissingMessage(job, config);
        job.error = job.error ? `${job.error}\n${message}` : message;
      }
    }
    const readyJobs = jobs.filter((job) => job.ready && job.voiceDurationMs);
    const projectImageJobs = jobs.filter((job) => job.projectImageStatus && job.projectImageStatus !== 'NOT_USED');
    return {
      system,
      jobs,
      voiceCount: jobs.length,
      readyCount: readyJobs.length,
      missingSrtCount,
      greenReadyCount: greenJobs.filter((job) => job.greenAssetPath).length,
      missingGreenCount: greenJobs.filter((job) => job.greenStatus === 'MISSING').length,
      uneditedGreenCount: greenJobs.filter((job) => job.greenStatus === 'FOUND').length,
      projectImageReadyCount: projectImageJobs.filter((job) => job.projectImageStatus === 'READY').length,
      projectImageMissingCount: projectImageJobs.filter((job) => job.projectImageStatus === 'MISSING').length,
      projectImageDisabledCount: projectImageJobs.filter((job) => job.projectImageStatus === 'DISABLED').length,
      jobIntroReadyCount: jobs.filter((job) => job.jobIntroPath).length,
      stockEnough: onlyRenderVoice ? true : (config.backgroundMode === BACKGROUND_MODE.STOCK_VIDEO ? mediaDurationMs + 20 >= voiceDurationMs : true),
      invalidMediaCount: media.filter((item) => !item.valid).length,
      mediaCount: validMedia.length,
      mediaDurationMs,
      voiceDurationMs
    };
  }

  prepareFolders(config, batchName) {
    const isFlat = Boolean(config.singleMode || config.flatOutputFolder);
    const outputFolder = isFlat
      ? ensureDirectory(config.outputFolder)
      : ensureDirectory(path.join(config.outputFolder, batchName));
    const selectedLibrary = config.libraryId && typeof this.database?.listLibraries === 'function'
      ? this.database.listLibraries().find((item) => item.id === config.libraryId)
      : null;
    const usedRoot = config.usedFolder || selectedLibrary?.used_path ||
      (config.mediaFolder ? path.join(config.mediaFolder, 'Used') : null);
    return {
      outputFolder,
      videoFolder: isFlat ? outputFolder : ensureDirectory(path.join(outputFolder, 'Videos')),
      reportFolder: ensureDirectory(path.join(outputFolder, 'Reports')),
      logFolder: ensureDirectory(path.join(outputFolder, 'Logs')),
      usedBatchFolder: usedRoot
        ? ensureDirectory(path.join(usedRoot, batchName))
        : null
    };
  }

  async prepareLibrary(config, callbacks) {
    if ([BACKGROUND_MODE.MANUAL_MEDIA, BACKGROUND_MODE.SINGLE_STOCK, BACKGROUND_MODE.MATCHED_STOCK].includes(config.backgroundMode)) return null;
    const type = config.backgroundMode === BACKGROUND_MODE.IMAGE_SEQUENCE ? 'IMAGE' : 'STOCK';
    const selectedLibrary = config.libraryId
      ? this.database.listLibraries().find((item) => item.id === config.libraryId)
      : null;
    const selectedRoot = selectedLibrary?.root_path ? path.resolve(selectedLibrary.root_path) : '';
    const requestedRoot = config.mediaFolder ? path.resolve(config.mediaFolder) : '';
    const useRequestedFolder = Boolean(requestedRoot && requestedRoot !== selectedRoot);
    const library = !useRequestedFolder && selectedLibrary
      ? selectedLibrary
      : this.database.getOrCreateLibrary({
          name: path.basename(requestedRoot || selectedRoot) || `${type} Library`,
          rootPath: requestedRoot || selectedRoot,
          usedPath: config.usedFolder || selectedLibrary?.used_path || null,
          libraryType: type
        });
    if (!library) throw new Error('Không tìm thấy media library.');

    const scanned = await scanFolder(
      library.root_path,
      this.ffmpeg,
      library.library_type,
      ({ index, total, item }) => callbacks.onProgress?.({
        stage: 'SCAN_MEDIA',
        percent: total ? index / total * 100 : 100,
        message: item.fileName
      })
    );
    const missing = this.database.markLibraryScanMissing(library.id, scanned.map((item) => item.filePath));
    if (missing) callbacks.onLog?.(`Media library: bỏ qua ${missing} file không còn tồn tại trên ổ đĩa.`);
    for (const item of scanned) this.database.upsertMediaAsset(library.id, item);
    return library;
  }

  buildJobs(config) {
    const map = config.jobTemplates || {};
    const greenConfigs = config.jobGreenConfigs || {};
    return buildInputJobs(config).map((job) => ({
      ...job,
      voiceName: path.basename(job.voicePath),
      templateId: map[path.basename(job.voicePath)] || config.templateId || null,
      backgroundMode: config.backgroundMode,
      greenKey: jobGreenKeyForVoice(job.voicePath),
      greenAssetPath: resolveJobGreenAsset(job.voicePath, config),
      greenConfig: greenConfigs[jobGreenKeyForVoice(job.voicePath)] || null,
      jobIntroPath: resolveJobIntroAsset(job.voicePath, config),
      transitionSeed: Math.floor(Math.random() * 2_147_483_647),
      imageSeed: Math.floor(Math.random() * 2_147_483_647)
    }));
  }

  templateForJob(job, config = {}) {
    const inlineTemplate = config.template || config.templateConfig;
    if (inlineTemplate) return inlineTemplate;
    const templateId = job?.templateId || job?.template_id || templateIdForVoice(
      job?.voicePath || job?.voice_path || job?.voiceName || job?.voice_name,
      config
    );
    if (!templateId || typeof this.database?.getTemplate !== 'function') return null;
    return this.database.getTemplate(templateId);
  }

  projectImageMatch(job, config = {}) {
    const template = this.templateForJob(job, config);
    const explicitLayer = templateLayersFromTemplate(template).some(isProjectVoiceImageLayer);
    const configured = config.singleMode
      ? Boolean(config.singleProjectImagePath)
      : Boolean(normalizeProjectImageFolder(config));
    const hasLayer = explicitLayer || configured;
    const assetPath = hasLayer && configured
      ? resolveProjectImageAsset(job?.voicePath || job?.voice_path || job?.voiceName || job?.voice_name, config)
      : null;
    return {
      hasLayer,
      explicitLayer,
      configured,
      assetPath,
      status: !hasLayer ? 'NOT_USED' : assetPath ? 'READY' : configured ? (explicitLayer ? 'MISSING' : 'NOT_USED') : 'DISABLED'
    };
  }

  validateProjectImageInputs(config, jobs = []) {
    if (config.requireProjectImage !== true) return;
    const required = jobs
      .map((job) => ({ job, match: this.projectImageMatch(job, config) }))
      .filter(({ match }) => match.explicitLayer && match.configured);
    const missing = required
      .filter(({ match }) => !match.assetPath)
      .map(({ job }) => path.basename(job.voicePath || job.voice_name || job.voiceName || 'voice'));
    if (!missing.length) return;
    const error = new Error(`Thiếu ảnh Project cho ${missing.length}/${required.length} voice.`);
    error.code = 'MISSING_PROJECT_IMAGE';
    error.missing = missing;
    throw error;
  }

  validateJobGreenInputs(config, jobs) {
    if (!jobGreenEnabled(config)) return;
    const missing = [];
    const unedited = [];
    const greenConfigs = config.jobGreenConfigs || {};
    for (const job of jobs) {
      const key = job.greenKey || jobGreenKeyForVoice(job.voicePath || job.voiceName);
      const assetPath = job.greenAssetPath || resolveJobGreenAsset(job.voicePath || job.voiceName, config);
      if (!assetPath && config.requireJobGreenAsset !== false) {
        missing.push(job.voiceName || path.basename(job.voicePath || 'voice'));
        continue;
      }
      if (assetPath && config.requireJobGreenEdit === true && !greenConfigs[key]?.edited) {
        unedited.push(job.voiceName || path.basename(job.voicePath || 'voice'));
      }
    }
    if (missing.length) {
      const error = new Error(`Thiếu green asset cho ${missing.length}/${jobs.length} voice.`);
      error.code = 'MISSING_JOB_GREEN_ASSET';
      error.missing = missing;
      throw error;
    }
    if (unedited.length) {
      const error = new Error(`Còn ${unedited.length}/${jobs.length} voice chưa lưu chỉnh green.`);
      error.code = 'UNEDITED_JOB_GREEN';
      error.unedited = unedited;
      throw error;
    }
  }

  async hydrateJobDurations(jobs) {
    for (const job of jobs) {
      if (job.voiceDurationMs || job.voice_duration_ms) continue;
      const metadata = await this.ffmpeg.probe(job.voicePath || job.voice_path);
      job.voiceDurationMs = metadata.durationMs;
      job.voice_duration_ms = metadata.durationMs;
    }
    return jobs;
  }

  validateMatchedSubtitles(config, jobs) {
    if (config.autoGenerateSrt !== false) return;
    if (config.allowMissingSrt === true) return;
    const missing = jobs.filter((job) => !(job.srtPath || job.srt_path));
    if (!missing.length) return;
    const error = new Error(`Thiếu SRT cho ${missing.length}/${jobs.length} voice. Batch chỉ chạy khi voice và SRT match đủ.`);
    error.code = 'MISSING_SRT';
    error.missing = missing.map((job) => job.voiceName || job.voice_name || path.basename(job.voicePath || job.voice_path || 'voice'));
    throw error;
  }

  resolveGeneratedSrtPath(job, config) {
    const voicePath = job.voicePath || job.voice_path;
    const baseName = path.basename(voicePath, path.extname(voicePath));
    const folder = config.srtFolder || path.dirname(voicePath);
    return path.join(folder, `${baseName}.srt`);
  }

  resolveGeneratedKaraokeJsonPath(job, config) {
    const voicePath = job.voicePath || job.voice_path;
    const baseName = path.basename(voicePath, path.extname(voicePath));
    const folder = config.srtFolder || path.dirname(voicePath);
    return path.join(folder, `${baseName}.json`);
  }

  karaokeSubtitleEnabled(config = {}) {
    return karaokeSubtitleEnabled(config);
  }

  async ensureJobSubtitle(job, config, callbacks, signal) {
    const outputPath = this.resolveGeneratedSrtPath(job, config);
    if (job.srt_path && fs.existsSync(job.srt_path)) {
      const existingExt = path.extname(job.srt_path).toLowerCase();
      if (existingExt !== '.json') {
        callbacks.onLog?.(`${job.voice_name}: 📝 Đã có sẵn file phụ đề SRT: [${path.basename(job.srt_path)}] (Bỏ qua Whisper AI)`);
        return job.srt_path;
      }
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 8) {
        this.database.updateJob(job.id, { srt_path: outputPath });
        job.srt_path = outputPath;
        callbacks.onLog?.(`${job.voice_name}: 📝 Đã có sẵn file phụ đề SRT chuyển đổi: [${path.basename(outputPath)}]`);
        return outputPath;
      }
      if (convertKaraokeJsonToSrtFile(job.srt_path, outputPath)) {
        this.database.updateJob(job.id, { srt_path: outputPath });
        job.srt_path = outputPath;
        callbacks.onLog?.(`${job.voice_name}: 📝 Đã chuyển đổi JSON Karaoke thành file SRT: [${path.basename(outputPath)}]`);
        return outputPath;
      }
    }
    if (config.autoGenerateSrt === false) {
      throw Object.assign(new Error('Không tìm thấy SRT cùng tên.'), { code: 'MISSING_SRT' });
    }
    if (!this.whisperSrt) {
      throw Object.assign(new Error('Chưa cấu hình service tạo SRT tự động.'), { code: 'WHISPER_SRT_UNAVAILABLE' });
    }
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 8) {
      this.database.updateJob(job.id, { srt_path: outputPath });
      job.srt_path = outputPath;
      callbacks.onLog?.(`${job.voice_name}: 📝 Tìm thấy file SRT đã tạo trước đó: [${path.basename(outputPath)}]`);
      return outputPath;
    }

    this.database.updateJob(job.id, { status: JOB_STATUS.PREPARING });
    callbacks.onJob?.({ jobId: job.id, voiceName: job.voice_name, status: JOB_STATUS.PREPARING });
    callbacks.onLog?.(`🎙️ [WHISPER AI BẮT ĐẦU] ${job.voice_name}: Đang tạo phụ đề tự động bằng Whisper AI (Model: ${config.whisperModel || 'small'}). Quá trình này có thể mất từ 1-5 phút tùy độ dài audio...`);
    const tempWordsJsonPath = (isKaraokeBoxEffect(config?.subtitle) && this.paths?.temp)
      ? path.join(this.paths.temp, `${job.id}-words.json`)
      : null;
    const generated = await this.whisperSrt.generate({
      audioPath: job.voice_path,
      outputPath,
      model: config.whisperModel || 'small',
      language: config.whisperLanguage || 'auto',
      maxChars: Number(config.srtMaxChars || 42),
      maxDur: Number(config.srtMaxDur || 4.2),
      jsonOutputPath: tempWordsJsonPath,
      preferJson: false,
      signal
    }, callbacks);
    if (tempWordsJsonPath && fs.existsSync(tempWordsJsonPath)) {
      job.words_json_path = tempWordsJsonPath;
    }
    this.database.updateJob(job.id, { srt_path: generated });
    job.srt_path = generated;
    callbacks.onLog?.(`✅ [WHISPER AI HOÀN TẤT] ${job.voice_name}: Đã tạo xong file phụ đề SRT: [${path.basename(generated)}]`);
    callbacks.onJob?.({ jobId: job.id, voiceName: job.voice_name, status: JOB_STATUS.PENDING, srtPath: generated });
    return generated;
  }

  async recommendSrtResources(config = {}, system = {}, jobCount = 0) {
    const host = this.resourceController?.snapshot ? this.resourceController.snapshot() : null;
    const requestedGpuIndex = Number(config.gpuIndex ?? system.gpuIndex ?? -1);
    let sampledGpu = null;
    if (this.ffmpeg?.sampleNvidiaGpu) {
      try {
        sampledGpu = await this.ffmpeg.sampleNvidiaGpu(requestedGpuIndex);
      } catch {
        sampledGpu = null;
      }
    }
    return recommendSrtResourcePlan({
      jobCount,
      system: {
        ...system,
        gpuIndex: requestedGpuIndex
      },
      host,
      sampledGpu,
      model: 'small',
      maxWorkers: Number(config.maxSrtWorkers || MAX_AUTO_SRT_WORKERS)
    });
  }

  subtitleMissing(job = {}) {
    const sourcePath = job.srt_path || job.srtPath;
    return !sourcePath || !fs.existsSync(sourcePath);
  }

  async prepareMissingSubtitles({ batchId, jobs, config, system, callbacks = {}, signal }) {
    if (config.autoGenerateSrt === false) return { generated: 0, skipped: 0, workers: 0 };
    const candidates = (jobs || [])
      .filter((job) => !['COMPLETED', 'SKIPPED', 'CANCELLED'].includes(job.status))
      .filter((job) => this.subtitleMissing(job));
    if (!candidates.length) {
      callbacks.onLog?.('SRT phase: tất cả voice đã có SRT, chuyển sang render.');
      return { generated: 0, skipped: jobs.length, workers: 0 };
    }
    if (!this.whisperSrt) {
      throw Object.assign(new Error('Chưa cấu hình service tạo SRT tự động.'), { code: 'WHISPER_SRT_UNAVAILABLE' });
    }

    const plan = await this.recommendSrtResources(config, system, candidates.length);
    const previousConcurrency = typeof this.whisperSrt.setConcurrency === 'function'
      ? this.whisperSrt.setConcurrency(plan.workers || 1)
      : null;
    callbacks.onLog?.(
      `SRT phase: tạo trước ${candidates.length} SRT bằng model small · ` +
      `${plan.workers}/${plan.maxWorkers} luồng ` +
      `(CPU limit ${plan.limits.cpu}, RAM limit ${plan.limits.ram}, GPU limit ${plan.limits.gpu}` +
      `${plan.gpu?.name ? ` · ${plan.gpu.name} VRAM còn ${plan.gpu.memoryFreeMb}/${plan.gpu.memoryTotalMb} MB` : ''}).`
    );
    callbacks.onProgress?.({
      stage: 'SRT_PREP',
      batchId,
      percent: 0,
      message: `Tạo ${candidates.length} SRT trước khi render`
    });

    let cursor = 0;
    let completed = 0;
    const failures = [];
    const nextJob = () => {
      if (signal?.aborted) return null;
      const job = candidates[cursor];
      cursor += 1;
      return job || null;
    };
    const worker = async () => {
      while (true) {
        const job = nextJob();
        if (!job) return;
        try {
          await this.ensureJobSubtitle(job, config, callbacks, signal);
          completed += 1;
          callbacks.onProgress?.({
            stage: 'SRT_PREP',
            batchId,
            jobId: job.id,
            voiceName: job.voice_name,
            percent: candidates.length ? completed / candidates.length * 100 : 100,
            message: `${completed}/${candidates.length} SRT`
          });
        } catch (error) {
          if (error.code === 'ABORTED' || signal?.aborted) throw error;
          failures.push({ job, error });
          this.database.updateJob(job.id, {
            status: JOB_STATUS.FAILED,
            error_code: String(error.code || 'SRT_GENERATION_FAILED'),
            error_message: error.message,
            completed_at: Date.now()
          });
          callbacks.onJob?.({
            jobId: job.id,
            voiceName: job.voice_name,
            status: JOB_STATUS.FAILED,
            error: error.message
          });
          callbacks.onLog?.(`${job.voice_name}: tạo SRT lỗi (${error.message}).`);
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.max(1, plan.workers || 1) }, () => worker()));
    } finally {
      if (previousConcurrency !== null && typeof this.whisperSrt.setConcurrency === 'function') {
        this.whisperSrt.setConcurrency(previousConcurrency);
      }
    }

    if (failures.length) {
      const error = new Error(`Tạo SRT thất bại ${failures.length}/${candidates.length} voice. Batch chưa render.`);
      error.code = 'SRT_PREP_FAILED';
      error.failures = failures.map(({ job, error: failure }) => ({
        jobId: job.id,
        voiceName: job.voice_name,
        message: failure.message,
        code: failure.code || 'SRT_GENERATION_FAILED'
      }));
      throw error;
    }
    callbacks.onLog?.(`SRT phase: đã tạo đủ ${completed}/${candidates.length} SRT, bắt đầu render.`);
    return { generated: completed, skipped: jobs.length - candidates.length, workers: plan.workers };
  }

  finishBeforeRenderFailure({ batchId, folders, callbacks = {}, error }) {
    const status = error.code === 'ABORTED' ? BATCH_STATUS.CANCELLED : BATCH_STATUS.FAILED;
    const failures = Array.isArray(error.failures) ? error.failures : [];
    const report = {
      title: status === BATCH_STATUS.CANCELLED ? 'Batch cancelled before render' : 'Tạo SRT trước render thất bại',
      lines: [
        error.message,
        failures.length ? `SRT lỗi: ${failures.length}` : ''
      ].filter(Boolean),
      details: {
        batchId,
        failures
      }
    };
    let files = null;
    try {
      files = writeReport(folders.reportFolder, 'srt-prep-failed', report);
      this.database.createReport({
        batchId,
        reportType: 'SRT_PREP',
        severity: status === BATCH_STATUS.CANCELLED ? 'WARNING' : 'ERROR',
        title: report.title,
        content: report,
        filePath: files.jsonPath
      });
    } catch {}
    this.database.updateBatch(batchId, {
      status,
      stop_reason: error.code || 'SRT_PREP_FAILED',
      failed_jobs: failures.length,
      completed_at: Date.now()
    });
    this.activeBatchId = null;
    callbacks.onBatch?.({ batchId, status, report });
    return {
      batchId,
      status,
      outputFolder: folders.outputFolder,
      report,
      error: error.message
    };
  }

  validateStockDuration(config, callbacks) {
    if (!stockDurationPoolEnabled(config)) return null;
    const assets = this.listRenderableAssets(config.libraryId, callbacks);
    const checker = createDurationStockAllocator({
      assets,
      seed: Number(config.stockPoolSeed || 1),
      selectionMode: config.selectionMode || 'SEQUENTIAL',
      ...stockAllocatorOptions(config)
    });
    const totalStockMs = checker.remainingDurationMs;
    const totalVoiceMs = Number(config.totalVoiceDurationMs || 0);
    if (totalStockMs + 20 < totalVoiceMs) {
      throw new InsufficientStockError({
        requiredMs: totalVoiceMs,
        availableMs: totalStockMs,
        selectedMs: totalStockMs
      });
    }
    return { assets, totalStockMs, totalVoiceMs };
  }

  createStockPool(config, callbacks, completedJobs = []) {
    if (!stockDurationPoolEnabled(config)) return null;
    const assets = this.listRenderableAssets(config.libraryId, callbacks);
    const pool = createDurationStockAllocator({
      assets,
      seed: Number(config.stockPoolSeed || 1),
      selectionMode: config.selectionMode || 'SEQUENTIAL',
      ...stockAllocatorOptions(config)
    });
    callbacks.onLog?.(
      `Stock folder: dùng theo cursor đã lưu · speed ${config.stockPlaybackRate || DEFAULT_STOCK_PLAYBACK_RATE}x · voice ${formatDuration(config.totalVoiceDurationMs || 0)} / stock hiệu dụng ${formatDuration(pool.totalDurationMs)}.`
    );
    callbacks.onLog?.('Stock folder: dùng hết lượt thường theo cursor trước; sau đó mới lặp lại từ đầu với lật/zoom; chỉ chuyển file vào Used sau lượt 2.');
    return pool;
  }

  resolveResourceConfig(config, system, jobCount, callbacks = {}) {
    if (!this.resourceController?.isAuto(config)) return config;
    const plan = this.resourceController.recommend({
      config,
      system,
      host: system?.resources,
      jobCount
    });
    if (config.singleMode) {
      plan.workers = 1;
      plan.initialWorkers = 1;
      plan.maxWorkers = 1;
    }
    const requestedGpu = Number(config.gpuIndex);
    const requestedCodec = String(config.codec || 'auto').toLowerCase();
    const requestedAcceleration = String(config.accelerationMode || '').toUpperCase();
    const requestedProfile = String(config.performanceProfile || '').toUpperCase();
    const normalized = {
      ...config,
      autoResourceMode: true,
      requestedMaxParallelJobs: config.maxParallelJobs,
      maxParallelJobs: config.singleMode ? 1 : plan.initialWorkers,
      resourcePlan: plan,
      gpuIndex: requestedGpu >= 0 ? requestedGpu : plan.gpuIndex,
      codec: requestedCodec === 'auto' ? plan.codec : config.codec,
      accelerationMode: ['AUTO', 'AUTO_STABLE', ''].includes(requestedAcceleration)
        ? plan.accelerationMode
        : config.accelerationMode,
      performanceProfile: ['AUTO', ''].includes(requestedProfile)
        ? plan.performanceProfile
        : config.performanceProfile,
      filterComplexThreads: plan.filterComplexThreads,
      maxComplexFilterThreads: plan.maxComplexFilterThreads
    };
    callbacks.onLog?.(
      `Auto resources: ${plan.initialWorkers}/${plan.maxWorkers} worker · ${plan.performanceProfile} · ` +
      `${plan.accelerationMode} · ${plan.reasons.join(' · ')}`
    );
    return normalized;
  }

  async run(config, callbacks = {}, signal) {
    this.clearPause();
    const batchName = sanitizeFileName(
      config.batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`
    );
    const folders = this.prepareFolders(config, batchName);
    const system = await this.ffmpeg.checkSystem({
      gpuIndex: Number(config.gpuIndex ?? -1),
      force: false
    });
    if (!system.ffmpegOk || !system.ffprobeOk) {
      throw new Error('Không tìm thấy FFmpeg/ffprobe hợp lệ.');
    }
    const onlyRenderVoice = String(config.voiceSourceMode || '').toUpperCase() === 'ONLY_RENDER_VOICE';
    const library = onlyRenderVoice ? null : await this.prepareLibrary(config, callbacks);
    const jobs = this.buildJobs(config);
    if (!jobs.length) {
      throw new Error(
        ['RENDER_VOICE_THEN_VIDEO', 'ONLY_RENDER_VOICE'].includes(String(config.voiceSourceMode || '').toUpperCase())
          ? 'Không tìm thấy file kịch bản (.txt) hoặc file voice (.mp3/.wav) trong thư mục đã chọn.'
          : 'Không tìm thấy voice MP3/WAV.'
      );
    }
    await this.prepareMissingVoices({ jobs, config, folders, callbacks, signal });
    if (onlyRenderVoice) {
      await this.hydrateJobDurations(jobs);
      const totalVoiceDurationMs = jobs.reduce((sum, job) => sum + Number(job.voiceDurationMs || 0), 0);
      const batchId = this.database.createBatch({
        ...config,
        batchName,
        outputFolder: folders.outputFolder,
        totalVoiceDurationMs
      }, jobs);
      const dbJobs = this.database.listBatchJobs(batchId);
      for (const dbJob of dbJobs) {
        this.database.updateJob(dbJob.id, {
          status: JOB_STATUS.COMPLETED,
          progress_percent: 100,
          output_path: dbJob.voice_path,
          completed_at: Date.now()
        });
        callbacks.onJob?.({
          jobId: dbJob.id,
          voiceName: dbJob.voice_name,
          status: JOB_STATUS.COMPLETED,
          progress: 100,
          outputPath: dbJob.voice_path
        });
      }
      this.database.updateBatch(batchId, {
        status: BATCH_STATUS.COMPLETED,
        completed_jobs: dbJobs.length,
        completed_at: Date.now()
      });
      this.activeBatchId = null;
      callbacks.onBatch?.({ batchId, status: BATCH_STATUS.COMPLETED });
      return {
        batchId,
        status: BATCH_STATUS.COMPLETED,
        outputFolder: folders.outputFolder,
        completedJobs: dbJobs.length,
        failedJobs: 0
      };
    }
    this.validateMatchedSubtitles(config, jobs);
    this.validateJobGreenInputs(config, jobs);
    this.validateProjectImageInputs(config, jobs);
    await this.hydrateJobDurations(jobs);
    const totalVoiceDurationMs = jobs.reduce((sum, job) => sum + Number(job.voiceDurationMs || 0), 0);
    const resourceConfig = this.resolveResourceConfig(config, system, jobs.length, callbacks);

    const normalized = {
      ...resourceConfig,
      gpuIndex: Number(resourceConfig.gpuIndex) >= 0
        ? Number(resourceConfig.gpuIndex)
        : Number(system.selectedGpuIndex) >= 0
          ? Number(system.selectedGpuIndex)
          : -1,
      codec: resourceConfig.codec || 'auto',
      accelerationMode: resourceConfig.accelerationMode || 'AUTO_STABLE',
      allowCpuFallback: resourceConfig.allowCpuFallback !== false,
      disclaimerEnabled: config.disclaimerEnabled === true || Boolean(config.disclaimerPath || config.disclaimerAssetPath || config.disclaimerType),
      disclaimerPath: config.disclaimerPath || config.disclaimerAssetPath || '',
      disclaimerAssetId: config.disclaimerAssetId || '',
      disclaimerType: normalizeDisclaimerType(config.disclaimerType),
      batchName,
      voiceFolder: config.voiceFolder || (config.singleVoicePath ? path.dirname(config.singleVoicePath) : null),
      srtFolder: config.srtFolder || config.voiceFolder || (config.singleSrtPath ? path.dirname(config.singleSrtPath) : null) || (config.singleVoicePath ? path.dirname(config.singleVoicePath) : null),
      outputFolder: folders.outputFolder,
      libraryId: library?.id || null,
      totalVoiceDurationMs,
      autoGenerateSrt: config.autoGenerateSrt !== false,
      whisperModel: config.whisperModel || 'small',
      whisperLanguage: config.whisperLanguage || 'auto',
      srtMaxChars: Number(config.srtMaxChars || 42),
      srtMaxDur: Number(config.srtMaxDur || 4.2),
      enableJobGreenLayer: jobGreenEnabled(config),
      jobGreenMode: String(config.jobGreenMode || 'GREEN').toUpperCase() === 'IMAGE' ? 'IMAGE' : 'GREEN',
      singleJobGreenPath: config.singleJobGreenPath || '',
      defaultJobGreenPath: config.defaultJobGreenPath || '',
      jobGreenFolder: normalizeJobGreenFolder(config),
      singleJobIntroPath: config.singleJobIntroPath || '',
      batchJobIntroPath: config.batchJobIntroPath || '',
      singleJobIntroFolder: normalizeSingleJobIntroFolder(config),
      jobIntroFolder: normalizeJobIntroFolder(config),
      jobIntroAudioMode: normalizeIntroAudioMode(config.jobIntroAudioMode),
      jobIntroTransition: normalizeIntroTransition(config.jobIntroTransition),
      jobIntroTransitionMs: Math.max(0, Math.min(3000, Number(config.jobIntroTransitionMs || 0))),
      jobIntroNoiseOverlay: config.jobIntroNoiseOverlay === true,
      singleProjectImagePath: config.singleProjectImagePath || '',
      projectImageFolder: normalizeProjectImageFolder(config),
      projectImageMode: String(config.projectImageMode || 'IMAGE').toUpperCase() === 'GREEN' ? 'GREEN' : 'IMAGE',
      jobGreenConfigs: config.jobGreenConfigs || {},
      requireJobGreenAsset: config.requireJobGreenAsset !== false,
      requireJobGreenEdit: config.requireJobGreenEdit === true,
      cleanupJobGreenCache: config.cleanupJobGreenCache !== false,
      cleanupTransientJobFiles: config.cleanupTransientJobFiles !== false,
      jobGreenCacheDurationMs: Number(config.jobGreenCacheDurationMs || 30_000),
      stockPlaybackRate: Number(config.stockPlaybackRate || DEFAULT_STOCK_PLAYBACK_RATE),
      extendShortStock: config.extendShortStock !== false,
      stockClonePasses: Number(config.stockClonePasses || 2),
      stockCloneFlip: config.stockCloneFlip !== false,
      stockCloneZoom: Number(config.stockCloneZoom || DEFAULT_STOCK_CLONE_ZOOM),
      transformAllStock: config.transformAllStock !== false,
      forceStockCover: config.forceStockCover !== false,
      deleteConsumedMatchedStock: config.deleteConsumedMatchedStock !== false,
      stockAllocationMode: config.stockAllocationMode || (config.singleMode ? 'PER_JOB' : 'DURATION_POOL'),
      stockPoolSeed: config.stockPoolSeed || Math.floor(Math.random() * 2_147_483_647),
      transitionItems: (config.transitionItems?.length ? config.transitionItems : GENTLE_TRANSITIONS)
        .map((item) => ({ ...item, enabled: item.enabled !== false }))
    };
    const stockCheck = this.validateStockDuration(normalized, callbacks);
    if (stockCheck) {
      callbacks.onLog?.(
        `Preflight stock: ${formatDuration(stockCheck.totalVoiceMs)} voice / ${formatDuration(stockCheck.totalStockMs)} stock khả dụng.`
      );
    }
    callbacks.onLog?.(
      system.nvencRuntime
        ? `Auto GPU: ${system.selectedGpuName || 'NVIDIA GPU'} · index ${normalized.gpuIndex} · NVENC sẵn sàng`
        : system.nvencPotential
          ? `Auto GPU: phát hiện ${system.selectedGpuName || 'NVIDIA GPU'}; test NVENC tạm thời chưa đạt, render vẫn thử GPU trước rồi tự phục hồi/fallback`
          : `Không phát hiện NVIDIA NVENC · tự dùng CPU`
    );
    const batchId = this.database.createBatch(normalized, jobs);
    this.activeBatchId = batchId;
    this.database.updateBatch(batchId, { status: BATCH_STATUS.RUNNING, started_at: Date.now() });
    callbacks.onBatch?.({ batchId, status: BATCH_STATUS.RUNNING });
    try {
      await this.prepareMissingSubtitles({
        batchId,
        jobs: this.database.listBatchJobs(batchId),
        config: normalized,
        system,
        callbacks,
        signal
      });
    } catch (error) {
      return this.finishBeforeRenderFailure({ batchId, folders, callbacks, error });
    }
    return this.execute(batchId, normalized, folders, system, callbacks, signal);
  }

  async resume(batchId, callbacks = {}, signal) {
    const batch = this.database.getBatch(batchId);
    if (!batch) throw new Error('Batch không tồn tại.');
    this.clearPause();
    this.activeBatchId = batchId;
    const config = batch.config;
    const folders = {
      outputFolder: batch.output_folder,
      videoFolder: config.singleMode
        ? batch.output_folder
        : ensureDirectory(path.join(batch.output_folder, 'Videos')),
      reportFolder: ensureDirectory(path.join(batch.output_folder, 'Reports')),
      logFolder: ensureDirectory(path.join(batch.output_folder, 'Logs')),
      usedBatchFolder: (config.usedFolder ||
        (config.libraryId && typeof this.database?.listLibraries === 'function'
          ? this.database.listLibraries().find((item) => item.id === config.libraryId)?.used_path
          : null) ||
        (config.mediaFolder ? path.join(config.mediaFolder, 'Used') : null))
        ? ensureDirectory(path.join(
            config.usedFolder ||
              (config.libraryId && typeof this.database?.listLibraries === 'function'
                ? this.database.listLibraries().find((item) => item.id === config.libraryId)?.used_path
                : null) ||
              path.join(config.mediaFolder, 'Used'),
            config.batchName || batch.name
          ))
        : null
    };
    const system = await this.ffmpeg.checkSystem({
      gpuIndex: Number(config.gpuIndex ?? -1),
      force: false
    });
    const remainingJobs = this.database.listBatchJobs(batchId)
      .filter((job) => !['COMPLETED', 'SKIPPED'].includes(job.status));
    const resumeConfig = this.resolveResourceConfig(config, system, remainingJobs.length, callbacks);
    this.database.updateBatch(batchId, { status: BATCH_STATUS.RUNNING, stop_reason: null });
    try {
      await this.prepareMissingSubtitles({
        batchId,
        jobs: remainingJobs,
        config: resumeConfig,
        system,
        callbacks,
        signal
      });
    } catch (error) {
      return this.finishBeforeRenderFailure({ batchId, folders, callbacks, error });
    }
    return this.execute(batchId, resumeConfig, folders, system, callbacks, signal);
  }

  async retryFailed(batchId, callbacks = {}, signal) {
    const batch = this.database.getBatch(batchId);
    if (!batch) throw new Error('Batch không tồn tại.');
    const failedJobs = this.database.listBatchJobs(batchId)
      .filter((job) => job.status === JOB_STATUS.FAILED);
    if (!failedJobs.length) {
      throw Object.assign(new Error('Batch này không có video lỗi để retry.'), { code: 'NO_FAILED_JOBS' });
    }
    this.clearPause();
    this.activeBatchId = batchId;
    const config = batch.config;
    const folders = {
      outputFolder: batch.output_folder,
      videoFolder: config.singleMode
        ? batch.output_folder
        : ensureDirectory(path.join(batch.output_folder, 'Videos')),
      reportFolder: ensureDirectory(path.join(batch.output_folder, 'Reports')),
      logFolder: ensureDirectory(path.join(batch.output_folder, 'Logs')),
      usedBatchFolder: (config.usedFolder ||
        (config.libraryId && typeof this.database?.listLibraries === 'function'
          ? this.database.listLibraries().find((item) => item.id === config.libraryId)?.used_path
          : null) ||
        (config.mediaFolder ? path.join(config.mediaFolder, 'Used') : null))
        ? ensureDirectory(path.join(
            config.usedFolder ||
              (config.libraryId && typeof this.database?.listLibraries === 'function'
                ? this.database.listLibraries().find((item) => item.id === config.libraryId)?.used_path
                : null) ||
              path.join(config.mediaFolder, 'Used'),
            config.batchName || batch.name
          ))
        : null
    };
    for (const job of failedJobs) {
      this.database.updateJob(job.id, {
        status: JOB_STATUS.PENDING,
        progress_percent: 0,
        current_attempt: 0,
        error_code: null,
        error_message: null,
        started_at: null,
        completed_at: null
      });
    }
    this.database.updateBatch(batchId, {
      status: BATCH_STATUS.RUNNING,
      stop_reason: null,
      failed_jobs: Math.max(0, Number(batch.failed_jobs || 0) - failedJobs.length)
    });
    callbacks.onLog?.(`Retry: chạy lại ${failedJobs.length} video lỗi.`);
    const system = await this.ffmpeg.checkSystem({
      gpuIndex: Number(config.gpuIndex ?? -1),
      force: false
    });
    const retryConfig = this.resolveResourceConfig(config, system, failedJobs.length, callbacks);
    try {
      await this.prepareMissingSubtitles({
        batchId,
        jobs: failedJobs,
        config: retryConfig,
        system,
        callbacks,
        signal
      });
    } catch (error) {
      return this.finishBeforeRenderFailure({ batchId, folders, callbacks, error });
    }
    return this.execute(batchId, retryConfig, folders, system, callbacks, signal, {
      jobIds: failedJobs.map((job) => job.id)
    });
  }

  createRenderConfig(job, config) {
    const template = job.template_id ? this.database.getTemplate(job.template_id) : null;
    const templateConfig = normalizeTemplate(template);
    const renderConfig = deepMerge(templateConfig, {
      ...config,
      width: STANDARD_CANVAS_WIDTH,
      height: STANDARD_CANVAS_HEIGHT,
      fps: config.fps || templateConfig.canvas.fps,
      canvas: { ...(templateConfig.canvas || {}), width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT },
      backgroundMode: job.background_mode,
      disclaimerType: normalizeDisclaimerType(config.disclaimerType)
    });
    renderConfig.subtitle = sanitizeCanvasSubtitle(renderConfig.subtitle || {});
    delete renderConfig.layerCache;
    return renderConfig;
  }

  listRenderableAssets(libraryId, callbacks) {
    const assets = this.database.listAvailableAssets(libraryId);
    const missing = assets.filter((asset) => !fs.existsSync(asset.file_path));
    if (missing.length) {
      this.database.markMissingAssets(missing.map((asset) => asset.id));
      callbacks.onLog?.(`Media library: bỏ qua ${missing.length} file không còn tồn tại trên ổ đĩa.`);
    }
    return assets
      .filter((asset) => fs.existsSync(asset.file_path))
      .map((asset) => {
        const progress = typeof this.database.getMatchedStockProgress === 'function'
          ? this.database.getMatchedStockProgress(asset.file_path, asset.duration_ms || asset.durationMs)
          : {
              phase: 1,
              consumedStartMs: typeof this.database.getMatchedStockConsumedMs === 'function'
                ? this.database.getMatchedStockConsumedMs(asset.file_path)
                : 0
            };
        return {
          ...asset,
          consumedStartMs: progress.consumedStartMs,
          consumed_start_ms: progress.consumedStartMs,
          stockPhase: progress.phase,
          stock_phase: progress.phase
        };
      })
      .filter((asset) => Number(asset.duration_ms || asset.durationMs || 0) - Number(asset.consumedStartMs || 0) > 20);
  }

  createMediaPlan(job, config, renderConfig, voiceDurationMs, callbacks = {}, stockPool = null) {
    if (job.background_mode === BACKGROUND_MODE.STOCK_VIDEO) {
      if (stockPool) {
        const plan = stockPool.allocate({ voiceDurationMs });
        plan.toleranceMs = Number(config.stockDurationToleranceMs ?? 500);
        plan.deleteWhenFullyConsumed = config.deleteConsumedMatchedStock !== false;
        this.database.saveJobAssets(job.id, 'STOCK_POOL', plan.segments);
        callbacks.onLog?.(
          `${job.voice_name}: stock folder cấp ${formatDuration(voiceDurationMs)} từ ${plan.segments.length} đoạn stock.`
        );
        return { plan, reserved: false };
      }
      // Allocation and reservation are synchronous, so parallel workers cannot interleave here.
      const assets = this.listRenderableAssets(config.libraryId, callbacks);
      const plan = planStockSegments({
        assets,
        voiceDurationMs,
        seed: job.transition_seed,
        transitionItems: renderConfig.transitionItems || renderConfig.transition?.items || GENTLE_TRANSITIONS,
        minTransitionMs: Number(renderConfig.minTransitionMs || renderConfig.transition?.minDurationMs || 600),
        maxTransitionMs: Number(renderConfig.maxTransitionMs || renderConfig.transition?.maxDurationMs || 900),
        avoidRepeatCount: Number(renderConfig.avoidRepeatCount ?? renderConfig.transition?.avoidRepeatCount ?? 2),
        selectionMode: renderConfig.selectionMode || 'SHUFFLE'
      });
      this.database.reserveAssets(job.id, plan.segments.map((segment) => segment.assetId));
      this.database.saveJobAssets(job.id, 'STOCK', plan.segments);
      return { plan, reserved: true };
    }

    if (job.background_mode === BACKGROUND_MODE.IMAGE_SEQUENCE) {
      const assets = this.listRenderableAssets(config.libraryId, callbacks);
      const plan = planImageSegments({
        assets,
        voiceDurationMs,
        seed: job.image_seed,
        durationMs: Number(renderConfig.imageDurationMs || renderConfig.imageSequence?.durationMs || 5000),
        allowFlip: Boolean(renderConfig.allowImageFlip ?? renderConfig.imageSequence?.allowFlip),
        transitionItems: renderConfig.transitionItems || renderConfig.transition?.items || GENTLE_TRANSITIONS,
        minTransitionMs: Number(renderConfig.minTransitionMs || 600),
        maxTransitionMs: Number(renderConfig.maxTransitionMs || 900),
        avoidRepeatCount: Number(renderConfig.avoidRepeatCount ?? 2),
        selectionMode: renderConfig.imageSelectionMode || 'SEQUENTIAL'
      });
      this.database.saveJobAssets(job.id, 'IMAGE', plan.segments);
      return { plan, reserved: false };
    }

    return { plan: null, reserved: false };
  }

  layerCacheKey(renderConfig, layers, durationMs) {
    const hash = crypto.createHash('sha256');
    const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
    const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
    const fps = Number(renderConfig.fps || renderConfig.canvas?.fps || 24);
    const rawProj = renderConfig.projectId || renderConfig.batchName || 'PROJECT';
    const projectKey = String(rawProj).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 32);
    const payload = {
      version: 3,
      projectKey,
      width,
      height,
      fps,
      durationMs,
      layers: layers.map((layer) => {
        const normalized = normalizeLayerForCache(layer);
        const source = normalized.sourceReference || normalized.source || '';
        const fileName = path.basename(source);
        let size = 0;
        if (source && fs.existsSync(source)) {
          try {
            const fileStat = fs.statSync(source);
            size = fileStat.size;
          } catch {}
        }
        return {
          type: normalized.type,
          zIndex: normalized.zIndex,
          fileName,
          size,
          transform: normalized.transform,
          style: normalized.style,
          effect: normalized.effect
        };
      })
    };
    hash.update(JSON.stringify(payload));
    return hash.digest('hex').slice(0, 24);
  }

  layerCacheReady(cachePath) {
    try {
      return fs.existsSync(cachePath) && fs.statSync(cachePath).size >= 1024;
    } catch {
      return false;
    }
  }

  pruneLayerOverlayCache({ keepPath = null, maxBytes = DEFAULT_LAYER_CACHE_MAX_BYTES, callbacks = {}, cacheRoot = null } = {}) {
    const targetCacheRoot = cacheRoot
      || (keepPath && fs.existsSync(path.dirname(keepPath)) ? path.dirname(keepPath) : null)
      || (this.paths?.cache && fs.existsSync(path.join(this.paths.cache, 'project-layer-cache')) ? path.join(this.paths.cache, 'project-layer-cache') : null)
      || (this.paths?.cache ? path.join(this.paths.cache, 'layer-overlays') : null);
    if (!targetCacheRoot || !fs.existsSync(targetCacheRoot)) return { removed: 0, freedBytes: 0, totalBytes: 0 };
    let files = [];
    try {
      files = fs.readdirSync(targetCacheRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.mov')
        .map((entry) => {
          const filePath = path.join(targetCacheRoot, entry.name);
          const stat = fs.statSync(filePath);
          return { filePath, size: stat.size, mtimeMs: stat.mtimeMs };
        });
    } catch {
      return { removed: 0, freedBytes: 0, totalBytes: 0 };
    }
    let totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const limit = Math.max(1, Number(maxBytes || DEFAULT_LAYER_CACHE_MAX_BYTES));
    if (totalBytes <= limit) return { removed: 0, freedBytes: 0, totalBytes };

    const keep = keepPath ? path.resolve(keepPath).toLocaleLowerCase('en-US') : '';
    let removed = 0;
    let freedBytes = 0;
    for (const file of files.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
      if (path.resolve(file.filePath).toLocaleLowerCase('en-US') === keep) continue;
      if (totalBytes <= limit) break;
      if (removePathQuiet(file.filePath)) {
        removed += 1;
        freedBytes += file.size;
        totalBytes -= file.size;
      }
    }
    if (removed) {
      callbacks.onLog?.(`Layer cache: đã xóa ${removed} cache cũ, giải phóng ${(freedBytes / 1024 / 1024 / 1024).toFixed(2)} GB.`);
    }
    return { removed, freedBytes, totalBytes };
  }

  layerCacheAcceleration(renderConfig = {}, system = {}) {
    const requested = String(renderConfig.accelerationMode || 'AUTO_STABLE').toUpperCase();
    const requestedGpu = Number(renderConfig.gpuIndex);
    const gpuIndex = requestedGpu >= 0 ? requestedGpu : Math.max(0, Number(system.selectedGpuIndex || 0));
    if (requested === 'CPU' || renderConfig.layerCacheCuda === false) {
      return { mode: 'CPU', gpuIndex, label: 'CPU layer cache' };
    }
    if (system.cudaAvailable && system.scaleCuda && !isPascalGtx10(system)) {
      return {
        mode: 'CUDA',
        gpuIndex,
        label: `CUDA decode/scale layer cache · GPU ${gpuIndex}`
      };
    }
    return { mode: 'CPU', gpuIndex, label: 'CPU layer cache' };
  }

  async renderLayerCacheOnce({ key, cachePath, cacheRoot, layers, cacheDurationMs, renderConfig, callbacks, signal, cacheLogPrefix = 'Layer cache', system = {} }) {
    if (this.layerCacheReady(cachePath)) {
      callbacks.onLog?.(`${cacheLogPrefix}: dùng lại overlay cache có sẵn.`);
      return;
    }
    const active = this.layerCachePromises.get(key);
    if (active) {
      callbacks.onLog?.(`${cacheLogPrefix}: đang có worker khác render cache này, chờ dùng lại.`);
      await active;
      return;
    }

    const task = (async () => {
      const acceleration = this.layerCacheAcceleration(renderConfig, system);
      callbacks.onLog?.(
        `${cacheLogPrefix}: render overlay ${Math.round(cacheDurationMs / 1000)}s một lần để tái sử dụng` +
        (acceleration.mode === 'CUDA' ? ` · ${acceleration.label}` : '') + '.'
      );
      const tempCachePath = path.join(cacheRoot, `${key}.${process.pid}.${Date.now()}.tmp.mov`);
      try { if (fs.existsSync(tempCachePath)) fs.rmSync(tempCachePath, { force: true }); } catch {}
      const renderCache = async (activeAcceleration) => {
        const args = buildLayerCacheArguments({
          layers,
          outputPath: tempCachePath,
          durationMs: cacheDurationMs,
          config: renderConfig,
          acceleration: activeAcceleration
        });
        await this.ffmpeg.render(args, {
          durationMs: cacheDurationMs,
          signal,
          onProgress: (progress) => callbacks.onProgress?.({
            stage: 'RENDER',
            voiceName: 'layer cache',
            ...progress,
            percent: progress.percent
          })
        });
      };
      try {
        await renderCache(acceleration);
      } catch (error) {
        if (acceleration.mode !== 'CUDA' || !isCudaPipelineError(error)) throw error;
        callbacks.onLog?.(`${cacheLogPrefix}: CUDA layer cache lỗi; chạy lại cache bằng CPU.`);
        try { if (fs.existsSync(tempCachePath)) fs.rmSync(tempCachePath, { force: true }); } catch {}
        await renderCache({ mode: 'CPU', gpuIndex: acceleration.gpuIndex, label: 'CPU layer cache fallback' });
      }
      await replaceFile(tempCachePath, cachePath);
    })();

    this.layerCachePromises.set(key, task);
    try {
      await task;
    } finally {
      this.layerCachePromises.delete(key);
    }
  }

  async prepareLayerCache({
    renderConfig,
    callbacks,
    signal,
    system = {},
    cacheRoot = null,
    cacheDurationMs = null,
    cacheKeyPrefix = '',
    cacheLogPrefix = 'Layer cache',
    cachedJobGreenOverlay = false
  }) {
    const visibleLayers = (renderConfig.layers || [])
      .filter((layer) => layer.visible !== false);
    const directProjectImageLayers = visibleLayers.filter(isDirectProjectImageLayer);
    const layers = visibleLayers
      .filter((layer) => !isDirectProjectImageLayer(layer))
      .filter(renderableLayerType);
    if (directProjectImageLayers.length) {
      callbacks.onLog?.(`${cacheLogPrefix}: giữ ${directProjectImageLayers.length} ảnh theo voice để ghép trực tiếp từng video, không tạo cache riêng.`);
    }
    if (!layers.length || renderConfig.layerCache === false) return { renderConfig, cachePath: null, cacheUsed: false };

    // Nếu cấu hình đã chứa layer cache được tạo từ trước (ví dụ do FarmRenderEngine gộp), không tạo đè lần 2
    const hasExistingCachedOverlay = layers.some(l => l.cachedLayerOverlay === true || String(l.id || '').startsWith('layer-cache-'));
    if (hasExistingCachedOverlay) {
      callbacks.onLog?.(`${cacheLogPrefix}: đã có sẵn Overlay Cache trong cấu hình, bỏ qua tạo cache mới.`);
      return { renderConfig, cachePath: null, cacheUsed: true };
    }

    if (!layers.every(canCacheLayer)) {
      callbacks.onLog?.(`${cacheLogPrefix}: bỏ qua vì có layer dùng timing riêng.`);
      return { renderConfig, cachePath: null, cacheUsed: false };
    }
    for (const layer of layers) {
      let source = layer.sourceReference || layer.source;
      if (source && !fs.existsSync(source)) {
        const fileName = path.basename(source);
        const candidates = [
          renderConfig.overlayFolder ? path.join(renderConfig.overlayFolder, fileName) : null,
          renderConfig.jobGreenFolder ? path.join(renderConfig.jobGreenFolder, fileName) : null,
          renderConfig.outputFolder ? path.join(renderConfig.outputFolder, fileName) : null,
          path.join(this.paths.temp, fileName)
        ].filter(Boolean);
        const found = candidates.find(c => fs.existsSync(c));
        if (found) {
          source = found;
          layer.source = found;
          layer.sourceReference = found;
        }
      }
      if (source) {
        if (!fs.existsSync(source)) {
          // Nếu đây là file overlay cache trung gian mà bị thiếu, vô hiệu hóa an toàn để không làm chết video
          if (layer.cachedLayerOverlay === true || String(source).includes('project-layer-cache') || String(layer.id || '').startsWith('layer-cache-')) {
            callbacks.onLog?.(`⚠️ [LAYER CACHE] File cache [${path.basename(source)}] không còn tồn tại trên đĩa. Tự động bỏ qua layer cache này để tiếp tục render video an toàn.`);
            layer.visible = false;
            layer.source = null;
            layer.sourceReference = null;
            continue;
          }
          assertExistingFile(source, `Layer source không còn tồn tại: ${source}`, 'MISSING_LAYER_SOURCE');
        }
      }
    }

    const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
    const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
    const fps = Number(renderConfig.fps || renderConfig.canvas?.fps || 24);
    const effectiveCacheDurationMs = Math.max(1000, Number(cacheDurationMs || renderConfig.layerCacheDurationMs || 60_000));
    const rawProj = renderConfig.projectId || renderConfig.batchName || 'PROJECT';
    const projectKey = String(rawProj).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 32);
    const keyBase = this.layerCacheKey(renderConfig, layers, effectiveCacheDurationMs);
    const key = cacheKeyPrefix ? `${sanitizeFileName(cacheKeyPrefix)}-${keyBase}` : `proj_${projectKey}_${keyBase}`;
    const effectiveCacheRoot = ensureDirectory(cacheRoot || (this.paths?.cache ? path.join(this.paths.cache, 'project-layer-cache') : path.join(process.cwd(), '.vbs-user-data', 'cache', 'project-layer-cache')));
    const cachePath = path.join(effectiveCacheRoot, `${key}.mov`);

    if (!this.layerCacheReady(cachePath)) {
      await this.renderLayerCacheOnce({
        key,
        cachePath,
        cacheRoot: effectiveCacheRoot,
        layers,
        cacheDurationMs: effectiveCacheDurationMs,
        renderConfig,
        callbacks,
        signal,
        system,
        cacheLogPrefix
      });
    } else {
      callbacks.onLog?.(`${cacheLogPrefix}: dùng lại overlay cache có sẵn.`);
    }
    try { fs.utimesSync(cachePath, new Date(), new Date()); } catch {}
    if (!cacheRoot) {
      const maxLayerCacheBytes = Number(renderConfig.layerCacheMaxBytes || 0) ||
        Math.max(1, Number(renderConfig.layerCacheMaxGb || 8)) * 1024 * 1024 * 1024;
      this.pruneLayerOverlayCache({ keepPath: cachePath, maxBytes: maxLayerCacheBytes, callbacks, cacheRoot: effectiveCacheRoot });
    }

    const maxLayerZ = layers.reduce((max, l) => Math.max(max, Number(l.zIndex ?? 0)), 1000);
    const cachedLayer = {
      id: `layer-cache-${key}`,
      type: 'OVERLAY_VIDEO',
      name: 'Cached Layer Overlay',
      sourceReference: cachePath,
      visible: true,
      loop: true,
      cachedLayerOverlay: true,
      cachedJobGreenOverlay,
      zIndex: maxLayerZ,
      startMs: 0,
      endMs: null,
      transform: { x: 0, y: 0, width, height, opacity: 1, rotation: 0 },
      style: {},
      timing: {},
      effect: { blendMode: 'normal' }
    };
    return {
      renderConfig: {
        ...renderConfig,
        layers: [cachedLayer, ...directProjectImageLayers],
        layerCachePath: cachePath
      },
      cachePath,
      cacheUsed: true
    };
  }

  jobGreenCacheKey({ job, assetPath, greenConfig, renderConfig, cacheDurationMs }) {
    const hash = crypto.createHash('sha256');
    let stat = null;
    try {
      const fileStat = fs.statSync(assetPath);
      stat = { size: fileStat.size, mtimeMs: Math.round(fileStat.mtimeMs) };
    } catch {
      stat = { missing: true };
    }
    hash.update(JSON.stringify({
      version: 2,
      jobId: job.id,
      assetPath,
      stat,
      greenConfig,
      assetMode: greenConfig?.assetMode || renderConfig.jobGreenMode || 'GREEN',
      width: Number(renderConfig.width || renderConfig.canvas?.width || 1920),
      height: Number(renderConfig.height || renderConfig.canvas?.height || 1080),
      fps: Number(renderConfig.fps || renderConfig.canvas?.fps || 24),
      cacheDurationMs
    }));
    return `${job.id}-${hash.digest('hex').slice(0, 24)}`;
  }

  resolveJobGreenForRender(job, config, renderConfig) {
    if (!jobGreenEnabled(config)) return null;
    const voice = job.voice_path || job.voicePath || job.voice_name || job.voiceName;
    const key = jobGreenKeyForVoice(voice);
    const assetPath = resolveJobGreenAsset(voice, config);
    if (!assetPath) {
      if (config.requireJobGreenAsset !== false) {
        throw Object.assign(new Error(`Thiếu green asset cùng tên cho ${job.voice_name || voice}.`), {
          code: 'MISSING_JOB_GREEN_ASSET'
        });
      }
      return null;
    }
    const greenConfig = {
      ...defaultJobGreenConfig(renderConfig),
      ...((config.jobGreenConfigs || {})[key] || {}),
      assetMode: ((config.jobGreenConfigs || {})[key]?.assetMode || config.jobGreenMode || 'GREEN')
    };
    if (config.requireJobGreenEdit === true && !greenConfig.edited) {
      throw Object.assign(new Error(`${job.voice_name || voice}: chưa lưu chỉnh green.`), {
        code: 'UNEDITED_JOB_GREEN'
      });
    }
    return { key, assetPath, greenConfig };
  }

  async prepareJobGreenCache({ job, batchId, config, renderConfig, callbacks, signal }) {
    const resolved = this.resolveJobGreenForRender(job, config, renderConfig);
    if (!resolved) return null;

    const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
    const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
    const cacheDurationMs = Math.max(1000, Number(config.jobGreenCacheDurationMs || 30_000));
    const cacheRoot = ensureDirectory(path.join(this.paths.cache, 'job-green-overlays', batchId));
    const key = this.jobGreenCacheKey({
      job,
      assetPath: resolved.assetPath,
      greenConfig: resolved.greenConfig,
      renderConfig,
      cacheDurationMs
    });
    const cachePath = path.join(cacheRoot, `${key}.mov`);

    if (!this.layerCacheReady(cachePath)) {
      callbacks.onLog?.(`${job.voice_name}: render green riêng ${Math.round(cacheDurationMs / 1000)}s để cache tạm.`);
      const tempCachePath = path.join(cacheRoot, `${key}.${process.pid}.${Date.now()}.tmp.mov`);
      const sourceLayer = jobGreenLayerFromConfig({
        job,
        assetPath: resolved.assetPath,
        greenConfig: resolved.greenConfig,
        renderConfig
      });
      const args = buildLayerCacheArguments({
        layers: [sourceLayer],
        outputPath: tempCachePath,
        durationMs: cacheDurationMs,
        config: renderConfig
      });
      try { if (fs.existsSync(tempCachePath)) fs.rmSync(tempCachePath, { force: true }); } catch {}
      await this.ffmpeg.render(args, {
        durationMs: cacheDurationMs,
        signal,
        onProgress: (progress) => callbacks.onProgress?.({
          stage: 'RENDER',
          jobId: job.id,
          voiceName: `${job.voice_name} · green cache`,
          ...progress,
          percent: Math.min(8, progress.percent * 0.08)
        })
      });
      await replaceFile(tempCachePath, cachePath);
    }

    return {
      id: `job-green-cache-${job.id}`,
      type: 'OVERLAY_VIDEO',
      name: `Green riêng cache · ${job.voice_name}`,
      sourceReference: cachePath,
      visible: true,
      loop: true,
      cachedJobGreenOverlay: true,
      zIndex: 10000,
      startMs: Number(resolved.greenConfig.startMs || 0),
      endMs: resolved.greenConfig.endMs ?? null,
      transform: { x: 0, y: 0, width, height, opacity: 1, rotation: 0 },
      style: {},
      timing: {},
      effect: { blendMode: 'normal' }
    };
  }

  cleanupJobGreenCache(batchId, config, callbacks) {
    if (config.cleanupJobGreenCache === false) return;
    if (!this.paths?.cache) return;
    const cacheRoot = path.join(this.paths.cache, 'job-green-overlays', batchId);
    try {
      if (fs.existsSync(cacheRoot)) {
        fs.rmSync(cacheRoot, { recursive: true, force: true });
        callbacks.onLog?.('Green cache riêng: đã xóa cache tạm của batch.');
      }
    } catch (error) {
      callbacks.onLog?.(`Green cache riêng: không xóa được cache tạm (${error.message}).`);
    }
  }

  cleanupJobTransientFiles(job, batchId, callbacks = {}) {
    const jobId = job?.id;
    if (!jobId) return 0;
    let removed = 0;
    const tempRoot = this.paths?.temp;
    if (tempRoot && fs.existsSync(tempRoot)) {
      try {
        for (const name of fs.readdirSync(tempRoot)) {
          if (name === `${jobId}.mp4` || name.startsWith(`${jobId}-`)) {
            if (removePathQuiet(path.join(tempRoot, name))) removed += 1;
          }
        }
      } catch {}
    }
    const greenRoot = batchId && this.paths?.cache
      ? path.join(this.paths.cache, 'job-green-overlays', batchId)
      : null;
    if (greenRoot && fs.existsSync(greenRoot)) {
      try {
        for (const name of fs.readdirSync(greenRoot)) {
          if (name.startsWith(`${jobId}-`)) {
            if (removePathQuiet(path.join(greenRoot, name))) removed += 1;
          }
        }
      } catch {}
    }
    if (removed) callbacks.onLog?.(`${job.voice_name || job.voiceName || jobId}: đã xóa ${removed} file tạm/cache dùng một lần.`);
    return removed;
  }

  async preSliceStockSegments(segments = [], jobId, callbacks = {}, signal = null, logPath = null) {
    if (!Array.isArray(segments) || !segments.length) return segments;
    const nextSegments = [];
    for (let index = 0; index < segments.length; index += 1) {
      const seg = { ...segments[index] };
      const isVideo = String(seg.mediaType || '').toUpperCase() === 'VIDEO';
      const sourceFile = seg.filePath;
      if (!isVideo || !sourceFile || !fs.existsSync(sourceFile)) {
        nextSegments.push(seg);
        continue;
      }

      const trimStartMs = Number(seg.trimStartMs || 0);
      const playbackRate = Number(seg.playbackRate || 1);
      const neededSourceMs = Number(seg.sourceDurationMs || (Number(seg.durationMs || 0) * playbackRate)) || 1000;
      const sourceTotalMs = Number(seg.sourceTotalDurationMs || 0);
      const shouldSlice = trimStartMs > 0 || sourceTotalMs > (neededSourceMs + 5000) || sourceTotalMs > 60000;

      if (!shouldSlice) {
        nextSegments.push(seg);
        continue;
      }

      const tempSlicedPath = path.join(this.paths.temp, `${jobId}-preslice-seg-${index}.mp4`);
      const startSec = Math.max(0, trimStartMs / 1000);
      const durationSec = Math.max(1, (neededSourceMs / 1000) + 2);
      const t0 = Date.now();

      try {
        const sliceArgs = [
          '-y',
          '-hide_banner',
          '-loglevel', 'error',
          '-ss', String(startSec),
          '-i', sourceFile,
          '-t', String(durationSec),
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          tempSlicedPath
        ];
        await this.ffmpeg._run(this.ffmpeg.ffmpegPath, sliceArgs, { signal });
        if (fs.existsSync(tempSlicedPath) && fs.statSync(tempSlicedPath).size > 1024) {
          const elapsed = Date.now() - t0;
          const msg = `⚡ Đã tự động cắt trước stock [đoạn ${index + 1}/${segments.length}] khớp voice (${formatDuration(neededSourceMs)}) trong ${elapsed}ms.`;
          callbacks.onLog?.(msg);
          if (logPath) fs.appendFileSync(logPath, `Pre-sliced stock [seg ${index + 1}]: ${sourceFile} (offset ${startSec}s) -> ${tempSlicedPath} (${elapsed}ms)\n`, 'utf8');
          seg.filePath = tempSlicedPath;
          seg.trimStartMs = 0;
          seg.sourceRangeStartMs = 0;
          seg.preSliced = true;
        } else {
          callbacks.onLog?.(`⚠️ Cắt trước stock không tạo được file, giữ nguyên nguồn gốc.`);
        }
      } catch (err) {
        callbacks.onLog?.(`⚠️ Cắt trước stock: ${err.message}. Tiếp tục dùng file gốc.`);
      }
      nextSegments.push(seg);
    }
    return nextSegments;
  }

  async processJob({ job, batchId, config, folders, system, callbacks, signal, stockPool }) {
    let reserved = false;
    let releaseStockSource = null;
    try {
      this.database.updateJob(job.id, {
        status: JOB_STATUS.VALIDATING,
        started_at: Date.now(),
        progress_percent: 0
      });
      callbacks.onJob?.({ jobId: job.id, voiceName: job.voice_name, status: JOB_STATUS.VALIDATING });

      callbacks.onLog?.(`${job.voice_name}: 🔍 [BƯỚC 1/4 - PHỤ ĐỀ] Đang kiểm tra thời lượng audio & file phụ đề SRT...`);
      const voice = await this.ffmpeg.probe(job.voice_path);
      if (!voice.durationMs) throw new Error('Voice không có thời lượng hợp lệ.');
      job.voiceDurationMs = voice.durationMs;
      this.database.updateJob(job.id, { voice_duration_ms: voice.durationMs });
      callbacks.onLog?.(`${job.voice_name}: ⏱️ Độ dài audio: ${Math.round(voice.durationMs / 1000)}s (~${(voice.durationMs / 60000).toFixed(1)} phút).`);
      await this.ensureJobSubtitle(job, config, callbacks, signal);
      let renderConfig = {
        ...this.createRenderConfig(job, config),
        voiceAudioCodec: voice.audioCodec || null,
        voiceAudioSampleRate: Number(voice.audioSampleRate || 0),
        voiceAudioChannels: Number(voice.audioChannels || 0)
      };
      const fullGpuZeroCopy = isFullGpuMode(renderConfig);
      renderConfig = resolveProjectImageLayers({ job, config, renderConfig });
      renderConfig = await optimizeRenderConfigImageLayers(renderConfig, this.paths.temp, callbacks);
      const disclaimerInfo = renderConfig.disclaimerEnabled === true
        ? await this.getDisclaimerInfo(renderConfig)
        : null;
      const jobIntroInfos = await this.getJobIntroInfos(job, config);
      const karaokeBoxMode = isKaraokeBoxEffect(renderConfig.subtitle);
      const useCanvasSubtitle = Boolean(
        !fullGpuZeroCopy &&
        !karaokeBoxMode &&
        this.subtitleOverlay &&
        (typeof this.subtitleOverlay.isAvailable !== 'function' || this.subtitleOverlay.isAvailable()) &&
        renderConfig.subtitle?.renderer !== 'libass'
      );
      let renderSubtitlePath = prepareRenderSubtitle({
        job,
        renderConfig,
        tempDirectory: this.paths.temp,
        forceSrt: useCanvasSubtitle
      });
      let renderJob = renderSubtitlePath === job.srt_path ? job : { ...job, srt_path: renderSubtitlePath };
      if (renderSubtitlePath) {
        if (karaokeBoxMode) {
          callbacks.onLog?.(`${job.voice_name}: 🎤 Dùng Hiệu ứng Sub: Karaoke hộp (Màu hộp: ${renderConfig.subtitle?.karaokeBoxColor || '#7C00FF'}) · [${path.basename(renderSubtitlePath)}].`);
        } else {
          callbacks.onLog?.(`${job.voice_name}: dùng SRT ${path.basename(renderSubtitlePath)}.`);
        }
      }

      let mediaPlan;
      callbacks.onLog?.(`${job.voice_name}: 📼 [BƯỚC 2/4 - STOCK NỀN] Đang khớp và phân bổ các video stock nền (${job.background_mode || 'STOCK_VIDEO'})...`);
      if (job.background_mode === BACKGROUND_MODE.SINGLE_STOCK) {
        const singleStockPath = config.singleStockPath || config.manualMediaPath;
        assertExistingFile(
          singleStockPath,
          `Stock đã cắt sẵn không còn tồn tại: ${singleStockPath || '(trống)'}`,
          'MISSING_SINGLE_STOCK_FILE'
        );
        releaseStockSource = this.reserveStockSource(singleStockPath);
        const metadata = await this.ffmpeg.probe(singleStockPath);
        const stockProgress = typeof this.database.getMatchedStockProgress === 'function'
          ? this.database.getMatchedStockProgress(singleStockPath, metadata.durationMs)
          : { consumedStartMs: this.database.getMatchedStockConsumedMs(singleStockPath), phase: 1 };
        mediaPlan = planSingleStockSegment({
          filePath: singleStockPath,
          metadata,
          voiceDurationMs: voice.durationMs,
          toleranceMs: Number(config.stockDurationToleranceMs ?? 500),
          consumedStartMs: stockProgress.consumedStartMs,
          consumedPhase: stockProgress.phase,
          ...matchedStockOptions(config)
        });
        mediaPlan.sourcePath = singleStockPath;
        mediaPlan.toleranceMs = Number(config.stockDurationToleranceMs ?? 500);
        mediaPlan.deleteWhenFullyConsumed = config.deleteConsumedMatchedStock !== false;
        callbacks.onLog?.(`${job.voice_name}: chế độ 1 stock đã cắt sẵn · speed ${mediaPlan.playbackRate}x${mediaPlan.cloned?' · clone lật/zoom nếu thiếu':''} · không Cross Dissolve nền.`);
        this.database.saveJobAssets(job.id, 'SINGLE_STOCK', mediaPlan.segments);
      } else if (job.background_mode === BACKGROUND_MODE.MATCHED_STOCK) {
        const matchedStockPath = resolveMatchedStockAsset(job.voice_path, config);
        assertExistingFile(
          matchedStockPath,
          `Stock cùng tên voice không còn tồn tại: ${matchedStockPath || '(trống)'}`,
          'MISSING_MATCHED_STOCK_FILE'
        );
        releaseStockSource = this.reserveStockSource(matchedStockPath);
        const metadata = await this.ffmpeg.probe(matchedStockPath);
        const stockProgress = typeof this.database.getMatchedStockProgress === 'function'
          ? this.database.getMatchedStockProgress(matchedStockPath, metadata.durationMs)
          : { consumedStartMs: this.database.getMatchedStockConsumedMs(matchedStockPath), phase: 1 };
        mediaPlan = planSingleStockSegment({
          filePath: matchedStockPath,
          metadata,
          voiceDurationMs: voice.durationMs,
          toleranceMs: Number(config.stockDurationToleranceMs ?? 500),
          consumedStartMs: stockProgress.consumedStartMs,
          consumedPhase: stockProgress.phase,
          ...matchedStockOptions(config)
        });
        mediaPlan.sourcePath = matchedStockPath;
        mediaPlan.toleranceMs = Number(config.stockDurationToleranceMs ?? 500);
        mediaPlan.deleteWhenFullyConsumed = config.deleteConsumedMatchedStock !== false;
        callbacks.onLog?.(`${job.voice_name}: dùng stock cùng tên ${path.basename(matchedStockPath)} · speed ${mediaPlan.playbackRate}x${mediaPlan.cloned?' · lượt 2 lật ngang/zoom 110%':''} · không Cross Dissolve nền.`);
        this.database.saveJobAssets(job.id, 'MATCHED_STOCK', mediaPlan.segments);
      } else if (job.background_mode === BACKGROUND_MODE.MANUAL_MEDIA) {
        assertExistingFile(
          config.manualMediaPath,
          `Media cố định không còn tồn tại: ${config.manualMediaPath || '(trống)'}`,
          'MISSING_MANUAL_MEDIA_FILE'
        );
        const metadata = await this.ffmpeg.probe(config.manualMediaPath);
        mediaPlan = planManualSegments({
          filePath: config.manualMediaPath,
          metadata,
          voiceDurationMs: voice.durationMs,
          seed: job.image_seed,
          config: renderConfig
        });
        this.database.saveJobAssets(job.id, 'MANUAL', mediaPlan.segments);
      } else {
        const allocated = this.createMediaPlan(job, config, renderConfig, voice.durationMs, callbacks, stockPool);
        mediaPlan = allocated.plan;
        reserved = allocated.reserved;
      }

      this.database.updateJob(job.id, { status: JOB_STATUS.PREPARING });
      const base = sanitizeFileName(path.basename(job.voice_path, path.extname(job.voice_path)));
      const outputPath = uniqueDestination(folders.videoFolder, `${base}.mp4`);
      const tempOutputPath = path.join(this.paths.temp, `${job.id}.mp4`);
      const prefixItems = [
        disclaimerInfo && {
          filePath: disclaimerInfo.filePath,
          durationMs: disclaimerInfo.durationMs,
          hasAudio: disclaimerInfo.hasAudio,
          label: 'Disclaimer'
        },
        ...jobIntroInfos.map((info) => ({
          filePath: info.filePath,
          durationMs: info.durationMs,
          hasAudio: info.hasAudio,
          label: `intro ${info.order}`,
          audioMode: info.audioMode
        }))
      ].filter(Boolean);
      if (fullGpuZeroCopy && prefixItems.length) {
        throw Object.assign(
          new Error(
            'Full GPU Zero-Copy không hỗ trợ bước ghép Disclaimer/Intro vì concat audio-video hiện dùng filter CPU. ' +
            'Hãy tắt Disclaimer/Intro hoặc chọn AUTO_STABLE/NVENC_ONLY.'
          ),
          { code: 'FULL_GPU_UNSUPPORTED' }
        );
      }
      const prefixRawDurationMs = prefixItems.reduce((sum, item) => sum + item.durationMs, 0);
      const prefixOutputPath = prefixItems.length
        ? path.join(this.paths.temp, `${job.id}-with-intros.mp4`)
        : null;
      const logPath = path.join(folders.logFolder, `${base}-${job.sequence_number}.log`);
      fs.writeFileSync(logPath, '', 'utf8');
      if (disclaimerInfo) {
        fs.appendFileSync(
          logPath,
          `Disclaimer: ${disclaimerInfo.filePath} · ${formatDuration(disclaimerInfo.durationMs)} · audio ${disclaimerInfo.hasAudio ? 'yes' : 'silence'}\n`,
          'utf8'
        );
      }
      if (jobIntroInfos.length) {
        for (const info of jobIntroInfos) {
          fs.appendFileSync(
            logPath,
            `Intro ${info.order} sau Disclaimer: ${info.filePath} · ${formatDuration(info.durationMs)} · audio ${info.hasAudio ? 'yes' : 'mute'}\n`,
            'utf8'
          );
        }
      }
      if (renderSubtitlePath) {
        const subtitleBox = subtitleAssBox(renderConfig);
        const subtitleFontSize = subtitleEffectiveFontSize(renderConfig.subtitle || {});
        const subtitleFont = subtitleFontFamily(renderConfig.subtitle || {});
        callbacks.onLog?.(
          `${job.voice_name}: subtitle box ${subtitleBox.width}x${subtitleBox.height} tại ${subtitleBox.x},${subtitleBox.y} · font ${subtitleFont} ${subtitleFontSize}px.`
        );
        fs.appendFileSync(
          logPath,
          `Subtitle source: ${renderSubtitlePath}\n` +
          `Subtitle box: x=${subtitleBox.x} y=${subtitleBox.y} w=${subtitleBox.width} h=${subtitleBox.height} center=${subtitleBox.centerX},${subtitleBox.centerY}\n` +
          `Subtitle font: ${subtitleFont} ${subtitleFontSize}px\n` +
          `Subtitle style: ${subtitleStyle(renderConfig)}\n`,
          'utf8'
        );
      }

      const originalRenderConfig = renderConfig;
      if (config.jobIntroNoiseOverlay === true && jobIntroInfos.length) {
        const noiseLayer = introNoiseLayerFromConfig(originalRenderConfig);
        if (noiseLayer) {
          const maxIntroDurationMs = Math.max(...jobIntroInfos.map((info) => Number(info.durationMs || 0)), 1000);
          const noiseCache = await this.prepareLayerCache({
            renderConfig: {
              ...originalRenderConfig,
              layers: [noiseLayer],
              layerCacheDurationMs: maxIntroDurationMs,
              layerCache: true
            },
            callbacks,
            signal,
            system,
            cacheRoot: ensureDirectory(path.join(this.paths.cache, 'intro-noise-overlays')),
            cacheDurationMs: maxIntroDurationMs,
            cacheKeyPrefix: 'intro-noise',
            cacheLogPrefix: `${job.voice_name}: intro noise cache`
          });
          if (noiseCache.cachePath) {
            for (const item of prefixItems) {
              if (String(item.label || '').startsWith('intro ')) item.noiseOverlayPath = noiseCache.cachePath;
            }
            fs.appendFileSync(logPath, `Intro noise layer: ${noiseLayer.name || noiseLayer.id || 'noise'} · ${noiseCache.cachePath}\n`, 'utf8');
          }
        } else {
          callbacks.onLog?.(`${job.voice_name}: bật nhiễu intro nhưng không tìm thấy layer tên NOISE/NHIỄU trong template.`);
          fs.appendFileSync(logPath, 'Intro noise layer: not found\n', 'utf8');
        }
      }
      const resolvedJobGreen = this.resolveJobGreenForRender(job, config, originalRenderConfig);
      if (fullGpuZeroCopy) {
        renderConfig = originalRenderConfig;
        if (resolvedJobGreen) {
          const jobGreenLayer = jobGreenLayerFromConfig({
            job,
            assetPath: resolvedJobGreen.assetPath,
            greenConfig: resolvedJobGreen.greenConfig,
            renderConfig: originalRenderConfig
          });
          renderConfig = {
            ...originalRenderConfig,
            layers: [...(originalRenderConfig.layers || []), jobGreenLayer]
          };
        }
        callbacks.onLog?.(
          `${job.voice_name}: Full GPU Zero-Copy giữ layer trực tiếp và bỏ qua layer-cache CPU để kiểm tra tương thích nghiêm ngặt.`
        );
      } else if (resolvedJobGreen) {
        const jobGreenLayer = jobGreenLayerFromConfig({
          job,
          assetPath: resolvedJobGreen.assetPath,
          greenConfig: resolvedJobGreen.greenConfig,
          renderConfig: originalRenderConfig
        });
        const greenCacheDurationMs = Math.max(1000, Number(config.jobGreenCacheDurationMs || 30_000));
        const greenRenderConfig = {
          ...originalRenderConfig,
          layerCacheDurationMs: greenCacheDurationMs,
          layers: [...(originalRenderConfig.layers || []), jobGreenLayer]
        };
        const greenCacheRoot = ensureDirectory(path.join(this.paths.cache, 'job-green-overlays', batchId));
        const layerCache = await this.prepareLayerCache({
          renderConfig: greenRenderConfig,
          callbacks,
          signal,
          system,
          cacheRoot: greenCacheRoot,
          cacheDurationMs: greenCacheDurationMs,
          cacheKeyPrefix: job.id,
          cacheLogPrefix: `${job.voice_name}: template+green cache`,
          cachedJobGreenOverlay: true
        });
        renderConfig = layerCache.renderConfig;
        if (layerCache.cacheUsed) fs.appendFileSync(logPath, `Template+green cache: ${layerCache.cachePath}\n`, 'utf8');
        else fs.appendFileSync(logPath, `Template+green direct: ${jobGreenLayer.sourceReference}\n`, 'utf8');
      } else {
        const layerCache = await this.prepareLayerCache({ renderConfig: originalRenderConfig, callbacks, signal, system });
        renderConfig = layerCache.renderConfig;
        if (layerCache.cacheUsed) fs.appendFileSync(logPath, `Layer cache: ${layerCache.cachePath}\n`, 'utf8');
      }

      if (useCanvasSubtitle && renderSubtitlePath) {
        const subtitleOverlayPath = path.join(this.paths.temp, `${job.id}-subtitle-canvas.mov`);
        callbacks.onLog?.(`${job.voice_name}: render subtitle bằng Chromium Canvas overlay.`);
        try {
          if (fs.existsSync(subtitleOverlayPath)) fs.rmSync(subtitleOverlayPath, { force: true });
          await this.subtitleOverlay.renderOverlay({
            subtitlePath: renderSubtitlePath,
            outputPath: subtitleOverlayPath,
            renderConfig,
            durationMs: voice.durationMs,
            callbacks,
            signal
          });
          renderConfig = {
            ...renderConfig,
            layers: [
              ...(renderConfig.layers || []),
              {
                id: `subtitle-canvas-${job.id}`,
                type: 'OVERLAY_VIDEO',
                name: 'Subtitle Canvas Overlay',
                sourceReference: subtitleOverlayPath,
                visible: true,
                loop: false,
                cachedLayerOverlay: true,
                zIndex: 999999,
                startMs: 0,
                endMs: null,
                transform: { x: 0, y: 0, width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT, opacity: 1, rotation: 0 },
                style: {},
                timing: {},
                effect: { blendMode: 'normal' }
              }
            ]
          };
          renderSubtitlePath = null;
          renderJob = { ...renderJob, srt_path: null, srtPath: null };
          fs.appendFileSync(logPath, `Subtitle canvas overlay: ${subtitleOverlayPath}\n`, 'utf8');
        } catch (canvasErr) {
          callbacks.onLog?.(`${job.voice_name}: Canvas overlay không khả dụng (${canvasErr.message}), tự động fallback sang subtitle filter chuẩn.`);
          fs.appendFileSync(logPath, `Subtitle canvas failed, fallback to standard: ${canvasErr.message}\n`, 'utf8');
          renderSubtitlePath = prepareRenderSubtitle({
            job,
            renderConfig,
            tempDirectory: this.paths.temp,
            forceSrt: false
          });
          renderJob = { ...job, srt_path: renderSubtitlePath, srtPath: renderSubtitlePath };
        }
      }

      if (mediaPlan?.segments?.length) {
        mediaPlan.segments = await this.preSliceStockSegments(mediaPlan.segments, job.id, callbacks, signal, logPath);
      }

      let plan = buildRenderPlan({
        job: renderJob,
        segments: mediaPlan.segments,
        config: renderConfig,
        system,
        outputPath,
        tempOutputPath,
        logPath
      });
      plan = buildStagedRenderPlan(plan, path.join(this.paths.temp, `${job.id}-background.mp4`));
      fs.appendFileSync(
        logPath,
        `GPU pipeline: ${plan.gpuAcceleration}\nEncoder: ${plan.encoder}\n` +
        `Background inputs: ${summarizeBackgroundSegments(plan.segments)}\n` +
        `Performance: ${plan.performance?.profile || 'BALANCED'} · preset ${plan.performance?.preset || ''}\n` +
        `Pipeline: ${plan.staged ? 'STAGED_BACKGROUND_THEN_FINAL_NVENC' : 'SINGLE_PASS'}\n`,
        'utf8'
      );
      callbacks.onLog?.(
        `${job.voice_name} · GPU: ${plan.gpuAcceleration} · ${plan.performance?.profile || ''}`
      );
      const prefixTransitionMs = effectiveIntroTransitionMs(prefixItems, plan.durationMs, config);
      const prefixDurationMs = effectivePrefixDurationMs(prefixItems, plan.durationMs, config);
      if (prefixItems.length && prefixTransitionMs) {
        fs.appendFileSync(logPath, `Intro transition: fade ${prefixTransitionMs}ms · prefix raw ${formatDuration(prefixRawDurationMs)} · effective ${formatDuration(prefixDurationMs)}\n`, 'utf8');
      }
      this.database.saveRenderPlan(job.id, { ...plan, args: plan.args });
      this.database.updateJob(job.id, {
        target_size_bytes: plan.targetSizeBytes,
        output_path: outputPath
      });

      let success = false;
      let finalMetadata = null;
      const maxSizeRetries = Math.max(1, Number(renderConfig.maxRenderAttempts || renderConfig.maxRetryCount || 2));
      const maxPipelineAttempts = maxSizeRetries + 5;
      let sizeRetries = 0;
      let attempt = 0;
      const triedGpuIndexes = new Set([Number(plan.acceleration?.gpuIndex || 0)]);

      while (attempt < maxPipelineAttempts) {
        attempt += 1;
        if (signal?.aborted) {
          throw Object.assign(new Error('Đã hủy render.'), { code: 'ABORTED' });
        }
        const status = attempt === 1 ? JOB_STATUS.RENDERING : JOB_STATUS.RETRYING;
        this.database.updateJob(job.id, { status, current_attempt: attempt });
        callbacks.onJob?.({ jobId: job.id, voiceName: job.voice_name, status, attempt });
        const attemptId = this.database.createRenderAttempt(job.id, attempt, {
          encoder: plan.encoder,
          videoBitrateKbps: plan.videoBitrateKbps,
          targetSizeBytes: plan.targetSizeBytes,
          commandText: JSON.stringify(plan.args),
          logPath,
          tempOutputPath,
          finalOutputPath: outputPath
        });
        fs.appendFileSync(
          logPath,
          `
=== ATTEMPT ${attempt} · ${plan.encoder} · ${plan.gpuAcceleration} ===
`,
          'utf8'
        );

        let stagedPhase = null;
        try {
          try { if (fs.existsSync(tempOutputPath)) fs.rmSync(tempOutputPath, { force: true }); } catch {}
          try { if (prefixOutputPath && fs.existsSync(prefixOutputPath)) fs.rmSync(prefixOutputPath, { force: true }); } catch {}
          if (plan.staged) {
            const background = plan.stages.background;
            const visual = plan.stages.visual;
            if (!fs.existsSync(background.outputPath) || fs.statSync(background.outputPath).size < 1024) {
              stagedPhase = 'background';
              callbacks.onLog?.(
                `${job.voice_name}: bước 1/3 pre-render background ` +
                `(${summarizeBackgroundSegments(plan.segments)}) bằng ${background.acceleration.label}.`
              );
              fs.appendFileSync(logPath, `\n=== STAGE 1/3 · ${background.name} ===\n`, 'utf8');
              try { if (fs.existsSync(background.outputPath)) fs.rmSync(background.outputPath, { force: true }); } catch {}
              if (background.imageSequence && background.clips?.length) {
                callbacks.onLog?.(
                  `${job.voice_name}: dùng renderer ảnh ổn định, render riêng ${background.clips.length} clip ảnh rồi concat copy.`
                );
                fs.appendFileSync(logPath, `Image sequence background: ${background.clips.length} clips\n`, 'utf8');
                for (const clip of background.clips) {
                  if (fs.existsSync(clip.outputPath) && fs.statSync(clip.outputPath).size >= 1024) continue;
                  callbacks.onLog?.(
                    `${job.voice_name}: render ảnh nền ${clip.index}/${clip.total} (${formatDuration(clip.durationMs)}).`
                  );
                  fs.appendFileSync(logPath, `\n=== STAGE 1/3 · ${clip.name} ===\n`, 'utf8');
                  try { if (fs.existsSync(clip.outputPath)) fs.rmSync(clip.outputPath, { force: true }); } catch {}
                  await this.ffmpeg.render(clip.args, {
                    durationMs: clip.durationMs,
                    gpuIndex: plan.acceleration?.gpuIndex ?? 0,
                    signal,
                    onProgress: (progress) => {
                      const clipBase = (clip.index - 1) / clip.total;
                      const clipShare = 1 / clip.total;
                      callbacks.onProgress?.({
                        stage: 'RENDER',
                        jobId: job.id,
                        voiceName: `${job.voice_name} · image ${clip.index}/${clip.total}`,
                        ...progress,
                        percent: (clipBase + clipShare * progress.percent / 100) * 20
                      });
                    },
                    onGpuStats: (gpu) => callbacks.onProgress?.({
                      stage: 'GPU',
                      jobId: job.id,
                      voiceName: job.voice_name,
                      gpu
                    }),
                    onLog: (text) => fs.appendFileSync(logPath, text, 'utf8')
                  });
                }
                writeConcatList(background.listPath, background.clips.map((clip) => clip.outputPath));
                callbacks.onLog?.(`${job.voice_name}: ghép ${background.clips.length} clip ảnh nền bằng concat copy.`);
                fs.appendFileSync(logPath, `\n=== STAGE 1/3 · BACKGROUND_IMAGE_CONCAT ===\n`, 'utf8');
              } else if (background.chunked && background.chunks?.length) {
                callbacks.onLog?.(
                  `${job.voice_name}: background quá lớn, chia ${background.chunks.length} chunk để tránh giới hạn command Windows.`
                );
                fs.appendFileSync(logPath, `Background chunked: ${background.chunks.length} chunks\n`, 'utf8');
                for (const chunk of background.chunks) {
                  if (fs.existsSync(chunk.outputPath) && fs.statSync(chunk.outputPath).size >= 1024) continue;
                  callbacks.onLog?.(
                    `${job.voice_name}: render background chunk ${chunk.index}/${chunk.total} ` +
                    `(${chunk.segmentCount} đoạn, ${chunk.imageCount} ảnh, ${chunk.videoCount} video, ${formatDuration(chunk.durationMs)}).`
                  );
                  fs.appendFileSync(logPath, `\n=== STAGE 1/3 · ${chunk.name} ===\n`, 'utf8');
                  try { if (fs.existsSync(chunk.outputPath)) fs.rmSync(chunk.outputPath, { force: true }); } catch {}
                  await this.ffmpeg.render(chunk.args, {
                    durationMs: chunk.durationMs,
                    gpuIndex: plan.acceleration?.gpuIndex ?? 0,
                    signal,
                    onProgress: (progress) => {
                      const chunkBase = (chunk.index - 1) / chunk.total;
                      const chunkShare = 1 / chunk.total;
                      callbacks.onProgress?.({
                        stage: 'RENDER',
                        jobId: job.id,
                        voiceName: `${job.voice_name} · bg chunk ${chunk.index}/${chunk.total}`,
                        ...progress,
                        percent: (chunkBase + chunkShare * progress.percent / 100) * 20
                      });
                    },
                    onGpuStats: (gpu) => callbacks.onProgress?.({
                      stage: 'GPU',
                      jobId: job.id,
                      voiceName: job.voice_name,
                      gpu
                    }),
                    onLog: (text) => fs.appendFileSync(logPath, text, 'utf8')
                  });
                }
                callbacks.onLog?.(`${job.voice_name}: ghép ${background.chunks.length} background chunk thành file nền.`);
                fs.appendFileSync(logPath, `\n=== STAGE 1/3 · BACKGROUND_CHUNK_CONCAT ===\n`, 'utf8');
              }
              await this.ffmpeg.render(background.args, {
                durationMs: plan.durationMs,
                gpuIndex: plan.acceleration?.gpuIndex ?? 0,
                signal,
                onProgress: (progress) => {
                  callbacks.onProgress?.({
                    stage: 'RENDER',
                    jobId: job.id,
                    voiceName: background.imageSequence
                      ? `${job.voice_name} · image concat`
                      : background.chunked
                      ? `${job.voice_name} · bg chunks concat`
                      : `${job.voice_name} · prepass`,
                    ...progress,
                    percent: background.imageSequence
                      ? 20 + progress.percent * 0.05
                      : background.chunked
                      ? 20 + progress.percent * 0.05
                      : progress.percent * 0.25
                  });
                },
                onGpuStats: (gpu) => callbacks.onProgress?.({
                  stage: 'GPU',
                  jobId: job.id,
                  voiceName: job.voice_name,
                  gpu
                }),
                onLog: (text) => fs.appendFileSync(logPath, text, 'utf8')
              });
              stagedPhase = null;
            }
            if (!fs.existsSync(visual.outputPath) || fs.statSync(visual.outputPath).size < 1024) {
              stagedPhase = 'visual';
              callbacks.onLog?.(`${job.voice_name}: bước 2/3 render layer/subtitle thành file nền NVENC.`);
              fs.appendFileSync(logPath, `\n=== STAGE 2/3 · ${visual.name} ===\n`, 'utf8');
              try { if (fs.existsSync(visual.outputPath)) fs.rmSync(visual.outputPath, { force: true }); } catch {}
              await this.ffmpeg.render(visual.args, {
                durationMs: plan.durationMs,
                gpuIndex: plan.acceleration?.gpuIndex ?? 0,
                signal,
                onProgress: (progress) => {
                  callbacks.onProgress?.({
                    stage: 'RENDER',
                    jobId: job.id,
                    voiceName: `${job.voice_name} · visual`,
                    ...progress,
                    percent: 25 + progress.percent * 0.45
                  });
                },
                onGpuStats: (gpu) => callbacks.onProgress?.({
                  stage: 'GPU',
                  jobId: job.id,
                  voiceName: job.voice_name,
                  gpu
                }),
                onLog: (text) => fs.appendFileSync(logPath, text, 'utf8')
              });
              stagedPhase = null;
            }
            stagedPhase = 'final';
            callbacks.onLog?.(`${job.voice_name}: bước 3/3 pass cuối ghép audio, copy video đã render.`);
            fs.appendFileSync(logPath, `\n=== STAGE 3/3 · ${plan.stages.final.name} ===\n`, 'utf8');
          }
          callbacks.onLog?.(`🚀 [BƯỚC 4/4 - XUẤT VIDEO GPU] ${job.voice_name}: Bắt đầu mã hóa video bằng ${plan.encoder === 'h264_nvenc' ? '⚡ NVIDIA GPU NVENC' : '⚙️ CPU'}...`);
          await this.ffmpeg.render(plan.args, {
            durationMs: plan.durationMs,
            gpuIndex: plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc'
              ? plan.acceleration?.gpuIndex
              : null,
            signal,
            onProgress: (progress) => {
              const percent = plan.staged ? 70 + progress.percent * 0.3 : progress.percent;
              this.database.updateJob(job.id, { progress_percent: percent });
              callbacks.onProgress?.({
                stage: 'RENDER',
                jobId: job.id,
                voiceName: job.voice_name,
                ...progress,
                percent
              });
            },
            onGpuStats: (gpu) => {
              callbacks.onProgress?.({
                stage: 'GPU',
                jobId: job.id,
                voiceName: job.voice_name,
                gpu
              });
            },
            onLog: (text) => {
              fs.appendFileSync(logPath, text, 'utf8');
              const trimmed = text.trim();
              if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
            }
          });
          if (prefixItems.length) {
            stagedPhase = 'disclaimer';
            callbacks.onLog?.(
              `${job.voice_name}: nối ${prefixItems.map((item) => item.label).join(' + ')} ` +
              `(${formatDuration(prefixDurationMs)}${prefixTransitionMs ? ` · fade ${prefixTransitionMs}ms` : ''}) ở đầu video.`
            );
            const prefixArgs = buildPrefixConcatArguments({
              prefixes: prefixItems,
              inputPath: tempOutputPath,
              outputPath: prefixOutputPath,
              width: STANDARD_CANVAS_WIDTH,
              height: STANDARD_CANVAS_HEIGHT,
              fps: Number(renderConfig.fps || renderConfig.canvas?.fps || 30),
              encoder: plan.encoder,
              acceleration: plan.acceleration,
              videoBitrateKbps: plan.videoBitrateKbps,
              config: {
                ...plan.config,
                jobIntroTransition: normalizeIntroTransition(config.jobIntroTransition),
                jobIntroTransitionMs: prefixTransitionMs
              }
            });
            fs.appendFileSync(logPath, `Prefix command: ${JSON.stringify(prefixArgs)}\n`, 'utf8');
            await this.ffmpeg.render(prefixArgs, {
              durationMs: plan.durationMs + prefixDurationMs,
              gpuIndex: plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc'
                ? plan.acceleration?.gpuIndex
                : null,
              signal,
              onProgress: (progress) => {
                callbacks.onProgress?.({
                  stage: 'RENDER',
                  jobId: job.id,
                  voiceName: `${job.voice_name} · Disclaimer + video riêng`,
                  ...progress,
                  percent: 97 + progress.percent * 0.03
                });
              },
              onGpuStats: (gpu) => callbacks.onProgress?.({
                stage: 'GPU',
                jobId: job.id,
                voiceName: job.voice_name,
                gpu
              }),
              onLog: (text) => fs.appendFileSync(logPath, text, 'utf8')
            });
            await replaceFile(prefixOutputPath, tempOutputPath);
          }
          stagedPhase = null;
          this.database.updateJob(job.id, {
            status: JOB_STATUS.VERIFYING,
            progress_percent: 100
          });
          callbacks.onLog?.(`${job.voice_name}: ⏳ Đã hoàn thành 100% mã hóa video, đang kiểm tra tính toàn vẹn và di chuyển file thành phẩm...`);
          finalMetadata = await this.ffmpeg.probe(tempOutputPath);
          const stat = fs.statSync(tempOutputPath);
          const expectedDurationMs = plan.durationMs + prefixDurationMs;
          const durationDifference = Math.abs(finalMetadata.durationMs - expectedDurationMs);
          if (!finalMetadata.width || !finalMetadata.height || !finalMetadata.hasAudio) {
            throw Object.assign(new Error('Output thiếu video hoặc audio.'), { code: 'INVALID_OUTPUT' });
          }
          if (durationDifference > 3000) {
            throw Object.assign(
              new Error(`Sai lệch thời lượng ${durationDifference} ms.`),
              { code: 'DURATION_MISMATCH' }
            );
          }
          if (stat.size > plan.targetSizeBytes) {
            this.database.finishRenderAttempt(attemptId, {
              status: 'SIZE_EXCEEDED',
              actual_size_bytes: stat.size,
              error_code: 'SIZE_EXCEEDED',
              error_message: 'Output vượt giới hạn.'
            });
            sizeRetries += 1;
            if (sizeRetries >= maxSizeRetries) {
              throw Object.assign(
                new Error('Output vẫn vượt giới hạn sau retry.'),
                { code: 'SIZE_EXCEEDED' }
              );
            }
            if (plan.staged && plan.stages?.visual?.outputPath) {
              try { if (fs.existsSync(plan.stages.visual.outputPath)) fs.rmSync(plan.stages.visual.outputPath, { force: true }); } catch {}
            }
            plan = rebuildWithBitrate(
              plan,
              Math.max(500, Math.floor(plan.videoBitrateKbps * plan.targetSizeBytes / stat.size * 0.94))
            );
            continue;
          }
          await replaceFile(tempOutputPath, outputPath);

          // KHÔNG tự động xuất file .srt rời ra cùng thư mục với video .mp4 khi video đã in cứng phụ đề (hard-sub),
          // vì nếu có file .srt trùng tên nằm cạnh .mp4, trình phát video (Windows Media Player / VLC / PotPlayer)
          // sẽ tự động bật thêm 1 dòng phụ đề trắng viết thường đè lên phụ đề vàng đã in trong video!
          // Chỉ xuất file .srt rời nếu người dùng chủ động bật tùy chọn config.exportSeparateSrt === true.
          try {
            const outDir = path.dirname(outputPath);
            const outSrtPath = path.join(outDir, `${base}.srt`);
            if (config.exportSeparateSrt === true) {
              const rawSrtPath = job.srt_path || job.srtPath;
              if (rawSrtPath && fs.existsSync(rawSrtPath)) {
                const prefixOffsetMs = Number(prefixDurationMs || 0);
                exportSrtWithDisclaimerOffset({
                  sourceSrtPath: rawSrtPath,
                  targetSrtPath: outSrtPath,
                  offsetMs: prefixOffsetMs
                });
              }
            } else if (fs.existsSync(outSrtPath)) {
              // Nếu trong thư mục xuất video có file .srt trùng tên nằm ngay cạnh .mp4,
              // xóa bỏ để trình phát video không tự nạp phụ đề rời (chữ trắng) đè lên phụ đề vàng trong video.
              try { fs.unlinkSync(outSrtPath); } catch {}
            }
          } catch (srtExportErr) {
            callbacks.onLog?.(`Cảnh báo xử lý SRT đầu ra: ${srtExportErr.message}`);
          }

          this.database.finishRenderAttempt(attemptId, {
            status: 'SUCCEEDED',
            actual_size_bytes: stat.size
          });
          success = true;
          break;
        } catch (error) {
          this.database.finishRenderAttempt(attemptId, {
            status: error.code === 'ABORTED' ? 'CANCELLED' : 'FAILED',
            error_code: String(error.code || 'RENDER_FAILED'),
            error_message: error.message
          });
          try { if (fs.existsSync(tempOutputPath)) fs.rmSync(tempOutputPath, { force: true }); } catch {}
          try { if (prefixOutputPath && fs.existsSync(prefixOutputPath)) fs.rmSync(prefixOutputPath, { force: true }); } catch {}
          if (plan.staged && plan.stages) {
            if (stagedPhase === 'background') {
              cleanupBackgroundStageFiles(plan.stages.background);
              try { if (fs.existsSync(plan.stages.visual.outputPath)) fs.rmSync(plan.stages.visual.outputPath, { force: true }); } catch {}
            } else if (stagedPhase === 'visual') {
              try { if (fs.existsSync(plan.stages.visual.outputPath)) fs.rmSync(plan.stages.visual.outputPath, { force: true }); } catch {}
            }
          }
          if (error.code === 'ABORTED' || signal?.aborted) {
            throw Object.assign(new Error('Đã hủy render và giải phóng GPU.'), { code: 'ABORTED' });
          }

          if (
            stagedPhase === 'background' &&
            plan.staged &&
            plan.stages?.background?.chunked &&
            isFfmpegProcessCrash(error)
          ) {
            const smallerLimit = nextBackgroundChunkLimit(plan.config);
            if (smallerLimit) {
              callbacks.onLog?.(
                `${job.voice_name}: FFmpeg crash khi render background chunk; ` +
                `chia nhỏ hơn còn ${smallerLimit} ảnh/chunk và thử lại.`
              );
              fs.appendFileSync(
                logPath,
                `\nBACKGROUND CHUNK FALLBACK: ${plan.config.backgroundChunkSegmentLimit || 24} -> ${smallerLimit}\n`,
                'utf8'
              );
              cleanupBackgroundStageFiles(plan.stages.background);
              plan = buildStagedRenderPlan({
                ...plan,
                config: {
                  ...plan.config,
                  backgroundChunkSegmentLimit: smallerLimit
                },
                gpuAcceleration: plan.gpuAcceleration.replace(' · staged background prepass', '')
              }, plan.stagedBaseOutputPath);
              continue;
            }
          }

          if (plan.staged && plan.stages?.background?.acceleration?.mode === 'CUDA' && isCudaPipelineError(error)) {
            callbacks.onLog?.(`${job.voice_name}: background prepass CUDA lỗi; chạy lại prepass bằng NVENC ổn định.`);
            fs.appendFileSync(logPath, '\nSTAGED BACKGROUND FALLBACK: CUDA -> NVENC_ONLY\n', 'utf8');
            cleanupBackgroundStageFiles(plan.stages.background);
            plan = buildStagedRenderPlan({
              ...plan,
              config: {
                ...plan.config,
                stagedBackgroundCuda: false,
                cudaAvailableForStaging: false
              },
              gpuAcceleration: plan.gpuAcceleration.replace(' · staged background prepass', '')
            }, plan.stagedBaseOutputPath);
            continue;
          }

          if (plan.acceleration?.mode === 'CUDA' && isCudaPipelineError(error)) {
            callbacks.onLog?.(
              `${job.voice_name}: Full CUDA không phù hợp với nhiều stock/subtitle; chuyển sang NVENC ổn định.`
            );
            fs.appendFileSync(logPath, '\nCUDA FALLBACK -> NVENC_ONLY\n', 'utf8');
            plan = rebuildWithoutCuda(plan);
            continue;
          }

          if ((plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc') && isNvencInitError(error)) {
            callbacks.onLog?.(`${job.voice_name}: NVENC chưa khởi tạo được; đang dọn tiến trình và quét lại GPU.`);
            fs.appendFileSync(logPath, '\nNVENC RECOVERY: cleanup + rescan\n', 'utf8');
            const refreshed = await this.ffmpeg.recoverGpu({ gpuIndex: plan.acceleration?.gpuIndex ?? -1 });
            const alternate = (refreshed.gpus || []).find(
              (gpu) => gpu.h264NvencReady && !triedGpuIndexes.has(Number(gpu.index))
            );
            if (alternate) {
              triedGpuIndexes.add(Number(alternate.index));
              callbacks.onLog?.(`${job.voice_name}: chuyển sang GPU ${alternate.index} · ${alternate.name}.`);
              plan = rebuildWithGpu(plan, alternate.index);
              continue;
            }
            if (isFullGpuMode(plan.config)) {
              callbacks.onLog?.(
                `${job.voice_name}: Full GPU Zero-Copy là chế độ nghiêm ngặt; không tự chuyển sang pipeline cũ hoặc CPU.`
              );
              fs.appendFileSync(logPath, '\nFULL GPU STRICT: NO PIPELINE FALLBACK\n', 'utf8');
              throw error;
            }
            if (!plan.nvencCompatibilityMode) {
              callbacks.onLog?.(`${job.voice_name}: retry NVENC với cấu hình tương thích Pascal/GTX 10xx.`);
              plan = rebuildConservativeNvenc(plan);
              continue;
            }
            if (renderConfig.allowCpuFallback !== false && !plan.cpuFallbackApplied) {
              callbacks.onLog?.(
                `${job.voice_name}: GPU vẫn bận/driver lỗi; tự chuyển CPU để không mất job. Hãy cập nhật driver sau.`
              );
              fs.appendFileSync(logPath, '\nNVENC FALLBACK -> LIBX264 CPU\n', 'utf8');
              plan = rebuildWithCpu(plan);
              continue;
            }
          }
          throw error;
        }
      }

      if (!success) throw new Error('Không hoàn thành render.');

      if (reserved && shouldMoveReservedAssets(config, folders)) {
        const reservations = this.database.getActiveReservations(job.id);
        try {
          for (const reservation of reservations) {
            this.database.markMoving(reservation.media_asset_id);
            const usedPath = await moveFile(reservation.file_path, folders.usedBatchFolder);
            this.database.commitUsed({
              reservationId: reservation.id,
              assetId: reservation.media_asset_id,
              batchId,
              jobId: job.id,
              sourcePath: reservation.file_path,
              usedPath,
              outputPath,
              usedDurationMs: reservation.duration_ms
            });
          }
        } catch (error) {
          const reason = error.code || error.message || 'UNKNOWN';
          callbacks.onLog?.(
            `${job.voice_name}: render đã xong nhưng không chuyển được stock vào Used (${reason}); giữ output và giải phóng reservation.`
          );
          fs.appendFileSync(
            logPath,
            `\nUSED MOVE WARNING: ${error.stack || error.message || String(error)}\n`,
            'utf8'
          );
          this.database.releaseReservations(job.id);
        }
      } else if (reserved) {
        const reservations = this.database.getActiveReservations(job.id);
        for (const reservation of reservations) {
          this.database.commitUsed({
            reservationId: reservation.id,
            assetId: reservation.media_asset_id,
            batchId,
            jobId: job.id,
            sourcePath: reservation.file_path,
            usedPath: reservation.file_path,
            outputPath,
            usedDurationMs: reservation.duration_ms
          });
        }
        callbacks.onLog?.(`${job.voice_name}: đã ghi nhận lịch sử dùng stock (giữ nguyên file, không chuyển folder).`);
      }

      if (!reserved && [BACKGROUND_MODE.SINGLE_STOCK, BACKGROUND_MODE.MATCHED_STOCK, BACKGROUND_MODE.STOCK_VIDEO].includes(job.background_mode)) {
        try {
          await this.commitDirectStockUsage({ batchId, job, outputPath, mediaPlan, folders, callbacks, config });
        } catch (error) {
          callbacks.onLog?.(`${job.voice_name}: render đã xong nhưng ghi/xóa log stock lỗi (${error.message}).`);
          fs.appendFileSync(logPath, `\nSTOCK USAGE WARNING: ${error.stack || error.message || String(error)}\n`, 'utf8');
        }
      }

      const stat = fs.statSync(outputPath);
      this.database.updateJob(job.id, {
        status: JOB_STATUS.COMPLETED,
        progress_percent: 100,
        actual_size_bytes: stat.size,
        output_duration_ms: finalMetadata.durationMs,
        completed_at: Date.now()
      });
      callbacks.onJob?.({
        jobId: job.id,
        voiceName: job.voice_name,
        status: JOB_STATUS.COMPLETED,
        outputPath
      });
      return { kind: 'COMPLETED' };
    } catch (error) {
      if (reserved) this.database.releaseReservations(job.id);
      if (error instanceof InsufficientStockError || error.code === 'INSUFFICIENT_STOCK') {
        const report = {
          title: 'Không đủ stock',
          lines: [
            `Voice: ${job.voice_name}`,
            `Thời lượng voice: ${formatDuration(error.requiredMs)}`,
            `Stock còn lại: ${formatDuration(error.availableMs)}`,
            `Còn thiếu: ${formatDuration(error.missingMs)}`
          ],
          details: { jobId: job.id, ...error }
        };
        const files = writeReport(
          folders.reportFolder,
          `insufficient-stock-${job.sequence_number}`,
          report
        );
        this.database.createReport({
          batchId,
          jobId: job.id,
          reportType: 'STOCK',
          severity: 'ERROR',
          title: report.title,
          content: report,
          filePath: files.jsonPath
        });
        this.database.updateJob(job.id, {
          status: JOB_STATUS.WAITING,
          error_code: error.code,
          error_message: error.message
        });
        return { kind: 'PAUSED_INSUFFICIENT_STOCK', report };
      }

      this.database.updateJob(job.id, {
        status: error.code === 'ABORTED' ? JOB_STATUS.CANCELLED : JOB_STATUS.FAILED,
        error_code: String(error.code || 'JOB_FAILED'),
        error_message: error.message,
        completed_at: Date.now()
      });
      callbacks.onJob?.({
        jobId: job.id,
        voiceName: job.voice_name,
        status: error.code === 'ABORTED' ? JOB_STATUS.CANCELLED : JOB_STATUS.FAILED,
        error: error.message
      });
      return { kind: error.code === 'ABORTED' ? 'CANCELLED' : 'FAILED', error };
    } finally {
      releaseStockSource?.();
      if (config.cleanupTransientJobFiles !== false) {
        this.cleanupJobTransientFiles(job, batchId, callbacks);
      }
    }
  }

  async execute(batchId, config, folders, system, callbacks, signal, options = {}) {
    const batch = this.database.getBatch(batchId);
    const allJobs = this.database.listBatchJobs(batchId);
    const selectedJobIds = new Set((options.jobIds || []).filter(Boolean));
    const jobs = allJobs
      .filter((job) => !['COMPLETED', 'SKIPPED'].includes(job.status))
      .filter((job) => !selectedJobIds.size || selectedJobIds.has(job.id));
    const stockPool = this.createStockPool(
      config,
      callbacks,
      allJobs.filter((job) => job.status === JOB_STATUS.COMPLETED)
    );
    const counters = {
      completed: batch.completed_jobs || 0,
      failed: batch.failed_jobs || 0,
      skipped: batch.skipped_jobs || 0
    };
    const autoResources = !config.singleMode && this.resourceController?.isAuto(config);
    const resourcePlan = autoResources
      ? (config.resourcePlan || this.resourceController.recommend({
          config,
          system,
          host: system?.resources,
          jobCount: jobs.length
        }))
      : null;
    if (resourcePlan) {
      resourcePlan.warmUpGraceMs = 60000;
      resourcePlan.minLowPressureSamples = 6;
    }
    const initialWorkers = config.singleMode
      ? 1
      : autoResources
        ? Math.round(clamp(Number(config.maxParallelJobs || resourcePlan.initialWorkers || 1), 1, resourcePlan.maxWorkers || 8))
        : Math.round(clamp(Number(config.maxParallelJobs || 1), 1, 8));
    const workerSlots = config.singleMode
      ? 1
      : autoResources
        ? Math.min(Math.max(1, jobs.length), Math.round(clamp(Number(resourcePlan.maxWorkers || initialWorkers), 1, 8)))
        : Math.min(Math.max(1, jobs.length), initialWorkers);
    let desiredWorkers = Math.min(initialWorkers, workerSlots);
    let peakWorkers = desiredWorkers;
    let nextIndex = 0;
    let stop = null;

    callbacks.onLog?.(
      autoResources
        ? `Render workers: Auto ${desiredWorkers}/${workerSlots}; app se theo doi tai nguyen moi 5 giay.`
        : `Render workers: ${desiredWorkers}`
    );

    const persistCounters = () => this.database.updateBatch(batchId, {
      completed_jobs: counters.completed,
      failed_jobs: counters.failed,
      skipped_jobs: counters.skipped
    });

    const takeNextJob = () => {
      if (stop || signal?.aborted || this.pauseRequested) return null;
      const job = jobs[nextIndex];
      nextIndex += 1;
      return job || null;
    };

    let resourceSampling = false;
    const resourceTimer = autoResources && this.resourceController?.sample
      ? setInterval(async () => {
          if (resourceSampling || stop || nextIndex >= jobs.length) return;
          resourceSampling = true;
          try {
            const snapshot = await this.resourceController.sample(resourcePlan.gpuIndex);
            const nextWorkers = this.resourceController.nextWorkers(resourcePlan, snapshot, desiredWorkers);
            if (nextWorkers !== desiredWorkers) {
              const previous = desiredWorkers;
              desiredWorkers = Math.min(workerSlots, Math.max(1, nextWorkers));
              peakWorkers = Math.max(peakWorkers, desiredWorkers);
              callbacks.onLog?.(
                `Auto resources: dieu chinh worker ${previous} -> ${desiredWorkers} ` +
                `(CPU ${snapshot.cpuUsagePercent ?? '?'}%, RAM con ${snapshot.freeMemoryPercent ?? '?'}%).`
              );
            }
          } finally {
            resourceSampling = false;
          }
        }, 5000)
      : null;
    resourceTimer?.unref?.();

    const worker = async (slotIndex) => {
      while (true) {
        if (signal?.aborted) {
          stop = stop || { status: BATCH_STATUS.CANCELLED, reason: 'USER_CANCELLED' };
          return;
        }
        if (this.pauseRequested) {
          stop = stop || { status: BATCH_STATUS.PAUSED, reason: 'USER_PAUSE' };
          return;
        }
        if (autoResources && slotIndex >= desiredWorkers) {
          if (nextIndex >= jobs.length) return;
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        const job = takeNextJob();
        if (!job) return;
        const result = await this.processJob({
          job,
          batchId,
          config,
          folders,
          system,
          callbacks,
          signal,
          stockPool
        });
        if (result.kind === 'COMPLETED') counters.completed += 1;
        if (result.kind === 'FAILED') counters.failed += 1;
        if (result.kind === 'SKIPPED') counters.skipped += 1;
        if (result.kind === 'CANCELLED') {
          stop = stop || { status: BATCH_STATUS.CANCELLED, reason: 'USER_CANCELLED' };
        }
        if (result.kind === 'PAUSED_INSUFFICIENT_STOCK') {
          stop = stop || {
            status: BATCH_STATUS.PAUSED_INSUFFICIENT_STOCK,
            reason: 'INSUFFICIENT_STOCK',
            report: result.report
          };
        }
        persistCounters();
      }
    };

    try {
      await Promise.all(Array.from({ length: workerSlots }, (_value, index) => worker(index)));
    } finally {
      if (resourceTimer) clearInterval(resourceTimer);
    }

    if (signal?.aborted) {
      stop = stop || { status: BATCH_STATUS.CANCELLED, reason: 'USER_CANCELLED' };
    }
    if (this.pauseRequested && !stop) {
      stop = { status: BATCH_STATUS.PAUSED, reason: 'USER_PAUSE' };
    }

    if (stop) {
      this.cleanupJobGreenCache(batchId, config, callbacks);
      this.database.updateBatch(batchId, {
        status: stop.status,
        stop_reason: stop.reason,
        completed_jobs: counters.completed,
        failed_jobs: counters.failed,
        skipped_jobs: counters.skipped
      });
      callbacks.onBatch?.({ batchId, status: stop.status, report: stop.report });
      return {
        batchId,
        status: stop.status,
        outputFolder: folders.outputFolder,
        report: stop.report
      };
    }

    const finalStatus = counters.failed ? BATCH_STATUS.FAILED : BATCH_STATUS.COMPLETED;
    this.cleanupJobGreenCache(batchId, config, callbacks);
    this.database.updateBatch(batchId, {
      status: finalStatus,
      completed_jobs: counters.completed,
      failed_jobs: counters.failed,
      skipped_jobs: counters.skipped,
      completed_at: Date.now()
    });
    const summary = {
      title: 'Batch Summary',
      lines: [
        `Completed: ${counters.completed}`,
        `Failed: ${counters.failed}`,
        `Skipped: ${counters.skipped}`,
        `Parallel workers: ${peakWorkers}`
      ],
      details: { batchId, outputFolder: folders.outputFolder }
    };
    const files = writeReport(folders.reportFolder, 'batch-summary', summary);
    const stockUsageCsvPath = this.writeMatchedStockUsageCsv(batchId, folders.reportFolder);
    this.database.createReport({
      batchId,
      reportType: 'SUMMARY',
      severity: counters.failed ? 'WARNING' : 'INFO',
      title: summary.title,
      content: summary,
      filePath: files.jsonPath
    });
    if (stockUsageCsvPath) {
      this.database.createReport({
        batchId,
        reportType: 'STOCK_USAGE_CSV',
        severity: 'INFO',
        title: 'Stock usage Excel log',
        content: { csvPath: stockUsageCsvPath },
        filePath: stockUsageCsvPath
      });
    }
    callbacks.onBatch?.({ batchId, status: finalStatus });
    this.activeBatchId = null;
    return { batchId, status: finalStatus, outputFolder: folders.outputFolder };
  }
}

module.exports = {
  BatchService,
  normalizeTemplate,
  planManualSegments,
  planSingleStockSegment,
  collapseSrtCueLines,
  subtitlePreviewText,
  srtToPositionedAss,
  subtitleAssBox,
  wrapSubtitleText,
  shouldMoveReservedAssets,
  buildInputJobs,
  resolveJobGreenAsset,
  resolveJobIntroAsset,
  resolveJobIntroAssets,
  introNoiseLayerFromConfig,
  isIntroNoiseLayer,
  resolveProjectImageAsset,
  resolveProjectImageLayers,
  isProjectVoiceImageLayer,
  resolveMatchedStockAsset,
  resolveBundledDisclaimerPath,
  normalizeDisclaimerType,
  normalizeIntroAudioMode,
  normalizeIntroTransition,
  effectiveDisclaimerDurationMs,
  jobGreenKeyForVoice,
  defaultJobGreenConfig,
  jobGreenLayerFromConfig,
  recommendSrtResourcePlan
};
