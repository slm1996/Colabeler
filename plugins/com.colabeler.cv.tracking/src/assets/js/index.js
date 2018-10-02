/**
 * Created by wutong on 2018/1/20.
 */
var classify_values = [];
var rectHTML = `<div class='shape rect' data-next="0">
<div class="circle left top"></div>
<div class="circle right top"></div>
<div class="circle right bottom"></div>
<div class="circle left bottom"></div>
</div>`;

var valueItem = "";
var lastValue = "";//初始化最后的分类

var overlay = null;
var canvas =  null;
var resultList = null;

var video = null;
var videoControl = null;
var currShape = false;
var forceRefresh = false;
var addKeyframe = function(currentTime,left,top,width,height){
    if(currentTime === undefined){
        var scale = video.data("scale");
        width = parseInt(currShape.width()/scale);
        height = parseInt(currShape.height()/scale);
        left = parseInt(currShape.position().left/scale);
        top = parseInt(currShape.position().top/scale);
        currentTime = video[0].currentTime
    }
    var currentTimeInt = parseInt(currentTime);
    var currentKey = ""+currentTimeInt;
    var keyframe = currShape.data("keyframe");
    var keyframeRect = currShape.data("keyframe-rect");
    if(keyframe === undefined){
        keyframe = [];
        keyframeRect = {};
    }
    if(!keyframeRect[currentKey]){
        //找合适的位置放下来
        var nextIndex = currShape.data("next");
        keyframe.splice(nextIndex, 0, currentTimeInt);
        currShape.data("next",nextIndex + 1);
    }
    keyframeRect[currentKey] = {left:left,top:top,width:width,height:height,time:currentTime};
    currShape.data("keyframe",keyframe);
    currShape.data("keyframe-rect",keyframeRect);
    currShape.removeClass("virtual");
}
var createValueItem = function(name){
    //右侧创建一个新的select
    var item = valueItem.clone().appendTo(resultList);
    var select2 =  item.children("select").select2({
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
            targetInput.val(value).addClass("hidden");
            lastValue = value;
        }
    });
    var selectInput = item.find(".select-input").on("click",function(){
        $(this).prevAll("select").select2("open");
    })
    var changeValue = item.find(".select-input").on("change",function(){
        lastValue = $(this).val();
    })
    item.find(".select-input").val(lastValue);
    if(name){
        selectInput.val(name);
        if(classify_values.indexOf(name) !== -1){
            //不在选项中
            selectInput.addClass("hidden");
            select2.val(name).trigger('change.select2');;
        }
    }
};

document.addEventListener("stage-ready",function(ev){
    valueItem = $(`<li><select>
<option>${plugin.i18n.getString("page_select2_input")}</option>
<optgroup label="${plugin.i18n.getString("page_select2_predefined")}">
 </optgroup>
</select>
<input class='select-input' placeholder='${plugin.i18n.getString("page_select2_input")}' value='' />
</li>`);
    var data = ev.detail;
    classify_values = data.classify_value.split(",");
    classify_values.forEach(function(classify_value){
        valueItem.find("optgroup").append("<option value='"+classify_value+"'>"+classify_value+"</option>")
    });
    overlay = $("#overlay");
    canvas =  $("#canvas");
    resultList = $("#result-list");
    video = $("#video");
    videoControl = $("#video-control");

    $("#result-header").text(plugin.i18n.getString("page_result_title"));


    /***********************************************
     *
     * 处理放缩导致的位置问题
     *
     **********************************************/
    var videoSizeUpdated = function(){
        //重新设置真实的样子
        let width = video.width();
        let height = video.height();
        let naturalWidth = video[0].videoWidth;
        let naturalHeight = video[0].videoHeight;
        let scale = width/naturalWidth;
        forceRefresh = true;
        video.data("scale",scale);
        overlay.css("width",width).css("height",height).css("left",video.position().left).css("top",video.position().top).removeClass("loading");
    };

    video.on("loadedmetadata",videoSizeUpdated);
    $(window).on("resize",videoSizeUpdated);

    /*********************************************
     *
     * 创建视频控制
     *
     *******************************************/
    (function enableVideoControl() {
        var videoTime = videoControl.children(".time");
        var videoTimeCurrent = videoTime.children(".current");
        var videoTimeDuration = videoTime.children(".duration");

        var videoProgress = videoControl.children(".progress");
        var videoProgressBar = videoProgress.children(".progress-bar");
        var videoProgressTrack = videoProgress.children(".progress-track");
        var videoProgressControl = videoProgress.children(".progress-control");
        var updateProgress = function(progress){
            video[0].currentTime = video[0].duration * progress;

            var currentTime = parseInt(video[0].currentTime);
            //判断每一个shape的next
            overlay.children(".shape").each(function(){
                var shape = $(this);
                var keyframes = shape.data("keyframe");
                var next = -1;
                for(let i = 0; i<keyframes.length;i++){
                    if(keyframes[i] > currentTime){
                        next = i;
                        break;
                    }
                }
                if(next == -1){
                    next = keyframes.length;
                }
                //重定义next
                shape.data("next",next);
            })

        }
        var setProgressUI = function (progress,changeControl=true) {
            if(progress < 0){
                progress = 0;
            }else if(progress > 1){
                progress = 1;
            }
            var percent = parseInt(progress * 100)+"%";
            videoProgressBar.css("width",percent);
            if(changeControl && !progressMouseDown){
                videoProgressControl.css("left",parseInt(progress*videoProgressTrack.width()));
            }
            //判断每一个shape的next
            let scale = video.data("scale");
            overlay.children(".shape").each(function(){
                var shape = $(this);
                var currentTime = parseInt(video[0].currentTime);
                var keyframes = shape.data("keyframe");
                var keyframesRect = shape.data("keyframe-rect");
                var next =  shape.data("next");
                if(next < keyframes.length){
                    if(currentTime > keyframes[next]){
                        next++;
                    }
                }
                let left,top,width,height;
                if(next == 0){
                    var frameRectFirst = keyframesRect[keyframes[0]];
                    left = frameRectFirst.left * scale;
                    top = frameRectFirst.top * scale;
                    width = frameRectFirst.width * scale;
                    height = frameRectFirst.height * scale;
                    shape.addClass("virtual")
                }else if(next == keyframes.length){
                    var frameRectLast = keyframesRect[keyframes[keyframes.length-1]];
                    left = frameRectLast.left * scale;
                    top = frameRectLast.top * scale;
                    width = frameRectLast.width * scale;
                    height = frameRectLast.height * scale;
                    shape.addClass("virtual")
                }else{
                    var keyTime1 = keyframes[next-1];
                    var keyTime2 =  keyframes[next];
                    var frameRect1 = keyframesRect[""+keyTime1];
                    var frameRect2 = keyframesRect[""+keyTime2];
                    var deltaLeft = frameRect2.left - frameRect1.left;
                    var deltaTop = frameRect2.top - frameRect1.top;
                    var deltaWidth = frameRect2.width - frameRect1.width;
                    var deltaHeight = frameRect2.height - frameRect1.height;
                    //计算位置 用精确度更高的来计算
                    var deltaPercent = (video[0].currentTime -  keyTime1)/(keyTime2 - keyTime1);

                    left = (frameRect1.left + deltaLeft*deltaPercent) * scale;
                    top = (frameRect1.top + deltaTop*deltaPercent) * scale;
                    width = (frameRect1.width + deltaWidth*deltaPercent) * scale;
                    height = (frameRect1.height + deltaHeight*deltaPercent) * scale;
                    shape.removeClass("virtual")
                }
                shape.css("left",parseInt(left)).css("top",parseInt(top))
                    .css("width",parseInt(width)).css("height",parseInt(height))
                //重定义next
                shape.data("next",next);
            })

        }
        video.on("loadedmetadata",function(){
            var minutes = Math.floor(video[0].duration / 60);
            var seconds = Math.floor(video[0].duration) % 60;
            if(seconds < 10){
                seconds = "0"+seconds;
            }
            videoTimeDuration.text(minutes+":"+seconds);
        });
        setInterval(function () {
            if(!video[0].paused || forceRefresh){
                forceRefresh = false;
                var minutes = Math.floor(video[0].currentTime / 60);
                var seconds = Math.floor(video[0].currentTime) % 60;
                if(seconds < 10){
                    seconds = "0"+seconds;
                }
                videoTimeCurrent.text(minutes+":"+seconds);
                setProgressUI(video[0].currentTime/video[0].duration);
            }
        }, 500);

        videoProgressTrack.on("mousedown",function(ev){
            var pageX = ev.pageX;
            var left = videoProgressTrack.offset().left;
            var width = videoProgressTrack.width();
            var progress = (pageX - left) / width;
            updateProgress(progress);
            setProgressUI(progress);
        });
        var progressMouseDown = false;
        videoProgressControl.on("mousedown",function(ev){
            ev.stopImmediatePropagation();
            progressMouseDown = true;
        });
        videoProgress.on("mousemove",function(ev){
            if(progressMouseDown){
                var left = videoProgress.offset().left;
                var width = videoProgress.width();
                if(ev.pageX >= left && ev.pageX <= left+width){
                    videoProgressControl.css("left",ev.pageX - left);
                }
                ev.preventDefault();
            }
        }).on("mouseup",function(ev){
            if(progressMouseDown){
                progressMouseDown = false;
                var left = videoProgress.offset().left;
                var width = videoProgress.width();
                var progress = (ev.pageX - left) / width;
                if(progress >= 0 && progress <= 1) {
                    updateProgress(progress);
                    setProgressUI(progress);
                }
            }
        });

        var videoVolume = videoControl.children(".volume");
        var videoVolumeBar = videoVolume.children(".volume-bar");
        var videoVolumeTrack = videoVolume.children(".volume-track");
        var videoVolumeControl = videoVolume.children(".volume-control");
        var setVolume = function(vol,changeControl=true){
            if(vol < 0){
                vol = 0;
            }else if(vol > 1){
                vol = 1;
            }

            if(vol == 0){
                videoMute.addClass("muted");
                video[0].muted = true
            }else{
                videoMute.removeClass("muted");
                video[0].muted = false;
                video[0].volume = vol;
            }
            var percent = parseInt(vol * 100)+"%";
            videoVolumeBar.css("width",percent);
            if(changeControl){
                videoVolumeControl.css("left",percent);
            }
        }
        videoVolumeTrack.on("mousedown",function(ev){
            var pageX = ev.pageX;
            var left = videoVolumeTrack.offset().left;
            var width = videoVolumeTrack.width();
            var vol = (pageX - left) / width;
            setVolume(vol)
        })
        var volumeMouseDown = false;
        videoVolumeControl.on("mousedown",function(ev){
            ev.stopImmediatePropagation();
            volumeMouseDown = true;
        });
        videoVolume.on("mousemove",function(ev){
            if(volumeMouseDown){
                var left = videoVolume.offset().left;
                var width = videoVolume.width();
                var vol = (ev.pageX - left) / width;
                if(vol >= 0 && vol <= 1){
                    var percent = parseInt(vol * 100)+"%";
                    videoVolumeControl.css("left",percent);
                }
                ev.preventDefault();
            }
        }).on("mouseup",function(ev){
            if(volumeMouseDown){
                var left = videoVolumeTrack.offset().left;
                var width = videoVolumeTrack.width();
                var vol = (ev.pageX - left) / width;
                if(vol >= 0 && vol <= 1) {
                    setVolume(vol, false);
                }
                volumeMouseDown = false;
            }
        });

        var videoStart = videoControl.children(".start");
        videoStart.children(".btn-start").on("click",function(){
            videoStart.addClass("started");
            video[0].play();
            overlay.addClass("playing");
        })
        videoStart.children(".btn-pause").on("click",function(){
            videoStart.removeClass("started");
            video[0].pause();
            overlay.removeClass("playing");
        })
        video.on("ended",function(){
            overlay.removeClass("playing");
            videoStart.removeClass("started");
        });

        var videoMute = videoControl.children(".mute");
        videoMute.children(".btn-mute").on("click",function(){
            setVolume(0)
        })
        videoMute.children(".btn-volume").on("click",function(){
            setVolume(video[0].volume)
        })
    })();



    var overlayOffset = {};
    /*********************************************
     *
     * 创建矩形选框
     *
     *******************************************/
    (function enableRectDrawing(){
        var drawingRect = false;
        var rectPageX = 0;
        var rectPageY = 0;
        var rectLeft = 0;
        var rectTop = 0;
        overlay.on("mousedown",function(ev){
            if(overlay.hasClass("drawable")){
                overlayOffset = overlay.offset();
                drawingRect = true;
                rectPageX = ev.pageX;
                rectPageY = ev.pageY;
                rectLeft = rectPageX - overlayOffset.left;
                rectTop = rectPageY - overlayOffset.top;
                currShape = $(rectHTML).appendTo(overlay);
            }
        }).on("mouseout",function (ev) {
            $("#position-number").css("display","none");
        }).on("mousemove",function(ev){

            overlayOffset = overlay.offset();
            let overlay_width = parseInt(overlay.css("width"));
            $("#position-number").css("display","block");
            $("#position-number").css({"top":ev.pageY-30,"left":ev.pageX+5})
            if(ev.pageY <= 35){
                $("#position-number").css("top",ev.pageY+5)
            }
            if(ev.pageX >= overlay_width + overlayOffset.left - 85){
                $("#position-number").css("left",ev.pageX-85)
            }
            $("#number").text(parseInt((ev.pageX - overlayOffset.left)/currScale) + " , " + parseInt((ev.pageY - overlayOffset.top)/currScale));

            if(drawingRect){
                var width = Math.abs(rectPageX - ev.pageX);
                var height = Math.abs(rectPageY-ev.pageY);
                var left = rectLeft;
                var top = rectTop;
                if(ev.pageX < rectPageX){
                    left = ev.pageX - overlayOffset.left;
                }
                if(ev.pageY < rectPageY){
                    top = ev.pageY - overlayOffset.top;
                }
                currShape.css("width",width/currScale).css("height",height/currScale).css("left",left/currScale).css("top",top/currScale);
                ev.preventDefault();
            }
        }).on("mouseup",function(){
            if(drawingRect){
                var width = parseInt(currShape.css("width").replace(/px$/,""));
                if(width < 1){
                    currShape.remove();
                }else{
                    overlay.removeClass("drawable");
                    plugin.toolbar.deselect("rect");
                    addKeyframe();
                    createValueItem();
                }
                drawingRect = false;
                currShape = null;
            }
        });
    })();

    /****************
     *
     * 矩形选框缩放
     *
     **************/
    (function enableRectResizing() {
        var currCircle = null;
        var resizingRect = false;
        var circlePageX = 0;
        var circlePageY = 0;
        var circleWidth = 0;
        var circleHeight = 0;
        var circleLeft = 0;
        var circleTop = 0;

        overlay.on("mousedown", ".circle", function (ev) {
            if (!overlay.hasClass("drawable") ) {
                circlePageX = ev.pageX;
                circlePageY = ev.pageY;
                resizingRect = true;
                currCircle = $(ev.currentTarget);
                currShape = currCircle.parents(".shape").first();

                circleWidth = parseInt(currShape.css("width").replace(/px$/, ""));
                circleHeight = parseInt(currShape.css("height").replace(/px$/, ""));
                circleLeft = parseInt(currShape.css("left").replace(/px$/, ""));
                circleTop = parseInt(currShape.css("top").replace(/px$/, ""));
                ev.stopImmediatePropagation();
            }
        }).on("mousemove", function (ev) {
            if (resizingRect) {
                ev.stopImmediatePropagation();
                ev.preventDefault();
                //计算新的长宽和xy
                var newWidth = circleWidth;
                var newHeight = circleHeight;
                var newLeft = circleLeft;
                var newTop = circleTop;

                var deltaX = (ev.pageX - circlePageX) / currScale;
                var deltaY = (ev.pageY - circlePageY) / currScale;
                if (currCircle.hasClass("left")) {
                    newLeft += deltaX;
                    newWidth -= deltaX
                } else {
                    newWidth += deltaX
                }
                if (currCircle.hasClass("top")) {
                    newTop += deltaY;
                    newHeight -= deltaY
                } else {
                    newHeight += deltaY
                }
                //不能小于圆点长宽
                if (newWidth < 10 || newHeight < 10) {
                    return;
                }
                currShape.css("left", newLeft).css("top", newTop)
                    .css("width", newWidth).css("height", newHeight);
            }
        }).on("mouseup", function (ev) {
            if (resizingRect) {
                addKeyframe();
                currShape = null;
                resizingRect = false;
            }
        });
    })();

    /****************
     *
     * 移动选框
     *
     **************/
    (function enableShapeMoving(){
        var movingShape = false;
        var shapeX = 0;
        var shapeY = 0;
        var shapeLeft = 0;
        var shapeTop = 0;
        overlay.on("mousedown",".shape",function(ev){
            if (!overlay.hasClass("drawable")){
                currShape = $(ev.currentTarget);
                movingShape = true;
                shapeX = ev.pageX;
                shapeY = ev.pageY;
                shapeLeft = parseInt(currShape.css("left").replace(/px$/,""));
                shapeTop = parseInt(currShape.css("top").replace(/px$/,""));
                ev.stopImmediatePropagation();
            }
        }).on("mouseover",".shape",function(ev){
            var shape = $(ev.currentTarget);
            if(shape.hasClass("drawing")){
                return;
            }
            if(!shape.hasClass("forefront")){
                overlay.children(".forefront").removeClass("forefront")
                shape.addClass("forefront");
            }
            var index = shape.index();
            resultList.children("li").eq(index).addClass("active");
            ev.stopImmediatePropagation();
        }).on("mouseleave",".shape",function(ev){
            var index = $(ev.currentTarget);
            if(index.hasClass("drawing")){
                return;
            }
            var index = index.index();
            resultList.children("li").eq(index).removeClass("active");
            ev.stopImmediatePropagation();
        }).on("mousemove",function(ev){
            if(movingShape){
                ev.stopImmediatePropagation();
                currShape.css("left",(ev.pageX-shapeX)/currScale + shapeLeft)
                    .css("top",(ev.pageY-shapeY)/currScale + shapeTop);
                ev.preventDefault();
            }
        }).on("mouseup",function(ev){
            if(movingShape){
                addKeyframe();
                currShape = null;
                movingShape = false;
            }
        }).on("mouseleave",function(ev){
            if(movingShape){
                addKeyframe();
                currShape = null;
                movingShape = false;
            }
        })
    })();


    /****************
     *
     * 点击选择选框
     *
     **************/
    (function enableShapeSelection() {
        overlay.on("click", ".shape", function (ev) {
            if (!overlay.hasClass("drawable")) {
                var shape = $(ev.currentTarget)
                if (shape.hasClass("selected")) {
                    shape.removeClass("selected");
                    plugin.toolbar.disable("remove");
                } else {
                    overlay.children(".selected").removeClass("selected");
                    shape.addClass("selected");
                    plugin.toolbar.enable("remove");
                }
            }
        })
    })();

    /****************
     *
     * 移动背景图像
     *
     **************/
    (function enableCanvasSelection() {
        var moveCanvas = false;
        var canvasX = 0;
        var canvasY = 0;
        var canvasLeft = 0;
        var canvasTop = 0;
        canvas.on("mousedown", function (ev) {
            if (overlay.hasClass("movable")) {
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

    (function enableHighlight(){
        resultList.on("mouseover","li",function(ev){
            var index = $(ev.currentTarget).index();
            overlay.children(".shape").eq(index).addClass("active");
        }).on("mouseleave","li",function(ev){
            var index = $(ev.currentTarget).index();
            overlay.children(".shape").eq(index).removeClass("active");
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
    if (!src) {
        src = "file:///" + doc.path.replace(/\\/g,"/");
    }
    var objects = doc.outputs.object;
    canvas.children("video").attr("src",src);

    overlay.children(".shape").remove();
    resultList.empty();

    plugin.toolbar.disable("remove");
    plugin.toolbar.deselect("rect");
    if(objects){
        //如果有元素,则考虑元素的移动
        overlay.removeClass("drawable");
        objects.forEach(function(object){
            var name = object.name;
            if(object.keyframes){
                currShape = $(rectHTML).appendTo(overlay)
                for(let i in object.keyframes){
                    var keyframe = object.keyframes[i];
                    if(keyframe){
                        addKeyframe(keyframe["time"],keyframe["xmin"],keyframe["ymin"],keyframe["xmax"]-keyframe["xmin"],keyframe["ymax"]-keyframe["ymin"])
                    }
                }
                currShape.data("next",0);
                currShape = null;
            }
            createValueItem(name);
        })
    }else{
        overlay.addClass("drawable");
        plugin.toolbar.select("rect");
    }
});
document.addEventListener("actor-will-finish",function(ev){
    var doc = ev.detail;
    doc.outputs.object = [];

    resultList.children("li").each(function(){
        var $this = $(this);
        var index = $this.index();
        var name = $this.find(".select-input").val();
        if(!name){
            $.toast(plugin.i18n.getString("page_notEmpty"));
            ev.preventDefault();
            return;
        }
        var keyframes = [];

        var shape = overlay.children(".shape").eq(index);

        var kfs = shape.data("keyframe");
        var kfRects = shape.data("keyframe-rect");
        for(let i in kfs){
            var keyframe = kfRects[kfs[i]+""];
            var kf = {
                time:parseFloat(keyframe["time"]).toFixed(2),
                xmin:keyframe["left"],
                ymin:keyframe["top"],
                xmax:keyframe["left"] + keyframe["width"],
                ymax:keyframe["top"] + keyframe["height"],
            }
            if(keyframe){
                keyframes.push(kf);
            }

        }
        doc.outputs.object.push({
            "name":name,
            "keyframes":keyframes
        })
        doc.size ={
            width:video[0].videoWidth,
            height:video[0].videoHeight,
            depth:3
        }
    })

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
        $("#overlay").addClass("movable").removeClass("drawable");
        plugin.toolbar.deselect("rect");
        plugin.toolbar.select("move");
    }else if(ev.which == 67){
        keydown = true;
        //C
        overlay.addClass("drawable").removeClass("movable");
        plugin.toolbar.deselect("move");
        plugin.toolbar.select("rect");
    }

});
$(document).on("keyup",function(ev){
    if(ev.which == 46){
        //delete键
        var selectedRect = overlay.children(".shape.selected");
        if(selectedRect){
            var index = selectedRect.index();
            resultList.children("li").eq(index).remove();
            selectedRect.remove();
            plugin.toolbar.disable("remove");
        }
        return;
    }
    if(!keydown){
        return;
    }
    keydown = false;
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
document.addEventListener("toolbar-rect-deselect",function(){
    overlay.removeClass("drawable");
});
document.addEventListener("toolbar-rect-select",function(){
    overlay.addClass("drawable").removeClass("movable");;
    plugin.toolbar.deselect("move");
});
document.addEventListener("toolbar-move-deselect",function(){
    overlay.removeClass("movable");
});
document.addEventListener("toolbar-move-select",function(){
    overlay.addClass("movable").removeClass("drawable");
    plugin.toolbar.deselect("rect");
});
document.addEventListener("toolbar-remove-click",function(){
    var selectedShape = overlay.children(".shape.selected");
    if(selectedShape){
        var index = selectedShape.index();
        resultList.children("li").eq(index).remove();
        selectedShape.remove();
        plugin.toolbar.disable("remove");
    }
});