'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AppDatabase } = require('../src/main/database');
const { BatchService } = require('../src/main/services/batch-service');

test('layer overlay cache is rendered once and reused', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-layer-cache-'));
  const source = path.join(root, 'overlay.png');
  fs.writeFileSync(source, 'placeholder image');
  let renderCalls = 0;
  const ffmpegService = {
    async render(args) {
      renderCalls += 1;
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: {
      cache: path.join(root, 'cache')
    }
  });
  const renderConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    layers: [{
      id: 'logo',
      type: 'IMAGE',
      sourceReference: source,
      visible: true,
      transform: { x: 20, y: 20, width: 320, height: 180, opacity: 0.45 },
      effect: { blendMode: 'normal' }
    }]
  };

  try {
    const first = await service.prepareLayerCache({ renderConfig, callbacks: {} });
    const second = await service.prepareLayerCache({ renderConfig, callbacks: {} });
    assert.equal(renderCalls, 1);
    assert.equal(first.cacheUsed, true);
    assert.equal(second.cacheUsed, true);
    assert.equal(first.cachePath, second.cachePath);
    assert.equal(first.renderConfig.layers.length, 1);
    assert.equal(first.renderConfig.layers[0].cachedLayerOverlay, true);
    assert.equal(fs.existsSync(first.cachePath), true);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('layer overlay cache uses CUDA decode on RTX systems for video layers', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-layer-cache-cuda-'));
  const source = path.join(root, 'green.mp4');
  fs.writeFileSync(source, 'placeholder video');
  let cacheArgs = [];
  const ffmpegService = {
    async render(args) {
      cacheArgs = args;
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: { cache: path.join(root, 'cache') }
  });
  const renderConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    accelerationMode: 'AUTO_STABLE',
    gpuIndex: 0,
    layers: [{
      id: 'green-video',
      type: 'GREENSCREEN_VIDEO',
      sourceReference: source,
      visible: true,
      transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 1 },
      effect: { blendMode: 'normal' }
    }]
  };
  const system = {
    selectedGpuIndex: 0,
    selectedGpuName: 'NVIDIA GeForce RTX 3060',
    cudaAvailable: true,
    scaleCuda: true
  };

  try {
    await service.prepareLayerCache({ renderConfig, callbacks: {}, system });
    const joined = cacheArgs.join(' ');
    assert.match(joined, /-init_hw_device cuda=gpu:0 -filter_hw_device gpu/);
    assert.match(joined, /-hwaccel cuda -hwaccel_device 0 -hwaccel_output_format cuda/);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('ảnh theo voice không đi vào cache và thay ảnh vẫn dùng lại cache layer tĩnh', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-dynamic-project-image-cache-'));
  const staticSource = path.join(root, 'logo.png');
  const firstImage = path.join(root, 'voice-1.png');
  const secondImage = path.join(root, 'voice-2.png');
  fs.writeFileSync(staticSource, 'static');
  fs.writeFileSync(firstImage, 'first');
  fs.writeFileSync(secondImage, 'second');
  let renderCalls = 0;
  let cacheArgs = [];
  const ffmpegService = {
    async render(args) {
      renderCalls += 1;
      cacheArgs = args;
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: { cache: path.join(root, 'cache') }
  });
  const makeConfig = (imagePath) => ({
    width: 1920,
    height: 1080,
    fps: 30,
    layers: [{
      id: 'static-logo',
      type: 'IMAGE',
      sourceReference: staticSource,
      visible: true,
      transform: { x: 20, y: 20, width: 320, height: 180, opacity: 1 }
    }, {
      id: 'voice-image',
      type: 'IMAGE',
      sourceMode: 'VOICE_IMAGE',
      dynamicVoiceImage: true,
      sourceReference: imagePath,
      visible: true,
      transform: { x: 640, y: 80, width: 640, height: 360, opacity: 1 }
    }]
  });

  try {
    const first = await service.prepareLayerCache({ renderConfig: makeConfig(firstImage), callbacks: {} });
    const second = await service.prepareLayerCache({ renderConfig: makeConfig(secondImage), callbacks: {} });
    assert.equal(renderCalls, 1);
    assert.equal(first.cacheUsed, true);
    assert.equal(first.cachePath, second.cachePath);
    assert.equal(first.renderConfig.layers.length, 2);
    assert.equal(second.renderConfig.layers[1].sourceReference, secondImage);
    assert.doesNotMatch(cacheArgs.join(' '), /voice-[12]\.png/);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('chỉ có ảnh theo voice thì render trực tiếp và không tạo cache', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-dynamic-project-image-only-'));
  const image = path.join(root, 'voice.png');
  fs.writeFileSync(image, 'image');
  let renderCalls = 0;
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService: { async render() { renderCalls += 1; } },
    paths: { cache: path.join(root, 'cache') }
  });

  try {
    const result = await service.prepareLayerCache({
      renderConfig: {
        width: 1920,
        height: 1080,
        layers: [{
          id: 'voice-image',
          type: 'IMAGE',
          dynamicVoiceImage: true,
          sourceReference: image,
          visible: true
        }]
      },
      callbacks: {}
    });
    assert.equal(renderCalls, 0);
    assert.equal(result.cacheUsed, false);
    assert.equal(result.renderConfig.layers[0].sourceReference, image);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('layer overlay cache render is shared across concurrent workers', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-layer-cache-concurrent-'));
  const source = path.join(root, 'overlay.png');
  fs.writeFileSync(source, 'placeholder image');
  let renderCalls = 0;
  const ffmpegService = {
    async render(args) {
      renderCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 25));
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: {
      cache: path.join(root, 'cache')
    }
  });
  const renderConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    layers: [{
      id: 'green',
      type: 'GREENSCREEN_VIDEO',
      sourceReference: source,
      visible: true,
      transform: { x: 20, y: 20, width: 320, height: 180, opacity: 0.8 },
      effect: { blendMode: 'normal' }
    }]
  };

  try {
    const [first, second] = await Promise.all([
      service.prepareLayerCache({ renderConfig, callbacks: {} }),
      service.prepareLayerCache({ renderConfig, callbacks: {} })
    ]);
    assert.equal(renderCalls, 1);
    assert.equal(first.cachePath, second.cachePath);
    assert.equal(fs.existsSync(first.cachePath), true);
    assert.equal(fs.readdirSync(path.dirname(first.cachePath)).some((name) => /\.tmp\.mov$/i.test(name)), false);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('job green riêng render thành overlay cache 30s dùng một lần', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-job-green-cache-'));
  const greenFolder = path.join(root, 'green');
  const greenSource = path.join(greenFolder, 'voice.png');
  fs.mkdirSync(greenFolder, { recursive: true });
  fs.writeFileSync(greenSource, 'placeholder image');
  let renderCalls = 0;
  let durationSeen = 0;
  let argsSeen = [];
  const ffmpegService = {
    async render(args, options = {}) {
      renderCalls += 1;
      durationSeen = options.durationMs;
      argsSeen = args;
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: {
      cache: path.join(root, 'cache')
    }
  });
  const job = { id: 'job-1', voice_path: path.join(root, 'voice.mp3'), voice_name: 'voice.mp3' };
  const renderConfig = { width: 1920, height: 1080, fps: 30 };
  const config = {
    jobGreenFolder: greenFolder,
    enableJobGreenLayer: true,
    requireJobGreenEdit: false,
    jobGreenCacheDurationMs: 30_000
  };

  try {
    const layer = await service.prepareJobGreenCache({
      job,
      batchId: 'batch-1',
      config,
      renderConfig,
      callbacks: {}
    });
    assert.equal(renderCalls, 1);
    assert.equal(durationSeen, 30_000);
    assert.equal(layer.type, 'OVERLAY_VIDEO');
    assert.equal(layer.cachedJobGreenOverlay, true);
    assert.equal(layer.transform.width, 1920);
    assert.equal(layer.transform.height, 1080);
    assert.equal(fs.existsSync(layer.sourceReference), true);
    assert.match(argsSeen.join(' '), /chromakey=0x0CF404:0\.22:0\.07/);
    assert.match(argsSeen.join(' '), /-t 30/);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('template tạm ghép green riêng vào layer cache job 30s', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-template-green-cache-'));
  const templateSource = path.join(root, 'template.png');
  const greenSource = path.join(root, 'voice.png');
  fs.writeFileSync(templateSource, 'placeholder template');
  fs.writeFileSync(greenSource, 'placeholder green');
  let argsSeen = [];
  const ffmpegService = {
    async render(args) {
      argsSeen = args;
      fs.writeFileSync(args[args.length - 1], Buffer.alloc(2048));
    }
  };
  const database = new AppDatabase(path.join(root, 'app.db'));
  const service = new BatchService({
    database,
    ffmpegService,
    paths: {
      cache: path.join(root, 'cache')
    }
  });
  const cacheRoot = path.join(root, 'cache', 'job-green-overlays', 'batch-1');
  const renderConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    layers: [{
      id: 'template',
      type: 'OVERLAY_IMAGE',
      sourceReference: templateSource,
      visible: true,
      transform: { x: 0, y: 0, width: 1920, height: 1080, opacity: 0.5 }
    }, {
      id: 'job-green',
      type: 'GREENSCREEN_IMAGE',
      sourceReference: greenSource,
      visible: true,
      zIndex: 10000,
      transform: { x: 100, y: 80, width: 400, height: 300, opacity: 1 },
      effect: { keyColors: ['0x3DAB47', '0x0CF404'], similarity: 0.22, softness: 0.07 }
    }]
  };

  try {
    const result = await service.prepareLayerCache({
      renderConfig,
      callbacks: {},
      cacheRoot,
      cacheDurationMs: 30_000,
      cacheKeyPrefix: 'job-1',
      cachedJobGreenOverlay: true
    });
    const graph = argsSeen[argsSeen.indexOf('-filter_complex') + 1];
    assert.equal(result.cacheUsed, true);
    assert.equal(path.basename(result.cachePath).startsWith('job-1-'), true);
    assert.equal(result.renderConfig.layers.length, 1);
    assert.equal(result.renderConfig.layers[0].cachedJobGreenOverlay, true);
    assert.match(argsSeen.join(' '), /template\.png/);
    assert.match(argsSeen.join(' '), /voice\.png/);
    assert.match(argsSeen.join(' '), /-t 30/);
    assert.match(graph, /format=rgba,scale=400:300:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=400:300:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0,setsar=1,format=rgba,chromakey=0x0CF404:0\.22:0\.07,despill=type=green:mix=0\.45:expand=0\.02/);
    assert.doesNotMatch(graph, /chromakey=0x3DAB47:0\.22:0\.07,chromakey=0x0CF404/);
  } finally {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('job cleanup removes one-time temp files but keeps reusable layer cache', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-job-cleanup-'));
  const temp = path.join(root, 'temp');
  const cache = path.join(root, 'cache');
  const green = path.join(cache, 'job-green-overlays', 'batch-1');
  const layer = path.join(cache, 'layer-overlays');
  fs.mkdirSync(temp, { recursive: true });
  fs.mkdirSync(green, { recursive: true });
  fs.mkdirSync(layer, { recursive: true });
  const tempFiles = ['job-1.mp4', 'job-1-background.mp4', 'job-1-background-visual.mp4', 'job-1-render.srt'];
  for (const name of tempFiles) fs.writeFileSync(path.join(temp, name), 'tmp');
  fs.writeFileSync(path.join(temp, 'job-2-background.mp4'), 'other');
  fs.writeFileSync(path.join(green, 'job-1-abcdef.mov'), 'green');
  fs.writeFileSync(path.join(green, 'job-2-abcdef.mov'), 'other green');
  fs.writeFileSync(path.join(layer, 'reusable.mov'), 'layer');
  const service = new BatchService({
    database: null,
    ffmpegService: {},
    paths: { temp, cache }
  });

  try {
    const removed = service.cleanupJobTransientFiles({ id: 'job-1', voice_name: 'voice.mp3' }, 'batch-1', {});
    assert.equal(removed, 5);
    for (const name of tempFiles) assert.equal(fs.existsSync(path.join(temp, name)), false);
    assert.equal(fs.existsSync(path.join(green, 'job-1-abcdef.mov')), false);
    assert.equal(fs.existsSync(path.join(temp, 'job-2-background.mp4')), true);
    assert.equal(fs.existsSync(path.join(green, 'job-2-abcdef.mov')), true);
    assert.equal(fs.existsSync(path.join(layer, 'reusable.mov')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
