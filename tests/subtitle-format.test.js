'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { collapseSrtCueLines, subtitlePreviewText, srtToPositionedAss, subtitleAssBox } = require('../src/main/services/batch-service');
const { subtitleJsonToKaraokeAss, subtitleJsonToSrt } = require('../src/main/services/karaoke-subtitle');
const { subtitleFitFontSize, subtitlePreviewBox } = require('../src/shared/subtitle-preview');
const { subtitleStyle } = require('../src/main/services/render-planner');

test('subtitle preprocessing limits cue text to two rendered lines', () => {
  const text = 'あ'.repeat(260);
  const srt = `1
00:00:00,000 --> 00:00:05,000
${text}
`;
  const output = collapseSrtCueLines(srt, {
    width: 1920,
    subtitle: {
      fontSize: 32,
      renderScale: 1,
      maxWidthPercent: 96,
      maxLines: 2
    }
  });
  const cueLines = output.trim().split(/\r?\n/).slice(2);
  assert.equal(cueLines.length, 2);
  assert.match(cueLines[1], /\.\.\.$/);
});


test('subtitle preprocessing wraps Japanese text without spaces at visible line length', () => {
  const text = '冷たい朝の空気が漂う午前6時の公園色褪せた木製のベンチに向かって一人の老人がゆっくりと歩みを進めていました';
  const srt = `1
00:00:00,000 --> 00:00:05,000
${text}
`;
  const output = collapseSrtCueLines(srt, {
    width: 1920,
    subtitle: {
      fontSize: 50,
      renderScale: 1,
      maxWidthPercent: 96,
      maxLines: 4
    }
  });
  const cueLines = output.trim().split(/\r?\n/).slice(2);
  assert.equal(cueLines.length > 1, true);
  assert.equal(cueLines.every((line) => line.length <= 38), true);
});

test('subtitle preprocessing uses box pixel width instead of a hard character cap', () => {
  const srt = `1
00:00:00,000 --> 00:00:05,000
and came home smelling of machine oil.
`;
  const output = collapseSrtCueLines(srt, {
    width: 1920,
    height: 1080,
    subtitle: {
      fontSize: 90,
      renderScale: 1,
      maxWidthPercent: 80.3,
      boxWidthPercent: 80.3,
      maxLines: 4
    }
  });
  const cueLines = output.trim().split(/\r?\n/).slice(2);
  assert.equal(cueLines.length, 2);
  assert.equal(cueLines[0], 'and came home smelling of machine');
});

test('subtitle ASS conversion positions text from preview box', () => {
  const srt = `1
00:00:01,000 --> 00:00:03,500
字幕テスト
`;
  const renderConfig = {
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 32,
      assScale: 0.38,
      boxXPercent: 20,
      boxYPercent: 80,
      boxWidthPercent: 50,
      boxHeightPercent: 8,
      positionMode: 'absolute'
    }
  };
  const box = subtitleAssBox(renderConfig);
  const ass = srtToPositionedAss(srt, renderConfig);
  assert.equal(box.x, 384);
  assert.equal(box.width, 960);
  assert.equal(box.centerX, 864);
  assert.match(ass, /PlayResX: 1920/);
  assert.match(ass, /Style: Default,Arial,12/);
  assert.match(ass, /Dialogue: 0,0:00:01\.00,0:00:03\.50,Default,,0,0,0,,\{\\an5\\pos\(864,907\)\}字幕テスト/);
});

test('subtitle style restricts fonts and keeps bold outline controls', () => {
  const style = subtitleStyle({
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Poppins ExtraBold',
      fontSize: 96,
      fontWeight: 800,
      letterSpacingEm: -0.015,
      color: '#F0FF00',
      outlineColor: '#000000',
      outlineWidth: 4,
      shadow: 0
    }
  });
  assert.match(style, /FontName=Poppins ExtraBold/);
  assert.match(style, /FontSize=96/);
  assert.match(style, /Bold=1/);
  assert.match(style, /Outline=4/);
});


test('subtitle color is exported into ASS primary colour', () => {
  const style = subtitleStyle({
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 64,
      color: '#12A3F4'
    }
  });
  assert.match(style, /PrimaryColour=&H00F4A312/);
});

test('subtitle bottomMargin 0 survives preview and export geometry', () => {
  const previewZero = subtitlePreviewBox({ width: 1920, height: 1080, subtitle: { bottomMargin: 0, boxHeightPercent: 8 } });
  const previewTwenty = subtitlePreviewBox({ width: 1920, height: 1080, subtitle: { bottomMargin: 20, boxHeightPercent: 8 } });
  const exportZero = subtitleAssBox({
    width: 1920,
    height: 1080,
    subtitle: { bottomMargin: 0, boxHeightPercent: 8 }
  });
  const exportTwenty = subtitleAssBox({
    width: 1920,
    height: 1080,
    subtitle: { bottomMargin: 20, boxHeightPercent: 8 }
  });
  assert.equal(previewZero.y - previewTwenty.y, 20);
  assert.equal(exportZero.y - exportTwenty.y, 20);
  assert.match(subtitleStyle({ width: 1920, height: 1080, subtitle: { bottomMargin: 0 } }), /MarginV=0/);
});

test('subtitle nhiều dòng co font size theo box cấu hình', () => {
  const subtitle = { fontSize: 65, assScale: 1, outlineWidth: 1, lineHeight: 1.2 };
  assert.equal(subtitleFitFontSize(subtitle, { boxHeight: 180, lineCount: 4 }), 36);

  const srt = `1
00:00:00,000 --> 00:00:05,000
白髪混じりの髪は少し乱れ背中も
丸く曲がり切っています
しかしその震える足取りには何か
強い目的が感じられました
`;
  const ass = srtToPositionedAss(srt, {
    width: 1920,
    height: 1080,
    subtitle: {
      ...subtitle,
      positionMode: 'absolute',
      boxXPercent: 50,
      boxYPercent: 82.8,
      boxWidthPercent: 50,
      boxHeightPercent: 16.7
    }
  });
  assert.doesNotMatch(ass, /\\fs35\}/);
  assert.match(ass, /Style: Default,Arial,65,/);
});

test('subtitle chỉ tự co font khi bật autoFitFont và chữ tràn box', () => {
  const subtitle = { fontSize: 65, assScale: 1, outlineWidth: 1, lineHeight: 1.2, autoFitFont: true };
  const fitted = subtitleFitFontSize(subtitle, { boxHeight: 80, lineCount: 2 });
  assert.equal(fitted < 65, true);
  const srt = `1
00:00:00,000 --> 00:00:05,000
白髪混じりの髪は少し乱れ背中も
丸く曲がり切っています
`;
  const ass = srtToPositionedAss(srt, {
    width: 1920,
    height: 1080,
    subtitle: {
      ...subtitle,
      positionMode: 'absolute',
      boxXPercent: 50,
      boxYPercent: 82.8,
      boxWidthPercent: 50,
      boxHeightPercent: 5
    }
  });
  assert.match(ass, /\\fs\d+/);
});


test('subtitle preview sample uses wrapped SRT cue text', () => {
  const srt = `1
00:00:00,000 --> 00:00:05,000
冷たい朝の空気が漂う午前6時の公園 色褪せた木製のベンチに向かって一人の老人がゆっくりと歩みを進めていました
`;
  const result = subtitlePreviewText(srt, {
    width: 1920,
    subtitle: {
      fontSize: 153,
      assScale: 0.38,
      maxWidthPercent: 97.1,
      maxLines: 2
    }
  });
  assert.match(result.text, /\n/);
  assert.equal(result.text.split('\n').length, 2);
});


test('subtitle wrapping honors narrow preview box width', () => {
  const srt = `1
00:00:00,000 --> 00:00:05,000
冷たい朝の空気が漂う午前6時の公園色褪せた木製のベンチに向かって一人の老人が歩く
`;
  const wide = subtitlePreviewText(srt, {
    width: 1920,
    subtitle: { fontSize: 80, assScale: 0.38, maxWidthPercent: 96, maxLines: 4 }
  });
  const narrow = subtitlePreviewText(srt, {
    width: 1920,
    subtitle: { fontSize: 80, assScale: 0.38, maxWidthPercent: 25, boxWidthPercent: 25, maxLines: 4 }
  });
  assert.equal(narrow.text.split('\n').length > wide.text.split('\n').length, true);
});

test('karaoke json preview and ASS conversion use fixed text with per-word highlight box', () => {
  const json = JSON.stringify([
    {
      text: 'Xin chao',
      words: [
        { text: 'Xin', start: 0, end: 0.35, type: 'word' },
        { text: ' ', start: 0.35, end: 0.45, type: 'spacing' },
        { text: 'chao', start: 0.45, end: 0.95, type: 'word' }
      ]
    }
  ]);
  const preview = subtitlePreviewText(json, {});
  const ass = subtitleJsonToKaraokeAss(json, {
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 72,
      karaokeBoxColor: '#2563EB',
      karaokeBoxRadius: 12,
      karaokeBoxPadding: 10,
      karaokeBoxOpacity: 0.72,
      karaokeBoxEffect: 'slide',
      outlineColor: '#000000',
      outlineWidth: 6,
      boxXPercent: 2,
      boxYPercent: 82,
      boxWidthPercent: 96,
      boxHeightPercent: 10,
      positionMode: 'absolute'
    }
  });
  assert.equal(preview.text, 'Xin chao');
  assert.match(ass, /Style: Box/);
  assert.match(ass, /Style: Default,Arial,47,/);
  assert.match(ass, /Dialogue: 1,0:00:00\.00,0:00:00\.95,Default,,0,0,0,,\{\\an5\\pos\(\d+,\d+\)\}Xin/);
  assert.match(ass, /Dialogue: 1,0:00:00\.00,0:00:00\.95,Default,,0,0,0,,\{\\an5\\pos\(\d+,\d+\)\}chao/);
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:00\.35,Box/);
  assert.match(ass, /Dialogue: 0,0:00:00\.45,0:00:00\.95,Box/);
  assert.match(ass, /\\an7\\pos\(\d+,\d+\)\\p1\\1c&HEB6325&\\1a&H47&/);
  assert.match(ass, /m \d+ 0 l \d+ 0/);
  assert.match(ass, /\\move\(/);
  assert.doesNotMatch(ass, /\\k\d+/);
});

test('karaoke json can be converted back to normal SRT for non-karaoke presets', () => {
  const json = JSON.stringify([
    {
      text: 'Xin chao',
      words: [
        { text: 'Xin', start: 0, end: 0.35, type: 'word' },
        { text: ' ', start: 0.35, end: 0.45, type: 'spacing' },
        { text: 'chao', start: 0.45, end: 0.95, type: 'word' }
      ]
    }
  ]);
  const srt = subtitleJsonToSrt(json);
  assert.match(srt, /1\n00:00:00,000 --> 00:00:00,950\nXin chao/);
  assert.doesNotMatch(srt, /Dialogue:/);
});

test('karaoke json is split into short visible subtitle chunks', () => {
  const words = Array.from({ length: 24 }, (_, index) => ({
    text: `word${index + 1}`,
    start: index * 0.3,
    end: index * 0.3 + 0.25,
    type: 'word'
  })).flatMap((word, index) => index === 23 ? [word] : [word, {
    text: ' ',
    start: word.end,
    end: word.end + 0.05,
    type: 'spacing'
  }]);
  const json = JSON.stringify([{ text: words.map((word) => word.text).join('').trim(), words }]);
  const ass = subtitleJsonToKaraokeAss(json, {
    width: 1920,
    height: 1080,
    subtitle: {
      fontFamily: 'Arial',
      fontSize: 72,
      outlineWidth: 6,
      boxXPercent: 2,
      boxYPercent: 82,
      boxWidthPercent: 96,
      boxHeightPercent: 10,
      karaokeMaxWords: 6,
      karaokeCharsPerLine: 18,
      karaokeMaxLines: 2,
      positionMode: 'absolute'
    }
  });
  const dialogues = ass.split('\n').filter((line) => line.startsWith('Dialogue:'));
  assert.equal(dialogues.length > 1, true);
  assert.doesNotMatch(dialogues[0], /word1.*word24/);
  assert.match(ass, /Dialogue: 1,0:00:00\.00,0:00:01\.75,Default/);
  assert.match(ass, /Dialogue: 1,0:00:01\.80,0:00:03\.55,Default/);
});
