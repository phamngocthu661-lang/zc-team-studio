'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ffmpegArgDiagnostics,
  formatFfmpegDiagnostics,
  materializeLongFfmpegArgs
} = require('../src/main/services/ffmpeg');

test('long filter_complex is written to script file to avoid Windows command length limit', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-ffmpeg-args-'));
  try {
    const graph = Array.from({ length: 300 }, (_, index) => `[v${index}]scale=1920:1080[vx${index}]`).join(';');
    const prepared = materializeLongFfmpegArgs(
      ['-y', '-i', 'in.mp4', '-filter_complex', graph, '-map', '[vout]', 'out.mp4'],
      { tempDir, threshold: 100 }
    );
    const scriptIndex = prepared.args.indexOf('-filter_complex_script');
    assert.notEqual(scriptIndex, -1);
    assert.equal(prepared.args.includes('-filter_complex'), false);
    assert.equal(fs.readFileSync(prepared.args[scriptIndex + 1], 'utf8'), graph);
    assert.deepEqual(prepared.cleanupPaths, [prepared.args[scriptIndex + 1]]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('short filter_complex stays inline', () => {
  const args = ['-filter_complex', '[0:v]scale=1280:720[vout]', '-map', '[vout]'];
  const prepared = materializeLongFfmpegArgs(args, { threshold: 1000 });
  assert.deepEqual(prepared.args, args);
  assert.deepEqual(prepared.cleanupPaths, []);
});

test('ffmpeg diagnostics report filter script conversion details', () => {
  const original = ['-i', 'in.mp4', '-filter_complex', '[0:v]scale=1920:1080[vout]', '-map', '[vout]', 'out.mp4'];
  const prepared = ['-i', 'in.mp4', '-filter_complex_script', 'graph.ffgraph', '-map', '[vout]', 'out.mp4'];
  const diagnostics = ffmpegArgDiagnostics(original, prepared, 'ffmpeg.exe');
  assert.equal(diagnostics.inputCount, 1);
  assert.equal(diagnostics.inlineGraphLength, '[0:v]scale=1920:1080[vout]'.length);
  assert.equal(diagnostics.usesFilterScript, true);
  assert.equal(diagnostics.filterScriptPath, 'graph.ffgraph');
  assert.match(formatFfmpegDiagnostics(diagnostics), /filter_script=graph\.ffgraph/);
  assert.match(formatFfmpegDiagnostics(diagnostics), new RegExp(`filter_complex_chars=${diagnostics.inlineGraphLength}`));
});
