_ = require "lodash"
module.exports =
  colChar: (input)->
    input = input.toString(26)
    colIndex = ''
    while input.length
      a = input.charCodeAt(input.length - 1)
      colIndex = String.fromCharCode(a + if a >= 48 and a <= 57 then 17 else -22) + colIndex
      input = if input.length > 1 then (parseInt(input.substr(0, input.length - 1), 26) - 1).toString(26) else ""
    return colIndex

  escapeXML: escapeXML = (str)->
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  compress: compress = (str)->
    String(str).replace(/\n\s*/g, '')

  buildCell: (ref, val)->
    return '' unless val?
    if _.isNumber(val) and _.isFinite(val)
      "<c r='#{ref}'><v>#{val}</v></c>"
    else if _.isDate(val)
      "<c r='#{ref}' t='d' s='2'><v>#{val.toISOString()}</v></c>"
    else if _.isBoolean(val)
      "<c r='#{ref}' t='b'><v>#{if val then '1' else '0'}</v></c>"
    else
      "<c r='#{ref}' t='inlineStr'><is><t>#{escapeXML(val)}</t></is></c>"
