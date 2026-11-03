'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(walk(p));
    } else if (p.endsWith('.js')) {
      files.push(p);
    }
  }
  return files;
}

const jsFiles = walk(path.join(__dirname, '..', 'src'));
let errCount = 0;

for (const file of jsFiles) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error('❌ LỖI CÚ PHÁP TẠI:', file, err.stderr ? err.stderr.toString() : err.message);
    errCount++;
  }
}

if (errCount === 0) {
  console.log(`✅ TẤT CẢ ${jsFiles.length} FILES JS TRONG src/ HOÀN TOÀN HỢP LỆ (ZERO SYNTAX ERRORS)!`);
} else {
  console.error(`💥 CÓ ${errCount} FILE BỊ LỖI CÚ PHÁP!`);
  process.exit(1);
}
