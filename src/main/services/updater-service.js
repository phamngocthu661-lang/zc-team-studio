'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { execFileSync } = require('node:child_process');

const DEFAULT_GITHUB_REPO = 'phamngocthu661-lang/zc-team-studio';
const DEFAULT_GITHUB_BRANCH = 'main';
const DEFAULT_VERSION = 'V1.0.0';
const DEFAULT_BUILD_NUMBER = 100;

// Các thư mục & file dữ liệu riêng của máy khách TUYỆT ĐỐI KHÔNG BAO GIỜ GHI ĐÈ khi cập nhật
const PROTECTED_CUSTOMER_NAMES = new Set([
  'data',
  '.vbs-user-data',
  'license.key',
  'video-batch-studio.db',
  'ADMIN_MASTER_SECRET.json',
  'ADMIN_LICENSE_DB.json',
  'BROWSER_PROFILE',
  'BROWSER_PROFILE_2',
  'BROWSER_PROFILE_3',
  'Kho_Green',
  'node_modules',
  'Ban-Giao-Khach-Hang-EXE',
  'resources',
  'tools',
  'PROJECTS',
  'PROJECTS_HOMELESS',
  'PROJECTS_MEXICO',
  'TONG HOP',
  'CHANNEL_MEMORY.json',
  'CHANNEL_MEMORY_HOMELESS.json',
  'CHANNEL_MEMORY_MAFIA.json',
  'CHANNEL_MEMORY_MEXICO.json',
  'QUEUE_BACKLOG.json',
  'QUEUE_BACKLOG_HOMELESS.json',
  'QUEUE_BACKLOG_MEXICO.json',
  'push_update_github.py',
  'DAY_CAP_NHAT_LEN_GITHUB.bat',
  '.git'
]);

class UpdaterService {
  constructor({ getMainWindow, scriptBridgeService } = {}) {
    this.getMainWindow = typeof getMainWindow === 'function' ? getMainWindow : () => getMainWindow;
    this.scriptBridgeService = scriptBridgeService || null;
    this.appDir = path.resolve(__dirname, '..', '..', '..');
    this.studioRoot = this._resolveStudioRoot();
    this.exeDir = this._resolveExeDir();
    this._lastCheckResult = null;
    this._lastCheckAt = 0;
    this._isUpdating = false;
  }

  _resolveStudioRoot() {
    const candidates = [
      this.scriptBridgeService?.settings?.scriptStudioRoot,
      'D:\\ZC_TEAM\\TOOL_ZC_TEAM',
      path.dirname(process.execPath),
      path.resolve(path.dirname(process.execPath), '..'),
      this.appDir
    ].filter(Boolean);
    for (const c of candidates) {
      try {
        if (fs.existsSync(path.join(c, 'mafia_dashboard_server.py')) || fs.existsSync(path.join(c, 'version.json'))) {
          return path.resolve(c);
        }
      } catch {}
    }
    return path.dirname(process.execPath) || this.appDir;
  }

  _resolveExeDir() {
    try {
      const { app } = require('electron');
      if (app && app.isPackaged) {
        return path.dirname(app.getPath('exe'));
      }
    } catch {}
    const packagedCandidate = path.join(this.studioRoot, 'Ban-Giao-Khach-Hang-EXE', 'VideoBatchStudio');
    if (fs.existsSync(packagedCandidate)) return packagedCandidate;
    return this.studioRoot;
  }

  _resolvePythonExe() {
    const exeDir = path.dirname(process.execPath);
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const candidates = [
      path.join(this.studioRoot || '', 'python_runtime', 'python.exe'),
      path.join(exeDir, 'python_runtime', 'python.exe'),
      path.join(this.appDir || '', 'python_runtime', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      'C:\\Users\\hungp\\AppData\\Local\\Programs\\Python\\Python314\\python.exe',
      'C:\\Python314\\python.exe',
      'python'
    ];
    for (const c of candidates) {
      if (c === 'python' || fs.existsSync(c)) return c;
    }
    return 'python';
  }

  _sendToRenderer(channel, payload) {
    try {
      const win = this.getMainWindow?.();
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    } catch {}
  }

  parseVersionTuple(verStr) {
    const nums = String(verStr || DEFAULT_VERSION).match(/\d+/g)?.map(Number) || [1, 0, 0];
    while (nums.length < 3) nums.push(0);
    return [nums[0], nums[1], nums[2]];
  }

  compareVersions(verA, buildA, verB, buildB) {
    const [a1, a2, a3] = this.parseVersionTuple(verA);
    const [b1, b2, b3] = this.parseVersionTuple(verB);
    if (a1 !== b1) return a1 > b1 ? 1 : -1;
    if (a2 !== b2) return a2 > b2 ? 1 : -1;
    if (a3 !== b3) return a3 > b3 ? 1 : -1;
    const ba = Number(buildA || 0);
    const bb = Number(buildB || 0);
    if (ba !== bb) return ba > bb ? 1 : -1;
    return 0;
  }

  getLocalVersionInfo() {
    this.studioRoot = this._resolveStudioRoot();
    const candidates = [
      path.join(this.studioRoot, 'version.json'),
      path.join(this.appDir, 'version.json'),
      path.join(this.exeDir, 'version.json'),
      path.join(this.exeDir, 'resources', 'app', 'version.json')
    ];
    for (const vf of candidates) {
      try {
        if (fs.existsSync(vf)) {
          const data = JSON.parse(fs.readFileSync(vf, 'utf8'));
          if (data && data.version) {
            return {
              version: String(data.version || DEFAULT_VERSION).trim(),
              build_number: Number(data.build_number || DEFAULT_BUILD_NUMBER),
              released_at: String(data.released_at || '').trim(),
              repo: String(data.repo || DEFAULT_GITHUB_REPO).trim(),
              branch: String(data.branch || DEFAULT_GITHUB_BRANCH).trim(),
              changelog: String(data.changelog || '').trim()
            };
          }
        }
      } catch {}
    }
    return {
      version: DEFAULT_VERSION,
      build_number: DEFAULT_BUILD_NUMBER,
      released_at: '2026-11-03 17:35:00',
      repo: DEFAULT_GITHUB_REPO,
      branch: DEFAULT_GITHUB_BRANCH,
      changelog: 'Phiên bản chính thức V1.0.0.'
    };
  }

  _httpsGetBuffer(url, headers = {}, timeoutMs = 15000, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'ZCTeamStudio-OTA-Updater/1.0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...headers
        },
        timeout: timeoutMs
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (maxRedirects <= 0) {
            return reject(new Error('Quá nhiều lần chuyển hướng HTTP khi tải từ GitHub.'));
          }
          const nextUrl = new URL(res.headers.location, url).toString();
          return this._httpsGetBuffer(nextUrl, headers, timeoutMs, maxRedirects - 1).then(resolve, reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout khi kết nối tới GitHub.'));
      });
      req.on('error', reject);
    });
  }

  async _fetchRemoteVersionJson(repo, branch = 'main') {
    const ts = Date.now();
    const urls = [
      {
        url: `https://api.github.com/repos/${repo}/contents/version.json?ref=${encodeURIComponent(branch)}&_t=${ts}`,
        headers: { Accept: 'application/vnd.github.v3.raw' }
      },
      {
        url: `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/version.json?t=${ts}`,
        headers: {}
      }
    ];
    let lastErr = null;
    for (const item of urls) {
      try {
        const buf = await this._httpsGetBuffer(item.url, item.headers, 8000);
        const parsed = JSON.parse(buf.toString('utf8'));
        if (parsed && parsed.version) {
          return parsed;
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Không thể đọc version.json từ GitHub.');
  }

  async checkForUpdates({ force = false } = {}) {
    const localInfo = this.getLocalVersionInfo();
    if (!force && this._lastCheckResult && (Date.now() - this._lastCheckAt < 25000)) {
      return {
        ...this._lastCheckResult,
        currentVersion: localInfo.version,
        currentBuild: localInfo.build_number,
        hasUpdate: this.compareVersions(
          this._lastCheckResult.latestVersion,
          this._lastCheckResult.latestBuild,
          localInfo.version,
          localInfo.build_number
        ) > 0
      };
    }

    const repo = localInfo.repo || DEFAULT_GITHUB_REPO;
    const branch = localInfo.branch || DEFAULT_GITHUB_BRANCH;

    try {
      const remoteInfo = await this._fetchRemoteVersionJson(repo, branch);
      const latestVersion = String(remoteInfo.version || DEFAULT_VERSION).trim();
      const latestBuild = Number(remoteInfo.build_number || DEFAULT_BUILD_NUMBER);
      const hasUpdate = this.compareVersions(latestVersion, latestBuild, localInfo.version, localInfo.build_number) > 0;

      const rawChangelog = remoteInfo.changelog || localInfo.changelog || '';
      const changelogList = Array.isArray(rawChangelog)
        ? rawChangelog
        : String(rawChangelog).split(/\r?\n/).map((s) => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
      const releaseDateStr = String(remoteInfo.released_at || remoteInfo.release_date || localInfo.released_at || '').trim();

      const result = {
        ok: true,
        checked: true,
        hasUpdate,
        currentVersion: localInfo.version,
        currentBuild: localInfo.build_number,
        latestVersion,
        latestBuild,
        remoteVersion: latestVersion,
        remoteBuild: latestBuild,
        releasedAt: releaseDateStr,
        releaseDate: releaseDateStr,
        changelog: changelogList,
        repo,
        branch,
        checkedAt: new Date().toISOString()
      };
      this._lastCheckResult = result;
      this._lastCheckAt = Date.now();
      this._sendToRenderer('updater:status', result);
      return result;
    } catch (err) {
      return {
        ok: false,
        checked: false,
        hasUpdate: false,
        currentVersion: localInfo.version,
        currentBuild: localInfo.build_number,
        latestVersion: localInfo.version,
        latestBuild: localInfo.build_number,
        releasedAt: localInfo.released_at,
        changelog: localInfo.changelog,
        repo,
        branch,
        error: err.message
      };
    }
  }

  _isProtectedItem(name) {
    if (!name) return true;
    if (PROTECTED_CUSTOMER_NAMES.has(name)) return true;
    if (name.startsWith('PROJECTS_') || name.startsWith('CHANNEL_MEMORY_') || name.startsWith('QUEUE_BACKLOG_')) {
      return true;
    }
    return false;
  }

  async applyUpdate() {
    if (this._isUpdating) {
      return { ok: false, error: 'Hệ thống đang trong quá trình tải và cài đặt bản cập nhật.' };
    }
    this._isUpdating = true;

    const emitProgress = (percent, message) => {
      this._sendToRenderer('updater:progress', { percent, message });
    };

    const localInfo = this.getLocalVersionInfo();
    const oldVersion = localInfo.version;
    const repo = localInfo.repo || DEFAULT_GITHUB_REPO;
    const branch = localInfo.branch || DEFAULT_GITHUB_BRANCH;
    const tmpDir = path.join(os.tmpdir(), `zc_team_ota_${Date.now()}`);

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      emitProgress(12, `Đang kết nối GitHub (${repo}) để tải gói cập nhật mới nhất...`);

      const zipUrls = [
        `https://codeload.github.com/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`,
        `https://api.github.com/repos/${repo}/zipball/${encodeURIComponent(branch)}`
      ];

      let zipBuffer = null;
      let downloadErr = null;
      for (const zUrl of zipUrls) {
        try {
          zipBuffer = await this._httpsGetBuffer(zUrl, {}, 120000);
          if (zipBuffer && zipBuffer.length > 1000) break;
        } catch (err) {
          downloadErr = err;
        }
      }

      if (!zipBuffer || zipBuffer.length <= 1000) {
        throw new Error(`Không thể tải gói cập nhật từ GitHub (${downloadErr?.message || 'Lỗi mạng'}).`);
      }

      const zipPath = path.join(tmpDir, 'update_bundle.zip');
      const extractDir = path.join(tmpDir, 'extracted');
      fs.writeFileSync(zipPath, zipBuffer);
      fs.mkdirSync(extractDir, { recursive: true });

      emitProgress(45, `Đã tải xong (${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB). Đang giải nén gói cập nhật...`);

      const pyExe = this._resolvePythonExe();
      try {
        execFileSync(pyExe, [
          '-c',
          'import sys, zipfile; zf = zipfile.ZipFile(sys.argv[1], "r"); zf.extractall(sys.argv[2]); zf.close()',
          zipPath,
          extractDir
        ], { timeout: 60000, windowsHide: true });
      } catch {
        execFileSync('powershell.exe', [
          '-NoProfile',
          '-Command',
          `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`
        ], { timeout: 60000, windowsHide: true });
      }

      const subDirs = fs.readdirSync(extractDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      const srcRoot = subDirs.length === 1 ? path.join(extractDir, subDirs[0].name) : extractDir;

      if (!fs.existsSync(path.join(srcRoot, 'src')) || !fs.existsSync(path.join(srcRoot, 'version.json'))) {
        throw new Error('Gói cập nhật tải về không hợp lệ (Thiếu thư mục src/ hoặc version.json).');
      }

      emitProgress(70, 'Đang nâng cấp giao diện Electron, Engine 9 Bàn Agent, 12 Key Skills & Kho_Voice...');

      let updatedFilesCount = 0;
      const copyRecursiveCount = (src, dst) => {
        if (!fs.existsSync(src)) return;
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
          fs.mkdirSync(dst, { recursive: true });
          for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
            if (entry.name === '__pycache__' || entry.name.endsWith('.pyc') || entry.name === '.git') continue;
            copyRecursiveCount(path.join(src, entry.name), path.join(dst, entry.name));
          }
        } else {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
          updatedFilesCount += 1;
        }
      };

      // 1. Cập nhật các thư mục code & tài nguyên chuẩn vào studioRoot
      const codeFolders = [
        'src',
        'assets',
        'engine',
        'python_runtime',
        'skills_12_keys',
        'skills_mexico',
        'skills_homeless',
        'DOCSMOI',
        '.agents',
        'Kho_Voice',
        'scripts',
        'tests',
        'docs'
      ];
      for (const folder of codeFolders) {
        const sDir = path.join(srcRoot, folder);
        if (fs.existsSync(sDir)) {
          copyRecursiveCount(sDir, path.join(this.studioRoot, folder));
        }
      }

      // 2. Cập nhật các file lẻ ở thư mục gốc (trừ các file dữ liệu/key bảo vệ của khách)
      for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (this._isProtectedItem(entry.name)) continue;
        try {
          fs.copyFileSync(path.join(srcRoot, entry.name), path.join(this.studioRoot, entry.name));
          updatedFilesCount += 1;
        } catch {}
      }

      // 3. Đồng bộ sang bản chạy EXE (Ban-Giao-Khach-Hang-EXE/VideoBatchStudio/resources/app & Kho_Voice)
      const packagedResAppDirs = [
        this.appDir,
        path.join(this.exeDir, 'resources', 'app'),
        path.join(this.studioRoot, 'Ban-Giao-Khach-Hang-EXE', 'VideoBatchStudio', 'resources', 'app')
      ];
      const visitedAppDirs = new Set();
      for (const targetAppDir of packagedResAppDirs) {
        const resolved = path.resolve(targetAppDir);
        if (visitedAppDirs.has(resolved) || !fs.existsSync(resolved)) continue;
        visitedAppDirs.add(resolved);
        for (const sub of ['src', 'assets', 'engine', 'skills_12_keys', 'skills_mexico', 'skills_homeless', 'DOCSMOI', '.agents']) {
          if (fs.existsSync(path.join(srcRoot, sub))) {
            copyRecursiveCount(path.join(srcRoot, sub), path.join(resolved, sub));
          }
        }
        for (const f of ['package.json', 'version.json', 'mafia_dashboard_server.py', 'organize_12_keys_skills.py']) {
          if (fs.existsSync(path.join(srcRoot, f))) {
            try { fs.copyFileSync(path.join(srcRoot, f), path.join(resolved, f)); } catch {}
          }
        }
      }

      // Đồng bộ Kho_Voice, python_runtime, engine, skills & version.json vào exeDir (cho máy khách chạy trực tiếp từ thư mục giải nén ZIP)
      if (this.exeDir && path.resolve(this.exeDir) !== path.resolve(this.studioRoot) && fs.existsSync(this.exeDir)) {
        for (const sub of ['Kho_Voice', 'python_runtime', 'engine', 'skills_12_keys', 'skills_mexico', 'skills_homeless', 'DOCSMOI', '.agents']) {
          if (fs.existsSync(path.join(srcRoot, sub))) {
            copyRecursiveCount(path.join(srcRoot, sub), path.join(this.exeDir, sub));
          }
        }
        for (const f of ['version.json', 'mafia_dashboard_server.py', 'organize_12_keys_skills.py']) {
          if (fs.existsSync(path.join(srcRoot, f))) {
            try { fs.copyFileSync(path.join(srcRoot, f), path.join(this.exeDir, f)); } catch {}
          }
        }
      }

      // 4. Nếu có script đồng bộ 12 Key Skills vào ~/.gemini/config/skills thì chạy ngầm
      const orgScript = path.join(this.studioRoot, 'organize_12_keys_skills.py');
      if (fs.existsSync(orgScript)) {
        try {
          execFileSync(pyExe, [orgScript], { cwd: this.studioRoot, timeout: 25000, windowsHide: true });
        } catch {}
      }

      emitProgress(92, 'Đang khởi động lại Engine Kịch Bản (Port 8098) và làm mới giao diện...');
      if (this.scriptBridgeService) {
        try {
          const freshPath = require.resolve('./script-video-bridge-service');
          delete require.cache[freshPath];
          const { ScriptVideoBridgeService: FreshBridgeClass } = require('./script-video-bridge-service');
          if (FreshBridgeClass && FreshBridgeClass.prototype) {
            for (const fnName of ['_resolvePythonExecutable', '_detectScriptStudioRoot', 'ensureScriptServerRunning', 'restartScriptServer']) {
              if (typeof FreshBridgeClass.prototype[fnName] === 'function') {
                this.scriptBridgeService[fnName] = FreshBridgeClass.prototype[fnName].bind(this.scriptBridgeService);
              }
            }
          }
          if (this.scriptBridgeService.settings) {
            this.scriptBridgeService.settings.scriptStudioRoot = this.scriptBridgeService._detectScriptStudioRoot();
          }
        } catch {}
        if (typeof this.scriptBridgeService.restartScriptServer === 'function') {
          try {
            await this.scriptBridgeService.restartScriptServer();
          } catch {}
        }
      }

      this._lastCheckResult = null;
      this._lastCheckAt = 0;
      const newInfo = this.getLocalVersionInfo();

      emitProgress(100, `🎉 Đã cập nhật thành công từ ${oldVersion} lên ${newInfo.version} (Build #${newInfo.build_number})!`);

      return {
        ok: true,
        status: 'success',
        oldVersion,
        newVersion: newInfo.version,
        buildNumber: newInfo.build_number,
        changelog: newInfo.changelog,
        updatedFilesCount,
        message: `🎉 Đã cập nhật thành công lên phiên bản ${newInfo.version} (Build #${newInfo.build_number})!`
      };
    } catch (err) {
      return {
        ok: false,
        status: 'error',
        error: err.message || String(err),
        message: err.message || String(err)
      };
    } finally {
      this._isUpdating = false;
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
}

module.exports = {
  UpdaterService,
  DEFAULT_GITHUB_REPO,
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_VERSION
};
