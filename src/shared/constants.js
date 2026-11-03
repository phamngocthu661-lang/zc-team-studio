'use strict';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.vtt', '.json']);

const ASSET_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE', RESERVED: 'RESERVED', USED: 'USED', INVALID: 'INVALID',
  MISSING: 'MISSING', MOVING: 'MOVING'
});
const BATCH_STATUS = Object.freeze({
  DRAFT: 'DRAFT', PREFLIGHT: 'PREFLIGHT', READY: 'READY', RUNNING: 'RUNNING', PAUSED: 'PAUSED',
  PAUSED_INSUFFICIENT_STOCK: 'PAUSED_INSUFFICIENT_STOCK', PAUSED_LICENSE: 'PAUSED_LICENSE',
  COMPLETED: 'COMPLETED', FAILED: 'FAILED', CANCELLED: 'CANCELLED'
});
const JOB_STATUS = Object.freeze({
  PENDING: 'PENDING', WAITING: 'WAITING', VALIDATING: 'VALIDATING', PREPARING: 'PREPARING',
  RENDERING: 'RENDERING', VERIFYING: 'VERIFYING', RETRYING: 'RETRYING', COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED', FAILED: 'FAILED', CANCELLED: 'CANCELLED', INTERRUPTED: 'INTERRUPTED'
});
const BACKGROUND_MODE = Object.freeze({
  STOCK_VIDEO: 'STOCK_VIDEO', SINGLE_STOCK: 'SINGLE_STOCK', MATCHED_STOCK: 'MATCHED_STOCK',
  IMAGE_SEQUENCE: 'IMAGE_SEQUENCE', MANUAL_MEDIA: 'MANUAL_MEDIA',
  STORY_PIP_STOCK: 'STORY_PIP_STOCK', STORY_IMAGE: 'STORY_IMAGE'
});
const LAYER_TYPE = Object.freeze({
  SUBTITLE: 'SUBTITLE', LOGO: 'LOGO', TEXT: 'TEXT', IMAGE: 'IMAGE', VIDEO: 'VIDEO',
  VOICE_IMAGE: 'VOICE_IMAGE',
  GREENSCREEN_IMAGE: 'GREENSCREEN_IMAGE', GREENSCREEN_VIDEO: 'GREENSCREEN_VIDEO',
  OVERLAY_IMAGE: 'OVERLAY_IMAGE', OVERLAY_VIDEO: 'OVERLAY_VIDEO'
});
const LIBRARY_TYPE = Object.freeze({
  STOCK: 'STOCK', IMAGE: 'IMAGE', LOGO: 'LOGO', OVERLAY: 'OVERLAY', GREENSCREEN: 'GREENSCREEN', FONT: 'FONT'
});
const GENTLE_TRANSITIONS = Object.freeze([
  { id: 'fade', label: 'Cross Fade', weight: 40, recommended: true },
  { id: 'dissolve', label: 'Cross Dissolve', weight: 20, recommended: true },
  { id: 'hblur', label: 'Soft Blur', weight: 12, recommended: true },
  { id: 'zoomin', label: 'Gentle Zoom In', weight: 8, recommended: true },
  { id: 'fadegrays', label: 'Gentle Zoom Out', weight: 8, recommended: true },
  { id: 'smoothleft', label: 'Soft Slide Left', weight: 5, recommended: true },
  { id: 'smoothright', label: 'Soft Slide Right', weight: 5, recommended: true },
  { id: 'smoothup', label: 'Soft Slide Up', weight: 2, recommended: false },
  { id: 'smoothdown', label: 'Soft Slide Down', weight: 2, recommended: false },
  { id: 'fadeblack', label: 'Fade Through Black', weight: 2, recommended: true }
]);
const STANDARD_CANVAS_WIDTH = 1920;
const STANDARD_CANVAS_HEIGHT = 1080;
const DEFAULT_EXPORT_PRESET = Object.freeze({
  name: '1080p Auto GPU Stable', container: 'mp4', videoCodec: 'auto', width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT,
  fps: 24, rateControl: 'VBR', audioCodec: 'aac', audioBitrateKbps: 256, audioSampleRate: 48000,
  gbPerHour: 2, safetyPercent: 95, maxRetryCount: 2, performanceProfile: 'MAX_SPEED', nvencPreset: 'p1', accelerationMode: 'AUTO_STABLE', gpuIndex: -1, maxParallelJobs: 1, allowCpuFallback: true, cpuPreset: 'veryfast'
});
const DEFAULT_TEMPLATE = Object.freeze({
  name: 'Default 16:9', canvas: { width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT, fps: 24 },
  backgroundMode: BACKGROUND_MODE.STOCK_VIDEO,
  subtitle: { enabled: true, renderer: 'canvas', stylePreset: 'simple', subtitleEffect: 'none', karaokeBoxColor: '#7C00FF', fontFamily: 'Arial', fontSize: 32, minimumFontSize: 28, maxLines: 4,
    maxWidthPercent: 96, position: 'BOTTOM_CENTER', positionMode: 'absolute', boxXPercent: 2,
    boxYPercent: 84, boxWidthPercent: 96, boxHeightPercent: 8, bottomMargin: 20, color: '#FFFFFF',
    outlineColor: '#000000', outlineWidth: 0, outlineConfigured: true, shadow: 0, bold: false, uppercase: false, italic: false, renderScale: 1, assScale: 1 },
  imageSequence: { durationMs: 5000, fit: 'cover', allowFlip: false, transitionMs: 700 },
  transition: { mode: 'RANDOM_SELECTED', minDurationMs: 600, maxDurationMs: 900, avoidRepeatCount: 2,
    items: GENTLE_TRANSITIONS },
  layers: []
});

module.exports = {
  VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, SUBTITLE_EXTENSIONS,
  ASSET_STATUS, BATCH_STATUS, JOB_STATUS, BACKGROUND_MODE, LAYER_TYPE, LIBRARY_TYPE,
  GENTLE_TRANSITIONS, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT,
  DEFAULT_EXPORT_PRESET, DEFAULT_TEMPLATE
};
