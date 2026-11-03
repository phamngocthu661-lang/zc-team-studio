'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {planSingleStockSegment}=require('../src/main/services/batch-service');

test('single stock làm chậm 0.75 và chỉ tiêu thụ đoạn nguồn cần thiết',()=>{
  const plan=planSingleStockSegment({filePath:'stock.mp4',metadata:{durationMs:60000,width:1920,height:1080,fpsNum:30,fpsDen:1},voiceDurationMs:59000,toleranceMs:500});
  assert.equal(plan.segments.length,1);
  assert.equal(plan.segments[0].durationMs,59000);
  assert.equal(plan.segments[0].sourceDurationMs,44250);
  assert.equal(plan.segments[0].playbackRate,.75);
  assert.equal(plan.segments[0].transitionIn,null);
  assert.equal(plan.segments[0].preCutSingleStock,true);
  assert.deepEqual(plan.segments[0].transform,{});
  assert.equal(plan.trimmedMs,15750);
  assert.equal(plan.segments[0].padEndMs,0);
});

test('single stock ngắn hơn voice được clone lượt 2 lật và zoom',()=>{
  const plan=planSingleStockSegment({filePath:'stock.mp4',metadata:{durationMs:30000,width:1280,height:720,fpsNum:30,fpsDen:1},voiceDurationMs:70000,toleranceMs:500});
  assert.equal(plan.segments.length,2);
  assert.equal(plan.segments[1].transitionIn.type,'none');
  assert.equal(plan.segments[1].transform.flip,true);
  assert.equal(plan.segments[1].transform.scale,1.1);
  assert.deepEqual(plan.segments[0].transform,{});
  assert.equal(plan.segments[0].stockPhase,1);
  assert.equal(plan.segments[1].stockPhase,2);
  assert.equal(plan.segments[0].forceCover,true);
  assert.equal(plan.cloned,true);
});

test('single stock vẫn fail nếu slow và clone 2 lượt vẫn thiếu',()=>{
  assert.throws(()=>planSingleStockSegment({filePath:'stock.mp4',metadata:{durationMs:10000,width:1920,height:1080,fpsNum:30,fpsDen:1},voiceDurationMs:60000,toleranceMs:500}),error=>error.code==='SINGLE_STOCK_TOO_SHORT');
});

test('single stock ngắn hơn trong tolerance được pad frame cuối',()=>{
  const plan=planSingleStockSegment({filePath:'stock.mp4',metadata:{durationMs:59800,width:1920,height:1080,fpsNum:30,fpsDen:1},voiceDurationMs:60000,toleranceMs:500,playbackRate:1,extendWithClone:false});
  assert.equal(plan.segments[0].padEndMs,200);
});
