'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

function createId() { return crypto.randomUUID(); }
function stripExtension(filePath) { return path.basename(filePath, path.extname(filePath)); }
function normalizeMatchName(filePath) {
  return stripExtension(filePath).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
function sanitizeFileName(value) {
  return String(value || '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').trim() || 'output';
}
function safeJson(value, fallback = null) { try { return JSON.parse(value); } catch { return fallback; } }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
function weightedPick(items, random) {
  const enabled = items.filter((item) => item.enabled !== false && Number(item.weight) > 0);
  if (!enabled.length) return null;
  const total = enabled.reduce((sum, item) => sum + Number(item.weight), 0);
  let cursor = random() * total;
  for (const item of enabled) { cursor -= Number(item.weight); if (cursor <= 0) return item; }
  return enabled[enabled.length - 1];
}
function seededShuffle(items, seed) {
  const random = mulberry32(seed); const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}
function buildTransitionSequence({ count, items, seed, avoidRepeatCount = 2, minDurationMs = 600, maxDurationMs = 900 }) {
  const random = mulberry32(seed); const history = []; const transitions = [];
  for (let index = 0; index < count; index += 1) {
    let candidates = items.filter((item) => item.enabled !== false && !history.includes(item.id));
    if (!candidates.length) candidates = items.filter((item) => item.enabled !== false);
    const selected = weightedPick(candidates, random) || { id: 'fade', weight: 1 };
    const durationMs = Math.round(minDurationMs + random() * Math.max(0, maxDurationMs - minDurationMs));
    transitions.push({ type: selected.id, durationMs });
    history.push(selected.id); while (history.length > Math.max(0, avoidRepeatCount)) history.shift();
  }
  return transitions;
}
function calculateVideoBitrateKbps({ durationMs, gbPerHour = 2, audioKbps = 128, safetyPercent = 95, overheadKbps = 64 }) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('Thời lượng không hợp lệ.');
  const durationHours = durationMs / 3_600_000;
  const targetBytes = durationHours * gbPerHour * 1_000_000_000;
  const totalKbps = (targetBytes * 8) / (durationMs / 1000) / 1000;
  return Math.max(500, Math.floor(totalKbps * (safetyPercent / 100) - audioKbps - overheadKbps));
}
function targetSizeBytes({ durationMs, gbPerHour = 2 }) {
  return Math.floor((durationMs / 3_600_000) * gbPerHour * 1_000_000_000);
}
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => Number(n) || 0); const pb = String(b).split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
}
function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch === undefined ? base : patch;
  const result = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(result[key], value) : value;
  }
  return result;
}

module.exports = {
  createId, stripExtension, normalizeMatchName, sanitizeFileName, safeJson, clamp, mulberry32,
  weightedPick, seededShuffle, buildTransitionSequence, calculateVideoBitrateKbps, targetSizeBytes,
  compareVersions, deepMerge
};
