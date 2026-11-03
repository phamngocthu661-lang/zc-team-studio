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
const CANDIDATE_STUDIO_PORTS = [8098, 8099, 8100, 8101, 8102, 8103];
const PORTABLE_PYTHON_ZIP_URL = 'https://github.com/phamngocthu661-lang/zc-team-studio/releases/download/V1.0.0/python_runtime_win64.zip';

let _activeScriptStudioPort = SCRIPT_STUDIO_PORT;
let _realPythonOnline = false;
let _preloadSpawnPromise = null;
let _pythonDownloadPromise = null;

function syncIframeToRealPythonUrl(port) {
  try {
    if (typeof document === 'undefined') return;
    const targetBase = `http://127.0.0.1:${port}`;
    const iframe = document.getElementById('scriptStudioIframe');
    if (iframe) {
      const curSrc = String(iframe.getAttribute('src') || '');
      const isRealVerified = iframe.dataset && iframe.dataset.realPythonPort === String(port);
      if (!curSrc.startsWith(targetBase) || !isRealVerified) {
        const curChan = document.getElementById('topGlobalKeySelect')?.value
          || (typeof localStorage !== 'undefined' && localStorage.getItem('zc_active_channel_key'))
          || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
        if (iframe.dataset) {
          iframe.dataset.verifiedLoaded = '1';
          iframe.dataset.realPythonPort = String(port);
        }
        iframe.src = `${targetBase}/?embedded=1&channel=${encodeURIComponent(curChan)}&t=${Date.now()}`;
      }
    }
    const badge = document.getElementById('scriptStudioServerBadge');
    if (badge) {
      badge.style.background = '#065f46';
      badge.style.color = '#34d399';
      badge.textContent = `🟢 Engine Kịch Bản: Đang hoạt động (${port})`;
    }
  } catch {}
}

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
            resolve(Boolean(data && data.engine === 'python_real' && Number(data.build_number || 0) >= 109));
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

function flattenPortablePythonDlls(pyRuntimeDir) {
  try {
    if (!pyRuntimeDir || !fs.existsSync(pyRuntimeDir)) return;
    const pthFile = path.join(pyRuntimeDir, 'python314._pth');
    if (fs.existsSync(pthFile)) {
      try {
        const curPth = fs.readFileSync(pthFile, 'utf8');
        if (!curPth.includes('DLLs')) {
          fs.writeFileSync(pthFile, 'python314.zip\r\nDLLs\r\n.\r\n..\r\nimport site\r\n', 'utf8');
        }
      } catch {}
    }
    const dllsDir = path.join(pyRuntimeDir, 'DLLs');
    if (!fs.existsSync(dllsDir)) return;
    for (const entry of fs.readdirSync(dllsDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (entry.name.endsWith('.pyd') || entry.name.endsWith('.dll')) {
        const src = path.join(dllsDir, entry.name);
        const dst = path.join(pyRuntimeDir, entry.name);
        if (!fs.existsSync(dst)) {
          try { fs.copyFileSync(src, dst); } catch {}
        }
      }
    }
  } catch {}
}

function mergeBacklogFilesBetweenDirs(srcDir, dstDir) {
  try {
    if (!srcDir || !dstDir || !fs.existsSync(srcDir) || !fs.existsSync(dstDir)) return;
    if (path.resolve(srcDir).toLowerCase() === path.resolve(dstDir).toLowerCase()) return;
    for (const entry of fs.readdirSync(srcDir)) {
      if (entry.startsWith('QUEUE_BACKLOG') && entry.endsWith('.json')) {
        const srcB = path.join(srcDir, entry);
        const dstB = path.join(dstDir, entry);
        try {
          const srcData = JSON.parse(fs.readFileSync(srcB, 'utf8') || '{}');
          const srcItems = Array.isArray(srcData.items) ? srcData.items : [];
          if (!srcItems.length) continue;
          let dstData = { max_parallel_threads: 3, thinking_effort: 'medium', items: [] };
          if (fs.existsSync(dstB)) {
            try {
              dstData = JSON.parse(fs.readFileSync(dstB, 'utf8') || '{}') || dstData;
              if (!Array.isArray(dstData.items)) dstData.items = [];
            } catch {}
          }
          const existingIds = new Set(dstData.items.map((x) => x.project_id));
          let changed = false;
          for (const it of srcItems) {
            if (it && it.project_id && !existingIds.has(it.project_id)) {
              const oldPdir = String(it.project_dir || '');
              if (oldPdir && oldPdir.toLowerCase().startsWith(path.resolve(srcDir).toLowerCase())) {
                const rel = path.relative(srcDir, oldPdir);
                const newPdir = path.join(dstDir, rel);
                if (fs.existsSync(oldPdir) && !fs.existsSync(newPdir)) {
                  syncDirRecursiveSafe(oldPdir, newPdir);
                }
                it.project_dir = newPdir;
              }
              dstData.items.push(it);
              existingIds.add(it.project_id);
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(dstB, JSON.stringify(dstData, null, 2), 'utf8');
          }
        } catch {}
      }
    }
  } catch {}
}

function readBuildNumberSafe(dir) {
  try {
    const vf = path.join(dir, 'version.json');
    if (fs.existsSync(vf)) {
      const d = JSON.parse(fs.readFileSync(vf, 'utf8') || '{}');
      return Number(d.build_number || 0);
    }
  } catch {}
  return 0;
}

function ensureCustomerFilesSynced(appDir, exeDir) {
  try {
    for (const base of [exeDir, appDir]) {
      if (base) {
        flattenPortablePythonDlls(path.join(base, 'python_runtime'));
        flattenPortablePythonDlls(path.join(base, 'engine', 'python_runtime'));
      }
    }
    if (!appDir || !exeDir || path.resolve(appDir) === path.resolve(exeDir)) return;
    // Đồng bộ DLLs của python_runtime giữa appDir và exeDir nếu 1 trong 2 bên có đủ DLLs
    const appPyDlls = path.join(appDir, 'python_runtime', 'DLLs');
    const exePyDlls = path.join(exeDir, 'python_runtime', 'DLLs');
    if (fs.existsSync(appPyDlls) && !fs.existsSync(path.join(exePyDlls, '_socket.pyd'))) {
      syncDirRecursiveSafe(path.join(appDir, 'python_runtime'), path.join(exeDir, 'python_runtime'));
      flattenPortablePythonDlls(path.join(exeDir, 'python_runtime'));
    } else if (fs.existsSync(exePyDlls) && !fs.existsSync(path.join(appPyDlls, '_socket.pyd'))) {
      syncDirRecursiveSafe(path.join(exeDir, 'python_runtime'), path.join(appDir, 'python_runtime'));
      flattenPortablePythonDlls(path.join(appDir, 'python_runtime'));
    }

    // Đồng bộ QUEUE_BACKLOG*.json hai chiều để không bao giờ mất hàng đợi
    mergeBacklogFilesBetweenDirs(appDir, exeDir);
    mergeBacklogFilesBetweenDirs(exeDir, appDir);

    const appBuild = readBuildNumberSafe(appDir);
    const exeBuild = readBuildNumberSafe(exeDir);
    const srcBase = (exeBuild > appBuild && fs.existsSync(path.join(exeDir, 'mafia_dashboard_server.py')))
      ? exeDir
      : (fs.existsSync(path.join(appDir, 'mafia_dashboard_server.py')) ? appDir : exeDir);
    const dstBase = srcBase === appDir ? exeDir : appDir;
    if (!fs.existsSync(dstBase)) return;

    for (const f of ['mafia_dashboard_server.py', 'organize_12_keys_skills.py', 'version.json']) {
      const sf = path.join(srcBase, f);
      const df = path.join(dstBase, f);
      if (fs.existsSync(sf)) {
        try { fs.copyFileSync(sf, df); } catch {}
      }
    }
    for (const ef of [
      'chatgpt_web_client.py',
      'mafia_chatgpt_pipeline.py',
      'license_manager.py',
      'channel_memory_guard.py',
      'tts_post_director.py',
      'auto_tab_sweeper_daemon.py'
    ]) {
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
      path.join('engine', 'skills_bundle'),
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

function isValidPortableOrSysPython(exe) {
  try {
    if (!exe || !fs.existsSync(exe)) return false;
    const dir = path.dirname(exe);
    flattenPortablePythonDlls(dir);
    // Portable Python 3.14 BẮT BUỘC phải có đủ: python314.zip + python314.dll + _socket.pyd (trong gốc hoặc DLLs/)
    const hasZip = fs.existsSync(path.join(dir, 'python314.zip'))
      || fs.existsSync(path.join(dir, 'python313.zip'))
      || fs.existsSync(path.join(dir, 'python312.zip'));
    const hasDll = fs.existsSync(path.join(dir, 'python314.dll'))
      || fs.existsSync(path.join(dir, 'python3.dll'));
    const hasSocketPyd = fs.existsSync(path.join(dir, '_socket.pyd'))
      || fs.existsSync(path.join(dir, 'DLLs', '_socket.pyd'));
    if (hasZip && hasDll && hasSocketPyd) {
      return true;
    }
    // System Python installation must have Lib/os.py
    if (fs.existsSync(path.join(dir, 'Lib', 'os.py'))) {
      return true;
    }
  } catch {}
  return false;
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
    if (isValidPortableOrSysPython(exe)) {
      return exe;
    }
  }
  const sysCandidates = [
    path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
    'C:\\Python314\\python.exe',
    'C:\\Python313\\python.exe',
    'C:\\Python312\\python.exe'
  ];
  for (const exe of sysCandidates) {
    if (isValidPortableOrSysPython(exe)) {
      return exe;
    }
  }
  return 'python';
}

function ensurePortablePythonReady(appDir, exeDir) {
  const appPortable = path.join(appDir, 'python_runtime', 'python.exe');
  const exePortable = path.join(exeDir, 'python_runtime', 'python.exe');
  if (isValidPortableOrSysPython(appPortable) && exeDir && path.resolve(exeDir) !== path.resolve(appDir) && !isValidPortableOrSysPython(exePortable)) {
    syncDirRecursiveSafe(path.dirname(appPortable), path.dirname(exePortable));
  } else if (isValidPortableOrSysPython(exePortable) && !isValidPortableOrSysPython(appPortable)) {
    syncDirRecursiveSafe(path.dirname(exePortable), path.dirname(appPortable));
  }
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
              syncDirRecursiveSafe(targetRuntimeDir, exeRuntimeDir);
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
  const profileDirName = slot === 1 ? 'BROWSER_PROFILE' : `BROWSER_PROFILE_${slot}`;
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
      '--remote-allow-origins=*',
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--new-window',
      'https://chatgpt.com/'
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

function parseTitlesPayloadNode(body = {}) {
  const items = [];
  if (Array.isArray(body.titles) && body.titles.length > 0) {
    const cNames = Array.isArray(body.custom_names) ? body.custom_names : [];
    for (let i = 0; i < body.titles.length; i += 1) {
      let s = String(body.titles[i] || '').trim();
      if (!s) continue;
      let cname = String(cNames[i] || '').trim().replace(/[\\/:*?"<>|]/g, '_');
      if (!cname && s.includes('\t')) {
        const parts = s.split('\t');
        if (parts.length >= 2 && parts[0].trim().length <= 45 && parts[1].trim().length >= 8) {
          cname = parts[0].trim().replace(/[\\/:*?"<>|]/g, '_');
          s = parts.slice(1).join(' ').trim();
        }
      }
      const cleaned = s.replace(/^\s*(?:\d+[\.\)\-:]|[-*•]+)\s*/, '').trim();
      if (cleaned) {
        items.push({ title: cleaned, custom_name: cname });
      }
    }
    return items;
  }
  const lines = String(body.text || '').replace(/\r/g, '').split('\n');
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

function resolveBacklogAndProjectsDirsNode(rootDir, niche) {
  const n = String(niche || 'mafia').trim();
  const low = n.toLowerCase();
  if (low === 'mafia') {
    return {
      backlogPath: path.join(rootDir, 'QUEUE_BACKLOG.json'),
      projectsRoot: path.join(rootDir, 'PROJECTS')
    };
  }
  if (low === 'homeless') {
    return {
      backlogPath: path.join(rootDir, 'QUEUE_BACKLOG_HOMELESS.json'),
      projectsRoot: path.join(rootDir, 'PROJECTS_HOMELESS')
    };
  }
  if (low === 'mexico') {
    return {
      backlogPath: path.join(rootDir, 'QUEUE_BACKLOG_MEXICO.json'),
      projectsRoot: path.join(rootDir, 'PROJECTS_MEXICO')
    };
  }
  return {
    backlogPath: path.join(rootDir, `QUEUE_BACKLOG_${n}.json`),
    projectsRoot: path.join(rootDir, `PROJECTS_${n}`)
  };
}

function persistTitlesToDiskNode(rootDir, niche, parsedItems, skipTitleRewrite = false) {
  const { backlogPath, projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, niche);
  try { fs.mkdirSync(projectsRoot, { recursive: true }); } catch {}
  let backlog = { max_parallel_threads: 3, thinking_effort: 'medium', niche, items: [] };
  try {
    if (fs.existsSync(backlogPath)) {
      backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}') || backlog;
      if (!Array.isArray(backlog.items)) backlog.items = [];
    }
  } catch {}

  let maxNum = 0;
  for (const it of backlog.items) {
    const m = String(it.project_id || '').match(/^(\d+)_/);
    if (m) maxNum = Math.max(maxNum, Number(m[1]) || 0);
  }
  let nextNum = maxNum + 1;
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const added = [];

  for (const entry of parsedItems) {
    const t = String(entry.title || '').trim();
    if (!t) continue;
    const cname = String(entry.custom_name || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_');
    const slug = t.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'Story';
    const numStr = String(nextNum).padStart(3, '0');
    const pid = cname ? `${numStr}_${cname}_${slug}` : `${numStr}_${slug}`;
    nextNum += 1;
    const pdir = path.join(projectsRoot, pid);
    try { fs.mkdirSync(pdir, { recursive: true }); } catch {}

    const item = {
      project_id: pid,
      project_dir: pdir,
      source_title: t,
      custom_name: cname,
      niche,
      skip_title_rewrite: Boolean(skipTitleRewrite),
      winner_title: skipTitleRewrite ? t : '',
      winner_title_score: skipTitleRewrite ? 100 : 0,
      status: skipTitleRewrite ? 'QUEUED_SKIP_STEP_1' : 'QUEUED',
      added_at: nowStr
    };
    const stPath = path.join(pdir, 'STATE.json');
    if (!fs.existsSync(stPath)) {
      try {
        fs.writeFileSync(stPath, JSON.stringify({
          project_id: pid,
          project_dir: pdir,
          source_title: t,
          custom_name: cname,
          skip_title_rewrite: Boolean(skipTitleRewrite),
          winner_title: skipTitleRewrite ? t : '',
          winner_title_score: skipTitleRewrite ? 100 : 0,
          thinking_effort: 'medium',
          thread_id: '',
          host_id: 'chatgpt_web',
          completed_steps: skipTitleRewrite ? ['STEP_1_DONE'] : [],
          current_step_status: skipTitleRewrite ? 'QUEUED_SKIP_STEP_1' : 'QUEUED',
          live_note: skipTitleRewrite
            ? '🎯 Sử dụng luôn tiêu đề đã dán (Bỏ qua Bàn #1) ➔ Sẵn sàng chạy thẳng Bàn #1.5 & Bàn #2'
            : '📥 Đang nằm trong hàng đợi (Chưa chạy).',
          completed: false,
          updated_at: nowStr
        }, null, 2), 'utf8');
      } catch {}
    }
    backlog.items.push(item);
    added.push(item);
  }
  try {
    fs.writeFileSync(backlogPath, JSON.stringify(backlog, null, 2), 'utf8');
  } catch {}
  return added;
}

function appendStudioLogNode(rootDir, tag, message) {
  try {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logPath = path.join(rootDir, 'LIVE_STUDIO_LOG.txt');
    fs.appendFileSync(logPath, `[${nowStr}] [${tag}] ${message}\n`, 'utf8');
  } catch {}
}

function markQueuedProjectsStartingNode(rootDir, niche, maxWorkers = 3, singleProjectDir = '', singleProjectId = '') {
  try {
    const { backlogPath, projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, niche);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const targetDirs = [];
    if (singleProjectDir || singleProjectId) {
      const pdir = singleProjectDir && fs.existsSync(singleProjectDir)
        ? singleProjectDir
        : path.join(projectsRoot, singleProjectId || path.basename(singleProjectDir || ''));
      if (pdir) targetDirs.push(pdir);
    } else if (fs.existsSync(backlogPath)) {
      const bdata = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}');
      const items = Array.isArray(bdata.items) ? bdata.items : [];
      const limit = Math.max(1, Number(maxWorkers) > 0 ? Number(maxWorkers) : 3);
      for (const it of items) {
        if (it.status === 'COMPLETED') continue;
        const pdir = it.project_dir && fs.existsSync(it.project_dir)
          ? it.project_dir
          : path.join(projectsRoot, String(it.project_id || ''));
        if (pdir) targetDirs.push(pdir);
        if (targetDirs.length >= limit) break;
      }
    }
    for (const pdir of targetDirs) {
      const stPath = path.join(pdir, 'STATE.json');
      if (fs.existsSync(stPath)) {
        try {
          const stObj = JSON.parse(fs.readFileSync(stPath, 'utf8') || '{}');
          if (!stObj.completed) {
            const skipS1 = Boolean(stObj.skip_title_rewrite);
            stObj.current_step_status = skipS1 ? 'STEP_1_5_STARTING' : 'STEP_1_STARTING';
            stObj.live_note = '🚀 Đang khởi động trình duyệt Chrome & kết nối tài khoản ChatGPT (Port 9222)...';
            stObj.updated_at = nowStr;
            fs.writeFileSync(stPath, JSON.stringify(stObj, null, 2), 'utf8');
          }
        } catch {}
      }
    }
  } catch {}
}

function triggerPipelineWorkerNode(appDir, exeDir, rootDir, niche, maxWorkers = 3, thinking = 'medium', singleProjectDir = '', singleProjectId = '') {
  const cleanNiche = String(niche || 'mafia').trim();
  ensureCustomerFilesSynced(appDir, exeDir);
  markQueuedProjectsStartingNode(rootDir, cleanNiche, maxWorkers, singleProjectDir, singleProjectId);
  appendStudioLogNode(
    rootDir,
    'WEB-CONTROL',
    singleProjectDir || singleProjectId
      ? `🚀 Khởi chạy kịch bản đơn luồng [${singleProjectId || path.basename(singleProjectDir)}] (Kênh: ${cleanNiche.toUpperCase()} | model=${thinking})...`
      : `🚀 Khởi chạy Hàng đợi kịch bản (Kênh: ${cleanNiche.toUpperCase()} | max_workers=${maxWorkers || 3} | model=${thinking})...`
  );

  // Tự động kiểm tra Port 9222 (Chrome ChatGPT Acc #1); nếu chưa mở thì bật Chrome lên ngay
  checkPortQuick(9222, 500).then((chromeUp) => {
    if (!chromeUp) {
      const loginRes = launchChromeWebLoginNode(rootDir, 1);
      if (loginRes && loginRes.message) {
        appendStudioLogNode(rootDir, 'WEB-BROWSER', loginRes.message);
      }
    }
  }).catch(() => {});

  ensurePortablePythonReady(appDir, exeDir).then((pyExe) => {
    const pipelineScript = path.join(rootDir, 'engine', 'mafia_chatgpt_pipeline.py');
    if (!fs.existsSync(pipelineScript)) {
      appendStudioLogNode(rootDir, 'ERROR', `❌ Không tìm thấy file ${pipelineScript}`);
      return;
    }
    let logFd = null;
    try {
      const liveLogPath = path.join(rootDir, 'LIVE_STUDIO_LOG.txt');
      logFd = fs.openSync(liveLogPath, 'a');
    } catch {}
    try {
      const { projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, cleanNiche);
      const resolvedSingleDir = (singleProjectDir && fs.existsSync(singleProjectDir))
        ? singleProjectDir
        : (singleProjectId ? path.join(projectsRoot, singleProjectId) : singleProjectDir);
      const args = [
        '-u',
        pipelineScript,
        '--niche', cleanNiche,
        '--thinking', String(thinking || 'medium')
      ];
      if (resolvedSingleDir) {
        args.push('--project_dir', resolvedSingleDir);
      } else {
        args.push('--run_queue', '--max_workers', String(maxWorkers || 3));
      }
      const child = spawn(pyExe, args, {
        cwd: rootDir,
        windowsHide: true,
        stdio: logFd !== null ? ['ignore', logFd, logFd] : 'ignore',
        detached: false,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8'
        }
      });
      child.on('error', (err) => {
        appendStudioLogNode(rootDir, 'WORKER-ERROR', `❌ Lỗi khởi chạy Python Worker (${pyExe}): ${err.message}`);
        if (logFd !== null) { try { fs.closeSync(logFd); } catch {} logFd = null; }
      });
      child.on('close', () => {
        if (logFd !== null) { try { fs.closeSync(logFd); } catch {} logFd = null; }
      });
    } catch (err) {
      appendStudioLogNode(rootDir, 'WORKER-ERROR', `❌ Ngoại lệ khi bật tiến trình Python: ${err.message}`);
      if (logFd !== null) { try { fs.closeSync(logFd); } catch {} }
    }
  }).catch((err) => {
    appendStudioLogNode(rootDir, 'PYTHON-ERROR', `❌ Không thể chuẩn bị môi trường Python: ${err?.message || err}`);
  });
}

let _nodeFallbackServer = null;
let _nodeSelectedNiche = '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

function requestShutdownNodeFallbackPort(port, timeoutMs = 400) {
  return new Promise((resolve) => {
    try {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/shutdown_node_fallback',
        method: 'POST',
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json', 'Content-Length': 2 }
      }, (res) => {
        res.resume();
        resolve(true);
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
            if (rawNiche) {
              _nodeSelectedNiche = rawNiche;
            }
            const baseSt = statusMap[_nodeSelectedNiche] || statusMap.mafia || Object.values(statusMap)[0] || {};
            try {
              const { backlogPath, projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, _nodeSelectedNiche);
              if (fs.existsSync(backlogPath)) {
                const diskBacklog = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}');
                const items = Array.isArray(diskBacklog.items) ? diskBacklog.items : [];
                baseSt.projects = items.slice().reverse().map((it) => {
                  const pid = it.project_id || '001_Story';
                  const pdir = (it.project_dir && fs.existsSync(it.project_dir))
                    ? it.project_dir
                    : path.join(projectsRoot, pid);
                  let stObj = {};
                  try {
                    if (pdir && fs.existsSync(path.join(pdir, 'STATE.json'))) {
                      stObj = JSON.parse(fs.readFileSync(path.join(pdir, 'STATE.json'), 'utf8') || '{}');
                    }
                  } catch {}
                  const curStep = String(stObj.current_step_status || it.status || 'QUEUED');
                  const isActive = curStep.includes('RUNNING') || curStep.includes('STARTING');
                  return {
                    project_id: pid,
                    project_dir: pdir || '',
                    custom_name: it.custom_name || stObj.custom_name || '',
                    export_prefix: it.custom_name || stObj.custom_name || pid.slice(0, 3),
                    account_id: stObj.account_id || 'acc_1',
                    account_label: stObj.account_label || 'Acc #1',
                    source_title: it.source_title || stObj.source_title || pid,
                    winner_title: stObj.winner_title || it.winner_title || '',
                    winner_title_score: stObj.winner_title_score || it.winner_title_score || 0,
                    skip_title_rewrite: Boolean(it.skip_title_rewrite || stObj.skip_title_rewrite),
                    completed_steps: Array.isArray(stObj.completed_steps) ? stObj.completed_steps : [],
                    current_step_status: curStep,
                    active_stage: isActive ? 1 : 0,
                    progress_pct: stObj.completed ? 100 : (isActive ? 15 : 5),
                    live_note: stObj.live_note || '📥 Đã lưu tiêu đề & mã vào danh sách kịch bản.',
                    completed: Boolean(stObj.completed),
                    script_metrics: stObj.script_metrics || {},
                    audit_history: Array.isArray(stObj.audit_history) ? stObj.audit_history : [],
                    agent_chat_registry: stObj.agent_chat_registry || {},
                    updated_at: stObj.updated_at || it.added_at || new Date().toLocaleTimeString('vi-VN')
                  };
                });
              }
              const liveLogPath = path.join(rootDir, 'LIVE_STUDIO_LOG.txt');
              if (fs.existsSync(liveLogPath)) {
                const logLines = fs.readFileSync(liveLogPath, 'utf8').split(/\r?\n/);
                baseSt.recent_logs = logLines.slice(-120).join('\n');
              } else {
                baseSt.recent_logs = '🚀 Hệ thống ZC Team Studio đã sẵn sàng. Hãy đăng nhập tài khoản ChatGPT (Acc #1), nhập tiêu đề và bấm Lưu & Chạy Ngay!';
              }
            } catch {}
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
              const reqNiche = String(body.niche || u.searchParams.get('niche') || '').trim();
              if (reqNiche) {
                _nodeSelectedNiche = reqNiche;
              }
              const curSt = statusMap[_nodeSelectedNiche] || statusMap.mafia;

              if (u.pathname === '/api/is_real_python_server') {
                const out = Buffer.from(JSON.stringify({ ok: false, engine: 'node_fallback' }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/shutdown_node_fallback') {
                const out = Buffer.from(JSON.stringify({ ok: true }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                try { srv.close(); } catch {}
                if (_nodeFallbackServer === srv) _nodeFallbackServer = null;
                return;
              }

              if (u.pathname === '/api/open_web_login') {
                const loginRes = launchChromeWebLoginNode(rootDir, body.slot_id || body.acc_id || 1);
                const out = Buffer.from(JSON.stringify(loginRes), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/add_titles') {
                const parsed = parseTitlesPayloadNode(body);
                if (!parsed.length) {
                  if (body.run_now) {
                    triggerPipelineWorkerNode(appDir, exeDir, rootDir, _nodeSelectedNiche, body.max_workers || 3, body.thinking || 'medium');
                    ensurePort8098FromPreload().catch(() => {});
                    const outRun = Buffer.from(JSON.stringify({
                      ok: true,
                      added_count: 0,
                      message: `🚀 Đã kích hoạt chạy Hàng đợi kịch bản hiện có (${_nodeSelectedNiche})!`
                    }), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': outRun.length });
                    res.end(outRun);
                    return;
                  }
                  const out = Buffer.from(JSON.stringify({
                    ok: false,
                    message: '⚠️ Vui lòng nhập ít nhất 1 tiêu đề hợp lệ vào ô GIAO VIỆC.'
                  }), 'utf8');
                  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                  res.end(out);
                  return;
                }
                const skipRewrite = Boolean(body.skip_title_rewrite);
                const addedOnDisk = persistTitlesToDiskNode(rootDir, _nodeSelectedNiche, parsed, skipRewrite);
                if (curSt) {
                  if (!Array.isArray(curSt.backlog)) curSt.backlog = [];
                  if (!Array.isArray(curSt.projects)) curSt.projects = [];
                  for (const item of addedOnDisk) {
                    const pid = item.project_id;
                    curSt.backlog.push({ title: item.source_title, custom_name: item.custom_name || pid });
                    curSt.projects.unshift({
                      project_id: pid,
                      project_dir: item.project_dir,
                      custom_name: item.custom_name || '',
                      export_prefix: item.custom_name || pid.slice(0, 3),
                      account_id: 'acc_1',
                      account_label: 'Acc #1',
                      source_title: item.source_title,
                      winner_title: skipRewrite ? item.source_title : '',
                      winner_title_score: skipRewrite ? 100 : 0,
                      skip_title_rewrite: skipRewrite,
                      completed_steps: skipRewrite ? ['STEP_1_DONE'] : [],
                      current_step_status: body.run_now ? 'STEP_1_RUNNING' : 'QUEUED',
                      active_stage: body.run_now ? (skipRewrite ? 1.5 : 1) : 0,
                      progress_pct: body.run_now ? 15 : 5,
                      live_note: body.run_now
                        ? '🚀 Đang khởi chạy Pipeline 9 Bàn AI Agent & tự động chuyển sang Bàn #7 làm Video...'
                        : '📥 Đã lưu tiêu đề & mã vào danh sách chờ sản xuất.',
                      completed: false,
                      updated_at: new Date().toLocaleTimeString('vi-VN')
                    });
                  }
                }
                if (body.run_now) {
                  triggerPipelineWorkerNode(appDir, exeDir, rootDir, _nodeSelectedNiche, body.max_workers || 3, body.thinking || 'medium');
                }
                // Tự động kích hoạt tải và bật Python thật ngầm nếu chưa bật
                ensurePort8098FromPreload().catch(() => {});
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  added_count: addedOnDisk.length,
                  added_titles: addedOnDisk.map((x) => x.source_title),
                  message: body.run_now
                    ? `🚀 Đã lưu ${addedOnDisk.length} kịch bản & khởi chạy Pipeline Viết Kịch Bản ➔ Làm Video (${_nodeSelectedNiche})!`
                    : `✅ Đã lưu ${addedOnDisk.length} tiêu đề & mã vào danh sách kịch bản (${_nodeSelectedNiche})!`
                }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/delete_project' || u.pathname === '/api/bulk_delete_projects') {
                const rawIds = u.pathname === '/api/delete_project' ? [body.project_id] : (body.project_ids || []);
                const targetIds = Array.from(new Set(rawIds.map((x) => String(x || '').trim()).filter(Boolean)));
                const { backlogPath, projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, _nodeSelectedNiche);
                try {
                  if (fs.existsSync(backlogPath)) {
                    const bdata = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}');
                    if (Array.isArray(bdata.items)) {
                      bdata.items = bdata.items.filter((it) => !targetIds.includes(String(it.project_id || '').trim()));
                      fs.writeFileSync(backlogPath, JSON.stringify(bdata, null, 2), 'utf8');
                    }
                  }
                } catch {}
                for (const pid of targetIds) {
                  if (pid.includes('/') || pid.includes('\\') || pid === '.' || pid === '..') continue;
                  const pdir = path.join(projectsRoot, pid);
                  try {
                    if (fs.existsSync(pdir)) {
                      fs.rmSync(pdir, { recursive: true, force: true });
                    }
                  } catch {}
                }
                if (curSt && Array.isArray(curSt.projects)) {
                  curSt.projects = curSt.projects.filter((p) => !targetIds.includes(String(p.project_id || '').trim()));
                }
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  deleted_count: targetIds.length,
                  message: `🗑️ Đã xóa vĩnh viễn ${targetIds.length} kịch bản & xóa Folder trên ổ cứng!`
                }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/update_project_title' || u.pathname === '/api/rename_project') {
                const pid = String(body.project_id || '').trim();
                const newSrc = body.source_title !== undefined ? String(body.source_title || '').trim() : undefined;
                const newWin = body.winner_title !== undefined ? String(body.winner_title || '').trim() : undefined;
                const newCname = body.custom_name !== undefined ? String(body.custom_name || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_') : undefined;
                const skipS1 = body.skip_title_rewrite !== undefined ? Boolean(body.skip_title_rewrite) : undefined;
                const { backlogPath, projectsRoot } = resolveBacklogAndProjectsDirsNode(rootDir, _nodeSelectedNiche);
                try {
                  if (fs.existsSync(backlogPath)) {
                    const bdata = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}');
                    if (Array.isArray(bdata.items)) {
                      for (const it of bdata.items) {
                        if (String(it.project_id || '') === pid) {
                          if (newSrc) it.source_title = newSrc;
                          if (newWin !== undefined) it.winner_title = newWin;
                          if (newCname !== undefined) it.custom_name = newCname;
                          if (skipS1 !== undefined) it.skip_title_rewrite = skipS1;
                        }
                      }
                      fs.writeFileSync(backlogPath, JSON.stringify(bdata, null, 2), 'utf8');
                    }
                  }
                } catch {}
                const stPath = path.join(projectsRoot, pid, 'STATE.json');
                try {
                  if (fs.existsSync(stPath)) {
                    const stData = JSON.parse(fs.readFileSync(stPath, 'utf8') || '{}');
                    if (newSrc) stData.source_title = newSrc;
                    if (newWin !== undefined) stData.winner_title = newWin;
                    if (newCname !== undefined) stData.custom_name = newCname;
                    if (skipS1 !== undefined) stData.skip_title_rewrite = skipS1;
                    fs.writeFileSync(stPath, JSON.stringify(stData, null, 2), 'utf8');
                  }
                } catch {}
                if (curSt && Array.isArray(curSt.projects)) {
                  for (const p of curSt.projects) {
                    if (String(p.project_id || '') === pid) {
                      if (newSrc) p.source_title = newSrc;
                      if (newWin !== undefined) p.winner_title = newWin;
                      if (newCname !== undefined) {
                        p.custom_name = newCname;
                        p.export_prefix = newCname || pid.slice(0, 3);
                      }
                      if (skipS1 !== undefined) p.skip_title_rewrite = skipS1;
                    }
                  }
                }
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  message: `🔄 Đã cập nhật tiêu đề & mã kịch bản cho [${pid}]!`
                }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/update_titles_batch') {
                const parsed = parseTitlesPayloadNode(body);
                if (!parsed.length) {
                  const out = Buffer.from(JSON.stringify({ ok: false, message: '⚠️ Chưa có tiêu đề hợp lệ để cập nhật.' }), 'utf8');
                  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                  res.end(out);
                  return;
                }
                const { backlogPath } = resolveBacklogAndProjectsDirsNode(rootDir, _nodeSelectedNiche);
                try {
                  if (fs.existsSync(backlogPath)) {
                    const bdata = JSON.parse(fs.readFileSync(backlogPath, 'utf8') || '{}');
                    for (const it of (bdata.items || [])) {
                      if (it.status !== 'COMPLETED' && it.project_dir && fs.existsSync(it.project_dir)) {
                        try { fs.rmSync(it.project_dir, { recursive: true, force: true }); } catch {}
                      }
                    }
                    bdata.items = (bdata.items || []).filter((it) => it.status === 'COMPLETED');
                    fs.writeFileSync(backlogPath, JSON.stringify(bdata, null, 2), 'utf8');
                  }
                } catch {}
                const skipRewrite = Boolean(body.skip_title_rewrite);
                const addedOnDisk = persistTitlesToDiskNode(rootDir, _nodeSelectedNiche, parsed, skipRewrite);
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  updated_count: addedOnDisk.length,
                  message: `🔄 Đã cập nhật ${addedOnDisk.length} tiêu đề thành công!`
                }), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': out.length });
                res.end(out);
                return;
              }

              if (u.pathname === '/api/run_queue' || u.pathname === '/api/run_single') {
                const sDir = u.pathname === '/api/run_single' ? String(body.project_dir || '').trim() : '';
                const sPid = u.pathname === '/api/run_single' ? String(body.project_id || '').trim() : '';
                triggerPipelineWorkerNode(appDir, exeDir, rootDir, _nodeSelectedNiche, body.max_workers || 3, body.thinking || 'medium', sDir, sPid);
                ensurePort8098FromPreload().catch(() => {});
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  message: u.pathname === '/api/run_single'
                    ? `🚀 Đã khởi chạy kịch bản [${sPid || path.basename(sDir || '')}] (${_nodeSelectedNiche})! Đang mở trình duyệt ChatGPT...`
                    : `🚀 Đã kích hoạt chạy Hàng đợi kịch bản (${_nodeSelectedNiche})! Đang kết nối trình duyệt ChatGPT...`
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
  if (_preloadSpawnPromise && !forceRestart) {
    return _preloadSpawnPromise;
  }
  _preloadSpawnPromise = (async () => {
    try {
      const appDir = path.resolve(__dirname, '..', '..');
      const exeDir = path.dirname(process.execPath);
      ensureCustomerFilesSynced(appDir, exeDir);

      if (!forceRestart) {
        for (const p of CANDIDATE_STUDIO_PORTS) {
          if (await checkIsRealPythonServer(p, 550)) {
            _activeScriptStudioPort = p;
            _realPythonOnline = true;
            syncIframeToRealPythonUrl(p);
            return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, engine: 'python_real' };
          }
        }
      }

      const serverScript = resolveBestServerScript(appDir, exeDir);
      if (serverScript) {
        const rootDir = path.dirname(serverScript);
        const pyExe = await ensurePortablePythonReady(appDir, exeDir);

        if (_nodeFallbackServer) {
          try { _nodeFallbackServer.close(); } catch {}
          _nodeFallbackServer = null;
        }
        // Tắt mọi Node fallback server cũ (kể cả từ phiên trước khi reload) đang chiếm cổng 8098/8099
        for (const p of [8098, 8099]) {
          await requestShutdownNodeFallbackPort(p, 350);
        }

        // Chỉ dọn tiến trình mafia_dashboard_server.py bị treo nếu chưa có server thật nào phản hồi
        try {
          execFileSync('powershell.exe', [
            '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
            "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*mafia_dashboard_server.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
          ], { windowsHide: true, timeout: 4000 });
        } catch {}

        let targetPort = SCRIPT_STUDIO_PORT;
        for (const p of CANDIDATE_STUDIO_PORTS) {
          const occupied = await checkPortQuick(p, 350);
          if (!occupied || await checkIsRealPythonServer(p, 450)) {
            targetPort = p;
            break;
          }
        }

        let srvLogFd = null;
        try {
          srvLogFd = fs.openSync(path.join(rootDir, 'LIVE_STUDIO_LOG.txt'), 'a');
        } catch {}
        try {
          const child = spawn(pyExe, ['-u', serverScript, '--no-browser', '--port', String(targetPort)], {
            cwd: rootDir,
            windowsHide: true,
            stdio: srvLogFd !== null ? ['ignore', srvLogFd, srvLogFd] : 'ignore',
            detached: false,
            env: {
              ...process.env,
              PYTHONUTF8: '1',
              PYTHONIOENCODING: 'utf-8'
            }
          });
          child.on('error', () => {
            if (srvLogFd !== null) { try { fs.closeSync(srvLogFd); } catch {} srvLogFd = null; }
          });
          child.on('close', () => {
            if (srvLogFd !== null) { try { fs.closeSync(srvLogFd); } catch {} srvLogFd = null; }
          });
        } catch {
          if (srvLogFd !== null) { try { fs.closeSync(srvLogFd); } catch {} }
        }

        for (let i = 0; i < 16; i += 1) {
          await new Promise((r) => setTimeout(r, 450));
          for (const checkP of [targetPort, ...CANDIDATE_STUDIO_PORTS]) {
            if (await checkIsRealPythonServer(checkP, 600)) {
              _activeScriptStudioPort = checkP;
              _realPythonOnline = true;
              syncIframeToRealPythonUrl(checkP);
              return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, engine: 'python_real' };
            }
          }
        }
      }

      let fallbackPort = SCRIPT_STUDIO_PORT;
      for (const p of CANDIDATE_STUDIO_PORTS) {
        if (!(await checkPortQuick(p, 400))) {
          fallbackPort = p;
          break;
        }
      }
      await startNodeFallbackServer(appDir, exeDir, fallbackPort);
      for (const p of [fallbackPort, ...CANDIDATE_STUDIO_PORTS]) {
        if (await checkPortQuick(p, 500)) {
          _activeScriptStudioPort = p;
          return { online: true, url: `http://127.0.0.1:${_activeScriptStudioPort}`, fallbackNode: true };
        }
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

function getStudioBaseDirs() {
  const appDir = path.resolve(__dirname, '..', '..');
  const exeDir = path.dirname(process.execPath);
  const primaryRoot = fs.existsSync(path.join(exeDir, 'mafia_dashboard_server.py')) ? exeDir : appDir;
  return { appDir, exeDir, primaryRoot };
}

function readCustomLinkedFolders() {
  try {
    const { appDir, exeDir } = getStudioBaseDirs();
    for (const dir of [exeDir, appDir]) {
      const f = path.join(dir, 'CUSTOM_LINKED_FOLDERS.json');
      if (fs.existsSync(f)) {
        return JSON.parse(fs.readFileSync(f, 'utf8') || '{}') || {};
      }
    }
  } catch {}
  return {};
}

function writeCustomLinkedFolders(partial = {}) {
  const current = readCustomLinkedFolders();
  const merged = {
    ...current,
    ...partial,
    tongHopByKey: {
      ...(current.tongHopByKey || {}),
      ...(partial.tongHopByKey || {})
    }
  };
  try {
    const { appDir, exeDir } = getStudioBaseDirs();
    for (const dir of [exeDir, appDir]) {
      if (dir && fs.existsSync(dir)) {
        try {
          fs.writeFileSync(path.join(dir, 'CUSTOM_LINKED_FOLDERS.json'), JSON.stringify(merged, null, 2), 'utf8');
        } catch {}
      }
    }
  } catch {}
  return merged;
}

function enrichBridgeStateWithLinkedFolders(st) {
  if (!st || typeof st !== 'object') return st;
  try {
    if (_realPythonOnline || _nodeFallbackServer || st.scriptServerOnline) {
      st.scriptServerOnline = true;
      st.scriptServerUrl = `http://127.0.0.1:${_activeScriptStudioPort}`;
    }
    const { primaryRoot } = getStudioBaseDirs();
    const linked = readCustomLinkedFolders();
    const cfg = st.lockedVideoConfig || {};
    const s = st.lockedConfigSummary || {};
    const activeKey = cfg.channelKey || st.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
    const studioRoot = linked.scriptStudioRoot || st.settings?.scriptStudioRoot || primaryRoot;

    // 1. Kho Stock (mediaFolder)
    let mediaFolder = String(cfg.mediaFolder || linked.mediaFolder || s.mediaFolder || '').trim();
    if (mediaFolder && !mediaFolder.startsWith('(') && /^E:\\OBS-Recordings/i.test(mediaFolder) && !fs.existsSync(mediaFolder)) {
      mediaFolder = linked.mediaFolder || '';
    }
    s.mediaFolder = mediaFolder || '(Chưa chọn — Bấm [📁 Chọn Folder] để chọn Kho Stock Video)';

    // 2. Folder Output MP4
    let outputFolder = String(cfg.outputFolder || linked.outputFolder || s.outputFolder || '').trim();
    if (!outputFolder || (/^D:\\MAFIA_STUDIO_WEB/i.test(outputFolder) && !fs.existsSync('D:\\MAFIA_STUDIO_WEB'))) {
      outputFolder = linked.outputFolder || path.join(studioRoot, 'TONG HOP', 'Videos');
    }
    s.outputFolder = outputFolder;

    // 3. Folder Ảnh/Green theo Voice
    const projImgFolder = String(
      cfg.projectImageFolder !== undefined ? cfg.projectImageFolder : (linked.projectImageFolder || '')
    ).trim();
    const projImgMode = String(cfg.projectImageMode || linked.projectImageMode || s.projectImageMode || 'IMAGE').toUpperCase() === 'GREEN'
      ? 'GREEN'
      : 'IMAGE';
    s.projectImageFolder = projImgFolder || '(Để trống — Ẩn lớp Ảnh theo voice, dùng 100% nền Stock)';
    s.projectImageMode = projImgMode;
    s.projectImageModeLabel = projImgMode === 'GREEN'
      ? '🟢 Tự động tách nền Phông Xanh (Chroma Key)'
      : '🖼️ Ảnh thường / Ảnh PNG đã tách nền trong suốt sẵn';

    // 4. Folder Video Intro theo Voice
    const introFolder = String(
      cfg.jobIntroFolder !== undefined ? cfg.jobIntroFolder : (linked.jobIntroFolder || '')
    ).trim();
    s.jobIntroFolder = introFolder || '(Để trống — Không chèn Intro riêng)';
    s.jobIntroAudioMode = cfg.jobIntroAudioMode || linked.jobIntroAudioMode || s.jobIntroAudioMode || 'MUTE';

    // 5. Folder Kho Green & Disclaimer
    if (linked.khoGreenFolder || cfg.khoGreenFolder) {
      s.khoGreenFolder = String(cfg.khoGreenFolder || linked.khoGreenFolder).trim();
    } else if (!s.khoGreenFolder) {
      s.khoGreenFolder = path.join(studioRoot, 'Kho_Green');
    }

    if (linked.disclaimerPath !== undefined || cfg.disclaimerPath !== undefined) {
      const dPath = String(cfg.disclaimerPath !== undefined ? cfg.disclaimerPath : (linked.disclaimerPath || '')).trim();
      const dEnabled = cfg.disclaimerEnabled !== undefined
        ? Boolean(cfg.disclaimerEnabled && dPath)
        : Boolean(linked.disclaimerEnabled && dPath);
      s.disclaimerEnabled = dEnabled;
      s.disclaimerPath = dPath;
      s.disclaimerLabel = dEnabled
        ? `🟢 BẬT (${path.basename(dPath)})`
        : '⚪ TẮT (Không chèn đầu video)';
    }

    // 6. Các Folder TONG HOP liên kết
    const tongHopByKey = linked.tongHopByKey || {};
    const defaultActiveKeyTongHop = activeKey === 'homeless'
      ? path.join(studioRoot, 'PROJECTS_HOMELESS', 'TONG HOP')
      : activeKey === 'mafia'
        ? path.join(studioRoot, 'PROJECTS', 'TONG HOP')
        : activeKey === 'mexico'
          ? path.join(studioRoot, 'PROJECTS_MEXICO', 'TONG HOP')
          : path.join(studioRoot, `PROJECTS_${activeKey}`, 'TONG HOP');

    s.activeKey = activeKey;
    s.activeKeyTongHopFolder = tongHopByKey[activeKey] || s.activeKeyTongHopFolder || defaultActiveKeyTongHop;
    s.tongHopHomelessFolder = linked.tongHopHomelessFolder || tongHopByKey.homeless || path.join(studioRoot, 'PROJECTS_HOMELESS', 'TONG HOP');
    s.tongHopMafiaFolder = linked.tongHopMafiaFolder || tongHopByKey.mafia || path.join(studioRoot, 'PROJECTS', 'TONG HOP');
    s.tongHopMexicoFolder = linked.tongHopMexicoFolder || tongHopByKey.mexico || path.join(studioRoot, 'PROJECTS_MEXICO', 'TONG HOP');
    s.scriptStudioRoot = studioRoot;
    st.lockedConfigSummary = s;
    st.linkedFolders = linked;
  } catch {}
  return st;
}

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

  linkedFolders: {
    get: () => readCustomLinkedFolders(),
    save: (partial) => writeCustomLinkedFolders(partial)
  },

  scriptBridge: {
    status: async () => {
      const st = (await ipcRenderer.invoke('scriptBridge:status').catch(() => ({}))) || {};
      if (!_realPythonOnline) {
        const res = await ensurePort8098FromPreload().catch(() => ({ online: false }));
        if (res && res.online) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = res.url || `http://127.0.0.1:${_activeScriptStudioPort}`;
          return enrichBridgeStateWithLinkedFolders(st);
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
      return enrichBridgeStateWithLinkedFolders(st);
    },
    ensureScriptServer: async () => {
      return ensurePort8098FromPreload();
    },
    restartScriptServer: async () => {
      return ensurePort8098FromPreload({ forceRestart: true });
    },
    saveSettings: async (partial) => {
      if (partial && partial.linkedFolders) {
        writeCustomLinkedFolders(partial.linkedFolders);
      }
      const st = await ipcRenderer.invoke('scriptBridge:saveSettings', partial);
      return enrichBridgeStateWithLinkedFolders(st);
    },
    lockConfig: async (config) => {
      const st = await ipcRenderer.invoke('scriptBridge:lockConfig', config);
      return enrichBridgeStateWithLinkedFolders(st);
    },
    enqueueScript: (payload) => ipcRenderer.invoke('scriptBridge:enqueueScript', payload),
    enqueueFolder: (folderPath) => ipcRenderer.invoke('scriptBridge:enqueueFolder', folderPath),
    clearQueue: () => ipcRenderer.invoke('scriptBridge:clearQueue'),
    onState: (fn) => sub('scriptBridge:state', async (st) => {
      if (st) {
        if (!_realPythonOnline) {
          for (const p of CANDIDATE_STUDIO_PORTS) {
            if (await checkIsRealPythonServer(p, 400)) {
              _activeScriptStudioPort = p;
              _realPythonOnline = true;
              syncIframeToRealPythonUrl(p);
              break;
            }
          }
        }
        const up = await checkPortQuick(_activeScriptStudioPort, 600);
        if (up) {
          st.scriptServerOnline = true;
          st.scriptServerUrl = `http://127.0.0.1:${_activeScriptStudioPort}`;
        }
      }
      fn(enrichBridgeStateWithLinkedFolders(st));
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
