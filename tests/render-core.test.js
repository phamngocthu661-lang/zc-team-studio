'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  previewViewport,
  previewPointToProject,
  previewDeltaToProject,
  calculateMediaLayout,
  resolveLayerFrame,
  resolveFrameState,
  ffmpegLayerFitFilter,
  ffmpegOverlayPosition,
  subtitleFrame
} = require('../src/shared/render-core');

test('RenderCore maps letterboxed preview viewport to project coordinates', () => {
  const map = previewViewport({ width: 1920, height: 1080 }, { width: 1000, height: 700 });
  assert.equal(Number(map.scale.toFixed(6)), Number((1000 / 1920).toFixed(6)));
  assert.equal(Math.round(map.offsetX), 0);
  assert.equal(Math.round(map.offsetY), 69);
  const point = previewPointToProject({ x: 500, y: map.offsetY + 1080 * map.scale / 2 }, { width: 1920, height: 1080 }, { width: 1000, height: 700 });
  assert.equal(Math.round(point.x), 960);
  assert.equal(Math.round(point.y), 540);
  const delta = previewDeltaToProject({ dx: 100, dy: 50 }, { width: 1920, height: 1080 }, { width: 1000, height: 700 });
  assert.equal(Math.round(delta.dx), 192);
  assert.equal(Math.round(delta.dy), 96);
});

test('RenderCore calculates contain and cover media layout consistently', () => {
  const contain = calculateMediaLayout(1000, 500, 800, 800, 'contain');
  assert.equal(contain.drawWidth, 800);
  assert.equal(contain.drawHeight, 400);
  assert.equal(contain.drawX, 0);
  assert.equal(contain.drawY, 200);
  const cover = calculateMediaLayout(1000, 500, 800, 800, 'cover');
  assert.equal(cover.drawWidth, 1600);
  assert.equal(cover.drawHeight, 800);
  assert.equal(cover.drawX, -400);
  assert.equal(cover.drawY, 0);
});

test('RenderCore keeps rotated layer anchor centered for preview and export', () => {
  const frame = resolveLayerFrame({
    id: 'rotated',
    type: 'IMAGE',
    transform: { x: 100, y: 80, width: 400, height: 200, rotation: 90, anchorX: 0.5, anchorY: 0.5 }
  }, { width: 1920, height: 1080, fps: 30 });
  assert.equal(frame.anchorProjectX, 300);
  assert.equal(frame.anchorProjectY, 180);
  assert.equal(Math.round(frame.visualWidth), 200);
  assert.equal(Math.round(frame.visualHeight), 400);
  assert.equal(Math.round(frame.visualX), 200);
  assert.equal(Math.round(frame.visualY), -20);
  assert.deepEqual(ffmpegOverlayPosition(frame), { x: 200, y: -20 });
});

test('RenderCore emits transparent-padded contain filter for FFmpeg layer boxes', () => {
  const filter = ffmpegLayerFitFilter({ width: 400, height: 220 }, 'contain');
  assert.match(filter, /scale=400:220:force_original_aspect_ratio=decrease/);
  assert.match(filter, /pad=400:220:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0/);
});

test('RenderCore resolves frame time and layer visibility from frame index', () => {
  const state = resolveFrameState({
    width: 1920,
    height: 1080,
    fps: 30,
    layers: [{ id: 'late', type: 'IMAGE', startMs: 1000, endMs: 2000, transform: { x: 0, y: 0, width: 100, height: 100 } }]
  }, 45);
  assert.equal(state.frameIndex, 45);
  assert.equal(state.time, 1.5);
  assert.equal(state.layers[0].visibleAtFrame, true);
});

test('RenderCore subtitle frame uses project-pixel font and box metrics', () => {
  const frame = subtitleFrame({
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Calibri',
      fontSize: 110,
      bold: true,
      outlineWidth: 5,
      boxXPercent: 9,
      boxYPercent: 65.1,
      boxWidthPercent: 91,
      boxHeightPercent: 34.9,
      positionMode: 'absolute'
    }
  }, 'dòng 1\ndòng 2');
  assert.equal(frame.fontFamily, 'Calibri');
  assert.equal(frame.fontWeight, 700);
  assert.equal(frame.baseFontSize, 110);
  assert.equal(frame.fontSize, 110);
  assert.equal(frame.x, 173);
  assert.equal(frame.y, 703);
  assert.equal(frame.width, 1747);
});
