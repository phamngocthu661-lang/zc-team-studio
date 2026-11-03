'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { VoiceStudioService } = require('../src/main/services/voice/voice-studio-service');
const { VoiceValidatorService } = require('../src/main/services/voice/voice-validator-service');
const { VoiceProfileManager } = require('../src/main/services/voice/voice-profile-manager');

// =========================================================================
// TEST SUITE 1: Phân tách câu thông minh (Sentence Chunking & Edge Cases)
// =========================================================================

test('VoiceValidatorService: Phân tách kịch bản thông thường và bảo toàn thẻ cảm xúc', () => {
  const service = new VoiceValidatorService();
  const script = `
    Xin chào các bạn! Hôm nay chúng ta sẽ bàn về video batch rendering.
    Đây là câu nói có thẻ cảm xúc [laughter] và câu tiếp theo [whisper: khẽ thôi].
    Một vị tỷ phú bước vào phòng họp. Mọi người đều im lặng...
  `;

  const chunks = service.splitScriptIntoChunks(script);
  assert.ok(chunks.length > 0, 'Phải có ít nhất 1 chunk');
  for (const c of chunks) {
    assert.ok(c.text.length > 0);
    assert.ok(c.wordCount > 0);
  }

  // Đảm bảo không bị chém ngang thẻ [laughter]
  const fullTextReconstructed = chunks.map(c => c.text).join(' ');
  assert.ok(fullTextReconstructed.includes('[laughter]'));
  assert.ok(fullTextReconstructed.includes('[whisper: khẽ thôi]'));
});

test('VoiceValidatorService: Bảo vệ từ viết tắt (TP. HCM, Mr., Dr.) và số tiền/thập phân', () => {
  const service = new VoiceValidatorService();
  const script = `
    Vào năm 2026, tại TP. HCM đã diễn ra một sự kiện công nghệ lớn.
    Chủ tịch HĐQT Mr. John cùng ThS. Nguyễn Văn A đã đầu tư 100.000 USD với lãi suất 3.14% mỗi năm.
    Sau đó, TS. Trần Văn B phát biểu trước hội đồng.
  `;

  const chunks = service.splitScriptIntoChunks(script);
  const fullText = chunks.map(c => c.text).join(' ');

  // Không được chém ngang 'TP.' hoặc 'Mr.' hoặc '3.14'
  assert.ok(fullText.includes('TP. HCM'), 'Phải bảo tồn nguyên vẹn TP. HCM');
  assert.ok(fullText.includes('Mr. John'), 'Phải bảo tồn nguyên vẹn Mr. John');
  assert.ok(fullText.includes('100.000 USD'), 'Phải bảo tồn nguyên vẹn 100.000 USD');
  assert.ok(fullText.includes('3.14%'), 'Phải bảo tồn nguyên vẹn 3.14%');
});

test('VoiceValidatorService: Bẻ nhỏ câu siêu dài (> 35 từ) an toàn', () => {
  const service = new VoiceValidatorService();
  // Câu dài 60 từ không có dấu chấm nhưng có dấu phẩy
  const longSentence = "Trong một buổi chiều mưa gió bão bùng trên con phố hoang vắng của thị trấn nhỏ, người đàn ông ấy lặng lẽ bước từng bước chân nặng nề, mang theo bao nhiêu nỗi niềm trắc ẩn của cuộc đời đầy sóng gió và thăng trầm, nhưng ánh mắt anh ta vẫn sáng ngời niềm tin vào tương lai tươi đẹp phía trước mà không hề nao núng.";

  const chunks = service.splitScriptIntoChunks(longSentence);
  assert.ok(chunks.length >= 2, 'Câu dài phải được chia thành ít nhất 2 chunks');
  for (const c of chunks) {
    assert.ok(c.wordCount <= 35, `Số từ của mỗi chunk (${c.wordCount}) không được vượt quá 35 từ`);
  }
});

test('VoiceValidatorService: Kịch bản rỗng hoặc khoảng trắng trả về mảng rỗng', () => {
  const service = new VoiceValidatorService();
  assert.deepEqual(service.splitScriptIntoChunks(''), []);
  assert.deepEqual(service.splitScriptIntoChunks('   \n\n\t   '), []);
  assert.deepEqual(service.splitScriptIntoChunks(null), []);
});

// =========================================================================
// TEST SUITE 2: Kiểm tra chất lượng âm thanh từng câu (Audio Validation)
// =========================================================================

test('VoiceValidatorService: validateChunkAudio bắt lỗi file không tồn tại hoặc 0 byte', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_val_'));
  try {
    const service = new VoiceValidatorService();
    
    // File không tồn tại
    const resMissing = await service.validateChunkAudio(path.join(tempDir, 'non_existent.mp3'), 10);
    assert.equal(resMissing.valid, false);
    assert.ok(resMissing.reason.includes('không tồn tại'));

    // File 0 byte
    const zeroByteFile = path.join(tempDir, 'zero_byte.mp3');
    fs.writeFileSync(zeroByteFile, Buffer.alloc(0));
    const resZero = await service.validateChunkAudio(zeroByteFile, 10);
    assert.equal(resZero.valid, false);
    assert.ok(resZero.reason.includes('quá nhỏ'));

    // File giả lập có dữ liệu > 1024 bytes
    const validDummy = path.join(tempDir, 'valid_dummy.mp3');
    fs.writeFileSync(validDummy, Buffer.alloc(2048, 0xAA));
    const resValid = await service.validateChunkAudio(validDummy, 5);
    assert.equal(resValid.valid, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('VoiceValidatorService: validateChunkAudio phát hiện nuốt chữ hoặc lặp âm khi có Probe', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_probe_'));
  try {
    const dummyAudio = path.join(tempDir, 'dummy.mp3');
    fs.writeFileSync(dummyAudio, Buffer.alloc(4096, 0x55));

    // Trường hợp 1: Nuốt chữ (câu 20 từ mà duration chỉ 0.3s)
    const mockFfmpegNuotChu = {
      probe: async () => ({ hasAudio: true, durationMs: 300 })
    };
    const service1 = new VoiceValidatorService({ ffmpegService: mockFfmpegNuotChu });
    const res1 = await service1.validateChunkAudio(dummyAudio, 20);
    assert.equal(res1.valid, false);
    assert.ok(res1.reason.includes('nuốt chữ'));

    // Trường hợp 2: Lặp âm rè (câu 2 từ mà duration kéo dài 20s)
    const mockFfmpegLapAm = {
      probe: async () => ({ hasAudio: true, durationMs: 20000 })
    };
    const service2 = new VoiceValidatorService({ ffmpegService: mockFfmpegLapAm });
    const res2 = await service2.validateChunkAudio(dummyAudio, 2);
    assert.equal(res2.valid, false);
    assert.ok(res2.reason.includes('lặp âm'));

    // Trường hợp 3: Hợp lệ (câu 10 từ, duration 3.2s)
    const mockFfmpegChuan = {
      probe: async () => ({ hasAudio: true, durationMs: 3200 })
    };
    const service3 = new VoiceValidatorService({ ffmpegService: mockFfmpegChuan });
    const res3 = await service3.validateChunkAudio(dummyAudio, 10);
    assert.equal(res3.valid, true);
    assert.equal(res3.durationMs, 3200);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// TEST SUITE 3: Cơ chế Auto-Healing (Tự tạo lại câu lỗi)
// =========================================================================

test('VoiceValidatorService: generateChunkWithHealing tự động sửa lỗi và thành công ở lần thử 2', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_heal_'));
  try {
    let callCount = 0;
    const mockVoiceStudio = {
      generateSpeech: async ({ outputPath }) => {
        callCount++;
        if (callCount === 1) {
          // Lần 1 lỗi: tạo file 0 byte
          fs.writeFileSync(outputPath, Buffer.alloc(10));
        } else {
          // Lần 2 thành công: tạo file 3KB
          fs.writeFileSync(outputPath, Buffer.alloc(3072, 0x11));
        }
      }
    };

    const service = new VoiceValidatorService({
      voiceStudioService: mockVoiceStudio,
      maxRetriesPerChunk: 3
    });

    const chunk = { index: 1, text: 'Thử nghiệm cơ chế tự động sửa lỗi câu.', wordCount: 8 };
    const chunkAudioPath = path.join(tempDir, 'chunk_01.mp3');

    const res = await service.generateChunkWithHealing({
      chunk,
      voice: 'test_voice',
      model: 'omnivoice',
      chunkAudioPath
    });

    assert.equal(res.success, true);
    assert.equal(res.attempts, 2, 'Phải tự thử lại và thành công ở lần 2');
    assert.ok(fs.existsSync(chunkAudioPath));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// TEST SUITE 4: Quản lý Voice Profile & Đồng Bộ
// =========================================================================

test('VoiceProfileManager: Lưu, đọc, liệt kê và xóa profile', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_profiles_'));
  try {
    const manager = new VoiceProfileManager({ baseDir: tempDir });
    
    // Tạo sample audio giả lập
    const samplePath = path.join(tempDir, 'dummy_sample.wav');
    fs.writeFileSync(samplePath, Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00]));

    const profile = manager.saveProfile({
      id: 'test_billionaire',
      name: 'Giọng Nam Tỷ Phú',
      language: 'vi',
      speed: 1.05,
      description: 'Giọng ấm áp, quyền lực'
    }, samplePath);

    assert.equal(profile.id, 'test_billionaire');
    assert.equal(profile.name, 'Giọng Nam Tỷ Phú');
    assert.equal(profile.speed, 1.05);
    assert.equal(profile.hasSample, true);

    const list = manager.listProfiles();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'test_billionaire');

    const fetched = manager.getProfile('test_billionaire');
    assert.ok(fetched);
    assert.equal(fetched.name, 'Giọng Nam Tỷ Phú');

    const deleted = manager.deleteProfile('test_billionaire');
    assert.equal(deleted, true);
    assert.equal(manager.listProfiles().length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// TEST SUITE 5: Full Pipeline generateAndValidateScript (End-to-End)
// =========================================================================

function createValidWavBuffer(durationSec = 0.5) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bytesPerSample = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill sine wave
  for (let i = 0; i < numSamples; i++) {
    const val = Math.floor(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000);
    buffer.writeInt16LE(val, 44 + i * 2);
  }
  return buffer;
}

test('VoiceValidatorService: generateAndValidateScript alias trả về đầy đủ sizeBytes và dọn sạch temp', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_e2e_'));
  try {
    const validAudioData = createValidWavBuffer(0.8);
    const mockVoiceStudio = {
      generateSpeech: async ({ outputPath }) => {
        fs.writeFileSync(outputPath, validAudioData);
      }
    };

    const service = new VoiceValidatorService({
      voiceStudioService: mockVoiceStudio
    });

    const script = `
      Chào mừng bạn đến với kênh kể chuyện đặc sắc hôm nay, chúng ta sẽ cùng theo dõi một hành trình đầy kịch tính của vị chủ tịch tập đoàn lớn khi ông quyết định bí mật quay trở về quê hương sau ba mươi năm xa cách.
      Tại ngôi làng xưa cũ, ông đã gặp lại người bạn thân thời thơ ấu đang sống trong một căn nhà nhỏ đơn sơ, nhưng tình cảm chân thành và ấm áp của họ vẫn vẹn nguyên như những ngày đầu tiên.
    `;

    const outPath = path.join(tempDir, 'final_script_voice.mp3');
    const result = await service.generateAndValidateScript({
      scriptText: script,
      voice: 'test_voice',
      outputPath: outPath
    });

    assert.equal(result.success, true);
    assert.equal(result.outputPath, outPath);
    assert.ok(result.chunkCount >= 2, `Phải có ít nhất 2 chunks (thực tế: ${result.chunkCount})`);
    assert.ok(fs.existsSync(outPath), 'File voice hoàn chỉnh phải tồn tại');
    assert.ok(result.sizeBytes > 1024, 'Dung lượng sizeBytes phải được tính chính xác');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// TEST SUITE 6: Các trường hợp biên (Edge Cases & Fault Tolerance)
// =========================================================================

test('VoiceValidatorService: Xử lý kịch bản chỉ có 1 câu duy nhất (Single Chunk Copy)', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_single_'));
  try {
    const validAudioData = createValidWavBuffer(0.5);
    const mockVoiceStudio = {
      generateSpeech: async ({ outputPath }) => {
        fs.writeFileSync(outputPath, validAudioData);
      }
    };

    const service = new VoiceValidatorService({
      voiceStudioService: mockVoiceStudio
    });

    const singleScript = 'Đây là một câu đơn giản duy nhất.';
    const outPath = path.join(tempDir, 'single_sentence.mp3');

    const result = await service.generateAndValidateScript({
      scriptText: singleScript,
      voice: 'test_voice',
      outputPath: outPath
    });

    assert.equal(result.success, true);
    assert.equal(result.chunkCount, 1, 'Chỉ được có đúng 1 chunk');
    assert.ok(fs.existsSync(outPath), 'File audio phải được tạo thành công');
    assert.ok(result.sizeBytes > 1024);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('VoiceValidatorService: Phân tách kịch bản đa ngôn ngữ (Nhật, Trung, Emoji, Ngoặc Kép)', () => {
  const service = new VoiceValidatorService();
  const script = `
    ある日、大富豪が秘密裏に故郷へ戻ることを決意した。彼の心は懐かしさで満ちていた。
    很久以前，有一个非常勇敢的年轻人。他决定踏上前往远方的旅程！
    Anh ta hét lớn: "Đừng ai lại gần đây!" 🔥 Và mọi chuyện bắt đầu từ đó... 🚀
  `;

  const chunks = service.splitScriptIntoChunks(script);
  assert.ok(chunks.length >= 2, `Phải phân tách đúng các đoạn ngôn ngữ khác nhau (thực tế: ${chunks.length})`);
  const fullText = chunks.map(c => c.text).join(' ');
  assert.ok(fullText.includes('ある日'), 'Phải bảo tồn tiếng Nhật');
  assert.ok(fullText.includes('很久以前'), 'Phải bảo tồn tiếng Trung');
  assert.ok(fullText.includes('"Đừng ai lại gần đây!"'), 'Phải bảo tồn ngoặc kép thoại');
  assert.ok(fullText.includes('🚀'), 'Phải bảo tồn emoji');
});

test('VoiceStudioService: checkHealth kiểm tra trạng thái VoiceStudio chính xác', async () => {
  const service = new VoiceStudioService({ baseUrl: 'http://127.0.0.1:3900/v1' });
  const health = await service.checkHealth();
  assert.ok(typeof health.online === 'boolean');
  assert.ok(health.baseUrl.includes('3900'));
  // Đã cài đặt VoiceStudio trên máy tính
  assert.ok(health.appInstalled !== undefined);
  if (health.appInstalled) {
    assert.ok(health.appPath && health.appPath.includes('VoiceStudio.exe'));
  }
});

test('VoiceValidatorService: generateChunkWithHealing ném lỗi rõ ràng khi thất bại cả 3 lần', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_fail_'));
  try {
    const mockVoiceStudioFail = {
      generateSpeech: async () => {
        throw new Error('API sập máy chủ 500');
      }
    };

    const service = new VoiceValidatorService({
      voiceStudioService: mockVoiceStudioFail,
      maxRetriesPerChunk: 3
    });

    const chunk = { index: 1, text: 'Câu này sẽ thất bại hoàn toàn.', wordCount: 6 };
    const chunkPath = path.join(tempDir, 'fail.mp3');

    await assert.rejects(
      async () => {
        await service.generateChunkWithHealing({
          chunk,
          voice: 'test_voice',
          chunkAudioPath: chunkPath
        });
      },
      (err) => {
        assert.ok(err.message.includes('Đã thử 3 lần nhưng không thể tạo thành công câu #1'));
        assert.ok(err.message.includes('API sập máy chủ 500'));
        return true;
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// =========================================================================
// TEST SUITE 7: Tích hợp Voice Clone Profile & Batch Script (.txt -> .mp3)
// =========================================================================

test('VoiceStudioService: Tự động nạp profile từ VoiceProfileManager và đồng bộ vsProfileId', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_vs_clone_'));
  try {
    const profileManager = new VoiceProfileManager({ baseDir: tempDir });
    const samplePath = path.join(tempDir, 'ref_sample.wav');
    fs.writeFileSync(samplePath, createValidWavBuffer(0.3));

    profileManager.saveProfile({
      id: 'giong_nhat_ban',
      name: 'Giọng Kể Chuyện Nhật Bản',
      language: 'ja',
      speed: 1.1,
      model: 'omnivoice'
    }, samplePath);

    let uploadedProfile = null;
    const service = new VoiceStudioService({
      baseUrl: 'http://127.0.0.1:3900/v1',
      profileManager
    });

    service._checkVoiceStudioProfileExists = async () => false;
    service._uploadCloneProfileToVoiceStudio = async (opts) => {
      uploadedProfile = opts;
      return 'vs_uuid_12345';
    };

    const resolvedVoice = await service._ensureVoiceStudioCloneProfile({
      profile: profileManager.getProfile('giong_nhat_ban'),
      refAudio: samplePath,
      language: 'ja',
      voiceName: 'giong_nhat_ban'
    });

    assert.equal(resolvedVoice, 'vs_uuid_12345');
    assert.ok(uploadedProfile, 'Phải gọi upload clone profile lên VoiceStudio');
    assert.equal(uploadedProfile.language, 'ja');

    // Kiểm tra vsProfileId đã được lưu lại vào profile.json cục bộ
    const updated = profileManager.getProfile('giong_nhat_ban');
    assert.equal(updated.vsProfileId, 'vs_uuid_12345');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('scanBatchInputs: Xử lý thư mục trộn lẫn kịch bản đã có voice và chưa có voice, xuất .wav duy nhất', () => {
  const { scanBatchInputs } = require('../src/main/services/media-scanner');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_scan_txt_'));
  try {
    // Tập 1: Chỉ có kịch bản .txt (chưa có voice)
    fs.writeFileSync(path.join(tempDir, 'tap_01.txt'), 'Nội dung kịch bản tập 1 chưa có voice.', 'utf8');
    // Tập 2: Có cả kịch bản .txt VÀ đã có sẵn file voice hợp lệ
    fs.writeFileSync(path.join(tempDir, 'tap_02.txt'), 'Nội dung kịch bản tập 2 đã có voice sẵn.', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'tap_02.wav'), createValidWavBuffer(0.3));

    // Không bật includeScripts -> chỉ thấy 1 file audio có sẵn (tap_02.wav)
    const audioOnly = scanBatchInputs(tempDir, tempDir, { includeScripts: false });
    assert.equal(audioOnly.length, 1);
    assert.equal(audioOnly[0].voiceName, 'tap_02.wav');

    // Bật includeScripts -> thấy cả tap_01.txt (chuyển mục tiêu thành tap_01.wav, needsVoiceGeneration=true)
    // và tap_02.wav (giữ nguyên needsVoiceGeneration=false vì đã có voice sẵn!)
    const withScripts = scanBatchInputs(tempDir, tempDir, { includeScripts: true });
    assert.equal(withScripts.length, 2);

    const missingVoiceJob = withScripts.find(j => j.voiceName === 'tap_01.wav');
    assert.ok(missingVoiceJob, 'Phải tạo mục tiêu 1 file .wav cho kịch bản chưa có voice');
    assert.equal(missingVoiceJob.needsVoiceGeneration, true, 'Kịch bản chưa có voice phải bật needsVoiceGeneration = true');
    assert.ok(missingVoiceJob.scriptPath.endsWith('tap_01.txt'));

    const existingVoiceJob = withScripts.find(j => j.voiceName === 'tap_02.wav');
    assert.ok(existingVoiceJob, 'Phải giữ nguyên bài đã có voice');
    assert.equal(existingVoiceJob.needsVoiceGeneration, false, 'Kịch bản ĐÃ CÓ voice hợp lệ phải giữ needsVoiceGeneration = false (không tạo lại)');
    assert.ok(existingVoiceJob.scriptPath.endsWith('tap_02.txt'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('VoiceValidatorService: Xuất duy nhất 1 file .wav và tự động xóa sạch toàn bộ file tạm/cache', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs_test_wav_clean_'));
  try {
    const validAudioData = createValidWavBuffer(0.6);
    let cleanupCalled = false;
    const mockVoiceStudio = {
      generateSpeech: async ({ outputPath }) => {
        fs.writeFileSync(outputPath, validAudioData);
      },
      cleanupVoiceCaches: async (opts) => {
        cleanupCalled = true;
        return { removedFiles: 2, freedBytes: 4096 };
      }
    };

    const service = new VoiceValidatorService({
      voiceStudioService: mockVoiceStudio
    });

    const outWav = path.join(tempDir, 'kich_ban_final.wav');
    const result = await service.generateFullScript({
      scriptText: 'Câu thứ nhất để kiểm tra ghép nối WAV chuẩn. Câu thứ hai để đảm bảo các file tạm bị xóa sạch hoàn toàn.',
      voice: 'test_voice',
      finalOutputPath: outWav
    });

    assert.equal(result.success, true);
    assert.ok(fs.existsSync(outWav), 'File .wav duy nhất phải tồn tại');
    assert.equal(cleanupCalled, true, 'Phải tự động gọi cleanupVoiceCaches sau khi tạo xong');

    // Kiểm tra trong thư mục tempDir chỉ còn đúng 1 file .wav duy nhất, không còn bất kỳ folder .voice_chunks_* hay file tạm nào
    const remainingEntries = fs.readdirSync(tempDir);
    assert.deepEqual(remainingEntries, ['kich_ban_final.wav'], 'Chỉ được phép giữ lại đúng 1 file .wav duy nhất trong thư mục');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
