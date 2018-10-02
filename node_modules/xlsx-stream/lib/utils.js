var compress, escapeXML, _;

_ = require("lodash");

module.exports = {
  colChar: function(input) {
    var a, colIndex;
    input = input.toString(26);
    colIndex = '';
    while (input.length) {
      a = input.charCodeAt(input.length - 1);
      colIndex = String.fromCharCode(a + (a >= 48 && a <= 57 ? 17 : -22)) + colIndex;
      input = input.length > 1 ? (parseInt(input.substr(0, input.length - 1), 26) - 1).toString(26) : "";
    }
    return colIndex;
  },
  escapeXML: escapeXML = function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  },
  compress: compress = function(str) {
    return String(str).replace(/\n\s*/g, '');
  },
  buildCell: function(ref, val) {
    if (val == null) {
      return '';
    }
    if (_.isNumber(val) && _.isFinite(val)) {
      return "<c r='" + ref + "'><v>" + val + "</v></c>";
    } else if (_.isDate(val)) {
      return "<c r='" + ref + "' t='d' s='2'><v>" + (val.toISOString()) + "</v></c>";
    } else if (_.isBoolean(val)) {
      return "<c r='" + ref + "' t='b'><v>" + (val ? '1' : '0') + "</v></c>";
    } else {
      return "<c r='" + ref + "' t='inlineStr'><is><t>" + (escapeXML(val)) + "</t></is></c>";
    }
  }
};
