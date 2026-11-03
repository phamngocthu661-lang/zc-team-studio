'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AppDatabase } = require('../src/main/database');
const { TemplateService } = require('../src/main/services/template-service');

function withDatabase(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-tpl-'));
  const db = new AppDatabase(path.join(root, 'db.sqlite'));
  try {
    return fn({ root, db, service: new TemplateService(db) });
  } finally {
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(root, name, value) {
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  return filePath;
}

test('template lưu version, layer và restore', () => withDatabase(({ db }) => {
  const project = db.listProjects()[0];
  const tpl = db.createTemplate({
    projectId: project.id,
    name: 'Test Template',
    config: {
      canvas: { width: 1920, height: 1080, fps: 30 },
      backgroundMode: 'IMAGE_SEQUENCE',
      layers: [{ type: 'TEXT', name: 'Title', text: 'Hello', transform: { x: 10, y: 20, width: 300, height: 80 }, style: { fontSize: 50 } }]
    }
  });
  assert.equal(tpl.layers.length, 1);
  db.saveTemplate(tpl.id, {
    config: {
      ...tpl.config,
      layers: [...tpl.config.layers || [], { type: 'LOGO', name: 'Logo', sourceReference: 'logo.png', transform: { x: 100, y: 100, width: 200, height: 100 } }]
    }
  }, 'add logo');
  assert.equal(db.listTemplateVersions(tpl.id).length, 2);
  db.restoreTemplateVersion(tpl.id, 1);
  assert.equal(db.listTemplateVersions(tpl.id).length, 3);
}));

test('template import chọn đúng project và trả về template mới', () => withDatabase(({ root, db, service }) => {
  const project = db.listProjects()[0];
  const filePath = writeJson(root, 'one.vbstemplate.json', {
    format: 'vbs-template',
    version: 1,
    template: {
      name: 'Imported One',
      description: 'sample',
      config: {
        canvas: { width: 1920, height: 1080, fps: 30 },
        backgroundMode: 'STOCK_VIDEO',
        layers: [{ type: 'TEXT', name: 'Caption', text: 'Hello' }]
      }
    }
  });
  const result = service.import(filePath, project.id);
  assert.equal(result.importedCount, 1);
  assert.equal(result.template.project_id, project.id);
  assert.equal(result.template.name, 'Imported One (Imported)');
  assert.equal(db.getTemplate(result.template.id).layers.length, 1);
}));

test('template import project bundle tạo project khi chưa chọn project', () => withDatabase(({ root, db, service }) => {
  const before = db.listProjects().length;
  const filePath = writeJson(root, 'bundle.json', {
    project: {
      name: 'Bundle Project',
      description: 'project export',
      templates: [
        { name: 'Tpl A', config: { canvas: { width: 1920, height: 1080, fps: 30 }, layers: [] } },
        { name: 'Tpl B', config: { subtitle: { color: '#ffff00' }, layers: [] } }
      ]
    }
  });
  const result = service.import(filePath, null);
  assert.equal(result.importedCount, 2);
  assert.ok(result.project.id);
  assert.equal(db.listProjects().length, before + 1);
  assert.deepEqual(result.templates.map((tpl) => tpl.project_id), [result.project.id, result.project.id]);
}));

test('template import báo lỗi rõ khi JSON không phải template/project', () => withDatabase(({ root, service }) => {
  const filePath = writeJson(root, 'bad.json', { name: 'Not a template', data: [1, 2, 3] });
  assert.throws(() => service.import(filePath, null), /không chứa template hợp lệ/);
}));
