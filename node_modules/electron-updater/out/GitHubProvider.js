"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GitHubProvider = exports.BaseGitHubProvider = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

exports.computeReleaseNotes = computeReleaseNotes;

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _semver;

function _load_semver() {
    return _semver = _interopRequireWildcard(require("semver"));
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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class BaseGitHubProvider extends (_main || _load_main()).Provider {
    constructor(options, defaultHost, executor) {
        super(executor, false /* because GitHib uses S3 */);
        this.options = options;
        this.baseUrl = (0, (_main || _load_main()).newBaseUrl)((0, (_builderUtilRuntime || _load_builderUtilRuntime()).githubUrl)(options, defaultHost));
        const apiHost = defaultHost === "github.com" ? "api.github.com" : defaultHost;
        this.baseApiUrl = (0, (_main || _load_main()).newBaseUrl)((0, (_builderUtilRuntime || _load_builderUtilRuntime()).githubUrl)(options, apiHost));
    }
    computeGithubBasePath(result) {
        // https://github.com/electron-userland/electron-builder/issues/1903#issuecomment-320881211
        const host = this.options.host;
        return host != null && host !== "github.com" && host !== "api.github.com" ? `/api/v3${result}` : result;
    }
}
exports.BaseGitHubProvider = BaseGitHubProvider;
class GitHubProvider extends BaseGitHubProvider {
    constructor(options, updater, executor) {
        super(options, "github.com", executor);
        this.options = options;
        this.updater = updater;
    }
    getLatestVersion() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const cancellationToken = new (_builderUtilRuntime || _load_builderUtilRuntime()).CancellationToken();
            const feedXml = yield _this.httpRequest((0, (_main || _load_main()).newUrlFromBase)(`${_this.basePath}.atom`, _this.baseUrl), {
                Accept: "application/xml, application/atom+xml, text/xml, */*"
            }, cancellationToken);
            const feed = (0, (_builderUtilRuntime || _load_builderUtilRuntime()).parseXml)(feedXml);
            const latestRelease = feed.element("entry", false, `No published versions on GitHub`);
            let version;
            try {
                if (_this.updater.allowPrerelease) {
                    // noinspection TypeScriptValidateJSTypes
                    version = latestRelease.element("link").attribute("href").match(/\/tag\/v?([^\/]+)$/)[1];
                } else {
                    version = yield _this.getLatestVersionString(cancellationToken);
                }
            } catch (e) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot parse releases feed: ${e.stack || e.message},\nXML:\n${feedXml}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
            }
            if (version == null) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`No published versions on GitHub`, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
            }
            const channelFile = (0, (_main || _load_main()).getChannelFilename)((0, (_main || _load_main()).getDefaultChannelName)());
            const channelFileUrl = (0, (_main || _load_main()).newUrlFromBase)(_this.getBaseDownloadPath(version, channelFile), _this.baseUrl);
            const requestOptions = _this.createRequestOptions(channelFileUrl);
            let rawData;
            try {
                rawData = yield _this.executor.request(requestOptions, cancellationToken);
            } catch (e) {
                if (!_this.updater.allowPrerelease && e instanceof (_builderUtilRuntime || _load_builderUtilRuntime()).HttpError && e.statusCode === 404) {
                    throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                throw e;
            }
            const result = (0, (_Provider || _load_Provider()).parseUpdateInfo)(rawData, channelFile, channelFileUrl);
            if ((0, (_main || _load_main()).isUseOldMacProvider)()) {
                result.releaseJsonUrl = `${(0, (_builderUtilRuntime || _load_builderUtilRuntime()).githubUrl)(_this.options)}/${requestOptions.path}`;
            }
            if (result.releaseName == null) {
                result.releaseName = latestRelease.elementValueOrEmpty("title");
            }
            if (result.releaseNotes == null) {
                result.releaseNotes = computeReleaseNotes(_this.updater.currentVersion, _this.updater.fullChangelog, feed, latestRelease);
            }
            return result;
        })();
    }
    getLatestVersionString(cancellationToken) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const url = new (_url || _load_url()).URL(`${_this2.computeGithubBasePath(`/repos/${_this2.options.owner}/${_this2.options.repo}/releases`)}/latest`, _this2.baseApiUrl);
            try {
                // do not use API to avoid limit
                const rawData = yield _this2.httpRequest(url, { Accept: "application/json" }, cancellationToken);
                if (rawData == null) {
                    return null;
                }
                const releaseInfo = JSON.parse(rawData);
                return releaseInfo.tag_name.startsWith("v") ? releaseInfo.tag_name.substring(1) : releaseInfo.tag_name;
            } catch (e) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
            }
        })();
    }
    get basePath() {
        return `/${this.options.owner}/${this.options.repo}/releases`;
    }
    resolveFiles(updateInfo) {
        // still replace space to - due to backward compatibility
        return (0, (_Provider || _load_Provider()).resolveFiles)(updateInfo, this.baseUrl, p => this.getBaseDownloadPath(updateInfo.version, p.replace(/ /g, "-")));
    }
    getBaseDownloadPath(version, fileName) {
        return `${this.basePath}/download/${this.options.vPrefixedTagName === false ? "" : "v"}${version}/${fileName}`;
    }
}
exports.GitHubProvider = GitHubProvider;
function getNoteValue(parent) {
    const result = parent.elementValueOrEmpty("content");
    // GitHub reports empty notes as <content>No content.</content>
    return result === "No content." ? "" : result;
}
function computeReleaseNotes(currentVersion, isFullChangelog, feed, latestRelease) {
    if (!isFullChangelog) {
        return getNoteValue(latestRelease);
    }
    const releaseNotes = [];
    for (const release of feed.getElements("entry")) {
        // noinspection TypeScriptValidateJSTypes
        const versionRelease = release.element("link").attribute("href").match(/\/tag\/v?([^\/]+)$/)[1];
        if ((_semver || _load_semver()).lt(currentVersion, versionRelease)) {
            releaseNotes.push({
                version: versionRelease,
                note: getNoteValue(release)
            });
        }
    }
    return releaseNotes.sort((a, b) => (_semver || _load_semver()).rcompare(a.version, b.version));
}
//# sourceMappingURL=GitHubProvider.js.map