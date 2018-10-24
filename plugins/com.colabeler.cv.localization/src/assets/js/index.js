/**
 * Created by wutong on 2018/1/20.
 */
var classify_values = [];
var rectHTML = `<div class='shape rect'>
<div class="circle left top"></div>
<div class="circle right top"></div>
<div class="circle right bottom"></div>
<div class="circle left bottom"></div>
</div>`;
var polygonHTML = `<svg class='shape polygon drawing'>
<path></path>
</svg>`;
var curveHTML = `<svg class='shape curve drawing'>
<path></path>
</svg>`;

var valueItem = "";
var drawingType = "rect";
var lastValue = "";//初始化最后的分类

var preview = null;
var overlay = null;
var img = null;
var canvas =  null;
var anchor = null;
var resultList = null;
var currShape = false;

var currPathD_str = false;
var currPathD_arr = false;
var currPathD_item = false;

var drawingRect = false;
var drawingPolygon = false;
var drawingCurve = false;

var horizontalLine = false;
var verticalLine = false;

var startMoving = function(){
    stopDrawing();
    overlay.addClass("movable");
    preview.addClass("movable");

    horizontalLine.css("display","none");
    verticalLine.css("display","none");
};
var stopMoving = function(){
    preview.removeClass("movable");
    overlay.removeClass("movable");
    horizontalLine.css("display","");
    verticalLine.css("display","");
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
    anchor.removeClass("anchoring");//清空现场
    //如果有没有完成的shape 全部删除
    $("#overlay .shape.drawing").remove();
    drawingRect = false;
    drawingPolygon = false;
    drawingCurve = false;

    currShape = null;
};
var isDrawing = function(){
    return overlay.hasClass("drawable");
};

var createValueItem = function(name,xmin,xmax,ymin,ymax,real){
    console.log('createValueItem');
    // console.log(name);
     console.log(xmin);
     console.log(xmax);
    // console.log(img);
     console.log(ymin);
     console.log(ymax);
    console.log(img[0].width);

    var maxedge=Math.max(xmax-xmin,ymax-ymin);
    var edgescale=88.0/maxedge;
    
    var dx=((xmax-xmin)*edgescale-88)/2.0;
    var dy=((ymax-ymin)*edgescale-88)/2.0;

    var i=new Image();
    i.src=img.attr("src");
    i.onload=function(){
        console.log(i.width);
        picscale=1;
        if(real){
            picscale=img[0].width/i.width;
        }
        item.find(".select-subimg").attr("style",'width: 90px;background-color:  #333;left: 100px;background:url('+encodeURI(img.attr("src"))+
            ');background-size:'+picscale*i.width/88.0*edgescale*100+'%;background-repeat: no-repeat;background-position: '+-
            (xmin*edgescale+dx)+'px '+-(ymin*edgescale+dy)+'px;')
    }
    
    
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
}

document.addEventListener("stage-ready",function(ev){
    valueItem = $(`<li><select>
<option>${plugin.i18n.getString("page_select2_input")}</option>
<optgroup label="${plugin.i18n.getString("page_select2_predefined")}">
 </optgroup>
</select><span><div class=' select2-container select-subimg' style="width: 90px;height: 90px;background-color:  #333;left: 100px;"></div></span>
<input class='select-input' placeholder='${plugin.i18n.getString("page_select2_input")}' value='' />
</li>`);
    var data = ev.detail;
    classify_values = data.classify_value.split(",");
    classify_values.forEach(function(classify_value){
        valueItem.find("optgroup").append("<option value='"+classify_value+"'>"+classify_value+"</option>")
    })

    //默认开启selected模式
    preview = $("#preview");
    overlay = $("#overlay");
    canvas =  $("#canvas");
    anchor = $("#anchor");
    resultList = $("#result-list");
    horizontalLine = $("#horizontal-line");
    verticalLine = $("#vertical-line");


    img = canvas.children("img")

    $("#result-header").text(plugin.i18n.getString("page_result_title"))


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
            var shape = $(this);
            var left = parseInt(shape.data("left") * scale);
            var top = parseInt(shape.data("top") * scale);
            var width = parseInt(shape.data("width") * scale);
            var height = parseInt(shape.data("height") * scale);
            shape.css("left",left).css("top",top)
                .css("width",width).css("height",height);
            shape.children("circle").each(function(){
                let circle = $(this);
                let cx = circle.data("cx");
                let cy = circle.data("cy");
                circle.attr("cx",parseInt(cx*scale)).attr("cy",parseInt(cy*scale))
            });
            if(anchor.hasClass("anchoring")){
                let cx = anchor.data("cx");
                let cy = anchor.data("cy");
                anchor.attr("cx",parseInt(cx*scale)).attr("cy",parseInt(cy*scale))
            }
            shape.children("line").each(function(){
                let line = $(this);
                let x1 = line.data("x1");
                let y1 = line.data("y1");
                let x2 = line.data("x2");
                let y2 = line.data("y2");
                line.attr("x1",parseInt(x1*scale)).attr("y1",parseInt(y1*scale))
                    .attr("x2",parseInt(x2*scale)).attr("y2",parseInt(y2*scale))
            })
            shape.children("path").each(function(){
                let path = $(this);
                var pathd = path.data("d");
                pathd = pathd.replace(/(\d+) (\d+)/g, function (match, p1, p2) {
                    return parseInt(parseInt(p1) * scale) + " " + parseInt(parseInt(p2) * scale);
                })
                path.attr("d", pathd)
            });
        })
        if(currPathD_str){
            currPathD_str = currPathD_str.replace(/(\d+) (\d+)/g, function (match, p1, p2) {
                return parseInt(parseInt(p1) * scale) + " " + parseInt(parseInt(p2) * scale);
            });
        }
        if(currPathD_arr){
            for(let i in currPathD_arr){
                let pathi = currPathD_arr[i];
                if(pathi){
                    currPathD_arr[i][0] = pathi[0]*scale;
                    currPathD_arr[i][1] = pathi[1]*scale;
                    if(pathi.length == 6){
                        currPathD_arr[i][2] = pathi[2]*scale;
                        currPathD_arr[i][3] = pathi[3]*scale;
                        currPathD_arr[i][4] = pathi[4]*scale;
                        currPathD_arr[i][5] = pathi[5]*scale;
                    }
                }
            }
        }
        if(currPathD_item){
            currPathD_item[0] = currPathD_item[0]*scale;
            currPathD_item[1] = currPathD_item[1]*scale;
            currPathD_item[2] = currPathD_item[2]*scale;
            currPathD_item[3] = currPathD_item[3]*scale;
            currPathD_item[4] = currPathD_item[4]*scale;
            currPathD_item[5] = currPathD_item[5]*scale;
        }
        overlay.css("width",width).css("height",height)
            .css("left",img.position().left/currScale).css("top",img.position().top/currScale).removeClass("loading");
    }

    img.on("load",imageSizeUpdated);
    $(window).on("resize",imageSizeUpdated);



    /*********************************************
     *
     * 实现框外可以框选的效果
     *
     *******************************************/
    (function passMouseEvent(){
        preview.on("mousedown mouseup mousemove click dblclick",function(ev){
            if(isDrawing() && $(ev.target).is("#preview")){
                var e = jQuery.Event(ev.type, {pageX:ev.pageX,pageY:ev.pageY,target:overlay[0]});
                overlay.trigger(e);
                ev.preventDefault();
            }
        })
        canvas.on("mousedown mouseup mousemove click dblclick",function(ev){
            if(isDrawing() && $(ev.target).is("#canvas")){
                var e = jQuery.Event(ev.type, {pageX:ev.pageX,pageY:ev.pageY,target:overlay[0]});
                overlay.trigger(e);
                ev.preventDefault();
            }
        })
    })();


    var overlayOffset = {};
    /*********************************************
     *
     * 创建矩形选框
     *
     *******************************************/
    (function enableRectDrawing(){
        var rectPageX = 0;
        var rectPageY = 0;
        var rectLeft = 0;
        var rectTop = 0;
        var xmin=0;
        var xmax=0;
        var ymin=0;
        var ymax=0;
        overlay.on("mousedown",function(ev){
            if(isDrawing() && drawingType == "rect" && drawingRect === false){
                overlayOffset = overlay.offset();
                drawingRect = true;
                rectPageX = ev.pageX;
                rectPageY = ev.pageY;
                rectLeft = rectPageX - overlayOffset.left;
                rectTop = rectPageY - overlayOffset.top;
                currShape = $(rectHTML).insertBefore(anchor);
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
                currShape.scss("width",width/currScale).scss("height",height/currScale).scss("left",left/currScale).scss("top",top/currScale);
                ev.preventDefault();
                xmin=left;
                ymin=top;
                xmax=xmin+width;
                ymax=ymin+height;
            }
        }).on("mouseup",function(){
            if(drawingRect){
                var width = parseInt(currShape.css("width").replace(/px$/,""));
                if(width < 1){
                    currShape.remove();
                }else{
                    stopDrawing();
                    plugin.toolbar.deselect("rect");
                    createValueItem(null,xmin,xmax,ymin,ymax,1);
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
            if (!isDrawing() && resizingRect === false) {
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
                currShape.scss("left", newLeft).scss("top", newTop)
                    .scss("width", newWidth).scss("height", newHeight);
            }
        }).on("mouseup", function (ev) {
            if (resizingRect) {
                currShape = null;
                resizingRect = false;
            }
        });
    })();


    /*********************************************
     *
     * 创建多边形选框
     *
     *******************************************/
    (function enablePolygonDrawing() {
        var currPath = null;
        var polygonMinX = 0;
        var polygonMinY = 0;
        var polygonMaxX = 0;
        var polygonMaxY = 0;

        var closePolygonPath = function () {
            drawingPolygon = false;
            anchor.removeClass("anchoring");
            //重新计算path
            currPathD_str = "";
            for (var pi in currPathD_arr) {
                var path_xy = currPathD_arr[pi];
                var px = path_xy[0] - polygonMinX;
                var py = path_xy[1] - polygonMinY;
                var command = (pi == 0 ? "M" : "L");
                currPathD_str += `${command}${px} ${py} `;
            }
            currPath.sattr("d", currPathD_str + " Z");
            currShape.children(".circle").each(function () {
                var $this = $(this);
                var cx = parseInt($this.attr("cx")) - polygonMinX;
                var cy = parseInt($this.attr("cy")) - polygonMinY;
                $this.sattr("cx", cx).sattr("cy", cy);
            })
            currShape.removeClass("drawing")
                .scss("width", polygonMaxX - polygonMinX).scss("height", polygonMaxY - polygonMinY)
                .scss("left", polygonMinX).scss("top", polygonMinY);

            currPathD_str = false;
            currPathD_item = false;
            currPathD_arr = false;

            currPath = null;
            currShape = null;
            stopDrawing()
            plugin.toolbar.deselect("polygon");
            createValueItem(null,polygonMinX,polygonMaxX,polygonMinY,polygonMaxY,1);
        }
        overlay.on("click", function (ev) {
            if (isDrawing() && drawingType == "polygon") {
                if (!drawingPolygon) {
                    overlayOffset = overlay.offset();
                    currShape = $(polygonHTML).insertBefore(anchor);
                    currPath = currShape.children("path").first();
                }
                var left = parseInt((ev.pageX - overlayOffset.left) / currScale);
                var top = parseInt((ev.pageY - overlayOffset.top) / currScale);

                if (!drawingPolygon) {
                    drawingPolygon = true;
                    anchor.addClass("anchoring");
                    anchor.scss("left", left).scss("top", top);
                    currPathD_str = `M${left} ${top}`;
                    currPathD_arr = [[left, top]];
                    currPath.sattr("d", currPathD_str);
                    //暂存最大最小坐标
                    polygonMinX = left;
                    polygonMinY = top;
                    polygonMaxX = left;
                    polygonMaxY = top;
                } else {
                    var $target = $(ev.target);
                    if ($target.is("#anchor")) {
                        //直接结束
                        closePolygonPath();
                        return;
                    } else {
                        currPathD_str += ` L ${left} ${top}`;
                        currPathD_arr.push([left, top])
                        currPath.sattr("d", currPathD_str);
                        if (left < polygonMinX) {
                            polygonMinX = left;
                        } else if (left > polygonMaxX) {
                            polygonMaxX = left;
                        }
                        if (top < polygonMinY) {
                            polygonMinY = top;
                        } else if (top > polygonMaxY) {
                            polygonMaxY = top;
                        }
                    }
                }
                var currCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                $(currCircle).appendTo(currShape).addClass("circle").sattr("cx", left).sattr("cy", top);
            }

        }).on("mousemove", function (ev) {
            if (drawingPolygon) {
                var left = parseInt((ev.pageX - overlayOffset.left) / currScale);
                var top = parseInt((ev.pageY - overlayOffset.top) / currScale);
                //这一步不保存 因为会调整
                //因为是中间行为 不调用sattr
                currPath.attr("d", currPathD_str + ` L ${left} ${top}`);
            }
        }).on("dblclick", function (ev) {
            if (drawingPolygon) {
                //删除掉之前加上的;
                currShape.find(".circle").last().remove();
                closePolygonPath();
            }
        });
    })();


    /*********************************************
     *
     * 创建曲线框
     *
     *******************************************/
    (function enableCurveDrawing() {
        var curveMouseDown = false;
        var anchorMouseDown = false;
        var currPath = null;
        var xmin = 0;
        var ymin = 0;
        var xmax = 0;
        var ymax = 0;
        var currCircleX = 0;
        var currCircleY = 0;
        var currControl1 = null;
        var currControl2 = null;
        var currLine1 = null;
        var currLine2 = null;

        var closePath = function () {
            drawingCurve = false;
            anchor.removeClass("anchoring");
            //重新计算path
            currPathD_str = `M${currPathD_arr[0][4]-xmin} ${currPathD_arr[0][5]-ymin} `;
            for (var pi = 1;pi<currPathD_arr.length;pi++) {
                var path_xy = currPathD_arr[pi];
                var x1 = path_xy[0] - xmin;
                var y1 = path_xy[1] - ymin;
                var x2 = path_xy[2] - xmin;
                var y2 = path_xy[3] - ymin;
                var x = path_xy[4] - xmin;
                var y = path_xy[5] - ymin;
                currPathD_str += `C ${x1} ${y1},${x2} ${y2},${x} ${y} `;
            }
            currPath.sattr("d", currPathD_str + " Z");
            currShape.children(".circle").each(function () {
                var cx = parseInt($(this).attr("cx")) - xmin;
                var cy = parseInt($(this).attr("cy")) - ymin;
                $(this).sattr("cx", cx).sattr("cy", cy);
            })
            //去掉所有的控制点线
            currShape.children(".control").remove();
            currShape.removeClass("drawing")
                .scss("width", xmax - xmin).scss("height", ymax - ymin)
                .scss("left", xmin).scss("top", ymin);

            currPathD_str = false;
            currPathD_item = false;
            currPathD_arr = false;
            currPath = null;
            currShape = null;
            stopDrawing()
            plugin.toolbar.deselect("curve");
            createValueItem(null,xmin,xmax,ymin,ymax,1);
        }
        overlay.on("mousedown",function(ev){
            if (isDrawing() && drawingType == "curve" ) {
                var $target = $(ev.target);
                if($target.is(".circle")){
                    var cx = $target.attr("cx");
                    var cy = $target.attr("cy");
                    currControl2.sattr("cx",cx);
                    currControl2.sattr("cy",cy);
                    currLine2.remove();
                    ev.stopImmediatePropagation();
                    return;
                }
                if (!drawingCurve) {
                    overlayOffset = overlay.offset();
                    currShape = $(curveHTML).insertBefore(anchor);
                    currPath = currShape.children("path").first();
                }
                var left = parseInt((ev.pageX - overlayOffset.left) / currScale);
                var top = parseInt((ev.pageY - overlayOffset.top) / currScale);
                if (!drawingCurve) {
                    drawingCurve = true;
                    anchor.addClass("anchoring");
                    anchor.scss("left", left).scss("top", top);
                    currPathD_str = `M${left} ${top} `;
                    currPathD_item = [left, top,left, top, left, top];
                    currPathD_arr = [currPathD_item];
                    currPath.sattr("d", currPathD_str);
                    //暂存最大最小坐标
                    xmin = left;
                    ymin = top;
                    xmax = left;
                    ymax = top;
                }else{
                    if($(ev.target).is("#anchor")){
                        left = parseInt(anchor.css("left").replace(/px$/,""))
                        top = parseInt(anchor.css("top").replace(/px$/,""))
                        anchorMouseDown = true;
                    }
                    if (left < xmin) {
                        xmin = left;
                    } else if (left > xmax) {
                        xmax = left;
                    }
                    if (top < ymin) {
                        ymin = top;
                    } else if (top > ymax) {
                        ymax = top;
                    }
                    var x1 = parseInt(currControl2.attr("cx"));
                    var y1 = parseInt(currControl2.attr("cy"));
                    currPathD_item = [x1,y1,
                        left,top,
                        left,top]
                    currPathD_arr.push(currPathD_item);
                    currPath.sattr("d", currPathD_str + `C ${x1} ${y1},${left} ${top} ,${left} ${top} `);
                }

                currCircleX = left;
                currCircleY = top;
                currShape.children(".circle.last").removeClass("last");
                var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                $(circle).appendTo(currShape).addClass("circle").addClass("last").sattr("cx", left).sattr("cy", top);

                //添加控制点
                var control1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                currControl1 = $(control1).appendTo(currShape).addClass("control").sattr("cx", left).sattr("cy", top);

                var control2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                currControl2 = $(control2).appendTo(currShape).addClass("control").sattr("cx", left).sattr("cy", top);

                var line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                currLine1 = $(line1).appendTo(currShape).addClass("control").sattr("x1", left).sattr("y1", top).sattr("x2", left).sattr("y2", top);

                var line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                currLine2 = $(line2).appendTo(currShape).addClass("control").sattr("x1", left).sattr("y1", top).sattr("x2", left).sattr("y2", top);

                curveMouseDown = true;

            }
        })
            .on("mousemove",function(ev){
            if(curveMouseDown){
                //中间状态 所以不必调用等比存储原始信息
                var left = parseInt((ev.pageX - overlayOffset.left) / currScale);
                var top = parseInt((ev.pageY - overlayOffset.top) / currScale);

                currControl2.attr("cx", left).attr("cy", top);
                currLine2.attr("x2", left).attr("y2", top);

                var leftMirror  = currCircleX*2 - left;
                var topMirror  = currCircleY*2 - top;
                currControl1.attr("cx", leftMirror).attr("cy", topMirror);
                currLine1.attr("x2", leftMirror).attr("y2", topMirror);

                currPathD_item[2] = leftMirror;
                currPathD_item[3] = topMirror;
                currPath.attr("d", currPathD_str + ` C ${currPathD_item[0]} ${currPathD_item[1]},`
                    +`${currPathD_item[2]} ${currPathD_item[3]} ,${currPathD_item[4]} ${currPathD_item[5]}`);
            }
        })
            .on("mouseup",function(ev){
            //
            if(curveMouseDown){
                if(anchorMouseDown){
                    closePath();
                    anchorMouseDown = false;
                }else{
                    var left = parseInt((ev.pageX - overlayOffset.left) / currScale);
                    var top = parseInt((ev.pageY - overlayOffset.top) / currScale);

                    currControl2.sattr("cx", left).sattr("cy", top);
                    currLine2.sattr("x2", left).sattr("y2", top);

                    var leftMirror  = currCircleX*2 - left;
                    var topMirror  = currCircleY*2 - top;
                    currControl1.sattr("cx", leftMirror).sattr("cy", topMirror);
                    currLine1.sattr("x2", leftMirror).sattr("y2", topMirror);


                    currPathD_item[2] = leftMirror;
                    currPathD_item[3] = topMirror;
                    currPathD_str += `C ${currPathD_item[0]} ${currPathD_item[1]},`
                        +`${currPathD_item[2]} ${currPathD_item[3]} ,${currPathD_item[4]} ${currPathD_item[5]} `
                    currPath.sattr("d",currPathD_str);
                }
                curveMouseDown = false;
            }
        })
            .on("undo",function(ev){
                if(drawingCurve && !curveMouseDown){
                    currPathD_arr.pop();

                    currShape.children("line.control").last().remove();
                    currShape.children("line.control").last().remove();

                    currShape.children("circle.control").last().remove();
                    currShape.children("circle.control").last().remove();
                    currControl2 = currShape.children("circle.control").last();
                    currShape.children("circle").last().remove();
                    currShape.children("circle").last().addClass("last");

                    if(currPathD_arr.length < 1){
                        drawingCurve = false;
                        anchor.removeClass("anchoring");
                        currShape.remove();
                        currPathD_str = "";
                        currPathD_arr = [];
                        currPath = null;
                        currShape = null;
                    }else{
                        currPathD_str = currPathD_str.substring(0,currPathD_str.lastIndexOf("C"));
                        currPath.sattr("d",currPathD_str);
                    }

                }
            })
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
            if (!isDrawing() && movingShape === false){
                currShape = $(ev.currentTarget);
                currShape.data("moved",false);
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
                currShape.scss("left",(ev.pageX-shapeX)/currScale + shapeLeft)
                    .scss("top",(ev.pageY-shapeY)/currScale + shapeTop);
                ev.preventDefault();
                currShape.data("moved",true);
            }
        }).on("mouseup",function(ev){
            if(movingShape){
                currShape = null;
                movingShape = false;
            }
        }).on("mouseleave",function(ev){
            if(movingShape){
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
        overlay.on("mouseup", ".shape", function (ev) {
            if (!isDrawing()) {
                var shape = $(ev.currentTarget);
                if(shape.data("moved") !== true){
                    if (shape.hasClass("selected")) {
                        shape.removeClass("selected");
                        plugin.toolbar.disable("remove");
                    } else {
                        overlay.children(".selected").removeClass("selected");
                        shape.addClass("selected");
                        plugin.toolbar.enable("remove");
                    }
                }
            }
        })
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
            if (isMoving() && moveCanvas === false) {
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

    (function crossPoint(){
        preview.on("mousemove",function(ev){
            horizontalLine.css("top",ev.pageY);
            verticalLine.css("left",ev.pageX);
        }).on("mouseout",function(){
            horizontalLine.css("display","none");
            verticalLine.css("display","none");
        }).on("mouseover",function(){
            horizontalLine.css("display","");
            verticalLine.css("display","");
        })
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
    overlay.children(".shape").remove();
    resultList.empty();
    overlay.addClass("loading");

    plugin.toolbar.disable("remove");
    plugin.toolbar.deselect("rect");
    plugin.toolbar.deselect("polygon");
    plugin.toolbar.deselect("curve");
    if(objects){
        //如果有元素,则考虑元素的移动
        stopDrawing()
        objects.forEach(function(object){
            var name = object.name;
            var xmin = 0;
            var ymin = 0;
            var xmax = 0;
            var ymax = 0;
            if(object.bndbox){
                //矩形的载入
                xmin = object.bndbox.xmin;
                ymin = object.bndbox.ymin;
                xmax = object.bndbox.xmax;
                ymax = object.bndbox.ymax;
                $(rectHTML).insertBefore(anchor)
                    .data("left",xmin).data("top",ymin)
                    .data("width",xmax-xmin).data("height",ymax-ymin);
            }else if(object.polygon && object.polygon["x1"]){
                xmin = object.polygon["x1"];
                ymin = object.polygon["y1"];
                xmax = object.polygon["x1"];
                ymax = object.polygon["y1"];
                //多边形的载入
                let len = Object.keys(object.polygon).length;
                //先找出最小点
                for(let i = 1 ; i<= len/2 ; i++){
                    var x = parseInt(object.polygon["x"+i]);
                    var y = parseInt(object.polygon["y"+i]);
                    if(x < xmin){
                        xmin = x;
                    }else if(x > xmax){
                        xmax = x;
                    }
                    if(y < ymin){
                        ymin = y;
                    }else if(y > ymax){
                        ymax = y;
                    }
                }

                var polygon = $(polygonHTML).insertBefore(anchor).removeClass("drawing")
                    .data("width",xmax-xmin).data("height",ymax-ymin).data("left",xmin).data("top",ymin);
                let pathd = "";
                for(let i = 1 ; i<= len/2 ; i++){
                    let px = object.polygon["x"+i] - xmin;
                    let py = object.polygon["y"+i] - ymin;
                    var command = (i == 1?"M":"L");
                    pathd += `${command}${px} ${py} `;
                    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    $(circle).appendTo(polygon).addClass("circle").data("cx", px).data("cy", py);
                }
                polygon.children("path").data("d",pathd+"Z");
            }else if(object.cubic_bezier){
                //曲线的载入
                xmin = object.cubic_bezier["x1"];
                ymin = object.cubic_bezier["y1"];
                xmax = object.cubic_bezier["x1"];
                ymax = object.cubic_bezier["y1"];
                let len = Object.keys(object.cubic_bezier).length;
                for(let i = 1 ; i<= len/6 ; i++){
                    let x = parseInt(object.cubic_bezier["x"+i]);
                    let y = parseInt(object.cubic_bezier["y"+i]);
                    if(x < xmin){
                        xmin = x;
                    }else if(x > xmax){
                        xmax = x;
                    }
                    if(y < ymin){
                        ymin = y;
                    }else if(y > ymax){
                        ymax = y;
                    }
                }

                let curve = $(curveHTML).insertBefore(anchor).removeClass("drawing")
                    .data("width",xmax-xmin).data("height",ymax-ymin).data("left",xmin).data("top",ymin);
                let pathd = `M${object.cubic_bezier["x1"]-xmin} ${object.cubic_bezier["y1"]-ymin} `;
                for(let i = 1 ; i<= len/6 ; i++){
                    let px = object.cubic_bezier["x"+i] - xmin;
                    let py = object.cubic_bezier["y"+i] - ymin;
                    if(i > 1){
                        let x1 = object.cubic_bezier["x"+i+"_c1"] - xmin;
                        let y1 = object.cubic_bezier["y"+i+"_c1"] - ymin;

                        //上一个点的x2
                        let _x2 = object.cubic_bezier["x"+(i-1)+"_c2"] - xmin;
                        let _y2 = object.cubic_bezier["y"+(i-1)+"_c2"] - ymin;

                        pathd += `C${_x2} ${_y2}, ${x1} ${y1}, ${px} ${py} `;
                    }
                    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    $(circle).appendTo(curve).addClass("circle").data("cx", px).data("cy", py);
                }
                curve.children("path").data("d",pathd+"Z");
            }
            createValueItem(name,xmin,xmax,ymin,ymax);
        })
    }else{
        startDrawing()
        plugin.toolbar.select("rect");
        drawingType = 'rect';

        drawingRect = false;
        drawingPolygon = false;
        drawingCurve = false;
    }

    img.attr("src",src);
})
document.addEventListener("actor-will-finish",function(ev){
    var doc = ev.detail;
    doc.outputs.object = [];
    doc.size ={
        width:img[0].naturalWidth,
        height:img[0].naturalHeight,
        depth:3
    }
    resultList.children("li").each(function(){
        var $this = $(this);
        var index = $this.index();
        var name = $this.find(".select-input").val();
        if(!name){
            $.toast(plugin.i18n.getString("page_notEmpty"));
            ev.preventDefault();
            return;
        }
        var shape = overlay.children(".shape").eq(index);
        var xmin = shape.data("left");
        var ymin = shape.data("top");
        var xmax = shape.data("width") + xmin;
        var ymax = shape.data("height") + ymin;
        if(shape.is(".rect")){
            doc.outputs.object.push({
                "name":name,
                "bndbox":{
                    "xmin":xmin,
                    "ymin":ymin,
                    "xmax":xmax,
                    "ymax":ymax,
                }
            })
        }else if(shape.is(".polygon")){
            var polygon = {};
            var circles = shape.children(".circle");
            for(var i = 0; i< circles.length;i++){
                var circle = circles.eq(i);
                polygon["x"+(i+1)] = xmin + circle.data("cx")
                polygon["y"+(i+1)] = ymin + circle.data("cy")
            }

            doc.outputs.object.push({
                "name":name,
                "polygon":polygon
            })
        }else if(shape.is(".curve")){
            //处理曲线的存储
            var cubic_bezier = {};
            var d = shape.children("path").data("d");
            var path_components = d.replace(/M|Z/g,"").trim().split(/C/);
            var _cx1 = false,_cy1=false;
            for(let i = path_components.length - 1 ;i>= 0;i--){
                var component = path_components[i].trim();
                var xy = [0,0];
                var cx1=0,cy1=0,cx2=0,cy2=0;
                if(i == 0){
                    //开始
                    xy = component.split(/ +/);
                    cx2 = parseInt(xy[0].trim());
                    cy2 = parseInt(xy[1].trim());
                }else{
                    var cxy = component.split(/,/);
                    xy = cxy[2].trim().split(/ +/);
                    var c1 = cxy[0].trim().split(/ +/);
                    var c2 = cxy[1].trim().split(/ +/);
                    cx1 = parseInt(c1[0]);
                    cy1 = parseInt(c1[1]);
                    cx2 = parseInt(c2[0]);
                    cy2 = parseInt(c2[1]);
                }
                cubic_bezier["x"+(i+1)] = xmin + parseInt(xy[0].trim());
                cubic_bezier["y"+(i+1)] = ymin + parseInt(xy[1].trim());
                cubic_bezier["x"+(i+1)+"_c1"] = xmin + cx2;
                cubic_bezier["y"+(i+1)+"_c1"] = ymin + cy2;
                if(_cx1 === false){
                    cubic_bezier["x"+(i+1)+"_c2"] = cubic_bezier["x"+(i+1)];
                    cubic_bezier["y"+(i+1)+"_c2"] = cubic_bezier["y"+(i+1)];
                }else{
                    cubic_bezier["x"+(i+1)+"_c2"] = xmin + _cx1;
                    cubic_bezier["y"+(i+1)+"_c2"] = ymin + _cy1;
                }
                _cx1 = cx1;
                _cy1 = cy1;
            }
            doc.outputs.object.push({
                "name":name,
                "cubic_bezier":cubic_bezier
            })
        }

    })
})

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
        plugin.toolbar.deselect("rect");
        plugin.toolbar.deselect("polygon");
        plugin.toolbar.deselect("curve");
        plugin.toolbar.select("move");
    }else if(ev.which == 82){
        keydown = true;
        //R
        startDrawing()
        plugin.toolbar.deselect("move");
        plugin.toolbar.deselect("polygon");
        plugin.toolbar.deselect("curve");
        plugin.toolbar.select("rect");
        drawingType = "rect";
    }else if(ev.which == 80){
        keydown = true;
        //P
        startDrawing();
        plugin.toolbar.deselect("move");
        plugin.toolbar.deselect("rect");
        plugin.toolbar.deselect("curve");
        plugin.toolbar.select("polygon");
        drawingType = "polygon";
    }else if(ev.which == 67){
        keydown = true;
        //C
        startDrawing();
        plugin.toolbar.deselect("move");
        plugin.toolbar.deselect("rect");
        plugin.toolbar.deselect("polygon");
        plugin.toolbar.select("curve");
        drawingType = "curve";
    }else if(ev.which == 90 && (ev.ctrlKey == true || ev.metaKey == true)){
        keydown = true;
        //ctrl+z
        overlay.trigger("undo");
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
    if(ev.keyCode == 32){
        //空格
        stopMoving()
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
document.addEventListener("toolbar-rect-deselect",function(){
    stopDrawing()
});
document.addEventListener("toolbar-rect-select",function(){
    startDrawing();
    plugin.toolbar.deselect("move");
    plugin.toolbar.deselect("polygon");
    plugin.toolbar.deselect("curve");
    drawingType = "rect";
});
document.addEventListener("toolbar-polygon-deselect",function(){
    stopDrawing();
});
document.addEventListener("toolbar-polygon-select",function(){
    startDrawing();
    plugin.toolbar.deselect("move");
    plugin.toolbar.deselect("rect");
    plugin.toolbar.deselect("curve");
    drawingType = "polygon";
});
document.addEventListener("toolbar-curve-deselect",function(){
    stopDrawing();
});
document.addEventListener("toolbar-curve-select",function(){
    startDrawing();
    plugin.toolbar.deselect("move");
    plugin.toolbar.deselect("rect");
    plugin.toolbar.deselect("polygon");
    drawingType = "curve";
});
document.addEventListener("toolbar-move-deselect",function(){
    stopMoving()
});
document.addEventListener("toolbar-move-select",function(){
    startMoving();
    plugin.toolbar.deselect("rect");
    plugin.toolbar.deselect("polygon");
    plugin.toolbar.deselect("curve");
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
