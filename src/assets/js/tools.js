/**
 * Created by admin on 2018/2/26.
 */
const process = require("process");
if(shenjian.is("dialog-tools-generate-captcha")){
    let param_db = new PouchDB("configuration-list");
    // 点击配置名称框显示下拉框
    $(".captcha-configurations").on("click",function () {
        // 获取并显示所有的配置名称
        param_db.allDocs({
            include_docs: true
        }).then(function (result) {
            $(".configurations-list").empty();
            let rows = result.rows;
            rows.unshift({doc: {_id:0,_rev:0,name:i18n.__("project_captcha_default_configuration")}});
            for (let item of rows){
                let name_html = `<li class="configuration-title" data-id="${item.doc._id}" data-rev="${item.doc._rev}">
                <span class="title">${item.doc.name}</span>
                <span class="remove-configuration" data-id="${item.doc._id}">${i18n.__("project_captcha_delete_configuration")}</span>
                </li>`;
                $(".configurations-list").append(name_html);
            }
        }).catch(function (e) {
            console.log(e);
        });
        $(".configurations-list").css("display","block");
        event.stopPropagation();
    })
    // 点击下拉框的配置
    $(".configurations-list").on("click",".configuration-title",function () {
        let params_id = $(this).data("id");
        let params_rev = $(this).data("rev");
        $(".configurations-list").css("display","none");
        $(".selected-text").text($(this).find(".title").text());
        $(".selected-text").data("id",params_id);
        $(".selected-text").data("rev",params_rev);
        let all_params = {};
        // 获取存在indexDB中的配置参数
        param_db.get(params_id).then(function (doc) {
            all_params = {
                charsets: doc.charsets,
                num_images: doc.num_images,
                num_text: doc.num_text,
                width: doc.width,
                height: doc.height,
                font: doc.font,
                obfuscation: doc.obfuscation,
            }
            $(".local-type-title.cover").removeClass("disabled");
            updateInputValue(all_params);
        }).catch(function (err) { // 获取失败说明选择的是默认配置
            all_params = {
                charsets:"0-9",
                num_images:"100",
                num_text:"4",
                width:"200",
                height:"60",
                font:"bold 40px Lucida Sans Unicode",
                obfuscation:"false"
            };
            $(".local-type-title.cover").addClass("disabled");
            if($(".local-type-title.cover").hasClass("selected")){
                $(".local-type-title.cover").removeClass("selected");
                $(".local-type-title.not-save").addClass("selected");
            }
            updateInputValue(all_params);
            console.log(err);
        });
        event.stopPropagation();
    })
    // 修改input框中的value值的方法
    function updateInputValue(obj){
        $("input[name='charsets']").val(obj.charsets);
        $("input[name='num_images']").val(obj.num_images);
        $("input[name='num_text']").val(obj.num_text);
        $("input[name='width']").val(obj.width);
        $("input[name='height']").val(obj.height);
        $("input[name='font']").val(obj.font);
        $("input[name='obfuscation']").val(obj.obfuscation);
    }
    // 点击删除下拉框的配置
    $(".configurations-list").on("click",".remove-configuration",function (e) {
        let $this = $(this)
        e.stopPropagation();
        let params_id = $(this).data("id");
        param_db.get(params_id).then(function (doc) {
            param_db.remove(doc);
            $this.parent().remove();
        }).catch(function (err) {
            console.log(err);
        });
    })
    // 点击选择如何操作当前参数
    $(".local-type-title").on("click",function () {
        $(".local-type-title").removeClass("selected");
        if($(this).data("type") == "new"){
            $(".new-name").removeClass("disabled");
            $(".new-name").val(i18n.__("project_captcha_new_configuration") + new Date().getTime());
        }else{
            $(".new-name").addClass("disabled");
        }
        $(this).addClass("selected");
    })

    $("#btn-create").on("click",function () {
        let plugin_id = "com.colabeler.cv.transcript";
        let plugin_name = $('.plugin-name').val();
        let plugin_icon = $('.icon-path').val();

        let __name = $("input[name='__name']").val();
        if(!__name){
            $.toast(i18n.__("project_new_notEmpty"))
            return;
        }
        let data = {
            name:__name,
            plugin:plugin_id,
            time_created:new Date().getTime(),
            inputs:{}
        };
        let dataCompleted = true;
        $(".input.plugin").each(function(){
            let input = $(this);
            if(input.attr("name") == "source" && input.val() == ""){
                dataCompleted = false;
                $.toast(i18n.__("project_captcha_error_folder"));
                return;
            }
            data.inputs[input.attr("name")] = input.val();
        });
        if(!dataCompleted){
            return;
        }
        // 石勇 保存配置
        let __charsets = $("input[name='charsets']").val();
        let __num_images = $("input[name='num_images']").val();
        let __num_text = $("input[name='num_text']").val();
        let __width = $("input[name='width']").val();
        let __height = $("input[name='height']").val();
        let __font = $("input[name='font']").val();
        let __obfuscation = $("input[name='obfuscation']").val();
        let __new_params = $("input[name='new_params']").val();
        let param_data = {
            charsets:__charsets,
            num_images:__num_images,
            num_text:__num_text,
            width:__width,
            height:__height,
            font:__font,
            obfuscation:__obfuscation,
            name:__new_params,
            time_created:new Date().getTime()
        };
        param_data._id = $(".selected-text").data("id");
        let operate_type = $(".local-type-title.selected").data("type");
        if(operate_type == "new"){
            if(!param_data.name){
                $.toast(i18n.__("project_captcha_error_configuration_name"));
                return;
            }
            // 创建新配置
            param_data._id = process.hrtime().join('_');
            param_db.put(param_data, (err,res) => {
                exportCaptcha();
            });
        }else if(operate_type == "cover"){
            if(param_data._id != 0){
                // 覆盖原有配置
                param_data.name = $(".selected-text").text();
                param_data._rev = $(".selected-text").data("rev");
                param_db.put(param_data, (err,res) => {
                    exportCaptcha();
                });
            }
        }else{
            exportCaptcha();
        }

        // 导出验证码文件
        function exportCaptcha(){
            $('.progress-wrapper').show().on('progress-change',function (e,progress) {//进度条
                $(this).find('span').text(progress);
            });
            let db = new PouchDB("project-list");
            data._id = process.hrtime().join('_');
            db.put(data, (err,res) => {
                data.project_id = data._id;
                let projectDB = new PouchDB("project-"+data.project_id);
                projectDB.createIndex({
                    index: {
                        fields: ['_id','labeled']
                    }
                }).then(function (result) {
                    shenjian.post(shenjian.url("create","project"),data,function(){
                        db.close().then(function () {
                            let count = parseInt(data.inputs.num_images);
                            //解析charsets
                            let charsets = data.inputs.charsets.split(',');
                            let charsets_parsed = [];
                            for(let i=0;i<charsets.length;i++){
                                if(charsets[i].length===3 && charsets[i].charAt(1) === '-'){
                                    const char1 = charsets[i].charAt(0);
                                    const char3 = charsets[i].charAt(2);
                                    if(/\d/.test(char1) && /\d/.test(char3) && char1<char3){
                                        for(let j=char1;j<=char3;j++){
                                            charsets_parsed.push(j)
                                        }
                                    }else if(/[a-zA-Z]/.test(char1) && /[a-zA-Z]/.test(char3) && char1.charCodeAt(0)<=char3.charCodeAt(0)){
                                        for(let k=char1.charCodeAt(0);k<=char3.charCodeAt(0);k++){
                                            charsets_parsed.push(String.fromCharCode(k));
                                        }
                                    }
                                }else{
                                    charsets_parsed.push(charsets[i]);
                                }
                            }
                            saveProject(projectDB,data.inputs,count,charsets_parsed);//存储验证码
                            $(window).on('project-save-success',function () {
                                shenjian.send("ProjectCreated",{
                                    project_id:data.project_id,
                                    name:data.name,
                                    plugin_icon:plugin_icon,
                                    plugin_name:plugin_name,
                                    time_created:_.formatDate("yyyy-mm-dd hh:ii",data.time_created)
                                },"Main-Window");
                                shenjian.close();
                            })
                        });
                    })
                }).catch(function (err) {
                    $.toast("Error:"+err.toLocaleString());
                });
            });
        }

    });

    function saveProject(db,inputs_user,count,charsets,docs){
        docs = docs || [];
        const num_text = parseInt(inputs_user.num_text);
        const code = Array.from({length:num_text}).map(()=>charsets[Math.floor(Math.random()*charsets.length)]).reduce((a,b)=>''+a+b);//生成随机验证码
        let bf = generateCaptcha(inputs_user,code);
        const num_images = parseInt(inputs_user.num_images);
        const filePath = shenjian.path.join(inputs_user.source,'captcha_'+(num_images-count+1)+'.jpg');
        shenjian.fs.open(filePath,"w+",function (err,fd) {
            if(!err){
                shenjian.fs.writeFile(fd,bf,function (err) {
                    count--;
                    $('.progress-wrapper').trigger('progress-change',Math.ceil((num_images-count)*100/num_images)+'%');
                    if(!err){
                        shenjian.fs.closeSync(fd);
                        docs.push({_id:filePath,path:filePath,outputs:{transcript:code},time_labeled:new Date().getTime(),labeled:true});
                        if(count===0){
                            db.bulkDocs(docs).then(function () {
                                $(window).trigger('project-save-success');
                            })
                        }else if(docs.length===10000){
                            db.bulkDocs(docs).then(function () {
                                saveProject(db,inputs_user,count,charsets,[]);
                            })
                        }else{
                            saveProject(db,inputs_user,count,charsets,docs);
                        }
                        docs = null;
                    }
                })
            }
        });
    }
    
    function generateCaptcha(inputs,code) {
        let canvas = document.createElement("canvas");
        canvas.width = parseInt(inputs.width);
        canvas.height = parseInt(inputs.height);
        let ctx = canvas.getContext("2d");
        //预处理输入数据
        let width = parseInt(inputs.width);
        let height = parseInt(inputs.height);
        let obfuscation = inputs.obfuscation==='true';

        const red = Math.floor(Math.random()*64+192);
        const green = Math.floor(Math.random()*64+192);
        const blue = Math.floor(Math.random()*64+192);
        ctx.fillStyle = "rgba("+red+","+green+","+blue+",1)";
        ctx.fillRect(0,0,width,height);
        ctx.font = inputs.font;
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        const count = parseInt(inputs.num_text);
        for(let m=0;m<count;m++){//fill text
            ctx.save();
            const red = Math.floor(Math.random()*64+64);//随机字体颜色
            const green = Math.floor(Math.random()*64+64);
            const blue = Math.floor(Math.random()*64+64);
            ctx.fillStyle = "rgba("+red+","+green+","+blue+",1)";//随机背景颜色
            ctx.strokeStyle=ctx.fillStyle;
            ctx.lineWidth=1;
            const angle = (Math.random()-0.5)*Math.PI/12;
            const x = width/(count+1)*(m+1);
            ctx.translate(x,height/2);
            ctx.rotate(angle);
            const text = code[m];
            let twidht = width/(count+1)*(Math.random()-0.5)/10;
            let theight = height/4*(Math.random()-0.5)/10;
            ctx.fillText(text,twidht,theight);
            // ctx.strokeText(text,twidht,theight);
            ctx.restore();
        }
        if(obfuscation){
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.lineWidth = 1.5;
            ctx.moveTo( Math.floor(Math.random()*width), Math.floor(Math.random()*height));
            for(let i=0;i<4;i++){
                ctx.lineTo( Math.floor(Math.random()*width), Math.floor(Math.random()*height));// 画线
                ctx.stroke();
            }
        }
        imageData = canvas.toDataURL('image/jpeg');
        imageData = imageData.substring(imageData.indexOf('base64,')+7);
        return new Buffer(imageData,'base64');
    }
}
else if(shenjian.is("dialog-tools-mnist")){
    var loadMnistFiles = function(){

    }

    $("#btn-load").on("click",function(){
        var savePixels = require("save-pixels")
        var ndarray = require("ndarray")

        var imagesFile = $("#images-path").val();
        var labelsFile = $("#labels-path").val();
        let plugin_name = $('.plugin-name').val();
        let plugin_icon = $('.icon-path').val();

        var imagesFileBuffer  = shenjian.fs.readFileSync(imagesFile);
        var labelFileBuffer = shenjian.fs.readFileSync(labelsFile);
        var pixelValues     = [];


        var imageMagic = imagesFileBuffer.readInt32BE(0)

        if(imageMagic != 2051){
            $.toast(imagesFile+" is not a valid mnist image file")
            return;
        }

        var labelMagic = labelFileBuffer.readInt32BE(0)
        if(labelMagic != 2049){
            $.toast(labelsFile+" is not a valid mnist label file")
            return;
        }

        var imageCount = imagesFileBuffer.readInt32BE(4)
        var labelCount = labelFileBuffer.readInt32BE(4)

        if(imageCount != labelCount){
            $.toast("Label count is inconsistent with image count!")
            return;
        }

        var numOfRows = imagesFileBuffer.readInt32BE(8);
        var numOfCols = imagesFileBuffer.readInt32BE(12);

        $(".form-group").addClass("disabled");
        $("#btn-load").addClass("mnist-upload");

        var offset = 16;
        let obj = {};
        let digitArr = [];
        let projectId = process.hrtime().join('_');
        let projectDB = new PouchDB("project-"+projectId);
        function writeImage(index) {
            if(index >= imageCount){
                var source = shenjian.path.dirname(imagesFile);//文件夹地址

                var data = {
                    name: i18n.__("project_new_mnist_title"),
                    plugin: "com.colabeler.cv.classification",
                    time_created:new Date().getTime(),
                    inputs:{}
                };
                data.inputs["source"] = source;
                data.inputs["classify_value"] = digitArr.sort().join();//分类值
                data.inputs["classify_count"] = "1";
                var db = new PouchDB("project-list");
                data._id = projectId;
                db.put(data, (err,res) => {
                    data.project_id = data._id;
                    projectDB.createIndex({
                        index: {
                            fields: ['_id','labeled']
                        }
                    }).then(function (result) {
                        shenjian.post(shenjian.url("create","project"),data,function(){
                            db.close().then(function () {
                                projectDB.close().then(function (res) {
                                    shenjian.close();
                                    shenjian.send("ProjectCreated",{project_id:data.project_id,
                                        name:data.name,
                                        plugin_icon:plugin_icon,
                                        plugin_name:plugin_name,
                                        time_created:_.formatDate("yyyy-mm-dd hh:ii",data.time_created),
                                        label_max_count:1
                                    },"Main-Window");
                                })
                            });
                        })
                    }).catch(function (err) {
                        $.toast("Error:"+err.toLocaleString());
                    });
                });
                return;
            }

            var pixels = ndarray(new Float32Array(numOfRows * numOfCols), [numOfRows, numOfCols])
            for (var i = 0; i < numOfRows; i++) {
                for (var j = 0; j < numOfCols; j++) {
                    pixels.set(j, i, imagesFileBuffer[offset++])
                }
            }

            var digit = labelFileBuffer[index + 8];//图片分类

            if(!obj[digit]){
                obj[digit] = 1;
                digitArr.push(digit);
            }

            var outputImage = shenjian.path.join(shenjian.path.dirname(imagesFile),index+"-"+digit+'.png')//图片地址
            let buffer = shenjian.fs.createWriteStream(outputImage);
            var item = {_id:outputImage,path:outputImage,src:`file:///${outputImage.replace(/\\/g,"/")}`,"outputs":{},time_labeled:new Date().getTime(),labeled:true};
            item.outputs.object = [{
                name:digit
            }];
            projectDB.put(item).then(function (res) {
                savePixels(pixels, "png").on('end', function() {
                    buffer.end();
                    // 进度条
                    let num = (index+1)/imageCount;
                    $(".import-progress").css("width",(num*100)+"%");

                    writeImage(index+1);
                }).pipe(buffer)
            }).catch(function (err) {
                $.toast("Import Err");
            })
        }
        writeImage(0);
    })
}
