+function (_) {
    'use strict';
    var SUtils = {
        //date format
        format: function (format,timestamp) {
            if (!format) {
                return '';
            }

            if(typeof(format) != "number"){
                var date = new Date();
                if(timestamp){
                    date = new Date(timestamp);
                }
                var contents = {
                    "m+": date.getMonth() + 1, //月份
                    "d+": date.getDate(), //日
                    "H+": date.getHours(), //小时
                    "i+": date.getMinutes(), //分
                    "s+": date.getSeconds() //秒
                };
                if (/(y+)/.test(format)){
                    format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
                }
                for(var content in contents){
                    if(new RegExp("(" + content + ")","i").test(format)){
                        format = format.replace(RegExp.$1,(RegExp.$1.length == 1) ? (contents[content]) : (("00" + contents[content]).substr(("" + contents[content]).length)));
                    }
                }
                return format;
            }

            timestamp = _.parseInt(format);
            var hour = '', minutes = '', sec = '';
            hour = _.parseInt(timestamp/3600) > 9 ? _.parseInt(timestamp/3600): ('0' + _.parseInt(timestamp/3600));
            if(hour >= 24){
                var day = hour/24;
                if(day > 30){
                    var month = day/30;
                    if(month >= 12){
                        var year = month/12;
                        return _.parseInt(year) + "年";
                    }
                    return _.parseInt(month) + "个月";
                }
                return _.parseInt(day)+"天";
            }else if(hour >= 1){
                return _.parseInt(hour) + "小时";
            }

            minutes = _.parseInt(_.parseInt(timestamp%3600)/60) > 9 ? _.parseInt(_.parseInt(timestamp%3600)/60): ('0' + _.parseInt(_.parseInt(timestamp%3600)/60));
            sec = _.parseInt(timestamp%60) > 9 ? _.parseInt(timestamp%60): ('0' + _.parseInt(timestamp%60));

            return hour + ':' + minutes + ':' + sec;
        },
        //html encode for show in origin type
        htmlEncode: function(str) {
            var div = document.createElement("div");
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        },
        //html decode for show in render type
        htmlDecode: function(str) {
            var div = document.createElement("div");
            div.innerHTML = str;
            return  div.innerHTML.replace(/&nbsp;/g," ")
                .replace(/&apos;/g,"'")
                .replace(/&quot;/g,"\"")
                .replace(/&lt;/g,"<")
                .replace(/&gt;/g,">")
                .replace(/&amp;/g,"&");
        },
    };


    //call function
    _.formatDate = function(format,timestamp){
        return SUtils.format(format,timestamp);
    };

    _.htmlEncode = function(html){
        return SUtils.htmlEncode(html);
    };

    _.htmlDecode = function(html){
        return SUtils.htmlDecode(html);
    };
}(_);
function Base64() {
    // private property
    _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    // public method for encoding
    this.encode = function (input) {
        input = new String(input).toString();
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = _utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
                _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    }

    // public method for decoding
    this.decode = function (input) {
        input = new String(input).toString();
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        output = _utf8_decode(output);
        return output;
    }

    // private method for UTF-8 encoding
    _utf8_encode = function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }
        return utftext;
    }

    // private method for UTF-8 decoding
    _utf8_decode = function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while ( i < utftext.length ) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
    return this;
}
var base64Encode = Base64().encode;
var base64Decode = Base64().decode;