/**
 * Created by wutong on 2017/12/23.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));
const ProjectCache = require(path.join("..","biz/entities","ProjectCache.js"));
const PluginManager = require(path.join("..","biz/entities","PluginManager.js"));

class ProjectController extends SController{
    actionNew(){
        let pluginManager = PluginManager.defaultManager();
        let pluginGroups = pluginManager.getPluginGroups();
        let groups = [];

        //保证预定义的组在前面
        for(let i in PluginManager.predefinedGroups){
            //i18n
            let group = this.__(PluginManager.predefinedGroups[i]);
            groups.push({
                group:group,
                children:pluginGroups[group]
            })
            PluginManager.predefinedGroups[i] = group;
        }

        //format for mustache
        for(let name in pluginGroups){
            if(PluginManager.predefinedGroups.indexOf(name) == -1){
                groups.push({
                    group:name,
                    children:pluginGroups[name]
                })
            }
        }
        this.render("dialog-new",{groups:groups});
    }
    actionList(){
        let projectCache = ProjectCache.defaultCache();
        let html = this.renderPartial("tpl-list",{project_list:projectCache.getProjectList()});
        this.success("",{html:html,title:this.__("project_list_all"),"project_list":true});
    }
    actionDashboard({project_id}){
        let pluginManager = PluginManager.defaultManager();
        let project =  ProjectCache.defaultCache().getProject(project_id);
        let plugin = pluginManager.getPlugin(project.getPlugin());
        let html = this.renderPartial("tpl-dashboard",
            {name:project.getName(),
                project_id:project_id,
                inputs:project.getInputs(),
                main_path:plugin.getMainPath()});

        let pluginSource = {};
        for(let i in plugin.inputs){
            let input = plugin.inputs[i];
            if(input.name == "source"){
                pluginSource = input;
            }
        }

        let localeFile = false;
        if(plugin.getLocale()){
            localeFile = path.join(plugin.getRoot(),"locales",plugin.getLocale(),"strings.json");
        }

        this.success("",{html:html,title:project.getName(),
            "project":project,"source":pluginSource,
            "toolbar":plugin.toolbar,"locale_file":localeFile});
    }

    actionCreate(data){
        ProjectCache.defaultCache().createProject(data);
        this.success();
    }
    actionRemove({project_id}){
        ProjectCache.defaultCache().removeProject(project_id);
        this.success();
    }
    actionData({project_id}){
        this.render("dialog-data",{project_id:project_id});
    }

    actionExport({project_id}){
        let pluginManager = PluginManager.defaultManager(),
        project =  ProjectCache.defaultCache().getProject(project_id),
        plugin = pluginManager.getPlugin(project.getPlugin()),
        outputs = plugin.getOutputs(),
        args = {project_id:project_id};
        if(outputs[0].js){
            args['export'] = outputs[0].name;
        }
        this.render("dialog-export",args);
    }

    actionImport({project_id}){
        let pluginManager = PluginManager.defaultManager(),
        project =  ProjectCache.defaultCache().getProject(project_id),
        plugin = pluginManager.getPlugin(project.getPlugin()),
        outputs = plugin.getOutputs(),
        args = {project_id:project_id};
        if(outputs[0].js){
            args['export'] = outputs[0].name;
        }
        this.render("dialog-import",args);
    }

    actionImported({mismatchCount,matchCount,pascalCount}){
        this.render("dialog-imported",{mismatchCount:mismatchCount,matchCount:matchCount,pascalCount:pascalCount});
    }

    actionExporting({project_id,file_path,format}){
        let pluginManager = PluginManager.defaultManager(),
            project =  ProjectCache.defaultCache().getProject(project_id),
            plugin = pluginManager.getPlugin(project.getPlugin()),
            outputs = plugin.getOutputs(),
            export_js = path.join(plugin.getRoot(),String(outputs[0].js));
        this.render("dialog-exporting",{project_id:project_id,project_name:project.getName(),file_path:file_path,format:format,export_js:export_js,ext:outputs[0].ext});
    }

    actionConfigModify({project_id}){
        let pluginManager = PluginManager.defaultManager();
        let project =  ProjectCache.defaultCache().getProject(project_id);
        let plugin = pluginManager.getPlugin(project.getPlugin());

        let inputs = plugin.inputs;
        let inputs_project = project.getInputs();
        inputs = inputs.map((current_val)=>{
            current_val.val = inputs_project[current_val.name];
            if(current_val.name === 'source'){
                current_val.source = true;
                if(current_val.hasOwnProperty('textarea')){
                    current_val.textarea = {source:true};
                }
            }
            return current_val;
        });
        this.render("dialog-config-modify",{inputs:inputs,name:project.getName(),project_id:project_id});
    }

    actionConfigModifySuccess({project_id,name,inputs}){
        let project =  ProjectCache.defaultCache().getProject(project_id);
        project.setInputs(inputs);
        project.setName(name);
        this.success();
    }

}
module.exports = ProjectController;
