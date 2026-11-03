'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { resolveBinary, ensureDirectory } = require('./path-utils');

const FILTER_COMPLEX_SCRIPT_THRESHOLD = 6000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nullOutput() {
  return process.platform === 'win32' ? 'NUL' : '/dev/null';
}

function lastLines(value, count = 8) {
  return String(value || '').split(/\r?\n/).filter(Boolean).slice(-count).join('\n');
}

function terminateProcessTree(child, { graceMs = 700 } = {}) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    child.once('close', finish);
    try {
      if (child.stdin?.writable) child.stdin.write('q\n');
    } catch {}
    setTimeout(() => {
      if (child.exitCode !== null) return finish();
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          shell: false,
          stdio: 'ignore'
        });
        killer.once('close', () => setTimeout(finish, 150));
        killer.once('error', () => {
          try { child.kill('SIGKILL'); } catch {}
          setTimeout(finish, 150);
        });
      } else {
        try { child.kill('SIGTERM'); } catch {}
        setTimeout(() => {
          if (child.exitCode === null) {
            try { child.kill('SIGKILL'); } catch {}
          }
          finish();
        }, 900).unref();
      }
    }, graceMs).unref();
    setTimeout(finish, graceMs + 3000).unref();
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options.spawnOptions
    });
    let stdout = '';
    let stderr = '';
    let finished = false;
    let aborted = false;
    let resolved = false;
    options.onSpawn?.(child);

    // Tự động đóng stdin để FFmpeg không bao giờ bị nghẽn chờ lệnh từ bàn phím
    try { child.stdin?.on?.('error', () => {}); } catch {}
    try { child.stdout?.on?.('error', () => {}); } catch {}
    try { child.stderr?.on?.('error', () => {}); } catch {}
    try {
      if (child.stdin && typeof child.stdin.end === 'function') {
        child.stdin.end();
      }
    } catch {}

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
      if (finished) return;
      aborted = true;
      options.onAbort?.(child);
      terminateProcessTree(child, { graceMs: options.abortGraceMs ?? 700 }).catch(() => {});
    };
    if (typeof options.signal?.addEventListener === 'function') {
      options.signal.addEventListener('abort', abort, { once: true });
    }

    const finish = (code, signal) => {
      if (resolved) return;
      resolved = true;
      finished = true;
      if (typeof options.signal?.removeEventListener === 'function') {
        options.signal.removeEventListener('abort', abort);
      }
      options.onClose?.(child);
      if (aborted || options.signal?.aborted) {
        const error = new Error('Đã hủy render và giải phóng tiến trình FFmpeg.');
        error.code = 'ABORTED';
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }
      const details = lastLines(stderr || stdout, 12);
      const error = new Error(
        `Lệnh thất bại (${path.basename(command)}) với mã ${code ?? signal}.` +
        (details ? `\n${details}` : '')
      );
      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    };

    child.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      finished = true;
      if (typeof options.signal?.removeEventListener === 'function') {
        options.signal.removeEventListener('abort', abort);
      }
      options.onClose?.(child);
      reject(error);
    });

    child.on('close', (code, signal) => {
      finish(code, signal);
    });

    child.on('exit', (code, signal) => {
      // Khi tiến trình hệ điều hành đã thoát, nếu sự kiện 'close' bị kẹt pipe sau 1.2s, tự động ép kết thúc
      setTimeout(() => {
        if (!resolved) {
          finish(code ?? 0, signal);
        }
      }, 1200).unref?.();
    });
  });
}

function safeReadJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath, value) {
  if (!filePath) return;
  try {
    ensureDirectory(path.dirname(filePath));
    const temp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
    try {
      fs.renameSync(temp, filePath);
    } catch {
      try { fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8'); } catch {}
      try { fs.rmSync(temp, { force: true }); } catch {}
    }
  } catch {}
}

function ffmpegTempDir(processRegistryPath = null) {
  if (processRegistryPath) return ensureDirectory(path.dirname(processRegistryPath));
  return ensureDirectory(path.join(os.tmpdir(), 'video-batch-studio-ffmpeg'));
}

function materializeLongFfmpegArgs(args, {
  tempDir,
  threshold = FILTER_COMPLEX_SCRIPT_THRESHOLD
} = {}) {
  const next = [...(args || [])];
  const cleanupPaths = [];
  const root = ensureDirectory(tempDir || path.join(os.tmpdir(), 'video-batch-studio-ffmpeg'));
  for (let index = 0; index < next.length - 1; index += 1) {
    if (next[index] !== '-filter_complex') continue;
    const graph = String(next[index + 1] || '');
    if (graph.length <= threshold) continue;
    const scriptPath = path.join(
      root,
      `filter-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}.ffgraph`
    );
    fs.writeFileSync(scriptPath, graph, 'utf8');
    next[index] = '-filter_complex_script';
    next[index + 1] = scriptPath;
    cleanupPaths.push(scriptPath);
  }
  return { args: next, cleanupPaths };
}

function estimateArgChars(command, args = []) {
  return [command, ...(args || [])].filter(Boolean).join(' ').length;
}

function ffmpegArgDiagnostics(originalArgs = [], preparedArgs = originalArgs, command = 'ffmpeg') {
  const inputCount = originalArgs.filter((arg) => arg === '-i').length;
  const filterIndex = originalArgs.indexOf('-filter_complex');
  const scriptIndex = preparedArgs.indexOf('-filter_complex_script');
  const inlineGraph = filterIndex >= 0 ? String(originalArgs[filterIndex + 1] || '') : '';
  const outputPath = preparedArgs.length ? preparedArgs[preparedArgs.length - 1] : '';
  return {
    inputCount,
    inlineGraphLength: inlineGraph.length,
    usesFilterScript: scriptIndex >= 0,
    filterScriptPath: scriptIndex >= 0 ? preparedArgs[scriptIndex + 1] : null,
    originalArgChars: estimateArgChars(command, originalArgs),
    preparedArgChars: estimateArgChars(command, preparedArgs),
    outputPath
  };
}

function formatFfmpegDiagnostics(diag = {}) {
  const script = diag.usesFilterScript
    ? ` · filter_script=${diag.filterScriptPath}`
    : '';
  return (
    `FFmpeg diagnostics: inputs=${diag.inputCount} · ` +
    `filter_complex_chars=${diag.inlineGraphLength} · ` +
    `cmd_chars=${diag.originalArgChars}->${diag.preparedArgChars}` +
    `${script} · output=${diag.outputPath}`
  );
}

function resolveNvidiaSmi(savedPath = null) {
  const candidates = [
    savedPath,
    process.env.NVIDIA_SMI_PATH,
    process.platform === 'win32' ? 'C:\\Windows\\System32\\nvidia-smi.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe' : null,
    'nvidia-smi'
  ].filter(Boolean);
  return candidates.find((candidate) => candidate === 'nvidia-smi' || fs.existsSync(candidate)) || 'nvidia-smi';
}

function parseGpuCsv(stdout) {
  return String(stdout || '').split(/\r?\n/).filter(Boolean).map((line) => {
    const fields = line.split(',').map((value) => value.trim());
    return {
      index: Number(fields[0]),
      name: fields[1] || `NVIDIA GPU ${fields[0]}`,
      driverVersion: fields[2] || null,
      memoryTotalMb: Number(fields[3]) || 0,
      memoryFreeMb: Number(fields[4]) || 0,
      utilizationPercent: Number(fields[5]) || 0
    };
  }).filter((gpu) => Number.isInteger(gpu.index));
}

class FFmpegService {
  constructor(settings = {}) {
    this.ffmpegPath = resolveBinary('ffmpeg', 'FFMPEG_PATH', settings.ffmpegPath);
    this.ffprobePath = resolveBinary('ffprobe', 'FFPROBE_PATH', settings.ffprobePath);
    this.nvidiaSmiPath = resolveNvidiaSmi(settings.nvidiaSmiPath);
    this.processRegistryPath = settings.processRegistryPath || null;
    this.systemCache = null;
    this.systemCacheAt = 0;
    this.systemCacheTtlMs = Number(settings.systemCacheTtlMs || 300_000);
    this.activeChildren = new Map();
    this.activeRenderCount = 0;
    this.encoderTestPromises = new Map();
    this.initialized = false;
    this.initializationPromise = null;
  }

  _registryEntries() {
    return [...this.activeChildren.values()].map((entry) => ({
      pid: entry.pid,
      command: entry.command,
      startedAt: entry.startedAt
    }));
  }

  _persistRegistry() {
    if (this.processRegistryPath) safeWriteJson(this.processRegistryPath, this._registryEntries());
  }

  _registerChild(child, command) {
    if (!child?.pid) return;
    this.activeChildren.set(child.pid, {
      pid: child.pid,
      command: path.resolve(command),
      child,
      startedAt: Date.now()
    });
    this._persistRegistry();
  }

  _unregisterChild(child) {
    if (!child?.pid) return;
    this.activeChildren.delete(child.pid);
    this._persistRegistry();
  }

  async cancelAll() {
    const promises = [];
    for (const [pid, entry] of this.activeChildren.entries()) {
      if (entry?.child) {
        promises.push(terminateProcessTree(entry.child));
      }
    }
    await Promise.all(promises);
    this.activeChildren.clear();
    this._persistRegistry();
  }

  _run(command, args, options = {}) {
    const prepared = path.resolve(command) === path.resolve(this.ffmpegPath)
      ? materializeLongFfmpegArgs(args, { tempDir: ffmpegTempDir(this.processRegistryPath) })
      : { args, cleanupPaths: [] };
    options.onPrepared?.({
      ...ffmpegArgDiagnostics(args, prepared.args, command),
      cleanupPaths: prepared.cleanupPaths
    });
    return runProcess(command, prepared.args, {
      ...options,
      onSpawn: (child) => {
        this._registerChild(child, command);
        options.onSpawn?.(child);
      },
      onClose: (child) => {
        this._unregisterChild(child);
        options.onClose?.(child);
      }
    }).finally(() => {
      for (const filePath of prepared.cleanupPaths) {
        try { fs.rmSync(filePath, { force: true }); } catch {}
      }
    });
  }

  async _killRecordedWindowsProcess(entry) {
    if (!Number.isInteger(Number(entry.pid))) return;
    const ffmpegName = path.basename(this.ffmpegPath).replace(/'/g, "''");
    const script = [
      `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${Number(entry.pid)}\" -ErrorAction SilentlyContinue`,
      `if($p -and ([IO.Path]::GetFileName($p.ExecutablePath) -ieq '${ffmpegName}'))`,
      `{ Stop-Process -Id ${Number(entry.pid)} -Force -ErrorAction SilentlyContinue }`
    ].join('; ');
    try {
      await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    } catch {}
  }

  async cleanupOrphanProcesses() {
    if (!this.processRegistryPath) return { cleaned: 0 };
    const entries = safeReadJson(this.processRegistryPath, []);
    let cleaned = 0;
    for (const entry of entries) {
      const age = Date.now() - Number(entry.startedAt || 0);
      if (age < 0 || age > 24 * 60 * 60 * 1000) continue;
      if (process.platform === 'win32') {
        await this._killRecordedWindowsProcess(entry);
        cleaned += 1;
      } else {
        try {
          process.kill(Number(entry.pid), 'SIGKILL');
          cleaned += 1;
        } catch {}
      }
    }
    if (process.platform === 'win32') {
      const tempRoot = path.dirname(this.processRegistryPath).replace(/'/g, "''");
      const legacyScript = [
        `$root='${tempRoot}'`,
        `$items=Get-CimInstance Win32_Process -Filter "Name='ffmpeg.exe'" -ErrorAction SilentlyContinue`,
        `$items | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($root,[System.StringComparison]::OrdinalIgnoreCase) -ge 0 } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
      ].join('; ');
      try {
        await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', legacyScript]);
      } catch {}
    }
    safeWriteJson(this.processRegistryPath, []);
    return { cleaned };
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = (async () => {
      await this.cleanupOrphanProcesses();
      await this.ensureFfmpegInstalled();
      this.initialized = true;
    })();
    try {
      return await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  async _binaryWorks(command) {
    try {
      await runProcess(command, ['-hide_banner', '-version']);
      return true;
    } catch {
      return false;
    }
  }

  async ensureFfmpegInstalled() {
    const ffmpegOk = await this._binaryWorks(this.ffmpegPath);
    const ffprobeOk = await this._binaryWorks(this.ffprobePath);
    if (ffmpegOk && ffprobeOk) return { ok: true, installed: false };
    if (process.platform !== 'win32') return { ok: false, installed: false };

    try {
      await runProcess('winget', [
        'install',
        '--id',
        'Gyan.FFmpeg.Essentials',
        '--exact',
        '--silent',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity'
      ], { abortGraceMs: 2000 });
    } catch {
      return { ok: false, installed: false };
    }

    this.ffmpegPath = resolveBinary('ffmpeg', 'FFMPEG_PATH');
    this.ffprobePath = resolveBinary('ffprobe', 'FFPROBE_PATH');
    return {
      ok: await this._binaryWorks(this.ffmpegPath) && await this._binaryWorks(this.ffprobePath),
      installed: true
    };
  }

  async shutdown() {
    const children = [...this.activeChildren.values()].map((entry) => entry.child);
    await Promise.allSettled(children.map((child) => terminateProcessTree(child, { graceMs: 300 })));
    this.activeChildren.clear();
    this._persistRegistry();
  }

  async detectNvidiaGpus() {
    try {
      const { stdout } = await runProcess(this.nvidiaSmiPath, [
        '--query-gpu=index,name,driver_version,memory.total,memory.free,utilization.gpu',
        '--format=csv,noheader,nounits'
      ]);
      return parseGpuCsv(stdout);
    } catch {
      return [];
    }
  }

  async sampleNvidiaGpu(gpuIndex = 0) {
    try {
      const { stdout } = await runProcess(this.nvidiaSmiPath, [
        '--query-gpu=index,name,utilization.gpu,utilization.encoder,memory.used,memory.total',
        '--format=csv,noheader,nounits'
      ]);
      const rows = String(stdout || '').split(/\r?\n/).filter(Boolean).map((line) => {
        const fields = line.split(',').map((value) => value.trim());
        return {
          index: Number(fields[0]),
          name: fields[1] || `NVIDIA GPU ${fields[0]}`,
          utilizationPercent: Number(fields[2]) || 0,
          encoderUtilizationPercent: Number(fields[3]) || 0,
          memoryUsedMb: Number(fields[4]) || 0,
          memoryTotalMb: Number(fields[5]) || 0
        };
      }).filter((gpu) => Number.isInteger(gpu.index));
      return rows.find((gpu) => gpu.index === Number(gpuIndex)) || rows[0] || null;
    } catch {
      return null;
    }
  }

  async testEncoder(encoder, { gpuIndex = 0, retries = 2, retryDelayMs = 700, force = false } = {}) {
    const key = `${encoder}:${gpuIndex}`;
    if (!force && this.encoderTestPromises.has(key)) return this.encoderTestPromises.get(key);
    const promise = (async () => {
      const output = nullOutput();
      let lastError = null;
      for (let attempt = 1; attempt <= Math.max(1, retries); attempt += 1) {
        const args = [
          '-hide_banner', '-loglevel', 'error',
          '-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=30:d=0.25',
          '-an', '-frames:v', '6', '-pix_fmt', 'yuv420p', '-c:v', encoder
        ];
        if (encoder === 'h264_nvenc' || encoder === 'hevc_nvenc') {
          args.push('-gpu', String(gpuIndex), '-preset', 'p2', '-bf', '0', '-rc', 'constqp', '-qp', '28');
        }
        args.push('-f', 'null', output);
        try {
          await this._run(this.ffmpegPath, args);
          return { ok: true, encoder, gpuIndex, attempts: attempt };
        } catch (error) {
          lastError = error;
          if (attempt < retries) {
            await this.cleanupOrphanProcesses().catch(() => {});
            await sleep(retryDelayMs * attempt);
          }
        }
      }
      return { ok: false, encoder, gpuIndex, attempts: retries, error: lastLines(lastError?.stderr || lastError?.message, 12) };
    })();
    this.encoderTestPromises.set(key, promise);
    try { return await promise; }
    finally { this.encoderTestPromises.delete(key); }
  }

  async testCudaPipeline({ gpuIndex = 0 } = {}) {
    const output = nullOutput();
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-init_hw_device', `cuda=gpu:${gpuIndex}`,
      '-filter_hw_device', 'gpu',
      '-f', 'lavfi', '-i', 'color=c=black:s=128x72:d=0.12',
      '-vf', 'format=nv12,hwupload_cuda,scale_cuda=128:72:format=nv12',
      '-frames:v', '2',
      '-c:v', 'h264_nvenc', '-gpu', String(gpuIndex), '-preset', 'p1', '-bf', '0',
      '-f', 'null', output
    ];
    try {
      await this._run(this.ffmpegPath, args);
      return { ok: true, gpuIndex };
    } catch (error) {
      return { ok: false, gpuIndex, error: lastLines(error.stderr || error.message, 10) };
    }
  }

  async _checkSystemImpl({ force = false, gpuIndex = -1 } = {}) {
    await this.initialize();
    const requestedGpu = Number.isFinite(Number(gpuIndex)) ? Number(gpuIndex) : -1;
    const cacheKey = String(requestedGpu);
    if (!force && this.systemCache?.cacheKey === cacheKey && Date.now() - this.systemCacheAt < this.systemCacheTtlMs) {
      return this.systemCache.value;
    }
    if (this.activeRenderCount > 0 && this.systemCache) return this.systemCache.value;

    const result = {
      ffmpegPath: this.ffmpegPath,
      ffprobePath: this.ffprobePath,
      nvidiaSmiPath: this.nvidiaSmiPath,
      ffmpegOk: false,
      ffprobeOk: false,
      h264Nvenc: false,
      hevcNvenc: false,
      nvencRuntime: false,
      h264NvencRuntime: false,
      hevcNvencRuntime: false,
      nvencPotential: false,
      cudaCompiled: false,
      cudaAvailable: false,
      cudaRecommended: false,
      scaleCuda: false,
      chromakeyCuda: false,
      overlayCuda: false,
      libass: false,
      gpuIndex: requestedGpu,
      selectedGpuIndex: requestedGpu >= 0 ? requestedGpu : 0,
      selectedGpuName: null,
      autoSelected: requestedGpu < 0,
      gpus: [],
      nvencTests: [],
      recommendedAcceleration: 'CPU',
      recommendedCodec: 'libx264',
      details: []
    };

    try {
      const version = await this._run(this.ffmpegPath, ['-hide_banner', '-version']);
      result.ffmpegOk = true;
      result.details.push(version.stdout.split(/\r?\n/)[0]);
      const [encoders, filters, hwaccels] = await Promise.all([
        this._run(this.ffmpegPath, ['-hide_banner', '-encoders']),
        this._run(this.ffmpegPath, ['-hide_banner', '-filters']),
        this._run(this.ffmpegPath, ['-hide_banner', '-hwaccels'])
      ]);
      result.h264Nvenc = /\bh264_nvenc\b/.test(encoders.stdout);
      result.hevcNvenc = /\bhevc_nvenc\b/.test(encoders.stdout);
      result.scaleCuda = /\bscale_cuda\b/.test(filters.stdout);
      result.chromakeyCuda = /\bchromakey_cuda\b/.test(filters.stdout);
      result.overlayCuda = /\boverlay_cuda\b/.test(filters.stdout);
      result.libass = /\bsubtitles\b/.test(filters.stdout);
      result.cudaCompiled = /(^|\s)cuda(\s|$)/m.test(hwaccels.stdout);

      const detected = await this.detectNvidiaGpus();
      const candidates = requestedGpu >= 0
        ? [requestedGpu, ...detected.map((gpu) => gpu.index).filter((index) => index !== requestedGpu)]
        : detected.length
          ? detected.slice().sort((a, b) => (b.memoryFreeMb - a.memoryFreeMb) || (a.utilizationPercent - b.utilizationPercent)).map((gpu) => gpu.index)
          : [0];
      result.nvencPotential = result.h264Nvenc && detected.length > 0;

      let selected = null;
      if (result.h264Nvenc) {
        for (const index of [...new Set(candidates)]) {
          const test = await this.testEncoder('h264_nvenc', { gpuIndex: index, retries: 2, force });
          result.nvencTests.push(test);
          if (test.ok && !selected) selected = index;
        }
      }
      if (selected === null && requestedGpu >= 0) selected = requestedGpu;
      if (selected === null) selected = detected[0]?.index ?? 0;
      result.selectedGpuIndex = selected;
      result.gpuIndex = selected;
      result.h264NvencRuntime = result.nvencTests.some((test) => test.ok && test.gpuIndex === selected);
      result.nvencRuntime = result.h264NvencRuntime;

      if (result.hevcNvenc && result.nvencRuntime) {
        const hevc = await this.testEncoder('hevc_nvenc', { gpuIndex: selected, retries: 1, force });
        result.hevcNvencRuntime = hevc.ok;
        if (!hevc.ok) result.details.push(`HEVC NVENC: ${hevc.error}`);
      }

      if (result.cudaCompiled && result.scaleCuda && result.nvencRuntime) {
        const cudaTest = await this.testCudaPipeline({ gpuIndex: selected });
        result.cudaAvailable = cudaTest.ok;
        if (!cudaTest.ok) result.details.push(`Full CUDA test: ${cudaTest.error}`);
      }

      result.gpus = detected.map((gpu) => ({
        ...gpu,
        selected: gpu.index === selected,
        h264NvencReady: result.nvencTests.some((test) => test.gpuIndex === gpu.index && test.ok)
      }));
      const selectedInfo = result.gpus.find((gpu) => gpu.index === selected);
      result.selectedGpuName = selectedInfo?.name || (result.nvencRuntime ? `NVIDIA GPU ${selected}` : null);
      result.recommendedAcceleration = result.nvencPotential ? 'NVENC_ONLY' : 'CPU';
      result.recommendedCodec = result.nvencPotential ? 'h264_nvenc' : 'libx264';
      result.cudaRecommended = false;
      result.gpuMode = result.nvencRuntime ? 'AUTO_NVENC_READY' : result.nvencPotential ? 'AUTO_NVENC_WILL_RETRY' : 'CPU_ONLY';
      if (result.nvencRuntime) {
        result.details.push(`Auto GPU: ${result.selectedGpuName} (index ${selected})`);
        result.details.push('Pipeline khuyên dùng: CPU decode/filter + NVIDIA NVENC encode.');
      } else if (result.h264Nvenc) {
        result.details.push('FFmpeg có h264_nvenc nhưng runtime test chưa sẵn sàng; ứng dụng sẽ thử lại và tự fallback an toàn.');
      }
    } catch (error) {
      result.details.push(`FFmpeg: ${error.message}`);
    }

    try {
      await this._run(this.ffprobePath, ['-hide_banner', '-version']);
      result.ffprobeOk = true;
    } catch (error) {
      result.details.push(`ffprobe: ${error.message}`);
    }

    this.systemCache = { cacheKey, value: result };
    this.systemCacheAt = Date.now();
    return result;
  }

  async checkSystem(options = {}) {
    if (this._systemCheckPromise) return this._systemCheckPromise;
    this._systemCheckPromise = this._checkSystemImpl(options);
    try {
      return await this._systemCheckPromise;
    } finally {
      this._systemCheckPromise = null;
    }
  }

  clearSystemCache() {
    this.systemCache = null;
    this.systemCacheAt = 0;
  }

  async recoverGpu({ gpuIndex = -1 } = {}) {
    await sleep(900);
    this.clearSystemCache();
    const result = await this.checkSystem({ force: true, gpuIndex });
    await sleep(350);
    return result;
  }

  async probe(filePath) {
    const { stdout } = await this._run(this.ffprobePath, [
      '-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath
    ]);
    const probe = JSON.parse(stdout);
    const video = probe.streams?.find((stream) => stream.codec_type === 'video' && stream.disposition?.attached_pic !== 1);
    const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
    const duration = Number(probe.format?.duration || video?.duration || audio?.duration || 0);
    const [fpsNum, fpsDen] = String(video?.avg_frame_rate || '0/1').split('/').map(Number);
    return {
      durationMs: Math.max(0, Math.round(duration * 1000)),
      width: Number(video?.width || 0),
      height: Number(video?.height || 0),
      fpsNum: fpsNum || 0,
      fpsDen: fpsDen || 1,
      videoCodec: video?.codec_name || null,
      audioCodec: audio?.codec_name || null,
      audioSampleRate: Number(audio?.sample_rate || 0),
      audioChannels: Number(audio?.channels || 0),
      pixelFormat: video?.pix_fmt || null,
      bitDepth: Number(video?.bits_per_raw_sample || 8) || 8,
      hasAudio: Boolean(audio),
      formatName: probe.format?.format_name || null,
      sizeBytes: Number(probe.format?.size || 0)
    };
  }

  async render(args, { durationMs, signal, onProgress, onLog, onGpuStats, gpuIndex = null, abortGraceMs } = {}) {
    let buffer = '';
    const progress = { frame: 0, fps: 0, bitrate: '', speed: '', outTimeMs: 0, percent: 0, gpu: null };
    const emit = () => onProgress?.({ ...progress });
    const parse = (text) => {
      buffer += text;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const separator = line.indexOf('=');
        if (separator < 0) continue;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        if (key === 'frame') progress.frame = Number(value) || progress.frame;
        if (key === 'fps') {
          const parsedFps = Number(value);
          if (Number.isFinite(parsedFps) && parsedFps > 0) progress.fps = parsedFps;
        }
        if (key === 'bitrate') progress.bitrate = value;
        if (key === 'speed') {
          if (value && value !== 'N/A') progress.speed = value;
        }
        if (key === 'out_time_us' || key === 'out_time_ms') {
          const raw = Number(value);
          if (Number.isFinite(raw) && raw > 0) {
            // microsecond chia 1000 = millisecond
            progress.outTimeMs = raw / 1000;
            if (durationMs > 0) {
              progress.percent = Math.min(100, Math.max(0, (progress.outTimeMs / durationMs) * 100));
            }
          }
        } else if (key === 'out_time') {
          const parts = value.split(':');
          if (parts.length === 3) {
            const h = parseFloat(parts[0]) || 0;
            const m = parseFloat(parts[1]) || 0;
            const s = parseFloat(parts[2]) || 0;
            const totalMs = (h * 3600 + m * 60 + s) * 1000;
            if (totalMs > 0) {
              progress.outTimeMs = totalMs;
              progress.time = value.split('.')[0];
              if (durationMs > 0) {
                progress.percent = Math.min(100, Math.max(0, (totalMs / durationMs) * 100));
              }
            }
          }
        }
        if (key === 'progress') emit();
      }
    };
    this.activeRenderCount += 1;
    let gpuTimer = null;
    let gpuSampling = false;
    if (gpuIndex !== null && Number.isFinite(Number(gpuIndex))) {
      const sample = async () => {
        if (gpuSampling) return;
        gpuSampling = true;
        try {
          const stats = await this.sampleNvidiaGpu(Number(gpuIndex));
          if (stats) {
            progress.gpu = stats;
            onGpuStats?.(stats);
          }
        } finally {
          gpuSampling = false;
        }
      };
      sample().catch(() => {});
      gpuTimer = setInterval(() => sample().catch(() => {}), 2000);
      gpuTimer.unref?.();
    }
    try {
      return await this._run(this.ffmpegPath, args, {
        signal,
        abortGraceMs,
        onPrepared: (diag) => onLog?.(`${formatFfmpegDiagnostics(diag)}\n`),
        onStdout: parse,
        onStderr: onLog
      });
    } finally {
      if (gpuTimer) clearInterval(gpuTimer);
      this.activeRenderCount = Math.max(0, this.activeRenderCount - 1);
      if (signal?.aborted) await sleep(650);
    }
  }

  async thumbnail(inputPath, outputPath, { timeSeconds = 1, width = 480 } = {}) {
    ensureDirectory(path.dirname(outputPath));
    await this._run(this.ffmpegPath, [
      '-y', '-ss', String(timeSeconds), '-i', inputPath,
      '-map', '0:v:0', '-frames:v', '1', '-vf', `scale=${width}:-2`, outputPath
    ]);
    return outputPath;
  }

  async proxy(inputPath, outputPath, { height = 540, fps = 24 } = {}) {
    ensureDirectory(path.dirname(outputPath));
    const system = await this.checkSystem({ gpuIndex: -1 });
    const gpuIndex = system.selectedGpuIndex ?? 0;
    const args = ['-y', '-hide_banner', '-i', inputPath, '-map', '0:v:0', '-an', '-vf', `scale=-2:${height},fps=${fps}`];
    if (system.nvencRuntime) {
      args.push('-c:v', 'h264_nvenc', '-gpu', String(gpuIndex), '-preset', 'p2', '-cq', '28', '-bf', '0');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28');
    }
    args.push('-movflags', '+faststart', outputPath);
    await this._run(this.ffmpegPath, args);
    return outputPath;
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }
}

module.exports = {
  FFmpegService,
  ffmpegArgDiagnostics,
  formatFfmpegDiagnostics,
  materializeLongFfmpegArgs,
  runProcess,
  terminateProcessTree,
  parseGpuCsv
};
