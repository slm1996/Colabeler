/**
 * Created by wutong on 2018/1/20.
 */
var img = null;
var surfer;
var trackCursor;
var splitterCursor;
var trackContainer;
var track;
var trackWave;
var waveform;
var highlight;
var pxPerSec = 20;
var itemHTML = '<div class="track-item"><input type="text" /><label class="track-remove"><i class="fs fs-close"></i></label></div>';
document.addEventListener("stage-ready",function(ev){
    surfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'white',
        progressColor: 'gray',
        splitChannels: false,
        height: 100,
        plugins: [
            WaveSurfer.minimap.create({
                container: '#minimap',
                height:40,
                waveColor: 'darkgray',
                progressColor: 'gray',
            })
        ]
    });

    trackCursor = $("#track-cursor");
    splitterCursor = $("#splitter-cursor");
    highlight = $("#track-highlight");
    waveform = $("#waveform");
    trackContainer = $("#tracks");
    track = trackContainer.find(".track");
    var btnPlay = $("#btn-play");
    var btnPause =  $("#btn-pause");

    var minimap;
    surfer.on("audioprocess",function(){
    });
    surfer.on("play",function(){
        btnPlay.prop("disabled",true);
        btnPause.prop("disabled",false);
    });
    surfer.on("pause",function(){
        btnPlay.prop("disabled",false);
        btnPause.prop("disabled",true);
    });
    surfer.on("finish",function(){
        btnPlay.prop("disabled",false);
        btnPause.prop("disabled",true);
    });
    surfer.on("ready",function(){
        pxPerSec = waveform.width()/surfer.getDuration();
        trackWave = waveform.children("wave");
    })

    $("#btn-play").on("click",function(){
        surfer.play();
    })
    $("#btn-pause").on("click",function(){
        surfer.pause();
    })


    $("body").mousewheel(function(e, delta) {
        var oldLeft = trackContainer[0].scrollLeft;
        trackContainer[0].scrollLeft -= delta * 30;
        var newLeft = trackContainer[0].scrollLeft;
        highlight.css("left",highlight.position().left + oldLeft - newLeft);
        e.preventDefault();
    });

    trackContainer.on("scroll",function(){
        trackWave.scrollLeft(trackContainer.scrollLeft());

    })

    var movingSplitter = null;
    var startPageX = 0;
    var prevWidth = 0;
    var nextWidth = 0;
    var splitterCursorX = 0;
    var splitterPercent = 0;
    $("#tracks").on("mouseout mouseup",".track",function(ev){
        var target = $(ev.target);
        if((ev.type == "mouseup" || target.is(".track")) && movingSplitter){
            movingSplitter = null;
            $(".moving").removeClass("moving");
            ev.stopImmediatePropagation();
        }
    }).on("mousemove",".track",function(ev){
        if(movingSplitter){
            var deltaX = ev.pageX - startPageX;
            var prevItem = movingSplitter.prev();
            var nextItem = movingSplitter.next();
            var prevW = prevWidth + deltaX;
            var nextW = nextWidth - deltaX;
            if(prevW > 0 && nextW > 0){
                var deltaPercent = deltaX*100/track.width();
                var prevPercent = prevW*100/track.width();
                var nextPercent = nextW*100/track.width()
                prevItem.css("width",prevPercent + "%").data("percent",prevPercent);
                nextItem.css("width",nextPercent + "%").data("percent",nextPercent);
                movingSplitter.css("left",(splitterPercent + deltaPercent)+"%").data("percent",(splitterPercent + deltaPercent));
                splitterCursor.css("left",splitterCursorX + deltaX);
            }
            ev.stopImmediatePropagation();
        }
    }).on("mousemove",".track-item",function(ev){
        if(!movingSplitter){
            trackCursor.css("left",ev.pageX);
        }
    }).on("click",".track-item",function(ev){
        var target = $(ev.target);
        if(target.is(".track-item")){
            var currItem = $(ev.currentTarget);
            var splitX = ev.pageX + trackContainer.scrollLeft();
            createItem(currItem,splitX);
        }
    }).on("mouseover",".track-item",function(ev){
        var target = $(ev.target);
        if(!movingSplitter && target.is(".track-item")){
            var currItem = $(ev.currentTarget);
            var width = currItem.width();
            highlight.css("display","").css("height",track.position().top).css("width",width).css("left",currItem.position().left-trackContainer.scrollLeft());
            trackCursor.css("display","").css("height",track.position().top + currItem.height());
        }
    }).on("mouseout",".track-item",function(ev){
        if(!movingSplitter) {
            trackCursor.css("display", "none");
            highlight.css("display", "none");
        }
    }).on("mouseover",".track-splitter",function(ev){
        if(!movingSplitter) {
            var splitter = $(ev.currentTarget);
            var newHeight = track.height() + track.position().top;
            splitterCursor.css("height", newHeight).css("display","").css("left",splitter.position().left - trackContainer.scrollLeft());
            trackCursor.css("display", 'none');
            highlight.css("display", "none");
        }
    }).on("mouseout",".track-splitter",function(ev){
        if(!movingSplitter){
            splitterCursor.css("display","none")
        }
    }).on("mousedown",".track-splitter",function(ev){
        var currItem = $(ev.currentTarget);
        movingSplitter = currItem;
        currItem.addClass("moving");
        prevWidth = currItem.prev().addClass("moving").width();
        nextWidth = currItem.next().addClass("moving").width();
        startPageX = ev.pageX;
        splitterCursorX = splitterCursor.position().left;
        splitterPercent = movingSplitter.data("percent");
    }).on("click",".track-remove",function(ev){
        if(confirm(plugin.i18n.getString("page_confirm_delete"))){
            var trackItem = $(ev.currentTarget).parents(".track-item");
            var item = false;
            var splitter = trackItem.next();
            if(splitter.is(".track-splitter")){
                //后面一个item拓宽
                item = splitter.next();
            }else{
                splitter = trackItem.prev();
                if(splitter.is(".track-splitter")){
                    item = splitter.prev();
                }
            }
            if(item){
                var totalPercent = item.data("percent") + trackItem.data("percent");
                item.css("width", totalPercent + "%" ).data("percent",totalPercent);
                trackItem.remove();
                splitter.remove();
            }else{
                toast(plugin.i18n.getString("page_last_label"))
            }
        }
    }).on("keydown keyup",function(ev){
        ev.stopImmediatePropagation();
    });



    $(window).on("resize",function(){
        var oldWidth = track.width();
        var newWidth = trackContainer.width()*currScale;
        var resizeScale = newWidth / oldWidth;

        track.css("width",newWidth);
        pxPerSec = pxPerSec*resizeScale;
        var newPxPerSec = pxPerSec*currScale;
        surfer.zoom(newPxPerSec);
    });
});
function createItem(item,splitX) {
    var oldPercent = item.data("percent");
    var newWidth = splitX - item.position().left;
    var newPercent = newWidth*100/track.width();
    item.css("width", newPercent+"%").data("percent",newPercent);
    var splitterPercent = splitX*100/track.width();
    var leftPercent = oldPercent - newPercent;
    var new_item = $(itemHTML).insertAfter(item).css("width",leftPercent+"%").data("percent",leftPercent);
    $("<div class='track-splitter'></div>").insertAfter(item).css("left",splitterPercent+"%").data("percent",splitterPercent)
    return new_item;
}
var currScale = 1;
document.addEventListener("stage-zoom",function(ev){
    currScale = ev.detail;
    if(currScale !== false && currScale < 1){
        ev.preventDefault();
        return;
    }
    trackContainer.scrollLeft(0);
    trackWave.scrollLeft(0);
    if(currScale === false){
        currScale = 1;
    }
    var newPxPerSec = pxPerSec*currScale;
    surfer.zoom(newPxPerSec);
    track.css("width",trackContainer.width()*currScale);
});

document.addEventListener("actor-will-enter",function(ev){
    var doc = ev.detail;
    var src = doc.src;
    var objects = doc.outputs.object;
    if (!src) {
        src = "file:///" + doc.path.replace(/\\/g,"/");
    }
    surfer.load(src);
    track.empty();
    var $item = $(itemHTML).appendTo(track).css("width","100%").data("percent",100);
    var splitX = 0;
    if(objects){
        for(let i in objects){
            $item.children('input').val(objects[i].text);
            if(i < objects.length-1){
                splitX = trackContainer.width()*objects[i].end/doc.duration;
                $item = createItem($item,splitX)
            }
        }
    }
});
document.addEventListener("actor-will-finish",function(ev){
    let doc = ev.detail,
    duration = surfer.getDuration(),
    start = 0;
    doc.outputs.object = [];
    doc.duration = duration;
     track.find('.track-item').each(function () {
        let $item = $(this),
            text = $item.children('input').val();
         //音频标注不需要判断是否为空
         doc.outputs.object.push({
             text:text,
             start:start,
             end:start+duration*$item.data('percent')/100
         });
         start = start+duration*$item.data('percent')/100;
     });
});