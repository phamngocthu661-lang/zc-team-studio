'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('hidden HTML elements always override modal display:grid', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/renderer/styles.css'), 'utf8');
  assert.match(css, /html\s+\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}/i);
  assert.match(css, /\.modal\s*\{[^}]*display\s*:\s*grid/i);
});
