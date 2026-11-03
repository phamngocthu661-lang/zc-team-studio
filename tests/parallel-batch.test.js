'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BatchService } = require('../src/main/services/batch-service');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('batch worker pool runs at most two jobs concurrently', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-parallel-test-'));
  const jobs = [1, 2, 3, 4].map((n) => ({
    id: `job-${n}`,
    voice_name: `voice-${n}.mp3`,
    status: 'PENDING'
  }));
  const batch = { completed_jobs: 0, failed_jobs: 0, skipped_jobs: 0 };
  const updates = [];
  const database = {
    getBatch: () => batch,
    listBatchJobs: () => jobs,
    updateBatch: (_id, patch) => updates.push(patch),
    createReport: () => {}
  };
  const service = new BatchService({
    database,
    ffmpegService: {},
    paths: { temp: root },
    licenseClient: { assertCanStartBatch() {} }
  });

  let active = 0;
  let maxActive = 0;
  service.processJob = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await delay(35);
    active -= 1;
    return { kind: 'COMPLETED' };
  };

  const result = await service.execute(
    'batch-1',
    { maxParallelJobs: 2, singleMode: false },
    {
      outputFolder: root,
      reportFolder: root,
      logFolder: root,
      videoFolder: root,
      usedBatchFolder: root
    },
    {},
    {},
    new AbortController().signal
  );

  assert.equal(maxActive, 2);
  assert.equal(result.status, 'COMPLETED');
  assert.ok(updates.some((patch) => patch.completed_jobs === 4));
});

test('batch worker pool can run more than three jobs concurrently', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-parallel-8-test-'));
  const jobs = Array.from({ length: 8 }, (_value, index) => ({
    id: `job-${index + 1}`,
    voice_name: `voice-${index + 1}.mp3`,
    status: 'PENDING'
  }));
  const updates = [];
  const database = {
    getBatch: () => ({ completed_jobs: 0, failed_jobs: 0, skipped_jobs: 0 }),
    listBatchJobs: () => jobs,
    updateBatch: (_id, patch) => updates.push(patch),
    createReport: () => {}
  };
  const service = new BatchService({
    database,
    ffmpegService: {},
    paths: { temp: root },
    licenseClient: { assertCanStartBatch() {} }
  });

  let active = 0;
  let maxActive = 0;
  service.processJob = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await delay(35);
    active -= 1;
    return { kind: 'COMPLETED' };
  };

  const result = await service.execute(
    'batch-8',
    { maxParallelJobs: 8, singleMode: false },
    { outputFolder: root, reportFolder: root, logFolder: root, videoFolder: root, usedBatchFolder: root },
    {},
    {},
    new AbortController().signal
  );

  assert.equal(maxActive, 8);
  assert.equal(result.status, 'COMPLETED');
  assert.ok(updates.some((patch) => patch.completed_jobs === 8));
});

test('retry failed batch jobs only reruns failed videos and fixes counters', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vbs-retry-failed-test-'));
  const jobs = [
    { id: 'job-ok', voice_name: 'ok.mp3', status: 'COMPLETED' },
    { id: 'job-failed', voice_name: 'failed.mp3', status: 'FAILED', error_message: 'boom' },
    { id: 'job-waiting', voice_name: 'waiting.mp3', status: 'WAITING' }
  ];
  const batch = {
    id: 'batch-retry',
    name: 'Retry Batch',
    output_folder: root,
    completed_jobs: 1,
    failed_jobs: 1,
    skipped_jobs: 0,
    config: { batchName: 'Retry Batch', maxParallelJobs: 1, singleMode: false, autoGenerateSrt: false }
  };
  const processed = [];
  const database = {
    getBatch: () => batch,
    listBatchJobs: () => jobs,
    updateBatch: (_id, patch) => Object.assign(batch, patch),
    updateJob: (id, patch) => Object.assign(jobs.find((job) => job.id === id), patch),
    createReport: () => {}
  };
  const service = new BatchService({
    database,
    ffmpegService: { checkSystem: async () => ({ ffmpegOk: true, ffprobeOk: true }) },
    paths: { temp: root, cache: root },
    licenseClient: { assertCanStartBatch() {} }
  });

  service.processJob = async ({ job }) => {
    processed.push(job.id);
    return { kind: 'COMPLETED' };
  };

  const result = await service.retryFailed('batch-retry', {}, new AbortController().signal);

  assert.deepEqual(processed, ['job-failed']);
  assert.equal(jobs.find((job) => job.id === 'job-failed').status, 'PENDING');
  assert.equal(batch.completed_jobs, 2);
  assert.equal(batch.failed_jobs, 0);
  assert.equal(result.status, 'COMPLETED');
});
