'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');
const { resolveAppRootDir } = require('./path-utils');

const TELEMETRY_REPORT_TOPIC = 'vbs_telemetry_err_7c8e07da14a8_v1';
const REMOTE_COMMAND_TOPIC = 'vbs_remote_cmd_7c8e07da14a8_v1';

// Ed25519 Public Key chuẩn của Chủ Sở Hữu để xác minh lệnh điều khiển từ xa (VBSCMD.<payload>.<sig>)
const ADMIN_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEASgB/ZRTj5w9wS2M3uS0GUxS/wIRa26EL0LRHaout5LY=
-----END PUBLIC KEY-----`;

function encodeTelemetryPacket(payload) {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return `VBSTEL.${compressed.toString('base64url')}`;
}

function decodeTelemetryPacket(packetStr) {
  const s = String(packetStr || '').trim();
  if (!s.startsWith('VBSTEL.')) return null;
  try {
    const b64 = s.slice('VBSTEL.'.length);
    const comp = Buffer.from(b64, 'base64url');
    const raw = zlib.inflateSync(comp).toString('utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

class TelemetryService {
  constructor({ database, licenseService, scriptBridgeService, updaterService, paths } = {}) {
    this.database = database || null;
    this.licenseService = licenseService || null;
    this.scriptBridgeService = scriptBridgeService || null;
    this.updaterService = updaterService || null;
    this.paths = paths || {};

    this.studioRoot = this._resolveStudioRoot();
    this.clientLogsRoot = path.join(this.studioRoot, 'data', 'client_logs');
    this._executedCmdIds = new Set();
    this._recentErrHashes = new Map();
    this._heartbeatTimer = null;
    this._cmdPollTimer = null;
    this._lastCmdPollSince = Math.floor(Date.now() / 1000) - 600;
    this._loadExecutedCommands();
  }

  _resolveStudioRoot() {
    if (fs.existsSync('D:\\ZC_TEAM\\TOOL_ZC_TEAM\\mafia_dashboard_server.py')) {
      return 'D:\\ZC_TEAM\\TOOL_ZC_TEAM';
    }
    const exeDir = path.dirname(process.execPath);
    if (fs.existsSync(path.join(exeDir, 'resources', 'app'))) {
      return exeDir;
    }
    return resolveAppRootDir();
  }

  _getExecutedCmdStorePath() {
    const cfgDir = path.join(this.studioRoot, 'data', 'config');
    try { fs.mkdirSync(cfgDir, { recursive: true }); } catch {}
    return path.join(cfgDir, 'EXECUTED_REMOTE_COMMANDS.json');
  }

  _loadExecutedCommands() {
    try {
      const p = this._getExecutedCmdStorePath();
      if (fs.existsSync(p)) {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(arr)) {
          for (const id of arr.slice(-300)) this._executedCmdIds.add(String(id));
        }
      }
    } catch {}
  }

  _saveExecutedCommand(cmdId) {
    if (!cmdId) return;
    this._executedCmdIds.add(String(cmdId));
    try {
      const p = this._getExecutedCmdStorePath();
      const list = Array.from(this._executedCmdIds).slice(-300);
      fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');
    } catch {}
  }

  getClientIdentity() {
    let machineId = 'UNKNOWN';
    let customer = 'Khách hàng';
    let keyId = '';
    let licenseStatus = 'ACTIVE';
    try {
      const st = this.licenseService?.getStatus?.() || {};
      machineId = st.machineId || this.licenseService?.getMachineId?.() || machineId;
      customer = st.customer || customer;
      keyId = st.keyId || keyId;
      licenseStatus = st.status || licenseStatus;
    } catch {}
    if (!machineId || machineId === 'UNKNOWN') {
      try {
        const appdata = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        const activeFile = path.join(appdata, 'VideoBatchStudio-License', 'license-active.json');
        if (fs.existsSync(activeFile)) {
          const d = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
          machineId = d.machineId || machineId;
          customer = d.customer || customer;
          keyId = d.keyId || keyId;
        }
      } catch {}
    }
    if (!machineId || machineId === 'UNKNOWN') {
      try {
        const { execSync } = require('node:child_process');
        const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', { encoding: 'utf8', timeout: 2500 });
        const m = out.match(/MachineGuid\s+REG_SZ\s+([^\r\n\s]+)/i);
        const rawGuid = m ? m[1].trim() : `${os.hostname()}|${os.platform()}|${os.arch()}`;
        const digest = crypto.createHash('sha256').update(`VBS_HWID_V1:${rawGuid.toLowerCase()}`, 'utf8').digest('hex').toUpperCase();
        machineId = `VBS-${digest.slice(0, 4)}-${digest.slice(4, 8)}-${digest.slice(8, 12)}`;
      } catch {}
    }

    let version = 'V1.0.22';
    let buildNumber = 136;
    try {
      const vInfo = this.updaterService?.getLocalVersionInfo?.() || {};
      if (vInfo.version) version = vInfo.version;
      if (vInfo.build_number) buildNumber = vInfo.build_number;
      else {
        const vf = path.join(this.studioRoot, 'version.json');
        if (fs.existsSync(vf)) {
          const vd = JSON.parse(fs.readFileSync(vf, 'utf8'));
          if (vd.version) version = vd.version;
          if (vd.build_number) buildNumber = vd.build_number;
        }
      }
    } catch {}

    const cpus = os.cpus() || [];
    return {
      machine_id: machineId,
      customer,
      key_id: keyId,
      license_status: licenseStatus,
      version,
      build_number: buildNumber,
      hostname: os.hostname(),
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      cpu: cpus[0]?.model || '',
      ram_gb: Math.round(os.totalmem() / (1024 ** 3)),
      studio_root: this.studioRoot
    };
  }

  _readTailLogLines(maxLines = 80, maxChars = 12000) {
    const logPath = path.join(this.studioRoot, 'data', 'logs', 'LIVE_STUDIO_LOG.txt');
    if (!fs.existsSync(logPath)) return '';
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split(/\r?\n/);
      let tail = lines.slice(-maxLines).join('\n');
      if (tail.length > maxChars) tail = tail.slice(-maxChars);
      return tail.trim();
    } catch {
      return '';
    }
  }

  /**
   * Lưu báo cáo Telemetry vào ổ đĩa (`data/client_logs/{Customer}_{MachineId}/`)
   * để cả Admin UI lẫn AI Agent đều đọc được trực tiếp trên máy chủ
   */
  persistTelemetryEventToDisk(payload) {
    if (!payload || typeof payload !== 'object') return null;
    try {
      fs.mkdirSync(this.clientLogsRoot, { recursive: true });
      const safeMid = String(payload.machine_id || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeCust = String(payload.customer || 'KhachHang')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 28) || 'Khach';
      const folderName = `${safeCust}_${safeMid}`;
      const machineDir = path.join(this.clientLogsRoot, folderName);
      fs.mkdirSync(machineDir, { recursive: true });

      // 1. Cập nhật LATEST_STATUS.json của máy khách này
      const statusFile = path.join(machineDir, 'LATEST_STATUS.json');
      let prevStatus = {};
      if (fs.existsSync(statusFile)) {
        try { prevStatus = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch {}
      }
      const mergedStatus = {
        ...prevStatus,
        machine_id: payload.machine_id || prevStatus.machine_id,
        customer: payload.customer || prevStatus.customer,
        key_id: payload.key_id || prevStatus.key_id,
        version: payload.version || prevStatus.version,
        build_number: payload.build_number || prevStatus.build_number,
        hostname: payload.hostname || prevStatus.hostname,
        os: payload.os || prevStatus.os,
        studio_root: payload.studio_root || prevStatus.studio_root,
        niche: payload.niche || prevStatus.niche || '',
        last_seen_at: payload.timestamp || new Date().toISOString(),
        last_seen_ms: Number(payload.ts_ms || Date.now()),
        last_event_type: payload.event_type || 'HEARTBEAT',
        last_summary: payload.summary || '',
        error_count: (Number(prevStatus.error_count) || 0) + (payload.event_type === 'ERROR' ? 1 : 0),
        last_error_at: payload.event_type === 'ERROR' ? (payload.timestamp || new Date().toISOString()) : (prevStatus.last_error_at || ''),
        last_error_summary: payload.event_type === 'ERROR' ? (payload.summary || '') : (prevStatus.last_error_summary || ''),
        last_error_traceback: payload.event_type === 'ERROR' ? (payload.traceback || '') : (prevStatus.last_error_traceback || ''),
        extra: payload.extra || prevStatus.extra || {}
      };
      fs.writeFileSync(statusFile, JSON.stringify(mergedStatus, null, 2), 'utf8');

      // 2. Nếu có log_tail thì lưu luôn vào LIVE_STUDIO_LOG.txt của máy khách đó
      if (payload.log_tail) {
        fs.writeFileSync(path.join(machineDir, 'LIVE_STUDIO_LOG.txt'), String(payload.log_tail), 'utf8');
      }

      // 3. Nếu là ERROR / WARNING / LOG_SNAPSHOT / CMD_ACK thì ghi thêm vào ERRORS_HISTORY.jsonl
      if (['ERROR', 'WARNING', 'LOG_SNAPSHOT', 'CMD_ACK'].includes(payload.event_type)) {
        const histFile = path.join(machineDir, 'ERRORS_HISTORY.jsonl');
        fs.appendFileSync(histFile, JSON.stringify(payload) + '\n', 'utf8');
      }

      // 4. Cập nhật TELEMETRY_INDEX.json tổng hợp tất cả máy khách
      const indexFile = path.join(this.clientLogsRoot, 'TELEMETRY_INDEX.json');
      let indexData = { updatedAt: Date.now(), machines: {}, recentEvents: [] };
      if (fs.existsSync(indexFile)) {
        try { indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8')) || indexData; } catch {}
      }
      indexData.updatedAt = Date.now();
      indexData.machines = indexData.machines || {};
      indexData.machines[payload.machine_id || safeMid] = {
        ...mergedStatus,
        folder_path: machineDir
      };
      indexData.recentEvents = Array.isArray(indexData.recentEvents) ? indexData.recentEvents : [];
      const eventId = payload.event_id || `${payload.machine_id}_${payload.ts_ms}`;
      if (!indexData.recentEvents.some((e) => e.event_id === eventId)) {
        indexData.recentEvents.unshift({
          event_id: eventId,
          timestamp: payload.timestamp,
          ts_ms: payload.ts_ms || Date.now(),
          event_type: payload.event_type,
          machine_id: payload.machine_id,
          customer: payload.customer,
          version: payload.version,
          build_number: payload.build_number,
          niche: payload.niche,
          project_id: payload.project_id,
          summary: payload.summary,
          traceback: payload.traceback || '',
          log_tail: payload.log_tail || '',
          folder_path: machineDir
        });
        indexData.recentEvents = indexData.recentEvents.slice(0, 120);
      }
      fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8');
      return machineDir;
    } catch {
      return null;
    }
  }

  async postPacketToCloud(packet) {
    try {
      const buf = Buffer.from(packet, 'utf8');
      return await new Promise((resolve) => {
        const req = https.request(`https://ntfy.sh/${TELEMETRY_REPORT_TOPIC}`, {
          method: 'POST',
          family: 4,
          timeout: 6000,
          headers: {
            'Cache': 'yes',
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Length': buf.length
          }
        }, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
        });
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.on('error', () => resolve(false));
        req.write(buf);
        req.end();
      });
    } catch {
      return false;
    }
  }

  async reportEvent({
    eventType = 'HEARTBEAT',
    summary = '',
    niche = '',
    projectId = '',
    traceback = '',
    extra = {},
    includeLogTail = true,
    tailLines = 60
  } = {}) {
    try {
      const now = Date.now();
      const dedupKey = `${eventType}|${niche}|${projectId}|${String(summary).slice(0, 120)}`;
      if (eventType === 'ERROR' || eventType === 'WARNING') {
        const prevTs = this._recentErrHashes.get(dedupKey) || 0;
        if (now - prevTs < 35000) return false;
        this._recentErrHashes.set(dedupKey, now);
      }

      const ident = this.getClientIdentity();
      const activeNiche = niche || this.scriptBridgeService?.activeChannelKey || '';
      const payload = {
        v: 1,
        event_id: `EVT-${now}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        timestamp: new Date(now).toISOString().replace('T', ' ').slice(0, 19),
        ts_ms: now,
        event_type: eventType,
        source: 'electron_desktop_app',
        ...ident,
        niche: activeNiche,
        project_id: projectId,
        summary: String(summary || '').slice(0, 500),
        traceback: String(traceback || '').slice(0, 6000),
        log_tail: includeLogTail ? this._readTailLogLines(tailLines) : '',
        extra
      };

      this.persistTelemetryEventToDisk(payload);
      const packet = encodeTelemetryPacket(payload);
      return await this.postPacketToCloud(packet);
    } catch {
      return false;
    }
  }

  /**
   * Xác minh và thực thi lệnh điều khiển từ xa đã ký số Ed25519 (VBSCMD.<payloadB64>.<sigB64>)
   */
  async verifyAndExecuteSignedCommand(rawPacket) {
    const cleaned = String(rawPacket || '').trim();
    const parts = cleaned.split('.');
    if (parts.length !== 3 || parts[0] !== 'VBSCMD') {
      return { ok: false, reason: 'INVALID_FORMAT' };
    }
    const [, payloadB64, sigB64] = parts;
    try {
      const valid = crypto.verify(
        null,
        Buffer.from(payloadB64, 'utf8'),
        ADMIN_PUBLIC_KEY_PEM,
        Buffer.from(sigB64, 'base64url')
      );
      if (!valid) return { ok: false, reason: 'INVALID_SIGNATURE' };

      const cmd = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      const cmdId = String(cmd.cmdId || '');
      if (!cmdId || this._executedCmdIds.has(cmdId)) {
        return { ok: false, reason: 'ALREADY_EXECUTED' };
      }

      // Bỏ qua các lệnh đã phát hành quá 24 giờ trước
      if (cmd.issuedAt && (Date.now() - Number(cmd.issuedAt)) > 24 * 3600 * 1000) {
        return { ok: false, reason: 'EXPIRED_COMMAND' };
      }

      const myMid = String(this.getClientIdentity().machine_id || '').toUpperCase();
      const targetMid = String(cmd.targetMachineId || 'ALL').trim().toUpperCase();
      if (targetMid !== 'ALL' && targetMid !== '*' && targetMid !== 'ANY' && targetMid !== myMid) {
        return { ok: false, reason: 'NOT_FOR_THIS_MACHINE' };
      }

      this._saveExecutedCommand(cmdId);
      const result = await this._executeCommandPayload(cmd);

      await this.reportEvent({
        eventType: 'CMD_ACK',
        summary: `✅ Đã thực thi lệnh từ xa [${cmd.action}]: ${result.message || 'Thành công'}`,
        projectId: cmdId,
        extra: { cmd, result },
        includeLogTail: true,
        tailLines: 100
      });

      return { ok: true, cmd, result };
    } catch (err) {
      return { ok: false, reason: err.message || String(err) };
    }
  }

  async _executeCommandPayload(cmd) {
    const action = String(cmd.action || '').toUpperCase();
    const params = cmd.params || {};

    if (action === 'UPLOAD_FULL_DIAGNOSTICS') {
      // Gọi cả Python Port 8098 để gom đủ QUEUE_BACKLOG + STATE.json
      await new Promise((resolve) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8098,
          path: '/api/upload_diagnostics',
          method: 'POST',
          timeout: 4000,
          headers: { 'Content-Type': 'application/json' }
        }, (res) => { res.resume(); res.on('end', resolve); });
        req.on('error', resolve);
        req.on('timeout', () => { req.destroy(); resolve(); });
        req.write(JSON.stringify({ reason: `REMOTE_CMD_${cmd.cmdId}` }));
        req.end();
      });

      await this.reportEvent({
        eventType: 'LOG_SNAPSHOT',
        summary: `📸 Đã gửi Full Log & Chẩn đoán theo lệnh Admin (${cmd.cmdId})`,
        projectId: 'FULL_DIAGNOSTICS',
        includeLogTail: true,
        tailLines: 220
      });
      return { ok: true, message: 'Đã đẩy toàn bộ LIVE_STUDIO_LOG.txt (220 dòng) & trạng thái hàng đợi về Máy Chủ!' };
    }

    if (action === 'FORCE_OTA_UPDATE') {
      if (this.updaterService) {
        setTimeout(() => {
          this.updaterService.performOneClickUpdate().catch(() => {});
        }, 800);
        return { ok: true, message: 'Đã kích hoạt tải bản cập nhật OTA mới nhất từ GitHub & tự động khởi động lại!' };
      }
      return { ok: false, message: 'UpdaterService chưa sẵn sàng.' };
    }

    if (action === 'REMOTE_CLEANUP') {
      const deletePaths = Array.isArray(params.deletePaths) ? params.deletePaths : [];
      let deletedCount = 0;
      const appDir = path.join(this.studioRoot, 'resources', 'app');
      for (const rel of deletePaths) {
        const cleanRel = String(rel || '').replace(/^[\\/]+/, '');
        if (!cleanRel || cleanRel.includes('..')) continue;
        for (const base of [this.studioRoot, appDir]) {
          const target = path.join(base, cleanRel);
          if (fs.existsSync(target)) {
            try {
              fs.rmSync(target, { recursive: true, force: true });
              deletedCount += 1;
            } catch {}
          }
        }
      }

      // Mở khóa các kịch bản đang bị treo ở STEP_1_STARTING / STEP_1_5_STARTING nếu có yêu cầu
      let unlockedCount = 0;
      if (params.unlockStuckProjects !== false) {
        const projectsBase = path.join(this.studioRoot, 'PROJECTS');
        if (fs.existsSync(projectsBase)) {
          for (const d of fs.readdirSync(projectsBase)) {
            const pRoot = path.join(projectsBase, d);
            if (!fs.statSync(pRoot).isDirectory()) continue;
            for (const sub of fs.readdirSync(pRoot)) {
              const stFile = path.join(pRoot, sub, 'STATE.json');
              if (fs.existsSync(stFile)) {
                try {
                  const st = JSON.parse(fs.readFileSync(stFile, 'utf8'));
                  if (['STEP_1_STARTING', 'STEP_1_5_STARTING'].includes(st.current_step_status)) {
                    st.current_step_status = st.skip_title_rewrite ? 'QUEUED_SKIP_STEP_1' : 'QUEUED';
                    st.live_note = '♻️ Đã được Admin mở khóa trạng thái khởi động từ xa — Sẵn sàng chạy lại!';
                    fs.writeFileSync(stFile, JSON.stringify(st, null, 2), 'utf8');
                    unlockedCount += 1;
                  }
                } catch {}
              }
            }
          }
        }
      }
      return {
        ok: true,
        message: `Đã xóa ${deletedCount} đường dẫn chỉ định và mở khóa ${unlockedCount} dự án treo.`
      };
    }

    if (action === 'RESTART_SERVICES') {
      await new Promise((resolve) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 8098,
          path: '/api/stop_worker',
          method: 'POST',
          timeout: 2500
        }, (res) => { res.resume(); res.on('end', resolve); });
        req.on('error', resolve);
        req.end();
      });
      if (this.scriptBridgeService?.ensureScriptStudioRunning) {
        await this.scriptBridgeService.ensureScriptStudioRunning().catch(() => {});
      }
      return { ok: true, message: 'Đã dừng tiến trình treo và làm mới dịch vụ Script Studio (Port 8098).' };
    }

    return { ok: false, message: `Chưa hỗ trợ lệnh: ${action}` };
  }

  async pollRemoteCommandsFromCloud() {
    try {
      const url = `https://ntfy.sh/${REMOTE_COMMAND_TOPIC}/json?poll=1&since=${this._lastCmdPollSince}&_t=${Date.now()}`;
      const body = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'GET',
          family: 4,
          timeout: 6000,
          headers: { 'Cache-Control': 'no-cache' }
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

      this._lastCmdPollSince = Math.floor(Date.now() / 1000) - 30;
      const lines = String(body || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          if (evt && evt.event === 'message' && typeof evt.message === 'string' && evt.message.startsWith('VBSCMD.')) {
            await this.verifyAndExecuteSignedCommand(evt.message);
          }
        } catch {}
      }
    } catch {}
  }

  startBackgroundLoops() {
    // 1. Gửi Heartbeat khởi động sau 4 giây và định kỳ mỗi 3 phút
    setTimeout(() => {
      this.reportEvent({
        eventType: 'HEARTBEAT',
        summary: '🟢 Máy khách đang hoạt động bình thường (Online)',
        includeLogTail: true,
        tailLines: 40
      }).catch(() => {});
      this.pollRemoteCommandsFromCloud().catch(() => {});
    }, 4000);

    this._heartbeatTimer = setInterval(() => {
      this.reportEvent({
        eventType: 'HEARTBEAT',
        summary: '🟢 Heartbeat định kỳ từ máy khách',
        includeLogTail: true,
        tailLines: 40
      }).catch(() => {});
    }, 180 * 1000);
    this._heartbeatTimer.unref?.();

    // 2. Quét lệnh điều khiển từ xa của Admin mỗi 25 giây
    this._cmdPollTimer = setInterval(() => {
      this.pollRemoteCommandsFromCloud().catch(() => {});
    }, 25 * 1000);
    this._cmdPollTimer.unref?.();
  }

  stopBackgroundLoops() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    if (this._cmdPollTimer) clearInterval(this._cmdPollTimer);
  }
}

module.exports = {
  TelemetryService,
  TELEMETRY_REPORT_TOPIC,
  REMOTE_COMMAND_TOPIC,
  encodeTelemetryPacket,
  decodeTelemetryPacket
};
