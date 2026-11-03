'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { contextBridge, ipcRenderer } = require('electron');
const { subtitleStyle, subtitleEffectiveFontSize, subtitlePreviewBox, subtitleLineHeight, subtitleFitFontSize } = require('../shared/subtitle-preview');
const {
  previewViewport,
  previewPointToProject,
  previewDeltaToProject,
  layerCssBox,
  subtitleFrame,
  resolveFrameState
} = require('../shared/render-core');

const SCRIPT_STUDIO_PORT = 8098;
let _preloadSpawnPromise = null;

function checkPort8098Quick(timeoutMs = 1200) {
  return new Promise((resolve) => {
    try {
      const req = http.get(`http://127.0.0.1:${SCRIPT_STUDIO_PORT}/`, { timeout: timeoutMs }, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        try { req.destroy(); } catch {}
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function syncDirRecursiveSafe(srcDir, dstDir) {
  try {
    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(dstDir, { recursive: true });
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
      if (entry.name === '__pycache__' || entry.name === '.git' || entry.name.endsWith('.pyc')) continue;
      const s = path.join(srcDir, entry.name);
      const d = path.join(dstDir, entry.name);
      if (entry.isDirectory()) {
        syncDirRecursiveSafe(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  } catch {}
}

function ensureCustomerFilesSynced(appDir, exeDir) {
  try {
    if (!appDir || !exeDir || path.resolve(appDir) === path.resolve(exeDir)) return;
    const srcBase = fs.existsSync(path.join(appDir, 'engine', 'websocket')) ? appDir : (
      fs.existsSync(path.join(exeDir, 'engine', 'websocket')) ? exeDir : appDir
    );
    const dstBase = srcBase === appDir ? exeDir : appDir;
    if (!fs.existsSync(dstBase)) return;

    for (const f of ['mafia_dashboard_server.py', 'organize_12_keys_skills.py', 'version.json']) {
      const sf = path.join(srcBase, f);
      const df = path.join(dstBase, f);
      if (fs.existsSync(sf)) {
        try { fs.copyFileSync(sf, df); } catch {}
      }
    }
    for (const ef of ['chatgpt_web_client.py', 'mafia_chatgpt_pipeline.py', 'license_manager.py']) {
      const sf = path.join(srcBase, 'engine', ef);
      const df = path.join(dstBase, 'engine', ef);
      if (fs.existsSync(sf)) {
        try {
          fs.mkdirSync(path.dirname(df), { recursive: true });
          fs.copyFileSync(sf, df);
        } catch {}
      }
    }
    const wsSrc = path.join(srcBase, 'engine', 'websocket');
    const wsDst = path.join(dstBase, 'engine', 'websocket');
    if (fs.existsSync(wsSrc) && !fs.existsSync(wsDst)) {
      syncDirRecursiveSafe(wsSrc, wsDst);
    }
  } catch {}
}

function resolveBestPythonExe(appDir, exeDir) {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const portableCandidates = [
    path.join(appDir, 'python_runtime', 'python.exe'),
    path.join(appDir, 'engine', 'python_runtime', 'python.exe'),
    path.join(exeDir, 'python_runtime', 'python.exe'),
    path.join(exeDir, 'engine', 'python_runtime', 'python.exe'),
    'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\python_runtime\\python.exe',
    'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\engine\\python_runtime\\python.exe'
  ];
  for (const exe of portableCandidates) {
    try {
      if (fs.existsSync(exe) && fs.existsSync(path.join(path.dirname(exe), 'python314.zip'))) {
        return exe;
      }
    } catch {}
  }
  const sysCandidates = [
    ...portableCandidates,
    path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
    'C:\\Python314\\python.exe',
    'C:\\Python313\\python.exe',
    'C:\\Python312\\python.exe'
  ];
  for (const exe of sysCandidates) {
    try {
      if (fs.existsSync(exe)) return exe;
    } catch {}
  }
  return 'python';
}

function resolveBestServerScript(appDir, exeDir) {
  const candidates = [
    fs.existsSync(path.join(exeDir, 'engine', 'websocket')) ? path.join(exeDir, 'mafia_dashboard_server.py') : null,
    fs.existsSync(path.join(appDir, 'engine', 'websocket')) ? path.join(appDir, 'mafia_dashboard_server.py') : null,
    path.join(exeDir, 'mafia_dashboard_server.py'),
    path.join(appDir, 'mafia_dashboard_server.py'),
    'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\mafia_dashboard_server.py'
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

let _nodeFallbackServer = null;
let _nodeSelectedNiche = '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

function startNodeFallbackServer8098(appDir, exeDir) {
  return new Promise((resolve) => {
    if (_nodeFallbackServer) {
      return resolve(true);
    }
    try {
      const htmlCandidates = [
        path.join(appDir, 'assets', 'script_studio_dashboard.html'),
        path.join(exeDir, 'assets', 'script_studio_dashboard.html'),
        'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\assets\\script_studio_dashboard.html'
      ];
      const statusCandidates = [
        path.join(appDir, 'assets', 'script_studio_fallback_status.json'),
        path.join(exeDir, 'assets', 'script_studio_fallback_status.json'),
        'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\assets\\script_studio_fallback_status.json'
      ];
      const htmlFile = htmlCandidates.find((p) => fs.existsSync(p));
      const statusFile = statusCandidates.find((p) => fs.existsSync(p));
      if (!htmlFile || !statusFile) {
        return resolve(false);
      }
      const htmlBuf = fs.readFileSync(htmlFile);
      const statusMap = JSON.parse(fs.readFileSync(statusFile, 'utf8'));

      const srv = http.createServer((req, res) => {
        try {
          const u = new URL(req.url || '/', `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`);
          if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'Content-Length': htmlBuf.length
            });
            res.end(htmlBuf);
            return;
          }
          if (req.method === 'GET' && u.pathname === '/api/status') {
            const rawNiche = (u.searchParams.get('niche') || _nodeSelectedNiche || 'mafia').trim();
            if (statusMap[rawNiche]) {
              _nodeSelectedNiche = rawNiche;
            }
            const baseSt = statusMap[_nodeSelectedNiche] || statusMap.mafia || Object.values(statusMap)[0] || {};
            const payload = Buffer.from(JSON.stringify({
              ...baseSt,
              selected_niche: _nodeSelectedNiche,
              updated_at: new Date().toLocaleTimeString('vi-VN')
            }), 'utf8');
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
              'Content-Length': payload.length
            });
            res.end(payload);
            return;
          }
          if (req.method === 'POST') {
            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', () => {
              let body = {};
              try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch {}
              if (body.niche && statusMap[body.niche]) {
                _nodeSelectedNiche = body.niche;
              }
              const out = Buffer.from(JSON.stringify({
                ok: true,
                selected_niche: _nodeSelectedNiche,
                message: 'Đã đồng bộ trạng thái 9 Bàn AI Agent.'
              }), 'utf8');
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
              res.end(out);
            });
            return;
          }
          res.writeHead(404);
          res.end('Not found');
        } catch (err) {
          res.writeHead(500);
          res.end(String(err));
        }
      });

      srv.on('error', () => {
        resolve(false);
      });
      srv.listen(SCRIPT_STUDIO_PORT, '127.0.0.1', () => {
        _nodeFallbackServer = srv;
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function ensurePort8098FromPreload() {
  if (await checkPort8098Quick(1000)) {
    return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}` };
  }
  if (_preloadSpawnPromise) {
    return _preloadSpawnPromise;
  }
  _preloadSpawnPromise = (async () => {
    try {
      const appDir = path.resolve(__dirname, '..', '..');
      const exeDir = path.dirname(process.execPath);
      ensureCustomerFilesSynced(appDir, exeDir);

      const serverScript = resolveBestServerScript(appDir, exeDir);
      if (serverScript) {
        const rootDir = path.dirname(serverScript);
        const pyExe = resolveBestPythonExe(appDir, exeDir);
        try {
          const child = spawn(pyExe, [serverScript, '--no-browser'], {
            cwd: rootDir,
            windowsHide: true,
            stdio: 'ignore',
            detached: false,
            env: {
              ...process.env,
              PYTHONUTF8: '1',
              PYTHONIOENCODING: 'utf-8'
            }
          });
          child.on('error', () => {});
        } catch {}

        for (let i = 0; i < 6; i += 1) {
          await new Promise((r) => setTimeout(r, 450));
          if (await checkPort8098Quick(900)) {
            return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}` };
          }
        }
      }

      // Nếu máy khách chưa có Python hoặc bị chặn DLL, bật ngay Server Node.js dự phòng trên cổng 8098!
      await startNodeFallbackServer8098(appDir, exeDir);
      if (await checkPort8098Quick(900)) {
        return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`, fallbackNode: true };
      }
      return { online: false };
    } finally {
      _preloadSpawnPromise = null;
    }
  })();
  return _preloadSpawnPromise;
}

// Tự động kích hoạt kiểm tra & bật Port 8098 ngay khi preload nạp (kể cả sau khi OTA reload)
setTimeout(() => {
  ensurePort8098FromPreload().catch(() => {});
}, 300);

const sub = (channel, fn) => {
  const listener = (_event, payload) => fn(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('vbs', {
  chooseDirectory: (options) => ipcRenderer.invoke('dialog:directory', options),
  chooseFile: (options) => ipcRenderer.invoke('dialog:file', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:save', options),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  copyText: (value) => ipcRenderer.invoke('clipboard:write', value),
  appInfo: () => ipcRenderer.invoke('app:info'),
  defaultAssets: () => ipcRenderer.invoke('assets:defaults'),
  checkSystem: () => ipcRenderer.invoke('system:check'),
  refreshGpu: () => ipcRenderer.invoke('system:refreshGpu'),
  testEncoder: (encoder) => ipcRenderer.invoke('system:encoderTest', encoder),
  mediaPreview: (filePath, options) => ipcRenderer.invoke('media:preview', filePath, options),
  mediaFolderPreview: (folder, kind) => ipcRenderer.invoke('media:folderPreview', folder, kind),
  mediaListFolderAssets: (folder) => ipcRenderer.invoke('media:listFolderAssets', folder),
  subtitlePreview: (filePath, renderConfig) => ipcRenderer.invoke('subtitle:preview', filePath, renderConfig),
  preview: {
    subtitleStyle: (renderConfig) => subtitleStyle(renderConfig),
    subtitleFontSize: (subtitle) => subtitleEffectiveFontSize(subtitle),
    subtitleBox: (renderConfig) => subtitlePreviewBox(renderConfig),
    subtitleLineHeight: (subtitle) => subtitleLineHeight(subtitle),
    subtitleFitFontSize: (subtitle, metrics) => subtitleFitFontSize(subtitle, metrics),
    viewport: (project, viewport) => previewViewport(project, viewport),
    pointToProject: (point, project, viewport) => previewPointToProject(point, project, viewport),
    deltaToProject: (delta, project, viewport) => previewDeltaToProject(delta, project, viewport),
    layerCssBox: (layer, renderConfig) => layerCssBox(layer, renderConfig),
    subtitleFrame: (renderConfig, content) => subtitleFrame(renderConfig, content),
    frameState: (renderConfig, frameIndex, subtitleText) => resolveFrameState(renderConfig, frameIndex, subtitleText)
  },
  getSetting: (key, fallback) => ipcRenderer.invoke('settings:get', key, fallback),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    create: (data) => ipcRenderer.invoke('projects:create', data),
    update: (id, data) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id) => ipcRenderer.invoke('projects:delete', id)
  },
  templates: {
    list: (projectId) => ipcRenderer.invoke('templates:list', projectId),
    get: (id) => ipcRenderer.invoke('templates:get', id),
    create: (data) => ipcRenderer.invoke('templates:create', data),
    save: (id, data, note) => ipcRenderer.invoke('templates:save', id, data, note),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
    versions: (id) => ipcRenderer.invoke('templates:versions', id),
    restore: (id, version) => ipcRenderer.invoke('templates:restore', id, version),
    export: (id, filePath) => ipcRenderer.invoke('templates:export', id, filePath),
    import: (filePath, projectId) => ipcRenderer.invoke('templates:import', filePath, projectId)
  },
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    saveTransition: (data) => ipcRenderer.invoke('presets:transition:save', data),
    saveExport: (data) => ipcRenderer.invoke('presets:export:save', data)
  },
  libraries: {
    list: () => ipcRenderer.invoke('libraries:list'),
    create: (data) => ipcRenderer.invoke('libraries:create', data),
    delete: (id) => ipcRenderer.invoke('libraries:delete', id),
    deleteWithFiles: (id) => ipcRenderer.invoke('libraries:deleteWithFiles', id),
    assets: (id, status) => ipcRenderer.invoke('libraries:assets', id, status),
    stats: (id) => ipcRenderer.invoke('libraries:stats', id),
    purge: (id) => ipcRenderer.invoke('libraries:purge', id),
    scan: (id) => ipcRenderer.invoke('libraries:scan', id)
  },
  projectAssets: {
    list: (assetType) => ipcRenderer.invoke('projectAssets:list', assetType),
    create: (data) => ipcRenderer.invoke('projectAssets:create', data),
    delete: (id) => ipcRenderer.invoke('projectAssets:delete', id),
    storagePath: () => ipcRenderer.invoke('projectAssets:storagePath'),
    openFolder: () => ipcRenderer.invoke('projectAssets:openFolder')
  },
  batch: {
    scan: (config) => ipcRenderer.invoke('batch:scan', config),
    start: (config) => ipcRenderer.invoke('batch:start', config),
    resume: (id) => ipcRenderer.invoke('batch:resume', id),
    retryFailed: (id) => ipcRenderer.invoke('batch:retryFailed', id),
    pause: () => ipcRenderer.invoke('batch:pause'),
    cancel: () => ipcRenderer.invoke('batch:cancel'),
    list: () => ipcRenderer.invoke('batch:list'),
    jobs: (id) => ipcRenderer.invoke('batch:jobs', id)
  },
  reports: {
    list: (id) => ipcRenderer.invoke('reports:list', id)
  },
  storyVideo: {
    scan: (items) => ipcRenderer.invoke('storyVideo:scan', items),
    scanDirectory: (dir) => ipcRenderer.invoke('storyVideo:scanDirectory', dir),
    start: (payload) => ipcRenderer.invoke('storyVideo:start', payload),
    cancel: () => ipcRenderer.invoke('storyVideo:cancel')
  },

  stock: {
    scanFolder: (folderPath) => ipcRenderer.invoke('stock:scanFolder', folderPath),
    conformFolder: (folderPath) => ipcRenderer.invoke('stock:conformFolder', folderPath),
    cancelConform: () => ipcRenderer.invoke('stock:cancelConform'),
    onConformProgress: (fn) => sub('stock:conformProgress', fn)
  },

  voice: {
    checkStatus: () => ipcRenderer.invoke('voice:checkStatus'),
    launchVoiceStudio: () => ipcRenderer.invoke('voice:launchVoiceStudio'),
    listProfiles: () => ipcRenderer.invoke('voice:listProfiles'),
    getProfile: (id) => ipcRenderer.invoke('voice:getProfile', id),
    saveProfile: (data, samplePath) => ipcRenderer.invoke('voice:saveProfile', data, samplePath),
    deleteProfile: (id) => ipcRenderer.invoke('voice:deleteProfile', id),
    testGenerate: (payload) => ipcRenderer.invoke('voice:testGenerate', payload),
    readScriptFile: (filePath) => ipcRenderer.invoke('voice:readScriptFile', filePath),
    generateFullScript: (payload) => ipcRenderer.invoke('voice:generateFullScript', payload),
    onGenerateProgress: (fn) => sub('voice:generateProgress', fn)
  },

  image: {
    checkHealth: () => ipcRenderer.invoke('image:checkHealth'),
    planScenes: (params) => ipcRenderer.invoke('image:planScenes', params),
    generatePackage: (params) => ipcRenderer.invoke('image:generatePackage', params),
    generateSingle: (params) => ipcRenderer.invoke('image:generateSingle', params),
    cancel: () => ipcRenderer.invoke('image:cancel'),
    onProgress: (fn) => sub('image:progress', fn)
  },

  license: {
    status: () => ipcRenderer.invoke('license:status'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    machineId: () => ipcRenderer.invoke('license:machineId'),
    onChanged: (fn) => sub('license:changed', fn)
  },

  scriptBridge: {
    status: async () => {
      const st = (await ipcRenderer.invoke('scriptBridge:status').catch(() => ({}))) || {};
      if (!st.scriptServerOnline) {
        const up = await checkPort8098Quick(900);
        if (up) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`;
        } else {
          ensurePort8098FromPreload().catch(() => {});
        }
      }
      return st;
    },
    ensureScriptServer: async () => {
      const res = await ipcRenderer.invoke('scriptBridge:ensureScriptServer').catch(() => ({ online: false }));
      if (res && res.online) return res;
      return ensurePort8098FromPreload();
    },
    restartScriptServer: async () => {
      const res = await ipcRenderer.invoke('scriptBridge:restartScriptServer').catch(() => ({ online: false }));
      if (res && res.online) return res;
      return ensurePort8098FromPreload();
    },
    saveSettings: (partial) => ipcRenderer.invoke('scriptBridge:saveSettings', partial),
    lockConfig: (config) => ipcRenderer.invoke('scriptBridge:lockConfig', config),
    enqueueScript: (payload) => ipcRenderer.invoke('scriptBridge:enqueueScript', payload),
    enqueueFolder: (folderPath) => ipcRenderer.invoke('scriptBridge:enqueueFolder', folderPath),
    clearQueue: () => ipcRenderer.invoke('scriptBridge:clearQueue'),
    onState: (fn) => sub('scriptBridge:state', async (st) => {
      if (st && !st.scriptServerOnline) {
        const up = await checkPort8098Quick(700);
        if (up) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`;
        }
      }
      fn(st);
    }),
    onLog: (fn) => sub('scriptBridge:log', fn),
    onRequestSyncBatchConfig: (fn) => sub('scriptBridge:requestSyncBatchConfig', fn)
  },

  updater: {
    localInfo: () => ipcRenderer.invoke('updater:localInfo'),
    check: (opts) => ipcRenderer.invoke('updater:check', opts),
    apply: () => ipcRenderer.invoke('updater:apply'),
    onStatus: (fn) => sub('updater:status', fn),
    onProgress: (fn) => sub('updater:progress', fn)
  },

  onProgress: (fn) => sub('batch:progress', fn),
  onLog: (fn) => sub('batch:log', fn),
  onJob: (fn) => sub('batch:job', fn),
  onBatch: (fn) => sub('batch:state', fn),
  onLibraryProgress: (fn) => sub('library:progress', fn),
  onStoryProgress: (fn) => sub('storyVideo:progress', fn),
  onStoryLog: (fn) => sub('storyVideo:log', fn),
  onStoryJob: (fn) => sub('storyVideo:job', fn),
  onStoryState: (fn) => sub('storyVideo:state', fn)
});
