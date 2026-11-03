'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runProcess, parseGpuCsv } = require('../src/main/services/ffmpeg');

test('nvidia-smi CSV is parsed for automatic GPU selection', () => {
  const gpus = parseGpuCsv([
    '0, NVIDIA GeForce GTX 1060 6GB, 581.15, 6144, 5020, 13',
    '1, NVIDIA GeForce RTX 3060, 581.15, 12288, 11000, 2'
  ].join('\n'));
  assert.equal(gpus.length, 2);
  assert.equal(gpus[0].name, 'NVIDIA GeForce GTX 1060 6GB');
  assert.equal(gpus[1].memoryFreeMb, 11000);
});

test('cancelled FFmpeg-like child is reported as ABORTED instead of SIGTERM failure', async () => {
  const controller = new AbortController();
  const promise = runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    signal: controller.signal
  });
  setTimeout(() => controller.abort(), 80);
  await assert.rejects(promise, (error) => error.code === 'ABORTED');
});
