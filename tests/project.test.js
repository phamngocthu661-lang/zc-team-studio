const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AppDatabase } = require('../src/main/database');

test('có thể tạo nhiều project và mỗi project mới có template mặc định riêng', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-'));
  const db = new AppDatabase(path.join(root, 'db.sqlite'));
  try {
    const firstCount = db.listProjects().length;
    const projectA = db.createProject({ name: 'Project A' });
    const projectB = db.createProject({ name: 'Project B' });
    const projects = db.listProjects();

    assert.equal(projects.length, firstCount + 2);
    assert.ok(projects.some((p) => p.id === projectA.id));
    assert.ok(projects.some((p) => p.id === projectB.id));
    assert.ok(db.listTemplates(projectA.id).some((t) => t.project_id === projectA.id));
    assert.ok(db.listTemplates(projectB.id).some((t) => t.project_id === projectB.id));
  } finally {
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('kho tài nguyên dùng chung thêm, lọc và xóa không phụ thuộc project', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-project-assets-'));
  const db = new AppDatabase(path.join(root, 'db.sqlite'));
  try {
    const green = db.createProjectAsset({
      assetType: 'GREEN_VIDEO',
      name: 'Green 01',
      fileName: 'green-01.mp4',
      filePath: path.join(root, 'green-01.mp4'),
      fileSizeBytes: 123,
      durationMs: 2500,
      width: 1920,
      height: 1080,
      hasAudio: false,
      metadata: { sourcePath: 'source-green.mp4' }
    });
    const disclaimer = db.createProjectAsset({
      assetType: 'DISCLAIMER_VIDEO',
      name: 'Disclaimer 01',
      fileName: 'disclaimer-01.mp4',
      filePath: path.join(root, 'disclaimer-01.mp4'),
      fileSizeBytes: 456,
      durationMs: 3000,
      width: 1920,
      height: 1080,
      hasAudio: true
    });

    assert.equal(green.project_id, 'GLOBAL');
    assert.equal(disclaimer.project_id, 'GLOBAL');
    assert.deepEqual(db.listProjectAssets().map((a) => a.id).sort(), [disclaimer.id, green.id].sort());
    assert.deepEqual(db.listProjectAssets(null, 'GREEN_VIDEO').map((a) => a.id), [green.id]);
    assert.deepEqual(db.listProjectAssets(null, 'DISCLAIMER_VIDEO').map((a) => a.id), [disclaimer.id]);
    assert.equal(db.getProjectAsset(green.id).metadata.sourcePath, 'source-green.mp4');

    db.deleteProjectAsset(green.id);
    assert.equal(db.getProjectAsset(green.id), null);
    assert.equal(db.listProjectAssets().length, 1);
  } finally {
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
