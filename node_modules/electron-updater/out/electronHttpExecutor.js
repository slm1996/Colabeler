"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ElectronHttpExecutor = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _electron;

function _load_electron() {
    return _electron = require("electron");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class ElectronHttpExecutor extends (_builderUtilRuntime || _load_builderUtilRuntime()).HttpExecutor {
    constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
    }
    download(url, destination, options) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (options == null || !options.skipDirCreation) {
                yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.dirname(destination));
            }
            return yield options.cancellationToken.createPromise(function (resolve, reject, onCancel) {
                _this.doDownload(Object.assign({}, (0, (_builderUtilRuntime || _load_builderUtilRuntime()).configureRequestOptionsFromUrl)(url, {
                    headers: options.headers || undefined
                }), { redirect: "manual" }), destination, 0, options, function (error) {
                    if (error == null) {
                        resolve(destination);
                    } else {
                        reject(error);
                    }
                }, onCancel);
            });
        })();
    }
    doRequest(options, callback) {
        const request = (_electron || _load_electron()).net.request(options);
        request.on("response", callback);
        this.addProxyLoginHandler(request);
        return request;
    }
    addProxyLoginHandler(request) {
        if (this.proxyLoginCallback != null) {
            request.on("login", this.proxyLoginCallback);
        }
    }
    addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
            if (redirectCount > 10) {
                reject(new Error("Too many redirects (> 10)"));
                return;
            }
            handler((_builderUtilRuntime || _load_builderUtilRuntime()).HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
        });
    }
}
exports.ElectronHttpExecutor = ElectronHttpExecutor; //# sourceMappingURL=electronHttpExecutor.js.map