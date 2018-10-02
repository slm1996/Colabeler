"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.FileWithEmbeddedBlockMapDifferentialDownloader = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _blockMapApi;

function _load_blockMapApi() {
    return _blockMapApi = require("builder-util-runtime/out/blockMapApi");
}

var _DifferentialDownloader;

function _load_DifferentialDownloader() {
    return _DifferentialDownloader = require("./DifferentialDownloader");
}

class FileWithEmbeddedBlockMapDifferentialDownloader extends (_DifferentialDownloader || _load_DifferentialDownloader()).DifferentialDownloader {
    download() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packageInfo = _this.blockAwareFileInfo;
            const fileSize = packageInfo.size;
            const offset = fileSize - (packageInfo.blockMapSize + 4);
            _this.fileMetadataBuffer = yield _this.readRemoteBytes(offset, fileSize - 1);
            const newBlockMap = yield (0, (_DifferentialDownloader || _load_DifferentialDownloader()).readBlockMap)(_this.fileMetadataBuffer.slice(0, _this.fileMetadataBuffer.length - 4));
            yield _this.doDownload(JSON.parse((yield (0, (_blockMapApi || _load_blockMapApi()).readEmbeddedBlockMapData)(_this.options.oldFile))), newBlockMap);
        })();
    }
}
exports.FileWithEmbeddedBlockMapDifferentialDownloader = FileWithEmbeddedBlockMapDifferentialDownloader; //# sourceMappingURL=FileWithEmbeddedBlockMapDifferentialDownloader.js.map