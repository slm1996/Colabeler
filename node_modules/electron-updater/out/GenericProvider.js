"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GenericProvider = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _main;

function _load_main() {
    return _main = require("./main");
}

var _Provider;

function _load_Provider() {
    return _Provider = require("./Provider");
}

class GenericProvider extends (_main || _load_main()).Provider {
    constructor(configuration, updater, useMultipleRangeRequest = true) {
        super(updater.httpExecutor, useMultipleRangeRequest);
        this.configuration = configuration;
        this.updater = updater;
        this.baseUrl = (0, (_main || _load_main()).newBaseUrl)(this.configuration.url);
    }
    get channel() {
        const result = this.updater.channel || this.configuration.channel;
        return result == null ? (0, (_main || _load_main()).getDefaultChannelName)() : (0, (_main || _load_main()).getCustomChannelName)(result);
    }
    getLatestVersion() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let result;
            const channelFile = (0, (_main || _load_main()).getChannelFilename)(_this.channel);
            const channelUrl = (0, (_main || _load_main()).newUrlFromBase)(channelFile, _this.baseUrl);
            for (let attemptNumber = 0;; attemptNumber++) {
                try {
                    result = (0, (_Provider || _load_Provider()).parseUpdateInfo)((yield _this.httpRequest(channelUrl)), channelFile, channelUrl);
                    break;
                } catch (e) {
                    if (e instanceof (_builderUtilRuntime || _load_builderUtilRuntime()).HttpError && e.statusCode === 404) {
                        throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                    } else if (e.code === "ECONNREFUSED") {
                        if (attemptNumber < 3) {
                            yield new Promise(function (resolve, reject) {
                                try {
                                    setTimeout(resolve, 1000 * attemptNumber);
                                } catch (e) {
                                    reject(e);
                                }
                            });
                            continue;
                        }
                    }
                    throw e;
                }
            }
            if ((0, (_main || _load_main()).isUseOldMacProvider)()) {
                result.releaseJsonUrl = channelUrl.href;
            }
            return result;
        })();
    }
    resolveFiles(updateInfo) {
        return (0, (_Provider || _load_Provider()).resolveFiles)(updateInfo, this.baseUrl);
    }
}
exports.GenericProvider = GenericProvider; //# sourceMappingURL=GenericProvider.js.map