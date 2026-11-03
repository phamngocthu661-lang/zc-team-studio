'use strict';
const fs=require('node:fs');
const path=require('node:path');

const TEMP_FILE_EXTENSIONS = new Set(['.mp4', '.mov', '.srt', '.part', '.tmp']);

function isTransientTempFile(name) {
  if (name === 'active-ffmpeg-processes.json') return false;
  const ext = path.extname(name).toLowerCase();
  if (TEMP_FILE_EXTENSIONS.has(ext)) return true;
  return /\.(tmp|part)\./i.test(name);
}

class RecoveryService{
  constructor(database,paths){this.database=database;this.paths=paths;}
  run(){const result=this.database.recoverInterruptedWork();let removedTemp=0;if(fs.existsSync(this.paths.temp)){for(const name of fs.readdirSync(this.paths.temp)){if(isTransientTempFile(name)){try{fs.rmSync(path.join(this.paths.temp,name),{recursive:true,force:true});removedTemp+=1;}catch{}}}}return {...result,removedTemp};}
}
module.exports={RecoveryService,isTransientTempFile};
