/**
 * Created by wutong on 2018/1/5.
 */
const process = require("process");
const electron = require('electron');
let app = electron.app ? electron.app : electron.remote.app;
if(shenjian.is("page-main-index")){
    $("#app-stack").on("stackLoad.shenjian",function(ev, result, layer, tab) {
        if (typeof result.data.project_list != "undefined") {
            var appStack = $(this).appStack();
            var projectList = layer.find(".project-list");
            var itemAdd = projectList.find(".item-add");
            projectList.on("click","li", function (ev) {
                var currTarget = $(ev.currentTarget);
                if(currTarget.is(".item-tutorial")){
                    //打开外网的视频教程
                    if(app.getLocale() !== 'zh' && app.getLocale() !== 'zh-CN'){
                        shenjian.openExternal("https://youtu.be/TXD_yPKXpvg");
                    }else{
                        shenjian.openExternal("http://v.youku.com/v_show/id_XMzUzMDA5NDEzNg==.html");
                    }
                }else if(currTarget.is(".item-add")){
                    // Trigger new project in the menu;
                    shenjian.body.trigger("menu.shenjian",["new"])
                }else{
                    appStack.openProject(currTarget.data("project"));
                }

            });
            projectList.on("click","li .ico-remove", function (ev) {
                var projectContainer = $(ev.currentTarget).parents("li").first();
                var project_id = projectContainer.data("project");
                ev.stopImmediatePropagation();
                confirm(i18n.__("project_list_delete"),() => {
                    shenjian.post(shenjian.url("remove", "project", "project_id=" + project_id), function () {
                        var db = new PouchDB("project-list");
                        db.get(project_id).then(function (doc) {
                            var projectDB = new PouchDB("project-"+project_id);
                            projectDB.destroy();
                            return db.remove(doc);
                        }).then(function (result) {
                            projectContainer.remove();
                            appStack.closeProject(project_id)
                        }).catch(function (err) {
                            console.log(err);
                        });
                    })
                })
            });
            shenjian.on("ProjectCreated",function({project_id,name,plugin_name,time_created,plugin_icon}){
                itemAdd.after(
                `<li data-project="${project_id}">
                    <img src="${plugin_icon}" />
                    <div class="title">${name}</div>
                    <div class="info">${i18n.__("project_list_type")}${plugin_name}</div>
                    <div class="info">${i18n.__("project_list_time")}${time_created}</div>
                    <i class="fs fs-close ico-remove"></i>
                </li>`);
            });
            shenjian.on("ProjectConfigCustom",function({project_id,name,inputs}){
                projectList.find("li[data-project="+project_id+"] .title").text(name);
                tab.nextAll("li[project-id="+project_id+"]").find('.tab-title').text(name);
                let event = new CustomEvent("plugin-config-custom",{
                    cancelable: true,
                    detail: inputs
                });
                frames['plugin-main-'+project_id].contentWindow.document.dispatchEvent(event);
                appStack.closeProject(project_id);
                appStack.openProject(project_id);
            });
            shenjian.on("windowReload",function({project_id}){
                appStack.closeProject(project_id);
                appStack.openProject(project_id);
            });
            shenjian.on("filesErr",function(num){
                $.toast(i18n.__("project_import_files_error"));
            });
            layer.on("keyup",function(ev){
                //todo
                ev.stopImmediatePropagation();
            }).on("keydown",function(ev){
                //todo
                ev.stopImmediatePropagation();
            });
        }
    });
}
else if(shenjian.is("dialog-project-new")){
    $("#btn-create").on("click",function () {
        var layer = $(".project-setting > .stack-layer.active");
        var tab = $(".project-type > .stack-tab.active");

        var plugin_id = tab.data("identifier");
        var plugin_name = tab.children("label").text();
        var plugin_icon = tab.children("img").attr("src");

        var __name = layer.find("input[name='__name']").val();
        if(!__name){
            $.toast(i18n.__("project_new_notEmpty"))
            return;
        }
        var data = {
            name:__name,
            plugin:plugin_id,
            time_created:new Date().getTime(),
            inputs:{}
        };
        var dataCompleted = true;
        layer.find(".input.plugin").each(function(){
            var input = $(this);
            if(input.attr("name") == "source" && input.val() == ""){
                dataCompleted = false;
                $.toast("请先选择数据来源文件夹！")
                return;
            }
            data.inputs[input.attr("name")] = input.val();
        });
        if(!dataCompleted){
            return;
        }
        var db = new PouchDB("project-list");
        data._id = process.hrtime().join('_');
        db.put(data, (err,res) => {
            data.project_id = data._id;
            var projectDB = new PouchDB("project-"+data.project_id);
            projectDB.createIndex({
                index: {
                    fields: ['_id','labeled']
                }
            }).then(function (result) {
                shenjian.post(shenjian.url("create","project"),data,function(){
                    db.close().then(function () {
                        shenjian.send("ProjectCreated",{project_id:data.project_id,
                            name:data.name,
                            plugin_icon:plugin_icon,
                            plugin_name:plugin_name,
                            time_created:_.formatDate("yyyy-mm-dd hh:ii",data.time_created),
                            label_max_count:1
                        },"Main-Window");
                        shenjian.close();
                    });
                })
            }).catch(function (err) {
                $.toast("Error:"+err.toLocaleString());
            });
        });
    })
}
else if(shenjian.is("dialog-modify-config")) {
    $('#btn-confirm').on('click',function () {
        var layer = $(".project-setting > .stack-layer.active");
        var project_id = layer.attr('project-id');

        var __name = layer.find("input[name='__name']").val();
        if(!__name){
            $.toast(i18n.__("project_new_notEmpty"))
            return;
        }
        var data = {
            project_id:project_id,
            name:__name,
            inputs:{}
        }
        layer.find(".input.plugin").each(function(){
            var input = $(this);
            data.inputs[input.attr("name")] = input.val();
        });
        var db = new PouchDB("project-list");
        db.get(project_id).then(function(doc) {
            doc.inputs = data.inputs;
            doc.name = data.name;
            return db.put(doc);
        }).then(function(response) {
            shenjian.post(shenjian.url("configModifySuccess","project"),data,function(){
                toast('修改配置成功');
                shenjian.send("ProjectConfigCustom",data,"Main-Window");

                setTimeout(()=>{shenjian.close();},1500)

            })
        }).catch(function (err) {
            console.log(err);
        });

    });
}
else if(shenjian.is("dialog-project-import")){
    var docTemp = [];
    // 获取当前窗口的id
    var project_id = shenjian.body.data("project-id");
    var db = new PouchDB("project-"+project_id);

    // 点击确认导入
    $(".btn-import").on("click",function(){
        let folderPath = $("#importFolderPath").val();
        if(!folderPath){
            return;
        }
        // 按钮和输入框置灰，出现进度条
        $(".btn-import").addClass("disabled import-load");
        $(".btn-import").text(i18n.__("project_import_loading"));
        $(".form-group").addClass("disabled");

        // 获取当前窗口对应的缓存
        db.allDocs({include_docs: true,attachments:true,binary:true}, function (err, response) {
            if(err){
                console.log(err);
                return
            }else if(response){
                docTemp = [];
                // 取出文件名
                for (let i = 0; i < response.rows.length; i++){
                    var indexTemp = response.rows[i].doc.src;
                    if(indexTemp && indexTemp.indexOf("/") > -1){
                        docTemp.push(response.rows[i].doc);
                    }
                }
            }
        }).then(function () {
            shenjian.fs.readdir(folderPath, function (err, files) {
                if(err) {
                    console.error(err);
                    return;
                } else {
                    var iconv = require('iconv-lite');
                    var exts = ["xml","json"];
                    var mismatchCount = 0;
                    var matchCount = 0;
                    var pascalCount = 0;

                    let fileIndex = 0;

                    eachFiles();
                    function eachFiles(){
                        var extIndex= files[fileIndex].lastIndexOf(".");
                        var ext = files[fileIndex].substr(extIndex+1).toLowerCase();
                        if(exts.indexOf(ext) > -1){
                            var filePath = shenjian.path.join(folderPath, files[fileIndex]);
                            var content = shenjian.fs.readFileSync(filePath);
                            content = iconv.decode(content, 'utf-8');

                            if(ext == "xml"){
                                var x2js = new X2JS();
                                var jsonObj = x2js.xml_str2json(content);
                                jsonObj = JSON.stringify(jsonObj).replace(/&amp;/g,"&").replace(/&amp;/g,"&");
                                jsonObj = JSON.parse(jsonObj);
                                content = jsonObj.doc;
                                // 判断是不是pascal的xml文件
                                if(jsonObj.annotation){
                                    pascalCount++;
                                    mismatchCount++;
                                    importFinish();
                                    return;
                                }
                            }else{
                                content = JSON.parse(content);
                            }
                            if(content.path){
                                var fileName = content.path.substr(content.path.lastIndexOf("\\") + 1);
                            }else{
                                mismatchCount++;
                                importFinish();
                                return;
                            }
                            let eachnum = 0;
                            for (let i = 0; i < docTemp.length; i++){
                                var docTempName = docTemp[i].path.substr(docTemp[i].path.lastIndexOf("\\") + 1);
                                if(docTempName == fileName){
                                    if(ext == "xml"){
                                        docTemp[i].outputs = fixItemForJSON(content.outputs);
                                        // 图片转录的xml若没有内容，docTemp[i].outputs.object为"",这里是为了兼容
                                        if(docTemp[i].outputs){
                                            // docTemp[i].outputs.object = docTemp[i].outputs.object ? docTemp[i].outputs.object : [];
                                        }else{
                                            docTemp[i].outputs = {};
                                        }
                                    }else if(ext == "json"){
                                        docTemp[i].outputs = content.outputs;
                                    }
                                    docTemp[i].labeled = true;
                                    db.put(docTemp[i]).then(function(r){
                                        // 进度条
                                        matchCount++;
                                        let num = (fileIndex+1)/files.length;
                                        $(".import-progress").css("width",(num*100)+"%");
                                        // if(num == 1){
                                        //     shenjian.send("windowReload",{project_id: project_id},"Main-Window");
                                        //     setTimeout(()=>{shenjian.close();},500)
                                        // }
                                        // fileIndex++;
                                        importFinish();
                                    }).catch(function (e) {
                                        // 请求出错时，按钮和输入框可调用
                                        $(".btn-import").addClass("disabled import-load");
                                        $(".btn-import").text(i18n.__("project_import_ok"));
                                        $(".form-group").removeClass("disabled");
                                        console.log(e)
                                    })
                                }
                                else{
                                    eachnum++;
                                    if(eachnum == docTemp.length){
                                        mismatchCount++;
                                        importFinish();
                                    }
                                }
                            }
                        }
                        else{
                            mismatchCount++;
                            importFinish();
                        }
                    }
                    function importFinish() {
                        fileIndex++;
                        if(fileIndex == files.length){
                            shenjian.send("windowReload",{project_id: project_id},"Main-Window");
                            shenjian.close();
                            shenjian.openUrl(shenjian.url("imported","project","&mismatchCount="+mismatchCount+"&matchCount="+matchCount+"&pascalCount="+pascalCount),"Imported-Window",{
                                width: 250,
                                height: 150,
                                alwaysOnTop : true,
                                frame: false,
                                resizable: false
                            })
                            return;
                        }
                        eachFiles();
                    }
                }
            })
        })
    })
    function fixItemForJSON(obj) {
        if(obj && obj instanceof Object){
            if(obj["item"] !== undefined){
                if(obj["item"] instanceof Array){
                    obj = obj["item"];
                }else{
                    obj = [obj["item"]];
                }
                obj = fixItemForJSON(obj);
            }else{
                for(let tempKey in obj) {
                    if(tempKey.indexOf("item_") > -1){
                        let keyNum = tempKey.substr(tempKey.indexOf("item_")+5);
                        obj[keyNum] = obj[tempKey] == "null" ? {} : obj[tempKey];
                        delete obj[tempKey];
                        tempKey = keyNum;
                    }
                    obj[tempKey] = fixItemForJSON(obj[tempKey]);
                }
            }
        }
        return obj;
    }
}
else if(shenjian.is("dialog-project-imported")){
    let pascalCount = $("#dialog-project-imported").data("pascalcount");
    if(pascalCount > 0){
        $(".tips-text").text(i18n.__("project_imported_pascal_tips"));
    }else{
        $(".tips-text").text(i18n.__("project_imported_fail_tips"));
    }
    $("#dialog-project-imported .btn-import").on("click",function () {
        shenjian.close();
    })
}
$(function(){
    shenjian.toggleData();
})