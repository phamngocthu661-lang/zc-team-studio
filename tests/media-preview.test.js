'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MediaPreviewService } = require('../src/main/services/media-preview-service');

function temporaryPaths() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-preview-'));
  return { root, thumbnails: path.join(root, 'thumbnails') };
}

test('media preview returns image source and metadata', async () => {
  const paths = temporaryPaths();
  const image = path.join(paths.root, 'image.png');
  fs.writeFileSync(image, 'fake image');
  const ffmpeg = { probe: async () => ({ width: 1920, height: 1080, durationMs: 0 }) };
  const service = new MediaPreviewService(ffmpeg, paths);
  const result = await service.create(image);
  assert.equal(result.previewPath, image);
  assert.equal(result.sourceType, 'IMAGE');
  assert.equal(result.metadata.width, 1920);
});

test('media preview extracts and caches one video frame', async () => {
  const paths = temporaryPaths();
  const video = path.join(paths.root, 'video.mp4');
  fs.writeFileSync(video, 'fake video');
  let calls = 0;
  const ffmpeg = {
    probe: async () => ({ width: 1280, height: 720, durationMs: 20_000 }),
    thumbnail: async (_input, output) => { calls += 1; fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, 'frame'); }
  };
  const service = new MediaPreviewService(ffmpeg, paths);
  const first = await service.create(video);
  const second = await service.create(video);
  assert.equal(first.sourceType, 'VIDEO');
  assert.equal(first.frameTimeSeconds, 2);
  assert.equal(first.previewPath, second.previewPath);
  assert.equal(calls, 1);
  assert.ok(fs.existsSync(first.previewPath));
});
