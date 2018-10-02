/**
 * Created by wutong on 2017/11/29.
 */
const {session} = require('electron');
const Mustache = require('mustache');
const path = require('path');
const fs = require("fs");
const url = require("url");
const HttpUtil = require(path.join("..","utils","HttpUtil.js"));

const Cookie = session.defaultSession.cookies;

class SController{
    constructor(base_path,controller_name){
        this.base_path = base_path;
        this.controller_name = controller_name;
    }
    __(str){
        return this._i18n.__(str);
    }
    setActionName(action_name){
        this.action_name = action_name;
    }
    renderPartial(tpl_name, data = {}){
        let html_path = path.join(this.base_path, "views", this.controller_name.toLowerCase(), tpl_name+".html");
        let html = fs.readFileSync(html_path, 'utf-8');
        if(!data.platform){
            data.platform = process.platform;
        }
        if(!data.locales){
            data.locales = this._i18n.locales;
        }
        html = Mustache.render(html, data);
        return html;
    }
    render(tpl_name, data = {}){
        this.tpl_path = path.join(this.base_path, "views", this.controller_name.toLowerCase());
        let html = this.renderPartial(tpl_name, data);
        this.echo(html);
    }
    echo(content){
        if(typeof this.output != "string"){
            this.output = "";
        }
        this.output += content;
    }
    ob_start(){
        this.output = "";
        this.tpl_path = "";
        this.redirect_url = false;
    }
    ob_flush(){}
    redirect(action,controller=null,query=""){
        this.redirect_url = this.url(action,controller,query);
    }
    url(action,controller,query){
        if(action && action.indexOf("&") === 0){
            query = action;
            action = null;
        }
        if(controller && controller.indexOf("&") === 0){
            query = controller;
            controller = null;
        }
        if(typeof(controller) === "undefined" || controller === null){
            controller = this.controller_name;
        }
        if(typeof(action) === "undefined" || action === null){
            action = this.action_name;
        }
        if(typeof query === "undefined" || query === null){
            query = "";
        }
        if(query.indexOf("&") === 0){
            query = query.substr(1);
        }
        let args = {
            pathname: path.join(this.base_path, "views" , controller , action),
            protocol: 'file:',
            slashes: true
        }
        if(query != ""){
            args.search = "?"+query;
        }
        return url.format(args);
    }
    success(reason = "操作成功", data = "", selector="") {
        this.result(reason, data, 1, selector);
    }
    fail(reason = "错误", selector="", code = 500, second=5) {
        this.result(reason, "", code, selector);
    }
    result(reason, data, code, selector) {
        let result_obj = {"result" : code};
        if(data != ""){
            result_obj["data"] = data;
        }
        if(reason != ""){
            result_obj["reason"] = reason;
        }
        if(selector != ""){
            result_obj["selector"] = selector;
        }
        this.echo(JSON.stringify(result_obj));
    }

    trackPageView(){
        let VERSION = "1.2.30";
        let siteId = this.__('tongji_bd_key');
        let eventProperty = "";
        let visitUrl = "file:///"+this.controller_name+"/"+this.action_name;
        let referer = '';
        let currentPageVisitTime = parseInt((new Date().getTime())/1000);
        this.getCookie().then( (cookies) => {
            let lastPageVisitTime = 0;
            let lastVisitTime = 0;
            for(let i = 0;i<cookies.length;i++){
                if(cookies[i]["name"] == "Hm_lpvt_" + siteId){
                    lastPageVisitTime = parseInt(cookies[i]["value"]);
                }else if(cookies[i]["name"] == "Hm_lvt_" + siteId){
                    lastVisitTime = parseInt(cookies[i]["value"]);
                }
            }
            let sourceType = (currentPageVisitTime - lastPageVisitTime > 1800) ? 1 : 4;
            let isNewVisit = (lastVisitTime == 0) ? 1 : 0;
            this.setCookie("Hm_lpvt_" + siteId, currentPageVisitTime, 0);
            if(!SController.lastVisitTime){
                SController.lastVisitTime = currentPageVisitTime;
                this.setCookie("Hm_lvt_" + siteId, currentPageVisitTime);
            }
            var pixelUrl = "http://hm.baidu.com/hm.gif" +
                "?si=" + siteId +
                "&et=0"  +
                (eventProperty !== "" ? "&ep=" + eventProperty : "") +
                "&nv=" + isNewVisit +
                "&st=" + sourceType +
                (!(lastVisitTime==0) ? "&lt=" + lastVisitTime : "") +
                (!(referer=='') ? "&su=" + encodeURIComponent(referer) : "") +
                (visitUrl !== "" ? "&u=" + encodeURIComponent(visitUrl) : "") +
                "&v=" + VERSION +
                "&rnd=" + Math.floor(Math.random()*(10e9-10e8+1)+10e8)+
                "&Hm_lvt_=" + lastVisitTime+
                "&Hm_lpvt_=" + lastPageVisitTime;
            HttpUtil.get(pixelUrl,{
                headers:{
                    referer:visitUrl,
                    Cookie:"Hm_lvt_" + siteId+"="+lastVisitTime+";Hm_lpvt_"+siteId+"="+lastPageVisitTime
                }
            });
        })
    }


    setCookie(name, value, expired) {
        if(expired === undefined){
            expired = Math.round(new Date().getTime() / 1000) + 31536000;
        }
        let cookie = {
            url: "http://www.shenjian.io",
            name: name,
            value: value+""
        };
        if(expired !== 0){
            cookie.expirationDate = expired;
        }
        Cookie.set(cookie, (error) => {
            if (error) console.error(error);
        });
    };
    getCookie(filter = {}) {
        return  new Promise(function (resolve) {
            Cookie.get(filter, function (error, cookies) {
                if(error){
                    return;
                }
                resolve(cookies)
            });
        });
    };
}


module.exports = SController;