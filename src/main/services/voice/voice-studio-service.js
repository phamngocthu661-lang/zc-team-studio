'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');
const { spawn, execFileSync } = require('node:child_process');

/**
 * Service tích hợp VoiceStudio (debpalash/VoiceStudio v0.5.6)
 * Giao tiếp qua OpenAI-compatible Audio REST API (http://127.0.0.1:3900/v1)
 * và Native Profile API (http://127.0.0.1:3900/profiles) để Voice Clone chuẩn 100%.
 * Hỗ trợ tự động cân đối số luồng GPU (OMNIVOICE_GPU_WORKERS) và CPU theo tài nguyên máy.
 */
class VoiceStudioService {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] URL API VoiceStudio (mặc định: http://127.0.0.1:3900/v1)
   * @param {number} [options.timeoutMs] Timeout cho mỗi request (mặc định: 180s)
   * @param {string} [options.defaultModel] Model mặc định (mặc định: omnivoice)
   * @param {Object} [options.profileManager] Instance của VoiceProfileManager (tùy chọn)
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.VOICESTUDIO_API_URL || 'http://127.0.0.1:3900/v1').replace(/\/+$/, '');
    this.rootUrl = this.baseUrl.replace(/\/v1$/i, '');
    this.timeoutMs = options.timeoutMs || 180000;
    this.defaultModel = options.defaultModel || 'omnivoice';
    this.profileManager = options.profileManager || null;
    this._refAudioToVsIdCache = new Map();
    this._lastHealthResult = null;
    this._lastHealthAt = 0;
    this._launchingPromise = null;

    this.daemonRuntime = this._resolveVoiceStudioDaemonRuntime();
    this.appExecutable = this._resolveVoiceStudioExecutable();
    try {
      this.syncOptimalHardwareEnv();
    } catch {}
  }

  /**
   * Đo tài nguyên phần cứng (GPU VRAM, % tải GPU, số nhân CPU) để cân đối số luồng tối đa
   */
  detectHardwareConcurrency() {
    const cpuCores = Math.max(2, (os.cpus() || []).length || 4);
    const freeRamGb = os.freemem() / (1024 ** 3);

    let hasNvidiaGpu = false;
    let gpuName = '';
    let vramTotalMb = 0;
    let vramFreeMb = 0;
    let gpuUtilPercent = 0;

    const smiCandidates = [
      process.env.NVIDIA_SMI_PATH,
      'C:\\Windows\\System32\\nvidia-smi.exe',
      'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe',
      'nvidia-smi'
    ].filter(Boolean);

    const smiCmd = smiCandidates.find(c => c === 'nvidia-smi' || fs.existsSync(c)) || 'nvidia-smi';
    try {
      const stdout = execFileSync(smiCmd, [
        '--query-gpu=name,memory.total,memory.free,utilization.gpu',
        '--format=csv,noheader,nounits'
      ], { encoding: 'utf8', timeout: 2000, windowsHide: true });

      const firstLine = String(stdout || '').split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (firstLine) {
        const parts = firstLine.split(',').map(s => s.trim());
        gpuName = parts[0] || 'NVIDIA GPU';
        vramTotalMb = Number(parts[1]) || 0;
        vramFreeMb = Number(parts[2]) || 0;
        gpuUtilPercent = Number(parts[3]) || 0;
        hasNvidiaGpu = vramTotalMb > 0;
      }
    } catch {}

    // Tính số luồng GPU (OMNIVOICE_GPU_WORKERS) tối ưu theo dung lượng VRAM:
    // Mặc định VoiceStudio đòi 5GB/luồng khiến card 6GB/8GB bị khóa ở 1 luồng.
    // Khi đã cache giọng mẫu (_get_clone_prompt), mỗi luồng OmniVoice chỉ tốn ~1.5-1.8GB VRAM.
    let gpuWorkers = 1;
    if (hasNvidiaGpu) {
      if (vramTotalMb >= 14000 || vramFreeMb >= 10000) {
        gpuWorkers = 4;
      } else if (vramTotalMb >= 7800 || vramFreeMb >= 6000) {
        gpuWorkers = 3;
      } else if (vramTotalMb >= 5500 || vramFreeMb >= 3500) {
        gpuWorkers = 2;
      } else {
        gpuWorkers = 1;
      }
      // Nếu GPU đang bận nặng (>80%) bởi tác vụ khác thì giảm bớt 1 luồng để tránh nghẽn
      if (gpuUtilPercent > 80 && gpuWorkers > 1) {
        gpuWorkers = Math.max(1, gpuWorkers - 1);
      }
    }

    const cpuPoolWorkers = Math.min(12, Math.max(4, cpuCores));
    // Số luồng bắn request song song từ Video Batch Studio (Pipelining):
    // Với VoiceStudio GPU: bằng số gpuWorkers (tối thiểu 2 để gối đầu I/O trong lúc GPU tính toán)
    // Với Fallback TTS: bung 6-8 luồng tùy theo số nhân CPU rảnh
    const vsClientConcurrency = hasNvidiaGpu ? Math.max(2, gpuWorkers) : Math.min(4, Math.max(2, Math.floor(cpuCores / 2)));
    const fallbackConcurrency = Math.min(8, Math.max(4, Math.floor(cpuCores * 0.75)));

    return {
      hasNvidiaGpu,
      gpuName,
      vramTotalMb,
      vramFreeMb,
      gpuUtilPercent,
      cpuCores,
      freeRamGb: Number(freeRamGb.toFixed(1)),
      gpuWorkers,
      cpuPoolWorkers,
      vsClientConcurrency,
      fallbackConcurrency
    };
  }

  /**
   * Đồng bộ biến môi trường OMNIVOICE_GPU_WORKERS & OMNIVOICE_CPU_POOL vào ~/.config/omnivoice/env
   * để VoiceStudio tự động mở khóa đa luồng GPU khi khởi động
   */
  syncOptimalHardwareEnv() {
    const hw = this.detectHardwareConcurrency();
    const envFilePath = path.join(os.homedir(), '.config', 'omnivoice', 'env');
    try {
      const parentDir = path.dirname(envFilePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      let lines = [];
      if (fs.existsSync(envFilePath)) {
        lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/).filter(Boolean);
      }
      const upsert = (key, val) => {
        const prefix = `${key}=`;
        const idx = lines.findIndex(l => l.startsWith(prefix));
        if (idx >= 0) {
          lines[idx] = `${key}=${val}`;
        } else {
          lines.push(`${key}=${val}`);
        }
      };
      upsert('OMNIVOICE_GPU_WORKERS', String(hw.gpuWorkers));
      upsert('OMNIVOICE_CPU_POOL', String(hw.cpuPoolWorkers));
      fs.writeFileSync(envFilePath, lines.join('\n') + '\n', 'utf8');
    } catch {}
    return hw;
  }

  /**
   * Tìm kiếm Python Headless Daemon Runtime của VoiceStudio (ưu tiên số 1 để bật ngầm không hiện cửa sổ)
   */
  _resolveVoiceStudioDaemonRuntime() {
    let runtimeLocRoot = null;
    try {
      const runtimeJsonPath = path.join(
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
        'VoiceStudio',
        'runtime-location.json'
      );
      if (fs.existsSync(runtimeJsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(runtimeJsonPath, 'utf8'));
        if (parsed && parsed.root && fs.existsSync(parsed.root)) {
          runtimeLocRoot = parsed.root;
        }
      }
    } catch {}

    const rootCandidates = [
      process.env.VOICESTUDIO_ROOT,
      'D:\\TEST TOOL VIDEO - Copy\\VoiceStudio',
      runtimeLocRoot ? path.join(runtimeLocRoot, 'project') : null,
      runtimeLocRoot,
      'D:\\VoiceStudioRuntime\\project',
      'D:\\VoiceStudioRuntime',
      'D:\\VoiceStudio',
      'E:\\VoiceStudio',
      path.resolve(process.cwd(), 'tools', 'VoiceStudio'),
      path.resolve(__dirname, '../../../../tools/VoiceStudio')
    ].filter(Boolean);

    for (const rootDir of rootCandidates) {
      try {
        const pythonExe = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
        const uvicornExe = path.join(rootDir, '.venv', 'Scripts', 'uvicorn.exe');
        const backendMain = path.join(rootDir, 'backend', 'main.py');
        const isIncomplete = fs.existsSync(path.join(rootDir, '.runtime-installing'));
        if (!isIncomplete && fs.existsSync(pythonExe) && fs.existsSync(uvicornExe) && fs.existsSync(backendMain)) {
          const daemonScriptCandidates = [
            path.resolve(__dirname, '../../../../tools/run_voicestudio_daemon.py'),
            path.resolve(process.cwd(), 'tools', 'run_voicestudio_daemon.py'),
            path.join(path.dirname(rootDir), 'scripts', 'run_voicestudio_daemon.py'),
            path.join(rootDir, 'scripts', 'run_voicestudio_daemon.py')
          ];
          const daemonScript = daemonScriptCandidates.find(p => fs.existsSync(p)) || null;
          return {
            rootDir,
            pythonExe,
            backendDir: path.join(rootDir, 'backend'),
            daemonScript
          };
        }
      } catch {}
    }
    return null;
  }

  /**
   * Tìm kiếm file thực thi VoiceStudio trên máy tính
   */
  _resolveVoiceStudioExecutable() {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'VoiceStudio', 'VoiceStudio.exe'),
      path.resolve(process.cwd(), 'tools', 'VoiceStudio', 'VoiceStudio.exe'),
      'C:\\Program Files\\VoiceStudio\\VoiceStudio.exe',
      'D:\\TOOL\\VoiceStudio\\VoiceStudio.exe'
    ].filter(Boolean);

    for (const cand of candidates) {
      try {
        if (fs.existsSync(cand)) return cand;
      } catch {}
    }
    return null;
  }

  _getProfileManager() {
    if (this.profileManager) return this.profileManager;
    try {
      const { VoiceProfileManager } = require('./voice-profile-manager');
      this.profileManager = new VoiceProfileManager();
      return this.profileManager;
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra xem VoiceStudio API có đang online và sẵn sàng nhận lệnh không
   */
  async checkHealth({ useCache = false } = {}) {
    if (useCache && this._lastHealthResult && (Date.now() - this._lastHealthAt < 5000)) {
      return this._lastHealthResult;
    }
    if (!this.daemonRuntime) {
      this.daemonRuntime = this._resolveVoiceStudioDaemonRuntime();
    }
    if (!this.appExecutable) {
      this.appExecutable = this._resolveVoiceStudioExecutable();
    }
    const hw = this.detectHardwareConcurrency();
    const modelsUrl = `${this.baseUrl}/models`;
    const installedPath = this.daemonRuntime?.pythonExe || this.appExecutable || null;
    try {
      const res = await this._httpGetJson(modelsUrl, 3000);
      const models = Array.isArray(res?.data)
        ? res.data.map(m => m.id || m.name || String(m))
        : ['omnivoice'];

      let sysInfo = null;
      try {
        sysInfo = await this._httpGetJson(`${this.rootUrl}/system/info`, 2000);
      } catch {}

      const device = sysInfo?.device || (hw.hasNvidiaGpu ? 'cuda' : 'cpu');
      const gpuLabel = sysInfo?.gpu_name || hw.gpuName || '';

      const result = {
        online: true,
        launching: false,
        baseUrl: this.baseUrl,
        appInstalled: Boolean(installedPath),
        appPath: installedPath,
        models,
        device,
        gpuName: gpuLabel,
        gpuWorkers: hw.gpuWorkers,
        concurrency: hw.vsClientConcurrency,
        details: `VoiceStudio đang chạy (${String(device).toUpperCase()}${gpuLabel ? ` · ${gpuLabel}` : ''} · ${hw.vsClientConcurrency} luồng song song)`
      };
      this._lastHealthResult = result;
      this._lastHealthAt = Date.now();
      return result;
    } catch (err) {
      const isLaunching = Boolean(this._launchingPromise);
      const result = {
        online: false,
        launching: isLaunching,
        baseUrl: this.baseUrl,
        appInstalled: Boolean(installedPath),
        appPath: installedPath,
        models: ['omnivoice'],
        device: hw.hasNvidiaGpu ? 'cuda' : 'cpu',
        gpuName: hw.gpuName,
        gpuWorkers: hw.gpuWorkers,
        concurrency: hw.fallbackConcurrency,
        details: isLaunching
          ? `Đang tự động khởi chạy VoiceStudio GPU Server trên cổng 3900 (nạp model CUDA)...`
          : `VoiceStudio chưa bật hoặc chưa kết nối cổng 3900 (${err.message})`
      };
      this._lastHealthResult = result;
      this._lastHealthAt = Date.now();
      return result;
    }
  }

  /**
   * Lấy danh sách giọng có trên VoiceStudio server + Local VoiceProfileManager
   */
  async listVoices() {
    const localManager = this._getProfileManager();
    const localProfiles = localManager ? localManager.listProfiles() : [];
    let remoteVoices = [];

    try {
      const res = await this._httpGetJson(`${this.rootUrl}/profiles`, 2500);
      if (Array.isArray(res)) {
        remoteVoices = res.map(p => ({
          id: p.id,
          name: p.name || p.id,
          language: p.language || 'Auto',
          source: 'voicestudio'
        }));
      }
    } catch {}

    return {
      localProfiles,
      remoteVoices
    };
  }

  /**
   * Tự động khởi động VoiceStudio Server (ưu tiên Headless GPU Python Daemon trên cổng 3900)
   */
  async ensureVoiceStudioRunning(timeoutMs = 60000) {
    const cached = await this.checkHealth({ useCache: true });
    if (cached.online) return true;

    const fresh = await this.checkHealth({ useCache: false });
    if (fresh.online) return true;

    if (this._launchingPromise) {
      return await this._launchingPromise;
    }

    const effectiveTimeoutMs = Math.max(Number(timeoutMs) || 60000, 48000);

    this._launchingPromise = (async () => {
      if (!this.daemonRuntime) {
        this.daemonRuntime = this._resolveVoiceStudioDaemonRuntime();
      }
      if (!this.appExecutable) {
        this.appExecutable = this._resolveVoiceStudioExecutable();
      }

      const hw = this.syncOptimalHardwareEnv();

      if (this.daemonRuntime && fs.existsSync(this.daemonRuntime.pythonExe)) {
        const { rootDir, pythonExe, backendDir, daemonScript } = this.daemonRuntime;
        const args = daemonScript && fs.existsSync(daemonScript)
          ? [daemonScript]
          : ['-m', 'uvicorn', 'main:app', '--app-dir', backendDir, '--host', '127.0.0.1', '--port', '3900'];

        console.log(`[VoiceStudio] Đang tự động khởi chạy Headless GPU Server (${hw.gpuWorkers} GPU workers, ${hw.cpuPoolWorkers} CPU workers): ${pythonExe} ${args.join(' ')}`);
        try {
          const child = spawn(pythonExe, args, {
            cwd: rootDir,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: {
              ...process.env,
              VOICESTUDIO_ROOT: rootDir,
              OMNIVOICE_DATA_DIR: path.join(rootDir, 'data'),
              OMNIVOICE_CACHE_DIR: path.join(rootDir, '.cache'),
              HF_HOME: path.join(rootDir, '.cache'),
              HF_HUB_CACHE: path.join(rootDir, '.cache'),
              TORCH_HOME: path.join(rootDir, '.torch_cache'),
              OMNIVOICE_ASR_BACKEND: 'pytorch-whisper',
              OMNIVOICE_DISABLE_WATERMARK: '1',
              TORCH_COMPILE_DISABLE: '1',
              HF_DEACTIVATE_ASYNC_LOAD: '1',
              HF_SAFETENSORS_BACKEND: 'pread',
              OMNIVOICE_GPU_WORKERS: String(hw.gpuWorkers),
              OMNIVOICE_CPU_POOL: String(hw.cpuPoolWorkers)
            }
          });
          child.unref();
        } catch (daemonErr) {
          console.warn('[VoiceStudio] Lỗi khi spawn Headless GPU Daemon:', daemonErr.message);
        }
      } else if (this.appExecutable && fs.existsSync(this.appExecutable)) {
        console.log(`[VoiceStudio] Đang tự động khởi chạy VoiceStudio.exe (${hw.gpuWorkers} GPU workers, ${hw.cpuPoolWorkers} CPU workers): ${this.appExecutable}`);
        try {
          const child = spawn(this.appExecutable, [], {
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
            env: {
              ...process.env,
              OMNIVOICE_GPU_WORKERS: String(hw.gpuWorkers),
              OMNIVOICE_CPU_POOL: String(hw.cpuPoolWorkers)
            }
          });
          child.unref();
        } catch (launchErr) {
          console.warn('[VoiceStudio] Lỗi khi spawn VoiceStudio.exe:', launchErr.message);
          return false;
        }
      } else {
        console.warn('[VoiceStudio] Không tìm thấy VoiceStudio Headless Runtime hoặc VoiceStudio.exe để tự động bật.');
        return false;
      }

      const startTime = Date.now();
      while (Date.now() - startTime < effectiveTimeoutMs) {
        await new Promise(r => setTimeout(r, 1500));
        const check = await this.checkHealth({ useCache: false });
        if (check.online) {
          console.log('[VoiceStudio] VoiceStudio GPU Server đã online thành công trên cổng 3900!');
          return true;
        }
      }

      console.warn(`[VoiceStudio] Hết thời gian chờ (${effectiveTimeoutMs}ms), VoiceStudio chưa sẵn sàng.`);
      return false;
    })();

    try {
      return await this._launchingPromise;
    } finally {
      this._launchingPromise = null;
    }
  }

  /**
   * Đăng ký file âm thanh mẫu (refAudio) vào SQLite của VoiceStudio qua POST /profiles
   * để POST /v1/audio/speech nhận diện được voice profile_id và dùng đúng giọng clone.
   */
  _resolveOrEstimateRefText(sampleFile, rawRefText = '', language = 'en') {
    const clean = String(rawRefText || '').trim();
    if (clean.length >= 12) return clean;
    try {
      const sidecarTxt = path.join(path.dirname(sampleFile), 'sample.txt');
      if (fs.existsSync(sidecarTxt)) {
        const sTxt = fs.readFileSync(sidecarTxt, 'utf8').trim();
        if (sTxt.length >= 12) return sTxt;
      }
    } catch {}
    // Nếu profile tùy chỉnh chưa có refText, tự động ước lượng câu tham chiếu chuẩn tỷ lệ 16 ký tự/giây
    // để ngăn OmniVoice rơi vào nhánh fallback 25 tokens (0.5s) làm tốc độ đọc nhanh gấp đôi (bị hụt 50% thời lượng)!
    let durSec = 10.0;
    try {
      const st = fs.statSync(sampleFile);
      const ext = path.extname(sampleFile).toLowerCase();
      if (ext === '.wav' && st.size > 44) {
        const fd = fs.openSync(sampleFile, 'r');
        const hdr = Buffer.alloc(44);
        fs.readSync(fd, hdr, 0, 44, 0);
        fs.closeSync(fd);
        const br = hdr.readUInt32LE(28);
        if (br > 0) durSec = Math.max(3.0, Math.min(20.0, (st.size - 44) / br));
      } else if (st.size > 1000) {
        durSec = Math.max(4.0, Math.min(20.0, st.size / 24000));
      }
    } catch {}
    const langLow = String(language || 'en').toLowerCase();
    const baseSentence = langLow.startsWith('es')
      ? 'Esta es una grabación de referencia clara y natural para mantener el ritmo pausado y la entonación exacta durante toda la narración de la historia familiar.'
      : 'This is a clear and steady reference voice recording designed to maintain a natural storytelling pace and accurate spoken duration across every paragraph.';
    const targetChars = Math.max(40, Math.round(durSec * 15.5));
    let out = baseSentence;
    while (out.length < targetChars) {
      out += ' ' + baseSentence;
    }
    return out.slice(0, targetChars).trim();
  }

  async _ensureVoiceStudioCloneProfile({ profile = null, refAudio, name, language, existingVsProfileId = null }) {
    const sampleFile = refAudio || profile?.samplePath;
    if (!sampleFile || !fs.existsSync(sampleFile)) return null;

    let stat;
    try {
      stat = fs.statSync(sampleFile);
    } catch {
      return null;
    }

    const effectiveRefText = this._resolveOrEstimateRefText(
      sampleFile,
      profile?.refText || '',
      language || profile?.language || 'en'
    );
    const cacheKey = `${path.resolve(sampleFile)}:${stat.size}:${Math.floor(stat.mtimeMs)}:${effectiveRefText.length}`;
    if (this._refAudioToVsIdCache.has(cacheKey)) {
      return this._refAudioToVsIdCache.get(cacheKey);
    }

    const prevId = existingVsProfileId || profile?.vsProfileId || null;
    if (prevId) {
      try {
        const existing = await this._httpGetJson(`${this.rootUrl}/profiles/${encodeURIComponent(prevId)}`, 2500);
        if (existing && existing.id && String(existing.ref_text || '').trim().length >= 12) {
          this._refAudioToVsIdCache.set(cacheKey, existing.id);
          return existing.id;
        }
      } catch {}
    }

    try {
      const uploaded = await this._uploadCloneProfileToVoiceStudio({
        refAudioPath: sampleFile,
        name: `${name || profile?.name || path.basename(sampleFile, path.extname(sampleFile)) || 'VBS_Voice'}_${Date.now().toString(36).slice(-4)}`,
        language: language || profile?.language || 'Auto',
        refText: effectiveRefText,
        personality: profile?.personality || profile?.description || ''
      });
      const vsId = typeof uploaded === 'string' ? uploaded : uploaded?.id;
      if (vsId) {
        this._refAudioToVsIdCache.set(cacheKey, vsId);
        if (profile && (profile.vsProfileId !== vsId || !profile.refText)) {
          try {
            const manager = this._getProfileManager();
            manager?.saveProfile({ ...profile, refText: effectiveRefText, vsProfileId: vsId });
          } catch {}
        }
        return vsId;
      }
    } catch (err) {
      // Nếu server mock hoặc endpoint /profiles chưa sẵn sàng, bỏ qua êm ái
      console.warn(`[VoiceStudio] Không thể đồng bộ mẫu giọng sang /profiles (${err.message}), tiếp tục gọi /v1/audio/speech.`);
    }

    return null;
  }

  /**
   * Upload multipart/form-data tới POST http://127.0.0.1:3900/profiles
   */
  _uploadCloneProfileToVoiceStudio({ refAudioPath, name, language = 'Auto', refText = '', personality = '' }) {
    return new Promise((resolve, reject) => {
      const boundary = `----VBSVoiceBoundary${Date.now().toString(16)}`;
      const fileName = path.basename(refAudioPath);
      const ext = path.extname(fileName).toLowerCase();
      const mimeType = ext === '.mp3' ? 'audio/mpeg' : (ext === '.flac' ? 'audio/flac' : 'audio/wav');
      const fileBuffer = fs.readFileSync(refAudioPath);

      const parts = [];
      const addField = (fieldName, val) => {
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${val}\r\n`,
          'utf8'
        ));
      };

      addField('name', String(name || 'VBS_Voice').trim());
      addField('kind', 'clone');
      addField('language', String(language || 'Auto').trim());
      if (refText && String(refText).trim()) {
        addField('ref_text', String(refText).trim());
      }
      if (personality && String(personality).trim()) {
        addField('personality', String(personality).trim());
      }

      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="ref_audio"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
        'utf8'
      ));
      parts.push(fileBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

      const bodyBuffer = Buffer.concat(parts);
      const urlObj = new URL(`${this.rootUrl}/profiles`);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        },
        timeout: 45000
      }, (res) => {
        let resBody = '';
        res.on('data', chunk => { resBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(resBody));
            } catch {
              reject(new Error('Phản hồi /profiles không phải JSON hợp lệ.'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${resBody.slice(0, 200)}`));
          }
        });
      });

      req.on('timeout', () => req.destroy(new Error('Timeout khi đăng ký profile VoiceStudio')));
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });
  }

  /**
   * Chuẩn bị trước kết nối VoiceStudio + đồng bộ profile giọng mẫu 1 lần duy nhất trước khi chạy đa luồng
   */
  async prepareSessionForBatch({ voice = 'omnivoice', refAudio = null, language = null, model = null, speed = null } = {}) {
    let matchedProfile = null;
    if (voice) {
      const manager = this._getProfileManager();
      if (manager) {
        matchedProfile = manager.getProfile(voice);
        if (matchedProfile) {
          if (!refAudio && matchedProfile.samplePath && fs.existsSync(matchedProfile.samplePath)) {
            refAudio = matchedProfile.samplePath;
          }
          if (!language && matchedProfile.language) {
            language = matchedProfile.language;
          }
          if (!model && matchedProfile.model) {
            model = matchedProfile.model;
          }
          if (speed === null || speed === undefined) {
            speed = matchedProfile.speed || 1.0;
          }
        }
      }
    }

    const hw = this.syncOptimalHardwareEnv();
    let isVoiceStudioReady = false;
    try {
      isVoiceStudioReady = await this.ensureVoiceStudioRunning(15000);
    } catch {}

    let effectiveVoice = voice || 'default';
    if (isVoiceStudioReady && refAudio && fs.existsSync(refAudio)) {
      const vsProfileId = await this._ensureVoiceStudioCloneProfile({
        profile: matchedProfile,
        refAudio,
        name: matchedProfile?.name || voice || 'VBS_Clone',
        language: language || matchedProfile?.language || 'Auto',
        existingVsProfileId: matchedProfile?.vsProfileId || null
      });
      if (vsProfileId) {
        effectiveVoice = vsProfileId;
      }
    }

    return {
      isVoiceStudioReady,
      effectiveVoice,
      refAudio,
      language,
      model: model || this.defaultModel || 'omnivoice',
      speed: Number(speed) || 1.0,
      matchedProfile,
      hw,
      recommendedConcurrency: isVoiceStudioReady ? hw.vsClientConcurrency : hw.fallbackConcurrency
    };
  }

  /**
   * Sinh giọng nói từ văn bản (Text-to-Speech hoặc Voice Clone)
   */
  async generateSpeech({
    text,
    voice = 'omnivoice',
    refAudio = null,
    model = null,
    speed = null,
    language = null,
    responseFormat = 'mp3',
    outputPath,
    skipPrecheck = false,
    forceVoiceStudioReady = null,
    preResolvedVoiceId = null
  }) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new Error('Nội dung văn bản (text) không được để trống.');
    }
    if (!outputPath) {
      throw new Error('Đường dẫn file đích (outputPath) không được để trống.');
    }

    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let matchedProfile = null;
    if (voice && !skipPrecheck) {
      const manager = this._getProfileManager();
      if (manager) {
        matchedProfile = manager.getProfile(voice);
        if (matchedProfile) {
          if (!refAudio && matchedProfile.samplePath && fs.existsSync(matchedProfile.samplePath)) {
            refAudio = matchedProfile.samplePath;
          }
          if (!language && matchedProfile.language) {
            language = matchedProfile.language;
          }
          if (!model && matchedProfile.model) {
            model = matchedProfile.model;
          }
          if (speed === null || speed === undefined) {
            speed = matchedProfile.speed || 1.0;
          }
        }
      }
    }

    const effectiveModel = model || this.defaultModel || 'omnivoice';
    const effectiveSpeed = Number(speed) || 1.0;

    // 1. ƯU TIÊN SỐ 1: GỌI TRỰC TIẾP VOICESTUDIO API (PORT 3900)
    let isVoiceStudioReady = false;
    if (typeof forceVoiceStudioReady === 'boolean') {
      isVoiceStudioReady = forceVoiceStudioReady;
    } else if (skipPrecheck) {
      const h = await this.checkHealth({ useCache: true });
      isVoiceStudioReady = Boolean(h.online);
    } else {
      try {
        isVoiceStudioReady = await this.ensureVoiceStudioRunning(12000);
      } catch {}
    }

    if (isVoiceStudioReady) {
      try {
        let effectiveVoice = preResolvedVoiceId || voice || 'default';
        if (!preResolvedVoiceId && refAudio && fs.existsSync(refAudio)) {
          const vsProfileId = await this._ensureVoiceStudioCloneProfile({
            profile: matchedProfile,
            refAudio,
            name: matchedProfile?.name || voice || 'VBS_Clone',
            language: language || matchedProfile?.language || 'Auto',
            existingVsProfileId: matchedProfile?.vsProfileId || null
          });
          if (vsProfileId) {
            effectiveVoice = vsProfileId;
          }
        }

        const result = await this._callVoiceStudioApi({
          text: text.trim(),
          voice: effectiveVoice,
          refAudio,
          model: effectiveModel,
          speed: effectiveSpeed,
          language,
          responseFormat,
          outputPath
        });
        if (result && result.success && fs.existsSync(outputPath)) {
          const stat = fs.statSync(outputPath);
          return {
            success: true,
            outputPath,
            sizeBytes: stat.size,
            engine: 'VoiceStudio'
          };
        }
      } catch (vsErr) {
        console.warn(`[VoiceStudio] Lỗi sinh giọng qua API (${vsErr.message}), kích hoạt cơ chế dự phòng...`);
      }
    }

    // 2. DỰ PHÒNG TẦNG CỨU HỘ: NẾU VOICESTUDIO ĐANG KHỞI TẠO HOẶC CHỜ SETUP RUNTIME
    try {
      return await this._generateViaFallbackTts({
        text: text.trim(),
        voice: matchedProfile?.name || voice,
        language,
        speed: effectiveSpeed,
        outputPath
      });
    } catch (fallbackErr) {
      throw new Error(`Lỗi sinh giọng nói: Không thể gọi VoiceStudio và tầng dự phòng thất bại (${fallbackErr.message})`);
    }
  }

  /**
   * Tìm đường dẫn thực thi FFmpeg để chuẩn hóa định dạng WAV chuẩn PCM
   */
  _resolveFfmpegBinary() {
    const candidates = [
      process.env.FFMPEG_PATH,
      path.resolve(__dirname, '../../../../resources/ffmpeg/win-x64/ffmpeg.exe'),
      path.resolve(__dirname, '../../../../resources/ffmpeg/win32-x64/ffmpeg.exe'),
      path.resolve(process.cwd(), 'resources', 'ffmpeg', 'win-x64', 'ffmpeg.exe'),
      path.resolve(process.cwd(), 'resources', 'ffmpeg', 'win32-x64', 'ffmpeg.exe'),
      'D:\\ZC_TEAM\\TOOL_ZC_TEAM\\resources\\ffmpeg\\win-x64\\ffmpeg.exe',
      'ffmpeg'
    ].filter(Boolean);
    return candidates.find(c => c === 'ffmpeg' || fs.existsSync(c)) || 'ffmpeg';
  }

  /**
   * Gọi API chuẩn OpenAI format của VoiceStudio (POST /v1/audio/speech)
   * Có cơ chế tự động chờ và thử lại khi GPU Pool báo bận (HTTP 429 / 503 Retry-After)
   */
  async _callVoiceStudioApi({ text, voice, refAudio, model, speed, language, responseFormat, outputPath }) {
    const speechUrl = `${this.baseUrl}/audio/speech`;
    const isWavOut = path.extname(String(outputPath || '')).toLowerCase() === '.wav';
    const effectiveFormat = isWavOut ? 'wav' : (responseFormat || 'mp3');

    const requestBody = {
      model: model || 'omnivoice',
      input: text,
      voice: voice || 'default',
      speed: Number(speed) || 1.0,
      response_format: effectiveFormat
    };

    if (language && String(language).toLowerCase() !== 'auto') {
      requestBody.language = String(language).trim();
    }

    if (refAudio && fs.existsSync(refAudio)) {
      requestBody.reference_audio = refAudio;
    }

    const payload = JSON.stringify(requestBody);
    const urlObj = new URL(speechUrl);

    for (let attempt = 1; attempt <= 6; attempt++) {
      try {
        const res = await new Promise((resolve, reject) => {
          const client = urlObj.protocol === 'https:' ? https : http;
          const req = client.request({
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload)
            },
            timeout: this.timeoutMs
          }, (response) => {
            if (response.statusCode === 429 || response.statusCode === 503) {
              let errBody = '';
              response.on('data', chunk => { errBody += chunk; });
              response.on('end', () => {
                const retryHeader = Number(response.headers?.['retry-after']) || 3;
                const busyErr = new Error(`GPU Pool bận (${response.statusCode}): ${errBody.slice(0, 180)}`);
                busyErr.retryable = true;
                busyErr.retryDelayMs = Math.min(8000, Math.max(1200, retryHeader * 500));
                reject(busyErr);
              });
              return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
              let errBody = '';
              response.on('data', chunk => { errBody += chunk; });
              response.on('end', () => {
                reject(new Error(`VoiceStudio API trả về mã lỗi ${response.statusCode}: ${errBody.slice(0, 300)}`));
              });
              return;
            }

            const outStream = fs.createWriteStream(outputPath);
            response.pipe(outStream);

            outStream.on('finish', () => {
              outStream.close(() => {
                if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 512) {
                  resolve({ success: true, outputPath });
                } else {
                  reject(new Error('File âm thanh sinh ra từ VoiceStudio rỗng hoặc quá nhỏ.'));
                }
              });
            });

            outStream.on('error', reject);
          });

          req.on('timeout', () => {
            req.destroy(new Error(`VoiceStudio API hết hạn thời gian phản hồi (${this.timeoutMs}ms)`));
          });

          req.on('error', reject);
          req.write(payload);
          req.end();
        });
        return res;
      } catch (err) {
        if (err && err.retryable && attempt < 6) {
          await new Promise(r => setTimeout(r, err.retryDelayMs || 1500));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Tầng cứu hộ dự phòng trong trường hợp VoiceStudio chưa online
   */
  async _generateViaFallbackTts({ text, voice, language, speed, outputPath }) {
    const { IsomorphicCommunicate } = require('edge-tts-universal');
    const isWavOut = path.extname(String(outputPath || '')).toLowerCase() === '.wav';

    let edgeVoice = 'en-US-JennyNeural';
    const vLower = `${voice || ''} ${language || ''}`.toLowerCase();
    if (vLower.includes('ja') || vLower.includes('jp')) {
      edgeVoice = 'ja-JP-NanamiNeural';
    } else if (vLower.includes('es') || vLower.includes('mx') || vLower.includes('mexico') || vLower.includes('dona') || vLower.includes('elena')) {
      edgeVoice = (vLower.includes('padre') || vLower.includes('ong_gia') || vLower.includes('campo'))
        ? 'es-MX-JorgeNeural'
        : 'es-MX-DaliaNeural';
    } else if (vLower.includes('zh') || vLower.includes('cn')) {
      edgeVoice = 'zh-CN-XiaoxiaoNeural';
    } else if (vLower.includes('vi') || vLower.includes('hoaimy') || vLower.includes('namminh')) {
      edgeVoice = (vLower.includes('nam') || vLower.includes('minh') || vLower.includes('male'))
        ? 'vi-VN-NamMinhNeural'
        : 'vi-VN-HoaiMyNeural';
    } else if (vLower.includes('en') || vLower.includes('eng') || vLower.includes('us') || vLower.includes('homeless') || vLower.includes('daden')) {
      edgeVoice = (vLower.includes('gus') || vLower.includes('ong_gia') || vLower.includes('dad') || vLower.includes('romance') || vLower.includes('midnight') || vLower.includes('daden'))
        ? 'en-US-ChristopherNeural'
        : 'en-US-JennyNeural';
    }

    const ratePct = Math.round(((Number(speed) || 1.0) - 1.0) * 100);
    const rateStr = (ratePct >= 0 ? '+' : '') + ratePct + '%';
    const cleanText = text.replace(/\[[a-zA-Z0-9_\-: ]+\]/g, '').replace(/\s+/g, ' ').trim();

    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const comm = new IsomorphicCommunicate(cleanText, {
          voice: edgeVoice,
          rate: rateStr
        });
        const chunks = [];
        for await (const chunk of comm.stream()) {
          if (chunk.type === 'audio' && chunk.data) {
            chunks.push(Buffer.from(chunk.data));
          }
        }
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 512) {
          if (isWavOut) {
            const tmpMp3 = `${outputPath}.tmp_${Date.now()}.mp3`;
            fs.writeFileSync(tmpMp3, buffer);
            try {
              const ffmpegBin = this._resolveFfmpegBinary();
              execFileSync(ffmpegBin, [
                '-y', '-hide_banner', '-loglevel', 'error',
                '-i', tmpMp3,
                '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le',
                outputPath
              ], { timeout: 30000, windowsHide: true });
            } finally {
              try { if (fs.existsSync(tmpMp3)) fs.unlinkSync(tmpMp3); } catch {}
            }
          } else {
            fs.writeFileSync(outputPath, buffer);
          }
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 512) {
            return {
              success: true,
              outputPath,
              sizeBytes: fs.statSync(outputPath).size,
              engine: 'Fallback-Universal'
            };
          }
        }
      } catch (err) {
        lastErr = err;
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // Tầng cứu hộ Offline 100% qua Windows SAPI (System.Speech.Synthesis) khi không có mạng hoặc Edge-TTS bị 403
    if (process.platform === 'win32') {
      try {
        const sapiRate = Math.max(-5, Math.min(5, Math.round(((Number(speed) || 1.0) - 1.0) * 10)));
        const b64Text = Buffer.from(cleanText, 'utf8').toString('base64');
        const b64Out = Buffer.from(path.resolve(outputPath), 'utf8').toString('base64');
        const psScript = [
          'Add-Type -AssemblyName System.Speech;',
          '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
          `$synth.Rate = ${sapiRate};`,
          `$txt = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64Text}'));`,
          `$out = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64Out}'));`,
          '$synth.SetOutputToWaveFile($out);',
          '$synth.Speak($txt);',
          '$synth.Dispose();'
        ].join(' ');
        execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
          timeout: 45000,
          windowsHide: true
        });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 512) {
          return {
            success: true,
            outputPath,
            sizeBytes: fs.statSync(outputPath).size,
            engine: 'Windows-SAPI-Offline'
          };
        }
      } catch (sapiErr) {
        lastErr = sapiErr;
      }
    }

    throw lastErr || new Error('Không nhận được luồng âm thanh dự phòng.');
  }

  /**
   * Dọn sạch toàn bộ file tạm & bộ nhớ đệm (Disk Cache + RAM/VRAM) của VoiceStudio sau khi tạo xong file .wav
   */
  async cleanupVoiceCaches({ scriptDir = null, unloadModel = false } = {}) {
    // 1. Dọn sạch thư mục tạm .voice_chunks_* và concat_list_*.txt trong thư mục kịch bản (nếu có)
    if (scriptDir && fs.existsSync(scriptDir)) {
      try {
        const entries = fs.readdirSync(scriptDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(scriptDir, entry.name);
          if (entry.isDirectory() && entry.name.startsWith('.voice_chunks_')) {
            try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch {}
          } else if (entry.isFile() && (/^concat_list_\d+\.txt$/i.test(entry.name) || entry.name.startsWith('.vbs_voice_tmp_'))) {
            try { fs.unlinkSync(fullPath); } catch {}
          }
        }
      } catch {}
    }

    // 2. Dọn sạch các file tạm nghe thử cũ trong os.tmpdir()
    try {
      const tmpRoot = os.tmpdir();
      const tmpEntries = fs.readdirSync(tmpRoot, { withFileTypes: true });
      const now = Date.now();
      for (const entry of tmpEntries) {
        if (entry.isFile() && entry.name.startsWith('vbs_voice_test_')) {
          const full = path.join(tmpRoot, entry.name);
          try {
            const st = fs.statSync(full);
            if (now - st.mtimeMs > 60000) fs.unlinkSync(full);
          } catch {}
        } else if (entry.isDirectory() && entry.name.startsWith('vbs_voice_chunks_')) {
          try { fs.rmSync(path.join(tmpRoot, entry.name), { recursive: true, force: true }); } catch {}
        }
      }
    } catch {}

    // 3. Dọn sạch các file âm thanh rác sinh ra trong %APPDATA%\OmniVoice\outputs, preview, dub_jobs
    try {
      const omniDataDir = process.env.OMNIVOICE_DATA_DIR || path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'OmniVoice');
      for (const sub of ['outputs', 'preview', 'dub_jobs']) {
        const subDir = path.join(omniDataDir, sub);
        if (!fs.existsSync(subDir)) continue;
        const items = fs.readdirSync(subDir, { withFileTypes: true });
        for (const item of items) {
          // Giữ lại thư mục marketplace / voice_gallery rỗng nhưng xóa toàn bộ file audio sinh ra
          const itemPath = path.join(subDir, item.name);
          if (item.isFile()) {
            try { fs.unlinkSync(itemPath); } catch {}
          } else if (item.isDirectory() && sub === 'dub_jobs') {
            try { fs.rmSync(itemPath, { recursive: true, force: true }); } catch {}
          }
        }
      }
    } catch {}

    // 4. Gọi API giải phóng RAM / GPU VRAM trên VoiceStudio
    try {
      const health = await this.checkHealth({ useCache: true });
      if (health.online) {
        await this._httpPostEmpty(`${this.rootUrl}/system/flush-memory?unload_model=${unloadModel ? 'true' : 'false'}`, 4000);
      }
    } catch {}
  }

  /**
   * Helper gửi HTTP POST rỗng
   */
  _httpPostEmpty(targetUrl, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(targetUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: { 'Content-Length': 0 },
        timeout: timeoutMs
      }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('timeout', () => req.destroy(new Error(`Timeout ${timeoutMs}ms`)));
      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Helper gửi HTTP GET JSON
   */
  _httpGetJson(targetUrl, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(targetUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.get({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        timeout: timeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
          }
        });
      });

      req.on('timeout', () => req.destroy(new Error(`Timeout ${timeoutMs}ms`)));
      req.on('error', reject);
    });
  }
}

module.exports = { VoiceStudioService };
