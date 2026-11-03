'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
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
const SCRIPT_STUDIO_ALT_PORT = 8099;
const PORTABLE_PYTHON_ZIP_URL = 'https://github.com/phamngocthu661-lang/zc-team-studio/releases/download/V1.0.0/python_runtime_win64.zip';

let _activeScriptStudioPort = SCRIPT_STUDIO_PORT;
let _realPythonOnline = false;
let _preloadSpawnPromise = null;
let _pythonDownloadPromise = null;

function checkPortQuick(port = _activeScriptStudioPort, timeoutMs = 1000) {
  return new Promise((resolve) => {
    try {
      const req = http.get(`http://127.0.0.1:${port}/`, { timeout: timeoutMs }, (res) => {
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

function checkIsRealPythonServer(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    try {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/is_real_python_server',
        method: 'POST',
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json', 'Content-Length': 2 }
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            resolve(Boolean(data && data.engine === 'python_real'));
          } catch {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        try { req.destroy(); } catch {}
        resolve(false);
      });
      req.write('{}');
      req.end();
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
    const srcBase = fs.existsSync(path.join(appDir, 'mafia_dashboard_server.py')) ? appDir : exeDir;
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
    for (const af of ['script_studio_dashboard.html', 'script_studio_fallback_status.json']) {
      const sf = path.join(srcBase, 'assets', af);
      const df = path.join(dstBase, 'assets', af);
      if (fs.existsSync(sf)) {
        try {
          fs.mkdirSync(path.dirname(df), { recursive: true });
          fs.copyFileSync(sf, df);
        } catch {}
      }
    }
    for (const dirRel of [
      path.join('engine', 'websocket'),
      'skills_12_keys',
      'skills_mexico',
      'skills_homeless',
      'DOCSMOI',
      '.agents'
    ]) {
      const sDir = path.join(srcBase, dirRel);
      const dDir = path.join(dstBase, dirRel);
      if (fs.existsSync(sDir) && !fs.existsSync(dDir)) {
        syncDirRecursiveSafe(sDir, dDir);
      }
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

function ensurePortablePythonReady(appDir, exeDir) {
  const existing = resolveBestPythonExe(appDir, exeDir);
  if (existing && existing !== 'python') {
    return Promise.resolve(existing);
  }
  if (_pythonDownloadPromise) return _pythonDownloadPromise;

  _pythonDownloadPromise = new Promise((resolve) => {
    try {
      const targetRuntimeDir = path.join(appDir, 'python_runtime');
      const tmpZip = path.join(os.tmpdir(), `zc_python_runtime_${Date.now()}.zip`);
      fs.mkdirSync(targetRuntimeDir, { recursive: true });

      const curlChild = spawn('curl.exe', [
        '-sL',
        '--connect-timeout', '15',
        '--max-time', '90',
        PORTABLE_PYTHON_ZIP_URL,
        '-o', tmpZip
      ], { windowsHide: true, stdio: 'ignore' });

      curlChild.on('error', () => {
        resolve(resolveBestPythonExe(appDir, exeDir));
      });

      curlChild.on('close', () => {
        try {
          if (fs.existsSync(tmpZip) && fs.statSync(tmpZip).size > 1000000) {
            try {
              execFileSync('tar.exe', ['-xf', tmpZip, '-C', targetRuntimeDir], { windowsHide: true });
            } catch {
              try {
                execFileSync('powershell.exe', [
                  '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
                  `Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${targetRuntimeDir.replace(/'/g, "''")}' -Force`
                ], { windowsHide: true });
              } catch {}
            }
            try { fs.unlinkSync(tmpZip); } catch {}
            if (exeDir && path.resolve(exeDir) !== path.resolve(appDir)) {
              const exeRuntimeDir = path.join(exeDir, 'python_runtime');
              if (!fs.existsSync(path.join(exeRuntimeDir, 'python.exe'))) {
                syncDirRecursiveSafe(targetRuntimeDir, exeRuntimeDir);
              }
            }
          }
        } catch {}
        resolve(resolveBestPythonExe(appDir, exeDir));
      });
    } catch {
      resolve(resolveBestPythonExe(appDir, exeDir));
    }
  }).finally(() => {
    _pythonDownloadPromise = null;
  });

  return _pythonDownloadPromise;
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

function launchChromeWebLoginNode(rootDir, slotId = 1) {
  const slot = Math.max(1, Math.min(3, Number(slotId) || 1));
  const debugPort = 9221 + slot;
  const profileDirName = slot === 1 ? '.chrome_chatgpt_profile' : `.chrome_chatgpt_profile_acc${slot}`;
  const profileDir = path.join(rootDir, profileDirName);
  try { fs.mkdirSync(profileDir, { recursive: true }); } catch {}

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const progFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const progFiles86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  const browserCandidates = [
    path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFiles86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(progFiles86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ];
  const browserExe = browserCandidates.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
  });
  if (!browserExe) {
    return {
      ok: false,
      message: '❌ Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy tính này.'
    };
  }
  try {
    const child = spawn(browserExe, [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      'https://chatgpt.com'
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return {
      ok: true,
      slot_id: slot,
      port: debugPort,
      message: `🌐 Đã mở cửa sổ trình duyệt cho Acc #${slot} (Port ${debugPort}). Hãy đăng nhập tài khoản ChatGPT trên cửa sổ vừa hiện ra!`
    };
  } catch (err) {
    return {
      ok: false,
      message: `❌ Lỗi mở trình duyệt: ${err.message}`
    };
  }
}

function parseTitlesInputNode(rawText) {
  const lines = String(rawText || '').replace(/\r/g, '').split('\n');
  const items = [];
  for (const rawLine of lines) {
    let s = rawLine.trim();
    if (!s) continue;
    let customName = '';
    const mBracket = s.match(/^\[([^\[\]]{1,40})\]\s*[-:|]?\s*(.+)$/);
    if (mBracket) {
      customName = mBracket[1].trim().replace(/[\\/:*?"<>|]/g, '_');
      s = mBracket[2].trim();
    } else {
      const mPipe = s.match(/^([A-Za-z0-9_.\-]{1,32})\s*\|\s*(.+)$/);
      if (mPipe && /\d/.test(mPipe[1])) {
        customName = mPipe[1].trim().replace(/[\\/:*?"<>|]/g, '_');
        s = mPipe[2].trim();
      }
    }
    const cleaned = s.replace(/^\s*(?:\d+[\.\)\-:]|[-*•]+)\s*/, '').trim();
    if (cleaned) {
      items.push({ title: cleaned, custom_name: customName });
    }
  }
  return items;
}

let _nodeFallbackServer = null;
let _nodeSelectedNiche = '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

function startNodeFallbackServer(appDir, exeDir, port = SCRIPT_STUDIO_PORT) {
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
      const rootDir = fs.existsSync(path.join(exeDir, 'mafia_dashboard_server.py')) ? exeDir : appDir;

      const srv = http.createServer((req, res) => {
        try {
          const u = new URL(req.url || '/', `http://127.0.0.1:${port}`);
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
              const curSt = statusMap[_nodeSelectedNiche] || statusMap.mafia;

              if (u.pathname === '/api/is_real_python_server') {
                const out = Buffer.from(JSON.stringify({ ok: false, engine: 'node_fallback' }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/open_web_login') {
                const loginRes = launchChromeWebLoginNode(rootDir, body.slot_id || 1);
                const out = Buffer.from(JSON.stringify(loginRes), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/add_titles') {
                const parsed = parseTitlesInputNode(body.text || '');
                if (!parsed.length) {
                  const out = Buffer.from(JSON.stringify({
                    ok: false,
                    message: '⚠️ Vui lòng nhập ít nhất 1 tiêu đề hợp lệ vào ô GIAO VIỆC.'
                  }), 'utf8');
                  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                  res.end(out);
                  return;
                }
                if (curSt) {
                  if (!Array.isArray(curSt.backlog)) curSt.backlog = [];
                  if (!Array.isArray(curSt.projects)) curSt.projects = [];
                  for (const item of parsed) {
                    const pid = item.custom_name || `KB_${String(curSt.projects.length + 1).padStart(3, '0')}`;
                    curSt.backlog.push({ title: item.title, custom_name: pid });
                    curSt.projects.unshift({
                      project_id: pid,
                      source_title: item.title,
                      winner_title: '',
                      status: 'NEW',
                      next_step: 1,
                      progress_pct: 5,
                      steps: [
                        { num: 1, label: 'Tiêu Đề', state: 'active', summary: 'Sẵn sàng chạy Bàn #1' },
                        { num: 2, label: 'Giàn Ý', state: 'pending', summary: 'Chờ' },
                        { num: 3, label: 'Viết KB', state: 'pending', summary: 'Chờ' },
                        { num: 4, label: 'QA Lần 1', state: 'pending', summary: 'Chờ' },
                        { num: 5, label: 'Sửa KB', state: 'pending', summary: 'Chờ' },
                        { num: 6, label: 'Đóng Gói SEO', state: 'pending', summary: 'Chờ' }
                      ],
                      word_count: 0,
                      char_count: 0,
                      qa_verdict: '',
                      live_note: '📥 Đã lưu tiêu đề & mã vào danh sách chờ sản xuất.',
                      assigned_worker: 0,
                      updated_at: new Date().toLocaleTimeString('vi-VN')
                    });
                  }
                }
                // Tự động kích hoạt tải và bật Python thật ngầm nếu chưa bật
                ensurePort8098FromPreload().catch(() => {});
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  added_titles: parsed.map((x) => x.title),
                  message: `✅ Đã lưu ${parsed.length} tiêu đề & mã vào danh sách kịch bản (${_nodeSelectedNiche})!`
                }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
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
      srv.listen(port, '127.0.0.1', () => {
        _nodeFallbackServer = srv;
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function ensurePort8098FromPreload({ forceRestart = false } = {}) {
  if (!forceRestart) {
    if (await checkIsRealPythonServer(SCRIPT_STUDIO_PORT, 900)) {
      _activeScriptStudioPort = SCRIPT_STUDIO_PORT;
      _realPythonOnline = true;
      return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, engine: 'python_real' };
    }
    if (await checkIsRealPythonServer(SCRIPT_STUDIO_ALT_PORT, 900)) {
      _activeScriptStudioPort = SCRIPT_STUDIO_ALT_PORT;
      _realPythonOnline = true;
      return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, engine: 'python_real' };
    }
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
        const pyExe = await ensurePortablePythonReady(appDir, exeDir);
        const port8098Occupied = await checkPortQuick(SCRIPT_STUDIO_PORT, 600);
        const targetPort = (!port8098Occupied || await checkIsRealPythonServer(SCRIPT_STUDIO_PORT, 600))
          ? SCRIPT_STUDIO_PORT
          : SCRIPT_STUDIO_ALT_PORT;

        try {
          if (_nodeFallbackServer && targetPort === SCRIPT_STUDIO_PORT) {
            try { _nodeFallbackServer.close(); } catch {}
            _nodeFallbackServer = null;
          }
          const child = spawn(pyExe, [serverScript, '--no-browser', '--port', String(targetPort)], {
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

        for (let i = 0; i < 12; i += 1) {
          await new Promise((r) => setTimeout(r, 450));
          if (await checkIsRealPythonServer(targetPort, 800)) {
            _activeScriptStudioPort = targetPort;
            _realPythonOnline = true;
            return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, engine: 'python_real' };
          }
        }
      }

      const fallbackPort = !(await checkPortQuick(SCRIPT_STUDIO_PORT, 500)) ? SCRIPT_STUDIO_PORT : SCRIPT_STUDIO_ALT_PORT;
      await startNodeFallbackServer(appDir, exeDir, fallbackPort);
      if (await checkPortQuick(fallbackPort, 800)) {
        _activeScriptStudioPort = fallbackPort;
        return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, fallbackNode: true };
      }
      if (await checkPortQuick(SCRIPT_STUDIO_PORT, 800)) {
        _activeScriptStudioPort = SCRIPT_STUDIO_PORT;
        return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, fallbackNode: true };
      }
      return { online: false };
    } finally {
      _preloadSpawnPromise = null;
    }
  })();
  return _preloadSpawnPromise;
}

// Tự động kích hoạt kiểm tra & bật Real Python Server ngay khi preload nạp (kể cả sau khi OTA reload)
setTimeout(() => {
  ensurePort8098FromPreload().catch(() => {});
}, 200);

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
      if (!_realPythonOnline) {
        const res = await ensurePort8098FromPreload().catch(() => ({ online: false }));
        if (res && res.online) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = res.url || `http://127.0.0.1:${_activeScriptStudioPort}`;
          return st;
        }
      }
      const up = await checkPortQuick(_activeScriptStudioPort, 800);
      if (up) {
        st.scriptServerOnline = true;
        st.scriptServerUrl = `http://127.0.0.1:${_activeScriptStudioPort}`;
      } else {
        const res = await ensurePort8098FromPreload().catch(() => ({ online: false }));
        if (res && res.online) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = res.url || `http://127.0.0.1:${_activeScriptStudioPort}`;
        }
      }
      return st;
    },
    ensureScriptServer: async () => {
      return ensurePort8098FromPreload();
    },
    restartScriptServer: async () => {
      return ensurePort8098FromPreload({ forceRestart: true });
    },
    saveSettings: (partial) => ipcRenderer.invoke('scriptBridge:saveSettings', partial),
    lockConfig: (config) => ipcRenderer.invoke('scriptBridge:lockConfig', config),
    enqueueScript: (payload) => ipcRenderer.invoke('scriptBridge:enqueueScript', payload),
    enqueueFolder: (folderPath) => ipcRenderer.invoke('scriptBridge:enqueueFolder', folderPath),
    clearQueue: () => ipcRenderer.invoke('scriptBridge:clearQueue'),
    onState: (fn) => sub('scriptBridge:state', async (st) => {
      if (st) {
        const up = await checkPortQuick(_activeScriptStudioPort, 600);
        if (up) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = `http://127.0.0.1:${_activeScriptStudioPort}`;
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
