'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_GLABS_HOST = 'http://127.0.0.1:8765';
const DEFAULT_GLABS_KEY = 'lk1uzjUzWN7Oza6uCosO5HwL-6-5w3a5vCALnJaq20A';
const DEFAULT_GLABS_MODEL = 'nano_banana_2_lite';
const DEFAULT_ASPECT_RATIO = '16:9';

/**
 * Service tích hợp G-Labs Studio Webhook REST API
 * Hỗ trợ tạo ảnh bằng model nano_banana_2_lite
 */
class GLabsImageService {
  constructor(options = {}) {
    this.baseUrl = this.normalizeUrl(options.baseUrl || DEFAULT_GLABS_HOST);
    this.apiKey = options.apiKey || DEFAULT_GLABS_KEY;
    this.model = options.model || DEFAULT_GLABS_MODEL;
    this.aspectRatio = options.aspectRatio || DEFAULT_ASPECT_RATIO;
    this.activeTasks = new Set();
  }

  /**
   * Chuẩn hóa URL, chuyển 0.0.0.0 thành 127.0.0.1 để tránh lỗi kết nối client trên Windows
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl) return DEFAULT_GLABS_HOST;
    let normalized = String(rawUrl).trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'http://' + normalized;
    }
    normalized = normalized.replace('0.0.0.0', '127.0.0.1');
    return normalized.replace(/\/+$/, '');
  }

  /**
   * Cập nhật thông số kết nối
   */
  updateConfig({ baseUrl, apiKey, model, aspectRatio } = {}) {
    if (baseUrl) this.baseUrl = this.normalizeUrl(baseUrl);
    if (apiKey) this.apiKey = apiKey.trim();
    if (model) this.model = model.trim();
    if (aspectRatio) this.aspectRatio = aspectRatio.trim();
  }

  /**
   * Kiểm tra tình trạng máy chủ G-Labs Webhook
   * @returns {Promise<{ ok: boolean, status?: string, uptime?: number, error?: string }>}
   */
  async checkHealth() {
    try {
      const url = `${this.baseUrl}/api/health`;
      const res = await this.httpRequest(url, { method: 'GET', timeoutMs: 5000 });
      if (res.statusCode === 200 && res.data) {
        return { ok: true, ...res.data };
      }
      return { ok: false, error: `Máy chủ trả về HTTP ${res.statusCode}` };
    } catch (err) {
      return { ok: false, error: `Không thể kết nối G-Labs Webhook (${err.message})` };
    }
  }

  /**
   * Gửi yêu cầu tạo ảnh vào hàng đợi
   * @param {object} params
   * @param {string} params.prompt Nội dung mô tả ảnh
   * @param {string} [params.model] Model tạo ảnh (mặc định nano_banana_2_lite)
   * @param {string} [params.aspectRatio] Tỉ lệ khung hình (16:9, 1:1, 9:16...)
   * @param {string[]} [params.referenceImages] Mảng ảnh tham chiếu base64
   * @returns {Promise<{ taskId: string, status: string, pollUrl: string }>}
   */
  async queueImageTask({ prompt, model, aspectRatio, referenceImages = [] } = {}) {
    if (!prompt || !String(prompt).trim()) {
      throw new Error('Thiếu tham số bắt buộc: prompt');
    }

    const payload = {
      prompt: String(prompt).trim(),
      model: model || this.model || DEFAULT_GLABS_MODEL,
      aspect_ratio: aspectRatio || this.aspectRatio || DEFAULT_ASPECT_RATIO,
      reference_images: Array.isArray(referenceImages) ? referenceImages : []
    };

    const url = `${this.baseUrl}/api/image/generate`;
    const res = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(payload),
      timeoutMs: 15000
    });

    if (res.statusCode !== 202 && res.statusCode !== 200) {
      const errMsg = res.data?.error || res.data?.message || `HTTP ${res.statusCode}`;
      throw new Error(`G-Labs Webhook từ chối tạo ảnh: ${errMsg}`);
    }

    const taskId = res.data?.task_id;
    if (!taskId) {
      throw new Error('G-Labs Webhook không trả về task_id hợp lệ');
    }

    this.activeTasks.add(taskId);
    return {
      taskId,
      status: res.data?.status || 'pending',
      pollUrl: res.data?.poll_url || `/api/status/${taskId}`
    };
  }

  /**
   * Thăm dò trạng thái task cho tới khi completed hoặc failed
   * @param {string} taskId
   * @param {object} [options]
   * @param {number} [options.timeoutMs]
   * @param {number} [options.intervalMs]
   * @param {Function} [options.onProgress]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ results: string[], taskId: string, completedAt: number }>}
   */
  async pollTask(taskId, { timeoutMs = 300000, intervalMs = 3000, onProgress, signal } = {}) {
    const startTime = Date.now();
    const url = `${this.baseUrl}/api/status/${taskId}`;

    while (Date.now() - startTime < timeoutMs) {
      if (signal?.aborted) {
        await this.stopTask(taskId).catch(() => {});
        this.activeTasks.delete(taskId);
        throw new Error('Tác vụ tạo ảnh đã bị người dùng hủy');
      }

      const res = await this.httpRequest(url, {
        method: 'GET',
        headers: { 'X-API-Key': this.apiKey },
        timeoutMs: 10000
      });

      if (res.statusCode === 200 && res.data) {
        const data = res.data;
        const status = String(data.status || '').toLowerCase();

        onProgress?.({
          taskId,
          status,
          prompt: data.prompt,
          elapsedMs: Date.now() - startTime
        });

        if (status === 'completed') {
          this.activeTasks.delete(taskId);
          const results = Array.isArray(data.results) ? data.results : [];
          if (!results.length) {
            throw new Error(`Task ${taskId} báo completed nhưng không có URL kết quả trả về.`);
          }
          return {
            taskId,
            status: 'completed',
            results,
            completedAt: data.completed_at || Date.now()
          };
        }

        if (status === 'failed') {
          this.activeTasks.delete(taskId);
          const errDetail = data.error_detail || data.error || 'Lỗi không xác định từ G-Labs';
          throw new Error(`Tạo ảnh thất bại (Task ${taskId}): ${errDetail}`);
        }
      } else {
        console.warn(`[G-LABS] Cảnh báo thăm dò task ${taskId} (HTTP ${res.statusCode})`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    this.activeTasks.delete(taskId);
    throw new Error(`Hết thời gian chờ tạo ảnh G-Labs (Timeout sau ${Math.round(timeoutMs / 1000)}s)`);
  }

  /**
   * Tải file kết quả từ G-Labs về ổ đĩa cục bộ
   * @param {string} fileUrl URL trả về từ G-Labs (vd: http://127.0.0.1:8765/api/files/xxx.png)
   * @param {string} destFilePath Đường dẫn file lưu trên đĩa
   * @returns {Promise<string>}
   */
  async downloadFile(fileUrl, destFilePath) {
    let targetUrl = fileUrl;
    if (targetUrl.startsWith('/')) {
      targetUrl = `${this.baseUrl}${targetUrl}`;
    }
    // Đảm bảo không kết nối qua 0.0.0.0
    targetUrl = targetUrl.replace('0.0.0.0', '127.0.0.1');

    const destDir = path.dirname(destFilePath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.get(targetUrl, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Tải file thất bại từ G-Labs (HTTP ${res.statusCode})`));
        }

        const fileStream = fs.createWriteStream(destFilePath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destFilePath));
        });

        fileStream.on('error', (err) => {
          fs.unlink(destFilePath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout khi tải file kết quả từ G-Labs'));
      });
    });
  }

  /**
   * Quy trình trọn gói: Gửi Prompt -> Đợi tạo -> Tải ảnh lưu vào outputPath
   * @param {object} params
   * @param {string} params.prompt
   * @param {string} params.outputPath
   * @param {string} [params.model]
   * @param {string} [params.aspectRatio]
   * @param {Function} [params.onProgress]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<string>} Đường dẫn file ảnh đã lưu
   */
  async generateAndSaveImage({ prompt, outputPath, model, aspectRatio, onProgress, signal } = {}) {
    const queueRes = await this.queueImageTask({ prompt, model, aspectRatio });
    const taskId = queueRes.taskId;

    onProgress?.({ stage: 'QUEUED', taskId, message: 'Đã đưa yêu cầu vào hàng đợi G-Labs...' });

    const pollRes = await this.pollTask(taskId, {
      onProgress: (p) => onProgress?.({ stage: 'PROCESSING', ...p }),
      signal
    });

    const fileUrl = pollRes.results[0];
    onProgress?.({ stage: 'DOWNLOADING', taskId, message: 'Đang tải ảnh kết quả về máy...' });

    await this.downloadFile(fileUrl, outputPath);
    onProgress?.({ stage: 'COMPLETED', taskId, outputPath, message: 'Hoàn tất tạo ảnh!' });

    return outputPath;
  }

  /**
   * Dừng task đang chạy trên G-Labs Webhook
   * @param {string} [taskId] Nếu rỗng sẽ dừng tất cả task
   */
  async stopTask(taskId) {
    try {
      const url = taskId ? `${this.baseUrl}/api/stop/${taskId}` : `${this.baseUrl}/api/stop`;
      await this.httpRequest(url, {
        method: 'POST',
        headers: { 'X-API-Key': this.apiKey },
        body: taskId ? JSON.stringify({ task_id: taskId }) : '{}',
        timeoutMs: 5000
      });
      if (taskId) this.activeTasks.delete(taskId);
      else this.activeTasks.clear();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper gửi HTTP/HTTPS request chuẩn không phụ thuộc thư viện ngoài
   */
  httpRequest(targetUrl, { method = 'GET', headers = {}, body = null, timeoutMs = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const opts = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: method.toUpperCase(),
        headers: { ...headers }
      };

      if (body) {
        opts.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = client.request(opts, (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`Timeout HTTP request (${timeoutMs}ms) tới ${targetUrl}`));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }
}

module.exports = {
  GLabsImageService,
  DEFAULT_GLABS_HOST,
  DEFAULT_GLABS_KEY,
  DEFAULT_GLABS_MODEL,
  DEFAULT_ASPECT_RATIO
};
