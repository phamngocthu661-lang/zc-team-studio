'use strict';

const fs = require('node:fs');
const path = require('node:path');

const GLOBAL_VOICES_FOLDER_DEFAULT = 'Global_Voices';

/**
 * Service quản lý các Voice Profile (Metadata + file mẫu âm thanh tham chiếu)
 * và đồng bộ 2 chiều với Google Drive (thư mục Global_Voices).
 */
class VoiceProfileManager {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseDir] Thư mục lưu trữ profiles trên máy cục bộ
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || this._resolveDefaultProfilesDir();
    this._ensureDir(this.baseDir);
  }

  /**
   * Xác định thư mục lưu trữ profile cục bộ
   */
  _resolveDefaultProfilesDir() {
    let appRoot = path.resolve(__dirname, '../../../..');
    let legacyDir = null;
    try {
      const electronApp = require('electron').app;
      if (electronApp) {
        if (electronApp.isPackaged) {
          appRoot = path.dirname(electronApp.getPath('exe'));
        }
        if (typeof electronApp.getPath === 'function') {
          legacyDir = path.join(electronApp.getPath('userData'), 'voice_profiles');
        }
      }
    } catch {}

    if (!legacyDir && process.env.APPDATA) {
      legacyDir = path.join(process.env.APPDATA, 'video-batch-studio-desktop-offline', 'voice_profiles');
    }

    const portableDir = path.join(appRoot, 'Kho_Voice');
    this._ensureDir(portableDir);

    if (legacyDir && fs.existsSync(legacyDir) && path.resolve(legacyDir) !== path.resolve(portableDir)) {
      try {
        for (const entry of fs.readdirSync(legacyDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const srcFolder = path.join(legacyDir, entry.name);
          const dstFolder = path.join(portableDir, entry.name);
          if (!fs.existsSync(dstFolder)) {
            fs.cpSync(srcFolder, dstFolder, { recursive: true });
          }
        }
      } catch {}
    }

    return portableDir;
  }

  _ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (err) {
        console.warn(`[VoiceProfileManager] Không thể tạo thư mục ${dirPath}:`, err.message);
      }
    }
  }

  /**
   * Chuẩn hóa ID an toàn từ tên giọng
   */
  _slugify(name) {
    if (!name) return 'voice_' + Date.now();
    return String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || ('voice_' + Date.now());
  }

  /**
   * Liệt kê tất cả các Voice Profiles hiện có trên máy
   * @returns {Array<Object>}
   */
  listProfiles() {
    this._ensureDir(this.baseDir);
    const profiles = [];

    try {
      const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const profileFolder = path.join(this.baseDir, entry.name);
        const metaPath = path.join(profileFolder, 'profile.json');

        if (fs.existsSync(metaPath)) {
          try {
            const raw = fs.readFileSync(metaPath, 'utf8');
            const data = JSON.parse(raw);
            const sampleFileName = data.sampleFile || 'sample.wav';
            const sampleFullPath = path.join(profileFolder, sampleFileName);
            const hasSample = fs.existsSync(sampleFullPath);
            const refTxtPath = path.join(profileFolder, 'sample.txt');
            const refText = data.refText || (fs.existsSync(refTxtPath) ? fs.readFileSync(refTxtPath, 'utf8').trim() : '');

            profiles.push({
              ...data,
              id: data.id || entry.name,
              refText,
              folderPath: profileFolder,
              samplePath: hasSample ? sampleFullPath : null,
              hasSample
            });
          } catch (err) {
            console.warn(`[VoiceProfileManager] Lỗi đọc profile tại ${entry.name}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('[VoiceProfileManager] Lỗi đọc thư mục profiles:', err.message);
    }

    // Sắp xếp ưu tiên theo thứ tự số (01 -> 12) hoặc mới nhất
    return profiles.sort((a, b) => {
      const aNum = /^\d{2}_/.test(a.id || '');
      const bNum = /^\d{2}_/.test(b.id || '');
      if (aNum && bNum) return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      if (aNum) return -1;
      if (bNum) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }

  /**
   * Lấy thông tin một profile theo ID
   * @param {string} profileId
   */
  getProfile(profileId) {
    if (!profileId) return null;
    const cleanId = String(profileId).trim();
    const profileFolder = path.join(this.baseDir, cleanId);
    const metaPath = path.join(profileFolder, 'profile.json');

    if (!fs.existsSync(metaPath)) return null;

    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const sampleFileName = data.sampleFile || 'sample.wav';
      const sampleFullPath = path.join(profileFolder, sampleFileName);
      const refTxtPath = path.join(profileFolder, 'sample.txt');
      const refText = data.refText || (fs.existsSync(refTxtPath) ? fs.readFileSync(refTxtPath, 'utf8').trim() : '');
      return {
        ...data,
        id: data.id || cleanId,
        refText,
        folderPath: profileFolder,
        samplePath: fs.existsSync(sampleFullPath) ? sampleFullPath : null,
        hasSample: fs.existsSync(sampleFullPath)
      };
    } catch {
      return null;
    }
  }

  /**
   * Tạo hoặc cập nhật Voice Profile (Hỗ trợ cả tạo mới và chỉnh sửa / đổi ID / giữ nguyên hoặc thay file mẫu)
   * @param {Object} data Thông tin profile { originalId, id, name, language, description, speed, model }
   * @param {string} [sourceSamplePath] Đường dẫn file mẫu âm thanh tham chiếu cần nạp vào
   */
  saveProfile(data = {}, sourceSamplePath = null) {
    if (!data.name || !String(data.name).trim()) {
      throw new Error('Tên giọng nói (name) không được để trống.');
    }

    const originalId = data.originalId ? String(data.originalId).trim() : null;
    const oldProfile = originalId ? this.getProfile(originalId) : null;

    const rawTargetId = data.id ? String(data.id).trim() : (originalId || data.name);
    const id = this._slugify(rawTargetId);
    const profileFolder = path.join(this.baseDir, id);
    this._ensureDir(profileFolder);

    const now = new Date().toISOString();
    let existing = this.getProfile(id) || oldProfile || {};

    let sampleFileName = existing.sampleFile || 'sample.wav';
    let sampleChanged = false;

    if (sourceSamplePath && fs.existsSync(sourceSamplePath)) {
      const ext = path.extname(sourceSamplePath).toLowerCase() || '.wav';
      sampleFileName = `sample${ext}`;
      const destSamplePath = path.join(profileFolder, sampleFileName);
      if (path.resolve(sourceSamplePath) !== path.resolve(destSamplePath)) {
        fs.copyFileSync(sourceSamplePath, destSamplePath);
        sampleChanged = true;
      }
    } else if (oldProfile && oldProfile.samplePath && fs.existsSync(oldProfile.samplePath)) {
      const ext = path.extname(oldProfile.samplePath).toLowerCase() || '.wav';
      sampleFileName = `sample${ext}`;
      const destSamplePath = path.join(profileFolder, sampleFileName);
      if (path.resolve(oldProfile.samplePath) !== path.resolve(destSamplePath)) {
        fs.copyFileSync(oldProfile.samplePath, destSamplePath);
      }
    }

    const profileMeta = {
      id,
      name: String(data.name).trim(),
      language: data.language || existing.language || 'vi',
      description: data.description !== undefined ? data.description : (existing.description || ''),
      personality: data.personality !== undefined ? data.personality : (existing.personality || ''),
      refText: data.refText !== undefined ? data.refText : (existing.refText || ''),
      channelKey: data.channelKey !== undefined ? data.channelKey : (existing.channelKey || ''),
      speed: Number(data.speed) || existing.speed || 1.0,
      model: data.model || existing.model || 'omnivoice',
      sampleFile: sampleFileName,
      vsProfileId: data.vsProfileId !== undefined ? data.vsProfileId : (sampleChanged ? null : (existing.vsProfileId || null)),
      createdAt: existing.createdAt || now,
      updatedAt: now
    };

    const metaPath = path.join(profileFolder, 'profile.json');
    fs.writeFileSync(metaPath, JSON.stringify(profileMeta, null, 2), 'utf8');

    // Nếu người dùng đổi mã ID khi sửa profile, xóa thư mục ID cũ để tránh trùng lặp
    if (oldProfile && oldProfile.id && oldProfile.id !== id && oldProfile.folderPath && fs.existsSync(oldProfile.folderPath)) {
      try {
        if (path.resolve(oldProfile.folderPath) !== path.resolve(profileFolder)) {
          fs.rmSync(oldProfile.folderPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn(`[VoiceProfileManager] Không thể xóa thư mục ID cũ ${oldProfile.folderPath}:`, err.message);
      }
    }

    return this.getProfile(id);
  }

  /**
   * Xóa Voice Profile
   * @param {string} profileId
   */
  deleteProfile(profileId) {
    const profile = this.getProfile(profileId);
    if (!profile) return false;

    try {
      if (fs.existsSync(profile.folderPath)) {
        fs.rmSync(profile.folderPath, { recursive: true, force: true });
      }
      return true;
    } catch (err) {
      console.error(`[VoiceProfileManager] Không thể xóa profile ${profileId}:`, err.message);
      return false;
    }
  }
}

module.exports = {
  VoiceProfileManager
};
