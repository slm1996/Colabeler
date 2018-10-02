/**
 * Created by wutong on 2018/1/19.
 */

const path = require("path");

class Plugin{
    constructor(manifest = {}){
        this.manifest_version = manifest.manifest_version || 1;
        if(this.manifest_version == 1){
            this.name = manifest.name;
            this.description = manifest.description;
            this.author = manifest.author;
            this.version = manifest.version;
            this.identifier = manifest.identifier;
            this.homepage_url = manifest.homepage_url;
            this.icon = manifest.icon;
            this.group = manifest.group || "其他";
            this.inputs = manifest.inputs
            for(let i in this.inputs){
                if(this.inputs[i].type == "text"){
                    //方便渲染
                    this.inputs[i].textarea = true;
                }
            }
            this.outputs = manifest.outputs;
            this.main = manifest.main;
            this.toolbar = manifest.toolbar;
            this.locale = manifest.locale || false;
            this.root = manifest.root || path.join(__dirname,"..","..","..","..","plugins",this.identifier);
        }
    }

    getName(){
        return this.name;
    }
    getIdentifier(){
        return this.identifier;
    }
    getIcon(){
        return this.icon;
    }
    getLocale(){
        return this.locale;
    }
    getMain(){
        return this.main;
    }
    getMainPath(){
        return path.join(this.root,this.main)
    }
    getRoot(){
        return this.root;
    }
    getGroup(){
        return this.group;
    }
    getOutputs(){
        return this.outputs;
    }
}

class PluginManager {
    /**
     *
     * @returns {PluginManager}
     */
    static defaultManager() {
        if (!PluginManager._defaultManager) {
            PluginManager._defaultManager = new PluginManager();
            PluginManager.predefinedGroups = ["plugin_group_cv","plugin_group_nlp","plugin_group_speech"];//i18n
            PluginManager.predefinedPlugins = ["com.colabeler.cv.localization",
                "com.colabeler.cv.classification",
                "com.colabeler.cv.segmentation",
                "com.colabeler.cv.localization.3d",
                "com.colabeler.cv.tracking",
                "com.colabeler.cv.transcript",
                "com.colabeler.nlp.classification",
                "com.colabeler.nlp.brat",
                "com.colabeler.speech.transcript"
            ];
        }
        return PluginManager._defaultManager;
    }

    constructor() {
        this.plugins = {};
        this.groups = {};
    }

    addManifest(manifest){
        return this.addPlugin(new Plugin(manifest));
    }
    addPlugin(plugin){
        this.plugins[plugin.getIdentifier()] = plugin;
        if(!this.groups[plugin.getGroup()]){
            this.groups[plugin.getGroup()] = [];
        }
        this.groups[plugin.getGroup()].push(plugin)
    }

    /**
     *
     * @param identifier
     * @returns {Plugin}
     */
    getPlugin(identifier){
        return this.plugins[identifier];
    }
    getPluginGroups(){
        return this.groups;
    }
}
module.exports = PluginManager;