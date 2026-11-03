'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRenderArguments, performanceSettings } = require('../src/main/services/render-planner');

function baseConfig(profile = 'MAX_SPEED') {
  return {
    width: 1920,
    height: 1080,
    fps: 30,
    performanceProfile: profile,
    filterComplexThreads: 7,
    audioBitrateKbps: 128,
    layers: [],
    subtitle: { fontFamily: 'Arial', fontSize: 52 }
  };
}

function argsFor(profile) {
  return buildRenderArguments({
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      durationMs: 10_000,
      trimStartMs: 0
    }],
    voicePath: 'voice.mp3',
    srtPath: 'sub.srt',
    outputPath: 'out.mp4',
    durationMs: 10_000,
    config: baseConfig(profile),
    videoBitrateKbps: 4000,
    encoder: 'h264_nvenc',
    acceleration: { mode: 'CUDA', gpuIndex: 0 }
  });
}

test('MAX_SPEED uses P1 single-pass low-latency settings and bounded CUDA buffers', () => {
  const args = argsFor('MAX_SPEED');
  const text = args.join(' ');
  assert.match(text, /-filter_complex_threads 4/);
  assert.match(text, /-extra_hw_frames 8/);
  assert.match(text, /-preset p1/);
  assert.match(text, /-tune ll/);
  assert.match(text, /-multipass disabled/);
  assert.match(text, /-rc-lookahead 0/);
  assert.match(text, /-bf 0/);
  assert.match(text, /-surfaces 16/);
  assert.doesNotMatch(text, /\+faststart/);
});

test('BALANCED and QUALITY retain progressively higher quality settings', () => {
  const balanced = performanceSettings(baseConfig('BALANCED'));
  const quality = performanceSettings(baseConfig('QUALITY'));
  assert.equal(balanced.preset, 'p3');
  assert.equal(quality.preset, 'p5');
  assert.equal(quality.lookahead, 16);
  assert.equal(quality.multipass, 'qres');
});
