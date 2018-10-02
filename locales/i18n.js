/**
 * Created by wutong on 2018/1/30.
 */
const path = require("path")
const electron = require('electron')
const fs = require('fs');
let app = electron.app ? electron.app : electron.remote.app

function i18n() {
    let locale = app.getLocale();
    if(locale == "zh"){
        //默认给zh-CN
        locale = "zh-CN";
    }
    if(fs.existsSync(path.join(__dirname, locale , 'strings.json'))) {
        this.locales = JSON.parse(fs.readFileSync(path.join(__dirname, locale , 'strings.json'), 'utf8'))
    }
    else {
        var stringJSON = fs.readFileSync(path.join(__dirname, 'en', 'strings.json'), 'utf8');
        //默认英文
        this.locales = JSON.parse(stringJSON)
    }
}

i18n.prototype.__ = function(phrase) {
    let translation = this.locales[phrase]
    if(translation === undefined) {
        translation = phrase
    }
    return translation
}
module.exports = i18n;