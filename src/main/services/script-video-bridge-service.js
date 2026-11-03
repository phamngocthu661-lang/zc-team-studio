'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const os = require('node:os');
const BRIDGE_PORT = 3999;
const SCRIPT_STUDIO_PORT = 8098;
const DEFAULT_SCRIPT_STUDIO_DIRS = [
  path.dirname(process.execPath),
  path.resolve(path.dirname(process.execPath), 'resources', 'app'),
  path.resolve(__dirname, '..', '..', '..'),
  path.resolve(__dirname, '..', '..', '..', '..'),
  path.resolve(__dirname, '..', '..', '..', '..', '..'),
  'D:\\ZC_TEAM\\TOOL_ZC_TEAM',
  path.resolve(path.dirname(process.execPath), '..'),
  'D:\\ZC_TEAM'
];

const DEFAULT_VOICE_PROFILE_BY_KEY = {
  '01_Nhom_Ong_Gia_Tra_Dua_My_US': '01_us_ong_gia_gus_mahoney',
  '02_Nhom_Phu_Nu_Bao_Thu_My_US': '02_us_phu_nu_the_iron_rose',
  '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico': '03_mx_ba_gia_dona_elena',
  '04_Nhom_Ong_Gia_Trung_Tri_Mexico': '04_mx_ong_gia_padre_implacable',
  '05_Nhom_Manga_Doc_Than_Japan': '05_jp_manga_orewadokushin',
  '06_Huu_Tri_Viec_Lam_Japan': '06_jp_huu_tri_izumi',
  '07_Dong_Que_Co_Dien_Mexico': '07_mx_dong_que_viejo_campo',
  '08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico': '08_mx_ngoai_tinh_secretos',
  '09_Tieu_Su_Goc_Khuat_Sao_Mexico': '09_mx_tieu_su_tras_el_aplauso',
  '10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US': '10_us_cha_da_mau_black_dad',
  '11_Chuyen_Tinh_Dan_Ong_My_US': '11_us_chuyen_tinh_nam_romance',
  '12_Kinh_Di_Dem_Khuya_My_US': '12_us_kinh_di_midnight_visitor',
  'mexico': '03_mx_ba_gia_dona_elena',
  'homeless': 'homeless',
  'mafia': 'daden'
};

class ScriptVideoBridgeService {
  constructor({ database, batchService, licenseService, getMainWindow, paths }) {
    this.database = database;
    this.batchService = batchService;
    this.licenseService = licenseService || null;
    this.getMainWindow = typeof getMainWindow === 'function' ? getMainWindow : () => getMainWindow;
    this.paths = paths;

    this.httpServer = null;
    this.scriptServerProcess = null;
    this.scriptServerSpawnedByUs = false;
    this.scriptServerOnline = false;
    this.isProcessingQueue = false;
    this.currentAbortController = null;

    // Cài đặt cầu nối Bàn #6 -> Bàn #7
    const savedSettings = this.database?.getSetting?.('script_video_bridge_settings', null) || {};
    const savedRoot = savedSettings.scriptStudioRoot;
    const validSavedRoot = savedRoot && fs.existsSync(path.join(savedRoot, 'mafia_dashboard_server.py')) ? savedRoot : null;
    this.settings = {
      enabled: savedSettings.enabled !== false,
      // 'STREAMING': Tạo kịch bản xong chuyển qua tạo video luôn (Cuốn chiếu từng bài)
      // 'BATCH_AFTER_ALL': Đợi viết xong cả lô kịch bản rồi mới tạo video 1 lượt
      triggerMode: savedSettings.triggerMode || 'STREAMING',
      // 'RENDER_VOICE_THEN_VIDEO': Tạo Voice (.wav) + SRT + Render Video (.mp4)
      // 'ONLY_RENDER_VOICE': Chỉ Tạo Voice (.wav)
      // 'DISABLED': Chỉ viết kịch bản (.txt)
      actionMode: savedSettings.actionMode || 'RENDER_VOICE_THEN_VIDEO',
      copyMp4ToTongHop: savedSettings.copyMp4ToTongHop === true,
      scriptStudioRoot: validSavedRoot || this._detectScriptStudioRoot()
    };

    // Cấu hình Tạo Video đã được người dùng cấu hình trước khi bấm chạy (và bảng lưu riêng cố định theo từng Key)
    this.lockedVideoConfig = this.database?.getSetting?.('script_video_bridge_locked_config', null) || null;
    this.lockedAt = this.database?.getSetting?.('script_video_bridge_locked_at', null) || null;
    this.channelConfigs = this.database?.getSetting?.('script_video_bridge_channel_configs', {}) || {};
    this.activeChannelKey = this.database?.getSetting?.('script_video_bridge_active_channel', '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

    // Hàng đợi Bàn #7 (Tạo Voice & Render Video GPU)
    this.queue = [];
    this.activeJob = null;
  }

  _resolvePythonExecutable(preferredRoot = null) {
    const exeDir = path.dirname(process.execPath);
    const appDir = path.resolve(__dirname, '..', '..', '..');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const candidates = [
      preferredRoot ? path.join(preferredRoot, 'python_runtime', 'python.exe') : null,
      preferredRoot ? path.join(preferredRoot, 'engine', 'python_runtime', 'python.exe') : null,
      path.join(exeDir, 'python_runtime', 'python.exe'),
      path.join(exeDir, 'engine', 'python_runtime', 'python.exe'),
      path.join(exeDir, 'resources', 'app', 'python_runtime', 'python.exe'),
      path.join(exeDir, 'resources', 'app', 'engine', 'python_runtime', 'python.exe'),
      path.join(appDir, 'python_runtime', 'python.exe'),
      path.join(appDir, 'engine', 'python_runtime', 'python.exe'),
      path.join(path.resolve(appDir, '..', '..'), 'python_runtime', 'python.exe'),
      'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\python_runtime\\python.exe',
      path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
      'C:\\Users\\hungp\\AppData\\Local\\Programs\\Python\\Python314\\python.exe',
      'C:\\Python314\\python.exe',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe'
    ].filter(Boolean);
    for (const exe of candidates) {
      try {
        if (!fs.existsSync(exe)) continue;
        if (exe.includes('python_runtime') && !fs.existsSync(path.join(path.dirname(exe), 'python314.zip'))) {
          continue;
        }
        return exe;
      } catch {}
    }
    return 'python';
  }

  _detectDefaultWhisperLangForKey(keyName = '') {
    const k = String(keyName || '').toLowerCase();
    if (k.includes('mexico') || k.startsWith('03_') || k.startsWith('04_') || k.startsWith('07_') || k.startsWith('08_') || k.startsWith('09_')) {
      return 'es';
    }
    if (k.includes('japan') || k.startsWith('05_') || k.startsWith('06_')) {
      return 'ja';
    }
    return 'en';
  }

  _detectDefaultVoiceProfileForKey(keyName = '') {
    const k = String(keyName || '').trim();
    return DEFAULT_VOICE_PROFILE_BY_KEY[k] || null;
  }

  _detectScriptStudioRoot() {
    for (const candidate of DEFAULT_SCRIPT_STUDIO_DIRS) {
      try {
        if (
          fs.existsSync(path.join(candidate, 'mafia_dashboard_server.py')) &&
          fs.existsSync(path.join(candidate, 'engine', 'websocket'))
        ) {
          return candidate;
        }
      } catch {}
    }
    for (const candidate of DEFAULT_SCRIPT_STUDIO_DIRS) {
      try {
        if (fs.existsSync(path.join(candidate, 'mafia_dashboard_server.py'))) {
          return candidate;
        }
      } catch {}
    }
    return DEFAULT_SCRIPT_STUDIO_DIRS[0];
  }

  _sendToRenderer(channel, payload) {
    try {
      const win = this.getMainWindow?.();
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    } catch {}
  }

  _emitBridgeState() {
    this._sendToRenderer('scriptBridge:state', this.getPublicState());
  }

  _emitLicenseChanged(status = null) {
    const latest = status || (this.licenseService ? this.licenseService.getStatus() : null);
    if (latest) {
      this._sendToRenderer('license:changed', latest);
    }
    this._emitBridgeState();
  }

  _logToBoth(message) {
    const line = `[Bàn #7 · Script➔Video] ${message}`;
    console.log(line);
    this._sendToRenderer('batch:log', line);
    this._sendToRenderer('scriptBridge:log', {
      time: new Date().toLocaleTimeString(),
      message: line
    });
  }

  async initialize() {
    await this.startBridgeHttpServer();
    // Tự động kiểm tra và bật ngầm server Python Mafia & Homeless Studio (cổng 8098)
    this.ensureScriptServerRunning().catch((err) => {
      console.warn('[ScriptVideoBridge] Không thể tự khởi chạy Script Studio:', err.message);
    });
  }

  async checkScriptServerHealth(timeoutMs = 2500) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${SCRIPT_STUDIO_PORT}/`, { timeout: timeoutMs }, (res) => {
        res.resume();
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        this.scriptServerOnline = ok;
        resolve(ok);
      });
      req.on('error', () => {
        this.scriptServerOnline = false;
        resolve(false);
      });
      req.on('timeout', () => {
        req.destroy();
        this.scriptServerOnline = false;
        resolve(false);
      });
    });
  }

  async _ensurePortablePythonReady(preferredRoot = null) {
    const existing = this._resolvePythonExecutable(preferredRoot);
    if (existing && existing !== 'python') return existing;
    try {
      const appDir = path.resolve(__dirname, '..', '..', '..');
      const targetRuntimeDir = path.join(preferredRoot || appDir, 'python_runtime');
      const tmpZip = path.join(os.tmpdir(), `zc_main_py_${Date.now()}.zip`);
      fs.mkdirSync(targetRuntimeDir, { recursive: true });
      const { execFileSync } = require('node:child_process');
      execFileSync('curl.exe', [
        '-sL', '--connect-timeout', '15', '--max-time', '90',
        'https://github.com/phamngocthu661-lang/zc-team-studio/releases/download/V1.0.0/python_runtime_win64.zip',
        '-o', tmpZip
      ], { windowsHide: true });
      if (fs.existsSync(tmpZip) && fs.statSync(tmpZip).size > 1000000) {
        execFileSync('tar.exe', ['-xf', tmpZip, '-C', targetRuntimeDir], { windowsHide: true });
        try { fs.unlinkSync(tmpZip); } catch {}
      }
    } catch {}
    return this._resolvePythonExecutable(preferredRoot);
  }

  async ensureScriptServerRunning() {
    const alreadyUp = await this.checkScriptServerHealth(1500);
    if (alreadyUp && !this._nodeFallback8098Server) {
      this._emitBridgeState();
      return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`, spawned: false };
    }
    if (this._nodeFallback8098Server) {
      try { this._nodeFallback8098Server.close(); } catch {}
      this._nodeFallback8098Server = null;
    }

    let rootDir = this.settings.scriptStudioRoot;
    if (!rootDir || !fs.existsSync(path.join(rootDir, 'mafia_dashboard_server.py'))) {
      rootDir = this._detectScriptStudioRoot();
      this.settings.scriptStudioRoot = rootDir;
      try {
        this.database?.setSetting?.('script_video_bridge_settings', this.settings);
      } catch {}
    }
    const serverScript = path.join(rootDir, 'mafia_dashboard_server.py');
    if (!fs.existsSync(serverScript)) {
      return {
        online: false,
        error: `Không tìm thấy mafia_dashboard_server.py tại ${serverScript}`
      };
    }

    try {
      const pyExe = await this._ensurePortablePythonReady(rootDir);
      this.scriptServerProcess = spawn(pyExe, [serverScript, '--no-browser'], {
        cwd: rootDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8'
        }
      });
      this.scriptServerProcess.stdout?.on('data', () => {});
      this.scriptServerProcess.stderr?.on('data', () => {});
      this.scriptServerSpawnedByUs = true;
      this.scriptServerProcess.on('exit', () => {
        this.scriptServerOnline = false;
        this.scriptServerProcess = null;
        this._emitBridgeState();
      });
    } catch (err) {
      return { online: false, error: err.message };
    }

    for (let i = 0; i < 6; i += 1) {
      await new Promise((r) => setTimeout(r, 450));
      const ok = await this.checkScriptServerHealth(1000);
      if (ok) {
        this._emitBridgeState();
        return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`, spawned: true };
      }
    }

    // Dự phòng trực tiếp bằng Node.js HTTP Server ngay trong Electron nếu máy khách chưa có Python
    const fallbackOk = await this._startNodeFallbackServer8098();
    if (fallbackOk) {
      this.scriptServerOnline = true;
      this._emitBridgeState();
      return { online: true, url: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}`, spawned: true, fallbackNode: true };
    }

    this._emitBridgeState();
    return {
      online: false,
      error: 'Đã gọi khởi chạy Python Script Studio nhưng cổng 8098 chưa phản hồi.'
    };
  }

  _startNodeFallbackServer8098() {
    return new Promise((resolve) => {
      if (this._nodeFallback8098Server) return resolve(true);
      try {
        const appDir = path.resolve(__dirname, '..', '..', '..');
        const exeDir = path.dirname(process.execPath);
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
        if (!htmlFile || !statusFile) return resolve(false);

        const htmlBuf = fs.readFileSync(htmlFile);
        const statusMap = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        let selectedNiche = this.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

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
              const rawNiche = (u.searchParams.get('niche') || selectedNiche || 'mafia').trim();
              if (statusMap[rawNiche]) selectedNiche = rawNiche;
              const baseSt = statusMap[selectedNiche] || statusMap.mafia || Object.values(statusMap)[0] || {};
              const payload = Buffer.from(JSON.stringify({
                ...baseSt,
                selected_niche: selectedNiche,
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
                if (body.niche && statusMap[body.niche]) selectedNiche = body.niche;
                const out = Buffer.from(JSON.stringify({
                  ok: true,
                  selected_niche: selectedNiche,
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
        srv.on('error', () => resolve(false));
        srv.listen(SCRIPT_STUDIO_PORT, '127.0.0.1', () => {
          this._nodeFallback8098Server = srv;
          resolve(true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  async restartScriptServer() {
    if (this.scriptServerProcess) {
      try {
        this.scriptServerProcess.kill();
      } catch {}
      this.scriptServerProcess = null;
    }
    await new Promise((r) => setTimeout(r, 600));
    return this.ensureScriptServerRunning();
  }

  saveSettings(partial = {}) {
    this.settings = {
      ...this.settings,
      ...partial
    };
    if (partial.actionMode === 'DISABLED') {
      this.settings.enabled = false;
    } else if (partial.actionMode && partial.enabled === undefined) {
      this.settings.enabled = true;
    }
    try {
      this.database?.setSetting?.('script_video_bridge_settings', this.settings);
    } catch {}
    this._emitBridgeState();
    return this.getPublicState();
  }

  lockVideoConfig(rawConfig = {}) {
    if (!rawConfig || typeof rawConfig !== 'object') {
      return this.getPublicState();
    }
    const channelKey = String(rawConfig.channelKey || this.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico').trim();
    const defaultLang = this._detectDefaultWhisperLangForKey(channelKey);
    const defaultVoice = this._detectDefaultVoiceProfileForKey(channelKey);
    const cleanConfig = {
      ...rawConfig,
      channelKey,
      voiceProfileId: (!rawConfig.voiceProfileId || rawConfig.voiceProfileId === 'default')
        ? (defaultVoice || rawConfig.voiceProfileId || 'default')
        : rawConfig.voiceProfileId,
      whisperLanguage: (!rawConfig.whisperLanguage || rawConfig.whisperLanguage === 'auto') ? defaultLang : rawConfig.whisperLanguage,
      voiceSourceMode: this.settings.actionMode === 'ONLY_RENDER_VOICE'
        ? 'ONLY_RENDER_VOICE'
        : 'RENDER_VOICE_THEN_VIDEO'
    };
    this.activeChannelKey = channelKey;
    this.lockedVideoConfig = cleanConfig;
    this.lockedAt = new Date().toISOString();
    if (!this.channelConfigs || typeof this.channelConfigs !== 'object') {
      this.channelConfigs = {};
    }
    this.channelConfigs[channelKey] = cleanConfig;
    try {
      this.database?.setSetting?.('script_video_bridge_locked_config', this.lockedVideoConfig);
      this.database?.setSetting?.('script_video_bridge_locked_at', this.lockedAt);
      this.database?.setSetting?.('script_video_bridge_channel_configs', this.channelConfigs);
      this.database?.setSetting?.('script_video_bridge_active_channel', this.activeChannelKey);
    } catch {}
    this._emitBridgeState();
    return this.getPublicState();
  }

  _resolveValidStockLibraryAndFolder(cfg = {}, libraries = []) {
    const stockLibraries = libraries.filter((l) => String(l.library_type || '').toUpperCase() === 'STOCK');
    const preferredStockLib = stockLibraries.find((l) => /16-6|OBS-Recordings/i.test(l.name || l.root_path || '')) || stockLibraries[0] || libraries[0] || null;
    const matchedLib = libraries.find((l) => l.id === cfg.libraryId) || preferredStockLib;

    let rawFolder = String(cfg.mediaFolder || '').trim();
    const isScratchTest = /scratch[\\/]+e2e_test_project/i.test(rawFolder);
    if (isScratchTest || (rawFolder && !fs.existsSync(rawFolder))) {
      rawFolder = '';
    }
    const mediaFolder = rawFolder || matchedLib?.root_path || '';
    const libraryId = (!isScratchTest && libraries.some((l) => l.id === cfg.libraryId))
      ? cfg.libraryId
      : (matchedLib?.id || null);

    return { matchedLib, libraryId, mediaFolder };
  }

  summarizeLockedConfig() {
    const cfg = this.lockedVideoConfig || {};
    const projects = this.database?.listProjects?.() || [];
    const templates = this.database?.listTemplates?.() || [];
    const libraries = this.database?.listLibraries?.() || [];

    const proj = projects.find((p) => p.id === cfg.projectId) || projects[0] || null;
    const tpl = templates.find((t) => t.id === cfg.templateId) || templates[0] || null;
    const { matchedLib: lib, mediaFolder: resolvedMediaFolder } = this._resolveValidStockLibraryAndFolder(cfg, libraries);

    const activeKey = cfg.channelKey || this.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
    const defaultKeyVoice = this._detectDefaultVoiceProfileForKey(activeKey);
    let resolvedVoiceId = (cfg.voiceProfileId && cfg.voiceProfileId !== 'default')
      ? cfg.voiceProfileId
      : (defaultKeyVoice || 'default');
    let voiceProfileName = resolvedVoiceId;
    try {
      const { VoiceProfileManager } = require('./voice/voice-profile-manager');
      const pm = new VoiceProfileManager();
      let prof = pm.getProfile(resolvedVoiceId);
      if (!prof && defaultKeyVoice) {
        prof = pm.getProfile(defaultKeyVoice);
        if (prof?.id) resolvedVoiceId = prof.id;
      }
      if (!prof && (resolvedVoiceId === 'default' || !resolvedVoiceId)) {
        const allProfs = pm.listProfiles() || [];
        prof = allProfs.find((p) => p.id === '03_mx_ba_gia_dona_elena') || allProfs.find((p) => p.id === 'homeless') || allProfs[0] || null;
        if (prof?.id) resolvedVoiceId = prof.id;
      }
      if (prof?.name) voiceProfileName = `${prof.name} (${prof.id})`;
    } catch {}

    const bgModeMap = {
      STOCK_VIDEO: 'Kho Stock Video tự ghép',
      IMAGE_SEQUENCE: 'Chuỗi ảnh (Image Sequence)',
      MANUAL_MEDIA: 'Media cố định',
      STORY_PIP_STOCK: 'Ảnh AI đè Stock (Story PiP)'
    };
    const bgMode = cfg.backgroundMode || 'STOCK_VIDEO';
    const mediaFolder = resolvedMediaFolder || '(Tự nhận từ Thư viện Stock)';
    const outputFolder = (cfg.outputFolder || '').trim() || proj?.output_root_path || 'D:\\MAFIA_STUDIO_WEB\\PROJECTS_HOMELESS\\TONG HOP\\Videos';

    const tplConfig = tpl?.config || {};
    const tplLayers = (tpl?.layers?.length ? tpl.layers : tplConfig.layers || []).filter((l) => l && l.visible !== false && l.visible !== 0);
    const tplSub = cfg.subtitle || tplConfig.subtitle || {};
    const subEffect = tplSub.subtitleEffect === 'karaoke_box'
      ? `Karaoke hộp (${tplSub.karaokeBoxColor || '#7C00FF'})`
      : `${tplSub.fontFamily || 'Arial'} ${tplSub.fontSize || 70}px (${tplSub.color || '#eaff4d'}${tplSub.uppercase ? ' · IN HOA' : ''})`;

    const disclaimerEnabled = Boolean(cfg.disclaimerEnabled && cfg.disclaimerPath);
    const disclaimerFileName = cfg.disclaimerPath ? path.basename(cfg.disclaimerPath) : '';
    const disclaimerLabel = disclaimerEnabled
      ? `🟢 BẬT (${disclaimerFileName})`
      : '⚪ TẮT (Không chèn đầu video)';

    const projectImageFolder = (cfg.projectImageFolder || '').trim();
    const projectImageMode = String(cfg.projectImageMode || 'IMAGE').toUpperCase() === 'GREEN' ? 'GREEN' : 'IMAGE';
    const projectImageModeLabel = projectImageMode === 'GREEN'
      ? '🟢 Tự động tách nền Phông Xanh (Chroma Key)'
      : '🖼️ Ảnh thường / Ảnh PNG đã tách nền trong suốt sẵn';
    const jobIntroFolder = (cfg.jobIntroFolder || '').trim();
    let khoGreenFolder = path.resolve(__dirname, '../../../Kho_Green');
    try {
      const { resolveGreenStorageDir } = require('./path-utils');
      khoGreenFolder = resolveGreenStorageDir();
    } catch {}
    const studioRoot = this.settings?.scriptStudioRoot || 'D:\\ZC_TEAM\\TOOL_ZC_TEAM';

    return {
      hasLockedConfig: Boolean(this.lockedVideoConfig),
      lockedAt: this.lockedAt,
      projectName: proj?.name || 'Mặc định (1080p)',
      templateId: tpl?.id || null,
      templateName: tpl?.name || 'Default 16:9',
      templateLayersCount: tplLayers.length,
      templateLayersList: tplLayers.map((l) => ({
        name: l.name || l.type,
        type: l.type || l.layer_type,
        source: l.sourceReference ? path.basename(l.sourceReference) : (l.type === 'VOICE_IMAGE' ? '(Tự lấy theo tên Voice từ Folder Ảnh Project)' : '')
      })),
      voiceProfileId: resolvedVoiceId,
      voiceProfileName,
      backgroundMode: bgMode,
      backgroundModeLabel: bgModeMap[bgMode] || bgMode,
      libraryName: lib?.name || 'Kho Stock',
      mediaFolder,
      projectImageFolder: projectImageFolder || '(Để trống — Ẩn lớp Ảnh theo voice, dùng 100% nền Stock)',
      projectImageMode,
      projectImageModeLabel,
      jobIntroFolder: jobIntroFolder || '(Để trống — Không chèn Intro riêng)',
      jobIntroAudioMode: cfg.jobIntroAudioMode || 'MUTE',
      khoGreenFolder,
      tongHopHomelessFolder: path.join(studioRoot, 'PROJECTS_HOMELESS', 'TONG HOP'),
      tongHopMafiaFolder: path.join(studioRoot, 'PROJECTS', 'TONG HOP'),
      tongHopMexicoFolder: path.join(studioRoot, 'PROJECTS_MEXICO', 'TONG HOP'),
      outputFolder,
      disclaimerEnabled,
      disclaimerPath: cfg.disclaimerPath || '',
      disclaimerLabel,
      subtitleEffectLabel: subEffect,
      resolutionLabel: `${cfg.width || 1920}×${cfg.height || 1080} · ${cfg.fps || 24} FPS`,
      codec: cfg.codec || 'auto (NVENC)',
      stockSpeedLabel: `${Number(cfg.stockPlaybackRate || 0.75)}x · ${cfg.selectionMode === 'SEQUENTIAL' ? 'Theo thứ tự' : 'Random không lặp'} · Cắt/Xóa đoạn đã dùng`
    };
  }

  getPublicState() {
    return {
      online: true,
      bridgePort: BRIDGE_PORT,
      scriptStudioPort: SCRIPT_STUDIO_PORT,
      scriptServerOnline: this.scriptServerOnline,
      scriptStudioUrl: `http://127.0.0.1:${SCRIPT_STUDIO_PORT}/?embedded=1`,
      licenseStatus: this.licenseService ? this.licenseService.getStatus() : null,
      settings: this.settings,
      activeChannelKey: this.activeChannelKey,
      channelConfigs: this.channelConfigs || {},
      lockedConfigSummary: this.summarizeLockedConfig(),
      lockedVideoConfig: this.lockedVideoConfig,
      activeJob: this.activeJob,
      queue: this.queue.slice(-30)
    };
  }

  _updateProjectStateJson(projectDir, patch = {}) {
    if (!projectDir) return;
    const statePath = path.join(projectDir, 'STATE.json');
    try {
      if (!fs.existsSync(statePath)) return;
      const current = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      const updated = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      fs.writeFileSync(statePath, JSON.stringify(updated, null, 2), 'utf8');
    } catch {}
  }

  enqueueCompletedScript(payload = {}, { forceImmediate = false } = {}) {
    if (this.licenseService) {
      const lic = this.licenseService.getStatus();
      if (!lic.valid) {
        this._emitLicenseChanged(lic);
        return {
          enqueued: false,
          reason: lic.message || 'Bản quyền chưa kích hoạt hoặc đã bị khóa từ xa.'
        };
      }
    }

    const scriptPath = String(payload.script_path || payload.scriptPath || '').trim();
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      return {
        enqueued: false,
        reason: `Không tìm thấy file kịch bản: ${scriptPath || '(trống)'}`
      };
    }

    // Tránh trùng lặp nếu kịch bản này đang nằm trong hàng đợi chờ hoặc đang render
    const existing = this.queue.find(
      (item) => path.resolve(item.scriptPath) === path.resolve(scriptPath) &&
        ['WAITING_GPU', 'WAITING_BATCH', 'RENDERING'].includes(item.status)
    );
    if (existing) {
      if (forceImmediate && existing.status === 'WAITING_BATCH') {
        existing.status = 'WAITING_GPU';
        this._emitBridgeState();
        this._processQueue().catch(() => {});
      }
      return { enqueued: true, duplicate: true, job: existing };
    }

    if (!forceImmediate && (!this.settings.enabled || this.settings.actionMode === 'DISABLED')) {
      return {
        enqueued: false,
        reason: 'Chế độ tự động chuyển sang tạo Video (Bàn #7) đang tắt.'
      };
    }

    const baseName = path.basename(scriptPath, path.extname(scriptPath));
    const shouldWaitBatch = !forceImmediate && this.settings.triggerMode === 'BATCH_AFTER_ALL';
    const job = {
      id: crypto.randomUUID(),
      projectId: payload.project_id || payload.projectId || baseName,
      projectDir: payload.project_dir || payload.projectDir || '',
      niche: payload.niche || 'mafia',
      winnerTitle: payload.winner_title || payload.winnerTitle || '',
      scriptPath,
      scriptName: path.basename(scriptPath),
      seoPath: payload.seo_path || payload.seoPath || '',
      tongHopDir: payload.tong_hop_dir || payload.tongHopDir || path.dirname(scriptPath),
      status: shouldWaitBatch ? 'WAITING_BATCH' : 'WAITING_GPU',
      stage: shouldWaitBatch ? 'CHỜ XONG CẢ LÔ KỊCH BẢN' : 'CHỜ ĐẾN LƯỢT GPU',
      percent: 0,
      voiceOutputPath: path.join(path.dirname(scriptPath), `${baseName}.wav`),
      srtOutputPath: path.join(path.dirname(scriptPath), `${baseName}.srt`),
      videoOutputPath: '',
      error: '',
      enqueuedAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    this.queue.push(job);
    this._updateProjectStateJson(job.projectDir, {
      video_bridge_status: job.status,
      live_note: shouldWaitBatch
        ? '⏳ Bàn #7: Đã nhận kịch bản sạch TTS, đang đợi cả lô kịch bản hoàn tất để tạo Voice & Video 1 lượt'
        : '🎬 Bàn #7: Đã chuyển kịch bản sang hàng đợi Tạo Voice (.wav) & Render Video (.mp4)'
    });

    this._logToBoth(
      shouldWaitBatch
        ? `📥 Đã nhận kịch bản [${job.scriptName}] từ Bàn #6 (Chế độ Gom lô: đợi xong toàn bộ kịch bản sẽ render 1 lượt).`
        : `🚀 Đã nhận kịch bản [${job.scriptName}] từ Bàn #6 ➔ Chuyển thẳng sang Bàn #7 (Tạo Voice & Render Video GPU)!`
    );
    this._emitBridgeState();

    if (!shouldWaitBatch) {
      this._processQueue().catch((err) => {
        console.error('[ScriptVideoBridge] Lỗi xử lý hàng đợi:', err);
      });
    }

    return { enqueued: true, job };
  }

  onScriptQueueCompleted(payload = {}) {
    const waitingBatchItems = this.queue.filter((item) => item.status === 'WAITING_BATCH');
    if (waitingBatchItems.length > 0) {
      for (const item of waitingBatchItems) {
        item.status = 'WAITING_GPU';
        item.stage = 'CHỜ ĐẾN LƯỢT GPU';
      }
      this._logToBoth(`📦 Toàn bộ lô kịch bản (${waitingBatchItems.length} bài) đã viết xong! Bắt đầu chạy Bàn #7 (Tạo Voice & Render Video GPU)...`);
      this._emitBridgeState();
      this._processQueue().catch((err) => {
        console.error('[ScriptVideoBridge] Lỗi xử lý hàng đợi sau khi xong lô:', err);
      });
      return { triggered: waitingBatchItems.length };
    }
    return { triggered: 0 };
  }

  _buildEffectiveBatchConfigForJob(job) {
    const jobKey = String(job.niche || this.activeChannelKey || 'mafia').trim();
    const keyOverrideCfg = (this.channelConfigs && this.channelConfigs[jobKey]) ? this.channelConfigs[jobKey] : {};
    const base = { ...(this.lockedVideoConfig || {}), ...keyOverrideCfg };
    const defaultLang = this._detectDefaultWhisperLangForKey(jobKey);
    const projects = this.database?.listProjects?.() || [];
    const templates = this.database?.listTemplates?.() || [];
    const libraries = this.database?.listLibraries?.() || [];

    const selectedProject = projects.find((p) => p.id === base.projectId) || projects[0] || null;
    const selectedTemplate = templates.find((t) => t.id === base.templateId) || templates.find((t) => t.id === selectedProject?.template_id) || templates[0] || null;
    const { libraryId: resolvedLibId, mediaFolder: resolvedMediaFolder } = this._resolveValidStockLibraryAndFolder(base, libraries);

    const backgroundMode = base.backgroundMode || 'STOCK_VIDEO';
    const isStockOrImage = ['STOCK_VIDEO', 'IMAGE_SEQUENCE', 'STORY_PIP_STOCK'].includes(backgroundMode);
    const mediaFolder = isStockOrImage ? resolvedMediaFolder : '';
    const libraryId = isStockOrImage ? resolvedLibId : null;

    let outputFolder = (base.outputFolder || '').trim();
    if (!outputFolder && selectedProject?.output_root_path) {
      outputFolder = selectedProject.output_root_path.trim();
    }
    if (!outputFolder) {
      outputFolder = path.join(job.tongHopDir || path.dirname(job.scriptPath), 'Videos');
    }

    const voiceSourceMode = this.settings.actionMode === 'ONLY_RENDER_VOICE'
      ? 'ONLY_RENDER_VOICE'
      : 'RENDER_VOICE_THEN_VIDEO';

    const scriptBaseName = path.basename(job.scriptPath, path.extname(job.scriptPath));

    const defaultKeyVoice = this._detectDefaultVoiceProfileForKey(jobKey);
    let effectiveVoiceProfileId = (base.voiceProfileId && base.voiceProfileId !== 'default')
      ? base.voiceProfileId
      : (defaultKeyVoice || 'default');
    try {
      const { VoiceProfileManager } = require('./voice/voice-profile-manager');
      const pm = new VoiceProfileManager();
      if (!pm.getProfile(effectiveVoiceProfileId) && defaultKeyVoice && pm.getProfile(defaultKeyVoice)) {
        effectiveVoiceProfileId = defaultKeyVoice;
      }
      if (!pm.getProfile(effectiveVoiceProfileId)) {
        const allProfs = pm.listProfiles() || [];
        const fallbackProf = allProfs.find((p) => p.id === '03_mx_ba_gia_dona_elena') || allProfs.find((p) => p.id === 'homeless') || allProfs[0] || null;
        if (fallbackProf?.id) effectiveVoiceProfileId = fallbackProf.id;
      }
    } catch {}

    return {
      ...base,
      batchName: `AutoVideo_${scriptBaseName}`,
      projectId: base.projectId || selectedProject?.id || null,
      templateId: base.templateId || selectedTemplate?.id || null,
      backgroundMode,
      storyPipOverStock: backgroundMode === 'STORY_PIP_STOCK',
      voiceSourceMode,
      voiceProfileId: effectiveVoiceProfileId,
      singleVoicePath: job.scriptPath,
      singleMode: false,
      flatOutputFolder: true,
      voiceFolder: path.dirname(job.scriptPath),
      srtFolder: path.dirname(job.scriptPath),
      autoGenerateSrt: base.accelerationMode !== 'FULL_GPU_ZERO_COPY',
      whisperModel: base.whisperModel || 'small',
      whisperLanguage: (!base.whisperLanguage || base.whisperLanguage === 'auto') ? defaultLang : base.whisperLanguage,
      srtMaxChars: Number(base.srtMaxChars || 42),
      srtMaxDur: Number(base.srtMaxDur || 4.2),
      libraryId,
      mediaFolder,
      outputFolder,
      width: Number(base.width || 1920),
      height: Number(base.height || 1080),
      fps: Number(base.fps || 24),
      codec: base.codec || 'auto',
      accelerationMode: base.accelerationMode || 'AUTO_STABLE',
      gpuIndex: Number(base.gpuIndex ?? -1),
      performanceProfile: base.performanceProfile || 'AUTO',
      maxParallelJobs: 1,
      stockAllocationMode: ['STOCK_VIDEO', 'STORY_PIP_STOCK'].includes(backgroundMode) ? 'DURATION_POOL' : 'PER_JOB',
      stockPlaybackRate: Number(base.stockPlaybackRate || 0.75),
      extendShortStock: base.extendShortStock !== false,
      stockClonePasses: Number(base.stockClonePasses || 2),
      stockCloneFlip: base.stockCloneFlip !== false,
      stockCloneZoom: Number(base.stockCloneZoom || 1.1),
      transformAllStock: base.transformAllStock !== false,
      forceStockCover: base.forceStockCover !== false,
      deleteConsumedMatchedStock: base.deleteConsumedMatchedStock !== false,
      moveUsedStock: Boolean(base.moveUsedStock),
      allowCpuFallback: true
    };
  }

  async _processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (true) {
        const nextJob = this.queue.find((item) => item.status === 'WAITING_GPU');
        if (!nextJob) break;

        // Nếu người dùng đang bấm chạy 1 Batch thủ công trên giao diện, đợi 3 giây rồi kiểm tra lại
        if (this.batchService.activeBatchId) {
          nextJob.stage = 'ĐANG ĐỢI BATCH HIỆN TẠI HOÀN TẤT';
          this._emitBridgeState();
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        this.activeJob = nextJob;
        nextJob.status = 'RENDERING';
        nextJob.stage = 'KHỞI ĐỘNG BÀN #7 (VOICE & VIDEO)';
        nextJob.startedAt = Date.now();
        nextJob.percent = 2;
        this._emitBridgeState();

        const runConfig = this._buildEffectiveBatchConfigForJob(nextJob);
        this._logToBoth(
          `🎬 Bắt đầu sản xuất [${nextJob.scriptName}] · Giọng: ${runConfig.voiceProfileId} · Nền: ${runConfig.backgroundMode} · Output: ${runConfig.outputFolder}`
        );
        this._updateProjectStateJson(nextJob.projectDir, {
          video_bridge_status: 'RENDERING',
          live_note: `🎬 Bàn #7 đang chạy: Tạo Voice (.wav) ➔ Whisper (.srt) ➔ Render Video (.mp4)`
        });

        this.currentAbortController = new AbortController();
        try {
          const result = await this.batchService.run(
            runConfig,
            {
              onProgress: (p) => {
                this._sendToRenderer('batch:progress', p);
                if (p?.percent !== undefined) {
                  nextJob.percent = Math.max(2, Math.min(99, Math.round(Number(p.percent) || 0)));
                }
                if (p?.stage === 'VOICE_GEN') {
                  nextJob.stage = `🎙️ Đang tạo Voice (.wav): ${p.message || `${nextJob.percent}%`}`;
                } else if (p?.stage === 'SRT_PREP') {
                  nextJob.stage = `📝 Đang tạo phụ đề Whisper (.srt): ${p.message || `${nextJob.percent}%`}`;
                } else if (p?.stage === 'RENDER') {
                  nextJob.stage = `🎬 Đang Render GPU NVENC (.mp4): ${nextJob.percent}% ${p.speed ? `(${p.speed})` : ''}`;
                } else if (p?.message) {
                  nextJob.stage = p.message;
                }
                this._emitBridgeState();
              },
              onLog: (m) => {
                this._sendToRenderer('batch:log', m);
              },
              onJob: (j) => {
                this._sendToRenderer('batch:job', j);
                if (j?.outputPath) {
                  nextJob.videoOutputPath = j.outputPath;
                }
                if (j?.srtPath) {
                  nextJob.srtOutputPath = j.srtPath;
                }
              },
              onBatch: (b) => {
                this._sendToRenderer('batch:state', b);
              }
            },
            this.currentAbortController.signal
          );

          const baseName = path.basename(nextJob.scriptPath, path.extname(nextJob.scriptPath));
          const expectedMp4 = nextJob.videoOutputPath || path.join(runConfig.outputFolder, `${baseName}.mp4`);
          if (fs.existsSync(expectedMp4)) {
            nextJob.videoOutputPath = expectedMp4;
          }

          if (result?.status === 'COMPLETED') {
            nextJob.status = 'COMPLETED';
            nextJob.percent = 100;
            nextJob.completedAt = Date.now();
            nextJob.stage = runConfig.voiceSourceMode === 'ONLY_RENDER_VOICE'
              ? `✅ Đã xuất Voice: ${path.basename(nextJob.voiceOutputPath)}`
              : `✅ Đã xuất Video: ${path.basename(nextJob.videoOutputPath || expectedMp4)}`;

            if (this.settings.copyMp4ToTongHop && nextJob.videoOutputPath && fs.existsSync(nextJob.videoOutputPath)) {
              try {
                const destMp4 = path.join(nextJob.tongHopDir || path.dirname(nextJob.scriptPath), path.basename(nextJob.videoOutputPath));
                if (path.resolve(destMp4) !== path.resolve(nextJob.videoOutputPath)) {
                  fs.copyFileSync(nextJob.videoOutputPath, destMp4);
                }
              } catch {}
            }

            this._updateProjectStateJson(nextJob.projectDir, {
              video_bridge_status: 'COMPLETED',
              voice_output_path: nextJob.voiceOutputPath,
              srt_output_path: nextJob.srtOutputPath,
              video_output_path: nextJob.videoOutputPath || expectedMp4,
              live_note: `🏆 ĐÃ HOÀN TẤT KHÉP KÍN 7/7 BÀN (Kịch bản + SEO + Voice WAV + Phụ đề SRT + Video MP4: ${path.basename(nextJob.videoOutputPath || expectedMp4)})`
            });

            this._logToBoth(
              `🎉 Hoàn tất 100% Bàn #7 cho [${nextJob.scriptName}]! Thành phẩm: ${nextJob.videoOutputPath || nextJob.voiceOutputPath}`
            );
          } else {
            throw new Error(result?.error || `Batch kết thúc với trạng thái ${result?.status || 'UNKNOWN'}`);
          }
        } catch (err) {
          nextJob.status = 'FAILED';
          nextJob.error = err?.message || String(err);
          nextJob.stage = `❌ Lỗi: ${nextJob.error}`;
          nextJob.completedAt = Date.now();
          this._updateProjectStateJson(nextJob.projectDir, {
            video_bridge_status: 'FAILED',
            video_bridge_error: nextJob.error,
            live_note: `⚠️ Bàn #7 (Tạo Video) báo lỗi: ${nextJob.error.slice(0, 120)}`
          });
          this._logToBoth(`❌ Lỗi khi tạo Voice/Video cho [${nextJob.scriptName}]: ${nextJob.error}`);
        } finally {
          this.currentAbortController = null;
          this.activeJob = null;
          this._emitBridgeState();
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this._emitBridgeState();
    }
  }

  enqueueFolderScripts(folderPath) {
    if (!folderPath || !fs.existsSync(folderPath)) {
      throw new Error('Thư mục chứa kịch bản không tồn tại.');
    }
    const files = fs.readdirSync(folderPath)
      .filter((name) => {
        const lower = name.toLowerCase();
        return lower.endsWith('.txt') && !lower.endsWith('_seo.txt') && !lower.endsWith('_prompt.txt') && !lower.startsWith('.');
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const enqueued = [];
    for (const fileName of files) {
      const fullPath = path.join(folderPath, fileName);
      const res = this.enqueueCompletedScript({
        project_id: path.basename(fileName, '.txt'),
        script_path: fullPath,
        tong_hop_dir: folderPath
      }, { forceImmediate: true });
      if (res.enqueued) enqueued.push(res.job);
    }
    return { count: enqueued.length, jobs: enqueued };
  }

  clearCompletedQueue() {
    this.queue = this.queue.filter((item) => ['WAITING_GPU', 'WAITING_BATCH', 'RENDERING'].includes(item.status));
    this._emitBridgeState();
    return this.getPublicState();
  }

  async startBridgeHttpServer() {
    if (this.httpServer) return;

    const readJsonBody = (req) => new Promise((resolve) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });

    const sendJson = (res, statusCode, data) => {
      const body = JSON.stringify(data);
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(body);
    };

    this.httpServer = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
      }

      const urlObj = new URL(req.url || '/', `http://127.0.0.1:${BRIDGE_PORT}`);
      const pathname = urlObj.pathname;

      try {
        if (req.method === 'GET' && pathname === '/api/bridge/status') {
          const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : null;
          const windowInfo = win && !win.isDestroyed() ? {
            isVisible: win.isVisible(),
            isMinimized: win.isMinimized(),
            isFocused: win.isFocused(),
            bounds: win.getBounds()
          } : null;
          sendJson(res, 200, { ...this.getPublicState(), windowInfo });
          return;
        }

        if ((req.method === 'POST' || req.method === 'GET') && pathname === '/api/bridge/bring-to-front') {
          const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : null;
          if (win && !win.isDestroyed()) {
            if (win.isMinimized()) win.restore();
            win.center();
            win.show();
            win.setAlwaysOnTop(true);
            win.focus();
            win.moveTop?.();
            setTimeout(() => {
              try { if (!win.isDestroyed()) win.setAlwaysOnTop(false); } catch {}
            }, 900);
          }
          sendJson(res, 200, {
            ok: true,
            windowInfo: win && !win.isDestroyed() ? {
              isVisible: win.isVisible(),
              isMinimized: win.isMinimized(),
              isFocused: win.isFocused(),
              bounds: win.getBounds()
            } : null
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/bridge/license') {
          if (!this.licenseService) {
            sendJson(res, 200, { ok: true, licenseStatus: { valid: true, status: 'ACTIVE' } });
            return;
          }
          const forceSync = urlObj.searchParams.get('sync') === '1';
          const licenseStatus = forceSync
            ? await this.licenseService.syncAndGetStatus()
            : this.licenseService.getStatus();
          this._emitLicenseChanged(licenseStatus);
          sendJson(res, 200, { ok: licenseStatus.valid, licenseStatus });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/license') {
          if (!this.licenseService) {
            sendJson(res, 200, { ok: true, licenseStatus: { valid: true, status: 'ACTIVE' } });
            return;
          }
          const body = await readJsonBody(req);
          const action = String(body.action || 'status').toLowerCase();
          let licenseStatus = null;

          if (action === 'activate') {
            const rawKey = String(body.licenseKey || body.license_key || '').trim();
            licenseStatus = await this.licenseService.activate(rawKey);
          } else if (action === 'deactivate') {
            licenseStatus = this.licenseService.deactivate();
          } else if (action === 'sync_token') {
            if (body.signedToken) {
              this.licenseService.applySignedRegistryToken(body.signedToken);
            }
            licenseStatus = this.licenseService.getStatus();
          } else if (action === 'check' || action === 'sync') {
            licenseStatus = await this.licenseService.syncAndGetStatus();
          } else {
            licenseStatus = this.licenseService.getStatus();
          }

          if (!licenseStatus?.valid) {
            try { this.currentAbortController?.abort(); } catch {}
          }
          this._emitLicenseChanged(licenseStatus);
          sendJson(res, 200, { ok: Boolean(licenseStatus?.valid), licenseStatus });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/settings') {
          const body = await readJsonBody(req);
          const state = this.saveSettings(body);
          sendJson(res, 200, { ok: true, state });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/lock-config') {
          const body = await readJsonBody(req);
          if (body && Object.keys(body).length > 0 && body.config) {
            this.lockVideoConfig(body.config);
          } else {
            // Yêu cầu Renderer gửi cấu hình hiện tại trên tab Tạo Batch Video xuống để khóa
            this._sendToRenderer('scriptBridge:requestSyncBatchConfig', {});
          }
          sendJson(res, 200, { ok: true, state: this.getPublicState() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/script-completed') {
          const body = await readJsonBody(req);
          const result = this.enqueueCompletedScript(body, { forceImmediate: Boolean(body.force_immediate) });
          sendJson(res, 200, { ok: true, ...result, state: this.getPublicState() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/queue-completed') {
          const body = await readJsonBody(req);
          const result = this.onScriptQueueCompleted(body);
          sendJson(res, 200, { ok: true, ...result, state: this.getPublicState() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/enqueue-folder') {
          const body = await readJsonBody(req);
          const result = this.enqueueFolderScripts(body.folder_path || body.folderPath);
          sendJson(res, 200, { ok: true, ...result, state: this.getPublicState() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/bridge/open-path') {
          const body = await readJsonBody(req);
          const rawTarget = String(body.path || body.target_dir || body.folderPath || '').trim();
          if (!rawTarget) {
            sendJson(res, 400, { ok: false, error: 'Đường dẫn trống.' });
            return;
          }
          const resolved = path.resolve(rawTarget);
          let isFile = false;
          try {
            if (fs.existsSync(resolved)) {
              isFile = fs.statSync(resolved).isFile();
            } else if (!path.extname(resolved)) {
              fs.mkdirSync(resolved, { recursive: true });
            }
          } catch {}

          try {
            const win = typeof this.getMainWindow === 'function' ? this.getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              try { win.setAlwaysOnTop(false); } catch {}
            }
            const { shell } = require('electron');
            if (isFile) {
              shell.showItemInFolder(resolved);
            } else {
              await shell.openPath(resolved);
            }
            // Dùng -EncodedCommand (không bao giờ lỗi dấu ngoặc) để đưa cửa sổ Explorer của thư mục này lên trên cùng
            const targetFolder = (isFile ? path.dirname(resolved) : resolved).replace(/'/g, "''");
            const focusPs = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class VbsWin32 {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
Start-Sleep -Milliseconds 250
$sh = New-Object -ComObject Shell.Application
foreach ($w in $sh.Windows()) {
  try {
    if ($w.Document.Folder.Self.Path -ieq '${targetFolder}') {
      [VbsWin32]::ShowWindowAsync([IntPtr]$w.HWND, 9) | Out-Null
      [VbsWin32]::SetForegroundWindow([IntPtr]$w.HWND) | Out-Null
    }
  } catch {}
}
`;
            const encoded = Buffer.from(focusPs, 'utf16le').toString('base64');
            const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
              detached: true,
              stdio: 'ignore',
              windowsHide: true
            });
            child.unref();
            sendJson(res, 200, { ok: true, path: resolved });
          } catch (err) {
            sendJson(res, 500, { ok: false, error: err?.message || String(err) });
          }
          return;
        }

        sendJson(res, 404, { ok: false, error: 'Not Found' });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err?.message || String(err) });
      }
    });

    await new Promise((resolve) => {
      this.httpServer.on('error', (err) => {
        console.warn(`[ScriptVideoBridge] Cổng ${BRIDGE_PORT} báo lỗi:`, err.message);
        resolve();
      });
      this.httpServer.listen(BRIDGE_PORT, '127.0.0.1', () => {
        console.log(`[ScriptVideoBridge] Local Bridge Server lắng nghe tại http://127.0.0.1:${BRIDGE_PORT}`);
        resolve();
      });
    });
  }

  async shutdown() {
    try {
      this.currentAbortController?.abort();
    } catch {}
    if (this.httpServer) {
      try {
        this.httpServer.close();
      } catch {}
      this.httpServer = null;
    }
    this.scriptServerProcess = null;
  }
}

module.exports = {
  ScriptVideoBridgeService,
  BRIDGE_PORT,
  SCRIPT_STUDIO_PORT
};
