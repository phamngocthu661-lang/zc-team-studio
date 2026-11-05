const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

/**
 * Service cắt kịch bản thành từng câu, sinh audio từng câu,
 * kiểm tra lỗi âm thanh (0 byte, nuốt chữ, lặp âm, câm tiếng)
 * và tự động tạo lại câu lỗi trước khi ghép nối thành file hoàn chỉnh.
 */
class VoiceValidatorService {
  constructor(options = {}) {
    this.voiceStudioService = options.voiceStudioService || null;
    this.ffmpegService = options.ffmpegService || null;
    this.maxRetriesPerChunk = options.maxRetriesPerChunk || 3;
  }

  /**
   * Tính số từ thông minh cho cả tiếng Latinh (Việt, Anh) và CJK (Nhật, Trung)
   * @param {string} text
   * @returns {number}
   */
  estimateWordCount(text) {
    if (!text || typeof text !== 'string') return 0;
    // Đếm ký tự CJK (Nhật, Trung, Hàn)
    const cjkChars = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
    // Đếm từ Latinh phân cách bằng khoảng trắng
    const nonCjk = text.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ' ');
    const latinWords = nonCjk.split(/\s+/).filter(Boolean).length;
    return latinWords + Math.ceil(cjkChars / 2);
  }

  /**
   * Tách kịch bản thành các câu/phân đoạn hợp lý
   * Bảo vệ tuyệt đối các thẻ cảm xúc dạng [laughter], [whisper], [pause:2s]
   * và các từ viết tắt thông dụng, hỗ trợ đa ngôn ngữ (Việt, Anh, Nhật, Trung).
   * @param {string} scriptText
   * @returns {Array<{ index: number, text: string, wordCount: number }>}
   */
  splitScriptIntoChunks(scriptText) {
    if (!scriptText || typeof scriptText !== 'string') return [];

    // 1. Chuẩn hóa xuống dòng, dọn sạch tàn dư Pasted text(...) / nhãn [PART N] / tiêu đề Markdown và khoảng trắng thừa
    const cleaned = scriptText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/Pasted\s+text\s*\([^)]*\)\s*(?:\.[a-z0-9]+)?\s*(?:Document)?\s*/gi, '')
      .replace(/^\s*(?:#{1,6}\s*)?\[\s*(?:PART|PARTE)\s+\d+(?:\s*[:—\-–][^\]]*)?\]\s*$/gim, '')
      .replace(/^\s*#{1,6}\s+(?:PART|PARTE)\s+\d+.*$/gim, '')
      .trim();

    if (!cleaned) return [];

    // Danh sách các từ viết tắt phổ biến cần bảo vệ dấu chấm
    const abbreviations = [
      'tp', 'ths', 'ts', 'bs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'vs', 'v.v', 'etc', 'e.g', 'i.e', 'th'
    ];

    // Thay thế tạm thời dấu chấm trong từ viết tắt và số thập phân
    let protectedText = cleaned;
    for (const abbr of abbreviations) {
      const regex = new RegExp(`\\b(${abbr})\\.(\\s+)`, 'gi');
      protectedText = protectedText.replace(regex, '$1__DOT__$2');
    }
    // Bảo vệ số thập phân / số tiền có chấm: vd 3.14, 100.000
    protectedText = protectedText.replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

    // Tách theo dòng / đoạn trước
    const lines = protectedText.split('\n').map(l => l.trim()).filter(Boolean);
    const rawSentences = [];

    for (const line of lines) {
      // Tách câu:
      // - Với dấu câu Latinh (.?!…；): tách khi có khoảng trắng theo sau
      // - Với dấu câu CJK (。！？): tách ngay lập tức (không cần khoảng trắng)
      const parts = line
        .split(/(?:(?<=[.?!…；])\s+|(?<=[。！？])\s*)(?![^\[]*\])/g)
        .map(p => p.trim())
        .filter(Boolean);

      for (const p of parts) {
        if (!p) continue;
        // Khôi phục placeholder __DOT__ thành dấu chấm
        const restored = p.replace(/__DOT__/g, '.');

        // Nếu một câu vẫn quá dài (> 35 từ), tiếp tục bẻ nhỏ theo dấu phẩy, hai chấm, gạch ngang
        const wordCount = this.estimateWordCount(restored);
        if (wordCount > 35) {
          const subParts = restored
            .split(/(?:(?<=[,;:\-–—])\s+|(?<=[、，：])\s*)(?![^\[]*\])/g)
            .map(sp => sp.trim())
            .filter(Boolean);

          if (subParts.length > 1) {
            for (const sp of subParts) {
              if (sp) rawSentences.push(sp);
            }
          } else {
            // Trường hợp câu dài không có cả dấu phẩy: chia theo từng cụm ~25 từ
            const words = restored.split(/\s+/).filter(Boolean);
            if (words.length > 25) {
              for (let w = 0; w < words.length; w += 25) {
                const sliceText = words.slice(w, w + 25).join(' ');
                if (sliceText) rawSentences.push(sliceText);
              }
            } else {
              rawSentences.push(restored);
            }
          }
        } else {
          rawSentences.push(restored);
        }
      }
    }

    // 2. Gom các câu quá ngắn (dưới 5 từ) với câu sau để tránh vụn vặt
    const chunks = [];
    let currentBuffer = '';
    let currentWords = 0;

    for (let i = 0; i < rawSentences.length; i++) {
      const s = rawSentences[i];
      const words = this.estimateWordCount(s);

      if (!currentBuffer) {
        currentBuffer = s;
        currentWords = words;
      } else if (currentWords + words <= 32) {
        // Gom lại nếu tổng số từ vẫn nhỏ hơn hoặc bằng 32 từ
        const isCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(currentBuffer.slice(-1));
        currentBuffer += (isCjk ? '' : ' ') + s;
        currentWords += words;
      } else {
        chunks.push({
          index: chunks.length + 1,
          text: currentBuffer,
          wordCount: currentWords
        });
        currentBuffer = s;
        currentWords = words;
      }
    }

    if (currentBuffer) {
      chunks.push({
        index: chunks.length + 1,
        text: currentBuffer,
        wordCount: currentWords
      });
    }

    return chunks;
  }

  /**
   * Đọc cực nhanh thời lượng file WAV trực tiếp từ RIFF header trên RAM (0.05ms, không cần gọi ffprobe)
   * Hỗ trợ cả WAV chuẩn 44-byte lẫn WAV xuất qua FFmpeg có chèn chunk LIST/INFO.
   */
  _tryFastWavDurationMs(filePath) {
    try {
      const stat = fs.statSync(filePath);
      if (!stat || stat.size <= 44) return 0;
      const readLen = Math.min(stat.size, 4096);
      const fd = fs.openSync(filePath, 'r');
      const header = Buffer.alloc(readLen);
      const bytesRead = fs.readSync(fd, header, 0, readLen, 0);
      fs.closeSync(fd);
      if (bytesRead >= 44 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WAVE') {
        let byteRate = 0;
        let dataBytes = 0;
        let pos = 12;
        while (pos + 8 <= bytesRead) {
          const chunkId = header.toString('ascii', pos, pos + 4);
          const chunkSize = header.readUInt32LE(pos + 4);
          if (chunkId === 'fmt ' && pos + 20 <= bytesRead) {
            byteRate = header.readUInt32LE(pos + 16);
          } else if (chunkId === 'data') {
            const payloadRemaining = Math.max(0, stat.size - (pos + 8));
            dataBytes = (chunkSize > 0 && chunkSize <= payloadRemaining) ? chunkSize : payloadRemaining;
            break;
          }
          if (chunkSize < 0 || chunkSize > stat.size) break;
          pos += 8 + chunkSize + (chunkSize % 2);
        }
        if (byteRate <= 0) {
          byteRate = header.readUInt32LE(28);
        }
        if (dataBytes <= 0) {
          dataBytes = Math.max(0, stat.size - 44);
        }
        if (byteRate > 0 && dataBytes > 0) {
          return Math.round((dataBytes / byteRate) * 1000);
        }
      }
    } catch {}
    return 0;
  }

  /**
   * Kiểm tra chất lượng của một đoạn audio câu
   * @param {string} chunkAudioPath Đường dẫn file audio của câu
   * @param {number} wordCount Số từ của câu
   * @returns {Promise<{ valid: boolean, durationMs: number, reason?: string }>}
   */
  async validateChunkAudio(chunkAudioPath, wordCount = 1) {
    if (!fs.existsSync(chunkAudioPath)) {
      return { valid: false, durationMs: 0, reason: 'File audio không tồn tại trên đĩa.' };
    }

    let stats;
    try {
      stats = fs.statSync(chunkAudioPath);
    } catch (e) {
      return { valid: false, durationMs: 0, reason: `Không thể đọc dung lượng file: ${e.message}` };
    }

    // Kiểm tra dung lượng tối thiểu (1 câu tối thiểu phải > 1024 bytes)
    if (stats.size < 1024) {
      return { valid: false, durationMs: 0, reason: `Dung lượng file quá nhỏ (${stats.size} bytes), nghi vấn file rỗng hoặc lỗi header.` };
    }

    // Ưu tiên đọc nhanh RIFF WAV header nếu file là WAV thực sự và không dùng mock probe
    let durationMs = 0;
    const isRealFfmpegService = Boolean(this.ffmpegService && this.ffmpegService.ffmpegPath);
    if (isRealFfmpegService) {
      durationMs = this._tryFastWavDurationMs(chunkAudioPath);
    }

    // Đo thời lượng bằng FFmpeg probe nếu chưa có durationMs
    if (durationMs <= 0 && this.ffmpegService && typeof this.ffmpegService.probe === 'function') {
      try {
        const meta = await this.ffmpegService.probe(chunkAudioPath);
        durationMs = Number(meta?.durationMs || 0);

        if (!meta?.hasAudio) {
          return { valid: false, durationMs: 0, reason: 'File âm thanh không có luồng audio (hasAudio = false).' };
        }
      } catch (err) {
        // Fallback ước lượng theo dung lượng nếu probe lỗi
        console.warn(`[VOICE VALIDATOR] Probe lỗi: ${err.message}, tiếp tục kiểm tra theo dung lượng.`);
      }
    }

    // Nếu đo được thời lượng, kiểm tra tỷ lệ từ/thời lượng để bắt lỗi nuốt chữ hoặc lặp âm
    if (durationMs > 0) {
      const durationSec = durationMs / 1000;
      // Giới hạn dưới: tốc độ đọc nhanh tối đa ~270 từ/phút -> tối thiểu 0.21s/từ (chặn lỗi đọc 2x/nuốt chữ)
      const minDurationSec = Math.max(0.5, (wordCount * 0.21));
      // Giới hạn trên: tốc độ siêu chậm 40 từ/phút -> tối đa 1.8s/từ
      const maxDurationSec = Math.max(3.5, (wordCount * 1.8));

      if (durationSec < minDurationSec) {
        return {
          valid: false,
          durationMs,
          reason: `Thời lượng quá ngắn (${durationSec.toFixed(2)}s cho ${wordCount} từ, tối thiểu ${minDurationSec.toFixed(2)}s) -> Nghi vấn AI bị nuốt chữ / tua nhanh / cắt cụt câu.`
        };
      }

      if (durationSec > maxDurationSec) {
        return {
          valid: false,
          durationMs,
          reason: `Thời lượng quá dài (${durationSec.toFixed(2)}s cho ${wordCount} từ) -> Nghi vấn AI bị lặp âm (Stuttering) hoặc rè kéo dài.`
        };
      }
    }

    return { valid: true, durationMs, reason: 'OK' };
  }

  /**
   * Sinh audio cho một câu kèm cơ chế tự động thử lại (Retry) nếu câu đó lỗi
   */
  async generateChunkWithHealing({
    chunk,
    voice,
    refAudio = null,
    model,
    language = null,
    speed = 1.0,
    chunkAudioPath,
    skipPrecheck = false,
    forceVoiceStudioReady = null,
    preResolvedVoiceId = null,
    onLog = null
  }) {
    const log = (msg) => {
      console.log(`[VOICE CHUNK #${chunk.index}] ${msg}`);
      if (typeof onLog === 'function') {
        try { onLog(msg); } catch {}
      }
    };

    let lastError = null;
    const targetFormat = path.extname(chunkAudioPath || '').toLowerCase() === '.wav' ? 'wav' : 'mp3';

    for (let attempt = 1; attempt <= this.maxRetriesPerChunk; attempt++) {
      try {
        if (attempt > 1) {
          log(`🔄 Đang tạo lại câu #${chunk.index} (Lần thử ${attempt}/${this.maxRetriesPerChunk})...`);
        }

        // 1. Gọi VoiceStudio API (hoặc Fallback nếu VoiceStudio chưa bật)
        await this.voiceStudioService.generateSpeech({
          text: chunk.text,
          voice,
          refAudio,
          model,
          language,
          responseFormat: targetFormat,
          speed: Number(speed) || 1.0,
          outputPath: chunkAudioPath,
          skipPrecheck,
          forceVoiceStudioReady,
          preResolvedVoiceId
        });

        // 2. Kiểm tra chất lượng câu vừa sinh
        const check = await this.validateChunkAudio(chunkAudioPath, chunk.wordCount);
        if (check.valid) {
          log(`✅ Câu #${chunk.index} hợp lệ (${(check.durationMs / 1000).toFixed(2)}s, ${chunk.wordCount} từ).`);
          return {
            success: true,
            chunkAudioPath,
            durationMs: check.durationMs,
            attempts: attempt
          };
        } else {
          lastError = new Error(`Lỗi kiểm tra chất lượng câu #${chunk.index}: ${check.reason}`);
          log(`⚠️ ${lastError.message}`);
          // Xóa file lỗi để chuẩn bị thử lại
          try { if (fs.existsSync(chunkAudioPath)) fs.unlinkSync(chunkAudioPath); } catch {}
          await new Promise(r => setTimeout(r, 350));
        }
      } catch (err) {
        lastError = err;
        log(`❌ Lỗi tạo câu #${chunk.index} (Lần ${attempt}/${this.maxRetriesPerChunk}): ${err.message}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    throw new Error(`Đã thử ${this.maxRetriesPerChunk} lần nhưng không thể tạo thành công câu #${chunk.index} ("${chunk.text.substring(0, 40)}..."): ${lastError?.message}`);
  }

  /**
   * Ghép nối (Concat) các câu audio thành 1 file voice hoàn chỉnh mượt mà bằng FFmpeg
   */
  async stitchChunksWithFfmpeg(chunkPaths, finalOutputPath, tempDir) {
    if (!Array.isArray(chunkPaths) || chunkPaths.length === 0) {
      throw new Error('Danh sách câu audio cần ghép bị rỗng.');
    }

    const isWavTarget = path.extname(finalOutputPath).toLowerCase() === '.wav';
    const hasRealFfmpeg = Boolean(this.ffmpegService && this.ffmpegService.ffmpegPath);

    // Nếu chỉ có 1 câu duy nhất và đã là RIFF WAV (hoặc cùng định dạng / môi trường test mock) thì copy trực tiếp
    if (chunkPaths.length === 1) {
      const isSourceRiffWav = this._tryFastWavDurationMs(chunkPaths[0]) > 0;
      if (!isWavTarget || isSourceRiffWav || !hasRealFfmpeg) {
        fs.copyFileSync(chunkPaths[0], finalOutputPath);
        return;
      }
    }

    // Tạo file danh sách cho FFmpeg concat demuxer
    const listFilePath = path.join(tempDir, `concat_list_${Date.now()}.txt`);
    const listContent = chunkPaths
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');

    fs.writeFileSync(listFilePath, listContent, 'utf8');

    // Chạy FFmpeg concat chuẩn hóa sample rate 48000Hz stereo để không bị lệch tiếng
    const ffmpegBin = this.ffmpegService?.ffmpegPath || 'ffmpeg';
    const codecArgs = isWavTarget
      ? ['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2']
      : ['-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '48000', '-ac', '2'];

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      ...codecArgs,
      finalOutputPath
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', code => {
        try { fs.unlinkSync(listFilePath); } catch {}
        if (code === 0 && fs.existsSync(finalOutputPath) && fs.statSync(finalOutputPath).size > 1024) {
          resolve();
        } else {
          reject(new Error(`FFmpeg ghép nối voice thất bại (Mã lỗi ${code}): ${stderr.slice(-300)}`));
        }
      });
      proc.on('error', err => {
        try { fs.unlinkSync(listFilePath); } catch {}
        reject(err);
      });
    });
  }

  /**
   * QUY TRÌNH TOÀN DIỆN ĐA LUỒNG TỰ ĐỘNG CÂN ĐỐI (DYNAMIC AUTO-SCALING WORKER POOL):
   * Nhận toàn bộ kịch bản -> Cắt câu -> Chạy song song đa luồng (GPU/CPU) có tự động tăng luồng khi rảnh
   * -> Ghép nối thành 1 file .wav duy nhất -> Tự động xóa sạch toàn bộ file tạm và bộ nhớ cache!
   */
  async generateFullScript({
    scriptText,
    voice = 'default',
    refAudio = null,
    model = 'omnivoice',
    language = null,
    finalOutputPath,
    outputPath,
    speed = 1.0,
    concurrency = null,
    tempDir = null,
    unloadModelAfter = false,
    onProgress = null,
    onLog = null
  }) {
    const targetOut = finalOutputPath || outputPath;
    if (!targetOut) {
      throw new Error('Chưa cung cấp đường dẫn file đầu ra (finalOutputPath hoặc outputPath).');
    }

    const log = (msg) => {
      console.log(`[VOICE SCRIPT] ${msg}`);
      if (typeof onLog === 'function') {
        try { onLog(msg); } catch {}
      }
    };

    const updateProgress = (data) => {
      if (typeof onProgress === 'function') {
        try { onProgress(data); } catch {}
      }
    };

    // 1. Tách kịch bản thành các câu
    log(`📝 Đang phân tích kịch bản và chia câu...`);
    const chunks = this.splitScriptIntoChunks(scriptText);
    if (chunks.length === 0) {
      throw new Error('Kịch bản rỗng hoặc không có nội dung hợp lệ.');
    }

    // 2. Khởi tạo phiên & tự động đo tài nguyên GPU/CPU để cân đối số luồng song song
    let session = null;
    if (this.voiceStudioService && typeof this.voiceStudioService.prepareSessionForBatch === 'function') {
      try {
        session = await this.voiceStudioService.prepareSessionForBatch({
          voice,
          refAudio,
          language,
          model,
          speed
        });
      } catch {}
    }

    const isVsGpu = Boolean(session?.isVoiceStudioReady);
    const hw = session?.hw || (this.voiceStudioService?.detectHardwareConcurrency?.() || {
      hasNvidiaGpu: false,
      gpuName: '',
      gpuWorkers: 1,
      vsClientConcurrency: 2,
      fallbackConcurrency: 6
    });

    const initialWorkers = Math.min(
      chunks.length,
      Math.max(1, Number(concurrency) || (session?.recommendedConcurrency) || (isVsGpu ? hw.vsClientConcurrency : hw.fallbackConcurrency) || 3)
    );
    const maxWorkers = Math.min(
      chunks.length,
      Number(concurrency) || (isVsGpu ? Math.max(initialWorkers, (hw.gpuWorkers || 2) + 2) : 8)
    );

    const engineLabel = isVsGpu
      ? `GPU VoiceStudio (${hw.gpuName || 'CUDA'} · ${initialWorkers}➔${maxWorkers} luồng song song)`
      : `Đa luồng tốc độ cao (${initialWorkers}➔${maxWorkers} luồng song song)`;

    log(`📦 Kịch bản gồm ${chunks.length} câu · Chế độ xử lý: ${engineLabel}`);

    // Chuẩn bị thư mục tạm cho các câu
    const isCustomTempDir = Boolean(tempDir);
    const workTempDir = tempDir || path.join(path.dirname(targetOut), `.voice_chunks_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    if (!fs.existsSync(workTempDir)) {
      fs.mkdirSync(workTempDir, { recursive: true });
    }

    const chunkAudioPaths = new Array(chunks.length);
    let totalGeneratedMs = 0;
    let completedCount = 0;
    let nextIndex = 0;
    let activeWorkers = 0;
    let targetConcurrency = initialWorkers;
    let fastStreak = 0;
    let fatalError = null;

    try {
      // 3. Hàng đợi Đa Luồng Tự Động Co Giãn (Dynamic Worker Pool):
      // Nếu GPU/CPU rảnh (thời gian tạo mỗi câu nhanh và không bị retry), tự động mở thêm luồng song song lên tới maxWorkers!
      await new Promise((resolve, reject) => {
        const spawnWorkersIfNeeded = () => {
          while (!fatalError && activeWorkers < targetConcurrency && nextIndex < chunks.length) {
            const currentIdx = nextIndex++;
            activeWorkers++;
            runSingleChunk(currentIdx);
          }
        };

        const runSingleChunk = async (idx) => {
          const chunk = chunks[idx];
          const chunkFile = path.join(workTempDir, `chunk_${String(chunk.index).padStart(4, '0')}.wav`);
          const t0 = Date.now();

          try {
            const chunkRes = await this.generateChunkWithHealing({
              chunk,
              voice: session?.effectiveVoice || voice,
              refAudio: session?.refAudio || refAudio,
              model: session?.model || model,
              language: session?.language || language,
              speed: session?.speed || speed,
              chunkAudioPath: chunkFile,
              skipPrecheck: Boolean(session),
              forceVoiceStudioReady: session ? session.isVoiceStudioReady : null,
              preResolvedVoiceId: session?.effectiveVoice || null,
              onLog: log
            });

            if (fatalError) return;

            const elapsedMs = Date.now() - t0;
            chunkAudioPaths[idx] = chunkRes.chunkAudioPath;
            totalGeneratedMs += Number(chunkRes.durationMs || 0);
            completedCount++;

            // Tự động cân đối tăng luồng nếu máy đang rảnh và xử lý mượt
            if (chunkRes.attempts === 1 && elapsedMs < 3500 && targetConcurrency < maxWorkers && (chunks.length - nextIndex) > activeWorkers) {
              fastStreak++;
              if (fastStreak >= 2) {
                fastStreak = 0;
                targetConcurrency = Math.min(maxWorkers, targetConcurrency + 1);
                log(`⚡ Máy đang rảnh, tự động tăng lên ${targetConcurrency} luồng tạo voice song song!`);
              }
            } else if (chunkRes.attempts > 1 && targetConcurrency > initialWorkers) {
              fastStreak = 0;
              targetConcurrency = Math.max(initialWorkers, targetConcurrency - 1);
            }

            const percent = Math.round((completedCount / chunks.length) * 90);
            updateProgress({
              percent,
              currentChunk: completedCount,
              totalChunks: chunks.length,
              concurrency: activeWorkers,
              status: `Đang tạo voice đa luồng (${activeWorkers} luồng): Hoàn thành ${completedCount}/${chunks.length} câu...`
            });
          } catch (err) {
            if (!fatalError) {
              fatalError = err;
              reject(err);
              return;
            }
          } finally {
            activeWorkers--;
            if (!fatalError) {
              if (completedCount >= chunks.length && activeWorkers === 0) {
                resolve();
              } else {
                spawnWorkersIfNeeded();
              }
            }
          }
        };

        spawnWorkersIfNeeded();
      });

      // 4. Ghép nối các câu lại thành 1 file voice hoàn chỉnh duy nhất theo đúng thứ tự
      updateProgress({
        percent: 92,
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        status: `Đang ghép nối ${chunks.length} câu thành 1 file audio hoàn chỉnh...`
      });

      log(`🎶 Đang dùng FFmpeg ghép nối ${chunks.length} câu thành 1 file ${path.extname(targetOut) || '.wav'} duy nhất...`);
      await this.stitchChunksWithFfmpeg(chunkAudioPaths, targetOut, workTempDir);

      // 5. Đo dung lượng và thời lượng thực tế của file hoàn chỉnh
      let actualSizeBytes = 0;
      try {
        if (fs.existsSync(targetOut)) {
          actualSizeBytes = fs.statSync(targetOut).size;
        }
      } catch {}

      let actualDurationMs = totalGeneratedMs;
      const fastWavMs = this._tryFastWavDurationMs(targetOut);
      if (fastWavMs > 0) {
        actualDurationMs = fastWavMs;
      } else if (this.ffmpegService && typeof this.ffmpegService.probe === 'function') {
        try {
          const finalMeta = await this.ffmpegService.probe(targetOut);
          if (finalMeta?.durationMs) {
            actualDurationMs = Number(finalMeta.durationMs);
          }
        } catch {}
      }

      // 5.5. CỔNG KIỂM ĐỊNH ĐỘ DÀI VOICE SO VỚI KỊCH BẢN (HARD FULL-SCRIPT DURATION GATE)
      // Chặn tuyệt đối lỗi kịch bản 75.000-100.000 ký tự nhưng chỉ tạo ra ~30 phút voice mà vẫn báo thành công!
      const consistency = this.verifyScriptAudioConsistency({
        scriptText,
        audioPath: targetOut,
        durationMs: actualDurationMs
      });
      if (!consistency.valid) {
        log(`❌ [CHẶN LỖI VOICE HỤT THỜI LƯỢNG] ${consistency.reason}`);
        try {
          if (fs.existsSync(targetOut)) fs.unlinkSync(targetOut);
        } catch {}
        throw new Error(consistency.reason);
      }

      updateProgress({
        percent: 100,
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        status: `Hoàn tất tạo voice kịch bản (${consistency.actualDurationMin} phút / ${consistency.cleanChars.toLocaleString()} ký tự) & đã dọn sạch bộ nhớ đệm!`
      });

      log(`🎉 [HOÀN TẤT & ĐÃ KIỂM ĐỊNH KHỚP KỊCH BẢN] Đã lưu file voice: ${path.basename(targetOut)} (~${consistency.actualDurationMin} phút [${(actualDurationMs / 1000).toFixed(1)}s], ngưỡng tối thiểu ${consistency.minExpectedMin} phút cho ${consistency.cleanChars.toLocaleString()} ký tự / ${consistency.totalWords.toLocaleString()} từ, ${(actualSizeBytes / 1024).toFixed(1)} KB).`);

      return {
        success: true,
        outputPath: targetOut,
        finalOutputPath: targetOut,
        durationMs: actualDurationMs,
        sizeBytes: actualSizeBytes,
        chunkCount: chunks.length,
        cleanChars: consistency.cleanChars,
        totalWords: consistency.totalWords
      };
    } finally {
      // 6. LUÔN LUÔN dọn dẹp sạch sẽ 100% các file chunk tạm và bộ nhớ cache của VoiceStudio (kể cả khi thành công hay lỗi)
      try {
        for (const f of chunkAudioPaths) {
          if (f && fs.existsSync(f)) {
            try { fs.unlinkSync(f); } catch {}
          }
        }
        if (!isCustomTempDir && fs.existsSync(workTempDir)) {
          fs.rmSync(workTempDir, { recursive: true, force: true });
        }
      } catch (cleanErr) {
        console.warn('[VOICE SCRIPT] Dọn dẹp temp:', cleanErr.message);
      }

      if (this.voiceStudioService && typeof this.voiceStudioService.cleanupVoiceCaches === 'function') {
        try {
          await this.voiceStudioService.cleanupVoiceCaches({
            scriptDir: path.dirname(targetOut),
            unloadModel: Boolean(unloadModelAfter)
          });
        } catch {}
      }
    }
  }

  /**
   * Kiểm định chéo thời lượng file audio hoàn chỉnh (.wav/.mp3) so với độ dài kịch bản (.txt)
   * Ngăn chặn tuyệt đối lỗi kịch bản dài (vd 75.000-100.000 ký tự) nhưng chỉ tạo ra ~30 phút voice mà vẫn báo thành công.
   */
  verifyScriptAudioConsistency({ scriptText = '', audioPath = '', durationMs = 0 } = {}) {
    const cleaned = String(scriptText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/Pasted\s+text\s*\([^)]*\)\s*(?:\.[a-z0-9]+)?\s*(?:Document)?\s*/gi, '')
      .replace(/^\s*(?:#{1,6}\s*)?\[\s*(?:PART|PARTE)\s+\d+(?:\s*[:—\-–][^\]]*)?\]\s*$/gim, '')
      .replace(/^\s*#{1,6}\s+(?:PART|PARTE)\s+\d+.*$/gim, '')
      .trim();

    const cleanChars = cleaned.length;
    const totalWords = this.estimateWordCount(cleaned);
    let actualDurationMs = Number(durationMs || 0);
    if (actualDurationMs <= 0 && audioPath && fs.existsSync(audioPath)) {
      actualDurationMs = this._tryFastWavDurationMs(audioPath);
    }

    const actualDurationSec = actualDurationMs / 1000;
    const minExpectedSec = totalWords >= 350
      ? Math.max(totalWords * 0.26, cleanChars / 23.0)
      : Math.max(0.5, totalWords * 0.18);

    const actualDurationMin = Number((actualDurationSec / 60).toFixed(1));
    const minExpectedMin = Number((minExpectedSec / 60).toFixed(1));

    // Chỉ siết cổng kiểm định cứng khi kịch bản dài (>= 350 từ) và đo được durationMs > 0
    if (totalWords >= 350 && actualDurationMs > 0 && actualDurationSec < minExpectedSec) {
      return {
        valid: false,
        actualDurationMs,
        actualDurationMin,
        minExpectedMin,
        cleanChars,
        totalWords,
        reason: `ERR_VOICE_DURATION_MISMATCH: Thời lượng voice tạo ra quá ngắn (${actualDurationMin} phút / ${Math.round(actualDurationSec)}s) so với độ dài kịch bản (${cleanChars.toLocaleString()} ký tự / ${totalWords.toLocaleString()} từ — yêu cầu tối thiểu ${minExpectedMin} phút). Đã chặn báo thành công giả để bảo vệ chất lượng video!`
      };
    }

    return {
      valid: true,
      actualDurationMs,
      actualDurationMin,
      minExpectedMin,
      cleanChars,
      totalWords,
      reason: 'OK'
    };
  }

  /**
   * Alias tương thích cho Worker Engine và IPC gọi
   */
  async generateAndValidateScript(params) {
    return await this.generateFullScript(params);
  }
}

module.exports = { VoiceValidatorService };
