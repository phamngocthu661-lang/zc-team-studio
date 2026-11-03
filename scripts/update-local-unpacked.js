'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

console.log('🔄 Đang tắt các tiến trình cũ để giải phóng lock file app.asar...');
try {
  execSync('taskkill /f /im "Video Batch Studio Worker.exe" /im "Video Batch Studio Server.exe" /im "Video Batch Studio.exe" /im "electron.exe"', { stdio: 'ignore' });
} catch {}

// Đợi 1 giây để OS nhả file lock
const start = Date.now();
while (Date.now() - start < 1000) {}

const projectRoot = path.resolve(__dirname, '..');
const srcAsar = path.join(projectRoot, 'releases', 'worker_app_v5.1.1.asar');

if (!fs.existsSync(srcAsar)) {
  console.error('❌ Không tìm thấy file:', srcAsar);
  process.exit(1);
}

const targets = [
  path.join(projectRoot, 'dist-server', 'win-unpacked', 'resources', 'app.asar'),
  path.join(projectRoot, 'dist-worker', 'win-unpacked', 'resources', 'app.asar'),
  path.join(projectRoot, 'dist-server', 'resources', 'app.asar'),
  path.join(projectRoot, 'dist-worker', 'resources', 'app.asar')
];

for (const target of targets) {
  try {
    const parent = path.dirname(target);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(srcAsar, target);
    const stat = fs.statSync(target);
    console.log(`✅ Đã cập nhật thành công: ${target} (${(stat.size / 1024 / 1024).toFixed(2)} MB, mtime: ${stat.mtime.toLocaleTimeString()})`);
  } catch (err) {
    console.error(`❌ Không thể cập nhật ${target}: ${err.message}`);
  }
}

console.log('\n🎉 ĐÃ CẬP NHẬT HOÀN TẤT BẢN BUILD WIN-UNPACKED LÊN V5.1.1!');
