'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { BatchService, normalizeTemplate } = require('../src/main/services/batch-service');
const { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } = require('../src/shared/constants');

test('template cũ được quy đổi về canvas chuẩn 1920x1080', () => {
  const normalized = normalizeTemplate({
    config: { canvas: { width: 1280, height: 720, fps: 30 }, layers: [] },
    layers: [{
      id: 'layer',
      type: 'IMAGE',
      name: 'Image',
      transform: { x: 100, y: 80, width: 400, height: 200 }
    }]
  });
  assert.deepEqual(normalized.canvas.width, STANDARD_CANVAS_WIDTH);
  assert.deepEqual(normalized.canvas.height, STANDARD_CANVAS_HEIGHT);
  assert.deepEqual(normalized.layers[0].transform, { x: 150, y: 120, width: 600, height: 300 });
});

test('render luôn xuất đúng 1920x1080 dù config nhập kích thước khác', () => {
  const service = Object.create(BatchService.prototype);
  service.database = { getTemplate: () => ({ config: { canvas: { width: 1280, height: 720, fps: 30 }, layers: [] }, layers: [] }) };
  const renderConfig = service.createRenderConfig(
    { template_id: 'template', background_mode: 'STOCK_VIDEO' },
    { width: 1280, height: 720, fps: 30, layers: [] }
  );
  assert.equal(renderConfig.width, STANDARD_CANVAS_WIDTH);
  assert.equal(renderConfig.height, STANDARD_CANVAS_HEIGHT);
  assert.equal(renderConfig.canvas.width, STANDARD_CANVAS_WIDTH);
  assert.equal(renderConfig.canvas.height, STANDARD_CANVAS_HEIGHT);
});
