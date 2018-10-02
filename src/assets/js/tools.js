/**
 * Created by admin on 2018/2/26.
 */
const process = require("process");
if(shenjian.is("dialog-tools-generate-captcha")){
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
                $.toast("请先选择验证码存储文件夹！")
                return;
            }
            data.inputs[input.attr("name")] = input.val();
        });
        if(!dataCompleted){
            return;
        }
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
            const angle = Math.random()*Math.PI/6;
            const x = width/(count+1)*(m+1);
            ctx.translate(x,height/2);
            ctx.rotate(angle);
            const text = code[m];
            let twidht = width/(count+1)*(Math.random()-0.5);
            let theight = height/4*(Math.random()-0.5);
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
