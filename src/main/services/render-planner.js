'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { calculateVideoBitrateKbps, targetSizeBytes, clamp } = require('../../shared/core');
const { subtitleStyle } = require('../../shared/subtitle-preview');
const { resolveLayerFrame, ffmpegLayerFitFilter, ffmpegOverlayPosition } = require('../../shared/render-core');
const { escapeSubtitlePath, resolveSubtitleFontsDir } = require('./path-utils');

const BACKGROUND_CHUNK_SEGMENT_LIMIT = 24;
const IMAGE_SEQUENCE_SEGMENT_THRESHOLD = 100;
const WINDOWS_SAFE_COMMAND_CHARS = 24000;
const FULL_GPU_MODE = 'FULL_GPU_ZERO_COPY';

function isFullGpuMode(config = {}) {
  return String(config.accelerationMode || '').toUpperCase() === FULL_GPU_MODE;
}

function fullGpuError(message, details = []) {
  const error = new Error(message);
  error.code = 'FULL_GPU_UNSUPPORTED';
  error.details = details;
  return error;
}

function performanceSettings(config = {}) {
  const profile = String(config.performanceProfile || 'MAX_SPEED').toUpperCase();
  const cpuThreads = Math.max(2, Math.min(16, Number(config.filterComplexThreads || Math.max(2, os.cpus().length - 1))));
  if (profile === 'QUALITY') {
    return {
      profile,
      preset: config.nvencPreset || 'p5',
      tune: 'hq',
      bFrames: 3,
      lookahead: 16,
      multipass: 'qres',
      surfaces: 24,
      extraHwFrames: 16,
      filterComplexThreads: cpuThreads,
      faststart: true
    };
  }
  if (profile === 'BALANCED') {
    return {
      profile,
      preset: config.nvencPreset || 'p3',
      tune: 'hq',
      bFrames: 2,
      lookahead: 0,
      multipass: 'disabled',
      surfaces: 24,
      extraHwFrames: 16,
      filterComplexThreads: cpuThreads,
      faststart: true
    };
  }
  return {
    profile: 'MAX_SPEED',
    preset: config.nvencPreset || 'p1',
    tune: 'll',
    bFrames: 0,
    lookahead: 0,
    multipass: 'disabled',
    surfaces: 16,
    extraHwFrames: 8,
    filterComplexThreads: cpuThreads,
    faststart: false
  };
}

function effectiveFilterComplexThreads(config = {}, segments = [], layers = [], srtPath = null) {
  const requested = performanceSettings(config).filterComplexThreads;
  const hasFramesyncFilters = segments.length > 1 || layers.some((layer) => {
    const type = layer.type || layer.layerType;
    return ['VIDEO', 'GREENSCREEN_VIDEO', 'OVERLAY_VIDEO', 'LOGO', 'IMAGE', 'GREENSCREEN_IMAGE', 'OVERLAY_IMAGE'].includes(type);
  });
  const hasCpuSubtitle = Boolean(srtPath);
  if (hasFramesyncFilters || hasCpuSubtitle) {
    const profile = String(config.performanceProfile || 'MAX_SPEED').toUpperCase();
    const defaultCap = profile === 'MAX_SPEED' ? 4 : 2;
    return Math.max(1, Math.min(requested, Number(config.maxComplexFilterThreads || defaultCap)));
  }
  return requested;
}

function renderPerformanceSettings(config = {}, segments = [], layers = [], srtPath = null) {
  const settings = performanceSettings(config);
  return {
    ...settings,
    filterComplexThreads: effectiveFilterComplexThreads(config, segments, layers, srtPath)
  };
}

function sec(ms) {
  return (Number(ms || 0) / 1000).toFixed(3);
}

function estimateCommandChars(args = []) {
  return ['ffmpeg', ...(args || [])].join(' ').length;
}

function normalizeTransitionType(value) {
  const key = String(value || 'fade').toLowerCase().replace(/[\s_-]+/g, '');
  return {
    crossdissolve: 'dissolve',
    softdissolve: 'dissolve',
    crossfade: 'fade'
  }[key] || String(value || 'fade');
}

function transitionDurationMs(transition = null) {
  if (!transition) return 0;
  if (normalizeTransitionType(transition.type) === 'none') return 0;
  return Math.max(0, Number(transition.durationMs || 0));
}

function segmentSequenceDurationMs(segments = []) {
  if (!segments.length) return 0;
  let total = Math.max(0, Number(segments[0].durationMs || 0));
  for (let index = 1; index < segments.length; index += 1) {
    total += Math.max(0, Number(segments[index].durationMs || 0)) -
      transitionDurationMs(segments[index].transitionIn);
  }
  return Math.max(0, total);
}

function chunkArray(items = [], size = BACKGROUND_CHUNK_SEGMENT_LIMIT) {
  const chunks = [];
  const limit = Math.max(2, Number(size || BACKGROUND_CHUNK_SEGMENT_LIMIT));
  for (let index = 0; index < items.length; index += limit) {
    chunks.push(items.slice(index, index + limit));
  }
  return chunks;
}

function chunkOutputPath(baseOutputPath, index) {
  const ext = path.extname(baseOutputPath) || '.mp4';
  const stem = baseOutputPath.slice(0, baseOutputPath.length - ext.length);
  return `${stem}-chunk-${String(index + 1).padStart(3, '0')}${ext}`;
}

function imageClipOutputPath(baseOutputPath, index) {
  const ext = path.extname(baseOutputPath) || '.mp4';
  const stem = baseOutputPath.slice(0, baseOutputPath.length - ext.length);
  return `${stem}-image-${String(index + 1).padStart(4, '0')}${ext}`;
}

function concatListOutputPath(baseOutputPath) {
  const ext = path.extname(baseOutputPath) || '.mp4';
  const stem = baseOutputPath.slice(0, baseOutputPath.length - ext.length);
  return `${stem}-image-list.ffconcat`;
}

function escText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/\n/g, '\\n');
}

function assColor(hex, alpha = '00') {
  const clean = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  return `&H${alpha}${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`;
}

function fitFilter(width, height) {
  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
}

function videoFitFilter(segment, width, height) {
  const transform = segment.transform || {};
  const zoom = Math.max(1, Number(transform.scale || transform.scaleStart || transform.zoom || 1));
  const scaledWidth = Math.ceil(width * zoom);
  const scaledHeight = Math.ceil(height * zoom);
  const flip = transform.flip ? 'hflip,' : '';
  return `${flip}scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
}

function segmentFitFilter(segment, width, height, fps, acceleration) {
  const sourceWidth = Number(segment.sourceWidth || segment.width || 0);
  const sourceHeight = Number(segment.sourceHeight || segment.height || 0);
  const sourceFps = Number(segment.sourceFps || 0);
  const transform = segment.transform || {};
  const hasTransform = Boolean(transform.flip) || Math.abs(Number(transform.scale || transform.scaleStart || transform.zoom || 1) - 1) > 0.001;
  const forceCover = segment.forceCover === true;
  const sameSize = sourceWidth === width && sourceHeight === height;
  const sameFps = sourceFps > 0 && Math.abs(sourceFps - fps) < 0.02;
  if (acceleration.mode === 'CUDA' && hasTransform) return `hwdownload,format=nv12,${videoFitFilter(segment, width, height)},fps=${fps},setsar=1,format=yuv420p`;
  if (acceleration.mode === 'CUDA') return `${cudaFitFilter(width, height)},fps=${fps},setsar=1,format=yuv420p`;
  if (!forceCover && !hasTransform && sameSize && sameFps) return 'setsar=1,format=yuv420p';
  if (!forceCover && !hasTransform && sameSize) return `fps=${fps},setsar=1,format=yuv420p`;
  return `${videoFitFilter(segment, width, height)},fps=${fps},setsar=1,format=yuv420p`;
}
function isPascalGtx10(system = {}) { return /\bGTX\s*10(?:50|60|70|80|80\s*Ti)\b/i.test(String(system.selectedGpuName || '')); }

function layerRenderTier(layer = {}) {
  const type = layer.type || layer.layerType || layer.layer_type;
  const role = String(layer.renderTier || layer.render_tier || '').toUpperCase();
  if (role === 'BACKGROUND' || role === 'STOCK') return 0;
  if (layer.dynamicVoiceImage === true || type === 'VOICE_IMAGE' || role === 'VOICE_IMAGE') return 1;
  return 2;
}

function isSimpleSingleVideoTimeline(plan) {
  if (plan.segments.length !== 1) return false;
  const segment = plan.segments[0];
  if (segment.mediaType !== 'VIDEO') return false;
  const layers = normalizeLayers(plan.config);
  const cachedOverlayCount = layers.filter((layer) =>
    layer.cachedLayerOverlay === true || layer.cachedJobGreenOverlay === true
  ).length;
  const onlyDirectOverlays = layers.every((layer) =>
    layer.dynamicVoiceImage === true ||
    layer.cachedLayerOverlay === true ||
    layer.cachedJobGreenOverlay === true
  );
  return layers.length === 0 || (onlyDirectOverlays && cachedOverlayCount <= 1);
}

function cudaFitFilter(width, height) {
  return `scale_cuda=${width}:${height}:force_original_aspect_ratio=increase:format=nv12:interp_algo=bilinear,hwdownload,format=nv12,crop=${width}:${height}`;
}

function imageMotionFilter(segment, width, height, fps) {
  const transform = segment.transform || {};
  const scale = Math.max(1, Number(transform.scaleStart || 1), Number(transform.scaleEnd || 1));
  const scaledW = Math.ceil(width * scale);
  const scaledH = Math.ceil(height * scale);
  const panX = Number(transform.panX || 0);
  const panY = Number(transform.panY || 0);
  const x = `max(0,min(iw-ow,(iw-ow)/2+${panX.toFixed(4)}*(iw-ow)))`;
  const y = `max(0,min(ih-oh,(ih-oh)/2+${panY.toFixed(4)}*(ih-oh)))`;
  const flip = transform.flip ? 'hflip,' : '';
  const angle = (Number(transform.rotate || 0) * Math.PI / 180).toFixed(6);
  return `${flip}scale=${scaledW}:${scaledH}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height}:x='${x}':y='${y}',` +
    `rotate=${angle}:ow=iw:oh=ih:fillcolor=black,scale=${width}:${height},fps=${fps},setsar=1,format=yuv420p`;
}

function layerPosition(layer, canvas) {
  return resolveLayerFrame(layer, { width: canvas.width, height: canvas.height, fps: canvas.fps || 30 });
}

function layerFitFilter(position, fitMode = 'contain') {
  return ffmpegLayerFitFilter(position, fitMode);
}

function normalizeKeyColor(value) {
  const match = String(value || '').trim().match(/^(?:#|0x)?([0-9a-f]{6})$/i);
  return `0x${(match ? match[1] : '00FF00').toUpperCase()}`;
}

function despillTypeForKeyColor(value) {
  const hex = normalizeKeyColor(value).slice(2);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return b > g && b > r ? 'blue' : 'green';
}

function greenKeySettings(effect = {}) {
  const similarity = Number(effect.similarity ?? 0.24);
  const softness = Number(effect.softness ?? 0.06);
  const keyColors = (Array.isArray(effect.keyColors) && effect.keyColors.length ? effect.keyColors : [effect.keyColor])
    .map(normalizeKeyColor)
    .filter((value, index, values) => values.indexOf(value) === index);
  const keyColor = keyColors[0] || normalizeKeyColor(effect.keyColor);
  return {
    keyColor,
    keyColors: keyColors.length ? keyColors : [keyColor],
    despillType: despillTypeForKeyColor(keyColor),
    similarity: clamp(Number.isFinite(similarity) ? similarity : 0.24, 0.01, 0.28),
    softness: clamp(Number.isFinite(softness) ? softness : 0.06, 0, 0.08),
    despillMix: clamp(Number(effect.despillMix ?? 0.45), 0, 1),
    despillExpand: clamp(Number(effect.despillExpand ?? 0.02), 0, 1)
  };
}

function greenKeyFilterChain(effect = {}, { rgb = false } = {}) {
  const key = greenKeySettings(effect);
  const prefix = rgb ? 'format=rgba,' : '';
  const colors = [selectDominantKeyColor(key.keyColors, key.despillType)];
  return prefix + colors.map((color) => `chromakey=${color}:${key.similarity}:${key.softness}`).join(',') + ',' +
    `despill=type=${key.despillType}:mix=${key.despillMix}:expand=${key.despillExpand},`;
}

function selectDominantKeyColor(colors = [], despillType = 'green') {
  const candidates = colors.length ? colors : ['0x00FF00'];
  const score = (value) => {
    const hex = normalizeKeyColor(value).slice(2);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return despillType === 'blue' ? b - Math.max(r, g) : g - Math.max(r, b);
  };
  return candidates.map(normalizeKeyColor).sort((a, b) => score(b) - score(a))[0];
}

function normalizeLayers(config) {
  return (config.layers || [])
    .filter((layer) => layer.visible !== false)
    .sort((a, b) => layerRenderTier(a) - layerRenderTier(b) || (Number(a.zIndex ?? a.z_index ?? 0)) - (Number(b.zIndex ?? b.z_index ?? 0)));
}

function hasNvenc(system, encoder) {
  if (encoder === 'h264_nvenc') {
    return Boolean(system.h264NvencRuntime || system.nvencRuntime || (system.h264Nvenc && system.nvencPotential));
  }
  if (encoder === 'hevc_nvenc') {
    return Boolean(system.hevcNvencRuntime || (system.hevcNvenc && (system.nvencRuntime || system.nvencPotential)));
  }
  return false;
}

function chooseEncoder(system = {}, requested = 'auto') {
  if (requested === 'libx264') return requested;
  if (requested === 'h264_nvenc' || requested === 'hevc_nvenc') {
    if (hasNvenc(system, requested)) return requested;
    const error = new Error(
      `${requested} chưa sẵn sàng. Ứng dụng đã quét GPU nhưng không tìm thấy NVIDIA NVENC hoạt động.`
    );
    error.code = 'NVIDIA_ENCODER_UNAVAILABLE';
    error.details = system.details || [];
    throw error;
  }
  if (requested === 'auto') {
    if (hasNvenc(system, 'h264_nvenc')) return 'h264_nvenc';
    return 'libx264';
  }
  return hasNvenc(system, 'h264_nvenc') ? 'h264_nvenc' : 'libx264';
}

function chooseAcceleration(system = {}, config = {}, encoder = 'libx264') {
  const configured = Number(config.gpuIndex);
  const gpuIndex = configured >= 0 ? configured : Math.max(0, Number(system.selectedGpuIndex || 0));
  const nvenc = encoder === 'h264_nvenc' || encoder === 'hevc_nvenc';
  if (!nvenc) return { mode: 'CPU', gpuIndex, label: 'CPU' };
  const requestedMode = String(config.accelerationMode || 'AUTO_STABLE').toUpperCase();
  if (requestedMode === FULL_GPU_MODE) {
    if (!system.cudaAvailable || !system.scaleCuda) {
      throw fullGpuError('Full GPU Zero-Copy cần NVDEC/CUDA và filter scale_cuda hoạt động.');
    }
    return {
      mode: 'CUDA_ZERO_COPY',
      gpuIndex,
      label: `NVIDIA Full GPU Zero-Copy nghiêm ngặt · GPU ${gpuIndex}`
    };
  }
  if (requestedMode === 'FULL_CUDA' && system.cudaAvailable && system.scaleCuda) {
    return {
      mode: 'CUDA',
      gpuIndex,
      label: 'NVIDIA Full CUDA thử nghiệm (NVDEC + scale_cuda + NVENC)'
    };
  }
  return {
    mode: 'NVENC_ONLY',
    gpuIndex,
    label: `NVIDIA NVENC ổn định · GPU ${gpuIndex} (decode/filter CPU)`
  };
}

function shouldUseAutoCudaMainPass({ system = {}, config = {}, encoder = 'libx264', segments = [], srtPath = null } = {}) {
  const nvenc = encoder === 'h264_nvenc' || encoder === 'hevc_nvenc';
  if (!nvenc) return false;
  const requestedMode = String(config.accelerationMode || 'AUTO_STABLE').toUpperCase();
  if (!['AUTO', 'AUTO_STABLE', ''].includes(requestedMode)) return false;
  if (config.autoCudaMainPass === false) return false;
  if (!system.cudaAvailable || !system.scaleCuda || isPascalGtx10(system)) return false;
  if (srtPath) return false;
  if (normalizeLayers(config).length) return false;
  if (!segments.length) return false;
  return segments.every((segment) => String(segment.mediaType || '').toUpperCase() === 'VIDEO');
}

function pushVideoInput(args, source, acceleration, performance, prefix = []) {
  args.push(...prefix);
  if (acceleration.mode === 'CUDA' || acceleration.mode === 'CUDA_ZERO_COPY') {
    args.push(
      '-hwaccel', 'cuda',
      '-hwaccel_device', String(acceleration.gpuIndex),
      '-hwaccel_output_format', 'cuda',
      '-extra_hw_frames', String(performance.extraHwFrames)
    );
  } else {
    // Tăng kích thước queue cho từng input để chống tràn bộ đệm message queue khi chạy nhiều stock song song
    args.push('-thread_queue_size', '1024');
  }
  args.push('-i', source);
}

function validateFullGpuPipeline({ segments = [], srtPath = null, config = {}, system = null, encoder = 'h264_nvenc' } = {}) {
  const issues = [];
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  const targetAspect = width / Math.max(1, height);
  const layers = normalizeLayers(config);
  if (!(encoder === 'h264_nvenc' || encoder === 'hevc_nvenc')) issues.push('codec phải là h264_nvenc hoặc hevc_nvenc');
  if (system && (!system.cudaAvailable || !system.scaleCuda)) issues.push('GPU/driver không vượt qua kiểm tra NVDEC + scale_cuda');
  if (system && layers.length && !system.overlayCuda) issues.push('FFmpeg không có filter overlay_cuda');
  if (!segments.length) issues.push('không có video nền');
  segments.forEach((segment, index) => {
    if (String(segment.mediaType || '').toUpperCase() !== 'VIDEO') {
      issues.push(`đoạn nền ${index + 1} là ảnh; zero-copy chỉ nhận video`);
    }
    const transition = segment.transitionIn;
    if (index > 0 && transition && normalizeTransitionType(transition.type) !== 'none' && Number(transition.durationMs || 0) > 0) {
      issues.push(`đoạn nền ${index + 1} dùng transition ${transition.type}; CUDA không có xfade tương đương`);
    }
    const transform = segment.transform || {};
    const scale = Number(transform.scale || transform.scaleStart || transform.zoom || 1);
    if (transform.flip || Math.abs(scale - 1) > 0.001 || Number(transform.rotate || 0) !== 0) {
      issues.push(`đoạn nền ${index + 1} dùng flip/zoom/rotate chưa có filter CUDA tương đương`);
    }
    if (Number(segment.padEndMs || 0) > 0) issues.push(`đoạn nền ${index + 1} cần tpad trên CPU`);
    const sourceWidth = Number(segment.sourceWidth || segment.width || 0);
    const sourceHeight = Number(segment.sourceHeight || segment.height || 0);
    if (sourceWidth > 0 && sourceHeight > 0) {
      const sourceAspect = sourceWidth / sourceHeight;
      if (Math.abs(sourceAspect - targetAspect) / targetAspect > 0.015) {
        issues.push(`đoạn nền ${index + 1} khác tỷ lệ khung hình ${width}:${height}; CUDA build này không có crop_cuda`);
      }
    }
  });
  if (srtPath) issues.push('subtitle SRT/ASS cần libass trên CPU');
  layers.forEach((layer, index) => {
    const type = String(layer.type || layer.layerType || layer.layer_type || '').toUpperCase();
    if (!['LOGO', 'IMAGE', 'VIDEO', 'OVERLAY_IMAGE', 'OVERLAY_VIDEO'].includes(type)) {
      issues.push(`layer ${index + 1} (${type || 'UNKNOWN'}) chưa có filter CUDA tương đương`);
      return;
    }
    if (layer.cachedLayerOverlay === true || layer.cachedJobGreenOverlay === true) {
      issues.push(`layer ${index + 1} là cache alpha; overlay_cuda của FFmpeg hiện tại không nhận alpha`);
    }
    const source = String(layer.sourceReference || layer.source || '');
    if (['LOGO', 'IMAGE', 'OVERLAY_IMAGE'].includes(type) && /\.(png|webp|gif)$/i.test(source)) {
      issues.push(`layer ${index + 1} dùng ${path.extname(source) || 'ảnh'} có thể có alpha; hãy dùng JPG/BMP đục hoặc chọn render cũ`);
    }
    const position = layerPosition(layer, { width, height, fps: Number(config.fps || config.canvas?.fps || 24) });
    if (Math.abs(Number(position.opacity ?? 1) - 1) > 0.001) issues.push(`layer ${index + 1} có opacity khác 100%`);
    if (Math.abs(Number(position.rotation || 0)) > 0.001) issues.push(`layer ${index + 1} có rotation`);
    const blend = String(layer.effect?.blendMode || layer.style?.blendMode || 'normal').toLowerCase();
    if (blend !== 'normal') issues.push(`layer ${index + 1} dùng blend mode ${blend}`);
    const fitMode = String(layer.fitMode || layer.fit || layer.style?.fit || layer.effect?.fit || 'contain').toLowerCase();
    if (!['contain', 'stretch'].includes(fitMode)) issues.push(`layer ${index + 1} dùng fit ${fitMode}; mode mới chỉ hỗ trợ contain/stretch`);
  });
  if (issues.length) {
    throw fullGpuError(
      `Full GPU Zero-Copy không thể chạy job này: ${issues.join('; ')}. ` +
      'Hãy chọn AUTO_STABLE/NVENC_ONLY để giữ đầy đủ hiệu ứng.',
      issues
    );
  }
  return { layers, width, height };
}

function fullGpuLayerFitFilter(position, fitMode = 'contain') {
  const width = Math.max(2, Math.round(Number(position.width || 2) / 2) * 2);
  const height = Math.max(2, Math.round(Number(position.height || 2) / 2) * 2);
  if (String(fitMode || 'contain').toLowerCase() === 'stretch') {
    return `scale_cuda=${width}:${height}:format=yuv420p:interp_algo=bilinear:passthrough=0`;
  }
  return `scale_cuda=${width}:${height}:force_original_aspect_ratio=decrease:` +
    `force_divisible_by=2:format=yuv420p:interp_algo=bilinear:passthrough=0,` +
    `pad_cuda=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`;
}

function canCopyFullGpuAudio(voicePath, config = {}) {
  const extension = path.extname(String(voicePath || '')).toLowerCase();
  return String(config.voiceAudioCodec || '').toLowerCase() === 'aac' &&
    Number(config.voiceAudioSampleRate || 0) === 48000 &&
    ['.aac', '.m4a', '.mp4'].includes(extension);
}

function buildFullGpuRenderArguments({
  segments,
  voicePath,
  srtPath,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration
}) {
  const { layers, width, height } = validateFullGpuPipeline({ segments, srtPath, config, encoder });
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const gpuIndex = Math.max(0, Number(acceleration?.gpuIndex || 0));
  const strictConfig = {
    ...config,
    performanceProfile: 'MAX_SPEED',
    nvencPreset: config.fullGpuNvencPreset || 'p1'
  };
  const performance = performanceSettings(strictConfig);
  const args = [
    '-y', '-hide_banner',
    '-init_hw_device', `cuda=gpu:${gpuIndex}`,
    '-filter_hw_device', 'gpu'
  ];
  const inputMeta = [];
  for (const segment of segments) {
    pushVideoInput(args, segment.filePath, acceleration, performance);
    inputMeta.push({ kind: 'segment', segment });
  }
  const hasVoice = Boolean(voicePath);
  const voiceIndex = inputMeta.length;
  if (hasVoice) {
    args.push('-i', voicePath);
    inputMeta.push({ kind: 'voice' });
  }
  const layerInputs = [];
  for (const layer of layers) {
    const source = layer.sourceReference || layer.source;
    if (!source) continue;
    const type = String(layer.type || layer.layerType || '').toUpperCase();
    const isImage = ['LOGO', 'IMAGE', 'OVERLAY_IMAGE'].includes(type);
    if (isImage) {
      args.push('-loop', '1', '-framerate', String(fps), '-t', sec(durationMs), '-i', source);
    } else {
      pushVideoInput(args, source, acceleration, performance, ['-stream_loop', '-1']);
    }
    layerInputs.push({ ...layer, inputIndex: inputMeta.length, isImage, source });
    inputMeta.push({ kind: 'layer' });
  }

  const filters = [];
  segments.forEach((segment, index) => {
    const playbackRate = Math.max(0.05, Number(segment.playbackRate || 1));
    const trimDurationMs = Number(segment.sourceDurationMs || segment.trimDurationMs ||
      (playbackRate === 1 ? segment.durationMs : segment.durationMs * playbackRate));
    const setpts = Math.abs(playbackRate - 1) < 0.001 ? 'PTS-STARTPTS' : `(PTS-STARTPTS)/${playbackRate.toFixed(6)}`;
    filters.push(
      `[${index}:v]trim=start=${sec(segment.trimStartMs)}:duration=${sec(trimDurationMs)},` +
      `setpts=${setpts},fps=${fps},` +
      `scale_cuda=${width}:${height}:format=yuv420p:interp_algo=bilinear:passthrough=0[fg${index}]`
    );
  });
  let current = 'fg0';
  if (segments.length > 1) {
    filters.push(`${segments.map((_segment, index) => `[fg${index}]`).join('')}concat=n=${segments.length}:v=1:a=0[fgcat]`);
    current = 'fgcat';
  }

  layerInputs.forEach((layer, index) => {
    const position = layerPosition(layer, { width, height, fps });
    const overlayPosition = ffmpegOverlayPosition(position);
    const fitMode = layer.fitMode || layer.fit || layer.style?.fit || layer.effect?.fit || 'contain';
    const start = Number(layer.startMs ?? layer.timing?.startMs ?? 0) / 1000;
    const end = Number(layer.endMs ?? layer.timing?.endMs ?? durationMs) / 1000;
    const sourceLabel = `fgl${index}`;
    const inputChain = layer.isImage
      ? `format=yuv420p,hwupload_cuda,${fullGpuLayerFitFilter(position, fitMode)}`
      : `trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,fps=${fps},${fullGpuLayerFitFilter(position, fitMode)}`;
    filters.push(`[${layer.inputIndex}:v]${inputChain}[${sourceLabel}]`);
    const output = `fgc${index}`;
    filters.push(
      `[${current}][${sourceLabel}]overlay_cuda=x=${overlayPosition.x}:y=${overlayPosition.y}:` +
      `eof_action=repeat:shortest=0:enable='between(t,${start.toFixed(3)},${Math.max(start, end).toFixed(3)})'[${output}]`
    );
    current = output;
  });
  let outputLabel = current;
  if (segments.length > 1 || layerInputs.length > 0) {
    filters.push(
      `[${current}]trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,` +
      `scale_cuda=${width}:${height}:format=yuv420p:interp_algo=bilinear:passthrough=0[fgout]`
    );
    outputLabel = 'fgout';
  }
  args.push('-filter_complex', filters.join(';'), '-map', `[${outputLabel}]`, '-map_metadata', '-1');
  if (hasVoice) args.push('-map', `${voiceIndex}:a:0`);
  else args.push('-an');
  pushEncoderArgs(args, {
    encoder,
    gpuIndex,
    performance,
    videoBitrateKbps,
    config: strictConfig
  });
  args.push('-fps_mode', 'cfr', '-r', String(fps), '-t', sec(durationMs));
  if (hasVoice) {
    if (canCopyFullGpuAudio(voicePath, config)) args.push('-c:a', 'copy');
    else args.push('-af', 'volume=0.92,aresample=48000', '-c:a', 'aac', '-b:a', `${config.audioBitrateKbps || 256}k`, '-ar', '48000');
  }
  args.push('-progress', 'pipe:1', '-nostats', outputPath);
  return args;
}

function pushEncoderArgs(args, { encoder, gpuIndex, performance, videoBitrateKbps, config }) {
  if (encoder === 'h264_nvenc' || encoder === 'hevc_nvenc') {
    args.push(
      '-c:v', encoder,
      '-gpu', String(gpuIndex),
      '-preset', performance.preset,
      '-rc', 'vbr',
      '-bf', String(performance.bFrames),
      '-b:v', `${videoBitrateKbps}k`,
      '-maxrate', `${Math.round(videoBitrateKbps * 1.25)}k`,
      '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`
    );
    if (!config.nvencCompatibilityMode) {
      args.push(
        '-tune', performance.tune,
        '-multipass', performance.multipass,
        '-rc-lookahead', String(performance.lookahead),
        '-surfaces', String(performance.surfaces),
        '-spatial_aq', '0',
        '-temporal_aq', '0'
      );
    }
    return;
  }
  args.push(
    '-c:v', 'libx264',
    '-preset', config.cpuPreset || 'veryfast',
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${Math.round(videoBitrateKbps * 1.1)}k`,
    '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`
  );
}

function buildVideoCopyAudioMuxArguments({
  videoPath,
  voicePath,
  outputPath,
  durationMs,
  config
}) {
  const performance = renderPerformanceSettings(config, [], [], null);
  const args = ['-y', '-hide_banner', '-filter_complex_threads', String(performance.filterComplexThreads), '-i', videoPath];
  const hasVoice = Boolean(voicePath);
  if (hasVoice) args.push('-i', voicePath);
  args.push('-map', '0:v:0');
  if (hasVoice) {
    args.push('-map', '1:a:0');
  } else {
    args.push('-an');
  }
  args.push('-map_metadata', '-1', '-c:v', 'copy');
  if (hasVoice) {
    args.push(
      '-af', 'volume=0.92,aresample=48000',
      '-c:a', 'aac',
      '-b:a', `${config.audioBitrateKbps || 256}k`,
      '-ar', '48000',
      '-t', sec(durationMs)
    );
  }
  if (performance.faststart && config.faststart !== false) {
    args.push('-movflags', '+faststart');
  }
  args.push(
    '-progress', 'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function buildBackgroundArguments({
  segments,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration = { mode: 'CPU', gpuIndex: 0 }
}) {
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const gpuIndex = Math.max(0, Number(acceleration.gpuIndex || 0));
  const performance = renderPerformanceSettings(config, segments, [], null);
  const args = ['-y', '-hide_banner', '-filter_complex_threads', String(performance.filterComplexThreads)];

  if (acceleration.mode === 'CUDA') {
    args.push('-init_hw_device', `cuda=gpu:${gpuIndex}`, '-filter_hw_device', 'gpu');
  }

  for (const segment of segments) {
    if (segment.mediaType === 'IMAGE') {
      args.push('-loop', '1', '-framerate', String(fps), '-t', sec(segment.durationMs), '-i', segment.filePath);
    } else {
      pushVideoInput(args, segment.filePath, acceleration, performance);
    }
  }

  const filters = [];
  segments.forEach((segment, index) => {
    if (segment.mediaType === 'IMAGE') {
      filters.push(
        `[${index}:v]${imageMotionFilter(segment, width, height, fps)},` +
        `trim=duration=${sec(segment.durationMs)}[v${index}]`
      );
      return;
    }
    const fit = segmentFitFilter(segment, width, height, fps, acceleration);
    const pad = Number(segment.padEndMs || 0) > 0
      ? `tpad=stop_mode=clone:stop_duration=${sec(segment.padEndMs)},`
      : '';
    const playbackRate = Math.max(0.05, Number(segment.playbackRate || 1));
    const trimDurationMs = Number(segment.sourceDurationMs || segment.trimDurationMs || (playbackRate === 1 ? segment.durationMs : segment.durationMs * playbackRate));
    const setpts = Math.abs(playbackRate - 1) < 0.001 ? 'PTS-STARTPTS' : `(PTS-STARTPTS)/${playbackRate.toFixed(6)}`;
    filters.push(
      `[${index}:v]trim=start=${sec(segment.trimStartMs)}:duration=${sec(trimDurationMs)},` +
      `setpts=${setpts},${pad}${fit}[v${index}]`
    );
  });

  let current = 'v0';
  let timeline = segments[0]?.durationMs || durationMs;
  for (let index = 1; index < segments.length; index += 1) {
    const transition = segments[index].transitionIn || { type: 'fade', durationMs: 700 };
    const output = `vx${index}`;
    if (normalizeTransitionType(transition.type) === 'none' || Number(transition.durationMs || 0) <= 0) {
      filters.push(`[${current}][v${index}]concat=n=2:v=1:a=0[${output}]`);
      timeline += segments[index].durationMs;
    } else {
      const offset = Math.max(0, timeline - transition.durationMs);
      filters.push(
        `[${current}][v${index}]xfade=transition=${normalizeTransitionType(transition.type)}:` +
        `duration=${sec(transition.durationMs)}:offset=${sec(offset)}[${output}]`
      );
      timeline += segments[index].durationMs - transition.durationMs;
    }
    current = output;
  }
  filters.push(`[${current}]trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS[vout]`);

  args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-an', '-map_metadata', '-1');
  pushEncoderArgs(args, {
    encoder,
    gpuIndex,
    performance,
    videoBitrateKbps: Math.max(videoBitrateKbps, Math.round(videoBitrateKbps * 2.2)),
    config
  });
  args.push(
    '-pix_fmt', 'yuv420p',
    '-fps_mode', 'cfr',
    '-r', String(fps),
    '-t', sec(durationMs),
    '-progress', 'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function buildBackgroundChunkConcatArguments({
  chunks,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration = { mode: 'CPU', gpuIndex: 0 }
}) {
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const gpuIndex = Math.max(0, Number(acceleration.gpuIndex || 0));
  const performance = renderPerformanceSettings(config, chunks, [], null);
  const args = ['-y', '-hide_banner', '-filter_complex_threads', String(performance.filterComplexThreads)];
  for (const chunk of chunks) {
    args.push('-i', chunk.outputPath);
  }
  const filters = [];
  chunks.forEach((chunk, index) => {
    filters.push(
      `[${index}:v]trim=duration=${sec(chunk.durationMs)},setpts=PTS-STARTPTS,` +
      `fps=${fps},format=yuv420p[vc${index}]`
    );
  });
  let current = 'vc0';
  let timeline = chunks[0]?.durationMs || durationMs;
  for (let index = 1; index < chunks.length; index += 1) {
    const transition = chunks[index].transitionIn || { type: 'none', durationMs: 0 };
    const output = `vcx${index}`;
    if (normalizeTransitionType(transition.type) === 'none' || Number(transition.durationMs || 0) <= 0) {
      filters.push(`[${current}][vc${index}]concat=n=2:v=1:a=0[${output}]`);
      timeline += chunks[index].durationMs;
    } else {
      const duration = Number(transition.durationMs || 0);
      const offset = Math.max(0, timeline - duration);
      filters.push(
        `[${current}][vc${index}]xfade=transition=${normalizeTransitionType(transition.type)}:` +
        `duration=${sec(duration)}:offset=${sec(offset)}[${output}]`
      );
      timeline += chunks[index].durationMs - duration;
    }
    current = output;
  }
  filters.push(`[${current}]trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS[vout]`);
  args.push('-filter_complex', filters.join(';'), '-map', '[vout]', '-an', '-map_metadata', '-1');
  pushEncoderArgs(args, {
    encoder,
    gpuIndex,
    performance,
    videoBitrateKbps: Math.max(videoBitrateKbps, Math.round(videoBitrateKbps * 2.2)),
    config
  });
  args.push(
    '-pix_fmt', 'yuv420p',
    '-fps_mode', 'cfr',
    '-r', String(fps),
    '-t', sec(durationMs),
    '-progress', 'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function buildBackgroundConcatCopyArguments({
  listPath,
  outputPath,
  durationMs,
  config
}) {
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const args = [
    '-y',
    '-hide_banner',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-map',
    '0:v:0',
    '-an',
    '-map_metadata',
    '-1',
    '-c:v',
    'copy',
    '-fps_mode',
    'cfr',
    '-r',
    String(fps),
    '-t',
    sec(durationMs)
  ];
  if (config.faststart !== false) {
    args.push('-movflags', '+faststart');
  }
  args.push('-progress', 'pipe:1', '-nostats', outputPath);
  return args;
}

function shouldUseImageSequenceBackground(segments = [], config = {}) {
  if (config.imageBackgroundRenderer === 'chunked') return false;
  if (config.imageBackgroundRenderer === 'sequence') return true;
  const threshold = Math.max(10, Number(config.imageSequenceSegmentThreshold || IMAGE_SEQUENCE_SEGMENT_THRESHOLD));
  return segments.length >= threshold &&
    segments.every((segment) => String(segment.mediaType || '').toUpperCase() === 'IMAGE');
}

function imageClipDurationMs(segment = {}, index = 0) {
  const durationMs = Math.max(0, Number(segment.durationMs || 0));
  if (index === 0) return durationMs;
  return Math.max(1, durationMs - transitionDurationMs(segment.transitionIn));
}

function buildImageSequenceBackgroundStage({
  segments,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration
}) {
  const listPath = concatListOutputPath(outputPath);
  const clips = segments.map((segment, index) => {
    const clipDurationMs = imageClipDurationMs(segment, index);
    const clipPath = imageClipOutputPath(outputPath, index);
    return {
      name: `BACKGROUND_IMAGE_CLIP_${index + 1}`,
      index: index + 1,
      total: segments.length,
      outputPath: clipPath,
      listPath,
      durationMs: clipDurationMs,
      args: buildBackgroundArguments({
        segments: [{
          ...segment,
          durationMs: clipDurationMs,
          transitionIn: null
        }],
        outputPath: clipPath,
        durationMs: clipDurationMs,
        config,
        videoBitrateKbps,
        encoder,
        acceleration
      }),
      acceleration
    };
  });
  return {
    args: buildBackgroundConcatCopyArguments({
      listPath,
      outputPath,
      durationMs,
      config
    }),
    imageSequence: true,
    listPath,
    clips
  };
}

function shouldChunkBackgroundPrepass(segments = [], args = [], config = {}) {
  const limit = Math.max(8, Number(config.backgroundChunkSegmentLimit || BACKGROUND_CHUNK_SEGMENT_LIMIT));
  if (segments.length <= limit) return false;
  const imageCount = segments.filter((segment) => String(segment.mediaType || '').toUpperCase() === 'IMAGE').length;
  return imageCount >= limit || estimateCommandChars(args) > WINDOWS_SAFE_COMMAND_CHARS;
}

function buildChunkedBackgroundStage({
  segments,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration
}) {
  const limit = Math.max(8, Number(config.backgroundChunkSegmentLimit || BACKGROUND_CHUNK_SEGMENT_LIMIT));
  const segmentChunks = chunkArray(segments, limit);
  const chunkStages = segmentChunks.map((chunkSegments, index) => {
    const chunkDurationMs = segmentSequenceDurationMs(chunkSegments);
    const chunkPath = chunkOutputPath(outputPath, index);
    return {
      name: `BACKGROUND_CHUNK_${index + 1}`,
      index: index + 1,
      total: segmentChunks.length,
      outputPath: chunkPath,
      segmentCount: chunkSegments.length,
      imageCount: chunkSegments.filter((segment) => String(segment.mediaType || '').toUpperCase() === 'IMAGE').length,
      videoCount: chunkSegments.filter((segment) => String(segment.mediaType || '').toUpperCase() === 'VIDEO').length,
      durationMs: chunkDurationMs,
      transitionIn: index === 0 ? null : chunkSegments[0]?.transitionIn,
      args: buildBackgroundArguments({
        segments: chunkSegments,
        outputPath: chunkPath,
        durationMs: chunkDurationMs,
        config,
        videoBitrateKbps,
        encoder,
        acceleration
      }),
      acceleration
    };
  });
  return {
    args: buildBackgroundChunkConcatArguments({
      chunks: chunkStages,
      outputPath,
      durationMs,
      config,
      videoBitrateKbps,
      encoder,
      acceleration
    }),
    chunks: chunkStages
  };
}

function buildRenderArguments({
  segments,
  voicePath,
  srtPath,
  outputPath,
  durationMs,
  config,
  videoBitrateKbps,
  encoder,
  acceleration = { mode: 'CPU', gpuIndex: 0 }
}) {
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const gpuIndex = Math.max(0, Number(acceleration.gpuIndex || 0));
  const layers = normalizeLayers(config);
  const performance = renderPerformanceSettings(config, segments, layers, srtPath);
  const args = ['-y', '-hide_banner', '-nostdin', '-filter_complex_threads', String(performance.filterComplexThreads)];

  if (acceleration.mode === 'CUDA') {
    args.push(
      '-init_hw_device', `cuda=gpu:${gpuIndex}`,
      '-filter_hw_device', 'gpu'
    );
  }

  const inputMeta = [];
  for (const segment of segments) {
    if (segment.mediaType === 'IMAGE') {
      args.push(
        '-loop', '1', '-framerate', String(fps),
        '-t', sec(segment.durationMs), '-i', segment.filePath
      );
    } else {
      pushVideoInput(args, segment.filePath, acceleration, performance);
    }
    inputMeta.push({ kind: 'segment', segment });
  }

  const hasVoice = Boolean(voicePath);
  const voiceIndex = inputMeta.length;
  if (hasVoice) {
    args.push('-i', voicePath);
    inputMeta.push({ kind: 'voice' });
  }

  const layerInputs = [];
  for (const layer of layers) {
    if (!layer.sourceReference && !layer.source) continue;
    const type = layer.type || layer.layerType;
    if (!['LOGO', 'IMAGE', 'VIDEO', 'GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO', 'OVERLAY_IMAGE', 'OVERLAY_VIDEO'].includes(type)) continue;
    const source = layer.sourceReference || layer.source;
    const isImage = ['LOGO', 'IMAGE', 'GREENSCREEN_IMAGE', 'OVERLAY_IMAGE'].includes(type);
    if (isImage) {
      args.push(
        '-loop', '1', '-framerate', String(fps),
        '-t', sec(durationMs), '-i', source
      );
    } else {
      const layerAcceleration = (layer.cachedLayerOverlay === true || layer.cachedJobGreenOverlay === true)
        ? { mode: 'CPU', gpuIndex: acceleration.gpuIndex || 0 }
        : acceleration;
      pushVideoInput(args, source, layerAcceleration, performance, ['-stream_loop', '-1']);
    }
    layerInputs.push({ ...layer, inputIndex: inputMeta.length, source, isImage });
    inputMeta.push({ kind: 'layer' });
  }

  const filters = [];
  segments.forEach((segment, index) => {
    if (segment.mediaType === 'IMAGE') {
      filters.push(
        `[${index}:v]${imageMotionFilter(segment, width, height, fps)},` +
        `trim=duration=${sec(segment.durationMs)}[v${index}]`
      );
      return;
    }
    const fit = segmentFitFilter(segment, width, height, fps, acceleration);
    const pad = Number(segment.padEndMs || 0) > 0
      ? `tpad=stop_mode=clone:stop_duration=${sec(segment.padEndMs)},`
      : '';
    const playbackRate = Math.max(0.05, Number(segment.playbackRate || 1));
    const trimDurationMs = Number(segment.sourceDurationMs || segment.trimDurationMs || (playbackRate === 1 ? segment.durationMs : segment.durationMs * playbackRate));
    const setpts = Math.abs(playbackRate - 1) < 0.001 ? 'PTS-STARTPTS' : `(PTS-STARTPTS)/${playbackRate.toFixed(6)}`;
    filters.push(
      `[${index}:v]trim=start=${sec(segment.trimStartMs)}:duration=${sec(trimDurationMs)},` +
      `setpts=${setpts},${pad}${fit}[v${index}]`
    );
  });

  let current = 'v0';
  let timeline = segments[0]?.durationMs || durationMs;
  for (let index = 1; index < segments.length; index += 1) {
    const transition = segments[index].transitionIn || { type: 'fade', durationMs: 700 };
    const output = `vx${index}`;
    if (normalizeTransitionType(transition.type) === 'none' || Number(transition.durationMs || 0) <= 0) {
      filters.push(`[${current}][v${index}]concat=n=2:v=1:a=0[${output}]`);
      timeline += segments[index].durationMs;
    } else {
      const offset = Math.max(0, timeline - transition.durationMs);
      filters.push(
        `[${current}][v${index}]xfade=transition=${normalizeTransitionType(transition.type)}:` +
        `duration=${sec(transition.durationMs)}:offset=${sec(offset)}[${output}]`
      );
      timeline += segments[index].durationMs - transition.durationMs;
    }
    current = output;
  }
  filters.push(`[${current}]trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS[vbase]`);
  current = 'vbase';

  let layerCounter = 0;
  for (const layer of layers) {
    const type = layer.type || layer.layerType;
    const style = layer.style || {};
    const timing = layer.timing || {};
    const effect = layer.effect || {};
    const enableStart = Number(layer.startMs ?? timing.startMs ?? 0) / 1000;
    const enableEnd = Number(layer.endMs ?? timing.endMs ?? durationMs) / 1000;
    const enable = `between(t,${enableStart.toFixed(3)},${Math.max(enableStart, enableEnd).toFixed(3)})`;

    if (type === 'TEXT') {
      const transform = layer.transform || {};
      const position = layerPosition(layer, { width, height, fps });
      const overlayPosition = ffmpegOverlayPosition(position);
      const fontSize = Number(style.fontSize || 52);
      const opacity = clamp(transform.opacity ?? style.opacity ?? 1, 0, 1);
      const color = String(style.color || '#FFFFFF').replace('#', '');
      const box = style.background
        ? `:box=1:boxcolor=${String(style.background).replace('#', '')}@${clamp(style.backgroundOpacity ?? 0.5, 0, 1)}`
        : '';
      const fontFile = style.fontFile
        ? `:fontfile='${escapeSubtitlePath(style.fontFile)}'`
        : '';
      const textLabel = `tl${layerCounter}`;
      const rotatedLabel = `tr${layerCounter}`;
      filters.push(
        `color=c=black@0:s=${Math.round(position.width)}x${Math.round(position.height)}:r=${fps}:d=${sec(durationMs)},format=rgba,` +
        `drawtext=text='${escText(layer.text || layer.sourceReference || 'Text')}':` +
        `x=(w-text_w)/2:y=(h-text_h)/2:` +
        `fontsize=${fontSize}:fontcolor=${color}@${opacity}:` +
        `borderw=${Number(style.outlineWidth || 2)}:` +
        `bordercolor=${String(style.outlineColor || '#000000').replace('#', '')}` +
        `${box}${fontFile}[${textLabel}]`
      );
      if (Math.abs(position.rotation) > 0.001) {
        filters.push(`[${textLabel}]rotate=${(position.rotation * Math.PI / 180).toFixed(6)}:ow=rotw(iw):oh=roth(ih):fillcolor=black@0[${rotatedLabel}]`);
      }
      const sourceLabel = Math.abs(position.rotation) > 0.001 ? rotatedLabel : textLabel;
      filters.push(
        `[${current}][${sourceLabel}]overlay=x=${overlayPosition.x}:y=${overlayPosition.y}:` +
        `eof_action=repeat:shortest=0:enable='${enable}'[vt${layerCounter}]`
      );
      current = `vt${layerCounter++}`;
      continue;
    }

    const input = layerInputs.find((item) => item.id === layer.id) ||
      layerInputs.find((item) => item.source === (layer.sourceReference || layer.source));
    if (!input) continue;

    const position = layerPosition(layer, { width, height });
    const overlayPosition = ffmpegOverlayPosition(position);
    const fitMode = layer.fitMode || layer.fit || style.fit || effect.fit || 'contain';
    const label = `li${layerCounter}`;
    let chain = `[${input.inputIndex}:v]`;
    const isGreenscreen = ['GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO'].includes(type);
    const isAlphaOverlayCache = layer.cachedLayerOverlay === true || layer.cachedJobGreenOverlay === true;
    if (isAlphaOverlayCache) {
      chain += `trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,` +
        `fps=${fps},format=rgba,${layerFitFilter(position, fitMode)},format=rgba,`;
    } else if (!input.isImage && acceleration.mode === 'CUDA') {
      chain += `hwdownload,format=nv12,format=rgba,${layerFitFilter(position, fitMode)},`;
    } else if (input.isImage) {
      chain += `format=rgba,${layerFitFilter(position, fitMode)},`;
    } else {
      chain += `trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,` +
        `fps=${fps},format=rgba,${layerFitFilter(position, fitMode)},`;
    }
    if (isGreenscreen) {
      chain += greenKeyFilterChain(effect, { rgb: input.isImage });
    }
    chain += `${isAlphaOverlayCache ? '' : 'format=rgba,'}colorchannelmixer=aa=${position.opacity}`;
    if (Math.abs(position.rotation) > 0.001) {
      chain += `,rotate=${(position.rotation * Math.PI / 180).toFixed(6)}:` +
        'ow=rotw(iw):oh=roth(ih):fillcolor=black@0';
    }
    filters.push(`${chain}[${label}]`);

    const output = `vl${layerCounter}`;
    const blend = String(effect.blendMode || style.blendMode || 'normal').toLowerCase();
    if (blend === 'normal') {
      filters.push(
        `[${current}][${label}]overlay=x=${overlayPosition.x}:y=${overlayPosition.y}:` +
        `eof_action=repeat:shortest=0:enable='${enable}'[${output}]`
      );
    } else {
      const full = `lf${layerCounter}`;
      filters.push(
        `[${label}]pad=${width}:${height}:${overlayPosition.x}:${overlayPosition.y}:color=black@0[${full}]`
      );
      const mode = {
        screen: 'screen',
        add: 'addition',
        multiply: 'multiply',
        overlay: 'overlay',
        lighten: 'lighten',
        darken: 'darken'
      }[blend] || 'screen';
      filters.push(
        `[${current}][${full}]blend=all_mode=${mode}:all_opacity=${position.opacity}:` +
        `enable='${enable}'[${output}]`
      );
    }
    current = output;
    layerCounter += 1;
  }

  if (srtPath) {
    const escaped = escapeSubtitlePath(srtPath);
    const fontsDir = resolveSubtitleFontsDir();
    const fontsArg = fs.existsSync(fontsDir) ? `:fontsdir='${escapeSubtitlePath(fontsDir)}'` : '';
    const isAss = path.extname(String(srtPath)).toLowerCase() === '.ass';
    if (isAss) {
      filters.push(`[${current}]subtitles=filename='${escaped}':original_size=${width}x${height}${fontsArg}[vout]`);
    } else {
      const style = subtitleStyle(config).replace(/'/g, "\\'");
      filters.push(
        `[${current}]subtitles=filename='${escaped}':original_size=${width}x${height}${fontsArg}:force_style='${style}'[vout]`
      );
    }
    current = 'vout';
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', `[${current}]`,
    '-map_metadata', '-1'
  );
  if (hasVoice) {
    args.push('-map', `${voiceIndex}:a:0`);
  } else {
    args.push('-an');
  }

  pushEncoderArgs(args, { encoder, gpuIndex, performance, videoBitrateKbps, config });

  args.push(
    '-pix_fmt', 'yuv420p',
    '-fps_mode', 'cfr',
    '-r', String(fps),
    '-t', sec(durationMs)
  );
  if (hasVoice) {
    args.push(
      '-af', 'volume=0.92,aresample=48000',
      '-c:a', 'aac',
      '-b:a', `${config.audioBitrateKbps || 256}k`,
      '-ar', '48000'
    );
  }
  if (performance.faststart && config.faststart !== false) {
    args.push('-movflags', '+faststart');
  }
  args.push(
    '-progress', 'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function buildLayerCacheArguments({
  layers,
  outputPath,
  durationMs,
  config,
  acceleration = { mode: 'CPU', gpuIndex: 0 }
}) {
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  const fps = Number(config.fps || config.canvas?.fps || 24);
  const cacheConfig = { ...config, layers };
  const normalizedLayers = normalizeLayers(cacheConfig);
  const performance = renderPerformanceSettings(config, [], normalizedLayers, null);
  const gpuIndex = Math.max(0, Number(acceleration.gpuIndex || 0));
  const args = [
    '-y',
    '-hide_banner',
    '-filter_complex_threads',
    String(performance.filterComplexThreads)
  ];

  if (acceleration.mode === 'CUDA') {
    args.push(
      '-init_hw_device', `cuda=gpu:${gpuIndex}`,
      '-filter_hw_device', 'gpu'
    );
  }

  args.push(
    '-f',
    'lavfi',
    '-i',
    `color=c=black@0.0:s=${width}x${height}:r=${fps}:d=${sec(durationMs)},format=rgba`
  );

  const layerInputs = [];
  for (const layer of normalizedLayers) {
    if (!layer.sourceReference && !layer.source) continue;
    const type = layer.type || layer.layerType;
    if (!['LOGO', 'IMAGE', 'VIDEO', 'GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO', 'OVERLAY_IMAGE', 'OVERLAY_VIDEO'].includes(type)) continue;
    const source = layer.sourceReference || layer.source;
    const isImage = ['LOGO', 'IMAGE', 'GREENSCREEN_IMAGE', 'OVERLAY_IMAGE'].includes(type);
    if (isImage) {
      args.push('-loop', '1', '-framerate', String(fps), '-t', sec(durationMs), '-i', source);
    } else {
      pushVideoInput(args, source, acceleration, performance, ['-stream_loop', '-1']);
    }
    layerInputs.push({ ...layer, inputIndex: layerInputs.length + 1, source, isImage });
  }

  const filters = ['[0:v]format=rgba[vbase]'];
  let current = 'vbase';
  let layerCounter = 0;
  for (const layer of normalizedLayers) {
    const type = layer.type || layer.layerType;
    const style = layer.style || {};
    const effect = layer.effect || {};

    if (type === 'TEXT') {
      const transform = layer.transform || {};
      const position = layerPosition(layer, { width, height, fps });
      const overlayPosition = ffmpegOverlayPosition(position);
      const fontSize = Number(style.fontSize || 52);
      const opacity = clamp(transform.opacity ?? style.opacity ?? 1, 0, 1);
      const color = String(style.color || '#FFFFFF').replace('#', '');
      const box = style.background
        ? `:box=1:boxcolor=${String(style.background).replace('#', '')}@${clamp(style.backgroundOpacity ?? 0.5, 0, 1)}`
        : '';
      const fontFile = style.fontFile ? `:fontfile='${escapeSubtitlePath(style.fontFile)}'` : '';
      const textLabel = `tlcache${layerCounter}`;
      const rotatedLabel = `trcache${layerCounter}`;
      filters.push(
        `color=c=black@0:s=${Math.round(position.width)}x${Math.round(position.height)}:r=${fps}:d=${sec(durationMs)},format=rgba,` +
        `drawtext=text='${escText(layer.text || layer.sourceReference || 'Text')}':` +
        `x=(w-text_w)/2:y=(h-text_h)/2:` +
        `fontsize=${fontSize}:fontcolor=${color}@${opacity}:` +
        `borderw=${Number(style.outlineWidth || 0)}:` +
        `bordercolor=${String(style.outlineColor || '#000000').replace('#', '')}` +
        `${box}${fontFile}[${textLabel}]`
      );
      if (Math.abs(position.rotation) > 0.001) {
        filters.push(`[${textLabel}]rotate=${(position.rotation * Math.PI / 180).toFixed(6)}:ow=rotw(iw):oh=roth(ih):fillcolor=black@0[${rotatedLabel}]`);
      }
      const sourceLabel = Math.abs(position.rotation) > 0.001 ? rotatedLabel : textLabel;
      filters.push(
        `[${current}][${sourceLabel}]overlay=x=${overlayPosition.x}:y=${overlayPosition.y}:` +
        `eof_action=repeat:shortest=0[vt${layerCounter}]`
      );
      current = `vt${layerCounter++}`;
      continue;
    }

    const input = layerInputs.find((item) => item.id === layer.id) ||
      layerInputs.find((item) => item.source === (layer.sourceReference || layer.source));
    if (!input) continue;

    const position = layerPosition(layer, { width, height });
    const overlayPosition = ffmpegOverlayPosition(position);
    const fitMode = layer.fitMode || layer.fit || style.fit || effect.fit || 'contain';
    const label = `lcache${layerCounter}`;
    let chain = `[${input.inputIndex}:v]`;
    const isGreenscreen = ['GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO'].includes(type);
    if (input.isImage) {
      chain += `format=rgba,${layerFitFilter(position, fitMode)},`;
    } else if (acceleration.mode === 'CUDA') {
      chain += `hwdownload,format=nv12,trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,` +
        `fps=${fps},format=rgba,${layerFitFilter(position, fitMode)},`;
    } else {
      chain += `trim=duration=${sec(durationMs)},setpts=PTS-STARTPTS,fps=${fps},format=rgba,${layerFitFilter(position, fitMode)},`;
    }
    if (isGreenscreen) {
      chain += greenKeyFilterChain(effect, { rgb: input.isImage });
    }
    chain += `format=rgba,colorchannelmixer=aa=${position.opacity}`;
    if (Math.abs(position.rotation) > 0.001) {
      chain += `,rotate=${(position.rotation * Math.PI / 180).toFixed(6)}:` +
        'ow=rotw(iw):oh=roth(ih):fillcolor=black@0';
    }
    filters.push(`${chain}[${label}]`);

    const output = `vcache${layerCounter}`;
    filters.push(
      `[${current}][${label}]overlay=x=${overlayPosition.x}:y=${overlayPosition.y}:` +
      `eof_action=repeat:shortest=0[${output}]`
    );
    current = output;
    layerCounter += 1;
  }

  filters.push(`[${current}]trim=duration=${sec(durationMs)},format=rgba[vout]`);
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[vout]',
    '-an',
    '-map_metadata',
    '-1',
    '-c:v',
    'qtrle',
    '-pix_fmt',
    'argb',
    '-fps_mode',
    'cfr',
    '-r',
    String(fps),
    '-t',
    sec(durationMs),
    '-progress',
    'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function shouldUseStagedPipeline(plan) {
  if (isFullGpuMode(plan.config)) return false;
  if (plan.config?.stagedPipeline === false) return false;
  if (!(plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc')) return false;
  const layers = normalizeLayers(plan.config);
  const canMoveBackgroundToGpu = Boolean(plan.config?.cudaAvailableForStaging);
  const hasCpuSubtitlePass = Boolean(plan.srtPath);
  const benefitsFromGpuPrepass = canMoveBackgroundToGpu && (hasCpuSubtitlePass || layers.length || plan.segments.length > 1);
  if (plan.config?.fastDirect1080 !== false && isSimpleSingleVideoTimeline(plan) && !benefitsFromGpuPrepass) return false;
  return Boolean(layers.length || plan.segments.length > 1 || benefitsFromGpuPrepass);
}

function buildStagedRenderPlan(plan, baseOutputPath) {
  if (!shouldUseStagedPipeline(plan)) return plan;
  const width = Number(plan.config.width || plan.config.canvas?.width || 1920);
  const height = Number(plan.config.height || plan.config.canvas?.height || 1080);
  const fps = Number(plan.config.fps || plan.config.canvas?.fps || 24);
  const visualOutputPath = baseOutputPath.replace(/\.mp4$/i, '-visual.mp4');
  const backgroundAcceleration = plan.config?.stagedBackgroundCuda === false
    ? plan.acceleration
    : {
        mode: plan.config?.cudaAvailableForStaging ? 'CUDA' : plan.acceleration.mode,
        gpuIndex: plan.acceleration?.gpuIndex || 0,
        label: plan.config?.cudaAvailableForStaging ? 'CUDA background prepass + NVENC' : plan.acceleration.label
      };
  const baseArgs = buildBackgroundArguments({
    segments: plan.segments,
    outputPath: baseOutputPath,
    durationMs: plan.durationMs,
    config: plan.config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: plan.encoder,
    acceleration: backgroundAcceleration
  });
  const backgroundStage = shouldUseImageSequenceBackground(plan.segments, plan.config)
    ? buildImageSequenceBackgroundStage({
        segments: plan.segments,
        outputPath: baseOutputPath,
        durationMs: plan.durationMs,
        config: plan.config,
        videoBitrateKbps: plan.videoBitrateKbps,
        encoder: plan.encoder,
        acceleration: backgroundAcceleration
      })
    : shouldChunkBackgroundPrepass(plan.segments, baseArgs, plan.config)
      ? buildChunkedBackgroundStage({
        segments: plan.segments,
        outputPath: baseOutputPath,
        durationMs: plan.durationMs,
        config: plan.config,
        videoBitrateKbps: plan.videoBitrateKbps,
        encoder: plan.encoder,
        acceleration: backgroundAcceleration
      })
      : { args: baseArgs, chunks: [] };
  const baseSegment = {
    mediaType: 'VIDEO',
    filePath: baseOutputPath,
    trimStartMs: 0,
    durationMs: plan.durationMs,
    sourceWidth: width,
    sourceHeight: height,
    sourceFps: fps,
    preRenderedBase: true
  };
  const visualArgs = buildRenderArguments({
    segments: [baseSegment],
    voicePath: null,
    srtPath: plan.srtPath,
    outputPath: visualOutputPath,
    durationMs: plan.durationMs,
    config: plan.config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: plan.encoder,
    acceleration: plan.acceleration
  });
  const visualSegment = {
    mediaType: 'VIDEO',
    filePath: visualOutputPath,
    trimStartMs: 0,
    durationMs: plan.durationMs,
    sourceWidth: width,
    sourceHeight: height,
    sourceFps: fps,
    preRenderedComposite: true
  };
  const finalArgs = buildVideoCopyAudioMuxArguments({
    videoPath: visualSegment.filePath,
    voicePath: plan.voicePath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config: plan.config
  });
  return {
    ...plan,
    staged: true,
    stagedBaseOutputPath: baseOutputPath,
    stagedVisualOutputPath: visualOutputPath,
    stagedBackgroundAcceleration: backgroundAcceleration,
    stages: {
      background: {
        name: 'BACKGROUND_PREPASS',
        outputPath: baseOutputPath,
        args: backgroundStage.args,
        chunks: backgroundStage.chunks,
        clips: backgroundStage.clips || [],
        listPath: backgroundStage.listPath || null,
        chunked: (backgroundStage.chunks || []).length > 0,
        imageSequence: backgroundStage.imageSequence === true,
        acceleration: backgroundAcceleration
      },
      visual: {
        name: 'VISUAL_LAYER_SUBTITLE_PREPASS',
        outputPath: visualOutputPath,
        args: visualArgs,
        acceleration: plan.acceleration
      },
      final: {
        name: 'FINAL_AUDIO_MUX_COPY_VIDEO',
        outputPath: plan.tempOutputPath,
        args: finalArgs,
        acceleration: plan.acceleration
      }
    },
    args: finalArgs,
    gpuAcceleration: `${plan.gpuAcceleration} · staged background prepass`
  };
}

function buildRenderPlan({ job, segments, config, system, outputPath, tempOutputPath, logPath }) {
  const durationMs = job.voiceDurationMs || job.voice_duration_ms;
  const requestedGpu = Number(config.gpuIndex);
  const automaticCodec = !config.codec || config.codec === 'auto';
  const fullGpuRequested = isFullGpuMode(config);
  const autoCompatibility = automaticCodec && isPascalGtx10(system) && !fullGpuRequested;
  const pascalGtx10 = isPascalGtx10(system);
  const effectiveConfig = {
    ...config,
    gpuIndex: requestedGpu >= 0 ? requestedGpu : Math.max(0, Number(system.selectedGpuIndex || 0)),
    accelerationMode: config.accelerationMode || 'AUTO_STABLE',
    nvencCompatibilityMode: Boolean(config.nvencCompatibilityMode || autoCompatibility),
    nvencPreset: fullGpuRequested ? (config.fullGpuNvencPreset || 'p1') : autoCompatibility ? 'p2' : config.nvencPreset,
    performanceProfile: fullGpuRequested ? 'MAX_SPEED' : config.performanceProfile,
    cudaAvailableForStaging: Boolean(system.cudaAvailable && system.scaleCuda && config.stagedBackgroundCuda !== false && !pascalGtx10),
    stagedBackgroundCuda: config.stagedBackgroundCuda ?? !pascalGtx10,
    fastDirect1080: config.fastDirect1080 !== false
  };
  const encoder = chooseEncoder(system, effectiveConfig.codec || effectiveConfig.videoCodec || 'auto');
  if (fullGpuRequested) {
    validateFullGpuPipeline({
      segments,
      srtPath: job.srt_path || job.srtPath,
      config: effectiveConfig,
      system,
      encoder
    });
  }
  let acceleration = chooseAcceleration(system, effectiveConfig, encoder);
  if (shouldUseAutoCudaMainPass({
    system,
    config: effectiveConfig,
    encoder,
    segments,
    srtPath: job.srt_path || job.srtPath
  })) {
    acceleration = {
      mode: 'CUDA',
      gpuIndex: acceleration.gpuIndex,
      label: `NVIDIA CUDA decode/scale + NVENC · GPU ${acceleration.gpuIndex}`
    };
  }
  const calculatedVideoBitrateKbps = calculateVideoBitrateKbps({
    durationMs,
    gbPerHour: config.gbPerHour || 2,
    audioKbps: config.audioBitrateKbps || 256,
    safetyPercent: config.safetyPercent || 95
  });
  const videoBitrateKbps = fullGpuRequested
    ? Math.max(calculatedVideoBitrateKbps, Number(config.fullGpuMinBitrateKbps || 4500))
    : calculatedVideoBitrateKbps;
  const configuredTargetSizeBytes = targetSizeBytes({
    durationMs,
    gbPerHour: config.gbPerHour || 2
  });
  const fullGpuEstimatedSizeBytes = Math.ceil(
    ((videoBitrateKbps + Number(config.audioBitrateKbps || 256) + 64) * 1000 / 8) *
    (durationMs / 1000) / ((Number(config.safetyPercent || 95)) / 100)
  );
  const plan = {
    jobId: job.id,
    durationMs,
    voicePath: job.voice_path || job.voicePath,
    srtPath: job.srt_path || job.srtPath,
    outputPath,
    tempOutputPath,
    logPath,
    segments,
    encoder,
    acceleration,
    performance: renderPerformanceSettings(effectiveConfig, segments, normalizeLayers(effectiveConfig), job.srt_path || job.srtPath),
    gpuAcceleration: acceleration.label,
    videoBitrateKbps,
    targetSizeBytes: fullGpuRequested
      ? Math.max(configuredTargetSizeBytes, fullGpuEstimatedSizeBytes)
      : configuredTargetSizeBytes,
    config: effectiveConfig
  };
  const argumentBuilder = fullGpuRequested ? buildFullGpuRenderArguments : buildRenderArguments;
  plan.args = argumentBuilder({
    segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: tempOutputPath,
    durationMs,
    config: effectiveConfig,
    videoBitrateKbps,
    encoder,
    acceleration
  });
  return plan;
}

function buildDisclaimerConcatArguments({
  disclaimerPath,
  inputPath,
  outputPath,
  disclaimerDurationMs,
  disclaimerHasAudio = true,
  width = 1920,
  height = 1080,
  fps = 24,
  encoder = 'libx264',
  acceleration = { mode: 'CPU', gpuIndex: 0 },
  videoBitrateKbps = 2000,
  config = {}
}) {
  const introDuration = sec(Math.max(1, Number(disclaimerDurationMs || 0)));
  const performance = renderPerformanceSettings(config, [], [], null);
  const args = [
    '-y',
    '-hide_banner',
    '-filter_complex_threads',
    String(performance.filterComplexThreads),
    '-i',
    disclaimerPath,
    '-i',
    inputPath
  ];
  const disclaimerAudioIndex = disclaimerHasAudio ? 0 : 2;
  if (!disclaimerHasAudio) {
    args.push(
      '-f',
      'lavfi',
      '-t',
      introDuration,
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=48000'
    );
  }

  const fit = fitFilter(width, height);
  const filters = [
    `[0:v]trim=duration=${introDuration},setpts=PTS-STARTPTS,${fit},fps=${fps},setsar=1,format=yuv420p[vdisclaimer]`,
    `[1:v]setpts=PTS-STARTPTS,${fit},fps=${fps},setsar=1,format=yuv420p[vmain]`,
    `[${disclaimerAudioIndex}:a]atrim=duration=${introDuration},asetpts=PTS-STARTPTS,` +
      'aresample=sample_rate=48000:async=1:first_pts=0,' +
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[adisclaimer]',
    '[1:a]asetpts=PTS-STARTPTS,aresample=sample_rate=48000:async=1:first_pts=0,' +
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[amain]',
    '[vdisclaimer][adisclaimer][vmain][amain]concat=n=2:v=1:a=1[vout][aout]'
  ];
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-map_metadata',
    '-1'
  );
  pushEncoderArgs(args, {
    encoder,
    gpuIndex: Math.max(0, Number(acceleration.gpuIndex || 0)),
    performance,
    videoBitrateKbps,
    config
  });
  args.push(
    '-pix_fmt',
    'yuv420p',
    '-fps_mode',
    'cfr',
    '-r',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    `${config.audioBitrateKbps || 256}k`,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-avoid_negative_ts',
    'make_zero',
    '-progress',
    'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function buildPrefixConcatArguments({
  prefixes = [],
  inputPath,
  outputPath,
  width = 1920,
  height = 1080,
  fps = 30,
  encoder = 'libx264',
  acceleration = { mode: 'CPU', gpuIndex: 0 },
  videoBitrateKbps = 2000,
  config = {}
}) {
  const validPrefixes = prefixes
    .filter((prefix) => prefix?.filePath && Number(prefix.durationMs) > 0)
    .map((prefix) => ({
      filePath: prefix.filePath,
      durationMs: Math.max(1, Number(prefix.durationMs)),
      hasAudio: prefix.hasAudio !== false,
      noiseOverlayPath: prefix.noiseOverlayPath || ''
    }));
  if (!validPrefixes.length) throw new Error('Không có video mở đầu để ghép.');
  const transitionMode = String(config.jobIntroTransition || 'NONE').toUpperCase();
  const requestedFadeMs = transitionMode === 'FADE' ? Math.max(0, Math.min(3000, Number(config.jobIntroTransitionMs || 0))) : 0;

  const performance = renderPerformanceSettings(config, [], [], null);
  const args = [
    '-y',
    '-hide_banner',
    '-filter_complex_threads',
    String(performance.filterComplexThreads)
  ];
  validPrefixes.forEach((prefix) => args.push('-i', prefix.filePath));
  const mainInputIndex = validPrefixes.length;
  args.push('-i', inputPath);

  let nextInputIndex = mainInputIndex + 1;
  for (const prefix of validPrefixes) {
    if (prefix.noiseOverlayPath) {
      prefix.noiseInputIndex = nextInputIndex;
      args.push('-stream_loop', '-1', '-i', prefix.noiseOverlayPath);
      nextInputIndex += 1;
    }
  }
  for (const prefix of validPrefixes) {
    if (!prefix.hasAudio) {
      prefix.audioInputIndex = nextInputIndex;
      args.push(
        '-f',
        'lavfi',
        '-t',
        sec(prefix.durationMs),
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=48000'
      );
      nextInputIndex += 1;
    } else {
      prefix.audioInputIndex = validPrefixes.indexOf(prefix);
    }
  }

  const fit = fitFilter(width, height);
  const filters = [];
  validPrefixes.forEach((prefix, index) => {
    const duration = sec(prefix.durationMs);
    const prefixBaseLabel = prefix.noiseOverlayPath ? `vprefixbase${index}` : `vprefix${index}`;
    filters.push(
      `[${index}:v]trim=duration=${duration},setpts=PTS-STARTPTS,${fit},fps=${fps},setsar=1,format=yuv420p[${prefixBaseLabel}]`,
      `[${prefix.audioInputIndex}:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,` +
        'aresample=sample_rate=48000:async=1:first_pts=0,' +
        'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aprefix' + index + ']'
    );
    if (prefix.noiseOverlayPath) {
      filters.push(
        `[${prefix.noiseInputIndex}:v]trim=duration=${duration},setpts=PTS-STARTPTS,fps=${fps},` +
          `format=rgba,scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1[noiseprefix${index}]`,
        `[${prefixBaseLabel}][noiseprefix${index}]overlay=x=0:y=0:eof_action=repeat:shortest=0,format=yuv420p[vprefix${index}]`
      );
    }
  });
  filters.push(
    `[${mainInputIndex}:v]setpts=PTS-STARTPTS,${fit},fps=${fps},setsar=1,format=yuv420p[vmain]`,
    `[${mainInputIndex}:a]asetpts=PTS-STARTPTS,aresample=sample_rate=48000:async=1:first_pts=0,` +
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[amain]'
  );
  const segmentLabels = [
    ...validPrefixes.map((_prefix, index) => ({ video: `vprefix${index}`, audio: `aprefix${index}`, durationMs: validPrefixes[index].durationMs })),
    { video: 'vmain', audio: 'amain', durationMs: Number.MAX_SAFE_INTEGER }
  ];
  const shortest = Math.min(...segmentLabels.map((segment) => segment.durationMs).filter((duration) => Number.isFinite(duration) && duration > 0));
  const fadeMs = Math.max(0, Math.min(requestedFadeMs, shortest - 100));
  if (fadeMs >= 50 && segmentLabels.length > 1) {
    const fadeSec = sec(fadeMs);
    let previousVideo = segmentLabels[0].video;
    let previousAudio = segmentLabels[0].audio;
    let offsetMs = segmentLabels[0].durationMs - fadeMs;
    for (let index = 1; index < segmentLabels.length; index += 1) {
      const current = segmentLabels[index];
      const outVideo = index === segmentLabels.length - 1 ? 'vout' : `vxfade${index}`;
      const outAudio = index === segmentLabels.length - 1 ? 'aout' : `axfade${index}`;
      filters.push(
        `[${previousVideo}][${current.video}]xfade=transition=fade:duration=${fadeSec}:offset=${sec(offsetMs)}[${outVideo}]`,
        `[${previousAudio}][${current.audio}]acrossfade=d=${fadeSec}:c1=tri:c2=tri[${outAudio}]`
      );
      previousVideo = outVideo;
      previousAudio = outAudio;
      if (Number.isFinite(current.durationMs)) offsetMs += current.durationMs - fadeMs;
    }
  } else {
    const concatInputs = [
      ...validPrefixes.map((_prefix, index) => `[vprefix${index}][aprefix${index}]`),
      '[vmain][amain]'
    ];
    filters.push(`${concatInputs.join('')}concat=n=${validPrefixes.length + 1}:v=1:a=1[vout][aout]`);
  }
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-map_metadata',
    '-1'
  );
  pushEncoderArgs(args, {
    encoder,
    gpuIndex: Math.max(0, Number(acceleration.gpuIndex || 0)),
    performance,
    videoBitrateKbps,
    config
  });
  args.push(
    '-pix_fmt',
    'yuv420p',
    '-fps_mode',
    'cfr',
    '-r',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    `${config.audioBitrateKbps || 256}k`,
    '-ar',
    '48000',
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    '-avoid_negative_ts',
    'make_zero',
    '-progress',
    'pipe:1',
    '-nostats',
    outputPath
  );
  return args;
}

function rebuildWithBitrate(plan, bitrateKbps) {
  const updated = { ...plan, videoBitrateKbps: bitrateKbps };
  const argumentBuilder = isFullGpuMode(plan.config) ? buildFullGpuRenderArguments : buildRenderArguments;
  updated.args = argumentBuilder({
    segments: plan.segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config: plan.config,
    videoBitrateKbps: bitrateKbps,
    encoder: plan.encoder,
    acceleration: plan.acceleration
  });
  if (plan.stagedBaseOutputPath) return buildStagedRenderPlan(updated, plan.stagedBaseOutputPath);
  return updated;
}

function rebuildWithoutCuda(plan) {
  const acceleration = {
    mode: plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc' ? 'NVENC_ONLY' : 'CPU',
    gpuIndex: plan.acceleration?.gpuIndex || 0,
    label: plan.encoder === 'libx264' ? 'CPU' : 'NVIDIA NVENC (CUDA decode fallback)'
  };
  const updated = {
    ...plan,
    acceleration,
    performance: renderPerformanceSettings(plan.config, plan.segments, normalizeLayers(plan.config), plan.srtPath),
    gpuAcceleration: acceleration.label,
    cudaFallbackApplied: true
  };
  updated.args = buildRenderArguments({
    segments: plan.segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config: plan.config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: plan.encoder,
    acceleration
  });
  return updated;
}

function rebuildConservativeNvenc(plan) {
  if (!(plan.encoder === 'h264_nvenc' || plan.encoder === 'hevc_nvenc')) return plan;
  const config = {
    ...plan.config,
    nvencCompatibilityMode: true,
    nvencPreset: 'p2',
    performanceProfile: 'MAX_SPEED',
    accelerationMode: 'AUTO_STABLE'
  };
  const acceleration = {
    mode: 'NVENC_ONLY',
    gpuIndex: plan.acceleration?.gpuIndex || 0,
    label: `NVIDIA NVENC tương thích · GPU ${plan.acceleration?.gpuIndex || 0}`
  };
  const updated = {
    ...plan,
    config,
    acceleration,
    performance: renderPerformanceSettings(config, plan.segments, normalizeLayers(config), plan.srtPath),
    gpuAcceleration: acceleration.label,
    nvencCompatibilityMode: true
  };
  updated.args = buildRenderArguments({
    segments: plan.segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: plan.encoder,
    acceleration
  });
  return updated;
}

function rebuildWithGpu(plan, gpuIndex) {
  const strictFullGpu = isFullGpuMode(plan.config);
  const config = {
    ...plan.config,
    gpuIndex: Number(gpuIndex),
    accelerationMode: strictFullGpu ? FULL_GPU_MODE : 'AUTO_STABLE'
  };
  const acceleration = strictFullGpu
    ? {
        mode: 'CUDA_ZERO_COPY',
        gpuIndex: Number(gpuIndex),
        label: `NVIDIA Full GPU Zero-Copy nghiêm ngặt · GPU ${Number(gpuIndex)}`
      }
    : {
        mode: 'NVENC_ONLY',
        gpuIndex: Number(gpuIndex),
        label: `NVIDIA NVENC ổn định · GPU ${Number(gpuIndex)} (auto fallback)`
      };
  const updated = { ...plan, config, acceleration, gpuAcceleration: acceleration.label };
  const argumentBuilder = strictFullGpu ? buildFullGpuRenderArguments : buildRenderArguments;
  updated.args = argumentBuilder({
    segments: plan.segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: plan.encoder,
    acceleration
  });
  return updated;
}

function rebuildWithCpu(plan) {
  const config = {
    ...plan.config,
    codec: 'libx264',
    accelerationMode: 'CPU',
    cpuPreset: plan.config.cpuPreset || 'veryfast'
  };
  const acceleration = { mode: 'CPU', gpuIndex: 0, label: 'CPU fallback (libx264)' };
  const updated = {
    ...plan,
    encoder: 'libx264',
    config,
    acceleration,
    performance: renderPerformanceSettings(config, plan.segments, normalizeLayers(config), plan.srtPath),
    gpuAcceleration: acceleration.label,
    cpuFallbackApplied: true
  };
  updated.args = buildRenderArguments({
    segments: plan.segments,
    voicePath: plan.voicePath,
    srtPath: plan.srtPath,
    outputPath: plan.tempOutputPath,
    durationMs: plan.durationMs,
    config,
    videoBitrateKbps: plan.videoBitrateKbps,
    encoder: 'libx264',
    acceleration
  });
  return updated;
}

function isNvencInitError(error) {
  const text = `${error?.message || ''}
${error?.stderr || ''}`.toLowerCase();
  const rawCode = Number(error?.code);
  const silentNvencCrash = (rawCode === -1 || rawCode === 4294967295) &&
    /(h264_nvenc|hevc_nvenc|nvenc)/.test(text);
  const direct = /(openencodesession|initializeencoder|no nvenc capable|no capable devices|cannot load nvcuda|failed to open encode session|driver does not support.*nvenc|required nvenc api|resource temporarily unavailable|device busy|operation not permitted|nv_enc_err|failed creating cuda context)/.test(text);
  const encoderOpenFailure = /(h264_nvenc|hevc_nvenc)/.test(text) &&
    /(error while opening encoder|failed to initialize encoder|encoder initialization failed|cannot init cuda|out of memory|no device|initialization returned error)/.test(text);
  return silentNvencCrash || direct || encoderOpenFailure;
}

function isCudaPipelineError(error) {
  const text = `${error?.message || ''}\n${error?.stderr || ''}`.toLowerCase();
  return /(cuda|cuvid|nvdec|hwaccel|hwdownload|scale_cuda|hardware device|device setup failed|no device)/.test(text);
}

function isFfmpegProcessCrash(error) {
  const rawCode = Number(error?.code);
  return rawCode === 3221225477 || rawCode === -1073741819;
}

module.exports = {
  buildRenderArguments,
  buildFullGpuRenderArguments,
  buildBackgroundArguments,
  buildVideoCopyAudioMuxArguments,
  buildLayerCacheArguments,
  buildRenderPlan,
  buildDisclaimerConcatArguments,
  buildPrefixConcatArguments,
  buildStagedRenderPlan,
  rebuildWithBitrate,
  rebuildWithoutCuda,
  rebuildConservativeNvenc,
  rebuildWithGpu,
  rebuildWithCpu,
  isCudaPipelineError,
  isFfmpegProcessCrash,
  isNvencInitError,
  chooseEncoder,
  chooseAcceleration,
  validateFullGpuPipeline,
  isFullGpuMode,
  subtitleStyle,
  normalizeTransitionType,
  performanceSettings,
  effectiveFilterComplexThreads,
  renderPerformanceSettings,
  segmentFitFilter,
  normalizeLayers,
  layerRenderTier,
  isPascalGtx10
};
