if(shenjian.is('dialog-update-confirm')){
    $('#btn-submit').on('click',function () {
        shenjian.hide('Update-Confirm-Window');
        var url = shenjian.url('downloading','update');
        shenjian.openUrl(url,"dialog-downloading",{
            width: 360,
            height: 200,
            modal: false,
            frame: false,
            resizable: false
        });
        shenjian.sendtoMain('UpdateStart.shenjian');

    });
    $('#btn-cancel').on('click',function () {
        shenjian.hide('Update-Confirm-Window');
    });
}else if(shenjian.is('dialog-downloading')){
    shenjian.onFromMain('DownloadProgress.shenjian',function (data) {
        $('.progress-bar').html(parseInt(data.percent)+'%').width(parseInt(data.percent)+'%');
    });
}