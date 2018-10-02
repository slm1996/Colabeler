/**
 * Created by wutong on 2018/1/16.
 */
const fs = require('fs');
var needle = require('needle');
const crypto = require('crypto');
if(shenjian.is("dialog-account-login")){
    let version = $("input[name='version']").val();
    $("#btn-register").on("click",function(){
        shenjian.close();
        shenjian.openUrl(shenjian.url("signUp","account"),"signUp-Window",{
            width: 300,
            height: 260,
            modal: true,
            frame: false,
            resizable: false
        })
    });
    // 按enter键时进行登录
    document.onkeyup = function(event){
        if(event.keyCode == 13){
            $(".btn-login").trigger("click");
        }
    }
    $(".btn-login").on("click",function(){
        const username = $("input[name='username']").val();
        const password = $("input[name='password']").val();
        if(!username || !password){
            $.toast(i18n.__("main_login_err_empty"));
            return false;
        }
        $(this).addClass('disabled');
        var params = {
            username:username,
            password:password
        }
        let options = {
            headers: { 'User-Agent': 'JingLing Client V' + version }
        };
        needle.post('https://www.shenjian.io/?r=jingling/signin', params, options, function(err, res) {
            let result = res.body;
            if(result.code !== 0){
                $.toast(result.reason);
                $(".btn-login").removeClass('disabled');
            }else{
                $.toast(i18n.__("main_login_success_text"));
                let userImgUrl = result.data.user.portrait;
                if(!userImgUrl){
                    userImgUrl = "../../../assets/image/user_img.png";
                }
                shenjian.post(shenjian.url('loginSuccess','account'),{key:result.data.user.key,secret:result.data.user.secret,username:username,password:password,portrait:userImgUrl},function (r) {
                    shenjian.send('checkLogin','','Main-Window');
                    setTimeout(function () {
                        shenjian.close();
                    },1500)
                },'json');
            }
        })
    })
}else if(shenjian.is("dialog-upload") || shenjian.is('dialog-cloud')){
    $(function () {
        let key = $('.key').val();
        let secret = $('.secret').val();
        const projectName = $('.project-name').val();
        $('#btn-cancel').on('click',()=>shenjian.close());
        // 修改字符串的递归方法
        function flattenTree(treeNode, flattenRoot={},key=""){
            if(treeNode instanceof Array){
                treeNode = treeNode[0];
                flattenTree(treeNode,flattenRoot,key);
            }else if(treeNode instanceof Object){
                for (var treeKey in treeNode) {
                    flattenTree(treeNode[treeKey],flattenRoot,key?key+"_"+treeKey:treeKey);
                }
            }else{
                //最深的节点
                flattenRoot[key] = treeNode;
            }
            return flattenRoot;
        }
        function extractFields(fieldNode) {
            if(fieldNode instanceof Object){
                let fields = [];
                for(var key in fieldNode){
                    var field = {"name":key,"alias":key}
                    if((fieldNode[key] instanceof Array)){
                        field["repeated"] = true;
                        if(fieldNode[key].length > 0 && fieldNode[key][0] instanceof Object){
                            field["children"] = extractFields(fieldNode[key][0]);
                        }
                    }else if(fieldNode[key] instanceof Object){
                        field["children"] = extractFields(fieldNode[key]);
                    }
                    fields.push(field)
                }
                return fields;
            }
            return null;
        }
        // 用来改变Timestamp和Sign的值
        function getSignData() {
            let timestamp = Math.floor(new Date().getTime()/1000);
            let hash = crypto.createHash('md5');
            hash.update(key+timestamp+secret);
            let sign = hash.digest('hex');
            return {
                user_key: key,
                timestamp: timestamp,
                sign: sign
            }
        }
        $('#btn-ok').on('click',function () {
            const projectId = $('.project-id').val();
            let db = new PouchDB("project-"+projectId);
            let rows = [];
            let rows_count = 0;
            let uploaded_index = 0;
            let uploaded_count = 0;
            let file_size = 0;
            let upload_files = [];
            let doc_list = [];
            $("#expand").addClass("disabled");
            $("#btn-ok").addClass("mnist-upload");

            // 1.取出一条数据
            db.allDocs({
                include_docs: true,
                limit:1
            }).then(function (doc) {
                rows_count = doc.total_rows - 1;
                if(rows_count === 0){
                    $.toast("Zero Rows");
                    return;
                }
                let docOne = doc.rows[0].doc;
                delete docOne["_id"];
                delete docOne["_rev"];
                delete docOne["src"];
                // 2.根据选择处理该数据
                if($(".expand")[0] && $(".expand")[0].checked){
                    docOne = flattenTree(docOne);
                }
                //3.提取数据fields
                var fields =(extractFields(docOne));
                fields.unshift({"name":"path_host","alias":"path_host"});
                fields = JSON.stringify(fields);
                let paramsCreate = getSignData();// 创建数据源的传参
                paramsCreate["name"] = projectName;
                paramsCreate["fields"] = fields;
                //4.创建数据源
                $.post("https://www.shenjian.io/rest/v3/source/create",paramsCreate,function (data) {
                    if(data.code !== 0){
                        $.toast(data.reason);
                    }else{
                        const appId = data.data.app_id;
                        // 获取到所有的数据并进行循环
                        db.allDocs({
                            include_docs: true
                        }).then(function (result) {
                            rows = result.rows;
                            upload_next();
                        }).catch(function (e) {
                            console.log(e);
                        });
                        function upload_next() {
                            let doc = rows[uploaded_index].doc;
                            if(!doc.labeled){
                                progress();
                                return;
                            }

                            file_size = file_size + fs.statSync(doc.path).size;
                            if(file_size <= 5242880 && uploaded_count < 600){
                                upload_files.push(doc.path);
                                doc_list.push(doc);
                                uploaded_index++;
                                uploaded_count++;
                                if(uploaded_index < rows_count){
                                    upload_next();
                                    return;
                                }
                            }
                            let paramsUploadFile = getSignData();// 上传文件接口的传参
                            upload_files.map(function (item, index) {
                                paramsUploadFile["upfile_"+index] = {file: item, content_type : 'application/octet-stream'};
                            });
                            var requestOptions = {
                                multipart: true,
                                response_timeout: 180000,
                                read_timeout: 180000,
                            };
                            needle.post('https://www.shenjian.io/rest/v3/source/'+appId+'/file/uploadList', paramsUploadFile, requestOptions, function(err, res) {
                                if(res !== undefined && res.body !== undefined && res.body.code == 0){
                                    file_size = 0;
                                    uploaded_count = 0;
                                    upload_files = [];
                                    let pathCloud = res.body.data.urls;
                                    for (let i in doc_list){
                                        delete doc_list[i]["_id"];
                                        delete doc_list[i]["_rev"];
                                        delete doc_list[i]["src"];
                                        doc_list[i]["path_host"] = pathCloud["upfile_"+i];
                                        doc_list[i]["labeled"] = doc_list[i]["labeled"]==1 ? "true":"false";
                                    }
                                    if($(".expand")[0] && $(".expand")[0].checked){
                                        let temp = [];
                                        for (let i in doc_list){
                                            temp.push(flattenTree(doc_list[i]));
                                        }
                                        doc_list = temp;
                                    }
                                    insert_next(JSON.stringify(doc_list));
                                }else{
                                    if (err) {
                                        console.log("err occur: " + err.message);
                                    }
                                    //重试
                                    setTimeout(function(){
                                        upload_next();
                                    },500)
                                }
                            })
                        }
                        function insert_next(doc){
                            let paramsInsert = getSignData();// 上传数据接口的传参
                            paramsInsert["data"] = doc;
                            doc_list = [];
                            $.post("https://www.shenjian.io/rest/v3/source/"+appId+"/insertList",paramsInsert,function (data) {
                                if(data.code == 0){
                                    progress();
                                }else{
                                    //重试
                                    setTimeout(function(){
                                        insert_next(doc);
                                    },500)
                                }
                            }).fail(function () {
                                //接口调用失败时进行重试
                                setTimeout(function(){
                                    insert_next(doc);
                                },500)
                            })
                        }
                        function progress() {
                            $(".import-progress .upload-text").css("display","block");
                            $(".import-progress .upload-index").text(uploaded_index);
                            // 进度条
                            let percent = uploaded_index/rows_count;
                            $(".import-progress").css("width",(percent*100)+"%");
                            if(uploaded_index == rows_count){
                                if(shenjian.is("dialog-cloud")){
                                    let db = new PouchDB("project-list");
                                    db.get(projectId).then(function(doc) {
                                        doc.cloud = true;
                                        return db.put(doc);
                                    }).then(function (res) {
                                        shenjian.send('checkCloud',{project_id:projectId},'Main-Window');
                                    }).catch(function (err) {
                                        console.log(err);
                                    });
                                }
                                setTimeout(()=>{
                                    var successCtrlUrl = shenjian.is("dialog-cloud") ? "cloudSuccess" : "uploadSuccess";
                                    shenjian.openUrl(shenjian.url(successCtrlUrl,"account","&app_id="+appId),"upload-success",{
                                        width: 300,
                                        height: 150,
                                        modal: true,
                                        frame: false,
                                        resizable: false,
                                        parent:null,
                                        alwaysOnTop:true
                                    });
                                    shenjian.close();
                                },500)
                            }else {
                                upload_next();
                            }
                        }
                    }
                })
            })
        });
    })
}else if(shenjian.is('dialog-upload-success') || shenjian.is('dialog-cloud-success')){
    $(function () {
        $('#btn-ok').on('click',()=>shenjian.close());
        $('.btn-access').on('click',function () {
            shenjian.openExternal($(this).data('url'));
            shenjian.close();
        });
    });
}else if(shenjian.is("dialog-account-signUp")){
    $(function () {
        function getUserEmail(){
            let useremail = $(".user-email").val().trim();
            if(!useremail){
                $.toast(i18n.__("main_signUp_err_email_empty"));
                return false;
            }
            if(!(/[0-9a-zA-Z_]+@[0-9a-zA-Z_]{1,15}\.[a-zA-Z_]{2,8}/.test(useremail))){
                $.toast(i18n.__("main_signUp_err_email_format"));
                return false;
            }
            return useremail;
        }
        $(".btn-login").on("click",function () {
            let useremail = getUserEmail();
            let messageCode = $(".message-code").val().trim();
            let password = $(".password").val().trim();
            if(!useremail){
                return;
            }
            if(!messageCode){
                $.toast(i18n.__("main_signUp_err_email_code"));
                return;
            }
            if(password.match(/\s+/)) {
                $.toast(i18n.__("main_signUp_err_password"));
                return;
            }
            if(!password){
                $.toast(i18n.__("main_signUp_err_password_empty"));
                return;
            }
            let params = {
                email:useremail,
                code:messageCode,
                type:"email",
                password:password
            };
            shenjian.post(shenjian.url('signUpUser','account'),{
                signUpUrl:i18n.__("main_signUp_url")+`index.php?r=jingling/upbyemail`,
                accountData:params
            },function (res) {
                let result = JSON.parse(res);
                $.toast(result.reason);
                shenjian.send('checkLogin','','Main-Window');
                if(result.result == 1){
                    setTimeout(function () {
                        shenjian.close();
                    },1500)
                }
            });
        })
        // 按enter键时进行登录
        document.onkeyup = function(event){
            if(event.keyCode == 13){
                $(".btn-login").trigger("click");
            }
        }
        $(".send-email").on("click",function () {
            let useremail = getUserEmail();
            shenjian.post(shenjian.url('sendEmail','account'),{
                sendUrl:i18n.__("main_signUp_url")+`index.php?r=jingling/upemailsend`,
                useremail:{email:useremail}
            },function (r) {
                r = JSON.parse(r);
                $.toast(r.reason);
            });
        })
        $(".back-login").on("click",function () {
            shenjian.close();
            shenjian.openUrl(shenjian.url("login","account"),"Login-Window",{
                width: 300,
                height: 200,
                modal: true,
                frame: false,
                resizable: false
            })
        })
    });
}