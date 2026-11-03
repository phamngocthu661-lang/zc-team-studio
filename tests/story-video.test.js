'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  planStorySegments,
  parseSrtCues,
  srtTimestampToMs
} = require('../src/main/services/story-video-service');

test('parseSrtCues chuyển timestamp và nội dung SRT thành cues chính xác', () => {
  const srtContent = `
1
00:00:01,000 --> 00:00:04,500
Xin chào các bạn đã đến với kênh!

2
00:00:05,000 --> 00:00:08,200
Hôm nay chúng ta cùng tạo video từ ảnh.
`;
  const cues = parseSrtCues(srtContent);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startMs, 1000);
  assert.equal(cues[0].endMs, 4500);
  assert.equal(cues[0].text, 'Xin chào các bạn đã đến với kênh!');
  assert.equal(cues[1].startMs, 5000);
  assert.equal(cues[1].endMs, 8200);
});

test('Chế độ 1 (fixed): Chia đều thời gian cố định và biến tấu zoom/flip khi lặp lại', () => {
  const imageFiles = ['/path/img1.jpg', '/path/img2.jpg'];
  const voiceDurationMs = 11000;
  const plan = planStorySegments({
    mode: 'fixed',
    assets: imageFiles,
    voiceDurationMs,
    imageSeconds: 3,
    transitionItems: [{ id: 'fade', weight: 1, enabled: true }]
  });

  assert.equal(plan.segments.length, 4);
  assert.equal(plan.timelineDurationMs, 11000);
  assert.equal(plan.segments[0].durationMs, 3000);
  assert.equal(plan.segments[1].durationMs, 3000);
  assert.equal(plan.segments[2].durationMs, 3000);
  assert.equal(plan.segments[3].durationMs, 2000);

  assert.equal(plan.segments[0].filePath, '/path/img1.jpg');
  assert.equal(plan.segments[0].transform.cycle, 0);

  assert.equal(plan.segments[2].filePath, '/path/img1.jpg');
  assert.equal(plan.segments[2].transform.cycle, 1);
  assert.ok(plan.segments[2].transform.flip === true || plan.segments[2].transform.scaleStart > 1.09);
});

test('Chế độ 2 (distribute): Giàn đều ảnh hết video theo số lượng ảnh', () => {
  const imageFiles = [
    '/path/img1.jpg',
    '/path/img2.jpg',
    '/path/img3.jpg',
    '/path/img4.jpg'
  ];
  const voiceDurationMs = 12000;
  const plan = planStorySegments({
    mode: 'distribute',
    assets: imageFiles,
    voiceDurationMs,
    transitionItems: [{ id: 'fade', weight: 1, enabled: true }]
  });

  assert.equal(plan.segments.length, 4);
  assert.equal(plan.segments[0].durationMs, 3000);
  assert.equal(plan.segments[1].durationMs, 3000);
  assert.equal(plan.segments[2].durationMs, 3000);
  assert.equal(plan.segments[3].durationMs, 3000);
  assert.equal(plan.timelineDurationMs, 12000);
});

test('Chế độ 3 (srt): Cắt ảnh theo từng câu subtitle SRT và lặp lại khi thiếu ảnh', () => {
  const imageFiles = ['/path/img1.jpg', '/path/img2.jpg'];
  const srtCues = [
    { startMs: 0, endMs: 2500, text: 'Câu thoại 1' },
    { startMs: 2500, endMs: 5500, text: 'Câu thoại 2' },
    { startMs: 5500, endMs: 9000, text: 'Câu thoại 3' }
  ];
  const voiceDurationMs = 9000;
  const plan = planStorySegments({
    mode: 'srt',
    assets: imageFiles,
    srtCues,
    voiceDurationMs,
    transitionItems: [{ id: 'fade', weight: 1, enabled: true }]
  });

  assert.equal(plan.segments.length, 3);
  assert.equal(plan.segments[0].durationMs, 2500);
  assert.equal(plan.segments[1].durationMs, 3000);
  assert.equal(plan.segments[2].durationMs, 3500);

  assert.equal(plan.segments[2].filePath, '/path/img1.jpg');
  assert.equal(plan.segments[2].transform.cycle, 1);
});
