var archiver, duplex, sheetStream, templates, through, utils, xlsxStream, _;

through = require('through');

archiver = require('archiver');

_ = require('lodash');

duplex = require('duplexer');

templates = require('./templates');

utils = require("./utils");

sheetStream = require("./sheet");

module.exports = xlsxStream = function(opts) {
  var defaultRepeater, defaultSheet, proxy, sheets, zip;
  if (opts == null) {
    opts = {};
  }
  zip = archiver.create('zip', opts);
  defaultRepeater = through();
  proxy = duplex(defaultRepeater, zip);
  zip.pause();
  process.nextTick(function() {
    return zip.resume();
  });
  defaultSheet = null;
  sheets = [];
  defaultRepeater.once('data', function(data) {
    defaultSheet = proxy.sheet('Sheet1');
    defaultSheet.write(data);
    defaultRepeater.pipe(defaultSheet);
    return defaultRepeater.on('end', proxy.finalize);
  });
  proxy.sheet = function(name) {
    var index, sheet;
    index = sheets.length + 1;
    sheet = {
      index: index,
      name: name || ("Sheet" + index),
      rel: "worksheets/sheet" + index + ".xml",
      path: "xl/worksheets/sheet" + index + ".xml"
    };
    sheets.push(sheet);
    return sheetStream(zip, sheet, opts);
  };
  proxy.finalize = function() {
    var buffer, func, name, obj, sheet, _i, _len, _ref, _ref1, _ref2;
    _ref = templates.statics;
    for (name in _ref) {
      buffer = _ref[name];
      zip.append(buffer, {
        name: name,
        store: opts.store
      });
    }
    _ref1 = templates.semiStatics;
    for (name in _ref1) {
      func = _ref1[name];
      zip.append(func(opts), {
        name: name,
        store: opts.store
      });
    }
    _ref2 = templates.sheet_related;
    for (name in _ref2) {
      obj = _ref2[name];
      buffer = obj.header;
      for (_i = 0, _len = sheets.length; _i < _len; _i++) {
        sheet = sheets[_i];
        buffer += obj.sheet(sheet);
      }
      buffer += obj.footer;
      zip.append(buffer, {
        name: name,
        store: opts.store
      });
    }
    return zip.finalize(function(e, bytes) {
      if (e != null) {
        return proxy.emit('error', e);
      }
      return proxy.emit('finalize', bytes);
    });
  };
  return proxy;
};
