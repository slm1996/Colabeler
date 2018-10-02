/**
 * Created by wutong on 2018/1/20.
 */
(function($) {
    var InputFolder = function(element){
        this.initWithValue = function(folderValue, wrapper){
            wrapper.append("<span class='folder-path-value'>"+folderValue+"</span> <label>...</label><input type='file'/>")
            return wrapper.find("input[type='file']").on("change",function(e) {
                var files = e.target.files; // File list
                if(files.length > 0){
                    var fpath = files[0].path;
                    wrapper.find(".folder-path-value").text(fpath);
                    element.val(fpath);
                }
            })
        };
    }
    $.fn.inputFolder = function(isFolder){
        var args = arguments;
        this.each(function(){
            var $this = $(this);
            var inputFolder = false;
            if(args.length === 1 && typeof args[0] === "string"){
                inputFolder = $this.data("inputFolder");
                if(typeof inputFolder !== "undefined"){
                    inputFolder.action(args[0]);
                    return ;
                }
            }
            if($this.data("inputFolder")){
                return true;
            }
            if(!inputFolder){
                inputFolder = new InputFolder($this);
                $this.data("inputFolder",inputFolder);
            }
            var wrapper = $("<div class='form-control-folder'></div>");
            $this.attr("type","hidden");
            $this.wrap(wrapper);
            wrapper = $this.parent();
            var fileInput = inputFolder.initWithValue($this.val(), wrapper);
            if(isFolder){
                fileInput.prop("webkitdirectory",true);
            }else if(typeof $this.attr("accept") != "undefined"){
                fileInput.attr("accept",$this.attr("accept"));
            }
        });
    };
})(jQuery);
//FIXME 兼容更多数据输入情况
$("input[data-toggle^='input.folder']").inputFolder(true);
$("input[data-toggle^='input.file']").inputFolder(false);