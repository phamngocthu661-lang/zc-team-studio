'use strict';

const { subtitleEffectiveFontSize, subtitleFontFamily, subtitleFontWeight, subtitleLetterSpacing, subtitleFitFontSize, subtitleLineHeight } = require('../../shared/subtitle-preview');

const DEFAULT_KARAOKE_PREVIEW_FONT_SCALE = 0.655;

function safeParseJson(content) {
  try {
    return JSON.parse(String(content || ''));
  } catch {
    return null;
  }
}

function extractSubtitleItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['subtitles', 'segments', 'items', 'data', 'results', 'entries']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  if (Array.isArray(payload.words)) return [payload];
  return [];
}

function readTime(source, keys) {
  for (const key of keys) {
    if (!(key in source)) continue;
    const raw = Number(source[key]);
    if (!Number.isFinite(raw)) continue;
    if (/ms|msec|millis/i.test(key)) return raw / 1000;
    return raw;
  }
  return null;
}

function normalizeKaraokeWord(word) {
  if (!word || typeof word !== 'object') return null;
  const rawText = String(word.text ?? word.word ?? word.content ?? '');
  const type = String(word.type || word.kind || 'word').toLowerCase();
  const spacing = type === 'spacing' || /^\s+$/.test(rawText);
  const text = spacing ? (rawText.replace(/\s+/g, ' ') || ' ') : rawText.replace(/\r?\n/g, ' ').trim();
  if (!text) return null;
  const start = readTime(word, ['startMs', 'start_ms', 'start_msec', 'start']);
  const end = readTime(word, ['endMs', 'end_ms', 'end_msec', 'end']);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return {
    text,
    start: Math.max(0, start),
    end: Math.max(0, end),
    type: spacing ? 'spacing' : 'word'
  };
}

function normalizeKaraokeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const words = extractSubtitleItems(item.words || item.tokens || item.pieces || item.parts)
    .map((word) => normalizeKaraokeWord(word))
    .filter(Boolean)
    .sort((a, b) => Number(a.start) - Number(b.start) || (a.type === b.type ? 0 : a.type === 'spacing' ? 1 : -1));
  const text = String(item.text || item.content || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || previewTextFromWords(words);
  const start = readTime(item, ['startMs', 'start_ms', 'start_msec', 'start']);
  const end = readTime(item, ['endMs', 'end_ms', 'end_msec', 'end']);
  return {
    text,
    words,
    start,
    end
  };
}

function parseKaraokeJson(content) {
  const parsed = safeParseJson(content);
  if (!parsed) return [];
  return extractSubtitleItems(parsed).map((item) => normalizeKaraokeItem(item)).filter(Boolean);
}

function previewTextFromWords(words) {
  return words
    .map((word) => String(word.text || ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function subtitleJsonPreviewText(content) {
  const items = parseKaraokeJson(content);
  if (!items.length) return null;
  const first = items[0];
  const text = first.text || previewTextFromWords(first.words);
  return text ? { text, content: text } : null;
}

function assColor(hex, alpha = '00') {
  const clean = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  return `&H${alpha}${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`;
}

function assColorRgb(hex) {
  const clean = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  return `&H${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}&`;
}

function assAlphaFromOpacity(opacity = 1) {
  const value = Math.max(0, Math.min(1, Number(opacity)));
  const alpha = Math.round((1 - (Number.isFinite(value) ? value : 1)) * 255);
  return String(alpha.toString(16).toUpperCase()).padStart(2, '0');
}

function karaokePreviewFontScale(subtitle = {}) {
  const value = Number(subtitle.karaokePreviewFontScale ?? subtitle.karaokeExportFontScale ?? DEFAULT_KARAOKE_PREVIEW_FONT_SCALE);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_KARAOKE_PREVIEW_FONT_SCALE;
}

function karaokeRenderSubtitle(subtitle = {}) {
  const baseExportScale = Number(subtitle.exportFontScale ?? subtitle.exportScale ?? 1);
  const safeBaseScale = Number.isFinite(baseExportScale) && baseExportScale > 0 ? baseExportScale : 1;
  return {
    ...subtitle,
    exportFontScale: safeBaseScale * karaokePreviewFontScale(subtitle)
  };
}

function srtTimeToAss(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return '0:00:00.00';
  let hours = Number(match[1]);
  let minutes = Number(match[2]);
  let seconds = Number(match[3]);
  let centiseconds = Math.round(Number(match[4].padEnd(3, '0')) / 10);
  if (centiseconds >= 100) {
    seconds += 1;
    centiseconds = 0;
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        hours += 1;
      }
    }
  }
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function secondsToAssTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  let hours = Math.floor(safe / 3600);
  let minutes = Math.floor((safe % 3600) / 60);
  let secs = Math.floor(safe % 60);
  let centiseconds = Math.round((safe - Math.floor(safe)) * 100);
  if (centiseconds >= 100) {
    secs += 1;
    centiseconds = 0;
    if (secs >= 60) {
      secs = 0;
      minutes += 1;
      if (minutes >= 60) {
        minutes = 0;
        hours += 1;
      }
    }
  }
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function secondsToSrtTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(Math.min(999, millis)).padStart(3, '0')}`;
}

function escapeAssText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n/g, '\\N');
}

function karaokeVisibleText(words = []) {
  return words.map((word) => String(word?.text || '')).join('').replace(/\s+/g, ' ').trim();
}

function trimKaraokeSpacing(words = []) {
  let start = 0;
  let end = words.length;
  while (start < end && words[start]?.type === 'spacing') start += 1;
  while (end > start && words[end - 1]?.type === 'spacing') end -= 1;
  return words.slice(start, end);
}

function karaokeChunkOptions(renderConfig = {}, box = {}) {
  const subtitle = renderConfig.subtitle || {};
  const fontSize = subtitleEffectiveFontSize(subtitle);
  const maxLines = Math.max(1, Math.min(2, Math.round(Number(subtitle.karaokeMaxLines ?? subtitle.maxLines ?? 2))));
  const charsPerLine = Math.max(
    8,
    Math.round(Number(subtitle.karaokeCharsPerLine || Math.floor(Number(box.width || 0) / Math.max(18, fontSize * 0.78))) || 24)
  );
  return {
    maxLines,
    charsPerLine,
    maxChars: Math.max(10, Math.round(Number(subtitle.karaokeMaxChars || charsPerLine * maxLines))),
    maxDuration: Math.max(1.2, Number(subtitle.karaokeMaxDuration || 4.2)),
    maxWords: Math.max(2, Math.round(Number(subtitle.karaokeMaxWords || 14)))
  };
}

function isBreakPunctuation(text) {
  return /[。.!?！？、,;；:：]$/.test(String(text || '').trim());
}

function firstTimedWord(words = []) {
  return words.find((word) => word?.type !== 'spacing' && Number.isFinite(Number(word.start))) || words.find((word) => Number.isFinite(Number(word.start)));
}

function lastTimedWord(words = []) {
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const word = words[index];
    if (word?.type !== 'spacing' && Number.isFinite(Number(word.end))) return word;
  }
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const word = words[index];
    if (Number.isFinite(Number(word.end))) return word;
  }
  return null;
}

function splitKaraokeWords(words = [], renderConfig = {}, box = {}) {
  const options = karaokeChunkOptions(renderConfig, box);
  const chunks = [];
  let current = [];
  let currentChars = 0;
  let currentWords = 0;
  let currentStart = null;
  let previousWord = null;

  const pushCurrent = () => {
    const chunk = trimKaraokeSpacing(current);
    if (chunk.length && karaokeVisibleText(chunk)) chunks.push(chunk);
    current = [];
    currentChars = 0;
    currentWords = 0;
    currentStart = null;
    previousWord = null;
  };

  for (const word of words) {
    if (!word) continue;
    if (word.type === 'spacing') {
      if (current.length) current.push(word);
      continue;
    }

    const text = String(word.text || '').trim();
    if (!text) continue;
    const wordChars = text.length;
    const nextEnd = Number(word.end);
    const nextDuration = Number.isFinite(currentStart) && Number.isFinite(nextEnd) ? nextEnd - currentStart : 0;
    const shouldBreak = currentWords > 0 && (
      (previousWord && isBreakPunctuation(previousWord.text)) ||
      (currentChars + wordChars > options.maxChars && currentChars >= Math.max(6, Math.round(options.charsPerLine * 0.5))) ||
      (nextDuration > options.maxDuration && currentWords >= 2) ||
      currentWords >= options.maxWords
    );

    if (shouldBreak) pushCurrent();
    if (!Number.isFinite(currentStart)) currentStart = Number(word.start);
    current.push(word);
    currentChars += wordChars;
    currentWords += 1;
    previousWord = word;
  }

  pushCurrent();
  return chunks;
}

function karaokeCharWidth(char, fontSize) {
  if (!char) return 0;
  if (/\s/.test(char)) return fontSize * 0.34;
  if (/[.,;:!?'"\-()[\]{}]/.test(char)) return fontSize * 0.34;
  if (/[A-Z0-9]/.test(char)) return fontSize * 0.62;
  if (/[a-z]/.test(char)) return fontSize * 0.54;
  return fontSize * 0.72;
}

function karaokeTextWidth(text, fontSize, spacing = 0) {
  const chars = Array.from(String(text || ''));
  if (!chars.length) return 0;
  return chars.reduce((sum, char) => sum + karaokeCharWidth(char, fontSize), 0) + Math.max(0, chars.length - 1) * Number(spacing || 0);
}

function layoutKaraokeWords(words, renderConfig, box, fontSize) {
  const subtitle = renderConfig.subtitle || {};
  const options = karaokeChunkOptions(renderConfig, box);
  const spacing = subtitleLetterSpacing(subtitle, fontSize);
  const maxLineWidth = Math.max(1, Number(box.width || 0));
  const lines = [{ items: [], width: 0 }];
  let current = lines[0];
  let lineWords = 0;

  for (const word of words) {
    if (!word) continue;
    const text = String(word.text || '');
    if (!text) continue;
    const isSpacing = word.type === 'spacing';
    const itemWidth = karaokeTextWidth(text, fontSize, spacing);
    const visibleLength = String(text).trim().length;
    const shouldBreak = !isSpacing &&
      lineWords > 0 &&
      lines.length < options.maxLines &&
      (current.width + itemWidth > maxLineWidth || current.items.reduce((sum, item) => sum + String(item.text || '').trim().length, 0) + visibleLength > options.charsPerLine);
    if (shouldBreak) {
      current = { items: [], width: 0 };
      lines.push(current);
      lineWords = 0;
    }
    if (isSpacing && !current.items.length) continue;
    current.items.push({ ...word, width: itemWidth });
    current.width += itemWidth;
    if (!isSpacing) lineWords += 1;
  }

  const lineHeight = Math.max(1, fontSize * subtitleLineHeight(subtitle));
  const totalHeight = lineHeight * lines.length;
  const firstLineCenterY = box.centerY - totalHeight / 2 + lineHeight / 2;
  const laidOutWords = [];

  lines.forEach((line, lineIndex) => {
    const lineX = box.centerX - line.width / 2;
    let cursor = lineX;
    for (const item of line.items) {
      if (item.type !== 'spacing') {
        laidOutWords.push({
          ...item,
          x: cursor,
          y: firstLineCenterY + lineIndex * lineHeight,
          width: item.width,
          height: lineHeight
        });
      }
      cursor += item.width;
    }
  });

  return {
    words: laidOutWords,
    lineCount: lines.length
  };
}

function roundedRectPath(width, height, radius) {
  const w = Math.max(1, Math.round(Number(width || 1)));
  const h = Math.max(1, Math.round(Number(height || 1)));
  const r = Math.max(0, Math.min(Number(radius || 0), Math.min(w, h) / 2));
  const rr = Math.round(r);
  if (r < 1) return `m 0 0 l ${w} 0 l ${w} ${h} l 0 ${h} l 0 0`;
  const c = Math.round(rr * 0.5522847498);
  return [
    `m ${rr} 0`,
    `l ${w - rr} 0`,
    `b ${w - rr + c} 0 ${w} ${rr - c} ${w} ${rr}`,
    `l ${w} ${h - rr}`,
    `b ${w} ${h - rr + c} ${w - rr + c} ${h} ${w - rr} ${h}`,
    `l ${rr} ${h}`,
    `b ${rr - c} ${h} 0 ${h - rr + c} 0 ${h - rr}`,
    `l 0 ${rr}`,
    `b 0 ${rr - c} ${rr - c} 0 ${rr} 0`
  ].join(' ');
}

function karaokeBoxDialogue(word, previousWord, subtitle) {
  const start = Number(word.start);
  const end = Number(word.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const padding = Math.max(0, Number(subtitle.karaokeBoxPadding ?? subtitle.highlightBoxPadding ?? 10));
  const radius = Math.max(0, Number(subtitle.karaokeBoxRadius ?? subtitle.highlightBoxRadius ?? 12));
  const boxWidth = Math.max(1, word.width + padding * 2);
  const boxHeight = Math.max(1, word.height + padding * 2);
  const left = Math.round(word.x - padding);
  const top = Math.round(word.y - boxHeight / 2);
  const color = assColorRgb(subtitle.karaokeBoxColor || subtitle.highlightBoxColor || '#2563EB');
  const alpha = assAlphaFromOpacity(subtitle.karaokeBoxOpacity ?? subtitle.highlightBoxOpacity ?? 0.72);
  const effect = String(subtitle.karaokeBoxEffect || subtitle.highlightBoxEffect || 'slide').toLowerCase();
  const previousLeft = previousWord ? Math.round(previousWord.x - padding) : left;
  const previousTop = previousWord ? Math.round(previousWord.y - boxHeight / 2) : top;
  const durationMs = Math.max(0, Math.round((end - start) * 1000));
  const slideMs = Math.max(40, Math.min(180, Math.round(durationMs * 0.35)));
  const position = effect === 'slide' && previousWord
    ? `\\move(${previousLeft},${previousTop},${left},${top},0,${slideMs})`
    : `\\pos(${left},${top})`;
  return `Dialogue: 0,${secondsToAssTime(start)},${secondsToAssTime(end)},Box,,0,0,0,,{\\an7${position}\\p1\\1c${color}\\1a&H${alpha}&}${roundedRectPath(boxWidth, boxHeight, radius)}`;
}

function karaokeDialoguesForWords(words, renderConfig, box) {
  const subtitle = karaokeRenderSubtitle(renderConfig.subtitle || {});
  const layoutConfig = { ...renderConfig, subtitle };
  if (!words.length) return [];
  const first = firstTimedWord(words);
  const last = lastTimedWord(words);
  const start = first?.start;
  const end = last?.end;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const baseFontSize = subtitleEffectiveFontSize(subtitle);
  const roughLineCount = Math.max(1, Math.min(karaokeChunkOptions(layoutConfig, box).maxLines, Math.ceil(karaokeVisibleText(words).length / Math.max(1, karaokeChunkOptions(layoutConfig, box).charsPerLine))));
  const fontSize = subtitleFitFontSize(subtitle, { boxHeight: box.height, lineCount: roughLineCount });
  const layout = layoutKaraokeWords(words, layoutConfig, box, fontSize);
  if (!layout.words.length) return [];
  const fontOverride = fontSize < baseFontSize ? `\\fs${fontSize}` : '';
  const boxDialogues = layout.words
    .map((word, index) => karaokeBoxDialogue(word, layout.words[index - 1] || null, subtitle))
    .filter(Boolean);
  const textDialogues = layout.words.map((word) => {
    const centerX = Math.round(word.x + word.width / 2);
    const centerY = Math.round(word.y);
    return `Dialogue: 1,${secondsToAssTime(start)},${secondsToAssTime(end)},Default,,0,0,0,,{\\an5\\pos(${centerX},${centerY})${fontOverride}}${escapeAssText(word.text)}`;
  });
  return [...boxDialogues, ...textDialogues];
}

function karaokeDialoguesForItem(item, renderConfig, box) {
  const words = item.words.length ? item.words : [];
  if (!words.length) {
    if (!item.text) return [];
    return [`Dialogue: 0,${secondsToAssTime(item.start)},${secondsToAssTime(item.end)},Default,,0,0,0,,{\\an5\\pos(${box.centerX},${box.centerY})}${escapeAssText(item.text)}`];
  }
  return splitKaraokeWords(words, renderConfig, box)
    .flatMap((chunk) => karaokeDialoguesForWords(chunk, renderConfig, box))
    .filter(Boolean);
}

function subtitleJsonToKaraokeAss(content, renderConfig = {}, box = null) {
  const items = parseKaraokeJson(content);
  const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const subtitle = karaokeRenderSubtitle(renderConfig.subtitle || {});
  const layoutConfig = { ...renderConfig, subtitle };
  const effectiveBox = box || {
    x: Math.round(width * 0.04),
    y: Math.round(height * 0.82),
    width: Math.round(width * 0.92),
    height: Math.round(height * 0.10),
    centerX: Math.round(width / 2),
    centerY: Math.round(height * 0.87)
  };
  const fontSize = subtitleEffectiveFontSize(subtitle);
  const fontWeight = subtitleFontWeight(subtitle);
  const spacing = subtitleLetterSpacing(subtitle, fontSize);
  const events = items.flatMap((item) => karaokeDialoguesForItem(item, layoutConfig, effectiveBox)).filter(Boolean);
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,${subtitleFontFamily(subtitle)},${fontSize},${assColor(subtitle.color || subtitle.subtitleColor || '#FFFFFF')},${assColor(subtitle.secondaryColor || subtitle.subtitleSecondaryColor || '#E0E0E0')},${assColor(subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000')},&H00000000,${fontWeight >= 700 ? -1 : 0},${subtitle.italic === true ? -1 : 0},0,0,100,100,${spacing},0,1,${Math.max(0, Number(subtitle.outlineWidth ?? subtitle.subtitleOutline ?? 1))},${Number(subtitle.shadow ?? 0)},5,0,0,0,1`,
    `Style: Box,Arial,20,${assColor(subtitle.karaokeBoxColor || subtitle.highlightBoxColor || '#2563EB', assAlphaFromOpacity(subtitle.karaokeBoxOpacity ?? subtitle.highlightBoxOpacity ?? 0.72))},&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    ''
  ].join('\n');
}

function subtitleJsonToSrt(content) {
  const items = parseKaraokeJson(content)
    .map((item) => {
      const words = Array.isArray(item.words) ? item.words : [];
      const itemStart = item.start ?? item.startMs ?? item.start_ms ?? null;
      const itemEnd = item.end ?? item.endMs ?? item.end_ms ?? null;
      const start = itemStart !== null && Number.isFinite(Number(itemStart)) ? Number(itemStart) : Number(words[0]?.start);
      const end = itemEnd !== null && Number.isFinite(Number(itemEnd)) ? Number(itemEnd) : Number(words[words.length - 1]?.end);
      const text = String(item.text || previewTextFromWords(words) || '').trim();
      return { start, end, text };
    })
    .filter((item) => item.text && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
  if (!items.length) return null;
  return `${items.map((item, index) => [
    String(index + 1),
    `${secondsToSrtTime(item.start)} --> ${secondsToSrtTime(item.end)}`,
    item.text
  ].join('\n')).join('\n\n')}\n`;
}

// Bảng tỷ lệ độ rộng ký tự chuẩn TrueType (advanceWidth / winHeight) trích xuất từ Arial Bold (arialbd.ttf)
const CAPCUT_ARIAL_BOLD_CHAR_RATIOS = {
  '0': 0.4978, '1': 0.4978, '2': 0.4978, '3': 0.4978, '4': 0.4978,
  '5': 0.4978, '6': 0.4978, '7': 0.4978, '8': 0.4978, '9': 0.4978,
  ' ': 0.2487, '!': 0.2981, '"': 0.4244, '#': 0.4978, '$': 0.4978,
  '%': 0.7959, '&': 0.6464, "'": 0.2128, '’': 0.2128, '(': 0.2981,
  ')': 0.2981, '*': 0.3483, '+': 0.5227, ',': 0.2487, '-': 0.2981,
  '—': 0.8951, '.': 0.2487, '/': 0.2487, ':': 0.2981, ';': 0.2981,
  '<': 0.5227, '=': 0.5227, '>': 0.5227, '?': 0.5468, '@': 0.8728,
  'A': 0.6464, 'B': 0.6464, 'C': 0.6464, 'D': 0.6464, 'E': 0.597,
  'F': 0.5468, 'G': 0.6962, 'H': 0.6464, 'I': 0.2487, 'J': 0.4978,
  'K': 0.6464, 'L': 0.5468, 'M': 0.7456, 'N': 0.6464, 'O': 0.6962,
  'P': 0.597,  'Q': 0.6962, 'R': 0.6464, 'S': 0.597,  'T': 0.5468,
  'U': 0.6464, 'V': 0.597,  'W': 0.8448, 'X': 0.597,  'Y': 0.597,
  'Z': 0.5468
};

function isKaraokeBoxEffect(subtitle = {}) {
  const effect = String(subtitle?.subtitleEffect || subtitle?.stylePreset || 'none').trim().toLowerCase();
  return effect === 'karaoke_box';
}

function measureCapCutWord(word, fontSize) {
  let sum = 0;
  for (const ch of String(word || '').toUpperCase()) {
    sum += (CAPCUT_ARIAL_BOLD_CHAR_RATIOS[ch] ?? 0.58) * fontSize;
  }
  return Math.max(12, Math.round(sum));
}

function parseSrtTimeSeconds(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  const ms = Number(String(match[4]).padEnd(3, '0').slice(0, 3));
  return h * 3600 + m * 60 + s + ms / 1000;
}

function extractCapCutWordTimings(content) {
  const raw = String(content || '').trim();
  if (!raw) return [];

  // 1. Thử đọc JSON word-timestamps (mảng phẳng [{ word, start, end }] từ Whisper hoặc JSON lồng nhau)
  const parsed = safeParseJson(raw);
  if (parsed) {
    if (Array.isArray(parsed) && parsed.length > 0 && ('word' in parsed[0] || (!parsed[0].words && 'text' in parsed[0]))) {
      return parsed
        .map((w) => {
          const rawText = String(w.word ?? w.text ?? '').trim().toUpperCase();
          if (!rawText) return null;
          const cleanText = rawText.replace(/^[,.;:!?"]+|[,.;:!?"]+$/g, '') || rawText;
          const start = readTime(w, ['startMs', 'start_ms', 'start_msec', 'start']);
          const end = readTime(w, ['endMs', 'end_ms', 'end_msec', 'end']);
          if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
          return {
            rawText,
            text: cleanText,
            start: Math.max(0, Number(start)),
            end: Math.max(Number(start) + 0.06, Number(end))
          };
        })
        .filter(Boolean);
    }

    const items = parseKaraokeJson(raw);
    const wordsFromItems = [];
    for (const item of items) {
      if (Array.isArray(item.words) && item.words.length > 0) {
        for (const w of item.words) {
          if (w.type === 'spacing') continue;
          const rawText = String(w.text || '').trim().toUpperCase();
          if (!rawText) continue;
          const cleanText = rawText.replace(/^[,.;:!?"]+|[,.;:!?"]+$/g, '') || rawText;
          wordsFromItems.push({
            rawText,
            text: cleanText,
            start: Math.max(0, Number(w.start)),
            end: Math.max(Number(w.start) + 0.06, Number(w.end))
          });
        }
      }
    }
    if (wordsFromItems.length > 0) return wordsFromItems;
  }

  // 2. Đọc từ nội dung file .SRT thông thường và chia thời gian từng từ theo tỷ lệ độ dài ký tự
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const words = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((l) => /-->/.test(l));
    if (timingIndex < 0) continue;
    const [startRaw, endRaw] = lines[timingIndex].split(/\s*-->\s*/);
    const cueStart = parseSrtTimeSeconds(startRaw);
    const cueEnd = parseSrtTimeSeconds(endRaw);
    if (!Number.isFinite(cueStart) || !Number.isFinite(cueEnd) || cueEnd <= cueStart) continue;
    const cueText = lines
      .slice(timingIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cueText) continue;
    const tokens = cueText.split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;

    const weights = tokens.map((tok) => {
      const cleaned = tok.replace(/^[,.;:!?"]+|[,.;:!?"]+$/g, '');
      const extraPause = /[.!?,;:]$/.test(tok) ? 1.5 : 0;
      return Math.max(1, cleaned.length) + extraPause;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
    const totalDuration = Math.max(0.12, cueEnd - cueStart);
    let cursor = cueStart;

    tokens.forEach((tok, idx) => {
      const rawText = tok.toUpperCase();
      const cleanText = rawText.replace(/^[,.;:!?"]+|[,.;:!?"]+$/g, '') || rawText;
      const isLast = idx === tokens.length - 1;
      const dur = isLast ? Math.max(0.06, cueEnd - cursor) : Math.max(0.06, (weights[idx] / totalWeight) * totalDuration);
      const wStart = cursor;
      const wEnd = isLast ? cueEnd : Math.min(cueEnd, wStart + dur);
      words.push({
        rawText,
        text: cleanText,
        start: Math.max(0, wStart),
        end: Math.max(wStart + 0.06, wEnd)
      });
      cursor = wEnd;
    });
  }
  return words;
}

function buildCapCutKaraokeBoxAss(content, renderConfig = {}, box = null) {
  const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const subtitle = renderConfig.subtitle || {};
  const rawWords = extractCapCutWordTimings(content);

  // Gom các từ thành cụm ngắn 1 dòng chuẩn CapCut (tối đa 5 từ, tối đa 26 ký tự, ngắt câu theo dấu câu hoặc khoảng nghỉ >= 0.28s)
  const phrases = [];
  let current = [];
  let currentChars = 0;

  for (let i = 0; i < rawWords.length; i += 1) {
    const w = rawWords[i];
    const prev = current[current.length - 1];
    const gap = prev ? (w.start - prev.end) : 0;
    const nextChars = currentChars ? currentChars + 1 + w.text.length : w.text.length;

    if (current.length > 0 && (current.length >= 5 || nextChars > 26 || gap >= 0.28)) {
      phrases.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(w);
    currentChars = current.length === 1 ? w.text.length : currentChars + 1 + w.text.length;

    if (/[.!?,;:]$/.test(w.rawText)) {
      phrases.push(current);
      current = [];
      currentChars = 0;
    }
  }
  if (current.length > 0) phrases.push(current);

  // Cỡ chữ trong ASS PlayResY=1080: mặc định template fontSize=32 tương ứng 72px trong ASS (chuẩn video mẫu CapCut 1080p)
  const rawInputSize = Number(subtitle.fontSize || 32);
  const baseFontSize = Math.max(42, Math.min(96, Math.round(rawInputSize <= 48 ? rawInputSize * 2.25 : rawInputSize * 1.45)));
  const centerY = box && Number.isFinite(Number(box.centerY))
    ? Math.max(80, Math.min(height - 60, Math.round(Number(box.centerY))))
    : 925;
  const centerX = box && Number.isFinite(Number(box.centerX))
    ? Math.round(Number(box.centerX))
    : Math.round(width / 2);
  const maxAllowedWidth = Math.round(width * 0.90);

  const boxColorBgr = assColorRgb(subtitle.karaokeBoxColor || '#7C00FF');
  const textColorAss = assColor(subtitle.color || subtitle.subtitleColor || '#FFFFFF');
  const outlineColorAss = assColor(subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000');
  const outlineWidth = Math.max(1.5, Number(subtitle.outlineWidth ?? subtitle.subtitleOutline ?? 1.6) || 1.6);

  const events = [];

  for (const phrase of phrases) {
    if (!phrase.length) continue;
    const phraseStart = phrase[0].start;
    const phraseEnd = phrase[phrase.length - 1].end;

    let fontSize = baseFontSize;
    let gapPx = Math.round(fontSize * 0.30);
    let widths = phrase.map((w) => measureCapCutWord(w.text, fontSize));
    let totalW = widths.reduce((a, b) => a + b, 0) + gapPx * (phrase.length - 1);

    if (totalW > maxAllowedWidth && totalW > 0) {
      const ratio = maxAllowedWidth / totalW;
      fontSize = Math.max(36, Math.floor(baseFontSize * ratio));
      gapPx = Math.round(fontSize * 0.30);
      widths = phrase.map((w) => measureCapCutWord(w.text, fontSize));
      totalW = widths.reduce((a, b) => a + b, 0) + gapPx * (phrase.length - 1);
    }

    const padX = Math.max(10, Math.round(fontSize * 0.21));
    const padY = Math.max(5, Math.round(fontSize * 0.11));
    const boxH = Math.round(fontSize * 0.70) + padY * 2;
    const boxCenterY = centerY + Math.round(fontSize * 0.02);
    const radius = Math.max(6, Math.round(fontSize * 0.18));
    const fontOverride = fontSize !== baseFontSize ? `\\fs${fontSize}` : '';

    let curX = Math.round(centerX - totalW / 2);

    phrase.forEach((w, idx) => {
      const wW = widths[idx];
      const cX = Math.round(curX + wW / 2);
      const boxW = wW + padX * 2;
      const boxLeft = Math.round(cX - boxW / 2);
      const boxTop = Math.round(boxCenterY - boxH / 2);

      const nextWord = phrase[idx + 1];
      const wordStart = w.start;
      const wordEnd = (nextWord && (nextWord.start - w.end) <= 0.25) ? nextWord.start : w.end;

      if (wordEnd > wordStart) {
        events.push(
          `Dialogue: 0,${secondsToAssTime(wordStart)},${secondsToAssTime(wordEnd)},Box,,0,0,0,,{\\an7\\pos(${boxLeft},${boxTop})\\p1\\1c${boxColorBgr}\\1a&H00&}${roundedRectPath(boxW, boxH, radius)}`
        );
      }
      events.push(
        `Dialogue: 1,${secondsToAssTime(phraseStart)},${secondsToAssTime(phraseEnd)},Default,,0,0,0,,{\\an5\\pos(${cX},${centerY})${fontOverride}}${escapeAssText(w.text)}`
      );

      curX += wW + gapPx;
    });
  }

  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Arial,${baseFontSize},${textColorAss},${textColorAss},${outlineColorAss},&H64000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},1.5,5,0,0,0,1`,
    `Style: Box,Arial,20,${assColor(subtitle.karaokeBoxColor || '#7C00FF')},&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    ''
  ].join('\n');
}

module.exports = {
  parseKaraokeJson,
  subtitleJsonPreviewText,
  subtitleJsonToKaraokeAss,
  subtitleJsonToSrt,
  isKaraokeBoxEffect,
  extractCapCutWordTimings,
  buildCapCutKaraokeBoxAss
};
