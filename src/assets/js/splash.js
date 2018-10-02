/**
 * Created by wutong on 2018/1/19.
 */
const electron = require('electron')
const Mustache = require('mustache');
$(function(){
    let appPath = shenjian.path.dirname(electron.remote.app.getPath("exe"));
    var pluginPaths = [shenjian.path.join(__dirname,"..","..","..","..","plugins"),shenjian.path.join(appPath,"plugins")];
    let path_loaded = 0;
    let manifests = {};

    var loadMain = function(){
        var db = new PouchDB("project-list");
        db.allDocs({
            include_docs: true
        }).then(function (result) {
            var data = {"project_list":[]};
            for(var i = 0;i<result.rows.length;i++){
                var doc = result.rows[i].doc
                doc.time_created = _.formatDate("yyyy-mm-dd hh:ii",doc.time_created)
                data.project_list.push(doc);
            }
            data.manifests = manifests;
            shenjian.post(shenjian.url("init","splash"),data,function(){
                setTimeout(function(){
                    shenjian.openUrl(shenjian.url("index","main"),"Main-Window",{
                        width: 1460,
                        height: 800,
                        minWidth: 800,
                        minHeight: 700,
                        modal: false,
                        frame: false,
                        parent: null,
                        resizable: true,
                        useContentSize: true
                    })
                    shenjian.close();
                },1500)
            });
        }).catch(function (err) {
            console.log(err);
        });
    }

    pluginPaths.forEach(function(pluginPath){
        //加载plugin..
        shenjian.fs.readdir(pluginPath, function (err, files) {
            if(!err) {
                let file_loaded = 0;
                for(var  i = 0;i<files.length;i++){
                    let folder = files[i];
                    let manifest_file = shenjian.path.join(pluginPath , folder, "manifest.json");
                    shenjian.fs.readFile(manifest_file, "utf8", (err, data) => {
                        if (!err) {
                            let manifest = JSON.parse(data);
                            if(manifest.default_locale){
                                var default_locale = manifest.default_locale;
                                try{
                                    let locale = electron.remote.app.getLocale();
                                    let locales = {};
                                    let locale_folder = shenjian.path.join(pluginPath, folder, "locales");
                                    if(shenjian.fs.existsSync(shenjian.path.join(locale_folder, locale , 'strings.json'))) {
                                        locales = JSON.parse(shenjian.fs.readFileSync(shenjian.path.join(locale_folder, locale , 'strings.json'), 'utf8'))
                                    }
                                    else {
                                        let stringJSON = shenjian.fs.readFileSync(shenjian.path.join(locale_folder, default_locale , 'strings.json'), 'utf8');
                                        //默认英文
                                        locales = JSON.parse(stringJSON);
                                        locale = default_locale;
                                    }
                                    data = Mustache.render(data, {"locales":locales});
                                    manifest = JSON.parse(data);
                                    delete manifest.default_locale;
                                    manifest.locale = locale;
                                }catch (err){
                                    //直接跳过
                                    file_loaded++;
                                    return;
                                }
                            }else{
                                manifest = JSON.parse(data);
                            }
                            manifest.root = shenjian.path.join(pluginPath, folder);
                            manifests[manifest.identifier] = manifest;
                        }
                        if(++file_loaded == files.length){
                            if(++path_loaded == pluginPaths.length){
                                //全部加载完成了
                                //post给后端
                                loadMain();
                            }
                        }
                    });
                }
            }else{
                console.log("Error Reading Plugin Path:"+err.toLocaleString());
                if(++path_loaded == pluginPaths.length){
                    loadMain();
                }
            }
        });
    });
})
