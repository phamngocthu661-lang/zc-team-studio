'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DEFAULT_GLABS_MODEL, DEFAULT_ASPECT_RATIO } = require('./glabs-image-service');

/**
 * CAMERA SHOT VARIATIONS theo Skill 08 (Rule 22 - Camera Language System)
 */
const CINEMATIC_CAMERA_SHOTS = [
  { type: 'WIDE_ESTABLISHING', desc: 'wide establishing shot, 28mm lens feel, deep depth of field, environmental storytelling' },
  { type: 'MEDIUM_DRAMA', desc: 'cinematic medium shot, 50mm lens feel, eye-level framing, natural depth of field' },
  { type: 'OVER_THE_SHOULDER', desc: 'over-the-shoulder confrontation shot, 65mm lens, intense narrative focus' },
  { type: 'EMOTIONAL_CLOSEUP', desc: 'intimate close-up portrait, 85mm lens, shallow depth of field, dramatic emotional expression' },
  { type: 'LOW_ANGLE_HERO', desc: 'subtle low angle cinematic shot, powerful composition, dramatic grounded lighting' },
  { type: 'HIGH_ANGLE_VULNERABLE', desc: 'subtle high angle shot, narrative vulnerability, grounded realistic staging' },
  { type: 'DUTCH_TENSION', desc: 'cinematic medium-close shot, sharp focus, atmospheric tension, naturalistic shadows' }
];

/**
 * MOTIVATED LIGHTING PROFILES theo Skill 08 (Rule 24)
 */
const CINEMATIC_LIGHTING_PROFILES = [
  'natural directional window sunlight, subtle volumetric dust motes, realistic soft shadows',
  'cinematic late afternoon golden hour light, warm side-lit illumination, realistic ambient bounce',
  'grounded overcast atmospheric lighting, soft diffuse shadows, authentic textured tones',
  'moody interior practical lamps, subtle amber warm glow with cool deep ambient contrast',
  'dramatic night scene, authentic practical street lights and headlights, grounded cinematic noir feel'
];

/**
 * PHOTOREALISTIC QUALITY ANCHORS theo Skill 08 (Rule 25)
 */
const PHOTOREALISM_SUFFIX = 'cinematic 35mm photograph, authentic photorealism, natural skin pores and realistic texture, grounded lighting, detailed realistic clothing folds, high cinematic production value, shot on ARRI Alexa, 8k resolution, masterpieces, photorealistic, no cartoon, no CGI, no waxy plastic skin, no illustration';

class CinematicVisualDirector {
  constructor({ glabsImageService } = {}) {
    this.glabsService = glabsImageService;
  }

  /**
   * Đọc và phân tách file SRT thành danh sách Cues
   */
  parseSrtCues(srtContent) {
    if (!srtContent || typeof srtContent !== 'string') return [];
    const cues = [];
    const blocks = srtContent.replace(/\r\n/g, '\n').split(/\n{2,}/);

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const timeIndex = lines.findIndex(l => l.includes('-->'));
      if (timeIndex < 0) continue;

      const [startStr, endStr] = lines[timeIndex].split(/\s*-->\s*/);
      const text = lines.slice(timeIndex + 1).join(' ').trim();
      const startMs = this.timestampToMs(startStr);
      const endMs = this.timestampToMs(endStr);

      if (endMs > startMs && text) {
        cues.push({ startMs, endMs, durationMs: endMs - startMs, text });
      }
    }

    return cues.sort((a, b) => a.startMs - b.startMs);
  }

  timestampToMs(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
    if (!match) return 0;
    return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) +
      Number(match[4].padEnd(3, '0'));
  }

  /**
   * Phân tích và trích xuất Visual DNA của nhân vật chính từ kịch bản
   * Tạo IMMUTABLE IDENTITY BLOCK theo Skill 08 (Rule 9)
   */
  extractCharacterDNA(scriptText, customDna = '') {
    if (customDna && customDna.trim()) {
      return customDna.trim();
    }

    const text = String(scriptText || '');
    // Nhận diện nhân vật điển hình theo ngữ cảnh kịch bản
    let characterDNA = 'protagonist, realistic distinctive face, natural believable hair, authentic posture, grounded wardrobe';

    if (/ông|bố|cha|old man|grandfather|elder/i.test(text)) {
      characterDNA = '65-year-old weathered resilient man, deep-set thoughtful eyes, natural graying hair, neatly trimmed silver stubble, lined determined face, wearing a practical rugged wool jacket, authentic realistic anatomy';
    } else if (/bà|mẹ|grandmother|elderly woman/i.test(text)) {
      characterDNA = '62-year-old dignified kind woman, gentle expressive warm eyes, natural silver-streaked hair tied softly, realistic graceful aging, wearing a modest knitted cardigan, authentic grounded presence';
    } else if (/tỷ phú|chủ tịch|billionaire|ceo|giám đốc|boss|trùm/i.test(text)) {
      characterDNA = '42-year-old sharp commanding man, piercing focused eyes, neat dark styled hair, chiseled masculine jawline, composed authoritative posture, wearing a bespoke tailored charcoal three-piece suit, impeccable fabric texture';
    } else if (/cô gái|nữ|woman|maid|waitress|người hầu|em gái/i.test(text)) {
      characterDNA = '26-year-old earnest graceful woman, clear observant dark eyes, dark chestnut hair tied in a practical loose ponytail, natural unembellished facial beauty, slender resilient posture, wearing a clean understated vintage work apron over a simple modest blouse';
    } else if (/chàng trai|thanh niên|young man|bác sĩ|cảnh sát/i.test(text)) {
      characterDNA = '30-year-old sharp observant man, focused intelligent gaze, short clean-cut dark brown hair, determined jawline, athletic lean build, wearing a dark practical utility jacket, authentic cinematic look';
    }

    return characterDNA;
  }

  /**
   * Phân chia kịch bản thành các phân cảnh (Scenes) theo 1 trong 3 chế độ:
   * 1. 'CUE' / 'SRT': Theo câu thoại / cue phụ đề
   * 2. 'FIXED': Cố định thời gian (ví dụ 6s/ảnh)
   * 3. 'DISTRIBUTE': Theo số lượng ảnh chỉ định (chia đều thời lượng voice)
   * 
   * @param {object} params
   * @param {string} [params.scriptText]
   * @param {string} [params.srtContent]
   * @param {number} params.voiceDurationMs
   * @param {string} [params.mode] 'CUE' | 'FIXED' | 'DISTRIBUTE'
   * @param {number} [params.imageSeconds] Số giây mỗi ảnh (cho mode FIXED, mặc định 6s)
   * @param {number} [params.imageCount] Tổng số ảnh (cho mode DISTRIBUTE, mặc định 30)
   * @param {string} [params.customCharacterDna]
   * @returns {Array<object>} Danh sách phân cảnh với prompt hoàn chỉnh
   */
  planScenes({
    scriptText = '',
    srtContent = '',
    voiceDurationMs = 60000,
    mode = 'FIXED',
    imageSeconds = 6,
    imageCount = 30,
    customCharacterDna = ''
  } = {}) {
    const totalMs = Math.max(1000, Number(voiceDurationMs) || 60000);
    const charDna = this.extractCharacterDNA(scriptText, customCharacterDna);
    const cues = this.parseSrtCues(srtContent);
    const scenes = [];

    const effectiveMode = String(mode || 'FIXED').toUpperCase();

    // =========================================================================
    // CHẾ ĐỘ 1: THEO CÂU THOẠI (CUE / SRT)
    // Tự động gộp câu quá ngắn (<3.5s) và tách đoạn độc thoại quá dài (>12s)
    // =========================================================================
    if (effectiveMode === 'CUE' || effectiveMode === 'SRT') {
      if (cues.length > 0) {
        let currentGroup = [];
        let groupStartMs = cues[0].startMs;

        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i];
          currentGroup.push(cue.text);
          const currentDurationMs = cue.endMs - groupStartMs;

          // Nếu đạt thời lượng tối ưu (>= 4.5s) hoặc là câu cuối cùng
          const isLast = (i === cues.length - 1);
          const nextCue = cues[i + 1];
          const shouldCut = isLast || (currentDurationMs >= 4500) || (nextCue && (nextCue.endMs - groupStartMs > 12000));

          if (shouldCut) {
            const endMs = isLast ? totalMs : cue.endMs;
            scenes.push({
              sceneIndex: scenes.length + 1,
              startMs: groupStartMs,
              endMs,
              durationMs: endMs - groupStartMs,
              dialogue: currentGroup.join(' ')
            });

            if (!isLast && nextCue) {
              groupStartMs = nextCue.startMs;
              currentGroup = [];
            }
          }
        }
      }
    }

    // =========================================================================
    // CHẾ ĐỘ 2: CỐ ĐỊNH THỜI GIAN (FIXED DURATION, vd 6s - 8s / ảnh)
    // =========================================================================
    if (scenes.length === 0 && effectiveMode === 'FIXED') {
      const slotMs = Math.max(2000, Math.round(Number(imageSeconds || 6) * 1000));
      const totalSlots = Math.max(1, Math.ceil(totalMs / slotMs));

      // Tách kịch bản thành các câu để gán cho từng slot
      const sentences = this.splitScriptSentences(scriptText);

      for (let i = 0; i < totalSlots; i++) {
        const startMs = i * slotMs;
        const endMs = Math.min(totalMs, startMs + slotMs);
        const sentenceIndex = sentences.length > 0 ? Math.floor((i / totalSlots) * sentences.length) : 0;
        const dialogue = sentences[sentenceIndex] || `Scene ${i + 1}`;

        scenes.push({
          sceneIndex: i + 1,
          startMs,
          endMs,
          durationMs: endMs - startMs,
          dialogue
        });
      }
    }

    // =========================================================================
    // CHẾ ĐỘ 3: THEO TỔNG SỐ LƯỢNG ẢNH CHỈ ĐỊNH (DISTRIBUTE)
    // =========================================================================
    if (scenes.length === 0 || effectiveMode === 'DISTRIBUTE') {
      scenes.length = 0; // reset
      const targetCount = Math.max(1, Math.min(200, Number(imageCount || 30)));
      const durationPerScene = totalMs / targetCount;
      const sentences = this.splitScriptSentences(scriptText);

      for (let i = 0; i < targetCount; i++) {
        const startMs = Math.round(i * durationPerScene);
        const endMs = (i === targetCount - 1) ? totalMs : Math.round((i + 1) * durationPerScene);
        const sentenceIndex = sentences.length > 0 ? Math.floor((i / targetCount) * sentences.length) : 0;
        const dialogue = sentences[sentenceIndex] || `Key Moment ${i + 1}`;

        scenes.push({
          sceneIndex: i + 1,
          startMs,
          endMs,
          durationMs: endMs - startMs,
          dialogue
        });
      }
    }

    // Gắn Prompt điện ảnh theo Skill 08 cho từng phân cảnh
    return scenes.map((scene, idx) => {
      const cameraShot = CINEMATIC_CAMERA_SHOTS[idx % CINEMATIC_CAMERA_SHOTS.length];
      const lighting = CINEMATIC_LIGHTING_PROFILES[idx % CINEMATIC_LIGHTING_PROFILES.length];
      const sceneAction = this.deriveSceneAction(scene.dialogue, idx, scenes.length);

      const prompt = `[SCENE ${scene.sceneIndex}] ${cameraShot.desc}. ${charDna}. ${sceneAction}. Lighting: ${lighting}. ${PHOTOREALISM_SUFFIX}`;

      return {
        ...scene,
        cameraType: cameraShot.type,
        cameraDesc: cameraShot.desc,
        lighting,
        prompt
      };
    });
  }

  /**
   * Tách câu văn trong kịch bản
   */
  splitScriptSentences(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .replace(/\r\n/g, '\n')
      .split(/(?<=[.!?。！？\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  /**
   * Tạo mô tả hành động cảm xúc điện ảnh bám theo đoạn thoại
   */
  deriveSceneAction(dialogue, index, total) {
    const clean = String(dialogue || '').replace(/[\r\n\t]+/g, ' ').trim();
    if (clean.length > 10) {
      // Dịch nghĩa diễn tiến tự nhiên
      return `Visual moment depicting: "${clean.slice(0, 160)}", emotionally charged, authentic narrative interaction, focused character reaction`;
    }

    const progress = total > 1 ? index / (total - 1) : 0;
    if (progress < 0.25) {
      return 'Atmospheric opening, protagonist establishing their solitary environment, quiet contemplative moment with strong narrative mood';
    } else if (progress < 0.5) {
      return 'Intense dramatic confrontation, protagonist standing firm amidst unfolding tension, expressive eyes revealing profound inner conflict';
    } else if (progress < 0.75) {
      return 'Critical turning point, an important revelation taking place, sudden shift in power dynamic witnessed in the room';
    } else {
      return 'Emotional resolution and powerful catharsis, calm triumphant composure after justice prevails, grounded atmospheric conclusion';
    }
  }

  /**
   * Tạo trọn gói bộ ảnh cho kịch bản:
   * 1. Lập danh sách phân cảnh & prompt Skill 08
   * 2. Gọi G-Labs Studio Webhook tạo từng ảnh
   * 3. Lưu vào thư mục chỉ định và trả về danh sách ảnh đã tạo
   * 
   * @param {object} params
   * @param {string} params.outputFolder Thư mục lưu ảnh
   * @param {string} [params.scriptText]
   * @param {string} [params.srtPath]
   * @param {number} params.voiceDurationMs
   * @param {string} [params.mode] 'CUE' | 'FIXED' | 'DISTRIBUTE'
   * @param {number} [params.imageSeconds]
   * @param {number} [params.imageCount]
   * @param {string} [params.model]
   * @param {Function} [params.onProgress]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<{ scenes: Array<object>, imageFiles: string[], outputFolder: string }>}
   */
  async generateStoryImagePackage({
    outputFolder,
    scriptText = '',
    srtPath = '',
    voiceDurationMs = 60000,
    mode = 'FIXED',
    imageSeconds = 6,
    imageCount = 30,
    model = DEFAULT_GLABS_MODEL,
    customCharacterDna = '',
    onProgress,
    signal
  } = {}) {
    if (!this.glabsService) {
      throw new Error('Chưa khởi tạo GLabsImageService trong CinematicVisualDirector');
    }

    if (!outputFolder) {
      throw new Error('outputFolder là bắt buộc để lưu bộ ảnh');
    }

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Đọc SRT nếu có
    let srtContent = '';
    if (srtPath && fs.existsSync(srtPath)) {
      try {
        srtContent = fs.readFileSync(srtPath, 'utf8');
      } catch {}
    }

    // 1. Lập kế hoạch phân cảnh
    onProgress?.({ stage: 'PLANNING', percent: 5, message: 'Đang phân tích kịch bản theo Skill 08...' });
    const scenes = this.planScenes({
      scriptText,
      srtContent,
      voiceDurationMs,
      mode,
      imageSeconds,
      imageCount,
      customCharacterDna
    });

    if (!scenes.length) {
      throw new Error('Không thể phân tích phân cảnh từ kịch bản / voice đã cung cấp.');
    }

    // Lưu danh sách prompt ra file để kiểm tra
    const promptLogPath = path.join(outputFolder, 'prompts.json');
    fs.writeFileSync(promptLogPath, JSON.stringify(scenes, null, 2), 'utf8');

    const promptTxtPath = path.join(outputFolder, 'prompts.txt');
    const txtContent = scenes.map(s => `[SCENE ${s.sceneIndex} | ${s.startMs}ms -> ${s.endMs}ms]\n${s.prompt}\n`).join('\n');
    fs.writeFileSync(promptTxtPath, txtContent, 'utf8');

    onProgress?.({
      stage: 'PLANNED',
      percent: 10,
      totalScenes: scenes.length,
      message: `Đã lập kế hoạch ${scenes.length} phân cảnh điện ảnh. Bắt đầu tạo ảnh qua G-Labs (${model})...`
    });

    const imageFiles = [];

    // 2. Tuần tự tạo từng ảnh qua G-Labs Webhook
    for (let i = 0; i < scenes.length; i++) {
      if (signal?.aborted) {
        throw new Error('Quá trình tạo ảnh đã bị người dùng hủy.');
      }

      const scene = scenes[i];
      const sceneNumStr = String(scene.sceneIndex).padStart(3, '0');
      const targetImageFileName = `scene_${sceneNumStr}.png`;
      const targetImagePath = path.join(outputFolder, targetImageFileName);

      // Nếu ảnh đã tồn tại hợp lệ thì tái sử dụng, không cần tốn quota tạo lại
      if (fs.existsSync(targetImagePath) && fs.statSync(targetImagePath).size > 1000) {
        imageFiles.push(targetImagePath);
        const percent = Math.round(10 + ((i + 1) / scenes.length) * 85);
        onProgress?.({
          stage: 'IMAGE_EXISTS',
          currentIndex: i + 1,
          totalScenes: scenes.length,
          percent,
          imagePath: targetImagePath,
          message: `Ảnh phân cảnh ${i + 1}/${scenes.length} đã có sẵn, bỏ qua tạo lại.`
        });
        continue;
      }

      const percent = Math.round(10 + (i / scenes.length) * 85);
      onProgress?.({
        stage: 'GENERATING_IMAGE',
        currentIndex: i + 1,
        totalScenes: scenes.length,
        percent,
        prompt: scene.prompt,
        message: `Đang tạo ảnh phân cảnh ${i + 1}/${scenes.length} [G-Labs: ${model}]...`
      });

      await this.glabsService.generateAndSaveImage({
        prompt: scene.prompt,
        outputPath: targetImagePath,
        model,
        aspectRatio: DEFAULT_ASPECT_RATIO,
        onProgress: (p) => {
          onProgress?.({
            stage: 'IMAGE_STEP',
            currentIndex: i + 1,
            totalScenes: scenes.length,
            percent,
            ...p
          });
        },
        signal
      });

      imageFiles.push(targetImagePath);
    }

    onProgress?.({
      stage: 'COMPLETED',
      percent: 100,
      totalScenes: scenes.length,
      imageCount: imageFiles.length,
      outputFolder,
      message: `Đã hoàn tất tạo đủ ${imageFiles.length} ảnh phân cảnh điện ảnh!`
    });

    return {
      scenes,
      imageFiles,
      outputFolder
    };
  }
}

module.exports = {
  CinematicVisualDirector,
  CINEMATIC_CAMERA_SHOTS,
  CINEMATIC_LIGHTING_PROFILES,
  PHOTOREALISM_SUFFIX
};
