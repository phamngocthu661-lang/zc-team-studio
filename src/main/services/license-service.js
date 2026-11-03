'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const net = require('node:net');
const dns = require('node:dns');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { resolveResourceRoot, resolveAppRootDir } = require('./path-utils');

try { net.setDefaultAutoSelectFamily?.(false); } catch {}
try { dns.setDefaultResultOrder?.('ipv4first'); } catch {}

// Ed25519 Public Key chuẩn Production (App khách hàng chỉ giữ Public Key để xác minh chữ ký số)
const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEASgB/ZRTj5w9wS2M3uS0GUxS/wIRa26EL0LRHaout5LY=
-----END PUBLIC KEY-----`;

const CLOCK_ROLLBACK_TOLERANCE_MS = 6 * 3600 * 1000; // Cho phép lệch múi giờ tối đa 6 tiếng
const CLOCK_GUARD_SETTING_KEY = 'vbs.license.clock_guard';
const REVOKED_GUARD_SETTING_KEY = 'vbs.license.revoked_registry';
const CLOUD_SYNC_TOPIC = 'vbs_lic_reg_7c8e07da14a8_v1';

class LicenseService {
  constructor({ database, paths } = {}) {
    this.database = database || null;
    this.paths = paths || {};
    this._cachedMachineId = null;
    this.publicKeyPem = this._loadPublicKey();
  }

  _loadPublicKey() {
    try {
      const pemPath = path.join(resolveResourceRoot(), 'license', 'offline-public-key.pem');
      if (fs.existsSync(pemPath)) {
        const content = fs.readFileSync(pemPath, 'utf8').trim();
        if (content.includes('BEGIN PUBLIC KEY')) return content;
      }
    } catch {}
    return EMBEDDED_PUBLIC_KEY_PEM;
  }

  /**
   * Lấy đường dẫn lưu trữ phụ trong %APPDATA% để giữ License khi khách cập nhật bản mới
   * và chống xóa thư mục data/ để reset đồng hồ hoặc lách danh sách Key bị xóa
   */
  _getAppDataStoreDir() {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const dir = path.join(base, 'VideoBatchStudio-License');
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {}
    return dir;
  }

  _getPortableKeyFilePath() {
    const root = this.paths?.root || path.join(resolveAppRootDir(), 'data');
    try {
      if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
    } catch {}
    return path.join(root, 'license.key');
  }

  _getAppDataKeyFilePath() {
    return path.join(this._getAppDataStoreDir(), 'license-active.json');
  }

  _getClockGuardFilePath() {
    return path.join(this._getAppDataStoreDir(), '.sys_clock_guard.json');
  }

  _getRevokedRegistryFilePath() {
    return path.join(this._getAppDataStoreDir(), '.sys_revoked_registry.json');
  }

  /**
   * Đọc danh sách Key đã bị Admin xóa/khóa (lưu trong cả DB và %APPDATA%)
   */
  _loadRevokedRegistry() {
    let best = { updatedAt: 0, revokedKeys: [], revokedMachines: [], signedToken: '' };

    try {
      const dbReg = this.database?.getSetting(REVOKED_GUARD_SETTING_KEY, null);
      if (dbReg && Number(dbReg.updatedAt || 0) >= best.updatedAt) {
        best = {
          updatedAt: Number(dbReg.updatedAt || 0),
          revokedKeys: Array.isArray(dbReg.revokedKeys) ? dbReg.revokedKeys : [],
          revokedMachines: Array.isArray(dbReg.revokedMachines) ? dbReg.revokedMachines : [],
          signedToken: String(dbReg.signedToken || '')
        };
      }
    } catch {}

    try {
      const file = this._getRevokedRegistryFilePath();
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && Number(parsed.updatedAt || 0) >= best.updatedAt) {
          best = {
            updatedAt: Number(parsed.updatedAt || 0),
            revokedKeys: Array.isArray(parsed.revokedKeys) ? parsed.revokedKeys : [],
            revokedMachines: Array.isArray(parsed.revokedMachines) ? parsed.revokedMachines : [],
            signedToken: String(parsed.signedToken || best.signedToken || '')
          };
        }
      }
    } catch {}

    return best;
  }

  _saveRevokedRegistry(reg) {
    const clean = {
      updatedAt: Number(reg.updatedAt || Date.now()),
      revokedKeys: Array.from(new Set(reg.revokedKeys || [])),
      revokedMachines: Array.from(new Set(reg.revokedMachines || [])),
      signedToken: String(reg.signedToken || '')
    };
    try {
      this.database?.setSetting(REVOKED_GUARD_SETTING_KEY, clean);
    } catch {}
    try {
      fs.writeFileSync(this._getRevokedRegistryFilePath(), JSON.stringify(clean, null, 2), 'utf8');
    } catch {}
    return clean;
  }

  /**
   * Xác minh gói tin đồng bộ danh sách Key bị xóa/khóa từ Admin (VBSREG.<payload>.<sig>)
   * Chỉ chấp nhận gói tin có chữ ký số Ed25519 hợp lệ từ Private Key của Admin
   */
  applySignedRegistryToken(rawToken) {
    const cleaned = String(rawToken || '').trim();
    const parts = cleaned.split('.');
    if (parts.length !== 3 || parts[0] !== 'VBSREG') return false;

    const [, payloadB64, sigB64] = parts;
    try {
      const valid = crypto.verify(
        null,
        Buffer.from(payloadB64, 'utf8'),
        this.publicKeyPem,
        Buffer.from(sigB64, 'base64url')
      );
      if (!valid) return false;

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      const current = this._loadRevokedRegistry();
      if (Number(payload.updatedAt || 0) >= current.updatedAt) {
        this._saveRevokedRegistry({
          updatedAt: Number(payload.updatedAt || Date.now()),
          revokedKeys: Array.isArray(payload.revokedKeys) ? payload.revokedKeys : [],
          revokedMachines: Array.isArray(payload.revokedMachines) ? payload.revokedMachines : [],
          signedToken: cleaned
        });
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Đồng bộ ngầm danh sách Key đã bị Admin xóa/khóa qua đám mây HTTPS (ép IPv4 chống trễ mạng)
   */
  async syncRemoteRevocation() {
    try {
      const url = `https://ntfy.sh/${CLOUD_SYNC_TOPIC}/json?poll=1&since=all&_t=${Date.now()}`;
      const body = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'GET',
          family: 4,
          timeout: 6000,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }, (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          let chunks = '';
          res.setEncoding('utf8');
          res.on('data', (c) => { chunks += c; });
          res.on('end', () => resolve(chunks));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
        req.end();
      });

      let updated = false;
      let foundCloudToken = false;
      const lines = String(body || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          if (evt && evt.event === 'message' && typeof evt.message === 'string') {
            if (evt.message.startsWith('VBSREG.')) {
              foundCloudToken = true;
              if (this.applySignedRegistryToken(evt.message)) {
                updated = true;
              }
            }
          }
        } catch {}
      }

      // Nếu Cloud hết hạn bộ nhớ đệm sau nhiều ngày, tự động đẩy lại bản đã ký số Ed25519 của Admin lên Cloud
      if (!foundCloudToken) {
        const localReg = this._loadRevokedRegistry();
        if (localReg.signedToken && localReg.signedToken.startsWith('VBSREG.')) {
          const buf = Buffer.from(localReg.signedToken, 'utf8');
          const req = https.request(`https://ntfy.sh/${CLOUD_SYNC_TOPIC}`, {
            method: 'POST',
            family: 4,
            timeout: 5000,
            headers: { 'Cache': 'yes', 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': buf.length }
          }, (r) => r.resume());
          req.on('error', () => {});
          req.write(buf);
          req.end();
        }
      }

      return updated;
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra xem Key ID hoặc Mã Máy có nằm trong danh sách đã bị Admin xóa/khóa không
   */
  isRevoked(keyId, machineId) {
    const reg = this._loadRevokedRegistry();
    if (keyId && reg.revokedKeys.includes(String(keyId).trim())) {
      return true;
    }
    const normMid = this.normalizeMachineId(machineId);
    if (normMid && reg.revokedMachines.includes(normMid)) {
      return true;
    }
    return false;
  }

  /**
   * Chuẩn hóa chuỗi Mã Máy (Machine ID)
   */
  normalizeMachineId(id) {
    return String(id || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Tạo Mã Máy (Machine ID) cố định theo phần cứng & Windows MachineGuid
   * Định dạng: VBS-XXXX-XXXX-XXXX
   */
  getMachineId() {
    if (this._cachedMachineId) return this._cachedMachineId;

    let rawGuid = '';
    if (process.platform === 'win32') {
      try {
        const regOut = execFileSync('reg', [
          'query',
          'HKLM\\SOFTWARE\\Microsoft\\Cryptography',
          '/v',
          'MachineGuid'
        ], { encoding: 'utf8', timeout: 3000, windowsHide: true });
        const match = String(regOut || '').match(/MachineGuid\s+REG_SZ\s+([^\r\n\s]+)/i);
        if (match && match[1]) {
          rawGuid = match[1].trim();
        }
      } catch {}
    }

    if (!rawGuid) {
      const cpus = os.cpus() || [];
      const cpuModel = cpus[0]?.model || 'unknown-cpu';
      rawGuid = `${os.hostname()}|${os.platform()}|${os.arch()}|${cpuModel}|${os.totalmem()}`;
    }

    const hash = crypto
      .createHash('sha256')
      .update(`VBS_HWID_V1:${rawGuid.toLowerCase()}`)
      .digest('hex')
      .toUpperCase();

    this._cachedMachineId = `VBS-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
    return this._cachedMachineId;
  }

  /**
   * Đọc và kiểm tra chống chỉnh lùi giờ hệ thống (Anti-Clock Rollback)
   */
  _checkAndTouchClockGuard(now = Date.now()) {
    let maxSeen = 0;

    // 1. Đọc từ SQLite app_settings
    try {
      const dbGuard = this.database?.getSetting(CLOCK_GUARD_SETTING_KEY, null);
      if (dbGuard && Number(dbGuard.lastSeenAt) > maxSeen) {
        maxSeen = Number(dbGuard.lastSeenAt);
      }
    } catch {}

    // 2. Đọc từ SQLite license_cache
    try {
      const cache = this.database?.getLicenseCache();
      if (cache && Number(cache.last_verified_at) > maxSeen) {
        maxSeen = Number(cache.last_verified_at);
      }
    } catch {}

    // 3. Đọc từ %APPDATA%
    try {
      const guardFile = this._getClockGuardFilePath();
      if (fs.existsSync(guardFile)) {
        const parsed = JSON.parse(fs.readFileSync(guardFile, 'utf8'));
        if (parsed && Number(parsed.lastSeenAt) > maxSeen) {
          maxSeen = Number(parsed.lastSeenAt);
        }
      }
    } catch {}

    if (maxSeen > 0 && now < maxSeen - CLOCK_ROLLBACK_TOLERANCE_MS) {
      return {
        ok: false,
        lastSeenAt: maxSeen,
        message: `Phát hiện đồng hồ hệ thống bị chỉnh lùi về quá khứ (${new Date(now).toLocaleString('vi-VN')} < ${new Date(maxSeen).toLocaleString('vi-VN')}). Vui lòng chỉnh lại đúng ngày giờ thực tế trên Windows!`
      };
    }

    const updatedSeen = Math.max(now, maxSeen);
    try {
      this.database?.setSetting(CLOCK_GUARD_SETTING_KEY, { lastSeenAt: updatedSeen });
    } catch {}
    try {
      fs.writeFileSync(
        this._getClockGuardFilePath(),
        JSON.stringify({ lastSeenAt: updatedSeen, updatedAt: now }),
        'utf8'
      );
    } catch {}

    return { ok: true, lastSeenAt: updatedSeen };
  }

  /**
   * Giải mã và xác minh chữ ký Ed25519 của chuỗi License Key
   */
  verifyLicenseKey(rawKey) {
    const machineId = this.getMachineId();
    const cleanedKey = String(rawKey || '').trim().replace(/\s+/g, '');

    if (!cleanedKey) {
      return {
        valid: false,
        status: 'UNACTIVATED',
        machineId,
        message: 'Chưa nhập mã kích hoạt bản quyền (License Key).'
      };
    }

    const parts = cleanedKey.split('.');
    if (parts.length !== 3 || parts[0].toUpperCase() !== 'VBSKEY') {
      return {
        valid: false,
        status: 'INVALID_FORMAT',
        machineId,
        message: 'Định dạng License Key không hợp lệ (Key chuẩn bắt đầu bằng VBSKEY....).'
      };
    }

    const [, payloadB64, signatureB64] = parts;

    // 1. Xác minh chữ ký số Ed25519 bằng Public Key
    let signatureValid = false;
    try {
      const signatureBuf = Buffer.from(signatureB64, 'base64url');
      signatureValid = crypto.verify(
        null,
        Buffer.from(payloadB64, 'utf8'),
        this.publicKeyPem,
        signatureBuf
      );
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      return {
        valid: false,
        status: 'INVALID_SIGNATURE',
        machineId,
        message: 'Mã License Key không hợp lệ hoặc chữ ký bảo mật không khớp.'
      };
    }

    // 2. Giải mã Payload JSON
    let payload = null;
    try {
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      payload = JSON.parse(jsonStr);
    } catch {
      return {
        valid: false,
        status: 'INVALID_PAYLOAD',
        machineId,
        message: 'Không thể đọc dữ liệu bên trong License Key.'
      };
    }

    // 3. Kiểm tra xem Key này đã bị Admin xóa hoặc khóa từ xa chưa
    if (this.isRevoked(payload.id, machineId)) {
      return {
        valid: false,
        status: 'REVOKED',
        machineId,
        keyId: payload.id || '',
        customer: payload.customer || 'Khách hàng',
        daysRemaining: 0,
        hoursRemaining: 0,
        message: `🚫 Mã bản quyền [${payload.id || 'Key'}] đã bị Quản trị viên xóa hoặc thu hồi! Máy này không thể tiếp tục sử dụng Key này. Vui lòng liên hệ Admin để cấp Key mới.`
      };
    }

    const targetMid = this.normalizeMachineId(payload.mid || payload.machineId || '');
    const isUniversalKey = targetMid === 'ANY' || targetMid === '*' || targetMid === 'ALL';
    if (!isUniversalKey && targetMid !== this.normalizeMachineId(machineId)) {
      return {
        valid: false,
        status: 'MACHINE_MISMATCH',
        machineId,
        targetMachineId: targetMid,
        message: `Key này được cấp riêng cho Mã Máy [${targetMid}], không khớp với Mã Máy của bạn [${machineId}].`
      };
    }

    const now = Date.now();
    const issuedAt = Number(payload.iat || payload.issuedAt || 0);
    const notBefore = Number(payload.nbf || payload.notBefore || issuedAt || 0);
    const expiresAt = Number(payload.exp || payload.expiresAt || 0);

    // 4. Kiểm tra chống vặn lùi đồng hồ về trước ngày tạo Key
    if (issuedAt > 0 && now < issuedAt - CLOCK_ROLLBACK_TOLERANCE_MS) {
      return {
        valid: false,
        status: 'CLOCK_ROLLBACK',
        machineId,
        message: 'Đồng hồ máy tính đang đặt ở thời điểm trước khi Key được tạo. Vui lòng chỉnh lại đúng ngày giờ chuẩn!'
      };
    }

    const clockCheck = this._checkAndTouchClockGuard(now);
    if (!clockCheck.ok) {
      return {
        valid: false,
        status: 'CLOCK_ROLLBACK',
        machineId,
        message: clockCheck.message
      };
    }

    if (notBefore > 0 && now < notBefore - CLOCK_ROLLBACK_TOLERANCE_MS) {
      return {
        valid: false,
        status: 'NOT_YET_VALID',
        machineId,
        message: `Key này bắt đầu có hiệu lực từ ${new Date(notBefore).toLocaleString('vi-VN')}.`
      };
    }

    // 5. Kiểm tra thời hạn sử dụng (Expires At)
    if (!expiresAt || now >= expiresAt) {
      return {
        valid: false,
        status: 'EXPIRED',
        machineId,
        keyId: payload.id || '',
        customer: payload.customer || 'Khách hàng',
        planCode: payload.plan || '1_MONTH',
        planLabel: payload.planLabel || this._formatPlanLabel(payload.plan),
        issuedAt,
        expiresAt,
        daysRemaining: 0,
        hoursRemaining: 0,
        message: `Bản quyền của bạn đã hết hạn vào ${new Date(expiresAt).toLocaleString('vi-VN')}. Vui lòng liên hệ Admin để nhận Key gia hạn tháng mới!`
      };
    }

    const remainingMs = Math.max(0, expiresAt - now);
    const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(remainingMs / (1000 * 60 * 60));

    return {
      valid: true,
      status: 'ACTIVE',
      machineId,
      targetMachineId: isUniversalKey ? 'ANY (Đa máy)' : machineId,
      keyId: payload.id || 'VBS-KEY',
      customer: payload.customer || 'Khách hàng',
      planCode: payload.plan || '1_MONTH',
      planLabel: payload.planLabel || this._formatPlanLabel(payload.plan),
      issuedAt,
      expiresAt,
      daysRemaining,
      hoursRemaining,
      rawKey: cleanedKey,
      message: `Bản quyền đang hoạt động (Còn ${daysRemaining} ngày · Hết hạn: ${new Date(expiresAt).toLocaleDateString('vi-VN')}).`
    };
  }

  _formatPlanLabel(planCode) {
    const map = {
      'TRIAL_3D': 'Dùng thử 3 Ngày',
      'TRIAL_7D': 'Dùng thử 7 Ngày',
      '1_MONTH': 'Gói 1 Tháng (30 ngày)',
      '2_MONTHS': 'Gói 2 Tháng (60 ngày)',
      '3_MONTHS': 'Gói 3 Tháng (90 ngày)',
      '6_MONTHS': 'Gói 6 Tháng (180 ngày)',
      '1_YEAR': 'Gói 1 Năm (365 ngày)',
      'CUSTOM': 'Gói Tùy Chỉnh'
    };
    return map[String(planCode || '').toUpperCase()] || 'Bản quyền theo tháng';
  }

  /**
   * Đọc chuỗi Key đã lưu từ %APPDATA%, data/license.key hoặc SQLite DB
   */
  _loadStoredKeyString() {
    // 1. Ưu tiên đọc từ %APPDATA%/VideoBatchStudio-License/license-active.json (dùng chung toàn hệ thống)
    try {
      const appDataFile = this._getAppDataKeyFilePath();
      if (fs.existsSync(appDataFile)) {
        const data = JSON.parse(fs.readFileSync(appDataFile, 'utf8'));
        if (data && data.licenseKey) return String(data.licenseKey).trim();
      }
    } catch {}

    // 2. Từ file data/license.key trong thư mục app
    try {
      const portableFile = this._getPortableKeyFilePath();
      if (fs.existsSync(portableFile)) {
        const key = fs.readFileSync(portableFile, 'utf8').trim();
        if (key) return key;
      }
    } catch {}

    // 3. Từ SQLite license_cache
    try {
      const row = this.database?.getLicenseCache();
      if (row && row.token_encrypted) {
        return String(row.token_encrypted).trim();
      }
    } catch {}

    return '';
  }

  /**
   * Lưu Key đã xác minh xuống cả SQLite, data/license.key và %APPDATA%
   */
  _persistVerifiedLicense(verification) {
    const rawKey = verification.rawKey;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    try {
      this.database?.saveLicenseCache({
        licenseKeyHash: keyHash,
        deviceId: verification.machineId,
        planCode: verification.planCode,
        status: verification.status,
        expiresAt: verification.expiresAt,
        offlineUntil: verification.expiresAt,
        lastVerifiedAt: Date.now(),
        entitlements: {
          keyId: verification.keyId,
          customer: verification.customer,
          planLabel: verification.planLabel,
          issuedAt: verification.issuedAt
        },
        tokenEncrypted: rawKey
      });
    } catch {}

    try {
      fs.writeFileSync(this._getPortableKeyFilePath(), rawKey, 'utf8');
    } catch {}

    try {
      fs.writeFileSync(
        this._getAppDataKeyFilePath(),
        JSON.stringify({
          licenseKey: rawKey,
          machineId: verification.machineId,
          keyId: verification.keyId,
          customer: verification.customer,
          planCode: verification.planCode,
          expiresAt: verification.expiresAt,
          activatedAt: Date.now()
        }, null, 2),
        'utf8'
      );
    } catch {}
  }

  /**
   * Kiểm tra trạng thái bản quyền hiện tại của máy
   */
  getStatus() {
    const machineId = this.getMachineId();
    const storedKey = this._loadStoredKeyString();
    if (!storedKey) {
      return {
        valid: false,
        status: 'UNACTIVATED',
        machineId,
        daysRemaining: 0,
        hoursRemaining: 0,
        message: 'Ứng dụng chưa được kích hoạt bản quyền. Vui lòng gửi Mã Máy cho Admin để nhận License Key.'
      };
    }

    const result = this.verifyLicenseKey(storedKey);
    if (result.valid) {
      this._persistVerifiedLicense(result);
    }
    const { rawKey, ...publicResult } = result;
    return publicResult;
  }

  /**
   * Đồng bộ từ xa với Cloud rồi trả về trạng thái mới nhất
   */
  async syncAndGetStatus() {
    await this.syncRemoteRevocation();
    return this.getStatus();
  }

  /**
   * Kích hoạt bản quyền bằng License Key mới do người dùng nhập
   */
  async activate(rawKey) {
    await this.syncRemoteRevocation();
    const result = this.verifyLicenseKey(rawKey);
    if (!result.valid) {
      const { rawKey: _rk, ...failedResult } = result;
      return failedResult;
    }

    this._persistVerifiedLicense(result);
    const { rawKey: _rk, ...publicResult } = result;
    return publicResult;
  }

  /**
   * Xóa key hiện tại khỏi máy (để đổi sang key mới nếu cần)
   */
  deactivate() {
    try { this.database?.clearLicenseCache(); } catch {}
    try {
      const f1 = this._getPortableKeyFilePath();
      if (fs.existsSync(f1)) fs.rmSync(f1, { force: true });
    } catch {}
    try {
      const f2 = this._getAppDataKeyFilePath();
      if (fs.existsSync(f2)) fs.rmSync(f2, { force: true });
    } catch {}

    return {
      valid: false,
      status: 'UNACTIVATED',
      machineId: this.getMachineId(),
      message: 'Đã gỡ mã bản quyền khỏi máy. Vui lòng nhập License Key mới để tiếp tục.'
    };
  }

  /**
   * Chặn thực thi ở tầng Backend IPC nếu bản quyền chưa kích hoạt, hết hạn hoặc đã bị Admin xóa/khóa
   */
  requireValidLicense() {
    const status = this.getStatus();
    if (!status.valid) {
      const error = new Error(status.message || 'Bản quyền chưa kích hoạt hoặc đã bị khóa.');
      error.code = 'LICENSE_INVALID';
      error.licenseStatus = status;
      throw error;
    }
    return status;
  }
}

module.exports = { LicenseService, CLOUD_SYNC_TOPIC };
