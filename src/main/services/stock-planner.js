'use strict';

const { buildTransitionSequence, seededShuffle } = require('../../shared/core');

class InsufficientStockError extends Error {
  constructor({requiredMs,availableMs,selectedMs}) { super('Không đủ stock chưa sử dụng để phủ hết thời lượng voice.'); this.name='InsufficientStockError'; this.code='INSUFFICIENT_STOCK'; this.requiredMs=requiredMs; this.availableMs=availableMs; this.selectedMs=selectedMs; this.missingMs=Math.max(0,requiredMs-selectedMs); }
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function planStockSegments({assets,voiceDurationMs,seed,transitionItems,minTransitionMs=600,maxTransitionMs=900,avoidRepeatCount=2,selectionMode='SHUFFLE'}) {
  if(!assets.length)throw new InsufficientStockError({requiredMs:voiceDurationMs,availableMs:0,selectedMs:0});
  const ordered=selectionMode==='SEQUENTIAL'?[...assets]:seededShuffle(assets,seed); const availableMs=ordered.reduce((s,a)=>s+Number(a.duration_ms||a.durationMs||0),0);
  const transitions=buildTransitionSequence({count:Math.max(0,ordered.length-1),items:transitionItems,seed,avoidRepeatCount,minDurationMs:minTransitionMs,maxDurationMs:maxTransitionMs});
  const segments=[]; let timelineMs=0;
  for(let i=0;i<ordered.length&&timelineMs<voiceDurationMs;i+=1){const asset=ordered[i],raw=Number(asset.duration_ms||asset.durationMs||0); if(raw<=0)continue; const tr=i===0?null:transitions[i-1]; const overlap=tr?Math.min(tr.durationMs,Math.max(0,raw-100)):0; const needed=voiceDurationMs-timelineMs; const clip=Math.min(raw,i===0?needed:needed+overlap); if(i>0&&clip<=overlap)continue; segments.push({assetId:asset.id,filePath:asset.file_path||asset.filePath,fileName:asset.file_name||asset.fileName,mediaType:'VIDEO',sourceDurationMs:raw,trimStartMs:0,durationMs:clip,startMs:timelineMs,transitionIn:tr?{...tr,durationMs:overlap}:null,transform:{}}); timelineMs+=i===0?clip:clip-overlap;}
  if(timelineMs<voiceDurationMs-20)throw new InsufficientStockError({requiredMs:voiceDurationMs,availableMs,selectedMs:timelineMs});
  return {segments,timelineDurationMs:Math.min(timelineMs,voiceDurationMs),availableMs,requiredMs:voiceDurationMs};
}

function stockDuration(asset) {
  return Number(asset.duration_ms || asset.durationMs || 0);
}

function stockConsumedStart(asset) {
  return Math.max(0, Number(asset.consumed_start_ms || asset.consumedStartMs || 0));
}

function stockPhase(asset) {
  return Number(asset.stock_phase || asset.stockPhase || 1) >= 2 ? 2 : 1;
}

function createDurationStockAllocator({
  assets,
  seed = 1,
  selectionMode = 'SEQUENTIAL',
  playbackRate = 0.75,
  clonePasses = 1,
  cloneFlip = true,
  cloneZoom = 1.1,
  transformAllStock = true,
  forceCover = true
}) {
  const speed = clampNumber(playbackRate || 1, 0.05, 4);
  const maxPasses = Math.max(1, Math.min(2, Math.round(Number(clonePasses || 1))));
  const phaseRemaining = (asset, phase, offsetMs) => {
    const durationMs = stockDuration(asset);
    const currentPhaseMs = Math.max(0, durationMs - offsetMs) / speed;
    return phase === 1 && maxPasses > 1 ? currentPhaseMs + durationMs / speed : currentPhaseMs;
  };
  const usable = (assets || []).filter((asset) => phaseRemaining(asset, stockPhase(asset), stockConsumedStart(asset)) > 20);
  const ordered = selectionMode === 'SHUFFLE' ? seededShuffle(usable, seed) : [...usable];
  const effectiveAssetMs = (asset) => phaseRemaining(asset, stockPhase(asset), stockConsumedStart(asset));
  const totalDurationMs = ordered.reduce((sum, asset) => sum + effectiveAssetMs(asset), 0);
  let assetIndex = 0;
  let phase = ordered[0] ? stockPhase(ordered[0]) : 1;
  let offsetMs = ordered[0] ? stockConsumedStart(ordered[0]) : 0;
  let usedDurationMs = 0;
  const usedAssetIds = new Set();
  const remainingEffectiveMs = () => ordered.reduce((sum, asset, index) => {
    if (index < assetIndex) return sum;
    const assetPhase = index === assetIndex ? phase : stockPhase(asset);
    const startMs = index === assetIndex ? offsetMs : stockConsumedStart(asset);
    return sum + phaseRemaining(asset, assetPhase, startMs);
  }, 0);
  const advanceAsset = () => {
    assetIndex += 1;
    phase = ordered[assetIndex] ? stockPhase(ordered[assetIndex]) : 1;
    offsetMs = ordered[assetIndex] ? stockConsumedStart(ordered[assetIndex]) : 0;
  };
  const advancePhaseOrAsset = () => {
    if (phase === 1 && maxPasses > 1) {
      phase = 2;
      offsetMs = 0;
      return;
    }
    advanceAsset();
  };

  return {
    totalDurationMs,
    get usedDurationMs() { return usedDurationMs; },
    get remainingDurationMs() { return Math.max(0, remainingEffectiveMs()); },
    get usedAssetIds() { return [...usedAssetIds]; },
    allocate({ voiceDurationMs }) {
      const requiredMs = Number(voiceDurationMs || 0);
      if (!ordered.length || this.remainingDurationMs < requiredMs - 20) {
        throw new InsufficientStockError({
          requiredMs,
          availableMs: this.remainingDurationMs,
          selectedMs: Math.max(0, this.remainingDurationMs)
        });
      }

      const segments = [];
      let remainingMs = requiredMs;
      let timelineMs = 0;
      while (remainingMs > 20) {
        const asset = ordered[assetIndex];
        if (!asset) break;
        const durationMs = stockDuration(asset);
        const availableInAssetMs = Math.max(0, durationMs - offsetMs);
        if (availableInAssetMs <= 20) {
          advancePhaseOrAsset();
          continue;
        }
        const fps = Number(asset.fps_den || asset.fpsDen || 1)
          ? Number(asset.fps_num || asset.fpsNum || 0) / Number(asset.fps_den || asset.fpsDen || 1)
          : 0;
        const sourceNeededMs = remainingMs * speed;
        const clipSourceMs = Math.min(availableInAssetMs, sourceNeededMs);
        const clipOutputMs = Math.min(remainingMs, clipSourceMs / speed);
        const sourceStartMs = offsetMs;
        const currentPhase = phase;
        segments.push({
          assetId: asset.id,
          filePath: asset.file_path || asset.filePath,
          originalFilePath: asset.file_path || asset.filePath,
          fileName: asset.file_name || asset.fileName,
          mediaType: 'VIDEO',
          sourceDurationMs: clipSourceMs,
          sourceTotalDurationMs: durationMs,
          sourceWidth: Number(asset.width || 0),
          sourceHeight: Number(asset.height || 0),
          sourceFps: fps,
          trimStartMs: sourceStartMs,
          originalTrimStartMs: sourceStartMs,
          durationMs: clipOutputMs,
          startMs: timelineMs,
          transitionIn: segments.length ? { type: 'none', durationMs: 0 } : null,
          transform: currentPhase > 1
            ? { flip: cloneFlip !== false, scale: Number(cloneZoom || 1.1) }
            : {},
          playbackRate: speed,
          forceCover,
          sourceRangeStartMs: sourceStartMs,
          sourceRangeEndMs: sourceStartMs + clipSourceMs,
          originalRangeStartMs: sourceStartMs,
          originalRangeEndMs: sourceStartMs + clipSourceMs,
          stockPassIndex: currentPhase,
          stockPhase: currentPhase,
          pooledStock: true
        });
        usedDurationMs += clipOutputMs;
        remainingMs -= clipOutputMs;
        timelineMs += clipOutputMs;
        offsetMs += clipSourceMs;
        if (durationMs - offsetMs <= 20) {
          advancePhaseOrAsset();
        }
        usedAssetIds.add(asset.id);
      }
      return {
        segments,
        timelineDurationMs: requiredMs,
        availableMs: totalDurationMs,
        requiredMs,
        selectedMs: requiredMs,
        pooled: true
      };
    }
  };
}

module.exports={InsufficientStockError,planStockSegments,createDurationStockAllocator};
