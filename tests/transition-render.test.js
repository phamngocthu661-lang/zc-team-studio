'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTransitionType, buildRenderArguments } = require('../src/main/services/render-planner');

test('Cross Dissolve maps to the FFmpeg dissolve transition', () => {
  assert.equal(normalizeTransitionType('Cross Dissolve'), 'dissolve');
  assert.equal(normalizeTransitionType('cross_dissolve'), 'dissolve');
  assert.equal(normalizeTransitionType('dissolve'), 'dissolve');
});

test('render graph contains xfade dissolve for Cross Dissolve', () => {
  const args = buildRenderArguments({
    segments: [
      { mediaType: 'VIDEO', filePath: 'a.mp4', trimStartMs: 0, durationMs: 5000 },
      { mediaType: 'VIDEO', filePath: 'b.mp4', trimStartMs: 0, durationMs: 5000, transitionIn: { type: 'Cross Dissolve', durationMs: 700 } }
    ],
    voicePath: 'voice.mp3', srtPath: null, outputPath: 'out.mp4', durationMs: 9300,
    config: { width: 1920, height: 1080, fps: 30, audioBitrateKbps: 128, layers: [] },
    videoBitrateKbps: 4000, encoder: 'libx264'
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /xfade=transition=dissolve:duration=0\.700/);
});

test('transition none uses concat hard cut without extra overlap', () => {
  const args = buildRenderArguments({
    segments: [
      { mediaType: 'VIDEO', filePath: 'a.mp4', trimStartMs: 0, durationMs: 5000 },
      { mediaType: 'VIDEO', filePath: 'b.mp4', trimStartMs: 0, durationMs: 4000, transitionIn: { type: 'none', durationMs: 0 } }
    ],
    voicePath: 'voice.mp3', srtPath: null, outputPath: 'out.mp4', durationMs: 9000,
    config: { width: 1920, height: 1080, fps: 30, audioBitrateKbps: 128, layers: [] },
    videoBitrateKbps: 4000, encoder: 'libx264'
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /concat=n=2:v=1:a=0/);
  assert.doesNotMatch(graph, /xfade=/);
});

test('video segment supports slow playback, flip, zoom and cover scaling', () => {
  const args = buildRenderArguments({
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      trimStartMs: 12000,
      durationMs: 8000,
      sourceDurationMs: 6000,
      playbackRate: 0.75,
      transform: { flip: true, scale: 1.1 },
      forceCover: true,
      sourceWidth: 1280,
      sourceHeight: 720,
      sourceFps: 30
    }],
    voicePath: 'voice.mp3', srtPath: null, outputPath: 'out.mp4', durationMs: 8000,
    config: { width: 1920, height: 1080, fps: 30, audioBitrateKbps: 128, layers: [] },
    videoBitrateKbps: 4000, encoder: 'libx264'
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /trim=start=12\.000:duration=6\.000/);
  assert.match(graph, /setpts=\(PTS-STARTPTS\)\/0\.750000/);
  assert.match(graph, /hflip,scale=2112:1188:force_original_aspect_ratio=increase,crop=1920:1080/);
});
