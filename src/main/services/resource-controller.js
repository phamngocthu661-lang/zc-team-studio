'use strict';

const os = require('node:os');

const MAX_WORKERS = 8;
const DEFAULT_CPU_RESERVE = 2;
const DEFAULT_MEMORY_PER_WORKER_MB = 3000;

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function readHostSnapshot(state = {}) {
  const cpus = os.cpus();
  const current = cpus.reduce((total, cpu) => ({
    idle: total.idle + numberOr(cpu.times?.idle),
    total: total.total + Object.values(cpu.times || {}).reduce((sum, value) => sum + numberOr(value), 0)
  }), { idle: 0, total: 0 });
  let cpuUsagePercent = null;
  if (state.previousCpuTicks && current.total > state.previousCpuTicks.total) {
    const totalDelta = current.total - state.previousCpuTicks.total;
    const idleDelta = Math.max(0, current.idle - state.previousCpuTicks.idle);
    cpuUsagePercent = round(clamp((1 - idleDelta / totalDelta) * 100, 0, 100), 1);
  }
  state.previousCpuTicks = current;

  const totalMemoryMb = Math.max(1, Math.round(os.totalmem() / 1024 / 1024));
  const freeMemoryMb = Math.max(0, Math.round(os.freemem() / 1024 / 1024));
  return {
    logicalCpuCount: Math.max(1, cpus.length),
    totalMemoryMb,
    freeMemoryMb,
    freeMemoryPercent: round((freeMemoryMb / totalMemoryMb) * 100, 1),
    cpuUsagePercent,
    sampledAt: Date.now(),
    platform: process.platform
  };
}

function selectedGpuInfo(system = {}, requestedGpuIndex = -1) {
  const gpus = Array.isArray(system.gpus) ? system.gpus : [];
  const requested = numberOr(requestedGpuIndex, -1);
  const selectedIndex = requested >= 0
    ? requested
    : numberOr(system.selectedGpuIndex, gpus[0]?.index ?? -1);
  const gpu = gpus.find((item) => numberOr(item.index, -1) === selectedIndex) ||
    (selectedIndex >= 0 ? gpus[0] : null);
  return {
    index: gpu ? numberOr(gpu.index, selectedIndex) : selectedIndex,
    name: gpu?.name || system.selectedGpuName || '',
    memoryTotalMb: Math.max(0, numberOr(gpu?.memoryTotalMb ?? gpu?.memory_total_mb)),
    memoryUsedMb: Math.max(0, numberOr(gpu?.memoryUsedMb ?? gpu?.memory_used_mb)),
    utilizationPercent: clamp(numberOr(gpu?.utilizationPercent ?? gpu?.utilization_percent), 0, 100),
    encoderUtilizationPercent: clamp(numberOr(gpu?.encoderUtilizationPercent ?? gpu?.encoder_utilization_percent), 0, 100),
    ready: Boolean(gpu?.h264NvencReady || gpu?.h264NvencRuntime || gpu?.h264Nvenc || system.nvencRuntime || system.h264Nvenc)
  };
}

function hasLayerType(config = {}, types) {
  const wanted = new Set(types);
  return (Array.isArray(config.layers) ? config.layers : []).some((layer) => {
    const type = String(layer?.type || layer?.layerType || layer?.layer_type || '').toUpperCase();
    return wanted.has(type) && layer.visible !== false && layer.visible !== 0;
  });
}

function isPascalGtx10(system = {}) {
  return /\bGTX\s*10(?:50|60|70|80|80\s*Ti)\b/i.test(String(system.selectedGpuName || ''));
}

function classifyWorkload(config = {}, system = {}) {
  const requestedAcceleration = String(config.accelerationMode || 'AUTO_STABLE').toUpperCase();
  const hasNvenc = Boolean(system.nvencRuntime || system.h264NvencRuntime || system.h264Nvenc || system.nvencPotential);
  if (requestedAcceleration === 'CPU' || !hasNvenc) return 'CPU';
  if (
    ['FULL_CUDA', 'FULL_GPU_ZERO_COPY'].includes(requestedAcceleration) &&
    system.cudaAvailable &&
    system.scaleCuda &&
    (requestedAcceleration === 'FULL_CUDA'
      ? system.overlayCuda
      : system.overlayCuda || !hasLayerType(config, [
          'IMAGE', 'VIDEO', 'GREENSCREEN_IMAGE', 'GREENSCREEN_VIDEO', 'OVERLAY_IMAGE', 'OVERLAY_VIDEO', 'LOGO'
        ]))
  ) {
    return 'CUDA';
  }

  const compositionLayers = [
    'IMAGE',
    'VIDEO',
    'VOICE_IMAGE',
    'GREENSCREEN_IMAGE',
    'GREENSCREEN_VIDEO',
    'OVERLAY_IMAGE',
    'OVERLAY_VIDEO',
    'LOGO'
  ];
  const hasComposition = hasLayerType(config, compositionLayers) ||
    ['STOCK_VIDEO', 'IMAGE_SEQUENCE', 'MANUAL_MEDIA', 'SINGLE_STOCK', 'MATCHED_STOCK'].includes(
      String(config.backgroundMode || '').toUpperCase()
    ) ||
    Boolean(config.srtPath || config.singleSrtPath || config.subtitle);
  return hasComposition ? 'HYBRID_NVENC' : 'NVENC';
}

function isAutoResourceConfig(config = {}) {
  const workers = config.maxParallelJobs;
  const profile = String(config.performanceProfile || '').toUpperCase();
  const acceleration = String(config.accelerationMode || '').toUpperCase();
  return Boolean(config.autoResourceMode) ||
    String(workers || '').toUpperCase() === 'AUTO' ||
    (workers === undefined || workers === null || !Number.isFinite(Number(workers))) ||
    profile === 'AUTO' ||
    acceleration === 'AUTO';
}

function gpuWorkerCapacity(workload, gpu) {
  if (!gpu.ready || !gpu.memoryTotalMb) return workload === 'CPU' ? MAX_WORKERS : 1;
  if (gpu.memoryTotalMb >= 16_000) return 4;
  if (gpu.memoryTotalMb >= 12_000) return 3;
  if (gpu.memoryTotalMb >= 8_000) return 2;
  return 1;
}

function recommendResourcePlan({ config = {}, system = {}, host = null, jobCount = 1 } = {}) {
  const resources = host || system.resources || readHostSnapshot({});
  const workload = classifyWorkload(config, system);
  const gpu = selectedGpuInfo(system, config.gpuIndex);
  const logicalCpuCount = Math.max(1, numberOr(resources.logicalCpuCount, os.cpus().length));
  const cpuReserve = logicalCpuCount >= 8 ? DEFAULT_CPU_RESERVE : 1;
  const cpuBudget = Math.max(1, logicalCpuCount - cpuReserve);
  const cpuCostPerWorker = workload === 'CPU' ? 4 : workload === 'CUDA' ? 3 : 4;
  const cpuCapacity = Math.max(1, Math.floor(cpuBudget / cpuCostPerWorker));
  const gpuCapacity = gpuWorkerCapacity(workload, gpu);
  const freeMemoryMb = Math.max(512, numberOr(resources.freeMemoryMb, Math.round(os.freemem() / 1024 / 1024)));
  const memoryPerWorkerMb = workload === 'CPU' ? 2200 : DEFAULT_MEMORY_PER_WORKER_MB;
  const memoryCapacity = Math.max(1, Math.floor(freeMemoryMb / memoryPerWorkerMb));
  const availableJobs = Math.max(1, Math.round(numberOr(jobCount, 1)));
  const maxWorkers = clamp(
    Math.min(MAX_WORKERS, availableJobs, cpuCapacity, gpuCapacity, memoryCapacity),
    1,
    MAX_WORKERS
  );
  const initialWorkers = Math.min(maxWorkers, workload === 'CPU' ? 2 : 2);
  const filterComplexThreads = clamp(
    Math.floor(cpuBudget / Math.max(1, initialWorkers)),
    2,
    8
  );
  const requestedProfile = String(config.performanceProfile || 'AUTO').toUpperCase();
  const performanceProfile = requestedProfile === 'AUTO' ? 'MAX_SPEED' : requestedProfile;
  const requestedAcceleration = String(config.accelerationMode || 'AUTO_STABLE').toUpperCase();
  const accelerationMode = ['AUTO', 'AUTO_STABLE', ''].includes(requestedAcceleration)
    ? (gpu.ready ? 'AUTO_STABLE' : 'CPU')
    : requestedAcceleration;
  const codec = String(config.codec || 'auto').toLowerCase() === 'auto'
    ? (gpu.ready ? 'h264_nvenc' : 'libx264')
    : config.codec;
  const reasons = [
    `${logicalCpuCount} logical CPU`,
    `${freeMemoryMb} MB RAM free`,
    gpu.ready
      ? `${gpu.name || 'NVIDIA GPU'} ${gpu.memoryTotalMb || 0} MB VRAM`
      : 'NVENC unavailable'
  ];
  if (workload === 'HYBRID_NVENC') {
    const cudaPrepass = Boolean(
      system.cudaAvailable &&
      system.scaleCuda &&
      config.stagedBackgroundCuda !== false &&
      !isPascalGtx10(system)
    );
    reasons.push(cudaPrepass
      ? 'CUDA background prepass + CPU subtitle/layer + NVENC encode'
      : 'CPU composition + NVENC encode');
  }
  if (workload === 'CUDA') reasons.push('CUDA filter pipeline available');

  return {
    mode: 'AUTO',
    workload,
    gpuIndex: gpu.ready ? gpu.index : -1,
    codec,
    accelerationMode,
    performanceProfile,
    filterComplexThreads,
    maxComplexFilterThreads: clamp(Math.min(4, filterComplexThreads), 2, 4),
    workers: initialWorkers,
    initialWorkers,
    maxWorkers,
    cpuReserve,
    host: {
      logicalCpuCount,
      totalMemoryMb: Math.max(1, numberOr(resources.totalMemoryMb, 0)),
      freeMemoryMb
    },
    gpu,
    reasons
  };
}

function adaptiveWorkerCount(plan, snapshot, currentWorkers, state = {}) {
  const current = clamp(Math.round(numberOr(currentWorkers, plan?.initialWorkers || 1)), 1, plan?.maxWorkers || 1);
  if (!plan || (current >= Math.max(1, plan.maxWorkers || 1) && current <= 1)) return current;
  const cpu = numberOr(snapshot?.cpuUsagePercent, NaN);
  const freeMemory = numberOr(snapshot?.freeMemoryPercent, NaN);
  const gpu = snapshot?.gpu || null;
  const gpuEncoder = numberOr(gpu?.encoderUtilizationPercent, NaN);
  const gpuMemory = gpu?.memoryTotalMb
    ? (numberOr(gpu.memoryUsedMb) / Math.max(1, numberOr(gpu.memoryTotalMb))) * 100
    : NaN;

  // Ngưỡng áp lực cao: CPU >= 85% hoặc RAM <= 12% hoặc GPU Encoder >= 88%
  const highPressure = (Number.isFinite(cpu) && cpu >= 85) ||
    (Number.isFinite(freeMemory) && freeMemory <= 12) ||
    (Number.isFinite(gpuEncoder) && gpuEncoder >= 88) ||
    (Number.isFinite(gpuMemory) && gpuMemory >= 88);

  // Ngưỡng tải thấp an toàn để nâng thêm worker: CPU <= 68% và GPU Encoder <= 65%
  const lowPressure = (!Number.isFinite(cpu) || cpu <= 68) &&
    (!Number.isFinite(freeMemory) || freeMemory >= 25) &&
    (!Number.isFinite(gpuEncoder) || gpuEncoder <= 65) &&
    (!Number.isFinite(gpuMemory) || gpuMemory <= 72);

  const now = Date.now();
  const warmUpGraceMs = Number(plan?.warmUpGraceMs ?? state?.warmUpGraceMs ?? 0);
  const inWarmUp = warmUpGraceMs > 0 && (now - (state.lastScaleUpAt || 0)) < warmUpGraceMs;

  if (highPressure) {
    state.highPressureSamples = numberOr(state.highPressureSamples) + 1;
    state.lowPressureSamples = 0;
    if (state.highPressureSamples >= 2) {
      state.highPressureSamples = 0;
      return Math.max(1, current - 1);
    }
  } else if (lowPressure && !inWarmUp) {
    state.lowPressureSamples = numberOr(state.lowPressureSamples) + 1;
    state.highPressureSamples = 0;
    const requiredLowSamples = Number(plan?.minLowPressureSamples ?? 3);
    if (state.lowPressureSamples >= requiredLowSamples) {
      state.lowPressureSamples = 0;
      state.lastScaleUpAt = now;
      return Math.min(Math.max(1, plan.maxWorkers || current), current + 1);
    }
  } else {
    state.highPressureSamples = 0;
    if (inWarmUp) state.lowPressureSamples = 0;
  }
  return current;
}

class ResourceController {
  constructor(ffmpeg) {
    this.ffmpeg = ffmpeg || null;
    this.hostState = {};
    this.adaptiveState = {};
  }

  isAuto(config) {
    return isAutoResourceConfig(config);
  }

  snapshot() {
    return readHostSnapshot(this.hostState);
  }

  async sample(gpuIndex = -1) {
    const host = this.snapshot();
    let gpu = null;
    if (this.ffmpeg && typeof this.ffmpeg.sampleNvidiaGpu === 'function') {
      try {
        gpu = await this.ffmpeg.sampleNvidiaGpu(Number(gpuIndex ?? -1));
      } catch {
        gpu = null;
      }
    }
    return { ...host, gpu };
  }

  recommend(args = {}) {
    return recommendResourcePlan(args);
  }

  nextWorkers(plan, snapshot, currentWorkers) {
    return adaptiveWorkerCount(plan, snapshot, currentWorkers, this.adaptiveState);
  }
}

module.exports = {
  MAX_WORKERS,
  readHostSnapshot,
  classifyWorkload,
  isAutoResourceConfig,
  recommendResourcePlan,
  adaptiveWorkerCount,
  ResourceController
};
