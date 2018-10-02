/**
 * Created by wutong on 2018/1/6.
 */
/**
 * Created by admin on 2017/12/20.
 */

'use strict';
(function($){
    var $appStack = $("#app-stack");
    var $tabList = $("#tab-list");
    var $layerList = $("#layer-list");
    var $iconRight = $tabList.find(".ico-more-right");

    let tabHtml = `<li class="stack-tab" >
        <i class="icon fs fs-project"></i>
        <label><span class="tab-title"></span></label>
        <i class="ico-remove fs fs-close"></i>
        </li>`;
    let layerHtml =`<div class="stack-layer"></div>`;

    var AppStack = function(stack){
        this._stack = stack;
        this._bindEvents();
        this.caches = {};
    }

    AppStack.prototype._bindEvents = function(){
        shenjian.on('ProjectCreated', ({project_id}) => {
            this.openProject(project_id);
        });
    }
    AppStack.prototype._showStack = function(stack){
        if(typeof stack == "string" && /^[+-]\d+/.exec(stack)){
            var delaIndex = parseInt(stack);
            var currTab = $tabList.children(".stack-tab.active");
            var allTab = $tabList.children(".stack-tab");
            var currIndex = allTab.index(currTab);
            var nextIndex = currIndex+delaIndex;
            if(nextIndex < 0 || nextIndex >= allTab.length){
                return;
            }
            stack = nextIndex;
        }

        this._stack.showStack(stack);
    };
    AppStack.prototype._createStack = function(project_id){
        var tab = $(tabHtml).appendTo($tabList);
        var layer = $(layerHtml).appendTo($layerList);
        tab.find(".ico-remove").on("click",(ev)=>{
            if(tab.is('.changed')){
                window.confirm(i18n.__("project_content_unsaved"),()=>{
                    layer.find("iframe")[0].contentWindow.plugin.setChanged(false);
                    tab.find(".ico-remove").trigger('click');
                });
            }else{
                //因为第一个是向左按钮 所以无需+1处理
                var currTab = $(ev.target).parents(".stack-tab").first();
                if(currTab.data("cache-index")){
                    //如果是app的tab
                    delete this.caches[currTab.data("cache-index")]
                }
                var currIndex = $tabList.children(".stack-tab").index(currTab);
                this._removeStack(currIndex);
            }
        })
        tab.on("mousedown",(ev)=>{
            if(ev.button == 1){
                //中键删除
                var currTab = $(ev.target).parents(".stack-tab").first();
                var currIndex = $tabList.children(".stack-tab").index(currTab);
                if(currIndex > 0){
                    if(currTab.data("cache-index")){
                        //如果是app的tab
                        delete this.caches[currTab.data("cache-index")]
                    }
                    //首页不能删除
                    this._removeStack(currIndex);
                }
            }
        });
        return {"tab":tab,"layer":layer};
    }

    AppStack.prototype._removeStack = function(layer){
        this._stack.removeStack(layer)
    }


    AppStack.prototype._addStack = function(tab,layer){
        this._stack.addStack(tab, layer);
    }
    /**
     * 打开空白页
     */
    AppStack.prototype.openEmpty = function(){
        var {tab,layer} = this._createStack();
        this._addStack(tab, layer)
    }


    AppStack.prototype.openProject = function(project_id){
        if(this.caches["project_"+project_id]){
            this._showStack(this.caches["project_"+project_id])
        }else{
            var {tab,layer} = this._createStack(project_id);
            tab.attr("project-id",project_id);
            layer.attr("project-id",project_id);
            layer.addClass("layer-project");
            layer.attr('stack-src',shenjian.url("dashboard","project","project_id="+project_id));
            tab.data("cache-index","project_"+project_id);
            this.caches["project_"+project_id] = layer;
            this._addStack(tab, layer)
        }
    }

    AppStack.prototype.openProjectList = function(project_list){
        if(this.caches["list"]){
            this._showStack(this.caches["list"])
        }else{
            var {tab,layer} = this._createStack();
            layer.addClass("layer-project-list");
            layer.attr('stack-src',shenjian.url('list','project'));
            layer.data("stack-params",project_list);
            tab.data("cache-index","list");
            this.caches["list"] = layer;
            this._addStack(tab, layer)
        }
    }

    AppStack.prototype.closeProject = function(project_id){
        if(this.caches["project_"+project_id]){
            this._removeStack(this.caches["project_"+project_id])
            delete this.caches["project_"+project_id];
        }
    }

    $.fn.appStack = function(){
        if(!this.is("#app-stack")){
            return;
        }
        var stack = this.stack();
        var appStack = this.data("appStack");
        if(!appStack){
            appStack = new AppStack(stack);
            this.data("appStack",appStack)
        }
        return appStack;
    }
})(jQuery);

$(function(){
    var appStack = $("#app-stack").appStack();
    appStack.openProjectList();
})

