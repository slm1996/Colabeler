/**
 * Created by wutong on 2018/1/20.
 */

const lineHeight = 30;
const text_offset_left = 50;
let from_to_separation = '---sjs---',

    entity_values = [],
    relation_values = {},
    relation_indexes = {},//方便搜索
    event_values = {},
    attribute_values = {},

    preview = null,
    svg = null,
    textWrapper = null,
    annotation = null,

    initAnnotationLeft  = 0,
    range = null,

    data_T = [""],
    data_E = [""],
    data_R = [""],
    data_A = [""],

    colorHash = new ColorHash(),

    is_dragging = false;
document.addEventListener("stage-ready",function(ev){
    initInputs(ev.detail);

    preview = $("#preview");
    svg = preview.children('svg');
    textWrapper = svg.find("g.text");
    annotation = svg.find("g.annotation");
    initAnnotationLeft = annotation.offset().left;

    textWrapper.on("mouseup",function(ev){
        let selection = window.getSelection();
        range = selection.getRangeAt(0);
        if(selection.type === "Range"){
            if(selection.focusNode !== selection.anchorNode){
                $.toast(plugin.i18n.getString("page_notCross"));
                return;
            }
            dialogNewT();
        }
    });
    let is_hover = false;
    annotation.on('mouseenter','.span rect,.arc text',function (e) {//悬浮窗
        let anno = $(this),
        type = anno.data('type'),
        comment_type = '',
        comment_id = '',
        comment_text = '',
        comment_attributes = '',
        popup = $('#commentpopup');
        is_hover = true;
        if(type === 'T'){
            let T_ID = $(this).data('id'),
            fill =anno.attr('fill');
            anno.attr('stroke-width','2px').attr('stroke',Util.adjustColorLightness(fill,-0.6));
            let highlight = svg.find(".highlights [data-id="+T_ID+"]");
            svg.find(".highlights").append(highlight.clone().attr('transform',highlight.parent().attr('transform')).attr('fill',fill).addClass('tmp'));
            let id = data_T[T_ID].E_ID?data_T[T_ID].E_ID:T_ID;
            comment_type = data_T[T_ID].name;
            comment_id = data_T[T_ID].type+id;
            comment_text = "\""+data_T[T_ID].value+"\"";
            for(let i in data_T[T_ID].attributes){
                let attribute = data_A[data_T[T_ID].attributes[i]];
                comment_attributes += attribute.name;
                if(attribute.value){
                    comment_attributes+=':'+attribute.value;
                }
                comment_attributes += " ";
            }
        }else {
            let id = anno.data('id'),
            texts = annotation.find("[data-id=\""+id+"\"][data-type="+type+"][data-val="+anno.data('val')+"]");
            texts.attr('font-weight',700).siblings('path').attr('stroke-width',1.5);
            if(type === 'E'){
                let data_from = data_T[anno.data('from')],
                data_to = data_T[anno.data('to')];
                comment_type = data_from.name+' -> '+anno.text()+' -> '+data_to.name;
                comment_id = id;
                comment_text = "\""+data_from.value+"\"->\""+data_to.value+"\"";
            }else{
                let data_from = data_T[data_R[id].from],
                data_to = data_T[data_R[id].to];
                comment_type = data_from.name+' -> '+data_R[id].name+' -> '+data_to.name;
                comment_id = 'R'+id;
                comment_text = "\""+data_from.value+"\"->\""+data_to.value+"\"";
            }
        }
        popup.find('.comment_type').text(comment_type);
        popup.find('.comment_id').text("ID:"+comment_id);
        popup.find('.comment_text').text(comment_text);
        popup.find('.attribute').text(comment_attributes);
        setTimeout(function () {
            if(is_hover) {
                popup.show();
            }
        },500);
    }).on('mousemove','.span rect,.arc text',function (e) {
        let popup = $('#commentpopup'),
        height = popup.outerHeight(),
        width = popup.outerWidth(),
        x,y;
        if(e.pageY<20+height){
            y = e.pageY+20;
        }else{
            y = e.pageY-20-height;
        }
        if(e.pageX+width+20>svg.width()){
            x = e.pageX-width-20;
        }else{
            x = e.pageX+20;
        }
        popup.css("top",y + "px").css("left",x + "px");
    }).on('mouseleave','.span rect,.arc text',function () {
        is_hover = false;
        if($(this).data('type') === 'T'){
            $(this).attr('stroke-width','1px');
            svg.find(".highlights .tmp").remove();
        }else{
            let id = $(this).data('id'),
            type = $(this).data('type'),
            texts = annotation.find("[data-id=\""+id+"\"][data-type="+type+"][data-val="+$(this).data('val')+"]");
            texts.attr('font-weight',100).siblings('path').attr('stroke-width',1);
        }
        $('#commentpopup').hide();
    });

    let drag_from_id;
    svg.on('mousedown','.span rect',function () {//拖拽
        is_dragging = true;
        drag_from_id = $(this).data('id');
        let width = this.getBBox().width;
        let offset = $(this).offset(),
        x = offset.left+preview.scrollLeft(),
        y = offset.top+preview.scrollTop();
        $('.drag_stroke').attr('d','M'+(x+width/2)+','+y+'Q'+x+','+y+' '+x+','+y);
        svg.addClass('unselectable');
    }).on('mousemove',function (e) {
        if(is_dragging){
            let path  = $('.drag_stroke').show();
            let attr = path.attr('d');
            path.attr('d',attr.replace(/M(.+),(.+)Q(.+)/,function (str,x,y) {
                x = parseInt(x);
                y = parseInt(y);
                let pageY = e.pageY+preview.scrollTop(),
                pageX = e.pageX+preview.scrollLeft(),
                y1 = y-Math.max((y-pageY),0)*1.5-50;
                return 'M'+x+','+y+'Q'+(x+(pageX-x)/2)+','+y1+' '+pageX+','+pageY;
            }));
        }
    }).on('mouseup',function () {
        is_dragging = false;
        svg.removeClass('unselectable');
        $('.drag_stroke').hide();
    }).on('mouseup','.span rect',function (e) {
        let drag_to_id = $(this).data('id');
        if(drag_from_id === drag_to_id) return;
        let drag_from = data_T[drag_from_id],
            drag_to = data_T[drag_to_id];
        if(drag_from.type === 'T'){
            if(relation_indexes[drag_from.name+from_to_separation+drag_to.name]){
                dialogNewArc(drag_from,drag_to,relation_indexes[drag_from.name+from_to_separation+drag_to.name])
            }
        }else{
            if(event_values[drag_from.name][drag_to.name]){
                dialogNewArc(drag_from,drag_to,event_values[drag_from.name][drag_to.name])
            }
        }
    });

    annotation.on('dblclick','.span rect,.arc text',function () {//删除标注
        dialogDelete($(this))
    })
});

document.addEventListener("actor-will-enter",function(ev){
    is_dragging = false;
    initSvg();
    let doc = ev.detail,
    annotations = doc.outputs.annotation;
    wrap(doc.content.replace(/^\ufeff/,'').split(/[\r\n]+/));//初始化文本并自动折行
    svg.height(textWrapper[0].getBBox().height+50);
    if(annotations && annotations['T']){
        data_T = annotations.T;
        data_E = annotations.E;
        data_R = annotations.R;
        data_A = annotations.A;
    }else if(annotations){
        for(let i in annotations){//兼容之前版本
            let entity = annotations[i].entity;
            data_T[entity.id] =  {
                type:'T',
                name:entity.name,
                value:entity.text,
                start:entity.start,
                end:entity.end,
                attributes:{},
                id:entity.id
            };
        }
    }else{
        data_T = [""];
        data_E = [""];
        data_R = [""];
        data_A = [""];
    }
    let tspan;
    for(let i=1;i<data_T.length;i++){//render标注
        if(data_T[i]){
            textWrapper.find('tspan').each(function () {
                if($(this).data('start')>data_T[i].start){
                    return false;
                }
                tspan = $(this);
            });
            try{
                range = document.createRange();
                range.setStart(tspan[0].childNodes[0],data_T[i].start-tspan.data('start'));
                range.setEnd(tspan[0].childNodes[0],data_T[i].end-tspan.data('start'))
                drawT(data_T[i].name,data_T[i].id)
            }catch (e){
                console.log(e)
            }
        }
    }
    for(let i=1;i<data_E.length;i++){
        if(data_E[i] && data_E[i].participants){
            for(let to in data_E[i].participants){
                for(let role in data_E[i].participants[to]){
                    drawArc(data_E[i].T_ID,to,'E'+i+'->T'+to,role)
                }
            }
        }
    }
    for(let i=1;i<data_R.length;i++){
        if(data_R[i]){
            drawArc(data_R[i].from,data_R[i].to,i,data_R[i].name)
        }
    }
});
document.addEventListener("actor-will-finish",function(ev){
    let doc = ev.detail;
    doc.outputs.annotation = {
        T:data_T,
        E:data_E,
        R:data_R,
        A:data_A
    };
});

function initSvg() {
    textWrapper.html('');
    annotation.html('');
    svg.find('g.line-num').html('');
    svg.find('g.background').html('');
    svg.find('g.highlights').html('');
}
function initInputs(inputs) {
    entity_values = inputs.entity_value.split(",").map((val)=>{return val.trim()});
    if(!inputs.relation_value) return;
    inputs.relation_value.split('\n').map((val)=>{//初始化relations
        val.replace(/([^\s]+)\s+([^:\s]+)\s*:\s*([^:,\s]+)\s*,\s*([^:\s]+)\s*:\s*([^:,\s]+)/,function (str,relation_name,arg1,from,arg2,to) {
            relation_values[relation_name] = {form:from,to:to,arg1:arg1,arg2:arg2};
            let index = from+from_to_separation+to;
            if(relation_indexes[to+from_to_separation+from]) {
                index = to+from_to_separation+from;
            }else if(!relation_indexes[index]){
                relation_indexes[index] = [];
            }
            relation_indexes[index].push(relation_name)
        });
    });
    inputs.event_value.split('\n').map((val)=>{//初始化events
        let event_name = '';
        val = val.trim();
        val.replace(/^([^\s]+)\s*/,function (str,$1,index) {
            event_name = $1;
            val =  val.substring(index)
        });
        if(!event_name) return;
        event_values[event_name] = {};
        val.replace(/\s*([^:\s,]+)\s*:\s*([^:,\s]+)\s*,?/g,function (str,role,entity) {
            if(!event_values[event_name][entity]) event_values[event_name][entity] = [];
            event_values[event_name][entity].push(role);
        });
    });
    inputs.attribute_value.split('\n').map((val)=>{//初始化annotations
        val = val.trim();
        val.replace(/^([^\s]+)\s*<\s*([^>]+)\s*>\s*(:\s*([^\s]+))?/,function (str,attribute_name,entity,values_wrapper,values) {
            values = values || "";
            values = values.split('|');
            if(values.length<2) values = [true,false];
            if(!attribute_values[entity]) attribute_values[entity] = {};
            attribute_values[entity][attribute_name] = values;
        });
    });
}

function dialogNewT() {
    let text = range.toString().trim();
    if(!text) return;
    let entity_types = '';
    let event_types = '';
    entity_values.map((val)=>{entity_types+="<div class='item'><label><input type='radio' data-type='T' name='entity_type' value='"+val+"'><span style='background-color:"+colorHash.hex(val)+"'>"+val+"</span></label></div>"});
    Object.keys(event_values).map((val)=>{event_types+="<div class='item'><label><input type='radio' data-type='E' name='event_type' value='"+val+"'><span style='background-color:"+colorHash.hex(val)+"'>"+val+"</span></label></div>"});
    $.dialog({
        title:"新建标注",
        width:700,
        html:true,
        text:"<div class='dialog-annotation dialog-new-T'><fieldset class='text'>"+text+"<legend>Text</legend></fieldset>" +
        "<div class='selector'>" +
        "<div class='entity_section'><p>Entity Type</p><div class='scroller entity_types'>"+entity_types+"</div>" +
        '<div id="entity_attribute_label" class="label-like wrapper_lower_label">Entity attributes</div>' +
        "<div class='attributes entity-attributes'></div></div>"+
        "<div class='event_section'><p>Event Type</p><div class='scroller event_types'>"+event_types+"</div>" +
        '<div id="event_attribute_label" class="wrapper_lower_label label-like">Event attributes</div>' +
        "<div class='attributes event-attributes'></div></div>"+
        "</div></div>",
        onLoaded:function ($dialog) {
            let checked = $dialog.find('.item:eq(0) input').prop('checked',true);
            $dialog.find('.entity-attributes').html(getAttributeInputs(checked.val(),'T')).show();
            $dialog.find('.event-attributes');
            $dialog.find('.item').on('click',function (e) {
                $dialog.find('.item input').prop('checked',false);
                checked = $(this).find('input').prop('checked',true);
                let type = checked.data('type');
                if(type === 'T'){
                    $dialog.find('.entity-attributes').html(getAttributeInputs(checked.val(),type));
                    $dialog.find('.event-attributes').empty();
                }else{
                    $dialog.find('.event-attributes').html(getAttributeInputs(checked.val(),type));
                    $dialog.find('.entity-attributes').empty()
                }
            });
        },
        onConfirmed:function ($dialog) {
            let checked = $dialog.find('.item input:checked');
            let attributes = [];
            $dialog.find('.attributes :checked').each(function () {
                let val = $(this).val();
                if(val){
                    val = val==='on'?'':val;
                    let attribute = {
                        name:$(this).attr('name'),
                        value:val
                    };
                    let A_ID = data_A.push(attribute)-1;
                    attributes.push(A_ID);
                }
            });
            labelT(checked.val(),checked.data('type'),attributes);
            $dialog.hideDialog();
        },
        onClosed:function () {
            window.getSelection().removeAllRanges();
        }
    })
}

function getAttributeInputs(entity,type) {
    let attributes = attribute_values[entity];
    attributes = attributes || {};
    attributes = $.extend({},attributes);
    if(type === 'T' && attribute_values['entity']){
        Object.assign(attributes,attribute_values['entity']);
    }else if(type === 'E' && attribute_values['event']){
        Object.assign(attributes,attribute_values['event']);
    }
    let inputs = '';
    for(let name in attributes){
        if(attributes[name].length===2 && [true,false,'true','false'].indexOf(attributes[name][0])>-1 && [true,false,'true','false'].indexOf(attributes[name][1])>-1){
            inputs += "<div class='attribute'><input type='checkbox' name='"+name+"'/>"+name+"</div>"
        }else{
            let item = '<div class="attribute"><select name="'+name+'">';
            item += "<option value=''>"+name+":?</option>";
            for(let i in attributes[name]){
                item += "<option value='"+attributes[name][i]+"' name='"+name+"'>"+name+':'+attributes[name][i]+"</option>"
            }
            item +="</select></div>";
            inputs+=item;
        }
    }
    return inputs;
}

function dialogNewArc(from,to,types) {
    let items = "";
    types.map((val)=>{items+="<div class='item'><label><input type='radio' name='type' value='"+val+"'><span>"+val+"</span></label></div>"});
    $.dialog({
        title:plugin.i18n.getString("new_annotation"),
        width:700,
        html:true,
        text:"<div class='dialog-annotation dialog-new-arc'>" +
        "<fieldset class='text'>"+from.name+' ("'+from.value+"\")<legend>From</legend></fieldset>" +
        "<fieldset class='text'>"+to.name+' ("'+to.value+"\")<legend>To</legend></fieldset>" +
        "<fieldset class='selector'><legend>Type</legend>"+items+
        "</fieldset></div>",
        onLoaded:function ($dialog) {
            $dialog.find('.item:eq(0) input').prop('checked',true);
        },
        onConfirmed:function ($dialog) {
            let checked = $dialog.find('.item input:checked');
            labelArc(from,to,checked.val());
            $dialog.hideDialog();
        }
    })
}

function dialogDelete(element) {
    $.dialog({
        title:plugin.i18n.getString("delete_annotation"),
        html:true,
        text:"<p class='text-center'>"+plugin.i18n.getString("delete_annotation_confirm")+"</p>",
        onConfirmed:function ($dialog) {
            let id = element.data('id'),
            type = element.data('type'),
            elements_delete = element;
            if(type==='T'){
                if(annotation.find("[data-from="+id+"],[data-to="+id+"]").length>0){
                    toast(plugin.i18n.getString("delete_annotation_error"));
                    $dialog.hideDialog();
                    return false;
                }
                delete data_E[data_T[id].E_ID];
                delete data_T[id];
            }else if(type === 'E'){
                let role = element.data('val'),
                from = element.data('from'),
                to = element.data('to');
                elements_delete =  annotation.find("[data-id=\""+id+"\"][data-type=E][data-val="+role+"]");
                delete data_E[data_T[from].E_ID].participants[to][role];
            }else{
                delete data_R[id];
                elements_delete = annotation.find("[data-id=\""+id+"\"][data-type=R]");
            }
            elements_delete.each(function () {
                let transform = $(this).parents('.line-annotation');
                const transform_height_before = transform[0].getBBox().height;
                $(this).parent().remove();
                reRender(transform.data('index'),transform[0].getBBox().height-transform_height_before);
                if(type === 'T'){
                    svg.find('g.highlights rect[data-id='+id+']').remove();
                    reRenderArcs(transform.data('index'));
                }
            });
            plugin.setChanged(true);
            $dialog.hideDialog();
        }
    })
}

function labelT(name,type,attributes) {
    let tspan = $(range.endContainer).parent(),
    T_ID = saveDataT(type,name,range.toString().trim(),tspan.data('start'),attributes);
    drawT(name,T_ID);
    plugin.setChanged(true);
}

function drawT(name,id) {
    let tspan = $(range.endContainer).parent(),
        tspan_index = textWrapper.find('tspan').index(tspan),
        transform = annotation.find('g.line-'+tspan_index);
    if(transform.length===0){
        transform =annotation.append($.parseXML('<g xmlns="http://www.w3.org/2000/svg" data-index="'+tspan_index+'" class="line-annotation line-'+tspan_index+'" transform="translate(-'+initAnnotationLeft+','+tspan.attr('y')+')"><g class="spans" transform="translate(0,0)"></g><g class="arcs" transform="translate(0,0)"></g></g>').documentElement).find('g.line-'+tspan_index);
    }

    let highlights = svg.find('g.highlights');
    let highlight = highlights.find('g.line-'+tspan_index);
    if(highlight.length===0){
        highlight =highlights.append($.parseXML('<g xmlns="http://www.w3.org/2000/svg" data-index="'+tspan_index+'" class="line-highlight line-'+tspan_index+'" transform="translate(-'+initAnnotationLeft+','+tspan.attr('y')+')"></g>').documentElement).find('g.line-'+tspan_index);
    }

    let text_width = measureTextWidth(name),
        rect = range.getBoundingClientRect(),
        item_width = Math.max(rect.width,text_width+10),
        item_left = rect.left+rect.width/2-item_width/2,
        item_right = rect.left+rect.width/2+item_width/2,
        y_base = get_y_base(transform.find('.span rect'),item_left,item_right,rect.top);
    let color = colorHash.hex(name),
    rect_left_real = rect.left+preview.scrollLeft(),
    rect_right_real = rect.right+preview.scrollLeft(),
    item = $.parseXML("<g xmlns='http://www.w3.org/2000/svg' class='span'><rect data-id='"+id+"' data-type='T' class='rect' x='"+(rect_left_real+rect.width/2-text_width/2-7)+"' y='"+(y_base-33.5)+"' width='"+(text_width+16)+"' height='14' fill='"+color+"' stroke='"+Util.adjustColorLightness(color,-0.6)+"' rx='2' ry='1'></rect>" +
        "<text x='"+(rect_left_real+rect.width/2-text_width/2)+"' y='"+(y_base-22)+"' fill='black'>"+name+"</text>" +
        "<path d='M"+rect_left_real+","+(y_base-12.5)+"C"+rect_left_real+","+(y_base-16.5)+" "+(rect_left_real+rect.width/2)+","+(y_base-12.5)+' '+(rect_left_real+rect.width/2)+","+(y_base-16.5)+"C"+(rect_right_real-rect.width/2)+","+(y_base-12.5)+" "+rect_right_real+","+(y_base-16.5)+' '+rect_right_real+","+(y_base-12.5)+"'></path></g>").documentElement;
    let spans = transform.find('.spans');
    const height_before = spans[0].getBBox().height;
    spans.append(item);
    let highlight_item = $.parseXML("<rect xmlns='http://www.w3.org/2000/svg' data-id='"+id+"' x='"+rect_left_real+"' y='-13' width='"+rect.width+"' height='"+rect.height+"' fill='"+Util.adjustColorLightness(color,0.8)+"'></rect>").documentElement;
    highlight.append(highlight_item);
    reRender(tspan_index,spans[0].getBBox().height-height_before);
    reRenderArcs(tspan_index);
}

function labelArc(from,to,val) {
    let data_id;
    if(from.type==='T'){
        data_id = saveDataR(val,from.id,to.id);
    }else{
        data_id = saveDataE(val,from.id,to.id);
        if(!data_id) return;
    }
    drawArc(from.id,to.id,data_id,val);
    plugin.setChanged(true);
}

function drawArc(from_id,to_id,data_id,val) {
    let from = data_T[from_id],
        to = data_T[to_id],
        rect_from = annotation.find('.span .rect[data-id='+from_id+']'),
        rect_to = annotation.find('.span .rect[data-id='+to_id+']'),
        transform_from = rect_from.parents('.line-annotation'),
        tspan_index_from = transform_from.data('index'),
        transform_to = rect_to.parents('.line-annotation'),
        tspan_index_to =transform_to.data('index'),
        direction,
        position_left,
        position_right,
        item,
        text_width = measureTextWidth(val);
    if(tspan_index_from===tspan_index_to){
        direction = rect_from.attr('x')<=parseInt(rect_to.attr('x'))+parseInt(rect_to.width())?'right':'left';
    }else if(tspan_index_from<tspan_index_to){
        direction = 'right';
    }else{
        direction = 'left';
    }
    if(direction === 'right'){
        position_left = [parseInt(rect_from.attr('x')),parseInt(rect_from.attr('y'))+rect_from.attr('height')/2];
        position_right = [parseInt(rect_to.attr('x'))+parseInt(rect_to.attr('width')),parseInt(rect_to.attr('y'))];
    }else{
        position_left = [parseInt(rect_to.attr('x')),parseInt(rect_to.attr('y'))+rect_to.attr('height')/2];
        position_right = [parseInt(rect_from.attr('x'))+parseInt(rect_from.attr('width')),parseInt(rect_from.attr('y'))];
    }
    if(tspan_index_from===tspan_index_to){//同一行
        let text_x = position_left[0]+(position_right[0]-position_left[0])/2,
            text_y = Math.min(position_left[1],position_right[1])-14,
            y_base = get_y_base(transform_from.find('.arc text,.span rect'),position_left[0]-8,position_right[0]+8,Math.min(rect_from.offset().top,rect_to.offset().top));
        item = $.parseXML("<g xmlns='http://www.w3.org/2000/svg' class='arc'>" +
            "<path "+(direction==='left'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x-text_width/2)+","+(y_base+text_y)+"L"+(position_left[0]-3)+","+(y_base+text_y)+"Q"+(position_left[0]-8)+","+(y_base+text_y)+" "+position_left[0]+","+position_left[1]+"'></path>" +
            "<path "+(direction==='right'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x+text_width/2)+","+(y_base+text_y)+"L"+(position_right[0]+3)+","+(y_base+text_y)+"Q"+(position_right[0]+8)+","+(y_base+text_y)+" "+position_right[0]+","+position_right[1]+"'></path>" +
            "<text data-id='"+data_id+"' data-val='"+val+"' data-from='"+from_id+"' data-to='"+to_id+"' data-type='"+(from.type==='T'?'R':'E')+"' x='"+text_x+"' y='"+(y_base+text_y)+"' fill='black'>"+val+"</text></g>").documentElement;
        const transform_height_before = transform_from[0].getBBox().height;
        transform_from.find('.arcs').append(item);
        reRender(tspan_index_from,transform_from[0].getBBox().height-transform_height_before);
    }else {
        let svg_width = svg.width(),
            text_x,
            text_y,
            index_min = Math.min(tspan_index_from,tspan_index_to),
            index_max = Math.max(tspan_index_from,tspan_index_to),
            rect_left = direction === 'left'?rect_to:rect_from,
            rect_right = direction === 'left'?rect_from:rect_to;
        for(let index=index_min;index<=index_max;index++){
            let transform = annotation.find('g.line-'+index);
            if(transform.length===0){
                let tspan = textWrapper.find('tspan:eq('+index+')');
                transform =annotation.append($.parseXML('<g xmlns="http://www.w3.org/2000/svg" data-index="'+index+'" class="line-annotation line-'+index+'" transform="translate(-'+initAnnotationLeft+','+tspan.attr('y')+')"><g class="spans" transform="translate(0,0)"></g><g class="arcs" transform="translate(0,0)"></g></g>').documentElement).find('g.line-'+index);
            }
            const transform_height_before = transform[0].getBBox().height;
            if(index === index_min){
                text_x = (svg_width+position_left[0])/2;
                text_y = position_left[1]-14;
                let y_base = get_y_base(transform.find('.arc text,.span rect'),position_left[0]-8,svg_width,rect_left.offset().top);
                item = "<g xmlns='http://www.w3.org/2000/svg' class='arc'>" +
                    "<path "+(direction==='left'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x-text_width/2)+","+(y_base+text_y)+"L"+(position_left[0]-3)+","+(y_base+text_y)+"Q"+(position_left[0]-8)+","+(y_base+text_y)+" "+position_left[0]+","+position_left[1]+"'></path>" +
                    "<path "+(direction==='right'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x+text_width/2)+","+(y_base+text_y)+"L"+(svg_width)+","+(y_base+text_y)+"'></path>" +
                    "<text data-id='"+data_id+"'  data-val='"+val+"' data-from='"+from_id+"' data-to='"+to_id+"' data-type='"+(from.type==='T'?'R':'E')+"' x='"+text_x+"' y='"+(y_base+text_y)+"' fill='black'>"+val+"</text></g>";

            }else if(index === index_max){
                text_x = (text_offset_left+position_right[0])/2;
                text_y = position_right[1]-14;
                let y_base = get_y_base(transform.find('.arc text,.span rect'),text_offset_left,position_right[0]+8,rect_right.offset().top);
                item = "<g xmlns='http://www.w3.org/2000/svg' class='arc'>" +
                    "<path "+(direction==='left'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x-text_width/2)+","+(y_base+text_y)+"L"+(text_offset_left)+","+(y_base+text_y)+"'></path>" +
                    "<path "+(direction==='right'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(text_x+text_width/2)+","+(y_base+text_y)+"L"+(position_right[0]+3)+","+(y_base+text_y)+"Q"+(position_right[0]+8)+","+(y_base+text_y)+" "+position_right[0]+","+position_right[1]+"'></path>" +
                    "<text data-id='"+data_id+"' data-val='"+val+"' data-from='"+from_id+"' data-to='"+to_id+"' data-type='"+(from.type==='T'?'R':'E')+"' x='"+text_x+"' y='"+(y_base+text_y)+"' fill='black'>"+val+"</text></g>";
            }else{
                text_y = -26;
                let y_base = get_y_base(transform.find('.arc text,.span rect'),text_offset_left,svg_width,transform.offset().top+transform[0].getBBox().height);
                item = "<g xmlns='http://www.w3.org/2000/svg' class='arc'>" +
                    "<path "+(direction==='left'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(svg_width/2-text_width/2)+","+(y_base+text_y)+"L"+text_offset_left+","+(y_base+text_y)+"'></path>" +
                    "<path "+(direction==='right'?"marker-end='url(#drag_arrow)'":"")+" d='M"+(svg_width/2+text_width/2)+","+(y_base+text_y)+"L"+svg_width+","+(y_base+text_y)+"'></path>" +
                    "<text data-id='"+data_id+"' data-val='"+val+"' data-from='"+from_id+"' data-to='"+to_id+"' data-type='"+(from.type==='T'?'R':'E')+"' x='"+svg_width/2+"' y='"+(y_base+text_y)+"' fill='black'>"+val+"</text>" +
                    "<rect class='improve-height' width='1' height='14' y='"+(y_base+text_y)+"' fill='none'></rect></g>";
            }
            transform.find('.arcs').append($.parseXML(item).documentElement);
            let delta_height = transform[0].getBBox().height-transform_height_before;
            reRender(index,delta_height);
        }
    }
}

function get_y_base(items,x_left,x_right,y) {//处理堆叠情况
    let y_base = 0;
    items.each(function () {
        let offset = $(this).offset(),
        width = this.getBBox().width;
        if((offset.left<x_right && offset.left>x_left) || ((offset.left+width)<(x_right) && (offset.left+width)>x_left)){
            y_base = Math.min(y_base,offset.top-y);
        }else if((x_left<(offset.left+width) && x_left>offset.left) || ((x_right)<(offset.left+width) && (x_right)>offset.left)){
            y_base = Math.min(y_base,offset.top-y);
        }
    });
    return y_base;
}

function saveDataT(type,name,val,offset,attributes) {
    let T_ID = data_T.push({
            type:type,
            name:name,
            value:val,
            start:offset+range.startOffset,
            end:offset+range.endOffset,
            attributes:attributes
        })-1;
    data_T[T_ID].id = T_ID;
    if(type === 'E'){
        data_T[T_ID].E_ID = data_E.push({
            T_ID:T_ID,
            name:name
        })-1;
    }
    return T_ID;
}

function saveDataR(name,from,to) {
    return data_R.push({
            name:name,
            from:from,
            to:to,
            arg1:relation_values[name].arg1,
            arg2:relation_values[name].arg2
        })-1;
}

function saveDataE(role,from,to) {
    let E_ID  = data_T[from].E_ID;
    if(!data_E[E_ID].participants) data_E[E_ID].participants = {};
    if(!data_E[E_ID].participants[to]) data_E[E_ID].participants[to] = {};
    if(data_E[E_ID].participants[to][role]) return false;
    data_E[E_ID].participants[to][role] = role;
    return 'E'+E_ID+'->T'+to;
}

function reRender(tspan_index,height) {
    let tspan = textWrapper.find('tspan:eq('+tspan_index+')'),
    line_index = tspan.parent().index();
    height = Number(height);
    if(!height) return;
    let bgs = svg.find(".background rect:not(:lt("+line_index+"))");
    let line_nums = svg.find(".line-num text:not(:lt("+line_index+"))");
    bgs.each(function (index) {
        if(index>0){
            $(this).attr('y',Number($(this).attr('y'))+height);
        }
    });
    bgs.eq(0).attr("height",Number(bgs.eq(0).attr('height'))+height);
    line_nums.each(function (index) {
        if(index>0) {
            $(this).attr('y',Number($(this).attr('y'))+height);
        }
    });
    if(tspan.index()===0){
        line_nums.eq(0).attr("y",Number(line_nums.eq(0).attr('y'))+height);
    }
    svg.find(".line-highlight").each(function () {
        if($(this).data('index')>=tspan_index){
            $(this).attr('transform',$(this).attr('transform').replace(/,(.+)\)/,function (str,y) {
                return ','+(Number(y)+height)+')';
            }));
        }
    });
    textWrapper.find('tspan:not(:lt('+tspan_index+'))').each(function () {
        $(this).attr('y',Number($(this).attr('y'))+height);
    });
    annotation.find('.line-annotation').each(function () {
        if($(this).data('index')>=tspan_index){
            $(this).attr('transform',$(this).attr('transform').replace(/,(.+)\)/,function (str,y) {
                return ','+(Number(y)+height)+')';
            }));
        }
    });
    svg.height(svg.height()+height);
}
function reRenderArcs(tspan_index) {
    let transform = annotation.find('.line-annotation[data-index='+tspan_index+']'),
    arcs = transform.find('.arc');
    arcs.each(function () {
        let rect = this.getBoundingClientRect(),
        height = -26,
        y_base = get_y_base(transform.find('.span rect'),rect.left,rect.right,transform[0].getBoundingClientRect().bottom);
        $(this).find('text').each(function () {
            $(this).attr('y',y_base+height);
        });
        $(this).find('path').each(function () {
            $(this).attr('d',$(this).attr('d').replace(/([^,]+)(L.+?,)([^Q]+)(Q.+?,)?([^\s]+)?/,function(str,y1,L,y2,Q,y3){
                let replace_str = (y_base+height)+L+(y_base+height);
                if(Q){
                    replace_str += Q+(y_base+height);
                }
                return replace_str;
            }))
        });
    });
}
function wrap(texts) {
    let width = svg.width()-text_offset_left;
    let start = 0,
        y_base = lineHeight,
        back_collections = '',
        line_collections = '',//行号
        text_collections = '';
    texts.forEach(function (words,index) {
        let lineNumber = 0,
            tspan = "<text><tspan data-start='"+start+"' x='"+text_offset_left+"' y='"+y_base+"'>{{{content}}}</tspan>";
        for(let i=0,loop=Math.ceil(Math.log2(words.length)),try_len=words.length,delta_len=words.length;i<loop;i++){//2分法wrap
            delta_len = parseInt(delta_len/2);
            let textLength = measureTextWidth(words.substring(0,try_len),'14px');
            if(textLength <= width && textLength > width-text_offset_left || delta_len === 0) {
                tspan = tspan.replace("{{{content}}}",words.substring(0,try_len));
                start += try_len;
                if(try_len < words.length){//重新开始for循环
                    words = words.substring(try_len);
                    i=-1;
                    loop=Math.ceil(Math.log2(words.length));
                    try_len = words.length;
                    delta_len = words.length;
                    tspan += "<tspan data-start='"+start+"' x='"+text_offset_left+"' y='"+(y_base+(++lineNumber * lineHeight))+"'>{{{content}}}</tspan>";
                }else{
                    break;
                }
            }else if(textLength > width) {
                try_len = try_len-delta_len;
            }else{
                if(try_len === words.length){
                    start += try_len;
                    tspan = tspan.replace("{{{content}}}",words.substring(0,try_len));
                    break;
                }
                try_len = try_len+delta_len;
            }
        }
        tspan = tspan.replace("{{{content}}}","");
        start++;//换行符
        text_collections += tspan+"</text>";
        line_collections += "<text x='5' y='"+y_base+"'>"+(index+1)+"</text>";
        back_collections += '<rect x="0" y="'+(y_base-lineHeight+7)+'" width="110%" height="'+((lineNumber+1) * lineHeight)+'" class="background'+(index+1)%2+'"/>';
        y_base += ++lineNumber * lineHeight;
    });
    svg.find('g.text').html(text_collections.replace(/&/g,'&amp;'));//转义实体
    svg.find('g.background').html(back_collections);
    svg.find('g.line-num').html(line_collections);
}

function measureTextWidth(text,font='12px'){
    return $('.measure-text').text(text).css('font-size',font).width();
}


