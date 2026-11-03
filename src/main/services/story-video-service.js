'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { listFiles } = require('./media-scanner');
const {
  IMAGE_EXTENSIONS,
  STANDARD_CANVAS_WIDTH,
  STANDARD_CANVAS_HEIGHT,
  GENTLE_TRANSITIONS,
  DEFAULT_TEMPLATE
} = require('../../shared/constants');
const {
  buildTransitionSequence,
  mulberry32,
  seededShuffle,
  calculateVideoBitrateKbps,
  sanitizeFileName,
  clamp,
  deepMerge
} = require('../../shared/core');
const {
  buildRenderPlan,
  buildStagedRenderPlan,
  chooseEncoder,
  chooseAcceleration,
  renderPerformanceSettings
} = require('./render-planner');
const { ensureDirectory, uniqueDestination } = require('./path-utils');
const { isKaraokeBoxEffect, buildCapCutKaraokeBoxAss } = require('./karaoke-subtitle');
const { subtitlePreviewBox } = require('../../shared/subtitle-preview');

const MOTION_VARIATIONS = [
  { id: 'zoom-in', scaleStart: 1.0, scaleEnd: 1.08, rotate: 0.5, flip: false, panX: 0, panY: 0 },
  { id: 'zoom-out', scaleStart: 1.08, scaleEnd: 1.01, rotate: -0.5, flip: false, panX: 0, panY: 0 },
  { id: 'pan-left', scaleStart: 1.10, scaleEnd: 1.10, rotate: 0.3, flip: false, panX: -0.04, panY: 0 },
  { id: 'pan-right', scaleStart: 1.10, scaleEnd: 1.10, rotate: -0.3, flip: false, panX: 0.04, panY: 0 },
  { id: 'pan-up', scaleStart: 1.08, scaleEnd: 1.08, rotate: 0.2, flip: false, panX: 0, panY: -0.03 },
  { id: 'pan-down', scaleStart: 1.08, scaleEnd: 1.08, rotate: -0.2, flip: false, panX: 0, panY: 0.03 }
];

function srtTimestampToMs(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return 0;
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) +
    Number(match[4].padEnd(3, '0'));
}

function parseSrtCues(content) {
  return String(content || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const timingIndex = lines.findIndex((line) => /-->/.test(line));
      if (timingIndex < 0) return null;
      const [start, end] = lines[timingIndex].split(/\s*-->\s*/);
      const text = lines.slice(timingIndex + 1).join('\n').trim();
      if (!text) return null;
      return {
        startMs: srtTimestampToMs(start),
        endMs: srtTimestampToMs(end),
        text
      };
    })
    .filter((cue) => cue && cue.endMs > cue.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

function planStorySegments({
  mode = 'fixed',
  assets = [],
  voiceDurationMs = 0,
  srtPath = null,
  srtCues = null,
  imageSeconds = 5,
  transitionItems = GENTLE_TRANSITIONS,
  minTransitionMs = 500,
  maxTransitionMs = 800,
  seed = 12345
}) {
  if (!assets.length) {
    throw Object.assign(new Error('Thư mục không có file ảnh hợp lệ (PNG, JPG, WEBP, BMP).'), { code: 'NO_IMAGES' });
  }
  if (!Number.isFinite(voiceDurationMs) || voiceDurationMs <= 0) {
    throw Object.assign(new Error('Thời lượng file voice không hợp lệ.'), { code: 'INVALID_VOICE_DURATION' });
  }

  const random = mulberry32(seed);
  const segments = [];
  const transList = transitionItems?.length ? transitionItems : GENTLE_TRANSITIONS;

  // ----------------------------------------------------
  // Chức năng 1: Cố định thời gian mỗi ảnh (Fixed duration)
  // Nếu hết ảnh thì lặp lại kèm ZOOM hoặc LẬT LẠI
  // ----------------------------------------------------
  if (mode === 'fixed') {
    const durationMs = Math.max(500, Math.round(Number(imageSeconds || 5) * 1000));
    const totalSlots = Math.max(1, Math.ceil(voiceDurationMs / durationMs));
    const transitions = buildTransitionSequence({
      count: Math.max(0, totalSlots - 1),
      items: transList,
      seed,
      minDurationMs: minTransitionMs,
      maxDurationMs: maxTransitionMs
    });

    for (let i = 0; i < totalSlots; i += 1) {
      const startMs = i * durationMs;
      const clipDuration = Math.min(durationMs, Math.max(100, voiceDurationMs - startMs));
      const asset = assets[i % assets.length];
      const cycle = Math.floor(i / assets.length);

      let transform;
      if (cycle === 0) {
        // Lượt 1: Ảnh gốc, chuyển động nhẹ
        const motion = MOTION_VARIATIONS[i % MOTION_VARIATIONS.length];
        transform = { ...motion, flip: false };
      } else if (cycle % 4 === 1) {
        // Lặp lần 1: LẬT LẠI + ZOOM nhẹ
        transform = {
          flip: true,
          scaleStart: 1.10,
          scaleEnd: 1.16,
          rotate: 0.5,
          panX: 0.03,
          panY: 0
        };
      } else if (cycle % 4 === 2) {
        // Lặp lần 2: ZOOM LỚN HƠN (không lật)
        transform = {
          flip: false,
          scaleStart: 1.20,
          scaleEnd: 1.26,
          rotate: -0.5,
          panX: -0.04,
          panY: 0.02
        };
      } else if (cycle % 4 === 3) {
        // Lặp lần 3: LẬT LẠI + ZOOM OUT
        transform = {
          flip: true,
          scaleStart: 1.25,
          scaleEnd: 1.15,
          rotate: 0.6,
          panX: 0,
          panY: -0.03
        };
      } else {
        // Lặp các lần tiếp theo: Luân phiên lật và zoom ngẫu nhiên
        transform = {
          flip: cycle % 2 === 1,
          scaleStart: 1.15 + (cycle % 3) * 0.05,
          scaleEnd: 1.20 + (cycle % 3) * 0.05,
          rotate: (random() - 0.5) * 1.5,
          panX: (random() - 0.5) * 0.08,
          panY: (random() - 0.5) * 0.06
        };
      }

      const trans = i === 0 ? null : (transitions[i - 1] || { type: 'fade', durationMs: 600 });
      const safeTransDur = trans ? Math.min(trans.durationMs, Math.max(0, clipDuration - 100)) : 0;

      segments.push({
        assetId: null,
        filePath: asset,
        fileName: path.basename(asset),
        mediaType: 'IMAGE',
        durationMs: clipDuration,
        trimStartMs: 0,
        startMs,
        transitionIn: trans && safeTransDur > 0 ? { ...trans, durationMs: safeTransDur } : null,
        transform: { ...transform, cycle }
      });
    }
  }

  // ----------------------------------------------------
  // Chức năng 2: Giàn đều ảnh hết video (Distribute evenly)
  // Chia đều thời gian cho phù hợp với tổng thời lượng voice
  // ----------------------------------------------------
  else if (mode === 'distribute') {
    const count = assets.length;
    const durationPerImage = voiceDurationMs / count;
    const transitions = buildTransitionSequence({
      count: Math.max(0, count - 1),
      items: transList,
      seed,
      minDurationMs: Math.min(minTransitionMs, Math.round(durationPerImage * 0.4)),
      maxDurationMs: Math.min(maxTransitionMs, Math.round(durationPerImage * 0.6))
    });

    for (let i = 0; i < count; i += 1) {
      const startMs = Math.round(i * durationPerImage);
      const endMs = (i === count - 1) ? voiceDurationMs : Math.round((i + 1) * durationPerImage);
      const clipDuration = Math.max(100, endMs - startMs);
      const asset = assets[i];
      const motion = MOTION_VARIATIONS[i % MOTION_VARIATIONS.length];

      const trans = i === 0 ? null : (transitions[i - 1] || { type: 'dissolve', durationMs: 600 });
      const safeTransDur = trans ? Math.min(trans.durationMs, Math.max(0, clipDuration - 100)) : 0;

      segments.push({
        assetId: null,
        filePath: asset,
        fileName: path.basename(asset),
        mediaType: 'IMAGE',
        durationMs: clipDuration,
        trimStartMs: 0,
        startMs,
        transitionIn: trans && safeTransDur > 0 ? { ...trans, durationMs: safeTransDur } : null,
        transform: { ...motion, cycle: 0 }
      });
    }
  }

  // ----------------------------------------------------
  // Chức năng 3: Cắt ảnh theo SRT (Cut by SRT cues)
  // Mỗi câu subtitle SRT tương ứng với 1 ảnh
  // Nếu hết ảnh thì lặp lại kèm ZOOM hoặc LẬT LẠI
  // ----------------------------------------------------
  else if (mode === 'srt') {
    let cues = Array.isArray(srtCues) ? srtCues : [];
    if (!cues.length && srtPath && fs.existsSync(srtPath)) {
      try {
        cues = parseSrtCues(fs.readFileSync(srtPath, 'utf8'));
      } catch {}
    }

    // Nếu không có cue nào trong SRT, fallback về fixed 5s
    if (!cues.length) {
      return planStorySegments({
        mode: 'fixed',
        assets,
        voiceDurationMs,
        imageSeconds,
        transitionItems,
        minTransitionMs,
        maxTransitionMs,
        seed
      });
    }

    const transitions = buildTransitionSequence({
      count: Math.max(0, cues.length - 1),
      items: transList,
      seed,
      minDurationMs: 400,
      maxDurationMs: 700
    });

    for (let i = 0; i < cues.length; i += 1) {
      const cue = cues[i];
      const nextCue = cues[i + 1];
      const startMs = (i === 0) ? 0 : cue.startMs;
      const rawEndMs = nextCue ? nextCue.startMs : voiceDurationMs;
      const endMs = (i === cues.length - 1) ? voiceDurationMs : Math.max(startMs + 500, rawEndMs);
      const clipDuration = Math.max(300, endMs - startMs);

      const asset = assets[i % assets.length];
      const cycle = Math.floor(i / assets.length);

      let transform;
      if (cycle === 0) {
        const motion = MOTION_VARIATIONS[i % MOTION_VARIATIONS.length];
        transform = { ...motion, flip: false };
      } else if (cycle % 3 === 1) {
        // Lặp lần 1: LẬT LẠI + ZOOM
        transform = {
          flip: true,
          scaleStart: 1.12,
          scaleEnd: 1.18,
          rotate: 0.4,
          panX: 0.02,
          panY: 0
        };
      } else if (cycle % 3 === 2) {
        // Lặp lần 2: ZOOM LỚN HƠN
        transform = {
          flip: false,
          scaleStart: 1.20,
          scaleEnd: 1.25,
          rotate: -0.4,
          panX: -0.03,
          panY: 0.02
        };
      } else {
        transform = {
          flip: cycle % 2 === 1,
          scaleStart: 1.15,
          scaleEnd: 1.22,
          rotate: 0.5,
          panX: 0,
          panY: -0.02
        };
      }

      const trans = i === 0 ? null : (transitions[i - 1] || { type: 'fade', durationMs: 500 });
      const safeTransDur = trans ? Math.min(trans.durationMs, Math.max(0, clipDuration - 150)) : 0;

      segments.push({
        assetId: null,
        filePath: asset,
        fileName: path.basename(asset),
        mediaType: 'IMAGE',
        durationMs: clipDuration,
        trimStartMs: 0,
        startMs,
        transitionIn: trans && safeTransDur > 100 ? { ...trans, durationMs: safeTransDur } : null,
        transform: { ...transform, cycle }
      });
    }
  }

  return {
    segments,
    timelineDurationMs: voiceDurationMs,
    requiredMs: voiceDurationMs
  };
}

class StoryVideoService {
  constructor({ paths, ffmpegService, database, subtitleOverlayService, whisperSrtService }) {
    this.paths = paths;
    this.ffmpeg = ffmpegService;
    this.database = database;
    this.subtitleOverlay = subtitleOverlayService;
    this.whisper = whisperSrtService;
    this.activeController = null;
  }

  scanFolderImages(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) return [];
    try {
      return listFiles(folderPath, IMAGE_EXTENSIONS).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
    } catch {
      return [];
    }
  }

  async scanItem(item) {
    const result = {
      id: item.id || crypto.randomUUID(),
      voicePath: item.voicePath || '',
      srtPath: item.srtPath || '',
      imageFolder: item.imageFolder || '',
      voiceDurationMs: 0,
      imageCount: 0,
      srtCueCount: 0,
      valid: false,
      error: null
    };

    if (!result.voicePath || !fs.existsSync(result.voicePath)) {
      result.error = 'Chưa chọn hoặc file voice không tồn tại.';
      return result;
    }

    try {
      const probe = await this.ffmpeg.probe(result.voicePath);
      result.voiceDurationMs = probe.durationMs || 0;
    } catch (err) {
      result.error = `Lỗi đọc file voice: ${err.message}`;
      return result;
    }

    // Quét folder ảnh
    const images = this.scanFolderImages(result.imageFolder);
    result.imageCount = images.length;
    if (!result.imageCount) {
      result.error = 'Thư mục ảnh trống hoặc không có file ảnh hợp lệ.';
      return result;
    }

    // Kiểm tra SRT (nếu có)
    if (result.srtPath && fs.existsSync(result.srtPath)) {
      try {
        const cues = parseSrtCues(fs.readFileSync(result.srtPath, 'utf8'));
        result.srtCueCount = cues.length;
      } catch {}
    } else {
      // Tự tìm SRT cùng tên voice nếu chưa chọn
      const baseSrt = path.join(path.dirname(result.voicePath), `${path.basename(result.voicePath, path.extname(result.voicePath))}.srt`);
      if (fs.existsSync(baseSrt)) {
        result.srtPath = baseSrt;
        try {
          const cues = parseSrtCues(fs.readFileSync(baseSrt, 'utf8'));
          result.srtCueCount = cues.length;
        } catch {}
      }
    }

    result.valid = true;
    return result;
  }

  async scanAll(items = []) {
    const results = [];
    for (const item of items) {
      results.push(await this.scanItem(item));
    }
    return results;
  }

  async scanDirectory(dirPath) {
    if (!dirPath || !fs.existsSync(dirPath)) return [];
    const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);
    const audioFiles = listFiles(dirPath, AUDIO_EXTS).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    const items = [];
    for (const voicePath of audioFiles) {
      const dir = path.dirname(voicePath);
      const baseName = path.basename(voicePath, path.extname(voicePath));
      const srtCandidate = path.join(dir, `${baseName}.srt`);
      const srtPath = fs.existsSync(srtCandidate) ? srtCandidate : '';
      let imageFolder = '';
      const candidateFolders = [
        path.join(dir, baseName),
        path.join(dir, `${baseName}_images`),
        path.join(dir, `${baseName}_img`),
        path.join(dir, 'images'),
        dir
      ];
      for (const cand of candidateFolders) {
        if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
          const imgs = this.scanFolderImages(cand);
          if (imgs.length > 0) {
            imageFolder = cand;
            break;
          }
        }
      }
      items.push({
        id: crypto.randomUUID(),
        voicePath,
        srtPath,
        imageFolder
      });
    }
    return this.scanAll(items);
  }

  async renderJob({
    item,
    config,
    outputFolder,
    system,
    callbacks,
    signal
  }) {
    const voiceName = path.basename(item.voicePath);
    callbacks?.onLog?.(`[${voiceName}] Bắt đầu xử lý...`);

    const images = this.scanFolderImages(item.imageFolder);
    if (!images.length) {
      throw new Error(`Thư mục ảnh không có file hợp lệ: ${item.imageFolder}`);
    }

    // Probe voice
    const probe = await this.ffmpeg.probe(item.voicePath);
    const durationMs = probe.durationMs;
    if (!durationMs) throw new Error('File voice không có thời lượng.');

    // SRT file
    let srtPath = item.srtPath;
    if ((!srtPath || !fs.existsSync(srtPath)) && config.autoGenerateSrt && this.whisper) {
      callbacks?.onLog?.(`[${voiceName}] Đang tự sinh SRT bằng Whisper...`);
      const targetSrt = path.join(outputFolder, `${path.basename(item.voicePath, path.extname(item.voicePath))}.srt`);
      try {
        await this.whisper.generateSrt({
          audioPath: item.voicePath,
          outputPath: targetSrt,
          language: config.whisperLanguage || 'auto',
          signal
        });
        if (fs.existsSync(targetSrt)) srtPath = targetSrt;
      } catch (e) {
        callbacks?.onLog?.(`[${voiceName}] Cảnh báo tự sinh SRT thất bại: ${e.message}`);
      }
    }

    // Lập media plan phân cảnh ảnh theo 1 trong 3 chế độ
    const seed = Math.floor(Math.random() * 2_147_483_647);
    const mediaPlan = planStorySegments({
      mode: config.mode || 'fixed',
      assets: images,
      voiceDurationMs: durationMs,
      srtPath,
      imageSeconds: Number(config.imageSeconds || 5),
      transitionItems: config.transitionItems || GENTLE_TRANSITIONS,
      minTransitionMs: Number(config.minTransitionMs || 500),
      maxTransitionMs: Number(config.maxTransitionMs || 800),
      seed
    });

    callbacks?.onLog?.(
      `[${voiceName}] Đã lập kế hoạch: ${mediaPlan.segments.length} phân cảnh ảnh (Chế độ: ${config.mode}).`
    );

    // Chuẩn bị đường dẫn output
    const safeBase = sanitizeFileName(path.basename(item.voicePath, path.extname(item.voicePath)));
    const outputPath = uniqueDestination(outputFolder, `${safeBase}.mp4`);
    const tempOutputPath = path.join(this.paths.temp, `story-${crypto.randomUUID()}.mp4`);
    const logPath = path.join(this.paths.logs, `story-${safeBase}.log`);

    // Render Config
    const template = config.templateId && this.database?.getTemplate ? this.database.getTemplate(config.templateId) : null;
    const templateConfig = template?.config || DEFAULT_TEMPLATE;
    const renderConfig = deepMerge(templateConfig, {
      ...config,
      width: Number(config.width || 1920),
      height: Number(config.height || 1080),
      fps: Number(config.fps || 30),
      performanceProfile: config.performanceProfile || 'MAX_SPEED'
    });

    const jobId = crypto.randomUUID();
    let effectiveSrtPath = srtPath;
    let tempAssPath = null;
    if (srtPath && fs.existsSync(srtPath) && isKaraokeBoxEffect(renderConfig?.subtitle)) {
      tempAssPath = path.join(this.paths.temp, `${jobId}-render.ass`);
      const assContent = buildCapCutKaraokeBoxAss(
        fs.readFileSync(srtPath, 'utf8'),
        renderConfig,
        subtitlePreviewBox(renderConfig)
      );
      fs.writeFileSync(tempAssPath, assContent, 'utf8');
      effectiveSrtPath = tempAssPath;
      callbacks?.onLog?.(`[${voiceName}] 🎤 Dùng Hiệu ứng Sub: Karaoke hộp (Màu hộp: ${renderConfig.subtitle?.karaokeBoxColor || '#7C00FF'})`);
    }

    const job = {
      id: jobId,
      voicePath: item.voicePath,
      voice_path: item.voicePath,
      voiceName,
      voice_name: voiceName,
      voiceDurationMs: durationMs,
      voice_duration_ms: durationMs,
      srtPath: effectiveSrtPath,
      srt_path: effectiveSrtPath
    };

    let plan = buildRenderPlan({
      job,
      segments: mediaPlan.segments,
      config: renderConfig,
      system,
      outputPath,
      tempOutputPath,
      logPath
    });

    plan = buildStagedRenderPlan(plan, path.join(this.paths.temp, `${job.id}-bg.mp4`));

    callbacks?.onLog?.(
      `[${voiceName}] Render: GPU ${plan.gpuAcceleration} · Encoder ${plan.encoder}`
    );

    // Chạy render
    try {
      if (plan.staged && plan.stages?.background) {
        const bg = plan.stages.background;
        if (bg.imageSequence && bg.clips?.length) {
          callbacks?.onLog?.(`[${voiceName}] Render ${bg.clips.length} clip ảnh nền ổn định...`);
          for (const clip of bg.clips) {
            if (signal?.aborted) throw new Error('Đã hủy render.');
            await this.ffmpeg.render(clip.args, {
              durationMs: clip.durationMs,
              gpuIndex: plan.acceleration?.gpuIndex ?? 0,
              signal,
              onProgress: (p) => callbacks?.onProgress?.({
                stage: 'RENDER_BG',
                voiceName,
                percent: ((clip.index - 1) / clip.total + (1 / clip.total) * (p.percent / 100)) * 50
              })
            });
          }
          const listLines = bg.clips.map((c) => `file '${c.outputPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);
          fs.writeFileSync(bg.listPath, `ffconcat version 1.0\n${listLines.join('\n')}\n`, 'utf8');
        } else if (bg.chunks?.length) {
          callbacks?.onLog?.(`[${voiceName}] Render ${bg.chunks.length} chunks background...`);
          for (const chunk of bg.chunks) {
            if (signal?.aborted) throw new Error('Đã hủy render.');
            await this.ffmpeg.render(chunk.args, {
              durationMs: chunk.durationMs,
              gpuIndex: plan.acceleration?.gpuIndex ?? 0,
              signal,
              onProgress: (p) => callbacks?.onProgress?.({
                stage: 'RENDER_CHUNK',
                voiceName,
                percent: ((chunk.index - 1) / chunk.total + (1 / chunk.total) * (p.percent / 100)) * 50
              })
            });
          }
        }
      }

      // Final pass
      await this.ffmpeg.render(plan.args, {
        durationMs,
        gpuIndex: plan.acceleration?.gpuIndex ?? 0,
        signal,
        onProgress: (p) => callbacks?.onProgress?.({
          stage: 'RENDER',
          voiceName,
          percent: p.percent,
          outTimeMs: p.outTimeMs,
          fps: p.fps,
          speed: p.speed
        })
      });

      // Move temporary to output if needed
      if (fs.existsSync(tempOutputPath)) {
        if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true });
        fs.renameSync(tempOutputPath, outputPath);
      }

      callbacks?.onLog?.(`[${voiceName}] ✅ Hoàn thành video: ${path.basename(outputPath)}`);
      return { success: true, outputPath };
    } finally {
      // Dọn dẹp file tạm
      try { if (tempOutputPath && fs.existsSync(tempOutputPath)) fs.rmSync(tempOutputPath, { force: true }); } catch {}
      try { if (tempAssPath && fs.existsSync(tempAssPath)) fs.rmSync(tempAssPath, { force: true }); } catch {}
      if (plan.stages?.background?.clips) {
        for (const c of plan.stages.background.clips) {
          try { if (fs.existsSync(c.outputPath)) fs.rmSync(c.outputPath, { force: true }); } catch {}
        }
      }
    }
  }

  async start({ items = [], config = {}, outputFolder, callbacks = {} }) {
    if (this.activeController) {
      throw new Error('Đang có tiến trình render chạy.');
    }
    this.activeController = new AbortController();
    const signal = this.activeController.signal;

    const effectiveOutput = ensureDirectory(outputFolder || path.join(this.paths.root, 'StoryVideos'));
    const system = await this.ffmpeg.checkSystem({ gpuIndex: Number(config.gpuIndex ?? -1), force: false });

    callbacks.onLog?.(`Khởi động tiến trình Tạo Video Ảnh · Tổng ${items.length} video`);
    callbacks.onState?.({ status: 'RUNNING', total: items.length });

    const results = [];
    try {
      for (let i = 0; i < items.length; i += 1) {
        if (signal.aborted) throw new Error('Tiến trình đã bị hủy.');
        const item = items[i];
        callbacks.onJob?.({ index: i + 1, total: items.length, voicePath: item.voicePath, status: 'RENDERING' });

        try {
          const res = await this.renderJob({
            item,
            config,
            outputFolder: effectiveOutput,
            system,
            callbacks,
            signal
          });
          results.push({ item, success: true, outputPath: res.outputPath });
          callbacks.onJob?.({ index: i + 1, total: items.length, voicePath: item.voicePath, status: 'COMPLETED', outputPath: res.outputPath });
        } catch (err) {
          callbacks.onLog?.(`[${path.basename(item.voicePath)}] ❌ Lỗi: ${err.message}`);
          results.push({ item, success: false, error: err.message });
          callbacks.onJob?.({ index: i + 1, total: items.length, voicePath: item.voicePath, status: 'FAILED', error: err.message });
        }
      }
      callbacks.onState?.({ status: 'COMPLETED', results, outputFolder: effectiveOutput });
      return { status: 'COMPLETED', results, outputFolder: effectiveOutput };
    } catch (error) {
      callbacks.onState?.({ status: 'CANCELLED', error: error.message });
      throw error;
    } finally {
      this.activeController = null;
    }
  }

  cancel() {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
      return true;
    }
    return false;
  }
}

module.exports = {
  StoryVideoService,
  planStorySegments,
  parseSrtCues
};
