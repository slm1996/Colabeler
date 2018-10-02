

'use strict';
$(function () {
    if(shenjian.is('dialog-publish-data')){
        //创建字段列表窗口
        let win = remote.getCurrentWindow();
        shenjian.toggleData();
        $('input[data-toggle="icheck"]').iCheck({fontFamily:'fp'});
        $('#btn-cancel').on('click',()=>{shenjian.close()});
        var dbName = shenjian.body.data('db_name');
        var pouch = new PouchDB(dbName);
        var publishCount = 0;

        //0.2、绑定选择列表li事件
        $(".dropMenu").on('mouseup','li',function () {
            var $this = $(this);
            let currentValue = $this.parents('.dropdown-menu').find('li.selected').data('value');
            $this.addClass('selected').siblings('li').removeClass('selected');
            var targetValue = $this.data('value');
            var targetAlias = $this.data('alias');
            if(!targetAlias){
                targetAlias = targetValue;
            }
            $this.parents('.dropMenu').removeClass('open').find('button').attr('aria-expanded',"true").find('.text').html(targetAlias);
            if(targetValue != currentValue){
                $this.parents('.dropdown-menu').trigger('change.shenjian',[targetValue]);
            }
            if($this.parents(".select-old-config").length>0){
                var type = $this.data('value');
                if($this.is('.blank')){
                    $('.select-db-type button').removeClass("disabled");
                    $('.charset button').removeClass("disabled");
                    return;
                }
                loadDbConfig(type);
            }
        });
        //0.3、切换数据库类型事件
        $("#connect-stack").on("stackChange.shenjian",function (event,targetTab, targetLayer, sourceTab, sourceLayer) {

            //1、清空操作日志
            $(".operation-log textarea").val('');
            //1.2、删除数据库名称和可选列表
            $(".db-name-list .dropdown-menu").empty();
            $(".db-name-list [name='database']").val('');
        });
        //0.4、下一步上一步
        $(".config-taskbar a").on('click',function () {
            var sectionList = $(".step-list >section");
            var currentIndex = sectionList.index($(".step-list >section.active"));
            var nextIndex = currentIndex+1;
            let currentStep = $(".step-list section.active");

            if($(this).is('.btn-next')){
                //检查
                if(currentStep.is('.step-config-connnect')){
                    //检查表单是否填写完整
                    let result = checkConfirConnect();
                    if(!result){
                        return ;
                    }
                    //重置下一页
                    resetMappingPage()

                    //判断显示选择数据表
                    var type = $(".setting.select-db-type .stack-tab.active").data('value');
                    if(type=='mongodb'){
                        $(".select-table .dropMenu").hide().siblings('input').show();
                        $("#mapping-table").removeClass('active').siblings('table').addClass('active');
                    }else {
                        $(".select-table .dropMenu").show().siblings('input').hide();
                        $("#mapping-table").addClass('active').siblings('table').removeClass('active');
                    }
                    //测试连接
                    $(".operation-log textarea").val('');
                    var dbConfig = getConnectConfig();
                    if(!dbConfig){
                        return;
                    }
                    var p = new Publish(type, dbConfig);
                    p.connect().then((data) => {
                        if(nextIndex == sectionList.length-1){
                            $(this).addClass('hide');
                            $(".config-taskbar .btn-export").removeClass('hide')
                        }
                        $(".config-taskbar .btn-prev").removeClass('hide');
                        sectionList.eq(nextIndex).addClass('active').siblings('section').removeClass('active');

                        var configs =  $(".select-old-config li.selected").data("config");
                        if(configs){
                            var table = configs.dbConfig.tableName;
                            var template = configs.template;
                            $(".select-table button .text").html(table);
                            $('[name="table-name"]').val(table);
                            getColumnsInfo(table).then((fieldInfo)=>{
                                Publish.templatekey=fieldInfo;
                                shenjian.send('UpdateFieldList',fieldInfo,'FieldList');
                                var $table = $(".table.active");
                                for(var t in template){

                                    var tr = $table.find("tr[data-alias='"+template[t]+"']");
                                    tr.find('button .text').html(t);
                                    tr.find('td input').val(t);

                                    tr.find('td.field-type').html(fieldInfo[t]);
                                }
                            });
                        }
                        p.close();
                    }).catch((err) => {
                        p.close();
                    }).catch((err)=>{
                        console.log(i18n.__("db_connect_error")+":"+err)
                    });
                }
                else if(currentStep.is('.step-field-mapping')){
                    //是否填表
                    let tableName = $('.select-table .text').html().trim();
                    if(tableName==i18n.__("db_table_choose")){
                        tableName = $("input[name='table-name']").val();
                        if(!tableName){
                            $.toast(i18n.__("db_table_choose_toast"));
                            return;
                        }
                    }
                    if(nextIndex == sectionList.length-1){
                        $(this).addClass('hide');
                        $(".config-taskbar .btn-export").removeClass('hide')
                    }
                    $(".config-taskbar .btn-prev").removeClass('hide');
                    sectionList.eq(nextIndex).addClass('active').siblings('section').removeClass('active');

                }
            }
            else if($(this).is('.btn-prev')){
                if(currentIndex==0){
                    return;
                }
                $(".config-taskbar .btn-export").addClass('hide');

                var preIndex = currentIndex-1;
                if(preIndex==0){
                    $(this).addClass('hide');
                }
                $(".config-taskbar .btn-next").removeClass('hide');
                sectionList.eq(preIndex).addClass('active').siblings('section').removeClass('active');
            }
            else if($(this).is('.btn-export')){
                //开始导出
                var type = $(".setting.select-db-type .stack-tab.active").data('value');
                //1、表名
                let tableName = $('.select-table .text').html().trim();
                if(type == 'mongodb'){
                    tableName = $('.select-table input').val();
                }
                //2、整理字段映射map
                // makeMapping();
                //3、开始导出
                readyPublish(tableName);
            }
        });

        //1、获取数据库列表
        $(".db-name-list button").on('click',function (e) {
            var $listWrap = $(".db-name-list .dropdown-menu");
            $listWrap.empty();
            //如果是mongodb提示用户输入
            var type = $(".setting.select-db-type .stack-tab.active").data('value');
            if(type=='mongodb'){
                e.preventDefault();
                $.toast(i18n.__("dbname_input_toast"));
                return;
            }else{
                var result = getDbNameList();
                if(result===false){
                    return;
                }else{
                    result.then((list)=>{
                        for(let i in list){
                            var li = `<li data-value="`+list[i]+`"><a class="dropdown-item" href="#">`+list[i]+`</a></li>`
                            $listWrap.append($(li));
                        }
                    });
                }
            }
        });
        //1.1、可输入选择列表---选择数据库名称
        $(".db-name-list .dropdown-menu").on('mouseup','li',function () {
            $(this).addClass('selected').siblings('li').removeClass('selected');
            $(this).parents('.input-group').find('input').val($(this).data('value'));
        });
        //1.2、测试连接
        $(".test-db-connect").on('click',function () {
            $(this).addClass('submit-running').find('span').html(i18n.__("db_connecting"));
            $(".operation-log textarea").val('');
            testConnect(()=>{
                setTimeout(()=>{
                    $(this).removeClass('submit-running').find('span').html(i18n.__("db_connect"));
                },500)
            });
        });
    }


    function loadDbConfig(name) {
        var configs =  $(".select-old-config li.selected").data("config");
        var dbType = configs.dbType;
        var li =  $('.select-db-type li[data-value="'+dbType+'"]');
        li.trigger('mouseup');
        $('.select-db-type .text').html(li.data('alias'));
        $("#connect-stack").stack().showStack(dbType);
        var dbConfig = configs.dbConfig;
        var layer = $(".inputs-connect-info .stack-layer.active");
        layer.find("input[name='host']").val(dbConfig.host);
        layer.find("input[name='port']").val(dbConfig.port);
        layer.find("input[name='username']").val(dbConfig.username);
        layer.find("input[name='password']").val(dbConfig.password);
        $('.charset button .text').html(dbConfig.charset);
        $('.db-name-list input[name="database"]').val(dbConfig.database);
        $('.select-db-type button').addClass("disabled");
        $('.charset button').addClass("disabled");

    }

    function resetMappingPage() {
        $(".select-table .dropdown-menu").empty();
        $(".select-table button .text").html(i18n.__("db_choose"));
        $(".select-table [name='table-name']").val('');

        $(".make-mapping button .text").html('');
        $(".make-mapping td.field-type").html('');
        $(".make-mapping td input").val('');

        $(".make-mapping").find('input[data-toggle="icheck"]').iCheck('uncheck')
    }
    function getConnectConfig() {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');

        var $sectionLayer = $(".step-config-connnect .stack-layer.active");
        var host     = $sectionLayer.find("input[name='host']").val();
        var port     = $sectionLayer.find("input[name='port']").val();
        var username = $sectionLayer.find("input[name='username']").val();
        var password = $sectionLayer.find("input[name='password']").val();

        var $charset = $sectionLayer.find(".charset li.selected");
        var charset  = $charset.length ? $charset.data('value'):'';

        var database = $(".step-config-connnect .db-name-list").find("input[name='database']").val() || '';

        var config = {
            host: host,
            port: port,
            username: username,
            password: password,
            charset : charset,
            database: database
        }
        if(!charset){
            delete config.charset;
        }
        if(!database){
            delete config.database;
        }

        if(!config.host||!config.password||(!config.username&&!config.user)){
            $.toast(i18n.__("db_info_completed"));

            return false;
        }
        return config;
    }

    function getDbNameList() {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        if(!dbConfig){
            return false;
        }
        $(".operation-log textarea").val('');
        var p = new Publish(type, dbConfig);
        return p.connect().then((data) => {
            return p.getDbNameList().then((list)=>{
                p.close();
                return list;
            });
        }).catch((err) => {
            $(".operation-log textarea").val(i18n.__("db_info_wrong_toast"));
            p.close();
            return [];
        });
    }
    function testConnect(finishFun) {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        if(!dbConfig){
            if(typeof finishFun == 'function'){
                finishFun();
            }
            return;
        }
        var p = new Publish(type, dbConfig);
        p.connect().then((data) => {
            $(".operation-log textarea").val(i18n.__("db_connection_successful"));
            p.close();
        }).catch((err) => {
            $(".operation-log textarea").val(i18n.__("db_info_wrong_toast"));
            p.close();
        }).then(()=>{
            if(typeof finishFun == 'function'){
                finishFun();
            }
        })
    }
    function checkConfirConnect() {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        if(!dbConfig){
            return false;
        }
        if(!dbConfig.database){
            $.toast(i18n.__("db_choose_toast"));
            return false;
        }
        var p = new Publish(type, dbConfig);
        return p.connect().then((data) => {
            p.close();
            return true;
        }).catch((err) => {
            $(".test-db-connect").removeClass('submit-running').find('span').html(i18n.__('db_test_connect'));
            $(".operation-log textarea").val(i18n.__('db_connect_error')+":"+err.message);
            $.toast(i18n.__('info_confirm_toast'));
            p.close();
            return false;
        });
    }

    function getTableNameList() {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        if(!dbConfig){
            return;
        }
        var p = new Publish(type, dbConfig);
        return p.connect().then((data) => {
            return p.getTableList().then((list)=>{
                p.close();
                return list;
            });
        }).catch((err) => {
            p.close();
            return [];
        });
    }
    function getColumnsInfo(tableName){
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        var p = new Publish(type, dbConfig);
        return p.connect().then((data) => {
            return p.getColumnsInfo(tableName).then((list)=>{
                p.close();
                return list;
            });
        }).catch((err) => {
            p.close();
            return {};
        });
    }
    function runPublish(publish, tableName, offset=0) {
        pouch.allDocs({
            "skip": offset, "limit": 1,
            include_docs: true,
            attachments:true,
            binary:true
        }, (err, res) => {
            if(err){
                $(".publish-log .log-wrapper .success-info").after(`<p>`+i18n.__('export_db_error_stopped')+`</p>`);
                publish.close();
                return false;
            }
            if (res) {
                var tol = res.total_rows;
                offset++;
                if (offset <= tol) {
                    var doc = res.rows[0].doc;
                    if(!doc.outputs){
                        runPublish(publish, tableName, offset);
                        return;
                    }
                    delete doc['src'];
                    delete doc['_id'];
                    delete doc['_rev'];
                    if(doc['_attachments']){//处理附件
                        doc.attachments = [];
                        for(let i in doc['_attachments']){
                            let reader = new FileReader();
                            reader.onload = function () {
                                doc['_attachments'][i]['data'] = Buffer.from(reader.result);
                                doc['_attachments'][i]['file_name'] = i;
                                doc.attachments.push(doc['_attachments'][i]);
                                delete doc['_attachments'][i];
                                if(Object.keys(doc['_attachments']).length===0){
                                    delete doc['_attachments'];
                                    publishOne(publish,doc,tableName,offset);
                                }
                            };
                            reader.readAsArrayBuffer(doc['_attachments'][i]['data']);
                        }
                    }else{
                        publishOne(publish,doc,tableName,offset);
                    }
                } else {
                    $('.btn-export,.btn-prev').removeClass('submit-running');
                    $(".publish-log .log-wrapper .success-info").after(`<p>`+i18n.__('export_completed')+`</p>`);
                    publish.close();
                    return true;
                }
            }
        });
    }

    function publishOne(publish,doc,tableName,offset){
        publish.write(doc,tableName).then((data)=>{
            if(data.status==1){
                //出错了
                if(!Publish.ignoreError){
                    $(".publish-log .log-wrapper .success-info").after.prepend(`<p>`+i18n.__('export_error_stopped')+``+data.error+`</p>`);
                    return false;
                }else{
                    $(".publish-log .log-wrapper .success-info").after(`<p>`+i18n.__('export_di')+offset +i18n.__('export_error_ignored')+`/p>`);
                    runPublish(publish,tableName,offset);
                }
            }else{
                publishCount++;
                $(".publish-log .log-wrapper .success-info").html(i18n.__('export_success')+'<span class="offset">'+publishCount+'</span>'+i18n.__('export_tiao'));
                runPublish(publish, tableName, offset);
            }
        })
    }

    function readyPublish(tableName) {
        var type = $(".setting.select-db-type .stack-tab.active").data('value');
        var dbConfig = getConnectConfig();
        var p = new Publish(type, dbConfig);

        var ignoreError = !!$(".step-ready-publish .icheckbox.checked").length;
        Publish.ignoreError = ignoreError;

        var $uniqueCheck = $("#mapping-table .icheckbox.checked");
        if(type=='mongodb'){
            $uniqueCheck = $("#mapping-table-mongo .icheckbox.checked");
        }
        if($uniqueCheck.length>0){
            var fields = $uniqueCheck.parents('.table').find('tr').map(function () {
                if($(this).find(".icheckbox.checked").length){
                    return $(this).data("alias");
                }
            }).get();
        }
        p.connect().then((data) => {
            //连接成功
            $('.btn-export,.btn-prev').addClass('submit-running')
            runPublish(p,tableName,0)
        }).catch((err) => {
            $('.btn-export,.btn-prev').removeClass('submit-running')
            p.close();
        }).catch((err) => {
            console.log(err);
        });
    }

});
