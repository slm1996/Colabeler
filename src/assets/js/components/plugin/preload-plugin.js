/**
 * Created by wutong on 2018/1/23.
 */
var Plugin = function(project_id){
    this.project_id = project_id;
    this.tab = window.parent.$("#tab-list [project-id="+project_id+"]");
    this.layer = window.parent.$("#layer-list [project-id="+project_id+"]");
    this.setChanged = function (bool = true) {
        if(bool){
            this.tab.addClass('changed');
            this.layer.addClass('changed');
        }else{
            this.tab.removeClass('changed');
            this.layer.removeClass('changed');
        }
    }

    this.toolbar = new PluginToolBar();
}

var PluginToolBar = function(){
    this.toolbar = window.parent.$("#toolbar");
}
PluginToolBar.prototype.select = function(role){
    this.toolbar.find("[data-role='"+role+"']").addClass("selected");
}
PluginToolBar.prototype.deselect = function(role){
    this.toolbar.find("[data-role='"+role+"']").removeClass("selected");
}
PluginToolBar.prototype.enable = function(role){
    this.toolbar.find("[data-role='"+role+"']").removeClass("disabled");
}
PluginToolBar.prototype.disable = function(role){
    this.toolbar.find("[data-role='"+role+"']").addClass("disabled");
}
PluginToolBar.prototype.show = function(role){
    this.toolbar.find("[data-role='"+role+"']").removeClass("hidden");
}
PluginToolBar.prototype.hide = function(role){
    this.toolbar.find("[data-role='"+role+"']").addClass("hidden");
}
PluginToolBar.prototype.isSelected = function(role){
    return this.toolbar.find("[data-role='"+role+"']").hasClass("selected");
}
PluginToolBar.prototype.isDisabled = function(role){
    return this.toolbar.find("[data-role='"+role+"']").hasClass("disabled");
}
PluginToolBar.prototype.isHidden = function(role){
    return this.toolbar.find("[data-role='"+role+"']").hasClass("hidden");
}


var PluginI18N = function(locale_file){
    try {
        var stringJSON = shenjian.fs.readFileSync(locale_file, 'utf8');
        this.locales = JSON.parse(stringJSON);
    }catch(e){
        this.locales = {};
    }
}
PluginI18N.prototype.getString = function(phrase){
    let translation = this.locales[phrase]
    if(translation === undefined) {
        translation = phrase
    }
    return translation
}



