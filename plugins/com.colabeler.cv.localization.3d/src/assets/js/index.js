/**
 * Created by wutong on 2018/1/20.
 */
var classify_values = [];
var cuboidHTML = `<svg class='shape cuboid drawing'>
<path></path>
<line class="front"></line>
<line class="front"></line>
<line class="front"></line>
<line class="front"></line>
<line class="side"></line>
<line class="side"></line>
<line class="side"></line>
<line class="side"></line>
<line class="back"></line>
<line class="back"></line>
<line class="back"></line>
<line class="back"></line>
</svg>`;

var valueItem = "";
var lastValue = "";//初始化最后的分类

var drawingType = "cuboid";
var preview = null;
var overlay = null;
var img = null;
var canvas =  null;
var resultList = null;

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
}

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
    })

    //默认开启selected模式
    preview = $("#preview");
    overlay = $("#overlay");
    canvas =  $("#canvas");
    resultList = $("#result-list");
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

    var currShape = false;
    var overlayOffset = {};
    /*********************************************
     *
     * 创建立方体
     *
     *******************************************/
    (function enableCuboidDrawing(){
        var drawingCuboid = false;
        var drawingFront = false;
        var drawingBack = false;
        var x1 = 0;
        var y1 = 0;
        var frontLines = null;
        var sideLines = null;
        var backLines = null;

        var frontX = 0;
        var frontY = 0;

        var backX = 0;
        var backY = 0;

        var xmin = 0;
        var ymin = 0;
        var xmax = 0;
        var ymax = 0;
        overlay.on("mousedown",function(ev){
            if(isDrawing() && drawingType == "cuboid"){
                if(!drawingCuboid){
                    overlayOffset = overlay.offset();
                    drawingCuboid = true;
                    drawingFront = true;
                    x1 = parseInt((ev.pageX - overlayOffset.left)/currScale);
                    y1 = parseInt((ev.pageY - overlayOffset.top)/currScale);
                    currShape = $(cuboidHTML).appendTo(overlay);
                    var lines = currShape.children("line")
                        .sattr("x1",x1).sattr("y1",y1).sattr("x2",x1).sattr("y2",y1);
                    xmin = x1;
                    ymin = y1;
                    xmax = x1;
                    ymax = y1;

                    frontLines = lines.filter(".front");
                    sideLines = lines.filter(".side");
                    backLines = lines.filter(".back");
                }else{
                    //处理后面的方框
                    drawingBack = true;
                    backX = ev.pageX;
                    backY = ev.pageY;

                    for(let i = 0;i<4;i++){
                        let backLine = backLines.eq(i);
                        let x1 = parseInt(backLine.attr("x1"));
                        let y1 = parseInt(backLine.attr("y1"));
                        let x2 = parseInt(backLine.attr("x2"));
                        let y2 = parseInt(backLine.attr("y2"));
                        backLine.data("_x1",x1).data("_y1",y1)
                            .data("_x2",x2).data("_y2",y2)
                    }
                }
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

            if(drawingCuboid){
                ev.preventDefault();
                if(drawingFront){
                    let x2 =  parseInt((ev.pageX - overlayOffset.left)/currScale);
                    let y2 = parseInt((ev.pageY - overlayOffset.top)/currScale);
                    frontLines.eq(0).sattr("x2",x2);
                    frontLines.eq(1).sattr("x1",x2).sattr("x2",x2).sattr("y2",y2);
                    frontLines.eq(2).sattr("x1",x2).sattr("y1",y2).sattr("y2",y2);
                    frontLines.eq(3).sattr("y1",y2);

                    backLines.eq(0).sattr("x2",x2);
                    backLines.eq(1).sattr("x1",x2).sattr("x2",x2).sattr("y2",y2);
                    backLines.eq(2).sattr("x1",x2).sattr("y1",y2).sattr("y2",y2);
                    backLines.eq(3).sattr("y1",y2);

                    sideLines.eq(1).sattr("x1",x2).sattr("x2",x2).sattr("y2",y2);
                    sideLines.eq(2).sattr("x1",x2).sattr("x2",x1).sattr("y1",y2).sattr("y2",y2);
                    sideLines.eq(3).sattr("y1",y2).sattr("y2",y2);
                }else if(drawingBack){
                    let deltaX =  parseInt((ev.pageX - backX)/currScale);
                    let deltaY = parseInt((ev.pageY - backY)/currScale);
                    let x1 = 0,y1= 0,x2 = 0,y2=0;

                    let backLine = backLines.eq(0);
                    x1 = backLine.data("_x1")-deltaX;
                    y1 = backLine.data("_y1")-deltaY;
                    x2 = backLine.data("_x2")+deltaX;
                    y2 = backLine.data("_y2")-deltaY;
                    backLine.sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);

                    backLine = backLines.eq(1);
                    x1 = backLine.data("_x1")+deltaX;
                    y1 = backLine.data("_y1")-deltaY;
                    x2 = backLine.data("_x2")+deltaX;
                    y2 = backLine.data("_y2")+deltaY;
                    backLine.sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);

                    backLine = backLines.eq(2);
                    x1 = backLine.data("_x1")+deltaX;
                    y1 = backLine.data("_y1")+deltaY;
                    x2 = backLine.data("_x2")-deltaX;
                    y2 = backLine.data("_y2")+deltaY;
                    backLine.sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);

                    backLine = backLines.eq(3);
                    x1 = backLine.data("_x1")-deltaX;
                    y1 = backLine.data("_y1")+deltaY;
                    x2 = backLine.data("_x2")-deltaX;
                    y2 = backLine.data("_y2")-deltaY;
                    backLine.sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);


                    for(let i = 0;i<4;i++){
                        let bLine = backLines.eq(i);
                        let bx1 = parseInt(bLine.attr("x1"));
                        let by1 = parseInt(bLine.attr("y1"));
                        sideLines.eq(i).attr("x2",bx1).attr("y2",by1);
                    }
                }else{
                    //moving 3d
                    let deltaX =  parseInt((ev.pageX - frontX)/currScale);
                    let deltaY = parseInt((ev.pageY - frontY)/currScale);
                    for(let i = 0;i<4;i++){
                        var fontLine = frontLines.eq(i);
                        let x1 = parseInt(fontLine.attr("x1"))+deltaX;
                        let y1 = parseInt(fontLine.attr("y1"))+deltaY;
                        let x2 = parseInt(fontLine.attr("x2"))+deltaX;
                        let y2 = parseInt(fontLine.attr("y2"))+deltaY;
                        backLines.eq(i).sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);
                        sideLines.eq(i).sattr("x2",x1).sattr("y2",y1);
                    }
                }
            }

        }).on("mouseup",function(ev){
            if(drawingFront){
                var width = parseInt(currShape.css("width").replace(/px$/,""));
                if(width < 1){
                    currShape.remove();
                }
                drawingFront = false;
                frontX =  ev.pageX;
                frontY = ev.pageY;
                var x2 =  parseInt((ev.pageX - overlayOffset.left)/currScale);
                var y2 = parseInt((ev.pageY - overlayOffset.top)/currScale);
                if(x2 < xmin){
                    xmin = x2;
                }else if(x2 > xmax){
                    xmax = x2;
                }
                if(y2 < ymin){
                    ymin = y2;
                }else if(y2 > ymax){
                    ymax = y2;
                }

                currShape.children("path").sattr("d",`M${xmin} ${ymin} L${xmax} ${ymin} L${xmax} ${ymax} L${xmin} ${ymax} Z`);
            }else if(drawingBack){
                drawingBack = false;
                drawingCuboid = false;

                var lines = currShape.children("line");
                for(let i = 0;i<lines.length;i++){
                    let line = lines.eq(i);
                    let x1 = parseInt(line.attr("x1"))-xmin;
                    let y1 = parseInt(line.attr("y1"))-ymin;
                    let x2 = parseInt(line.attr("x2"))-xmin;
                    let y2 = parseInt(line.attr("y2"))-ymin;
                    line.sattr("x1",x1).sattr("y1",y1).sattr("x2",x2).sattr("y2",y2);
                }
                currShape.children("path").sattr("d",`M${0} ${0} L${xmax-xmin} ${0} L${xmax-xmin} ${ymax-ymin} L${0} ${ymax-ymin} Z`);
                currShape.removeClass("drawing")
                    .scss("left",xmin).scss("top",ymin)
                    .scss("width",xmax - xmin).scss("height",ymax - ymin);

                createValueItem();

                stopDrawing();
                plugin.toolbar.deselect("cuboid");
                currShape = null;

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
            if (!isDrawing()){
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
                currShape.css("left",(ev.pageX-shapeX)/currScale + shapeLeft)
                    .css("top",(ev.pageY-shapeY)/currScale + shapeTop);
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
                var shape = $(ev.currentTarget)
                if(shape.data("moved") !== true) {
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
    (function enableCanvasSelection() {
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
    img.attr("src",src);

    overlay.children(".shape").remove();
    resultList.empty();

    plugin.toolbar.disable("remove");
    plugin.toolbar.deselect("cuboid");
    if(objects){
        //如果有元素,则考虑元素的移动
        stopDrawing()
        objects.forEach(function(object){
            var name = object.name;
            if(object.cuboid){
                let cuboid = object.cuboid;
                //矩形的载入
                var xmin = parseInt(cuboid["x1"]),ymin = parseInt(cuboid["y1"])
                    ,xmax = parseInt(cuboid["x1"]),ymax = parseInt(cuboid["y1"]);
                for(let i = 2;i<5;i++){
                    if(cuboid["x"+i] < xmin){
                        xmin = parseInt(cuboid["x"+i]);
                    }else if(cuboid["x"+i] > xmax){
                        xmax = parseInt(cuboid["x"+i]);
                    }
                    if(cuboid["y"+i] < ymin){
                        ymin = parseInt(cuboid["y"+i]);
                    }else if(cuboid["y"+i] > ymax){
                        ymax = parseInt(cuboid["y"+i]);
                    }
                }
                var shape = $(cuboidHTML).appendTo(overlay)
                    .data("left",xmin).data("top",ymin)
                    .data("width",xmax - xmin)
                    .data("height",ymax - ymin);
                var frontLines = shape.children("line.front");
                var sideLines = shape.children("line.side");
                var backLines = shape.children("line.back");
                for(let i = 0; i < 4; i++){
                    let fkey = i + 1;
                    let nextFkey = fkey + 1;
                    if(nextFkey == 5) nextFkey = 1;
                    let bkey = i + 5;
                    let nextBkey = bkey + 1;
                    if(nextBkey == 9) nextBkey = 5;
                    frontLines.eq(i).data("x1",cuboid["x"+fkey]-xmin).data("y1",cuboid["y"+fkey]-ymin)
                        .data("x2",cuboid["x"+nextFkey]-xmin).data("y2",cuboid["y"+nextFkey]-ymin)
                    backLines.eq(i).data("x1",cuboid["x"+bkey]-xmin).data("y1",cuboid["y"+bkey]-ymin)
                        .data("x2",cuboid["x"+nextBkey]-xmin).data("y2",cuboid["y"+nextBkey]-ymin)
                    sideLines.eq(i).data("x1",cuboid["x"+fkey]-xmin).data("y1",cuboid["y"+fkey]-ymin)
                        .data("x2",cuboid["x"+bkey]-xmin).data("y2",cuboid["y"+bkey]-ymin);
                }
                shape.children("path").data("d",`M${0} ${0} L${xmax-xmin} ${0} L${xmax-xmin} ${ymax-ymin} L${0} ${ymax-ymin} Z`);
            }
            createValueItem(name);
        })
    }else{
        startDrawing()
        plugin.toolbar.select("cuboid");
    }
});
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

        if(shape.is(".cuboid")){
            var frontLines = shape.children("line.front");
            var backLines = shape.children("line.back");
            var cuboid = {};
            var xmin = shape.data("left");
            var ymin = shape.data("top");
            for(let i = 1;i<5; i++){
                var frontLine = frontLines.eq(i-1);
                cuboid["x"+i] = frontLine.data("x1")+xmin;
                cuboid["y"+i] = frontLine.data("y1")+ymin;
            }
            for(let i = 1;i<5; i++){
                var backLine = backLines.eq(i-1);
                cuboid["x"+(i+4)] = backLine.data("x1")+xmin;
                cuboid["y"+(i+4)] = backLine.data("y1")+ymin;
            }
            doc.outputs.object.push({
                "name":name,
                "cuboid":cuboid
            })
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
        startMoving()
        plugin.toolbar.deselect("cuboid");
        plugin.toolbar.select("move");
    }else if(ev.which == 67){
        keydown = true;
        //C
        startDrawing()
        plugin.toolbar.deselect("move");
        plugin.toolbar.select("cuboid");
        drawingType = "cuboid";
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
document.addEventListener("toolbar-cuboid-deselect",function(){
    stopDrawing()
});
document.addEventListener("toolbar-cuboid-select",function(){
    startDrawing()
    plugin.toolbar.deselect("move");
    drawingType = "cuboid";
});
document.addEventListener("toolbar-move-deselect",function(){
    stopMoving()
});
document.addEventListener("toolbar-move-select",function(){
    startMoving()
    plugin.toolbar.deselect("cuboid");
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