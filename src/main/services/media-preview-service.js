'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } = require('../../shared/constants');
const { ensureDirectory } = require('./path-utils');

class MediaPreviewService {
  constructor(ffmpegService, paths) {
    this.ffmpeg = ffmpegService;
    this.previewRoot = ensureDirectory(path.join(paths.thumbnails, 'layer-previews'));
  }

  async create(sourcePath, options = {}) {
    const resolved = path.resolve(String(sourcePath || ''));
    if (!sourcePath || !fs.existsSync(resolved)) throw new Error('Source không tồn tại.');
    const extension = path.extname(resolved).toLowerCase();
    const stat = fs.statSync(resolved);

    if (IMAGE_EXTENSIONS.has(extension)) {
      let metadata = { width: 0, height: 0, durationMs: 0 };
      try { metadata = await this.ffmpeg.probe(resolved); } catch { /* ffprobe may not expose image metadata consistently */ }
      return { sourcePath: resolved, previewPath: resolved, sourceType: 'IMAGE', metadata };
    }

    if (!VIDEO_EXTENSIONS.has(extension)) throw new Error('Source phải là ảnh hoặc video được hỗ trợ.');
    const metadata = await this.ffmpeg.probe(resolved);
    const requested = Number(options.timeSeconds);
    const durationSeconds = Math.max(0, Number(metadata.durationMs || 0) / 1000);
    const timeSeconds = Number.isFinite(requested)
      ? Math.max(0, Math.min(requested, Math.max(0, durationSeconds - 0.05)))
      : Math.max(0, Math.min(durationSeconds > 0 ? durationSeconds * 0.1 : 1, 5));
    const cacheKey = crypto.createHash('sha1')
      .update(`${resolved}|${stat.size}|${stat.mtimeMs}|${timeSeconds.toFixed(3)}`)
      .digest('hex');
    const outputPath = path.join(this.previewRoot, `${cacheKey}.jpg`);
    if (!fs.existsSync(outputPath)) {
      await this.ffmpeg.thumbnail(resolved, outputPath, { timeSeconds, width: Number(options.width || 720) });
    }
    return { sourcePath: resolved, previewPath: outputPath, sourceType: 'VIDEO', frameTimeSeconds: timeSeconds, metadata };
  }
}

module.exports = { MediaPreviewService };
