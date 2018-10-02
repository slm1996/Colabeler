/**
 * Created by wutong on 2018/1/20.
 */
var img = null;
document.addEventListener("stage-ready",function(ev){
    var labelResult = $(".result");
    img = $(".preview > img");
})

document.addEventListener("actor-will-enter",function(ev){
    var doc = ev.detail;
    var src = doc.src;
    if (!src) {
        src = "file:///" + doc.path.replace(/\\/g,"/");
    }
    var transcript = doc.outputs.transcript;
    img.attr("src",src);

    var labelInputs = $("input");
    labelInputs.val("");//清空

    labelInputs.eq(0).val(transcript);

})
document.addEventListener("actor-will-finish",function(ev){
    var doc = ev.detail;
    var labelInputs = $("input");
    doc.size ={
        width:img[0].naturalWidth,
        height:img[0].naturalHeight,
        depth:3
    }
    for(let i = 0;i<labelInputs.length;i++){
        var targetValue = labelInputs.eq(i).val();
        if(targetValue == ""){
            $.toast(plugin.i18n.getString("page_notEmpty"));
            ev.preventDefault();
            return;
        }
        doc.outputs.transcript=targetValue;
    }
})