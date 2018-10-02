"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GenericDifferentialDownloader = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _blockMapApi;

function _load_blockMapApi() {
    return _blockMapApi = require("builder-util-runtime/out/blockMapApi");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

var _DifferentialDownloader;

function _load_DifferentialDownloader() {
    return _DifferentialDownloader = require("./DifferentialDownloader");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class GenericDifferentialDownloader extends (_DifferentialDownloader || _load_DifferentialDownloader()).DifferentialDownloader {
    download(newBlockMap) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            yield _this.doDownload((yield (0, (_fsExtraP || _load_fsExtraP()).readJson)(_path.join(process.resourcesPath, "..", (_blockMapApi || _load_blockMapApi()).BLOCK_MAP_FILE_NAME))), newBlockMap);
        })();
    }
}
exports.GenericDifferentialDownloader = GenericDifferentialDownloader; //# sourceMappingURL=GenericDifferentialDownloader.js.map