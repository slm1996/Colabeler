/**
 * Created by wutong on 2018/1/24.
 */
if (shenjian.is("dialog-project-data")){
    $(function(){
        var project_id = shenjian.body.data("project-id");
        var db = new PouchDB("project-"+project_id);

        var dataTable = $(".table-data");

        var pageSize = 10;
        var currPage = 1;
        var totalPage = 1;
        var firstKey = null;
        var lastKey = null;

        var loadPage = function(options){
            db.allDocs(options, function (err, response) {
                if(err){
                    console.log(err);
                    return
                }else if(response){
                    $(".total_rows").text(response.total_rows);
                    totalPage = Math.ceil(response.total_rows/pageSize)
                    $(".pager li.active").text(currPage);
                    if (response && response.rows.length > 0) {
                        if(options.descending){
                            response.rows.reverse();
                        }
                        firstKey = response.rows[0].key;
                        lastKey = response.rows[response.rows.length - 1].key;
                        var tbody =  dataTable.find("tbody");
                        tbody.empty();
                        for(var i in response.rows){
                            var doc = response.rows[i].doc;
                            if(doc && doc.outputs){
                                tbody.append("<tr><td>"+doc.path.short4(80)+"</td><td>"+JSON.stringify(doc.outputs).short4(15)+"</td><td>"+_.formatDate("yy-mm-dd hh:ii",doc.time_labeled)+"</td></tr>")
                            }
                        }
                    }
                }
            });
        }

        loadPage({include_docs: true, limit : pageSize});
        $(".btn-page-prev").on("click",function(){
            if(currPage == 1){
                $.toast(i18n.__("pager_first"))
                return;
            }
            var options = {include_docs: true,limit : pageSize};
            options.startkey = firstKey;
            options.skip = 1;
            options.descending = true;
            currPage--;
            loadPage(options);
        })
        $(".btn-page-next").on("click",function(){
            if(currPage == totalPage){
                $.toast(i18n.__("pager_last"))
                return;
            }
            var options = {include_docs: true,limit : pageSize};
            options.startkey = lastKey;
            options.skip = 1;
            options.descending = false;
            currPage++;
            loadPage(options);
        })
        $(".btn-export").on("click",function(){
            shenjian.openUrl(shenjian.url("export","project","&project_id="+project_id),"Export-Window",{
                width: 500,
                height: 250,
                alwaysOnTop : true,
                frame: false,
                resizable: false
            })
        })
    })
}
else if (shenjian.is("dialog-project-export")){
    var project_id = shenjian.body.data("project-id");
    // 取出一条数据 用于获取当前项目文件夹的地址
    let folderPath = '';
    let db = new PouchDB("project-"+project_id);
    db.allDocs({
        include_docs: true,
        limit:1
    }).then(function (doc) {
        folderPath = doc.rows[0].id;
        folderPath = folderPath.substr(0,folderPath.lastIndexOf("\\"));
        $(".address-text").val(folderPath);
    })
    // 判断用户是否登录了神箭手
    shenjian.post(shenjian.url('checkIsLogin', 'account'), function (r) {
        r = JSON.parse(r);
        if(r.result === 1){

        }else{
            $(".check-login").css("display","block");
            $(".upload-data-title").addClass("disabled");
        }
    })
    //点击选择导出的方式
    $(".local-type-title").on("click",function () {
        $(".local-type-title").removeClass("selected");
        $(this).addClass("selected");
    })
    //点击选择导出的地址
    $(".choose-address,.address-text").on("click",function () {
        shenjian.hide();
        shenjian.remote.dialog.showOpenDialog(
            {
                title: i18n.__("project_export_folderDialog"),
                properties: ['openDirectory'],
                defaultPath: $(".address-text").val(),
            },
            (path) => {
                shenjian.show();
                if (!path) {
                    return;
                }
                $(".address-text").val(path);
            }
        );
    })
    $(".btn-export").on("click",function(){
        let format = $(".local-type-title.selected").data("type");
        if(format === 'mongodb'){
            shenjian.close();
            shenjian.openUrl(shenjian.url('index','publish',"&project_id="+project_id), 'dialog-publish-data',{
                width: 600,
                height: 550,
                parent:null,
                transparent:true,
                minimizable:true,
                maximizable:false,
                closable : true,
                autoHideMenuBar:true,
                resizable: false,
                useContentSize: true,
                alwaysOnTop:true,
                modal: false,
                frame: false,
                show:true
            });
        }
        else if(format === 'upload-data'){
            shenjian.close();
            shenjian.openUrl(shenjian.url("upload", "account","&project_id="+project_id), "Upload-Window", {
                width: 300,
                height: 158,
                modal: true,
                frame: false,
                resizable: false
            })
        }
        else{
            let exportPath = $(".address-text").val();
            if(!exportPath){
                $.toast(i18n.__("project_export_choose_path"));
                return;
            }
            shenjian.openUrl(shenjian.url("exporting","project","&project_id="+project_id+"&file_path="+encodeURIComponent(exportPath)+"&format="+format),"Exporting-Window",{
                width: 300,
                height: 140,
                alwaysOnTop : true,
                frame: false,
                resizable: false,
                parent:null
            })
            shenjian.close();
        }

    })
}
else if (shenjian.is("dialog-project-exporting")){
    let  project_id = shenjian.body.data("project-id"),
    format = shenjian.body.data('format'),
    ext =shenjian.body.data('ext') || format,
    export_path = shenjian.path.join(decodeURIComponent(shenjian.body.data("path")),"outputs"),
    progressbar = $("#progressbar"),
    progressLabel = $("#progress-label"),
    btnFolder =  $("#btn-folder"),
    btnExporting =  $("#btn-exporting");
    if(['xml','json'].indexOf(format)>-1) ext = format;

    function exportToXML(doc,depth=1) {
        let xml = '',
        indent = `\n`+`\t`.repeat(depth);
        for(let i in doc){
            let tag = i;
            if(!isNaN(tag)) tag = 'item_'+tag;
            if(doc[i] instanceof Array){
                let sub_xml = ``,
                sub_tag = String(i);
                if(sub_tag.endsWith('s') && sub_tag.length>1){
                    sub_tag = sub_tag.slice(0,-1);
                }else{
                    sub_tag = 'item';
                }
                xml += `${indent}<${tag}>`;
                for(let j in doc[i]){
                    let sub_indent = indent+'\t';
                    if(doc[i][j] instanceof Object){
                        let sub_xml = exportToXML(doc[i][j],depth+2);
                        sub_xml = sub_xml?sub_xml+sub_indent:sub_xml;
                        xml += `${sub_indent}<${sub_tag}>${sub_xml}</${sub_tag}>`;
                    }else{
                        xml += `${sub_indent}<${sub_tag}>${doc[i][j]}</${sub_tag}>`;
                    }
                }
                if(doc[i].length>0) xml+=indent;
                xml += `</${tag}>`;
            }else if(doc[i] instanceof Object){
                let sub_xml = exportToXML(doc[i],depth+1);
                sub_xml = sub_xml?sub_xml+indent:sub_xml;
                xml += `${indent}<${tag}>${sub_xml}</${tag}>`;
            }else{
                xml += `${indent}<${tag}>${doc[i]}</${tag}>`;
            }
        }
        return xml.replace(/&/g,"&amp;");
    }
    if(['xml','json'].indexOf(format)===-1){
        let export_js = $('#export_js').val();
        if (shenjian.fs.existsSync(export_js)){
            shenjian.body.append("<script type='text/javascript' src='"+export_js+"'></script>");
        }
    }
    if(!formatDoc){
        function formatDoc(doc) {
            if(format === 'json'){
                return JSON.stringify(doc);
            }else if(format === 'xml'){
                let xml_doc = exportToXML(doc);
                return `<?xml version="1.0" ?>\n<doc>${xml_doc}\n</doc>`;
            }
        }
    }
    let db = new PouchDB("project-"+project_id);
    db.allDocs({include_docs: true,attachments:true,binary:true}, function (err, response) {
        if(err){
            console.log(err);
            return
        }else if(response){
            let max = response.rows.length,
            value = 0;
            if (response && response.rows.length > 0) {
                //如果不存在 则创建文件夹
                if (!shenjian.fs.existsSync(export_path)) {
                    shenjian.fs.mkdir(export_path);
                }
                exportFile();
                function exportFile() {
                    let doc = response.rows[value].doc;
                    value++;
                    if(doc && doc.outputs){
                        delete doc['src'];
                        delete doc['_id'];
                        delete doc['_rev'];
                        let filename = shenjian.path.basename(doc.path,shenjian.path.extname(doc.path)),
                        filePath = shenjian.path.join(export_path,filename+"."+ext),
                        writer = shenjian.fs.createWriteStream(filePath, {
                            flags: 'w',
                            encoding: 'utf8'
                        });
                        if(doc['_attachments']){
                            let attachments_path = shenjian.path.join(export_path,"attachments");
                            doc.attachments = [];
                            if (!shenjian.fs.existsSync(attachments_path)) {
                                shenjian.fs.mkdir(attachments_path);
                            }
                            for(let i in doc['_attachments']){
                                let path = shenjian.path.join(attachments_path,filename+'_'+i),
                                    reader = new FileReader();
                                reader.onload = function () {
                                    shenjian.fs.writeFile(path,Buffer.from(reader.result),function(e){
                                        delete doc['_attachments'][i]['data'];
                                        doc['_attachments'][i]['path'] = path;
                                        doc['_attachments'][i]['file_name'] = filename+'_'+i;
                                        doc.attachments.push(doc['_attachments'][i]);
                                        delete doc['_attachments'][i];
                                        if(Object.keys(doc['_attachments']).length===0){
                                            delete doc['_attachments'];
                                            let outputs = formatDoc(doc);
                                            writer.write(String(outputs));
                                            writer.end(()=>{
                                                runProgress(value,max);
                                            });
                                        }
                                    });
                                };
                                reader.readAsArrayBuffer(doc['_attachments'][i]['data']);
                            }
                        }else{
                            let outputs = formatDoc(doc);
                            writer.write(String(outputs));
                            writer.end(()=>{
                                runProgress(value,max);
                            });
                        }
                    }else{
                        runProgress(value,max);
                    }
                }
                function runProgress(value,max) {
                    let  percent = parseInt(value*100/max);
                    progressbar.css("width",percent+"%")
                    progressbar.text(percent+"%");
                    if(value == max){
                        //完成
                        btnExporting.css("display","none")
                        btnFolder.css("display","");

                        progressLabel.text(i18n.__("project_exporting_done"))
                    }else{
                        exportFile();
                    }
                }
            }
        }
    });

    btnFolder.on("click",function(){
        shenjian.shell.showItemInFolder(export_path);
        shenjian.close();
    })
}