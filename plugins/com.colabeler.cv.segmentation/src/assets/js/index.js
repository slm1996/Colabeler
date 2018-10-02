/**
 * Created by wutong on 2018/1/20.
 */
var classify_values = [];
var canvasHTML = `<canvas class="shape"></canvas>`;

var valueItem = "";

var drawingType = "paint";
var preview = null;
var overlay = null;
var img = null;
var canvas =  null;
var resultList = null;
var brushControl = null;
var cursor = null;


var currIndex = 0;
var currColor = "#333";
var currSize = 10;
var currShape = false;
var currCanvas = false;
var currCtx = false;

var setCurrIndex = function(index){
    currIndex = index;
    currShape = overlay.children(".shape").eq(index);
    if(currShape.length > 0){
        currCtx = currShape[0].getContext('2d');
        resultList.children("li.selected").removeClass("selected");
        var li = resultList.children("li").eq(index);
        li.addClass("selected");
        currColor = li.find(".color-box").css("background-color");
    }else{
        currCtx = null;
        currColor = "#333";
    }

}
var setCurrColor = function(color){
    currColor = color;
    cursor.css("background-color",color);
    resultList.children("li").eq(currIndex).find(".color-box").css("background-color",color);
};
var setCurrSize = function(size){
    if(size > 0){
        currSize = size;
        brushControl.find(".size").text(currSize);
        cursor.css("width",size).css("height",size).css("margin-left",-currSize/2).css("margin-top",-currSize/2);
    }
};

var startMoving = function(){
    stopDrawing();
    overlay.addClass("movable");
    preview.addClass("movable");
};
var stopMoving = function(){
    preview.removeClass("movable");
    overlay.removeClass("movable");
};
var isMoving = function(){
    return overlay.hasClass("movable");
};
var startDrawing = function(){
    stopMoving();
    overlay.addClass("drawable");
    preview.addClass("drawable");
};
var stopDrawing = function(){
    preview.removeClass("drawable");
    overlay.removeClass("drawable");

};
var isDrawing = function(){
    return overlay.hasClass("drawable");
};
var colorHash = new ColorHash();

var createValueItem = function(name){
    //右侧创建一个新的select
    var item = valueItem.clone().appendTo(resultList);
    var select2 =  item.find("select").select2({
        minimumResultsForSearch: Infinity,
        templateResult: function(state){
            if (state.text === plugin.i18n.getString("page_select2_input")) {
                var $state = $(
                    '<img class="option-img" src="./assets/image/pencil.svg" /><span class="option-input">' + state.text + "</span>"
                );
                return $state;
            }
            return state.text;
        }
    }).on("select2:select",function(){
        var $this = $(this);
        var value = $this.val();
        var targetInput = $this.siblings(".select-input");
        if(value === plugin.i18n.getString("page_select2_input")){
            targetInput.val("").removeClass("hidden").focus();
        }else{
            targetInput.val(value).addClass("hidden").trigger("change");
        }
    });
    var selectInput = item.find(".select-input").on("click",function(){
        $(this).prevAll("select").select2("open");
    })
    if(name){
        selectInput.val(name);
        if(classify_values.indexOf(name) !== -1){
            //不在选项中
            selectInput.addClass("hidden");
            select2.val(name).trigger('change.select2');;
        }
    }
    setCurrIndex(resultList.children("li").length - 1);
}

document.addEventListener("stage-ready",function(ev){
    valueItem = $(`<li><span class="color-box"></span><div class="select-box"><select>
<option>${plugin.i18n.getString("page_select2_input")}</option>
<optgroup label="${plugin.i18n.getString("page_select2_predefined")}">
 </optgroup>
</select>
<input class='select-input' placeholder='${plugin.i18n.getString("page_select2_input")}' value='' /></div>
<span class="item-remove"><i class="fs fs-close"></i></span>
</li>`);
    var data = ev.detail;
    classify_values = data.classify_value.split(",");
    classify_values.forEach(function(classify_value){
        valueItem.find("optgroup").append("<option value='"+classify_value+"'>"+classify_value+"</option>")
    });

    //默认开启selected模式
    preview = $("#preview");
    overlay = $("#overlay");
    canvas =  $("#canvas");
    resultList = $("#result-list");
    brushControl = $("#brush-controls");
    cursor = $("#cursor");
    img = canvas.children("img")


    $("#result-header").text(plugin.i18n.getString("page_result_title"));
    $("#result-footer").text(plugin.i18n.getString("page_result_add"));
    /***********************************************
     *
     * 处理放缩导致的位置问题
     *
     **********************************************/
    $.fn.sattr = function(name,value){
        var scale = img.data("scale");
        if(name == "d" && this.is("path")){
            //special for path
            this.data(name,value.replace(/(\d+) (\d+)/g,function(match,p1,p2){
                return parseInt(parseInt(p1) / scale) + " " + parseInt(parseInt(p2) / scale);
            }));
        }else{
            this.data(name,parseInt(value/scale));
        }

        return this.attr(name,value)
    }
    $.fn.scss = function(name,value){
        var scale = img.data("scale");
        this.data(name,parseInt(value/scale));
        return this.css(name,value)
    }


    var imageSizeUpdated = function(){
        //重新设置真实的样子
        let width = img.width();
        let height = img.height();
        let naturalWidth = img[0].naturalWidth;
        let naturalHeight = img[0].naturalHeight;

        let scale = width/naturalWidth;
        img.data("scale",scale);
        overlay.children(".shape").each(function(){
            var canvas = $(this)[0];
            canvas.width = width;
            canvas.height = height;
        })
        overlay.css("width",width).css("height",height)
            .css("left",img.position().left/currScale).css("top",img.position().top/currScale).removeClass("loading");
    }

    img.on("load",imageSizeUpdated);
    $(window).on("resize",imageSizeUpdated);

    /*********************************************
     *
     * 画笔大小控制
     *
     *******************************************/
    (function paintSizeControl(){
        canvas.on("mouseover",function(){
            cursor.css("display","block");
        }).on("mouseout",function(){
            cursor.css("display","none");
        }).on("mousemove",function(ev){
            cursor.css("left",(ev.pageX-canvas.position().left)/currScale).css("top",(ev.pageY-canvas.position().top)/currScale);
        })
    })();



    /*********************************************
     *
     * 鼠标效果
     *
     *******************************************/
    (function paintSizeControl(){
        brushControl.on("click",".btn-big",function(){
            setCurrSize(currSize+1);
        }).on("click",".btn-small",function(){
            setCurrSize(currSize-1);
        })
    })();



    var overlayOffset = {};

    $("#result-footer").on("click",function(){
        currShape = $(canvasHTML).appendTo(overlay);
        currCanvas = currShape[0];
        createValueItem();

        currCanvas.width = overlay.width();
        currCanvas.height = overlay.height();
        currCtx = currCanvas.getContext('2d');
        setCurrColor("#333");
        plugin.toolbar.select("paint");
        drawingType == "paint";
    });


    /*********************************************
     *
     * 涂抹色块
     *
     *******************************************/
    (function enablePaintDrawing(){
        var painting = false;
        let x = 0;
        let y = 0;
        let lastX = 0;
        let lastY = 0;
        overlay.on("mousedown",function(ev){
            if(isDrawing()){
                overlayOffset = overlay.offset();
                if(!currCtx){
                    currShape = $(canvasHTML).appendTo(overlay);
                    currCanvas = currShape[0];
                    createValueItem();
                    currCanvas.width = overlay.width();
                    currCanvas.height = overlay.height();
                    currCtx = currCanvas.getContext('2d');
                    setCurrColor("#333");
                }
                if(drawingType == "eraser"){
                    currCtx.globalCompositeOperation = "destination-out";
                    currCtx.strokeStyle = "rgba(0,0,0,1)";
                }else if(drawingType == "paint"){
                    currCtx.globalCompositeOperation = "source-over";
                    currCtx.strokeStyle = currColor;
                }
                currCtx.lineWidth = currSize;
                currCtx.lineCap = "round";
                currCtx.lineJoin = "round";
                painting = true;
                [lastX, lastY] = [ev.pageX-overlayOffset.left, ev.pageY-overlayOffset.top];
            }
        }).on("mousemove",function(ev){
            if(painting){
                x = ev.pageX-overlayOffset.left;
                y = ev.pageY-overlayOffset.top;
                currCtx.beginPath();
                currCtx.moveTo(lastX/currScale, lastY/currScale);
                currCtx.lineTo(x/currScale, y/currScale);
                currCtx.stroke();
                [lastX, lastY] = [x, y];
            }
            ev.preventDefault();

        }).on("mouseup mouseout",function(ev) {
            painting = false;


        });
    })();

    /****************
     *
     * 移动背景图像
     *
     **************/
    (function enableCanvasMoving() {
        var moveCanvas = false;
        var canvasX = 0;
        var canvasY = 0;
        var canvasLeft = 0;
        var canvasTop = 0;
        canvas.on("mousedown", function (ev) {
            if (isMoving()) {
                moveCanvas = true;
                canvasX = ev.pageX;
                canvasY = ev.pageY;
                canvasLeft = parseInt(canvas.css("left").replace(/px$/, ""));
                canvasTop = parseInt(canvas.css("top").replace(/px$/, ""));
            }
        }).on("mousemove", function (ev) {
            if (moveCanvas) {
                canvas.css("left", ev.pageX - canvasX + canvasLeft).css("top", ev.pageY - canvasY + canvasTop);
                ev.stopImmediatePropagation();
                ev.preventDefault();
            }
        }).on("mouseup", function (ev) {
            if (moveCanvas) {
                moveCanvas = false;
            }
        })
    })();



    /****************
     *
     * 右侧标签与左侧的交互
     *
     **************/
    (function enableInteractive(){
        resultList.on("mouseover","li",function(ev){
            var index = $(ev.currentTarget).index();
            overlay.children(".shape").eq(index).addClass("active");
        }).on("mouseleave","li",function(ev){
            var index = $(ev.currentTarget).index();
            overlay.children(".shape").eq(index).removeClass("active");
        }).on("change",".select-input",function(ev){
            var input = $(ev.currentTarget);
            var index = input.parents("li").index();
            setCurrIndex(index);
            setCurrColor(colorHash.hex(input.val()));
            currCtx.globalCompositeOperation = 'source-atop';
            currCtx.fillStyle = currColor;
            currCtx.fillRect(0,0,currShape.width(), currShape.height());
        }).on("click", "li",function(ev){
            var target = $(ev.target);
            if(!target.is("i")){
                var index = $(ev.currentTarget).index();
                setCurrIndex(index);
            }
        }).on("click","i",function(ev) {
            var input = $(ev.currentTarget);
            var index = input.parents("li").index();
            if(confirm(plugin.i18n.getString("page_confirm_delete"))){
                resultList.children("li").eq(index).remove();
                overlay.children(".shape").eq(index).remove();
                if(currIndex >= index){
                    setCurrIndex(currIndex - 1);
                }
            }
        });
    })();

});

/********************************
 *
 *
 *   处理每次新元素入和出
 *
 *
 *******************************/
document.addEventListener("actor-will-enter",function(ev){
    var doc = ev.detail;
    var src = doc.src;
    var objects = doc.outputs.object;
    if (!src) {
        src = "file:///" + doc.path.replace(/\\/g,"/");
    }
    img.attr("src",src);
    overlay.children(".shape").remove();
    resultList.empty();
    if(objects){
        objects.forEach(function(object,index){
            currShape = $(canvasHTML).appendTo(overlay);
            currCanvas = currShape[0];
            createValueItem(object.name);
            let ctx = currCanvas.getContext('2d');
            currCtx = ctx;
            new Promise(function (resolve) {
                var reader = new FileReader();
                var blob = doc._attachments[(index+1)+'.png'].data;
                reader.onload = function (e){
                    resolve(reader.result);
                };
                reader.readAsDataURL(blob);
            }).then(function (dataurl) {
                var img_canvas = new Image();
                img_canvas.onload = function(){
                    img.one('load',function () {
                        ctx.drawImage(img_canvas,0,0,overlay.width(),overlay.height());
                    });
                    ctx.drawImage(img_canvas,0,0,overlay.width(),overlay.height());
                };
                img_canvas.src = dataurl;
            });
            setCurrColor(colorHash.hex(object.name));
        });
    }
    plugin.toolbar.select("paint");
    drawingType == "paint";
    currCtx = null;
    startDrawing();
});
document.addEventListener("actor-will-finish",function(ev){
    var doc = ev.detail;
    doc.outputs.object = [];
    doc.size ={
        width:img[0].naturalWidth,
        height:img[0].naturalHeight,
        depth:3
    };
    resultList.children("li").each(function(){
        var $this = $(this);
        var index = $this.index();
        var name = $this.find(".select-input").val();
        if(!name){
            $.toast(plugin.i18n.getString("page_notEmpty"));
            ev.preventDefault();
            return;
        }
        if(!doc['_attachments']) doc['_attachments'] = {};
        var canvas = overlay.children("canvas:eq("+index+")");
        doc.outputs.object.push({name:name});

        var resizedCanvas = document.createElement("canvas");
        var resizedContext = resizedCanvas.getContext("2d");

        resizedCanvas.height = doc.size.height;
        resizedCanvas.width = doc.size.width;

        resizedContext.drawImage(canvas[0], 0, 0, doc.size.width, doc.size.height);
        var imageData = resizedCanvas.toDataURL();

        var blob = dataURItoBlob(imageData)
        doc['_attachments'][(index+1)+'.png'] = {
            "content_type": "image/png",
            "data":blob
        };
    })
    function dataURItoBlob(dataURI) {
        var byteString = atob(dataURI.split(',')[1]);
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ab], {type: mimeString});
        return blob;

    }
});

/********************************
 *
 *
 *   快捷键处理
 *
 *
 *******************************/

var keydown = false;
$(document).on("keydown",function(ev){
    if(keydown){
        return;
    }
    if(ev.which == 32){
        keydown = true;
        //空格
        startMoving()
        plugin.toolbar.select("move");
    }else if(ev.which == 66){
        keydown = true;
        //B
        plugin.toolbar.deselect("eraser");
        plugin.toolbar.select("paint");
        drawingType = "paint";
    }else if(ev.which == 69){
        keydown = true;
        //E
        plugin.toolbar.deselect("paint");
        plugin.toolbar.select("eraser");
        drawingType = "eraser";
    }

});
$(document).on("keyup",function(ev){
    if(!keydown){
        return;
    }
    keydown = false;
    if(ev.keyCode == 32){
        //空格
        startDrawing()
        plugin.toolbar.deselect("move");
    }
});

/********************************
 *
 *
 *   按钮事件响应
 *
 *
 *******************************/
var currScale = 1;
document.addEventListener("stage-zoom",function(ev){
    currScale = ev.detail;
    if(currScale === false){
        canvas.css("left",0).css("top",0);
        currScale = 1;
    }
    canvas.css("transform","scale("+currScale+")");

});
document.addEventListener("toolbar-eraser-deselect",function(){
    plugin.toolbar.select("paint");
    drawingType = "paint";
});
document.addEventListener("toolbar-eraser-select",function(){
    plugin.toolbar.deselect("paint");
    drawingType = "eraser";
});
document.addEventListener("toolbar-paint-deselect",function(){
    plugin.toolbar.select("eraser");
    drawingType = "eraser";
});
document.addEventListener("toolbar-paint-select",function(){
    plugin.toolbar.deselect("eraser");
    drawingType = "paint";
});
document.addEventListener("toolbar-move-deselect",function(){
    startDrawing()
});
document.addEventListener("toolbar-move-select",function(){
    startMoving();
});