'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app } = require('electron');
const { ensureDirectory } = require('./path-utils');

function resourceRoot() {
  return app?.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../resources');
}

function venvPythonPath(venvPath) {
  return process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options.spawnOptions
    });
    let stdout = '';
    let stderr = '';
    let aborted = false;

    options.onSpawn?.(child);
    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    const abort = () => {
      aborted = true;
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          shell: false,
          stdio: 'ignore'
        });
      } else {
        try { child.kill('SIGTERM'); } catch {}
      }
    };
    if (typeof options.signal?.addEventListener === 'function') {
      options.signal.addEventListener('abort', abort, { once: true });
    }

    child.on('error', (error) => {
      if (typeof options.signal?.removeEventListener === 'function') {
        options.signal.removeEventListener('abort', abort);
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (typeof options.signal?.removeEventListener === 'function') {
        options.signal.removeEventListener('abort', abort);
      }
      if (aborted || options.signal?.aborted) {
        const error = new Error('Đã hủy tạo SRT.');
        error.code = 'ABORTED';
        reject(error);
        return;
      }
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const tail = String(stderr || stdout).split(/\r?\n/).filter(Boolean).slice(-10).join('\n');
      const error = new Error(`Tạo SRT thất bại với mã ${code}.${tail ? `\n${tail}` : ''}`);
      error.code = 'WHISPER_SRT_FAILED';
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function commandWorks(command, args) {
  try {
    await run(command, args);
    return true;
  } catch {
    return false;
  }
}

async function pythonVersion(command, argsPrefix = []) {
  try {
    const result = await run(command, [...argsPrefix, '--version']);
    const text = `${result.stdout || ''}\n${result.stderr || ''}`;
    const match = text.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i);
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), text: match[0] };
  } catch {
    return null;
  }
}

async function pythonHasModule(command, moduleName, argsPrefix = []) {
  try {
    await run(command, [...argsPrefix, '-c', `import ${moduleName}`]);
    return true;
  } catch {
    return false;
  }
}

function isSupportedWhisperPython(version) {
  return Boolean(version && version.major === 3 && version.minor >= 10 && version.minor <= 12);
}

function isCorruptWhisperModelError(error) {
  const text = [error?.message, error?.stderr, error?.stdout].filter(Boolean).join('\n');
  return /Invalid string length in model\.bin|model\.bin.*(invalid|corrupt|failed)|Unable to open file.*model\.bin/i.test(text);
}

function pythonCandidateScore(filePath) {
  const match = String(filePath || '').match(/Python3(\d+)/i);
  const minor = match ? Number(match[1]) : 99;
  const preferred = [11, 12, 10];
  const index = preferred.indexOf(minor);
  return index === -1 ? 100 + minor : index;
}

function existingPythonCandidates() {
  if (process.platform !== 'win32') return [];
  const roots = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python'),
    path.join(process.env.ProgramFiles || '', 'Python311'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Python311')
  ].filter(Boolean);
  const candidates = [];
  for (const root of roots) {
    try {
      if (path.basename(root).toLowerCase().startsWith('python') && fs.existsSync(path.join(root, 'python.exe'))) {
        candidates.push(path.join(root, 'python.exe'));
        continue;
      }
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (entry.isDirectory() && /^Python3\d+$/i.test(entry.name)) {
          candidates.push(path.join(root, entry.name, 'python.exe'));
        }
      }
    } catch {}
  }
  return [...new Set(candidates)].sort((a, b) => pythonCandidateScore(a) - pythonCandidateScore(b));
}

function whisperModelCacheFragments(model = 'small') {
  const text = String(model || 'small').trim();
  const base = text.includes('/') ? text.split('/').pop() : text;
  return [...new Set([
    base,
    `faster-whisper-${base}`,
    text.replace(/[\\/]+/g, '--')
  ].filter(Boolean).map((item) => item.toLocaleLowerCase('en-US')))];
}

function defaultHuggingFaceCacheRoots(env = process.env) {
  const home = env.USERPROFILE || os.homedir();
  const xdg = env.XDG_CACHE_HOME || (home ? path.join(home, '.cache') : '');
  return [
    env.HUGGINGFACE_HUB_CACHE,
    env.TRANSFORMERS_CACHE,
    env.HF_HOME ? path.join(env.HF_HOME, 'hub') : '',
    xdg ? path.join(xdg, 'huggingface', 'hub') : ''
  ].filter(Boolean);
}

class WhisperSrtService {
  constructor({ paths, ffmpegService, maxConcurrentGenerations = 1 } = {}) {
    this.paths = paths || {};
    this.ffmpeg = ffmpegService || null;
    this.root = path.join(this.paths.cache || path.resolve(process.cwd(), '.vbs-user-data', 'cache'), 'whisper-srt');
    this.venvPath = path.join(this.root, 'venv');
    this.scriptPath = path.join(resourceRoot(), 'whisper-srt', 'generate_srt.py');
    this.requirementsPath = path.join(resourceRoot(), 'whisper-srt', 'requirements.txt');
    this.installMarkerPath = path.join(this.root, 'requirements-installed.txt');
    this.ensurePromise = null;
    this.maxConcurrentGenerations = Math.max(1, Math.round(Number(maxConcurrentGenerations || 1)));
    this.activeGenerations = 0;
    this.generationQueue = [];
  }

  setConcurrency(value) {
    const previous = this.maxConcurrentGenerations;
    this.maxConcurrentGenerations = Math.max(1, Math.min(16, Math.round(Number(value || 1))));
    this.drainGenerationQueue();
    return previous;
  }

  async resolvePython(callbacks = {}) {
    if (process.env.VBS_PYTHON_PATH) {
      const version = await pythonVersion(process.env.VBS_PYTHON_PATH);
      if (isSupportedWhisperPython(version)) return { command: process.env.VBS_PYTHON_PATH, argsPrefix: [] };
      throw Object.assign(
        new Error(`VBS_PYTHON_PATH đang trỏ tới ${version?.text || 'Python không hợp lệ'}. Whisper SRT cần Python 3.10-3.12, khuyến nghị 3.11.`),
        { code: 'PYTHON_UNSUPPORTED' }
      );
    }
    for (const candidate of existingPythonCandidates()) {
      const version = await pythonVersion(candidate);
      if (isSupportedWhisperPython(version)) return { command: candidate, argsPrefix: [] };
      if (version) callbacks.onLog?.(`Whisper SRT: bỏ qua ${version.text}; cần Python 3.10-3.12.`);
    }
    if (process.platform === 'win32') {
      for (const minor of ['3.11', '3.12', '3.10']) {
        const version = await pythonVersion('py.exe', [`-${minor}`]);
        if (isSupportedWhisperPython(version)) return { command: 'py.exe', argsPrefix: [`-${minor}`] };
      }
      const version = await pythonVersion('py.exe', ['-3']);
      if (version) callbacks.onLog?.(`Whisper SRT: py.exe mặc định là ${version.text}; cần Python 3.10-3.12.`);
    }
    for (const command of ['python.exe', 'python', 'python3']) {
      const version = await pythonVersion(command);
      if (isSupportedWhisperPython(version)) return { command, argsPrefix: [] };
      if (version) callbacks.onLog?.(`Whisper SRT: bỏ qua ${version.text}; cần Python 3.10-3.12.`);
    }
    if (process.platform === 'win32' && await this.installPythonWithWinget(callbacks)) {
      for (const candidate of existingPythonCandidates()) {
        const version = await pythonVersion(candidate);
        if (isSupportedWhisperPython(version)) return { command: candidate, argsPrefix: [] };
      }
      const py311 = await pythonVersion('py.exe', ['-3.11']);
      if (isSupportedWhisperPython(py311)) return { command: 'py.exe', argsPrefix: ['-3.11'] };
      const pythonExe = await pythonVersion('python.exe');
      if (isSupportedWhisperPython(pythonExe)) return { command: 'python.exe', argsPrefix: [] };
    }
    throw Object.assign(
      new Error('Không tìm thấy Python 3.10-3.12 để tạo SRT. Ứng dụng đã thử tự cài Python 3.11 bằng winget nhưng không thành công. Cài Python 3.11 hoặc đặt VBS_PYTHON_PATH rồi chạy lại.'),
      { code: 'PYTHON_NOT_FOUND' }
    );
  }

  async installPythonWithWinget(callbacks = {}) {
    if (!await commandWorks('winget.exe', ['--version'])) return false;
    callbacks.onLog?.('Whisper SRT: không thấy Python, đang tự cài Python 3.11 bằng winget.');
    try {
      await run('winget.exe', [
        'install',
        '-e',
        '--id',
        'Python.Python.3.11',
        '--scope',
        'user',
        '--silent',
        '--accept-package-agreements',
        '--accept-source-agreements'
      ], {
        onStdout: (text) => {
          const trimmed = text.trim();
          if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
        },
        onStderr: (text) => {
          const trimmed = text.trim();
          if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
        }
      });
      return true;
    } catch (error) {
      callbacks.onLog?.(`Whisper SRT: cài Python bằng winget thất bại (${error.message}).`);
      return false;
    }
  }

  requirementsText() {
    return fs.readFileSync(this.requirementsPath, 'utf8').trim();
  }

  managedHuggingFaceEnv() {
    const hfHome = ensureDirectory(path.join(this.root, 'huggingface'));
    const hfHub = ensureDirectory(path.join(hfHome, 'hub'));
    return {
      HF_HOME: hfHome,
      HUGGINGFACE_HUB_CACHE: hfHub,
      HF_HUB_DISABLE_SYMLINKS_WARNING: '1'
    };
  }

  clearWhisperModelCache(model = 'small', callbacks = {}) {
    const fragments = whisperModelCacheFragments(model);
    const roots = [...new Set([
      path.join(this.root, 'huggingface', 'hub'),
      ...defaultHuggingFaceCacheRoots(process.env)
    ])];
    let removed = 0;
    for (const root of roots) {
      let entries = [];
      try {
        if (!fs.existsSync(root)) continue;
        entries = fs.readdirSync(root, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const lower = entry.name.toLocaleLowerCase('en-US');
        if (!fragments.some((fragment) => lower.includes(fragment))) continue;
        const target = path.join(root, entry.name);
        try {
          fs.rmSync(target, { recursive: true, force: true });
          removed += 1;
          callbacks.onLog?.(`Whisper SRT: đã xóa cache model lỗi ${entry.name}.`);
        } catch (error) {
          callbacks.onLog?.(`Whisper SRT: không xóa được cache model ${entry.name} (${error.message}).`);
        }
      }
    }
    return removed;
  }

  static _globalEnsurePromises = new Map();

  async ensureReady(callbacks = {}) {
    const key = path.resolve(this.venvPath || 'default-venv');
    if (!WhisperSrtService._globalEnsurePromises) {
      WhisperSrtService._globalEnsurePromises = new Map();
    }
    if (WhisperSrtService._globalEnsurePromises.has(key)) {
      return WhisperSrtService._globalEnsurePromises.get(key);
    }
    const promise = this._ensureReady(callbacks).finally(() => {
      WhisperSrtService._globalEnsurePromises.delete(key);
    });
    WhisperSrtService._globalEnsurePromises.set(key, promise);
    return promise;
  }

  async _ensureReady(callbacks = {}) {
    ensureDirectory(this.root);
    if (!fs.existsSync(this.scriptPath)) {
      throw Object.assign(new Error(`Thiếu script tạo SRT: ${this.scriptPath}`), { code: 'WHISPER_SCRIPT_MISSING' });
    }
    const venvPython = venvPythonPath(this.venvPath);
    const venvReadyMarker = path.join(this.venvPath, 'venv-ready.marker');
    let isVenvComplete = fs.existsSync(venvPython) && fs.existsSync(venvReadyMarker);

    if (isVenvComplete) {
      const venvVersion = await pythonVersion(venvPython);
      if (!isSupportedWhisperPython(venvVersion)) {
        callbacks.onLog?.(`Whisper SRT: venv hiện tại dùng ${venvVersion?.text || 'Python không hợp lệ'}, sẽ tạo lại bằng Python 3.10-3.12.`);
        try { fs.rmSync(this.venvPath, { recursive: true, force: true }); } catch {}
        try { fs.rmSync(this.installMarkerPath, { force: true }); } catch {}
        isVenvComplete = false;
      }
    }

    if (!isVenvComplete) {
      const basePython = await this.resolvePython(callbacks);
      callbacks.onLog?.('Whisper SRT: tạo Python venv lần đầu.');
      try { fs.rmSync(this.venvPath, { recursive: true, force: true }); } catch {}
      try { fs.rmSync(this.installMarkerPath, { force: true }); } catch {}
      await run(basePython.command, [...basePython.argsPrefix, '-m', 'venv', this.venvPath], {
        onStderr: (text) => callbacks.onLog?.(text.trim())
      });

      // Kiểm tra pip trong venv, nếu chưa có thì nạp qua ensurepip
      const pipWorks = await commandWorks(venvPython, ['-m', 'pip', '--version']);
      if (!pipWorks) {
        callbacks.onLog?.('Whisper SRT: đang khởi tạo pip qua ensurepip...');
        await run(venvPython, ['-m', 'ensurepip', '--upgrade']).catch(() => {});
      }
      try { fs.writeFileSync(venvReadyMarker, 'READY', 'utf8'); } catch {}
    }

    const requirements = this.requirementsText();
    const installed = fs.existsSync(this.installMarkerPath)
      ? fs.readFileSync(this.installMarkerPath, 'utf8').trim()
      : '';
    const hasFasterWhisper = await pythonHasModule(venvPython, 'faster_whisper');
    const needsInstall = !hasFasterWhisper || installed !== requirements;

    if (needsInstall) {
      callbacks.onLog?.('Whisper SRT: phát hiện thiếu faster-whisper hoặc thư viện chưa sẵn sàng, đang tự động cài đặt qua pip...');
      await run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], {
        onStderr: (text) => {
          const trimmed = text.trim();
          if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
        }
      }).catch(() => {});

      let installedSuccessfully = false;
      try {
        await run(venvPython, ['-m', 'pip', 'install', '--only-binary=:all:', '-r', this.requirementsPath], {
          onStderr: (text) => {
            const trimmed = text.trim();
            if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
          }
        });
        installedSuccessfully = await pythonHasModule(venvPython, 'faster_whisper');
      } catch (binErr) {
        callbacks.onLog?.(`Whisper SRT: cài binary chưa xong (${binErr.message}), chuyển sang cài tiêu chuẩn...`);
      }

      if (!installedSuccessfully) {
        try {
          await run(venvPython, ['-m', 'pip', 'install', '-r', this.requirementsPath], {
            onStderr: (text) => {
              const trimmed = text.trim();
              if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
            }
          });
          installedSuccessfully = await pythonHasModule(venvPython, 'faster_whisper');
        } catch {}
      }

      if (!installedSuccessfully) {
        try {
          await run(venvPython, ['-m', 'pip', 'install', 'faster-whisper', 'numpy'], {
            onStderr: (text) => {
              const trimmed = text.trim();
              if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
            }
          });
          installedSuccessfully = await pythonHasModule(venvPython, 'faster_whisper');
        } catch {}
      }

      if (!installedSuccessfully) {
        throw Object.assign(
          new Error('Tự động cài đặt faster-whisper thất bại. Hãy kiểm tra kết nối internet hoặc dung lượng ổ đĩa rồi thử lại.'),
          { code: 'WHISPER_INSTALL_FAILED' }
        );
      }

      try {
        fs.writeFileSync(this.installMarkerPath, requirements, 'utf8');
        fs.writeFileSync(path.join(this.venvPath, 'requirements-installed.txt'), requirements, 'utf8');
      } catch {}
      callbacks.onLog?.('Whisper SRT: tự động cài đặt faster-whisper hoàn tất thành công.');
    }
    return { pythonPath: venvPython };
  }

  parseJsonLines(text, callbacks) {
    for (const line of String(text || '').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const payload = JSON.parse(trimmed);
        if (payload.event === 'runtime') {
          callbacks.onLog?.(
            `Whisper SRT: ${payload.device}/${payload.compute_type}` +
            (payload.gpu?.name ? ` · ${payload.gpu.name}` : '')
          );
        } else if (payload.event === 'fallback') {
          callbacks.onLog?.(`Whisper SRT: CUDA lỗi, fallback CPU (${payload.reason})`);
        } else if (payload.event === 'done') {
          const jsonNote = payload.json_output ? ` · JSON ${path.basename(payload.json_output)} · ${payload.words || 0} words` : '';
          callbacks.onLog?.(`Whisper SRT: đã tạo ${path.basename(payload.output)} · ${payload.cues} cues${jsonNote}`);
        } else if (payload.event === 'srt_rules') {
          callbacks.onLog?.(`Whisper SRT: rule ${payload.language || 'auto'} · ${payload.max_chars} ký tự · ${payload.max_dur}s`);
        } else if (payload.event === 'error') {
          callbacks.onLog?.(`Whisper SRT error: ${payload.message}`);
        }
      } catch {
        callbacks.onLog?.(trimmed);
      }
    }
  }

  async generate(options, callbacks = {}) {
    return new Promise((resolve, reject) => {
      this.generationQueue.push({ options, callbacks, resolve, reject });
      this.drainGenerationQueue();
    });
  }

  drainGenerationQueue() {
    while (this.activeGenerations < this.maxConcurrentGenerations && this.generationQueue.length) {
      const task = this.generationQueue.shift();
      this.activeGenerations += 1;
      this._generate(task.options, task.callbacks)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.activeGenerations = Math.max(0, this.activeGenerations - 1);
          this.drainGenerationQueue();
        });
    }
  }

  async _generate({ audioPath, outputPath, jsonOutputPath = null, preferJson = false, model = 'small', language = 'auto', maxChars = 38, maxDur = 4.2, signal }, callbacks = {}) {
    const ready = await this.ensureReady(callbacks);
    ensureDirectory(path.dirname(outputPath));
    callbacks.onLog?.(`${path.basename(audioPath)}: tạo SRT tự động bằng faster-whisper.`);
    const args = [
      this.scriptPath,
      '--audio', audioPath,
      '--output', outputPath,
      '--model', model,
      '--language', language,
      '--device', 'auto',
      '--compute-type', 'auto',
      '--max-chars', String(maxChars),
      '--max-dur', String(maxDur),
      ...(jsonOutputPath ? ['--json-output', jsonOutputPath] : []),
      ...(this.ffmpeg?.ffprobePath ? ['--ffprobe', this.ffmpeg.ffprobePath] : [])
    ];
    const env = {
      ...process.env,
      ...this.managedHuggingFaceEnv(),
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      VBS_FFMPEG_PATH: this.ffmpeg?.ffmpegPath || '',
      VBS_FFPROBE_PATH: this.ffmpeg?.ffprobePath || ''
    };
    const runWhisper = () => run(ready.pythonPath, args, {
      signal,
      spawnOptions: {
        env
      },
      onStdout: (text) => this.parseJsonLines(text, callbacks),
      onStderr: (text) => {
        const trimmed = text.trim();
        if (trimmed) callbacks.onLog?.(trimmed.split(/\r?\n/).slice(-1)[0]);
      }
    });
    try {
      await runWhisper();
    } catch (error) {
      if (!isCorruptWhisperModelError(error)) throw error;
      callbacks.onLog?.('Whisper SRT: model tải về bị lỗi, xóa cache model và tải lại một lần.');
      this.clearWhisperModelCache(model, callbacks);
      try { if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true }); } catch {}
      try { if (jsonOutputPath && fs.existsSync(jsonOutputPath)) fs.rmSync(jsonOutputPath, { force: true }); } catch {}
      await runWhisper();
    }
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 8) {
      throw Object.assign(new Error(`Không tạo được SRT: ${outputPath}`), { code: 'SRT_NOT_CREATED' });
    }
    if (jsonOutputPath && (!fs.existsSync(jsonOutputPath) || fs.statSync(jsonOutputPath).size < 8)) {
      throw Object.assign(new Error(`Không tạo được JSON subtitle: ${jsonOutputPath}`), { code: 'SUBTITLE_JSON_NOT_CREATED' });
    }
    if (preferJson && jsonOutputPath) return jsonOutputPath;
    return outputPath;
  }
}

module.exports = {
  WhisperSrtService,
  isSupportedWhisperPython,
  pythonCandidateScore,
  isCorruptWhisperModelError,
  whisperModelCacheFragments
};
