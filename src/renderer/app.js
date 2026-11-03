'use strict';
const api=window.vbs,$=(id)=>document.getElementById(id);
const TRANSITIONS=[{id:'fade',label:'Cross Fade',weight:40,recommended:true},{id:'dissolve',label:'Cross Dissolve',weight:28,recommended:true},{id:'hblur',label:'Soft Blur',weight:12,recommended:true},{id:'zoomin',label:'Gentle Zoom In',weight:8,recommended:true},{id:'fadegrays',label:'Gentle Zoom Out',weight:8,recommended:true},{id:'smoothleft',label:'Soft Slide Left',weight:5,recommended:true},{id:'smoothright',label:'Soft Slide Right',weight:5,recommended:true},{id:'smoothup',label:'Soft Slide Up',weight:2},{id:'smoothdown',label:'Soft Slide Down',weight:2},{id:'fadeblack',label:'Fade Through Black',weight:2,recommended:true}];
const SUBTITLE_FONTS=[
  {value:'Arial',label:'Arial'},
  {value:'Calibri',label:'Calibri'},
  {value:'Times New Roman',label:'Times New Roman'},
  {value:'Segoe UI',label:'Segoe UI'},
  {value:'Tahoma',label:'Tahoma'},
  {value:'Verdana',label:'Verdana'},
  {value:'Georgia',label:'Georgia'},
  {value:'Impact',label:'Impact'},
  {value:'Trebuchet MS',label:'Trebuchet MS'},
  {value:'Montserrat',label:'Montserrat'},
  {value:'Roboto',label:'Roboto'},
  {value:'Poppins',label:'Poppins'}
];
const GREEN_KEY_PRESETS=['0x3DAB47','0x0CF404','0x55B757','0x04AC3C','0x4C9C4C'];
const MIN_SUBTITLE_BOX_WIDTH_PERCENT=25;
const SUBTITLE_EXPORT_FONT_SCALE=1;
const SUBTITLE_EXPORT_BOX_SCALE=1;
const STANDARD_CANVAS_WIDTH=1920;
const STANDARD_CANVAS_HEIGHT=1080;
const SUBTITLE_TEMPLATE_SAMPLE='He returned home smelling of machine oil.';
const SUBTITLE_STYLE_PRESETS={
  simple:{label:'Subtitle thường',stylePreset:'simple',renderer:'canvas',fontFamily:'Arial',fontWeight:400,fontSize:32,color:'#FFFFFF',outlineColor:'#000000',outlineWidth:0,bottomMargin:20,maxWidthPercent:96,lineHeight:1.2,letterSpacingEm:0,shadow:0,bold:false,uppercase:false}
};
function subtitlePresetKey(){return'simple';}
function subtitleFontValue(value){
  const font=String(value||'Arial').trim();
  if(!font)return'Arial';
  return font.replace(/['"\\]/g,'').trim()||'Arial';
}
function applySubtitlePreset(sub={},presetKey='simple'){const preset=SUBTITLE_STYLE_PRESETS.simple;return{...preset,...sub,stylePreset:'simple',renderer:'canvas',karaoke:false,fontFamily:subtitleFontValue(sub.fontFamily||preset.fontFamily),fontWeight:sub.bold===true?700:400,fontSize:Number.isFinite(Number(sub.fontSize))?Number(sub.fontSize):preset.fontSize,color:String(sub.color||preset.color||'#FFFFFF'),outlineColor:String(sub.outlineColor||preset.outlineColor||'#000000'),outlineWidth:Number.isFinite(Number(sub.outlineWidth))?Number(sub.outlineWidth):preset.outlineWidth,bottomMargin:Number.isFinite(Number(sub.bottomMargin))?Number(sub.bottomMargin):preset.bottomMargin,maxWidthPercent:Number.isFinite(Number(sub.maxWidthPercent))?Number(sub.maxWidthPercent):preset.maxWidthPercent,lineHeight:Number.isFinite(Number(sub.lineHeight))?Number(sub.lineHeight):preset.lineHeight,letterSpacingEm:0,shadow:0,bold:sub.bold===true,uppercase:sub.uppercase===true};}
function subtitleOutlineShadow(outline,color='#000000',fallback='0 1px 2px rgba(0,0,0,.85)'){const px=Math.max(0,Number(outline)||0),c=String(color||'#000000');return px?`${-px}px ${-px}px ${c},${px}px ${-px}px ${c},${-px}px ${px}px ${c},${px}px ${px}px ${c},0 ${px}px ${c},${px}px 0 ${c},0 ${-px}px ${c},${-px}px 0 ${c}`:fallback;}
function registerBundledFonts(){return;}
function standardCanvas(canvas={}){return{...(canvas||{}),width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT};}
function standardProject(project){return project?{...project,width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT}:project;}
function standardizeLayerTransforms(layers=[],sourceCanvas={}){const sx=STANDARD_CANVAS_WIDTH/Math.max(1,Number(sourceCanvas.width||STANDARD_CANVAS_WIDTH)),sy=STANDARD_CANVAS_HEIGHT/Math.max(1,Number(sourceCanvas.height||STANDARD_CANVAS_HEIGHT));return layers.map(layer=>{const t=layer.transform||{};return{...layer,transform:{...t,x:Number(t.x||0)*sx,y:Number(t.y||0)*sy,width:Number(t.width||0)*sx,height:Number(t.height||0)*sy}};});}
function lockStandardCanvasInputs(){for(const id of ['projectWidth','projectHeight','tplWidth','tplHeight','singleWidth','singleHeight','batchWidth','batchHeight']){const el=$(id);if(!el)continue;el.value=id.toLowerCase().includes('height')?STANDARD_CANVAS_HEIGHT:STANDARD_CANVAS_WIDTH;el.readOnly=true;el.title='Canvas chuẩn 1080p: 1920 × 1080';}}
function ensureDisclaimerControls(){for(const [prefix,outputId] of [['single','singleOutputFolder'],['batch','outputFolder']]){const id=`${prefix}Disclaimer`;if($(id))continue;const output=$(outputId),anchor=output?.closest('label');if(!anchor)continue;const assetId=`${prefix}DisclaimerAsset`,assetLabel=document.createElement('label');assetLabel.innerHTML=`Video Disclaimer<select id="${assetId}"><option value="">Không chọn disclaimer</option></select>`;const label=document.createElement('label');label.className='check';label.title='Chọn video Disclaimer từ Kho tài nguyên dùng chung.';const input=document.createElement('input');input.id=id;input.type='checkbox';const savedChecked=localStorage.getItem('vbs.'+id);input.checked=savedChecked!==null?savedChecked==='true':(prefix==='batch');label.append(input,document.createTextNode(' Chạy Disclaimer đầu video'));anchor.after(assetLabel);anchor.after(label);const syncDis=()=>{assetLabel.hidden=!input.checked;try{localStorage.setItem('vbs.'+id,String(input.checked));}catch{}const sel=$(assetId);if(input.checked&&sel&&!sel.value){const firstDis=disclaimerAssets()[0];if(firstDis){sel.value=firstDis.id;try{localStorage.setItem('vbs.'+assetId,firstDis.id);}catch{}}}if(prefix==='batch'&&typeof syncBatchConfigToBridge==='function'){setTimeout(()=>syncBatchConfigToBridge({silent:true}),100);}};input.addEventListener('change',syncDis);$(assetId)?.addEventListener('change',()=>{try{localStorage.setItem('vbs.'+assetId,$(assetId).value||'');}catch{}if(prefix==='batch'&&typeof syncBatchConfigToBridge==='function'){setTimeout(()=>syncBatchConfigToBridge({silent:true}),100);}});assetLabel.hidden=!input.checked;}}
function ensureJobAssetControls(){
  const mediaFilters=[{name:'Video',extensions:['mp4','mov','mkv','webm','avi','m4v']}];
  const addInput=(id,anchorId,placeholder,buttonId,title)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`${title}<div class="path"><input id="${id}" placeholder="${placeholder}"><button id="${buttonId}">...</button></div>`;anchor.after(label);$(buttonId).onclick=async()=>{const p=await api.chooseFile({title,filters:mediaFilters});if(p)$(id).value=p;};};
  const addFolder=(id,anchorId,placeholder,title)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`${title}<div class="path"><input id="${id}" placeholder="${placeholder}"><button data-pick-dir="${id}">...</button></div>`;anchor.after(label);};
  const addMode=(id,anchorId)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`Loại tài nguyên<select id="${id}"><option value="GREEN" selected>Ảnh green, tách nền</option><option value="IMAGE">Ảnh thường, ghép nguyên ảnh</option></select>`;anchor.after(label);};
  const addIntroOptions=(prefix,anchorId)=>{if($(`${prefix}JobIntroAudioMode`))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const audio=document.createElement('label');audio.innerHTML=`Audio intro<select id="${prefix}JobIntroAudioMode"><option value="MUTE" selected>Tắt tiếng intro, dùng voice kịch bản</option><option value="KEEP">Giữ tiếng video intro</option></select>`;anchor.after(audio);};
  addInput('singleJobIntro','singleJobGreen','Chọn 1 clip hoặc dùng folder bên dưới','pickSingleJobIntro','Video intro sau Disclaimer (single)');
  addFolder('singleJobIntroFolder','singleJobIntro','Ví dụ TEST_1.mp4, TEST_2.mp4','Folder intro theo voice cho Single');
  addIntroOptions('single','singleJobIntroFolder');
  addMode('singleJobGreenMode','singleJobGreen');
  addFolder('jobIntroFolder','batchSrtLanguage','Chứa video intro cùng tên voice (ví dụ TEST.mp4)','Folder video intro (cùng tên voice)');
  addIntroOptions('batch','jobIntroFolder');
}
function ensureProjectImageControls(){
  const imageFilters=[{name:'Image / Green Media',extensions:['png','jpg','jpeg','webp','bmp','mp4','mov','mkv','webm']}];
  const addInput=(id,anchorId,placeholder,buttonId,title)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`${title}<div class="path"><input id="${id}" placeholder="${placeholder}"><button id="${buttonId}">...</button></div>`;anchor.after(label);$(buttonId).onclick=async()=>{const p=await api.chooseFile({title,filters:imageFilters});if(p){$(id).value=p;renderEditor();}};};
  const addFolder=(id,anchorId,placeholder,title)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`${title}<div class="path" style="grid-template-columns:1fr auto auto;"><input id="${id}" placeholder="${placeholder}"><button data-pick-dir="${id}" title="Chọn thư mục chứa ảnh/green theo tên kịch bản">...</button><button id="btnQuickScanProjectImages" type="button" style="white-space:nowrap;font-size:11px;padding:4px 10px;background:rgba(0,255,136,0.14);color:#00ff88;border:1px solid rgba(0,255,136,0.45);border-radius:5px;cursor:pointer;font-weight:700;" title="Quét toàn bộ ảnh/phông xanh trong Folder và hiển thị danh sách để chỉnh sửa trên Preview đồng nhất với Template">🔍 Quét ảnh</button></div>`;anchor.after(label);};
  const addProjectImgMode=(id,anchorId)=>{if($(id))return;const anchor=$(anchorId)?.closest('label');if(!anchor)return;const label=document.createElement('label');label.innerHTML=`Chế độ Ảnh theo voice (Gắn riêng từng video)<select id="${id}"><option value="IMAGE" selected>🖼️ Ảnh thường / Ảnh PNG đã tách nền sẵn (Trong suốt)</option><option value="GREEN">🟢 Ảnh / Video Phông Xanh — Tự động tách nền (Chroma Key)</option></select>`;anchor.after(label);};
  addInput('singleProjectImage','singleTemplate','Chọn ảnh/green cho layer Ảnh theo voice','pickSingleProjectImage','Ảnh Project cho Single');
  addProjectImgMode('singleProjectImageMode','singleProjectImage');
  addFolder('projectImageFolder','batchTemplate','Ảnh/Green cùng tên mã kịch bản (VD: 001.png, 77-HOME-12.png), để trống nếu không dùng','Folder ảnh Project theo voice cho Batch');
  addProjectImgMode('projectImageMode','projectImageFolder');
  if(!$('projectImageFolderPanel')){
    const modeAnchor=$('projectImageMode')?.closest('label');
    if(modeAnchor){
      const panel=document.createElement('div');
      panel.id='projectImageFolderPanel';
      panel.style.cssText='grid-column:1 / -1;background:#090b10;border:1px solid #1e2631;border-radius:8px;padding:10px 12px;margin:2px 0 6px 0;';
      panel.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="color:#00ff88;font-size:12px;font-family:'Space Grotesk',sans-serif;">📂 Danh Sách Ảnh / Phông Xanh Trong Folder</strong>
            <span id="projectImageFolderCountBadge" style="font-size:10.5px;padding:2px 8px;border-radius:4px;background:#131820;color:#00ff88;border:1px solid rgba(0,255,136,0.35);font-family:'JetBrains Mono',monospace;">Chưa quét</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button type="button" id="btnScanFolderImagesNow" style="font-size:11px;padding:4px 10px;background:#131820;color:#e6edf3;border:1px solid #262f3d;border-radius:5px;cursor:pointer;">🔄 Làm mới danh sách</button>
            <button type="button" id="btnResetAllFolderImagesToTemplate" style="font-size:11px;padding:4px 10px;background:#131820;color:#8b949e;border:1px solid #262f3d;border-radius:5px;cursor:pointer;" title="Đưa tất cả ảnh về lại khung mặc định của Template">📐 Đồng bộ tất cả theo Template</button>
          </div>
        </div>
        <div id="projectImageFolderListWrap" style="max-height:230px;overflow-y:auto;border:1px solid #1e2631;border-radius:6px;background:#0d1117;">
          <div style="padding:12px;text-align:center;color:#8b949e;font-size:12px;">Hãy chọn <strong>Folder ảnh Project theo voice cho Batch</strong> hoặc bấm <strong>🔍 Quét ảnh</strong> để liệt kê toàn bộ ảnh và bấm <strong>Chỉnh sửa</strong> trên Preview Template.</div>
        </div>
      `;
      modeAnchor.after(panel);
    }
  }
  const triggerScanFolder=async({pickIfEmpty=false}={})=>{
    let dir=$('projectImageFolder')?.value?.trim()||'';
    if(!dir&&pickIfEmpty){
      const picked=await api.chooseDirectory({title:'Chọn thư mục chứa ảnh / phông xanh theo kịch bản'});
      if(picked&&$('projectImageFolder')){
        $('projectImageFolder').value=picked;
        try{localStorage.setItem('vbs.projectImageFolder',picked);}catch{}
        dir=picked;
      }
    }
    await scanAndRenderProjectImageFolderList(dir);
  };
  if($('btnQuickScanProjectImages'))$('btnQuickScanProjectImages').onclick=()=>triggerScanFolder({pickIfEmpty:true});
  if($('btnScanFolderImagesNow'))$('btnScanFolderImagesNow').onclick=()=>triggerScanFolder({pickIfEmpty:true});
  if($('btnResetAllFolderImagesToTemplate'))$('btnResetAllFolderImagesToTemplate').onclick=()=>{
    if(!Object.keys(state.jobGreenConfigs||{}).length)return toast('Tất cả ảnh đang dùng khung chuẩn của Template.');
    if(!confirm('Đưa toàn bộ ảnh về lại vị trí & kích thước chuẩn của Template hiện tại?'))return;
    state.jobGreenConfigs={};
    saveJobGreenConfigsToStorage();
    renderProjectImageFolderList(state.scannedFolderImages||[]);
    if(state.scanJobs?.length)renderBatchJobs(state.scanJobs);
    toast('Đã đồng bộ toàn bộ ảnh theo khung chuẩn của Template.');
  };
  $('projectImageFolder')?.addEventListener('change',()=>{
    try{localStorage.setItem('vbs.projectImageFolder',$('projectImageFolder')?.value?.trim()||'');}catch{}
    triggerScanFolder({pickIfEmpty:false});
  });
  $('projectImageMode')?.addEventListener('change',()=>{
    try{localStorage.setItem('vbs.projectImageMode',$('projectImageMode')?.value||'IMAGE');}catch{}
    renderProjectImageFolderList(state.scannedFolderImages||[]);
    renderEditor();
  });
  try{
    const savedImgFolder=localStorage.getItem('vbs.projectImageFolder');
    if(savedImgFolder&&$('projectImageFolder')&&!$('projectImageFolder').value)$('projectImageFolder').value=savedImgFolder;
    const savedImgMode=localStorage.getItem('vbs.projectImageMode');
    if(savedImgMode&&$('projectImageMode'))$('projectImageMode').value=savedImgMode;
  }catch{}
}
function ensureLayerGreenLibraryControls(){
  if($('layerDefaultGreen'))return;
  const anchor=$('layerSource')?.closest('label');
  if(!anchor)return;
  const label=document.createElement('label');
  label.id='layerDefaultGreenRow';
  label.hidden=true;
  label.innerHTML='Green trong kho chung<div class="path"><select id="layerDefaultGreen"></select><button id="applyLayerDefaultGreen">Chọn</button></div>';
  anchor.after(label);
  const applySelectedGreen=async()=>{
    const source=$('layerDefaultGreen')?.value||'';
    if(!source||!state.selectedLayer)return;
    applyLayerSourceTypeFromPath(state.selectedLayer,source);
    await setLayerSource(state.selectedLayer,source);
    toast(`Đã chọn phông xanh từ Kho_Green: ${(String(source).split(/[\\/]/).pop()||source)}`);
  };
  $('applyLayerDefaultGreen').onclick=applySelectedGreen;
  $('layerDefaultGreen').onchange=applySelectedGreen;
}
function applyLayerSourceTypeFromPath(layer,source){
  if(!isGreenscreenLayer(layer?.type))return;
  const ext=String(source||'').split('.').pop().toLowerCase();
  if(['mp4','mov','mkv','webm','avi','m4v'].includes(ext))layer.type='GREENSCREEN_VIDEO';
  if(['png','jpg','jpeg','webp','bmp'].includes(ext))layer.type='GREENSCREEN_IMAGE';
}
function ensureVoiceImageLayerButton(){
  const existing=document.querySelector('.editor-tools .tool-grid [data-add-layer="VOICE_IMAGE"]');
  if(existing)existing.remove();
}
function loadDefaultFolderImageTransform(){
  try{
    const saved=JSON.parse(localStorage.getItem('vbs.defaultFolderImageTransform')||'null');
    if(saved&&typeof saved==='object'){
      return{
        x:Number.isFinite(Number(saved.x))?Math.round(Number(saved.x)):80,
        y:Number.isFinite(Number(saved.y))?Math.round(Number(saved.y)):140,
        width:Number.isFinite(Number(saved.width))&&Number(saved.width)>0?Math.round(Number(saved.width)):620,
        height:Number.isFinite(Number(saved.height))&&Number(saved.height)>0?Math.round(Number(saved.height)):800,
        rotation:Number.isFinite(Number(saved.rotation))?Number(saved.rotation):0,
        opacity:Number.isFinite(Number(saved.opacity))?Number(saved.opacity):1,
        keyColor:saved.keyColor||GREEN_KEY_PRESETS[0],
        keyColors:Array.isArray(saved.keyColors)&&saved.keyColors.length?saved.keyColors:GREEN_KEY_PRESETS,
        similarity:Number.isFinite(Number(saved.similarity))?Number(saved.similarity):.22,
        softness:Number.isFinite(Number(saved.softness))?Number(saved.softness):.07,
        despillMix:Number.isFinite(Number(saved.despillMix))?Number(saved.despillMix):.45,
        despillExpand:Number.isFinite(Number(saved.despillExpand))?Number(saved.despillExpand):.02
      };
    }
  }catch{}
  return{x:80,y:140,width:620,height:800,rotation:0,opacity:1,keyColor:GREEN_KEY_PRESETS[0],keyColors:GREEN_KEY_PRESETS,similarity:.22,softness:.07,despillMix:.45,despillExpand:.02};
}
function saveDefaultFolderImageTransform(cfg={}){
  const cur=loadDefaultFolderImageTransform();
  const next={
    ...cur,
    x:Math.round(Number(cfg.x??cur.x??80)),
    y:Math.round(Number(cfg.y??cur.y??140)),
    width:Math.max(30,Math.round(Number(cfg.width??cur.width??620))),
    height:Math.max(30,Math.round(Number(cfg.height??cur.height??800))),
    rotation:Number(cfg.rotation??cur.rotation??0),
    opacity:Number(cfg.opacity??cur.opacity??1),
    keyColor:cfg.keyColor||cur.keyColor||GREEN_KEY_PRESETS[0],
    keyColors:Array.isArray(cfg.keyColors)&&cfg.keyColors.length?cfg.keyColors:cur.keyColors,
    similarity:Number(cfg.similarity??cur.similarity??.22),
    softness:Number(cfg.softness??cur.softness??.07),
    despillMix:Number(cfg.despillMix??cur.despillMix??.45),
    despillExpand:Number(cfg.despillExpand??cur.despillExpand??.02)
  };
  try{localStorage.setItem('vbs.defaultFolderImageTransform',JSON.stringify(next));}catch{}
  return next;
}
function selectedJobGreenMode(single=false){return String($(`${single?'single':'batch'}JobGreenMode`)?.value||'GREEN').toUpperCase()==='IMAGE'?'IMAGE':'GREEN';}
function selectedJobGreenSource(single=false){if(single)return $('singleJobGreen')?.value?'FILE':'NONE';return'NONE';}
function selectedDefaultGreenPath(){return'';}
function projectGreenAssets(){return(state.projectAssets||[]).filter(a=>['GREEN_VIDEO','GREEN_IMAGE'].includes(String(a.asset_type||a.assetType||'').toUpperCase()));}
function disclaimerAssets(){return(state.projectAssets||[]).filter(a=>String(a.asset_type||a.assetType||'').toUpperCase()==='DISCLAIMER_VIDEO');}
function populateProjectAssetSelects(){const green=projectGreenAssets(),greenHtml=green.map(a=>`<option value="${a.file_path}">${htmlEscape(a.name||a.file_name)}</option>`).join(''),greenEmpty='<option value="">Chưa có green trong kho chung</option>';const layer=$('layerDefaultGreen');if(layer)layer.innerHTML=greenHtml||greenEmpty;const dis=disclaimerAssets(),disHtml='<option value="">Không chọn disclaimer</option>'+dis.map(a=>`<option value="${a.id}">${htmlEscape(a.name||a.file_name)}</option>`).join('');for(const [prefix,id] of [['single','singleDisclaimerAsset'],['batch','batchDisclaimerAsset']]){const el=$(id);if(!el)continue;const prev=el.value||localStorage.getItem('vbs.'+id)||'';el.innerHTML=disHtml;if(prev&&dis.some(a=>a.id===prev)){el.value=prev;}else if($(`${prefix}Disclaimer`)?.checked&&dis[0]){el.value=dis[0].id;try{localStorage.setItem('vbs.'+id,dis[0].id);}catch{}}}}
function populateDefaultGreenSelects(){populateProjectAssetSelects();}
function updateGreenSourceVisibility(){const modeLabel=$('singleJobGreenMode')?.closest('label');if(modeLabel)modeLabel.hidden=!Boolean($('singleJobGreen')?.value);}
function selectedDisclaimerAsset(prefix){const id=$(`${prefix}DisclaimerAsset`)?.value||'';return(state.projectAssets||[]).find(a=>a.id===id)||null;}
function applyDisclaimerSelection(config,mode='batch'){if(config){const isSingle=mode==='single';const prefix=mode;const source=selectedJobGreenSource(isSingle);const asset=selectedDisclaimerAsset(prefix);const enabled=Boolean($(`${prefix}Disclaimer`)?.checked);config.disclaimerAssetId=asset?.id||'';config.disclaimerPath=enabled&&asset?asset.file_path:'';config.disclaimerEnabled=Boolean(config.disclaimerPath);config.disclaimerType='';config.jobIntroFolder=isSingle?'':($('jobIntroFolder')?.value||'');config.batchJobIntroPath=isSingle?'':($(`${prefix}JobIntro`)?.value||'');config.singleJobIntroFolder=isSingle?($('singleJobIntroFolder')?.value||''):'';config.singleJobIntroPath=isSingle?($('singleJobIntro')?.value||''):'';config.jobIntroAudioMode=String($(`${prefix}JobIntroAudioMode`)?.value||'MUTE');config.jobIntroTransition='NONE';config.jobIntroTransitionMs=0;config.jobIntroNoiseOverlay=false;config.jobGreenMode=selectedJobGreenMode(isSingle);config.defaultJobGreenPath='';config.singleJobGreenPath=isSingle&&source==='FILE'?($('singleJobGreen')?.value||''):'';config.jobGreenFolder='';config.enableJobGreenLayer=Boolean(isSingle&&config.singleJobGreenPath);config.requireJobGreenAsset=config.enableJobGreenLayer;config.projectImageFolder=$('projectImageFolder')?.value||'';config.singleProjectImagePath=$('singleProjectImage')?.value||'';config.projectImageMode=String($(isSingle?'singleProjectImageMode':'projectImageMode')?.value||'IMAGE').toUpperCase()==='GREEN'?'GREEN':'IMAGE';config.jobGreenConfigs=state.jobGreenConfigs||{};config.defaultFolderImageTransform=loadDefaultFolderImageTransform();}return config;}
function activeRenderTemplateId(prefix){return $(prefix==='single'?'singleTemplate':'batchTemplate')?.value||'';}
function subtitlePreviewStorageKey(prefix,templateId=''){return`vbs.${prefix}SubtitlePreview${templateId?`.${templateId}`:''}`;}
function loadSubtitlePreview(prefix,templateId=''){try{return JSON.parse(localStorage.getItem(subtitlePreviewStorageKey(prefix,templateId))||'{}')||{};}catch{return{};}}
async function loadSubtitlePreviewState(prefix,templateSubtitle={},templateId=activeRenderTemplateId(prefix)){
  const key=`${prefix}SubtitlePreview`;
  let saved=loadSubtitlePreview(prefix,templateId);
  try{const dbSaved=await api.getSetting?.(subtitlePreviewStorageKey(prefix,templateId),null);if(dbSaved&&typeof dbSaved==='object')saved={...saved,...dbSaved};}catch{}
  state[key]={...(templateSubtitle||{}),...saved,assScale:1};
  try{localStorage.setItem(subtitlePreviewStorageKey(prefix,templateId),JSON.stringify(state[key]));}catch{}
  return state[key];
}
function saveSubtitlePreview(prefix,value,{persistTemplate=true}={}){
  const key=`${prefix}SubtitlePreview`,templateId=activeRenderTemplateId(prefix),preview={...(value||{})};
  state[key]={...(state[key]||{}),...preview,assScale:1};
  try{localStorage.setItem(subtitlePreviewStorageKey(prefix,templateId),JSON.stringify(state[key]));}catch{}
  try{const persist=api.setSetting?.(subtitlePreviewStorageKey(prefix,templateId),state[key]);persist?.catch?.(()=>{});}catch{}
  applyRenderTemplateControls(prefix).catch(()=>{});
  if(state.selectedTemplate&&state.editor&&state.selectedTemplate.id===templateId){
    state.editor={...(state.editor||defaultTemplate()),subtitle:{...((state.editor&&state.editor.subtitle)||{}),...preview,assScale:1}};
    syncTemplateControls();
    renderEditor();
    if(persistTemplate){
      try{
        const saved=api.templates?.save?.(templateId,{name:state.editor.name||state.selectedTemplate.name,description:state.editor.description||'',config:state.editor},'Subtitle preview saved');
        saved?.catch?.(()=>{});
      }catch{}
    }
  }
}
function loadBatchSubtitlePreview(){return loadSubtitlePreview('batch');}
function loadSingleSubtitlePreview(){return loadSubtitlePreview('single');}
function saveBatchSubtitlePreview(value){saveSubtitlePreview('batch',value);}
function saveSingleSubtitlePreview(value){saveSubtitlePreview('single',value);}
function loadSavedJobGreenConfigs(){try{return JSON.parse(localStorage.getItem('vbs.jobGreenConfigs')||'{}')||{};}catch{return{};}}
function saveJobGreenConfigsToStorage(){try{localStorage.setItem('vbs.jobGreenConfigs',JSON.stringify(state.jobGreenConfigs||{}));}catch{}if(typeof syncBatchConfigToBridge==='function'){setTimeout(()=>syncBatchConfigToBridge({silent:true}),100);}}
const state={projects:[],templates:[],libraries:[],batches:[],projectAssets:[],selectedProject:null,selectedTemplate:null,editor:null,selectedLayer:null,selectedLibrary:null,selectedBatch:null,selectedProjectAsset:null,creatingProject:false,scanJobs:[],singleScanJobs:[],jobGreenConfigs:loadSavedJobGreenConfigs(),jobTimings:{},batchSubtitlePreview:loadBatchSubtitlePreview(),singleSubtitlePreview:loadSingleSubtitlePreview(),activeRenderMode:'batch',running:false,storyVideoRows:[],runningStoryVideo:false,licenseValid:false,workspaceLoaded:false,previewCache:new Map(),previewPending:new Set(),effectPreviewCache:new Map(),effectPreviewPending:new Set(),systemHealth:null,appInfo:null,defaultAssets:{green:[],backgrounds:[]}};
async function hydrateSubtitlePreviewSettings(){for(const prefix of ['batch','single']){try{const saved=await api.getSetting?.(subtitlePreviewStorageKey(prefix),null);if(saved&&typeof saved==='object'){const key=`${prefix}SubtitlePreview`;state[key]={...(state[key]||{}),...saved};try{localStorage.setItem(subtitlePreviewStorageKey(prefix),JSON.stringify(state[key]));}catch{}}}catch{}}}
let _isWindowClosing = false;
window.addEventListener('beforeunload', () => { _isWindowClosing = true; });
function toast(message,error=false){if(_isWindowClosing && error)return;const el=$('toast');if(!el)return;el.textContent=message;el.className=`toast show${error?' error':''}`;setTimeout(()=>el.className='toast',3200);}
function formatDuration(ms){const s=Math.max(0,Math.round(Number(ms||0)/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return[h,m,x].map(v=>String(v).padStart(2,'0')).join(':');}
const JOB_TIMER_START_STATUSES=new Set(['VALIDATING','PREPARING','PENDING','RENDERING','VERIFYING','RETRYING']);
const JOB_TIMER_END_STATUSES=new Set(['COMPLETED','FAILED','CANCELLED','SKIPPED','INTERRUPTED']);
function jobDisplayName(job={}){return job.voiceName||job.voice_name||(job.voicePath||job.voice_path||'').split(/[\\/]/).pop()||'';}
function jobTimingKey(job={}){return job.jobId||job.id||job.job_id||jobDisplayName(job);}
function resetJobTimings(){state.jobTimings={};}
function updateJobTimingFromEvent(event={},job=event){const key=jobTimingKey({...job,...event});if(!key)return;const status=String(event.status||job.status||'');const now=Date.now();const current=state.jobTimings[key]||{};if(JOB_TIMER_START_STATUSES.has(status)&&!current.startedAt)current.startedAt=now;if(JOB_TIMER_END_STATUSES.has(status)){if(!current.startedAt)current.startedAt=Number(job.started_at||job.startedAt||now);current.completedAt=now;}state.jobTimings[key]=current;}
function jobElapsedMs(job={}){const started=Number(job.started_at||job.startedAt||0),completed=Number(job.completed_at||job.completedAt||0);if(started&&completed)return Math.max(0,completed-started);const key=jobTimingKey(job),timing=state.jobTimings[key];if(!timing?.startedAt)return null;return Math.max(0,(timing.completedAt||Date.now())-timing.startedAt);}
function formatJobElapsed(job={}){const elapsed=jobElapsedMs(job);return Number.isFinite(elapsed)?formatDuration(elapsed):'—';}
function formatBytes(n){if(!Number.isFinite(Number(n)))return'—';const units=['B','KB','MB','GB','TB'];let v=Number(n),i=0;while(v>=1000&&i<units.length-1){v/=1000;i++;}return`${v.toFixed(i?1:0)} ${units[i]}`;}
function formatGpuStats(gpu){if(!gpu)return'';const enc=Number(gpu.encoderUtilizationPercent||0),core=Number(gpu.utilizationPercent||0),used=Number(gpu.memoryUsedMb||0),total=Number(gpu.memoryTotalMb||0);return` · GPU Enc ${enc}% · GPU ${core}%${total?` · VRAM ${used}/${total} MB`:''}`;}
function fileUrl(p){return p?encodeURI(`file:///${String(p).replace(/\\/g,'/').replace(/^\//,'')}`):'';}
function showModal(title,html){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').hidden=false;}
function closeModal(){$('modal').hidden=true;document.querySelector('.modal-card')?.classList.remove('green-modal-card','subtitle-preview-modal');}
function requestText(title,label,defaultValue=''){return new Promise(resolve=>{showModal(title,`<div class="form"><label>${htmlEscape(label)}<input id="modalTextInput" value="${htmlEscape(defaultValue)}"></label><div class="actions"><button id="modalTextCancel">Hủy</button><button id="modalTextOk" class="primary">OK</button></div></div>`);const input=$('modalTextInput'),done=(value)=>{closeModal();resolve(value);};$('modalTextCancel').onclick=()=>done(null);$('modalTextOk').onclick=()=>done((input.value||'').trim());input.onkeydown=(event)=>{if(event.key==='Enter')done((input.value||'').trim());if(event.key==='Escape')done(null);};input.focus();input.select();});}
function log(message){const target=state.activeRenderMode==='single'&&$('singleRenderLog')?$('singleRenderLog'):$('renderLog');target.textContent+=`[${new Date().toLocaleTimeString()}] ${message}\n`;target.scrollTop=target.scrollHeight;}
function validateRenderConfig(config,{single=false,mode=null}={}){const actualMode=mode||(single?'single':'batch');config=applyDisclaimerSelection(config,actualMode);const errors=[];const prefix=actualMode;const isVoiceOnly=!single&&config?.voiceSourceMode==='ONLY_RENDER_VOICE';if(!config)errors.push('Không tìm thấy cấu hình render.');if(single&&!config?.singleVoicePath)errors.push('Chưa chọn file voice MP3/WAV.');if(!single&&!config?.voiceFolder)errors.push('Chưa chọn thư mục voice / kịch bản.');if(Boolean($(`${prefix}Disclaimer`)?.checked)&&!config?.disclaimerPath)errors.push('Chưa chọn video Disclaimer trong kho chung.');if(!config?.outputFolder&&!isVoiceOnly)errors.push('Chưa chọn thư mục output.');if(!Number.isFinite(Number(config?.width))||Number(config.width)<=0)errors.push('Width không hợp lệ.');if(!Number.isFinite(Number(config?.height))||Number(config.height)<=0)errors.push('Height không hợp lệ.');if(!Number.isFinite(Number(config?.fps))||Number(config.fps)<=0)errors.push('FPS không hợp lệ.');if(!isVoiceOnly){if(config?.backgroundMode==='SINGLE_STOCK'&&!config?.singleStockPath)errors.push('Chưa chọn stock đã cắt sẵn.');if(['STOCK_VIDEO','STORY_PIP_STOCK'].includes(config?.backgroundMode)&&!config?.mediaFolder&&!config?.libraryId)errors.push('Chưa chọn kho stock.');if(config?.backgroundMode==='IMAGE_SEQUENCE'&&!config?.mediaFolder&&!config?.libraryId)errors.push('Chưa chọn thư mục ảnh.');if(config?.backgroundMode==='MANUAL_MEDIA'&&!config?.manualMediaPath)errors.push('Chưa chọn media cố định.');}if(config?.subtitle&&(!Number.isFinite(Number(config.subtitle.fontSize))||Number(config.subtitle.fontSize)<=0))errors.push('Size subtitle không hợp lệ.');if(errors.length){const error=new Error(errors.join('\n'));error.code='INVALID_RENDER_CONFIG';error.errors=errors;throw error;}return{valid:true,errors:[]};}
function validateBatch(config){return validateRenderConfig(config,{single:false});}
function ensureBackgroundModeExportControls(prefix){
  const label=(id)=>$(id)?.closest('label');
  const imageSecondsId=prefix==='single'?'singleImageSeconds':'imageSeconds';
  const allowFlipId=prefix==='single'?'singleAllowFlip':'allowFlip';
  const selectionModeId=prefix==='single'?'singleSelectionMode':'selectionMode';
  const transition=$(`${prefix}Transitions`);
  const transitionTitle=transition?.previousElementSibling?.tagName==='H3'?transition.previousElementSibling:null;
  const transitionOptions=transition?.nextElementSibling?.classList?.contains('form')?transition.nextElementSibling:null;
  const rows=[
    [label(imageSecondsId),'image'],
    [label(allowFlipId),'image'],
    [transitionTitle,'image'],
    [transition,'image'],
    [transitionOptions,'image'],
    [label(selectionModeId),'stock-or-image']
  ];
  for(const [el,kind] of rows){if(el){el.dataset.backgroundControl=kind;el.dataset.backgroundPrefix=prefix;}}
}
function updateBackgroundModeExportVisibility(prefix,mode){
  ensureBackgroundModeExportControls(prefix);
  const isImage=mode==='IMAGE_SEQUENCE',isStock=['STOCK_VIDEO','STORY_PIP_STOCK'].includes(mode);
  document.querySelectorAll(`[data-background-prefix="${prefix}"]`).forEach(el=>{
    const kind=el.dataset.backgroundControl;
    el.hidden=kind==='image'?!isImage:!(isImage||isStock);
  });
  const selectionLabel=labelForSelection(prefix);
  if(selectionLabel)selectionLabel.firstChild.textContent=isImage?'Chọn ảnh':'Chọn stock';
}
function labelForSelection(prefix){return $(prefix==='single'?'singleSelectionMode':'selectionMode')?.closest('label')||null;}
function updateSingleSourceVisibility(){const mode=$('singleBackgroundMode')?.value;const show=(id,value)=>{const el=$(id);if(el)el.hidden=!value;};show('singleStockFileRow',mode==='SINGLE_STOCK');show('singleLibraryRow',['STOCK_VIDEO','IMAGE_SEQUENCE'].includes(mode));show('singleMediaFolderRow',['STOCK_VIDEO','IMAGE_SEQUENCE'].includes(mode));show('singleUsedFolderRow',['STOCK_VIDEO','SINGLE_STOCK'].includes(mode));show('singleManualMediaRow',mode==='MANUAL_MEDIA');updateBackgroundModeExportVisibility('single',mode);}
function updateBatchSourceVisibility(){const mode=$('backgroundMode')?.value;const show=(id,value)=>{const el=$(id);if(el)el.hidden=!value;};show('batchLibraryRow',['STOCK_VIDEO','IMAGE_SEQUENCE','STORY_PIP_STOCK'].includes(mode));show('batchMediaFolderRow',['STOCK_VIDEO','IMAGE_SEQUENCE','STORY_PIP_STOCK'].includes(mode));show('batchManualMediaRow',mode==='MANUAL_MEDIA');updateBackgroundModeExportVisibility('batch',mode);}
function templateSubtitleConfig(prefix){const id=$(prefix==='single'?'singleTemplate':'batchTemplate')?.value||state.selectedTemplate?.id||'',selected=state.templates.find(t=>t.id===id)||state.selectedTemplate||null,base=(selected?.config?.subtitle||selected?.subtitle||state.editor?.subtitle||defaultTemplate().subtitle||{});return normalizeSubtitleConfig(base);}
function normalizeSubtitleConfig(subtitle={}){const preset=SUBTITLE_STYLE_PRESETS.simple,effect=String(subtitle.subtitleEffect||subtitle.stylePreset||'none').toLowerCase()==='karaoke_box'?'karaoke_box':'none',boxColor=String(subtitle.karaokeBoxColor||'#7C00FF'),sub={...preset,...subtitle,subtitleEffect:effect,karaokeBoxColor:boxColor,stylePreset:effect==='karaoke_box'?'karaoke_box':'simple',renderer:effect==='karaoke_box'?'libass':'canvas'};sub.karaoke=effect==='karaoke_box';delete sub.karaokeBoxRadius;delete sub.karaokeBoxPadding;delete sub.karaokeBoxOpacity;delete sub.karaokeBoxEffect;const raw=Number(sub.outlineWidth);sub.outlineWidth=Number.isFinite(raw)?Math.max(0,raw):0;sub.outlineConfigured=true;sub.bold=sub.bold===true||Number(sub.fontWeight)>=700;sub.fontWeight=sub.bold?700:400;sub.uppercase=sub.uppercase===true;sub.fontSize=Number.isFinite(Number(sub.fontSize))?Number(sub.fontSize):Number(preset.fontSize||32);sub.letterSpacingEm=0;sub.lineHeight=Number.isFinite(Number(sub.lineHeight))?Number(sub.lineHeight):1.2;sub.maxWidthPercent=Math.max(MIN_SUBTITLE_BOX_WIDTH_PERCENT,Math.min(100,Number(sub.maxWidthPercent||96)));sub.color=String(sub.color||'#FFFFFF');sub.outlineColor=String(sub.outlineColor||'#000000');sub.fontFamily=subtitleFontValue(sub.fontFamily||preset.fontFamily);sub.shadow=0;sub.italic=false;return sub;}
function renderSubtitleOverride(prefix){const activeId=activeRenderTemplateId(prefix),live=state.selectedTemplate?.id===activeId&&state.editor?.subtitle?state.editor.subtitle:null,preview={...(live||state[`${prefix}SubtitlePreview`]||{})};if(prefix==='batch'&&$('batchSubtitleEffect')){preview.subtitleEffect=$('batchSubtitleEffect').value||'none';if($('batchKaraokeBoxColor'))preview.karaokeBoxColor=$('batchKaraokeBoxColor').value||'#7C00FF';}return normalizeSubtitleConfig({renderScale:1,exportFontScale:SUBTITLE_EXPORT_FONT_SCALE,exportBoxScale:SUBTITLE_EXPORT_BOX_SCALE,collapseLines:true,maxWidthPercent:96,maxLines:4,outlineWidth:0,...templateSubtitleConfig(prefix),...preview,assScale:1});}
function subtitleAssScale(sub){const value=Number(sub?.assScale??1);return Number.isFinite(value)&&value>0?value:1;}
function subtitlePreviewOnly(sub){return{...sub,exportScale:1,exportFontScale:1,exportBoxScale:1};}
function subtitleExportFontSize(sub){return Math.max(8,Math.round(Number(sub?.fontSize||32)*subtitleAssScale(sub)));}
function templateSubtitleSample(sub={}){const maxLines=Math.max(1,Math.round(Number(sub.maxLines||4)));const lines=SUBTITLE_TEMPLATE_SAMPLE.split('\n');if(maxLines>=lines.length)return SUBTITLE_TEMPLATE_SAMPLE;const kept=lines.slice(0,maxLines);kept[kept.length-1]=`${kept[kept.length-1]}...`;return kept.join('\n');}
function subtitlePreviewLineHeight(sub){return Math.max(1,Math.min(1.5,Number(api.preview?.subtitleLineHeight?.(sub)||1.2)));}
function previewSubtitleFontSize(sub,lineCount=1,boxHeight=0){const fit=api.preview?.subtitleFitFontSize?.(sub,{boxHeight,lineCount}) || api.preview?.subtitleFontSize?.(sub) || subtitleExportFontSize(sub);return Math.max(8,fit);}
function previewSubtitleBox(renderConfig){return api.preview?.subtitleBox?.(renderConfig) || subtitleRenderBox(renderConfig?.subtitle||renderConfig,Number(renderConfig?.width||1920),Number(renderConfig?.height||1080),1);}
function subtitleRenderBox(sub,cw,ch){return previewSubtitleBox({width:cw,height:ch,subtitle:sub});}
function populateSubtitleFontSelects(){const html=SUBTITLE_FONTS.map(f=>`<option value="${f.value}">${f.label}</option>`).join('');['singleSubtitleFont','batchSubtitleFont','tplSubtitleFont'].forEach(id=>{const el=$(id);if(el&&!el.options.length)el.innerHTML=html;});}
function populateSubtitlePresetSelects(){const el=$('tplSubtitlePreset');if(!el||el.options.length)return;el.innerHTML=Object.entries(SUBTITLE_STYLE_PRESETS).map(([value,preset])=>`<option value="${value}">${preset.label}</option>`).join('');}

function ensureSubtitlePreviewButton(prefix){return;}
function ensureBatchSubtitlePreviewButton(){ensureSubtitlePreviewButton('batch');}
function ensureSingleSubtitlePreviewButton(){ensureSubtitlePreviewButton('single');}
function hideRenderSubtitleControls(){for(const prefix of ['single','batch']){for(const suffix of ['SubtitleFont','SubtitleSize','SubtitleMargin','SubtitleOutline']){const el=$(`${prefix}${suffix}`);const label=el?.closest('label');if(label)label.hidden=true;}}}
async function subtitlePreviewSample(prefix,renderConfig){const fallback=templateSubtitleSample(renderConfig?.subtitle||{});const srtPath=prefix==='single'?($('singleSrt')?.value||state.singleScanJobs[0]?.srtPath||state.singleScanJobs[0]?.srt_path):(state.scanJobs.find(j=>j.srtPath||j.srt_path)?.srtPath||state.scanJobs.find(j=>j.srtPath||j.srt_path)?.srt_path);if(!srtPath||!api.subtitlePreview)return fallback;try{const result=await api.subtitlePreview(srtPath,renderConfig);return result?.text||fallback;}catch{return fallback;}}
async function renderSubtitleBackgroundPreview(root,prefix){if(!root)return;root.innerHTML='';try{const single=prefix==='single',mode=$(single?'singleBackgroundMode':'backgroundMode')?.value;let result=null;if(single&&mode==='SINGLE_STOCK'&&$('singleStockFile')?.value)result=await api.mediaPreview($('singleStockFile').value,{timeSeconds:.4,width:960});else if(mode==='MANUAL_MEDIA'){const p=$(single?'singleManualMedia':'manualMediaPath')?.value;if(p)result=await api.mediaPreview(p,{timeSeconds:.4,width:960});}else if(['STOCK_VIDEO','IMAGE_SEQUENCE'].includes(mode)){const folder=$(single?'singleMediaFolder':'mediaFolder')?.value;if(folder)result=await api.mediaFolderPreview?.(folder,mode==='IMAGE_SEQUENCE'?'IMAGE':'STOCK');}if(result?.previewPath){root.innerHTML=`<img src="${fileUrl(result.previewPath)}" alt="">`;}}catch{}}
async function openSubtitlePreview(prefix){const cap=prefix==='single'?'Single':'Batch',label=prefix==='single'?'một video':'batch';state.activeRenderMode=prefix;const width=Math.max(1,Number($(`${prefix}Width`)?.value||1920)),height=Math.max(1,Number($(`${prefix}Height`)?.value||1080));let sub=renderSubtitleOverride(prefix),sample=await subtitlePreviewSample(prefix,{width,height,subtitle:subtitlePreviewOnly(sub)}),cfg=subtitleRenderBox(sub,width,height);showModal(`Preview subtitle ${label}`,`<div class="subtitle-preview-wrap"><div id="${prefix}SubtitlePreviewStage" class="subtitle-preview-stage green-template-stage" style="aspect-ratio:${width}/${height}"><div id="${prefix}SubtitleBackground" class="subtitle-preview-background"></div><div id="${prefix}SubtitleTemplateLayers" class="green-template-layers"></div><div id="${prefix}SubtitlePreviewBox" class="subtitle-preview-box"><div id="${prefix}SubtitlePreviewText" class="subtitle-preview-text">${htmlEscape(sample)}</div><span class="green-resize nw" data-resize="nw"></span><span class="green-resize ne" data-resize="ne"></span><span class="green-resize sw" data-resize="sw"></span><span class="green-resize se" data-resize="se"></span></div></div><div class="form four-col compact"><label>X<input id="subPreviewX" type="number"></label><label>Y<input id="subPreviewY" type="number"></label><label>Width<input id="subPreviewW" type="number"></label><label>Height<input id="subPreviewH" type="number"></label><label>Size sub<input id="subPreviewSize" type="number" min="8"></label><label>Màu sub<input id="subPreviewColor" type="color"></label><label>Màu viền<input id="subPreviewOutlineColor" type="color"></label></div><div class="actions"><button id="subPreviewCenter">Căn giữa</button><button id="subPreviewBottom">Căn dưới bottom</button><button id="subPreviewApply" class="primary">Áp dụng</button></div><div id="subPreviewInfo" class="source-preview-info"></div></div>`);document.querySelector('.modal-card')?.classList.add('subtitle-preview-modal');const stage=$(`${prefix}SubtitlePreviewStage`),box=$(`${prefix}SubtitlePreviewBox`),text=$(`${prefix}SubtitlePreviewText`),info=$('subPreviewInfo');await renderSubtitleBackgroundPreview($(`${prefix}SubtitleBackground`),prefix);const template=await activeGreenTemplate();await renderGreenTemplatePreview($(`${prefix}SubtitleTemplateLayers`),template,{width,height});$(`${prefix}SubtitleTemplateLayers`)?.querySelectorAll('.green-subtitle-demo').forEach(el=>el.remove());let raf=0,refreshTimer=0;function sampleSub(){return{...subtitlePreviewOnly(sub),maxWidthPercent:Math.max(MIN_SUBTITLE_BOX_WIDTH_PERCENT,Math.min(100,Math.round(cfg.width/width*1000)/10)),boxWidthPercent:Math.max(MIN_SUBTITLE_BOX_WIDTH_PERCENT,Math.min(100,Math.round(cfg.width/width*1000)/10)),boxHeightPercent:Math.max(1,Math.min(60,Math.round(cfg.height/height*1000)/10))};}async function refreshText(){const next=await subtitlePreviewSample(prefix,{width,height,subtitle:sampleSub()});sample=next;text.textContent=sample;cfg=clampCfg(cfg);}function scheduleTextRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>refreshText().catch(()=>{}),120);}function clampCfg(next){const minW=Math.round(width*MIN_SUBTITLE_BOX_WIDTH_PERCENT/100),minH=Math.max(24,Math.round(height*0.08));const w=Math.max(minW,Math.min(width,Math.round(next.width)));const h=Math.max(minH,Math.min(height,Math.round(next.height)));return{x:Math.max(0,Math.min(width-w,Math.round(next.x))),y:Math.max(0,Math.min(height-h,Math.round(next.y))),width:w,height:h};}function syncInputs(){if($('subPreviewX'))$('subPreviewX').value=cfg.x;if($('subPreviewY'))$('subPreviewY').value=cfg.y;if($('subPreviewW'))$('subPreviewW').value=cfg.width;if($('subPreviewH'))$('subPreviewH').value=cfg.height;if($('subPreviewSize'))$('subPreviewSize').value=Math.round(Number(sub.fontSize||32));if($('subPreviewColor'))$('subPreviewColor').value=sub.color||'#FFFFFF';if($('subPreviewOutlineColor'))$('subPreviewOutlineColor').value=sub.outlineColor||'#000000';const bottom=Math.max(0,height-cfg.y-cfg.height),maxWidthPercent=Math.round(cfg.width/width*1000)/10;info.textContent=`Canvas ${width}x${height} · Font ${sub.fontFamily} · Màu ${sub.color||'#FFFFFF'} · Màu viền ${sub.outlineColor||'#000000'} · Size input ${Math.round(Number(sub.fontSize||32))} · Preview size ${subtitleExportFontSize(sub)} · Bottom ${bottom} · Width ${maxWidthPercent}% · Outline ${sub.outlineWidth}`;}function applyBox(){const rect=stage.getBoundingClientRect(),scale=(rect.width||width)/width,renderScale=Number(sub.renderScale??1),fontPx=Math.max(8,subtitleExportFontSize(sub)*scale),outline=Math.max(0,Number(sub.outlineWidth??1)*renderScale*scale);box.style.left=`${cfg.x/width*100}%`;box.style.top=`${cfg.y/height*100}%`;box.style.width=`${cfg.width/width*100}%`;box.style.height=`${cfg.height/height*100}%`;text.style.fontFamily=sub.fontFamily||'Arial';text.style.fontWeight=String(Number(sub.fontWeight|| (sub.bold===true?700:400)));text.style.letterSpacing=Number.isFinite(Number(sub.letterSpacingEm))?`${Number(sub.letterSpacingEm)}em`:Number.isFinite(Number(sub.letterSpacingPx))?`${Number(sub.letterSpacingPx)}px`:'0';text.style.fontStyle=sub.italic===true?'italic':'normal';text.style.lineHeight=String(subtitlePreviewLineHeight(sub));text.style.fontSize=`${fontPx}px`;text.style.color=sub.color||'#FFFFFF';text.style.textShadow=subtitleOutlineShadow(outline,sub.outlineColor);syncInputs();}function scheduleBox(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;applyBox();});}document.querySelectorAll('#modalBody input').forEach(el=>el.addEventListener('input',()=>{if(el.id==='subPreviewSize'){sub={...sub,fontSize:Number(el.value||32)};cfg=clampCfg(cfg);applyBox();scheduleTextRefresh();return;}if(el.id==='subPreviewColor'){sub={...sub,color:el.value||'#FFFFFF'};applyBox();return;}if(el.id==='subPreviewOutlineColor'){sub={...sub,outlineColor:el.value||'#000000'};applyBox();return;}cfg=clampCfg({x:Number($('subPreviewX').value||0),y:Number($('subPreviewY').value||0),width:Number($('subPreviewW').value||1),height:Number($('subPreviewH').value||1)});applyBox();if(['subPreviewW','subPreviewH'].includes(el.id))scheduleTextRefresh();}));box.addEventListener('pointerdown',(ev)=>{if(ev.target.closest('.green-resize'))return;ev.preventDefault();const rect=stage.getBoundingClientRect(),start={clientX:ev.clientX,clientY:ev.clientY,x:cfg.x,y:cfg.y};box.setPointerCapture(ev.pointerId);const move=(m)=>{cfg=clampCfg({...cfg,x:start.x+(m.clientX-start.clientX)/rect.width*width,y:start.y+(m.clientY-start.clientY)/rect.height*height});scheduleBox();};const up=()=>{box.removeEventListener('pointermove',move);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);};box.addEventListener('pointermove',move);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);});box.querySelectorAll('.green-resize').forEach(handle=>handle.addEventListener('pointerdown',(ev)=>{ev.preventDefault();ev.stopPropagation();const direction=handle.dataset.resize,rect=stage.getBoundingClientRect(),start={clientX:ev.clientX,clientY:ev.clientY,x:cfg.x,y:cfg.y,w:cfg.width,h:cfg.height};handle.setPointerCapture(ev.pointerId);const move=(m)=>{let dx=(m.clientX-start.clientX)/rect.width*width,dy=(m.clientY-start.clientY)/rect.height*height,x=start.x,y=start.y,w=start.w,h=start.h;if(direction.includes('e'))w=start.w+dx;if(direction.includes('s'))h=start.h+dy;if(direction.includes('w')){w=start.w-dx;x=start.x+dx;}if(direction.includes('n')){h=start.h-dy;y=start.y+dy;}cfg=clampCfg({x,y,width:w,height:h});scheduleBox();scheduleTextRefresh();};const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);}));$('subPreviewCenter').onclick=()=>{cfg=clampCfg({...cfg,x:(width-cfg.width)/2});applyBox();};$('subPreviewBottom').onclick=()=>{cfg=clampCfg({...cfg,y:height-cfg.height-Number($(`${prefix}SubtitleMargin`)?.value||20)});applyBox();};$('subPreviewApply').onclick=()=>{const bottom=Math.max(0,Math.round(height-cfg.y-cfg.height)),maxWidthPercent=Math.max(MIN_SUBTITLE_BOX_WIDTH_PERCENT,Math.min(100,Math.round(cfg.width/width*1000)/10)),saved={positionMode:'absolute',fontSize:Math.max(8,Math.round(Number(sub.fontSize||32))),color:sub.color||'#FFFFFF',outlineColor:sub.outlineColor||'#000000',maxWidthPercent,boxXPercent:Math.round(cfg.x/width*1000)/10,boxYPercent:Math.round(cfg.y/height*1000)/10,boxWidthPercent:maxWidthPercent,boxHeightPercent:Math.round(cfg.height/height*1000)/10};if($(`${prefix}SubtitleSize`))$(`${prefix}SubtitleSize`).value=saved.fontSize;if($(`${prefix}SubtitleMargin`))$(`${prefix}SubtitleMargin`).value=bottom;saveSubtitlePreview(prefix,saved);closeModal();toast(`Đã áp dụng subtitle cho ${label}.`);};
}
function activePage(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${name}`));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));if(name==='dashboard')loadDashboard();if(name==='queue')loadQueue();if(name==='templates')renderEditor();if(name==='resources')loadProjectAssets().catch(e=>toast(e.message,true));if(name==='story-video'){renderStoryRows();fillSelects();}if(name==='voice-studio'){loadVoiceStudioPage();}if(name==='script-studio'){loadScriptStudioPage();}}
function defaultTemplate(){return{name:'New Template',canvas:{width:1920,height:1080,fps:24},backgroundMode:'STOCK_VIDEO',subtitle:{subtitleEffect:'none',karaokeBoxColor:'#7C00FF',stylePreset:'simple',renderer:'canvas',karaoke:false,fontFamily:'Arial',fontWeight:400,fontSize:32,bottomMargin:20,outlineWidth:0,outlineConfigured:true,color:'#FFFFFF',outlineColor:'#000000',maxWidthPercent:96,maxLines:4,lineHeight:1.2,letterSpacingEm:0,bold:false,uppercase:false,italic:false,shadow:0,renderScale:1,assScale:1,boxHeightPercent:8,positionMode:'absolute'},transition:{minDurationMs:600,maxDurationMs:900,avoidRepeatCount:2,items:TRANSITIONS.map(x=>({...x,enabled:x.recommended!==false}))},imageSequence:{durationMs:5000,allowFlip:false},layers:[]};}
function newLayer(type){const i=(state.editor?.layers?.length||0)+1;const name=type==='VOICE_IMAGE'?`Ảnh theo voice ${i}`:`${type} ${i}`;return{id:crypto.randomUUID(),type,name,zIndex:i,sourceReference:'',text:type==='TEXT'?'Text mới':'',visible:true,locked:false,loop:['VIDEO','GREENSCREEN_VIDEO','OVERLAY_VIDEO'].includes(type),startMs:0,endMs:null,transform:{x:80+i*10,y:70+i*10,width:type==='TEXT'?500:320,height:type==='TEXT'?100:180,rotation:0,opacity:.9},style:{fontSize:52,color:'#FFFFFF',outlineColor:'#000000',outlineWidth:2,blendMode:'normal'},timing:{},effect:{blendMode:type.startsWith('OVERLAY')?'screen':'normal',similarity:.24,softness:.06,despillMix:.45,despillExpand:.02}};}

async function loadAll(){state.projects=(await api.projects.list()).map(standardProject);state.templates=await api.templates.list();state.libraries=await api.libraries.list();state.batches=await api.batch.list();state.defaultAssets=await api.defaultAssets?.().catch(()=>({green:[],backgrounds:[]}))||{green:[],backgrounds:[]};await loadProjectAssets();fillSelects();populateProjectAssetSelects();updateGreenSourceVisibility();renderProjects();renderLibraries();renderBatchHistory();}
function fillSelect(id,items,label,selected){const el=$(id);if(!el)return;el.innerHTML=items.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${label(x)}</option>`).join('');}
function fillSelects(){const projectId=state.selectedProject?.id;fillSelect('templateProject',state.projects,p=>p.name,projectId);fillSelect('batchProject',state.projects,p=>p.name,projectId);fillSelect('bridgeKeyProjectSelect',state.projects,p=>p.name,$('batchProject')?.value||projectId);fillSelect('singleProject',state.projects,p=>p.name,projectId);fillSelect('storyProject',state.projects,p=>p.name,projectId);fillSelect('templateSelect',state.templates,t=>t.name,state.selectedTemplate?.id);fillSelect('batchTemplate',state.templates,t=>t.name,state.selectedTemplate?.id);fillSelect('singleTemplate',state.templates,t=>t.name,state.selectedTemplate?.id);fillSelect('storyTemplate',state.templates,t=>t.name,state.selectedTemplate?.id);const savedLibId=localStorage.getItem('vbs.batchLibrary')||'';const preferredLib=state.libraries.find(l=>l.id===savedLibId)||state.libraries.find(l=>/16-6|OBS-Recordings/i.test(l.name||l.root_path||''))||state.libraries[0]||null;fillSelect('batchLibrary',state.libraries,librarySelectLabel,preferredLib?.id);fillSelect('singleLibrary',state.libraries,librarySelectLabel,preferredLib?.id);if($('mediaFolder')&&preferredLib?.root_path){const curMedia=$('mediaFolder').value||'';if(!curMedia||/scratch[\\/]+e2e_test_project/i.test(curMedia)){$('mediaFolder').value=preferredLib.root_path;try{localStorage.setItem('vbs.mediaFolder',preferredLib.root_path);}catch{}}}populateProjectAssetSelects();}
function populateGpuSelectors(health){
  const selected=Number(health?.selectedGpuIndex??0),gpus=health?.gpus||[];
  const autoLabel=health?.selectedGpuName?`Tự động — ${health.selectedGpuName} (GPU ${selected})`:'Tự động quét GPU';
  const options=[`<option value="-1" selected>${autoLabel}</option>`,...gpus.map(g=>`<option value="${g.index}">GPU ${g.index} — ${g.name}${g.h264NvencReady?' · NVENC OK':' · chưa sẵn sàng'}</option>`)].join('');
  ['singleGpuIndex','batchGpuIndex'].forEach(id=>{const el=$(id);if(el)el.innerHTML=options;});
  const mode=health?.nvencRuntime?'NVENC encode sẵn sàng':health?.nvencPotential?'NVENC sẽ tự retry':'CPU fallback';
  const note=`${health?.selectedGpuName||'Không nhận diện NVIDIA'} · ${mode}. AUTO_STABLE dùng GPU ở mục Video Encode; subtitle/transition/overlay vẫn chạy CPU để ổn định. Khi render hãy xem Task Manager > GPU > Video Encode hoặc dòng GPU Enc trên progress.`;
  if($('singleGpuNote'))$('singleGpuNote').textContent=note;
  if($('batchGpuNote'))$('batchGpuNote').textContent=note+' Batch có thể tăng worker; GTX 1060 nên thử 2-4 trước khi lên 6-8.';
}
async function loadDashboard(force=false){
  const health=await (force&&api.refreshGpu?api.refreshGpu():api.checkSystem()).catch(e=>({error:e.message}));
  state.systemHealth=health;populateGpuSelectors(health);
  $('systemDetails').textContent=JSON.stringify(health,null,2);$('metricProjects').textContent=state.projects.length;$('metricTemplates').textContent=state.templates.length;$('metricLibraries').textContent=state.libraries.length;$('metricBatches').textContent=state.batches.length;
  const ok=health.ffmpegOk&&health.ffprobeOk,gpuLabel=health.nvencRuntime?`NVENC · ${health.selectedGpuName||'NVIDIA'}`:health.nvencPotential?'NVENC retry':'CPU';
  $('systemPill').textContent=ok?`FFmpeg OK · ${gpuLabel}`:'System lỗi';$('systemPill').className=`pill ${ok?'ok':'warn'}`;
  $('recentBatches').innerHTML=state.batches.slice(0,6).map(b=>`<div class="list-item"><strong>${b.name}</strong><small><span class="badge ${b.status}">${b.status}</span> · ${new Date(b.created_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">Chưa có batch.</div>';
}
function renderProjects(){const root=$('projectList');root.innerHTML=state.projects.map(p=>`<div class="list-item ${state.selectedProject?.id===p.id?'active':''}" data-project="${p.id}"><strong>${p.name}</strong><small>${p.width}×${p.height} · ${p.fps_num} FPS · ${p.batch_count||0} batches</small></div>`).join('');root.querySelectorAll('[data-project]').forEach(el=>el.onclick=()=>selectProject(el.dataset.project));}
function selectProject(id){state.creatingProject=false;state.selectedProject=standardProject(state.projects.find(p=>p.id===id));const p=state.selectedProject;if(!p)return;$('projectName').value=p.name;$('projectDescription').value=p.description||'';$('projectOutput').value=p.output_root_path||'';$('projectWidth').value=STANDARD_CANVAS_WIDTH;$('projectHeight').value=STANDARD_CANVAS_HEIGHT;$('projectFps').value=p.fps_num||24;fillSelects();renderProjects();}
async function saveProject(){const d={name:$('projectName').value.trim(),description:$('projectDescription').value,output_root_path:$('projectOutput').value,width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT,fps_num:Number($('projectFps').value||24)};if(!d.name)return toast('Tên project không được trống.',true);const creating=state.creatingProject||!state.selectedProject;const saved=creating?await api.projects.create({name:d.name,description:d.description,outputRootPath:d.output_root_path,width:d.width,height:d.height,fps:d.fps_num}):await api.projects.update(state.selectedProject.id,d);state.creatingProject=false;state.projects=(await api.projects.list()).map(standardProject);state.selectedProject=standardProject(state.projects.find(p=>p.id===saved.id)||state.projects[0]||null);fillSelects();if(state.selectedProject){selectProject(state.selectedProject.id);await loadTemplates(state.selectedProject.id);}else renderProjects();toast(creating?'Đã tạo project mới.':'Đã lưu project.');}

function renderTransitionGroup(rootId,prefix,items=TRANSITIONS){const root=$(rootId);root.innerHTML=items.map(t=>`<label class="transition-choice"><input type="checkbox" data-${prefix}-transition="${t.id}" ${t.enabled!==false&&t.recommended!==false?'checked':''}> ${t.label}</label>`).join('');}
function selectedTransitions(prefix){return TRANSITIONS.map(t=>({...t,enabled:Boolean(document.querySelector(`[data-${prefix}-transition="${t.id}"]`)?.checked)})).filter(t=>t.enabled);}
async function loadTemplates(projectId,preferredTemplateId=null){state.templates=await api.templates.list(projectId||null);fillSelect('templateSelect',state.templates,t=>t.name,preferredTemplateId||state.selectedTemplate?.id);fillSelect('batchTemplate',state.templates,t=>t.name,preferredTemplateId||state.selectedTemplate?.id);fillSelect('singleTemplate',state.templates,t=>t.name,preferredTemplateId||state.selectedTemplate?.id);const target=state.templates.find(t=>t.id===(preferredTemplateId||state.selectedTemplate?.id))||state.templates[0]||null;if(target){await selectTemplate(target.id);}}
async function selectTemplate(id){const tpl=await api.templates.get(id);if(!tpl)return;state.selectedTemplate=tpl;const rawLayers=tpl.layers?.length?tpl.layers:tpl.config.layers||[];const hadVoiceImageInDb=rawLayers.some(l=>String(l.type||l.layer_type||'').toUpperCase()==='VOICE_IMAGE');const baseEditor={...tpl.config,name:tpl.name,description:tpl.description||'',layers:rawLayers.filter(l=>String(l.type||l.layer_type||'').toUpperCase()!=='VOICE_IMAGE').map(l=>({id:l.id,type:l.type||l.layer_type,name:l.name,zIndex:l.zIndex??l.z_index,sourceReference:(l.sourceReference??l.source_reference??''),text:l.text||l.style?.text||'',visible:l.visible!==0&&l.visible!==false,locked:l.locked===1||l.locked===true,loop:l.loop_enabled===1||l.loop===true,startMs:(l.start_ms??l.startMs??0),endMs:(l.end_ms??l.endMs??null),transform:l.transform||{},style:l.style||{},timing:l.timing||{},effect:l.effect||{}}))};baseEditor.layers=standardizeLayerTransforms(baseEditor.layers,tpl.config?.canvas);baseEditor.canvas=standardCanvas(baseEditor.canvas);if(hadVoiceImageInDb){try{api.templates?.save?.(id,{name:baseEditor.name||tpl.name,description:baseEditor.description||'',config:baseEditor},'Removed folder VOICE_IMAGE from shared Template')?.catch?.(()=>{});}catch{}}state.selectedLayer=baseEditor.layers[0]||null;if($('templateSelect'))$('templateSelect').value=id;if($('batchTemplate'))$('batchTemplate').value=id;if($('singleTemplate'))$('singleTemplate').value=id;state.editor={...baseEditor,subtitle:normalizeSubtitleConfig({...(baseEditor.subtitle||{}),assScale:1})};await loadSubtitlePreviewState('batch',state.editor.subtitle,id);await loadSubtitlePreviewState('single',state.editor.subtitle,id);syncTemplateControls();await applyRenderTemplateControls('batch');await applyRenderTemplateControls('single');renderEditor();if(typeof renderProjectImageFolderList==='function')renderProjectImageFolderList(state.scannedFolderImages||[]);}
function syncTemplateControls(){const e=state.editor||defaultTemplate(),sub=e.subtitle||{},effect=String(sub.subtitleEffect||sub.stylePreset||'none').toLowerCase()==='karaoke_box'?'karaoke_box':'none',boxColor=sub.karaokeBoxColor||'#7C00FF';e.canvas=standardCanvas(e.canvas);$('tplWidth').value=STANDARD_CANVAS_WIDTH;$('tplHeight').value=STANDARD_CANVAS_HEIGHT;$('tplFps').value=e.canvas?.fps||24;$('tplBackground').value=e.backgroundMode||'STOCK_VIDEO';if($('tplSubtitlePreset'))$('tplSubtitlePreset').value='simple';if($('tplSubtitleEffect'))$('tplSubtitleEffect').value=effect;if($('tplKaraokeBoxColor'))$('tplKaraokeBoxColor').value=boxColor;if($('tplKaraokeBoxColorRow'))$('tplKaraokeBoxColorRow').style.display=effect==='karaoke_box'?'':'none';if($('batchSubtitleEffect'))$('batchSubtitleEffect').value=effect;if($('batchKaraokeBoxColor'))$('batchKaraokeBoxColor').value=boxColor;if($('batchKaraokeBoxColorRow'))$('batchKaraokeBoxColorRow').style.display=effect==='karaoke_box'?'':'none';if($('tplSubtitleFont'))$('tplSubtitleFont').value=subtitleFontValue(sub.fontFamily||'Arial');if($('tplSubtitleColor'))$('tplSubtitleColor').value=sub.color||'#FFFFFF';if($('tplSubtitleOutlineColor'))$('tplSubtitleOutlineColor').value=sub.outlineColor||'#000000';if($('tplSubtitleSize'))$('tplSubtitleSize').value=Math.round(Number(sub.fontSize||32));if($('tplSubtitleOutline'))$('tplSubtitleOutline').value=Math.round(Number(sub.outlineWidth??0));if($('tplSubtitleBottom'))$('tplSubtitleBottom').value=Math.round(Number(sub.bottomMargin??20));if($('tplSubtitleX'))$('tplSubtitleX').value=Number(sub.boxXPercent??2).toFixed(1);if($('tplSubtitleY'))$('tplSubtitleY').value=Number(sub.boxYPercent??84).toFixed(1);if($('tplSubtitleW'))$('tplSubtitleW').value=Number(sub.boxWidthPercent||sub.maxWidthPercent||96).toFixed(1);if($('tplSubtitleH'))$('tplSubtitleH').value=Number(sub.boxHeightPercent||8).toFixed(1);if($('tplSubtitleBold'))$('tplSubtitleBold').checked=sub.bold===true||Number(sub.fontWeight)>=700;if($('tplSubtitleUppercase'))$('tplSubtitleUppercase').checked=sub.uppercase===true;}
async function applyRenderTemplateControls(prefix){const selectId=prefix==='single'?'singleTemplate':'batchTemplate';const id=$(selectId)?.value;if(!id)return;let tpl=null;try{tpl=await api.templates.get(id);}catch{}const cfg=tpl?.config||tpl;if(!cfg)return;const canvas=cfg.canvas||{};if($(`${prefix}Width`))$(`${prefix}Width`).value=STANDARD_CANVAS_WIDTH;if($(`${prefix}Height`))$(`${prefix}Height`).value=STANDARD_CANVAS_HEIGHT;if($(`${prefix}Fps`)&&canvas.fps)$(`${prefix}Fps`).value=canvas.fps;}
function pullTemplateControls(){const e=state.editor,prev=e.subtitle||{};const readNumber=(id,fallback)=>{const el=$(id);if(!el)return fallback;const value=Number(el.value);return Number.isFinite(value)?value:fallback;};const boxWidth=Math.max(MIN_SUBTITLE_BOX_WIDTH_PERCENT,Math.min(100,readNumber('tplSubtitleW',Number(prev.boxWidthPercent||prev.maxWidthPercent||96))));const effect=($('tplSubtitleEffect')?.value||prev.subtitleEffect||'none')==='karaoke_box'?'karaoke_box':'none';const boxColor=$('tplKaraokeBoxColor')?.value||prev.karaokeBoxColor||'#7C00FF';if($('tplKaraokeBoxColorRow'))$('tplKaraokeBoxColorRow').style.display=effect==='karaoke_box'?'':'none';if($('batchSubtitleEffect'))$('batchSubtitleEffect').value=effect;if($('batchKaraokeBoxColor'))$('batchKaraokeBoxColor').value=boxColor;if($('batchKaraokeBoxColorRow'))$('batchKaraokeBoxColorRow').style.display=effect==='karaoke_box'?'':'none';e.canvas={width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT,fps:Number($('tplFps').value||24)};e.backgroundMode=$('tplBackground').value;e.subtitle=normalizeSubtitleConfig({...prev,subtitleEffect:effect,karaokeBoxColor:boxColor,fontFamily:($('tplSubtitleFont')?.value||prev.fontFamily||'Arial').trim()||'Arial',color:$('tplSubtitleColor')?.value||prev.color||'#FFFFFF',outlineColor:$('tplSubtitleOutlineColor')?.value||prev.outlineColor||'#000000',fontSize:readNumber('tplSubtitleSize',Number(prev.fontSize||32)),outlineWidth:readNumber('tplSubtitleOutline',Number(prev.outlineWidth??0)),outlineConfigured:true,bottomMargin:readNumber('tplSubtitleBottom',Number(prev.bottomMargin??20)),positionMode:'absolute',boxXPercent:readNumber('tplSubtitleX',Number(prev.boxXPercent??2)),boxYPercent:readNumber('tplSubtitleY',Number(prev.boxYPercent??84)),boxWidthPercent:boxWidth,maxWidthPercent:boxWidth,boxHeightPercent:Math.max(1,Math.min(60,readNumber('tplSubtitleH',Number(prev.boxHeightPercent||8)))),bold:$('tplSubtitleBold')?.checked===true,uppercase:$('tplSubtitleUppercase')?.checked===true,assScale:1});delete e.layerCache;}
function updateSubtitlePreview(){const e=state.editor||defaultTemplate(),el=document.querySelector('#previewCanvas .subtitle-demo');if(!el)return;const canvas=e.canvas||{width:1920,height:1080},cw=Math.max(1,Number(canvas.width||1920)),ch=Math.max(1,Number(canvas.height||1080)),sub=normalizeSubtitleConfig({...(e.subtitle||{}),assScale:1}),isKaraokeBox=sub.subtitleEffect==='karaoke_box',sample=isKaraokeBox?'THE WEIGHT OF THE WORLD':templateSubtitleSample(sub),displaySample=(isKaraokeBox||sub.uppercase===true)?sample.toUpperCase():sample,frame=api.preview?.subtitleFrame?.({width:cw,height:ch,canvas,subtitle:sub},displaySample)||null,box=frame||previewSubtitleBox({width:cw,height:ch,subtitle:sub}),rect=$('previewCanvas').getBoundingClientRect(),scale=(api.preview?.viewport?.({width:cw,height:ch},{width:rect.width,height:rect.height})?.scale)||rect.width/cw,lineCount=Math.max(1,displaySample.split(/\r?\n/).filter(Boolean).length),renderScale=Number(sub.renderScale??1),fontSize=Math.max(8,(frame?.fontSize||previewSubtitleFontSize(sub,lineCount,box.height))*scale),outline=Math.max(isKaraokeBox?1.5*scale:0,Number(frame?.outlineWidth??sub.outlineWidth??1)*renderScale*scale),outlineColor=frame?.outlineColor||sub.outlineColor||'#000000',text=el.querySelector('.subtitle-text');if(text){if(isKaraokeBox){const words=displaySample.split(/\s+/);const first=htmlEscape(words[0]||'THE');const rest=htmlEscape(words.slice(1).join(' '));const boxBg=htmlEscape(sub.karaokeBoxColor||'#7C00FF');text.innerHTML=`<span style="background:${boxBg};padding:2px 8px;border-radius:6px;display:inline-block;margin-right:4px;">${first}</span>${rest}`;}else{text.textContent=displaySample;}}el.style.fontFamily=frame?.fontFamily||sub.fontFamily||'Arial';el.style.fontWeight=isKaraokeBox?'700':String(Number(frame?.fontWeight||sub.fontWeight|| (sub.bold===true?700:400)));el.style.letterSpacing=Number.isFinite(Number(sub.letterSpacingEm))?`${Number(sub.letterSpacingEm)}em`:Number.isFinite(Number(sub.letterSpacingPx))?`${Number(sub.letterSpacingPx)}px`:'0';el.style.fontStyle=sub.italic===true?'italic':'normal';el.style.lineHeight=String(frame?.lineHeight||subtitlePreviewLineHeight(sub));el.style.whiteSpace='pre-wrap';el.style.wordBreak='break-word';el.style.fontSize=`${fontSize}px`;el.style.left=`${box.x/cw*100}%`;el.style.top=`${box.y/ch*100}%`;el.style.width=`${box.width/cw*100}%`;el.style.height=`${box.height/ch*100}%`;el.style.right='auto';el.style.bottom='auto';el.style.display='grid';el.style.placeItems='center';el.style.textAlign='center';el.style.textShadow=subtitleOutlineShadow(outline,outlineColor);el.style.color=frame?.color||sub.color||'#FFFFFF';}
function isImageLayer(type){return ['LOGO','IMAGE','VOICE_IMAGE','GREENSCREEN_IMAGE','OVERLAY_IMAGE'].includes(type);}
function isVideoLayer(type){return ['VIDEO','GREENSCREEN_VIDEO','OVERLAY_VIDEO'].includes(type);}
function isMediaLayer(type){return isImageLayer(type)||isVideoLayer(type);}
function isGreenscreenLayer(type){return ['GREENSCREEN_IMAGE','GREENSCREEN_VIDEO'].includes(type);}
function projectLayerTier(layer){const type=layer?.type||layer?.layerType||layer?.layer_type;return layer?.dynamicVoiceImage===true||type==='VOICE_IMAGE'||layer?.sourceMode==='VOICE_IMAGE'?1:2;}
function compareProjectLayerOrder(a,b){return projectLayerTier(a)-projectLayerTier(b)||(a.zIndex??0)-(b.zIndex??0);}
function effectiveLayerSourceReference(layer){return layer?.sourceReference||'';}
function isLayerUsingChromaPreview(layer){if(isGreenscreenLayer(layer?.type))return true;if(layer?.type==='VOICE_IMAGE')return String($('projectImageMode')?.value||layer?.effect?.assetMode||'IMAGE').toUpperCase()==='GREEN';return false;}
function previewForLayer(layer){const src=effectiveLayerSourceReference(layer);if(!src)return null;const cached=state.previewCache.get(src);if(cached)return cached;if(isImageLayer(layer.type)&&imageLikePath(src))return {previewPath:src,sourceType:'IMAGE',metadata:layer.sourceMetadata||{}};return null;}
function layerEffectPreviewKey(layer,previewPath){const e=layer.effect||{},mode=layer?.type==='VOICE_IMAGE'?String($('projectImageMode')?.value||'IMAGE').toUpperCase():'GREEN';return[previewPath,layer.type,mode,e.keyColor||'0x00FF00',e.similarity??.24,e.softness??.06,e.despillMix??.45,e.despillExpand??.02].join('|');}
function refreshSingleCanvasLayerDom(layer){
  const el=document.querySelector(`#previewCanvas .canvas-layer[data-layer-id="${layer?.id}"] .layer-content`);
  if(el)el.innerHTML=layerContentHtml(layer);
}
function requestLayerEffectPreview(layer,previewPath){if(!isLayerUsingChromaPreview(layer)||!previewPath)return null;const key=layerEffectPreviewKey(layer,previewPath);if(state.effectPreviewCache.has(key))return state.effectPreviewCache.get(key);if(state.effectPreviewPending.has(key))return null;state.effectPreviewPending.add(key);chromaPreviewDataUrlV3(fileUrl(previewPath),{assetMode:'GREEN',keyColor:(layer.effect||{}).keyColor||'0x00FF00',similarity:(layer.effect||{}).similarity??.24,softness:(layer.effect||{}).softness??.06,despillMix:(layer.effect||{}).despillMix??.45,despillExpand:(layer.effect||{}).despillExpand??.02}).then(dataUrl=>{state.effectPreviewCache.set(key,dataUrl);if(state.editor?.layers?.some(l=>l.id===layer.id))refreshSingleCanvasLayerDom(layer);}).finally(()=>state.effectPreviewPending.delete(key));return null;}
function updateLayerElementStyle(div,layer){const e=state.editor||defaultTemplate(),canvas=e.canvas||{width:1920,height:1080},css=api.preview?.layerCssBox?.(layer,{width:canvas.width,height:canvas.height,canvas})||null,t=layer.transform||{};div.style.left=css?.left||`${Number(t.x||0)/canvas.width*100}%`;div.style.top=css?.top||`${Number(t.y||0)/canvas.height*100}%`;div.style.width=css?.width||`${Number(t.width||300)/canvas.width*100}%`;div.style.height=css?.height||`${Number(t.height||150)/canvas.height*100}%`;div.style.opacity=css?.opacity||String(t.opacity??1);div.style.transformOrigin=css?.transformOrigin||'50% 50%';div.style.transform=css?.transform||`rotate(${Number(t.rotation||0)}deg)`;}
function canvasScale(){const e=state.editor||defaultTemplate(),rect=$('previewCanvas')?.getBoundingClientRect?.();return rect?rect.width/Math.max(1,Number(e.canvas?.width||1920)):0.5;}
function syncTransformInputs(){const l=state.selectedLayer;if(!l)return;$('layerX').value=Math.round(l.transform?.x||0);$('layerY').value=Math.round(l.transform?.y||0);$('layerWidth').value=Math.round(l.transform?.width||300);$('layerHeight').value=Math.round(l.transform?.height||150);}
function normalizeLayerOrder(){if(!state.editor?.layers)return;state.editor.layers.forEach((l,i)=>{l.zIndex=i;});}
function moveSelectedLayer(mode){const l=state.selectedLayer,arr=state.editor?.layers;if(!l||!arr)return;const ordered=[...arr].sort(compareProjectLayerOrder);let index=ordered.findIndex(x=>x.id===l.id);if(index<0)return;let target=index;if(mode==='up')target=Math.min(ordered.length-1,index+1);if(mode==='down')target=Math.max(0,index-1);if(mode==='front')target=ordered.length-1;if(mode==='back')target=0;if(target===index)return;ordered.splice(index,1);ordered.splice(target,0,l);state.editor.layers=ordered;normalizeLayerOrder();state.selectedLayer=l;renderEditor();}
function fitLayerToSource(layer,metadata){const w=Number(metadata?.width||0),h=Number(metadata?.height||0);if(!w||!h)return;const canvas=state.editor?.canvas||{width:1920,height:1080};const maxW=Math.round(canvas.width*.42),maxH=Math.round(canvas.height*.42),ratio=w/h;let width=maxW,height=Math.round(width/ratio);if(height>maxH){height=maxH;width=Math.round(height*ratio);}layer.transform={...(layer.transform||{}),width:Math.max(40,width),height:Math.max(40,height),x:Math.max(0,Math.round((canvas.width-width)/2)),y:Math.max(0,Math.round((canvas.height-height)/2))};layer.sourceMetadata={width:w,height:h,durationMs:Number(metadata.durationMs||0)};}
async function requestLayerPreview(layer,{fit=false}={}){const source=effectiveLayerSourceReference(layer);if(!source||layer.type==='TEXT')return null;if(state.previewCache.has(source)){const result=state.previewCache.get(source);if(fit)fitLayerToSource(layer,result.metadata);return result;}if(state.previewPending.has(source))return null;state.previewPending.add(source);try{const result=await api.mediaPreview(source,{width:540});state.previewCache.set(source,result);if(effectiveLayerSourceReference(layer)===source){if(fit){fitLayerToSource(layer,result.metadata);renderEditor();}else{refreshSingleCanvasLayerDom(layer);}$('layerPreviewInfo').textContent=`Frame preview ${result.frameTimeSeconds?.toFixed?.(2)||0}s · ${result.metadata?.width||0}×${result.metadata?.height||0}`;}return result;}catch(error){state.previewCache.set(source,{error:error.message});if(effectiveLayerSourceReference(layer)===source){refreshSingleCanvasLayerDom(layer);$('layerPreviewInfo').textContent=`Không lấy được frame: ${error.message}`;}return null;}finally{state.previewPending.delete(source);}}
async function setLayerSource(layer,source){layer.sourceReference=source||'';$('layerSource').value=layer.sourceReference;if(!source){renderEditor();return;}const result=await requestLayerPreview(layer,{fit:true});if(result?.metadata)fitLayerToSource(layer,result.metadata);renderEditor();}
function layerContentHtml(layer){if(layer.type==='TEXT'){const s=canvasScale(),style=layer.style||{},t=layer.transform||{},outline=Math.max(0,Number(style.outlineWidth||2)*s);return `<div class="placeholder text-preview" style="font-size:${Math.max(1,Number(style.fontSize||52)*s)}px;color:${style.color||'#fff'};opacity:${t.opacity??1};text-shadow:${subtitleOutlineShadow(outline,style.outlineColor,'none')}">${layer.text||layer.sourceReference||'Text'}</div>`;}const srcRef=effectiveLayerSourceReference(layer);if(srcRef&&!state.previewCache.has(srcRef)&&!state.previewPending.has(srcRef))requestLayerPreview(layer);const preview=previewForLayer(layer);if(preview?.previewPath){const effected=requestLayerEffectPreview(layer,preview.previewPath)||preview.previewPath;return `<img src="${String(effected).startsWith('data:')||String(effected).startsWith('blob:')?effected:fileUrl(effected)}" alt="${layer.name||layer.type}">`;}if(preview?.error)return `<div class="placeholder error-preview">${layer.type}<br>${preview.error}</div>`;if(srcRef){requestLayerPreview(layer);return `<div class="placeholder loading-preview">Đang lấy frame…<br>${srcRef.split(/[\\/]/).pop()}</div>`;}return `<div class="placeholder">${layer.type}<br>Chưa chọn source</div>`;}
function renderEditor(){const e=state.editor||defaultTemplate(),canvas=$('previewCanvas');$('canvasSizeLabel').textContent=`${e.canvas?.width||1920} × ${e.canvas?.height||1080} · ${e.canvas?.fps||24} FPS`;canvas.style.aspectRatio=`${e.canvas?.width||1920}/${e.canvas?.height||1080}`;canvas.querySelectorAll('.canvas-layer').forEach(x=>x.remove());updateSubtitlePreview();wireSubtitlePreview();const layers=[...(e.layers||[])].sort(compareProjectLayerOrder);for(const layer of layers){if(layer.visible===false)continue;const div=document.createElement('div');div.className=`canvas-layer ${state.selectedLayer?.id===layer.id?'selected':''}`;div.dataset.layerId=layer.id;div.innerHTML=`<div class="layer-content">${layerContentHtml(layer)}</div><span class="resize-handle nw" data-resize="nw"></span><span class="resize-handle ne" data-resize="ne"></span><span class="resize-handle sw" data-resize="sw"></span><span class="resize-handle se" data-resize="se"></span>`;updateLayerElementStyle(div,layer);wireCanvasLayer(div,layer);canvas.appendChild(div);}
  $('layerList').innerHTML=layers.slice().reverse().map(l=>`<div class="layer-row ${state.selectedLayer?.id===l.id?'active':''}" data-layer="${l.id}"><span>${l.name}</span><span class="layer-type">${l.type}</span><button data-toggle="${l.id}">${l.visible===false?'○':'●'}</button></div>`).join('');$('layerList').querySelectorAll('[data-layer]').forEach(el=>el.onclick=(ev)=>{if(ev.target.dataset.toggle)return;setSelectedLayer(el.dataset.layer,{redraw:false});});$('layerList').querySelectorAll('[data-toggle]').forEach(b=>b.onclick=(ev)=>{ev.stopPropagation();const l=e.layers.find(x=>x.id===b.dataset.toggle);l.visible=l.visible===false;renderEditor();});renderLayerProperties();}
function wireCanvasLayer(div,layer){
  const projectDelta=(event,start,rect,canvas)=>api.preview?.deltaToProject?.(
    {dx:event.clientX-start.clientX,dy:event.clientY-start.clientY},
    canvas,
    {width:rect.width,height:rect.height}
  )||{dx:(event.clientX-start.clientX)/rect.width*canvas.width,dy:(event.clientY-start.clientY)/rect.height*canvas.height};
  div.addEventListener('pointerdown',(ev)=>{
    if(ev.target.closest('.resize-handle')||layer.locked)return;
    ev.preventDefault();
    ev.stopPropagation();
    setSelectedLayer(layer.id,{redraw:false});
    const rect=$('previewCanvas').getBoundingClientRect(),canvas=state.editor.canvas,start={clientX:ev.clientX,clientY:ev.clientY,x:Number(layer.transform.x||0),y:Number(layer.transform.y||0)};
    window.__vbsIsDraggingLayer=true;
    try{div.setPointerCapture(ev.pointerId);}catch{}
    let rafId=0;
    const move=(m)=>{
      const delta=projectDelta(m,start,rect,canvas);
      layer.transform.x=Math.round(start.x+delta.dx);
      layer.transform.y=Math.round(start.y+delta.dy);
      if(!rafId){
        rafId=requestAnimationFrame(()=>{
          rafId=0;
          updateLayerElementStyle(div,layer);
          syncTransformInputs();
        });
      }
    };
    const up=()=>{
      window.__vbsIsDraggingLayer=false;
      if(rafId){cancelAnimationFrame(rafId);rafId=0;}
      updateLayerElementStyle(div,layer);
      syncTransformInputs();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
  });
  div.querySelectorAll('.resize-handle').forEach(handle=>handle.addEventListener('pointerdown',(ev)=>{
    if(layer.locked)return;
    ev.preventDefault();
    ev.stopPropagation();
    setSelectedLayer(layer.id,{redraw:false});
    const direction=handle.dataset.resize,rect=$('previewCanvas').getBoundingClientRect(),canvas=state.editor.canvas,t=layer.transform||{},start={clientX:ev.clientX,clientY:ev.clientY,x:Number(t.x||0),y:Number(t.y||0),w:Number(t.width||300),h:Number(t.height||150)},aspect=Math.max(.01,Number(t.width||300)/Math.max(1,Number(t.height||150))),keepAspect=isMediaLayer(layer.type);
    window.__vbsIsDraggingLayer=true;
    try{handle.setPointerCapture(ev.pointerId);}catch{}
    let rafId=0;
    const move=(m)=>{
      const delta=projectDelta(m,start,rect,canvas);
      let dx=delta.dx,dy=delta.dy,x=start.x,y=start.y,w=start.w,h=start.h;
      if(direction.includes('e'))w=start.w+dx;
      if(direction.includes('s'))h=start.h+dy;
      if(direction.includes('w')){w=start.w-dx;x=start.x+dx;}
      if(direction.includes('n')){h=start.h-dy;y=start.y+dy;}
      if(keepAspect&&!m.altKey){
        const byWidth=Math.abs(dx)>=Math.abs(dy);
        if(byWidth){h=w/aspect;if(direction.includes('n'))y=start.y+(start.h-h);}
        else{w=h*aspect;if(direction.includes('w'))x=start.x+(start.w-w);}
      }
      const min=30;
      if(w<min){if(direction.includes('w'))x-=min-w;w=min;if(keepAspect)h=w/aspect;}
      if(h<min){if(direction.includes('n'))y-=min-h;h=min;if(keepAspect)w=h*aspect;}
      layer.transform={...layer.transform,x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h)};
      if(!rafId){
        rafId=requestAnimationFrame(()=>{
          rafId=0;
          updateLayerElementStyle(div,layer);
          syncTransformInputs();
        });
      }
    };
    const up=()=>{
      window.__vbsIsDraggingLayer=false;
      if(rafId){cancelAnimationFrame(rafId);rafId=0;}
      updateLayerElementStyle(div,layer);
      syncTransformInputs();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
  }));
  div.addEventListener('wheel',(ev)=>{
    if(layer.locked||state.selectedLayer?.id!==layer.id)return;
    ev.preventDefault();
    const factor=ev.deltaY<0?1.06:0.94;
    const t=layer.transform||{};
    const oldW=Math.max(30,Number(t.width||300)),oldH=Math.max(30,Number(t.height||150));
    const newW=Math.max(30,Math.round(oldW*factor)),newH=Math.max(30,Math.round(oldH*factor));
    const cx=Number(t.x||0)+oldW/2,cy=Number(t.y||0)+oldH/2;
    layer.transform={...t,x:Math.round(cx-newW/2),y:Math.round(cy-newH/2),width:newW,height:newH};
    updateLayerElementStyle(div,layer);
    syncTransformInputs();
  },{passive:false});
}
function selectLayer(id){setSelectedLayer(id,{redraw:true});}
function renderLayerProperties(){const l=state.selectedLayer,greenRow=$('layerDefaultGreenRow');$('noLayer').hidden=Boolean(l);$('layerProperties').hidden=!l;if(!l){if(greenRow)greenRow.hidden=true;return;}syncPropertiesFromLayer();const voiceImage=l.type==='VOICE_IMAGE',greenLayer=isGreenscreenLayer(l.type);if(greenRow)greenRow.hidden=!greenLayer;$('layerSource').disabled=voiceImage;$('pickLayerSource').disabled=voiceImage;$('layerSource').title=voiceImage?'Nguồn sẽ được lấy theo tên voice ở Single/Batch.':greenLayer?'Có thể chọn từ kho green của project bên dưới.':'';const p=previewForLayer(l);$('layerPreviewInfo').textContent=voiceImage?'Ảnh sẽ được lấy theo tên voice khi render. Chỉnh khung tại đây.':l.sourceReference?(p?.previewPath?`${p.sourceType==='VIDEO'?'Frame video':'Ảnh'} · ${p.metadata?.width||l.sourceMetadata?.width||0}×${p.metadata?.height||l.sourceMetadata?.height||0}`:'Chọn source để tạo frame preview.'):(greenLayer?'Chọn source hoặc lấy từ kho green của project.':'Chưa chọn source.');}
function syncPropertiesFromLayer(){const l=state.selectedLayer;if(!l)return;$('layerName').value=l.name||'';$('layerText').value=l.text||'';$('layerSource').value=l.sourceReference||'';$('layerX').value=l.transform?.x||0;$('layerY').value=l.transform?.y||0;$('layerWidth').value=l.transform?.width||300;$('layerHeight').value=l.transform?.height||150;$('layerRotation').value=l.transform?.rotation||0;$('layerOpacity').value=l.transform?.opacity??1;$('layerFontSize').value=l.style?.fontSize||52;$('layerBlend').value=l.effect?.blendMode||l.style?.blendMode||'normal';$('layerStart').value=l.startMs||0;$('layerEnd').value=l.endMs||'';$('layerLoop').checked=Boolean(l.loop);$('layerVisible').checked=l.visible!==false;}
function pullLayerProperties(){const l=state.selectedLayer;if(!l)return;const prevVis=l.visible!==false;l.name=$('layerName').value;l.text=$('layerText').value;l.transform={...(l.transform||{}),x:Number($('layerX').value),y:Number($('layerY').value),width:Number($('layerWidth').value),height:Number($('layerHeight').value),rotation:Number($('layerRotation').value),opacity:Number($('layerOpacity').value)};l.style={...(l.style||{}),fontSize:Number($('layerFontSize').value)};l.effect={...(l.effect||{}),blendMode:$('layerBlend').value};l.startMs=Number($('layerStart').value||0);l.endMs=$('layerEnd').value?Number($('layerEnd').value):null;l.loop=$('layerLoop').checked;l.visible=$('layerVisible').checked;if(prevVis!==(l.visible!==false)){renderEditor();return;}const div=document.querySelector(`#previewCanvas .canvas-layer[data-layer-id="${l.id}"]`);if(div){updateLayerElementStyle(div,l);if(l.type==='TEXT')refreshSingleCanvasLayerDom(l);}const row=document.querySelector(`#layerList .layer-row[data-layer="${l.id}"] span:first-child`);if(row)row.textContent=l.name;}
async function saveTemplate(){pullTemplateControls();normalizeLayerOrder();if(state.selectedTemplate){const templateId=state.selectedTemplate.id,saved=await api.templates.save(templateId,{name:state.editor.name||state.selectedTemplate.name,description:state.editor.description||'',config:state.editor},'Saved from visual editor');for(const prefix of ['batch','single']){if(activeRenderTemplateId(prefix)===templateId)saveSubtitlePreview(prefix,state.editor.subtitle,{persistTemplate:false});}toast(`Đã lưu version ${saved.current_version}.`);await loadTemplates($('templateProject').value,templateId);}else{const name=await requestText('Template mới','Tên template mới:',state.editor.name||'New Template');if(!name)return;const saved=await api.templates.create({projectId:$('templateProject').value||null,name,config:state.editor});toast('Đã tạo template.');await loadTemplates($('templateProject').value,saved.id);await selectTemplate(saved.id);}}
function libraryStatValue(stats,key,snake){return Number(stats?.[key]??stats?.[snake]??0);}
function libraryAvailableDuration(stats){return libraryStatValue(stats,'availableDurationMs','available_duration_ms');}
function librarySelectLabel(library){const available=formatDuration(libraryAvailableDuration(library));return String(library.library_type||'').toUpperCase()==='STOCK'?`${library.name} · STOCK · còn dùng ${available}`:`${library.name} · ${library.library_type}`;}
function libraryStatsText(stats){if(!stats)return'Chưa quét thư viện.';const available=formatDuration(libraryAvailableDuration(stats));return`Stock còn sử dụng được: <strong>${available}</strong> · Đã dùng: <strong>${formatDuration(libraryStatValue(stats,'usedDurationMs','used_duration_ms'))}</strong> · Tổng khả dụng: ${formatDuration(libraryStatValue(stats,'totalDurationMs','total_duration_ms'))} · Không dùng được: ${libraryStatValue(stats,'unusableCount','unusable_count')}`;}
function renderLibraryStats(stats){if($('libraryStats'))$('libraryStats').innerHTML=libraryStatsText(stats);}
function libraryListStatsLabel(library){return String(library.library_type||'').toUpperCase()==='STOCK'?`<strong>Stock còn dùng ${formatDuration(libraryAvailableDuration(library))}</strong> · Đã dùng ${formatDuration(libraryStatValue(library,'usedDurationMs','used_duration_ms'))}`:`${library.asset_count||0} file trong thư viện`;}
function renderLibraries(){const root=$('libraryList');root.innerHTML=state.libraries.map(l=>`<div class="list-item ${state.selectedLibrary?.id===l.id?'active':''}" data-library="${l.id}"><strong>${l.name}</strong><small>${l.library_type} · ${l.asset_count||0} files</small><small>${libraryListStatsLabel(l)}</small></div>`).join('')||'<div class="empty">Chưa có thư viện.</div>';root.querySelectorAll('[data-library]').forEach(el=>el.onclick=()=>selectLibrary(el.dataset.library));}
async function selectLibrary(id){state.selectedLibrary=state.libraries.find(l=>l.id===id);renderLibraries();$('libraryTitle').textContent=state.selectedLibrary?.name||'Tài nguyên';const assets=await api.libraries.assets(id);renderAssets(assets);renderLibraryStats(state.selectedLibrary);}
function renderAssets(assets){$('assetGrid').innerHTML=assets.map(a=>`<div class="asset"><strong title="${a.file_path}">${a.file_name}</strong><small>${a.asset_type} · ${formatDuration(a.duration_ms)} · ${formatBytes(a.file_size_bytes)}</small><span class="badge ${a.status}">${a.status}</span></div>`).join('')||'<div class="empty">Chưa quét file.</div>';}
async function newLibrary(){const root=await api.chooseDirectory({title:'Chọn thư mục media'});if(!root)return;const type=(await requestText('Thêm thư viện','Loại thư viện: STOCK, IMAGE, LOGO, OVERLAY, GREENSCREEN','STOCK'))?.toUpperCase();if(!type)return;let usedPath=null;if(type==='STOCK')usedPath=await api.chooseDirectory({title:'Chọn thư mục Used'})||`${root}\\Used`;const name=await requestText('Thêm thư viện','Tên thư viện:',root.split(/[\\/]/).pop());await api.libraries.create({name:name||'Media Library',rootPath:root,usedPath,libraryType:type});state.libraries=await api.libraries.list();fillSelects();renderLibraries();toast('Đã thêm thư viện.');}
async function deleteSelectedLibraryFiles(){const library=state.selectedLibrary;if(!library)return toast('Chọn thư viện cần xóa.',true);const paths=[library.root_path,library.used_path].filter(Boolean).join('\n');if(!confirm(`Xóa VĨNH VIỄN thư mục media khỏi ổ đĩa?\n\n${paths}\n\nThao tác này cũng xóa thư viện khỏi danh sách và không thể hoàn tác.`))return;const result=await api.libraries.deleteWithFiles(library.id);state.selectedLibrary=null;await loadAll();toast(`Đã xóa ${result.deletedDirs?.length||0} thư mục khỏi ổ đĩa.`);}

function activeAssetProjectId(){return'GLOBAL';}
function projectAssetTypeLabel(type){return{GREEN_VIDEO:'Video green',GREEN_IMAGE:'Ảnh green',DISCLAIMER_VIDEO:'Disclaimer'}[String(type||'').toUpperCase()]||type;}
function projectAssetMediaHtml(asset){const source=fileUrl(asset.file_path);if(/\.(png|jpe?g|webp|bmp)$/i.test(asset.file_path||''))return`<img src="${source}" alt="${htmlEscape(asset.name||asset.file_name)}">`;return`<video src="${source}" controls></video>`;}
async function loadProjectAssets(){state.projectAssets=await api.projectAssets.list();state.selectedProjectAsset=state.projectAssets.find(a=>a.id===state.selectedProjectAsset?.id)||state.projectAssets[0]||null;if($('greenStoragePathInfo')&&api.projectAssets?.storagePath){try{const sp=await api.projectAssets.storagePath();if(sp)$('greenStoragePathInfo').textContent=`📂 Thư mục lưu trong ứng dụng: ${sp}`;}catch{}}renderProjectAssets();populateProjectAssetSelects();return state.projectAssets;}
function renderProjectAssets(){const root=$('projectAssetList');if(!root)return;root.innerHTML=state.projectAssets.length?state.projectAssets.map(a=>`<div class="asset ${state.selectedProjectAsset?.id===a.id?'active':''}" data-project-asset="${a.id}"><strong title="${htmlEscape(a.file_path)}">${htmlEscape(a.name||a.file_name)}</strong><small>${projectAssetTypeLabel(a.asset_type)} · ${formatDuration(a.duration_ms)} · ${a.width||0}×${a.height||0}</small><small style="color:#38bdf8;font-size:10px;word-break:break-all;">📁 ${htmlEscape(a.file_path)}</small></div>`).join(''):'<div class="empty">Kho tài nguyên chung chưa có file.</div>';root.querySelectorAll('[data-project-asset]').forEach(el=>el.onclick=()=>selectProjectAsset(el.dataset.projectAsset));renderProjectAssetPreview();}
function selectProjectAsset(id){state.selectedProjectAsset=state.projectAssets.find(a=>a.id===id)||null;renderProjectAssets();}
function renderProjectAssetPreview(){const root=$('projectAssetPreview');if(!root)return;const a=state.selectedProjectAsset;if(!a){root.className='asset-preview empty';root.textContent='Chọn một tài nguyên để xem trước.';return;}root.className='asset-preview';root.innerHTML=`${projectAssetMediaHtml(a)}<div class="source-preview-info"><strong>Đường dẫn trong Kho_Green:</strong> ${htmlEscape(a.file_path)}<br>${projectAssetTypeLabel(a.asset_type)} · ${formatDuration(a.duration_ms)} · ${formatBytes(a.file_size_bytes)}</div>`;}
async function addProjectAsset(assetType){const video=['GREEN_VIDEO','DISCLAIMER_VIDEO'].includes(assetType),filters=video?[{name:'Video',extensions:['mp4','mov','mkv','webm','avi','m4v']}]:[{name:'Image',extensions:['png','jpg','jpeg','webp','bmp']}];const filePath=await api.chooseFile({title:`Thêm ${projectAssetTypeLabel(assetType)}`,filters});if(!filePath)return;const base=(filePath.split(/[\\/]/).pop()||'asset').replace(/\.[^.]+$/,'');const name=await requestText('Thêm tài nguyên','Tên hiển thị:',base);if(!name)return;const created=await api.projectAssets.create({assetType,filePath,name});state.selectedProjectAsset=created;await loadProjectAssets();if(state.selectedTemplate?.id){await selectTemplate(state.selectedTemplate.id);}toast(`Đã copy file lưu vào Kho_Green: ${created?.file_name||name}`);}
async function deleteSelectedProjectAsset(){const asset=state.selectedProjectAsset;if(!asset)return toast('Chọn tài nguyên cần xóa.',true);if(!confirm(`Xóa tài nguyên "${asset.name||asset.file_name}" khỏi kho chung?`))return;await api.projectAssets.delete(asset.id);state.selectedProjectAsset=null;await loadProjectAssets();toast('Đã xóa tài nguyên khỏi kho chung.');}

function srtStateLabel(job){return job?.srtPath||job?.srt_path?'Có':'Tự tạo';}
function jobGreenKey(job){const voice=job?.baseKey||job?.voiceName||job?.voice_name||job?.fileName||job?.voicePath||job?.voice_path||job?.filePath||'';return(voice.split(/[\\/]/).pop()||'').replace(/\.[^.]+$/,'');}
function jobGreenAssetPath(job){return job?.filePath||job?.projectImagePath||job?.project_image_path||job?.greenAssetPath||job?.green_asset_path||'';}
function jobGreenInputActive(){const single=state.activeRenderMode==='single',source=selectedJobGreenSource(single);return Boolean(single&&source==='FILE'&&$('singleJobGreen')?.value);}
function jobGreenEdited(job){const key=jobGreenKey(job),cfg=state.jobGreenConfigs[key]||job?.greenConfig;return Boolean(cfg?.edited||job?.greenEdited||job?.greenStatus==='EDITED'||job?.green_status==='EDITED');}
function jobGreenStateLabel(job){const assetPath=jobGreenAssetPath(job);if(!assetPath&&!jobGreenInputActive())return'Không dùng';if(!assetPath)return'Thiếu';const cfg=state.jobGreenConfigs[jobGreenKey(job)]||job?.greenConfig;if(jobGreenEdited(job)&&cfg)return`Vị trí riêng (${Math.round(cfg.x||0)},${Math.round(cfg.y||0)} · ${Math.round(cfg.width||0)}×${Math.round(cfg.height||0)})`;return jobGreenEdited(job)?'Vị trí riêng':'Tọa độ mặc định';}
function activeTemplateVoiceImageLayer(){return null;}
function defaultGreenJobConfig(){
  const def=loadDefaultFolderImageTransform();
  const globalMode=String($('projectImageMode')?.value||'GREEN').toUpperCase()==='IMAGE'?'IMAGE':'GREEN';
  return{
    x:Math.round(Number(def.x??80)),
    y:Math.round(Number(def.y??140)),
    width:Math.round(Number(def.width??620)),
    height:Math.round(Number(def.height??800)),
    rotation:Number(def.rotation??0),
    opacity:Number(def.opacity??1),
    assetMode:globalMode,
    keyColor:def.keyColor||GREEN_KEY_PRESETS[0],
    keyColors:Array.isArray(def.keyColors)&&def.keyColors.length?def.keyColors:GREEN_KEY_PRESETS,
    similarity:Number(def.similarity??.22),
    softness:Number(def.softness??.07),
    despillMix:Number(def.despillMix??.45),
    despillExpand:Number(def.despillExpand??.02),
    loop:true,
    startMs:0,
    endMs:null
  };
}
async function scanAndRenderProjectImageFolderList(folderPath){
  const dir=String(folderPath??$('projectImageFolder')?.value??'').trim();
  const wrap=$('projectImageFolderListWrap'),badge=$('projectImageFolderCountBadge');
  if(!dir){
    state.scannedFolderImages=[];
    if(badge)badge.textContent='Chưa chọn Folder';
    if(wrap)wrap.innerHTML='<div style="padding:12px;text-align:center;color:#64748b;font-size:12px;">Chưa chọn thư mục. Hãy bấm nút <strong>...</strong> hoặc <strong>🔍 Quét ảnh trong Folder</strong> để chọn thư mục chứa ảnh / phông xanh.</div>';
    return[];
  }
  if(badge)badge.textContent='⏳ Đang quét danh sách tên file...';
  try{
    const items=await api.mediaListFolderAssets(dir);
    state.scannedFolderImages=Array.isArray(items)?items:[];
    if(state.scannedFolderImages.length&&!state.activeFolderPreviewImage){
      state.activeFolderPreviewImage=state.scannedFolderImages[0].filePath;
    }
    renderProjectImageFolderList(state.scannedFolderImages);
    return state.scannedFolderImages;
  }catch(err){
    if(wrap)wrap.innerHTML=`<div style="padding:12px;text-align:center;color:#f87171;font-size:12px;">Lỗi quét thư mục: ${htmlEscape(err.message)}</div>`;
    return[];
  }
}
function renderProjectImageFolderList(items=state.scannedFolderImages||[]){
  const wrap=$('projectImageFolderListWrap'),badge=$('projectImageFolderCountBadge');
  if(!wrap)return;
  const tplDef=defaultGreenJobConfig();
  const editedCount=items.filter(it=>state.jobGreenConfigs?.[it.baseKey]?.edited).length;
  if(badge){
    badge.textContent=items.length?`${items.length} file (${editedCount} đã có vị trí riêng · ${items.length-editedCount} dùng tọa độ mặc định)`:'0 file';
    badge.style.color=items.length?'#38bdf8':'#94a3b8';
  }
  if(!items.length){
    wrap.innerHTML='<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Thư mục này chưa có file ảnh (.png, .jpg, .webp) hoặc video (.mp4).</div>';
    return;
  }
  const isGreenMode=String($('projectImageMode')?.value||'GREEN').toUpperCase()==='GREEN';
  wrap.innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#1e293b;color:#cbd5e1;text-align:left;position:sticky;top:0;z-index:2;">
          <th style="padding:6px 8px;width:32px;">#</th>
          <th style="padding:6px 8px;">Tên File (Mỗi ảnh lưu 1 vị trí riêng biệt — Không chèn vào Template chung)</th>
          <th style="padding:6px 8px;">Mã khớp</th>
          <th style="padding:6px 8px;">Vị trí (X, Y) & Kích thước (Rộng × Cao) riêng của từng ảnh</th>
          <th style="padding:6px 8px;text-align:right;">Căn vị trí trên khung Template</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item,idx)=>{
          const cfg=state.jobGreenConfigs?.[item.baseKey];
          const isEdited=Boolean(cfg?.edited);
          const cur=isEdited?cfg:tplDef;
          const extLabel=String(item.ext||'').replace('.','').toUpperCase()||(item.isVideo?'MP4':'IMG');
          const badgeIcon=item.isVideo
            ?`<span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:22px;padding:0 5px;background:#1e293b;border:1px solid #38bdf8;border-radius:4px;font-size:10px;font-weight:700;color:#38bdf8;">🎬 ${htmlEscape(extLabel)}</span>`
            :`<span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:22px;padding:0 5px;background:${isGreenMode?'rgba(16,185,129,0.14)':'#1e293b'};border:1px solid ${isGreenMode?'#10b981':'#475569'};border-radius:4px;font-size:10px;font-weight:700;color:${isGreenMode?'#34d399':'#cbd5e1'};">${isGreenMode?'🟢':'🖼️'} ${htmlEscape(extLabel)}</span>`;
          const xv=Math.round(cur.x??tplDef.x??80),yv=Math.round(cur.y??tplDef.y??140),wv=Math.round(cur.width??tplDef.width??620),hv=Math.round(cur.height??tplDef.height??800);
          return `
            <tr data-folder-row-idx="${idx}" style="border-bottom:1px solid #1e293b;background:${idx%2===0?'#090d16':'#0d1322'};">
              <td style="padding:6px 8px;color:#64748b;">${idx+1}</td>
              <td style="padding:6px 8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  ${badgeIcon}
                  <strong style="color:#f1f5f9;cursor:pointer;" data-edit-folder-idx="${idx}" title="Bấm để mở Preview kéo thả vị trí riêng cho ảnh này: ${htmlEscape(item.filePath)}">${htmlEscape(item.fileName)}</strong>
                </div>
              </td>
              <td style="padding:6px 8px;"><code style="background:#1e293b;color:#fbbf24;padding:2px 6px;border-radius:4px;font-weight:700;">${htmlEscape(item.baseKey)}</code></td>
              <td style="padding:6px 8px;">
                <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                  <span data-row-status="${idx}" style="display:inline-block;padding:2px 6px;border-radius:4px;background:${isEdited?'rgba(16,185,129,0.16)':'rgba(56,189,248,0.12)'};border:1px solid ${isEdited?'#10b981':'#0284c7'};color:${isEdited?'#34d399':'#7dd3fc'};font-weight:600;font-size:10.5px;">${isEdited?'✅ Vị trí riêng':'📐 Mặc định'}</span>
                  <span style="color:#94a3b8;font-size:11px;">X:</span><input type="number" data-quick-geom="${idx}" data-field="x" value="${xv}" style="width:62px;padding:3px 5px;font-size:11px;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:4px;">
                  <span style="color:#94a3b8;font-size:11px;">Y:</span><input type="number" data-quick-geom="${idx}" data-field="y" value="${yv}" style="width:62px;padding:3px 5px;font-size:11px;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:4px;">
                  <span style="color:#94a3b8;font-size:11px;">Rộng:</span><input type="number" data-quick-geom="${idx}" data-field="width" value="${wv}" min="30" style="width:66px;padding:3px 5px;font-size:11px;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:4px;">
                  <span style="color:#94a3b8;font-size:11px;">Cao:</span><input type="number" data-quick-geom="${idx}" data-field="height" value="${hv}" min="30" style="width:66px;padding:3px 5px;font-size:11px;background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:4px;">
                </div>
              </td>
              <td style="padding:6px 8px;text-align:right;white-space:nowrap;">
                <button type="button" data-edit-folder-idx="${idx}" style="padding:4px 10px;font-size:11.5px;font-weight:700;background:#2563eb;color:#fff;border:1px solid #60a5fa;border-radius:5px;cursor:pointer;">🎨 Chỉnh vị trí riêng</button>
                <button type="button" data-reset-folder-idx="${idx}" style="margin-left:4px;padding:4px 8px;font-size:11px;background:#1e293b;color:#cbd5e1;border:1px solid #475569;border-radius:5px;cursor:pointer;display:${isEdited?'inline-block':'none'};" title="Đưa ảnh này về lại tọa độ mặc định">↺ Mặc định</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll('[data-quick-geom]').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const idx=Number(inp.dataset.quickGeom);
      const item=items[idx];
      if(!item)return;
      const row=wrap.querySelector(`tr[data-folder-row-idx="${idx}"]`);
      if(!row)return;
      const getVal=(f,fb)=>Math.round(Number(row.querySelector(`[data-field="${f}"]`)?.value??fb));
      const base=state.jobGreenConfigs?.[item.baseKey]||{...tplDef};
      const saved={
        ...tplDef,
        ...base,
        x:getVal('x',tplDef.x),
        y:getVal('y',tplDef.y),
        width:Math.max(30,getVal('width',tplDef.width)),
        height:Math.max(30,getVal('height',tplDef.height)),
        edited:true,
        assetPath:item.filePath
      };
      state.jobGreenConfigs[item.baseKey]=saved;
      saveJobGreenConfigsToStorage();
      const stBadge=row.querySelector(`[data-row-status="${idx}"]`);
      if(stBadge){
        stBadge.textContent='✅ Vị trí riêng';
        stBadge.style.background='rgba(16,185,129,0.16)';
        stBadge.style.borderColor='#10b981';
        stBadge.style.color='#34d399';
      }
      const rstBtn=row.querySelector(`[data-reset-folder-idx="${idx}"]`);
      if(rstBtn)rstBtn.style.display='inline-block';
      if(state.scanJobs?.length)renderBatchJobs(state.scanJobs);
      toast(`Đã lưu vị trí riêng cho ${item.baseKey}: X=${saved.x}, Y=${saved.y} · ${saved.width}×${saved.height}`);
    });
  });
  wrap.querySelectorAll('[data-edit-folder-idx]').forEach(btn=>{
    btn.onclick=()=>{
      const idx=Number(btn.dataset.editFolderIdx);
      const item=items[idx];
      if(item){
        state.activeRenderMode='batch';
        state.activeFolderPreviewImage=item.filePath;
        openJobGreenEditorV3(item).catch(e=>toast(e.message,true));
      }
    };
  });
  wrap.querySelectorAll('[data-reset-folder-idx]').forEach(btn=>{
    btn.onclick=()=>{
      const idx=Number(btn.dataset.resetFolderIdx);
      const item=items[idx];
      if(!item)return;
      delete state.jobGreenConfigs[item.baseKey];
      saveJobGreenConfigsToStorage();
      renderProjectImageFolderList(items);
      if(state.scanJobs?.length)renderBatchJobs(state.scanJobs);
      toast(`Đã đưa "${item.fileName}" về lại tọa độ mặc định.`);
    };
  });
}
function renderBatchJobs(jobs=[]){state.scanJobs=jobs;$('batchJobs').innerHTML=jobs.length?jobs.map((job,idx)=>{const assetPath=jobGreenAssetPath(job),cfg=state.jobGreenConfigs[jobGreenKey(job)]||job?.greenConfig,edited=jobGreenEdited(job),assetName=assetPath?assetPath.split(/[\\/]/).pop():'';const posBtn=assetPath?`<button type="button" class="btn-edit-job-green ${edited?'green-edited-button':''}" data-job-green-idx="${idx}" title="Kéo thả vị trí X,Y và kích thước W×H riêng cho file: ${htmlEscape(assetName)}" style="padding:3px 8px;font-size:11px;border-radius:6px;cursor:pointer;">${edited?`✅ Đã chỉnh (${Math.round(cfg?.x||0)},${Math.round(cfg?.y||0)} · ${Math.round(cfg?.width||0)}×${Math.round(cfg?.height||0)})`:`🎨 Chỉnh sửa (Preview Template)`}</button><div style="font-size:10px;color:#94a3b8;margin-top:2px;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${htmlEscape(assetPath)}">📎 ${htmlEscape(assetName)}</div>`:`<span style="color:#64748b;font-size:11px;">${job.projectImageStatus==='MISSING'?'⚠️ Thiếu ảnh cùng tên':'—'}</span>`;return`<tr><td>${job.sequenceNumber||job.sequence_number||idx+1}</td><td>${job.voiceName||job.voice_name||''}</td><td>${srtStateLabel(job)}</td><td>${posBtn}</td><td>${formatDuration(job.voiceDurationMs||job.voice_duration_ms)}</td><td><span class="badge ${job.status||''}">${job.status||(job.ready?'READY':'PENDING')}</span></td><td>${formatJobElapsed(job)}</td><td>${job.outputPath?.split(/[\\/]/).pop()||job.output_path?.split(/[\\/]/).pop()||'—'}</td></tr>`;}).join(''):'<tr><td colspan="8" class="empty">Không tìm thấy voice.</td></tr>';$('batchJobs').querySelectorAll('[data-job-green-idx]').forEach(btn=>{btn.onclick=()=>{const idx=Number(btn.dataset.jobGreenIdx);const job=state.scanJobs[idx];if(job){state.activeRenderMode='batch';openJobGreenEditorV3(job).catch(e=>toast(e.message,true));}};});}
function greenCanvasSize(){return{width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT};}
function syncGreenTemplateSubtitleDemo(el){const root=el.closest('.green-template-stage')||el.parentElement;if(!root)return;const {width:cw,height:ch}=greenCanvasSize(),sub=normalizeSubtitleConfig({...(renderSubtitleOverride(state.activeRenderMode==='single'?'single':'batch')||{}),assScale:1}),isKaraokeBox=sub.subtitleEffect==='karaoke_box',sample=isKaraokeBox?'THE WEIGHT OF THE WORLD':templateSubtitleSample(sub),displaySample=(isKaraokeBox||sub.uppercase===true)?sample.toUpperCase():sample,frame=api.preview?.subtitleFrame?.({width:cw,height:ch,canvas:{width:cw,height:ch},subtitle:sub},displaySample)||null,box=frame||previewSubtitleBox({width:cw,height:ch,subtitle:sub}),scale=(root.clientWidth||640)/Math.max(1,cw),lineCount=Math.max(1,displaySample.split(/\r?\n/).filter(Boolean).length),renderScale=Number(sub.renderScale??1),fontSize=Math.max(8,(frame?.fontSize||previewSubtitleFontSize(sub,lineCount,box.height))*scale),outline=Math.max(isKaraokeBox?1.5*scale:0,Number(frame?.outlineWidth??sub.outlineWidth??1)*renderScale*scale),outlineColor=frame?.outlineColor||sub.outlineColor||'#000000';if(isKaraokeBox){const words=displaySample.split(/\s+/),first=htmlEscape(words[0]||'THE'),rest=htmlEscape(words.slice(1).join(' ')),boxBg=htmlEscape(sub.karaokeBoxColor||'#7C00FF'),nextHtml=`<span><span style="background:${boxBg};padding:2px 8px;border-radius:6px;display:inline-block;margin-right:4px;">${first}</span>${rest}</span>`;if(el.innerHTML!==nextHtml)el.innerHTML=nextHtml;}else if(el.textContent!==displaySample){el.textContent=displaySample;}el.style.fontFamily=frame?.fontFamily||sub.fontFamily||'Arial';el.style.fontWeight=isKaraokeBox?'700':String(Number(frame?.fontWeight||sub.fontWeight||(sub.bold===true?700:400)));el.style.letterSpacing=Number.isFinite(Number(sub.letterSpacingEm))?`${Number(sub.letterSpacingEm)}em`:Number.isFinite(Number(sub.letterSpacingPx))?`${Number(sub.letterSpacingPx)}px`:'0';el.style.fontStyle=sub.italic===true?'italic':'normal';el.style.lineHeight=String(frame?.lineHeight||subtitlePreviewLineHeight(sub));el.style.whiteSpace='pre-wrap';el.style.wordBreak='break-word';el.style.textAlign='center';el.style.fontSize=`${fontSize}px`;el.style.color=frame?.color||sub.color||'#FFFFFF';el.style.left=`${box.x/cw*100}%`;el.style.top=`${box.y/ch*100}%`;el.style.width=`${box.width/cw*100}%`;el.style.height=`${box.height/ch*100}%`;el.style.right='auto';el.style.bottom='auto';el.style.display='grid';el.style.placeItems='center';el.style.textShadow=subtitleOutlineShadow(outline,outlineColor);}
function observeGreenTemplateSubtitleDemos(){
  if(window.__vbsGreenSubtitleObserver){
    try{window.__vbsGreenSubtitleObserver.disconnect();}catch{}
    window.__vbsGreenSubtitleObserver=null;
  }
}
function imageLikePath(p){return/\.(png|jpe?g|webp|bmp)$/i.test(String(p||''));}
function readGreenEditorConfig(){return{x:Number($('greenX').value||0),y:Number($('greenY').value||0),width:Number($('greenW').value||1),height:Number($('greenH').value||1),rotation:Number($('greenRot').value||0),opacity:Number($('greenOpacity').value||1),similarity:Number($('greenSimilarity').value||.24),softness:Number($('greenSoftness').value||.06),despillMix:Number($('greenDespillMix').value||.45),despillExpand:Number($('greenDespillExpand').value||.02),loop:$('greenLoop').checked,startMs:Number($('greenStart').value||0),endMs:$('greenEnd').value===''?null:Number($('greenEnd').value)};}
function writeGreenEditorConfig(cfg){$('greenX').value=Math.round(cfg.x||0);$('greenY').value=Math.round(cfg.y||0);$('greenW').value=Math.round(cfg.width||320);$('greenH').value=Math.round(cfg.height||180);$('greenRot').value=Number(cfg.rotation||0).toFixed(1);$('greenOpacity').value=Number(cfg.opacity??1).toFixed(2);$('greenSimilarity').value=Number(cfg.similarity??.24).toFixed(2);$('greenSoftness').value=Number(cfg.softness??.06).toFixed(2);$('greenDespillMix').value=Number(cfg.despillMix??.45).toFixed(2);$('greenDespillExpand').value=Number(cfg.despillExpand??.02).toFixed(2);$('greenLoop').checked=cfg.loop!==false;$('greenStart').value=Number(cfg.startMs||0);$('greenEnd').value=cfg.endMs??'';}
const MAX_CHROMA_PREVIEW_DIM=260;
const _vbsChromaCache=new Map();
const _vbsSampleCanvasCache=new Map();
const _vbsBgPreviewCache=new Map();
const _vbsTemplateLayerSrcCache=new Map();
async function loadGreenPreviewSource(sourcePath){
  if(imageLikePath(sourcePath))return sourcePath;
  if(state.previewCache.has(sourcePath)){
    const cached=state.previewCache.get(sourcePath);
    if(cached?.previewPath)return cached.previewPath;
  }
  const preview=await api.mediaPreview(sourcePath,{timeSeconds:.4,width:480});
  if(preview?.previewPath)state.previewCache.set(sourcePath,preview);
  return preview?.previewPath||sourcePath;
}
function chromaPreviewDataUrl(sourceUrl,cfg){
  return chromaPreviewDataUrlV3(sourceUrl,{...cfg,assetMode:'GREEN'});
}
function htmlEscape(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function subtitlePreviewBoxStyle(sub,cw,ch){const box=previewSubtitleBox({width:cw,height:ch,subtitle:sub});return{left:box.x/Math.max(1,cw)*100,top:box.y/Math.max(1,ch)*100,width:box.width/Math.max(1,cw)*100,height:box.height/Math.max(1,ch)*100,bottom:Number(sub.bottomMargin??20)/Math.max(1,ch)*100};}
async function activeGreenTemplate(){const id=$(state.activeRenderMode==='single'?'singleTemplate':'batchTemplate')?.value;if(state.selectedTemplate&&state.editor&&(!id||state.selectedTemplate.id===id))return{...state.selectedTemplate,config:state.editor,layers:state.editor.layers};if(!id)return state.selectedTemplate;try{return await api.templates.get(id);}catch{return state.templates.find(t=>t.id===id)||state.selectedTemplate;}}
function normalizeGreenTemplateLayer(layer){return{id:layer.id,type:layer.type||layer.layer_type,name:layer.name||layer.type||'Layer',sourceMode:layer.sourceMode||layer.source_mode||'',sourceReference:layer.sourceReference??layer.source_reference??'',text:layer.text||layer.style?.text||'',visible:layer.visible!==0&&layer.visible!==false,zIndex:layer.zIndex??layer.z_index??0,transform:layer.transform||{},style:layer.style||{},effect:layer.effect||{}};}
async function renderGreenTemplatePreview(root,template,size,voiceSlotEl=null){
  if(!root)return;
  const cfg=template?.config||template||{};
  const rawLayers=(template?.layers?.length?template.layers:cfg.layers||[]).map(normalizeGreenTemplateLayer).filter(l=>l.visible);
  const layers=rawLayers.sort(compareProjectLayerOrder);
  root.innerHTML='';
  const cw=size.width,ch=size.height,canvas={width:cw,height:ch};
  const deferredQueue=[];
  for(const layer of layers){
    if(String(layer.type||'').toUpperCase()==='VOICE_IMAGE')continue;
    const t=layer.transform||{},css=api.preview?.layerCssBox?.(layer,{width:cw,height:ch,canvas})||null,div=document.createElement('div');
    div.className='green-template-layer';
    div.style.pointerEvents='none';
    div.style.left=css?.left||`${Number(t.x||0)/cw*100}%`;
    div.style.top=css?.top||`${Number(t.y||0)/ch*100}%`;
    div.style.width=css?.width||`${Number(t.width||300)/cw*100}%`;
    div.style.height=css?.height||`${Number(t.height||150)/ch*100}%`;
    div.style.opacity=css?.opacity||String(t.opacity??1);
    div.style.transformOrigin=css?.transformOrigin||'50% 50%';
    div.style.transform=css?.transform||`rotate(${Number(t.rotation||0)}deg)`;
    if(layer.type==='TEXT'){
      const scale=root.getBoundingClientRect().width/Math.max(1,cw),style=layer.style||{},outline=Math.max(0,Number(style.outlineWidth||2)*scale);
      div.innerHTML=`<div class="green-template-text" style="font-size:${Math.max(8,Number(style.fontSize||52)*scale)}px;color:${style.color||'#fff'};text-shadow:${subtitleOutlineShadow(outline,style.outlineColor,'none')}">${htmlEscape(layer.text||layer.name)}</div>`;
    }else if(layer.sourceReference){
      const tplCacheKey=`${layer.id}|${layer.sourceReference}|${layer.type}|${(layer.effect||{}).keyColor||''}`;
      if(_vbsTemplateLayerSrcCache.has(tplCacheKey)){
        div.innerHTML=`<img src="${_vbsTemplateLayerSrcCache.get(tplCacheKey)}" alt="" decoding="async" style="width:100%;height:100%;object-fit:fill;">`;
      }else{
        div.innerHTML='';
        deferredQueue.push({div,layer,tplCacheKey});
      }
    }else{
      div.innerHTML=`<div class="green-template-placeholder">${htmlEscape(layer.name)}</div>`;
    }
    root.appendChild(div);
  }
  const demo=document.createElement('div');
  demo.className='green-subtitle-demo';
  demo.style.pointerEvents='none';
  root.appendChild(demo);
  syncGreenTemplateSubtitleDemo(demo);
  if(!deferredQueue.length)return;
  (async()=>{
    await new Promise(r=>setTimeout(r,120));
    for(const {div,layer,tplCacheKey} of deferredQueue){
      if(!div.isConnected)break;
      while(window.__vbsIsDraggingLayer){
        await new Promise(r=>setTimeout(r,100));
        if(!div.isConnected)return;
      }
      try{
        let previewRes=state.previewCache.get(layer.sourceReference);
        if(!previewRes){
          if(imageLikePath(layer.sourceReference)){
            previewRes={previewPath:layer.sourceReference};
          }else{
            previewRes=await api.mediaPreview(layer.sourceReference,{width:420});
          }
          if(previewRes?.previewPath)state.previewCache.set(layer.sourceReference,previewRes);
        }
        if(!div.isConnected)break;
        const previewPath=previewRes?.previewPath||layer.sourceReference;
        const src=isGreenscreenLayer(layer.type)
          ?await chromaPreviewDataUrlV3(fileUrl(previewPath),{assetMode:'GREEN',keyColor:(layer.effect||{}).keyColor||'0x00FF00',similarity:(layer.effect||{}).similarity??.24,softness:(layer.effect||{}).softness??.06,despillMix:(layer.effect||{}).despillMix??.45,despillExpand:(layer.effect||{}).despillExpand??.02})
          :fileUrl(previewPath);
        _vbsTemplateLayerSrcCache.set(tplCacheKey,src);
        if(div.isConnected)div.innerHTML=`<img src="${src}" alt="" decoding="async" style="width:100%;height:100%;object-fit:fill;">`;
      }catch{
        if(div.isConnected)div.innerHTML=`<div class="green-template-placeholder">${htmlEscape(layer.name)}</div>`;
      }
      await new Promise(r=>setTimeout(r,50));
    }
  })();
}
async function openJobGreenEditorV2(job){return openJobGreenEditorV3(job);}
async function openJobGreenEditor(job){return openJobGreenEditorV3(job);}
function normalizeKeyColor(value){const raw=String(value||'#00ff00').trim();const match=raw.match(/^(?:#|0x)?([0-9a-f]{6})$/i);return`#${(match?match[1]:'00ff00').toLowerCase()}`;}
function ffmpegKeyColor(value){return normalizeKeyColor(value).replace('#','0x').toUpperCase();}
function keyColorRgb(value){const hex=normalizeKeyColor(value).slice(1);return{r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255};}
function readGreenEditorConfigV3(){const keyColor=ffmpegKeyColor($('greenKeyColor')?.value||GREEN_KEY_PRESETS[0]),keyColors=[keyColor,...GREEN_KEY_PRESETS].filter((value,index,values)=>values.indexOf(value)===index),assetMode=$('greenAssetMode')?.value||selectedJobGreenMode(state.activeRenderMode==='single')||'GREEN';return{...readGreenEditorConfig(),assetMode,keyColor,keyColors};}
function writeGreenEditorConfigV3(cfg){writeGreenEditorConfig(cfg);if($('greenKeyColor'))$('greenKeyColor').value=normalizeKeyColor(cfg.keyColor);if($('greenAssetMode'))$('greenAssetMode').value=String(cfg.assetMode||'GREEN').toUpperCase()==='IMAGE'?'IMAGE':'GREEN';}
function chromaPreviewDataUrlV3(sourceUrl,cfg){
  const mode=String(cfg?.assetMode||$('greenAssetMode')?.value||selectedJobGreenMode(state.activeRenderMode==='single')||'GREEN').toUpperCase();
  if(mode==='IMAGE')return Promise.resolve(sourceUrl);
  const cacheKey=[sourceUrl,mode,cfg.keyColor||'0x00FF00',Number(cfg.similarity??.22).toFixed(2),Number(cfg.softness??.07).toFixed(2),Number(cfg.despillMix??.45).toFixed(2)].join('|');
  if(_vbsChromaCache.has(cacheKey))return Promise.resolve(_vbsChromaCache.get(cacheKey));
  return new Promise((resolve)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{
      try{
        const nw=img.naturalWidth||img.width||260,nh=img.naturalHeight||img.height||260;
        const scale=Math.min(1,MAX_CHROMA_PREVIEW_DIM/Math.max(1,nw,nh));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(nw*scale));
        canvas.height=Math.max(1,Math.round(nh*scale));
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height),data=image.data;
        const keys=(Array.isArray(cfg.keyColors)&&cfg.keyColors.length?cfg.keyColors:[cfg.keyColor]).slice(0,2).map(keyColorRgb);
        const primary=keys[0]||keyColorRgb(GREEN_KEY_PRESETS[0]);
        const similarity=Math.max(.01,Math.min(.5,Number(cfg.similarity||.22)));
        const softness=Math.max(0,Math.min(.3,Number(cfg.softness||.07)));
        const despill=Math.max(0,Math.min(1,Number(cfg.despillMix||.45)));
        const channel=primary.b>primary.g&&primary.b>primary.r?2:(primary.r>primary.g&&primary.r>primary.b?0:1);
        for(let i=0;i<data.length;i+=4){
          const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255;
          let dist=999;
          for(let k=0;k<keys.length;k++){
            const key=keys[k],dr=r-key.r,dg=g-key.g,db=b-key.b;
            const d=Math.sqrt(dr*dr+dg*dg+db*db);
            if(d<dist)dist=d;
          }
          if(dist<similarity)data[i+3]=0;
          else if(softness&&dist<similarity+softness)data[i+3]=Math.round(data[i+3]*(dist-similarity)/softness);
          const maxOther=channel===0?Math.max(g,b):(channel===1?Math.max(r,b):Math.max(r,g));
          const valChan=channel===0?r:(channel===1?g:b);
          if(valChan>maxOther){
            data[i+channel]=Math.max(0,data[i+channel]-(valChan-maxOther)*255*despill);
          }
        }
        ctx.putImageData(image,0,0);
        if(typeof canvas.toBlob==='function'){
          canvas.toBlob((blob)=>{
            if(!blob)return resolve(sourceUrl);
            const outUrl=URL.createObjectURL(blob);
            if(_vbsChromaCache.size>120)_vbsChromaCache.clear();
            _vbsChromaCache.set(cacheKey,outUrl);
            resolve(outUrl);
          },'image/png');
        }else{
          const outUrl=canvas.toDataURL('image/png');
          if(_vbsChromaCache.size>120)_vbsChromaCache.clear();
          _vbsChromaCache.set(cacheKey,outUrl);
          resolve(outUrl);
        }
      }catch{
        resolve(sourceUrl);
      }
    };
    img.onerror=()=>resolve(sourceUrl);
    img.src=sourceUrl;
  });
}
function imageSampleCanvas(sourceUrl){
  if(_vbsSampleCanvasCache.has(sourceUrl))return Promise.resolve(_vbsSampleCanvasCache.get(sourceUrl));
  return new Promise((resolve)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{
      try{
        const nw=img.naturalWidth||img.width||620,nh=img.naturalHeight||img.height||800;
        const scale=Math.min(1,MAX_CHROMA_PREVIEW_DIM/Math.max(1,nw,nh));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(nw*scale));
        canvas.height=Math.max(1,Math.round(nh*scale));
        canvas.naturalWidth=nw;
        canvas.naturalHeight=nh;
        canvas.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,canvas.width,canvas.height);
        if(_vbsSampleCanvasCache.size>80)_vbsSampleCanvasCache.clear();
        _vbsSampleCanvasCache.set(sourceUrl,canvas);
        resolve(canvas);
      }catch{
        resolve(null);
      }
    };
    img.onerror=()=>resolve(null);
    img.src=sourceUrl;
  });
}
function sampleGreenColorFromEvent(ev,box,canvas){if(!canvas)return null;const rect=box.getBoundingClientRect(),natural=canvas.width/canvas.height,shown=rect.width/rect.height;let left=rect.left,top=rect.top,width=rect.width,height=rect.height;if(shown>natural){width=rect.height*natural;left=rect.left+(rect.width-width)/2;}else{height=rect.width/natural;top=rect.top+(rect.height-height)/2;}const px=(ev.clientX-left)/width,py=(ev.clientY-top)/height;if(px<0||px>1||py<0||py>1)return null;const data=canvas.getContext('2d').getImageData(Math.round(px*(canvas.width-1)),Math.round(py*(canvas.height-1)),1,1).data;return`#${[data[0],data[1],data[2]].map(v=>v.toString(16).padStart(2,'0')).join('')}`;}
async function syncDefaultFolderPositionOnly(cfg){
  saveDefaultFolderImageTransform(cfg);
  return true;
}
async function openJobGreenEditorV3(initialJob){
  let job=initialJob;
  let assetPath=jobGreenAssetPath(job);
  if(!assetPath)throw new Error('Chưa tìm thấy file ảnh / phông xanh để chỉnh sửa.');
  state.activeFolderPreviewImage=assetPath;
  const size=greenCanvasSize(),cw=size.width,ch=size.height;
  let tplDef=defaultGreenJobConfig();
  let key=jobGreenKey(job);
  let savedCfg=state.jobGreenConfigs[key]||job.greenConfig||null;
  let cfg={...tplDef,...(savedCfg?.edited?savedCfg:{})};
  const folderItems=state.scannedFolderImages||[];
  const tplName=state.selectedTemplate?.name||state.editor?.name||'Default 16:9';
  const switcherHtml=folderItems.length?`
    <div id="greenFolderSwitcherBar" style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding:5px 8px;background:#090d16;border:1px solid #1e293b;border-radius:6px;">
      <span style="font-size:11px;color:#94a3b8;white-space:nowrap;font-weight:700;">📂 Chọn ảnh (${folderItems.length} — Mỗi ảnh lưu 1 vị trí riêng):</span>
      ${folderItems.map((it,idx)=>{
        const active=it.filePath===assetPath||it.baseKey===key;
        const edited=Boolean(state.jobGreenConfigs?.[it.baseKey]?.edited);
        return `<button type="button" data-switch-folder-img="${idx}" style="padding:3px 9px;font-size:11px;white-space:nowrap;border-radius:999px;cursor:pointer;border:1px solid ${active?'#38bdf8':(edited?'#10b981':'#334155')};background:${active?'#0284c7':(edited?'rgba(16,185,129,0.15)':'#1e293b')};color:${active?'#fff':(edited?'#34d399':'#cbd5e1')};font-weight:${active?'700':'500'};">#${idx+1} ${htmlEscape(it.fileName)} ${edited?'✓':''}</button>`;
      }).join('')}
    </div>
  `:'';
  showModal(`Căn Vị Trí Riêng Cho Ảnh (Trên Khung 1920×1080 Của "${tplName}") · ${job.fileName||job.voiceName||job.voice_name||key}`,`
    <div class="green-editor">
      ${switcherHtml}
      <div style="font-size:11px;color:#94a3b8;text-align:center;">🖱️ <strong>Kéo trực tiếp ảnh</strong> để đặt vị trí riêng (X, Y) · <strong>Kéo 4 góc / 4 cạnh</strong> hoặc <strong>Cuộn con lăn chuột</strong> để chỉnh kích thước riêng cho ảnh này (Tự động lưu riêng từng ảnh, không chèn vào Template chung)</div>
      <div class="green-stage green-template-stage canvas-stage" id="greenStage" style="position:relative;overflow:hidden;background:#0a0f1d;user-select:none;">
        <div id="greenTemplateLayers" class="green-template-layers" style="position:absolute;inset:0;z-index:1;pointer-events:none;"></div>
        <div id="greenLayerBox" class="green-layer-box" style="z-index:30;background:rgba(56,189,248,0.06);cursor:move;">
          <img id="greenPreviewImg" class="green-preview-img" decoding="async" alt="" style="width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;">
          <span class="green-resize nw" data-resize="nw" title="Kéo góc trên-trái để chỉnh kích thước"></span>
          <span class="green-resize ne" data-resize="ne" title="Kéo góc trên-phải để chỉnh kích thước"></span>
          <span class="green-resize sw" data-resize="sw" title="Kéo góc dưới-trái để chỉnh kích thước"></span>
          <span class="green-resize se" data-resize="se" title="Kéo góc dưới-phải để chỉnh kích thước"></span>
          <span class="green-resize n" data-resize="n" title="Kéo cạnh trên"></span>
          <span class="green-resize s" data-resize="s" title="Kéo cạnh dưới"></span>
          <span class="green-resize w" data-resize="w" title="Kéo cạnh trái"></span>
          <span class="green-resize e" data-resize="e" title="Kéo cạnh phải"></span>
        </div>
      </div>
      <div class="form four-col compact">
        <label>X (Vị trí ngang)<input id="greenX" type="number" step="5"></label>
        <label>Y (Vị trí dọc)<input id="greenY" type="number" step="5"></label>
        <label>Width (Rộng)<input id="greenW" type="number" step="10" min="30"></label>
        <label>Height (Cao)<input id="greenH" type="number" step="10" min="30"></label>
        <label>Chế độ hiển thị<select id="greenAssetMode"><option value="GREEN">🟢 Tách nền Phông xanh (Chroma Key)</option><option value="IMAGE">🖼️ Giữ nguyên gốc (Ảnh thường / PNG trong suốt)</option></select></label>
        <label>Màu tách nền<input id="greenKeyColor" type="color"></label>
        <label>Similarity (Độ nhạy)<input id="greenSimilarity" type="number" min="0.01" max="0.5" step="0.01"></label>
        <label>Softness (Làm mềm viền)<input id="greenSoftness" type="number" min="0" max="0.3" step="0.01"></label>
        <label>Despill mix (Khử ám xanh)<input id="greenDespillMix" type="number" min="0" max="1" step="0.05"></label>
        <label>Opacity (Độ mờ)<input id="greenOpacity" type="number" min="0" max="1" step="0.05"></label>
        <label>Rotation (Xoay)<input id="greenRot" type="number" step="1"></label>
        <label>Despill expand<input id="greenDespillExpand" type="number" min="0" max="1" step="0.01"></label>
        <input id="greenStart" type="hidden" value="0">
        <input id="greenEnd" type="hidden" value="">
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
        <label class="check"><input id="greenLoop" type="checkbox" checked> Lặp đến hết voice</label>
        <label class="check"><input id="greenKeepAspect" type="checkbox" checked> Giữ đúng tỷ lệ khi kéo 4 góc</label>
        <span id="greenTplRefLabel" style="font-size:11px;color:#38bdf8;">💡 Tọa độ mặc định cho các ảnh chưa chỉnh: <strong>X=${tplDef.x}, Y=${tplDef.y} · ${tplDef.width}×${tplDef.height}</strong></span>
      </div>
      <div class="actions" style="flex-wrap:wrap;gap:6px;">
        <button type="button" id="greenZoomIn" style="background:#1e293b;border-color:#38bdf8;color:#38bdf8;font-weight:700;">🔍 Phóng to (+10%)</button>
        <button type="button" id="greenZoomOut" style="background:#1e293b;border-color:#38bdf8;color:#38bdf8;font-weight:700;">🔉 Thu nhỏ (-10%)</button>
        <button type="button" id="greenMatchAspect">📐 Khớp tỷ lệ gốc</button>
        <button type="button" id="greenCenter">🎯 Căn giữa</button>
        <button type="button" id="greenFitWidth">↔️ Fit ngang</button>
        <button type="button" id="greenFitHeight">↕️ Fit dọc</button>
        <button type="button" id="greenPickColor">🎨 Chấm hút màu xanh</button>
        <button type="button" id="greenReset">↺ Đưa về tọa độ mặc định</button>
        <button type="button" id="greenSyncToTemplate" style="background:#0f766e;color:#fff;border:1px solid #14b8a6;font-weight:700;" title="Chỉ sao chép tọa độ (X, Y, Rộng, Cao) này làm tọa độ mặc định cho các ảnh chưa chỉnh (Không thêm ảnh vào Template chung)">📐 Lấy tọa độ (X,Y,W,H) này cho các ảnh chưa chỉnh</button>
        <button type="button" id="greenSave" class="primary" style="font-weight:700;">💾 Lưu vị trí riêng cho "${htmlEscape(key)}" & Đóng</button>
      </div>
      <div id="greenPickHint" class="source-preview-info" hidden>👉 Hãy bấm chuột vào vùng nền xanh của ảnh trên màn hình Preview để tự động hút màu tách nền.</div>
      <div id="greenActiveFileInfo" class="source-preview-info">📎 File đang chỉnh riêng: <strong>${htmlEscape(assetPath)}</strong> · Mã khớp kịch bản: <code>${htmlEscape(key)}</code></div>
    </div>
  `);
  document.querySelector('.modal-card')?.classList.add('green-modal-card');
  const stage=$('greenStage'),box=$('greenLayerBox'),img=$('greenPreviewImg');
  stage.style.aspectRatio=`${cw}/${ch}`;

  let raf=0,chromaTimer=0,lastKey='',pickMode=false,loadSeq=0;
  let sampleCanvas=null,naturalW=cfg.width||620,naturalH=cfg.height||800,naturalAspect=Math.max(.05,naturalW/Math.max(1,naturalH)),previewUrl='';

  img.onload=()=>{
    if(img.naturalWidth>0&&img.naturalHeight>0&&!String(img.src||'').startsWith('blob:')&&!String(img.src||'').startsWith('data:')){
      naturalW=img.naturalWidth;
      naturalH=img.naturalHeight;
      naturalAspect=Math.max(.05,naturalW/Math.max(1,naturalH));
    }
  };

  function syncInputs(){writeGreenEditorConfigV3(cfg);}
  function syncGeometryInputsOnly(){
    if($('greenX'))$('greenX').value=Math.round(cfg.x||0);
    if($('greenY'))$('greenY').value=Math.round(cfg.y||0);
    if($('greenW'))$('greenW').value=Math.round(cfg.width||320);
    if($('greenH'))$('greenH').value=Math.round(cfg.height||180);
  }
  function applyBox(){
    box.style.left=`${cfg.x/cw*100}%`;
    box.style.top=`${cfg.y/ch*100}%`;
    box.style.width=`${cfg.width/cw*100}%`;
    box.style.height=`${cfg.height/ch*100}%`;
    box.style.opacity=String(cfg.opacity??1);
    box.style.transform=`rotate(${cfg.rotation||0}deg)`;
  }
  function refreshSwitcherBadges(){
    document.querySelectorAll('[data-switch-folder-img]').forEach(btn=>{
      const idx=Number(btn.dataset.switchFolderImg);
      const it=folderItems[idx];
      if(!it)return;
      const active=it.filePath===assetPath||it.baseKey===key;
      const edited=Boolean(state.jobGreenConfigs?.[it.baseKey]?.edited);
      btn.style.border=`1px solid ${active?'#38bdf8':(edited?'#10b981':'#334155')}`;
      btn.style.background=active?'#0284c7':(edited?'rgba(16,185,129,0.15)':'#1e293b');
      btn.style.color=active?'#fff':(edited?'#34d399':'#cbd5e1');
      btn.style.fontWeight=active?'700':'500';
      btn.textContent=`#${idx+1} ${it.fileName} ${edited?'✓':''}`;
    });
  }
  function autoPersistCurrentImagePosition(){
    const saved={...readGreenEditorConfigV3(),...cfg,edited:true,assetPath};
    state.jobGreenConfigs[key]=saved;
    const assetBase=(assetPath.split(/[\\/]/).pop()||'').replace(/\.[^.]+$/,'');
    if(assetBase&&assetBase!==key)state.jobGreenConfigs[assetBase]=saved;
    saveJobGreenConfigsToStorage();
    job.greenConfig=saved;job.greenEdited=true;job.greenStatus='EDITED';
    refreshSwitcherBadges();
    renderProjectImageFolderList(state.scannedFolderImages||[]);
    if(state.activeRenderMode==='single')renderSingleJob(job);
    else if(state.scanJobs?.length)renderBatchJobs(state.scanJobs);
  }
  function scheduleBox(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;applyBox();syncGeometryInputsOnly();});}
  async function updateChroma(){
    if(!previewUrl)return;
    const mySeq=loadSeq;
    const mode=String(cfg?.assetMode||'GREEN').toUpperCase();
    if(mode==='IMAGE'){
      lastKey=`${previewUrl}|IMAGE`;
      if(img.src!==previewUrl)img.src=previewUrl;
      return;
    }
    const keyData=[previewUrl,mode,cfg.keyColor,cfg.similarity,cfg.softness,cfg.despillMix].join('|');
    if(keyData===lastKey)return;
    lastKey=keyData;
    const outUrl=await chromaPreviewDataUrlV3(previewUrl,cfg);
    if(mySeq===loadSeq&&img.isConnected){
      img.src=outUrl;
    }
  }
  function scheduleChroma(){clearTimeout(chromaTimer);chromaTimer=setTimeout(updateChroma,60);}

  // 1. Áp dụng ngay lập tức khung kéo thả & sự kiện chuột (0ms delay)
  syncInputs();
  applyBox();

  const startDragMove=(ev)=>{
    if(pickMode||ev.target.closest('.green-resize'))return;
    ev.preventDefault();
    ev.stopPropagation();
    const rect=stage.getBoundingClientRect(),start={clientX:ev.clientX,clientY:ev.clientY,x:Number(cfg.x||0),y:Number(cfg.y||0)};
    window.__vbsIsDraggingLayer=true;
    try{box.setPointerCapture(ev.pointerId);}catch{}
    const move=(m)=>{
      cfg={...cfg,x:Math.round(start.x+(m.clientX-start.clientX)/Math.max(1,rect.width)*cw),y:Math.round(start.y+(m.clientY-start.clientY)/Math.max(1,rect.height)*ch)};
      scheduleBox();
    };
    const up=()=>{
      window.__vbsIsDraggingLayer=false;
      if(raf){cancelAnimationFrame(raf);raf=0;}
      applyBox();
      syncGeometryInputsOnly();
      autoPersistCurrentImagePosition();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
  };
  box.addEventListener('pointerdown',startDragMove);
  stage.addEventListener('pointerdown',(ev)=>{
    if(ev.target===stage||ev.target.id==='greenTemplateLayers')startDragMove(ev);
  });

  box.querySelectorAll('.green-resize').forEach(handle=>handle.addEventListener('pointerdown',(ev)=>{
    if(pickMode)return;
    ev.preventDefault();
    ev.stopPropagation();
    const direction=handle.dataset.resize,rect=stage.getBoundingClientRect(),start={clientX:ev.clientX,clientY:ev.clientY,x:Number(cfg.x||0),y:Number(cfg.y||0),w:Math.max(30,Number(cfg.width||320)),h:Math.max(30,Number(cfg.height||180))};
    const isCorner=direction.length===2;
    const keepAspect=isCorner&&($('greenKeepAspect')?.checked!==false)&&!ev.altKey;
    const aspect=Math.max(.01,start.w/Math.max(1,start.h));
    window.__vbsIsDraggingLayer=true;
    try{handle.setPointerCapture(ev.pointerId);}catch{}
    const move=(m)=>{
      let dx=(m.clientX-start.clientX)/Math.max(1,rect.width)*cw,dy=(m.clientY-start.clientY)/Math.max(1,rect.height)*ch,x=start.x,y=start.y,w=start.w,h=start.h;
      if(direction.includes('e'))w=start.w+dx;
      if(direction.includes('s'))h=start.h+dy;
      if(direction.includes('w')){w=start.w-dx;x=start.x+dx;}
      if(direction.includes('n')){h=start.h-dy;y=start.y+dy;}
      if(keepAspect){
        const byWidth=Math.abs(dx)>=Math.abs(dy);
        if(byWidth){h=w/aspect;if(direction.includes('n'))y=start.y+(start.h-h);}
        else{w=h*aspect;if(direction.includes('w'))x=start.x+(start.w-w);}
      }
      const min=30;
      if(w<min){if(direction.includes('w'))x-=min-w;w=min;if(keepAspect)h=w/aspect;}
      if(h<min){if(direction.includes('n'))y-=min-h;h=min;if(keepAspect)w=h*aspect;}
      cfg={...cfg,x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h)};
      scheduleBox();
    };
    const up=()=>{
      window.__vbsIsDraggingLayer=false;
      if(raf){cancelAnimationFrame(raf);raf=0;}
      applyBox();
      syncGeometryInputsOnly();
      autoPersistCurrentImagePosition();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
  }));

  const zoomByFactor=(factor)=>{
    const oldW=Math.max(30,Number(cfg.width||620)),oldH=Math.max(30,Number(cfg.height||800));
    const newW=Math.max(30,Math.round(oldW*factor)),newH=Math.max(30,Math.round(oldH*factor));
    const cx=Number(cfg.x||0)+oldW/2,cy=Number(cfg.y||0)+oldH/2;
    cfg={...cfg,x:Math.round(cx-newW/2),y:Math.round(cy-newH/2),width:newW,height:newH};
    applyBox();
    syncGeometryInputsOnly();
    autoPersistCurrentImagePosition();
  };
  stage.addEventListener('wheel',(ev)=>{
    ev.preventDefault();
    zoomByFactor(ev.deltaY<0?1.06:0.94);
  },{passive:false});
  if($('greenZoomIn'))$('greenZoomIn').onclick=()=>zoomByFactor(1.1);
  if($('greenZoomOut'))$('greenZoomOut').onclick=()=>zoomByFactor(0.9);

  document.querySelectorAll('#modalBody input, #modalBody select').forEach(el=>el.addEventListener('input',()=>{
    cfg=readGreenEditorConfigV3();
    applyBox();
    autoPersistCurrentImagePosition();
    if(['greenAssetMode','greenKeyColor','greenSimilarity','greenSoftness','greenDespillMix'].includes(el.id))scheduleChroma();
  }));
  $('greenPickColor').onclick=async()=>{
    if(!sampleCanvas&&previewUrl)sampleCanvas=await imageSampleCanvas(previewUrl);
    pickMode=true;stage.classList.add('picking-color');$('greenPickHint').hidden=false;
  };
  box.addEventListener('click',async(ev)=>{
    if(!pickMode)return;
    ev.preventDefault();ev.stopPropagation();
    if(!sampleCanvas&&previewUrl)sampleCanvas=await imageSampleCanvas(previewUrl);
    const sampled=sampleGreenColorFromEvent(ev,box,sampleCanvas);
    if(sampled){
      cfg={...cfg,assetMode:'GREEN',keyColor:ffmpegKeyColor(sampled)};
      if($('greenAssetMode'))$('greenAssetMode').value='GREEN';
      $('greenKeyColor').value=sampled;
      autoPersistCurrentImagePosition();
      scheduleChroma();
      toast(`Đã hút màu nền ${sampled}.`);
    }
    pickMode=false;stage.classList.remove('picking-color');$('greenPickHint').hidden=true;
  },true);
  $('greenMatchAspect').onclick=()=>{
    const h=Math.max(60,cfg.height||600),w=Math.round(h*naturalAspect);
    cfg={...cfg,width:w,height:h};
    applyBox();syncInputs();autoPersistCurrentImagePosition();
    toast(`Đã khớp đúng tỷ lệ gốc của ảnh (${naturalW}×${naturalH}).`);
  };
  $('greenCenter').onclick=()=>{cfg={...cfg,x:Math.round((cw-cfg.width)/2),y:Math.round((ch-cfg.height)/2)};applyBox();syncInputs();autoPersistCurrentImagePosition();};
  $('greenFitWidth').onclick=()=>{const w=Math.round(cw*.8),h=Math.round(w/naturalAspect);cfg={...cfg,width:w,height:h,x:Math.round(cw*.1),y:Math.round((ch-h)/2)};applyBox();syncInputs();autoPersistCurrentImagePosition();};
  if($('greenFitHeight'))$('greenFitHeight').onclick=()=>{const h=Math.round(ch*.82),w=Math.round(h*naturalAspect);cfg={...cfg,width:w,height:h,x:Math.round((cw-w)/2),y:Math.round((ch-h)/2)};applyBox();syncInputs();autoPersistCurrentImagePosition();};
  $('greenReset').onclick=()=>{
    tplDef=defaultGreenJobConfig();
    delete state.jobGreenConfigs[key];
    saveJobGreenConfigsToStorage();
    job.greenConfig=null;job.greenEdited=false;job.greenStatus='UNEDITED';
    cfg={...tplDef};
    lastKey='';
    applyBox();syncInputs();scheduleChroma();
    refreshSwitcherBadges();
    renderProjectImageFolderList(state.scannedFolderImages||[]);
    if(state.scanJobs?.length)renderBatchJobs(state.scanJobs);
    toast('Đã đưa ảnh này về lại tọa độ mặc định.');
  };
  $('greenSyncToTemplate').onclick=async()=>{
    const currentCfg=readGreenEditorConfigV3();
    if($('projectImageMode'))$('projectImageMode').value=currentCfg.assetMode;
    await syncDefaultFolderPositionOnly(currentCfg);
    tplDef=defaultGreenJobConfig();
    if($('greenTplRefLabel'))$('greenTplRefLabel').innerHTML=`💡 Tọa độ mặc định cho các ảnh chưa chỉnh: <strong>X=${tplDef.x}, Y=${tplDef.y} · ${tplDef.width}×${tplDef.height}</strong>`;
    autoPersistCurrentImagePosition();
    toast(`Đã đặt tọa độ (X=${currentCfg.x}, Y=${currentCfg.y}, ${currentCfg.width}×${currentCfg.height}) làm mặc định cho các ảnh chưa chỉnh (Không chèn vào Template chung)!`);
  };
  const saveCurrentImageConfig=(closeAfter=true)=>{
    cfg=readGreenEditorConfigV3();
    autoPersistCurrentImagePosition();
    if(closeAfter){
      closeModal();
      toast(`Đã lưu vị trí riêng (${Math.round(cfg.x||0)}, ${Math.round(cfg.y||0)}) & kích thước (${Math.round(cfg.width||0)}×${Math.round(cfg.height||0)}) cho "${key}".`);
    }
  };
  $('greenSave').onclick=()=>saveCurrentImageConfig(true);

  // 2. Hàm nạp riêng 1 ảnh đang chọn (0ms hiển thị tức thì)
  async function loadSelectedImageOnly(targetJob){
    const mySeq=++loadSeq;
    job=targetJob;
    assetPath=jobGreenAssetPath(job);
    if(!assetPath)return;
    state.activeFolderPreviewImage=assetPath;
    key=jobGreenKey(job);
    tplDef=defaultGreenJobConfig();
    savedCfg=state.jobGreenConfigs[key]||job.greenConfig||null;
    cfg={...tplDef,...(savedCfg?.edited?savedCfg:{})};
    lastKey='';
    sampleCanvas=null;
    syncInputs();
    applyBox();
    if($('modalTitle'))$('modalTitle').textContent=`Căn Vị Trí Riêng Cho Ảnh (Trên Khung 1920×1080 Của "${tplName}") · ${job.fileName||job.voiceName||job.voice_name||key}`;
    if($('greenSave'))$('greenSave').textContent=`💾 Lưu vị trí riêng cho "${key}" & Đóng`;
    if($('greenActiveFileInfo'))$('greenActiveFileInfo').innerHTML=`📎 File đang chỉnh riêng: <strong>${htmlEscape(assetPath)}</strong> · Mã khớp kịch bản: <code>${htmlEscape(key)}</code>`;
    refreshSwitcherBadges();
    if(imageLikePath(assetPath)){
      previewUrl=fileUrl(assetPath);
      img.src=previewUrl;
    }
    const previewPath=await loadGreenPreviewSource(assetPath);
    if(mySeq!==loadSeq)return;
    previewUrl=fileUrl(previewPath);
    if(String(cfg.assetMode||'GREEN').toUpperCase()==='IMAGE'){
      img.src=previewUrl;
    }else{
      await updateChroma();
    }
  }

  document.querySelectorAll('[data-switch-folder-img]').forEach(btn=>{
    btn.onclick=()=>{
      const idx=Number(btn.dataset.switchFolderImg);
      const nextItem=folderItems[idx];
      if(nextItem){
        loadSelectedImageOnly(nextItem).catch(e=>toast(e.message,true));
      }
    };
  });

  // 3. Nạp ngay ảnh đang được bấm trước tiên
  await loadSelectedImageOnly(initialJob);

  // 4. Nạp các lớp phủ của Template ở hậu cảnh (chỉ để căn vị trí, không chèn ảnh vào Template)
  setTimeout(async()=>{
    if(!$('greenTemplateLayers')?.isConnected)return;
    const template=await activeGreenTemplate();
    if($('greenTemplateLayers')?.isConnected){
      await renderGreenTemplatePreview($('greenTemplateLayers'),template,size,null);
    }
  },30);
}

function collectBatch(){const library=state.libraries.find(l=>l.id===$('batchLibrary').value),mode=$('backgroundMode').value,voiceFolder=$('voiceFolder').value,voiceSourceMode=$('batchVoiceSourceMode')?.value||'EXISTING_AUDIO',voiceProfileId=$('batchVoiceProfileSelect')?.value||'default',channelKey=$('topGlobalKeySelect')?.value||localStorage.getItem('zc_active_channel_key')||'03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';const isStockOrImage=['STOCK_VIDEO','IMAGE_SEQUENCE','STORY_PIP_STOCK'].includes(mode);return{channelKey,batchName:$('batchName').value,projectId:$('batchProject').value||null,templateId:$('batchTemplate').value||null,backgroundMode:mode,storyPipOverStock:mode==='STORY_PIP_STOCK',storyMode:$('farmStoryDivisionMode')?.value||'CUE',imageCount:Number($('farmStoryCountInput')?.value||30),characterDna:$('farmStoryCharacterDna')?.value||'',voiceSourceMode,voiceProfileId,voiceFolder,srtFolder:voiceFolder,autoGenerateSrt:$('batchAcceleration').value!=='FULL_GPU_ZERO_COPY',whisperModel:'small',whisperLanguage:$('batchSrtLanguage')?.value||'auto',srtMaxChars:42,srtMaxDur:4.2,jobIntroFolder:$('jobIntroFolder')?.value||'',batchJobIntroPath:$('batchJobIntro')?.value||'',jobIntroAudioMode:String($('batchJobIntroAudioMode')?.value||'MUTE'),jobIntroTransition:'NONE',jobIntroTransitionMs:0,jobIntroNoiseOverlay:false,enableJobGreenLayer:false,jobGreenFolder:'',jobGreenConfigs:state.jobGreenConfigs||{},defaultFolderImageTransform:loadDefaultFolderImageTransform(),requireJobGreenAsset:false,requireJobGreenEdit:false,cleanupJobGreenCache:true,jobGreenCacheDurationMs:30000,libraryId:isStockOrImage?library?.id||null:null,mediaFolder:isStockOrImage?($('mediaFolder').value||library?.root_path||''):'',usedFolder:'',manualMediaPath:mode==='MANUAL_MEDIA'?$('manualMediaPath').value:'',outputFolder:$('outputFolder').value||(voiceSourceMode==='ONLY_RENDER_VOICE'?voiceFolder:''),width:Number($('batchWidth').value),height:Number($('batchHeight').value),fps:Number($('batchFps').value),subtitle:renderSubtitleOverride('batch'),codec:$('batchCodec').value,accelerationMode:$('batchAcceleration').value,gpuIndex:Number($('batchGpuIndex').value??-1),performanceProfile:$('batchPerformance').value,maxParallelJobs:Number($('batchWorkers').value||1),stockAllocationMode:['STOCK_VIDEO','STORY_PIP_STOCK'].includes(mode)?'DURATION_POOL':'PER_JOB',stockPlaybackRate:.75,extendShortStock:true,stockClonePasses:2,stockCloneFlip:true,stockCloneZoom:1.1,transformAllStock:true,forceStockCover:true,deleteConsumedMatchedStock:true,moveUsedStock:false,filterComplexThreads:Math.max(2,Math.min(16,(navigator.hardwareConcurrency||6)-1)),gbPerHour:Number($('batchGbHour').value),imageDurationMs:Number($('imageSeconds').value)*1000,allowImageFlip:$('allowFlip').checked,maxRenderAttempts:Number($('batchAttempts').value),selectionMode:$('selectionMode').value,transitionItems:selectedTransitions('batch'),minTransitionMs:Number($('batchTransitionMin')?.value||600),maxTransitionMs:Number($('batchTransitionMax')?.value||900),avoidRepeatCount:Number($('batchAvoidRepeat')?.value??2),safetyPercent:95,audioBitrateKbps:256,cpuPreset:'veryfast',allowCpuFallback:true};}
async function preflight(){
  const imgDir=$('projectImageFolder')?.value?.trim()||'';
  if(imgDir&&typeof scanAndRenderProjectImageFolderList==='function'){
    await scanAndRenderProjectImageFolderList(imgDir);
  }
  const c=collectBatch();
  if(!c.voiceFolder&&imgDir){
    $('projectImageFolderPanel')?.scrollIntoView({behavior:'smooth',block:'center'});
    toast('Đã quét danh sách ảnh trong Folder! Hãy bấm "🎨 Chỉnh sửa (Preview Template)" trên ảnh bạn muốn chỉnh.');
    return;
  }
  validateBatch(c);
  const r=await api.batch.scan(c);
  renderBatchJobs(r.jobs);
  const projectImage=r.projectImageMissingCount?` · Ảnh Project thiếu ${r.projectImageMissingCount}`:r.projectImageReadyCount?` · Ảnh Project ${r.projectImageReadyCount}`:r.projectImageDisabledCount?` · Ảnh Project tắt`:'';
  const jobIntro=r.jobIntroReadyCount?` · Video intro ${r.jobIntroReadyCount}`:'';
  $('batchProgressLabel').textContent=`${r.readyCount||0}/${r.voiceCount||r.jobs.length} voice sẵn sàng · ${r.missingSrtCount||0} SRT sẽ tự tạo${projectImage}${jobIntro} · Voice ${formatDuration(r.voiceDurationMs)} · Stock ${formatDuration(r.mediaDurationMs)} · ${r.stockEnough?'đủ stock':'thiếu stock'}`;
  if(r.projectImageMissingCount)toast(`Thiếu ảnh Project cho ${r.projectImageMissingCount} voice.`,true);
  else toast('Preflight hoàn thành.');
}
async function startBatch(){const c=collectBatch();validateBatch(c);resetJobTimings();state.running=true;log(`Start ${c.batchName}`);try{const r=await api.batch.start(c);log(`Batch ${r.status}`);await loadAll();if(r.outputFolder&&confirm('Mở thư mục output?'))api.openPath(r.outputFolder);}catch(e){log(`ERROR: ${e.message}`);toast(e.message,true);}finally{state.running=false;}}

function collectSingle(){const library=state.libraries.find(l=>l.id===$('singleLibrary').value),mode=$('singleBackgroundMode').value,voice=$('singleVoice').value,voiceBase=(voice.split(/[\\/]/).pop()||'video').replace(/\.[^.]+$/,'');const singleStockPath=$('singleStockFile')?.value||'',singleJobGreenPath=$('singleJobGreen')?.value||'';return{singleMode:true,batchName:`Single_${voiceBase}`,projectId:$('singleProject').value||null,templateId:$('singleTemplate').value||null,backgroundMode:mode,singleVoicePath:voice,singleSrtPath:$('singleSrt').value,autoGenerateSrt:true,whisperModel:'small',whisperLanguage:$('singleSrtLanguage')?.value||'auto',srtMaxChars:42,srtMaxDur:4.2,enableJobGreenLayer:Boolean(singleJobGreenPath),singleJobGreenPath,jobGreenConfigs:state.jobGreenConfigs,requireJobGreenAsset:Boolean(singleJobGreenPath),requireJobGreenEdit:Boolean(singleJobGreenPath&&$('singleRequireGreenEdit')?.checked),cleanupJobGreenCache:$('singleCleanupGreenCache')?.checked!==false,jobGreenCacheDurationMs:30000,singleStockPath,strictSingleStock:mode==='SINGLE_STOCK',stockDurationToleranceMs:500,stockPlaybackRate:.75,extendShortStock:true,stockClonePasses:2,stockCloneFlip:true,stockCloneZoom:1.1,transformAllStock:true,forceStockCover:true,deleteConsumedMatchedStock:true,libraryId:library?.id||null,mediaFolder:$('singleMediaFolder').value||library?.root_path||'',usedFolder:$('singleUsedFolder').value||library?.used_path||'',manualMediaPath:mode==='SINGLE_STOCK'?singleStockPath:$('singleManualMedia').value,outputFolder:$('singleOutputFolder').value,width:Number($('singleWidth').value),height:Number($('singleHeight').value),fps:Number($('singleFps').value),subtitle:renderSubtitleOverride('single'),codec:$('singleCodec').value||'auto',accelerationMode:$('singleAcceleration').value||'AUTO_STABLE',gpuIndex:Number($('singleGpuIndex').value??-1),performanceProfile:$('singlePerformance').value,maxParallelJobs:1,filterComplexThreads:Math.max(2,Math.min(16,(navigator.hardwareConcurrency||6)-1)),gbPerHour:Number($('singleGbHour').value),imageDurationMs:Number($('singleImageSeconds').value)*1000,allowImageFlip:$('singleAllowFlip').checked,maxRenderAttempts:Number($('singleAttempts').value),selectionMode:$('singleSelectionMode').value,transitionItems:selectedTransitions('single'),minTransitionMs:Number($('singleTransitionMin')?.value||600),maxTransitionMs:Number($('singleTransitionMax')?.value||900),avoidRepeatCount:Number($('singleAvoidRepeat')?.value??2),safetyPercent:95,audioBitrateKbps:256,cpuPreset:'veryfast',allowCpuFallback:true};}
function renderSingleJob(job){state.singleScanJobs=job?[job]:[];const assetPath=jobGreenAssetPath(job);$('singleJob').innerHTML=job?`<tr><td>${job.voiceName||job.voicePath?.split(/[\\/]/).pop()}</td><td>${srtStateLabel(job)}</td><td>${jobGreenStateLabel(job)}</td><td>${formatDuration(job.voiceDurationMs)}</td><td><span class="badge ${job.status||''}">${job.status||(job.ready?'READY':'PENDING')}</span></td><td>${formatJobElapsed(job)}</td><td>${job.outputPath?.split(/[\\/]/).pop()||'—'}</td><td>${assetPath?`<button id="editSingleGreen" class="${jobGreenEdited(job)?'green-edited-button':''}">🎨 Chỉnh vị trí / kích thước</button>`:'—'}</td></tr>`:'<tr><td colspan="8" class="empty">Chưa kiểm tra.</td></tr>';if(assetPath&&$('editSingleGreen'))$('editSingleGreen').onclick=()=>{state.activeRenderMode='single';openJobGreenEditorV3(job).catch(e=>toast(e.message,true));};}
async function preflightSingle(){const c=collectSingle();validateRenderConfig(c,{single:true});state.activeRenderMode='single';const r=await api.batch.scan(c);const job=r.jobs[0]||null;renderSingleJob(job);const green=c.enableJobGreenLayer?` · Green ${r.greenReadyCount?'có':'thiếu'}${r.uneditedGreenCount?' · chưa chỉnh':''}`:'';const projectImage=r.projectImageMissingCount?' · Ảnh Project thiếu':r.projectImageReadyCount?' · Ảnh Project có':r.projectImageDisabledCount?' · Ảnh Project tắt':'';$('singleProgressLabel').textContent=job?`Voice ${formatDuration(job.voiceDurationMs)} · ${r.missingSrtCount?'SRT sẽ tự tạo':'SRT có sẵn'}${green}${projectImage}${c.backgroundMode==='SINGLE_STOCK'?` · Stock ${formatDuration(r.mediaDurationMs)}`:` · Media ${r.mediaCount}`}`:'Không tìm thấy voice.';if(r.projectImageMissingCount)toast('Ảnh Project đã chọn không hợp lệ hoặc không tồn tại.',true);else toast('Kiểm tra một video hoàn thành.');}
async function startSingle(){if(state.running)return toast('Đang có render chạy.',true);const c=collectSingle();validateRenderConfig(c,{single:true});state.activeRenderMode='single';resetJobTimings();state.running=true;log(`Start one video: ${c.singleVoicePath}`);try{const r=await api.batch.start(c);log(`Single render ${r.status}`);await loadAll();if(r.outputFolder&&confirm('Mở thư mục output?'))api.openPath(r.outputFolder);}catch(e){log(`ERROR: ${e.message}`);toast(e.message,true);}finally{state.running=false;}}


async function loadQueue(){state.batches=await api.batch.list();renderBatchHistory();if(state.batches.length&&!state.selectedBatch){await selectBatch(state.batches[0].id);}}
function renderBatchHistory(){const root=$('batchHistory');if(!root)return;root.innerHTML=state.batches.map(b=>`<div class="list-item ${state.selectedBatch?.id===b.id?'active':''}" data-batch="${b.id}"><strong>${b.name}</strong><small><span class="badge ${b.status}">${b.status}</span> · ${b.completed_jobs}/${b.total_jobs} completed</small></div>`).join('')||'<div class="empty">Chưa có batch.</div>';root.querySelectorAll('[data-batch]').forEach(el=>el.onclick=()=>selectBatch(el.dataset.batch));}
async function selectBatch(id){state.selectedBatch=state.batches.find(b=>b.id===id);renderBatchHistory();const jobs=await api.batch.jobs(id),reports=await api.reports.list(id);$('queueJobs').innerHTML=`<div class="table-wrap"><table><thead><tr><th>#</th><th>Voice</th><th>Status</th><th>Thời gian</th><th>Progress</th></tr></thead><tbody>${jobs.map(j=>`<tr><td>${j.sequence_number}</td><td>${j.voice_name}</td><td><span class="badge ${j.status}">${j.status}</span></td><td>${formatJobElapsed(j)}</td><td>${Number(j.progress_percent||0).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;$('reportList').innerHTML=reports.map(r=>`<div class="list-item"><strong>${r.title}</strong><small>${r.report_type} · ${new Date(r.created_at).toLocaleString()}</small></div>`).join('')||'<div class="empty">Không có báo cáo.</div>';}

async function importTemplateFile(){
  const filePath=await api.chooseFile({filters:[{name:'VBS Template / Project JSON',extensions:['json']}]});
  if(!filePath)return;
  const selectedProjectId=$('templateProject')?.value||state.selectedProject?.id||null;
  const result=await api.templates.import(filePath,selectedProjectId);
  const templates=result?.templates||[result?.template||result].filter(Boolean);
  const firstTemplateId=templates[0]?.id||null;
  const targetProjectId=result?.project?.id||selectedProjectId;
  if(result?.project){
    state.projects=(await api.projects.list()).map(standardProject);
    state.selectedProject=standardProject(state.projects.find((project)=>project.id===result.project.id)||result.project);
    fillSelects();
    selectProject(state.selectedProject.id);
  }
  await loadTemplates(targetProjectId,firstTemplateId);
  const count=Number(result?.importedCount||templates.length||0);
  toast(count>1?`Đã import ${count} template.`:'Đã import template.');
}
async function initializeWorkspace(){if(state.workspaceLoaded)return;await loadAll();if(state.projects.length){state.selectedProject=state.projects[0];selectProject(state.selectedProject.id);await loadTemplates(state.selectedProject.id);}if(state.libraries.length)await selectLibrary(state.libraries[0].id);await loadDashboard();state.workspaceLoaded=true;if(typeof scanAndRenderProjectImageFolderList==='function'&&$('projectImageFolder')?.value){await scanAndRenderProjectImageFolderList($('projectImageFolder').value);}if(typeof syncBatchConfigToBridge==='function'){await syncBatchConfigToBridge({silent:true});}}

function storyLog(message){const el=$('storyLog');if(!el)return;el.textContent+=`[${new Date().toLocaleTimeString()}] ${message}\n`;el.scrollTop=el.scrollHeight;}
function newStoryRow(data={}){return{id:crypto.randomUUID(),voicePath:data.voicePath||'',srtPath:data.srtPath||'',imageFolder:data.imageFolder||'',durationMs:data.durationMs||0,imageCount:data.imageCount||0,cueCount:data.cueCount||0,status:data.status||'PENDING',error:data.error||'',outputPath:data.outputPath||''};}
function addStoryRow(data={}){const row=newStoryRow(data);state.storyVideoRows.push(row);renderStoryRows();return row;}
function removeStoryRow(id){state.storyVideoRows=state.storyVideoRows.filter(r=>r.id!==id);renderStoryRows();}
function clearStoryRows(){if(!state.storyVideoRows.length)return;if(confirm('Bạn có chắc muốn xóa tất cả các dòng đầu vào?')){state.storyVideoRows=[];renderStoryRows();toast('Đã làm trống danh sách.');}}
function renderStoryRows(){
  const tbody=$('storyInputRows');if(!tbody)return;
  if(!state.storyVideoRows.length){
    tbody.innerHTML='<tr><td colspan="7" class="empty">Chưa có dòng đầu vào nào. Bấm "+ Thêm dòng" hoặc "Thêm từ thư mục".</td></tr>';
    return;
  }
  tbody.innerHTML=state.storyVideoRows.map((row,idx)=>{
    const statusBadge=row.status==='COMPLETED'?'<span class="badge COMPLETED">XONG</span>':
      row.status==='FAILED'?`<span class="badge FAILED" title="${htmlEscape(row.error||'')}">LỖI</span>`:
      row.status==='RENDERING'?'<span class="badge RENDERING">RENDER</span>':
      row.status==='PREPARING'?'<span class="badge RUNNING">CHUẨN BỊ</span>':
      '<span class="badge">CHỜ</span>';
    const infoText=row.durationMs?`${(row.durationMs/1000).toFixed(1)}s · ${row.imageCount} ảnh · ${row.cueCount} cues`:
      (row.error?`<span style="color:#eca0ab;font-size:9px;">${htmlEscape(row.error)}</span>`:'<span class="muted">Chưa quét</span>');
    return `<tr data-row-id="${row.id}">
      <td>${idx+1}</td>
      <td><div class="path story-row-cell-path"><input class="row-voice" value="${htmlEscape(row.voicePath)}" placeholder="File audio (*.mp3, *.wav...)" title="${htmlEscape(row.voicePath)}"><button class="btn-pick-voice" data-row-id="${row.id}">...</button></div></td>
      <td><div class="path story-row-cell-path"><input class="row-srt" value="${htmlEscape(row.srtPath)}" placeholder="File Subtitle (*.srt)" title="${htmlEscape(row.srtPath)}"><button class="btn-pick-srt" data-row-id="${row.id}">...</button></div></td>
      <td><div class="path story-row-cell-path"><input class="row-folder" value="${htmlEscape(row.imageFolder)}" placeholder="Thư mục ảnh" title="${htmlEscape(row.imageFolder)}"><button class="btn-pick-folder" data-row-id="${row.id}">...</button></div></td>
      <td class="row-info">${infoText}</td>
      <td class="row-status">${statusBadge}</td>
      <td style="text-align:center;"><button class="story-btn-remove" data-remove-id="${row.id}" title="Xóa dòng này">✕</button></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.row-voice').forEach(input=>{input.addEventListener('change',(e)=>{const r=state.storyVideoRows.find(x=>x.id===e.target.closest('tr')?.dataset.rowId);if(r)r.voicePath=e.target.value.trim();});});
  tbody.querySelectorAll('.row-srt').forEach(input=>{input.addEventListener('change',(e)=>{const r=state.storyVideoRows.find(x=>x.id===e.target.closest('tr')?.dataset.rowId);if(r)r.srtPath=e.target.value.trim();});});
  tbody.querySelectorAll('.row-folder').forEach(input=>{input.addEventListener('change',(e)=>{const r=state.storyVideoRows.find(x=>x.id===e.target.closest('tr')?.dataset.rowId);if(r)r.imageFolder=e.target.value.trim();});});
  tbody.querySelectorAll('.btn-pick-voice').forEach(btn=>{btn.onclick=async()=>{const r=state.storyVideoRows.find(x=>x.id===btn.dataset.rowId);if(!r)return;const p=await api.chooseFile({title:'Chọn file Voice Audio',filters:[{name:'Audio',extensions:['mp3','wav','m4a','aac','flac','ogg']}]});if(p){r.voicePath=p;if(!r.srtPath){r.srtPath=p.replace(/\.[^/.]+$/,'.srt');}renderStoryRows();};};});
  tbody.querySelectorAll('.btn-pick-srt').forEach(btn=>{btn.onclick=async()=>{const r=state.storyVideoRows.find(x=>x.id===btn.dataset.rowId);if(!r)return;const p=await api.chooseFile({title:'Chọn file Subtitle SRT',filters:[{name:'Subtitle',extensions:['srt','ass','vtt']}]});if(p){r.srtPath=p;renderStoryRows();};};});
  tbody.querySelectorAll('.btn-pick-folder').forEach(btn=>{btn.onclick=async()=>{const r=state.storyVideoRows.find(x=>x.id===btn.dataset.rowId);if(!r)return;const p=await api.chooseDirectory({title:'Chọn thư mục chứa ảnh'});if(p){r.imageFolder=p;renderStoryRows();};};});
  tbody.querySelectorAll('.story-btn-remove').forEach(btn=>{btn.onclick=()=>{removeStoryRow(btn.dataset.removeId);};});
}
async function batchAddStoryFromFolder(){
  const rootDir=await api.chooseDirectory({title:'Chọn thư mục chứa các file Voice'});
  if(!rootDir)return;
  storyLog(`Đang quét thư mục: ${rootDir}`);
  try{
    const scanned=await api.storyVideo.scanDirectory(rootDir);
    if(!scanned||!scanned.length){
      addStoryRow({imageFolder:rootDir});
      toast('Không thấy file audio trong folder, đã thêm dòng trống với thư mục ảnh.');
      storyLog(`Thư mục ${rootDir} chưa có file audio. Đã tạo dòng mới để bạn tự chọn file voice.`);
      return;
    }
    for(const item of scanned){
      addStoryRow({
        voicePath:item.voicePath,
        srtPath:item.srtPath,
        imageFolder:item.imageFolder,
        durationMs:item.voiceDurationMs||0,
        imageCount:item.imageCount||0,
        cueCount:item.srtCueCount||0,
        status:item.valid?'PENDING':'FAILED',
        error:item.error||''
      });
    }
    toast(`Đã thêm ${scanned.length} dòng từ thư mục.`);
    storyLog(`Đã quét xong: tìm thấy ${scanned.length} file audio.`);
  }catch(err){
    toast(`Lỗi quét thư mục: ${err.message}`,true);
    storyLog(`Lỗi: ${err.message}`);
  }
}
async function preflightStoryVideo(){
  if(!state.storyVideoRows.length){toast('Chưa có dòng dữ liệu nào để kiểm tra.',true);return;}
  storyLog('Bắt đầu Preflight kiểm tra tài nguyên...');
  $('storyProgressLabel').textContent='Đang quét tài nguyên...';
  try{
    const items=state.storyVideoRows.map(r=>({id:r.id,voicePath:r.voicePath,srtPath:r.srtPath,imageFolder:r.imageFolder}));
    const scanned=await api.storyVideo.scan(items);
    for(const sc of scanned){
      const r=state.storyVideoRows.find(x=>x.id===sc.id);
      if(r){
        r.durationMs=sc.voiceDurationMs||0;
        r.imageCount=sc.imageCount||0;
        r.cueCount=sc.srtCueCount||0;
        r.error=sc.error||'';
        r.status=sc.error?'FAILED':'PENDING';
      }
    }
    renderStoryRows();
    const validCount=state.storyVideoRows.filter(r=>!r.error&&r.durationMs&&r.imageCount).length;
    storyLog(`Preflight hoàn tất: ${validCount}/${state.storyVideoRows.length} dòng hợp lệ.`);
    $('storyProgressLabel').textContent=`Preflight hoàn tất: ${validCount}/${state.storyVideoRows.length} hợp lệ.`;
    toast(`Kiểm tra xong: ${validCount}/${state.storyVideoRows.length} video hợp lệ.`);
  }catch(err){
    storyLog(`Lỗi Preflight: ${err.message}`);
    toast(err.message,true);
  }
}
async function startStoryVideo(){
  if(state.runningStoryVideo){toast('Đang có tiến trình tạo video chạy.',true);return;}
  if(!state.storyVideoRows.length){toast('Chưa có danh sách video để tạo.',true);return;}
  const modeRadio=document.querySelector('input[name="storyMode"]:checked');
  const mode=modeRadio?modeRadio.value:'fixed';
  const imageSeconds=Number($('storyImageSeconds')?.value||4);
  const allowFlip=Boolean($('storyAllowFlip')?.checked);
  const transitionMs=Number($('storyTransitionMs')?.value||700);
  const transitionSelect=$('storyTransitionSelect')?.value||'random';
  const codec=$('storyCodec')?.value||'auto';
  const workers=Number($('storyWorkers')?.value||2);
  const projectId=$('storyProject')?.value||'';
  const templateId=$('storyTemplate')?.value||'';
  let outputFolder=$('storyOutputFolder')?.value?.trim();
  if(!outputFolder){
    const proj=state.projects.find(p=>p.id===projectId);
    if(proj?.output_root){
      outputFolder=proj.output_root;
      $('storyOutputFolder').value=outputFolder;
    }
  }
  if(!outputFolder){
    toast('Vui lòng chọn thư mục xuất Output.',true);
    $('storyOutputFolder')?.focus();
    return;
  }
  const items=state.storyVideoRows.map(r=>({id:r.id,voicePath:r.voicePath,srtPath:r.srtPath,imageFolder:r.imageFolder}));
  const invalid=items.filter(it=>!it.voicePath||!it.imageFolder||(mode==='srt'&&!it.srtPath));
  if(invalid.length>0){toast(`Có ${invalid.length} dòng chưa đủ Voice hoặc Thư mục ảnh (hoặc SRT cho Chế độ 3).`,true);return;}
  state.runningStoryVideo=true;
  $('startStoryVideo').disabled=true;
  $('storyProgress').style.width='0%';
  $('storyProgressLabel').textContent='Đang khởi động Render...';
  storyLog(`Bắt đầu quy trình tạo Story Video: Mode = ${mode.toUpperCase()}, Workers = ${workers}`);
  try{
    const config={mode,imageSeconds,allowFlip,transitionMs,transition:transitionSelect,codec,workers,projectId,templateId,outputFolder};
    const result=await api.storyVideo.start({items,config,outputFolder});
    storyLog(`Tất cả hoàn tất! Đã xử lý ${result.results?.length||0} video.`);
    $('storyProgressLabel').textContent='Hoàn thành tất cả video!';
    $('storyProgress').style.width='100%';
    toast('Đã tạo xong toàn bộ video!');
  }catch(err){
    storyLog(`Lỗi tiến trình: ${err.message}`);
    toast(err.message,true);
  }finally{
    state.runningStoryVideo=false;
    $('startStoryVideo').disabled=false;
  }
}
async function cancelStoryVideo(){
  if(confirm('Bạn có chắc muốn hủy tiến trình tạo Story Video?')){
    storyLog('Đã gửi yêu cầu hủy...');
    await api.storyVideo.cancel();
    state.runningStoryVideo=false;
    $('startStoryVideo').disabled=false;
    $('storyProgressLabel').textContent='Đã hủy.';
    toast('Đã gửi yêu cầu hủy.');
  }
}

function wire(){ensureBatchSubtitlePreviewButton();ensureSingleSubtitlePreviewButton();document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>activePage(b.dataset.page));document.querySelectorAll('[data-pick-dir]').forEach(b=>b.onclick=async()=>{const p=await api.chooseDirectory({title:`Chọn ${b.dataset.pickDir}`});if(p){$(b.dataset.pickDir).value=p;if(b.dataset.pickDir==='projectImageFolder'&&typeof scanAndRenderProjectImageFolderList==='function'){await scanAndRenderProjectImageFolderList(p);}}});['singleJobGreen'].forEach(id=>$(id)?.addEventListener('change',updateGreenSourceVisibility));$('closeModal').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal();};if($('previewBatchSubtitle'))$('previewBatchSubtitle').onclick=openBatchSubtitlePreview;if($('previewSingleSubtitle'))$('previewSingleSubtitle').onclick=openSingleSubtitlePreview;$('refreshDashboard').onclick=()=>loadDashboard(false);if($('refreshGpu'))$('refreshGpu').onclick=async()=>{toast('Đang quét GPU NVIDIA...');await loadDashboard(true);toast('Đã quét lại GPU.');};if($('openGreenFolder'))$('openGreenFolder').onclick=()=>api.projectAssets?.openFolder?.();if($('refreshProjectAssets'))$('refreshProjectAssets').onclick=()=>loadProjectAssets().catch(e=>toast(e.message,true));if($('addGreenVideoAsset'))$('addGreenVideoAsset').onclick=()=>addProjectAsset('GREEN_VIDEO').catch(e=>toast(e.message,true));if($('addGreenImageAsset'))$('addGreenImageAsset').onclick=()=>addProjectAsset('GREEN_IMAGE').catch(e=>toast(e.message,true));if($('addDisclaimerAsset'))$('addDisclaimerAsset').onclick=()=>addProjectAsset('DISCLAIMER_VIDEO').catch(e=>toast(e.message,true));if($('deleteProjectAsset'))$('deleteProjectAsset').onclick=()=>deleteSelectedProjectAsset().catch(e=>toast(e.message,true));
  $('newProject').onclick=()=>{state.creatingProject=true;state.selectedProject=null;['projectName','projectDescription','projectOutput'].forEach(id=>$(id).value='');$('projectWidth').value=1920;$('projectHeight').value=1080;$('projectFps').value=30;$('projectName').focus();renderProjects();toast('Đang tạo project mới. Nhập tên rồi bấm Lưu.');};$('saveProject').onclick=()=>saveProject().catch(e=>toast(e.message,true));$('deleteProject').onclick=async()=>{if(state.selectedProject&&confirm('Xóa project?')){await api.projects.delete(state.selectedProject.id);state.selectedProject=null;state.creatingProject=false;await loadAll();}};
  $('templateProject').onchange=()=>{const id=$('templateProject').value;loadTemplates(id);};$('templateSelect').onchange=()=>selectTemplate($('templateSelect').value);$('newTemplate').onclick=()=>{state.selectedTemplate=null;state.editor=defaultTemplate();state.selectedLayer=null;syncTemplateControls();renderEditor();};$('saveTemplate').onclick=()=>saveTemplate().catch(e=>toast(e.message,true));document.querySelectorAll('[data-add-layer]').forEach(b=>b.onclick=()=>{const l=newLayer(b.dataset.addLayer);state.editor.layers.push(l);state.selectedLayer=l;renderEditor();});['layerName','layerText','layerX','layerY','layerWidth','layerHeight','layerRotation','layerOpacity','layerFontSize','layerBlend','layerStart','layerEnd','layerLoop','layerVisible','tplSubtitlePreset','tplSubtitleEffect','tplKaraokeBoxColor','tplSubtitleFont','tplSubtitleColor','tplSubtitleOutlineColor','tplSubtitleSize','tplSubtitleOutline','tplSubtitleBottom','tplSubtitleX','tplSubtitleY','tplSubtitleW','tplSubtitleH','tplSubtitleBold','tplSubtitleUppercase'].forEach(id=>$(id)?.addEventListener('input',()=>{pullLayerProperties();if(id.startsWith('tplSubtitle')||id==='tplKaraokeBoxColor'){pullTemplateControls();renderEditor();}}));['tplSubtitlePreset','tplSubtitleEffect','tplKaraokeBoxColor'].forEach(id=>$(id)?.addEventListener('change',()=>{pullTemplateControls();renderEditor();}));const onBatchSubEffectChange=()=>{const eff=($('batchSubtitleEffect')?.value||'none')==='karaoke_box'?'karaoke_box':'none';const col=$('batchKaraokeBoxColor')?.value||'#7C00FF';if($('batchKaraokeBoxColorRow'))$('batchKaraokeBoxColorRow').style.display=eff==='karaoke_box'?'':'none';if($('tplSubtitleEffect'))$('tplSubtitleEffect').value=eff;if($('tplKaraokeBoxColor'))$('tplKaraokeBoxColor').value=col;if($('tplKaraokeBoxColorRow'))$('tplKaraokeBoxColorRow').style.display=eff==='karaoke_box'?'':'none';saveSubtitlePreview('batch',{subtitleEffect:eff,karaokeBoxColor:col});};$('batchSubtitleEffect')?.addEventListener('change',onBatchSubEffectChange);$('batchKaraokeBoxColor')?.addEventListener('input',onBatchSubEffectChange);$('batchKaraokeBoxColor')?.addEventListener('change',onBatchSubEffectChange);$('layerSource').addEventListener('change',()=>setLayerSource(state.selectedLayer,$('layerSource').value.trim()).catch(e=>toast(e.message,true)));$('pickLayerSource').onclick=async()=>{const p=await api.chooseFile({title:'Chọn ảnh hoặc video (sẽ tự copy vào Kho_Green)',filters:[{name:'Media',extensions:['png','jpg','jpeg','webp','bmp','mp4','mov','mkv','webm','avi','m4v']} ]});if(!p||!state.selectedLayer)return;try{const isImg=/\.(png|jpe?g|webp|bmp)$/i.test(p);const assetType=isImg?'GREEN_IMAGE':'GREEN_VIDEO';const base=(p.split(/[\\/]/).pop()||'asset').replace(/\.[^.]+$/,'');const created=await api.projectAssets.create({assetType,filePath:p,name:base});const finalPath=created?.file_path||p;applyLayerSourceTypeFromPath(state.selectedLayer,finalPath);await loadProjectAssets();await setLayerSource(state.selectedLayer,finalPath);toast(`Đã copy vào Kho_Green: ${created?.file_name||base}`);}catch(err){await setLayerSource(state.selectedLayer,p);}};$('removeLayer').onclick=()=>{if(!state.selectedLayer)return;state.editor.layers=state.editor.layers.filter(l=>l.id!==state.selectedLayer.id);state.selectedLayer=null;renderEditor();};$('duplicateLayer').onclick=()=>{if(!state.selectedLayer)return;const copy=structuredClone(state.selectedLayer);copy.id=crypto.randomUUID();copy.name+=' Copy';copy.transform.x+=30;copy.transform.y+=30;state.editor.layers.push(copy);state.selectedLayer=copy;renderEditor();};['tplWidth','tplHeight','tplFps','tplBackground'].forEach(id=>$(id)&&($(id).oninput=()=>{pullTemplateControls();renderEditor();}));$('templateHistory').onclick=async()=>{if(!state.selectedTemplate)return;const v=await api.templates.versions(state.selectedTemplate.id);showModal('Lịch sử template',v.map(x=>`<div class="list-item"><strong>Version ${x.version_number}</strong><small>${x.change_note||''} · ${new Date(x.created_at).toLocaleString()}</small><button data-restore-version="${x.version_number}">Restore</button></div>`).join(''));document.querySelectorAll('[data-restore-version]').forEach(b=>b.onclick=async()=>{await api.templates.restore(state.selectedTemplate.id,Number(b.dataset.restoreVersion));closeModal();await selectTemplate(state.selectedTemplate.id);toast('Đã restore và tạo version mới.');});};$('exportTemplate').onclick=async()=>{if(!state.selectedTemplate)return;const p=await api.saveFile({defaultPath:`${state.selectedTemplate.name}.vbstemplate.json`,filters:[{name:'VBS Template',extensions:['json']} ]});if(p){await api.templates.export(state.selectedTemplate.id,p);toast('Đã export template.');}};$('importTemplate').onclick=async()=>{const p=await api.chooseFile({filters:[{name:'VBS Template',extensions:['json']} ]});if(p){await api.templates.import(p,$('templateProject').value||null);await loadTemplates($('templateProject').value);toast('Đã import template.');}}; 
  $('newLibrary').onclick=()=>newLibrary().catch(e=>toast(e.message,true));$('scanLibrary').onclick=async()=>{if(!state.selectedLibrary)return toast('Chọn thư viện.',true);const libraryId=state.selectedLibrary.id;const r=await api.libraries.scan(libraryId);state.libraries=await api.libraries.list();state.selectedLibrary=state.libraries.find(l=>l.id===libraryId)||state.selectedLibrary;fillSelects();renderLibraries();renderAssets(await api.libraries.assets(libraryId));renderLibraryStats(r.stats||state.selectedLibrary);toast(`Đã quét ${r.total} file.`);};$('purgeUnusable').onclick=async()=>{if(!state.selectedLibrary)return toast('Chọn thư viện.',true);if(!confirm('Xóa vĩnh viễn các file INVALID và các mục MISSING khỏi thư viện? File USED sẽ được giữ nguyên.'))return;const libraryId=state.selectedLibrary.id;const r=await api.libraries.purge(libraryId);state.libraries=await api.libraries.list();state.selectedLibrary=state.libraries.find(l=>l.id===libraryId)||state.selectedLibrary;renderLibraries();renderAssets(await api.libraries.assets(libraryId));renderLibraryStats(r.stats||state.selectedLibrary);toast(`Đã dọn ${r.removedRecords||0} mục${r.failedFiles?` · ${r.failedFiles} file chưa xóa được`:''}.`);};$('deleteLibrary').onclick=async()=>{if(state.selectedLibrary&&confirm('Xóa library khỏi database? File không bị xóa.')){await api.libraries.delete(state.selectedLibrary.id);state.selectedLibrary=null;await loadAll();}};if($('deleteLibraryFiles'))$('deleteLibraryFiles').onclick=()=>deleteSelectedLibraryFiles().catch(e=>toast(e.message,true));
  if($('pickSingleVoice')){$('pickSingleVoice').onclick=async()=>{const p=await api.chooseFile({title:'Chọn voice MP3/WAV',filters:[{name:'Audio',extensions:['mp3','wav','m4a','aac','flac']} ]});if(p)$('singleVoice').value=p;};$('pickSingleSrt').onclick=async()=>{const p=await api.chooseFile({title:'Chọn subtitle SRT/ASS/JSON',filters:[{name:'Subtitle',extensions:['srt','ass','vtt','json']} ]});if(p)$('singleSrt').value=p;};$('pickSingleGreen').onclick=async()=>{const p=await api.chooseFile({title:'Chọn ảnh/video phông xanh riêng',filters:[{name:'Green media',extensions:['png','jpg','jpeg','webp','bmp','mp4','mov','mkv','webm','avi','m4v']} ]});if(p){$('singleJobGreen').value=p;updateGreenSourceVisibility();}};$('pickSingleManualMedia').onclick=async()=>{const p=await api.chooseFile({title:'Chọn media cố định'});if(p)$('singleManualMedia').value=p;};$('pickSingleStock').onclick=async()=>{const p=await api.chooseFile({title:'Chọn 1 stock đã cắt sẵn',filters:[{name:'Video',extensions:['mp4','mov','mkv','webm','avi','m4v']} ]});if(p)$('singleStockFile').value=p;};$('singleProject').onchange=()=>{const id=$('singleProject').value;loadTemplates(id).catch(e=>toast(e.message,true));};$('singleTemplate').onchange=()=>selectTemplate($('singleTemplate').value).catch(e=>toast(e.message,true));$('singleBackgroundMode').onchange=updateSingleSourceVisibility;$('singleLibrary').onchange=()=>{const l=state.libraries.find(x=>x.id===$('singleLibrary').value);if(l){$('singleMediaFolder').value=l.root_path||'';$('singleUsedFolder').value=l.used_path||'';}};$('scanSingle').onclick=()=>preflightSingle().catch(e=>toast(e.message,true));$('startSingle').onclick=startSingle;$('cancelSingle').onclick=async()=>{if(confirm('Hủy video đang render?'))await api.batch.cancel();};}
  $('batchProject').onchange=()=>{const id=$('batchProject').value;loadTemplates(id).catch(e=>toast(e.message,true));};$('batchTemplate').onchange=()=>selectTemplate($('batchTemplate').value).catch(e=>toast(e.message,true));$('batchLibrary').onchange=()=>{const l=state.libraries.find(x=>x.id===$('batchLibrary').value);if(l){$('mediaFolder').value=l.root_path||'';try{localStorage.setItem('vbs.batchLibrary',l.id||'');localStorage.setItem('vbs.mediaFolder',l.root_path||'');}catch{}if(typeof syncBatchConfigToBridge==='function')setTimeout(()=>syncBatchConfigToBridge({silent:true}),100);}};$('backgroundMode').onchange=updateBatchSourceVisibility;$('pickManualMedia').onclick=async()=>{const p=await api.chooseFile({title:'Chọn media cố định'});if(p)$('manualMediaPath').value=p;};$('scanBatch').onclick=()=>{state.activeRenderMode='batch';return preflight().catch(e=>toast(e.message,true));};$('startBatch').onclick=()=>{state.activeRenderMode='batch';return startBatch();};$('pauseBatch').onclick=async()=>toast((await api.batch.pause()).message);$('cancelBatch').onclick=async()=>{if(confirm('Hủy job đang render?'))await api.batch.cancel();};
  $('batchAcceleration')?.addEventListener('change',()=>{if($('batchAcceleration').value==='FULL_GPU_ZERO_COPY')toast('Full GPU Zero-Copy chỉ chạy video nền cùng tỷ lệ, không SRT/ASS, không transition, không layer alpha/green-screen/rotate. Job không hợp lệ sẽ dừng và không fallback.',true);});
  if ($('btnConformStock')) {
    $('btnConformStock').onclick = async () => {
      const folder = $('mediaFolder')?.value?.trim();
      const statusElem = $('stockConformStatus');
      const btn = $('btnConformStock');
      if (!folder) return toast('Vui lòng chọn thư mục Kho stock / Media folder trước!', true);
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = '⏳ Đang quét...';
      if (statusElem) {
        statusElem.style.display = 'block';
        statusElem.innerHTML = '<span style="color:#f59e0b;">🔍 Đang quét thông số video trong kho stock...</span>';
      }
      try {
        const res = await api.stock?.conformFolder?.(folder);
        if (statusElem && res) {
          statusElem.innerHTML = `<span style="color:#10b981;font-weight:600;">${res.message || '✅ Hoàn tất chuẩn hóa!'}</span>`;
        }
        toast(res?.message || 'Hoàn tất chuẩn hóa kho stock!');
      } catch (err) {
        if (statusElem) {
          statusElem.innerHTML = `<span style="color:#ef4444;">❌ Lỗi: ${err.message}</span>`;
        }
        toast(`Lỗi: ${err.message}`, true);
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Chuẩn hóa Stock (1080p 24fps)';
      }
    };
  }
  api.stock?.onConformProgress?.((p) => {
    const statusElem = $('stockConformStatus');
    if (statusElem && p && p.message) {
      statusElem.style.display = 'block';
      statusElem.innerHTML = `<span style="color:#38bdf8;font-size:11px;">${p.message}</span>`;
    }
  });
  $('refreshQueue').onclick=loadQueue;$('resumeBatch').onclick=async()=>{if(!state.selectedBatch)return toast('Chọn batch.',true);state.activeRenderMode='batch';try{const r=await api.batch.resume(state.selectedBatch.id);toast(`Batch: ${r.status}`);await loadQueue();}catch(e){toast(e.message,true);}};$('retryFailedBatch').onclick=async()=>{if(!state.selectedBatch)return toast('Chọn batch.',true);state.activeRenderMode='batch';try{const r=await api.batch.retryFailed(state.selectedBatch.id);toast(`Retry video lỗi: ${r.status}`);await loadQueue();}catch(e){toast(e.message,true);}};$('openBatchOutput').onclick=()=>state.selectedBatch&&api.openPath(state.selectedBatch.output_folder);
  if($('importTemplate'))$('importTemplate').onclick=()=>importTemplateFile().catch(e=>toast(`Import thất bại: ${e.message}`,true));
  api.onProgress(p=>{const single=state.activeRenderMode==='single',bar=$(single?'singleProgress':'batchProgress'),label=$(single?'singleProgressLabel':'batchProgressLabel');if(p.stage==='RENDER'){if(bar)bar.style.width=`${p.percent}%`;if(label)label.textContent=`${p.voiceName} · ${p.percent.toFixed(1)}% · ${formatDuration(p.outTimeMs)} · ${p.fps?`${p.fps.toFixed(1)} fps · `:''}${p.speed||''}${formatGpuStats(p.gpu)}`;}else if(p.stage==='GPU'){if(label&&p.gpu)label.textContent=`${label.textContent.split(' · GPU Enc ')[0].split(' · GPU ')[0]}${formatGpuStats(p.gpu)}`;}else if(p.stage==='SCAN_MEDIA'){if(bar)bar.style.width=`${p.percent}%`;if(label)label.textContent=`Scan media: ${p.message||''}`;}});api.onLog(log);api.onJob(p=>{log(`${p.voiceName}: ${p.status}${p.error?' — '+p.error:''}`);if(state.activeRenderMode==='single'&&$('singleJob')){const j=state.singleScanJobs.find(x=>(x.voiceName||x.voicePath?.split(/[\\/]/).pop())===p.voiceName)||{voiceName:p.voiceName,srtPath:$('singleSrt')?.value||''};j.jobId=p.jobId||j.jobId;updateJobTimingFromEvent(p,j);j.status=p.status;j.srtPath=p.srtPath||j.srtPath;j.outputPath=p.outputPath||j.outputPath;renderSingleJob(j);}else{const j=state.scanJobs.find(x=>(x.voiceName||x.voicePath?.split(/[\\/]/).pop())===p.voiceName);if(j){j.jobId=p.jobId||j.jobId;updateJobTimingFromEvent(p,j);j.status=p.status;j.srtPath=p.srtPath||j.srtPath;j.outputPath=p.outputPath||j.outputPath;renderBatchJobs(state.scanJobs);}}});api.onBatch(p=>{log(`Render state: ${p.status}`);toast(`Render: ${p.status}`,p.status==='FAILED');});api.onLibraryProgress(p=>{$('libraryProgress').style.width=`${p.total?p.index/p.total*100:100}%`;});
  if($('layerUp'))$('layerUp').onclick=()=>moveSelectedLayer('up');if($('layerDown'))$('layerDown').onclick=()=>moveSelectedLayer('down');if($('layerFront'))$('layerFront').onclick=()=>moveSelectedLayer('front');if($('layerBack'))$('layerBack').onclick=()=>moveSelectedLayer('back');

  if($('addStoryRow'))$('addStoryRow').onclick=()=>addStoryRow();
  if($('batchAddStoryRows'))$('batchAddStoryRows').onclick=batchAddStoryFromFolder;
  if($('clearStoryRows'))$('clearStoryRows').onclick=clearStoryRows;
  if($('scanStoryVideo'))$('scanStoryVideo').onclick=preflightStoryVideo;
  if($('startStoryVideo'))$('startStoryVideo').onclick=startStoryVideo;
  if($('cancelStoryVideo'))$('cancelStoryVideo').onclick=cancelStoryVideo;
  if($('storyProject'))$('storyProject').onchange=()=>{const id=$('storyProject').value;loadTemplates(id).catch(e=>toast(e.message,true));};
  if($('storyTemplate'))$('storyTemplate').onchange=()=>selectTemplate($('storyTemplate').value).catch(e=>toast(e.message,true));

  api.onStoryProgress?.(p=>{
    const bar=$('storyProgress'),label=$('storyProgressLabel');
    if(bar&&p.percent!==undefined)bar.style.width=`${p.percent}%`;
    if(label)label.textContent=`${p.voiceName||'Story'} · ${(p.percent||0).toFixed(1)}% · ${p.speed||''}${formatGpuStats(p.gpu)}`;
  });
  api.onStoryLog?.(m=>storyLog(m));
  api.onStoryJob?.(p=>{
    storyLog(`${p.voiceName||p.id}: ${p.status}${p.error?' — '+p.error:''}`);
    const r=state.storyVideoRows.find(x=>x.id===p.id||(x.voicePath&&x.voicePath.split(/[\\/]/).pop()===p.voiceName));
    if(r){
      r.status=p.status;
      r.error=p.error||'';
      r.outputPath=p.outputPath||r.outputPath;
      renderStoryRows();
    }
  });
  
  api.onStoryState?.(p=>{
    storyLog(`Tiến trình: ${p.status}`);
    toast(`Story Video: ${p.status}`,p.status==='FAILED');
  });
}

function initAiImageControls() {
  const batchBgSelect = $('backgroundMode');
  const aiPanel = $('farmAiImagePanel');
  const divisionSelect = $('farmStoryDivisionMode');
  const secondsRow = $('farmStorySecondsRow');
  const countRow = $('farmStoryCountRow');
  const statusBadge = $('glabsStatusBadge');

  const updateDivisionRows = () => {
    const mode = divisionSelect?.value || 'CUE';
    if (secondsRow) secondsRow.style.display = (mode === 'FIXED') ? 'block' : 'none';
    if (countRow) countRow.style.display = (mode === 'DISTRIBUTE') ? 'block' : 'none';
  };

  const updatePanelVisibility = () => {
    const isPip = batchBgSelect?.value === 'STORY_PIP_STOCK';
    if (aiPanel) aiPanel.style.display = isPip ? 'block' : 'none';
    if (isPip) checkGlabsHealth();
  };

  const checkGlabsHealth = async () => {
    if (!statusBadge || !api.image?.checkHealth) return;
    try {
      const res = await api.image.checkHealth();
      if (res && res.ok) {
        statusBadge.textContent = '● G-Labs Online (8765)';
        statusBadge.style.background = '#15803d';
        statusBadge.style.color = '#fff';
      } else {
        statusBadge.textContent = '○ G-Labs Offline';
        statusBadge.style.background = '#b91c1c';
        statusBadge.style.color = '#fff';
      }
    } catch {
      statusBadge.textContent = '○ G-Labs Offline';
      statusBadge.style.background = '#b91c1c';
      statusBadge.style.color = '#fff';
    }
  };

  if (batchBgSelect) batchBgSelect.addEventListener('change', updatePanelVisibility);
  if (divisionSelect) divisionSelect.addEventListener('change', updateDivisionRows);

  const btnGenNow = $('btnFarmGenerateImagesNow');
  if (btnGenNow) {
    btnGenNow.onclick = async () => {
      let resourceDir = $('voiceFolder')?.value?.trim();
      if (!resourceDir) {
        resourceDir = await api.chooseDirectory?.({ title: 'Chọn thư mục chứa kịch bản hoặc file âm thanh' });
        if (resourceDir && $('voiceFolder')) $('voiceFolder').value = resourceDir;
      }
      if (!resourceDir) {
        return toast('Vui lòng chọn thư mục chứa kịch bản/voice trước khi tạo ảnh.', true);
      }

      const statusEl = $('farmGenerateImagesStatus');
      const progShell = $('farmImageProgressBarShell');
      const progBar = $('farmImageProgressBar');

      btnGenNow.disabled = true;
      if (progShell) progShell.style.display = 'block';
      if (progBar) progBar.style.width = '5%';
      if (statusEl) statusEl.textContent = 'Đang phân tích kịch bản theo Skill 08...';

      const unbind = api.image?.onProgress?.((p) => {
        if (progBar && p.percent != null) progBar.style.width = `${p.percent}%`;
        if (statusEl && p.message) statusEl.textContent = p.message;
      });

      try {
        const targetImagesFolder = resourceDir.replace(/[\\/]+$/, '') + '/images';
        const res = await api.image.generatePackage({
          outputFolder: targetImagesFolder,
          mode: divisionSelect?.value || 'CUE',
          imageSeconds: Number($('farmStorySecondsInput')?.value || 6),
          imageCount: Number($('farmStoryCountInput')?.value || 30),
          customCharacterDna: $('farmStoryCharacterDna')?.value || ''
        });

        toast(`✅ Đã tạo thành công ${res.imageFiles?.length || 0} ảnh phân cảnh bằng model nano_banana_2_lite!`);
        if (statusEl) statusEl.textContent = `Hoàn tất! Đã lưu ${res.imageFiles?.length || 0} ảnh vào: ${targetImagesFolder}`;
      } catch (err) {
        toast(`Lỗi tạo ảnh: ${err.message}`, true);
        if (statusEl) statusEl.textContent = `Lỗi: ${err.message}`;
      } finally {
        btnGenNow.disabled = false;
        if (unbind && typeof unbind === 'function') unbind();
      }
    };
  }

  updatePanelVisibility();
  updateDivisionRows();
}

async function init(){await hydrateSubtitlePreviewSettings();populateSubtitleFontSelects();populateSubtitlePresetSelects();state.appInfo=await api.appInfo?.().catch(()=>null);if($('versionPill')){const rawVer=String(state.appInfo?.version||'V1.0.0').trim();$('versionPill').textContent=rawVer.toUpperCase().startsWith('V')?rawVer:`V${rawVer}`;}await initLicenseControls();if(typeof initOtaUpdaterControls==='function')initOtaUpdaterControls();registerBundledFonts();lockStandardCanvasInputs();ensureDisclaimerControls();ensureJobAssetControls();ensureProjectImageControls();ensureLayerGreenLibraryControls();ensureVoiceImageLayerButton();hideRenderSubtitleControls();if($('singleTransitions'))renderTransitionGroup('singleTransitions','single');renderTransitionGroup('batchTransitions','batch');wire();state.defaultAssets=await api.defaultAssets?.().catch(()=>({green:[],backgrounds:[]}))||{green:[],backgrounds:[]};populateDefaultGreenSelects();observeGreenTemplateSubtitleDemos();if($('singleBackgroundMode'))updateSingleSourceVisibility();updateBatchSourceVisibility();updateGreenSourceVisibility();if(!state.storyVideoRows.length)addStoryRow();renderStoryRows();initAiImageControls();await initializeWorkspace();}
init().catch(e=>{console.error(e);toast(e.message,true);});

// Subtitle is stored in template.subtitle, but behaves like the topmost editor layer.
function subtitleEditorCanvasState(){
  const editor=state.editor||defaultTemplate();
  const canvas=editor.canvas||{width:1920,height:1080};
  return {editor,cw:Math.max(1,Number(canvas.width||1920)),ch:Math.max(1,Number(canvas.height||1080))};
}

function selectSubtitlePreview(){
  if(!state.editor)return;
  state.subtitleSelected=true;
  state.selectedLayer=null;
  document.querySelectorAll('.canvas-layer').forEach(el=>el.classList.remove('selected'));
  document.querySelectorAll('.layer-row').forEach(el=>el.classList.remove('active'));
  document.querySelector('#previewCanvas .subtitle-demo')?.classList.add('selected');
  ensureSubtitleLayerRow();
  renderLayerProperties();
}

function applySubtitlePreviewGeometry(x,y,width,height){
  const {editor,cw,ch}=subtitleEditorCanvasState();
  const minWidth=Math.max(1,Math.round(cw*MIN_SUBTITLE_BOX_WIDTH_PERCENT/100));
  const minHeight=Math.max(32,Math.round(ch*.04));
  const w=Math.max(minWidth,Math.min(cw,Math.round(Number(width)||minWidth)));
  const h=Math.max(minHeight,Math.min(ch,Math.round(Number(height)||minHeight)));
  const left=Math.max(0,Math.min(cw-w,Math.round(Number(x)||0)));
  const top=Math.max(0,Math.min(ch-h,Math.round(Number(y)||0)));
  const widthPercent=Math.round(w/cw*1000)/10;
  editor.subtitle={...(editor.subtitle||{}),enabled:true,positionMode:'absolute',boxXPercent:Math.round(left/cw*1000)/10,boxYPercent:Math.round(top/ch*1000)/10,boxWidthPercent:widthPercent,maxWidthPercent:widthPercent,boxHeightPercent:Math.round(h/ch*1000)/10,bottomMargin:Math.max(0,Math.round(ch-top-h)),assScale:1};
  state.subtitleSelected=true;
  syncTemplateControls();
  updateSubtitlePreview();
  document.querySelector('#previewCanvas .subtitle-demo')?.classList.add('selected');
  ensureSubtitleLayerRow();
}

function subtitleResizeGeometry(start,direction,event,rect,cw,ch){
  const delta=api.preview?.deltaToProject?.({dx:event.clientX-start.clientX,dy:event.clientY-start.clientY},{width:cw,height:ch},{width:rect.width,height:rect.height})||{dx:(event.clientX-start.clientX)/rect.width*cw,dy:(event.clientY-start.clientY)/rect.height*ch};
  const dx=delta.dx;
  const dy=delta.dy;
  let x=start.x,y=start.y,w=start.w,h=start.h;
  if(direction.includes('e'))w=start.w+dx;
  if(direction.includes('s'))h=start.h+dy;
  if(direction.includes('w')){w=start.w-dx;x=start.x+dx;}
  if(direction.includes('n')){h=start.h-dy;y=start.y+dy;}
  const minWidth=Math.max(1,cw*MIN_SUBTITLE_BOX_WIDTH_PERCENT/100);
  const minHeight=Math.max(32,ch*.04);
  if(w<minWidth){if(direction.includes('w'))x-=minWidth-w;w=minWidth;}
  if(h<minHeight){if(direction.includes('n'))y-=minHeight-h;h=minHeight;}
  return {x,y,width:w,height:h};
}

function wireSubtitlePreview(){
  const el=document.querySelector('#previewCanvas .subtitle-demo');
  if(!el)return;
  el.classList.toggle('selected',Boolean(state.subtitleSelected));
  if(el.dataset.topLayerWired==='1'){
    queueMicrotask(ensureSubtitleLayerRow);
    return;
  }
  el.dataset.topLayerWired='1';
  const canvasEl=$('previewCanvas');
  el.addEventListener('pointerdown',(event)=>{
    if(event.target.closest('.subtitle-resize'))return;
    if(!state.editor)return;
    event.preventDefault();
    event.stopPropagation();
    selectSubtitlePreview();
    const rect=canvasEl.getBoundingClientRect(),{cw,ch}=subtitleEditorCanvasState(),box=subtitleRenderBox(state.editor.subtitle||{},cw,ch),start={clientX:event.clientX,clientY:event.clientY,x:box.x,y:box.y,w:box.width,h:box.height};
    el.setPointerCapture?.(event.pointerId);
    const move=(moveEvent)=>{const delta=api.preview?.deltaToProject?.({dx:moveEvent.clientX-start.clientX,dy:moveEvent.clientY-start.clientY},{width:cw,height:ch},{width:rect.width,height:rect.height})||{dx:(moveEvent.clientX-start.clientX)/rect.width*cw,dy:(moveEvent.clientY-start.clientY)/rect.height*ch};applySubtitlePreviewGeometry(start.x+delta.dx,start.y+delta.dy,start.w,start.h);};
    const finish=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',finish);el.removeEventListener('pointercancel',finish);syncTemplateControls();};
    el.addEventListener('pointermove',move);
    el.addEventListener('pointerup',finish);
    el.addEventListener('pointercancel',finish);
  });
  el.querySelectorAll('.subtitle-resize').forEach(handle=>handle.addEventListener('pointerdown',(event)=>{
    if(!state.editor)return;
    event.preventDefault();
    event.stopPropagation();
    selectSubtitlePreview();
    const rect=canvasEl.getBoundingClientRect(),{cw,ch}=subtitleEditorCanvasState(),box=subtitleRenderBox(state.editor.subtitle||{},cw,ch),start={clientX:event.clientX,clientY:event.clientY,x:box.x,y:box.y,w:box.width,h:box.height},direction=handle.dataset.resize;
    handle.setPointerCapture?.(event.pointerId);
    const move=(moveEvent)=>{const next=subtitleResizeGeometry(start,direction,moveEvent,rect,cw,ch);applySubtitlePreviewGeometry(next.x,next.y,next.width,next.height);};
    const finish=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);syncTemplateControls();};
    handle.addEventListener('pointermove',move);
    handle.addEventListener('pointerup',finish);
    handle.addEventListener('pointercancel',finish);
  }));
  ensureSubtitleLayerRow();
  queueMicrotask(ensureSubtitleLayerRow);
}

function ensureSubtitleLayerRow(){
  const list=$('layerList');
  if(!list)return;
  let row=list.querySelector('[data-subtitle-layer]');
  if(!row){
    row=document.createElement('div');
    row.className='layer-row subtitle-layer-row';
    row.dataset.subtitleLayer='1';
    row.innerHTML='<span>Subtitle</span><span class="layer-type">TOP LAYER</span>';
    list.prepend(row);
    row.onclick=()=>selectSubtitlePreview();
  }
  row.classList.toggle('active',Boolean(state.subtitleSelected));
}

function setSelectedLayer(id,{redraw=false}={}){
  state.subtitleSelected=false;
  state.selectedLayer=state.editor.layers.find(layer=>layer.id===id)||null;
  document.querySelectorAll('.canvas-layer').forEach(el=>el.classList.toggle('selected',el.dataset.layerId===id));
  document.querySelectorAll('.layer-row').forEach(el=>el.classList.toggle('active',el.dataset.layer===id));
  document.querySelector('#previewCanvas .subtitle-demo')?.classList.remove('selected');
  renderLayerProperties();
  if(redraw)renderEditor();
}

function ensureAutoResourceControls(){
  for(const id of ['singlePerformance','batchPerformance']){
    const select=$(id);
    if(!select)continue;
    if(!select.querySelector('option[value="AUTO"]')){
      select.insertBefore(new Option('Auto - tu can bang CPU/GPU','AUTO'),select.firstChild);
    }
    select.value='AUTO';
  }
  const workers=$('batchWorkers');
  if(workers){
    if(workers.tagName==='SELECT'){
      if(!workers.querySelector('option[value="AUTO"]')){
        workers.insertBefore(new Option('Auto - tu can bang','AUTO'),workers.firstChild);
      }
      workers.value='AUTO';
    }else if(!workers.value){
      workers.value='2';
    }
  }
}

ensureAutoResourceControls();

/* ========================================================================= */
/* MODULE QUẢN LÝ VOICE STUDIO AI · CLONE & SYNTHESIS (LOCAL DIRECT MODE)   */
/* ========================================================================= */

let _currentVoiceProfiles = [];
let _voiceAutoLaunchTriggered = false;
let _editingVoiceProfileId = null;

/**
 * Kiểm tra trạng thái VoiceStudio API (Cổng 3900) và tự động khởi chạy Server khi mở app
 */
async function checkVoiceStudioHealth() {
  const badge = $('voiceStatusBadge');
  const modelInfo = $('voiceModelInfo');
  if (!badge) return;

  try {
    const res = await api.voice.checkStatus();
    if (res?.online) {
      badge.style.background = '#065f46';
      badge.style.color = '#34d399';
      badge.textContent = '🟢 VoiceStudio Online (Cổng 3900)';
      if (modelInfo) {
        modelInfo.textContent = '· Engine: VoiceStudio OmniVoice GPU (Sẵn sàng Clone & Render)';
      }
    } else {
      badge.style.background = '#854d0e';
      badge.style.color = '#fde047';
      badge.textContent = res?.launching
        ? '🟡 Đang tự động bật VoiceStudio GPU Server (Cổng 3900)...'
        : (res?.appInstalled
          ? '🟠 VoiceStudio Đang Khởi Tạo (Tự động bật khi mở app)'
          : '🔴 Chưa cài đặt VoiceStudio');
      if (modelInfo) {
        modelInfo.textContent = res?.appPath
          ? '· Runtime: ' + res.appPath
          : '· Cổng: 3900 (debpalash/VoiceStudio v0.5.6)';
      }
      if (res?.appInstalled && !_voiceAutoLaunchTriggered) {
        _voiceAutoLaunchTriggered = true;
        api.voice.launchVoiceStudio().then(() => {
          checkVoiceStudioHealth();
        }).catch(() => {});
      }
      if (res?.launching || _voiceAutoLaunchTriggered) {
        setTimeout(() => { checkVoiceStudioHealth().catch(() => {}); }, 3500);
      }
    }
    return res;
  } catch (err) {
    badge.style.background = '#7f1d1d';
    badge.style.color = '#fca5a5';
    badge.textContent = '🔴 Chưa kết nối VoiceStudio (Cổng 3900)';
    if (modelInfo) modelInfo.textContent = '· debpalash/VoiceStudio v0.5.6';
  }
}

/**
 * Nạp danh sách Voice Profiles và hiển thị lên giao diện
 */
async function loadVoiceProfiles() {
  const listEl = $('voiceProfilesList');
  try {
    _currentVoiceProfiles = await api.voice.listProfiles() || [];
    renderVoiceProfilesList(_currentVoiceProfiles);
    updateVoiceSelects(_currentVoiceProfiles);
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = '<div class="empty" style="color:#f87171;">Lỗi tải danh sách profile: ' + htmlEscape(err.message) + '</div>';
    }
  }
}

/**
 * Hiển thị bảng danh sách các profile
 */
function renderVoiceProfilesList(profiles = []) {
  const listEl = $('voiceProfilesList');
  if ($('voiceProfileCountBadge')) {
    $('voiceProfileCountBadge').textContent = `${(_currentVoiceProfiles || profiles).length} CLONES`;
  }
  if (!listEl) return;

  if (!profiles.length) {
    listEl.innerHTML = '<div class="empty">Chưa có giọng nói nào khớp bộ lọc. Nạp file mẫu giọng ở khung bên phải để tạo mới.</div>';
    return;
  }

  const currentDefault = localStorage.getItem('vbs.batchVoiceProfileSelect') || $('batchVoiceProfileSelect')?.value || '';

  listEl.innerHTML = profiles.map(p => {
    const hasAudio = Boolean(p.hasSample && p.samplePath);
    const isDefault = p.id === currentDefault;
    const isEditing = p.id === _editingVoiceProfileId;
    const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('vi-VN') : '';
    return `
      <div class="list-item ${isDefault ? 'active' : ''}" style="display:flex;flex-direction:column;gap:7px;padding:10px 11px;overflow:hidden;${isEditing ? 'border-color:#fbbf24;box-shadow:inset 3px 0 0 #fbbf24,0 0 12px rgba(245,158,11,0.18);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;cursor:pointer;min-width:0;" onclick="window.editVoiceProfile('${htmlEscape(p.id)}')" title="Bấm để nạp giọng này sang khung bên phải để chỉnh sửa">
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              <strong style="color:#f3f5f8;font-size:12px;">${htmlEscape(p.name)}</strong>
              <span class="badge" style="font-size:9px;padding:1px 5px;">${htmlEscape((p.language || 'vi').toUpperCase())} · ${p.speed || 1.0}x</span>
              ${isDefault ? '<span class="stitch-chip neon" style="font-size:9px;padding:1px 5px;">MẶC ĐỊNH</span>' : ''}
              ${isEditing ? '<span class="stitch-chip" style="background:rgba(245,158,11,0.18);border-color:#fbbf24;color:#fde68a;font-size:9px;padding:1px 5px;">✏️ ĐANG SỬA</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:4px;flex-wrap:wrap;">
              <code style="font-size:9.5px;color:#00ff88;background:#090b10;border:1px solid rgba(0,255,136,0.3);padding:1px 5px;border-radius:4px;">${htmlEscape(p.id)}</code>
              ${p.channelKey ? `<span class="stitch-chip" style="background:rgba(56,189,248,0.14);border-color:#0284c7;color:#7dd3fc;font-size:9px;padding:1px 5px;">🔑 ${htmlEscape(p.channelKey)}</span>` : ''}
              ${p.vsProfileId ? `<span class="stitch-chip" style="background:rgba(16,185,129,0.14);border-color:#10b981;color:#6ee7b7;font-size:9px;padding:1px 5px;">#${htmlEscape(p.vsProfileId)}</span>` : ''}
            </div>
            <div style="font-size:10px;color:#9aa4b2;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${p.description ? htmlEscape(p.description) : 'Mẫu: ' + htmlEscape(p.sampleFile || 'sample.wav')}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;padding-top:6px;border-top:1px dashed #1b232e;flex-wrap:wrap;">
          <span style="font-family:var(--font-mono);font-size:9px;color:#5e6978;">${htmlEscape(p.model || 'omnivoice')}${dateStr ? ' · ' + dateStr : ''}</span>
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="stitch-btn-amber" style="padding:2px 7px;font-size:10px;" onclick="window.editVoiceProfile('${htmlEscape(p.id)}')">✏️ Sửa</button>
            <button type="button" class="${isDefault ? 'stitch-btn-emerald' : ''}" style="padding:2px 7px;font-size:10px;" onclick="window.selectDefaultBatchVoice('${htmlEscape(p.id)}')">🎯 ${isDefault ? 'Đang dùng' : 'Mặc định'}</button>
            ${hasAudio ? `<button type="button" style="padding:2px 7px;font-size:10px;" onclick="window.playVoiceSample('${htmlEscape(p.id)}')">🔊 Nghe</button>` : ''}
            <button type="button" class="danger" style="padding:2px 6px;font-size:10px;" onclick="window.deleteVoiceProfile('${htmlEscape(p.id)}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Nạp thông tin 1 Voice Profile lên Form bên phải để chỉnh sửa
 */
window.editVoiceProfile = function(profileId) {
  const p = _currentVoiceProfiles.find(x => x.id === profileId);
  if (!p) return toast('Không tìm thấy thông tin giọng nói để chỉnh sửa.', true);

  _editingVoiceProfileId = p.id;

  if ($('voiceNewName')) $('voiceNewName').value = p.name || '';
  if ($('voiceNewId')) $('voiceNewId').value = p.id || '';
  if ($('voiceNewSamplePath')) $('voiceNewSamplePath').value = p.samplePath || '';
  if ($('voiceNewLanguage')) $('voiceNewLanguage').value = p.language || 'vi';
  if ($('voiceNewSpeed')) $('voiceNewSpeed').value = p.speed != null ? p.speed : 1.0;
  if ($('voiceNewModel')) $('voiceNewModel').value = p.model || 'omnivoice';
  if ($('voiceNewDescription')) $('voiceNewDescription').value = p.description || '';

  if ($('voiceFormHeaderTitle')) {
    $('voiceFormHeaderTitle').textContent = `1. ✏️ ĐANG CHỈNH SỬA GIỌNG CLONE: ${p.name.toUpperCase()}`;
  }
  if ($('voiceFormModeBadge')) {
    $('voiceFormModeBadge').textContent = `EDITING: ${p.id}`;
    $('voiceFormModeBadge').style.borderColor = '#fbbf24';
    $('voiceFormModeBadge').style.color = '#fbbf24';
  }
  if ($('voiceEditingBanner')) {
    $('voiceEditingBanner').style.display = 'flex';
  }
  if ($('voiceEditingBannerText')) {
    $('voiceEditingBannerText').innerHTML = `✏️ Đang sửa giọng <strong>${htmlEscape(p.name)}</strong> (Mã ID: <code>${htmlEscape(p.id)}</code>) — Có thể sửa Tên, ID, Ngôn ngữ, Tốc độ, Mô tả hoặc chọn File mẫu .wav/.mp3 mới.`;
  }
  if ($('btnSaveVoiceProfile')) {
    $('btnSaveVoiceProfile').innerHTML = `<span class="material-symbols-outlined">save</span> Cập Nhật Giọng [${htmlEscape(p.name)}]`;
  }

  if ($('voiceTestSelect')) $('voiceTestSelect').value = p.id;
  if ($('voiceTestSpeed')) $('voiceTestSpeed').value = p.speed != null ? p.speed : 1.0;

  renderVoiceProfilesList(_currentVoiceProfiles);
  $('voiceFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('voiceNewName')?.focus();
  toast(`✏️ Đã nạp giọng [${p.name}] vào khung chỉnh sửa bên phải.`);
};

/**
 * Đưa Form về lại trạng thái Tạo giọng mới
 */
window.resetVoiceProfileForm = function() {
  _editingVoiceProfileId = null;
  ['voiceNewName', 'voiceNewId', 'voiceNewSamplePath', 'voiceNewDescription'].forEach(id => {
    const el = $(id);
    if (el) el.value = '';
  });
  if ($('voiceNewSpeed')) $('voiceNewSpeed').value = '1.0';
  if ($('voiceFormHeaderTitle')) {
    $('voiceFormHeaderTitle').textContent = '1. THÊM MỚI HOẶC CHỈNH SỬA GIỌNG CLONE (.WAV / .MP3)';
  }
  if ($('voiceFormModeBadge')) {
    $('voiceFormModeBadge').textContent = 'CREATE / EDIT MODE';
    $('voiceFormModeBadge').style.borderColor = '';
    $('voiceFormModeBadge').style.color = '';
  }
  if ($('voiceEditingBanner')) {
    $('voiceEditingBanner').style.display = 'none';
  }
  if ($('btnSaveVoiceProfile')) {
    $('btnSaveVoiceProfile').innerHTML = '<span class="material-symbols-outlined">save</span> Lưu Giọng Vào Kho_Voice';
  }
  renderVoiceProfilesList(_currentVoiceProfiles);
};

/**
 * Cập nhật danh sách giọng vào các thẻ select
 */
function updateVoiceSelects(profiles = []) {
  const optionsHtml = [
    '<option value="default">🎙️ VoiceStudio OmniVoice (Mặc định)</option>',
    ...profiles.map(p => `<option value="${htmlEscape(p.id)}">🗣️ ${htmlEscape(p.name)} (${htmlEscape(p.language || 'vi')} · ${htmlEscape(p.model || 'VoiceStudio')})</option>`)
  ].join('');

  if ($('voiceTestSelect')) $('voiceTestSelect').innerHTML = optionsHtml;
  if ($('voiceScriptProfileSelect')) $('voiceScriptProfileSelect').innerHTML = optionsHtml;
  if ($('bridgeKeyVoiceSelect')) $('bridgeKeyVoiceSelect').innerHTML = optionsHtml;
  if ($('batchVoiceProfileSelect')) {
    const activeKey = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
    const keyMatchedVoice = typeof _defaultVoiceForChannelKey === 'function' ? _defaultVoiceForChannelKey(activeKey) : null;
    const saved = localStorage.getItem('vbs.batchVoiceProfileSelect');
    const fallbackId = (keyMatchedVoice && profiles.some(p => p.id === keyMatchedVoice))
      ? keyMatchedVoice
      : ((profiles.find(p => p.id === '03_mx_ba_gia_dona_elena') || profiles.find(p => p.id === 'homeless') || profiles[0])?.id || 'default');
    const prev = (keyMatchedVoice && profiles.some(p => p.id === keyMatchedVoice))
      ? keyMatchedVoice
      : ((saved && saved !== 'default' && profiles.some(p => p.id === saved)) ? saved : fallbackId);
    $('batchVoiceProfileSelect').innerHTML = optionsHtml;
    if (prev && [...$('batchVoiceProfileSelect').options].some(o => o.value === prev)) {
      $('batchVoiceProfileSelect').value = prev;
      if ($('bridgeKeyVoiceSelect')) $('bridgeKeyVoiceSelect').value = prev;
      if ($('voiceTestSelect')) $('voiceTestSelect').value = prev;
      if ($('voiceScriptProfileSelect')) $('voiceScriptProfileSelect').value = prev;
    }
    if (typeof syncBatchConfigToBridge === 'function') {
      setTimeout(() => syncBatchConfigToBridge({ silent: true }), 100);
    }
  }
}

/**
 * Nghe thử file audio mẫu tham chiếu của một profile
 */
window.playVoiceSample = function(profileId) {
  const p = _currentVoiceProfiles.find(x => x.id === profileId);
  if (!p || !p.samplePath) return toast('Không tìm thấy file mẫu âm thanh của giọng này.', true);
  try {
    const audio = new Audio(fileUrl(p.samplePath));
    audio.play();
    toast('Đang phát mẫu giọng: ' + p.name);
  } catch (err) {
    toast('Lỗi phát audio: ' + err.message, true);
  }
};

/**
 * Xóa một Profile
 */
window.deleteVoiceProfile = async function(profileId) {
  const p = _currentVoiceProfiles.find(x => x.id === profileId);
  if (!confirm(`Bạn có chắc muốn xóa giọng [${p?.name || profileId}]?`)) return;
  try {
    await api.voice.deleteProfile(profileId);
    toast('Đã xóa Voice Profile.');
    await loadVoiceProfiles();
  } catch (err) {
    toast('Lỗi xóa profile: ' + err.message, true);
  }
};

/**
 * Tải toàn bộ trang Voice Studio
 */
async function loadVoiceStudioPage() {
  await checkVoiceStudioHealth();
  await loadVoiceProfiles();
}

/**
 * Gắn toàn bộ sự kiện cho Tab Voice Studio và các Dropdown liên quan
 */
function setupVoiceStudioEvents() {
  if (window._vbsVoiceEventsBound) return;
  window._vbsVoiceEventsBound = true;

  // 1. Làm mới danh sách giọng & kiểm tra trạng thái
  if ($('refreshVoiceList')) {
    $('refreshVoiceList').onclick = () => {
      loadVoiceProfiles().then(() => toast('Đã làm mới danh sách giọng nói.'));
      checkVoiceStudioHealth();
    };
  }

  // 2. Mở trực tiếp ứng dụng VoiceStudio (cổng 3900)
  if ($('btnLaunchVoiceStudio')) {
    $('btnLaunchVoiceStudio').onclick = async () => {
      try {
        toast('Đang khởi động VoiceStudio (cổng 3900)...');
        const res = await api.voice.launchVoiceStudio();
        if (res?.success) {
          toast(res.message || 'Đã mở VoiceStudio thành công!');
          setTimeout(() => checkVoiceStudioHealth(), 2500);
          setTimeout(() => checkVoiceStudioHealth(), 6000);
        } else {
          toast(res?.error || 'Không tìm thấy bộ cài hoặc ứng dụng VoiceStudio.', true);
        }
      } catch (err) {
        toast('Lỗi mở VoiceStudio: ' + err.message, true);
      }
    };
  }

  // 3. Chọn file mẫu giọng
  if ($('btnPickVoiceSample')) {
    $('btnPickVoiceSample').onclick = async () => {
      const p = await api.chooseFile({
        title: 'Chọn file mẫu âm thanh tham chiếu (sample)',
        filters: [{ name: 'Audio Sample', extensions: ['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg'] }]
      });
      if (p && $('voiceNewSamplePath')) {
        $('voiceNewSamplePath').value = p;
      }
    };
  }

  // 4. Lưu mới hoặc Cập nhật Voice Profile
  if ($('btnSaveVoiceProfile')) {
    $('btnSaveVoiceProfile').onclick = async () => {
      const name = $('voiceNewName')?.value?.trim();
      const id = $('voiceNewId')?.value?.trim();
      const samplePath = $('voiceNewSamplePath')?.value?.trim();
      const language = $('voiceNewLanguage')?.value || 'vi';
      const speed = parseFloat($('voiceNewSpeed')?.value) || 1.0;
      const model = $('voiceNewModel')?.value || 'omnivoice';
      const description = $('voiceNewDescription')?.value?.trim() || '';

      if (!name) return toast('Vui lòng nhập tên giọng nói.', true);

      const existingMatch = _editingVoiceProfileId
        ? _currentVoiceProfiles.find(x => x.id === _editingVoiceProfileId)
        : _currentVoiceProfiles.find(x => x.id === id);

      if (!samplePath && !existingMatch?.hasSample) {
        return toast('Vui lòng chọn file mẫu âm thanh tham chiếu (.wav/.mp3).', true);
      }

      const isUpdating = Boolean(existingMatch);
      toast(`${isUpdating ? 'Đang cập nhật' : 'Đang lưu'} Voice Profile [${name}]...`);
      try {
        const savedProfile = await api.voice.saveProfile({
          originalId: _editingVoiceProfileId || existingMatch?.id || null,
          id,
          name,
          language,
          speed,
          model,
          description
        }, samplePath || existingMatch?.samplePath || null);

        // Nếu đang là giọng mặc định và đổi ID thì cập nhật lại biến lưu giọng mặc định
        const prevDefault = localStorage.getItem('vbs.batchVoiceProfileSelect');
        if (_editingVoiceProfileId && prevDefault === _editingVoiceProfileId && savedProfile?.id) {
          localStorage.setItem('vbs.batchVoiceProfileSelect', savedProfile.id);
        }

        toast(`✅ Đã ${isUpdating ? 'cập nhật' : 'lưu mới'} Voice Profile [${name}] thành công!`);
        window.resetVoiceProfileForm?.();
        await loadVoiceProfiles();
      } catch (err) {
        toast('Lỗi lưu profile: ' + err.message, true);
      }
    };
  }

  // 5. Thử giọng nhanh (Voice Test)
  if ($('btnRunVoiceTest')) {
    $('btnRunVoiceTest').onclick = async () => {
      const text = $('voiceTestText')?.value?.trim();
      const voice = $('voiceTestSelect')?.value || 'default';
      const speed = parseFloat($('voiceTestSpeed')?.value) || 1.0;

      if (!text) return toast('Vui lòng nhập câu văn bản thử giọng.', true);

      const btn = $('btnRunVoiceTest');
      const oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="vbs-spinner" style="border-color:#fff;border-top-color:transparent;margin-right:6px;"></span> Đang tạo...';

      try {
        toast('Đang tổng hợp giọng nói qua VoiceStudio...');
        const res = await api.voice.testGenerate({ text, voice, speed });
        if (res?.success && res.outputPath) {
          const player = $('voiceTestAudioPlayer');
          const box = $('voiceTestResult');
          if (box) box.style.display = 'block';
          if (player) {
            player.src = fileUrl(res.outputPath) + '?t=' + Date.now();
            player.play();
          }
          if ($('voiceTestDuration')) {
            $('voiceTestDuration').textContent = `Dung lượng: ${(res.sizeBytes / 1024).toFixed(1)} KB`;
          }
          await checkVoiceStudioHealth();
          toast('✅ Đã tạo âm thanh thử thành công!');
        } else {
          toast(res?.error || 'Tạo âm thanh thất bại.', true);
        }
      } catch (err) {
        toast('Lỗi tạo giọng thử: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    };
  }

  // 6. Tạo Voice Kịch Bản Dài (.txt -> .wav) Trực Tiếp
  if ($('btnPickVoiceScriptFile')) {
    $('btnPickVoiceScriptFile').onclick = async () => {
      const p = await api.chooseFile({
        title: 'Chọn file kịch bản văn bản (.txt)',
        filters: [{ name: 'Text Script', extensions: ['txt', 'md'] }]
      });
      if (p && $('voiceScriptFilePath')) {
        $('voiceScriptFilePath').value = p;
        if ($('voiceScriptOutputPath')) {
          $('voiceScriptOutputPath').value = p.replace(/\.[^.\\/]+$/, '') + '.wav';
        }
        try {
          const content = await api.voice.readScriptFile(p);
          if ($('voiceScriptContent') && content) {
            $('voiceScriptContent').value = content;
          }
        } catch {}
      }
    };
  }

  if ($('btnPickVoiceScriptOut')) {
    $('btnPickVoiceScriptOut').onclick = async () => {
      const defaultPath = $('voiceScriptOutputPath')?.value?.trim() || 'voice_output.wav';
      const p = await api.saveFile({
        defaultPath,
        filters: [{ name: 'WAV Audio', extensions: ['wav'] }, { name: 'MP3 Audio', extensions: ['mp3'] }]
      });
      if (p && $('voiceScriptOutputPath')) {
        $('voiceScriptOutputPath').value = p;
      }
    };
  }

  if (api.voice?.onGenerateProgress) {
    api.voice.onGenerateProgress((p) => {
      const box = $('voiceScriptProgressBox');
      const bar = $('voiceScriptProgressBar');
      const statusEl = $('voiceScriptProgressStatus');
      const pctEl = $('voiceScriptProgressPct');
      if (box) box.style.display = 'block';
      if (p.total && p.current != null) {
        const pct = Math.min(100, Math.round((p.current / p.total) * 100));
        if (bar) bar.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
      }
      if (statusEl && (p.status || p.message)) {
        statusEl.textContent = p.status || p.message;
      }
    });
  }

  if ($('btnGenerateFullScriptNow')) {
    $('btnGenerateFullScriptNow').onclick = async () => {
      const scriptPath = $('voiceScriptFilePath')?.value?.trim() || '';
      const scriptText = $('voiceScriptContent')?.value?.trim() || '';
      if (!scriptText && !scriptPath) {
        return toast('Vui lòng chọn file kịch bản (.txt) hoặc dán nội dung kịch bản vào ô văn bản.', true);
      }

      let outputPath = $('voiceScriptOutputPath')?.value?.trim();
      if (!outputPath && scriptPath) {
        outputPath = scriptPath.replace(/\.[^.\\/]+$/, '') + '.wav';
        if ($('voiceScriptOutputPath')) $('voiceScriptOutputPath').value = outputPath;
      }
      if (!outputPath) {
        outputPath = await api.saveFile({
          defaultPath: 'kich_ban_voice.wav',
          filters: [{ name: 'WAV Audio', extensions: ['wav'] }, { name: 'MP3 Audio', extensions: ['mp3'] }]
        });
        if (outputPath && $('voiceScriptOutputPath')) $('voiceScriptOutputPath').value = outputPath;
      }
      if (!outputPath) return toast('Vui lòng chọn nơi lưu file WAV đầu ra.', true);

      const voice = $('voiceScriptProfileSelect')?.value || 'default';
      const speed = parseFloat($('voiceScriptSpeed')?.value) || 1.0;

      const btn = $('btnGenerateFullScriptNow');
      const oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="vbs-spinner" style="border-color:#fff;border-top-color:transparent;margin-right:6px;"></span> Đang đọc kịch bản...';

      const progBox = $('voiceScriptProgressBox');
      const progBar = $('voiceScriptProgressBar');
      const statusEl = $('voiceScriptProgressStatus');
      const pctEl = $('voiceScriptProgressPct');
      const resBox = $('voiceFullScriptResult');
      if (progBox) progBox.style.display = 'block';
      if (progBar) progBar.style.width = '5%';
      if (pctEl) pctEl.textContent = '5%';
      if (statusEl) statusEl.textContent = 'Đang khởi tạo VoiceStudio & chia đoạn kịch bản...';
      if (resBox) resBox.style.display = 'none';

      try {
        const res = await api.voice.generateFullScript({
          scriptText,
          scriptPath,
          outputPath,
          voice,
          speed
        });

        if (res?.success && res.outputPath) {
          if (progBar) progBar.style.width = '100%';
          if (pctEl) pctEl.textContent = '100%';
          if (statusEl) statusEl.textContent = `✅ Hoàn tất! Đã ghép ${res.chunkCount || res.chunksCount || 1} câu thành 1 file WAV duy nhất & xóa sạch cache.`;
          if (resBox) resBox.style.display = 'block';
          const player = $('voiceFullScriptAudioPlayer');
          if (player) {
            player.src = fileUrl(res.outputPath) + '?t=' + Date.now();
          }
          if ($('btnOpenVoiceScriptOutFolder')) {
            $('btnOpenVoiceScriptOutFolder').onclick = () => {
              const dir = res.outputPath.replace(/[\\/][^\\/]+$/, '');
              api.openPath(dir);
            };
          }
          await checkVoiceStudioHealth();
          toast('✅ Đã xuất 1 file WAV kịch bản hoàn chỉnh & dọn sạch cache!');
        } else {
          if (statusEl) statusEl.textContent = '❌ Lỗi: ' + (res?.error || 'Không thể tạo voice.');
          toast(res?.error || 'Tạo voice kịch bản thất bại.', true);
        }
      } catch (err) {
        if (statusEl) statusEl.textContent = '❌ Lỗi: ' + err.message;
        toast('Lỗi tạo voice kịch bản: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    };
  }

  // 7. Toggle Voice mode & tự động lưu đường dẫn trên Batch Form
  if ($('batchVoiceSourceMode')) {
    $('batchVoiceSourceMode').onchange = () => {
      const mode = $('batchVoiceSourceMode').value;
      try { localStorage.setItem('vbs.batchVoiceSourceMode', mode); } catch {}
      const isExistingAudio = mode === 'EXISTING_AUDIO';
      if ($('batchVoiceProfileRow')) {
        $('batchVoiceProfileRow').style.opacity = isExistingAudio ? '0.4' : '1';
        if ($('batchVoiceProfileSelect')) $('batchVoiceProfileSelect').disabled = isExistingAudio;
      }
      if ($('batchVoiceFolderLabel')) {
        const inp = $('voiceFolder');
        if (inp) {
          inp.placeholder = !isExistingAudio
            ? 'Chọn thư mục chứa file kịch bản (.txt) hoặc audio (.mp3/.wav)'
            : 'Chọn thư mục voice; subtitle cùng tên có thể là .srt/.ass/.json';
        }
      }
    };
  }

  // Tự động nhớ các đường dẫn và cấu hình trên tab Tạo Batch
  try {
    const oldMedia = localStorage.getItem('vbs.mediaFolder') || '';
    if (/scratch[\\/]+e2e_test_project/i.test(oldMedia)) {
      localStorage.removeItem('vbs.mediaFolder');
    }
  } catch {}
  for (const fieldId of ['voiceFolder', 'mediaFolder', 'outputFolder', 'projectImageFolder', 'projectImageMode', 'singleProjectImageMode', 'jobIntroFolder', 'batchJobIntroAudioMode', 'batchVoiceSourceMode', 'batchVoiceProfileSelect', 'backgroundMode']) {
    const el = $(fieldId);
    if (!el) continue;
    try {
      const savedVal = localStorage.getItem('vbs.' + fieldId);
      if (savedVal && (!el.value || el.tagName === 'SELECT')) {
        el.value = savedVal;
        if (fieldId === 'backgroundMode') updateBatchSourceVisibility();
        if (fieldId === 'batchVoiceSourceMode') el.onchange?.();
      }
    } catch {}
    const persistField = () => {
      try { localStorage.setItem('vbs.' + fieldId, el.value || ''); } catch {}
    };
    el.addEventListener('change', persistField);
    el.addEventListener('input', persistField);
  }

  // Lưu lại cả khi chọn thư mục bằng nút [...]
  document.querySelectorAll('[data-pick-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        const id = btn.dataset.pickDir;
        const val = $(id)?.value;
        if (id && val) {
          try { localStorage.setItem('vbs.' + id, val); } catch {}
        }
      }, 600);
    });
  });

  if ($('btnOpenCurrentBatchOutput')) {
    $('btnOpenCurrentBatchOutput').onclick = () => {
      const outDir = $('outputFolder')?.value?.trim() || $('voiceFolder')?.value?.trim();
      if (!outDir) return toast('Chưa chọn thư mục Output.', true);
      api.openPath(outDir);
    };
  }
}

/* ========================================================================= */
/* MODULE QUẢN LÝ BẢN QUYỀN THEO THÁNG (LICENSE GUARD UI)                    */
/* ========================================================================= */

function applyLicenseStatusToUi(status, { forceOpen = false } = {}) {
  if (!status) return;
  state.licenseValid = Boolean(status.valid);
  state.licenseStatus = status;

  const pill = $('licensePill');
  const overlay = $('licenseLockOverlay');
  const closeBtn = $('btnCloseLicenseOverlay');
  const deactivateBtn = $('btnDeactivateLicense');
  const activeBox = $('licenseActiveInfoBox');
  const banner = $('licenseOverlayBanner');
  const title = $('licenseOverlayTitle');
  const midInput = $('licenseMachineIdInput');
  const errBox = $('licenseActivateError');

  if (midInput && status.machineId) {
    midInput.value = status.machineId;
  }

  if (pill) {
    if (status.valid) {
      const expStr = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString('vi-VN') : '';
      const days = Number(status.daysRemaining || 0);
      pill.textContent = `🔑 Bản quyền: Còn ${days} ngày (Hết: ${expStr})`;
      if (days <= 5) {
        pill.style.background = 'rgba(245,158,11,0.14)';
        pill.style.borderColor = '#f59e0b';
        pill.style.color = '#fbbf24';
      } else {
        pill.style.background = 'rgba(0,255,136,0.1)';
        pill.style.borderColor = 'rgba(0,255,136,0.42)';
        pill.style.color = '#00ff88';
      }
    } else {
      const isExpired = status.status === 'EXPIRED';
      const isRevoked = status.status === 'REVOKED';
      pill.textContent = isRevoked ? '🚫 Key đã bị thu hồi' : (isExpired ? '⚠️ Hết hạn bản quyền' : '🔒 Chưa kích hoạt Key');
      pill.style.background = 'rgba(239,68,68,0.14)';
      pill.style.borderColor = '#ef4444';
      pill.style.color = '#fca5a5';
    }
  }

  if (!overlay) return;

  if (!status.valid || forceOpen) {
    overlay.style.display = 'flex';
    if (errBox) {
      errBox.style.display = 'none';
      errBox.textContent = '';
    }

    if (status.valid) {
      if (closeBtn) closeBtn.style.display = 'block';
      if (deactivateBtn) deactivateBtn.style.display = 'block';
      if (activeBox) activeBox.style.display = 'block';
      if (title) title.textContent = 'Thông Tin & Gia Hạn Bản Quyền ZC TEAM';
      if (banner) {
        banner.style.background = 'rgba(0,255,136,0.1)';
        banner.style.borderColor = 'rgba(0,255,136,0.4)';
        banner.style.color = '#00ff88';
        banner.innerHTML = '✅ Bản quyền ZC TEAM của bạn đang hoạt động hợp lệ. Bạn có thể chọn hoặc dán mã Key mới vào bên dưới bất cứ lúc nào để gia hạn thêm tháng tiếp theo.';
      }
      if ($('licInfoCustomer')) $('licInfoCustomer').textContent = status.customer || 'Khách hàng ZC TEAM';
      if ($('licInfoPlan')) $('licInfoPlan').textContent = status.planLabel || status.planCode || 'Theo tháng';
      if ($('licInfoExpiry')) $('licInfoExpiry').textContent = status.expiresAt ? new Date(status.expiresAt).toLocaleString('vi-VN') : '—';
      if ($('licInfoRemaining')) $('licInfoRemaining').textContent = `${status.daysRemaining || 0} ngày (${status.hoursRemaining || 0} giờ)`;
    } else {
      if (closeBtn) closeBtn.style.display = 'none';
      if (deactivateBtn) deactivateBtn.style.display = 'none';
      if (activeBox) activeBox.style.display = 'none';
      const isExpired = status.status === 'EXPIRED';
      const isRevoked = status.status === 'REVOKED';
      if (title) title.textContent = isRevoked ? 'Mã Bản Quyền Đã Bị Thu Hồi / Khóa' : (isExpired ? 'Gia Hạn Bản Quyền Tháng' : 'Kích Hoạt Bản Quyền ZC TEAM');
      if (banner) {
        banner.style.background = 'rgba(239,68,68,0.14)';
        banner.style.borderColor = 'rgba(239,68,68,0.4)';
        banner.style.color = '#fca5a5';
        banner.textContent = (isRevoked ? '' : '🔒 ') + (status.message || 'Ứng dụng chưa được kích hoạt bản quyền. Vui lòng gửi Mã Máy bên dưới cho Admin để nhận License Key.');
      }
    }
  } else {
    overlay.style.display = 'none';
  }
}

async function initLicenseControls() {
  if (!api.license) return;

  try {
    const status = await api.license.status();
    applyLicenseStatusToUi(status, { forceOpen: !status?.valid });
  } catch (err) {
    console.warn('[License] Lỗi kiểm tra trạng thái:', err);
  }

  api.license.onChanged?.((status) => {
    applyLicenseStatusToUi(status, { forceOpen: !status?.valid });
  });

  if ($('licensePill')) {
    $('licensePill').onclick = async () => {
      const latest = await api.license.status().catch(() => state.licenseStatus);
      applyLicenseStatusToUi(latest, { forceOpen: true });
    };
  }

  if ($('btnCloseLicenseOverlay')) {
    $('btnCloseLicenseOverlay').onclick = () => {
      if (state.licenseValid && $('licenseLockOverlay')) {
        $('licenseLockOverlay').style.display = 'none';
      }
    };
  }

  if ($('btnCopyMachineId')) {
    $('btnCopyMachineId').onclick = async () => {
      const mid = $('licenseMachineIdInput')?.value || '';
      if (!mid) return;
      await api.copyText(mid);
      toast(`✅ Đã copy Mã Máy: ${mid}`);
    };
  }

  if ($('btnPasteLicenseKey')) {
    $('btnPasteLicenseKey').onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && $('licenseKeyInput')) {
          $('licenseKeyInput').value = text.trim();
          toast('Đã dán nội dung từ Clipboard.');
        }
      } catch {
        $('licenseKeyInput')?.focus();
      }
    };
  }

  if ($('licenseKeyPresetSelect')) {
    $('licenseKeyPresetSelect').onchange = async () => {
      const val = $('licenseKeyPresetSelect').value;
      if (val === 'CLIPBOARD') {
        try {
          const text = await navigator.clipboard.readText();
          if (text && $('licenseKeyInput')) {
            $('licenseKeyInput').value = text.trim();
            toast('📋 Đã nạp mã Key từ Clipboard.');
          }
        } catch {
          $('licenseKeyInput')?.focus();
        }
      } else if (val === 'CURRENT_ACTIVE') {
        const savedKey = localStorage.getItem('zc_last_activated_license_key') || '';
        if (savedKey && $('licenseKeyInput')) {
          $('licenseKeyInput').value = savedKey;
          toast('🔑 Đã chọn Key bản quyền lưu trên máy.');
        } else {
          toast('ℹ️ Bản quyền hiện tại đã được kích hoạt trong hệ thống.');
        }
      } else if (val && $('licenseKeyInput')) {
        $('licenseKeyInput').value = val;
      }
    };
  }

  if ($('topGlobalKeySelect')) {
    const savedChan = localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
    if ([...$('topGlobalKeySelect').options].some(o => o.value === savedChan)) {
      $('topGlobalKeySelect').value = savedChan;
    }
    $('topGlobalKeySelect').onchange = async () => {
      const ch = $('topGlobalKeySelect').value || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
      localStorage.setItem('zc_active_channel_key', ch);
      const iframe = $('scriptStudioIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'ZC_SWITCH_CHANNEL_KEY', channel: ch }, '*');
      }
      if (typeof applyChannelKeyPresetToUi === 'function') {
        await applyChannelKeyPresetToUi(ch);
      }
      toast(`🔑 Đã chọn Key / Kênh: ${ch} (Tự động nạp Project & Voice cố định của Key)`);
    };
    window.addEventListener('message', (ev) => {
      if (ev?.data?.type === 'ZC_CHANNEL_KEY_CHANGED' && ev.data.channel) {
        const ch = ev.data.channel;
        if ($('topGlobalKeySelect').value !== ch && [...$('topGlobalKeySelect').options].some(o => o.value === ch)) {
          $('topGlobalKeySelect').value = ch;
        }
        localStorage.setItem('zc_active_channel_key', ch);
        if (typeof applyChannelKeyPresetToUi === 'function') {
          applyChannelKeyPresetToUi(ch).catch(() => {});
        }
      }
    });
  }

  if ($('btnActivateLicenseNow')) {
    $('btnActivateLicenseNow').onclick = async () => {
      const rawKey = $('licenseKeyInput')?.value?.trim() || '';
      const errBox = $('licenseActivateError');
      if (!rawKey) {
        if (errBox) {
          errBox.style.display = 'block';
          errBox.textContent = '⚠️ Vui lòng dán mã License Key vào ô trên trước khi bấm Kích Hoạt.';
        }
        return toast('Vui lòng nhập mã License Key.', true);
      }

      const btn = $('btnActivateLicenseNow');
      const oldText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Đang xác minh Key...';

      try {
        const res = await api.license.activate(rawKey);
        if (res?.valid) {
          localStorage.setItem('zc_last_activated_license_key', rawKey);
          if ($('licenseKeyInput')) $('licenseKeyInput').value = '';
          if (errBox) errBox.style.display = 'none';
          applyLicenseStatusToUi(res, { forceOpen: false });
          toast(`🎉 Kích hoạt bản quyền thành công! Thời hạn còn ${res.daysRemaining} ngày.`);
        } else {
          if (errBox) {
            errBox.style.display = 'block';
            errBox.textContent = '❌ ' + (res?.message || 'Mã License Key không hợp lệ.');
          }
          toast(res?.message || 'Kích hoạt thất bại.', true);
        }
      } catch (err) {
        if (errBox) {
          errBox.style.display = 'block';
          errBox.textContent = '❌ Lỗi: ' + err.message;
        }
        toast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    };
  }

  if ($('btnDeactivateLicense')) {
    $('btnDeactivateLicense').onclick = async () => {
      if (!confirm('Bạn có chắc muốn gỡ mã bản quyền hiện tại khỏi máy này để nhập mã mới?')) return;
      const res = await api.license.deactivate();
      applyLicenseStatusToUi(res, { forceOpen: true });
      toast('Đã gỡ mã bản quyền hiện tại.');
    };
  }
}

/* ========================================================================= */
/* MODULE HỢP NHẤT PHƯƠNG ÁN A: KỊCH BẢN (BÀN #1→#6) ➔ VOICE & VIDEO (BÀN #7)*/
/* ========================================================================= */

let _lastBridgeState = null;

const DEFAULT_VOICE_BY_CHANNEL_KEY = {
  '01_Nhom_Ong_Gia_Tra_Dua_My_US': '01_us_ong_gia_gus_mahoney',
  '02_Nhom_Phu_Nu_Bao_Thu_My_US': '02_us_phu_nu_the_iron_rose',
  '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico': '03_mx_ba_gia_dona_elena',
  '04_Nhom_Ong_Gia_Trung_Tri_Mexico': '04_mx_ong_gia_padre_implacable',
  '05_Nhom_Manga_Doc_Than_Japan': '05_jp_manga_orewadokushin',
  '06_Huu_Tri_Viec_Lam_Japan': '06_jp_huu_tri_izumi',
  '07_Dong_Que_Co_Dien_Mexico': '07_mx_dong_que_viejo_campo',
  '08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico': '08_mx_ngoai_tinh_secretos',
  '09_Tieu_Su_Goc_Khuat_Sao_Mexico': '09_mx_tieu_su_tras_el_aplauso',
  '10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US': '10_us_cha_da_mau_black_dad',
  '11_Chuyen_Tinh_Dan_Ong_My_US': '11_us_chuyen_tinh_nam_romance',
  '12_Kinh_Di_Dem_Khuya_My_US': '12_us_kinh_di_midnight_visitor',
  'mexico': '03_mx_ba_gia_dona_elena',
  'homeless': 'homeless',
  'mafia': 'daden'
};

function _defaultVoiceForChannelKey(channelKey = '') {
  const k = String(channelKey || '').trim();
  return DEFAULT_VOICE_BY_CHANNEL_KEY[k] || null;
}

function _defaultLangForChannelKey(channelKey = '') {
  const k = String(channelKey || '').toLowerCase();
  if (k.includes('mexico') || k === 'mexico' || k.startsWith('03_') || k.startsWith('04_') || k.startsWith('07_') || k.startsWith('08_') || k.startsWith('09_')) return 'es';
  if (k.includes('japan') || k.includes('jp') || k.startsWith('05_') || k.startsWith('06_')) return 'ja';
  return 'en';
}

function _getGlobalLinkedFolders() {
  let disk = {};
  try {
    disk = api.linkedFolders?.get?.() || {};
  } catch {}
  let local = {};
  try {
    const raw = localStorage.getItem('zc_global_linked_folders');
    if (raw) local = JSON.parse(raw) || {};
  } catch {}
  return {
    applyStockOutputAllKeys: true,
    ...disk,
    ...local,
    tongHopByKey: {
      ...(disk.tongHopByKey || {}),
      ...(local.tongHopByKey || {})
    }
  };
}

async function _saveGlobalLinkedFolders(partial = {}) {
  const prev = _getGlobalLinkedFolders();
  const merged = {
    ...prev,
    ...partial,
    tongHopByKey: {
      ...(prev.tongHopByKey || {}),
      ...(partial.tongHopByKey || {})
    }
  };
  try {
    localStorage.setItem('zc_global_linked_folders', JSON.stringify(merged));
  } catch {}
  try {
    api.linkedFolders?.save?.(merged);
  } catch {}
  try {
    await api.scriptBridge?.saveSettings?.({ linkedFolders: merged });
  } catch {}
  return merged;
}
window._saveGlobalLinkedFolders = _saveGlobalLinkedFolders;

function _saveLocalKeyPreset(channelKey, partial = {}) {
  if (!channelKey) return;
  try {
    const raw = localStorage.getItem('zc_key_preset_' + channelKey);
    const prev = raw ? JSON.parse(raw) : {};
    const defaultVoice = _defaultVoiceForChannelKey(channelKey);
    const merged = {
      ...prev,
      projectId: $('batchProject')?.value || prev.projectId || null,
      templateId: $('batchTemplate')?.value || prev.templateId || null,
      voiceProfileId: partial.voiceProfileId || prev.voiceProfileId || defaultVoice || $('batchVoiceProfileSelect')?.value || 'default',
      whisperLanguage: $('batchSrtLanguage')?.value || prev.whisperLanguage || _defaultLangForChannelKey(channelKey),
      mediaFolder: $('mediaFolder')?.value || prev.mediaFolder || '',
      outputFolder: $('outputFolder')?.value || prev.outputFolder || '',
      ...partial
    };
    localStorage.setItem('zc_key_preset_' + channelKey, JSON.stringify(merged));
  } catch {}
}

async function applyChannelKeyPresetToUi(channelKey) {
  if (!channelKey) return;
  if ($('topGlobalKeySelect') && $('topGlobalKeySelect').value !== channelKey && [...$('topGlobalKeySelect').options].some(o => o.value === channelKey)) {
    $('topGlobalKeySelect').value = channelKey;
  }
  localStorage.setItem('zc_active_channel_key', channelKey);
  let localPreset = null;
  try {
    const raw = localStorage.getItem('zc_key_preset_' + channelKey);
    if (raw) localPreset = JSON.parse(raw);
  } catch {}
  const bridgePreset = _lastBridgeState?.channelConfigs?.[channelKey] || null;
  const linked = _getGlobalLinkedFolders();
  const preset = { ...(bridgePreset || {}), ...(localPreset || {}) };

  const autoLang = _defaultLangForChannelKey(channelKey);
  if ($('batchSrtLanguage')) {
    $('batchSrtLanguage').value = autoLang;
  }

  if (preset?.projectId && $('batchProject') && [...$('batchProject').options].some(o => o.value === preset.projectId)) {
    $('batchProject').value = preset.projectId;
    if ($('bridgeKeyProjectSelect')) $('bridgeKeyProjectSelect').value = preset.projectId;
    try {
      await loadTemplates(preset.projectId, preset.templateId || null);
    } catch {}
  } else if ($('bridgeKeyProjectSelect') && $('batchProject')) {
    $('bridgeKeyProjectSelect').value = $('batchProject').value;
  }

  const defaultKeyVoice = _defaultVoiceForChannelKey(channelKey);
  const targetVoiceId = (localPreset?.userCustomVoice && localPreset?.voiceProfileId)
    ? localPreset.voiceProfileId
    : (defaultKeyVoice || preset?.voiceProfileId || 'default');

  if (targetVoiceId && $('batchVoiceProfileSelect') && [...$('batchVoiceProfileSelect').options].some(o => o.value === targetVoiceId)) {
    $('batchVoiceProfileSelect').value = targetVoiceId;
    if ($('bridgeKeyVoiceSelect')) $('bridgeKeyVoiceSelect').value = targetVoiceId;
    if ($('voiceTestSelect')) $('voiceTestSelect').value = targetVoiceId;
    if ($('voiceScriptProfileSelect')) $('voiceScriptProfileSelect').value = targetVoiceId;
  } else if ($('bridgeKeyVoiceSelect') && $('batchVoiceProfileSelect')) {
    $('bridgeKeyVoiceSelect').value = $('batchVoiceProfileSelect').value;
  }

  const targetMedia = (linked.applyStockOutputAllKeys !== false && linked.mediaFolder)
    ? linked.mediaFolder
    : (preset?.mediaFolder || linked.mediaFolder || '');
  if (targetMedia && $('mediaFolder')) {
    $('mediaFolder').value = targetMedia;
  }

  const targetOut = (linked.applyStockOutputAllKeys !== false && linked.outputFolder)
    ? linked.outputFolder
    : (preset?.outputFolder || linked.outputFolder || '');
  if (targetOut && $('outputFolder')) {
    $('outputFolder').value = targetOut;
  }

  if (linked.projectImageFolder !== undefined && $('projectImageFolder')) {
    $('projectImageFolder').value = linked.projectImageFolder;
  }
  if (linked.projectImageMode && $('projectImageMode')) {
    $('projectImageMode').value = linked.projectImageMode;
  }
  if (linked.jobIntroFolder !== undefined && $('jobIntroFolder')) {
    $('jobIntroFolder').value = linked.jobIntroFolder;
  }
  if (linked.jobIntroAudioMode && $('batchJobIntroAudioMode')) {
    $('batchJobIntroAudioMode').value = linked.jobIntroAudioMode;
  }

  try {
    const iframe = $('scriptStudioIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'ZC_SWITCH_CHANNEL_KEY', channel: channelKey }, '*');
    }
  } catch {}

  _saveLocalKeyPreset(channelKey, {
    voiceProfileId: targetVoiceId,
    whisperLanguage: autoLang,
    mediaFolder: targetMedia || $('mediaFolder')?.value || '',
    outputFolder: targetOut || $('outputFolder')?.value || ''
  });
  await syncBatchConfigToBridge({ silent: true });
}

async function syncBatchConfigToBridge({ silent = true } = {}) {
  if (!api.scriptBridge?.lockConfig) return null;
  if (silent && !state.workspaceLoaded) return null;
  try {
    const rawCfg = collectBatch();
    applyDisclaimerSelection(rawCfg, 'batch');
    const linked = _getGlobalLinkedFolders();

    if (linked.mediaFolder && (!rawCfg.mediaFolder || /^E:\\OBS-Recordings/i.test(rawCfg.mediaFolder) || linked.applyStockOutputAllKeys !== false)) {
      rawCfg.mediaFolder = linked.mediaFolder;
      if ($('mediaFolder')) $('mediaFolder').value = linked.mediaFolder;
    }
    if (linked.outputFolder && (!rawCfg.outputFolder || /^D:\\MAFIA_STUDIO_WEB/i.test(rawCfg.outputFolder) || linked.applyStockOutputAllKeys !== false)) {
      rawCfg.outputFolder = linked.outputFolder;
      if ($('outputFolder')) $('outputFolder').value = linked.outputFolder;
    }
    if (linked.projectImageFolder !== undefined) {
      rawCfg.projectImageFolder = linked.projectImageFolder;
      if ($('projectImageFolder')) $('projectImageFolder').value = linked.projectImageFolder;
    }
    if (linked.projectImageMode) {
      rawCfg.projectImageMode = linked.projectImageMode;
      if ($('projectImageMode')) $('projectImageMode').value = linked.projectImageMode;
    }
    if (linked.jobIntroFolder !== undefined) {
      rawCfg.jobIntroFolder = linked.jobIntroFolder;
      if ($('jobIntroFolder')) $('jobIntroFolder').value = linked.jobIntroFolder;
    }
    if (linked.jobIntroAudioMode) {
      rawCfg.jobIntroAudioMode = linked.jobIntroAudioMode;
      if ($('batchJobIntroAudioMode')) $('batchJobIntroAudioMode').value = linked.jobIntroAudioMode;
    }
    if (linked.khoGreenFolder) {
      rawCfg.khoGreenFolder = linked.khoGreenFolder;
    }
    if (linked.disclaimerPath !== undefined) {
      rawCfg.disclaimerPath = linked.disclaimerPath;
      rawCfg.disclaimerEnabled = Boolean(linked.disclaimerEnabled && linked.disclaimerPath);
    }

    _saveLocalKeyPreset(rawCfg.channelKey, {
      projectId: rawCfg.projectId,
      templateId: rawCfg.templateId,
      voiceProfileId: rawCfg.voiceProfileId,
      whisperLanguage: rawCfg.whisperLanguage,
      mediaFolder: rawCfg.mediaFolder,
      outputFolder: rawCfg.outputFolder
    });
    const st = await api.scriptBridge.lockConfig(rawCfg);
    if (st) renderScriptBridgeState(st);
    if (!silent) {
      toast(`🔒 Đã khóa cấu hình Tạo Video cố định cho Key [${rawCfg.channelKey}]!`);
    }
    return st;
  } catch (err) {
    if (!silent) toast('Lỗi khóa cấu hình Video: ' + err.message, true);
    return null;
  }
}

function bridgeModeValueFromSettings(settings = {}) {
  if (!settings || settings.enabled === false || settings.actionMode === 'DISABLED') {
    return 'DISABLED';
  }
  if (settings.actionMode === 'ONLY_RENDER_VOICE') {
    return 'STREAMING_VOICE';
  }
  if (settings.triggerMode === 'BATCH_AFTER_ALL') {
    return 'BATCH_VIDEO';
  }
  return 'STREAMING_VIDEO';
}

function settingsFromBridgeModeValue(modeValue) {
  switch (modeValue) {
    case 'DISABLED':
      return { enabled: false, actionMode: 'DISABLED' };
    case 'STREAMING_VOICE':
      return { enabled: true, triggerMode: 'STREAMING', actionMode: 'ONLY_RENDER_VOICE' };
    case 'BATCH_VIDEO':
      return { enabled: true, triggerMode: 'BATCH_AFTER_ALL', actionMode: 'RENDER_VOICE_THEN_VIDEO' };
    case 'STREAMING_VIDEO':
    default:
      return { enabled: true, triggerMode: 'STREAMING', actionMode: 'RENDER_VOICE_THEN_VIDEO' };
  }
}

let _wasScriptServerOnline = false;
let _lastScriptServerUrl = '';
let _autoEnsureServerTimer = null;

function renderScriptBridgeState(st) {
  if (!st) return;
  const targetUrl = String(st.scriptServerUrl || 'http://127.0.0.1:8098').replace(/\/+$/, '');
  const becameOnline = Boolean(st.scriptServerOnline) && (!_wasScriptServerOnline || (_lastScriptServerUrl && _lastScriptServerUrl !== targetUrl));
  _wasScriptServerOnline = Boolean(st.scriptServerOnline);
  if (st.scriptServerOnline) _lastScriptServerUrl = targetUrl;
  _lastBridgeState = st;

  const badge = $('scriptStudioServerBadge');
  if (badge) {
    if (st.scriptServerOnline) {
      const portLabel = targetUrl.split(':').pop() || '8098';
      badge.style.background = '#065f46';
      badge.style.color = '#34d399';
      badge.textContent = `🟢 Engine Kịch Bản: Đang hoạt động (${portLabel})`;
      const iframe = $('scriptStudioIframe');
      const curSrc = String(iframe?.getAttribute('src') || '');
      if (iframe && (becameOnline || !curSrc.startsWith(targetUrl))) {
        iframe.onload = () => {
          try {
            const curChan = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
            iframe.contentWindow?.postMessage({ type: 'ZC_SWITCH_CHANNEL_KEY', channel: curChan }, '*');
          } catch {}
        };
        iframe.src = targetUrl + '/?embedded=1&t=' + Date.now();
      }
    } else {
      badge.style.background = '#854d0e';
      badge.style.color = '#fde047';
      badge.textContent = '🟠 Engine Kịch Bản: Đang khởi động...';
      if (!_autoEnsureServerTimer) {
        _autoEnsureServerTimer = setTimeout(async () => {
          _autoEnsureServerTimer = null;
          try {
            const res = await api.scriptBridge?.ensureScriptServer?.();
            const nextSt = await api.scriptBridge?.status?.();
            if (nextSt) {
              if (res?.online) nextSt.scriptServerOnline = true;
              renderScriptBridgeState(nextSt);
            }
          } catch {}
        }, 2000);
      }
    }
  }

  const modeSelect = $('bridgeModeSelect');
  if (modeSelect && st.settings) {
    const val = bridgeModeValueFromSettings(st.settings);
    if (modeSelect.value !== val) modeSelect.value = val;
  }

  const copyCheck = $('bridgeCopyMp4ToTongHop');
  if (copyCheck && st.settings) {
    copyCheck.checked = Boolean(st.settings.copyMp4ToTongHop);
  }

  const summaryEl = $('bridgeLockedConfigSummaryText');
  if ($('bridgeKeyProjectSelect') && $('batchProject') && $('bridgeKeyProjectSelect').value !== $('batchProject').value) {
    $('bridgeKeyProjectSelect').value = $('batchProject').value;
  }
  if ($('bridgeKeyVoiceSelect') && $('batchVoiceProfileSelect') && $('bridgeKeyVoiceSelect').value !== $('batchVoiceProfileSelect').value) {
    $('bridgeKeyVoiceSelect').value = $('batchVoiceProfileSelect').value;
  }
  if (summaryEl && st.lockedConfigSummary) {
    const s = st.lockedConfigSummary;
    const activeKey = $('topGlobalKeySelect')?.value || st.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
    const tplCount = Number(s.templateLayersCount || 0);
    const disColor = s.disclaimerEnabled ? '#34d399' : '#94a3b8';
    summaryEl.style.cursor = 'pointer';
    summaryEl.title = 'Bấm để xem bảng chi tiết Cấu hình xuất ra, Template, Disclaimer và các Folder chứa dữ liệu';
    summaryEl.onclick = () => openLockedConfigInspectorModal();
    summaryEl.innerHTML = [
      `<span>🔑 Key: <strong style="color:#fbbf24;">${htmlEscape(activeKey)}</strong></span>`,
      `<span>📁 Project: <strong style="color:#a5b4fc;">${htmlEscape(s.projectName || 'Default')}</strong></span>`,
      `<span>🎨 Template: <strong style="color:#38bdf8;">${htmlEscape(s.templateName)}${tplCount ? ` (${tplCount} layers)` : ''}</strong></span>`,
      `<span>⚠️ Disclaimer: <strong style="color:${disColor};">${htmlEscape(s.disclaimerLabel || '⚪ TẮT')}</strong></span>`,
      `<span>🎙️ Giọng AI: <strong style="color:#34d399;">${htmlEscape(s.voiceProfileName)}</strong></span>`,
      `<span>🎞️ Kho Stock: <strong style="color:#e2e8f0;" title="${htmlEscape(s.mediaFolder)}">${htmlEscape(s.mediaFolder)}</strong> <button type="button" onclick="event.stopPropagation();window.browseLinkedFolder('mediaFolder','Chọn Folder Kho Stock Video nền');" style="padding:1px 6px;font-size:10px;background:#1e3a8a;color:#93c5fd;border:1px solid #3b82f6;border-radius:4px;cursor:pointer;margin-left:3px;">📁 Chọn</button></span>`,
      `<span>💬 Sub: <strong style="color:#c084fc;">${htmlEscape(s.subtitleEffectLabel)}</strong></span>`,
      `<span>📂 Output MP4: <strong style="color:#93c5fd;" title="${htmlEscape(s.outputFolder)}">${htmlEscape(s.outputFolder)}</strong> <button type="button" onclick="event.stopPropagation();window.browseLinkedFolder('outputFolder','Chọn Folder Xuất Video Thành Phẩm (.mp4)');" style="padding:1px 6px;font-size:10px;background:#064e3b;color:#6ee7b7;border:1px solid #10b981;border-radius:4px;cursor:pointer;margin-left:3px;">📁 Chọn</button></span>`
    ].join('<span style="color:#334155;">|</span>');
  }

  const queueBox = $('bridgeQueueBox');
  const queueTitle = $('bridgeQueueTitle');
  const queueList = $('bridgeQueueList');
  const items = Array.isArray(st.queue) ? st.queue : [];

  if (queueBox && queueList) {
    if (!items.length) {
      queueBox.style.display = 'none';
    } else {
      queueBox.style.display = 'block';
      const activeCount = items.filter(x => ['RENDERING', 'WAITING_GPU', 'WAITING_BATCH'].includes(x.status)).length;
      const doneCount = items.filter(x => x.status === 'COMPLETED').length;
      if (queueTitle) {
        queueTitle.textContent = `🎬 Bàn #7 — Tiến Độ Tự Động Tạo Voice & Render Video GPU (${doneCount}/${items.length} hoàn tất · ${activeCount} đang xử lý)`;
      }
      queueList.innerHTML = items.slice().reverse().map((job) => {
        const statusColor = job.status === 'COMPLETED' ? '#10b981' :
          job.status === 'FAILED' ? '#ef4444' :
          job.status === 'RENDERING' ? '#38bdf8' : '#f59e0b';
        const openBtn = job.videoOutputPath
          ? `<button type="button" onclick="window.openBridgePath('${htmlEscape(job.videoOutputPath.replace(/\\/g, '\\\\'))}')" style="padding:2px 8px;font-size:10px;background:#065f46;color:#d1fae5;border:1px solid #10b981;border-radius:4px;cursor:pointer;">▶️ Mở MP4</button>`
          : (job.voiceOutputPath && job.status === 'COMPLETED'
            ? `<button type="button" onclick="window.openBridgePath('${htmlEscape(job.voiceOutputPath.replace(/\\/g, '\\\\'))}')" style="padding:2px 8px;font-size:10px;background:#065f46;color:#d1fae5;border:1px solid #10b981;border-radius:4px;cursor:pointer;">🔊 Mở WAV</button>`
            : '');
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#111827;border:1px solid #1e293b;border-radius:5px;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></span>
              <strong style="color:#f1f5f9;white-space:nowrap;">${htmlEscape(job.scriptName || job.projectId)}</strong>
              <span style="color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${htmlEscape(job.stage || job.status)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <span style="font-family:monospace;color:${statusColor};font-weight:700;">${job.percent || 0}%</span>
              ${openBtn}
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

window.openBridgePath = function(p) {
  if (p && !String(p).startsWith('(')) api.openPath(p);
};

const ALL_15_CHANNEL_KEYS = [
  '01_Nhom_Ong_Gia_Tra_Dua_My_US',
  '02_Nhom_Phu_Nu_Bao_Thu_My_US',
  '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico',
  '04_Nhom_Ong_Gia_Trung_Tri_Mexico',
  '05_Nhom_Manga_Doc_Than_Japan',
  '06_Huu_Tri_Viec_Lam_Japan',
  '07_Dong_Que_Co_Dien_Mexico',
  '08_Tinh_Yeu_Ngoai_Tinh_Phan_Boi_Mexico',
  '09_Tieu_Su_Goc_Khuat_Sao_Mexico',
  '10_Nguoi_Cha_Da_Mau_CEO_Ngam_My_US',
  '11_Chuyen_Tinh_Dan_Ong_My_US',
  '12_Kinh_Di_Dem_Khuya_My_US',
  'mexico',
  'homeless',
  'mafia'
];

window.applyLinkedFolderValue = async function(kind, rawValue) {
  let val = String(rawValue ?? '').trim();
  if (val.startsWith('(')) val = '';
  const applyAllEl = $('chkApplyStockOutputAllKeys');
  const applyAll = applyAllEl ? Boolean(applyAllEl.checked) : (_getGlobalLinkedFolders().applyStockOutputAllKeys !== false);
  const activeKey = $('topGlobalKeySelect')?.value || _lastBridgeState?.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';

  try {
    if (kind === 'mediaFolder') {
      if ($('mediaFolder')) $('mediaFolder').value = val;
      try { localStorage.setItem('vbs.mediaFolder', val); } catch {}
      await _saveGlobalLinkedFolders({ mediaFolder: val, applyStockOutputAllKeys: applyAll });
      if (applyAll) {
        for (const k of ALL_15_CHANNEL_KEYS) {
          _saveLocalKeyPreset(k, { mediaFolder: val });
        }
      } else {
        _saveLocalKeyPreset(activeKey, { mediaFolder: val });
      }
      if (val && api.libraries?.create) {
        try {
          const libs = await api.libraries.list();
          let matched = (libs || []).find((l) => String(l.root_path || '').toLowerCase() === val.toLowerCase());
          if (!matched) {
            matched = await api.libraries.create({
              name: val.split(/[\\/]/).filter(Boolean).pop() || 'Kho Stock Video',
              rootPath: val,
              libraryType: 'STOCK'
            });
          }
          state.libraries = await api.libraries.list();
          fillSelects();
          if (matched?.id && $('batchLibrary')) {
            $('batchLibrary').value = matched.id;
          }
        } catch {}
      }
      toast(val ? `🎞️ Đã chọn Folder Kho Stock Video: ${val}` : 'Đã xóa đường dẫn Kho Stock Video.');
    } else if (kind === 'outputFolder') {
      if ($('outputFolder')) $('outputFolder').value = val;
      try { localStorage.setItem('vbs.outputFolder', val); } catch {}
      await _saveGlobalLinkedFolders({ outputFolder: val, applyStockOutputAllKeys: applyAll });
      if (applyAll) {
        for (const k of ALL_15_CHANNEL_KEYS) {
          _saveLocalKeyPreset(k, { outputFolder: val });
        }
      } else {
        _saveLocalKeyPreset(activeKey, { outputFolder: val });
      }
      if (val && api.projects?.update) {
        try {
          const pid = $('batchProject')?.value || state.selectedProject?.id;
          const proj = (state.projects || []).find((p) => p.id === pid) || state.selectedProject;
          if (proj?.id) {
            await api.projects.update(proj.id, {
              ...proj,
              outputRootPath: val,
              output_root_path: val
            });
          }
        } catch {}
      }
      toast(val ? `🏁 Đã chọn Folder Xuất Video Thành Phẩm (.mp4): ${val}` : 'Đã đặt lại Folder Output.');
    } else if (kind === 'projectImageFolder') {
      if ($('projectImageFolder')) $('projectImageFolder').value = val;
      try { localStorage.setItem('vbs.projectImageFolder', val); } catch {}
      await _saveGlobalLinkedFolders({ projectImageFolder: val });
      if (val && typeof scanAndRenderProjectImageFolderList === 'function') {
        scanAndRenderProjectImageFolderList(val).catch(() => {});
      }
      toast(val ? `🖼️ Đã chọn Folder Ảnh/Green theo Voice: ${val}` : '🖼️ Đã để trống Folder Ảnh theo Voice (Dùng 100% nền Stock).');
    } else if (kind === 'projectImageMode') {
      const m = String(val || 'IMAGE').toUpperCase() === 'GREEN' ? 'GREEN' : 'IMAGE';
      if ($('projectImageMode')) $('projectImageMode').value = m;
      try { localStorage.setItem('vbs.projectImageMode', m); } catch {}
      await _saveGlobalLinkedFolders({ projectImageMode: m });
      toast(`🖼️ Đã đổi chế độ Ảnh theo Voice sang: ${m === 'GREEN' ? 'Tách nền Phông Xanh (Chroma Key)' : 'Ảnh thường / PNG trong suốt'}`);
    } else if (kind === 'jobIntroFolder') {
      if ($('jobIntroFolder')) $('jobIntroFolder').value = val;
      try { localStorage.setItem('vbs.jobIntroFolder', val); } catch {}
      await _saveGlobalLinkedFolders({ jobIntroFolder: val });
      toast(val ? `🎬 Đã chọn Folder Video Intro theo Voice: ${val}` : '🎬 Đã để trống Folder Video Intro riêng.');
    } else if (kind === 'jobIntroAudioMode') {
      const m = String(val || 'MUTE').toUpperCase() === 'KEEP' ? 'KEEP' : 'MUTE';
      if ($('batchJobIntroAudioMode')) $('batchJobIntroAudioMode').value = m;
      try { localStorage.setItem('vbs.batchJobIntroAudioMode', m); } catch {}
      await _saveGlobalLinkedFolders({ jobIntroAudioMode: m });
      toast(`🔊 Đã đổi chế độ âm thanh Intro sang: ${m}`);
    } else if (kind === 'khoGreenFolder') {
      await _saveGlobalLinkedFolders({ khoGreenFolder: val });
      toast(val ? `📦 Đã chọn Folder Kho Green & Disclaimer: ${val}` : 'Đã đặt lại Folder Kho_Green mặc định.');
    } else if (kind === 'activeKeyTongHopFolder') {
      const patch = { tongHopByKey: { [activeKey]: val } };
      if (activeKey === 'homeless') patch.tongHopHomelessFolder = val;
      if (activeKey === 'mafia') patch.tongHopMafiaFolder = val;
      if (activeKey === 'mexico' || activeKey === '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico') patch.tongHopMexicoFolder = val;
      await _saveGlobalLinkedFolders(patch);
      toast(`📝 Đã chọn Folder TONG HOP cho Key [${activeKey}]: ${val}`);
    } else if (kind === 'tongHopHomelessFolder') {
      await _saveGlobalLinkedFolders({ tongHopHomelessFolder: val, tongHopByKey: { homeless: val } });
      toast(`📝 Đã chọn Folder TONG HOP (Kênh Homeless): ${val}`);
    } else if (kind === 'tongHopMafiaFolder') {
      await _saveGlobalLinkedFolders({ tongHopMafiaFolder: val, tongHopByKey: { mafia: val } });
      toast(`📝 Đã chọn Folder TONG HOP (Kênh Mafia): ${val}`);
    } else if (kind === 'tongHopMexicoFolder') {
      await _saveGlobalLinkedFolders({
        tongHopMexicoFolder: val,
        tongHopByKey: { mexico: val, '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico': val }
      });
      toast(`📝 Đã chọn Folder TONG HOP (Kênh MEXICO BÀ CÔ): ${val}`);
    }

    await syncBatchConfigToBridge({ silent: true });
    const latestSt = await api.scriptBridge?.status?.();
    if (latestSt) renderScriptBridgeState(latestSt);
    if ($('modal')?.classList.contains('open') || $('modal')?.style?.display === 'flex' || document.querySelector('#modalBtnEditBatchConfig')) {
      openLockedConfigInspectorModal();
    }
  } catch (err) {
    toast('Lỗi lưu đường dẫn Folder: ' + err.message, true);
  }
};

window.browseLinkedFolder = async function(kind, titleText = 'Chọn thư mục liên kết') {
  const picked = await api.chooseDirectory({ title: titleText });
  if (!picked) return;
  await window.applyLinkedFolderValue(kind, picked);
};

window.saveLinkedFolderFromInput = async function(kind, inputId) {
  const el = $(inputId);
  if (!el) return;
  await window.applyLinkedFolderValue(kind, el.value);
};

window.runVideoFromLinkedTongHop = async function(folderPath) {
  await syncBatchConfigToBridge({ silent: true });
  let targetDir = String(folderPath || '').trim();
  if (!targetDir || targetDir.startsWith('(')) {
    targetDir = await api.chooseDirectory({ title: 'Chọn thư mục TONG HOP chứa kịch bản (.txt)' });
  }
  if (!targetDir) return;
  try {
    const res = await api.scriptBridge.enqueueFolder(targetDir);
    toast(`🚀 Đã đẩy ${res?.count || 0} kịch bản từ [${targetDir}] vào Bàn #7 để Tạo Voice & Render Video!`);
    const st = await api.scriptBridge.status();
    if (st) renderScriptBridgeState(st);
  } catch (err) {
    toast('Lỗi chạy tạo video từ folder: ' + err.message, true);
  }
};

window.pickDisclaimerVideoFileInModal = async function() {
  const filePath = await api.chooseFile({
    title: 'Chọn file Video Disclaimer chèn đầu video (.mp4, .mov, .webm)',
    filters: [{ name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
  });
  if (!filePath) return;
  try {
    if (api.projectAssets?.create) {
      const created = await api.projectAssets.create({
        assetType: 'DISCLAIMER_VIDEO',
        sourcePath: filePath,
        name: filePath.split(/[\\/]/).pop()
      });
      await loadProjectAssets();
      if (created?.id && $('batchDisclaimerAsset')) {
        $('batchDisclaimerAsset').value = created.id;
      }
    }
    if ($('batchDisclaimer')) $('batchDisclaimer').checked = true;
    await _saveGlobalLinkedFolders({ disclaimerEnabled: true, disclaimerPath: filePath });
    await syncBatchConfigToBridge({ silent: true });
    const st = await api.scriptBridge?.status?.();
    if (st) renderScriptBridgeState(st);
    openLockedConfigInspectorModal();
    toast(`🟢 Đã chọn và BẬT Video Disclaimer: ${filePath.split(/[\\/]/).pop()}`);
  } catch (err) {
    toast('Lỗi chọn file Disclaimer: ' + err.message, true);
  }
};

window.toggleDisclaimerInModal = async function() {
  const s = _lastBridgeState?.lockedConfigSummary || {};
  const nextEnabled = !s.disclaimerEnabled;
  if ($('batchDisclaimer')) $('batchDisclaimer').checked = nextEnabled;
  let dPath = s.disclaimerPath || _getGlobalLinkedFolders().disclaimerPath || '';
  if (nextEnabled && !dPath) {
    await window.pickDisclaimerVideoFileInModal();
    return;
  }
  await _saveGlobalLinkedFolders({ disclaimerEnabled: nextEnabled, disclaimerPath: nextEnabled ? dPath : '' });
  await syncBatchConfigToBridge({ silent: true });
  const st = await api.scriptBridge?.status?.();
  if (st) renderScriptBridgeState(st);
  openLockedConfigInspectorModal();
  toast(nextEnabled ? '🟢 Đã BẬT chèn Video Disclaimer đầu video.' : '⚪ Đã TẮT Video Disclaimer đầu video.');
};

function openLockedConfigInspectorModal() {
  const s = _lastBridgeState?.lockedConfigSummary || {};
  const linked = _getGlobalLinkedFolders();
  const activeKey = $('topGlobalKeySelect')?.value || s.activeKey || _lastBridgeState?.activeChannelKey || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
  const layers = Array.isArray(s.templateLayersList) ? s.templateLayersList : [];
  const layersHtml = layers.length
    ? layers.map((l, idx) => `<div style="display:flex;justify-content:space-between;padding:4px 8px;background:#090d16;border:1px solid #1e293b;border-radius:4px;font-size:11px;">
        <span><strong>#${idx + 1}. ${htmlEscape(l.name)}</strong> <span style="color:#38bdf8;">[${htmlEscape(l.type)}]</span></span>
        <span style="color:#94a3b8;">${htmlEscape(l.source || '—')}</span>
      </div>`).join('')
    : '<div style="font-size:11px;color:#94a3b8;">Template chưa có layer phụ (Chỉ chạy Stock nền + Phụ đề).</div>';

  const editableFolderRow = ({
    kind,
    label,
    folderPath,
    placeholder = 'Chưa chọn thư mục — Bấm [📁 Chọn Folder] hoặc dán đường dẫn vào đây...',
    note = '',
    allowClear = false,
    allowRunTongHop = false,
    extraControlHtml = '',
    highlightColor = '#1e293b'
  }) => {
    const rawStr = String(folderPath || '').trim();
    const isPlaceholder = rawStr.startsWith('(');
    const cleanVal = isPlaceholder ? '' : rawStr;
    const canOpen = Boolean(cleanVal);
    const escapedJs = canOpen ? htmlEscape(cleanVal.replace(/\\/g, '\\\\')) : '';
    const inputId = `modalFolderInput_${kind}`;
    const safeTitle = htmlEscape(label.replace(/<[^>]+>/g, ''));

    return `<div style="display:flex;flex-direction:column;padding:9px 11px;background:#090d16;border:1px solid ${highlightColor};border-radius:7px;gap:6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-size:11.5px;color:#e2e8f0;font-weight:700;">${label}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${extraControlHtml}
          <button type="button" onclick="window.browseLinkedFolder('${kind}', '${safeTitle}')" style="padding:4px 10px;font-size:11px;font-weight:700;background:#4f46e5;color:#ffffff;border:1px solid #6366f1;border-radius:5px;cursor:pointer;white-space:nowrap;">📁 Chọn Folder</button>
          <button type="button" onclick="window.saveLinkedFolderFromInput('${kind}', '${inputId}')" style="padding:4px 9px;font-size:11px;font-weight:600;background:#065f46;color:#d1fae5;border:1px solid #10b981;border-radius:5px;cursor:pointer;white-space:nowrap;" title="Lưu đường dẫn đã nhập trong ô">💾 Lưu</button>
          ${allowClear && cleanVal ? `<button type="button" onclick="window.applyLinkedFolderValue('${kind}', '')" style="padding:4px 8px;font-size:11px;background:#3f1d2e;color:#fda4af;border:1px solid #be123c;border-radius:5px;cursor:pointer;white-space:nowrap;" title="Xóa / Để trống mục này">🗑️ Để trống</button>` : ''}
          ${canOpen ? `<button type="button" onclick="window.openBridgePath('${escapedJs}')" style="padding:4px 10px;font-size:11px;background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:5px;cursor:pointer;white-space:nowrap;">📂 Mở Folder</button>` : ''}
          ${allowRunTongHop && canOpen ? `<button type="button" onclick="window.runVideoFromLinkedTongHop('${escapedJs}')" style="padding:4px 10px;font-size:11px;font-weight:700;background:#047857;color:#ecfdf5;border:1px solid #34d399;border-radius:5px;cursor:pointer;white-space:nowrap;" title="Đẩy toàn bộ kịch bản .txt trong folder này vào Bàn #7 để làm Video ngay">▶️ Tạo Video</button>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <input id="${inputId}" type="text" value="${htmlEscape(cleanVal)}" placeholder="${htmlEscape(isPlaceholder ? rawStr : placeholder)}" onkeydown="if(event.key==='Enter'){event.preventDefault();window.saveLinkedFolderFromInput('${kind}','${inputId}');}" style="width:100%;padding:6px 10px;font-size:12px;font-family:'JetBrains Mono',monospace;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:5px;" />
      </div>
      ${note ? `<div style="font-size:10.5px;color:#94a3b8;">${note}</div>` : ''}
    </div>`;
  };

  const imgModeCtrl = `<select onchange="window.applyLinkedFolderValue('projectImageMode', this.value)" style="padding:3px 8px;font-size:11px;background:#0f172a;color:#38bdf8;border:1px solid #334155;border-radius:5px;width:auto;">
    <option value="IMAGE" ${s.projectImageMode !== 'GREEN' ? 'selected' : ''}>🖼️ Ảnh thường / PNG trong suốt</option>
    <option value="GREEN" ${s.projectImageMode === 'GREEN' ? 'selected' : ''}>🟢 Tách nền Phông Xanh (Chroma Key)</option>
  </select>`;

  const introAudioCtrl = `<select onchange="window.applyLinkedFolderValue('jobIntroAudioMode', this.value)" style="padding:3px 8px;font-size:11px;background:#0f172a;color:#fde047;border:1px solid #334155;border-radius:5px;width:auto;">
    <option value="MUTE" ${s.jobIntroAudioMode !== 'KEEP' ? 'selected' : ''}>🔇 Tắt tiếng Intro (MUTE)</option>
    <option value="KEEP" ${s.jobIntroAudioMode === 'KEEP' ? 'selected' : ''}>🔊 Giữ tiếng Intro (KEEP)</option>
  </select>`;

  showModal('📋 Kiểm Tra & Chọn Cấu Hình Xuất Video, Kho Stock, Output & Tất Cả Folder Liên Kết', `
    <div style="display:flex;flex-direction:column;gap:14px;max-height:78vh;overflow-y:auto;padding-right:4px;">
      <div style="padding:12px;background:#0f172a;border:1px solid #0284c7;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#38bdf8;font-size:13px;">1. 🎨 Template & Phụ Đề Đang Chọn</strong>
          <button type="button" id="modalBtnGoTemplates" style="padding:4px 10px;font-size:11px;background:#1e293b;color:#fbbf24;border:1px solid #f59e0b;border-radius:5px;cursor:pointer;">🎨 Mở Thiết Kế Template</button>
        </div>
        <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px;">
          • <strong>Project:</strong> ${htmlEscape(s.projectName || 'My First Project')} &nbsp;|&nbsp;
          <strong>Template:</strong> <span style="color:#38bdf8;font-weight:700;">${htmlEscape(s.templateName || 'Default 16:9')}</span> (${layers.length} lớp phủ) &nbsp;|&nbsp;
          <strong>Phụ đề:</strong> <span style="color:#fde047;">${htmlEscape(s.subtitleEffectLabel || 'Arial 70px')}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">${layersHtml}</div>
      </div>

      <div style="padding:12px;background:#0f172a;border:1px solid #10b981;border-radius:8px;">
        <strong style="color:#34d399;font-size:13px;display:block;margin-bottom:6px;">2. ⚠️ Disclaimer & Giọng Đọc AI & Cấu Hình Xuất Ra (Export)</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#e2e8f0;">
          <div style="padding:6px 10px;background:#090d16;border-radius:5px;border:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div>
              <span style="color:#94a3b8;">Video Disclaimer đầu video:</span><br>
              <strong style="color:${s.disclaimerEnabled ? '#34d399' : '#f87171'};">${htmlEscape(s.disclaimerLabel || '⚪ TẮT')}</strong>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              <button type="button" onclick="window.pickDisclaimerVideoFileInModal()" style="padding:4px 8px;font-size:10.5px;background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:4px;cursor:pointer;">🎬 Chọn File</button>
              <button type="button" onclick="window.toggleDisclaimerInModal()" style="padding:4px 8px;font-size:10.5px;background:#065f46;color:#d1fae5;border:1px solid #10b981;border-radius:4px;cursor:pointer;">${s.disclaimerEnabled ? '⚪ Tắt' : '🟢 Bật'}</button>
            </div>
          </div>
          <div style="padding:6px 10px;background:#090d16;border-radius:5px;border:1px solid #1e293b;">
            <span style="color:#94a3b8;">Giọng đọc AI (VoiceStudio 3900):</span><br>
            <strong style="color:#38bdf8;">${htmlEscape(s.voiceProfileName || 'HOMELESS (homeless)')}</strong>
          </div>
          <div style="padding:6px 10px;background:#090d16;border-radius:5px;border:1px solid #1e293b;">
            <span style="color:#94a3b8;">Độ phân giải & GPU Encoder:</span><br>
            <strong>${htmlEscape(s.resolutionLabel || '1920×1080 · 24 FPS')} · ${htmlEscape(s.codec || 'NVENC')}</strong>
          </div>
          <div style="padding:6px 10px;background:#090d16;border-radius:5px;border:1px solid #1e293b;">
            <span style="color:#94a3b8;">Chế độ ghép Stock nền:</span><br>
            <strong>${htmlEscape(s.stockSpeedLabel || '0.75x · Random không lặp')}</strong>
          </div>
        </div>
      </div>

      <div style="padding:12px;background:#0f172a;border:1px solid #6366f1;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <strong style="color:#a5b4fc;font-size:13px;">3. 📂 Danh Sách Các Folder Chứa Dữ Liệu (Bấm [📁 Chọn Folder] hoặc dán đường dẫn để đổi trực tiếp)</strong>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:#fde047;background:#1e1b4b;padding:4px 10px;border-radius:6px;border:1px solid #4f46e5;cursor:pointer;">
            <input id="chkApplyStockOutputAllKeys" type="checkbox" ${linked.applyStockOutputAllKeys !== false ? 'checked' : ''} onchange="window._saveGlobalLinkedFolders({ applyStockOutputAllKeys: this.checked })" />
            <span>Áp dụng Kho Stock &amp; Folder Output cho tất cả 15 Key</span>
          </label>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${editableFolderRow({
            kind: 'mediaFolder',
            label: '🎞️ Folder Kho Stock Video nền (Dùng để cắt ghép nền):',
            folderPath: s.mediaFolder,
            note: 'Bấm [📁 Chọn Folder] để chọn thư mục chứa các video Stock nền trên máy của bạn.',
            highlightColor: '#3b82f6'
          })}
          ${editableFolderRow({
            kind: 'outputFolder',
            label: '🏁 Folder Xuất Video Thành Phẩm (.mp4) (Output):',
            folderPath: s.outputFolder,
            note: 'Nơi lưu file video .mp4 cuối cùng sau khi Render GPU NVENC hoàn tất.',
            highlightColor: '#10b981'
          })}
          ${editableFolderRow({
            kind: 'projectImageFolder',
            label: '🖼️ Folder Ảnh/Green theo Voice (Cho layer "Ảnh theo voice 1" trong Template):',
            folderPath: s.projectImageFolder,
            note: 'Nếu để trống: tự động ẩn khung Ảnh theo voice và hiển thị 100% nền Stock Video.',
            allowClear: true,
            extraControlHtml: imgModeCtrl
          })}
          ${editableFolderRow({
            kind: 'jobIntroFolder',
            label: '🎬 Folder Video Intro theo Voice (Sau Disclaimer):',
            folderPath: s.jobIntroFolder,
            note: 'Nếu để trống: không chèn Intro riêng cho từng bài.',
            allowClear: true,
            extraControlHtml: introAudioCtrl
          })}
          ${editableFolderRow({
            kind: 'khoGreenFolder',
            label: '📦 Folder Kho Green & Disclaimer dùng chung (Kho_Green):',
            folderPath: s.khoGreenFolder,
            note: 'Chứa dis-type2.mp4, Green_analog_screen_texture, kenh2.mp4, SUB.mp4, SONG6.mp4, NÈN DEN.jpg'
          })}
          ${editableFolderRow({
            kind: 'activeKeyTongHopFolder',
            label: `📝 Folder TONG HOP — Của Key Đang Chọn (${htmlEscape(activeKey)}):`,
            folderPath: s.activeKeyTongHopFolder,
            note: 'Chứa Kịch bản sạch _KB.txt, _SEO.txt, Voice .wav, Phụ đề .srt của Key đang chọn.',
            allowRunTongHop: true,
            highlightColor: '#8b5cf6'
          })}
          ${editableFolderRow({
            kind: 'tongHopHomelessFolder',
            label: '📝 Folder TONG HOP — Kênh Homeless (Chứa Kịch bản _KB.txt, _SEO.txt, Voice .wav, Phụ đề .srt):',
            folderPath: s.tongHopHomelessFolder,
            allowRunTongHop: true
          })}
          ${editableFolderRow({
            kind: 'tongHopMafiaFolder',
            label: '📝 Folder TONG HOP — Kênh Mafia (Chứa Kịch bản _KB.txt, _SEO.txt, Voice .wav, Phụ đề .srt):',
            folderPath: s.tongHopMafiaFolder,
            allowRunTongHop: true
          })}
          ${editableFolderRow({
            kind: 'tongHopMexicoFolder',
            label: '📝 Folder TONG HOP — Kênh MEXICO BÀ CÔ (Chứa Kịch bản _KB.txt, _SEO.txt, Voice .wav, Phụ đề .srt):',
            folderPath: s.tongHopMexicoFolder,
            allowRunTongHop: true
          })}
        </div>
      </div>

      <div class="actions" style="justify-content:flex-end;gap:10px;">
        <button type="button" id="modalBtnEditBatchConfig" class="primary" style="padding:8px 16px;font-weight:700;">⚙️ Sang Tab Tạo Batch Video Để Chỉnh Chi Tiết Hơn</button>
      </div>
    </div>
  `);

  if ($('modalBtnGoTemplates')) {
    $('modalBtnGoTemplates').onclick = () => {
      closeModal();
      activePage('templates');
    };
  }
  if ($('modalBtnEditBatchConfig')) {
    $('modalBtnEditBatchConfig').onclick = () => {
      closeModal();
      activePage('batch');
    };
  }
}

async function loadScriptStudioPage() {
  await syncBatchConfigToBridge({ silent: true });
  if (!api.scriptBridge) return;
  try {
    let st = await api.scriptBridge.status();
    if (!st?.scriptServerOnline) {
      await api.scriptBridge.ensureScriptServer();
      st = await api.scriptBridge.status();
    }
    const iframe = $('scriptStudioIframe');
    if (iframe && st?.scriptServerOnline) {
      const targetUrl = String(st.scriptServerUrl || _lastScriptServerUrl || 'http://127.0.0.1:8098').replace(/\/+$/, '');
      const savedChan = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
      if (!window._vbsScriptIframeRefreshed || (_lastScriptServerUrl && _lastScriptServerUrl !== targetUrl)) {
        window._vbsScriptIframeRefreshed = true;
        _lastScriptServerUrl = targetUrl;
        iframe.onload = () => {
          try {
            const curChan = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
            iframe.contentWindow?.postMessage({ type: 'ZC_SWITCH_CHANNEL_KEY', channel: curChan }, '*');
          } catch {}
        };
        iframe.src = targetUrl + '/?embedded=1&t=' + Date.now();
      } else {
        try {
          iframe.contentWindow?.postMessage({ type: 'ZC_SWITCH_CHANNEL_KEY', channel: savedChan }, '*');
        } catch {}
      }
    }
    renderScriptBridgeState(st);
  } catch (err) {
    console.warn('[ScriptBridge] Lỗi tải trạng thái:', err);
  }
}

function setupScriptBridgeEvents() {
  if (window._vbsScriptBridgeBound) return;
  window._vbsScriptBridgeBound = true;

  if ($('btnLockConfigForScriptStudio')) {
    $('btnLockConfigForScriptStudio').onclick = async () => {
      await syncBatchConfigToBridge({ silent: false });
      activePage('script-studio');
    };
  }

  if ($('btnInspectLockedConfig')) {
    $('btnInspectLockedConfig').onclick = async () => {
      await syncBatchConfigToBridge({ silent: true });
      openLockedConfigInspectorModal();
    };
  }

  if ($('btnGoToVideoConfigTab')) {
    $('btnGoToVideoConfigTab').onclick = () => {
      activePage('batch');
      toast('Hãy điều chỉnh cấu hình Video rồi bấm "🔒 Khóa Cấu Hình Video ➔ Qua Viết Kịch Bản AI".');
    };
  }

  if ($('bridgeModeSelect')) {
    $('bridgeModeSelect').onchange = async () => {
      const nextSettings = settingsFromBridgeModeValue($('bridgeModeSelect').value);
      const st = await api.scriptBridge?.saveSettings?.(nextSettings);
      if (st) renderScriptBridgeState(st);
      await syncBatchConfigToBridge({ silent: true });
      toast('Đã cập nhật chế độ tự động chuyển tiếp Kịch bản ➔ Video.');
    };
  }

  window.addEventListener('message', async (ev) => {
    if (ev?.data?.type === 'ZC_SET_BRIDGE_MODE' && ev.data.mode) {
      if ($('bridgeModeSelect')) {
        $('bridgeModeSelect').value = ev.data.mode;
      }
      const nextSettings = settingsFromBridgeModeValue(ev.data.mode);
      const st = await api.scriptBridge?.saveSettings?.(nextSettings);
      if (st) renderScriptBridgeState(st);
      await syncBatchConfigToBridge({ silent: true });
    }
  });

  if ($('bridgeKeyProjectSelect')) {
    $('bridgeKeyProjectSelect').onchange = async () => {
      const pid = $('bridgeKeyProjectSelect').value;
      const curKey = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
      if ($('batchProject') && pid) {
        $('batchProject').value = pid;
        try {
          await loadTemplates(pid);
        } catch {}
      }
      _saveLocalKeyPreset(curKey, { projectId: pid, templateId: $('batchTemplate')?.value || null });
      await syncBatchConfigToBridge({ silent: true });
      toast(`📁 Đã gắn cố định Project cho Key [${curKey}]!`);
    };
  }

  if ($('bridgeKeyVoiceSelect')) {
    $('bridgeKeyVoiceSelect').onchange = async () => {
      const vid = $('bridgeKeyVoiceSelect').value || 'default';
      const curKey = $('topGlobalKeySelect')?.value || localStorage.getItem('zc_active_channel_key') || '03_Nhom_Ba_Gia_Drama_Gia_Dinh_Mexico';
      if ($('batchVoiceProfileSelect')) {
        $('batchVoiceProfileSelect').value = vid;
      }
      _saveLocalKeyPreset(curKey, { voiceProfileId: vid, userCustomVoice: true });
      await syncBatchConfigToBridge({ silent: true });
      toast(`🎙️ Đã gắn cố định Giọng AI [${vid}] cho Key [${curKey}]!`);
    };
  }

  if ($('bridgeCopyMp4ToTongHop')) {
    $('bridgeCopyMp4ToTongHop').onchange = async () => {
      const st = await api.scriptBridge?.saveSettings?.({
        copyMp4ToTongHop: Boolean($('bridgeCopyMp4ToTongHop').checked)
      });
      if (st) renderScriptBridgeState(st);
    };
  }

  if ($('btnManualRunTongHopToVideo')) {
    $('btnManualRunTongHopToVideo').onclick = async () => {
      await syncBatchConfigToBridge({ silent: true });
      const dir = await api.chooseDirectory({ title: 'Chọn thư mục TONG HOP chứa các kịch bản (.txt) cần tạo Voice & Video' });
      if (!dir) return;
      try {
        const res = await api.scriptBridge.enqueueFolder(dir);
        toast(`🚀 Đã đẩy ${res?.count || 0} kịch bản từ thư mục vào Bàn #7 để Tạo Voice & Render Video!`);
        const st = await api.scriptBridge.status();
        renderScriptBridgeState(st);
      } catch (err) {
        toast('Lỗi: ' + err.message, true);
      }
    };
  }

  if ($('btnReloadScriptStudioFrame')) {
    $('btnReloadScriptStudioFrame').onclick = async () => {
      toast('Đang kiểm tra và làm mới giao diện Viết Kịch Bản AI...');
      const res = await api.scriptBridge?.ensureScriptServer?.();
      const st = await api.scriptBridge?.status?.();
      const targetUrl = String(res?.url || st?.scriptServerUrl || _lastScriptServerUrl || 'http://127.0.0.1:8098').replace(/\/+$/, '');
      const iframe = $('scriptStudioIframe');
      if (iframe) {
        iframe.src = targetUrl + '/?embedded=1&t=' + Date.now();
      }
      if (st) renderScriptBridgeState(st);
    };
  }

  if ($('btnOpenBridgeOutputFolder')) {
    $('btnOpenBridgeOutputFolder').onclick = () => {
      const outDir = _lastBridgeState?.lockedConfigSummary?.outputFolder || $('outputFolder')?.value?.trim();
      if (outDir && !outDir.startsWith('(')) {
        api.openPath(outDir);
      } else {
        api.openPath('D:\\ZC_TEAM\\TOOL_ZC_TEAM\\TONG HOP');
      }
    };
  }

  if ($('btnClearBridgeCompleted')) {
    $('btnClearBridgeCompleted').onclick = async () => {
      const st = await api.scriptBridge?.clearQueue?.();
      if (st) renderScriptBridgeState(st);
    };
  }

  api.scriptBridge?.onState?.((st) => {
    renderScriptBridgeState(st);
  });

  api.scriptBridge?.onRequestSyncBatchConfig?.(() => {
    syncBatchConfigToBridge({ silent: true });
  });

  // Tự động đồng bộ cấu hình mỗi khi người dùng thay đổi thiết lập trên tab Tạo Batch Video
  const batchWatchIds = [
    'batchProject', 'batchTemplate', 'projectImageFolder', 'projectImageMode', 'backgroundMode',
    'batchVoiceSourceMode', 'batchVoiceProfileSelect', 'batchSrtLanguage',
    'jobIntroFolder', 'batchJobIntroAudioMode', 'batchSubtitleEffect',
    'batchKaraokeBoxColor', 'batchLibrary', 'mediaFolder', 'manualMediaPath',
    'outputFolder', 'batchDisclaimer', 'batchDisclaimerAsset',
    'batchCodec', 'batchWorkers', 'batchFps', 'selectionMode'
  ];
  for (const id of batchWatchIds) {
    $(id)?.addEventListener('change', () => {
      setTimeout(() => syncBatchConfigToBridge({ silent: true }), 150);
    });
  }

  setTimeout(() => {
    syncBatchConfigToBridge({ silent: true });
    api.scriptBridge?.status?.().then((st) => renderScriptBridgeState(st)).catch(() => {});
  }, 900);
}

document.addEventListener('DOMContentLoaded', () => {
  setupVoiceStudioEvents();
  setupScriptBridgeEvents();
  setTimeout(() => loadVoiceProfiles(), 400);
});
setupVoiceStudioEvents();
setupScriptBridgeEvents();
loadVoiceProfiles().catch(() => {});


/* ========================================================================= */
/* GOOGLE STITCH UI INTERACTIVE ENHANCEMENTS (PILLS, FILTERS & TELEMETRY)    */
/* ========================================================================= */

window.selectDefaultBatchVoice = function(profileId) {
  if (!profileId) return;
  try {
    localStorage.setItem('vbs.batchVoiceProfileSelect', profileId);
  } catch {}
  if ($('batchVoiceProfileSelect')) {
    $('batchVoiceProfileSelect').value = profileId;
    $('batchVoiceProfileSelect').dispatchEvent(new Event('change'));
  }
  if ($('voiceTestSelect')) $('voiceTestSelect').value = profileId;
  if ($('voiceScriptProfileSelect')) $('voiceScriptProfileSelect').value = profileId;
  renderVoiceProfilesList(_currentVoiceProfiles);
  toast(`🎙️ Đã chọn giọng mặc định cho Batch & Kịch bản: ${profileId}`);
};

function setupStitchUiEnhancements() {
  if (window._vbsStitchUiBound) return;
  window._vbsStitchUiBound = true;

  // 1. Đồng bộ 2 chiều giữa 4 nút chọn Chế độ nền (Stitch Pills) và <select id="backgroundMode">
  const bgSelect = $('backgroundMode');
  const syncBgModePills = () => {
    const val = bgSelect?.value || 'STOCK_VIDEO';
    document.querySelectorAll('#batchBgModePills [data-bg-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.bgMode === val);
    });
  };
  document.querySelectorAll('#batchBgModePills [data-bg-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!bgSelect) return;
      bgSelect.value = btn.dataset.bgMode;
      syncBgModePills();
      bgSelect.dispatchEvent(new Event('change'));
    });
  });
  if (bgSelect) {
    bgSelect.addEventListener('change', syncBgModePills);
    setTimeout(syncBgModePills, 150);
    setTimeout(syncBgModePills, 700);
  }

  // 2. Bộ lọc tìm kiếm & ngôn ngữ trong Tab 03 (Kho_Voice Clones)
  let activeVoiceLangFilter = 'ALL';
  const applyVoiceFilter = () => {
    const q = ($('voiceSearchInput')?.value || '').trim().toLowerCase();
    const filtered = (_currentVoiceProfiles || []).filter((p) => {
      const langMatch = activeVoiceLangFilter === 'ALL' || String(p.language || 'vi').toLowerCase().startsWith(activeVoiceLangFilter.toLowerCase());
      const textMatch = !q || [p.name, p.id, p.language, p.description, p.model].some((v) => String(v || '').toLowerCase().includes(q));
      return langMatch && textMatch;
    });
    if ($('voiceProfileCountBadge')) {
      $('voiceProfileCountBadge').textContent = `${(_currentVoiceProfiles || []).length} CLONES`;
    }
    renderVoiceProfilesList(filtered);
  };
  $('voiceSearchInput')?.addEventListener('input', applyVoiceFilter);
  document.querySelectorAll('#voiceLangFilterPills [data-voice-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeVoiceLangFilter = btn.dataset.voiceFilter || 'ALL';
      document.querySelectorAll('#voiceLangFilterPills [data-voice-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      applyVoiceFilter();
    });
  });

  // 3. Đồng bộ thẻ thông số (Summary Metrics) ở Tab 04 (Tạo Video Từ Ảnh)
  const syncStoryMetrics = () => {
    if ($('storyMetricTotalRows')) {
      $('storyMetricTotalRows').textContent = `${(state.storyVideoRows || []).length} VIDEO`;
    }
    const modeRadio = document.querySelector('input[name="storyMode"]:checked');
    if ($('storyMetricSyncMode') && modeRadio) {
      const map = { fixed: 'FIXED SEC / IMG', distribute: 'AUTO DISTRIBUTE', srt: 'SRT CUE SYNC' };
      $('storyMetricSyncMode').textContent = map[modeRadio.value] || modeRadio.value.toUpperCase();
    }
  };
  document.querySelectorAll('input[name="storyMode"]').forEach((r) => r.addEventListener('change', syncStoryMetrics));
  ['addStoryRow', 'batchAddStoryRows', 'clearStoryRows', 'scanStoryVideo'].forEach((id) => {
    $(id)?.addEventListener('click', () => setTimeout(syncStoryMetrics, 120));
  });

  // 4. Tìm kiếm nhanh Dự án ở Tab 06 (Quản Lý Project)
  $('projectSearchInput')?.addEventListener('input', () => {
    const q = ($('projectSearchInput')?.value || '').trim().toLowerCase();
    document.querySelectorAll('#projectList .list-item').forEach((item) => {
      const txt = item.textContent.toLowerCase();
      item.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
  });

  // 5. Bộ lọc & tìm kiếm clip ở Tab 07 (Thư Viện Stock)
  let activeStockFilter = 'ALL';
  const applyStockAssetFilter = () => {
    const q = ($('stockAssetSearchInput')?.value || '').trim().toLowerCase();
    document.querySelectorAll('#assetGrid .asset').forEach((card) => {
      const txt = card.textContent || '';
      const statusOk = activeStockFilter === 'ALL' || txt.toUpperCase().includes(activeStockFilter);
      const queryOk = !q || txt.toLowerCase().includes(q);
      card.style.display = (statusOk && queryOk) ? '' : 'none';
    });
  };
  $('stockAssetSearchInput')?.addEventListener('input', applyStockAssetFilter);
  document.querySelectorAll('#stockAssetFilterPills [data-stock-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeStockFilter = btn.dataset.stockFilter || 'ALL';
      document.querySelectorAll('#stockAssetFilterPills [data-stock-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      applyStockAssetFilter();
    });
  });

  // 6. Bộ lọc danh mục & tìm kiếm ở Tab 08 (Kho_Green)
  let activeGreenFilter = 'ALL';
  const applyGreenAssetFilter = () => {
    const q = ($('greenAssetSearchInput')?.value || '').trim().toLowerCase();
    const mapLabel = {
      GREEN_VIDEO: 'video phông xanh',
      GREEN_IMAGE: 'ảnh phông xanh',
      DISCLAIMER_VIDEO: 'disclaimer'
    };
    document.querySelectorAll('#projectAssetList .list-item').forEach((item) => {
      const txt = (item.textContent || '').toLowerCase();
      const catKey = mapLabel[activeGreenFilter] || '';
      const catOk = activeGreenFilter === 'ALL' || txt.includes(catKey) || txt.includes(activeGreenFilter.toLowerCase());
      const queryOk = !q || txt.includes(q);
      item.style.display = (catOk && queryOk) ? '' : 'none';
    });
  };
  $('greenAssetSearchInput')?.addEventListener('input', applyGreenAssetFilter);
  document.querySelectorAll('#greenCategoryFilterPills [data-green-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeGreenFilter = btn.dataset.greenFilter || 'ALL';
      document.querySelectorAll('#greenCategoryFilterPills [data-green-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      applyGreenAssetFilter();
    });
  });

  // 7. Bộ lọc trạng thái Batch ở Tab 09 (Lịch Sử & Queue)
  document.querySelectorAll('#queueBatchFilterPills [data-queue-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.queueFilter || 'ALL';
      document.querySelectorAll('#queueBatchFilterPills [data-queue-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('#batchHistory .list-item').forEach((item) => {
        const txt = (item.textContent || '').toUpperCase();
        item.style.display = (filter === 'ALL' || txt.includes(filter)) ? '' : 'none';
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', setupStitchUiEnhancements);
setupStitchUiEnhancements();

/* ========================================================================= */
/* MODULE CẬP NHẬT TỰ ĐỘNG TỪ GITHUB (OTA UPDATE SYSTEM - V1.0.0+)           */
/* ========================================================================= */

let _lastOtaStatus = null;
let _postponedOtaBuild = null;
let _otaControlsBound = false;

function formatVersionLabel(v) {
  const s = String(v || 'V1.0.0').trim();
  return s.toUpperCase().startsWith('V') ? s.toUpperCase() : `V${s}`;
}

function renderOtaStatusToUi(st, { openModalIfNew = false, forceOpenModal = false } = {}) {
  if (!st) return;
  _lastOtaStatus = st;

  const curVer = formatVersionLabel(st.currentVersion || 'V1.0.0');
  const remVer = formatVersionLabel(st.remoteVersion || curVer);
  const curBuild = Number(st.currentBuild || 100);
  const remBuild = Number(st.remoteBuild || curBuild);
  const hasUpdate = Boolean(st.hasUpdate);

  if ($('versionPill')) {
    $('versionPill').textContent = curVer;
  }

  const availBtn = $('btnOtaUpdateAvailable');
  if (availBtn) {
    if (hasUpdate) {
      availBtn.style.display = 'inline-flex';
      availBtn.style.alignItems = 'center';
      availBtn.style.gap = '4px';
      availBtn.textContent = `🚀 Có bản cập nhật mới: ${remVer} — Ấn để Cập Nhật`;
    } else {
      availBtn.style.display = 'none';
    }
  }

  if ($('otaCurrentVerText')) $('otaCurrentVerText').textContent = curVer;
  if ($('otaCurrentBuildText')) $('otaCurrentBuildText').textContent = `Build #${curBuild}`;
  if ($('otaRemoteVerText')) $('otaRemoteVerText').textContent = remVer;
  if ($('otaRemoteDateText')) {
    $('otaRemoteDateText').textContent = st.releaseDate
      ? `Build #${remBuild} · ${st.releaseDate}`
      : `Build #${remBuild}`;
  }

  const banner = $('otaStatusBanner');
  const applyBtn = $('btnApplyOtaUpdateNow');
  const postponeBtn = $('btnPostponeOtaUpdate');
  const titleEl = $('otaModalTitle');

  if (banner) {
    if (hasUpdate) {
      banner.style.background = 'rgba(245,158,11,0.15)';
      banner.style.borderColor = '#fbbf24';
      banner.style.color = '#fef3c7';
      banner.innerHTML = `🎉 <strong>Phát hiện phiên bản mới ${htmlEscape(remVer)} (Build #${remBuild}) trên GitHub!</strong><br/>Bạn có thể bấm <strong>"🚀 Cập Nhật Ngay"</strong> để ứng dụng tự động tải về và nâng cấp lên bản mới nhất, hoặc bấm <strong>"⏳ Để Sau"</strong> nếu chưa muốn cập nhật lúc này.`;
      if (titleEl) titleEl.textContent = `Đã Có Bản Cập Nhật Mới: ${remVer}`;
      if (applyBtn) {
        applyBtn.style.display = 'inline-block';
        applyBtn.disabled = false;
        applyBtn.textContent = `🚀 Cập Nhật Ngay Lên ${remVer}`;
      }
      if (postponeBtn) {
        postponeBtn.textContent = '⏳ Để Sau (Không cập nhật lúc này)';
      }
    } else if (st.error) {
      banner.style.background = 'rgba(239,68,68,0.14)';
      banner.style.borderColor = 'rgba(239,68,68,0.45)';
      banner.style.color = '#fca5a5';
      banner.innerHTML = `⚠️ Không thể kết nối máy chủ cập nhật GitHub lúc này: ${htmlEscape(st.error)}. Bạn đang dùng bản <strong>${htmlEscape(curVer)}</strong>.`;
      if (titleEl) titleEl.textContent = `Thông Tin Phiên Bản ${curVer}`;
      if (applyBtn) applyBtn.style.display = 'none';
      if (postponeBtn) postponeBtn.textContent = 'Đóng';
    } else {
      banner.style.background = 'rgba(16,185,129,0.12)';
      banner.style.borderColor = 'rgba(16,185,129,0.4)';
      banner.style.color = '#ecfdf5';
      banner.innerHTML = `✅ <strong>Ứng dụng của bạn đang ở phiên bản mới nhất (${htmlEscape(curVer)} · Build #${curBuild}).</strong> Không cần cập nhật thêm.`;
      if (titleEl) titleEl.textContent = `Phiên Bản Hiện Tại: ${curVer} (Mới Nhất)`;
      if (applyBtn) applyBtn.style.display = 'none';
      if (postponeBtn) postponeBtn.textContent = 'Đóng';
    }
  }

  const logEl = $('otaChangelogList');
  if (logEl) {
    const items = Array.isArray(st.changelog) && st.changelog.length ? st.changelog : ['Bản phát hành chính thức ZC TEAM Video Batch Studio V1.0.0.'];
    logEl.innerHTML = items.map((line) => `<div style="padding:4px 0;border-bottom:1px dashed rgba(51,65,85,0.6);">• ${htmlEscape(String(line))}</div>`).join('');
  }

  const overlay = $('otaUpdateModalOverlay');
  if (overlay) {
    if (forceOpenModal) {
      overlay.style.display = 'flex';
    } else if (openModalIfNew && hasUpdate && _postponedOtaBuild !== remBuild) {
      overlay.style.display = 'flex';
    }
  }
}

window.openOtaUpdateModal = async function({ checkRemote = true } = {}) {
  const overlay = $('otaUpdateModalOverlay');
  if (overlay) overlay.style.display = 'flex';
  if (_lastOtaStatus) {
    renderOtaStatusToUi(_lastOtaStatus, { forceOpenModal: true });
  }
  if (checkRemote && api.updater?.check) {
    const banner = $('otaStatusBanner');
    if (banner) {
      banner.innerHTML = '⏳ Đang kiểm tra phiên bản mới nhất trên GitHub...';
    }
    try {
      const st = await api.updater.check({ force: true });
      renderOtaStatusToUi(st, { forceOpenModal: true });
    } catch (err) {
      toast('Lỗi kiểm tra cập nhật: ' + err.message, true);
    }
  }
};

function initOtaUpdaterControls() {
  if (_otaControlsBound) return;
  _otaControlsBound = true;

  api.updater?.localInfo?.().then((info) => {
    if (info && $('versionPill')) {
      $('versionPill').textContent = formatVersionLabel(info.version || 'V1.0.0');
    }
  }).catch(() => {});

  api.updater?.onStatus?.((st) => {
    renderOtaStatusToUi(st, { openModalIfNew: false });
  });

  api.updater?.onProgress?.((prog) => {
    const wrap = $('otaProgressWrap');
    const bar = $('otaProgressBar');
    const msg = $('otaProgressMessage');
    const pct = $('otaProgressPct');
    if (wrap) wrap.style.display = 'block';
    if (bar && prog.percent != null) bar.style.width = `${prog.percent}%`;
    if (pct && prog.percent != null) pct.textContent = `${prog.percent}%`;
    if (msg && prog.message) msg.textContent = prog.message;
  });

  if ($('versionPill')) {
    $('versionPill').onclick = () => window.openOtaUpdateModal({ checkRemote: true });
  }
  if ($('btnCheckUpdateTopbar')) {
    $('btnCheckUpdateTopbar').onclick = () => window.openOtaUpdateModal({ checkRemote: true });
  }
  if ($('btnOtaUpdateAvailable')) {
    $('btnOtaUpdateAvailable').onclick = () => window.openOtaUpdateModal({ checkRemote: false });
  }
  if ($('btnCloseOtaModal')) {
    $('btnCloseOtaModal').onclick = () => {
      if ($('otaUpdateModalOverlay')) $('otaUpdateModalOverlay').style.display = 'none';
    };
  }
  if ($('btnPostponeOtaUpdate')) {
    $('btnPostponeOtaUpdate').onclick = () => {
      if (_lastOtaStatus?.hasUpdate) {
        _postponedOtaBuild = Number(_lastOtaStatus.remoteBuild || 0);
        toast('⏳ Đã tạm hoãn cập nhật. Bạn có thể bấm nút "🚀 Có bản cập nhật mới" trên thanh trên cùng bất cứ khi nào muốn cập nhật.');
      }
      if ($('otaUpdateModalOverlay')) $('otaUpdateModalOverlay').style.display = 'none';
    };
  }
  if ($('btnRecheckOtaNow')) {
    $('btnRecheckOtaNow').onclick = async () => {
      const btn = $('btnRecheckOtaNow');
      btn.disabled = true;
      btn.textContent = '⏳ Đang kiểm tra...';
      try {
        const st = await api.updater.check({ force: true });
        renderOtaStatusToUi(st, { forceOpenModal: true });
        if (st?.hasUpdate) {
          toast(`🚀 Phát hiện bản cập nhật mới: ${st.remoteVersion}!`);
        } else {
          toast(`✅ Bạn đang dùng bản mới nhất (${st?.currentVersion || 'V1.0.0'}).`);
        }
      } catch (err) {
        toast('Lỗi kiểm tra cập nhật: ' + err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Kiểm tra lại';
      }
    };
  }
  if ($('btnApplyOtaUpdateNow')) {
    $('btnApplyOtaUpdateNow').onclick = async () => {
      const btn = $('btnApplyOtaUpdateNow');
      const postponeBtn = $('btnPostponeOtaUpdate');
      btn.disabled = true;
      if (postponeBtn) postponeBtn.disabled = true;
      btn.textContent = '⏳ Đang tải & cài đặt bản cập nhật...';
      if ($('otaProgressWrap')) $('otaProgressWrap').style.display = 'block';

      try {
        const res = await api.updater.apply();
        if (res?.status === 'success') {
          toast(`🎉 ${res.message || 'Cập nhật thành công!'}`);
          const localInfo = await api.updater.localInfo().catch(() => null);
          if (localInfo && $('versionPill')) {
            $('versionPill').textContent = formatVersionLabel(localInfo.version);
          }
          if ($('btnOtaUpdateAvailable')) {
            $('btnOtaUpdateAvailable').style.display = 'none';
          }
          const banner = $('otaStatusBanner');
          if (banner) {
            banner.style.background = 'rgba(16,185,129,0.18)';
            banner.style.borderColor = '#10b981';
            banner.style.color = '#ecfdf5';
            banner.innerHTML = `✅ <strong>${htmlEscape(res.message || 'Đã cập nhật thành công!')}</strong> Ứng dụng đang tự động làm mới giao diện...`;
          }
          setTimeout(() => {
            window.location.reload();
          }, 1400);
        } else {
          toast('❌ ' + (res?.message || 'Cập nhật thất bại.'), true);
          btn.disabled = false;
          if (postponeBtn) postponeBtn.disabled = false;
          btn.textContent = '🚀 Thử Cập Nhật Lại';
        }
      } catch (err) {
        toast('❌ Lỗi cập nhật: ' + err.message, true);
        btn.disabled = false;
        if (postponeBtn) postponeBtn.disabled = false;
        btn.textContent = '🚀 Thử Cập Nhật Lại';
      }
    };
  }

  // Tự động kiểm tra bản cập nhật trên GitHub khi mở ứng dụng (sau 2.5 giây)
  setTimeout(async () => {
    try {
      const st = await api.updater?.check?.({ force: true });
      if (st) {
        renderOtaStatusToUi(st, { openModalIfNew: true });
      }
    } catch {}
  }, 2500);

  // Định kỳ kiểm tra mỗi 10 phút
  setInterval(async () => {
    try {
      const st = await api.updater?.check?.({ force: true });
      if (st) {
        renderOtaStatusToUi(st, { openModalIfNew: false });
      }
    } catch {}
  }, 10 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', initOtaUpdaterControls);
initOtaUpdaterControls();
