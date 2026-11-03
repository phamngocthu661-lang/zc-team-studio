'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDirectory } = require('./path-utils');
const {
  subtitleEffectiveFontSize,
  subtitleLineHeight,
  subtitlePreviewBox,
  subtitleFontWeight,
  subtitleFontFamily
} = require('../../shared/subtitle-preview');

const SUBTITLE_FONTS = new Set(['Arial', 'Calibri', 'Times New Roman']);

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function srtTimestampToMs(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return 0;
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) +
    Number(match[4].padEnd(3, '0'));
}

function parseSrtCues(content) {
  return String(content || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const timingIndex = lines.findIndex((line) => /-->/.test(line));
      if (timingIndex < 0) return null;
      const [start, end] = lines[timingIndex].split(/\s*-->\s*/);
      const text = lines.slice(timingIndex + 1).join('\n').trim();
      if (!text) return null;
      return {
        startMs: srtTimestampToMs(start),
        endMs: srtTimestampToMs(end),
        text
      };
    })
    .filter((cue) => cue && cue.endMs > cue.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

function parseAssTimeToMs(value) {
  const match = String(value || '').trim().match(/(\d+):(\d{2}):(\d{2})\.(\d{1,2})/);
  if (!match) return 0;
  return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) +
    Number(match[4].padEnd(2, '0')) * 10;
}

function cleanAssText(value) {
  return String(value || '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function parseAssCues(content) {
  const events = [];
  for (const line of String(content || '').replace(/\r\n/g, '\n').split('\n')) {
    if (!line.startsWith('Dialogue:')) continue;
    const body = line.slice('Dialogue:'.length).trim();
    const parts = body.split(',');
    if (parts.length < 10) continue;
    const startMs = parseAssTimeToMs(parts[1]);
    const endMs = parseAssTimeToMs(parts[2]);
    const text = cleanAssText(parts.slice(9).join(','));
    if (text && endMs > startMs) events.push({ startMs, endMs, text });
  }
  return events.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

function subtitleStyleForCanvas(renderConfig = {}) {
  const subtitle = renderConfig.subtitle || {};
  const family = subtitleFontFamily(subtitle);
  const fontFamily = family || 'Arial';
  const fontSize = subtitleEffectiveFontSize(subtitle);
  return {
    fontFamily,
    fontSize,
    fontWeight: subtitle.bold === true ? 700 : subtitleFontWeight(subtitle),
    bold: subtitle.bold === true || subtitleFontWeight(subtitle) >= 700,
    uppercase: subtitle.uppercase === true,
    color: subtitle.color || subtitle.subtitleColor || '#FFFFFF',
    outlineColor: subtitle.outlineColor || subtitle.subtitleOutlineColor || '#000000',
    outlineWidth: Math.max(0, numberOr(subtitle.outlineWidth ?? subtitle.subtitleOutline, 1)),
    lineHeight: subtitleLineHeight(subtitle),
    box: subtitlePreviewBox(renderConfig)
  };
}

function concatPath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''");
}

function buildSubtitleOverlayConcat(cues = [], durationMs = 0) {
  const events = [];
  let cursor = 0;
  const pushBlank = (endMs) => {
    if (endMs > cursor) {
      events.push({ startMs: cursor, endMs, text: '' });
      cursor = endMs;
    }
  };
  for (const cue of cues) {
    const startMs = Math.max(0, Math.round(cue.startMs));
    const endMs = Math.max(startMs + 1, Math.round(cue.endMs));
    pushBlank(startMs);
    events.push({ startMs, endMs, text: cue.text });
    cursor = endMs;
  }
  pushBlank(Math.max(cursor, Math.round(durationMs || cursor)));
  return events.filter((event) => event.endMs > event.startMs);
}

function subtitleOverlayFfmpegArgs({ concatPath: listPath, outputPath, fps = 30, durationMs = 0 }) {
  return [
    '-y',
    '-hide_banner',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-vf',
    `fps=${Number(fps || 30)},format=argb`,
    '-an',
    '-map_metadata',
    '-1',
    '-c:v',
    'qtrle',
    '-pix_fmt',
    'argb',
    '-fps_mode',
    'cfr',
    '-r',
    String(Number(fps || 30)),
    '-t',
    (Number(durationMs || 0) / 1000).toFixed(3),
    '-progress',
    'pipe:1',
    '-nostats',
    outputPath
  ];
}

function rendererHtml(width, height) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:transparent}canvas{display:block}</style></head><body><canvas id="c" width="${width}" height="${height}"></canvas><script>
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
function wrapText(text,maxWidth){
  const raw=String(text||'').split(/\\n/);
  const out=[];
  for(const line of raw){
    const normalized=line.trim();
    if(!normalized){out.push('');continue;}
    const tokens=/\\s/.test(normalized)?normalized.split(/\\s+/):Array.from(normalized);
    let current='';
    for(const token of tokens){
      const candidate=current?(/\\s/.test(normalized)?current+' '+token:current+token):token;
      if(!current||ctx.measureText(candidate).width<=maxWidth){current=candidate;continue;}
      out.push(current);
      current=token;
    }
    if(current)out.push(current);
  }
  return out;
}
window.renderSubtitleFrame=(payload)=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const style=payload.style||{},box=style.box||{x:0,y:0,width:canvas.width,height:canvas.height};
  let text=String(payload.text||'');
  if(style.uppercase)text=text.toUpperCase();
  if(!text.trim())return true;
  const fontWeight=style.bold?'700':'400';
  let curFontSize=Math.max(8,Number(style.fontSize||32));
  ctx.font=fontWeight+' '+curFontSize+'px '+JSON.stringify(style.fontFamily||'Arial');
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.lineJoin='round';
  ctx.miterLimit=2;
  let lines=wrapText(text,Math.max(1,Number(box.width||canvas.width)));
  // Tự động co fontSize nếu vượt quá 2 dòng để luôn giữ tối đa 2 dòng chuẩn video
  while(lines.length>2 && curFontSize>18){
    curFontSize-=4;
    ctx.font=fontWeight+' '+curFontSize+'px '+JSON.stringify(style.fontFamily||'Arial');
    lines=wrapText(text,Math.max(1,Number(box.width||canvas.width)));
  }
  const lineHeight=curFontSize*Math.max(1,Number(style.lineHeight||1.2));
  const totalHeight=Math.max(lineHeight,lines.length*lineHeight);
  const preferredY=Number(box.y||0)+Number(box.height||0)/2;
  const safeCenterY=Math.max(totalHeight/2+12,Math.min(canvas.height-totalHeight/2-24,preferredY));
  let y=safeCenterY-totalHeight/2+lineHeight/2;
  const x=Number(box.x||0)+Number(box.width||canvas.width)/2;
  ctx.fillStyle=style.color||'#FFFFFF';
  ctx.strokeStyle=style.outlineColor||'#000000';
  ctx.lineWidth=Math.max(0,Number(style.outlineWidth||0))*2;
  for(const line of lines){
    if(ctx.lineWidth>0)ctx.strokeText(line,x,y);
    ctx.fillText(line,x,y);
    y+=lineHeight;
  }
  return true;
};
</script></body></html>`;
}

class SubtitleCanvasOverlayService {
  constructor({ ffmpegService, paths }) {
    this.ffmpeg = ffmpegService;
    this.paths = paths;
    this.window = null;
  }

  isAvailable() {
    try {
      const electron = require('electron');
      return Boolean(electron && typeof electron === 'object' && typeof electron.BrowserWindow === 'function');
    } catch {
      return false;
    }
  }

  async ensureWindow(width, height) {
    if (this.window && !this.window.isDestroyed()) return this.window;
    let BrowserWindow;
    try {
      const electron = require('electron');
      BrowserWindow = electron && typeof electron === 'object' ? electron.BrowserWindow : null;
    } catch {}
    if (typeof BrowserWindow !== 'function') {
      throw new Error('Chromium Canvas subtitle overlay chỉ hoạt động trong môi trường Electron (BrowserWindow is unavailable).');
    }
    this.window = new BrowserWindow({
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      width,
      height,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    this.window.setContentSize(width, height);
    await this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(rendererHtml(width, height))}`);
    return this.window;
  }

  parseSubtitleFile(filePath) {
    const ext = path.extname(String(filePath || '')).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');
    if (ext === '.ass') return parseAssCues(content);
    return parseSrtCues(content);
  }

  async renderOverlay({ subtitlePath, outputPath, renderConfig, durationMs, callbacks = {}, signal }) {
    if (!subtitlePath || !fs.existsSync(subtitlePath)) return null;
    const width = Math.max(1, numberOr(renderConfig.width || renderConfig.canvas?.width, 1920));
    const height = Math.max(1, numberOr(renderConfig.height || renderConfig.canvas?.height, 1080));
    const fps = Math.max(1, numberOr(renderConfig.fps || renderConfig.canvas?.fps, 30));
    const cues = this.parseSubtitleFile(subtitlePath);
    if (!cues.length) return null;
    const events = buildSubtitleOverlayConcat(cues, durationMs);
    const root = ensureDirectory(path.join(this.paths.temp, `subtitle-canvas-${Date.now()}-${Math.random().toString(36).slice(2)}`));
    const style = subtitleStyleForCanvas(renderConfig);
    const win = await this.ensureWindow(width, height);
    const listPath = path.join(root, 'frames.ffconcat');
    const lines = ['ffconcat version 1.0'];
    try {
      for (let index = 0; index < events.length; index += 1) {
        if (signal?.aborted) throw Object.assign(new Error('Đã hủy render subtitle canvas.'), { code: 'ABORTED' });
        const event = events[index];
        await win.webContents.executeJavaScript(`window.renderSubtitleFrame(${JSON.stringify({ text: event.text, style })})`, true);
        const image = await win.webContents.capturePage();
        const framePath = path.join(root, `frame-${String(index).padStart(6, '0')}.png`);
        fs.writeFileSync(framePath, image.toPNG());
        lines.push(`file '${concatPath(framePath)}'`);
        lines.push(`duration ${Math.max(0.001, (event.endMs - event.startMs) / 1000).toFixed(3)}`);
        callbacks.onProgress?.({
          stage: 'RENDER',
          voiceName: 'subtitle canvas',
          percent: events.length ? Math.min(95, index / events.length * 95) : 0
        });
      }
      if (events.length) {
        const lastFrame = path.join(root, `frame-${String(events.length - 1).padStart(6, '0')}.png`);
        lines.push(`file '${concatPath(lastFrame)}'`);
      }
      fs.writeFileSync(listPath, `${lines.join('\n')}\n`, 'utf8');
      const args = subtitleOverlayFfmpegArgs({ concatPath: listPath, outputPath, fps, durationMs });
      await this.ffmpeg.render(args, { durationMs, signal });
      return outputPath;
    } finally {
      try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
    }
  }

  destroy() {
    try { if (this.window && !this.window.isDestroyed()) this.window.destroy(); } catch {}
    this.window = null;
  }
}

module.exports = {
  SubtitleCanvasOverlayService,
  parseSrtCues,
  parseAssCues,
  buildSubtitleOverlayConcat,
  subtitleStyleForCanvas,
  subtitleOverlayFfmpegArgs
};
