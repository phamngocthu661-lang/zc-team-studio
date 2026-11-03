'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {buildInputJobs,shouldMoveReservedAssets,recommendSrtResourcePlan}=require('../src/main/services/batch-service');

test('single mode tạo đúng một job từ file voice và SRT trực tiếp',()=>{
  const voice=path.join('C:','media','chapter-01.mp3');
  const srt=path.join('C:','media','chapter-01.srt');
  const jobs=buildInputJobs({singleVoicePath:voice,singleSrtPath:srt});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].sequenceNumber,1);
  assert.equal(jobs[0].voicePath,voice);
  assert.equal(jobs[0].srtPath,srt);
  assert.equal(jobs[0].ready,true);
});

test('single mode thiếu SRT vẫn sẵn sàng khi bật tự tạo SRT',()=>{
  const jobs=buildInputJobs({singleVoicePath:'voice.mp3',singleSrtPath:''});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].ready,true);
  assert.equal(jobs[0].srtPath,null);
});

test('single mode có thể tắt tự tạo SRT để giữ kiểm tra SRT bắt buộc',()=>{
  const jobs=buildInputJobs({singleVoicePath:'voice.mp3',singleSrtPath:'',autoGenerateSrt:false});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].ready,false);
  assert.equal(jobs[0].srtPath,null);
});

test('single render mặc định không chuyển stock vào Used khi không bật moveUsedStock',()=>{
  const folders={usedBatchFolder:path.join('D:','Used','Batch')};
  assert.equal(shouldMoveReservedAssets({singleMode:true},folders),false);
  assert.equal(shouldMoveReservedAssets({singleMode:true,moveUsedStock:true},folders),true);
  assert.equal(shouldMoveReservedAssets({singleMode:true,moveUsedStock:false},folders),false);
  assert.equal(shouldMoveReservedAssets({singleMode:false},folders),false);
  assert.equal(shouldMoveReservedAssets({singleMode:false,moveUsedStock:true},folders),true);
  assert.equal(shouldMoveReservedAssets({singleMode:false},{usedBatchFolder:null}),false);
});

test('batch mặc định tìm SRT cùng thư mục và cùng tên với voice',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vbs-same-folder-srt-'));
  try{
    fs.writeFileSync(path.join(root,'chapter-01.mp3'),'voice');
    fs.writeFileSync(path.join(root,'chapter-01.srt'),'1\n00:00:00,000 --> 00:00:01,000\nText\n');
    const jobs=buildInputJobs({voiceFolder:root});
    assert.equal(jobs.length,1);
    assert.equal(jobs[0].ready,true);
    assert.equal(jobs[0].srtPath,path.join(root,'chapter-01.srt'));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('auto SRT workers dùng model small và có thể lên tối đa 5 khi đủ tài nguyên',()=>{
  const strong= recommendSrtResourcePlan({
    jobCount: 12,
    host: { logicalCpuCount: 32, freeMemoryMb: 64000 },
    system: { gpuIndex: 0, gpus: [{ index: 0, name: 'RTX 5060', memoryTotalMb: 12288, memoryFreeMb: 11264 }] },
    sampledGpu: { index: 0, name: 'RTX 5060', memoryTotalMb: 12288, memoryUsedMb: 1024 }
  });
  assert.equal(strong.workers,5);
  assert.equal(strong.model,'small');

  const eightGb= recommendSrtResourcePlan({
    jobCount: 12,
    host: { logicalCpuCount: 16, freeMemoryMb: 32000 },
    system: { gpuIndex: 0, gpus: [{ index: 0, name: 'RTX 3070', memoryTotalMb: 8192, memoryFreeMb: 7192 }] },
    sampledGpu: { index: 0, name: 'RTX 3070', memoryTotalMb: 8192, memoryUsedMb: 1000 }
  });
  assert.equal(eightGb.workers,3);
});
