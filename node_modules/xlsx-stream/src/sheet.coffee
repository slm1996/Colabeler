_ = require "lodash"
through = require('through')

utils = require('./utils')
template = require('./templates').worksheet

module.exports = sheetStream = (zip, sheet, opts={})->
  # 列番号の26進表記(A, B, .., Z, AA, AB, ..)
  # 一度計算したらキャッシュしておく。
  colChar = _.memoize utils.colChar

  # 行ごとに変換してxl/worksheets/sheet1.xml に追加
  nRow = 0
  onData = (row)->
    nRow++
    buf = "<row r='#{nRow}'>"
    if opts.columns?
      buf += utils.buildCell("#{colChar(i)}#{nRow}", row[col]) for col, i in opts.columns
    else
      buf += utils.buildCell("#{colChar(i)}#{nRow}", val) for val, i in row
    buf += '</row>'
    @queue buf
  onEnd = ->
    # フッタ部分を追加
    @queue template.footer
    @queue null
    converter = colChar = zip = null

  converter = through(onData, onEnd)
  zip.append converter, name: sheet.path, store: opts.store

  # ヘッダ部分を追加
  converter.queue template.header

  return converter
