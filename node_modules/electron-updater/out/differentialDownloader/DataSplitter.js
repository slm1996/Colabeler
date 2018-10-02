"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DataSplitter = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

exports.copyData = copyData;

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _stream;

function _load_stream() {
    return _stream = require("stream");
}

var _downloadPlanBuilder;

function _load_downloadPlanBuilder() {
    return _downloadPlanBuilder = require("./downloadPlanBuilder");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DOUBLE_CRLF = Buffer.from("\r\n\r\n");
var ReadState;
(function (ReadState) {
    ReadState[ReadState["INIT"] = 0] = "INIT";
    ReadState[ReadState["HEADER"] = 1] = "HEADER";
    ReadState[ReadState["BODY"] = 2] = "BODY";
})(ReadState || (ReadState = {}));
function copyData(task, out, oldFileFd, reject, resolve) {
    const readStream = (0, (_fsExtraP || _load_fsExtraP()).createReadStream)("", {
        fd: oldFileFd,
        autoClose: false,
        start: task.start,
        // end is inclusive
        end: task.end - 1
    });
    readStream.on("error", reject);
    readStream.once("end", resolve);
    readStream.pipe(out, {
        end: false
    });
}
class DataSplitter extends (_stream || _load_stream()).Writable {
    constructor(out, options, partIndexToTaskIndex, boundary, partIndexToLength, finishHandler) {
        super();
        this.out = out;
        this.options = options;
        this.partIndexToTaskIndex = partIndexToTaskIndex;
        this.partIndexToLength = partIndexToLength;
        this.finishHandler = finishHandler;
        this.partIndex = -1;
        this.headerListBuffer = null;
        this.readState = ReadState.INIT;
        this.ignoreByteCount = 0;
        this.remainingPartDataCount = 0;
        this.actualPartLength = 0;
        this.boundaryLength = boundary.length + 4; /* size of \r\n-- */
        // first chunk doesn't start with \r\n
        this.ignoreByteCount = this.boundaryLength - 2;
    }
    get isFinished() {
        return this.partIndex === this.partIndexToLength.length;
    }
    // noinspection JSUnusedGlobalSymbols
    _write(data, encoding, callback) {
        if (this.isFinished) {
            console.error(`Trailing ignored data: ${data.length} bytes`);
            return;
        }
        this.handleData(data).then(callback).catch(callback);
    }
    handleData(chunk) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let start = 0;
            if (_this.ignoreByteCount !== 0 && _this.remainingPartDataCount !== 0) {
                throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
            }
            if (_this.ignoreByteCount > 0) {
                const toIgnore = Math.min(_this.ignoreByteCount, chunk.length);
                _this.ignoreByteCount -= toIgnore;
                start = toIgnore;
            } else if (_this.remainingPartDataCount > 0) {
                const toRead = Math.min(_this.remainingPartDataCount, chunk.length);
                _this.remainingPartDataCount -= toRead;
                yield _this.processPartData(chunk, 0, toRead);
                start = toRead;
            }
            if (start === chunk.length) {
                return;
            }
            if (_this.readState === ReadState.HEADER) {
                const headerListEnd = _this.searchHeaderListEnd(chunk, start);
                if (headerListEnd === -1) {
                    return;
                }
                start = headerListEnd;
                _this.readState = ReadState.BODY;
                // header list is ignored, we don't need it
                _this.headerListBuffer = null;
            }
            while (true) {
                if (_this.readState === ReadState.BODY) {
                    _this.readState = ReadState.INIT;
                } else {
                    _this.partIndex++;
                    let taskIndex = _this.partIndexToTaskIndex.get(_this.partIndex);
                    if (taskIndex == null) {
                        if (_this.isFinished) {
                            taskIndex = _this.options.end;
                        } else {
                            throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
                        }
                    }
                    const prevTaskIndex = _this.partIndex === 0 ? _this.options.start : _this.partIndexToTaskIndex.get(_this.partIndex - 1) + 1 /* prev part is download, next maybe copy */;
                    if (prevTaskIndex < taskIndex) {
                        yield _this.copyExistingData(prevTaskIndex, taskIndex);
                    } else if (prevTaskIndex > taskIndex) {
                        throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
                    }
                    if (_this.isFinished) {
                        _this.onPartEnd();
                        _this.finishHandler();
                        return;
                    }
                    start = _this.searchHeaderListEnd(chunk, start);
                    if (start === -1) {
                        _this.readState = ReadState.HEADER;
                        return;
                    }
                }
                const partLength = _this.partIndexToLength[_this.partIndex];
                const end = start + partLength;
                const effectiveEnd = Math.min(end, chunk.length);
                yield _this.processPartStarted(chunk, start, effectiveEnd);
                _this.remainingPartDataCount = partLength - (effectiveEnd - start);
                if (_this.remainingPartDataCount > 0) {
                    return;
                }
                start = end + _this.boundaryLength;
                if (start >= chunk.length) {
                    _this.ignoreByteCount = _this.boundaryLength - (chunk.length - end);
                    return;
                }
            }
        })();
    }
    copyExistingData(index, end) {
        return new (_bluebirdLst2 || _load_bluebirdLst2()).default((resolve, reject) => {
            const w = () => {
                if (index === end) {
                    resolve();
                    return;
                }
                const task = this.options.tasks[index];
                if (task.kind !== (_downloadPlanBuilder || _load_downloadPlanBuilder()).OperationKind.COPY) {
                    reject(new Error("Task kind must be COPY"));
                    return;
                }
                copyData(task, this.out, this.options.oldFileFd, reject, () => {
                    index++;
                    w();
                });
            };
            w();
        });
    }
    searchHeaderListEnd(chunk, readOffset) {
        const headerListEnd = chunk.indexOf(DOUBLE_CRLF, readOffset);
        if (headerListEnd !== -1) {
            return headerListEnd + DOUBLE_CRLF.length;
        }
        // not all headers data were received, save to buffer
        const partialChunk = readOffset === 0 ? chunk : chunk.slice(readOffset);
        if (this.headerListBuffer == null) {
            this.headerListBuffer = partialChunk;
        } else {
            this.headerListBuffer = Buffer.concat([this.headerListBuffer, partialChunk]);
        }
        return -1;
    }
    onPartEnd() {
        const expectedLength = this.partIndexToLength[this.partIndex - 1];
        if (this.actualPartLength !== expectedLength) {
            throw (0, (_builderUtilRuntime || _load_builderUtilRuntime()).newError)(`Expected length: ${expectedLength} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
        }
        this.actualPartLength = 0;
    }
    processPartStarted(data, start, end) {
        if (this.partIndex !== 0) {
            this.onPartEnd();
        }
        return this.processPartData(data, start, end);
    }
    processPartData(data, start, end) {
        this.actualPartLength += end - start;
        const out = this.out;
        if (out.write(start === 0 && data.length === end ? data : data.slice(start, end))) {
            return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve();
        } else {
            return new (_bluebirdLst2 || _load_bluebirdLst2()).default((resolve, reject) => {
                out.on("error", reject);
                out.once("drain", () => {
                    out.removeListener("error", reject);
                    resolve();
                });
            });
        }
    }
}
exports.DataSplitter = DataSplitter; //# sourceMappingURL=DataSplitter.js.map