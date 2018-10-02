/**
 * Created by wutong on 2018/1/2.
 */
const http = require('http');
const url = require('url');
const qs = require('querystring');
const packageContent = require('../../../package.json');
class HttpUtil{
    /**
     *
     * @param urlStr
     * @returns {Promise}
     */
    static get(urlStr,opt){
        let options = {
            hostname: url.parse(urlStr).hostname,
            port: 80,
            path: url.parse(urlStr).path,
            method: 'GET',
        };
        if(opt && opt.headers){
            options.headers = opt.headers;
        }
        return new Promise(function (resolve, reject) {
            let req = http.request(options, function (res) {
                let data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    //成功后调用
                    resolve(data);
                });
            });

            req.on('error', function (err) {
                //失败后调用
                reject(err);
                console.log(err);
            });
            req.end();
        })
    }

    /**
     *
     * @param urlStr
     * @param data
     * @returns {Promise}
     */
    static post(urlStr, data) {
        let postData = qs.stringify(data);
        let options = {
            hostname: url.parse(urlStr).hostname,
            port: 80,
            path: url.parse(urlStr).path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                "User-Agent": "JingLing Client V" + packageContent.version
            }
        };
        return new Promise(function (resolve, reject) {
            let req = http.request(options, function (res) {
                let data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    //成功后调用
                    resolve(data);
                });
            });

            req.on('error', function (err) {
                //失败后调用
                reject(err);
            });
            req.write(postData);
            req.end();
        });
    }
}
module.exports = HttpUtil;