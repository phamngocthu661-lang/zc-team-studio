'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('renderer defines validateRenderConfig before it is called',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  const definition=source.indexOf('function validateRenderConfig');
  const firstCall=source.indexOf('validateRenderConfig(c');
  assert.ok(definition>=0);
  assert.ok(firstCall>definition);
});

test('renderer exposes subtitle color and outline color controls for templates and preview',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../src/renderer/index.html'),'utf8');
  const source=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(html, /id="tplSubtitleColor" type="color"/);
  assert.match(html, /id="tplSubtitleOutlineColor" type="color"/);
  assert.match(source, /tplSubtitleColor/);
  assert.match(source, /tplSubtitleOutlineColor/);
  assert.match(source, /subPreviewColor/);
  assert.match(source, /subPreviewOutlineColor/);
  assert.match(source, /color:\$\('tplSubtitleColor'\)\?\.value\|\|prev\.color\|\|'#FFFFFF'/);
  assert.match(source, /outlineColor:\$\('tplSubtitleOutlineColor'\)\?\.value\|\|prev\.outlineColor\|\|'#000000'/);
  assert.match(source, /outlineColor:sub\.outlineColor\|\|'#000000'/);
});

test('renderer exposes only simple Canvas subtitle controls',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../src/renderer/index.html'),'utf8');
  const source=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(source, /renderer:'canvas'/);
  assert.match(source, /SUBTITLE_FONTS\s*=\s*\[/);
  assert.match(source, /\{value:'Arial'/);
  assert.match(source, /Calibri/);
  assert.match(source, /Times New Roman/);
  assert.doesNotMatch(source, /karaoke-word-box/);
  assert.doesNotMatch(source, /karaoke-classic/);
  assert.doesNotMatch(source, /karaoke-neon/);
  assert.doesNotMatch(source, /karaoke-gold/);
  assert.doesNotMatch(html, /tplKaraokeBoxColor/);
  assert.doesNotMatch(html, /tplKaraokeBoxRadius/);
  assert.doesNotMatch(html, /tplKaraokeBoxPadding/);
  assert.doesNotMatch(html, /tplKaraokeBoxOpacity/);
  assert.doesNotMatch(html, /tplKaraokeBoxEffect/);
  assert.doesNotMatch(html, /tplSubtitlePreset/);
  assert.doesNotMatch(html, /tplSubtitleBottom/);
  assert.doesNotMatch(html, /tplSubtitleX/);
  assert.doesNotMatch(html, /tplSubtitleY/);
  assert.doesNotMatch(html, /tplSubtitleW/);
  assert.doesNotMatch(html, /tplSubtitleH/);
  assert.match(html, /tplSubtitleBold/);
  assert.match(html, /tplSubtitleUppercase/);
});

test('subtitle render path forces simple Canvas config and disables karaoke generation',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  const batchService=fs.readFileSync(path.join(__dirname,'../src/main/services/batch-service.js'),'utf8');
  assert.match(renderer, /stylePreset:'simple',renderer:'canvas'/);
  assert.match(renderer, /sub\.karaoke=false/);
  assert.match(renderer, /delete preview\.stylePreset;delete preview\.karaoke;return normalizeSubtitleConfig\(\{renderScale:1/);
  assert.match(renderer, /delete state\[key\]\.stylePreset;delete state\[key\]\.karaoke/);
  assert.doesNotMatch(renderer, /SUBTITLE_NORMAL_EXPORT_FONT_SCALE/);
  assert.doesNotMatch(renderer, /SUBTITLE_CSS_PREVIEW_FONT_SCALE/);
  assert.match(batchService, /function karaokeSubtitleEnabled\(config = \{\}\) \{\s*return false;/);
  assert.match(batchService, /existingExt !== '\.json'/);
  assert.match(batchService, /convertKaraokeJsonToSrtFile\(job\.srt_path, outputPath\)/);
  assert.match(batchService, /jsonOutputPath: null/);
  assert.match(batchService, /preferJson: false/);
  assert.match(batchService, /subtitleJsonToSrt\(content\)/);
  assert.doesNotMatch(batchService, /subtitleJsonToKaraokeAss/);
});

test('template subtitle controls keep saved geometry when geometry inputs are hidden',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(renderer, /const readNumber=\(id,fallback\)=>/);
  assert.match(renderer, /readNumber\('tplSubtitleX',Number\(prev\.boxXPercent\?\?2\)\)/);
  assert.match(renderer, /readNumber\('tplSubtitleY',Number\(prev\.boxYPercent\?\?84\)\)/);
  assert.match(renderer, /readNumber\('tplSubtitleW',Number\(prev\.boxWidthPercent\|\|prev\.maxWidthPercent\|\|96\)\)/);
  assert.match(renderer, /readNumber\('tplSubtitleH',Number\(prev\.boxHeightPercent\|\|8\)\)/);
  assert.doesNotMatch(renderer, /boxXPercent:Number\(\$\(\'tplSubtitleX\'\)\?\.value\|\|0\)/);
  assert.doesNotMatch(renderer, /boxYPercent:Number\(\$\(\'tplSubtitleY\'\)\?\.value\|\|0\)/);
});

test('template subtitle sample uses one English cue near the SRT character limit',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(renderer, /He returned home smelling of machine oil\./);
  assert.doesNotMatch(renderer, /After years of silence/);
  assert.doesNotMatch(renderer, /白髪混じり/);
  assert.doesNotMatch(renderer, /字幕プレビュー/);
});

test('template subtitle bold and uppercase update the editor preview immediately',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  const core=fs.readFileSync(path.join(__dirname,'../src/shared/render-core.js'),'utf8');
  assert.match(renderer, /displaySample=sub\.uppercase===true\?sample\.toUpperCase\(\):sample/);
  assert.match(renderer, /if\(text\)text\.textContent=displaySample/);
  assert.match(core, /fontWeight: subtitle\.bold === true \? 700 : subtitleFontWeight\(subtitle\)/);
});

test('render job tables show elapsed time including SRT generation',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../src/renderer/index.html'),'utf8');
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(html, /<th>Thời gian<\/th>/);
  assert.match(renderer, /const JOB_TIMER_START_STATUSES=new Set\(\['VALIDATING','PREPARING','PENDING','RENDERING','VERIFYING','RETRYING'\]\)/);
  assert.match(renderer, /const JOB_TIMER_END_STATUSES=new Set\(\['COMPLETED','FAILED','CANCELLED','SKIPPED','INTERRUPTED'\]\)/);
  assert.match(renderer, /function formatJobElapsed\(job=\{\}\)/);
  assert.match(renderer, /resetJobTimings\(\);state\.running=true;log\(`Start \$\{c\.batchName\}`\)/);
  assert.match(renderer, /state\.activeRenderMode='single';resetJobTimings\(\);state\.running=true/);
  assert.match(renderer, /j\.jobId=p\.jobId\|\|j\.jobId;updateJobTimingFromEvent\(p,j\)/);
  assert.match(renderer, /<td>\$\{formatJobElapsed\(job\)\}<\/td>/);
  assert.match(renderer, /<td>\$\{formatJobElapsed\(j\)\}<\/td>/);
});

test('preview and export are wired to shared RenderCore geometry',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  const preload=fs.readFileSync(path.join(__dirname,'../src/main/preload.js'),'utf8');
  const planner=fs.readFileSync(path.join(__dirname,'../src/main/services/render-planner.js'),'utf8');
  assert.match(preload, /require\('\.\.\/shared\/render-core'\)/);
  assert.match(renderer, /api\.preview\?\.layerCssBox/);
  assert.match(renderer, /api\.preview\?\.deltaToProject/);
  assert.match(renderer, /api\.preview\?\.subtitleFrame/);
  assert.match(planner, /resolveLayerFrame/);
  assert.match(planner, /ffmpegLayerFitFilter/);
  assert.match(planner, /ffmpegOverlayPosition/);
});

test('render subtitle preview state follows the selected template',()=>{
  const renderer=fs.readFileSync(path.join(__dirname,'../src/renderer/app.js'),'utf8');
  assert.match(renderer, /await loadSubtitlePreviewState\('batch',state\.editor\.subtitle,id\)/);
  assert.match(renderer, /await loadSubtitlePreviewState\('single',state\.editor\.subtitle,id\)/);
  assert.match(renderer, /let saved=loadSubtitlePreview\(prefix,templateId\)/);
  assert.match(renderer, /state\[key\]=\{\.\.\.\(templateSubtitle\|\|\{\}\),\.\.\.saved,assScale:1\};/);
  assert.match(renderer, /const activeId=activeRenderTemplateId\(prefix\),live=state\.selectedTemplate\?\.id===activeId&&state\.editor\?\.subtitle\?state\.editor\.subtitle:null/);
  assert.match(renderer, /saveSubtitlePreview\(prefix,state\.editor\.subtitle,\{persistTemplate:false\}\)/);
  assert.match(renderer, /api\.templates\?\.save\?\.\(templateId,\{name:state\.editor\.name/);
  assert.doesNotMatch(renderer, /batchUsedFolderRow/);
});
