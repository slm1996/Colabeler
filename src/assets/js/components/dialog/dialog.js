/**
 * Created by admin on 2017/11/29.
 */
+function ($) {
    'use strict';
    let Dialog = {
        options:{
            width: 450,
            height: 550,
            modal: false,
            frame: false,
            parent: null,
            resizable : false,
            transparent:true,
            minimizable:false,
            maximizable:false,
            closable : true,
            autoHideMenuBar:true,
            useContentSize: true,
            show:true
        },
        name:null,
        url:null,
        init:function (url, name, options) {
            let newOption = $.extend({},Dialog.options,options);
            if (url==undefined || typeof (url)!='string'){
                return false;
            }
            if (name==undefined || typeof (name)!='string'){
                name = '';
            }
            shenjian.openUrl(url, name, newOption);
        }
    };

    $.dialog = function(url, name, options) {
        let dialog = Object.create(Dialog);
        return dialog.init(url, name, options);
    };

}(jQuery);
