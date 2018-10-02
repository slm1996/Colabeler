/**
 * Created by wutong on 2018/1/19.
 */
/**
 * Created by wutong on 2017/12/23.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));
const ProjectCache = require(path.join("..","biz/entities","ProjectCache.js"));
const PluginManager = require(path.join("..","biz/entities","PluginManager.js"));

class SplashController extends SController{
    actionIndex(){
        this.render("tpl-index");
    }
    actionInit({manifests,project_list}){
        this.trackPageView();
        let pluginManager = PluginManager.defaultManager();
        //先加载系统的插件
        for(let i in PluginManager.predefinedPlugins){
            let id = PluginManager.predefinedPlugins[i];
            pluginManager.addManifest(manifests[id]);
        }
        let ids = Object.keys(manifests).sort();
        for(let i in ids){
            let id = ids[i];
            if(PluginManager.predefinedPlugins.indexOf(id) == -1){
                pluginManager.addManifest(manifests[id]);
            }
        }

        let projectCache = ProjectCache.defaultCache();
        for(let i=0;i<project_list.length;i++){
            var project = projectCache.addProjectJson(project_list[i]);
            var plugin = pluginManager.getPlugin(project.getPlugin());
            if(plugin){
                project.setPluginName(plugin.getName());
                project.setPluginIcon(`file:///${plugin.getRoot()}/${plugin.getIcon()}`);
            }
        }
        this.success();
    }
}
module.exports = SplashController;
