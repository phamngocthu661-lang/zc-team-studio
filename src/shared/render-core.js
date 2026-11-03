'use strict';

const { clamp } = require('./core');
const {
  subtitlePreviewBox,
  subtitleEffectiveFontSize,
  subtitleFitFontSize,
  subtitleLineHeight,
  subtitleFontFamily,
  subtitleFontWeight,
  subtitleLetterSpacing
} = require('./subtitle-preview');

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanZero(value) {
  return Math.abs(value) < 1e-9 ? 0 : value;
}

function projectCanvas(config = {}) {
  const canvas = config.canvas || config;
  return {
    width: Math.max(1, numberOr(config.width ?? canvas.width, 1920)),
    height: Math.max(1, numberOr(config.height ?? canvas.height, 1080)),
    fps: Math.max(1, numberOr(config.fps ?? canvas.fps, 24))
  };
}

function previewViewport(project = {}, viewport = {}) {
  const width = Math.max(1, numberOr(project.width, 1920));
  const height = Math.max(1, numberOr(project.height, 1080));
  const viewportWidth = Math.max(1, numberOr(viewport.width, width));
  const viewportHeight = Math.max(1, numberOr(viewport.height, height));
  const scale = Math.min(viewportWidth / width, viewportHeight / height);
  const offsetX = (viewportWidth - width * scale) / 2;
  const offsetY = (viewportHeight - height * scale) / 2;
  return { width, height, viewportWidth, viewportHeight, scale, offsetX: cleanZero(offsetX), offsetY: cleanZero(offsetY) };
}

function previewPointToProject(point = {}, project = {}, viewport = {}) {
  const map = previewViewport(project, viewport);
  return {
    x: (numberOr(point.x, 0) - map.offsetX) / map.scale,
    y: (numberOr(point.y, 0) - map.offsetY) / map.scale
  };
}

function previewDeltaToProject(delta = {}, project = {}, viewport = {}) {
  const map = previewViewport(project, viewport);
  return {
    dx: numberOr(delta.dx, 0) / map.scale,
    dy: numberOr(delta.dy, 0) / map.scale
  };
}

function frameTime(frameIndex, fps) {
  return Math.max(0, Math.round(numberOr(frameIndex, 0))) / Math.max(1, numberOr(fps, 24));
}

function normalizeLayerTransform(layer = {}, canvas = {}) {
  const transform = layer.transform || {};
  const width = Math.max(1, numberOr(transform.width, numberOr(canvas.width, 1920) * 0.2));
  const height = Math.max(1, numberOr(transform.height, numberOr(canvas.height, 1080) * 0.2));
  return {
    x: numberOr(transform.x, 0),
    y: numberOr(transform.y, 0),
    width,
    height,
    anchorX: clamp(numberOr(transform.anchorX, 0.5), 0, 1),
    anchorY: clamp(numberOr(transform.anchorY, 0.5), 0, 1),
    scaleX: numberOr(transform.scaleX, 1),
    scaleY: numberOr(transform.scaleY, 1),
    rotation: numberOr(transform.rotation, 0),
    opacity: clamp(numberOr(transform.opacity ?? layer.style?.opacity, 1), 0, 1)
  };
}

function rotatedBoundingBox(width, height, rotationDegrees = 0) {
  const angle = numberOr(rotationDegrees, 0) * Math.PI / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos
  };
}

function resolveLayerFrame(layer = {}, config = {}, frameIndex = 0) {
  const canvas = projectCanvas(config);
  const transform = normalizeLayerTransform(layer, canvas);
  const scaledWidth = transform.width * Math.abs(transform.scaleX || 1);
  const scaledHeight = transform.height * Math.abs(transform.scaleY || 1);
  const bbox = rotatedBoundingBox(scaledWidth, scaledHeight, transform.rotation);
  const anchorX = transform.x + transform.width * transform.anchorX;
  const anchorY = transform.y + transform.height * transform.anchorY;
  const time = frameTime(frameIndex, canvas.fps);
  const startMs = Math.max(0, numberOr(layer.startMs ?? layer.timing?.startMs, 0));
  const endMsRaw = layer.endMs ?? layer.timing?.endMs;
  const endMs = Number.isFinite(Number(endMsRaw)) ? Number(endMsRaw) : Infinity;
  return {
    id: layer.id || '',
    type: layer.type || layer.layerType || layer.layer_type || '',
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
    anchorX: transform.anchorX,
    anchorY: transform.anchorY,
    anchorProjectX: anchorX,
    anchorProjectY: anchorY,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    rotation: transform.rotation,
    opacity: transform.opacity,
    visualX: anchorX - bbox.width * transform.anchorX,
    visualY: anchorY - bbox.height * transform.anchorY,
    visualWidth: bbox.width,
    visualHeight: bbox.height,
    startMs,
    endMs,
    visibleAtFrame: time * 1000 >= startMs && time * 1000 <= endMs
  };
}

function calculateMediaLayout(sourceWidth, sourceHeight, containerWidth, containerHeight, fitMode = 'contain', crop = {}) {
  const sw = Math.max(1, numberOr(sourceWidth, 1));
  const sh = Math.max(1, numberOr(sourceHeight, 1));
  const cw = Math.max(1, numberOr(containerWidth, 1));
  const ch = Math.max(1, numberOr(containerHeight, 1));
  const mode = String(fitMode || 'contain').toLowerCase();
  let drawWidth = cw;
  let drawHeight = ch;
  if (mode === 'contain' || mode === 'fit-width' || mode === 'fit-height' || mode === 'original') {
    const scale = mode === 'fit-width' ? cw / sw :
      mode === 'fit-height' ? ch / sh :
        mode === 'original' ? 1 : Math.min(cw / sw, ch / sh);
    drawWidth = sw * scale;
    drawHeight = sh * scale;
  } else if (mode === 'cover') {
    const scale = Math.max(cw / sw, ch / sh);
    drawWidth = sw * scale;
    drawHeight = sh * scale;
  }
  const sourceCropX = clamp(numberOr(crop.x, 0), 0, sw);
  const sourceCropY = clamp(numberOr(crop.y, 0), 0, sh);
  const sourceCropWidth = clamp(numberOr(crop.width, sw - sourceCropX), 1, sw - sourceCropX);
  const sourceCropHeight = clamp(numberOr(crop.height, sh - sourceCropY), 1, sh - sourceCropY);
  return {
    drawX: (cw - drawWidth) / 2,
    drawY: (ch - drawHeight) / 2,
    drawWidth,
    drawHeight,
    sourceCropX,
    sourceCropY,
    sourceCropWidth,
    sourceCropHeight
  };
}

function layerCssBox(layer = {}, config = {}) {
  const frame = resolveLayerFrame(layer, config);
  const canvas = projectCanvas(config);
  return {
    left: `${frame.x / canvas.width * 100}%`,
    top: `${frame.y / canvas.height * 100}%`,
    width: `${frame.width / canvas.width * 100}%`,
    height: `${frame.height / canvas.height * 100}%`,
    opacity: String(frame.opacity),
    transformOrigin: `${frame.anchorX * 100}% ${frame.anchorY * 100}%`,
    transform: `rotate(${frame.rotation}deg) scale(${frame.scaleX},${frame.scaleY})`
  };
}

function ffmpegLayerFitFilter(frame = {}, fitMode = 'contain') {
  const width = Math.max(1, Math.round(numberOr(frame.width, 1)));
  const height = Math.max(1, Math.round(numberOr(frame.height, 1)));
  const mode = String(fitMode || 'contain').toLowerCase();
  if (mode === 'cover') {
    return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`;
  }
  if (mode === 'stretch') {
    return `scale=${width}:${height},setsar=1`;
  }
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1`;
}

function ffmpegOverlayPosition(frame = {}) {
  return {
    x: Math.round(numberOr(frame.visualX, frame.x)),
    y: Math.round(numberOr(frame.visualY, frame.y))
  };
}

function subtitleFrame(config = {}, content = '') {
  const canvas = projectCanvas(config);
  const subtitle = config.subtitle || {};
  const box = subtitlePreviewBox({ width: canvas.width, height: canvas.height, subtitle });
  const lineCount = Math.max(1, String(content || '').split(/\r?\n/).filter(Boolean).length || Number(subtitle.maxLines || 1));
  const baseFontSize = subtitleEffectiveFontSize(subtitle);
  const fontSize = subtitleFitFontSize(subtitle, { boxHeight: box.height, lineCount });
  return {
    ...box,
    fontFamily: subtitleFontFamily(subtitle),
    fontWeight: subtitle.bold === true ? 700 : subtitleFontWeight(subtitle),
    fontSize,
    baseFontSize,
    lineHeight: subtitleLineHeight(subtitle),
    letterSpacing: subtitleLetterSpacing(subtitle, fontSize),
    color: subtitle.color || subtitle.subtitleColor || '#FFFFFF',
    outlineColor: subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000',
    outlineWidth: Math.max(0, numberOr(subtitle.outlineWidth ?? subtitle.subtitleOutline, 0)),
    shadow: numberOr(subtitle.shadow, 1)
  };
}

function resolveFrameState(config = {}, frameIndex = 0, subtitleText = '') {
  const canvas = projectCanvas(config);
  const layers = (Array.isArray(config.layers) ? config.layers : [])
    .filter((layer) => layer.visible !== false && layer.visible !== 0)
    .map((layer) => resolveLayerFrame(layer, canvas, frameIndex));
  return {
    frameIndex: Math.max(0, Math.round(numberOr(frameIndex, 0))),
    time: frameTime(frameIndex, canvas.fps),
    canvas,
    layers,
    subtitle: subtitleFrame({ ...config, ...canvas }, subtitleText)
  };
}

module.exports = {
  projectCanvas,
  previewViewport,
  previewPointToProject,
  previewDeltaToProject,
  frameTime,
  normalizeLayerTransform,
  rotatedBoundingBox,
  calculateMediaLayout,
  resolveLayerFrame,
  layerCssBox,
  ffmpegLayerFitFilter,
  ffmpegOverlayPosition,
  subtitleFrame,
  resolveFrameState
};
