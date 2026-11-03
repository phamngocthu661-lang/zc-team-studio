'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RecoveryService, isTransientTempFile } = require('../src/main/services/recovery-service');
const { BatchService } = require('../src/main/services/batch-service');

test('startup recovery removes one-time render temp files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-recovery-cleanup-'));
  const temp = path.join(root, 'temp');
  fs.mkdirSync(temp, { recursive: true });
  for (const name of ['job.mp4', 'job-background.mov', 'job-render.srt', 'partial.tmp', 'partial.part']) {
    fs.writeFileSync(path.join(temp, name), 'temp');
  }
  fs.writeFileSync(path.join(temp, 'active-ffmpeg-processes.json'), '{}');
  fs.writeFileSync(path.join(temp, 'keep.txt'), 'keep');
  const service = new RecoveryService({ recoverInterruptedWork: () => ({ interruptedJobs: 0 }) }, { temp });

  try {
    const result = service.run();
    assert.equal(result.removedTemp, 5);
    assert.equal(fs.existsSync(path.join(temp, 'active-ffmpeg-processes.json')), true);
    assert.equal(fs.existsSync(path.join(temp, 'keep.txt')), true);
    assert.equal(isTransientTempFile('job.mp4'), true);
    assert.equal(isTransientTempFile('active-ffmpeg-processes.json'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('layer overlay cache pruning keeps newest/current cache under limit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-layer-prune-'));
  const cache = path.join(root, 'cache');
  const layerRoot = path.join(cache, 'layer-overlays');
  fs.mkdirSync(layerRoot, { recursive: true });
  const oldFile = path.join(layerRoot, 'old.mov');
  const midFile = path.join(layerRoot, 'mid.mov');
  const currentFile = path.join(layerRoot, 'current.mov');
  fs.writeFileSync(oldFile, Buffer.alloc(1024));
  fs.writeFileSync(midFile, Buffer.alloc(1024));
  fs.writeFileSync(currentFile, Buffer.alloc(1024));
  const now = Date.now() / 1000;
  fs.utimesSync(oldFile, now - 300, now - 300);
  fs.utimesSync(midFile, now - 200, now - 200);
  fs.utimesSync(currentFile, now - 100, now - 100);
  const service = new BatchService({ database: null, ffmpegService: {}, paths: { cache } });

  try {
    const result = service.pruneLayerOverlayCache({ keepPath: currentFile, maxBytes: 2048, callbacks: {} });
    assert.equal(result.removed, 1);
    assert.equal(fs.existsSync(oldFile), false);
    assert.equal(fs.existsSync(midFile), true);
    assert.equal(fs.existsSync(currentFile), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
