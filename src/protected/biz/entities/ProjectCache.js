/**
 * Created by wutong on 2018/1/2.
 */
const path = require("path");

class Project{
    constructor(projectJson = {}){
        this.project_id = projectJson.project_id || projectJson._id;
        this.name = projectJson.name;
        this.plugin = projectJson.plugin;
        this.plugin_name = projectJson.plugin_name || "";
        this.plugin_icon = projectJson.plugin_icon || "";
        this.time_created = projectJson.time_created;
        this.inputs = projectJson.inputs;
    }
    getProjectId(){
        return this.project_id;
    }

    setPlugin(plugin){
        this.plugin = plugin;
    }
    getPlugin(){
        return this.plugin;
    }
    setPluginName(plugin_name){
        this.plugin_name = plugin_name;
    }
    getPluginName(){
        return this.plugin_name;
    }
    setPluginIcon(plugin_icon){
        this.plugin_icon = plugin_icon;
    }
    getPluginIcon(){
        return this.plugin_icon;
    }
    setName(name){
        this.name = name;
    }
    getName(){
        return this.name;
    }
    setInputs(inputs){
        this.inputs = inputs;
    }
    getInputs(){
        return this.inputs;
    }

}

class ProjectCache{
    /**
     *
     * @returns {ProjectCache}
     */
    static defaultCache(){
        if(!ProjectCache._defaultCache){
            ProjectCache._defaultCache = new ProjectCache();
        }
        return ProjectCache._defaultCache;
    }


    constructor(){
        this.projects = {};
    }


    /**
     *
     * @param  project {Project}
     * @returns {Project}
     */
    addProject(project){
        this.projects[project.getProjectId()] = project;
        return project;
    }

    /**
     *
     * @param projectJson
     * @returns {Project}
     */
    addProjectJson(projectJson){
       return this.addProject(new Project(projectJson));
    }

    /**
     *
     * @param project_id
     * @returns {Project}
     */
    getProject(project_id){
        return this.projects[project_id]
    }
    getProjectList(){
        return Object.keys(this.projects).map((v) => { return this.projects[v]; }).reverse();
    }

    createProject(data){
        let project = new Project(data);
        this.addProject(project);
    }
    removeProject(project_id){
        delete this.projects[project_id];
    }
}
module.exports = ProjectCache;