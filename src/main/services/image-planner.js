'use strict';

const { buildTransitionSequence, mulberry32, seededShuffle } = require('../../shared/core');

const VARIATIONS = [
  { id:'still', scaleStart:1, scaleEnd:1, rotate:0, flip:false, panX:0, panY:0 },
  { id:'zoom-in', scaleStart:1, scaleEnd:1.08, rotate:1.2, flip:false, panX:0, panY:0 },
  { id:'zoom-out', scaleStart:1.09, scaleEnd:1.01, rotate:-1.2, flip:false, panX:0, panY:0 },
  { id:'pan-left', scaleStart:1.12, scaleEnd:1.12, rotate:0.7, flip:false, panX:-0.05, panY:0 },
  { id:'pan-right', scaleStart:1.12, scaleEnd:1.12, rotate:-0.7, flip:false, panX:0.05, panY:0 },
  { id:'pan-up', scaleStart:1.1, scaleEnd:1.1, rotate:0.5, flip:false, panX:0, panY:-0.04 },
  { id:'pan-down', scaleStart:1.1, scaleEnd:1.1, rotate:-0.5, flip:false, panX:0, panY:0.04 },
  { id:'mirror-zoom', scaleStart:1.03, scaleEnd:1.1, rotate:1, flip:true, panX:0, panY:0 }
];

function planImageSegments({ assets, voiceDurationMs, seed, durationMs=5000, allowFlip=false, transitionItems, minTransitionMs=600, maxTransitionMs=900, avoidRepeatCount=2, selectionMode='SEQUENTIAL' }) {
  if (!assets.length) throw Object.assign(new Error('Không có ảnh hợp lệ.'),{code:'NO_IMAGES'});
  const ordered=selectionMode==='SHUFFLE'?seededShuffle(assets,seed):[...assets]; const count=Math.ceil(voiceDurationMs/durationMs);
  const transitions=buildTransitionSequence({count:Math.max(0,count-1),items:transitionItems,seed:seed+17,avoidRepeatCount,minDurationMs:minTransitionMs,maxDurationMs:maxTransitionMs});
  const random=mulberry32(seed); const segments=[];
  for(let i=0;i<count;i+=1){const cycle=Math.floor(i/ordered.length); const asset=ordered[i%ordered.length]; let variation=VARIATIONS[(cycle+i)%VARIATIONS.length]; if(variation.flip&&!allowFlip) variation=VARIATIONS[Math.floor(random()*(VARIATIONS.length-1))]; const startMs=i*durationMs; const clipDuration=Math.min(durationMs,voiceDurationMs-startMs); segments.push({assetId:asset.id,filePath:asset.file_path||asset.filePath,fileName:asset.file_name||asset.fileName,mediaType:'IMAGE',durationMs:clipDuration,trimStartMs:0,startMs,transitionIn:i===0?null:transitions[i-1],transform:{...variation,cycle}});}
  return {segments,timelineDurationMs:voiceDurationMs,requiredMs:voiceDurationMs};
}

module.exports = { VARIATIONS, planImageSegments };
