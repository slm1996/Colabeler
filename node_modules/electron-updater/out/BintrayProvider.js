"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BintrayProvider = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _bintray;

function _load_bintray() {
    return _bintray = require("builder-util-runtime/out/bintray");
}

var _url;

function _load_url() {
    return _url = require("url");
}

var _main;

function _load_main() {
    return _main = require("./main");
}

var _Provider;

function _load_Provider() {
    return _Provider = require("./Provider");
}

class BintrayProvider extends (_main || _load_main()).Provider {
    constructor(configuration, httpExecutor) {
        super(httpExecutor);
        this.client = new (_bintray || _load_bintray()).BintrayClient(configuration, httpExecutor, new (_builderUtilRuntime || _load_builderUtilRuntime()).CancellationToken());
        this.baseUrl = (0, (_main || _load_main()).newBaseUrl)(`https://dl.bintray.com/${this.client.owner}/${this.client.repo}`);
    }
    setRequestHeaders(value) {
        super.setRequestHeaders(value);
        this.client.setRequestHeaders(value);
    }
    getLatestVersion() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            try {
                const data = yield _this.client.getVersion("_latest");
                const channelFilename = (0, (_main || _load_main()).getChannelFilename)((0, (_main || _load_main()).getDefaultChannelName)());
                const files = yield _this.client.getVersionFiles(data.name);
                const channelFile = files.find(function (it) {
                    return it.name.endsWith(`_${channelFilename}`) || it.name.endsWith(`-${channelFilename}`);
                });
                if (channelFile == null) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find channel file "${channelFilename}", existing files:\n${files.map(function (it) {
                        return JSON.stringify(it, null, 2);
                    }).join(",\n")}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                const channelFileUrl = new (_url || _load_url()).URL(`https://dl.bintray.com/${_this.client.owner}/${_this.client.repo}/${channelFile.name}`);
                return (0, (_Provider || _load_Provider()).parseUpdateInfo)((yield _this.httpRequest(channelFileUrl)), channelFilename, channelFileUrl);
            } catch (e) {
                if ("statusCode" in e && e.statusCode === 404) {
                    throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`No latest version, please ensure that user, package and repository correctly configured. Or at least one version is published. ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
                }
                throw e;
            }
        })();
    }
    resolveFiles(updateInfo) {
        return (0, (_Provider || _load_Provider()).resolveFiles)(updateInfo, this.baseUrl);
    }
}
exports.BintrayProvider = BintrayProvider; //# sourceMappingURL=BintrayProvider.js.map