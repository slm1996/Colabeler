/**
 * Created by wutong on 2018/1/16.
 */
const path = require('path');
const framework_path = path.join(__dirname,"..","..","framework");
const SController = require(path.join(framework_path,"base","SController.js"));
const ProjectCache = require(path.join("..","biz/entities","ProjectCache.js"));
const PluginManager = require(path.join("..","biz/entities","PluginManager.js"));
const HttpUtil = require(path.join(framework_path,"utils","HttpUtil.js"));
const packageContent = require('../../../package.json');

class AccountController extends SController{
    actionLogin(){
        this.render("dialog-login",{"version": packageContent.version});
    }

    actionSignUp(){
        this.render("dialog-signUp");
    }

    actionSendEmail({sendUrl,useremail}){
        return HttpUtil.post(sendUrl,useremail).then((data) =>{
            try {
                let result = JSON.parse(data);
                if (result.code==0){
                    this.success(result.reason);
                }else {
                    this.fail(result.reason.replace('神箭手','精灵'));
                }
            }catch (e){
                this.fail('服务异常，请联系精灵客服');
            }
        });
    }
    actionSignUpUser({signUpUrl,accountData}){
        return HttpUtil.post(signUpUrl,accountData).then((data) =>{
            try {
                let result = JSON.parse(data);
                if (result.code==0){
                    this.setCookie('key',result.data.user.key);
                    this.setCookie('secret',result.data.user.secret);
                    this.setCookie('username',accountData.email);
                    this.setCookie('password',accountData.password);
                    let portrait = result.data.user.portrait;
                    if(!portrait){
                        portrait = "../../../assets/image/user_img.png";
                    }
                    this.setCookie('portrait',portrait);
                    this.success(result.reason);
                }else {
                    this.fail(result.reason);
                }
            }catch (e){
                this.fail('服务异常，请联系精灵客服');
            }
        });
    }

    actionLoginSuccess({key,secret,username,password,portrait}){
        this.setCookie('key',key);
        this.setCookie('secret',secret);
        this.setCookie('username',username);
        this.setCookie('password',password);
        this.setCookie('portrait',portrait);
        this.success();
    }

    actionSignOut(){
        const now = Math.round(new Date().getTime() / 1000);
        this.setCookie('key','',now-3600);
        this.setCookie('secret','',now-3600);
        this.setCookie('username','',now-3600);
        this.setCookie('password','',now-3600);
        this.setCookie('portrait','',now-3600);
        this.success();
    }

    actionCheckIsLogin(){
        return this.getCookie({url: "https://www.shenjian.io"}).then((cookies)=> {
            if(cookies.length > 0){
                let obj = {};
                for (let i = 0; i < cookies.length; i++){
                    obj[cookies[i].name] = 1;
                    if(cookies[i].name == "username"){
                        var nameText = cookies[i].value;
                    }
                    if(cookies[i].name == "portrait"){
                        var portrait = cookies[i].value;
                    }
                }
                if(obj.hasOwnProperty("key")){
                    this.success("已登录",{username:nameText,portrait:portrait});
                }else{
                    this.fail("未登录")
                }
            }else{
                this.fail("未登录")
            }
        });
    }

    actionGetKeySecret(){
        let key;
        return this.getCookie({name:'key'}).then((cookies)=> {
            if(cookies.length===0){
                return new Promise((resolve,reject)=>reject())
            }
            key = cookies[0].value;
            return this.getCookie({name:'secret'})
        }).then((cookies)=>{
            const secret = cookies[0].value;
            const timestamp = Math.floor(new Date().getTime()/1000);
            const crypto = require('crypto');
            const hash = crypto.createHash('md5');
            hash.update(key+timestamp+secret);
            const sign = hash.digest('hex');
            this.success("操作成功",{key:key,timestamp:timestamp,sign:sign});
        }).catch((e)=>this.fail("未登录"))
    }


    actionUpload({project_id}){
        let pluginManager = PluginManager.defaultManager();
        let project =  ProjectCache.defaultCache().getProject(project_id);
        let plugin = pluginManager.getPlugin(project.getPlugin());

        let key;
        return this.getCookie({name:'key'}).then((cookies)=> {
            key = cookies[0].value;
            return this.getCookie({name:'secret'})
        }).then((cookies)=>{
            const secret = cookies[0].value;
            this.render("dialog-upload",{key:key,secret:secret,outputs:JSON.stringify(plugin.getOutputs()),project_id:project_id,project_name:project.getName()});
        }).catch((e)=>console.log(e))
    }

    actionUploadSuccess({app_id}){
        this.render("dialog-upload-success",{app_id:app_id});
    }

    actionCloud({project_id}){
        let pluginManager = PluginManager.defaultManager();
        let project =  ProjectCache.defaultCache().getProject(project_id);
        let plugin = pluginManager.getPlugin(project.getPlugin());

        let key;
        return this.getCookie({name:'key'}).then((cookies)=> {
            key = cookies[0].value;
            return this.getCookie({name:'secret'})
        }).then((cookies)=>{
            const secret = cookies[0].value;
            this.render("dialog-cloud",{key:key,secret:secret,outputs:JSON.stringify(plugin.getOutputs()),project_id:project_id,project_name:project.getName()});
        }).catch((e)=>console.log(e))
    }
    actionCloudSuccess({app_id}){
        this.render("dialog-cloud-success",{app_id:app_id});
    }
}
module.exports = AccountController;
