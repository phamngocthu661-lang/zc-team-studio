'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const { subtitleStyle, subtitleEffectiveFontSize, subtitlePreviewBox, subtitleLineHeight, subtitleFitFontSize } = require('../shared/subtitle-preview');
const {
  previewViewport,
  previewPointToProject,
  previewDeltaToProject,
  layerCssBox,
  subtitleFrame,
  resolveFrameState
} = require('../shared/render-core');

const sub = (channel, fn) => {
  const listener = (_event, payload) => fn(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('vbs', {
  chooseDirectory: (options) => ipcRenderer.invoke('dialog:directory', options),
  chooseFile: (options) => ipcRenderer.invoke('dialog:file', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:save', options),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  copyText: (value) => ipcRenderer.invoke('clipboard:write', value),
  appInfo: () => ipcRenderer.invoke('app:info'),
  defaultAssets: () => ipcRenderer.invoke('assets:defaults'),
  checkSystem: () => ipcRenderer.invoke('system:check'),
  refreshGpu: () => ipcRenderer.invoke('system:refreshGpu'),
  testEncoder: (encoder) => ipcRenderer.invoke('system:encoderTest', encoder),
  mediaPreview: (filePath, options) => ipcRenderer.invoke('media:preview', filePath, options),
  mediaFolderPreview: (folder, kind) => ipcRenderer.invoke('media:folderPreview', folder, kind),
  mediaListFolderAssets: (folder) => ipcRenderer.invoke('media:listFolderAssets', folder),
  subtitlePreview: (filePath, renderConfig) => ipcRenderer.invoke('subtitle:preview', filePath, renderConfig),
  preview: {
    subtitleStyle: (renderConfig) => subtitleStyle(renderConfig),
    subtitleFontSize: (subtitle) => subtitleEffectiveFontSize(subtitle),
    subtitleBox: (renderConfig) => subtitlePreviewBox(renderConfig),
    subtitleLineHeight: (subtitle) => subtitleLineHeight(subtitle),
    subtitleFitFontSize: (subtitle, metrics) => subtitleFitFontSize(subtitle, metrics),
    viewport: (project, viewport) => previewViewport(project, viewport),
    pointToProject: (point, project, viewport) => previewPointToProject(point, project, viewport),
    deltaToProject: (delta, project, viewport) => previewDeltaToProject(delta, project, viewport),
    layerCssBox: (layer, renderConfig) => layerCssBox(layer, renderConfig),
    subtitleFrame: (renderConfig, content) => subtitleFrame(renderConfig, content),
    frameState: (renderConfig, frameIndex, subtitleText) => resolveFrameState(renderConfig, frameIndex, subtitleText)
  },
  getSetting: (key, fallback) => ipcRenderer.invoke('settings:get', key, fallback),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    create: (data) => ipcRenderer.invoke('projects:create', data),
    update: (id, data) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id) => ipcRenderer.invoke('projects:delete', id)
  },
  templates: {
    list: (projectId) => ipcRenderer.invoke('templates:list', projectId),
    get: (id) => ipcRenderer.invoke('templates:get', id),
    create: (data) => ipcRenderer.invoke('templates:create', data),
    save: (id, data, note) => ipcRenderer.invoke('templates:save', id, data, note),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
    versions: (id) => ipcRenderer.invoke('templates:versions', id),
    restore: (id, version) => ipcRenderer.invoke('templates:restore', id, version),
    export: (id, filePath) => ipcRenderer.invoke('templates:export', id, filePath),
    import: (filePath, projectId) => ipcRenderer.invoke('templates:import', filePath, projectId)
  },
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    saveTransition: (data) => ipcRenderer.invoke('presets:transition:save', data),
    saveExport: (data) => ipcRenderer.invoke('presets:export:save', data)
  },
  libraries: {
    list: () => ipcRenderer.invoke('libraries:list'),
    create: (data) => ipcRenderer.invoke('libraries:create', data),
    delete: (id) => ipcRenderer.invoke('libraries:delete', id),
    deleteWithFiles: (id) => ipcRenderer.invoke('libraries:deleteWithFiles', id),
    assets: (id, status) => ipcRenderer.invoke('libraries:assets', id, status),
    stats: (id) => ipcRenderer.invoke('libraries:stats', id),
    purge: (id) => ipcRenderer.invoke('libraries:purge', id),
    scan: (id) => ipcRenderer.invoke('libraries:scan', id)
  },
  projectAssets: {
    list: (assetType) => ipcRenderer.invoke('projectAssets:list', assetType),
    create: (data) => ipcRenderer.invoke('projectAssets:create', data),
    delete: (id) => ipcRenderer.invoke('projectAssets:delete', id),
    storagePath: () => ipcRenderer.invoke('projectAssets:storagePath'),
    openFolder: () => ipcRenderer.invoke('projectAssets:openFolder')
  },
  batch: {
    scan: (config) => ipcRenderer.invoke('batch:scan', config),
    start: (config) => ipcRenderer.invoke('batch:start', config),
    resume: (id) => ipcRenderer.invoke('batch:resume', id),
    retryFailed: (id) => ipcRenderer.invoke('batch:retryFailed', id),
    pause: () => ipcRenderer.invoke('batch:pause'),
    cancel: () => ipcRenderer.invoke('batch:cancel'),
    list: () => ipcRenderer.invoke('batch:list'),
    jobs: (id) => ipcRenderer.invoke('batch:jobs', id)
  },
  reports: {
    list: (id) => ipcRenderer.invoke('reports:list', id)
  },
  storyVideo: {
    scan: (items) => ipcRenderer.invoke('storyVideo:scan', items),
    scanDirectory: (dir) => ipcRenderer.invoke('storyVideo:scanDirectory', dir),
    start: (payload) => ipcRenderer.invoke('storyVideo:start', payload),
    cancel: () => ipcRenderer.invoke('storyVideo:cancel')
  },

  stock: {
    scanFolder: (folderPath) => ipcRenderer.invoke('stock:scanFolder', folderPath),
    conformFolder: (folderPath) => ipcRenderer.invoke('stock:conformFolder', folderPath),
    cancelConform: () => ipcRenderer.invoke('stock:cancelConform'),
    onConformProgress: (fn) => sub('stock:conformProgress', fn)
  },

  voice: {
    checkStatus: () => ipcRenderer.invoke('voice:checkStatus'),
    launchVoiceStudio: () => ipcRenderer.invoke('voice:launchVoiceStudio'),
    listProfiles: () => ipcRenderer.invoke('voice:listProfiles'),
    getProfile: (id) => ipcRenderer.invoke('voice:getProfile', id),
    saveProfile: (data, samplePath) => ipcRenderer.invoke('voice:saveProfile', data, samplePath),
    deleteProfile: (id) => ipcRenderer.invoke('voice:deleteProfile', id),
    testGenerate: (payload) => ipcRenderer.invoke('voice:testGenerate', payload),
    readScriptFile: (filePath) => ipcRenderer.invoke('voice:readScriptFile', filePath),
    generateFullScript: (payload) => ipcRenderer.invoke('voice:generateFullScript', payload),
    onGenerateProgress: (fn) => sub('voice:generateProgress', fn)
  },

  image: {
    checkHealth: () => ipcRenderer.invoke('image:checkHealth'),
    planScenes: (params) => ipcRenderer.invoke('image:planScenes', params),
    generatePackage: (params) => ipcRenderer.invoke('image:generatePackage', params),
    generateSingle: (params) => ipcRenderer.invoke('image:generateSingle', params),
    cancel: () => ipcRenderer.invoke('image:cancel'),
    onProgress: (fn) => sub('image:progress', fn)
  },

  license: {
    status: () => ipcRenderer.invoke('license:status'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    machineId: () => ipcRenderer.invoke('license:machineId'),
    onChanged: (fn) => sub('license:changed', fn)
  },

  scriptBridge: {
    status: () => ipcRenderer.invoke('scriptBridge:status'),
    ensureScriptServer: () => ipcRenderer.invoke('scriptBridge:ensureScriptServer'),
    restartScriptServer: () => ipcRenderer.invoke('scriptBridge:restartScriptServer'),
    saveSettings: (partial) => ipcRenderer.invoke('scriptBridge:saveSettings', partial),
    lockConfig: (config) => ipcRenderer.invoke('scriptBridge:lockConfig', config),
    enqueueScript: (payload) => ipcRenderer.invoke('scriptBridge:enqueueScript', payload),
    enqueueFolder: (folderPath) => ipcRenderer.invoke('scriptBridge:enqueueFolder', folderPath),
    clearQueue: () => ipcRenderer.invoke('scriptBridge:clearQueue'),
    onState: (fn) => sub('scriptBridge:state', fn),
    onLog: (fn) => sub('scriptBridge:log', fn),
    onRequestSyncBatchConfig: (fn) => sub('scriptBridge:requestSyncBatchConfig', fn)
  },

  updater: {
    localInfo: () => ipcRenderer.invoke('updater:localInfo'),
    check: (opts) => ipcRenderer.invoke('updater:check', opts),
    apply: () => ipcRenderer.invoke('updater:apply'),
    onStatus: (fn) => sub('updater:status', fn),
    onProgress: (fn) => sub('updater:progress', fn)
  },

  onProgress: (fn) => sub('batch:progress', fn),
  onLog: (fn) => sub('batch:log', fn),
  onJob: (fn) => sub('batch:job', fn),
  onBatch: (fn) => sub('batch:state', fn),
  onLibraryProgress: (fn) => sub('library:progress', fn),
  onStoryProgress: (fn) => sub('storyVideo:progress', fn),
  onStoryLog: (fn) => sub('storyVideo:log', fn),
  onStoryJob: (fn) => sub('storyVideo:job', fn),
  onStoryState: (fn) => sub('storyVideo:state', fn)
});
