'use strict';

const fs = require('node:fs');
const path = require('node:path');
let electronApp = null;
try { electronApp = require('electron').app; } catch { electronApp = null; }

function firstExisting(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function wingetFfmpegBinary(binaryName) {
  if (process.platform !== 'win32') return null;
  const packagesRoot = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (!packagesRoot || !fs.existsSync(packagesRoot)) return null;
  const exeName = `${binaryName}.exe`;
  try {
    const packages = fs.readdirSync(packagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^Gyan\.FFmpeg\./i.test(entry.name))
      .map((entry) => path.join(packagesRoot, entry.name));
    const candidates = [];
    for (const packagePath of packages) {
      const roots = fs.readdirSync(packagePath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^ffmpeg-/i.test(entry.name))
        .map((entry) => path.join(packagePath, entry.name, 'bin', exeName));
      candidates.push(...roots);
    }
    return firstExisting(candidates);
  } catch {
    return null;
  }
}

function resolveAppRootDir() {
  if (electronApp?.isPackaged) {
    return path.dirname(electronApp.getPath('exe'));
  }
  return path.resolve(__dirname, '../../..');
}

function resolveGreenStorageDir(subFolder = '') {
  const base = ensureDirectory(path.join(resolveAppRootDir(), 'Kho_Green'));
  return subFolder ? ensureDirectory(path.join(base, subFolder)) : base;
}

function resolveResourceRoot() {
  return electronApp?.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../resources');
}

function resolveBundledFontsDir() {
  return path.join(resolveResourceRoot(), 'fonts');
}

function resolveSubtitleFontsDir() {
  const fontsRoot = resolveBundledFontsDir();
  return firstExisting([
    path.join(fontsRoot, 'poppins'),
    fontsRoot
  ]) || fontsRoot;
}

function resolveDefaultGreenDir() {
  return path.join(resolveResourceRoot(), 'default-green');
}

function resolveDefaultBackgroundsDir() {
  return path.join(resolveResourceRoot(), 'default-backgrounds');
}

function resolveBinary(binaryName, envName, savedPath = null) {
  const exeName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  return firstExisting([
    savedPath,
    process.env[envName],
    path.join(resolveResourceRoot(), 'bin', exeName),
    wingetFfmpegBinary(binaryName)
  ]) || exeName;
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

function appDataPaths() {
  let root;
  if (process.env.VBS_DATA_DIR) {
    root = ensureDirectory(path.join(process.env.VBS_DATA_DIR, 'data'));
  } else if (electronApp) {
    const portableRoot = ensureDirectory(path.join(resolveAppRootDir(), 'data'));
    const portableDb = path.join(portableRoot, 'video-batch-studio.db');
    if (!fs.existsSync(portableDb)) {
      try {
        const legacyDb = path.join(electronApp.getPath('userData'), 'data', 'video-batch-studio.db');
        if (fs.existsSync(legacyDb)) {
          fs.copyFileSync(legacyDb, portableDb);
        }
      } catch {}
    }
    root = portableRoot;
  } else {
    root = ensureDirectory(path.join(path.resolve(process.cwd(), '.vbs-user-data'), 'data'));
  }
  return {
    root,
    database: path.join(root, 'video-batch-studio.db'),
    logs: ensureDirectory(path.join(root, 'logs')),
    reports: ensureDirectory(path.join(root, 'reports')),
    temp: ensureDirectory(path.join(root, 'temp')),
    cache: ensureDirectory(path.join(root, 'cache')),
    proxies: ensureDirectory(path.join(root, 'cache', 'proxies')),
    thumbnails: ensureDirectory(path.join(root, 'cache', 'thumbnails')),
    templates: ensureDirectory(path.join(root, 'templates'))
  };
}

function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return 'video_output';
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueDestination(directoryPath, fileName) {
  ensureDirectory(directoryPath);
  const safeName = sanitizeFileName(fileName);
  const parsed = path.parse(safeName);
  let candidate = path.join(directoryPath, safeName);
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directoryPath, `${parsed.name}_${String(index).padStart(2, '0')}${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

function escapeSubtitlePath(filePath) {
  return path.resolve(filePath)
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

module.exports = {
  resolveBinary,
  wingetFfmpegBinary,
  resolveAppRootDir,
  resolveGreenStorageDir,
  resolveResourceRoot,
  resolveBundledFontsDir,
  resolveSubtitleFontsDir,
  resolveDefaultGreenDir,
  resolveDefaultBackgroundsDir,
  ensureDirectory,
  appDataPaths,
  uniqueDestination,
  sanitizeFileName,
  escapeSubtitlePath
};
