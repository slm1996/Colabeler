/**
 * Created by wutong on 2018/1/20.
 */
var classify_values = [];
var img = null;
document.addEventListener("stage-ready",function(ev){
    var data = ev.detail;

    var labelResult = $(".result");
    img = $(".preview > img");
    classify_values = data.classify_value.split(",");
    var classify_count = data.classify_count;
    for(var i = 0;i<classify_count;i++){
        labelResult.append("<input data-index='"+i+"' />");
    }
    var labelInputs = labelResult.find("input")
    var datalist = $("<ul class='datalist'></ul>").appendTo(labelResult);
    for(var j = 0;j<classify_values.length;j++){
        datalist.append("<li filter-value='"+classify_values[j]+"' >"+classify_values[j]+"</li>")
    }
    if(classify_count == 1){
        labelResult.find(".datalist").css("width","120px");
    }
    let datalistWidth = labelResult.find(".datalist").css("width");
    labelResult.find("input").css("width",parseInt(datalistWidth)+4+"px");
    datalist.on("mouseover","li",function(){
        $(".contentTips .content").text($(this).text());
        $(".contentTips").css({
            "top": $(this).offset().top - 7,
            "left": $(this).offset().left + 115,
            "display": "block"
        });
    })
    datalist.on("mouseout","li",function(){
        $(".contentTips").css("display","none");
    })

    datalist.on("click","li",function(){
        var $this = $(this);
        var text = $this.text();
        var index = datalist.data("target");
        labelResult.find("input[data-index='"+index+"']").val(text);
    })

    labelResult.on("click","input",function(){
        var parentOffset = labelResult.offset();
        var $this = $(this);
        var offset = $this.offset();
        var index = $this.data("index");
        datalist.stop().css("display","").css("opacity",100).addClass("expand")
            .data("target",index).css("left",offset.left-parentOffset.left)
        var prefix = $this.val();
        var displayCount = 0
        if(prefix){
            datalist.find("li").addClass("hidden");
            displayCount = datalist.find("li[filter-value^='"+prefix+"']").removeClass("hidden").length;
        }else{
            displayCount = datalist.find("li").removeClass("hidden").length
        }
        datalist.css("max-height",displayCount*30)
    }).on("input","input",function(){
        var $this = $(this);
        var prefix = $this.val();
        var displayCount = 0
        if(prefix){
            datalist.find("li").addClass("hidden");
            displayCount = datalist.find("li[filter-value^='"+prefix+"']").removeClass("hidden").length;
        }else{
            displayCount = datalist.find("li").removeClass("hidden").length
        }
        datalist.css("max-height",displayCount*30)
    }).on("focusout",function(){
        if(labelResult.find("input:focus").length == 0){
            datalist.fadeOut(300,function(){
                datalist.removeClass("expand")
            });
        }
    });
})

document.addEventListener("actor-will-enter",function(ev){
    var doc = ev.detail;
    var src = doc.src;
    if (!src) {
        src = "file:///" + doc.path.replace(/\\/g,"/");
    }
    var objects = doc.outputs.object;
    img.attr("src",src);

    var labelInputs = $("input");
    labelInputs.val("");//清空
    for(var ri in objects){
        labelInputs.eq(ri).val(objects[ri].name);
    }
})
document.addEventListener("actor-will-finish",function(ev){
    var doc = ev.detail;
    var labelInputs = $("input");
    doc.size ={
        width:img[0].naturalWidth,
        height:img[0].naturalHeight,
        depth:3
    }
    doc.outputs.object = [];
    for(let i = 0;i<labelInputs.length;i++){
        var targetValue = labelInputs.eq(i).val();
        if(targetValue == ""){
            $.toast(plugin.i18n.getString("page_notEmpty"));
            ev.preventDefault();
            return;
        }
        if($.inArray(targetValue, classify_values) == -1){
            $.toast(targetValue+plugin.i18n.getString("page_invalid"))
            ev.preventDefault();
            return;
        }
        doc.outputs.object.push({
            name:targetValue
        });
    }
})