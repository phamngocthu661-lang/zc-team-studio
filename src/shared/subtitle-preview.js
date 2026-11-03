'use strict';

const { clamp } = require('./core');

function assColor(hex, alpha = '00') {
  const clean = String(hex || '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  return `&H${alpha}${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`;
}

function subtitleFontFamily(subtitle = {}) {
  const family = String(subtitle.fontFamily || subtitle.subtitleFont || 'Arial').trim();
  if (!family) return 'Arial';
  return family.replace(/['"\\]/g, '').trim() || 'Arial';
}

function subtitleFontWeight(subtitle = {}) {
  const weight = Number(subtitle.fontWeight);
  if (Number.isFinite(weight) && weight > 0) return weight;
  return subtitle.bold === true ? 700 : 400;
}

function subtitleLetterSpacing(subtitle = {}, fontSize = 0) {
  const px = Number(subtitle.letterSpacingPx ?? subtitle.letterSpacing);
  if (Number.isFinite(px)) return px;
  const em = Number(subtitle.letterSpacingEm);
  if (Number.isFinite(em)) return em * Number(fontSize || 0);
  return 0;
}

function subtitleEffectiveFontSize(subtitle = {}) {
  const assScale = Number(subtitle.assScale ?? 1);
  const safeAssScale = Number.isFinite(assScale) ? assScale : 1;
  return Math.max(8, Math.round(Number(subtitle.fontSize || 32) * safeAssScale * subtitleExportFontScale(subtitle)));
}

function subtitleLineHeight(subtitle = {}) {
  const value = Number(subtitle.lineHeight ?? 1.2);
  return Number.isFinite(value) ? Math.max(1, Math.min(1.5, value)) : 1.2;
}

function subtitleFitFontSize(subtitle = {}, { boxWidth = 0, boxHeight = 0, lineCount = 1, maxLineChars = 0 } = {}) {
  const baseFontSize = subtitleEffectiveFontSize(subtitle);
  let fitted = baseFontSize;
  const height = Number(boxHeight);
  const lines = Math.max(1, Math.round(Number(lineCount || 1)));
  const outline = Math.max(0, Number(subtitle.outlineWidth ?? subtitle.subtitleOutline ?? 0));

  // 1. Co font theo chiều cao khung chữ để không bao giờ bị rơi ra khỏi đáy màn hình
  if (Number.isFinite(height) && height > 0) {
    const usableHeight = Math.max(8, height - outline * 2 - 4);
    const maxFontByHeight = Math.floor(usableHeight / (lines * subtitleLineHeight(subtitle)));
    if (maxFontByHeight > 8) {
      fitted = Math.min(fitted, maxFontByHeight);
    }
  }

  // 2. Co font theo chiều rộng khung chữ để không bao giờ bị văng ra 2 mép
  const width = Number(boxWidth);
  const chars = Number(maxLineChars);
  if (Number.isFinite(width) && width > 0 && chars > 0) {
    const usableWidth = Math.max(20, width - outline * 2 - 8);
    const maxFontByWidth = Math.floor(usableWidth / (chars * 0.58));
    if (maxFontByWidth > 8) {
      fitted = Math.min(fitted, maxFontByWidth);
    }
  }

  return Math.max(8, fitted);
}

function parseSrtTimestampMs(timeStr) {
  const m = String(timeStr || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!m) return 0;
  return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000 + Number(m[4].padEnd(3, '0').slice(0, 3));
}

function formatSrtTimestamp(ms) {
  const safeMs = Math.max(0, Math.round(Number(ms) || 0));
  const totalSec = Math.floor(safeMs / 1000);
  const millis = safeMs % 1000;
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function splitLongSrtCues(content, { maxChars = 42, maxWords = 8 } = {}) {
  if (!content || typeof content !== 'string') return content;
  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const newBlocks = [];
  let cueIndex = 1;

  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim() !== '');
    const timingIndex = lines.findIndex(l => /-->/.test(l));
    if (timingIndex < 0) {
      if (lines.length > 0) newBlocks.push(lines.join('\n'));
      continue;
    }

    const timingLine = lines[timingIndex];
    const [startRaw, endRaw] = timingLine.split(/\s*-->\s*/);
    const startMs = parseSrtTimestampMs(startRaw);
    const endMs = parseSrtTimestampMs(endRaw);
    const durationMs = Math.max(100, endMs - startMs);

    const rawText = lines.slice(timingIndex + 1).map(l => l.trim()).filter(Boolean).join(' ');
    if (!rawText) continue;

    const words = rawText.split(/\s+/).filter(Boolean);
    const charCount = rawText.length;

    // Nếu câu ngắn (dưới maxChars và dưới maxWords), giữ nguyên
    if (charCount <= maxChars && words.length <= maxWords) {
      newBlocks.push(`${cueIndex++}\n${timingLine}\n${rawText}`);
      continue;
    }

    // Nhóm các từ lại thành các đoạn nhỏ
    const chunks = [];
    let currentChunk = [];
    let currentChunkLen = 0;

    for (const w of words) {
      const candidateLen = currentChunkLen === 0 ? w.length : currentChunkLen + 1 + w.length;
      if (currentChunk.length > 0 && (candidateLen > maxChars || currentChunk.length >= maxWords)) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [w];
        currentChunkLen = w.length;
      } else {
        currentChunk.push(w);
        currentChunkLen = candidateLen;
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    if (chunks.length <= 1) {
      newBlocks.push(`${cueIndex++}\n${timingLine}\n${rawText}`);
      continue;
    }

    // Tính tổng ký tự của tất cả các chunk để phân bổ thời gian chính xác
    const totalChunkChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
    let currentStartMs = startMs;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const isLast = (i === chunks.length - 1);
      const chunkFraction = chunkText.length / totalChunkChars;
      const chunkDur = isLast ? (endMs - currentStartMs) : Math.round(durationMs * chunkFraction);
      const chunkEndMs = isLast ? endMs : Math.min(endMs, currentStartMs + Math.max(150, chunkDur));

      newBlocks.push(
        `${cueIndex++}\n${formatSrtTimestamp(currentStartMs)} --> ${formatSrtTimestamp(chunkEndMs)}\n${chunkText}`
      );
      currentStartMs = chunkEndMs;
    }
  }

  return newBlocks.join('\n\n') + '\n';
}

function subtitleExportFontScale(subtitle = {}) {
  const value = Number(subtitle.exportFontScale ?? subtitle.exportScale ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function subtitleExportBoxScale(subtitle = {}) {
  const value = Number(subtitle.exportBoxScale ?? subtitle.exportScale ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function subtitleStyle(config = {}) {
  const style = config.subtitle || config;
  const width = Number(config.width || config.canvas?.width || 1920);
  const height = Number(config.height || config.canvas?.height || 1080);
  const maxWidthPercent = clamp(Number(style.boxWidthPercent || style.maxWidthPercent || 96), 10, 100);
  const sideMargin = Math.max(0, Math.round(width * (100 - maxWidthPercent) / 200));
  const marginLeft = sideMargin;
  const marginRight = sideMargin;
  const assScale = Number(style.assScale ?? 1);
  const exportFontScale = Number(style.exportFontScale ?? style.exportScale ?? 1);
  const fontSize = Math.max(
    8,
    Math.round(Number(style.fontSize || style.subtitleSize || 52) * (Number.isFinite(assScale) ? assScale : 1) * (Number.isFinite(exportFontScale) ? exportFontScale : 1))
  );
  const outlineWidth = Number(style.outlineWidth ?? style.subtitleOutline ?? 0);
  const fontWeight = subtitleFontWeight(style);
  const letterSpacing = subtitleLetterSpacing(style, fontSize);
  const bottomMargin = clamp(Number(style.bottomMargin ?? style.subtitleBottomMargin ?? 80), 0, Math.round(height * 0.45));
  return [
    `FontName=${subtitleFontFamily(style)}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=${assColor(style.color || style.subtitleColor || '#FFFFFF')}`,
    `SecondaryColour=${assColor(style.secondaryColor || style.subtitleSecondaryColor || style.color || style.subtitleColor || '#FFFFFF')}`,
    `OutlineColour=${assColor(style.outlineColor || style.subtitleOutlineColor || '#000000')}`,
    `Outline=${Math.max(0, outlineWidth)}`,
    `Shadow=${Number(style.shadow ?? 1)}`,
    `Bold=${fontWeight >= 700 ? 1 : 0}`,
    `Italic=${style.italic === true ? 1 : 0}`,
    'BorderStyle=1',
    'Alignment=2',
    `Spacing=${letterSpacing}`,
    `MarginL=${marginLeft}`,
    `MarginR=${marginRight}`,
    `MarginV=${bottomMargin}`
  ].join(',');
}

function subtitlePreviewBox(renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  const width = Number(renderConfig.width || renderConfig.canvas?.width || 1920);
  const height = Number(renderConfig.height || renderConfig.canvas?.height || 1080);
  const exportScale = subtitleExportBoxScale(subtitle);
  const baseBoxWidthPercent = clamp(Number(subtitle.boxWidthPercent || subtitle.maxWidthPercent || 96), 10, 100);
  const baseBoxHeightPercent = clamp(Number(subtitle.boxHeightPercent || 8), 1, 60);
  const boxWidthPercent = clamp(baseBoxWidthPercent * exportScale, 10, 100);
  const boxHeightPercent = clamp(baseBoxHeightPercent * exportScale, 1, 60);
  const boxWidth = Math.round(width * boxWidthPercent / 100);
  const boxHeight = Math.round(height * boxHeightPercent / 100);
  const defaultX = (width - boxWidth) / 2;
  const defaultY = height - Number(subtitle.bottomMargin ?? 20) - boxHeight;
  const xPercent = Number.isFinite(Number(subtitle.boxXPercent))
    ? Number(subtitle.boxXPercent) + baseBoxWidthPercent / 2 - boxWidthPercent / 2
    : defaultX / width * 100;
  const yPercent = Number.isFinite(Number(subtitle.boxYPercent))
    ? Number(subtitle.boxYPercent) + baseBoxHeightPercent / 2 - boxHeightPercent / 2
    : defaultY / height * 100;
  const x = clamp(Math.round(width * xPercent / 100), 0, Math.max(0, width - boxWidth));
  const y = clamp(Math.round(height * yPercent / 100), 0, Math.max(0, height - boxHeight));
  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    centerX: Math.round(x + boxWidth / 2),
    centerY: Math.round(y + boxHeight / 2)
  };
}

module.exports = {
  subtitleStyle,
  subtitleEffectiveFontSize,
  subtitlePreviewBox,
  subtitleLineHeight,
  subtitleFitFontSize,
  subtitleFontFamily,
  subtitleFontWeight,
  subtitleLetterSpacing,
  splitLongSrtCues,
  parseSrtTimestampMs,
  formatSrtTimestamp
};

