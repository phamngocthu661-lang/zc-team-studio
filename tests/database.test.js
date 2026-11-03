'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AppDatabase } = require('../src/main/database');
const { BatchService } = require('../src/main/services/batch-service');

test('SQLite reservation ngăn dùng stock trùng và có thể release', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-db-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: path.join(root, 'available'), usedPath: path.join(root, 'used') });
    const assetId = database.upsertMediaAsset(library.id, {
      filePath: path.join(root, 'available', 'stock.mp4'),
      fileName: 'stock.mp4',
      fileHash: 'abc',
      fileSizeBytes: 10,
      modifiedAtFs: 1,
      durationMs: 5000,
      width: 1920,
      height: 1080,
      fpsNum: 30,
      fpsDen: 1,
      videoCodec: 'h264',
      audioCodec: null,
      hasAudio: false,
      valid: true
    });
    const batchId = database.createBatch({
      batchName: 'Batch', voiceFolder: '/voice', srtFolder: '/srt', libraryId: library.id,
      outputFolder: '/output', usedFolder: '/used'
    }, [{ sequenceNumber: 1, voicePath: '/voice/a.mp3', voiceName: 'a.mp3', srtPath: '/srt/a.srt', transitionSeed: 1 }]);
    const job = database.listBatchJobs(batchId)[0];
    database.reserveAssets(job.id, [assetId]);
    assert.equal(database.getActiveReservations(job.id).length, 1);
    assert.throws(() => database.reserveAssets(job.id, [assetId]));
    database.releaseReservations(job.id);
    assert.equal(database.listAvailableAssets(library.id).length, 1);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('planner bỏ qua media asset có file path không còn tồn tại', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-db-missing-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const available = path.join(root, 'available');
    fs.mkdirSync(available, { recursive: true });
    const existingPath = path.join(available, 'existing.mp4');
    const missingPath = path.join(available, 'missing.mp4');
    fs.writeFileSync(existingPath, 'placeholder');
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: available });
    const existingId = database.upsertMediaAsset(library.id, {
      filePath: existingPath,
      fileName: 'existing.mp4',
      fileSizeBytes: 11,
      durationMs: 5000,
      width: 1920,
      height: 1080,
      fpsNum: 30,
      fpsDen: 1,
      valid: true
    });
    const missingId = database.upsertMediaAsset(library.id, {
      filePath: missingPath,
      fileName: 'missing.mp4',
      fileSizeBytes: 11,
      durationMs: 5000,
      width: 1920,
      height: 1080,
      fpsNum: 30,
      fpsDen: 1,
      valid: true
    });
    const service = new BatchService({ database, ffmpegService: null, paths: {} });
    const logs = [];
    const assets = service.listRenderableAssets(library.id, { onLog: (message) => logs.push(message) });
    assert.deepEqual(assets.map((asset) => asset.id), [existingId]);
    assert.equal(database.db.prepare('SELECT status FROM media_assets WHERE id=?').get(missingId).status, 'MISSING');
    assert.equal(database.db.prepare('SELECT status FROM media_assets WHERE id=?').get(existingId).status, 'AVAILABLE');
    assert.match(logs.join('\n'), /bỏ qua 1 file/);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('batch jobs thiếu SRT vẫn pending khi bật tự tạo SRT', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-db-autosrt-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const batchId = database.createBatch({
      batchName: 'Auto SRT',
      voiceFolder: path.join(root, 'voice'),
      srtFolder: path.join(root, 'voice'),
      outputFolder: path.join(root, 'output'),
      autoGenerateSrt: true
    }, [{
      sequenceNumber: 1,
      voicePath: path.join(root, 'voice', 'a.mp3'),
      voiceName: 'a.mp3',
      srtPath: null,
      transitionSeed: 1
    }]);
    const job = database.listBatchJobs(batchId)[0];
    assert.equal(job.status, 'PENDING');
    assert.equal(job.srt_path, null);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stock usage ghi range đã dùng và cursor không lùi', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-db-stock-usage-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const stockPath = path.join(root, 'stock.mp4');
    const batchId = database.createBatch({
      batchName: 'Stock folder',
      voiceFolder: path.join(root, 'voice'),
      srtFolder: path.join(root, 'voice'),
      outputFolder: path.join(root, 'output'),
      backgroundMode: 'STOCK_VIDEO',
      autoGenerateSrt: true
    }, [{
      sequenceNumber: 1,
      voicePath: path.join(root, 'voice', 'a.mp3'),
      voiceName: 'a.mp3',
      srtPath: null,
      transitionSeed: 1
    }]);
    const job = database.listBatchJobs(batchId)[0];
    database.recordMatchedStockUsage({
      batchId,
      jobId: job.id,
      voiceName: job.voice_name,
      sourcePath: stockPath,
      outputPath: path.join(root, 'out.mp4'),
      sourceDurationMs: 300000,
      segments: [
        { durationMs: 60000, sourceDurationMs: 45000, trimStartMs: 0, sourceRangeStartMs: 0, sourceRangeEndMs: 45000, playbackRate: .75, stockPassIndex: 1, transform: {} }
      ]
    });
    assert.equal(database.getMatchedStockConsumedMs(stockPath), 45000);
    const rows = database.listMatchedStockUsage(batchId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].action, 'CONSUME_RANGE');
    database.markMatchedStockDeleted(stockPath);
    assert.equal(database.listMatchedStockUsage(batchId)[0].action, 'FULLY_CONSUMED_DELETE');
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('batch stock ưu tiên mediaFolder mới thay vì library cũ đang chọn', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-db-folder-priority-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const oldFolder = path.join(root, 'old-stock');
    const newFolder = path.join(root, 'new-stock');
    fs.mkdirSync(oldFolder, { recursive: true });
    fs.mkdirSync(newFolder, { recursive: true });
    fs.writeFileSync(path.join(newFolder, 'fresh.mkv'), 'placeholder');
    const oldLibrary = database.getOrCreateLibrary({ name: 'Old', rootPath: oldFolder, libraryType: 'STOCK' });
    const service = new BatchService({
      database,
      ffmpegService: {
        probe: async () => ({ durationMs: 120000, width: 1920, height: 1080, fpsNum: 30, fpsDen: 1, hasAudio: false })
      },
      paths: {}
    });
    const library = await service.prepareLibrary({
      backgroundMode: 'STOCK_VIDEO',
      libraryId: oldLibrary.id,
      mediaFolder: newFolder
    }, {});
    assert.equal(path.resolve(library.root_path), path.resolve(newFolder));
    const assets = database.listMediaAssets(library.id);
    assert.equal(assets.length, 1);
    assert.equal(assets[0].file_name, 'fresh.mkv');
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
