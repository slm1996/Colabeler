"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.UpdaterSignal = exports.UPDATE_DOWNLOADED = exports.DOWNLOAD_PROGRESS = exports.Provider = exports.CancellationToken = exports.NoOpLogger = exports.AppUpdater = undefined;

var _AppUpdater;

function _load_AppUpdater() {
    return _AppUpdater = require("./AppUpdater");
}

Object.defineProperty(exports, "AppUpdater", {
    enumerable: true,
    get: function () {
        return (_AppUpdater || _load_AppUpdater()).AppUpdater;
    }
});
Object.defineProperty(exports, "NoOpLogger", {
    enumerable: true,
    get: function () {
        return (_AppUpdater || _load_AppUpdater()).NoOpLogger;
    }
});

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

Object.defineProperty(exports, "CancellationToken", {
    enumerable: true,
    get: function () {
        return (_builderUtilRuntime || _load_builderUtilRuntime()).CancellationToken;
    }
});

var _Provider;

function _load_Provider() {
    return _Provider = require("./Provider");
}

Object.defineProperty(exports, "Provider", {
    enumerable: true,
    get: function () {
        return (_Provider || _load_Provider()).Provider;
    }
});
exports.getDefaultChannelName = getDefaultChannelName;
exports.getCustomChannelName = getCustomChannelName;
exports.getCurrentPlatform = getCurrentPlatform;
exports.isUseOldMacProvider = isUseOldMacProvider;
exports.getChannelFilename = getChannelFilename;
exports.newBaseUrl = newBaseUrl;
exports.newUrlFromBase = newUrlFromBase;

var _url;

function _load_url() {
    return _url = require("url");
}

// autoUpdater to mimic electron bundled autoUpdater
let _autoUpdater;
function _load_autoUpdater() {
    // tslint:disable:prefer-conditional-expression
    if (process.platform === "win32") {
        _autoUpdater = new (require("./NsisUpdater").NsisUpdater)();
    } else if (process.platform === "darwin") {
        _autoUpdater = new (require("./MacUpdater").MacUpdater)();
    } else {
        _autoUpdater = new (require("./AppImageUpdater").AppImageUpdater)();
    }
    return _autoUpdater;
}
Object.defineProperty(exports, "autoUpdater", {
    enumerable: true,
    get: () => {
        return _autoUpdater || _load_autoUpdater();
    }
});
// due to historical reasons for windows we use channel name without platform specifier
function getDefaultChannelName() {
    return `latest${getChannelFilePrefix()}`;
}
function getChannelFilePrefix() {
    const currentPlatform = getCurrentPlatform();
    if (currentPlatform === "linux") {
        const arch = process.env.TEST_UPDATER_ARCH || process.arch;
        const archSuffix = arch === "x64" ? "" : `-${arch}`;
        return "-linux" + archSuffix;
    } else {
        return currentPlatform === "darwin" ? "-mac" : "";
    }
}
function getCustomChannelName(channel) {
    return `${channel}${getChannelFilePrefix()}`;
}
function getCurrentPlatform() {
    return process.env.TEST_UPDATER_PLATFORM || process.platform;
}
function isUseOldMacProvider() {
    // getCurrentPlatform() === "darwin"
    return false;
}
function getChannelFilename(channel) {
    return `${channel}.yml`;
}
const DOWNLOAD_PROGRESS = exports.DOWNLOAD_PROGRESS = "download-progress";
const UPDATE_DOWNLOADED = exports.UPDATE_DOWNLOADED = "update-downloaded";
class UpdaterSignal {
    constructor(emitter) {
        this.emitter = emitter;
    }
    /**
     * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
     */
    login(handler) {
        addHandler(this.emitter, "login", handler);
    }
    progress(handler) {
        addHandler(this.emitter, DOWNLOAD_PROGRESS, handler);
    }
    updateDownloaded(handler) {
        addHandler(this.emitter, UPDATE_DOWNLOADED, handler);
    }
    updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
    }
}
exports.UpdaterSignal = UpdaterSignal;
const isLogEvent = false;
function addHandler(emitter, event, handler) {
    if (isLogEvent) {
        emitter.on(event, (...args) => {
            console.log("%s %s", event, args);
            handler.apply(null, args);
        });
    } else {
        emitter.on(event, handler);
    }
}
// if baseUrl path doesn't ends with /, this path will be not prepended to passed pathname for new URL(input, base)
/** @internal */
function newBaseUrl(url) {
    const result = new (_url || _load_url()).URL(url);
    if (!result.pathname.endsWith("/")) {
        result.pathname += "/";
    }
    return result;
}
/** @internal */
function newUrlFromBase(pathname, baseUrl) {
    const result = new (_url || _load_url()).URL(pathname, baseUrl);
    // search is not propagated
    if (!result.search && baseUrl.search) {
        result.search = baseUrl.search;
    }
    return result;
}
//# sourceMappingURL=main.js.map