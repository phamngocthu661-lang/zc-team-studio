'use strict';

const { DatabaseSync } = require('node:sqlite');
const { createId, safeJson } = require('../shared/core');
const { ASSET_STATUS, DEFAULT_EXPORT_PRESET, DEFAULT_TEMPLATE, GENTLE_TRANSITIONS } = require('../shared/constants');

class AppDatabase {
  constructor(databasePath) {
    this.closed = false;
    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
    this.migrate();
    this.seedDefaults();
  }

  transaction(callback) {
    if (this.closed) return null;
    this.db.exec('BEGIN IMMEDIATE;');
    try { const result = callback(); this.db.exec('COMMIT;'); return result; }
    catch (error) { try { this.db.exec('ROLLBACK;'); } catch {} throw error; }
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at INTEGER NOT NULL);

      CREATE TABLE IF NOT EXISTS projects(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, default_template_id TEXT,
        default_export_preset_id TEXT, output_root_path TEXT, width INTEGER NOT NULL DEFAULT 1920,
        height INTEGER NOT NULL DEFAULT 1080, fps_num INTEGER NOT NULL DEFAULT 30, fps_den INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ACTIVE', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

      CREATE TABLE IF NOT EXISTS transition_presets(
        id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, mode TEXT NOT NULL, min_duration_ms INTEGER NOT NULL,
        max_duration_ms INTEGER NOT NULL, avoid_repeat_count INTEGER NOT NULL, config_json TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS export_presets(
        id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, container TEXT NOT NULL, video_codec TEXT NOT NULL,
        width INTEGER NOT NULL, height INTEGER NOT NULL, fps_num INTEGER NOT NULL, fps_den INTEGER NOT NULL,
        rate_control TEXT NOT NULL, target_bitrate_kbps INTEGER, max_bitrate_kbps INTEGER, encoder_preset TEXT,
        pixel_format TEXT NOT NULL, audio_codec TEXT NOT NULL, audio_bitrate_kbps INTEGER NOT NULL,
        audio_sample_rate INTEGER NOT NULL, size_rule TEXT NOT NULL, size_value REAL NOT NULL,
        safety_percent REAL NOT NULL, max_retry_count INTEGER NOT NULL, config_json TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS templates(
        id TEXT PRIMARY KEY, project_id TEXT, name TEXT NOT NULL, description TEXT, current_version INTEGER NOT NULL DEFAULT 1,
        canvas_width INTEGER NOT NULL DEFAULT 1920, canvas_height INTEGER NOT NULL DEFAULT 1080,
        fps_num INTEGER NOT NULL DEFAULT 30, fps_den INTEGER NOT NULL DEFAULT 1,
        background_mode TEXT NOT NULL DEFAULT 'STOCK_VIDEO', transition_preset_id TEXT, export_preset_id TEXT,
        config_json TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY(transition_preset_id) REFERENCES transition_presets(id),
        FOREIGN KEY(export_preset_id) REFERENCES export_presets(id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_template_name_project ON templates(IFNULL(project_id,''), name) WHERE is_deleted = 0;
      CREATE TABLE IF NOT EXISTS template_versions(
        id TEXT PRIMARY KEY, template_id TEXT NOT NULL, version_number INTEGER NOT NULL, config_json TEXT NOT NULL,
        change_note TEXT, created_at INTEGER NOT NULL,
        FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE, UNIQUE(template_id, version_number)
      );
      CREATE TABLE IF NOT EXISTS template_layers(
        id TEXT PRIMARY KEY, template_id TEXT NOT NULL, layer_type TEXT NOT NULL, name TEXT NOT NULL,
        z_index INTEGER NOT NULL, source_mode TEXT NOT NULL DEFAULT 'STATIC', source_reference TEXT,
        start_mode TEXT NOT NULL DEFAULT 'FULL_VIDEO', start_ms INTEGER NOT NULL DEFAULT 0, end_ms INTEGER,
        loop_enabled INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 1, locked INTEGER NOT NULL DEFAULT 0,
        transform_json TEXT NOT NULL, style_json TEXT NOT NULL, timing_json TEXT NOT NULL, effect_json TEXT NOT NULL,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_layers_template_z ON template_layers(template_id, z_index);

      CREATE TABLE IF NOT EXISTS project_assets(
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL DEFAULT 'GLOBAL', asset_type TEXT NOT NULL, name TEXT NOT NULL,
        file_name TEXT NOT NULL, file_path TEXT NOT NULL, normalized_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0, has_audio INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_assets_project_type ON project_assets(project_id, asset_type, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_project_assets_type ON project_assets(asset_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS media_libraries(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, library_type TEXT NOT NULL, root_path TEXT NOT NULL UNIQUE,
        used_path TEXT, invalid_path TEXT, watch_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS media_assets(
        id TEXT PRIMARY KEY, library_id TEXT NOT NULL, asset_type TEXT NOT NULL, file_name TEXT NOT NULL,
        file_path TEXT NOT NULL, normalized_path TEXT NOT NULL UNIQUE, file_hash TEXT, file_size_bytes INTEGER NOT NULL DEFAULT 0,
        modified_at_fs INTEGER, duration_ms INTEGER NOT NULL DEFAULT 0, width INTEGER NOT NULL DEFAULT 0,
        height INTEGER NOT NULL DEFAULT 0, fps_num INTEGER NOT NULL DEFAULT 0, fps_den INTEGER NOT NULL DEFAULT 1,
        video_codec TEXT, audio_codec TEXT, pixel_format TEXT, has_audio INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL, error_message TEXT, metadata_json TEXT NOT NULL DEFAULT '{}',
        first_seen_at INTEGER NOT NULL, last_scanned_at INTEGER NOT NULL, used_at INTEGER,
        FOREIGN KEY(library_id) REFERENCES media_libraries(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_media_assets_library_status ON media_assets(library_id, status);
      CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(file_hash);
      CREATE INDEX IF NOT EXISTS idx_media_assets_type_status ON media_assets(asset_type, status);

      CREATE TABLE IF NOT EXISTS batches(
        id TEXT PRIMARY KEY, project_id TEXT, name TEXT NOT NULL, status TEXT NOT NULL, voice_folder TEXT NOT NULL,
        srt_folder TEXT NOT NULL, background_mode TEXT NOT NULL, media_library_id TEXT, output_folder TEXT NOT NULL,
        used_folder TEXT, config_json TEXT NOT NULL, total_jobs INTEGER NOT NULL DEFAULT 0,
        completed_jobs INTEGER NOT NULL DEFAULT 0, failed_jobs INTEGER NOT NULL DEFAULT 0,
        skipped_jobs INTEGER NOT NULL DEFAULT 0, stop_reason TEXT, created_at INTEGER NOT NULL,
        started_at INTEGER, completed_at INTEGER, updated_at INTEGER NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY(media_library_id) REFERENCES media_libraries(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_batches_project_created ON batches(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
      CREATE TABLE IF NOT EXISTS batch_jobs(
        id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, sequence_number INTEGER NOT NULL, template_id TEXT,
        voice_path TEXT NOT NULL, voice_name TEXT NOT NULL, voice_duration_ms INTEGER NOT NULL DEFAULT 0,
        srt_path TEXT, background_mode TEXT NOT NULL DEFAULT 'STOCK_VIDEO', status TEXT NOT NULL,
        progress_percent REAL NOT NULL DEFAULT 0, transition_seed INTEGER NOT NULL, image_seed INTEGER NOT NULL,
        target_size_bytes INTEGER, output_path TEXT, actual_size_bytes INTEGER, output_duration_ms INTEGER,
        current_attempt INTEGER NOT NULL DEFAULT 0, error_code TEXT, error_message TEXT,
        created_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER, updated_at INTEGER NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
        FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE SET NULL,
        UNIQUE(batch_id, sequence_number)
      );
      CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(batch_id, status);
      CREATE TABLE IF NOT EXISTS job_assets(
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL, media_asset_id TEXT, role TEXT NOT NULL, sequence_index INTEGER NOT NULL,
        trim_start_ms INTEGER NOT NULL DEFAULT 0, trim_duration_ms INTEGER NOT NULL DEFAULT 0,
        start_ms INTEGER NOT NULL DEFAULT 0, end_ms INTEGER, transform_json TEXT NOT NULL DEFAULT '{}',
        transition_in_json TEXT, transition_out_json TEXT, status TEXT NOT NULL DEFAULT 'PLANNED', created_at INTEGER NOT NULL,
        FOREIGN KEY(job_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY(media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_job_assets_job_role ON job_assets(job_id, role, sequence_index);
      CREATE TABLE IF NOT EXISTS stock_reservations(
        id TEXT PRIMARY KEY, media_asset_id TEXT NOT NULL, job_id TEXT NOT NULL, status TEXT NOT NULL,
        reserved_at INTEGER NOT NULL, released_at INTEGER, committed_at INTEGER,
        FOREIGN KEY(media_asset_id) REFERENCES media_assets(id), FOREIGN KEY(job_id) REFERENCES batch_jobs(id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_active_stock_reservation ON stock_reservations(media_asset_id) WHERE status='ACTIVE';
      CREATE TABLE IF NOT EXISTS stock_usage_history(
        id TEXT PRIMARY KEY, media_asset_id TEXT NOT NULL, batch_id TEXT NOT NULL, job_id TEXT NOT NULL,
        source_path TEXT NOT NULL, used_path TEXT NOT NULL, output_path TEXT NOT NULL,
        used_duration_ms INTEGER NOT NULL, moved_at INTEGER NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS matched_stock_usage(
        id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, job_id TEXT NOT NULL, voice_name TEXT NOT NULL,
        source_path TEXT NOT NULL, normalized_source_path TEXT NOT NULL, output_path TEXT NOT NULL,
        source_duration_ms INTEGER NOT NULL, source_start_ms INTEGER NOT NULL, source_end_ms INTEGER NOT NULL,
        render_duration_ms INTEGER NOT NULL, playback_rate REAL NOT NULL DEFAULT 1,
        pass_index INTEGER NOT NULL DEFAULT 1, flipped INTEGER NOT NULL DEFAULT 0, zoom REAL NOT NULL DEFAULT 1,
        action TEXT NOT NULL, status TEXT NOT NULL, source_deleted_at INTEGER, created_at INTEGER NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE,
        FOREIGN KEY(job_id) REFERENCES batch_jobs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_matched_stock_usage_source ON matched_stock_usage(normalized_source_path, status, source_end_ms);
      CREATE INDEX IF NOT EXISTS idx_matched_stock_usage_batch ON matched_stock_usage(batch_id, created_at);
      CREATE TABLE IF NOT EXISTS render_plans(
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE, plan_version INTEGER NOT NULL, plan_json TEXT NOT NULL,
        ffmpeg_command_hash TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        FOREIGN KEY(job_id) REFERENCES batch_jobs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS render_attempts(
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL, attempt_number INTEGER NOT NULL, status TEXT NOT NULL,
        encoder TEXT, video_bitrate_kbps INTEGER, target_size_bytes INTEGER, actual_size_bytes INTEGER,
        command_text TEXT, log_path TEXT, temp_output_path TEXT, final_output_path TEXT,
        error_code TEXT, error_message TEXT, started_at INTEGER NOT NULL, completed_at INTEGER,
        FOREIGN KEY(job_id) REFERENCES batch_jobs(id) ON DELETE CASCADE, UNIQUE(job_id, attempt_number)
      );
      CREATE TABLE IF NOT EXISTS reports(
        id TEXT PRIMARY KEY, batch_id TEXT, job_id TEXT, report_type TEXT NOT NULL, severity TEXT NOT NULL,
        title TEXT NOT NULL, content_json TEXT NOT NULL, file_path TEXT, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reports_batch ON reports(batch_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS audit_logs(
        id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT,
        details_json TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS license_cache(
        id TEXT PRIMARY KEY, license_key_hash TEXT, device_id TEXT, plan_code TEXT, status TEXT,
        expires_at INTEGER, offline_until INTEGER, last_verified_at INTEGER, entitlement_json TEXT NOT NULL DEFAULT '{}',
        token_encrypted TEXT, updated_at INTEGER NOT NULL
      );
    `);
    this.migrateProjectAssetsToGlobal();
  }

  migrateProjectAssetsToGlobal() {
    const foreignKeys = this.db.prepare('PRAGMA foreign_key_list(project_assets)').all();
    const columns = this.db.prepare('PRAGMA table_info(project_assets)').all();
    const projectId = columns.find((column) => column.name === 'project_id');
    if (!foreignKeys.length && projectId?.dflt_value && String(projectId.dflt_value).includes('GLOBAL')) return;
    this.db.exec('PRAGMA foreign_keys = OFF;');
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_assets_new(
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL DEFAULT 'GLOBAL', asset_type TEXT NOT NULL, name TEXT NOT NULL,
          file_name TEXT NOT NULL, file_path TEXT NOT NULL, normalized_path TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER NOT NULL DEFAULT 0,
          width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0, has_audio INTEGER NOT NULL DEFAULT 0,
          metadata_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO project_assets_new(id,project_id,asset_type,name,file_name,file_path,normalized_path,file_size_bytes,duration_ms,width,height,has_audio,metadata_json,created_at,updated_at)
          SELECT id,'GLOBAL',asset_type,name,file_name,file_path,normalized_path,file_size_bytes,duration_ms,width,height,has_audio,metadata_json,created_at,updated_at FROM project_assets;
        DROP TABLE project_assets;
        ALTER TABLE project_assets_new RENAME TO project_assets;
        CREATE INDEX IF NOT EXISTS idx_project_assets_project_type ON project_assets(project_id, asset_type, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_project_assets_type ON project_assets(asset_type, updated_at DESC);
      `);
    } finally {
      this.db.exec('PRAGMA foreign_keys = ON;');
    }
  }

  seedDefaults() {
    const now = Date.now();
    if (!this.db.prepare('SELECT id FROM transition_presets LIMIT 1').get()) {
      this.db.prepare(`INSERT INTO transition_presets(id,name,mode,min_duration_ms,max_duration_ms,avoid_repeat_count,config_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
        .run(createId(), 'Gentle Recommended', 'RANDOM_SELECTED', 600, 900, 2, JSON.stringify({ items: GENTLE_TRANSITIONS }), now, now);
    }
    if (!this.db.prepare('SELECT id FROM export_presets LIMIT 1').get()) {
      const p = DEFAULT_EXPORT_PRESET;
      this.db.prepare(`INSERT INTO export_presets(id,name,container,video_codec,width,height,fps_num,fps_den,rate_control,target_bitrate_kbps,max_bitrate_kbps,encoder_preset,pixel_format,audio_codec,audio_bitrate_kbps,audio_sample_rate,size_rule,size_value,safety_percent,max_retry_count,config_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(createId(), p.name, p.container, p.videoCodec, p.width, p.height, p.fps, 1, p.rateControl, null, null, p.nvencPreset, 'yuv420p', p.audioCodec, p.audioBitrateKbps, p.audioSampleRate, 'GB_PER_HOUR', p.gbPerHour, p.safetyPercent, p.maxRetryCount, JSON.stringify(p), now, now);
    }
    if (!this.db.prepare('SELECT id FROM projects LIMIT 1').get()) {
      const projectId = createId(); const exportPreset = this.db.prepare('SELECT id FROM export_presets LIMIT 1').get();
      this.db.prepare(`INSERT INTO projects(id,name,description,default_export_preset_id,width,height,fps_num,fps_den,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
        .run(projectId, 'My First Project', 'Project mặc định', exportPreset.id, 1920, 1080, 30, 1, 'ACTIVE', now, now);
      const transition = this.db.prepare('SELECT id FROM transition_presets LIMIT 1').get();
      this.createTemplate({ projectId, name: DEFAULT_TEMPLATE.name, description: 'Template mặc định 16:9', config: DEFAULT_TEMPLATE,
        transitionPresetId: transition.id, exportPresetId: exportPreset.id, isDefault: true });
    }
  }

  getSetting(key, fallback = null) {
    if (this.closed) return fallback;
    try {
      const row = this.db.prepare('SELECT value_json FROM app_settings WHERE key=?').get(key);
      return row ? safeJson(row.value_json, fallback) : fallback;
    } catch {
      return fallback;
    }
  }
  setSetting(key, value) {
    if (this.closed) return;
    try {
      this.db.prepare(`INSERT INTO app_settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`).run(key, JSON.stringify(value), Date.now());
    } catch {}
  }
  updateRow(table, id, patch) {
    if (this.closed) return;
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined); if (!entries.length) return;
    try {
      const columns = entries.map(([key]) => `${key}=?`).join(','); this.db.prepare(`UPDATE ${table} SET ${columns} WHERE id=?`).run(...entries.map(([, value]) => value), id);
    } catch {}
  }
  audit(action, entityType, entityId, details = {}) {
    if (this.closed) return;
    try {
      this.db.prepare('INSERT INTO audit_logs(id,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?)').run(createId(), action, entityType, entityId || null, JSON.stringify(details), Date.now());
    } catch {}
  }

  listProjects() { return this.db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM batches b WHERE b.project_id=p.id) batch_count FROM projects p WHERE status!='DELETED' ORDER BY updated_at DESC`).all(); }
  getProject(id) { return this.db.prepare('SELECT * FROM projects WHERE id=?').get(id); }
  createProject(data) {
    const id=createId(), now=Date.now();
    const exportPreset = data.defaultExportPresetId
      ? { id: data.defaultExportPresetId }
      : this.db.prepare('SELECT id FROM export_presets LIMIT 1').get();
    this.db.prepare(`INSERT INTO projects(id,name,description,default_template_id,default_export_preset_id,output_root_path,width,height,fps_num,fps_den,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,data.name,data.description||'',data.defaultTemplateId||null,exportPreset?.id||null,data.outputRootPath||'',data.width||1920,data.height||1080,data.fps||24,1,'ACTIVE',now,now);
    if (!data.defaultTemplateId && data.createDefaultTemplate !== false) {
      const transition = this.db.prepare('SELECT id FROM transition_presets LIMIT 1').get();
      const template = this.createTemplate({
        projectId: id,
        name: DEFAULT_TEMPLATE.name,
        description: 'Template mặc định 16:9',
        config: DEFAULT_TEMPLATE,
        transitionPresetId: transition?.id || null,
        exportPresetId: exportPreset?.id || null,
        isDefault: true
      });
      this.updateRow('projects', id, { default_template_id: template.id, updated_at: now });
    }
    this.audit('CREATE','PROJECT',id,data);
    return this.getProject(id);
  }
  updateProject(id, data) { const patch={...data,updated_at:Date.now()}; delete patch.id; this.updateRow('projects',id,patch); this.audit('UPDATE','PROJECT',id,data); return this.getProject(id); }
  deleteProject(id) { this.updateRow('projects',id,{status:'DELETED',updated_at:Date.now()}); this.audit('DELETE','PROJECT',id); }

  listTransitionPresets() { return this.db.prepare('SELECT * FROM transition_presets ORDER BY name').all().map((r)=>({...r,config:safeJson(r.config_json,{})})); }
  saveTransitionPreset(data) { const now=Date.now(), id=data.id||createId(); this.db.prepare(`INSERT INTO transition_presets(id,name,mode,min_duration_ms,max_duration_ms,avoid_repeat_count,config_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,mode=excluded.mode,min_duration_ms=excluded.min_duration_ms,max_duration_ms=excluded.max_duration_ms,avoid_repeat_count=excluded.avoid_repeat_count,config_json=excluded.config_json,updated_at=excluded.updated_at`).run(id,data.name,data.mode||'RANDOM_SELECTED',data.minDurationMs||600,data.maxDurationMs||900,data.avoidRepeatCount??2,JSON.stringify({items:data.items||GENTLE_TRANSITIONS}),now,now); return id; }
  listExportPresets() { return this.db.prepare('SELECT * FROM export_presets ORDER BY name').all().map((r)=>({...r,config:safeJson(r.config_json,{})})); }
  saveExportPreset(data) { const now=Date.now(), id=data.id||createId(); const p={...DEFAULT_EXPORT_PRESET,...data}; this.db.prepare(`INSERT INTO export_presets(id,name,container,video_codec,width,height,fps_num,fps_den,rate_control,target_bitrate_kbps,max_bitrate_kbps,encoder_preset,pixel_format,audio_codec,audio_bitrate_kbps,audio_sample_rate,size_rule,size_value,safety_percent,max_retry_count,config_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,container=excluded.container,video_codec=excluded.video_codec,width=excluded.width,height=excluded.height,fps_num=excluded.fps_num,fps_den=excluded.fps_den,rate_control=excluded.rate_control,encoder_preset=excluded.encoder_preset,pixel_format=excluded.pixel_format,audio_codec=excluded.audio_codec,audio_bitrate_kbps=excluded.audio_bitrate_kbps,audio_sample_rate=excluded.audio_sample_rate,size_rule=excluded.size_rule,size_value=excluded.size_value,safety_percent=excluded.safety_percent,max_retry_count=excluded.max_retry_count,config_json=excluded.config_json,updated_at=excluded.updated_at`).run(id,p.name,p.container,p.videoCodec,p.width,p.height,p.fps,1,p.rateControl,p.targetBitrateKbps||null,p.maxBitrateKbps||null,p.nvencPreset||'p4','yuv420p',p.audioCodec,p.audioBitrateKbps,p.audioSampleRate,'GB_PER_HOUR',p.gbPerHour,p.safetyPercent,p.maxRetryCount,JSON.stringify(p),now,now); return id; }

  createTemplate({projectId=null,name,description='',config,transitionPresetId=null,exportPresetId=null,isDefault=false}) {
    const id=createId(), now=Date.now(), cfg=config||DEFAULT_TEMPLATE;
    let validProjectId = null;
    if (projectId) {
      try {
        const p = this.db.prepare('SELECT id FROM projects WHERE id=?').get(projectId);
        if (p) validProjectId = projectId;
      } catch {}
    }
    let validTransitionId = null;
    if (transitionPresetId) {
      try {
        const t = this.db.prepare('SELECT id FROM transition_presets WHERE id=?').get(transitionPresetId);
        if (t) validTransitionId = transitionPresetId;
      } catch {}
    }
    let validExportId = null;
    if (exportPresetId) {
      try {
        const e = this.db.prepare('SELECT id FROM export_presets WHERE id=?').get(exportPresetId);
        if (e) validExportId = exportPresetId;
      } catch {}
    }
    this.transaction(()=>{
      this.db.prepare(`INSERT INTO templates(id,project_id,name,description,current_version,canvas_width,canvas_height,fps_num,fps_den,background_mode,transition_preset_id,export_preset_id,config_json,is_default,is_deleted,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?,?,?,?,?,?,?,0,?,?)`).run(id,validProjectId,name,description,cfg.canvas?.width||1920,cfg.canvas?.height||1080,cfg.canvas?.fps||24,1,cfg.backgroundMode||'STOCK_VIDEO',validTransitionId,validExportId,JSON.stringify(cfg),isDefault?1:0,now,now);
      this.db.prepare('INSERT INTO template_versions(id,template_id,version_number,config_json,change_note,created_at) VALUES(?,?,?,?,?,?)').run(createId(),id,1,JSON.stringify(cfg),'Initial version',now);
      this.replaceTemplateLayers(id,cfg.layers||[]);
    });
    this.audit('CREATE','TEMPLATE',id,{name}); return this.getTemplate(id);
  }
  listTemplates(projectId=null) { const rows=projectId?this.db.prepare('SELECT * FROM templates WHERE is_deleted=0 AND (project_id=? OR project_id IS NULL) ORDER BY updated_at DESC').all(projectId):this.db.prepare('SELECT * FROM templates WHERE is_deleted=0 ORDER BY updated_at DESC').all(); return rows.map((r)=>({...r,config:safeJson(r.config_json,{})})); }
  getTemplate(id) { const row=this.db.prepare('SELECT * FROM templates WHERE id=?').get(id); if(!row)return null; return {...row,config:safeJson(row.config_json,{}),layers:this.listTemplateLayers(id)}; }
  listTemplateLayers(templateId) { return this.db.prepare('SELECT * FROM template_layers WHERE template_id=? ORDER BY z_index').all(templateId).map((r)=>({...r,transform:safeJson(r.transform_json,{}),style:safeJson(r.style_json,{}),timing:safeJson(r.timing_json,{}),effect:safeJson(r.effect_json,{})})); }
  replaceTemplateLayers(templateId,layers) { this.db.prepare('DELETE FROM template_layers WHERE template_id=?').run(templateId); const now=Date.now(), stmt=this.db.prepare(`INSERT INTO template_layers(id,template_id,layer_type,name,z_index,source_mode,source_reference,start_mode,start_ms,end_ms,loop_enabled,visible,locked,transform_json,style_json,timing_json,effect_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`); for(const [index,layer] of layers.entries()) stmt.run(layer.id||createId(),templateId,layer.type||layer.layerType||'TEXT',layer.name||`Layer ${index+1}`,layer.zIndex??index,layer.sourceMode||'STATIC',layer.sourceReference||layer.source||'',layer.startMode||'FULL_VIDEO',layer.startMs||0,layer.endMs||null,layer.loop?1:0,layer.visible===false?0:1,layer.locked?1:0,JSON.stringify(layer.transform||{}),JSON.stringify(layer.style||{}),JSON.stringify(layer.timing||{}),JSON.stringify(layer.effect||{}),now,now); }
  saveTemplate(id,data,changeNote='Updated template') { const current=this.getTemplate(id); if(!current)throw new Error('Template không tồn tại.'); const now=Date.now(), version=current.current_version+1, cfg=data.config||data; this.transaction(()=>{ this.db.prepare(`UPDATE templates SET name=?,description=?,current_version=?,canvas_width=?,canvas_height=?,fps_num=?,background_mode=?,transition_preset_id=?,export_preset_id=?,config_json=?,is_default=?,updated_at=? WHERE id=?`).run(data.name||current.name,data.description??current.description,version,cfg.canvas?.width||current.canvas_width,cfg.canvas?.height||current.canvas_height,cfg.canvas?.fps||current.fps_num,cfg.backgroundMode||current.background_mode,data.transitionPresetId||current.transition_preset_id,data.exportPresetId||current.export_preset_id,JSON.stringify(cfg),data.isDefault?1:0,now,id); this.db.prepare('INSERT INTO template_versions(id,template_id,version_number,config_json,change_note,created_at) VALUES(?,?,?,?,?,?)').run(createId(),id,version,JSON.stringify(cfg),changeNote,now); this.replaceTemplateLayers(id,cfg.layers||[]); }); this.audit('UPDATE','TEMPLATE',id,{version}); return this.getTemplate(id); }
  listTemplateVersions(id) { return this.db.prepare('SELECT * FROM template_versions WHERE template_id=? ORDER BY version_number DESC').all(id).map((r)=>({...r,config:safeJson(r.config_json,{})})); }
  restoreTemplateVersion(templateId,versionNumber) { const row=this.db.prepare('SELECT config_json FROM template_versions WHERE template_id=? AND version_number=?').get(templateId,versionNumber); if(!row)throw new Error('Không tìm thấy phiên bản.'); return this.saveTemplate(templateId,{config:safeJson(row.config_json,{})},`Restore version ${versionNumber}`); }
  deleteTemplate(id) { this.updateRow('templates',id,{is_deleted:1,updated_at:Date.now()}); this.audit('DELETE','TEMPLATE',id); }

  listProjectAssets(_projectId = null, assetType = null) {
    const type = assetType || (['GREEN_VIDEO', 'GREEN_IMAGE', 'DISCLAIMER_VIDEO'].includes(String(_projectId || '').toUpperCase()) ? String(_projectId).toUpperCase() : null);
    const rows = type
      ? this.db.prepare("SELECT * FROM project_assets WHERE project_id='GLOBAL' AND asset_type=? ORDER BY updated_at DESC").all(type)
      : this.db.prepare("SELECT * FROM project_assets WHERE project_id='GLOBAL' ORDER BY asset_type, updated_at DESC").all();
    return rows.map((row) => ({ ...row, metadata: safeJson(row.metadata_json, {}) }));
  }
  getProjectAsset(id) {
    const row = this.db.prepare('SELECT * FROM project_assets WHERE id=?').get(id);
    return row ? { ...row, metadata: safeJson(row.metadata_json, {}) } : null;
  }
  createProjectAsset(data) {
    const id = data.id || createId();
    const now = Date.now();
    const filePath = data.filePath || data.file_path;
    this.db.prepare(`INSERT INTO project_assets(id,project_id,asset_type,name,file_name,file_path,normalized_path,file_size_bytes,duration_ms,width,height,has_audio,metadata_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(
        id,
        'GLOBAL',
        data.assetType || data.asset_type,
        data.name,
        data.fileName || data.file_name,
        filePath,
        String(filePath || '').toLocaleLowerCase('en-US'),
        data.fileSizeBytes || data.file_size_bytes || 0,
        data.durationMs || data.duration_ms || 0,
        data.width || 0,
        data.height || 0,
        data.hasAudio || data.has_audio ? 1 : 0,
        JSON.stringify(data.metadata || {}),
        now,
        now
      );
    this.audit('CREATE', 'PROJECT_ASSET', id, { scope: 'GLOBAL', assetType: data.assetType || data.asset_type });
    return this.getProjectAsset(id);
  }
  deleteProjectAsset(id) {
    const row = this.getProjectAsset(id);
    if (!row) return null;
    this.db.prepare('DELETE FROM project_assets WHERE id=?').run(id);
    this.audit('DELETE', 'PROJECT_ASSET', id, { scope: 'GLOBAL', filePath: row.file_path });
    return row;
  }

  listLibraries() { return this.db.prepare('SELECT *, (SELECT COUNT(*) FROM media_assets a WHERE a.library_id=l.id) asset_count FROM media_libraries l ORDER BY updated_at DESC').all(); }
  getOrCreateLibrary({name,rootPath,usedPath=null,invalidPath=null,libraryType='STOCK'}) { const existing=this.db.prepare('SELECT * FROM media_libraries WHERE root_path=?').get(rootPath); const now=Date.now(); if(existing){this.db.prepare('UPDATE media_libraries SET name=?,library_type=?,used_path=?,invalid_path=?,updated_at=? WHERE id=?').run(name,libraryType,usedPath,invalidPath,now,existing.id); return this.db.prepare('SELECT * FROM media_libraries WHERE id=?').get(existing.id);} const id=createId(); this.db.prepare('INSERT INTO media_libraries(id,name,library_type,root_path,used_path,invalid_path,watch_enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').run(id,name,libraryType,rootPath,usedPath,invalidPath,now,now); return this.db.prepare('SELECT * FROM media_libraries WHERE id=?').get(id); }
  deleteLibrary(id) {
    return this.transaction(()=>{
      const assets=this.db.prepare('SELECT id FROM media_assets WHERE library_id=?').all(id).map((row)=>row.id);
      if(assets.length){
        const placeholders=assets.map(()=>'?').join(',');
        this.db.prepare(`DELETE FROM stock_reservations WHERE media_asset_id IN (${placeholders})`).run(...assets);
        this.db.prepare(`UPDATE job_assets SET media_asset_id=NULL WHERE media_asset_id IN (${placeholders})`).run(...assets);
      }
      return this.db.prepare('DELETE FROM media_libraries WHERE id=?').run(id).changes;
    });
  }
  upsertMediaAsset(libraryId,item) { const now=Date.now(), normalizedPath=item.filePath.toLocaleLowerCase('en-US'), existing=this.db.prepare('SELECT id,status FROM media_assets WHERE normalized_path=?').get(normalizedPath); const status=item.valid?(existing?.status===ASSET_STATUS.USED?ASSET_STATUS.USED:ASSET_STATUS.AVAILABLE):ASSET_STATUS.INVALID; const values=[libraryId,item.assetType||'VIDEO',item.fileName,item.filePath,normalizedPath,item.fileHash||null,item.fileSizeBytes||0,item.modifiedAtFs||null,item.durationMs||0,item.width||0,item.height||0,item.fpsNum||0,item.fpsDen||1,item.videoCodec||null,item.audioCodec||null,item.pixelFormat||null,item.hasAudio?1:0,status,item.error||null,JSON.stringify(item.metadata||{}),now]; if(existing){this.db.prepare(`UPDATE media_assets SET library_id=?,asset_type=?,file_name=?,file_path=?,normalized_path=?,file_hash=?,file_size_bytes=?,modified_at_fs=?,duration_ms=?,width=?,height=?,fps_num=?,fps_den=?,video_codec=?,audio_codec=?,pixel_format=?,has_audio=?,status=?,error_message=?,metadata_json=?,last_scanned_at=? WHERE id=?`).run(...values,existing.id); return existing.id;} const id=createId(); this.db.prepare(`INSERT INTO media_assets(id,library_id,asset_type,file_name,file_path,normalized_path,file_hash,file_size_bytes,modified_at_fs,duration_ms,width,height,fps_num,fps_den,video_codec,audio_codec,pixel_format,has_audio,status,error_message,metadata_json,first_seen_at,last_scanned_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,...values.slice(0,-1),now,now); return id; }
  listMediaAssets(libraryId,status=null) { return status?this.db.prepare('SELECT * FROM media_assets WHERE library_id=? AND status=? ORDER BY file_name COLLATE NOCASE').all(libraryId,status):this.db.prepare('SELECT * FROM media_assets WHERE library_id=? ORDER BY file_name COLLATE NOCASE').all(libraryId); }
  listAvailableAssets(libraryId) { return this.listMediaAssets(libraryId,'AVAILABLE'); }
  getMediaLibraryStats(libraryId) {
    const stockPlaybackRate = 0.75;
    const stockPasses = 2;
    const rows = this.db.prepare(`
      SELECT a.*,
        COALESCE((SELECT MAX(m.source_end_ms) FROM matched_stock_usage m
          WHERE m.normalized_source_path=a.normalized_path AND m.status='COMPLETED' AND m.pass_index=1), 0) AS matched_normal_consumed_ms,
        COALESCE((SELECT MAX(m.source_end_ms) FROM matched_stock_usage m
          WHERE m.normalized_source_path=a.normalized_path AND m.status='COMPLETED' AND m.pass_index>=2), 0) AS matched_clone_consumed_ms
      FROM media_assets a
      WHERE a.library_id=?
    `).all(libraryId);
    let totalDurationMs = 0;
    let availableDurationMs = 0;
    let usedDurationMs = 0;
    let availableCount = 0;
    let usedCount = 0;
    let unusableCount = 0;
    for (const row of rows) {
      if (row.asset_type !== 'VIDEO') continue;
      const durationMs = Math.max(0, Number(row.duration_ms || 0));
      const normalConsumedMs = Math.min(durationMs, Math.max(0, Number(row.matched_normal_consumed_ms || 0)));
      const cloneConsumedMs = Math.min(durationMs, Math.max(0, Number(row.matched_clone_consumed_ms || 0)));
      const totalEffectiveMs = durationMs / stockPlaybackRate * stockPasses;
      const usedEffectiveMs = Math.min(totalEffectiveMs, (normalConsumedMs + cloneConsumedMs) / stockPlaybackRate);
      const availableEffectiveMs = Math.max(0, totalEffectiveMs - usedEffectiveMs);
      totalDurationMs += totalEffectiveMs;
      if (row.status === 'AVAILABLE') {
        availableCount += 1;
        availableDurationMs += availableEffectiveMs;
        usedDurationMs += usedEffectiveMs;
      } else if (row.status === 'USED') {
        usedCount += 1;
        usedDurationMs += totalEffectiveMs;
      } else if (row.status === 'MISSING' || row.status === 'INVALID') {
        unusableCount += 1;
      }
    }
    return {
      libraryId,
      totalDurationMs,
      availableDurationMs,
      usedDurationMs,
      availableCount,
      usedCount,
      unusableCount,
      total_duration_ms: totalDurationMs,
      available_duration_ms: availableDurationMs,
      used_duration_ms: usedDurationMs,
      available_count: availableCount,
      used_count: usedCount,
      unusable_count: unusableCount
    };
  }
  removeMediaAssets(assetIds, statuses=['MISSING','INVALID']) {
    const ids=[...new Set((assetIds||[]).filter(Boolean))];
    const allowed=new Set(statuses);
    if(!ids.length || !allowed.size)return 0;
    const placeholders=ids.map(()=>'?').join(',');
    const statusPlaceholders=[...allowed].map(()=>'?').join(',');
    const removable=this.db.prepare(`SELECT id FROM media_assets WHERE id IN (${placeholders}) AND status IN (${statusPlaceholders})`).all(...ids,...allowed).map((row)=>row.id);
    if(!removable.length)return 0;
    const removablePlaceholders=removable.map(()=>'?').join(',');
    return this.transaction(()=>{
      this.db.prepare(`DELETE FROM stock_reservations WHERE media_asset_id IN (${removablePlaceholders})`).run(...removable);
      return this.db.prepare(`DELETE FROM media_assets WHERE id IN (${removablePlaceholders})`).run(...removable).changes;
    });
  }
  markMediaAssetUsedByPath(sourcePath, usedPath) {
    const normalized=String(sourcePath||'').toLocaleLowerCase('en-US');
    if(!normalized)return 0;
    return this.db.prepare("UPDATE media_assets SET status='USED',file_path=?,used_at=? WHERE normalized_path=? AND status IN ('AVAILABLE','RESERVED','MOVING')").run(usedPath,Date.now(),normalized).changes;
  }
  markMissingAssets(assetIds,message='File không còn tồn tại trên ổ đĩa.') {
    const ids=[...new Set((assetIds||[]).filter(Boolean))];
    if(!ids.length)return 0;
    const now=Date.now(), stmt=this.db.prepare("UPDATE media_assets SET status='MISSING',error_message=?,last_scanned_at=? WHERE id=? AND status IN ('AVAILABLE','RESERVED','MOVING')");
    let changed=0;
    this.transaction(()=>{for(const id of ids)changed+=stmt.run(message,now,id).changes;});
    return changed;
  }
  markLibraryScanMissing(libraryId,presentFilePaths=[]) {
    const present=new Set((presentFilePaths||[]).map((filePath)=>String(filePath||'').toLocaleLowerCase('en-US')));
    const rows=this.db.prepare("SELECT id,normalized_path FROM media_assets WHERE library_id=? AND status IN ('AVAILABLE','RESERVED','MOVING')").all(libraryId);
    const missing=rows.filter((row)=>!present.has(row.normalized_path)).map((row)=>row.id);
    return this.markMissingAssets(missing);
  }

  createBatch(config,jobs) {
    const now=Date.now(), batchId=createId();
    let validProjectId = null;
    if (config.projectId) {
      try {
        const p = this.db.prepare('SELECT id FROM projects WHERE id=?').get(config.projectId);
        if (p) validProjectId = config.projectId;
      } catch {}
    }
    let validLibraryId = null;
    if (config.libraryId) {
      try {
        const l = this.db.prepare('SELECT id FROM media_libraries WHERE id=?').get(config.libraryId);
        if (l) validLibraryId = config.libraryId;
      } catch {}
    }
    const insertBatch=this.db.prepare(`INSERT INTO batches(id,project_id,name,status,voice_folder,srt_folder,background_mode,media_library_id,output_folder,used_folder,config_json,total_jobs,created_at,updated_at) VALUES(?,?,?,'READY',?,?,?,?,?,?,?,?,?,?)`);
    const insertJob=this.db.prepare(`INSERT INTO batch_jobs(id,batch_id,sequence_number,template_id,voice_path,voice_name,voice_duration_ms,srt_path,background_mode,status,transition_seed,image_seed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    this.transaction(()=>{
      insertBatch.run(batchId,validProjectId,config.batchName||'BATCH',config.voiceFolder||null,config.srtFolder||null,config.backgroundMode||'STOCK_VIDEO',validLibraryId,config.outputFolder||null,config.usedFolder||null,JSON.stringify(config),jobs.length,now,now);
      for(const job of jobs){
        const canCreateSrt=config.autoGenerateSrt!==false;
        let validTemplateId = null;
        const targetTpl = job.templateId || config.templateId;
        if (targetTpl) {
          try {
            const t = this.db.prepare('SELECT id FROM templates WHERE id=?').get(targetTpl);
            if (t) validTemplateId = targetTpl;
          } catch {}
        }
        insertJob.run(createId(),batchId,job.sequenceNumber,validTemplateId,job.voicePath,job.voiceName,job.voiceDurationMs||job.voice_duration_ms||0,job.srtPath||null,job.backgroundMode||config.backgroundMode||'STOCK_VIDEO',(job.srtPath||canCreateSrt)?'PENDING':'SKIPPED',job.transitionSeed,job.imageSeed||job.transitionSeed+1,now,now);
      }
    });
    return batchId;
  }
  getBatch(id) { const row=this.db.prepare('SELECT * FROM batches WHERE id=?').get(id); return row?{...row,config:safeJson(row.config_json,{})}:null; }
  listBatches(limit=100) { return this.db.prepare('SELECT * FROM batches ORDER BY created_at DESC LIMIT ?').all(limit).map((r)=>({...r,config:safeJson(r.config_json,{})})); }
  listBatchJobs(batchId) { return this.db.prepare('SELECT * FROM batch_jobs WHERE batch_id=? ORDER BY sequence_number').all(batchId); }
  getJob(id) { return this.db.prepare('SELECT * FROM batch_jobs WHERE id=?').get(id); }
  updateBatch(id,patch) { this.updateRow('batches',id,{...patch,updated_at:Date.now()}); }
  updateJob(id,patch) { this.updateRow('batch_jobs',id,{...patch,updated_at:Date.now()}); }
  saveJobAssets(jobId,role,segments) {
    this.db.prepare('DELETE FROM job_assets WHERE job_id=? AND role=?').run(jobId,role);
    const stmt=this.db.prepare(`INSERT INTO job_assets(id,job_id,media_asset_id,role,sequence_index,trim_start_ms,trim_duration_ms,start_ms,end_ms,transform_json,transition_in_json,transition_out_json,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),now=Date.now();
    segments.forEach((s,i)=>{
      let validAssetId = null;
      if (s.assetId) {
        try {
          const row = this.db.prepare('SELECT id FROM media_assets WHERE id=?').get(s.assetId);
          if (row) validAssetId = s.assetId;
        } catch {
          validAssetId = null;
        }
      }
      stmt.run(createId(),jobId,validAssetId,role,i,s.trimStartMs||0,s.durationMs||0,s.startMs||0,s.endMs||null,JSON.stringify(s.transform||{}),s.transitionIn?JSON.stringify(s.transitionIn):null,s.transitionOut?JSON.stringify(s.transitionOut):null,'PLANNED',now);
    });
  }
  saveRenderPlan(jobId,plan) { const now=Date.now(), json=JSON.stringify(plan); this.db.prepare(`INSERT INTO render_plans(id,job_id,plan_version,plan_json,created_at,updated_at) VALUES(?,?,1,?,?,?) ON CONFLICT(job_id) DO UPDATE SET plan_version=render_plans.plan_version+1,plan_json=excluded.plan_json,updated_at=excluded.updated_at`).run(createId(),jobId,json,now,now); }

  reserveAssets(jobId,assetIds) { const select=this.db.prepare('SELECT id,status FROM media_assets WHERE id=?'), update=this.db.prepare("UPDATE media_assets SET status='RESERVED' WHERE id=? AND status='AVAILABLE'"), insert=this.db.prepare("INSERT INTO stock_reservations(id,media_asset_id,job_id,status,reserved_at) VALUES(?,?,?,'ACTIVE',?)"); this.transaction(()=>{for(const assetId of assetIds){const asset=select.get(assetId); if(!asset||asset.status!==ASSET_STATUS.AVAILABLE)throw new Error(`Stock không còn khả dụng: ${assetId}`); if(update.run(assetId).changes!==1)throw new Error(`Không thể reserve stock: ${assetId}`); insert.run(createId(),assetId,jobId,Date.now());}}); this.audit('RESERVE','JOB',jobId,{assetIds}); }
  releaseReservations(jobId) { this.transaction(()=>{const rows=this.db.prepare("SELECT * FROM stock_reservations WHERE job_id=? AND status='ACTIVE'").all(jobId); for(const row of rows){this.db.prepare("UPDATE media_assets SET status='AVAILABLE' WHERE id=? AND status IN ('RESERVED','MOVING')").run(row.media_asset_id); this.db.prepare("UPDATE stock_reservations SET status='RELEASED',released_at=? WHERE id=?").run(Date.now(),row.id);}}); this.audit('RELEASE','JOB',jobId); }
  getActiveReservations(jobId) { return this.db.prepare(`SELECT r.*,a.file_path,a.file_name,a.duration_ms FROM stock_reservations r JOIN media_assets a ON a.id=r.media_asset_id WHERE r.job_id=? AND r.status='ACTIVE'`).all(jobId); }
  markMoving(assetId) { this.db.prepare("UPDATE media_assets SET status='MOVING' WHERE id=?").run(assetId); }
  commitUsed({reservationId,assetId,batchId,jobId,sourcePath,usedPath,outputPath,usedDurationMs}) { const now=Date.now(); this.transaction(()=>{this.db.prepare("UPDATE media_assets SET status='USED',file_path=?,normalized_path=?,used_at=? WHERE id=?").run(usedPath,usedPath.toLocaleLowerCase('en-US'),now,assetId); this.db.prepare("UPDATE stock_reservations SET status='COMMITTED',committed_at=? WHERE id=?").run(now,reservationId); this.db.prepare(`INSERT INTO stock_usage_history(id,media_asset_id,batch_id,job_id,source_path,used_path,output_path,used_duration_ms,moved_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(createId(),assetId,batchId,jobId,sourcePath,usedPath,outputPath,usedDurationMs,now,now);}); this.audit('COMMIT_STOCK','JOB',jobId,{assetId,usedPath}); }

  getMatchedStockProgress(sourcePath, sourceDurationMs=0) {
    const normalized=String(sourcePath||'').toLocaleLowerCase('en-US');
    if(!normalized)return {sourceDurationMs:0,normalConsumedMs:0,cloneConsumedMs:0,phase:1,consumedStartMs:0};
    const rows=this.db.prepare("SELECT pass_index,MAX(source_end_ms) consumed_ms,MAX(source_duration_ms) source_duration_ms FROM matched_stock_usage WHERE normalized_source_path=? AND status='COMPLETED' GROUP BY pass_index").all(normalized);
    const duration=Math.max(Number(sourceDurationMs||0),...rows.map((row)=>Number(row.source_duration_ms||0)));
    const normalConsumed=Math.max(0,...rows.filter((row)=>Number(row.pass_index||1)===1).map((row)=>Number(row.consumed_ms||0)));
    const cloneConsumed=Math.max(0,...rows.filter((row)=>Number(row.pass_index||1)>=2).map((row)=>Number(row.consumed_ms||0)));
    const normalComplete=duration>0&&normalConsumed>=Math.max(0,duration-20);
    return {
      sourceDurationMs:duration,
      normalConsumedMs:Math.min(normalConsumed,duration||normalConsumed),
      cloneConsumedMs:Math.min(cloneConsumed,duration||cloneConsumed),
      phase:normalComplete?2:1,
      consumedStartMs:Math.min(normalComplete?cloneConsumed:normalConsumed,duration||normalConsumed||cloneConsumed)
    };
  }
  getMatchedStockConsumedMs(sourcePath, sourceDurationMs=0) { return this.getMatchedStockProgress(sourcePath,sourceDurationMs).consumedStartMs; }
  recordMatchedStockUsage({batchId,jobId,voiceName,sourcePath,outputPath,sourceDurationMs,segments}) { const now=Date.now(),normalized=String(sourcePath||'').toLocaleLowerCase('en-US'); const stmt=this.db.prepare(`INSERT INTO matched_stock_usage(id,batch_id,job_id,voice_name,source_path,normalized_source_path,output_path,source_duration_ms,source_start_ms,source_end_ms,render_duration_ms,playback_rate,pass_index,flipped,zoom,action,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`); this.transaction(()=>{for(const [index,segment] of segments.entries()){const transform=segment.transform||{},sourceStartMs=Math.max(0,Math.round(Number(segment.sourceRangeStartMs??segment.trimStartMs??0))),sourceEndMs=Math.max(sourceStartMs,Math.round(Number(segment.sourceRangeEndMs??(sourceStartMs+Number(segment.sourceDurationMs||segment.durationMs||0))))),phase=Math.max(1,Math.round(Number(segment.stockPhase??segment.stockPassIndex??index+1))); stmt.run(createId(),batchId,jobId,voiceName||'',sourcePath,normalized,outputPath,Math.round(Number(sourceDurationMs||0)),sourceStartMs,sourceEndMs,Math.round(Number(segment.durationMs||0)),Number(segment.playbackRate||1),phase,transform.flip?1:0,Number(transform.scale||transform.scaleStart||1),phase>1?'CLONE_REUSE':'CONSUME_RANGE','COMPLETED',now);}}); this.audit('MATCHED_STOCK_USAGE','JOB',jobId,{sourcePath,outputPath}); }
  markMatchedStockDeleted(sourcePath) { const normalized=String(sourcePath||'').toLocaleLowerCase('en-US'); if(!normalized)return; this.db.prepare("UPDATE matched_stock_usage SET action='FULLY_CONSUMED_DELETE',source_deleted_at=? WHERE normalized_source_path=? AND status='COMPLETED' AND source_deleted_at IS NULL").run(Date.now(),normalized); }
  markMatchedStockMoved(sourcePath) { const normalized=String(sourcePath||'').toLocaleLowerCase('en-US'); if(!normalized)return; this.db.prepare("UPDATE matched_stock_usage SET action='FULLY_CONSUMED_MOVED' WHERE normalized_source_path=? AND status='COMPLETED' AND action<>'FULLY_CONSUMED_DELETE'").run(normalized); }
  listMatchedStockUsage(batchId=null,limit=10000) { return batchId?this.db.prepare('SELECT * FROM matched_stock_usage WHERE batch_id=? ORDER BY created_at,voice_name,pass_index LIMIT ?').all(batchId,limit):this.db.prepare('SELECT * FROM matched_stock_usage ORDER BY created_at DESC LIMIT ?').all(limit); }

  createRenderAttempt(jobId,attemptNumber,data) { const id=createId(); this.db.prepare(`INSERT INTO render_attempts(id,job_id,attempt_number,status,encoder,video_bitrate_kbps,target_size_bytes,command_text,log_path,temp_output_path,final_output_path,started_at) VALUES(?,?,?,'RUNNING',?,?,?,?,?,?,?,?)`).run(id,jobId,attemptNumber,data.encoder,data.videoBitrateKbps,data.targetSizeBytes,data.commandText||'',data.logPath,data.tempOutputPath,data.finalOutputPath,Date.now()); return id; }
  finishRenderAttempt(id,patch) { this.updateRow('render_attempts',id,{...patch,completed_at:Date.now()}); }
  createReport({batchId=null,jobId=null,reportType,severity,title,content,filePath=null}) { this.db.prepare(`INSERT INTO reports(id,batch_id,job_id,report_type,severity,title,content_json,file_path,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(createId(),batchId,jobId,reportType,severity,title,JSON.stringify(content),filePath,Date.now()); }
  listReports(batchId=null,limit=100) { const rows=batchId?this.db.prepare('SELECT * FROM reports WHERE batch_id=? ORDER BY created_at DESC LIMIT ?').all(batchId,limit):this.db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?').all(limit); return rows.map((r)=>({...r,content:safeJson(r.content_json,{})})); }

  recoverInterruptedWork() { const now=Date.now(); return this.transaction(()=>{const jobs=this.db.prepare("SELECT id,batch_id FROM batch_jobs WHERE status IN ('VALIDATING','PREPARING','RENDERING','VERIFYING','RETRYING')").all(); for(const job of jobs){this.releaseReservationsUnsafe(job.id); this.db.prepare("UPDATE batch_jobs SET status='INTERRUPTED',error_code='APP_RESTART',error_message='Job bị gián đoạn do ứng dụng đóng.',updated_at=? WHERE id=?").run(now,job.id); this.db.prepare("UPDATE batches SET status='PAUSED',stop_reason='APP_RESTART',updated_at=? WHERE id=? AND status='RUNNING'").run(now,job.batch_id);} const moving=this.db.prepare("SELECT id,file_path FROM media_assets WHERE status='MOVING'").all(); for(const asset of moving)this.db.prepare("UPDATE media_assets SET status='AVAILABLE' WHERE id=?").run(asset.id); return {interruptedJobs:jobs.length,movingAssets:moving.length};}); }
  releaseReservationsUnsafe(jobId) { const rows=this.db.prepare("SELECT * FROM stock_reservations WHERE job_id=? AND status='ACTIVE'").all(jobId); for(const row of rows){this.db.prepare("UPDATE media_assets SET status='AVAILABLE' WHERE id=? AND status IN ('RESERVED','MOVING')").run(row.media_asset_id); this.db.prepare("UPDATE stock_reservations SET status='RELEASED',released_at=? WHERE id=?").run(Date.now(),row.id);} }

  getLicenseCache() {
    if (this.closed) return null;
    try {
      const row=this.db.prepare('SELECT * FROM license_cache LIMIT 1').get();
      return row?{...row,entitlements:safeJson(row.entitlement_json,{})}:null;
    } catch {
      return null;
    }
  }
  saveLicenseCache(data) {
    if (this.closed) return;
    try {
      const now=Date.now(), existing=this.db.prepare('SELECT id FROM license_cache LIMIT 1').get(), id=existing?.id||createId();
      this.db.prepare(`INSERT INTO license_cache(id,license_key_hash,device_id,plan_code,status,expires_at,offline_until,last_verified_at,entitlement_json,token_encrypted,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET license_key_hash=excluded.license_key_hash,device_id=excluded.device_id,plan_code=excluded.plan_code,status=excluded.status,expires_at=excluded.expires_at,offline_until=excluded.offline_until,last_verified_at=excluded.last_verified_at,entitlement_json=excluded.entitlement_json,token_encrypted=excluded.token_encrypted,updated_at=excluded.updated_at`).run(id,data.licenseKeyHash||null,data.deviceId||null,data.planCode||null,data.status||null,data.expiresAt||null,data.offlineUntil||null,data.lastVerifiedAt||now,JSON.stringify(data.entitlements||{}),data.tokenEncrypted||null,now);
    } catch {}
  }
  clearLicenseCache() {
    if (this.closed) return;
    try { this.db.prepare('DELETE FROM license_cache').run(); } catch {}
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.db.close(); } catch {}
  }
}

module.exports = { AppDatabase };
