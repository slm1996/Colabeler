/**
 * Created by wutong on 2017/12/23.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));

class HelpController extends SController{
    actionAbout(){
        let packJson = require(path.join(__dirname,"..","..","..","package.json"));
        let version = packJson.version;
        this.render("dialog-about",{app_version:version});
    }
}
module.exports = HelpController;
