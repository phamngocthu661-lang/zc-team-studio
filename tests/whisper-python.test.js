'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const {
  WhisperSrtService,
  isSupportedWhisperPython,
  pythonCandidateScore,
  isCorruptWhisperModelError,
  whisperModelCacheFragments
} = require('../src/main/services/whisper-srt-service');

test('Whisper SRT chỉ dùng Python có wheel ổn định', () => {
  assert.equal(isSupportedWhisperPython({ major: 3, minor: 10 }), true);
  assert.equal(isSupportedWhisperPython({ major: 3, minor: 11 }), true);
  assert.equal(isSupportedWhisperPython({ major: 3, minor: 12 }), true);
  assert.equal(isSupportedWhisperPython({ major: 3, minor: 13 }), false);
  assert.equal(isSupportedWhisperPython({ major: 3, minor: 14 }), false);
});

test('Whisper SRT ưu tiên Python 3.11 hơn Python mới chưa ổn định', () => {
  assert.ok(pythonCandidateScore('C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python311\\python.exe') < pythonCandidateScore('C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python314\\python.exe'));
  assert.ok(pythonCandidateScore('C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe') < pythonCandidateScore('C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python314\\python.exe'));
});

test('Whisper SRT nhận diện model.bin hỏng để xóa cache và retry', () => {
  assert.equal(isCorruptWhisperModelError({ stderr: 'RuntimeError: Invalid string length in model.bin' }), true);
  assert.equal(isCorruptWhisperModelError({ stderr: 'CUDA out of memory' }), false);
  assert.ok(whisperModelCacheFragments('small').includes('faster-whisper-small'));
  assert.ok(whisperModelCacheFragments('Systran/faster-whisper-small').includes('systran--faster-whisper-small'));
});

test('Whisper SRT queue honors configured concurrency', async () => {
  const service = new WhisperSrtService({ paths: { cache: os.tmpdir() }, maxConcurrentGenerations: 1 });
  let active = 0;
  let peak = 0;
  service._generate = async ({ id }) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active -= 1;
    return id;
  };

  service.setConcurrency(3);
  const results = await Promise.all([0, 1, 2, 3, 4].map((id) => service.generate({ id })));
  assert.deepEqual(results.sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.equal(peak, 3);
});
