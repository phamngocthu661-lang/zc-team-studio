'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveBinary, ensureDirectory } = require('./path-utils');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v',
  '.ts', '.mts', '.m2ts', '.wmv', '.flv', '.f4v',
  '.mpg', '.mpeg', '.m4p', '.vob', '.3gp', '.ogv'
]);

const REGISTRY_FILE_NAME = '.stock_conformed_registry.json';

class StockConformerService {
  /**
   * Quét đệ quy tìm tất cả các file video trong thư mục kho stock
   */
  static findVideosRecursive(dirPath) {
    const results = [];
    if (!dirPath || !fs.existsSync(dirPath)) return results;

    const stack = [dirPath];
    while (stack.length > 0) {
      const current = stack.pop();
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            // Bỏ qua thư mục Used, .git, temp hoặc node_modules
            if (!/^(Used|\.git|\.cache|node_modules|temp)$/i.test(entry.name)) {
              stack.push(fullPath);
            }
          } else if (entry.isFile()) {
            // Bỏ qua các file ẩn và file tạm đang convert
            if (entry.name.startsWith('.') || entry.name.includes('.vbs_conforming.')) continue;
            const ext = path.extname(entry.name).toLowerCase();
            if (VIDEO_EXTENSIONS.has(ext)) {
              results.push(fullPath);
            }
          }
        }
      } catch (err) {
        console.warn(`[STOCK CONFORMER] Lỗi quét thư mục ${current}:`, err.message);
      }
    }

    return results.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  /**
   * Đọc file registry lưu vết các video đã chuẩn hóa
   */
  static loadRegistry(folderPath) {
    const registryPath = path.join(folderPath, REGISTRY_FILE_NAME);
    if (fs.existsSync(registryPath)) {
      try {
        const content = fs.readFileSync(registryPath, 'utf8');
        const data = JSON.parse(content);
        if (data && typeof data.files === 'object') return data;
      } catch (err) {
        console.warn('[STOCK CONFORMER] Lỗi đọc file registry:', err.message);
      }
    }
    return {
      version: 2,
      target: '1920x1080_24fps_h264',
      updatedAt: new Date().toISOString(),
      files: {}
    };
  }

  /**
   * Lưu file registry xuống đĩa
   */
  static saveRegistry(folderPath, registry) {
    const registryPath = path.join(folderPath, REGISTRY_FILE_NAME);
    try {
      registry.version = 2;
      registry.target = '1920x1080_24fps_h264';
      registry.updatedAt = new Date().toISOString();
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    } catch (err) {
      console.warn('[STOCK CONFORMER] Lỗi lưu file registry:', err.message);
    }
  }

  /**
   * Kiểm tra xem file video đã đạt chuẩn 1080p 24fps H.264 (yuv420p) hay chưa
   */
  static isStandard1080p24(probeResult) {
    if (!probeResult) return false;
    const w = Number(probeResult.width || 0);
    const h = Number(probeResult.height || 0);
    const fps = probeResult.fpsDen ? (Number(probeResult.fpsNum || 0) / Number(probeResult.fpsDen || 1)) : 0;
    const codec = String(probeResult.videoCodec || '').toLowerCase();

    const is1080p = (w === 1920 && h === 1080);
    const is24Fps = (Math.abs(fps - 24) < 0.2 || Math.abs(fps - 23.976) < 0.2);
    const isH264 = (codec === 'h264');

    return is1080p && is24Fps && isH264;
  }

  static isStandard1080p30(probeResult) {
    return StockConformerService.isStandard1080p24(probeResult);
  }

  /**
   * Quét nhanh và phân tích kho stock
   */
  static async scanStockFolder(folderPath, ffmpegService) {
    if (!folderPath || !fs.existsSync(folderPath)) {
      throw new Error(`Thư mục kho stock không tồn tại: ${folderPath}`);
    }

    const videoPaths = StockConformerService.findVideosRecursive(folderPath);
    const registry = StockConformerService.loadRegistry(folderPath);

    const alreadyStandard = [];
    const needsConforming = [];

    for (const filePath of videoPaths) {
      const relKey = path.relative(folderPath, filePath).replace(/\\/g, '/');
      let stat = null;
      try { stat = fs.statSync(filePath); } catch { continue; }

      const recorded = registry.files[relKey];
      // 1. Nếu registry đã xác nhận file này đạt 24fps và fileSize, mtimeMs không đổi -> BỎ QUA NGAY
      if (
        recorded &&
        Number(recorded.fps) === 24 &&
        recorded.fileSize === stat.size &&
        Math.abs(recorded.mtimeMs - stat.mtimeMs) < 1000
      ) {
        alreadyStandard.push({
          filePath,
          relKey,
          reason: 'REGISTRY_HIT',
          status: recorded.status || 'ALREADY_STANDARD'
        });
        continue;
      }

      // 2. Nếu chưa có trong registry (hoặc bản cũ là 30fps), probe kiểm tra thông số kỹ thuật
      try {
        const probe = await ffmpegService.probe(filePath);
        if (StockConformerService.isStandard1080p24(probe)) {
          // File vốn dĩ đã chuẩn 1080p 24fps
          registry.files[relKey] = {
            status: 'ALREADY_STANDARD',
            width: probe.width,
            height: probe.height,
            fps: 24,
            videoCodec: probe.videoCodec,
            fileSize: stat.size,
            mtimeMs: stat.mtimeMs,
            checkedAt: new Date().toISOString()
          };
          alreadyStandard.push({
            filePath,
            relKey,
            reason: 'PROBE_STANDARD',
            probe
          });
        } else {
          // File cần chuẩn hóa (4K, 2K, 720p, 60fps, 30fps...)
          const fps = probe.fpsDen ? (probe.fpsNum / probe.fpsDen) : 0;
          needsConforming.push({
            filePath,
            relKey,
            fileSize: stat.size,
            durationMs: probe.durationMs || 0,
            width: probe.width,
            height: probe.height,
            fps: Math.round(fps),
            codec: probe.videoCodec
          });
        }
      } catch (err) {
        console.warn(`[STOCK CONFORMER] Lỗi probe file ${filePath}:`, err.message);
        needsConforming.push({
          filePath,
          relKey,
          fileSize: stat.size,
          durationMs: 0,
          width: 0,
          height: 0,
          fps: 0,
          codec: 'unknown'
        });
      }
    }

    // Cập nhật registry với các file vốn dĩ đã chuẩn
    StockConformerService.saveRegistry(folderPath, registry);

    return {
      folderPath,
      totalVideos: videoPaths.length,
      alreadyStandardCount: alreadyStandard.length,
      needsConformingCount: needsConforming.length,
      alreadyStandard,
      needsConforming
    };
  }

  /**
   * Tiến hành chuẩn hóa toàn bộ các file chưa chuẩn về 1080p 24fps H.264 bằng Full GPU (CUDA + NVENC)
   */
  static async conformFolder(folderPath, ffmpegService, { onProgress, signal } = {}) {
    onProgress?.({
      stage: 'SCANNING',
      percent: 0,
      message: '🔍 Đang quét và kiểm tra thông số kho stock (chuẩn 1080p 24fps)...'
    });

    const scanResult = await StockConformerService.scanStockFolder(folderPath, ffmpegService);
    const { totalVideos, alreadyStandardCount, needsConforming } = scanResult;

    if (needsConforming.length === 0) {
      const msg = `✅ Toàn bộ ${totalVideos} video trong kho stock đã đạt chuẩn 1080p 24fps! Không cần chuẩn hóa thêm.`;
      onProgress?.({
        stage: 'DONE',
        percent: 100,
        message: msg,
        conformedCount: 0,
        skippedCount: totalVideos
      });
      return {
        success: true,
        message: msg,
        total: totalVideos,
        conformed: 0,
        skipped: totalVideos
      };
    }

    // Kiểm tra khả năng tăng tốc Full GPU (CUDA Decode + scale_cuda + NVIDIA NVENC)
    let useNvenc = false;
    let useCudaScale = false;
    let gpuIndex = 0;
    let gpuName = 'NVIDIA GPU';
    try {
      const sys = typeof ffmpegService.checkSystem === 'function'
        ? await ffmpegService.checkSystem({ gpuIndex: -1 })
        : null;
      if (sys && (sys.nvencRuntime || sys.h264NvencRuntime)) {
        useNvenc = true;
        useCudaScale = Boolean(sys.cudaCompiled && sys.scaleCuda);
        gpuIndex = Number.isInteger(sys.selectedGpuIndex) ? sys.selectedGpuIndex : 0;
        gpuName = sys.selectedGpuName || `NVIDIA GPU #${gpuIndex}`;
      } else {
        const encTest = await ffmpegService.testEncoder('h264_nvenc');
        useNvenc = Boolean(encTest && encTest.ok);
        gpuIndex = Number.isInteger(encTest?.gpuIndex) ? encTest.gpuIndex : 0;
      }
    } catch {
      useNvenc = false;
      useCudaScale = false;
    }

    onProgress?.({
      stage: 'STARTING',
      percent: 0,
      message: `⚡ Phát hiện ${needsConforming.length} video cần chuẩn hóa về 1080p 24fps (${alreadyStandardCount} video đã chuẩn sẽ bỏ qua) · Chế độ: ${useNvenc ? `GPU ${gpuName} (${useCudaScale ? 'Full CUDA + NVENC' : 'NVENC'})` : 'CPU libx264'}...`
    });

    const registry = StockConformerService.loadRegistry(folderPath);
    let conformedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < needsConforming.length; i++) {
      if (signal?.aborted) {
        throw new Error('Tiến trình chuẩn hóa stock đã bị người dùng dừng lại.');
      }

      const item = needsConforming[i];
      const fileName = path.basename(item.filePath);
      const tempPath = path.join(path.dirname(item.filePath), `.${fileName}.vbs_conforming.mp4`);

      // Dọn file tạm cũ nếu có
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}

      const currentIndex = i + 1;
      const totalToConform = needsConforming.length;
      const basePercent = Math.round((i / totalToConform) * 100);

      // Kiểm tra tỷ lệ khung hình có phải ~16:9 không để ưu tiên scale_cuda 100% trên VRAM
      const is16by9 = item.width > 0 && item.height > 0 && Math.abs((item.width / item.height) - (16 / 9)) < 0.05;

      // Filter CPU (khi cần crop khung hình lệch tỷ lệ hoặc fallback) + ép format=yuv420p để NVENC không bao giờ lỗi với video 10-bit
      const cpuScaleCropFilter = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p';

      // Tier 1: Full GPU Zero-Copy (GPU NVDEC Decode + GPU scale_cuda + GPU h264_nvenc Encode)
      const buildCudaFullArgs = () => [
        '-y',
        '-hide_banner',
        '-hwaccel', 'cuda',
        '-hwaccel_device', String(gpuIndex),
        '-hwaccel_output_format', 'cuda',
        '-i', item.filePath,
        '-vf', 'scale_cuda=1920:1080:format=nv12:reset_sar=1',
        '-r', '24',
        '-c:v', 'h264_nvenc',
        '-gpu', String(gpuIndex),
        '-preset', 'p2',
        '-cq', '20',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-progress', 'pipe:1',
        '-nostats',
        tempPath
      ];

      // Tier 2: Hybrid GPU (GPU NVDEC Decode + Crop/Scale + GPU h264_nvenc Encode)
      const buildHybridNvencArgs = () => [
        '-y',
        '-hide_banner',
        '-hwaccel', 'cuda',
        '-hwaccel_device', String(gpuIndex),
        '-i', item.filePath,
        '-vf', cpuScaleCropFilter,
        '-c:v', 'h264_nvenc',
        '-gpu', String(gpuIndex),
        '-preset', 'p2',
        '-cq', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-progress', 'pipe:1',
        '-nostats',
        tempPath
      ];

      // Tier 3: CPU Fallback (libx264)
      const buildCpuArgs = () => [
        '-y',
        '-hide_banner',
        '-i', item.filePath,
        '-vf', cpuScaleCropFilter,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-progress', 'pipe:1',
        '-nostats',
        tempPath
      ];

      const makeProgressHandler = (modeLabel) => (p) => {
        const itemPercent = p.percent || 0;
        const overallPercent = Math.round(((i + (itemPercent / 100)) / totalToConform) * 100);
        const gpuStatStr = p.gpu
          ? ` · GPU ${p.gpu.utilizationPercent || 0}% (NVENC ${p.gpu.encoderUtilizationPercent || 0}%)`
          : '';
        onProgress?.({
          stage: 'CONFORMING',
          current: currentIndex,
          total: totalToConform,
          fileName,
          percent: overallPercent,
          speed: p.speed,
          fps: p.fps,
          message: `⚡ [${currentIndex}/${totalToConform}] Đang chuẩn hóa (${modeLabel}): ${fileName} (${Math.round(itemPercent)}%${p.speed ? ` · ${p.speed}` : ''}${gpuStatStr})...`
        });
      };

      onProgress?.({
        stage: 'CONFORMING',
        current: currentIndex,
        total: totalToConform,
        fileName,
        percent: basePercent,
        message: `⚡ [${currentIndex}/${totalToConform}] Đang chuẩn hóa (${useNvenc ? (useCudaScale && is16by9 ? 'GPU Full CUDA + NVENC' : 'GPU NVENC') : 'CPU'}): ${fileName} (${item.width}x${item.height} ${item.fps}fps ➔ 1080p 24fps)...`
      });

      let renderSuccess = false;
      try {
        // Thử Tier 1: Full GPU CUDA (NVDEC + scale_cuda + h264_nvenc) cho video 16:9
        if (useNvenc && useCudaScale && is16by9) {
          try {
            await ffmpegService.render(buildCudaFullArgs(), {
              durationMs: item.durationMs,
              signal,
              gpuIndex,
              onProgress: makeProgressHandler('GPU Full CUDA + NVENC')
            });
            renderSuccess = true;
          } catch (cudaErr) {
            console.warn(`[STOCK CONFORMER] Full CUDA lỗi với file ${fileName}, chuyển sang Hybrid NVENC:`, cudaErr.message);
            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
          }
        }

        // Thử Tier 2: Hybrid GPU (NVDEC + Crop/Scale + h264_nvenc)
        if (!renderSuccess && useNvenc) {
          try {
            await ffmpegService.render(buildHybridNvencArgs(), {
              durationMs: item.durationMs,
              signal,
              gpuIndex,
              onProgress: makeProgressHandler('GPU NVENC')
            });
            renderSuccess = true;
          } catch (nvencErr) {
            console.warn(`[STOCK CONFORMER] NVENC lỗi với file ${fileName}, chuyển sang CPU fallback:`, nvencErr.message);
            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
          }
        }

        // Thử Tier 3: CPU Fallback (libx264)
        if (!renderSuccess) {
          await ffmpegService.render(buildCpuArgs(), {
            durationMs: item.durationMs,
            signal,
            onProgress: makeProgressHandler('CPU')
          });
          renderSuccess = true;
        }

        // Kiểm tra tính toàn vẹn của file tạm sau khi encode
        if (fs.existsSync(tempPath) && fs.statSync(tempPath).size > 10240) {
          // Thay thế file gốc an toàn (Atomic Replace)
          try { fs.unlinkSync(item.filePath); } catch {}
          fs.renameSync(tempPath, item.filePath);

          const newStat = fs.statSync(item.filePath);

          // Cập nhật registry ngay lập tức
          registry.files[item.relKey] = {
            status: 'CONFORMED',
            width: 1920,
            height: 1080,
            fps: 24,
            videoCodec: 'h264',
            fileSize: newStat.size,
            mtimeMs: newStat.mtimeMs,
            conformedAt: new Date().toISOString()
          };
          StockConformerService.saveRegistry(folderPath, registry);
          conformedCount++;
          console.log(`[STOCK CONFORMER] ✅ [${currentIndex}/${totalToConform}] Đã chuẩn hóa thành công: ${fileName} (1080p 24fps)`);
        } else {
          throw new Error('File tạm sau khi encode rỗng hoặc không tồn tại.');
        }
      } catch (err) {
        failedCount++;
        console.error(`[STOCK CONFORMER] ❌ Thất bại khi chuẩn hóa ${fileName}:`, err.message);
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      }
    }

    const finalMsg = `🎉 Hoàn tất chuẩn hóa kho stock (1080p 24fps)! Đã chuẩn hóa ${conformedCount} video, bỏ qua ${alreadyStandardCount} video có sẵn${failedCount ? `, lỗi ${failedCount} file` : ''}.`;
    onProgress?.({
      stage: 'DONE',
      percent: 100,
      message: finalMsg,
      conformedCount,
      skippedCount: alreadyStandardCount,
      failedCount
    });

    return {
      success: true,
      message: finalMsg,
      total: totalVideos,
      conformed: conformedCount,
      skipped: alreadyStandardCount,
      failed: failedCount
    };
  }
}

module.exports = {
  StockConformerService,
  VIDEO_EXTENSIONS,
  REGISTRY_FILE_NAME
};
