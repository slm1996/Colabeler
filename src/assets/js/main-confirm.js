/**
 * Created by wutong on 2018/1/25.
 */

if(shenjian.is("dialog-confirm")){
    let requestId = '';
    let parentWindow = null;
    shenjian.on('window.confirm',function (data) {
        $(".confirm-text").html(data.text);
        requestId = data.requestId;
        parentWindow = data.parent;
        shenjian.show();
    });
    $("#btn-ok").on('click',function () {
        shenjian.send('window.confirm.return',{requestId:requestId},parentWindow);
        shenjian.hide();
    });
    $("#btn-cancel,.btn-exit").on('click',function () {
        shenjian.hide();
    });
}