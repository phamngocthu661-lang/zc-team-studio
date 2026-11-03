'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { resolveBinary } = require('./path-utils');

/**
 * Kiểm tra nhanh magic header của file ảnh để loại bỏ các file rác, file lỗi, file HTML/404
 */
function checkImageMagicHeader(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size < 100) return false; // File ảnh không thể nhỏ hơn 100 bytes

    const buffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
    // WEBP: RIFF .... WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      const type = buffer.toString('ascii', 8, 12);
      if (type === 'WEBP') return true;
    }
    // BMP: 42 4D
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;

    // Kiểm tra nếu là file text, html, json báo lỗi từ Drive (như 404, Access Denied)
    const preview = buffer.toString('utf8', 0, 32).toLowerCase();
    if (preview.includes('<html') || preview.includes('<!doc') || preview.includes('error') || preview.includes('{')) {
      return false;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Dùng ffprobe kiểm tra sâu tính toàn vẹn của file ảnh và lấy kích thước width x height
 */
async function probeAndValidateImage(imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || !fs.existsSync(imagePath)) {
    return { valid: false, width: 0, height: 0, error: 'File không tồn tại' };
  }

  // 1. Kiểm tra nhanh magic header
  if (!checkImageMagicHeader(imagePath)) {
    return { valid: false, width: 0, height: 0, error: 'Magic header không hợp lệ hoặc file bị hỏng' };
  }

  // 2. Dùng ffprobe xác thực giải mã stream hình ảnh
  const ffprobePath = resolveBinary('ffprobe', 'FFPROBE_PATH');
  return new Promise((resolve) => {
    try {
      const probeProc = spawn(ffprobePath, [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=s=x:p=0',
        imagePath
      ], { windowsHide: true });

      let stdout = '';
      let stderr = '';
      probeProc.stdout.on('data', chunk => { stdout += chunk; });
      probeProc.stderr.on('data', chunk => { stderr += chunk; });

      probeProc.once('close', (code) => {
        if (code === 0 && stdout.trim()) {
          const parts = stdout.trim().split('x').map(Number);
          const w = parts[0] || 0;
          const h = parts[1] || 0;
          if (w > 0 && h > 0) {
            return resolve({ valid: true, width: w, height: h, error: null });
          }
        }
        resolve({ valid: false, width: 0, height: 0, error: stderr.trim() || `Exit code ${code}` });
      });

      probeProc.once('error', (err) => {
        resolve({ valid: false, width: 0, height: 0, error: err.message });
      });
    } catch (e) {
      resolve({ valid: false, width: 0, height: 0, error: e.message });
    }
  });
}

/**
 * Tạo một ảnh PNG hợp lệ khẩn cấp (màu trong suốt hoặc nền đen) để cứu hộ khi toàn bộ ảnh bị hỏng
 */
async function createEmergencyFallbackImage(destPath, width = 1920, height = 1080) {
  try {
    const parent = path.dirname(destPath);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
      return destPath;
    }

    const ffmpegPath = resolveBinary('ffmpeg', 'FFMPEG_PATH');
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', `color=c=black@0.0:s=${width}x${height}:d=0.1`,
        '-frames:v', '1',
        destPath
      ], { windowsHide: true });

      proc.once('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
      proc.once('error', reject);
    });

    return destPath;
  } catch (err) {
    console.warn(`[EMERGENCY IMAGE] Không thể tạo ảnh khẩn cấp: ${err.message}`);
    return null;
  }
}

/**
 * Kiểm tra tính toàn vẹn của ảnh
 * TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý LẤY ẢNH CỦA VIDEO KHÁC ĐẮP VÀO!
 */
async function rescueCorruptImage(imagePath, {
  searchDir = null,
  targetWidth = 1920,
  targetHeight = 1080,
  tempDir = null,
  onLog = null
} = {}) {
  if (!imagePath) return null;

  // 1. Kiểm tra tính toàn vẹn của ảnh hiện tại
  const validation = await probeAndValidateImage(imagePath);
  if (validation.valid) {
    return imagePath; // Ảnh hoàn toàn hợp lệ
  }

  const badFileName = path.basename(imagePath);
  const logMsg = `❌ [PHÁT HIỆN ẢNH HỎNG] File [${badFileName}] bị hỏng dữ liệu (${validation.error}). TUYỆT ĐỐI KHÔNG lấy ảnh của video khác thay thế!`;
  console.warn(logMsg);
  if (typeof onLog === 'function') onLog(logMsg);

  // Trả về null để báo hiệu ảnh này không thể sử dụng
  return null;
}


/**
 * Tự động kiểm tra và pre-scale ảnh layer/nhân vật có độ phân giải quá cao
 * (như 4K, 6.7K, 8K) về đúng kích thước chuẩn canvas (1920x1080).
 */
async function optimizeLayerImageIfOversized(imagePath, targetWidth = 1920, targetHeight = 1080, tempDir = null, onLog = null, searchDir = null) {
  if (!imagePath || typeof imagePath !== 'string') return imagePath;

  // Cứu hộ trước nếu file bị hỏng
  const safeImagePath = await rescueCorruptImage(imagePath, {
    searchDir,
    targetWidth,
    targetHeight,
    tempDir,
    onLog
  });

  if (!safeImagePath || !fs.existsSync(safeImagePath)) return imagePath;

  const ext = path.extname(safeImagePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext)) return safeImagePath;

  const ffmpegPath = resolveBinary('ffmpeg', 'FFMPEG_PATH');

  try {
    const probe = await probeAndValidateImage(safeImagePath);
    if (!probe.valid) return safeImagePath;

    const imgWidth = probe.width;
    const imgHeight = probe.height;

    // Nếu ảnh đã nhỏ hơn hoặc bằng target canvas thì giữ nguyên
    if (imgWidth <= targetWidth && imgHeight <= targetHeight) {
      return safeImagePath;
    }

    // Ảnh lớn hơn kích thước canvas: Tiến hành pre-scale siêu tốc ra temp
    const destDir = tempDir && fs.existsSync(tempDir) ? tempDir : path.dirname(safeImagePath);
    const baseName = path.basename(safeImagePath, ext);
    const targetFile = path.join(destDir, `opt_${baseName}_${targetWidth}x${targetHeight}.png`);

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100) {
      return targetFile;
    }

    const scaleArgs = [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', safeImagePath,
      '-vf', `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      '-frames:v', '1',
      targetFile
    ];

    const scaleProc = spawn(ffmpegPath, scaleArgs, { windowsHide: true });
    await new Promise((resolve, reject) => {
      scaleProc.once('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
      scaleProc.once('error', reject);
    });

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 100) {
      if (typeof onLog === 'function') {
        onLog(`⚡ [Tối ưu hình ảnh] Tự động thu nhỏ ảnh: ${path.basename(safeImagePath)} (${imgWidth}x${imgHeight} ➔ ${targetWidth}x${targetHeight}) để tăng tốc render tối đa.`);
      }
      return targetFile;
    }
  } catch (err) {
    // Nếu có lỗi scale, an toàn trả về safeImagePath
  }

  return safeImagePath;
}

/**
 * Quét toàn bộ layer trong renderConfig và tối ưu hóa các layer ảnh
 */
async function optimizeRenderConfigImageLayers(renderConfig, tempDir = null, callbacks = {}) {
  if (!renderConfig?.layers?.length) return renderConfig;

  const canvasWidth = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const canvasHeight = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const updatedLayers = [];

  for (const layer of renderConfig.layers) {
    const type = String(layer.type || layer.layerType || '').toUpperCase();
    const isImg = ['IMAGE', 'VOICE_IMAGE', 'LOGO', 'GREENSCREEN_IMAGE', 'OVERLAY_IMAGE'].includes(type) || layer.dynamicVoiceImage;

    if (isImg && (layer.sourceReference || layer.source)) {
      const src = layer.sourceReference || layer.source;
      const optSrc = await optimizeLayerImageIfOversized(src, canvasWidth, canvasHeight, tempDir, callbacks.onLog, tempDir);
      updatedLayers.push({
        ...layer,
        source: optSrc,
        sourceReference: optSrc
      });
    } else {
      updatedLayers.push(layer);
    }
  }

  return {
    ...renderConfig,
    layers: updatedLayers
  };
}

module.exports = {
  checkImageMagicHeader,
  probeAndValidateImage,
  createEmergencyFallbackImage,
  rescueCorruptImage,
  optimizeLayerImageIfOversized,
  optimizeRenderConfigImageLayers
};

