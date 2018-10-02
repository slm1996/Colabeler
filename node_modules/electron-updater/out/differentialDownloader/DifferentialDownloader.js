"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.readBlockMap = exports.DifferentialDownloader = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

let readBlockMap = exports.readBlockMap = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (data) {
        return JSON.parse((yield inflateRaw(data)).toString());
    });

    return function readBlockMap(_x) {
        return _ref.apply(this, arguments);
    };
})();

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _DataSplitter;

function _load_DataSplitter() {
    return _DataSplitter = require("./DataSplitter");
}

var _downloadPlanBuilder;

function _load_downloadPlanBuilder() {
    return _downloadPlanBuilder = require("./downloadPlanBuilder");
}

var _multipleRangeDownloader;

function _load_multipleRangeDownloader() {
    return _multipleRangeDownloader = require("./multipleRangeDownloader");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const inflateRaw = (_bluebirdLst2 || _load_bluebirdLst2()).default.promisify(require("zlib").inflateRaw);
class DifferentialDownloader {
    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    constructor(blockAwareFileInfo, httpExecutor, options) {
        this.blockAwareFileInfo = blockAwareFileInfo;
        this.httpExecutor = httpExecutor;
        this.options = options;
        this.fileMetadataBuffer = null;
        this.logger = options.logger;
        this.baseRequestOptions = (0, (_builderUtilRuntime || _load_builderUtilRuntime()).configureRequestOptionsFromUrl)(options.newUrl, {});
    }
    createRequestOptions(method = "get", newUrl) {
        return Object.assign({}, newUrl == null ? this.baseRequestOptions : (0, (_builderUtilRuntime || _load_builderUtilRuntime()).configureRequestOptionsFromUrl)(newUrl, {}), { method, headers: Object.assign({}, this.options.requestHeaders, { Accept: "*/*" }) });
    }
    doDownload(oldBlockMap, newBlockMap) {
        // we don't check other metadata like compressionMethod - generic check that it is make sense to differentially update is suitable for it
        if (oldBlockMap.version !== newBlockMap.version) {
            throw new Error(`version is different (${oldBlockMap.version} - ${newBlockMap.version}), full download is required`);
        }
        const logger = this.logger;
        const operations = (0, (_downloadPlanBuilder || _load_downloadPlanBuilder()).computeOperations)(oldBlockMap, newBlockMap, logger);
        if (logger.debug != null) {
            logger.debug(JSON.stringify(operations, null, 2));
        }
        let downloadSize = 0;
        let copySize = 0;
        for (const operation of operations) {
            const length = operation.end - operation.start;
            if (operation.kind === (_downloadPlanBuilder || _load_downloadPlanBuilder()).OperationKind.DOWNLOAD) {
                downloadSize += length;
            } else {
                copySize += length;
            }
        }
        const newPackageSize = this.blockAwareFileInfo.size;
        if (downloadSize + copySize + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== newPackageSize) {
            throw new Error(`Internal error, size mismatch: downloadSize: ${downloadSize}, copySize: ${copySize}, newPackageSize: ${newPackageSize}`);
        }
        logger.info(`Full: ${formatBytes(newPackageSize)}, To download: ${formatBytes(downloadSize)} (${Math.round(downloadSize / (newPackageSize / 100))}%)`);
        return this.downloadFile(operations);
    }
    downloadFile(tasks) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const oldFileFd = yield (0, (_fsExtraP || _load_fsExtraP()).open)(_this.options.oldFile, "r");
            const newFileFd = yield (0, (_fsExtraP || _load_fsExtraP()).open)(_this.options.newFile, "w");
            const fileOut = (0, (_fsExtraP || _load_fsExtraP()).createWriteStream)(_this.options.newFile, { fd: newFileFd });
            yield new (_bluebirdLst2 || _load_bluebirdLst2()).default(function (resolve, reject) {
                const streams = [];
                const digestTransform = new (_builderUtilRuntime || _load_builderUtilRuntime()).DigestTransform(_this.blockAwareFileInfo.sha512);
                // to simply debug, do manual validation to allow file to be fully written
                digestTransform.isValidateOnEnd = false;
                streams.push(digestTransform);
                // noinspection JSArrowFunctionCanBeReplacedWithShorthand
                fileOut.on("finish", function () {
                    fileOut.close(function () {
                        try {
                            digestTransform.validate();
                        } catch (e) {
                            reject(e);
                            return;
                        }
                        resolve();
                    });
                });
                streams.push(fileOut);
                let lastStream = null;
                for (const stream of streams) {
                    stream.on("error", reject);
                    if (lastStream == null) {
                        lastStream = stream;
                    } else {
                        lastStream = lastStream.pipe(stream);
                    }
                }
                const firstStream = streams[0];
                let w;
                if (_this.options.useMultipleRangeRequest) {
                    w = (0, (_multipleRangeDownloader || _load_multipleRangeDownloader()).executeTasks)(_this, tasks, firstStream, oldFileFd, reject);
                } else {
                    let attemptCount = 0;
                    let actualUrl = null;
                    _this.logger.info(`Differential download: ${_this.options.newUrl}`);
                    w = function (index) {
                        if (index >= tasks.length) {
                            if (_this.fileMetadataBuffer != null) {
                                firstStream.write(_this.fileMetadataBuffer);
                            }
                            firstStream.end();
                            return;
                        }
                        const operation = tasks[index++];
                        if (operation.kind === (_downloadPlanBuilder || _load_downloadPlanBuilder()).OperationKind.COPY) {
                            (0, (_DataSplitter || _load_DataSplitter()).copyData)(operation, firstStream, oldFileFd, reject, function () {
                                return w(index);
                            });
                        } else {
                            const requestOptions = _this.createRequestOptions("get", actualUrl);
                            const range = `bytes=${operation.start}-${operation.end - 1}`;
                            requestOptions.headers.Range = range;
                            requestOptions.redirect = "manual";
                            const debug = _this.logger.debug;
                            if (debug != null) {
                                debug(`effective url: ${actualUrl == null ? "" : removeQuery(actualUrl)}, range: ${range}`);
                            }
                            const request = _this.httpExecutor.doRequest(requestOptions, function (response) {
                                // Electron net handles redirects automatically, our NodeJS test server doesn't use redirects - so, we don't check 3xx codes.
                                if (response.statusCode >= 400) {
                                    reject((0, (_builderUtilRuntime || _load_builderUtilRuntime()).createHttpError)(response));
                                }
                                response.pipe(firstStream, {
                                    end: false
                                });
                                response.once("end", function () {
                                    if (++attemptCount === 100) {
                                        attemptCount = 0;
                                        setTimeout(function () {
                                            return w(index);
                                        }, 1000);
                                    } else {
                                        w(index);
                                    }
                                });
                            });
                            request.on("redirect", function (statusCode, method, redirectUrl) {
                                _this.logger.info(`Redirect to ${removeQuery(redirectUrl)}`);
                                actualUrl = redirectUrl;
                                request.followRedirect();
                            });
                            _this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
                            request.end();
                        }
                    };
                }
                w(0);
            }).then(function () {
                return (0, (_fsExtraP || _load_fsExtraP()).close)(oldFileFd);
            }).catch(function (error) {
                (0, (_fsExtraP || _load_fsExtraP()).closeSync)(oldFileFd);
                (0, (_fsExtraP || _load_fsExtraP()).closeSync)(newFileFd);
                throw error;
            });
        })();
    }
    readRemoteBytes(start, endInclusive) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const buffer = Buffer.allocUnsafe(endInclusive + 1 - start);
            const requestOptions = _this2.createRequestOptions();
            requestOptions.headers.Range = `bytes=${start}-${endInclusive}`;
            let position = 0;
            yield _this2.request(requestOptions, function (chunk) {
                chunk.copy(buffer, position);
                position += chunk.length;
            });
            return buffer;
        })();
    }
    request(requestOptions, dataHandler) {
        return new (_bluebirdLst2 || _load_bluebirdLst2()).default((resolve, reject) => {
            const request = this.httpExecutor.doRequest(requestOptions, response => {
                if (!(0, (_multipleRangeDownloader || _load_multipleRangeDownloader()).checkIsRangesSupported)(response, reject)) {
                    return;
                }
                response.on("data", dataHandler);
                response.on("end", () => resolve());
            });
            this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
            request.end();
        });
    }
}
exports.DifferentialDownloader = DifferentialDownloader;

function formatBytes(value, symbol = " KB") {
    return new Intl.NumberFormat("en").format((value / 1024).toFixed(2)) + symbol;
}
// safety
function removeQuery(url) {
    const index = url.indexOf("?");
    return index < 0 ? url : url.substring(0, index);
}
//# sourceMappingURL=DifferentialDownloader.js.map