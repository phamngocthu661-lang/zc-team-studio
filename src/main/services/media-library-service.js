'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {scanFolder}=require('./media-scanner');
class MediaLibraryService{
  constructor(database,ffmpeg){this.database=database;this.ffmpeg=ffmpeg;}
  list(){return this.database.listLibraries().map((library)=>({...library,...this.stats(library.id)}));}
  create(data){if(!data.rootPath)throw new Error('Cần chọn thư mục media.');return this.database.getOrCreateLibrary({name:data.name||path.basename(data.rootPath),rootPath:data.rootPath,usedPath:data.usedPath||null,invalidPath:data.invalidPath||null,libraryType:data.libraryType||'STOCK'});}
  delete(id){return this.database.deleteLibrary(id);}
  assertSafeDeleteDirectory(directory){
    const resolved=path.resolve(String(directory||''));
    const parsed=path.parse(resolved);
    if(!resolved||resolved===parsed.root)throw new Error(`Không được xóa thư mục gốc: ${resolved}`);
    if(resolved.length<=parsed.root.length+2)throw new Error(`Đường dẫn thư mục quá rộng, không xóa: ${resolved}`);
    if(fs.existsSync(resolved)&&!fs.statSync(resolved).isDirectory())throw new Error(`Đường dẫn không phải thư mục: ${resolved}`);
    return resolved;
  }
  deleteWithFiles(id){
    const library=this.database.listLibraries().find((l)=>l.id===id);
    if(!library)throw new Error('Media library không tồn tại.');
    const root=this.assertSafeDeleteDirectory(library.root_path);
    const targets=[root];
    if(library.used_path){
      const used=this.assertSafeDeleteDirectory(library.used_path);
      const relative=path.relative(root,used);
      const insideRoot=relative&&!relative.startsWith('..')&&!path.isAbsolute(relative);
      if(!insideRoot&&used!==root)targets.push(used);
    }
    const deletedDirs=[];
    const skippedDirs=[];
    const failedDirs=[];
    for(const target of [...new Set(targets)]){
      if(!fs.existsSync(target)){skippedDirs.push(target);continue;}
      try{fs.rmSync(target,{recursive:true,force:true});deletedDirs.push(target);}
      catch(error){failedDirs.push({path:target,error:error.message});}
    }
    if(failedDirs.length){
      const message=failedDirs.map((item)=>`${item.path}: ${item.error}`).join('\n');
      throw new Error(`Không xóa được thư mục media. Có thể file đang mở hoặc bị khóa:\n${message}`);
    }
    this.database.deleteLibrary(id);
    return {deletedDirs,skippedDirs,libraryId:id};
  }
  assets(id,status){return this.database.listMediaAssets(id,status||null);}
  stats(id){return this.database.getMediaLibraryStats(id);}
  async scan(id,onProgress){const library=this.database.listLibraries().find((l)=>l.id===id);if(!library)throw new Error('Media library không tồn tại.');const items=await scanFolder(library.root_path,this.ffmpeg,library.library_type,onProgress);const missing=this.database.markLibraryScanMissing(id,items.map((item)=>item.filePath));for(const item of items)this.database.upsertMediaAsset(id,item);return {library,items,total:items.length,valid:items.filter((i)=>i.valid).length,invalid:items.filter((i)=>!i.valid).length,missing,stats:this.stats(id)};}
  purgeUnusable(id){
    const library=this.database.listLibraries().find((l)=>l.id===id);
    if(!library)throw new Error('Media library không tồn tại.');
    const purgeableStatuses=new Set(['AVAILABLE','RESERVED','MOVING','MISSING','INVALID']);
    const assets=this.assets(id).filter((asset)=>{
      if(asset.status==='USED'||!purgeableStatuses.has(asset.status))return false;
      return asset.status==='MISSING'||asset.status==='INVALID'||!asset.file_path||!fs.existsSync(asset.file_path);
    });
    const root=path.resolve(library.root_path);
    const removable=[];
    let deletedFiles=0;
    let failedFiles=0;
    for(const asset of assets){
      if(asset.status==='MISSING'||!asset.file_path||!fs.existsSync(asset.file_path)){removable.push(asset.id);continue;}
      const candidate=path.resolve(asset.file_path);
      const relative=path.relative(root,candidate);
      const insideRoot=relative&&!relative.startsWith('..')&&!path.isAbsolute(relative);
      if(!insideRoot){removable.push(asset.id);continue;}
      try{fs.rmSync(candidate,{force:true});removable.push(asset.id);deletedFiles+=1;}catch{failedFiles+=1;}
    }
    const removedRecords=this.database.removeMediaAssets(removable,[...purgeableStatuses]);
    return {removedRecords,deletedFiles,failedFiles,missingRecords:assets.filter((asset)=>asset.status==='MISSING'||!asset.file_path||!fs.existsSync(asset.file_path)).length,stats:this.stats(id)};
  }
}
module.exports={MediaLibraryService};
