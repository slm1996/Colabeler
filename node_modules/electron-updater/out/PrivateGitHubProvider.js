"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PrivateGitHubProvider = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _jsYaml;

function _load_jsYaml() {
    return _jsYaml = require("js-yaml");
}

var _path = _interopRequireWildcard(require("path"));

var _url;

function _load_url() {
    return _url = require("url");
}

var _GitHubProvider;

function _load_GitHubProvider() {
    return _GitHubProvider = require("./GitHubProvider");
}

var _main;

function _load_main() {
    return _main = require("./main");
}

var _Provider;

function _load_Provider() {
    return _Provider = require("./Provider");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class PrivateGitHubProvider extends (_GitHubProvider || _load_GitHubProvider()).BaseGitHubProvider {
    constructor(options, token, executor) {
        super(options, "api.github.com", executor);
        this.token = token;
    }
    createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
    }
    getLatestVersion() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const cancellationToken = new (_builderUtilRuntime || _load_builderUtilRuntime()).CancellationToken();
            const channelFile = (0, (_main || _load_main()).getChannelFilename)((0, (_main || _load_main()).getDefaultChannelName)());
            const releaseInfo = yield _this.getLatestVersionInfo(cancellationToken);
            const asset = releaseInfo.assets.find(function (it) {
                return it.name === channelFile;
            });
            if (asset == null) {
                // html_url must be always, but just to be sure
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            const url = new (_url || _load_url()).URL(asset.url);
            let result;
            try {
                result = (0, (_jsYaml || _load_jsYaml()).safeLoad)((yield _this.httpRequest(url, _this.configureHeaders("application/octet-stream"), cancellationToken)));
            } catch (e) {
                if (e instanceof (_builderUtilRuntime || _load_builderUtilRuntime()).HttpError && e.statusCode === 404) {
                    throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                throw e;
            }
            result.assets = releaseInfo.assets;
            return result;
        })();
    }
    get fileExtraDownloadHeaders() {
        return this.configureHeaders("application/octet-stream");
    }
    configureHeaders(accept) {
        return {
            Accept: accept,
            Authorization: `token ${this.token}`
        };
    }
    getLatestVersionInfo(cancellationToken) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const url = (0, (_main || _load_main()).newUrlFromBase)(`${_this2.basePath}/latest`, _this2.baseUrl);
            try {
                return JSON.parse((yield _this2.httpRequest(url, _this2.configureHeaders("application/vnd.github.v3+json"), cancellationToken)));
            } catch (e) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
            }
        })();
    }
    get basePath() {
        return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
    }
    resolveFiles(updateInfo) {
        return (0, (_Provider || _load_Provider()).getFileList)(updateInfo).map(it => {
            const name = _path.posix.basename(it.url).replace(/ /g, "-");
            const asset = updateInfo.assets.find(it => it != null && it.name === name);
            if (asset == null) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
            }
            return {
                url: new (_url || _load_url()).URL(asset.url),
                info: it
            };
        });
    }
}
exports.PrivateGitHubProvider = PrivateGitHubProvider; //# sourceMappingURL=PrivateGitHubProvider.js.map