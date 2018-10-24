/**
 * Created by admin on 2017/11/29.
 */
'use strict';
$(function () {
    shenjian.toggleData();
    shenjian.Menu.create();

    (function checkUpdate() {
        shenjian.onFromMain('updateNotAvailable.shenjian',function () {
        });
        shenjian.onFromMain('UpdateAvailable.shenjian',function (info) {
            var url = shenjian.url('index','update',"&info="+encodeURIComponent(JSON.stringify(info)));
            shenjian.openUrl(url,"Update-Confirm-Window",{
                width: 360,
                height: 260,
                modal: false,
                frame: false,
                resizable: false
            })
        });
        shenjian.sendtoMain('UpdateCheck.shenjian');
    })();

    var toolbar = $("#toolbar");
    var sidebarLogin = $("#sidebar-login");
    $("#app-stack").on("stackChange.shenjian",function(ev, tab, layer){
        var pluginTools = toolbar.children("li.plugin").addClass("hidden");
        if(layer.is(".layer-project-list")){
            shenjian.Menu.disable("importList");
            shenjian.Menu.disable("export");
            shenjian.Menu.disable("upload");
            shenjian.Menu.disable("project_settings");
            toolbar.children("li:not(.plugin)").addClass("disabled");
            sidebarLogin.find(".cloud-project").addClass("disabled");
        }else{
            shenjian.Menu.enable("importList");
            shenjian.Menu.enable("export");
            shenjian.Menu.enable("upload");
            shenjian.Menu.enable("project_settings");
            toolbar.children("li:not(.plugin)").removeClass("disabled");
            //显示自己该显示的
            var project_id = layer.attr("project-id");
            pluginTools.filter("[project-id='"+project_id+"']").removeClass("hidden");
            shenjian.post(shenjian.url('checkIsLogin', 'account'), function (r) {
                r = JSON.parse(r);
                if(r.result === 1){
                    sidebarLogin.find(".cloud-project").removeClass("disabled");
                    shenjian.send('checkCloud',{project_id:project_id},'Main-Window');
                }else{
                    sidebarLogin.find(".cloud-project").addClass("disabled");
                }
            })
        }
    })


    toolbar.on("click","li",function(){
        var $this = $(this);
        if($this.is(".selectable")){
            var role = $this.data("role");
            if($this.is(".selected")){
                $("#layer-list > .stack-layer.active").trigger("toolbarDeselect",[role])
            }else{
                $("#layer-list > .stack-layer.active").trigger("toolbarSelect",[role])
            }
            $this.toggleClass("selected");
        }else{
            var role = $this.data("role");
            $("#layer-list > .stack-layer.active").trigger("toolbarClick",[role])
        }

    })

    //石勇
    toolbar.on("mouseover","li",function(){
        let valueTemp = $(this).data("tip");
        if(valueTemp == "output"){
            return;
        }
        if(valueTemp == 'space'){
            valueTemp = i18n.__("toolbar_accelerator_space");
        }
        let xTemp = $(this).offset().left + 60;
        let yTemp = $(this).offset().top - 30;
        $(".keyTips").css("top", yTemp);
        $(".keyTips").css("left", xTemp);
        $(".keyTips .keyValue").text(valueTemp);
        $(".keyTips").css("display","block");
    })
    toolbar.on("mouseout","li",function(){
        $(".keyTips").css("display","none");
    })

    shenjian.body.on("menu.shenjian",function(ev, role){
        if(role == "version"){
            shenjian.openUrl(shenjian.url("about","help"),"About-Window",{
                width: 350,
                height: 320,
                modal: false,
                frame: false,
                resizable: false
            })
        }else if(role == "new"){
            shenjian.openUrl(shenjian.url("new","project"),"New-Project-Window",{
                width: 700,
                height: 520,
                frame: false,
                resizable: false
            })
        }else if(role == "login"){
            shenjian.openUrl(shenjian.url("login","account"),"Login-Window",{
                width: 300,
                height: 200,
                modal: true,
                frame: false,
                resizable: false
            })
        }else if(role == "homepage"){
            shenjian.openExternal(i18n.__('home_page'));
        }else if(role == "service"){
            shenjian.openExternal("https://jq.qq.com/?_wv=1027&k=5NJqMHI");
        }else if(role == "export"){
            $("#layer-list > .stack-layer.active").trigger("toolbarClick",["export"])
        }else if(role == "import"){
            shenjian.openUrl(shenjian.url("import","project","&project_id="+$("#layer-list > .stack-layer.active").attr('project-id')),"Import-Window",{
                width: 450,
                height: 150,
                alwaysOnTop : true,
                frame: false,
                resizable: false
            })
        }
        else if(role == "captcha"){
            shenjian.openUrl(shenjian.url("captcha","tools"),"New-Captcha-Generate-Project-Window",{
                width: 700,
                height: 630,
                frame: false,
                resizable: false
            })
        }
        else if(role == "loadMnist"){
            shenjian.openUrl(shenjian.url("mnist","Tools"),"Mnist-Window",{
                width: 450,
                height: 225,
                alwaysOnTop : true,
                frame: false,
                resizable: false
            })
        }
        else if(role == 'signOut'){
            shenjian.post(shenjian.url('signOut','account'),function (r) {
                $.toast("登出成功");
                shenjian.send('disableMenu','signOut','Main-Window');
                shenjian.send('enableMenu','login','Main-Window');
            });
        }else if(role == 'upload'){
            shenjian.post(shenjian.url('checkIsLogin', 'account'), function (r) {
                r = JSON.parse(r);
                if (r.result === 1) {
                    shenjian.openUrl(shenjian.url("upload", "account","&project_id="+$("#layer-list > .stack-layer.active").attr('project-id')), "Upload-Window", {
                        width: 387,
                        height: 158,
                        modal: true,
                        frame: false,
                        resizable: false
                    })
                } else {
                    shenjian.body.trigger('menu.shenjian', 'login');
                }
            })
        }else if(role == 'project_settings'){
            shenjian.openUrl(shenjian.url("configModify","project","&project_id="+$("#layer-list > .stack-layer.active").attr('project-id')),"Project-Config-Modify",{
                width: 500,
                height: 500,
                frame: false,
                resizable: false
            })
        }else if(role == 'houyi'){
            shenjian.openExternal(i18n.__('houyi_home_page'));
        }
    });

    $(document).on("keyup",function(ev){
        $("#layer-list > .stack-layer.active").trigger(ev);
    }).on("keydown",function(ev){
        $("#layer-list > .stack-layer.active").trigger(ev);
    });
    
    shenjian.on('enableMenu',function (role) {
        shenjian.Menu.enable(role);
    })
    shenjian.on('disableMenu',function (role) {
        shenjian.Menu.disable(role);
    })

    $('#nav-window .btn-exit').on('click',function (e) {
        if(shenjian.body.find('#tab-list>.changed').length>0){
            window.confirm(i18n.__("project_content_unsaved"),()=>{
                shenjian.body.find("#layer-list>.changed iframe")[0].contentWindow.plugin.setChanged(false);
                $(this).trigger('click');
            });
            e.stopImmediatePropagation();
        }
    });

    shenjian.on('checkCloud',function (project_id) {
        var db = new PouchDB("project-list");
        db.get(project_id.project_id).then(function(doc) {
            if(doc.cloud){
                sidebarLogin.find(".cloud-project").addClass("disabled");
            }else{
                sidebarLogin.find(".cloud-project").removeClass("disabled");
            }
        }).catch(function (err) {
            console.log(err);
        });
    })

    shenjian.on('checkLogin',function () {
        shenjian.post(shenjian.url('checkIsLogin', 'account'), function (r) {
            r = JSON.parse(r);
            $(".login-title").empty();
            if(r.result === 1){
                $(".user-information").removeClass("login");
                $(".user-img img").attr("src",r.data.portrait);
                $(".user-information .username").text(r.data.username);
                $(".login-title").append(`<span class='loginout-text'>${i18n.__("menu_server_signOut")}</span>`);
            }else{
                $(".user-img img").attr("src","../../../assets/image/user_img.png");
                $(".user-information").addClass("login");
                $(".login-title").append(`<span class='login'>${i18n.__("main_index_login")}</span>`);
            }
            let project_id = $("#layer-list > .stack-layer.active").attr('project-id');
            if(r.result === 1 && project_id){
                shenjian.send('checkCloud',{project_id:project_id},'Main-Window');
            }else{
                sidebarLogin.find(".cloud-project").addClass("disabled");
            }
        })
    })
    shenjian.send('checkLogin','','Main-Window');

    $(".user-information").hover(function () {
        shenjian.post(shenjian.url('checkIsLogin', 'account'), function (r) {
            r = JSON.parse(r);
            if(r.result === 1){
                $(".user-detail").css("display","block");
            }else{
                $(".user-detail").css("display","none");
                $(".login-title .login").css("color","#117cd8");
            }
        })
    },function () {
        $(".user-detail").css("display","none");
        $(".login-title .login").css("color","gainsboro");
    })

    sidebarLogin.on("click",".login",function () {
        shenjian.openUrl(shenjian.url("login","account"),"Login-Window",{
            width: 300,
            height: 200,
            modal: true,
            frame: false,
            resizable: false
        })
    })

    sidebarLogin.on("click",'.loginout-text',function () {
        shenjian.post(shenjian.url('signOut','account'),function (r) {
            $.toast("登出成功");
            shenjian.send('checkLogin','','Main-Window');
        });
    })

    // 转云端项目
    sidebarLogin.on("click",".cloud-project",function () {
        shenjian.openUrl(shenjian.url("cloud", "account","&project_id="+$("#layer-list > .stack-layer.active").attr('project-id')), "Upload-Window", {
            width: 300,
            height: 128,
            modal: true,
            frame: false,
            resizable: false
        })
    })

});

