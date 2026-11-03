'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  BatchService,
  resolveProjectImageAsset,
  resolveProjectImageLayers
} = require('../src/main/services/batch-service');

test('ảnh Project được match theo basename voice và chỉ nhận file ảnh', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-image-'));
  try {
    fs.writeFileSync(path.join(root, '331_full.JPG'), 'x');
    fs.writeFileSync(path.join(root, '332_full.mp4'), 'x');

    assert.equal(
      resolveProjectImageAsset('E:\\voice\\331_full.wav', { projectImageFolder: root }),
      path.join(root, '331_full.jpg')
    );
    assert.equal(
      resolveProjectImageAsset('E:\\voice\\332_full.wav', { projectImageFolder: root }),
      null
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('layer Ảnh theo voice dùng transform Project khi có ảnh match', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-image-layer-'));
  try {
    const image = path.join(root, '331_full.png');
    fs.writeFileSync(image, 'x');
    const renderConfig = {
      width: 1920,
      height: 1080,
      layers: [{
        id: 'project-image-1',
        type: 'VOICE_IMAGE',
        name: 'Ảnh theo voice 1',
        sourceReference: '',
        transform: { x: 120, y: 80, width: 640, height: 360, rotation: 4, opacity: 0.9 }
      }]
    };
    const resolved = resolveProjectImageLayers({
      job: { voice_name: '331_full.wav' },
      config: { projectImageFolder: root },
      renderConfig
    });
    assert.equal(resolved.layers[0].type, 'IMAGE');
    assert.equal(resolved.layers[0].sourceMode, 'VOICE_IMAGE');
    assert.equal(resolved.layers[0].dynamicVoiceImage, true);
    assert.equal(resolved.layers[0].sourceReference, image);
    assert.deepEqual(resolved.layers[0].transform, renderConfig.layers[0].transform);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('layer Ảnh theo voice bị bỏ qua nếu không chọn nguồn', () => {
  const renderConfig = {
    layers: [{ id: 'project-image-1', type: 'VOICE_IMAGE', sourceReference: '' }]
  };
  const resolved = resolveProjectImageLayers({
    job: { voice_name: '331_full.wav' },
    config: {},
    renderConfig
  });
  assert.deepEqual(resolved.layers, []);
});

test('Batch báo lỗi khi có folder nhưng thiếu ảnh cùng tên voice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-image-missing-'));
  try {
    assert.throws(
      () => resolveProjectImageLayers({
        job: { voice_name: '331_full.wav' },
        config: { projectImageFolder: root },
        renderConfig: { layers: [{ id: 'project-image-1', type: 'VOICE_IMAGE' }] }
      }),
      (error) => error.code === 'MISSING_PROJECT_IMAGE'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Batch validation nhận layer Ảnh theo voice trong template', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-image-service-'));
  try {
    const service = new BatchService({
      database: { getTemplate: () => ({ layers: [{ type: 'VOICE_IMAGE', visible: true }] }) },
      ffmpegService: null,
      paths: {}
    });
    assert.throws(
      () => service.validateProjectImageInputs(
        { templateId: 'template-1', projectImageFolder: root },
        [{ voicePath: 'E:\\voice\\331_full.wav' }]
      ),
      (error) => error.code === 'MISSING_PROJECT_IMAGE'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
