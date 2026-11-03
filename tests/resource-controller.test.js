'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  adaptiveWorkerCount,
  isAutoResourceConfig,
  recommendResourcePlan
} = require('../src/main/services/resource-controller');

const gpuSystem = {
  nvencRuntime: true,
  cudaAvailable: true,
  scaleCuda: true,
  selectedGpuIndex: 0,
  selectedGpuName: 'RTX 3060',
  gpus: [{
    index: 0,
    name: 'RTX 3060',
    memoryTotalMb: 12_288,
    memoryUsedMb: 0,
    h264NvencReady: true
  }]
};

test('resource controller profiles RTX 3060 automatically for throughput', () => {
  const plan = recommendResourcePlan({
    config: { backgroundMode: 'STOCK_VIDEO', performanceProfile: 'AUTO', maxParallelJobs: 'AUTO' },
    system: gpuSystem,
    host: { logicalCpuCount: 20, totalMemoryMb: 32_768, freeMemoryMb: 24_000 },
    jobCount: 10
  });

  assert.equal(plan.codec, 'h264_nvenc');
  assert.equal(plan.accelerationMode, 'AUTO_STABLE');
  assert.equal(plan.performanceProfile, 'MAX_SPEED');
  assert.equal(plan.initialWorkers, 2);
  assert.equal(plan.maxWorkers, 3);
  assert.ok(plan.reasons.includes('CUDA background prepass + CPU subtitle/layer + NVENC encode'));
});

test('resource controller falls back to CPU when NVENC is unavailable', () => {
  const plan = recommendResourcePlan({
    config: { backgroundMode: 'STOCK_VIDEO', performanceProfile: 'AUTO', maxParallelJobs: 'AUTO' },
    system: { gpus: [], selectedGpuIndex: -1 },
    host: { logicalCpuCount: 12, totalMemoryMb: 16_384, freeMemoryMb: 8_000 },
    jobCount: 4
  });

  assert.equal(plan.workload, 'CPU');
  assert.equal(plan.codec, 'libx264');
  assert.equal(plan.accelerationMode, 'CPU');
  assert.ok(plan.maxWorkers >= 1);
});

test('adaptive worker count backs off under pressure and grows after stable headroom', () => {
  const plan = { initialWorkers: 2, maxWorkers: 3 };
  const state = {};
  const pressure = { cpuUsagePercent: 96, freeMemoryPercent: 35, gpu: { memoryTotalMb: 12_288, memoryUsedMb: 4_000 } };
  assert.equal(adaptiveWorkerCount(plan, pressure, 3, state), 3);
  assert.equal(adaptiveWorkerCount(plan, pressure, 3, state), 2);

  const headroom = { cpuUsagePercent: 45, freeMemoryPercent: 55, gpu: {
    memoryTotalMb: 12_288,
    memoryUsedMb: 2_000,
    encoderUtilizationPercent: 30
  } };
  assert.equal(adaptiveWorkerCount(plan, headroom, 2, state), 2);
  assert.equal(adaptiveWorkerCount(plan, headroom, 2, state), 2);
  assert.equal(adaptiveWorkerCount(plan, headroom, 2, state), 3);
});

test('numeric worker setting stays manual', () => {
  assert.equal(isAutoResourceConfig({ maxParallelJobs: 2, performanceProfile: 'MAX_SPEED' }), false);
  assert.equal(isAutoResourceConfig({ maxParallelJobs: 'AUTO' }), true);
  assert.equal(isAutoResourceConfig({ performanceProfile: 'AUTO', maxParallelJobs: 2 }), true);
});
