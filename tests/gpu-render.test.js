'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRenderArguments,
  buildFullGpuRenderArguments,
  buildRenderPlan,
  rebuildWithoutCuda,
  rebuildConservativeNvenc,
  rebuildWithCpu,
  chooseEncoder,
  chooseAcceleration,
  isCudaPipelineError,
  isFfmpegProcessCrash,
  isNvencInitError,
  isPascalGtx10,
  buildStagedRenderPlan,
  subtitleStyle,
  buildLayerCacheArguments,
  normalizeLayers,
  effectiveFilterComplexThreads
} = require('../src/main/services/render-planner');

const segments = [
  { mediaType: 'VIDEO', filePath: 'stock-a.mp4', trimStartMs: 0, durationMs: 5000 },
  {
    mediaType: 'VIDEO', filePath: 'stock-b.mp4', trimStartMs: 0, durationMs: 5000,
    transitionIn: { type: 'Cross Dissolve', durationMs: 700 }
  }
];

const config = {
  width: 1920,
  height: 1080,
  fps: 30,
  audioBitrateKbps: 128,
  codec: 'h264_nvenc',
  accelerationMode: 'AUTO_STABLE',
  gpuIndex: -1,
  nvencPreset: 'p1',
  layers: []
};

const gpuSystem = {
  h264Nvenc: true,
  hevcNvenc: true,
  h264NvencRuntime: true,
  nvencRuntime: true,
  nvencPotential: true,
  cudaAvailable: true,
  scaleCuda: true,
  overlayCuda: true,
  selectedGpuIndex: 1
};

test('FULL_CUDA arguments remain available only when explicitly requested', () => {
  const args = buildRenderArguments({
    segments,
    voicePath: 'voice.mp3',
    srtPath: null,
    outputPath: 'out.mp4',
    durationMs: 9300,
    config: { ...config, accelerationMode: 'FULL_CUDA', gpuIndex: 1 },
    videoBitrateKbps: 4000,
    encoder: 'h264_nvenc',
    acceleration: { mode: 'CUDA', gpuIndex: 1 }
  });
  const joined = args.join(' ');
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(joined, /-init_hw_device cuda=gpu:1 -filter_hw_device gpu/);
  assert.match(joined, /-hwaccel cuda -hwaccel_device 1 -hwaccel_output_format cuda/);
  assert.match(graph, /scale_cuda=1920:1080/);
  assert.match(joined, /-c:v h264_nvenc -gpu 1 -preset p1/);
});

test('FULL_GPU_ZERO_COPY uses a separate strict CUDA graph, P1/LL and AAC stream copy', () => {
  const strictConfig = {
    ...config,
    accelerationMode: 'FULL_GPU_ZERO_COPY',
    performanceProfile: 'QUALITY',
    voiceAudioCodec: 'aac',
    voiceAudioSampleRate: 48000
  };
  const plan = buildRenderPlan({
    job: { id: 'full-gpu', voiceDurationMs: 5000, voicePath: 'voice.m4a', srtPath: null },
    segments: [{
      mediaType: 'VIDEO', filePath: 'stock.mp4', trimStartMs: 0, durationMs: 5000,
      sourceWidth: 1920, sourceHeight: 1080, sourceFps: 30
    }],
    config: strictConfig,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const joined = plan.args.join(' ');
  const graph = plan.args[plan.args.indexOf('-filter_complex') + 1];
  assert.equal(plan.acceleration.mode, 'CUDA_ZERO_COPY');
  assert.equal(plan.performance.preset, 'p1');
  assert.equal(plan.videoBitrateKbps, 4500);
  assert.match(joined, /-hwaccel cuda -hwaccel_device 1 -hwaccel_output_format cuda/);
  assert.match(joined, /-preset p1/);
  assert.match(joined, /-tune ll/);
  assert.match(joined, /-c:a copy/);
  assert.match(graph, /scale_cuda=1920:1080/);
  assert.doesNotMatch(graph, /hwdownload|subtitles=|\bscale=/);
});

test('FULL_GPU_ZERO_COPY uses overlay_cuda for compatible opaque layers', () => {
  const args = buildFullGpuRenderArguments({
    segments: [{ mediaType: 'VIDEO', filePath: 'stock.mp4', trimStartMs: 0, durationMs: 5000 }],
    voicePath: 'voice.mp3',
    srtPath: null,
    outputPath: 'out.mp4',
    durationMs: 5000,
    config: {
      ...config,
      accelerationMode: 'FULL_GPU_ZERO_COPY',
      layers: [{
        id: 'opaque-logo', type: 'LOGO', sourceReference: 'logo.jpg', visible: true,
        transform: { x: 20, y: 20, width: 320, height: 180, opacity: 1, rotation: 0 },
        effect: { blendMode: 'normal' }
      }]
    },
    videoBitrateKbps: 4500,
    encoder: 'h264_nvenc',
    acceleration: { mode: 'CUDA_ZERO_COPY', gpuIndex: 1 }
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /hwupload_cuda/);
  assert.match(graph, /overlay_cuda=x=20:y=20/);
  assert.doesNotMatch(graph, /hwdownload|\boverlay=/);
});

test('FULL_GPU_ZERO_COPY rejects CPU-only filters instead of silently changing pipeline', () => {
  assert.throws(() => buildRenderPlan({
    job: { id: 'strict-reject', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments,
    config: {
      ...config,
      accelerationMode: 'FULL_GPU_ZERO_COPY',
      layers: [{
        id: 'alpha-logo', type: 'LOGO', sourceReference: 'logo.png', visible: true,
        transform: { x: 0, y: 0, width: 320, height: 180, opacity: 1, rotation: 0 }
      }]
    },
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  }), (error) => {
    assert.equal(error.code, 'FULL_GPU_UNSUPPORTED');
    assert.match(error.message, /subtitle|transition|alpha/i);
    return true;
  });
});

test('AUTO_STABLE selects detected GPU and NVENC-only for complex timelines', () => {
  const plan = buildRenderPlan({
    job: { id: 'job-1', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments,
    config,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  assert.equal(plan.encoder, 'h264_nvenc');
  assert.equal(plan.acceleration.mode, 'NVENC_ONLY');
  assert.equal(plan.acceleration.gpuIndex, 1);
  assert.doesNotMatch(plan.args.join(' '), /-hwaccel cuda/);
  assert.match(plan.args.join(' '), /-c:v h264_nvenc -gpu 1/);
});

test('AUTO_STABLE moves plain video timelines to CUDA decode/scale when no CPU visual pass is needed', () => {
  const plan = buildRenderPlan({
    job: { id: 'plain-video', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: null },
    segments,
    config,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const joined = plan.args.join(' ');
  const graph = plan.args[plan.args.indexOf('-filter_complex') + 1];
  assert.equal(plan.encoder, 'h264_nvenc');
  assert.equal(plan.acceleration.mode, 'CUDA');
  assert.match(plan.gpuAcceleration, /CUDA decode\/scale \+ NVENC/);
  assert.match(joined, /-init_hw_device cuda=gpu:1 -filter_hw_device gpu/);
  assert.match(joined, /-hwaccel cuda -hwaccel_device 1 -hwaccel_output_format cuda/);
  assert.match(graph, /scale_cuda=1920:1080/);
});

test('explicit FULL_CUDA can select CUDA and fallback keeps NVENC', () => {
  const cudaConfig = { ...config, accelerationMode: 'FULL_CUDA', gpuIndex: 1 };
  assert.equal(chooseAcceleration(gpuSystem, cudaConfig, 'h264_nvenc').mode, 'CUDA');
  const plan = buildRenderPlan({
    job: { id: 'job-1', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: null },
    segments,
    config: cudaConfig,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const fallback = rebuildWithoutCuda(plan);
  assert.equal(fallback.acceleration.mode, 'NVENC_ONLY');
  assert.doesNotMatch(fallback.args.join(' '), /-hwaccel cuda/);
  assert.match(fallback.args.join(' '), /-c:v h264_nvenc/);
});

test('transient runtime failure is allowed when NVENC hardware is detected', () => {
  assert.equal(
    chooseEncoder({ h264Nvenc: true, nvencRuntime: false, nvencPotential: true }, 'h264_nvenc'),
    'h264_nvenc'
  );
  assert.throws(
    () => chooseEncoder({ h264Nvenc: false, nvencPotential: false }, 'h264_nvenc'),
    /chưa sẵn sàng/
  );
  assert.equal(chooseEncoder({ h264Nvenc: false }, 'auto'), 'libx264');
});

test('NVENC recovery plans provide conservative GPU and CPU fallback', () => {
  const plan = buildRenderPlan({
    job: { id: 'job-1', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments,
    config,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const safe = rebuildConservativeNvenc(plan);
  assert.equal(safe.nvencCompatibilityMode, true);
  assert.equal(safe.config.nvencPreset, 'p2');
  assert.doesNotMatch(safe.args.join(' '), /-multipass/);
  const cpu = rebuildWithCpu(safe);
  assert.equal(cpu.encoder, 'libx264');
  assert.match(cpu.args.join(' '), /-c:v libx264/);
});

test('CUDA and NVENC initialization errors are classified separately', () => {
  assert.equal(isCudaPipelineError({ stderr: 'cuvidCreateDecoder failed CUDA_ERROR_INVALID_VALUE' }), true);
  assert.equal(isNvencInitError({ stderr: 'OpenEncodeSessionEx failed: no NVENC capable devices' }), true);
  assert.equal(isNvencInitError({
    code: 4294967295,
    stderr: 'Stream #0:0: Video: h264 (Main)\nencoder         : Lavc62.28.100 h264_nvenc'
  }), true);
  assert.equal(isFfmpegProcessCrash({ code: 3221225477 }), true);
  assert.equal(isFfmpegProcessCrash({ code: -1073741819 }), true);
  assert.equal(isNvencInitError({ stderr: 'No such file or directory' }), false);
});

test('auto mode detects GTX 1060 as Pascal compatibility target',()=>{
  assert.equal(isPascalGtx10({selectedGpuName:'NVIDIA GeForce GTX 1060 6GB'}),true);
  const plan=buildRenderPlan({job:{id:'single',voiceDurationMs:5000,voicePath:'voice.mp3',srtPath:'sub.srt'},segments:[{mediaType:'VIDEO',filePath:'stock.mp4',trimStartMs:0,durationMs:5000,sourceWidth:1920,sourceHeight:1080,sourceFps:30,preCutSingleStock:true}],config:{...config,codec:'auto',gpuIndex:-1},system:{...gpuSystem,selectedGpuName:'NVIDIA GeForce GTX 1060 6GB'},outputPath:'final.mp4',tempOutputPath:'temp.mp4',logPath:'render.log'});
  assert.equal(plan.encoder,'h264_nvenc');
  assert.equal(plan.config.nvencCompatibilityMode,true);
  assert.equal(plan.performance.preset,'p2');
  assert.doesNotMatch(plan.args.join(' '),/-multipass/);
  assert.doesNotMatch(plan.args[plan.args.indexOf('-filter_complex')+1],/xfade=/);
});

test('single pre-cut stock with subtitles uses CUDA background prepass on modern GPUs', () => {
  const plan = buildRenderPlan({
    job: { id: 'single', voiceDurationMs: 5000, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      trimStartMs: 0,
      durationMs: 5000,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30,
      preCutSingleStock: true
    }],
    config,
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.staged, true);
  assert.equal(staged.stages.background.acceleration.mode, 'CUDA');
  assert.match(staged.stages.background.args.join(' '), /-hwaccel cuda/);
  assert.match(staged.stages.background.args[staged.stages.background.args.indexOf('-filter_complex') + 1], /scale_cuda=1920:1080/);
  assert.match(staged.stages.visual.args[staged.stages.visual.args.indexOf('-filter_complex') + 1], /subtitles=/);
  assert.match(staged.stages.visual.args.join(' '), /-i base-visual\.mp4|-i base\.mp4/);
});

test('GTX 1060 disables CUDA background prepass when staged is needed', () => {
  const plan = buildRenderPlan({
    job: { id: 'job-gtx', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments,
    config: { ...config, codec: 'auto' },
    system: { ...gpuSystem, selectedGpuName: 'NVIDIA GeForce GTX 1060 6GB' },
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.staged, true);
  assert.equal(staged.stages.background.acceleration.mode, 'NVENC_ONLY');
  assert.doesNotMatch(staged.stages.background.args.join(' '), /-hwaccel cuda/);
});

test('layer cache command renders alpha overlay with keyed green and opacity', () => {
  const args = buildLayerCacheArguments({
    layers: [{
      id: 'green',
      type: 'GREENSCREEN_VIDEO',
      sourceReference: 'green.mp4',
      transform: { x: 100, y: 80, width: 400, height: 220, opacity: 0.65 },
      effect: { keyColors: ['0x3DAB47', '0x00FF00', '0x55B757'], similarity: 0.25, softness: 0.08 }
    }],
    outputPath: 'layer-cache.mov',
    durationMs: 60000,
    config
  });
  const joined = args.join(' ');
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(joined, /color=c=black@0\.0:s=1920x1080:r=30:d=60\.000,format=rgba/);
  assert.match(graph, /chromakey=0x00FF00:0\.25:0\.08,despill=type=green:mix=0\.45:expand=0\.02/);
  assert.doesNotMatch(graph, /chromakey=0x3DAB47:0\.25:0\.08,chromakey=0x00FF00/);
  assert.match(graph, /colorchannelmixer=aa=0\.65/);
  assert.match(joined, /-c:v qtrle -pix_fmt argb/);
});

test('layer cache video sources can use CUDA decode before lossless alpha compositing', () => {
  const args = buildLayerCacheArguments({
    layers: [{
      id: 'green-video',
      type: 'GREENSCREEN_VIDEO',
      sourceReference: 'green.mp4',
      transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 },
      effect: { similarity: 0.22, softness: 0.07 }
    }],
    outputPath: 'layer-cache.mov',
    durationMs: 60000,
    config,
    acceleration: { mode: 'CUDA', gpuIndex: 1, label: 'CUDA layer cache' }
  });
  const joined = args.join(' ');
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(joined, /-init_hw_device cuda=gpu:1 -filter_hw_device gpu/);
  assert.match(joined, /-hwaccel cuda -hwaccel_device 1 -hwaccel_output_format cuda/);
  assert.match(graph, /hwdownload,format=nv12,trim=duration=60\.000,setpts=PTS-STARTPTS,fps=30,format=rgba/);
  assert.match(joined, /-c:v qtrle -pix_fmt argb/);
});

test('green screen key accepts custom key color for blue or nonstandard screens', () => {
  const args = buildLayerCacheArguments({
    layers: [{
      id: 'blue-key',
      type: 'GREENSCREEN_IMAGE',
      sourceReference: 'blue.png',
      transform: { x: 0, y: 0, width: 400, height: 220, opacity: 1 },
      effect: { keyColor: '#1188cc', similarity: 0.2, softness: 0.04 }
    }],
    outputPath: 'layer-cache.mov',
    durationMs: 60000,
    config
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /format=rgba,scale=400:220:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=400:220:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0,setsar=1,format=rgba,chromakey=0x1188CC:0\.2:0\.04,despill=type=blue:mix=0\.45:expand=0\.02/);
});

test('green screen image picks one dominant sampled green color', () => {
  const args = buildLayerCacheArguments({
    layers: [{
      id: 'multi-green-key',
      type: 'GREENSCREEN_IMAGE',
      sourceReference: 'green.png',
      transform: { x: 0, y: 0, width: 400, height: 220, opacity: 1 },
      effect: { keyColors: ['#3DAB47', '#0CF404', '#55B757'], similarity: 0.22, softness: 0.07 }
    }],
    outputPath: 'layer-cache.mov',
    durationMs: 60000,
    config
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /format=rgba,scale=400:220:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=400:220:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0,setsar=1,format=rgba,chromakey=0x0CF404:0\.22:0\.07,despill=type=green:mix=0\.45:expand=0\.02/);
  assert.doesNotMatch(graph, /chromakey=0x3DAB47:0\.22:0\.07,chromakey=0x0CF404/);
});

test('green screen key caps overly strong settings to protect overlay content', () => {
  const args = buildLayerCacheArguments({
    layers: [{
      id: 'green-strong',
      type: 'GREENSCREEN_IMAGE',
      sourceReference: 'green.png',
      transform: { x: 0, y: 0, width: 200, height: 200, opacity: 1 },
      effect: { similarity: 0.45, softness: 0.22 }
    }],
    outputPath: 'layer-cache.mov',
    durationMs: 1000,
    config
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /format=rgba,scale=200:200:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=200:200:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0,setsar=1,format=rgba,chromakey=0x00FF00:0\.28:0\.08,despill=type=green:mix=0\.45:expand=0\.02/);
});

test('single pre-cut stock with cached overlay uses GPU background prepass', () => {
  const plan = buildRenderPlan({
    job: { id: 'single-cache', voiceDurationMs: 5000, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      trimStartMs: 0,
      durationMs: 5000,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30
    }],
    config: {
      ...config,
      layers: [{
        id: 'layer-cache',
        type: 'OVERLAY_VIDEO',
        sourceReference: 'layer-cache.mov',
        cachedLayerOverlay: true,
        transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
      }]
    },
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.staged, true);
  assert.equal(staged.stages.background.acceleration.mode, 'CUDA');
  assert.match(staged.stages.background.args.join(' '), /-hwaccel cuda/);
  assert.match(staged.stages.visual.args.join(' '), /layer-cache\.mov/);
  assert.match(staged.stages.visual.args.join(' '), /base\.mp4/);
});

test('single pre-cut stock with cached job green keeps subtitle pass after CUDA background prepass', () => {
  const plan = buildRenderPlan({
    job: { id: 'single-job-green-cache', voiceDurationMs: 5000, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      trimStartMs: 0,
      durationMs: 5000,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30
    }],
    config: {
      ...config,
      layers: [{
        id: 'job-green-cache',
        type: 'OVERLAY_VIDEO',
        sourceReference: 'job-green-cache.mov',
        cachedJobGreenOverlay: true,
        transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
      }]
    },
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  const graph = staged.stages.visual.args[staged.stages.visual.args.indexOf('-filter_complex') + 1];
  assert.equal(staged.staged, true);
  assert.equal(staged.stages.background.acceleration.mode, 'CUDA');
  assert.match(staged.stages.visual.args.join(' '), /job-green-cache\.mov/);
  assert.match(graph, /subtitles=/);
  assert.match(staged.stages.visual.args.join(' '), /base\.mp4/);
});

test('ảnh theo voice được ghép trực tiếp sau CUDA background prepass', () => {
  const plan = buildRenderPlan({
    job: { id: 'single-voice-image', voiceDurationMs: 5000, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: [{
      mediaType: 'VIDEO',
      filePath: 'stock.mp4',
      trimStartMs: 0,
      durationMs: 5000,
      sourceWidth: 1920,
      sourceHeight: 1080,
      sourceFps: 30
    }],
    config: {
      ...config,
      layers: [{
        id: 'static-cache',
        type: 'OVERLAY_VIDEO',
        sourceReference: 'static-cache.mov',
        cachedLayerOverlay: true,
        transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
      }, {
        id: 'voice-image',
        type: 'IMAGE',
        sourceMode: 'VOICE_IMAGE',
        dynamicVoiceImage: true,
        sourceReference: 'voice-image.png',
        transform: { x: 200, y: 120, width: 640, height: 360, opacity: 1 }
      }]
    },
    system: gpuSystem,
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const direct = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(direct.staged, true);
  assert.equal(direct.stages.background.acceleration.mode, 'CUDA');
  assert.match(direct.stages.visual.args.join(' '), /static-cache\.mov/);
  assert.match(direct.stages.visual.args.join(' '), /voice-image\.png/);
  assert.match(direct.stages.visual.args.join(' '), /base\.mp4/);
});

test('thứ tự compositing là stock nền, ảnh theo voice ở giữa và layer Project ở trên', () => {
  const layers = normalizeLayers({
    layers: [{
      id: 'project-layer',
      type: 'IMAGE',
      zIndex: -100,
      transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
    }, {
      id: 'voice-image',
      type: 'IMAGE',
      sourceMode: 'VOICE_IMAGE',
      dynamicVoiceImage: true,
      zIndex: 100,
      transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
    }]
  });

  assert.deepEqual(layers.map((layer) => layer.id), ['voice-image', 'project-layer']);
});

test('cached alpha overlay is decoded on CPU and kept RGBA before compositing', () => {
  const args = buildRenderArguments({
    segments: [{
      mediaType: 'IMAGE',
      filePath: 'stock.png',
      trimStartMs: 0,
      durationMs: 5000
    }],
    voicePath: null,
    srtPath: null,
    outputPath: 'final.mp4',
    durationMs: 5000,
    config: {
      ...config,
      layers: [{
        id: 'job-green-cache',
        type: 'OVERLAY_VIDEO',
        sourceReference: 'job-green-cache.mov',
        cachedJobGreenOverlay: true,
        transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 }
      }]
    },
    videoBitrateKbps: 2000,
    encoder: 'h264_nvenc',
    acceleration: { mode: 'CUDA', gpuIndex: 0, label: 'CUDA' }
  });
  const graph = args[args.indexOf('-filter_complex') + 1];
  const cacheInputIndex = args.indexOf('job-green-cache.mov');
  assert.equal(cacheInputIndex > 0, true);
  assert.doesNotMatch(args.slice(Math.max(0, cacheInputIndex - 8), cacheInputIndex).join(' '), /-hwaccel cuda/);
  assert.match(graph, /format=rgba,scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0,setsar=1,format=rgba,colorchannelmixer=aa=1/);
});

test('staged render pre-renders background then keeps final NVENC pass simpler', () => {
  const plan = buildRenderPlan({
    job: { id: 'job-1', voiceDurationMs: 9300, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments,
    config: {
      ...config,
      layers: [{
        id: 'green',
        type: 'GREENSCREEN_VIDEO',
        sourceReference: 'green.mp4',
        transform: { x: 10, y: 10, width: 320, height: 180, opacity: 1 },
        effect: { similarity: 0.25, softness: 0.08 }
      }]
    },
    system: { ...gpuSystem, cudaAvailable: true, scaleCuda: true },
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.staged, true);
  assert.match(staged.stages.background.args.join(' '), /base\.mp4/);
  assert.match(staged.stages.background.args.join(' '), /-c:v h264_nvenc/);
  assert.match(staged.stages.visual.args.join(' '), /base-visual\.mp4/);
  assert.match(staged.stages.visual.args[staged.stages.visual.args.indexOf('-filter_complex') + 1], /subtitles=/);
  assert.match(staged.stages.visual.args[staged.stages.visual.args.indexOf('-filter_complex') + 1], /original_size=1920x1080/);
  assert.equal(staged.stages.final.args.includes('-filter_complex'), false);
  assert.match(staged.stages.final.args.join(' '), /-c:v copy/);
  assert.doesNotMatch(staged.stages.final.args.join(' '), /subtitles=/);
  assert.match(staged.stages.final.args.join(' '), /base-visual\.mp4/);
});

test('large image background is split into chunks before final staged prepass', () => {
  const imageSegments = Array.from({ length: 181 }, (_, index) => ({
    mediaType: 'IMAGE',
    filePath: `image-${index}.png`,
    trimStartMs: 0,
    durationMs: 5000,
    transitionIn: index === 0 ? null : { type: 'fade', durationMs: 700 }
  }));
  const plan = buildRenderPlan({
    job: { id: 'job-images', voiceDurationMs: 778_700, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: imageSegments,
    config: { ...config, imageBackgroundRenderer: 'chunked', backgroundChunkSegmentLimit: 80 },
    system: { ...gpuSystem, selectedGpuName: 'NVIDIA GeForce GTX 1060 6GB' },
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.staged, true);
  assert.equal(staged.stages.background.chunked, true);
  assert.equal(staged.stages.background.chunks.length, 3);
  assert.equal(staged.stages.background.chunks[0].segmentCount, 80);
  assert.match(staged.stages.background.args.join(' '), /base-chunk-001\.mp4/);
  assert.match(staged.stages.background.args[staged.stages.background.args.indexOf('-filter_complex') + 1], /xfade=transition=fade/);
});

test('large image background defaults to stable per-image sequence renderer', () => {
  const imageSegments = Array.from({ length: 120 }, (_, index) => ({
    mediaType: 'IMAGE',
    filePath: `image-${index}.png`,
    trimStartMs: 0,
    durationMs: 5000,
    transitionIn: index === 0 ? null : { type: 'fade', durationMs: 700 }
  }));
  const plan = buildRenderPlan({
    job: { id: 'job-image-sequence', voiceDurationMs: 516_700, voicePath: 'voice.mp3', srtPath: 'sub.srt' },
    segments: imageSegments,
    config,
    system: { ...gpuSystem, selectedGpuName: 'NVIDIA GeForce GTX 1060 6GB' },
    outputPath: 'final.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const staged = buildStagedRenderPlan(plan, 'base.mp4');
  assert.equal(staged.stages.background.imageSequence, true);
  assert.equal(staged.stages.background.clips.length, 120);
  assert.match(staged.stages.background.args.join(' '), /-f concat -safe 0 -i base-image-list\.ffconcat/);
  assert.equal(staged.stages.background.args.includes('-filter_complex'), false);
  assert.match(staged.stages.background.clips[0].args.join(' '), /image-0\.png/);
});

test('MAX_SPEED allows four complex filter threads for subtitle-heavy renders', () => {
  assert.equal(effectiveFilterComplexThreads(
    { performanceProfile: 'MAX_SPEED', filterComplexThreads: 12 },
    segments,
    [],
    'sub.srt'
  ), 4);
  assert.equal(effectiveFilterComplexThreads(
    { performanceProfile: 'BALANCED', filterComplexThreads: 12 },
    segments,
    [],
    'sub.srt'
  ), 2);
});

test('subtitle style renders low wide regular text without outline', () => {
  const style = subtitleStyle({
    width: 1920,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 32,
      bottomMargin: 20,
      outlineWidth: 0,
      maxWidthPercent: 96,
      renderScale: 1,
      bold: false,
      italic: false,
      shadow: 1
    }
  });
  assert.match(style, /FontName=Arial/);
  assert.match(style, /FontSize=32/);
  assert.match(style, /Outline=0/);
  assert.match(style, /Bold=0/);
  assert.match(style, /Italic=0/);
  assert.match(style, /MarginL=38/);
  assert.match(style, /MarginR=38/);
  assert.match(style, /MarginV=20/);
});

test('subtitle mặc định không có viền (0px)', () => {
  const style = subtitleStyle({
    width: 1920,
    subtitle: { fontFamily: 'Arial', fontSize: 32, bottomMargin: 20 }
  });
  assert.match(style, /Outline=0/);
  assert.match(style, /OutlineColour=&H00000000/);
});

test('subtitle style keeps safe full-width margins when preview box is narrow', () => {
  const style = subtitleStyle({
    width: 1920,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 32,
      bottomMargin: 20,
      outlineWidth: 0,
      maxWidthPercent: 80,
      boxXPercent: 10,
      boxWidthPercent: 70,
      renderScale: 1
    }
  });
  assert.match(style, /Alignment=2/);
  assert.match(style, /MarginL=288/);
  assert.match(style, /MarginR=288/);
});

test('ASS subtitle keeps embedded style without force_style override', () => {
  const plan = buildRenderPlan({
    job: { voice_path: 'voice.mp3', srt_path: 'positioned.ass', voiceDurationMs: 5000 },
    segments: [{ mediaType: 'VIDEO', filePath: 'stock.mp4', trimStartMs: 0, durationMs: 5000 }],
    config,
    system: { h264NvencRuntime: true, nvencRuntime: true, selectedGpuIndex: 0 },
    outputPath: 'out.mp4',
    tempOutputPath: 'temp.mp4',
    logPath: 'render.log'
  });
  const filter = plan.args[plan.args.indexOf('-filter_complex') + 1];
  assert.match(filter, /subtitles=filename='.*positioned\.ass':original_size=1920x1080/);
  assert.match(filter, /fontsdir='.*resources\/fonts\/poppins'/);
  assert.doesNotMatch(filter, /force_style=/);
});
