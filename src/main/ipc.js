'use strict';
const {ipcMain,dialog,shell,app,clipboard}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {subtitlePreviewText}=require('./services/batch-service');
const {listFiles}=require('./services/media-scanner');
const {resolveBundledFontsDir,resolveDefaultBackgroundsDir,resolveGreenStorageDir,ensureDirectory,uniqueDestination}=require('./services/path-utils');
const {sanitizeFileName}=require('../shared/core');
const {VIDEO_EXTENSIONS,IMAGE_EXTENSIONS}=require('../shared/constants');

function readManifest(directory){
  try{return JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'))?.assets||[];}catch{return[];}
}
function listDefaultAssets(directory,extensions){
  const manifest=readManifest(directory);
  const labels=new Map(manifest.map((item)=>[String(item.file||''),item]));
  const files=listFiles(directory,extensions).sort((a,b)=>path.basename(a).localeCompare(path.basename(b),undefined,{numeric:true,sensitivity:'base'}));
  return files.map((filePath)=>{
    const file=path.basename(filePath),meta=labels.get(file)||{};
    return {file,label:meta.label||path.basename(file,path.extname(file)),category:meta.category||'',filePath};
  });
}
function assetKind(assetType){
  const type=String(assetType||'').toUpperCase();
  if(type==='DISCLAIMER_VIDEO')return{folder:'Disclaimer',extensions:VIDEO_EXTENSIONS,sourceType:'VIDEO',assetType:'DISCLAIMER_VIDEO'};
  if(type==='GREEN_IMAGE')return{folder:'',extensions:IMAGE_EXTENSIONS,sourceType:'IMAGE',assetType:'GREEN_IMAGE'};
  return{folder:'',extensions:VIDEO_EXTENSIONS,sourceType:'VIDEO',assetType:'GREEN_VIDEO'};
}
function projectAssetStorage(_paths,assetType){
  const kind=assetKind(assetType);
  return resolveGreenStorageDir(kind.folder);
}
function copyFileToGreenStorage(sourcePath, targetDir){
  ensureDirectory(targetDir);
  const resolvedSource=path.resolve(String(sourcePath||''));
  const resolvedDir=path.resolve(targetDir);
  if(resolvedSource.toLocaleLowerCase('en-US').startsWith(resolvedDir.toLocaleLowerCase('en-US')+path.sep)){
    return resolvedSource;
  }
  const ext=path.extname(resolvedSource).toLowerCase();
  const safeBase=sanitizeFileName(path.basename(resolvedSource,path.extname(resolvedSource)))||'asset';
  const directCandidate=path.join(resolvedDir,`${safeBase}${ext}`);
  let targetPath=directCandidate;
  if(fs.existsSync(directCandidate)){
    try{
      const srcSize=fs.statSync(resolvedSource).size;
      const dstSize=fs.statSync(directCandidate).size;
      if(srcSize!==dstSize){
        targetPath=uniqueDestination(resolvedDir,`${safeBase}${ext}`);
      }
    }catch{
      targetPath=uniqueDestination(resolvedDir,`${safeBase}${ext}`);
    }
  }
  fs.copyFileSync(resolvedSource,targetPath);
  return targetPath;
}
function updateTemplateLayersWithCopiedAsset(database, oldPath, newPath){
  if(!newPath||!fs.existsSync(newPath))return;
  const oldNorm=oldPath?path.resolve(oldPath).toLocaleLowerCase('en-US'):'';
  const fileNameNorm=path.basename(newPath).toLocaleLowerCase('en-US');
  const greenRootNorm=path.resolve(resolveGreenStorageDir()).toLocaleLowerCase('en-US');
  for(const tplSummary of database.listTemplates()){
    const tpl=database.getTemplate(tplSummary.id);
    if(!tpl)continue;
    let changed=false;
    const updateRef=(ref)=>{
      if(!ref)return ref;
      const refResolved=path.resolve(String(ref));
      const refNorm=refResolved.toLocaleLowerCase('en-US');
      if(refNorm===oldNorm||(path.basename(refResolved).toLocaleLowerCase('en-US')===fileNameNorm&&(!fs.existsSync(refResolved)||!refNorm.startsWith(greenRootNorm)))){
        if(refResolved!==path.resolve(newPath)){
          changed=true;
          return newPath;
        }
      }
      return ref;
    };
    const cfg=tpl.config||{};
    if(Array.isArray(cfg.layers)){
      cfg.layers=cfg.layers.map((l)=>({...l,sourceReference:updateRef(l.sourceReference??l.source_reference??'')}));
    }
    if(Array.isArray(tpl.layers)){
      for(const l of tpl.layers){
        const nextRef=updateRef(l.source_reference??l.sourceReference??'');
        if(nextRef!==(l.source_reference??l.sourceReference??'')){
          database.db.prepare('UPDATE template_layers SET source_reference=?,updated_at=? WHERE id=?').run(nextRef,Date.now(),l.id);
        }
      }
    }
    if(changed){
      database.db.prepare('UPDATE templates SET config_json=?,updated_at=? WHERE id=?').run(JSON.stringify(cfg),Date.now(),tpl.id);
    }
  }
}
function migrateAndSyncGreenStorage(database, paths){
  try{
    const greenRoot=resolveGreenStorageDir();
    const greenRootNorm=path.resolve(greenRoot).toLocaleLowerCase('en-US');
    const fallbackSearchDirs=[
      greenRoot,
      resolveGreenStorageDir('Disclaimer'),
      path.join(paths.root,'assets','global','green'),
      path.join(paths.root,'assets','global','disclaimer'),
      path.join(process.env.USERPROFILE||'','Downloads','PHONGXANH'),
      path.join(process.env.USERPROFILE||'','Downloads','PHONGXANH','SUB'),
      path.join(process.env.USERPROFILE||'','Downloads','PHONGXANH','SONG')
    ];
    const findExistingSource=(candidates,fileName)=>{
      for(const c of candidates){
        if(c&&fs.existsSync(c)&&fs.statSync(c).isFile())return path.resolve(c);
      }
      if(fileName){
        for(const dir of fallbackSearchDirs){
          const p=path.join(dir,fileName);
          if(fs.existsSync(p)&&fs.statSync(p).isFile())return path.resolve(p);
        }
      }
      return null;
    };
    for(const asset of database.listProjectAssets()){
      const currentPath=asset.file_path?path.resolve(asset.file_path):'';
      const targetDir=projectAssetStorage(paths,asset.asset_type);
      const inGreenStorage=currentPath&&currentPath.toLocaleLowerCase('en-US').startsWith(greenRootNorm)&&fs.existsSync(currentPath);
      if(!inGreenStorage){
        const found=findExistingSource([currentPath,asset.metadata?.sourcePath],asset.file_name||path.basename(currentPath));
        if(found){
          const copiedPath=copyFileToGreenStorage(found,targetDir);
          const stat=fs.statSync(copiedPath);
          database.db.prepare('UPDATE project_assets SET file_name=?,file_path=?,normalized_path=?,file_size_bytes=?,updated_at=? WHERE id=?')
            .run(path.basename(copiedPath),copiedPath,copiedPath.toLocaleLowerCase('en-US'),stat.size,Date.now(),asset.id);
          updateTemplateLayersWithCopiedAsset(database,asset.metadata?.sourcePath||currentPath,copiedPath);
        }
      }else{
        updateTemplateLayersWithCopiedAsset(database,asset.metadata?.sourcePath||currentPath,currentPath);
      }
    }
    // Đồng bộ tất cả các layer trong Template đang trỏ tới link cũ bên ngoài vào Kho_Green
    for(const tplSummary of database.listTemplates()){
      const tpl=database.getTemplate(tplSummary.id);
      if(!tpl)continue;
      const allRefs=new Set();
      for(const l of (tpl.layers||[]))if(l.source_reference)allRefs.add(l.source_reference);
      for(const l of (tpl.config?.layers||[]))if(l.sourceReference)allRefs.add(l.sourceReference);
      for(const ref of allRefs){
        const resolvedRef=path.resolve(String(ref));
        if(resolvedRef.toLocaleLowerCase('en-US').startsWith(greenRootNorm)&&fs.existsSync(resolvedRef))continue;
        const found=findExistingSource([resolvedRef],path.basename(resolvedRef));
        if(found){
          const copiedPath=copyFileToGreenStorage(found,greenRoot);
          updateTemplateLayersWithCopiedAsset(database,ref,copiedPath);
        }
      }
    }
    // Tự động nhận diện và đăng ký mọi file video/ảnh mới được chép trực tiếp vào thư mục Kho_Green (VD: MC-001.mp4..MC-007.mp4)
    const knownPaths=new Set(database.listProjectAssets().map((a)=>String(a.normalized_path||a.file_path||'').toLocaleLowerCase('en-US')));
    if(fs.existsSync(greenRoot)){
      for(const entry of fs.readdirSync(greenRoot,{withFileTypes:true})){
        if(!entry.isFile())continue;
        const ext=path.extname(entry.name).toLowerCase();
        const isVid=VIDEO_EXTENSIONS.has(ext);
        const isImg=IMAGE_EXTENSIONS.has(ext);
        if(!isVid&&!isImg)continue;
        const full=path.resolve(greenRoot,entry.name);
        const norm=full.toLocaleLowerCase('en-US');
        if(knownPaths.has(norm))continue;
        try{
          const st=fs.statSync(full);
          const baseName=path.basename(entry.name,ext);
          database.createProjectAsset({
            assetType:isVid?'GREEN_VIDEO':'GREEN_IMAGE',
            name:baseName,
            fileName:entry.name,
            filePath:full,
            fileSizeBytes:st.size,
            durationMs:0,
            width:1920,
            height:1080,
            hasAudio:false,
            metadata:{autoDiscoveredFromKhoGreen:true}
          });
          knownPaths.add(norm);
        }catch{}
      }
    }
  }catch(err){
    console.warn('[Kho_Green] Lỗi đồng bộ Kho_Green:',err.message);
  }
}
function ensureTemplateLayersInGreenStorage(database, data){
  const cfg=data?.config||data;
  if(!cfg||!Array.isArray(cfg.layers))return data;
  const greenRoot=resolveGreenStorageDir();
  const greenRootNorm=path.resolve(greenRoot).toLocaleLowerCase('en-US');
  for(const layer of cfg.layers){
    const ref=String(layer.sourceReference||layer.source_reference||'').trim();
    if(!ref)continue;
    const resolvedRef=path.resolve(ref);
    if(!resolvedRef.toLocaleLowerCase('en-US').startsWith(greenRootNorm)&&fs.existsSync(resolvedRef)&&fs.statSync(resolvedRef).isFile()){
      const copied=copyFileToGreenStorage(resolvedRef,greenRoot);
      layer.sourceReference=copied;
      if(layer.source_reference!==undefined)layer.source_reference=copied;
    }
  }
  return data;
}

function registerIpc(ctx){const {mainWindow,database,licenseService,ffmpegService,batchService,projectService,templateService,mediaLibraryService,mediaPreviewService,storyVideoService,scriptBridgeService,updaterService,systemHealth,paths}=ctx;let activeController=null;let activeStoryController=null;
  migrateAndSyncGreenStorage(database,paths);
  const send=(channel,payload)=>{
    try{
      if(mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()){
        mainWindow.webContents.send(channel,payload);
      }
    }catch{}
  };
  const guardLicense=()=>{
    if(!licenseService)return null;
    try{return licenseService.requireValidLicense();}catch(err){
      send('license:changed',licenseService.getStatus());
      throw err;
    }
  };
  ipcMain.handle('license:status',async()=>licenseService?await licenseService.syncAndGetStatus():{valid:true,status:'ACTIVE'});
  ipcMain.handle('license:machineId',()=>licenseService?licenseService.getMachineId():'');
  ipcMain.handle('license:activate',async(_e,rawKey)=>{
    if(!licenseService)return {valid:true,status:'ACTIVE'};
    const res=await licenseService.activate(rawKey);
    send('license:changed',res);
    return res;
  });
  ipcMain.handle('license:deactivate',()=>{
    if(!licenseService)return {valid:false,status:'UNACTIVATED'};
    const res=licenseService.deactivate();
    send('license:changed',res);
    return res;
  });
  if(licenseService){
    const licenseTimer=setInterval(async()=>{
      if(mainWindow.isDestroyed()){clearInterval(licenseTimer);return;}
      const status=await licenseService.syncAndGetStatus();
      if(!status.valid){
        try{activeController?.abort();}catch{}
        try{activeStoryController?.abort();}catch{}
      }
      send('license:changed',status);
    },25000);
    licenseTimer.unref?.();
  }
  ipcMain.handle('dialog:directory',async(_e,o={})=>{const r=await dialog.showOpenDialog(mainWindow,{title:o.title||'Chọn thư mục',properties:['openDirectory','createDirectory']});return r.canceled?null:r.filePaths[0];});
  ipcMain.handle('dialog:file',async(_e,o={})=>{const r=await dialog.showOpenDialog(mainWindow,{title:o.title||'Chọn file',properties:o.multiple?['openFile','multiSelections']:['openFile'],filters:o.filters||[]});return r.canceled?null:(o.multiple?r.filePaths:r.filePaths[0]);});
  ipcMain.handle('dialog:save',async(_e,o={})=>{const r=await dialog.showSaveDialog(mainWindow,{title:o.title||'Lưu file',defaultPath:o.defaultPath,filters:o.filters||[]});return r.canceled?null:r.filePath;});
  ipcMain.handle('shell:openPath',async(_e,p)=>{
    if(!p)return 'Đường dẫn trống.';
    const resolved=path.resolve(String(p).trim());
    let isFile=false;
    try{
      if(fs.existsSync(resolved)){
        isFile=fs.statSync(resolved).isFile();
      }else if(!path.extname(resolved)){
        fs.mkdirSync(resolved,{recursive:true});
      }
    }catch{}
    try{
      if(mainWindow&&!mainWindow.isDestroyed()){
        try{mainWindow.setAlwaysOnTop(false);}catch{}
      }
      if(isFile){
        shell.showItemInFolder(resolved);
      }else{
        await shell.openPath(resolved);
      }
      const {spawn}=require('node:child_process');
      const targetFolder=(isFile?path.dirname(resolved):resolved).replace(/'/g,"''");
      const focusPs=`Add-Type 'using System; using System.Runtime.InteropServices; public class VbsWin32 { [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'; Start-Sleep -Milliseconds 250; $sh = New-Object -ComObject Shell.Application; foreach ($w in $sh.Windows()) { try { if ($w.Document.Folder.Self.Path -ieq '${targetFolder}') { [VbsWin32]::ShowWindowAsync([IntPtr]$w.HWND, 9) | Out-Null; [VbsWin32]::SetForegroundWindow([IntPtr]$w.HWND) | Out-Null } } catch {} }`;
      const encoded=Buffer.from(focusPs,'utf16le').toString('base64');
      const child=spawn('powershell.exe',['-NoProfile','-WindowStyle','Hidden','-EncodedCommand',encoded],{detached:true,stdio:'ignore',windowsHide:true});
      child.unref();
      return '';
    }catch(e){
      return shell.openPath(resolved);
    }
  });
  ipcMain.handle('clipboard:write',(_e,value)=>{clipboard.writeText(String(value||''));return true;});
  ipcMain.handle('system:check',()=>systemHealth.check());
  ipcMain.handle('system:refreshGpu',()=>systemHealth.check({force:true}));
  ipcMain.handle('system:encoderTest',(_e,encoder)=>ffmpegService.testEncoder(encoder));
  ipcMain.handle('media:preview',(_e,sourcePath,options)=>mediaPreviewService.create(sourcePath,options));
  const folderPreviewCache=new Map();
  ipcMain.handle('media:folderPreview',async(_e,folder,kind='STOCK')=>{
    const resolvedDir=path.resolve(String(folder||''));
    const cacheKey=`${resolvedDir}|${kind}`;
    if(folderPreviewCache.has(cacheKey))return folderPreviewCache.get(cacheKey);
    if(!fs.existsSync(resolvedDir))return null;
    const extensions=kind==='IMAGE'?IMAGE_EXTENSIONS:new Set([...VIDEO_EXTENSIONS,...IMAGE_EXTENSIONS]);
    const candidates=[];
    const collectDir=(dir,depth=0)=>{
      try{
        const entries=fs.readdirSync(dir,{withFileTypes:true});
        for(const entry of entries){
          const full=path.join(dir,entry.name);
          if(entry.isFile()){
            const ext=path.extname(entry.name).toLowerCase();
            if(!extensions.has(ext))continue;
            try{
              const st=fs.statSync(full);
              if(st.size>1024&&st.size<250*1024*1024)candidates.push({filePath:full,size:st.size});
            }catch{}
          }else if(entry.isDirectory()&&depth<1&&candidates.length<5){
            collectDir(full,depth+1);
          }
          if(candidates.length>=12)break;
        }
      }catch{}
    };
    collectDir(resolvedDir,0);
    if(!candidates.length)return null;
    candidates.sort((a,b)=>a.size-b.size);
    const res=await mediaPreviewService.create(candidates[0].filePath,{timeSeconds:.4,width:540});
    if(res?.previewPath)folderPreviewCache.set(cacheKey,res);
    return res;
  });
  ipcMain.handle('media:listFolderAssets',async(_e,folder)=>{
    const raw=String(folder||'').trim();
    if(!raw)return[];
    const dir=path.resolve(raw);
    if(!fs.existsSync(dir))return[];
    const extensions=new Set([...IMAGE_EXTENSIONS,...VIDEO_EXTENSIONS]);
    const entries=await fs.promises.readdir(dir,{withFileTypes:true});
    const matched=[];
    for(const entry of entries){
      if(!entry.isFile())continue;
      const ext=path.extname(entry.name).toLowerCase();
      if(!extensions.has(ext))continue;
      matched.push({name:entry.name,ext,filePath:path.join(dir,entry.name)});
    }
    matched.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}));
    return matched.map((item,idx)=>({
      index:idx+1,
      filePath:item.filePath,
      fileName:item.name,
      baseKey:path.basename(item.name,item.ext).trim(),
      ext:item.ext,
      isVideo:VIDEO_EXTENSIONS.has(item.ext)
    }));
  });
  ipcMain.handle('assets:defaults',()=>({
    green:[],
    backgrounds:listDefaultAssets(resolveDefaultBackgroundsDir(),IMAGE_EXTENSIONS),
    paths:{backgrounds:resolveDefaultBackgroundsDir(),greenStorage:resolveGreenStorageDir()}
  }));
  ipcMain.handle('subtitle:preview',(_e,sourcePath,renderConfig={})=>subtitlePreviewText(fs.readFileSync(path.resolve(sourcePath),'utf8'),renderConfig));
  ipcMain.handle('app:info',()=>{
    const verInfo = updaterService ? updaterService.getLocalVersionInfo() : null;
    return {
      version: verInfo?.version || `V${app.getVersion()}`,
      buildNumber: verInfo?.build_number || 100,
      versionInfo: verInfo,
      name: app.getName(),
      isPackaged: app.isPackaged,
      resourcePaths: {
        fonts: resolveBundledFontsDir(),
        defaultBackgrounds: resolveDefaultBackgroundsDir(),
        greenStorage: resolveGreenStorageDir()
      }
    };
  });
  ipcMain.handle('updater:localInfo', () => updaterService ? updaterService.getLocalVersionInfo() : { version: 'V1.0.0', build_number: 100 });
  ipcMain.handle('updater:check', async (_e, opts = {}) => updaterService ? await updaterService.checkForUpdates(opts) : { hasUpdate: false, currentVersion: 'V1.0.0' });
  ipcMain.handle('updater:apply', async () => updaterService ? await updaterService.applyUpdate() : { status: 'error', message: 'UpdaterService không khả dụng' });
  ipcMain.handle('updater:relaunch', async () => {
    if (updaterService && typeof updaterService.relaunchApp === 'function') {
      updaterService.relaunchApp();
      return { ok: true };
    }
    return { ok: false };
  });
  ipcMain.handle('settings:get',(_e,k,f)=>database.getSetting(k,f));ipcMain.handle('settings:set',(_e,k,v)=>database.setSetting(k,v));

  ipcMain.handle('projects:list',()=>projectService.list());ipcMain.handle('projects:get',(_e,id)=>projectService.get(id));ipcMain.handle('projects:create',(_e,d)=>projectService.create(d));ipcMain.handle('projects:update',(_e,id,d)=>projectService.update(id,d));ipcMain.handle('projects:delete',(_e,id)=>projectService.delete(id));
  ipcMain.handle('templates:list',(_e,p)=>templateService.list(p));ipcMain.handle('templates:get',(_e,id)=>templateService.get(id));ipcMain.handle('templates:create',(_e,d)=>templateService.create(ensureTemplateLayersInGreenStorage(database,d)));ipcMain.handle('templates:save',(_e,id,d,n)=>templateService.save(id,ensureTemplateLayersInGreenStorage(database,d),n));ipcMain.handle('templates:delete',(_e,id)=>templateService.delete(id));ipcMain.handle('templates:versions',(_e,id)=>templateService.versions(id));ipcMain.handle('templates:restore',(_e,id,v)=>templateService.restore(id,v));ipcMain.handle('templates:export',(_e,id,p)=>templateService.export(id,p));ipcMain.handle('templates:import',(_e,p,projectId)=>templateService.import(p,projectId));ipcMain.handle('presets:list',()=>templateService.listPresets());ipcMain.handle('presets:transition:save',(_e,d)=>templateService.saveTransitionPreset(d));ipcMain.handle('presets:export:save',(_e,d)=>templateService.saveExportPreset(d));
  ipcMain.handle('libraries:list',()=>mediaLibraryService.list());ipcMain.handle('libraries:create',(_e,d)=>mediaLibraryService.create(d));ipcMain.handle('libraries:delete',(_e,id)=>mediaLibraryService.delete(id));ipcMain.handle('libraries:deleteWithFiles',(_e,id)=>mediaLibraryService.deleteWithFiles(id));ipcMain.handle('libraries:assets',(_e,id,status)=>mediaLibraryService.assets(id,status));ipcMain.handle('libraries:stats',(_e,id)=>mediaLibraryService.stats(id));ipcMain.handle('libraries:purge',(_e,id)=>mediaLibraryService.purgeUnusable(id));ipcMain.handle('libraries:scan',(_e,id)=>mediaLibraryService.scan(id,(p)=>send('library:progress',p)));
  ipcMain.handle('projectAssets:storagePath',()=>resolveGreenStorageDir());
  ipcMain.handle('projectAssets:openFolder',()=>{
    const dir=resolveGreenStorageDir();
    try{fs.mkdirSync(dir,{recursive:true});}catch{}
    try{
      const {spawn}=require('node:child_process');
      const child=spawn('explorer.exe',[dir],{detached:true,stdio:'ignore',windowsHide:false});
      child.unref();
      return '';
    }catch{
      return shell.openPath(dir);
    }
  });
  ipcMain.handle('projectAssets:list',(_e,assetType=null)=>{
    migrateAndSyncGreenStorage(database,paths);
    return database.listProjectAssets(null,assetType);
  });
  ipcMain.handle('projectAssets:create',async(_e,d={})=>{
    const sourcePath=path.resolve(String(d.filePath||''));
    const requestedType=String(d.assetType||'GREEN_VIDEO').toUpperCase();
    const kind=assetKind(requestedType);
    const assetType=kind.assetType||requestedType;
    if(!fs.existsSync(sourcePath))throw new Error('File tài nguyên không tồn tại.');
    const ext=path.extname(sourcePath).toLowerCase();
    if(!kind.extensions.has(ext))throw new Error('Loại file không phù hợp với loại tài nguyên đã chọn.');
    const targetDir=projectAssetStorage(paths,assetType);
    const safeBase=sanitizeFileName(path.basename(sourcePath,path.extname(sourcePath)))||'asset';
    const targetPath=copyFileToGreenStorage(sourcePath,targetDir);
    let metadata={};
    try{metadata=await ffmpegService.probe(targetPath);}catch{}
    const stat=fs.statSync(targetPath);
    const normalizedTarget=targetPath.toLocaleLowerCase('en-US');
    const existing=database.listProjectAssets().find((a)=>String(a.normalized_path||'').toLocaleLowerCase('en-US')===normalizedTarget);
    let created;
    if(existing){
      database.updateRow('project_assets',existing.id,{
        asset_type:assetType,
        name:String(d.name||existing.name||safeBase).trim()||safeBase,
        file_name:path.basename(targetPath),
        file_path:targetPath,
        normalized_path:normalizedTarget,
        file_size_bytes:stat.size,
        duration_ms:metadata.durationMs||existing.duration_ms||0,
        width:metadata.width||existing.width||0,
        height:metadata.height||existing.height||0,
        has_audio:metadata.hasAudio?1:0,
        metadata_json:JSON.stringify({sourcePath,copiedToGreenStorage:true}),
        updated_at:Date.now()
      });
      created=database.getProjectAsset(existing.id);
    }else{
      created=database.createProjectAsset({
        assetType,
        name:String(d.name||safeBase).trim()||safeBase,
        fileName:path.basename(targetPath),
        filePath:targetPath,
        fileSizeBytes:stat.size,
        durationMs:metadata.durationMs||0,
        width:metadata.width||0,
        height:metadata.height||0,
        hasAudio:Boolean(metadata.hasAudio),
        metadata:{sourcePath,copiedToGreenStorage:true}
      });
    }
    updateTemplateLayersWithCopiedAsset(database,sourcePath,targetPath);
    return created;
  });
  ipcMain.handle('projectAssets:delete',(_e,id)=>{
    const asset=database.deleteProjectAsset(id);
    if(asset?.file_path){
      try{
        const resolved=path.resolve(asset.file_path);
        const greenRoot=path.resolve(resolveGreenStorageDir()).toLocaleLowerCase('en-US');
        const legacyRoot=path.resolve(paths.root,'assets').toLocaleLowerCase('en-US');
        const resolvedNorm=resolved.toLocaleLowerCase('en-US');
        if(resolvedNorm.startsWith(greenRoot)||resolvedNorm.startsWith(legacyRoot)){
          fs.rmSync(resolved,{force:true});
        }
      }catch{}
    }
    return asset;
  });

  ipcMain.handle('batch:scan',async(_e,c)=>{await licenseService?.syncRemoteRevocation();guardLicense();return batchService.scan(c,{onMediaScan:(p)=>send('batch:progress',{stage:'SCAN_MEDIA',...p}),onVoiceScan:(p)=>send('batch:progress',{stage:'SCAN_VOICE',...p})});});
  const callbacks={onLog:(m)=>send('batch:log',m),onProgress:(p)=>send('batch:progress',p),onJob:(p)=>send('batch:job',p),onBatch:(p)=>send('batch:state',p)};
  ipcMain.handle('batch:start',async(_e,c)=>{await licenseService?.syncRemoteRevocation();guardLicense();if(activeController)throw new Error('Đang có batch chạy.');activeController=new AbortController();try{return await batchService.run(c,callbacks,activeController.signal);}finally{activeController=null;}});
  ipcMain.handle('batch:resume',async(_e,id)=>{guardLicense();if(activeController)throw new Error('Đang có batch chạy.');activeController=new AbortController();try{return await batchService.resume(id,callbacks,activeController.signal);}finally{activeController=null;}});
  ipcMain.handle('batch:retryFailed',async(_e,id)=>{guardLicense();if(activeController)throw new Error('Đang có batch chạy.');activeController=new AbortController();try{return await batchService.retryFailed(id,callbacks,activeController.signal);}finally{activeController=null;}});
  ipcMain.handle('batch:pause',()=>batchService.requestPause());ipcMain.handle('batch:cancel',()=>{activeController?.abort();return Boolean(activeController);});ipcMain.handle('batch:list',()=>database.listBatches());ipcMain.handle('batch:jobs',(_e,id)=>database.listBatchJobs(id));ipcMain.handle('reports:list',(_e,id)=>database.listReports(id));
  ipcMain.handle('storyVideo:scan',(_e,items)=>{guardLicense();return storyVideoService?.scanAll(items);});
  ipcMain.handle('storyVideo:scanDirectory',(_e,dir)=>storyVideoService?.scanDirectory(dir));
  const storyCallbacks={onLog:(m)=>send('storyVideo:log',m),onProgress:(p)=>send('storyVideo:progress',p),onJob:(p)=>send('storyVideo:job',p),onState:(p)=>send('storyVideo:state',p)};
  ipcMain.handle('storyVideo:start',async(_e,c)=>{
    guardLicense();
    if(!storyVideoService)throw new Error('Dịch vụ Story Video chưa được khởi tạo.');
    if(activeStoryController)throw new Error('Đang có tiến trình tạo Story Video chạy.');
    activeStoryController=new AbortController();
    try{return await storyVideoService.start(c,storyCallbacks,activeStoryController.signal);}finally{activeStoryController=null;}
  });
  ipcMain.handle('storyVideo:cancel',()=>{
    storyVideoService?.cancel();
    activeStoryController?.abort();
    return Boolean(activeStoryController);
  });

  // Kênh Tạo Ảnh Phân Cảnh AI (Skill 08 & G-Labs Studio Webhook nano_banana_2_lite)
  const { GLabsImageService, CinematicVisualDirector } = require('./services/image');
  const glabsImageService = new GLabsImageService();
  const cinematicVisualDirector = new CinematicVisualDirector({ glabsImageService });
  let activeImageController = null;

  ipcMain.handle('image:checkHealth', async () => glabsImageService.checkHealth());
  ipcMain.handle('image:planScenes', async (_e, params) => cinematicVisualDirector.planScenes(params));
  ipcMain.handle('image:generatePackage', async (event, params) => {
    guardLicense();
    if (activeImageController) throw new Error('Đang có tiến trình tạo ảnh AI chạy.');
    activeImageController = new AbortController();
    const onProgress = (p) => {
      try { event.sender.send('image:progress', p); } catch {}
    };
    try {
      return await cinematicVisualDirector.generateStoryImagePackage({
        ...params,
        onProgress,
        signal: activeImageController.signal
      });
    } finally {
      activeImageController = null;
    }
  });
  ipcMain.handle('image:generateSingle', async (_e, { prompt, outputPath, model, aspectRatio }) => {
    return glabsImageService.generateAndSaveImage({ prompt, outputPath, model, aspectRatio });
  });
  ipcMain.handle('image:cancel', async () => {
    if (activeImageController) {
      activeImageController.abort();
      activeImageController = null;
    }
    await glabsImageService.stopTask();
    return true;
  });

  // Kênh Chuẩn Hóa Kho Stock (1080p 24fps Full GPU CUDA + NVENC)
  const { StockConformerService } = require('./services/stock-conformer-service');
  let activeStockConformController = null;
  ipcMain.handle('stock:scanFolder', async (_e, folderPath) => {
    return await StockConformerService.scanStockFolder(folderPath, ffmpegService);
  });
  ipcMain.handle('stock:conformFolder', async (event, folderPath) => {
    guardLicense();
    if (activeStockConformController) throw new Error('Đang có tiến trình chuẩn hóa stock đang chạy.');
    activeStockConformController = new AbortController();
    const onProgress = (p) => {
      try { event.sender.send('stock:conformProgress', p); } catch {}
    };
    try {
      return await StockConformerService.conformFolder(folderPath, ffmpegService, {
        onProgress,
        signal: activeStockConformController.signal
      });
    } finally {
      activeStockConformController = null;
    }
  });
  ipcMain.handle('stock:cancelConform', () => {
    activeStockConformController?.abort();
    return Boolean(activeStockConformController);
  });

  // Kênh Quản Lý & Tự Động Hóa Voice AI (VoiceStudio Direct Integration)
  const { VoiceStudioService, VoiceValidatorService, VoiceProfileManager } = require('./services/voice');
  const voiceProfileManager = ctx.voiceProfileManager || new VoiceProfileManager();
  const voiceStudioService = ctx.voiceStudioService || new VoiceStudioService({ profileManager: voiceProfileManager });
  const voiceValidatorService = ctx.voiceValidatorService || new VoiceValidatorService({
    voiceStudioService,
    ffmpegService
  });

  ipcMain.handle('voice:checkStatus', async () => {
    return await voiceStudioService.checkHealth();
  });

  ipcMain.handle('voice:launchVoiceStudio', async () => {
    const { spawn } = require('node:child_process');
    const health = await voiceStudioService.checkHealth();
    if (health.online) {
      return { success: true, online: true, message: 'VoiceStudio đang hoạt động sẵn sàng trên cổng 3900.' };
    }

    const daemonRuntime = voiceStudioService._resolveVoiceStudioDaemonRuntime();
    const installedExe = voiceStudioService._resolveVoiceStudioExecutable();
    if ((daemonRuntime && fs.existsSync(daemonRuntime.pythonExe)) || (installedExe && fs.existsSync(installedExe))) {
      const ready = await voiceStudioService.ensureVoiceStudioRunning(60000);
      return {
        success: true,
        online: ready,
        message: ready
          ? 'Đã khởi động VoiceStudio GPU Server thành công và kết nối cổng 3900!'
          : 'Đang khởi động VoiceStudio GPU Server trong nền. Vui lòng đợi vài giây để dịch vụ AI nạp xong model.'
      };
    }

    const installerPaths = [
      path.resolve(paths.root || process.cwd(), 'tools', 'VoiceStudio-Electron-0.5.6-win-x64.exe'),
      path.resolve(process.cwd(), 'tools', 'VoiceStudio-Electron-0.5.6-win-x64.exe')
    ];
    const foundInstaller = installerPaths.find(p => fs.existsSync(p));
    if (!foundInstaller) {
      return { success: false, error: 'Chưa cài đặt VoiceStudio và không tìm thấy bộ cài trong thư mục tools/.' };
    }

    try {
      const child = spawn(foundInstaller, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return { success: true, online: false, message: 'Đã mở bộ cài đặt VoiceStudio v0.5.6.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('voice:listProfiles', () => {
    return voiceProfileManager.listProfiles();
  });

  ipcMain.handle('voice:getProfile', (_e, id) => {
    return voiceProfileManager.getProfile(id);
  });

  ipcMain.handle('voice:saveProfile', (_e, data, samplePath) => {
    return voiceProfileManager.saveProfile(data, samplePath);
  });

  ipcMain.handle('voice:deleteProfile', (_e, id) => {
    return voiceProfileManager.deleteProfile(id);
  });

  ipcMain.handle('voice:testGenerate', async (_e, { text, voice, refAudio, language, model, speed } = {}) => {
    guardLicense();
    const os = require('node:os');
    const tempOut = path.join(os.tmpdir(), `vbs_voice_test_${Date.now()}.mp3`);
    return await voiceStudioService.generateSpeech({
      text: text || 'Xin chào, đây là bản thử giọng mẫu từ Voice Studio AI.',
      voice: voice || 'default',
      refAudio: refAudio || null,
      language: language || null,
      model: model || 'omnivoice',
      speed: Number(speed) || 1.0,
      outputPath: tempOut
    });
  });

  ipcMain.handle('voice:readScriptFile', (_e, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(path.resolve(filePath), 'utf8');
  });

  ipcMain.handle('voice:generateFullScript', async (event, { scriptText, scriptPath, voice, refAudio, language, model, speed, outputPath } = {}) => {
    guardLicense();
    let resolvedText = scriptText;
    if (!resolvedText && scriptPath && fs.existsSync(scriptPath)) {
      resolvedText = fs.readFileSync(path.resolve(scriptPath), 'utf8');
    }
    const onProgress = (p) => {
      try { event.sender.send('voice:generateProgress', p); } catch {}
    };
    return await voiceValidatorService.generateAndValidateScript({
      scriptText: resolvedText,
      voice: voice || 'default',
      refAudio: refAudio || null,
      language: language || null,
      model: model || 'omnivoice',
      speed: Number(speed) || 1.0,
      outputPath,
      onProgress
    });
  });

  // ====================================================================
  // IPC HANDLERS: CẦU NỐI BÀN #6 (KỊCH BẢN) ➔ BÀN #7 (VOICE & VIDEO GPU)
  // ====================================================================
  ipcMain.handle('scriptBridge:status', async () => {
    if (!scriptBridgeService) return { online: false };
    await scriptBridgeService.checkScriptServerHealth(1200);
    return scriptBridgeService.getPublicState();
  });

  ipcMain.handle('scriptBridge:ensureScriptServer', async () => {
    if (!scriptBridgeService) return { online: false };
    return await scriptBridgeService.ensureScriptServerRunning();
  });

  ipcMain.handle('scriptBridge:restartScriptServer', async () => {
    if (!scriptBridgeService) return { online: false };
    return await scriptBridgeService.restartScriptServer();
  });

  ipcMain.handle('scriptBridge:saveSettings', (_e, partial) => {
    if (!scriptBridgeService) return { online: false };
    return scriptBridgeService.saveSettings(partial);
  });

  ipcMain.handle('scriptBridge:lockConfig', (_e, config) => {
    if (!scriptBridgeService) return { online: false };
    return scriptBridgeService.lockVideoConfig(config);
  });

  ipcMain.handle('scriptBridge:enqueueScript', (_e, payload) => {
    guardLicense();
    if (!scriptBridgeService) return { enqueued: false };
    return scriptBridgeService.enqueueCompletedScript(payload, { forceImmediate: true });
  });

  ipcMain.handle('scriptBridge:enqueueFolder', (_e, folderPath) => {
    guardLicense();
    if (!scriptBridgeService) return { count: 0 };
    return scriptBridgeService.enqueueFolderScripts(folderPath);
  });

  ipcMain.handle('scriptBridge:clearQueue', () => {
    if (!scriptBridgeService) return { online: false };
    return scriptBridgeService.clearCompletedQueue();
  });

  ipcMain.handle('scriptBridge:stockReport', async (_e, { folderPath = '', forceRescan = false } = {}) => {
    if (!scriptBridgeService) return { found: false, files: [], history: [] };
    return await scriptBridgeService.scanStockFolderAndGetReport(folderPath, { forceRescan });
  });

  ipcMain.handle('scriptBridge:resetStockUsage', async (_e, folderPath = '') => {
    if (!scriptBridgeService) return { ok: false };
    return await scriptBridgeService.resetStockFolderUsage(folderPath);
  });

  ipcMain.handle('scriptBridge:resumeAfterStock', async (_e, { newMediaFolder = '' } = {}) => {
    guardLicense();
    if (!scriptBridgeService) return { ok: false };
    return await scriptBridgeService.resumeAfterStockReplenished({ newMediaFolder });
  });

  ipcMain.handle('libraries:detailedReport', (_e, idOrPath, playbackRate = 0.75) => {
    return database.getStockFolderDetailedReport(idOrPath, playbackRate);
  });

  ipcMain.handle('libraries:resetUsage', (_e, idOrPath) => {
    return database.resetStockLibraryUsage(idOrPath);
  });
}
module.exports={registerIpc};
