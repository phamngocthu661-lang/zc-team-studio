const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  resolveJobGreenAsset,
  resolveJobIntroAsset,
  resolveJobIntroAssets,
  introNoiseLayerFromConfig,
  jobGreenKeyForVoice,
  jobGreenLayerFromConfig
} = require('../src/main/services/batch-service');

test('job green asset được match theo tên voice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-green-'));
  try {
    fs.writeFileSync(path.join(root, '331_full.png'), 'x');
    fs.writeFileSync(path.join(root, '332_full.MP4'), 'x');

    assert.equal(jobGreenKeyForVoice('E:\\voice\\331_full.mp3'), '331_full');
    assert.equal(resolveJobGreenAsset('E:\\voice\\331_full.mp3', { jobGreenFolder: root }), path.join(root, '331_full.png'));
    assert.equal(resolveJobGreenAsset('E:\\voice\\332_full.wav', { jobGreenFolder: root }), path.join(root, '332_full.mp4'));
    assert.equal(resolveJobGreenAsset('E:\\voice\\333_full.wav', { jobGreenFolder: root }), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('single render có thể dùng trực tiếp một file green không cần cùng tên voice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-single-green-'));
  try {
    const green = path.join(root, 'custom-green.png');
    fs.writeFileSync(green, 'x');
    assert.equal(
      resolveJobGreenAsset('E:\\voice\\voice-khac-ten.mp3', { singleMode: true, singleJobGreenPath: green }),
      green
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('video riêng sau Disclaimer match theo tên voice và không phải stock', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-job-intro-'));
  try {
    const intro = path.join(root, '331_full.mp4');
    fs.writeFileSync(intro, 'x');
    assert.equal(
      resolveJobIntroAsset('E:\\voice\\331_full.mp3', { jobIntroFolder: root }),
      intro
    );
    assert.equal(resolveJobIntroAsset('E:\\voice\\332_full.mp3', { jobIntroFolder: root }), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('video intro sau Disclaimer chỉ match 1 video duy nhất cùng tên với voice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-job-intros-'));
  try {
    const introExact = path.join(root, '0002.mp4');
    const introExtra = path.join(root, '0002_1.mp4');
    const ignored = path.join(root, '0002_note.mp4');
    fs.writeFileSync(introExact, 'x');
    fs.writeFileSync(introExtra, 'x');
    fs.writeFileSync(ignored, 'x');
    assert.deepEqual(
      resolveJobIntroAssets('E:\\voice\\0002.mp3', { jobIntroFolder: root }),
      [introExact]
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('intro noise layer được nhận theo tên hoặc source noise/nhieu', () => {
  const layer = introNoiseLayerFromConfig({
    layers: [
      { name: 'Logo', type: 'OVERLAY_IMAGE', sourceReference: 'logo.png', visible: true },
      { name: 'NHIỄU film', type: 'OVERLAY_VIDEO', sourceReference: 'grain.mov', visible: true },
      { name: 'Noise hidden', type: 'OVERLAY_VIDEO', sourceReference: 'noise.mov', visible: false }
    ]
  });
  assert.equal(layer.name, 'NHIỄU film');
});

test('job green layer giữ transform, rotation và chromakey config riêng', () => {
  const layer = jobGreenLayerFromConfig({
    job: { id: 'job1', voice_name: '331_full.mp3' },
    assetPath: 'C:\\green\\331_full.mp4',
    renderConfig: { width: 1920, height: 1080, fps: 30 },
    greenConfig: {
      x: 120,
      y: 80,
      width: 640,
      height: 360,
      rotation: -7,
      opacity: 0.82,
      keyColor: '0x1188cc',
      similarity: 0.22,
      softness: 0.05,
      despillMix: 0.5,
      despillExpand: 0.03,
      loop: true,
      edited: true
    }
  });

  assert.equal(layer.type, 'GREENSCREEN_VIDEO');
  assert.equal(layer.loop, true);
  assert.deepEqual(layer.transform, {
    x: 120,
    y: 80,
    width: 640,
    height: 360,
    rotation: -7,
    opacity: 0.82
  });
  assert.equal(layer.effect.similarity, 0.22);
  assert.equal(layer.effect.keyColor, '0x1188cc');
  assert.deepEqual(layer.effect.keyColors, ['0x1188cc', '0x3DAB47', '0x0CF404', '0x55B757', '0x04AC3C', '0x4C9C4C']);
  assert.equal(layer.effect.despillMix, 0.5);
});

test('ảnh thường được ghép nguyên ảnh, không chạy chromakey', () => {
  const layer = jobGreenLayerFromConfig({
    job: { id: 'job-image', voice_name: '331_full.mp3' },
    assetPath: 'C:\\images\\331_full.png',
    renderConfig: { width: 1920, height: 1080, fps: 30, jobGreenMode: 'IMAGE' },
    greenConfig: { assetMode: 'IMAGE', edited: true, x: 20, y: 30, width: 400, height: 250 }
  });
  assert.equal(layer.type, 'IMAGE');
  assert.deepEqual(layer.effect, { blendMode: 'normal' });
});
