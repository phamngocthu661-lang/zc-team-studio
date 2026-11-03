'use strict';

const fs = require('node:fs');
const { readHostSnapshot } = require('./resource-controller');

class SystemHealthService {
  constructor(ffmpeg, paths) {
    this.ffmpeg = ffmpeg;
    this.paths = paths;
    this.hostState = {};
  }

  async check({ force = false } = {}) {
    const media = await this.ffmpeg.checkSystem({ force, gpuIndex: -1 });
    const stat = fs.statfsSync(this.paths.root);
    return {
      ...media,
      storage: {
        freeBytes: stat.bavail * stat.bsize,
        totalBytes: stat.blocks * stat.bsize
      },
      resources: readHostSnapshot(this.hostState),
      dataRoot: this.paths.root
    };
  }
}

module.exports = { SystemHealthService };
