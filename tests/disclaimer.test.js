'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDisclaimerConcatArguments,
  buildPrefixConcatArguments
} = require('../src/main/services/render-planner');
const {
  effectiveDisclaimerDurationMs,
  normalizeDisclaimerType,
  resolveBundledDisclaimerPath
} = require('../src/main/services/batch-service');

test('Disclaimer được giới hạn tối đa 60 giây', () => {
  assert.equal(effectiveDisclaimerDurationMs({ durationMs: 2415 }), 2415);
  assert.equal(effectiveDisclaimerDurationMs({ durationMs: 4200 }), 4200);
  assert.equal(effectiveDisclaimerDurationMs({ durationMs: 75000 }), 60000);
  assert.equal(effectiveDisclaimerDurationMs({ durationMs: 0 }), 0);
});

test('ứng dụng tìm thấy Disclaimer được đóng gói trong resources', () => {
  assert.match(resolveBundledDisclaimerPath(), /resources[\\/]disclaimer[\\/]dis\.mp4$/i);
});

test('ứng dụng tìm thấy Disclaimer loại 2 được đóng gói trong resources', () => {
  assert.equal(normalizeDisclaimerType('TYPE_2'), 'TYPE_2');
  assert.equal(normalizeDisclaimerType('khong-co'), 'TYPE_1');
  assert.match(resolveBundledDisclaimerPath('TYPE_2'), /resources[\\/]disclaimer[\\/]dis-type2\.mp4$/i);
});

test('lệnh ghép Disclaimer giữ canvas 1920x1080 và audio', () => {
  const args = buildDisclaimerConcatArguments({
    disclaimerPath: 'disclaimer.mp4',
    inputPath: 'render.mp4',
    outputPath: 'final.mp4',
    disclaimerDurationMs: 2415,
    disclaimerHasAudio: true,
    width: 1920,
    height: 1080,
    fps: 30,
    encoder: 'libx264',
    config: { audioBitrateKbps: 128 }
  });
  const command = args.join(' ');
  assert.match(command, /concat=n=2:v=1:a=1/);
  assert.match(command, /scale=1920:1080/);
  assert.match(command, /-map \[aout\]/);
  assert.match(command, /-r 30/);
});

test('lệnh ghép Disclaimer không có audio tự tạo silence', () => {
  const args = buildDisclaimerConcatArguments({
    disclaimerPath: 'disclaimer.mp4',
    inputPath: 'render.mp4',
    outputPath: 'final.mp4',
    disclaimerDurationMs: 2500,
    disclaimerHasAudio: false,
    encoder: 'libx264'
  });
  const command = args.join(' ');
  assert.match(command, /anullsrc=channel_layout=stereo:sample_rate=48000/);
  assert.match(command, /\[2:a\]/);
});

test('video riêng được ghép sau Disclaimer và trước video chính', () => {
  const args = buildPrefixConcatArguments({
    prefixes: [
      { filePath: 'disclaimer.mp4', durationMs: 2415, hasAudio: true },
      { filePath: 'intro.mp4', durationMs: 1800, hasAudio: false }
    ],
    inputPath: 'render.mp4',
    outputPath: 'final.mp4',
    encoder: 'libx264'
  });
  const command = args.join(' ');
  assert.match(command, /concat=n=3:v=1:a=1/);
  assert.match(command, /anullsrc=channel_layout=stereo:sample_rate=48000/);
  assert.match(command, /\[3:a\]/);
});

test('nhiều video intro có thể mờ dần và tắt tiếng intro', () => {
  const args = buildPrefixConcatArguments({
    prefixes: [
      { filePath: 'disclaimer.mp4', durationMs: 3000, hasAudio: true },
      { filePath: '0002_1.mp4', durationMs: 2500, hasAudio: false },
      { filePath: '0002_2.mp4', durationMs: 2500, hasAudio: false }
    ],
    inputPath: 'render.mp4',
    outputPath: 'final.mp4',
    encoder: 'libx264',
    config: { jobIntroTransition: 'FADE', jobIntroTransitionMs: 600 }
  });
  const command = args.join(' ');
  assert.match(command, /xfade=transition=fade:duration=0\.600/);
  assert.match(command, /acrossfade=d=0\.600/);
  assert.match(command, /anullsrc=channel_layout=stereo:sample_rate=48000/);
  assert.doesNotMatch(command, /concat=n=4:v=1:a=1/);
});

test('layer noise chỉ phủ lên intro được cấu hình, không tự phủ disclaimer', () => {
  const args = buildPrefixConcatArguments({
    prefixes: [
      { filePath: 'disclaimer.mp4', durationMs: 3000, hasAudio: true },
      { filePath: '0002_1.mp4', durationMs: 2500, hasAudio: false, noiseOverlayPath: 'noise.mov' }
    ],
    inputPath: 'render.mp4',
    outputPath: 'final.mp4',
    encoder: 'libx264'
  });
  const command = args.join(' ');
  assert.match(command, /noise\.mov/);
  assert.match(command, /\[vprefixbase1\]\[noiseprefix1\]overlay=x=0:y=0/);
  assert.doesNotMatch(command, /\[vprefixbase0\]\[noiseprefix0\]/);
});
