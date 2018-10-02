/**
 * Created by chenyi on 2018/2/26.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));
const ProjectCache = require(path.join("..","biz/entities","ProjectCache.js"));
const PluginManager = require(path.join("..","biz/entities","PluginManager.js"));

class ToolsController extends SController {
    actionCaptcha() {
        let pluginManager = PluginManager.defaultManager();
        let plugin = pluginManager.getPlugin('com.colabeler.cv.transcript');
        this.render("dialog-captcha",{plugin:plugin});
    }


    actionMnist(){
        let pluginManager = PluginManager.defaultManager();
        let plugin = pluginManager.getPlugin('com.colabeler.cv.classification');
        this.render("dialog-mnist",{plugin:plugin});
    }
}
module.exports = ToolsController;