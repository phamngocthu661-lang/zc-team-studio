'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compareRgbaBuffers } = require('../src/shared/render-validator');

test('pixel diff reports identical RGBA frames as zero difference', () => {
  const frame = new Uint8Array([
    0, 0, 0, 255,
    255, 255, 255, 255,
    10, 20, 30, 255,
    40, 50, 60, 255
  ]);
  const report = compareRgbaBuffers(frame, frame.slice(), { width: 2, height: 2 });
  assert.equal(report.differentPixelCount, 0);
  assert.equal(report.differentPixelPercent, 0);
  assert.equal(report.maxChannelDifference, 0);
  assert.equal(report.meanAbsoluteDifference, 0);
  assert.equal(report.boundingBoxOfDifference, null);
});

test('pixel diff reports changed pixels, max channel delta and bounding box', () => {
  const expected = new Uint8Array(3 * 3 * 4).fill(0);
  const actual = expected.slice();
  actual[(1 * 3 + 1) * 4 + 0] = 20;
  actual[(2 * 3 + 2) * 4 + 2] = 255;
  const report = compareRgbaBuffers(actual, expected, { width: 3, height: 3 });
  assert.equal(report.differentPixelCount, 2);
  assert.equal(Number(report.differentPixelPercent.toFixed(4)), 22.2222);
  assert.equal(report.maxChannelDifference, 255);
  assert.equal(report.boundingBoxOfDifference.x, 1);
  assert.equal(report.boundingBoxOfDifference.y, 1);
  assert.equal(report.boundingBoxOfDifference.width, 2);
  assert.equal(report.boundingBoxOfDifference.height, 2);
});

test('pixel diff tolerance ignores anti-aliasing noise below threshold', () => {
  const expected = new Uint8Array([100, 100, 100, 255]);
  const actual = new Uint8Array([102, 101, 99, 255]);
  const report = compareRgbaBuffers(actual, expected, { width: 1, height: 1, tolerance: 3 });
  assert.equal(report.differentPixelCount, 0);
  assert.equal(report.maxChannelDifference, 2);
});
