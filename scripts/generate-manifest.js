'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const excluded=new Set(['MANIFEST.txt','VideoBatchStudio-Desktop-Offline.zip']);
function walk(dir,out=[]){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','release','.git'].includes(entry.name))continue;const full=path.join(dir,entry.name),rel=path.relative(root,full).replace(/\\/g,'/');if(entry.isDirectory())walk(full,out);else if(!excluded.has(rel)&&!rel.match(/\.(db|db-wal|db-shm)$/))out.push(rel);}return out;}
const files=walk(root).sort();
const lines=['VIDEO BATCH STUDIO DESKTOP OFFLINE — FILE MANIFEST','',`Generated: ${new Date().toISOString()}`,`Files: ${files.length}`,'','FILES',...files,'','SHA256'];
for(const rel of files){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');lines.push(`${hash}  ${rel}`);}
fs.writeFileSync(path.join(root,'MANIFEST.txt'),lines.join('\n')+'\n');
console.log(`Manifest generated: ${files.length} files.`);
