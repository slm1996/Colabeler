/**
 * Created by wutong on 2016/11/21.
 */
+function ($) {
    'use strict';
    var Dialog = {
        modal:null,
        options:null,
        init: function (options) {
            this.prepareOptions(options, $.dialog.options);
            if(this.options.selector !== ""){
                var selector = this.options.selector;
                var prefix = "";
                var parse = "";
                if(selector.indexOf("//") === 0){
                    parse = selector.split('/');
                    selector = parse.pop();
                    parse = parse.join('/')+'/';
                }
                if(selector.indexOf("#") !== 0){
                    selector = "#"+selector;
                }
                var modal = $(selector);
                if(modal.length == 0){
                    this.setupLoading(selector);
                    var $that = this;
                    //动态请求dialog
                    var url = shenjianshou.url("dialog","&dialog_id="+parse+selector.substr(1));
                    if(typeof options.url == "string"){
                        url = options.url;
                    }
                    $.get(url,function (data) {
                        var dialogHtml = $(data);
                        var dialogContents = dialogHtml.find(".modal-content");

                        dialogContents.addClass("stack-layer");
                        var dialogContainer = $that.modal.find(".modal-dialog");
                        dialogContainer.append(dialogContents);
                        $that.modal.attr("id",selector.substr(1));

                        shenjianshou.toggleData($that.modal);
                        $that._onLoad();

                        dialogContents.find("[stack-target]").on("click",function(){
                            var stackTarget = $(this).attr("stack-target");
                            $that._stackTo(stackTarget);
                        });
                        $that._stackTo($that.options.stack);
                    });
                }else{
                    this.modal = modal;
                    if(this.modal.attr("for") === "ajax"){
                        this._stackTo(this.options.stack);
                    }else{
                        //如果不是ajax 则可能是渲染出的dialog 则调用onload
                        this._onLoad();
                    }
                }
            }else{
                this.setupCommon();
                this._bindEvents();
                this._onLoad();
            }
            if (options.backdrop == "static"){
                this.modal.attr('data-backdrop','static');
            }
            if(options.keyboard === false){
                this.modal.attr('data-keyboard', false);
            }
            this._packageModal();
            this.show();
            return this.modal;
        },
        prepareOptions: function(options, options_to_extend) {
            var _options = {};
            if(typeof(options) === "string" && options.indexOf("#") === 0){
                _options.selector = options;
            } else if ( ( typeof options === 'string' ) || ( options instanceof Array ) ) {
                _options.text = options;
            } else {
                _options = options;
            }
            this.options = $.extend( {}, options_to_extend, _options );
        },
        setupCommon: function () {
            this.modal = $("#dialog-jquery-common");
            if(this.modal.length === 0){
                var dialogHtml =  '<div class="modal fade" tabindex="-1" role="dialog" id="dialog-jquery-common">'
                    + '  <div class="modal-dialog">'
                    + '    <div class="modal-content">'
                    + '      <div class="modal-header">'
                    + '        <div class="modal-title">'
                    + '          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
                    + '          <h4 class="dialog-title"></h4>'
                    + '        </div>'
                    + '      </div>'
                    + '      <div class="modal-body dialog-text">'
                    + '      </div>'
                    + '      <div class="modal-footer">'
                    + '        <a class="btn btn-gray btn-cancel">  </a>'
                    + '        <a class="btn btn-primary btn-confirm">  </a>'
                    + '      </div>'
                    + '    </div>'
                    + '  </div>'
                    + '</div>';
                this.modal = $(dialogHtml);
                $('body').append(this.modal);
            }
            this.modal.find(".dialog-title").text(this.options.title);

            if(this.options.cancelButton !== null){
                this.modal.find(".btn-cancel").css("display","");
                this.modal.find(".btn-cancel").html(this.options.cancelButton);
            }else{
                this.modal.find(".btn-cancel").css("display","none");
            }

            if(this.options.confirmButton !== null){
                this.modal.find(".btn-confirm").css("display","");
                this.modal.find(".btn-confirm").html(this.options.confirmButton);
            }else{
                this.modal.find(".btn-confirm").css("display","none");
            }


            var dialogText = this.modal.find(".dialog-text");

            if(this.options.html){
                dialogText.html(this.options.text);
            }else{
                dialogText.html("<p>"+this.options.text+"</p>");
            }
            if(this.options.closable){
                this.modal.find(".close").css("display","");
            }else{
                this.modal.find(".close").css("display","none");
            }
            this.modal.find(".modal-dialog").css("width",this.options.width);
            if(this.options.height !== -1){
                this.modal.find(".modal-dialog").css("height",this.options.height);
            }

            this.modal.find(".modal-content").css("width",this.options.width);
            if(this.options.height !== -1){
                this.modal.find(".modal-content").css("height",this.options.height);
            }

        },
        setupLoading: function(selector){
            this.modal = $("#dialog-jquery-loading");
            if(this.modal.length === 0){
                var dialogHtml = '<div class="modal modal-ajax fade" tabindex="-1" role="dialog" id="dialog-jquery-loading" for="ajax">'
                    + '  <div class="modal-dialog">'
                    + '    <div class="modal-content stack-layer active overlay">'
                    + '    </div>'
                    + '  </div>'
                    + '</div>';
                this.modal = $(dialogHtml);
                $('body').append(this.modal);
            }
        },
        _bindEvents:function(){
            var that = this;
            var btnCancel = this.modal.find(".btn-cancel");
            btnCancel.attr("href","javascript:void(0);");
            btnCancel.off();
            if(typeof(this.options.onCancelled) === "function"){
                btnCancel.on("click",function(){
                    this._onCancelled = that.options.onCancelled;
                    this._onCancelled(that);
                });
            }else if(typeof(this.options.onCancelled) === "string"){
                btnCancel.attr("href",this.options.onCancelled);
            }else{
                btnCancel.on("click",function(){
                    //default close it
                    that.hide();
                });
            }
            var btnConfirm = this.modal.find(".btn-confirm");
            btnConfirm.attr("href","javascript:void(0);");
            btnConfirm.off();
            if(typeof(this.options.onConfirmed) === "function"){
                btnConfirm.on("click",function(){
                    this._onConfirmed = that.options.onConfirmed;
                    this._onConfirmed(that.modal);
                });
            }else if(typeof(this.options.onConfirmed) === "string"){
                btnConfirm.attr("href",this.options.onConfirmed);
            }else{
                btnConfirm.on("click",function(){
                    //default close it
                    that.hide();
                });
            }

            this.modal.off("hidden.bs.modal");
            if(typeof this.options.onClosed === 'function'){
                that.modal.on('hidden.bs.modal',function() {
                    that.modal.trigger("dialog.hidden");
                    that.options.onClosed(that.modal);
                });
            } else if(!that.modal.is(":hidden")){
                that.hide();
            }

        },
        _onLoad:function(){
            if(this.modal.data("loaded") != "loaded"){
                if(typeof this.options.onLoaded === "function"){
                    this.modal._onLoaded = this.options.onLoaded;
                    this.modal._onLoaded(this.modal);
                }
                // this.modal.data("loaded","loaded");
            }
        },
        _packageModal:function(){
            if(typeof this.modal.data("dialog") == "undefined"){
                this.modal.data("dialog",this);
            }

        },
        _stackTo:function(to){
            var fromContent = this.modal.findUntil('.stack-layer',".stack,[data-toggle='stack']");
            var toContent = null;
            if(typeof to === "number"){
                toContent = this.modal.findUntil(".stack-layer:nth-child("+(to+1)+")",".stack,[data-toggle='stack']");
            }else{
                toContent = this.modal.findUntil("#"+to+".stack-layer",".stack,[data-toggle='stack']");
            }
            //执行切换动画
            fromContent.removeClass("active");
            var options = {
                width:toContent.css("width"),
                height:toContent.css("height")
            };
            this.modal.trigger('beforeShowDialog.shenjianshou',[$(this.modal),toContent,options]);
            this.modal.find(".modal-dialog").animate(options,function () {
                toContent.addClass("active");
            });

        },
        show:function(options){
            var modal = this.modal;
            if(typeof options === "undefined"){
                modal.modal("show");
                modal.on('hidden.bs.modal',function() {
                    modal.trigger("hidden.dialog");

                })
            }else if(typeof options === "object"){
                this.init(options);
            }else{
                this._stackTo(options);
                modal.modal("show");
            }
        },
        hide:function(){
            this.modal.modal("hide");
        }

    };
    $.dialog = function(options) {
        var dialog = Object.create(Dialog);
        return dialog.init(options);
    };

    $.dialog.options = {
        text: '',
        title: '提示',
        confirmButton:"确认",
        cancelButton:"取消",
        onLoaded:false,
        onConfirmed: false,
        onCancelled: false,
        onClosed: false,
        closable: true,
        selector: "",
        width:350,
        height:-1,//auto height
        html:false,
        url:false,
        stack:1,
        backdrop:true,
        keyboard:true
    };

    $.fn.showDialog = function(options){
        //QUICK FIX SELECT2 SEARCH
        $.fn.modal.Constructor.prototype.enforceFocus = function () {};
        var dialog = this.data("dialog");
        if(typeof dialog !== "undefined"){
            if(typeof options == "object"){
                options.selector = this.selector;
            }
            dialog.show(options);
            return dialog;
        }else{
            if(typeof options === "undefined"){
                options = {};
            }else if(typeof options === "string"){
                options = {
                    stack:options
                }
            }
            options.selector = this.selector;
            return $.dialog(options);
        }
    }

    $.fn.hideDialog = function(){
        var dialog = this.data("dialog");
        if(typeof dialog !== "undefined"){
            dialog.hide();
            return dialog;
        }
    }


    window.alert = function(text){
        $.dialog({
            text:text,
            cancelButton:null
        });
    };
}(jQuery);


