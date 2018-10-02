/**
 * Created by xl on 2016/12/12.
 * 图片上传
 */
jQuery.extend({
    createUploadIframe: function (id, uri)
    {
        //create frame
        var frameId = 'jUploadFrame' + id;

        if (window.ActiveXObject) {
            var io = document.createElement('<iframe id="' + frameId + '" name="' + frameId + '" />');
            if (typeof uri == 'boolean') {
                io.src = 'javascript:false';
            } else if (typeof uri == 'string') {
                io.src = uri;
            }
        } else {
            var io = document.createElement('iframe');
            io.id = frameId;
            io.name = frameId;
        }
        io.style.position = 'absolute';
        io.style.top = '-1000px';
        io.style.left = '-1000px';

        document.body.appendChild(io);

        return io;
    },
    createUploadForm: function (id, fileElementId)
    {
        //create form
        var formId = 'jUploadForm' + id;
        var fileId = 'jUploadFile' + id;
        var form = $('<form  action="" method="POST" name="' + formId + '" id="' + formId + '" enctype="multipart/form-data"></form>');
        var oldElement = $('#' + fileElementId);
        var newElement = $(oldElement).clone();
        $(oldElement).attr('id', fileId);
        $(oldElement).before(newElement);
        $(oldElement).appendTo(form);
        //set attributes
        $(form).css('position', 'absolute');
        $(form).css('top', '-1200px');
        $(form).css('left', '-1200px');
        $(form).appendTo('body');
        return form;
    },
    addOtherRequestsToForm: function (form, data)
    {
        // add extra parameter
        var originalElement = $('<input type="hidden" name="" value="">');
        for (var key in data) {
            name = key;
            value = data[key];
            var cloneElement = originalElement.clone();
            cloneElement.attr({'name': name, 'value': value});
            $(cloneElement).appendTo(form);
        }
        return form;
    },
    ajaxFileUpload: function (s) {
        // TODO introduce global settings, allowing the client to modify them for all requests, not only timeout
        s = jQuery.extend({}, jQuery.ajaxSettings, s);
        var id = new Date().getTime()
        var form = jQuery.createUploadForm(id, s.fileElementId);
        if (s.data)
            form = jQuery.addOtherRequestsToForm(form, s.data);
        var io = jQuery.createUploadIframe(id, s.secureuri);
        var frameId = 'jUploadFrame' + id;
        var formId = 'jUploadForm' + id;
        // Watch for a new set of requests
        if (s.global && !jQuery.active++)
        {
            jQuery.event.trigger("ajaxStart");
        }
        var requestDone = false;
        // Create the request object
        var xml = {};
        if (s.global)
            jQuery.event.trigger("ajaxSend", [xml, s]);
        // Wait for a response to come back
        var uploadCallback = function (isTimeout)
        {
            var io = document.getElementById(frameId);
            try
            {
                if (io.contentWindow)
                {
                    xml.responseText = io.contentWindow.document.body ? io.contentWindow.document.body.innerHTML : null;
                    xml.responseXML = io.contentWindow.document.XMLDocument ? io.contentWindow.document.XMLDocument : io.contentWindow.document;

                } else if (io.contentDocument)
                {
                    xml.responseText = io.contentDocument.document.body ? io.contentDocument.document.body.innerHTML : null;
                    xml.responseXML = io.contentDocument.document.XMLDocument ? io.contentDocument.document.XMLDocument : io.contentDocument.document;
                }
            } catch (e)
            {
                jQuery.handleError(s, xml, null, e);
            }
            if (xml || isTimeout == "timeout")
            {
                requestDone = true;
                var status;
                try {
                    status = isTimeout != "timeout" ? "success" : "error";
                    // Make sure that the request was successful or notmodified
                    if (status != "error")
                    {
                        // process the data (runs the xml through httpData regardless of callback)
                        var data = jQuery.uploadHttpData(xml, s.dataType);
                        // If a local callback was specified, fire it and pass it the data
                        if (s.success)
                            s.success(data, status);

                        // Fire the global callback
                        if (s.global)
                            jQuery.event.trigger("ajaxSuccess", [xml, s]);
                    } else
                        jQuery.handleError(s, xml, status);
                } catch (e)
                {
                    status = "error";
                    jQuery.handleError(s, xml, status, e);
                }

                // The request was completed
                if (s.global)
                    jQuery.event.trigger("ajaxComplete", [xml, s]);

                // Handle the global AJAX counter
                if (s.global && !--jQuery.active)
                    jQuery.event.trigger("ajaxStop");

                // Process result
                if (s.complete)
                    s.complete(xml, status);

                jQuery(io).unbind()

                setTimeout(function ()
                {
                    try
                    {
                        $(io).remove();
                        $(form).remove();

                    } catch (e)
                    {
                        jQuery.handleError(s, xml, null, e);
                    }

                }, 100)

                xml = null;

            }
        };
        // Timeout checker
        if (s.timeout > 0)
        {
            setTimeout(function () {
                // Check to see if the request is still happening
                if (!requestDone)
                    uploadCallback("timeout");
            }, s.timeout);
        }
        try
        {
            // var io = $('#' + frameId);
            var form = $('#' + formId);
            $(form).attr('action', s.url);
            $(form).attr('method', 'POST');
            $(form).attr('target', frameId);
            if (form.encoding)
            {
                form.encoding = 'multipart/form-data';
            } else
            {
                form.enctype = 'multipart/form-data';
            }
            $(form).submit();

        } catch (e)
        {
            jQuery.handleError(s, xml, null, e);
        }
        if (window.attachEvent) {
            document.getElementById(frameId).attachEvent('onload', uploadCallback);
        } else {
            document.getElementById(frameId).addEventListener('load', uploadCallback, false);
        }
        return {abort: function () {}};

    },
    uploadHttpData: function (r, type) {
        var data = !type;
        data = type == "xml" || data ? r.responseXML : r.responseText;
        // If the type is "script", eval it in global context
        if (type == "script")
            jQuery.globalEval(data);
        // Get the JavaScript object, if JSON is used.
        if (type == "json")
        {
            // If you add mimetype in your response,
            // you have to delete the '<pre></pre>' tag.
            // The pre tag in Chrome has attribute, so have to use regex to remove
            var data = r.responseText;
            var rx = new RegExp("<pre.*?>(.*?)</pre>", "i");
            var am = rx.exec(data);
            //this is the desired data extracted
            var data = (am) ? am[1] : "";    //the only submatch or empty
            eval("data = " + data);
        }
        // evaluate scripts within html
        if (type == "html")
            jQuery("<div>").html(data).evalScripts();
        //alert($('param', data).each(function(){alert($(this).attr('value'));}));
        return data;
    },
    handleError: function (s, xhr, status, e) {
        if (s.error) {
            s.error.call(s.context || s, xhr, status, e);
        }
        if (s.global) {
            (s.context ? jQuery(s.context) : jQuery.event).trigger("ajaxError", [xhr, s, e]);
        }
    },
    httpData: function (xhr, type, s) {
        var ct = xhr.getResponseHeader("content-type"),
            xml = type == "xml" || !type && ct && ct.indexOf("xml") >= 0,
            data = xml ? xhr.responseXML : xhr.responseText;
        if (xml && data.documentElement.tagName == "parsererror")
            throw "parsererror";
        if (s && s.dataFilter)
            data = s.dataFilter(data, type);
        if (typeof data === "string") {
            if (type == "script")
                jQuery.globalEval(data);
            if (type == "json")
                data = window["eval"]("(" + data + ")");
        }
        return data;
    }
})

;(function ($) {
    'use strict';
    $.fn.extend({
        uploaderAjax: function (options,handlerSuccess) {
            var defaults = {
                url: "",
                name:"图片",
                size: 2097152,
                extension: "jpg,jpeg,png"
            };
            var self = this;
            if(typeof options === "string"){
                options = {url:options};
            }
            var options = $.extend(defaults, options);
            this.each(function(){
                function randomVersion(img){
                    return img+"?_="+new Date().getTime();
                }
                var fileInput = $(this);
                var name = fileInput.attr("name");
                var uploadName = name+"_holder";
                var value = fileInput.attr("value");
                var wrapper = $("<div class='uploader-ajax'></div>");
                fileInput.wrap(wrapper);
                wrapper = fileInput.parent();
                if(typeof value !== "undefined" && value != ""){
                    wrapper.addClass("uploaded");
                }
                fileInput.attr("type","hidden");
                var width = wrapper.width();
                var height = wrapper.height();
                var fontSize = height/2;
                var top = 0;
                if(width < height){
                    fontSize = width/2;
                    top = (height-width)/2;
                }
                var fileHidden = $("<input class='input-file' type='file' name='"+uploadName+"' id='"+uploadName+"' />");
                wrapper.append(fileHidden);
                var image = $("<img src='"+randomVersion(value)+"?'/>");
                wrapper.append(image)
                wrapper.append("<i class='fs fs-upload' style='font-size:"+fontSize+"px;top:"+top+"px'></i>")
                wrapper.append("<div class='loading'></div>");
                wrapper.append("<h3 class='title'>点击上传"+options.name+"</h3>")
                wrapper.append("<h3 class='loaded-title'><i class='fs fs-edit m-right-3'></i>编辑"+options.name+"</h3>")
                wrapper.append("<h3 class='loading-title'>"+options.name+"上传中...</h3>")

                var clickBox = $("<div class='uploader-click'></div>")
                wrapper.append(clickBox);

                clickBox.on("click",function(event){
                    event.stopPropagation();
                    if(!wrapper.hasClass("uploading")){
                        wrapper.find("#"+uploadName).click();
                    }
                });
                var fileChanged = function(event){
                    event.stopPropagation();
                    var file = $(this).val();
                    if (file == "") {
                        return false;
                    }
                    if (options.extension == "") {
                        toast("文件扩展名不能为空");
                        return false;
                    }
                    var reg = new RegExp(".(" + options.extension.replace(/,/g, "|") + ")$","i");
                    if (!reg.test(file)) {
                        toast("只能上传" + options.extension + "类型的文件");
                        $(this).val("");
                        return false;
                    }
                    if ($(this).get(0).files[0].size > options.size) {
                        var unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                        var i = Math.floor(Math.log(options.size) / Math.log(1024));
                        toast("文件大小不能超出" + (options.size / Math.pow(1024, i)) + unit[i] + "!");
                        $(this).val("");
                        return false;
                    }
                    $(event.target).off("change");
                    image.attr("src","");
                    fileInput.val("");
                    wrapper.addClass("uploading");

                    let md5 = require('md5')
                    let timestamp = (''+((new Date()).getTime())).substring(0,10);
                    let user_key = options.user_key;
                    let secret = options.secret;//'MwODk0OGY1NGYzNG-4f904c7cc33c58c'
                    let sign = (md5(user_key+timestamp+secret)).toLowerCase();

                    $.ajaxFileUpload({
                        fileElementId: uploadName, //文件上传域的ID
                        dataType: 'string', //返回值类型 一般设置为json
                        url: options.url + "&_file=" + uploadName +
                        '&timestamp='+timestamp+'&user_key='+user_key+'&sign='+sign, //用于文件上传的服务器端请求地址
                        secureuri: false, //是否需要安全协议，一般设置为false
                        success: function (data) {
                            data = JSON.parse(data);
                            if (data.result == 1 && data.data) {
                                image.attr("src",randomVersion(data.data));
                                fileInput.val(data.data);
                                wrapper.addClass("uploaded").parents(".form-group").removeClass("has-error");
                            } else {
                                toast(data.reason);
                            }
                            wrapper.removeClass("uploading");
                            wrapper.find("#"+uploadName).on("change",fileChanged);
                            if(typeof handlerSuccess == 'function'){
                                handlerSuccess(data);
                            }
                        },
                        error: function () {
                            toast("网络错误,上传失败");
                            wrapper.removeClass("uploading");
                            wrapper.find("#"+uploadName).on("change",fileChanged);
                        }
                    });
                }
                fileHidden.on("change",fileChanged);
            });
            return this;
        }
    })
})(jQuery);