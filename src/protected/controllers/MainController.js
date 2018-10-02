/**
 * Created by wutong on 2017/12/23.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));

class MainController extends SController{
    actionIndex(){
        this.trackPageView();
        this.render("tpl-index");
    }
    actionConfirm(){
        this.render("dialog-confirm");
    }
}
module.exports = MainController;
