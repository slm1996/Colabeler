
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));
const os = require('os');

class UpdateController extends SController{
    actionIndex({info}){
        info = JSON.parse(decodeURIComponent(info));
        this.render('dialog-update-confirm',{updateInfo:info})
    }

    actionDownloading(){
        this.render('dialog-download');
    }
}
module.exports = UpdateController;