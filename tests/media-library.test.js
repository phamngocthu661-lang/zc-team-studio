'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AppDatabase } = require('../src/main/database');
const { BatchService } = require('../src/main/services/batch-service');
const { MediaLibraryService } = require('../src/main/services/media-library-service');

function videoAsset(filePath, durationMs, valid = true) {
  return {
    filePath,
    fileName: path.basename(filePath),
    assetType: 'VIDEO',
    fileSizeBytes: 10,
    durationMs,
    width: 1920,
    height: 1080,
    fpsNum: 30,
    fpsDen: 1,
    valid
  };
}

test('thống kê thư viện tách thời lượng còn dùng, đã dùng và mục lỗi', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-library-stats-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const folder = path.join(root, 'stock');
    fs.mkdirSync(folder, { recursive: true });
    const availablePath = path.join(folder, 'available.mp4');
    const usedPath = path.join(folder, 'used.mp4');
    const invalidPath = path.join(folder, 'invalid.mp4');
    fs.writeFileSync(availablePath, 'available');
    fs.writeFileSync(usedPath, 'used');
    fs.writeFileSync(invalidPath, 'invalid');
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: folder, libraryType: 'STOCK' });
    database.upsertMediaAsset(library.id, videoAsset(availablePath, 120_000));
    const usedId = database.upsertMediaAsset(library.id, videoAsset(usedPath, 60_000));
    database.db.prepare("UPDATE media_assets SET status='USED' WHERE id=?").run(usedId);
    const invalidId = database.upsertMediaAsset(library.id, videoAsset(invalidPath, 0, false));
    const missingId = database.upsertMediaAsset(library.id, videoAsset(path.join(folder, 'missing.mp4'), 30_000));
    database.markMissingAssets([missingId]);

    const stats = new MediaLibraryService(database, null).stats(library.id);
    assert.equal(stats.availableDurationMs, 320_000);
    assert.equal(stats.usedDurationMs, 160_000);
    assert.equal(stats.totalDurationMs, 560_000);
    assert.equal(stats.unusableCount, 2);
    assert.equal(database.db.prepare('SELECT status FROM media_assets WHERE id=?').get(invalidId).status, 'INVALID');
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nút dọn thư viện xóa file INVALID và mục MISSING nhưng giữ USED', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-library-purge-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const folder = path.join(root, 'stock');
    fs.mkdirSync(folder, { recursive: true });
    const validPath = path.join(folder, 'valid.mp4');
    const invalidPath = path.join(folder, 'invalid.mp4');
    const usedPath = path.join(folder, 'used.mp4');
    fs.writeFileSync(validPath, 'valid');
    fs.writeFileSync(invalidPath, 'invalid');
    fs.writeFileSync(usedPath, 'used');
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: folder, libraryType: 'STOCK' });
    database.upsertMediaAsset(library.id, videoAsset(validPath, 30_000));
    const invalidId = database.upsertMediaAsset(library.id, videoAsset(invalidPath, 0, false));
    const missingId = database.upsertMediaAsset(library.id, videoAsset(path.join(folder, 'missing.mp4'), 0));
    database.markMissingAssets([missingId]);
    const usedId = database.upsertMediaAsset(library.id, videoAsset(usedPath, 45_000));
    database.db.prepare("UPDATE media_assets SET status='USED' WHERE id=?").run(usedId);

    const result = new MediaLibraryService(database, null).purgeUnusable(library.id);
    assert.equal(result.removedRecords, 2);
    assert.equal(result.deletedFiles, 1);
    assert.equal(fs.existsSync(invalidPath), false);
    assert.equal(database.listMediaAssets(library.id).some((asset) => asset.id === invalidId || asset.id === missingId), false);
    assert.equal(database.listMediaAssets(library.id).some((asset) => asset.id === usedId && asset.status === 'USED'), true);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nút dọn tự nhận diện file đã mất dù chưa quét lại thư viện', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-library-purge-unscanned-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const folder = path.join(root, 'stock');
    fs.mkdirSync(folder, { recursive: true });
    const missingPath = path.join(folder, 'missing.mp4');
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: folder, libraryType: 'STOCK' });
    const missingId = database.upsertMediaAsset(library.id, videoAsset(missingPath, 30_000));
    const batchId = database.createBatch({
      batchName: 'Batch-1',
      voiceFolder: path.join(root, 'voice'),
      srtFolder: path.join(root, 'voice'),
      outputFolder: path.join(root, 'output'),
      backgroundMode: 'STOCK_VIDEO',
      autoGenerateSrt: true
    }, [{
      sequenceNumber: 1,
      voicePath: path.join(root, 'voice', 'voice.mp3'),
      voiceName: 'voice.mp3',
      srtPath: null,
      transitionSeed: 1
    }]);
    const jobId = database.listBatchJobs(batchId)[0].id;
    database.db.prepare("INSERT INTO stock_reservations(id,media_asset_id,job_id,status,reserved_at) VALUES(?,?,?,'RELEASED',?)")
      .run('reservation-missing', missingId, jobId, Date.now());

    const result = new MediaLibraryService(database, null).purgeUnusable(library.id);
    assert.equal(result.removedRecords, 1);
    assert.equal(database.listMediaAssets(library.id).some((asset) => asset.id === missingId), false);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('xóa thư viện kèm file xóa cả folder media và folder Used ngoài root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-library-delete-files-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const folder = path.join(root, 'stock');
    const usedFolder = path.join(root, 'used-stock');
    fs.mkdirSync(folder, { recursive: true });
    fs.mkdirSync(usedFolder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'available.mp4'), 'available');
    fs.writeFileSync(path.join(usedFolder, 'used.mp4'), 'used');
    const library = database.getOrCreateLibrary({ name: 'Stock', rootPath: folder, usedPath: usedFolder, libraryType: 'STOCK' });
    const assetId = database.upsertMediaAsset(library.id, videoAsset(path.join(folder, 'available.mp4'), 30_000));
    const batchId = database.createBatch({
      batchName: 'Delete Batch',
      voiceFolder: path.join(root, 'voice'),
      srtFolder: path.join(root, 'voice'),
      outputFolder: path.join(root, 'output'),
      backgroundMode: 'STOCK_VIDEO',
      autoGenerateSrt: true
    }, [{
      sequenceNumber: 1,
      voicePath: path.join(root, 'voice', 'voice.mp3'),
      voiceName: 'voice.mp3',
      srtPath: null,
      transitionSeed: 1
    }]);
    const jobId = database.listBatchJobs(batchId)[0].id;
    database.db.prepare("INSERT INTO stock_reservations(id,media_asset_id,job_id,status,reserved_at,released_at) VALUES(?,?,?,'RELEASED',?,?)")
      .run('reservation-delete-files', assetId, jobId, Date.now(), Date.now());
    database.saveJobAssets(jobId, 'STOCK', [{ assetId, durationMs: 1000 }]);

    const result = new MediaLibraryService(database, null).deleteWithFiles(library.id);

    assert.equal(fs.existsSync(folder), false);
    assert.equal(fs.existsSync(usedFolder), false);
    assert.equal(result.deletedDirs.length, 2);
    assert.equal(database.listLibraries().some((item) => item.id === library.id), false);
    assert.equal(database.db.prepare('SELECT COUNT(*) count FROM stock_reservations WHERE media_asset_id=?').get(assetId).count, 0);
    assert.equal(database.db.prepare('SELECT media_asset_id FROM job_assets WHERE job_id=?').get(jobId).media_asset_id, null);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('stock đã dùng hết được chuyển sang Used thay vì xóa', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-stock-move-'));
  const database = new AppDatabase(path.join(root, 'app.db'));
  try {
    const stockPath = path.join(root, 'stock.mp4');
    const usedFolder = path.join(root, 'Used', 'Batch-1');
    const reportFolder = path.join(root, 'Reports');
    fs.writeFileSync(stockPath, 'stock');
    const batchId = database.createBatch({
      batchName: 'Batch-1',
      voiceFolder: path.join(root, 'voice'),
      srtFolder: path.join(root, 'voice'),
      outputFolder: path.join(root, 'output'),
      backgroundMode: 'MATCHED_STOCK',
      autoGenerateSrt: true
    }, [{
      sequenceNumber: 1,
      voicePath: path.join(root, 'voice', 'voice.mp3'),
      voiceName: 'voice.mp3',
      srtPath: null,
      transitionSeed: 1
    }]);
    const job = database.listBatchJobs(batchId)[0];
    const service = new BatchService({ database, ffmpegService: {}, paths: {} });
    await service.commitDirectStockUsage({
      batchId,
      job,
      outputPath: path.join(root, 'output.mp4'),
      mediaPlan: {
        toleranceMs: 500,
        segments: [{
          filePath: stockPath,
          sourceTotalDurationMs: 10_000,
          sourceRangeStartMs: 0,
          sourceRangeEndMs: 10_000,
          durationMs: 10_000,
          playbackRate: 1,
          stockPassIndex: 1,
          stockPhase: 1,
          transform: {}
        }]
      },
      folders: { usedBatchFolder: usedFolder, reportFolder },
      callbacks: { onLog: () => {} },
      config: { moveUsedStock: true }
    });
    assert.equal(fs.existsSync(stockPath), true);
    await service.commitDirectStockUsage({
      batchId,
      job,
      outputPath: path.join(root, 'output-clone.mp4'),
      mediaPlan: {
        toleranceMs: 500,
        segments: [{
          filePath: stockPath,
          sourceTotalDurationMs: 10_000,
          sourceRangeStartMs: 0,
          sourceRangeEndMs: 10_000,
          durationMs: 10_000,
          playbackRate: 1,
          stockPassIndex: 2,
          stockPhase: 2,
          transform: { flip: true, scale: 1.1 }
        }]
      },
      folders: { usedBatchFolder: usedFolder, reportFolder },
      callbacks: { onLog: () => {} },
      config: { moveUsedStock: true }
    });
    const movedFiles = fs.readdirSync(usedFolder);
    assert.equal(fs.existsSync(stockPath), false);
    assert.equal(movedFiles.length, 1);
    assert.equal(database.listMatchedStockUsage(batchId)[0].action, 'FULLY_CONSUMED_MOVED');
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
