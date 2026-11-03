'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSrtCues,
  parseAssCues,
  buildSubtitleOverlayConcat,
  subtitleStyleForCanvas,
  subtitleOverlayFfmpegArgs
} = require('../src/main/services/subtitle-canvas-overlay-service');

test('canvas subtitle parser reads SRT cues and inserts transparent gaps', () => {
  const cues = parseSrtCues(`1
00:00:01,000 --> 00:00:02,500
Hello

2
00:00:04,000 --> 00:00:05,000
World
`);
  assert.deepEqual(cues, [
    { startMs: 1000, endMs: 2500, text: 'Hello' },
    { startMs: 4000, endMs: 5000, text: 'World' }
  ]);
  const events = buildSubtitleOverlayConcat(cues, 6000);
  assert.deepEqual(events.map((event) => [event.startMs, event.endMs, event.text]), [
    [0, 1000, ''],
    [1000, 2500, 'Hello'],
    [2500, 4000, ''],
    [4000, 5000, 'World'],
    [5000, 6000, '']
  ]);
});

test('canvas subtitle supports simple ASS dialogue fallback', () => {
  const cues = parseAssCues(`Dialogue: 0,0:00:01.00,0:00:02.25,Default,,0,0,0,,{\\an5}Xin chào\\N世界`);
  assert.deepEqual(cues, [{ startMs: 1000, endMs: 2250, text: 'Xin chào\n世界' }]);
});

test('canvas subtitle style is restricted to simple font controls', () => {
  const style = subtitleStyleForCanvas({
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Poppins Black',
      fontSize: 72,
      color: '#FFFF00',
      outlineWidth: 5,
      bold: true,
      uppercase: true,
      boxWidthPercent: 80,
      boxHeightPercent: 12
    }
  });
  assert.equal(style.fontFamily, 'Poppins Black');
  assert.equal(style.fontSize, 72);
  assert.equal(style.bold, true);

  assert.equal(style.uppercase, true);
  assert.equal(style.outlineWidth, 5);
  assert.equal(style.box.width, 1536);
});

test('canvas subtitle overlay ffmpeg args produce lossless alpha qtrle', () => {
  const args = subtitleOverlayFfmpegArgs({
    concatPath: 'frames.ffconcat',
    outputPath: 'subtitle.mov',
    fps: 30,
    durationMs: 5000
  });
  assert.match(args.join(' '), /-f concat -safe 0 -i frames\.ffconcat/);
  assert.match(args.join(' '), /-vf fps=30,format=argb/);
  assert.match(args.join(' '), /-c:v qtrle -pix_fmt argb/);
});
