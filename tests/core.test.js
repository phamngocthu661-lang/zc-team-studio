'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMatchName,
  buildTransitionSequence,
  calculateVideoBitrateKbps,
  targetSizeBytes
} = require('../src/shared/core');
const { planStockSegments, InsufficientStockError, createDurationStockAllocator } = require('../src/main/services/stock-planner');

const transitions = [
  { id: 'fade', weight: 40, enabled: true },
  { id: 'dissolve', weight: 20, enabled: true },
  { id: 'smoothleft', weight: 10, enabled: true }
];

test('voice và SRT được chuẩn hóa giống nhau', () => {
  assert.equal(normalizeMatchName('C:/Voice/Chương  01.MP3'), normalizeMatchName('D:/SRT/Chương 01.srt'));
});

test('random seed tạo chuỗi transition ổn định và tránh lặp', () => {
  const a = buildTransitionSequence({ count: 20, items: transitions, seed: 12345, avoidRepeatCount: 1 });
  const b = buildTransitionSequence({ count: 20, items: transitions, seed: 12345, avoidRepeatCount: 1 });
  assert.deepEqual(a, b);
  for (let index = 1; index < a.length; index += 1) assert.notEqual(a[index].type, a[index - 1].type);
});

test('giới hạn 2 GB mỗi giờ tạo target 2 tỷ bytes', () => {
  assert.equal(targetSizeBytes({ durationMs: 3_600_000, gbPerHour: 2 }), 2_000_000_000);
  const bitrate = calculateVideoBitrateKbps({ durationMs: 3_600_000, gbPerHour: 2, audioKbps: 128, safetyPercent: 95 });
  assert.ok(bitrate >= 4000 && bitrate <= 4100, `bitrate=${bitrate}`);
});

test('stock planner phủ đúng voice với overlap', () => {
  const assets = [1, 2, 3].map((id) => ({ id: String(id), file_path: `${id}.mp4`, duration_ms: 4000 }));
  const result = planStockSegments({
    assets,
    voiceDurationMs: 10_000,
    seed: 77,
    transitionItems: transitions,
    minTransitionMs: 700,
    maxTransitionMs: 700,
    selectionMode: 'SEQUENTIAL'
  });
  assert.equal(result.segments.length, 3);
  assert.equal(result.timelineDurationMs, 10_000);
});

test('stock planner báo thiếu stock', () => {
  assert.throws(() => planStockSegments({
    assets: [{ id: '1', file_path: '1.mp4', duration_ms: 1000 }],
    voiceDurationMs: 5000,
    seed: 1,
    transitionItems: transitions
  }), InsufficientStockError);
});

test('stock duration allocator chia một file dài theo cursor nguồn sau khi slow 0.75', () => {
  const allocator = createDurationStockAllocator({
    assets: [{ id: 'long', file_path: 'long.mp4', duration_ms: 12_000, width: 1920, height: 1080, fps_num: 30, fps_den: 1 }],
    selectionMode: 'SEQUENTIAL'
  });
  const first = allocator.allocate({ voiceDurationMs: 5000 });
  const second = allocator.allocate({ voiceDurationMs: 4000 });
  assert.equal(first.segments[0].trimStartMs, 0);
  assert.equal(first.segments[0].sourceDurationMs, 3750);
  assert.equal(first.segments[0].transform.flip, undefined);
  assert.equal(first.segments[0].transform.scale, undefined);
  assert.equal(second.segments[0].trimStartMs, 3750);
  assert.equal(second.segments[0].sourceDurationMs, 3000);
  assert.equal(allocator.remainingDurationMs, 23000);
});

test('stock duration allocator dùng clone lật zoom khi một file ngắn cần phủ thêm', () => {
  const allocator = createDurationStockAllocator({
    assets: [{ id: 'short', file_path: 'short.mp4', duration_ms: 30_000, width: 1280, height: 720, fps_num: 30, fps_den: 1 }],
    selectionMode: 'SEQUENTIAL'
  });
  const result = allocator.allocate({ voiceDurationMs: 70_000 });
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].playbackRate, .75);
  assert.equal(result.segments[0].transform.flip, undefined);
  assert.equal(result.segments[0].transform.scale, undefined);
  assert.equal(result.segments[1].transform.flip, true);
  assert.equal(result.segments[1].transform.scale, 1.1);
  assert.equal(result.segments[1].trimStartMs, 0);
});

test('stock luôn dùng hết lượt thường trước khi chuyển sang lượt lật zoom', () => {
  const allocator = createDurationStockAllocator({
    assets: [{ id: 'phased', file_path: 'phased.mp4', duration_ms: 12_000, width: 1920, height: 1080, fps_num: 30, fps_den: 1 }],
    selectionMode: 'SEQUENTIAL'
  });
  const normal = allocator.allocate({ voiceDurationMs: 16_000 });
  const clone = allocator.allocate({ voiceDurationMs: 4_000 });

  assert.equal(normal.segments.length, 1);
  assert.equal(normal.segments[0].stockPhase, 1);
  assert.deepEqual(normal.segments[0].transform, {});
  assert.equal(clone.segments.length, 1);
  assert.equal(clone.segments[0].stockPhase, 2);
  assert.equal(clone.segments[0].trimStartMs, 0);
  assert.equal(clone.segments[0].transform.flip, true);
  assert.equal(clone.segments[0].transform.scale, 1.1);
});
