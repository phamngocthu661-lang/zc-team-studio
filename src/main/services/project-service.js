'use strict';
const { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } = require('../../shared/constants');
class ProjectService {
  constructor(database){this.database=database;}
  list(){return this.database.listProjects();}
  get(id){return this.database.getProject(id);}
  create(data){if(!String(data.name||'').trim())throw new Error('Tên project không được trống.');return this.database.createProject({...data,width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT});}
  update(id,data){return this.database.updateProject(id,{...data,width:STANDARD_CANVAS_WIDTH,height:STANDARD_CANVAS_HEIGHT});}
  delete(id){return this.database.deleteProject(id);}
}
module.exports={ProjectService};
