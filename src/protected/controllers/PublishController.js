
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));

class PublishController extends SController{
    actionIndex({project_id}){
        this.render('dialog-publish-data',{db_name:"project-"+project_id});
    }
}
module.exports = PublishController;