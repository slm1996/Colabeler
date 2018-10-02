/**
 * Created by wutong on 2017/12/23.
 */
let shenjian = __dirname + '/framework/shenjian.js';
let ShenJian = require(shenjian);
let config =__dirname + '/protected/config/main.js';
let win_opt  = {
    width: 540,
    height: 320,
    modal: false,
    frame: false,
    parent: null,
    resizable: false,
    useContentSize: true,
    autoHideMenuBar:true,
    skipTaskbar:true
}

ShenJian.createDesktopApplication(config);
ShenJian.app().run(win_opt);
