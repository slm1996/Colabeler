/**
 * Created by wutong on 2017/1/19.
 */
const {ipcRenderer,remote,shell} = require('electron');
let currentWin = remote.getCurrentWindow();

const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const nativeImage = remote.nativeImage;

var IPCResponse = function(){};
IPCResponse.prototype.done = function(callback){
    this.done_callback = callback;
}

shenjian = {
    time:new Date().getTime(),
    body:$(document.body),
    _init:function(){
        //去掉尾巴上两个
        this.baseUrl = window.location.href.replace(/[\/\\][^\/\\]+$/,"").replace(/[\/\\][^\/\\]+$/,"");
        var matches =/[\/\\]([^\/\\]+)[\/\\]([^\/\\?]+)(\?[^\/\\]+)?$/.exec(window.location);
        if(matches){
            this.controller = matches[1];
            this.action = matches[2];
        }
    },
    is:function(pageId){
        return this.body.attr("id") === pageId;
    },
    isKindOf:function(pageClass){
        return this.body.hasClass(pageClass);
    },
    url:function (action,controller,query) {
        if(action && action.indexOf("&") === 0){
            query = action;
            action = null;
        }
        if(controller && controller.indexOf("&") === 0){
            query = controller;
            controller = null;
        }
        if(typeof(controller) === "undefined" || controller === null){
            controller = this.controller;
        }
        if(typeof(action) === "undefined" || action === null){
            action = this.action;
        }
        if(typeof query === "undefined" || query === null){
            query = "";
        }
        if(query.indexOf("&") === 0){
            query = query.substr(1);
        }
        var formatUrl = this.baseUrl + "/" + controller + "/" + action;
        if(query != ""){
            formatUrl += "?"+ query;
        }
        return formatUrl;
    },
    gotoPage:function (page) {
        var url = window.location.href;
        var matches = /page=\d+/.exec(url);
        if(matches){
            url = url.replace(/page=\d+/,"page="+page);
        }else{
            url += "&page="+page;
        }
        ipcRenderer.send("window.location.href",{"url":url,"name":window.name})
    },
    gotoUrl:function(action,controller,query){
        var url = action;
        if(url.indexOf("http://") !== 0 &&
            url.indexOf("https://") !== 0){
            url = this.url(action,controller,query);
        }
        if(typeof controller === "number"){
            setTimeout(function(){
                ipcRenderer.send("window.location.href",{"url":url,"name":window.name})
            },controller);
        }else{
            ipcRenderer.send("window.location.href",{"url":url,"name":window.name})
        }
    },
    openUrl:function(url,name,features){
        ipcRenderer.send("window.open",{"url":url,"name":name,"features":features,"parent":window.name})
        return {
            close:function(){
               shenjian.close(name);
            }
        }
    },
    openExternal:function(url){
        return shell.openExternal(url);
    },
    close:function(name){
        if(typeof name === "undefined"){
            name = window.name;
        }
        ipcRenderer.send("window.close",name)
    },
    closeAll:function () {
        ipcRenderer.send("close-app")
    },
    hide:function(name){
        if(typeof name === "undefined"){
            name = window.name;
        }
        ipcRenderer.send("window.hide",name)
    },
    show:function(name,features){
        if(typeof name === "undefined"){
            name = window.name;
        }
        ipcRenderer.send("window.show",{name:name,features:features})
    },
    exist:function(name){
        if(typeof name === "undefined"){
            name = window.name;
        }
        return ipcRenderer.sendSync("window.exist",name);
    },
    putWindow:function(name){
        if(typeof name === "undefined"){
            name = window.name;
        }
        ipcRenderer.send("window.put",name)
    },
    //替换ajax请求
    get(url, data, callback, type){
        if(typeof data == "function"){
            callback = data;
            data={};
            type = callback;
        }
        return this.request(url, data, callback, "get", type);
    },
    post(url, data, callback, type){
        if(typeof data == "function"){
            type = callback;
            callback = data;
            data= {};
        }

        return this.request(url, data, callback, "post", type);
    },
    request(url, data, callback, type, dataType){
        var rnd = new Date().getTime() + "." + this.time;
        ipcRenderer.send("$.ajax",{"url":url,"data":data,type:type,"dataType":dataType,"requestId":rnd})
        var localResponse = new IPCResponse();
        ipcRenderer.once("$.ajax.response."+rnd, function (event, response) {
            var content = response.content;
            if(typeof callback === "function"){
                callback(content);
            }
            if(typeof localResponse.done_callback === "function"){
                localResponse.done_callback();
            }
        });
        return localResponse;
    },
    enableDrag:function(selector){
        var startX,startY,drag = false;
        this.body.on("mousedown",function(event){
            ipcRenderer.send("window.move.start",{"name":window.name})
            startX = event.screenX;
            startY = event.screenY;
            drag = true;
        })
        this.body.on("mousemove",function(event){
            if(drag){
                ipcRenderer.send("window.move",{"name":window.name,"deltaX":event.screenX-startX,"deltaY":event.screenY-startY})
            }
        });
        this.body.on("mouseup",function(event){
            drag = false;
        });
        this.body.on("mouseout",function(event){
            drag = false;
        });

    },
    toggleData:function(parent){
        if(typeof parent === "undefined"){
            parent = this.body;
        }else{
            //parent.find("[data-toggle='dropdown']").dropdown();
        }
        parent.find("[data-toggle='stack']").stack();
        parent.find("[data-toggle='icheck']").iCheck();
    },
    send:function(eventName, args, windowName){
        ipcRenderer.send("window.triggerEvent",{eventName:eventName,targetWindow:windowName,args:args})
    },
    on:function(eventName, callback){
        if(typeof callback == "function"){
            ipcRenderer.on("window.addEventListener."+eventName,  (event, args) =>{
                callback(args)
            });
        }
    },
    once:function(eventName, callback){
        if(typeof callback == "function"){
            ipcRenderer.once("window.addEventListener."+eventName,  (event, args) =>{
                callback(args)
            });
        }
    },
    sendtoMain:function (eventName,args) {
        ipcRenderer.send(eventName,{args:args});
    },
    onFromMain:function (eventName,callback) {
        ipcRenderer.on(eventName,  (event, args) =>{
            callback(args)
        });
    }

};
shenjian.shell = shell;
shenjian.remote = remote;
shenjian.fs = require('fs');
shenjian.path = require('path');
shenjian.ipcRenderer = ipcRenderer;

//补充jquery的findUntil方法
$.fn.findUntil = function( selector, mask, result){
    // Default result to an empty jQuery object if not provided
    var result = typeof result !== 'undefined' ?
        result :
        new jQuery();
    // Iterate through all children, except those match Mask
    this.children().each(function(){
        var thisObject = jQuery( this );
        if( thisObject.is( selector ) )
            result.push( this );
        // Recursively seek children without Mask
        if( !thisObject.is( mask ) )
            thisObject.findUntil( selector, mask, result );
    });
    return result;
}
if (!String.prototype.startsWith) {
    String.prototype.startWith = function(search, pos) {
        return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
    }
}
String.prototype.contains = function(str){
    return this.indexOf(str) != -1;
}
String.prototype.short4 = function(length){
    if(this.length > length){
        return this.substr(0,length-1)+"..";
    }
    return this;
}




$(function(){
    shenjian._init();
    $(".btn").on("click", function (event) {
        if($(this).attr("disabled")) {
            event.stopImmediatePropagation();
            return false;
        }
    });

//右上角窗口操作
    $('#nav-window').on('click', '.btn-minimize', () => {
        currentWin.minimize();
    }).on("click",".btn-resize",function(){
        var $this = $(this);
        $this.find('i').toggleClass('fs-max').toggleClass('fs-resize')
        if($this.find('i').is('.fs-max')){
            currentWin.unmaximize()
        }else{
            currentWin.maximize()
        }
    }).on("click",".btn-resize-mac",function(){
        $(this).find('i').toggleClass('plus');
        if($(this).find('i').is('.plus')){
            currentWin.unmaximize()
        }else{
            currentWin.maximize()
        }
    }).on('click', '.btn-exit', (ev) => {
        if(!shenjian.is("dialog-confirm")){
            shenjian.close();
        }
    });

    //默认先创建隐藏的移动到垃圾箱的确认窗口
    if(!shenjian.exist("Confirm-Window")){
        shenjian.openUrl(shenjian.url("confirm","main"),'Confirm-Window',{
            width: 387,
            height: 158,
            alwaysOnTop:true,
            show:false,
            modal: false,
            frame: false,
            resizable : false,
            closable : true,
            useContentSize: true,
        });
    }

    window.confirm=function(text,callback){
        //TODO 覆盖原始方法
        let requestId = "ConfirmRequest_"+shenjian.time + new Date().getTime();
        shenjian.once("window.confirm.return",function(result){
            if(requestId == result.requestId){
                if(typeof callback == 'function'){
                    callback(result.data);
                }
            }
        });
        shenjian.send("window.confirm",{text:text,parent:window.name,requestId:requestId},'Confirm-Window');
    }

    var cookies = {};
    document.__defineGetter__('cookie', function () {
        var output = [];
        for (var cookieName in cookies) {
            output.push(cookieName + "=" + cookies[cookieName]);
        }
        return output.join(";");
    });
    document.__defineSetter__('cookie', function (s) {
        var indexOfSeparator = s.indexOf("=");
        var key = s.substr(0, indexOfSeparator);
        var value = s.substring(indexOfSeparator + 1);
        cookies[key] = value;
        return key + "=" + value;
    });
    document.clearCookies = function () {
        cookies = {};
    };


    var _hmt = _hmt || [];
    (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?cb127cff1fd66a3c7d2b48bf853bbc42";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
    })();
})