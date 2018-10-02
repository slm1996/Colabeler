"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createClient = createClient;

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _BintrayProvider;

function _load_BintrayProvider() {
    return _BintrayProvider = require("./BintrayProvider");
}

var _GenericProvider;

function _load_GenericProvider() {
    return _GenericProvider = require("./GenericProvider");
}

var _GitHubProvider;

function _load_GitHubProvider() {
    return _GitHubProvider = require("./GitHubProvider");
}

var _PrivateGitHubProvider;

function _load_PrivateGitHubProvider() {
    return _PrivateGitHubProvider = require("./PrivateGitHubProvider");
}

function createClient(data, updater) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof data === "string") {
        throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
    }
    const httpExecutor = updater.httpExecutor;
    const provider = data.provider;
    switch (provider) {
        case "github":
            const githubOptions = data;
            const token = (githubOptions.private ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN : null) || githubOptions.token;
            if (token == null) {
                return new (_GitHubProvider || _load_GitHubProvider()).GitHubProvider(githubOptions, updater, httpExecutor);
            } else {
                return new (_PrivateGitHubProvider || _load_PrivateGitHubProvider()).PrivateGitHubProvider(githubOptions, token, httpExecutor);
            }
        case "s3":
        case "spaces":
            return new (_GenericProvider || _load_GenericProvider()).GenericProvider({
                provider: "generic",
                url: (0, (_builderUtilRuntime || _load_builderUtilRuntime()).getS3LikeProviderBaseUrl)(data),
                channel: data.channel || null
            }, updater, provider === "spaces" /* https://github.com/minio/minio/issues/5285#issuecomment-350428955 */);
        case "generic":
            const options = data;
            return new (_GenericProvider || _load_GenericProvider()).GenericProvider(options, updater, options.useMultipleRangeRequest !== false && !options.url.includes("s3.amazonaws.com"));
        case "bintray":
            return new (_BintrayProvider || _load_BintrayProvider()).BintrayProvider(data, httpExecutor);
        default:
            throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
    }
}
//# sourceMappingURL=providerFactory.js.map