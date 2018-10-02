(function (root, $, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        factory();
    }
}(this, window.jQuery, function () {

    var Stack = function (element, options) {
        this.element = $(element);
        this.options = options;
        this.tabs = this.getTabs(this.element);
        this.layers = this.getLayers(this.element);
        this._bindEvents();
        this.reload();
    };

    Stack.prototype.showStack = function(layerTo){
        if(!this instanceof Stack){
            return this.stack().showStack(layerTo);
        }
        var targetTab = null;
        var targetLayer = null;
        var sourceTab = this.tabs.filter('.active');
        var sourceLayer = this.layers.filter('.active');
        if(typeof layerTo === "number"){
            //index
            targetTab = this.tabs.eq(layerTo);
            targetLayer = this.layers.eq(layerTo);
        }else if(typeof layerTo === "string"){
            //id
            targetTab = this.tabs.filter("[data-target='"+layerTo+"']");
            targetLayer = this.layers.filter("#"+layerTo);
        }else{
            targetLayer = layerTo;
            var layerIndex = this.layers.index(layerTo);
            targetTab = this.tabs.eq(layerIndex);
        }
        this.element.trigger("stackChange.shenjian",[targetTab, targetLayer, sourceTab, sourceLayer]);
    }

    Stack.prototype.addStack = function(tab,layer){
        this.tabs.push(tab[0]);
        this.layers.push(layer[0]);
        this._bindEvent2Tab(tab,layer);
        layer.data("stack",this);
        this.showStack(layer);
    }
    Stack.prototype.removeStack = function(tabIndex){
        if(typeof tabIndex !== "number"){
            tabIndex = this.layers.index(tabIndex);
        }

        var removeTab = this.tabs.eq(tabIndex);
        var removeLayer = this.layers.eq(tabIndex);

        if(removeTab.hasClass("active")){
            var prevIndex = tabIndex - 1;
            if(prevIndex == -1){
                prevIndex = this.tabs.length - 1;
            }
            this.showStack(prevIndex);
        }
        this.tabs.splice(tabIndex, 1);
        this.layers.splice(tabIndex, 1);
        removeTab.remove();
        removeLayer.remove();
    }


    $.event.special.stackChange ={
        _default : function(ev,targetTab, targetLayer){
            var stack = $(ev.target).data("stack");
            if(stack){
                if(targetTab != null && !targetTab.hasClass("active")){
                    stack.tabs.removeClass("active");
                    stack.layers.removeClass("active");
                    targetTab.addClass("active");
                    targetLayer.addClass("active");

                    var elementId = stack.element.attr("id");
                    if(!_.isEmpty(elementId) && stack.element.parents("[data-toggle='stack']").length == 0){
                        //仅支持最顶层的stack
                        var targetIndex = stack.tabs.index(targetTab) + 1;
                        window.location.hash = elementId+"-"+targetIndex;
                    }

                    stack.element.trigger('change', [targetTab, targetLayer, this.element]);
                    //所有子layer需要加载的 也同时加载
                    targetLayer.find(".stack-layer.active").each(function(){
                        var childStack = $(this).data("stack");
                        if(childStack){
                            childStack.loadAjax($(this));
                        }
                    });
                }
                stack.loadAjax(targetLayer);
            }
        }
    }

    Stack.prototype.reload = function(){
        if(!this instanceof Stack){
            return this.stack().reload();
        }

        //优先判断地址栏中是否存在合法的锚点
        var targetIndex = 0;
        var hash = window.location.hash;
        var elementId = this.element.attr("id");
        if(!_.isEmpty(hash) && hash.indexOf(elementId) >= 0 && hash.length > elementId.length + 2){
            var index = hash.substr(elementId.length + 2);
            if(!isNaN(index) && _.parseInt(index)<=this.layers.length){
                targetIndex = _.parseInt(index);
            }
        }

        var targetTab   = null;
        var targetLayer = null;
        if(targetIndex>0){
            targetLayer = this.layers.eq(targetIndex-1);
            targetTab = this.tabs.eq(targetIndex-1);
            this.layers.removeClass("active");
            this.tabs.removeClass("active");
            targetLayer.addClass("active");
            targetTab.addClass("active");
        }else{
            targetLayer = this.layers.filter(".active");
            if(targetLayer.length == 0){
                targetLayer = this.layers.eq(0);
                targetTab = this.tabs.eq(0);
                targetLayer.addClass("active");
                targetTab.addClass("active");
            }
        }

        var src = targetLayer.attr("data-stack-src");
        if(!_.isEmpty(src)){
            targetLayer.removeAttr("data-stack-src").attr("stack-src", src);
        }
        this.loadAjax(targetLayer);
    }

    Stack.prototype._bindEvents = function() {
        var that = this;
        this.tabs.each(function (index) {
            that._bindEvent2Tab($(this),that.layers.eq(index));
        });
    };

    Stack.prototype._bindEvent2Tab = function(tab, layer){
        var that = this;
        tab.on('click ifChecked', function (event) {
            if(!tab.is(".active") && event.button == 0){
                //左键
                if(!_.isEmpty($(this).data("target"))){
                    that.showStack($(this).data("target"));
                }else{
                    that.showStack(layer);
                }
                event.stopPropagation();
            }
        });
    }

    Stack.prototype.getTabs = function() {
        var tabs =  this.element.findUntil(
            '.stack-tab',".stack,[data-toggle='stack']");
        return tabs;
    }

    Stack.prototype.getLayers = function() {
        var layers = this.element.findUntil('.stack-layer',".stack,[data-toggle='stack']");

        layers.data("stack",this);
        return layers;
    }


    Stack.prototype.loadAjax = function(layer) {
        if (!layer || typeof (layer.attr("stack-src")) !== "string") {
            return;
        }
        var isLayerActive = layer.is(".active");
        layer.parents(".stack-layer").each(function(){
            if(!$(this).is(".active")){
                isLayerActive = false;
            }
        });
        if(!isLayerActive){
            return;
        }

        var layerIndex = this.layers.index(layer);
        var tab = this.tabs.eq(layerIndex);

        var element = this.element;
        var $this = this;
        element.trigger('beforeSend', [layer, element]);
        var src = layer.attr("stack-src");
        layer.addClass("ajax-loading");
        tab.addClass("ajax-loading");
        var params = {};
        if (layer.data("stack-params")) {
            params = layer.data("stack-params");
        }
        shenjian.post(src, params, function (result) {
            try {
                var details = JSON.parse(result);
                if (details && details.result === 1) {
                    //@todo ajaxSuccess 定义好像不一致
                    element.trigger('ajaxSuccess', [details, layer, element]);
                    if(details.data.html){
                        if(layer.find('.layer-content').length){
                            layer.find('.layer-content').html(details.data.html);
                        }else{
                            layer.html(details.data.html);
                        }
                        shenjian.toggleData(layer);
                    }
                    if(details.data.title){
                        tab.find('.tab-title').html(details.data.title)
                    }

                    element.trigger('stackLoad.shenjian', [details, layer, tab]);
                } else {
                    element.trigger('ajaxFail', [details, layer, element]);
                }
            } catch (err) {
                //@todo 自定义事件
                element.trigger('ajaxError', [result, layer, element]);
            } finally {
                layer.removeClass("ajax-loading");
                tab.removeClass("ajax-loading");
                layer.removeAttr("stack-src").attr("data-stack-src", src);
            }
        }).done(function () {
            element.trigger('ajaxComplete', [layer, element]);
            layer.removeClass("ajax-loading");
            tab.removeClass("ajax-loading");
            layer.removeAttr("stack-src").attr("data-stack-src", src);
        });
    }

    $.fn.stack = function () {
        var options = $.fn.stack.defaults;
        if (arguments.length === 1 ||
            typeof arguments[0] === 'object') {
            var option = arguments[0];
            options = $.extend(true, {}, options, option);
        }
        this.each(function(){
            var stack = $(this).data('stack');
            if (!stack) {
                stack = new Stack(this, options);
                $(this).data('stack', stack);
            }
        });
        var stack = this.data("stack");
        return $.extend(true, this, stack);
    };

    $.fn.gotoUrl = function(action,controller,query){
        if(this.hasClass("stack-layer")){
            this.attr("data-stack-src",shenjian.url(action,controller,query));
            var stack = this.data("stack");
            if(stack) {
                stack.reload();
            }
        }
    }

    var _gotoPage = shenjian.gotoPage;
    shenjian.gotoPage = function(page){
        var arguments = arguments.callee.caller.arguments;
        if(arguments[0]==page){
            arguments = arguments.callee.caller.arguments;
        }
        if(arguments[0] instanceof MouseEvent){
            //点击事件下一页
            var e = arguments[0];
            var stackLayer = $(e.target).parents(".stack-layer").eq(0);
            if(stackLayer.length > 0 && stackLayer.attr("data-stack-src") != ""){
                var url = stackLayer.attr("data-stack-src");

                var matches = /page=\d+/.exec(url);
                if(matches){
                    url = url.replace(/page=\d+/,"page="+page);
                }else{
                    url += "&page="+page;
                }
                stackLayer.attr("data-stack-src",url);

                var stack = stackLayer.data("stack");
                if(stack){
                    stack.reload();
                    return;
                }
            }

        }
        _gotoPage(page);
    }
}));