'use strict';
const fs=require('node:fs');
const {DEFAULT_TEMPLATE,DEFAULT_EXPORT_PRESET,STANDARD_CANVAS_WIDTH,STANDARD_CANVAS_HEIGHT}=require('../../shared/constants');
const {deepMerge}=require('../../shared/core');
function standardTemplateConfig(config={}){const merged=deepMerge(DEFAULT_TEMPLATE,config);merged.canvas={...(merged.canvas||{}),width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT};return merged;}
function safeImportName(value,fallback){const text=String(value||'').trim();return text||fallback;}
function parseImportJson(filePath){
  try{return JSON.parse(fs.readFileSync(filePath,'utf8'));}
  catch(e){throw new Error(`File import không phải JSON hợp lệ: ${e.message}`);}
}
function looksLikeTemplateConfig(value){
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&(value.canvas||value.subtitle||value.backgroundMode||Array.isArray(value.layers)));
}
function normalizeImportedTemplate(source,index=0){
  const candidate=source?.template||source;
  const config=candidate?.config||candidate;
  if(!looksLikeTemplateConfig(config))throw new Error('File import không chứa template hợp lệ.');
  return {
    name:`${safeImportName(candidate.name,`Imported ${index+1}`)} (Imported)`,
    description:String(candidate.description||''),
    config
  };
}
function extractImportedTemplates(parsed){
  if(Array.isArray(parsed?.templates))return parsed.templates.map((item,index)=>normalizeImportedTemplate(item,index));
  if(Array.isArray(parsed?.project?.templates))return parsed.project.templates.map((item,index)=>normalizeImportedTemplate(item,index));
  return [normalizeImportedTemplate(parsed,0)];
}
function extractImportedProject(parsed){
  const project=parsed?.project&&typeof parsed.project==='object'&&!Array.isArray(parsed.project)?parsed.project:null;
  if(!project||!Array.isArray(project.templates))return null;
  return {
    name:`${safeImportName(project.name,'Imported Project')} (Imported)`,
    description:String(project.description||''),
    outputRootPath:project.outputRootPath||project.output_root_path||'',
    width:STANDARD_CANVAS_WIDTH,
    height:STANDARD_CANVAS_HEIGHT,
    fps:project.fps||project.fps_num||30,
    createDefaultTemplate:false
  };
}
class TemplateService{
  constructor(database){this.database=database;}
  list(projectId){return this.database.listTemplates(projectId);}
  get(id){return this.database.getTemplate(id);}
  create(data){const config=standardTemplateConfig(data.config||{});return this.database.createTemplate({...data,config});}
  save(id,data,note){const current=this.database.getTemplate(id);if(!current)throw new Error('Template không tồn tại.');const config=standardTemplateConfig(deepMerge(current.config||DEFAULT_TEMPLATE,data.config||data));return this.database.saveTemplate(id,{...data,config},note);}
  delete(id){return this.database.deleteTemplate(id);}
  versions(id){return this.database.listTemplateVersions(id);}
  restore(id,version){return this.database.restoreTemplateVersion(id,version);}
  export(id,filePath){const template=this.get(id);if(!template)throw new Error('Template không tồn tại.');fs.writeFileSync(filePath,JSON.stringify({format:'vbs-template',version:1,template},null,2),'utf8');return filePath;}
  import(filePath,projectId){
    const parsed=parseImportJson(filePath),items=extractImportedTemplates(parsed);
    let targetProjectId=projectId||null,project=null;
    const importedProject=extractImportedProject(parsed);
    if(!targetProjectId&&importedProject){
      project=this.database.createProject(importedProject);
      targetProjectId=project.id;
    }
    const templates=items.map((item)=>this.create({...item,projectId:targetProjectId}));
    return {project,templates,template:templates[0]||null,importedCount:templates.length};
  }
  listPresets(){return {transitions:this.database.listTransitionPresets(),exports:this.database.listExportPresets()};}
  saveTransitionPreset(data){return this.database.saveTransitionPreset(data);}
  saveExportPreset(data){return this.database.saveExportPreset({...DEFAULT_EXPORT_PRESET,...data,width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT});}
}
module.exports={TemplateService,extractImportedTemplates,looksLikeTemplateConfig};
