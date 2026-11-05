'use strict';

const path = require('node:path');
const { app, BrowserWindow, dialog } = require('electron');
try {
  if (!app.commandLine.hasSwitch('remote-debugging-port')) {
    app.commandLine.appendSwitch('remote-debugging-port', '9230');
  }
} catch {}

// Chặn triệt để lỗi EPIPE (broken pipe) khi đóng console/cửa sổ và chặn hộp thoại báo lỗi JavaScript khi đang tắt app
try { process.stdout?.on?.('error', () => {}); } catch {}
try { process.stderr?.on?.('error', () => {}); } catch {}
try {
  dialog.showErrorBox = (title, content) => {
    try { console.warn('[MAIN SUPPRESSED ERROR BOX]:', title, content); } catch {}
  };
} catch {}
process.on('uncaughtException', (err) => {
  try { console.warn('[MAIN UNCAUGHT EXCEPTION IGNORED]:', err?.message || err); } catch {}
});
process.on('unhandledRejection', (reason) => {
  try { console.warn('[MAIN UNHANDLED REJECTION IGNORED]:', reason?.message || reason); } catch {}
});

const { AppDatabase } = require('./database');
const { FFmpegService } = require('./services/ffmpeg');
const { BatchService } = require('./services/batch-service');
const { ProjectService } = require('./services/project-service');
const { TemplateService } = require('./services/template-service');
const { MediaLibraryService } = require('./services/media-library-service');
const { RecoveryService } = require('./services/recovery-service');
const { SystemHealthService } = require('./services/system-health-service');
const { MediaPreviewService } = require('./services/media-preview-service');
const { WhisperSrtService } = require('./services/whisper-srt-service');
const { SubtitleCanvasOverlayService } = require('./services/subtitle-canvas-overlay-service');
const { StoryVideoService } = require('./services/story-video-service');
const { LicenseService } = require('./services/license-service');
const { ScriptVideoBridgeService } = require('./services/script-video-bridge-service');
const { UpdaterService } = require('./services/updater-service');
const { appDataPaths } = require('./services/path-utils');
const { registerIpc } = require('./ipc');

let mainWindow;
let database;
let ffmpegService;
let subtitleOverlayService;
let scriptBridgeService;
let updaterService;
let quitting = false;

function bringMainWindowToFront() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.moveTop?.();
    setTimeout(() => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      } catch {}
    }, 900);
  } catch {}
}

const http = require('node:http');

function checkExistingBridgeAndFocus() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3999/api/bridge/bring-to-front', { timeout: 700 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      try { req.destroy(); } catch {}
      resolve(false);
    });
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../renderer/assets/icon.ico');
  mainWindow = new BrowserWindow({
    title: 'ZC TEAM',
    icon: iconPath,
    width: 1660,
    height: 1000,
    minWidth: 1180,
    minHeight: 760,
    center: true,
    backgroundColor: '#090b10',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  try {
    mainWindow.setIcon(iconPath);
  } catch {}
  mainWindow.removeMenu();
  mainWindow.webContents.on('console-message', (event) => {
    if (quitting) return;
    const msg = event && typeof event.message === 'string' ? event.message : '';
    if (msg) {
      try { console.log('[RENDERER CONSOLE]:', msg); } catch {}
    }
  });
  mainWindow.on('close', () => {
    quitting = true;
    try { subtitleOverlayService?.destroy?.(); } catch {}
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.platform !== 'darwin') {
      try { app.quit(); } catch {}
    }
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.once('ready-to-show', () => {
    if (quitting) return;
    try { console.log('[MAIN]: ready-to-show triggered'); } catch {}
    bringMainWindowToFront();
  });
}

let shutdownStarted = false;
let relaunchStarted = false;

async function shutdownAllStudioServices({ killVoiceStudio = true, killChrome = true, killFfmpeg = true } = {}) {
  quitting = true;
  try {
    subtitleOverlayService?.destroy?.();
  } catch {}
  await Promise.allSettled([
    ffmpegService?.shutdown?.(),
    scriptBridgeService?.shutdown?.({ killVoiceStudio, killChrome, killFfmpeg })
  ]);
  try {
    database?.close?.();
  } catch {}
}

function relaunchEntireApplication() {
  if (relaunchStarted) return;
  relaunchStarted = true;
  quitting = true;
  shutdownStarted = true;

  const doRelaunchAndExit = () => {
    try {
      const cleanArgs = process.argv.slice(1).filter((arg) => arg !== '--relaunch-after-update');
      app.relaunch({ args: [...cleanArgs, '--relaunch-after-update'] });
    } catch {}
    app.exit(0);
  };

  const forceRelaunchTimer = setTimeout(doRelaunchAndExit, 6500);
  forceRelaunchTimer.unref?.();

  shutdownAllStudioServices({ killVoiceStudio: true, killChrome: true, killFfmpeg: true })
    .finally(() => {
      clearTimeout(forceRelaunchTimer);
      doRelaunchAndExit();
    });
}

app.whenReady().then(async () => {
  const isRelaunchAfterUpdate = process.argv.includes('--relaunch-after-update');
  if (isRelaunchAfterUpdate) {
    await new Promise((r) => setTimeout(r, 700));
  } else {
    const alreadyRunning = await checkExistingBridgeAndFocus();
    if (alreadyRunning) {
      app.quit();
      return;
    }
  }
  const paths = appDataPaths();
  database = new AppDatabase(paths.database);
  const licenseService = new LicenseService({ database, paths });
  ffmpegService = new FFmpegService({
    ...database.getSetting('ffmpeg_paths', {}),
    processRegistryPath: path.join(paths.temp, 'active-ffmpeg-processes.json')
  });
  const whisperSrtService = new WhisperSrtService({ paths, ffmpegService });
  subtitleOverlayService = new SubtitleCanvasOverlayService({ paths, ffmpegService });
  const { VoiceStudioService, VoiceValidatorService, VoiceProfileManager } = require('./services/voice');
  const voiceProfileManager = new VoiceProfileManager();
  const voiceStudioService = new VoiceStudioService({ profileManager: voiceProfileManager });
  const voiceValidatorService = new VoiceValidatorService({
    voiceStudioService,
    ffmpegService
  });
  const services = {
    database,
    ffmpegService,
    paths,
    whisperSrtService,
    subtitleOverlayService,
    voiceStudioService,
    voiceValidatorService,
    voiceProfileManager
  };
  const batchService = new BatchService(services);
  const projectService = new ProjectService(database);
  const templateService = new TemplateService(database);
  const mediaLibraryService = new MediaLibraryService(database, ffmpegService);
  const mediaPreviewService = new MediaPreviewService(ffmpegService, paths);
  const recovery = new RecoveryService(database, paths);
  const systemHealth = new SystemHealthService(ffmpegService, paths);
  const storyVideoService = new StoryVideoService({
    paths,
    ffmpegService,
    database,
    subtitleOverlayService,
    whisperSrtService
  });
  const recovered = recovery.run();
  database.setSetting('last_recovery', recovered);

  createWindow();
  scriptBridgeService = new ScriptVideoBridgeService({
    database,
    batchService,
    licenseService,
    getMainWindow: () => mainWindow,
    paths
  });
  updaterService = new UpdaterService({
    getMainWindow: () => mainWindow,
    scriptBridgeService,
    relaunchApp: relaunchEntireApplication
  });
  registerIpc({
    mainWindow,
    database,
    licenseService,
    ffmpegService,
    batchService,
    projectService,
    templateService,
    mediaLibraryService,
    mediaPreviewService,
    storyVideoService,
    scriptBridgeService,
    updaterService,
    voiceStudioService,
    voiceValidatorService,
    voiceProfileManager,
    systemHealth,
    paths
  });
  scriptBridgeService.initialize().catch((err) => {
    console.warn('[MAIN] ScriptVideoBridge initialize warning:', err);
  });

  // Tự động khởi động VoiceStudio GPU Server (Port 3900) ngay khi mở ứng dụng
  voiceStudioService.ensureVoiceStudioRunning(60000)
    .then((online) => {
      console.log(`[MAIN] Auto-start VoiceStudio Server (Port 3900): ${online ? 'ONLINE (GPU READY)' : 'WAITING/FALLBACK'}`);
      try {
        mainWindow?.webContents?.send('voice:statusChanged', { online });
      } catch {}
    })
    .catch((err) => {
      console.warn('[MAIN] VoiceStudio auto-start warning:', err?.message || err);
    });

  // Prepare FFmpeg in the background. Rendering and system checks still await the
  // same initialization promise through FFmpegService.initialize().
  ffmpegService.initialize()
    .then(() => {
      if (quitting) return null;
      return ffmpegService.checkSystem({ gpuIndex: -1 });
    })
    .then(() => {
      if (quitting || !database || database.closed) return;
      try { database.setSetting('ffmpeg_startup_error', null); } catch {}
    })
    .catch((error) => {
      if (quitting || !database || database.closed) return;
      try { console.error('[MAIN] FFmpeg initialization deferred/failed:', error); } catch {}
      try {
        database.setSetting('ffmpeg_startup_error', {
          message: error?.message || String(error),
          updatedAt: Date.now()
        });
      } catch {}
    });

  app.on('activate', () => {
    if (!quitting && BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  quitting = true;
  if (process.platform !== 'darwin') {
    try { app.quit(); } catch {}
  }
});

app.on('before-quit', (event) => {
  quitting = true;
  if (shutdownStarted) return;
  shutdownStarted = true;
  event.preventDefault();
  const forceExitTimer = setTimeout(() => {
    try { subtitleOverlayService?.destroy?.(); } catch {}
    try { database?.close?.(); } catch {}
    app.exit(0);
  }, 6500);
  forceExitTimer.unref?.();

  shutdownAllStudioServices({ killVoiceStudio: true, killChrome: true, killFfmpeg: true })
    .finally(() => {
      clearTimeout(forceExitTimer);
      app.exit(0);
    });
});
