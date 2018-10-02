/**
 * Created by wutong on 2018/1/20.
 */
if(shenjian.is("page-main-index")){
    $("#app-stack").on("stackLoad.shenjian",function(ev, result, layer, tab){
        if(typeof result.data.project != "undefined"){
            var project = result.data.project;
            var plugin_source = result.data.source;
            var plugin_toolbar = result.data.toolbar;
            var locale_file = result.data.locale_file;

            layer.addClass("ajax-loading");
            var toolbar = $("#toolbar");
            toolbar.children("[project-id='"+project.project_id+"']").remove();
            if(plugin_toolbar){
                var separator =toolbar.find(".separator");
                plugin_toolbar.forEach(function(button){
                    var toolbarItem = $(`<li data-tip=${button.accelerator}><i class='fs ${button.icon}'></i>${button.label}</li>`).insertBefore(separator);
                    toolbarItem.addClass("plugin").attr("project-id",project.project_id).attr("data-role",button.role);
                    if(button.selectable){
                        toolbarItem.addClass("selectable");
                    }
                    if(button.disabled){
                        toolbarItem.addClass("disabled");
                    }
                })
            }


            var progressbar = layer.find(".progressbar");
            var valueLabel = progressbar.find(".value");
            var maxLabel = progressbar.find(".max");
            var progressFill = progressbar.find(".progressbar-fill");
            progressbar.setMax = function(max){
                maxLabel.text(max)
            }
            progressbar.setValue = function(value){
                valueLabel.text(value);
                progressFill.css("width",parseInt(value*100/maxLabel.text())+"%");
            }
            progressbar.getValue = function(){
                return parseInt(valueLabel.text())
            }
            //加载数据库
            var db = new PouchDB("project-"+project.project_id);
            db.find({
                selector: {
                    labeled: {$eq: true},
                }
            }).then(function (result) {
                progressbar.setValue(result.docs.length)
            }).catch(function (err) {
            });

            var stageReady = function(){
                var $head = $(frames['plugin-main-'+project.project_id]).contents().find("head");
                $head.append($("<link/>",
                    { rel: "stylesheet", href: __dirname+"/../../../assets/css/iconfont/iconfont.css", type: "text/css" }));
                $head.append($("<link/>",
                    { rel: "stylesheet", href: __dirname+"/../../../assets/css/font-awesome/css/font-awesome.min.css", type: "text/css" }));

                var event = new CustomEvent("stage-ready", {
                    detail: project.inputs
                });
                var frame = frames['plugin-main-'+project.project_id];
                frame.contentWindow.plugin = new Plugin(project.project_id)
                frame.contentWindow.plugin.i18n = new PluginI18N(locale_file);
                return frame.contentWindow.document.dispatchEvent(event);
            }
            var stageZoom = function(scale){
                var event = new CustomEvent("stage-zoom",{
                    cancelable: true,
                    detail: scale
                });
                var frame = frames['plugin-main-'+project.project_id];
                return frame.contentWindow.document.dispatchEvent(event);
            }
            var passKeyboardEvent = function(ev){
                var old_event = ev.originalEvent;
                var new_event = new KeyboardEvent(ev.type, old_event);
                delete new_event.keyCode;
                delete new_event.charCode;
                delete new_event.which;
                Object.defineProperty(new_event, "keyCode", {"value" : old_event.keyCode})
                Object.defineProperty(new_event, "charCode", {"value" : old_event.charCode})
                Object.defineProperty(new_event, "which", {"value" : old_event.which})
                Object.defineProperty(new_event, "is_propagated", {"value" : true})
                var frame = frames['plugin-main-'+project.project_id];
                frame.contentWindow.document.dispatchEvent(new_event);
            }
            var toolbarEvent = function(role,event){
                var event = new CustomEvent("toolbar-"+role+"-"+event);
                var frame = frames['plugin-main-'+project.project_id];
                return frame.contentWindow.document.dispatchEvent(event);
            }
            var actorWillEnter = function(doc){
                layer.data("doc",doc);
                var event = new CustomEvent("actor-will-enter", {
                    cancelable: true,
                    detail: doc
                });
                return frames['plugin-main-'+project.project_id].contentWindow.document.dispatchEvent(event);
            }
            var actorWillFinish = function(doc){
                var event = new CustomEvent("actor-will-finish", {
                    cancelable: true,
                    detail: doc
                });
                return frames['plugin-main-'+project.project_id].contentWindow.document.dispatchEvent(event);
            }
            var processKeyUpEvent = function (ev) {
                if(ev.keyCode===83&&(ev.ctrlKey||ev.metaKey)){
                    layer.find(".btn-done").trigger('click');
                }else if(ev.keyCode === 37){
                    layer.trigger('toolbarClick','prev');
                }else if(ev.keyCode === 39){
                    layer.trigger('toolbarClick','next');
                }
            }

            var nextCollection = layer.find(".half-right .collection");
            var prevCollection = layer.find(".half-left .collection");
            //FIXME 分批存储到数据库中
            var fileList = [];
            var fileListIndex = 0;
            var go1step = function(direction = "next"){
                var prevList,nextList;
                var collwidth=layer.find(".collection").width()
                if(direction == "next"){
                    nextList = nextCollection.children("li");
                    if(nextList.length > 1){
                        prevCollection.append(nextList.first().detach());
                        var nextIndex = nextList.last().data("index") + 1;
                        if(nextIndex < fileList.length){
                            if(plugin_source.type == "folder.image"){
                                nextCollection.append(`<li data-id="${fileList[nextIndex].path}" data-index="${nextIndex}"><img src="file:///${fileList[nextIndex].path.replace(/\\/g,"/")}" /></li>`)
                            }
                            prevList = prevCollection.children("li");
                            if(prevList.length > collwidth/60-1){
                                prevList.first().remove();
                            }
                        }
                    }
                }else{
                    prevList = prevCollection.children("li");
                    if(prevList.length >= 0){
                        nextCollection.prepend(prevList.last().detach());
                        var prevIndex = prevList.first().data("index") - 1;
                        if(prevIndex > 0){
                            if(plugin_source.type == "folder.image"){
                                prevCollection.prepend(`<li data-id="${fileList[prevIndex].path}" data-index="${prevIndex}"><img src="file:///${fileList[prevIndex].path.replace(/\\/g,"/")}" /></li>`)
                            }
                            nextList = nextCollection.children("li");
                            if(nextList.length > collwidth/60-1){
                                nextList.last().remove();
                            }
                        }
                    }
                }
            };
            var gonstep = function(direction = 0){
                var prevList,nextList;
                var collwidth=layer.find(".collection").width()
                if(direction >0){
                    num=0
                    while (num<direction){
                        nextList = nextCollection.children("li");
                        if(nextList.length > 1){
                            prevCollection.append(nextList.first().detach());
                            var nextIndex = nextList.last().data("index") + 1;
                            if(nextIndex < fileList.length){
                                if(plugin_source.type == "folder.image"){
                                    nextCollection.append(`<li data-id="${fileList[nextIndex].path}" data-index="${nextIndex}"><img src="file:///${fileList[nextIndex].path.replace(/\\/g,"/")}" /></li>`)
                                }
                                prevList = prevCollection.children("li");
                                if(prevList.length > collwidth/60-1){
                                    prevList.first().remove();
                                }
                            }
                        }
                        num+=1;
                    }
                }else if(direction <0){
                    num=0
                    while (num<-direction){
                        prevList = prevCollection.children("li");
                        if(prevList.length >= 0){
                            nextCollection.prepend(prevList.last().detach());
                            var prevIndex = prevList.first().data("index") - 1;
                            if(prevIndex > 0){
                                if(plugin_source.type == "folder.image"){
                                    prevCollection.prepend(`<li data-id="${fileList[prevIndex].path}" data-index="${prevIndex}"><img src="file:///${fileList[prevIndex].path.replace(/\\/g,"/")}" /></li>`)
                                }
                                nextList = nextCollection.children("li");
                                if(nextList.length > collwidth/60-1){
                                    nextList.last().remove();
                                }
                            }
                        }
                        num+=1;
                    }
                }
            };
            
            layer.find("iframe").on("load",function(){
                stageReady();
                $(layer.find("iframe")[0].contentWindow.document).on('keyup',function (ev) {
                    processKeyUpEvent(ev);
                });

                // 石勇 按住alt并滚动鼠标时改变其内容大小
                $(layer.find("iframe")[0].contentWindow.document).on('mousewheel',function (ev) {
                    if(ev.originalEvent.altKey){
                        let wheelScale = zoombar.data("scale");
                        let wheelScaleValue = wheelScale/100;
                        if(ev.originalEvent.wheelDelta < 0){
                            wheelScale = wheelScale / 1.1;
                        }else if(ev.originalEvent.wheelDelta > 0){
                            wheelScale = wheelScale * 1.1;
                        }
                        if(wheelScale < 5 || wheelScale > 800){
                            return;
                        }
                        wheelScaleValue = wheelScale/100;
                        let wheelValid = stageZoom(wheelScaleValue);
                        if(wheelValid){
                            zoombar.data("scale",wheelScale);
                            let wheelScaleTemp = wheelScale > 99.9 ? Math.round(wheelScale) : wheelScale.toFixed(1);
                            zoombar.find("label").text(wheelScaleTemp+"%");
                        }
                    }
                });

                //如果folder开头的话

                var folder_path = project.inputs.source;
                shenjian.fs.readdir(folder_path, function (err, files) {
                    if(err) {
                        console.error(err);
                        return;
                    } else {
                        files.forEach(function (file) {
                            var filePath = shenjian.path.join(folder_path , file);
                            var item = {_id:filePath,path:filePath,src:`file:///${filePath.replace(/\\/g,"/")}`,"outputs":{},time_labeled:0,labeled:false}

                            var extIndex= file.lastIndexOf(".");
                            var ext = file.substr(extIndex+1).toLowerCase();
                            var exts = {
                                "folder.image": ["png","gif","jpg","jpeg","bmp","svg","tif"],
                                "folder.text": ["txt","rtf"],
                                "folder.video": ["mp4","ogg"],
                                "folder.audio": ["mp3","wav"]
                            };
                            if (exts[plugin_source.type] && exts[plugin_source.type].indexOf(ext) >= 0) {
                                if (plugin_source.type == "folder.text") {
                                    //获取文本内容
                                    item.content = shenjian.fs.readFileSync(filePath);
                                    var jschardet = require("jschardet");
                                    var iconv = require('iconv-lite');
                                    var encoding = jschardet.detect(item.content);
                                    if (encoding) {
                                        item.content = iconv.decode(item.content, encoding.encoding);
                                    } else {
                                        item.content = iconv.decode(item.content, 'utf-8');
                                    }
                                }
                                if (ext == "tif") {
                                    var content = shenjian.fs.readFileSync(filePath);
                                    var tiff = new Tiff({buffer: content});
                                    item.src = tiff.toCanvas().toDataURL();
                                }
                                fileList.push(item);
                            }
                        });
                        if(fileList.length > 0){
                            progressbar.setMax(fileList.length);
                            var nextLength = 15;
                            if(fileList.length < 16){
                                nextLength = fileList.length - 1;
                            }
                            for(let i = 0; i<nextLength + 1; i++){
                                if(plugin_source.type == "folder.image"){
                                    nextCollection.append(`<li data-id="${fileList[i].path}" data-index="${i}"><img src="${fileList[i].src}" /></li>`);
                                }
                            }
                            //全部加载完成
                            db.bulkDocs(fileList).then(function(result){
                                layer.removeClass("ajax-loading");
                                db.get(fileList[0]._id,{attachments:true,binary:true}).then(function (doc) {
                                    actorWillEnter(doc);
                                });
                            });
                        }
                    }
                });

            })

            layer.find(".btn-done").on("click",function(){
                var doc = layer.data("doc");
                if(actorWillFinish(doc)) {
                    if(!doc.labeled){
                        progressbar.setValue(progressbar.getValue() + 1);
                    }
                    doc.time_labeled = new Date().getTime();
                    doc.labeled = true;
                    db.put(doc).then(function(r){
                        doc._rev = r.rev;
                        layer.data("doc",doc);
                        layer.find("iframe")[0].contentWindow.plugin.setChanged(false);
                        $.toast(i18n.__("project_label_saved_successfully"));
                    }).catch(function (e) {
                        console.log(e)
                    })
                }
            });
            layer.find(".collection").on("click","li",function(){
                var ind=$(this).attr("data-index");
                // console.log(ind);
                gonstep(ind-fileListIndex);
                fileListIndex=ind;
                db.get(fileList[fileListIndex].path,{attachments:true,binary:true}).then(function (doc) {
                    actorWillEnter(doc);
                })
            });

            /**
             * 数据窗口和前后按钮
             */
            layer.find(".btn-data").on("click",function(){
                //查看当前结果
                shenjian.openUrl(shenjian.url("data","project","&project_id="+project.project_id),"Data-Window-"+project.project_id,{
                    width: 900,
                    height: 600,
                    modal: true,
                    frame: false,
                    resizable: false
                })
            })

            layer.on("toolbarClick",function(ev,role){
                if(role == "prev"){
                    if(!fileList[fileListIndex-1]){
                        $.toast(i18n.__("project_dashboard_first"))
                    }else if(layer.is('.changed')){
                        window.confirm(i18n.__("project_content_unsaved"),function () {
                            layer.find("iframe")[0].contentWindow.plugin.setChanged(false);
                            layer.trigger('toolbarClick','prev');
                        })
                    }else{
                        fileListIndex--;
                        go1step("prev");
                        db.get(fileList[fileListIndex].path,{attachments:true,binary:true}).then(function (doc) {
                            actorWillEnter(doc);
                        })
                    }
                }else if(role == "next"){
                    if(!fileList[fileListIndex+1]){
                        $.toast(i18n.__("project_dashboard_last"))
                    }else if(layer.is('.changed')){
                        window.confirm(i18n.__("project_content_unsaved"),function () {
                            layer.find("iframe")[0].contentWindow.plugin.setChanged(false);
                            layer.trigger('toolbarClick','next');
                        })
                    }else{
                        fileListIndex++;
                        go1step("next");
                        db.get(fileList[fileListIndex].path,{attachments:true,binary:true}).then(function (doc) {
                            actorWillEnter(doc);
                        })
                    }
                }else if(role == "export"){
                    shenjian.openUrl(shenjian.url("export","project","&project_id="+project.project_id),"Export-Window",{
                        width: 500,
                        height: 250,
                        alwaysOnTop : true,
                        frame: false,
                        resizable: false
                    })
                }else{
                    toolbarEvent(role,"click");
                }
            }).on("toolbarSelect",function(ev,role){
                toolbarEvent(role,"select");
            }).on("toolbarDeselect",function(ev,role){
                toolbarEvent(role,"deselect");
            }).on("keyup",function(ev){
                processKeyUpEvent(ev);
                ev.stopImmediatePropagation();
            }).on("keydown",function(ev){
                passKeyboardEvent(ev);
                ev.stopImmediatePropagation();
            });


            // 石勇 修改放大和缩小
            var zoombar = layer.find(".zoombar");
            let proportionNum = [5, 6.25, 8.33, 12.5, 16.7, 25, 33.3, 50, 66.7, 100, 200, 300, 400, 500, 600, 700, 800];
            function getProportion(num){
                let numIndex = 0;
                for (let i = 0; i < proportionNum.length; i++){
                    if(proportionNum[i] > num){
                        numIndex = i;
                        break;
                    }
                }
                return numIndex;
            }
            zoombar.children("i").on("click",function(){
                var role = $(this).data("role");
                var scale = zoombar.data("scale");
                var scaleValue = scale/100;
                if(role === "zoom-out" && scale > 5){
                    let indexTemp = proportionNum.indexOf(scale);
                    scale = indexTemp > -1 ? proportionNum[indexTemp - 1] : proportionNum[getProportion(scale) - 1];
                    scaleValue = scale/100;
                }else if(role === "zoom-in" && scale < 800){
                    scale = proportionNum[getProportion(scale)];
                    scaleValue = scale/100;
                }else if(role === "zoom-fit"){
                    scale = 100;
                    scaleValue = false;
                }
                var valid = stageZoom(scaleValue);
                if(valid){
                    zoombar.data("scale",scale);
                    zoombar.find("label").text(scale+"%");
                }
            })

        }
    })
}
