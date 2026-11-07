'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, SUBTITLE_EXTENSIONS } = require('../../shared/constants');
const { normalizeMatchName } = require('../../shared/core');
const SUBTITLE_EXTENSION_PRIORITY = new Map([
  ['.ass', 4],
  ['.json', 3],
  ['.srt', 2],
  ['.vtt', 1]
]);

const SKIP_SUBDIR_NAMES = new Set(['used', 'invalid', 'temp', 'tmp', '.git', 'node_modules', '__pycache__']);

function listFiles(folder, extensions = null, options = {}) {
  if (!folder || !fs.existsSync(folder)) return [];
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : (options.recursive ? 2 : 0);
  const collect = (dir, depth, limitDepth) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const out = [];
    const subDirs = [];
    for (const entry of entries) {
      if (entry.isFile()) {
        if (!extensions || extensions.has(path.extname(entry.name).toLowerCase())) {
          out.push(path.join(dir, entry.name));
        }
      } else if (entry.isDirectory() && depth < limitDepth) {
        if (!SKIP_SUBDIR_NAMES.has(entry.name.toLowerCase()) && !entry.name.startsWith('.')) {
          subDirs.push(path.join(dir, entry.name));
        }
      }
    }
    for (const sub of subDirs) {
      out.push(...collect(sub, depth + 1, limitDepth));
    }
    return out;
  };
  const direct = collect(folder, 0, maxDepth);
  if (direct.length > 0 || maxDepth > 0 || options.recursive === false) {
    return direct;
  }
  if (extensions === VIDEO_EXTENSIONS) {
    return collect(folder, 0, 2);
  }
  return direct;
}

function quickHash(filePath) {
  const stat = fs.statSync(filePath); const hash = crypto.createHash('sha256');
  hash.update(String(stat.size)); hash.update(String(stat.mtimeMs));
  const fd = fs.openSync(filePath, 'r');
  try {
    const size = Math.min(stat.size, 1024 * 1024); const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0); hash.update(buffer);
    if (stat.size > size) { const tail = Buffer.alloc(size); fs.readSync(fd, tail, 0, size, Math.max(0, stat.size - size)); hash.update(tail); }
  } finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

function scanBatchInputs(voiceFolder, srtFolder, options = {}) {
  const voices = listFiles(voiceFolder, AUDIO_EXTENSIONS).filter((filePath) => {
    const base = path.basename(filePath).toLowerCase();
    return !base.startsWith('.') && !base.startsWith('vbs_vs_ref_') && !/^chunk_\d+\.(wav|mp3)$/i.test(base);
  });
  const srts = listFiles(srtFolder, SUBTITLE_EXTENSIONS);
  const subtitleMap = new Map();
  for (const filePath of srts) {
    const key = normalizeMatchName(filePath);
    const current = subtitleMap.get(key);
    if (!current) {
      subtitleMap.set(key, filePath);
      continue;
    }
    const currentPriority = SUBTITLE_EXTENSION_PRIORITY.get(path.extname(current).toLowerCase()) || 0;
    const nextPriority = SUBTITLE_EXTENSION_PRIORITY.get(path.extname(filePath).toLowerCase()) || 0;
    if (nextPriority >= currentPriority) subtitleMap.set(key, filePath);
  }

  const audioKeys = new Map();
  for (const voicePath of voices) {
    const key = normalizeMatchName(voicePath);
    // Nếu có cả .wav và .mp3 cùng tên, ưu tiên giữ file .wav hoặc file có dung lượng hợp lệ (> 44 bytes)
    const existing = audioKeys.get(key);
    if (!existing || path.extname(voicePath).toLowerCase() === '.wav') {
      audioKeys.set(key, voicePath);
    }
  }

  const entries = [];
  for (const [, voicePath] of audioKeys.entries()) {
    let validSize = false;
    try {
      validSize = fs.statSync(voicePath).size > 44;
    } catch {}
    if (validSize || !options.includeScripts) {
      entries.push({
        voicePath,
        voiceName: path.basename(voicePath),
        scriptPath: null,
        needsVoiceGeneration: false
      });
    } else {
      // Xóa file audio 0-byte bị lỗi dở dang để kịch bản .txt tạo lại từ đầu
      try { fs.unlinkSync(voicePath); } catch {}
    }
  }

  if (options.includeScripts) {
    const scripts = listFiles(voiceFolder, new Set(['.txt'])).filter((filePath) => {
      const base = path.basename(filePath).toLowerCase();
      return !base.startsWith('.') && !base.startsWith('concat_list_') && !base.endsWith('_prompt.txt') && !base.endsWith('_seo.txt');
    });
    for (const scriptPath of scripts) {
      const key = normalizeMatchName(scriptPath);
      const matchedEntry = entries.find((item) => normalizeMatchName(item.voicePath) === key);
      if (matchedEntry && options.forceScriptRegenerate !== true) {
        // Kịch bản này ĐÃ CÓ file voice hợp lệ -> Giữ nguyên voice sẵn có, KHÔNG tạo lại!
        matchedEntry.scriptPath = scriptPath;
        matchedEntry.needsVoiceGeneration = false;
      } else {
        // Kịch bản này CHƯA CÓ voice (hoặc yêu cầu tạo lại) -> Xuất ra 1 file .wav duy nhất
        const baseName = path.basename(scriptPath, path.extname(scriptPath));
        const targetWavPath = path.join(path.dirname(scriptPath), `${baseName}.wav`);
        if (!matchedEntry) {
          entries.push({
            voicePath: targetWavPath,
            voiceName: `${baseName}.wav`,
            scriptPath,
            needsVoiceGeneration: true
          });
        } else {
          matchedEntry.voicePath = targetWavPath;
          matchedEntry.voiceName = `${baseName}.wav`;
          matchedEntry.scriptPath = scriptPath;
          matchedEntry.needsVoiceGeneration = true;
        }
      }
    }
  }

  return entries
    .sort((a, b) => a.voicePath.localeCompare(b.voicePath, undefined, { numeric: true, sensitivity: 'base' }))
    .map((item, index) => {
      const srtPath = subtitleMap.get(normalizeMatchName(item.voicePath)) || null;
      return {
        sequenceNumber: index + 1,
        voicePath: item.voicePath,
        voiceName: item.voiceName,
        scriptPath: item.scriptPath,
        needsVoiceGeneration: item.needsVoiceGeneration,
        srtPath,
        ready: Boolean(srtPath)
      };
    });
}

async function inspectFile(filePath, ffmpeg, assetType) {
  const stat = fs.statSync(filePath); const item = {
    filePath, fileName:path.basename(filePath), fileSizeBytes:stat.size, modifiedAtFs:Math.round(stat.mtimeMs),
    fileHash:quickHash(filePath), assetType, valid:true, durationMs:0, width:0, height:0, fpsNum:0, fpsDen:1,
    videoCodec:null, audioCodec:null, pixelFormat:null, hasAudio:false
  };
  try {
    if (assetType === 'VIDEO' || assetType === 'AUDIO') Object.assign(item, await ffmpeg.probe(filePath));
    else if (assetType === 'IMAGE') Object.assign(item, await ffmpeg.probe(filePath));
  } catch (error) { item.valid=false; item.error=error.message; }
  return item;
}

async function scanFolder(folder, ffmpeg, libraryType, onProgress) {
  const map = {
    STOCK:{extensions:VIDEO_EXTENSIONS,assetType:'VIDEO'}, OVERLAY:{extensions:new Set([...VIDEO_EXTENSIONS,...IMAGE_EXTENSIONS]),assetType:null},
    GREENSCREEN:{extensions:new Set([...VIDEO_EXTENSIONS,...IMAGE_EXTENSIONS]),assetType:null}, IMAGE:{extensions:IMAGE_EXTENSIONS,assetType:'IMAGE'},
    LOGO:{extensions:IMAGE_EXTENSIONS,assetType:'IMAGE'}, FONT:{extensions:new Set(['.ttf','.otf','.woff','.woff2']),assetType:'FONT'}
  };
  const spec=map[libraryType]||map.STOCK; const files=listFiles(folder,spec.extensions); const output=[];
  for(let index=0; index<files.length; index+=1){const ext=path.extname(files[index]).toLowerCase(); const type=spec.assetType||(VIDEO_EXTENSIONS.has(ext)?'VIDEO':'IMAGE'); const item=await inspectFile(files[index],ffmpeg,type); output.push(item); onProgress?.({index:index+1,total:files.length,item});}
  return output;
}

async function scanVideoFolder(folder, ffmpeg, onProgress) { return scanFolder(folder,ffmpeg,'STOCK',onProgress); }

module.exports = { listFiles, quickHash, scanBatchInputs, scanFolder, scanVideoFolder, inspectFile };
