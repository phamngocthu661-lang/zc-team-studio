'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { StockConformerService, REGISTRY_FILE_NAME } = require('../src/main/services/stock-conformer-service');

test('TEST-CONFORM-01: isStandard1080p24 nhận diện chính xác video chuẩn 24fps', () => {
  assert.equal(StockConformerService.isStandard1080p24({
    width: 1920,
    height: 1080,
    fpsNum: 24,
    fpsDen: 1,
    videoCodec: 'h264'
  }), true);

  assert.equal(StockConformerService.isStandard1080p24({
    width: 1920,
    height: 1080,
    fpsNum: 24000,
    fpsDen: 1001, // 23.976 fps
    videoCodec: 'h264'
  }), true);

  // 4K -> false
  assert.equal(StockConformerService.isStandard1080p24({
    width: 3840,
    height: 2160,
    fpsNum: 24,
    fpsDen: 1,
    videoCodec: 'h264'
  }), false);

  // 60fps -> false
  assert.equal(StockConformerService.isStandard1080p24({
    width: 1920,
    height: 1080,
    fpsNum: 60,
    fpsDen: 1,
    videoCodec: 'h264'
  }), false);

  // HEVC -> false
  assert.equal(StockConformerService.isStandard1080p24({
    width: 1920,
    height: 1080,
    fpsNum: 24,
    fpsDen: 1,
    videoCodec: 'hevc'
  }), false);
});

test('TEST-CONFORM-02: findVideosRecursive quét đúng video và bỏ qua Used / file ẩn', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_stock_conformer_'));
  try {
    const v1 = path.join(tmpDir, 'video1.mp4');
    const v2 = path.join(tmpDir, 'subfolder', 'video2.mov');
    const usedVideo = path.join(tmpDir, 'Used', 'video_used.mp4');
    const hiddenVideo = path.join(tmpDir, '.video_hidden.mp4');
    const tmpConvert = path.join(tmpDir, 'video1.vbs_conforming.mp4');
    const textFile = path.join(tmpDir, 'readme.txt');

    fs.mkdirSync(path.join(tmpDir, 'subfolder'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'Used'), { recursive: true });

    fs.writeFileSync(v1, Buffer.alloc(100));
    fs.writeFileSync(v2, Buffer.alloc(100));
    fs.writeFileSync(usedVideo, Buffer.alloc(100));
    fs.writeFileSync(hiddenVideo, Buffer.alloc(100));
    fs.writeFileSync(tmpConvert, Buffer.alloc(100));
    fs.writeFileSync(textFile, 'hello');

    const found = StockConformerService.findVideosRecursive(tmpDir);
    assert.equal(found.length, 2);
    assert.ok(found.includes(v1));
    assert.ok(found.includes(v2));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('TEST-CONFORM-03: conformFolder chuẩn hóa và lưu registry; lần chạy sau BỎ QUA 100%', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_conform_flow_'));
  try {
    // Giả lập 2 video: 1 video 4K (cần conform), 1 video 1080p 30fps (đã chuẩn)
    const file4k = path.join(tmpDir, 'stock_4k.mp4');
    const file1080p = path.join(tmpDir, 'stock_standard.mp4');

    fs.writeFileSync(file4k, Buffer.alloc(50000));
    fs.writeFileSync(file1080p, Buffer.alloc(50000));

    let renderedFiles = [];
    const mockFfmpegService = {
      async probe(filePath) {
        if (filePath.includes('stock_4k')) {
          return { width: 3840, height: 2160, fpsNum: 60, fpsDen: 1, videoCodec: 'hevc', durationMs: 10000 };
        }
        return { width: 1920, height: 1080, fpsNum: 24, fpsDen: 1, videoCodec: 'h264', durationMs: 10000 };
      },
      async testEncoder() {
        return { ok: true };
      },
      async render(args) {
        // file output là tham số cuối
        const outPath = args[args.length - 1];
        renderedFiles.push(outPath);
        fs.writeFileSync(outPath, Buffer.alloc(60000)); // tạo file > 10KB
      }
    };

    // LẦN CHẠY 1:
    const progressLog = [];
    const res1 = await StockConformerService.conformFolder(tmpDir, mockFfmpegService, {
      onProgress: (p) => progressLog.push(p.message)
    });

    assert.equal(res1.success, true);
    assert.equal(res1.total, 2);
    assert.equal(res1.conformed, 1); // stock_4k được conform
    assert.equal(res1.skipped, 1);   // stock_standard được bỏ qua vì đã chuẩn

    // File registry phải tồn tại
    const regPath = path.join(tmpDir, REGISTRY_FILE_NAME);
    assert.equal(fs.existsSync(regPath), true);
    const reg1 = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    assert.ok(reg1.files['stock_4k.mp4']);
    assert.equal(reg1.files['stock_4k.mp4'].status, 'CONFORMED');
    assert.ok(reg1.files['stock_standard.mp4']);
    assert.equal(reg1.files['stock_standard.mp4'].status, 'ALREADY_STANDARD');

    // LẦN CHẠY 2 (TÁI KIỂM TRA): Không có file nào bị encode lại, BỎ QUA 100%!
    renderedFiles = [];
    const res2 = await StockConformerService.conformFolder(tmpDir, mockFfmpegService, {
      onProgress: (p) => {}
    });

    assert.equal(res2.success, true);
    assert.equal(res2.total, 2);
    assert.equal(res2.conformed, 0); // KHÔNG FILE NÀO PHẢI CONFORM LẠI
    assert.equal(res2.skipped, 2);   // BỎ QUA CẢ 2 FILE
    assert.equal(renderedFiles.length, 0); // FFmpeg render không hề bị gọi
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
