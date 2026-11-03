'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createPackage } = require('@electron/asar');

const rootDir = path.resolve(__dirname, '..');

function collectRuntimeDeps(startPkg) {
  const visited = new Set();
  function walk(pkgName) {
    if (visited.has(pkgName)) return;
    visited.add(pkgName);
    const pkgJsonPath = path.join(rootDir, 'node_modules', pkgName, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      for (const dep of Object.keys(pkg.dependencies || {})) {
        walk(dep);
      }
    } catch {}
  }
  walk(startPkg);
  return Array.from(visited);
}

async function build() {
  console.log('1. Đang chuẩn bị thư mục tạm đóng gói app.asar...');
  const stageAsarDir = path.join(os.tmpdir(), `vbs_asar_stage_${Date.now()}`);
  fs.mkdirSync(stageAsarDir, { recursive: true });

  try {
    // Copy package.json, version.json và src/
    fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stageAsarDir, 'package.json'));
    if (fs.existsSync(path.join(rootDir, 'version.json'))) {
      fs.copyFileSync(path.join(rootDir, 'version.json'), path.join(stageAsarDir, 'version.json'));
    }
    fs.cpSync(path.join(rootDir, 'src'), path.join(stageAsarDir, 'src'), { recursive: true });
    if (fs.existsSync(path.join(rootDir, 'assets'))) {
      fs.cpSync(path.join(rootDir, 'assets'), path.join(stageAsarDir, 'assets'), { recursive: true });
    }

    // Copy runtime dependencies (edge-tts-universal + sub-deps)
    const runtimeDeps = collectRuntimeDeps('edge-tts-universal');
    const stageNodeModules = path.join(stageAsarDir, 'node_modules');
    fs.mkdirSync(stageNodeModules, { recursive: true });
    for (const dep of runtimeDeps) {
      const srcDep = path.join(rootDir, 'node_modules', dep);
      const dstDep = path.join(stageNodeModules, dep);
      if (fs.existsSync(srcDep)) {
        fs.cpSync(srcDep, dstDep, { recursive: true });
      }
    }

    const outAsarTmp = path.join(os.tmpdir(), `vbs_app_${Date.now()}.asar`);
    console.log('2. Đang biên dịch mã nguồn thành app.asar...');
    await createPackage(stageAsarDir, outAsarTmp);

    // Tạo thư mục bản giao khách hàng: Ban-Giao-Khach-Hang-EXE/VideoBatchStudio
    const clientDistRoot = path.join(rootDir, 'Ban-Giao-Khach-Hang-EXE');
    const clientAppDir = path.join(clientDistRoot, 'VideoBatchStudio');
    if (fs.existsSync(clientDistRoot)) {
      fs.rmSync(clientDistRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(clientAppDir, { recursive: true });

    console.log('3. Đang đóng gói Runtime thực thi Video Batch Studio.exe...');
    const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
    fs.cpSync(electronDistDir, clientAppDir, { recursive: true });

    // Đổi tên electron.exe -> Video Batch Studio.exe
    const srcExe = path.join(clientAppDir, 'electron.exe');
    const dstExe = path.join(clientAppDir, 'Video Batch Studio.exe');
    if (fs.existsSync(srcExe)) {
      fs.renameSync(srcExe, dstExe);
    }

    // Xóa default_app.asar & app.asar và dùng thư mục resources/app (Unpacked) để hỗ trợ OTA Update trực tiếp không bị khóa file .asar
    const defaultAsar = path.join(clientAppDir, 'resources', 'default_app.asar');
    if (fs.existsSync(defaultAsar)) {
      fs.rmSync(defaultAsar, { force: true });
    }
    const targetAsar = path.join(clientAppDir, 'resources', 'app.asar');
    if (fs.existsSync(targetAsar)) {
      fs.rmSync(targetAsar, { force: true });
    }
    if (fs.existsSync(outAsarTmp)) {
      fs.rmSync(outAsarTmp, { force: true });
    }
    const targetUnpackedApp = path.join(clientAppDir, 'resources', 'app');
    fs.cpSync(stageAsarDir, targetUnpackedApp, { recursive: true });
    if (fs.existsSync(path.join(rootDir, 'version.json'))) {
      fs.copyFileSync(path.join(rootDir, 'version.json'), path.join(clientAppDir, 'version.json'));
    }
    if (fs.existsSync(path.join(rootDir, 'mafia_dashboard_server.py'))) {
      fs.copyFileSync(path.join(rootDir, 'mafia_dashboard_server.py'), path.join(clientAppDir, 'mafia_dashboard_server.py'));
    }
    for (const extraDir of ['skills_12_keys', 'skills_mexico', 'skills_homeless', 'DOCSMOI', '.agents', 'engine']) {
      const sExtra = path.join(rootDir, extraDir);
      const dExtra = path.join(clientAppDir, extraDir);
      if (fs.existsSync(sExtra)) {
        fs.cpSync(sExtra, dExtra, { recursive: true });
      }
    }

    // Chép tài nguyên phần mềm vào resources/
    console.log('4. Đang sao chép tài nguyên (FFmpeg, Fonts, Skills, Public Key, Kho_Green, Kho_Voice)...');
    const clientResDir = path.join(clientAppDir, 'resources');
    for (const sub of ['bin', 'fonts', 'default-backgrounds', 'default-green', 'disclaimer', 'whisper-srt', 'skills', 'license']) {
      const srcSub = path.join(rootDir, 'resources', sub);
      const dstSub = path.join(clientResDir, sub);
      if (fs.existsSync(srcSub)) {
        fs.cpSync(srcSub, dstSub, { recursive: true });
      }
    }

    for (const folder of ['Kho_Green', 'Kho_Voice', 'tools']) {
      const srcFolder = path.join(rootDir, folder);
      const dstFolder = path.join(clientAppDir, folder);
      if (fs.existsSync(srcFolder)) {
        fs.cpSync(srcFolder, dstFolder, { recursive: true });
      } else {
        fs.mkdirSync(dstFolder, { recursive: true });
      }
    }

    // Đồng bộ database mẫu (Default 16:9, cấu hình khóa) và license.key sang bản EXE
    const srcDataDir = path.join(rootDir, 'data');
    const dstDataDir = path.join(clientAppDir, 'data');
    fs.mkdirSync(dstDataDir, { recursive: true });
    for (const dataFile of ['video-batch-studio.db', 'license.key']) {
      const sFile = path.join(srcDataDir, dataFile);
      const dFile = path.join(dstDataDir, dataFile);
      if (fs.existsSync(sFile)) {
        try { fs.copyFileSync(sFile, dFile); } catch {}
      }
    }

    console.log(`✅ Đã đóng gói bản .exe khách hàng tại: ${clientAppDir}`);
  } finally {
    try { fs.rmSync(stageAsarDir, { recursive: true, force: true }); } catch {}
  }

  // 5. Biên dịch file thực thi VBS-License-Admin.exe cho Chủ Sở Hữu
  console.log('5. Đang tạo file thực thi VBS-License-Admin.exe cho ứng dụng cấp Key...');
  const adminDir = path.join(rootDir, 'VBS-License-Admin');
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  if (fs.existsSync(cscPath)) {
    const csCode = `
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Program {
    [STAThread]
    static void Main() {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string electronExe1 = Path.GetFullPath(Path.Combine(baseDir, "..", "node_modules", "electron", "dist", "electron.exe"));
        string electronExe2 = Path.GetFullPath(Path.Combine(baseDir, "..", "Ban-Giao-Khach-Hang-EXE", "VideoBatchStudio", "Video Batch Studio.exe"));
        string htmlFallback = Path.Combine(baseDir, "index.html");

        ProcessStartInfo psi = new ProcessStartInfo();
        if (File.Exists(electronExe1)) {
            psi.FileName = electronExe1;
            psi.Arguments = "\\"" + baseDir.TrimEnd('\\\\') + "\\"";
            psi.WorkingDirectory = baseDir;
            psi.UseShellExecute = false;
            Process.Start(psi);
        } else if (File.Exists(htmlFallback)) {
            psi.FileName = htmlFallback;
            psi.UseShellExecute = true;
            Process.Start(psi);
        } else {
            MessageBox.Show("Không tìm thấy giao diện Admin Keygen (index.html).", "VBS License Admin", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
`;
    const csFile = path.join(os.tmpdir(), 'VbsAdminLauncher.cs');
    const outAdminExe = path.join(adminDir, 'VBS-License-Admin.exe');
    fs.writeFileSync(csFile, csCode, 'utf8');
    try {
      execFileSync(cscPath, ['/target:winexe', `/out:${outAdminExe}`, '/r:System.Windows.Forms.dll', csFile], {
        stdio: 'pipe',
        windowsHide: true
      });
      console.log(`✅ Đã biên dịch thành công: ${outAdminExe}`);
    } finally {
      try { fs.rmSync(csFile, { force: true }); } catch {}
    }
  }
}

build().catch((err) => {
  console.error('❌ Lỗi build:', err);
  process.exit(1);
});
