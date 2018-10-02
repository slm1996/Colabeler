/**
 * Created by wutong on 2017/11/29.
 */
const electron = require('electron');
const ipcMain = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu
const Tray = electron.Tray

let appTray = null;
let autoUpdater = require('electron-updater').autoUpdater;
const path = require('path');
const url = require('url');
let i18n;


let configs;
let windows ={};
let window_main;
let base_path = path.join(__dirname,"..","protected");//默认地址，可在main里修改
let appName = "神箭手";

class ShenJian{
    static createDesktopApplication(configs_path){
        configs = require(configs_path);
        if(typeof configs.basePath === "string"){
            base_path = configs.basePath;
        }
        const menu = new Menu();
        Menu.setApplicationMenu(menu)
    }
    static app(){
        return new ShenJian();
    }
    createWindow(features, name=false, parent=null){
        let display_name = name;
        if(name === false){
            name = "root";
            display_name = "root";
        }else{
            name = "sj_"+name;
        }
        features["icon"] = __dirname + '/../assets/image/ic_launcher.png';
        if (!features["title"]) {
            features["title"] = appName;
        }
        let win = new BrowserWindow(features);
        win.display_name = display_name;
        windows[name] = win;
        if(parent != null){
            if(!parent._children){
                parent._children = [win];
            }else{
                parent._children.push(win);
            }
        }
        return win;
    }
    getWindow(name=false){
        if(name === false || name === "root"){
            name = "root";
        }else{
            name = "sj_"+name;
        }
        return windows[name];
    }
    popWindow(name=false){
        if(name === false || name === "root"){
            name = "root";
        }else{
            name = "sj_"+name;
        }
        let win = windows[name];
        delete windows[name];
        return win;
    }
    closeWindow(name){
        let win = this.popWindow(name);
        if(win){
            if(win._children){
                for(let i=0;i<win._children.length;i++){
                    //关闭所有子窗口
                    var child = win._children[i];
                    child = this.popWindow(child.display_name);
                    if(child){
                        child.close();
                    }
                }
            }
            win.close();
        }
        if(Object.keys(windows).length === 0){
            app.exit();
        }
    }
    putWindow(name){
        let win = this.getWindow(name);
        if(win){
            win.hide();
        }
        this.putInTray();
        if(!window_main){
            window_main = win;
        }
    }
    hideWindow(name){
        let win = this.getWindow(name);
        if(win){
            win.hide();
        }
    }
    showWindow(name,features){
        let win = this.getWindow(name);
        if(win){
            if(features && features.x>=0 && features.y>=0 ){
                win.setPosition(features.x,features.y);
            }
            win.show();
        }
    }
    putInTray(){
        if(!appTray){
            const iconName = process.platform === 'win32' ? 'ic_launcher_16.ico' : 'ic_launcher_16.png';
            const iconPath = path.join(__dirname,"..","assets","image", iconName);
            appTray = new Tray(iconPath);
            const contextMenu = Menu.buildFromTemplate([{
                label: '打开'+appName,
                click: () => {
                    if(window_main){
                        window_main.show();
                    }
                }
            },{
                label: '退出',
                click: function () {
                    app.quit()
                }
            }])
            appTray.setToolTip(appName);
            appTray.setContextMenu(contextMenu);

            appTray.on("double-click",()=>{
                if(window_main){
                    window_main.show();
                }
            })
        }
    }
    removeTray(){
        if(appTray){
            appTray.destroy();
            appTray = null;
        }
    }

    checkUpdate(){
        let locale = app.getLocale();
        let window = this.getWindow('Main-Window');
        autoUpdater.autoDownload = false;
        autoUpdater.setFeedURL(i18n.__('update_url'));
        autoUpdater.on('update-available', function(info) {
            let lang = locale.split("-")[0];
            let releaseNotes = info[lang] || info["releaseNotes"];
            window.webContents.send('UpdateAvailable.shenjian', {version:info['version'],releaseNotes:releaseNotes});
        });
        autoUpdater.on('update-not-available', function(info) {
            window.webContents.send('UpdateNotAvailable.shenjian');
        });
        autoUpdater.checkForUpdates();
    }
    startUpdate(){
        let window = this.getWindow('dialog-downloading');
        autoUpdater.setFeedURL(i18n.__('update_url'));
        autoUpdater.downloadUpdate();
        autoUpdater.on('download-progress', function(progressObj) {
            window.webContents.send('DownloadProgress.shenjian',progressObj);
        });
        autoUpdater.on('update-downloaded',  function (event) {
            autoUpdater.quitAndInstall();
        });
    }

    parseUrl(url){
        let matches =/[\/\\]([^\/\\]+)[\\\/]([^\\\/?]+)(\?[^\/\\]+)?$/.exec(url);
        if(matches){
            let controller = matches[1];
            let action = matches[2];
            let query = {};
            if(matches.length == 4 && typeof matches[3] != "undefined"){
                let queries = matches[3].substr(1).split("&");
                for(let i in queries){
                    let q = queries[i];
                    let kv = q.split("=");
                    if(kv.length == 2 && kv[0] != ""){
                        query[kv[0]] = kv[1];
                    }
                }
            }
            return {"controller_name":controller,"action_name":action, "query":query};
        }
        return {};
    }
    openController(controller_name, action_name, data={}, window = null){
        let controller = this.loadController(controller_name, action_name, data);
        if(!window) {
            if (!window_main){
                window = this.getWindow();
            }else{
                window = window_main;
            }
        }

        let openWindow = ()=>{
            let html = 'data:text/html;charset=UTF-8,'+
                encodeURIComponent("<script>window.name='"+window.display_name+"';</script>\n"+controller.output);
            window.loadURL(html,{
                baseURLForDataURL:url.format({
                    pathname: path.join(controller.tpl_path,action_name),
                    protocol: 'file:',
                    slashes: true
                })
            });

            if(configs.debug){
                window.openDevTools();
            }
        };
        if(controller.action_result instanceof  Promise){
            //async
            controller.action_result.then(()=>{
                openWindow();
            })
        }else{
            openWindow();
        }



    }
    loadController(controller_name, action_name, data={}, type="get"){
        let controller_file =  controller_name.charAt(0).toUpperCase()+controller_name.slice(1) + "Controller.js";
        let ControllerCls = require(path.join(base_path,"controllers",controller_file));

        let controller = new ControllerCls(base_path,controller_name);
        controller._i18n = i18n;
        let action_func_name = "action"+action_name.charAt(0).toUpperCase()+action_name.slice(1);

        //添加php默认环境
        controller.ob_start();
        controller.setActionName(action_name);
        controller.action_result = controller[action_func_name](data);
        controller.ob_flush();

        if(controller.redirect_url){
            let {controller_name,action_name,query} = this.parseUrl(controller.redirect_url);
            controller = this.loadController(controller_name,action_name,query);
        }

        return controller
    }
    run(launch_win_opt){
        windows = {};
        if(configs.debug){
            app.disableHardwareAcceleration();
        }
        app.on('ready', () => {
            //准备好之后才可以加载
            i18n = new(require(__dirname + '/../../locales/i18n.js'));

            appName = i18n.__('app_name');

            let default_controller = "index";
            let default_action = "index";
            if(typeof configs.defaultController === "string"){
                default_controller = configs.defaultController;
            }
            if(typeof this.getWindow() == "undefined"){
                this.createWindow(launch_win_opt);
            }
            this.openController(default_controller,default_action)
        });

        app.on('window-all-closed', ()=>{
            //单独处理
            //this.putIntTray();
            app.quit();
        });
        app.on('activate', ()=> {
            if(window_main){
                window_main.show();
            }
        });
        ipcMain.on('close-app',function (e) {
            app.quit()
        });


        ipcMain.on('window.location.href',(event, {url,name}) => {
            let {controller_name,action_name,query} = this.parseUrl(url);
            this.openController(controller_name, action_name, query, this.getWindow(name))
        });
        ipcMain.on('window.open',(event, {url, name, features, parent}) => {
            if(typeof features == "undefined"){
                features = {};
            }
            let currWin = this.getWindow(name);
            if(!currWin){
                //不重复打开窗口
                let parent_window = this.getWindow(parent);
                if(typeof features["parent"] != "undefined"){
                    parent_window = null;
                }else if(features.modal == true){
                    //modal情况必须加parent
                    features["parent"] = parent_window;
                }

                let {controller_name, action_name, query} = this.parseUrl(url);
                this.openController(controller_name, action_name, query, this.createWindow(features, name, parent_window));
            }else{
                currWin.show();
            }
        });
        ipcMain.on('window.close',(event, name) => {
            this.closeWindow(name);
        });
        ipcMain.on('window.hide',(event, name) => {
            this.hideWindow(name);
        });
        ipcMain.on('window.show',(event, {name,features}) => {
            this.showWindow(name,features);
        });
        ipcMain.on('window.put',(event, name) => {
            this.putWindow(name);
        });
        ipcMain.on('window.exist',(event,name)=>{
            let win = this.getWindow(name);
            event.returnValue=!!win;
            // event.sender.send('Confirm-Window-Exit', !!win);
        });
        ipcMain.on('window.move.start',(event, {name}) => {
            let win = this.getWindow(name);
            if(win){
                win.position_start = win.getPosition();
            }
        });
        ipcMain.on('window.move',(event, {name,deltaX,deltaY}) => {
            let win = this.getWindow(name);
            if(win){
                const [x,y] = win.position_start;
                win.setPosition(x+deltaX,y+deltaY);
            }
        });

        ipcMain.on('window.triggerEvent',(event, {eventName,targetWindow,args}) => {
            let win = this.getWindow(targetWindow);
            if(win){
                win.webContents.send("window.addEventListener."+eventName,args);
            }
        });

        ipcMain.on("$.ajax",(event,{url, data, dataType, type, requestId})=>{
            let {controller_name,action_name,query} = this.parseUrl(url);
            if(typeof data != "object"){
                data = {};
            }
            Object.assign(data, query);
            let controller = this.loadController(controller_name,action_name,data,type);
            if(controller.action_result instanceof  Promise){
                //async
                controller.action_result.then(()=>{

                    event.sender.send('$.ajax.response.'+requestId, {content:controller.output});
                    return true;
                })
            }else{
                //sync
                event.sender.send('$.ajax.response.'+requestId, {content:controller.output})
            }

        });

        let evaluated = false;
        let evaluate_result;
        ipcMain.on("page.evaluate.begin",(event)=>{
            evaluated= false;
            console.log("page.evaluate.begin")
        });
        ipcMain.on("page.evaluate",(event,result)=>{
            evaluated = true;
            evaluate_result = result;
            console.log("evaluate_result:"+result)
        });
        ipcMain.on("page.evaluate.result",(event)=>{
            console.log("page.evaluate.result")
            while(!evaluated){
            }
            event.returnValue = evaluate_result;
        });
        ipcMain.on('UpdateCheck.shenjian',(event) => {
            this.checkUpdate();
        });

        ipcMain.on('UpdateStart.shenjian',(event) => {
            this.startUpdate();
        });
    }

}

module.exports = ShenJian;