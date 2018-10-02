# Convert stream of Array to a xlsx file.
#
# * Usage
#
# out = fs.createWriteStream('out.xlsx')
# stream = xlsxStream()
# stream.pipe out
#
# stream.write(['aaa', 'bbb', 'ccc'])
# stream.write([1, 2, 3])
# stream.write([new Date, '090-1234-5678', 'これはテストです'])
#
# stream.end()

through = require 'through'
archiver = require 'archiver'
_ = require 'lodash'
duplex = require 'duplexer'

templates = require './templates'
utils = require "./utils"
sheetStream = require "./sheet"

module.exports = xlsxStream = (opts = {})->
  # archiving into a zip file using archiver (internally using node's zlib built-in module)
  zip = archiver.create('zip', opts)
  defaultRepeater = through()
  proxy = duplex(defaultRepeater, zip)

  # prevent loosing data before listening 'data' event in node v0.8
  zip.pause()
  process.nextTick -> zip.resume()

  defaultSheet = null
  sheets = []

  # writing data without sheet() results in creating a default worksheet named 'Sheet1'
  defaultRepeater.once 'data', (data)->
    defaultSheet = proxy.sheet('Sheet1')
    defaultSheet.write(data)
    defaultRepeater.pipe(defaultSheet)
    defaultRepeater.on 'end', proxy.finalize

  # Append a new worksheet to the workbook
  proxy.sheet = (name)->
    index = sheets.length+1
    sheet =
      index: index
      name: name || "Sheet#{index}"
      rel: "worksheets/sheet#{index}.xml"
      path: "xl/worksheets/sheet#{index}.xml"
    sheets.push sheet
    sheetStream(zip, sheet, opts)

  # finalize the xlsx file
  proxy.finalize = ->
    # static files
    for name, buffer of templates.statics
      zip.append buffer, {name, store: opts.store}
    for name, func of templates.semiStatics
      zip.append func(opts), {name, store: opts.store}

    # files modified by number of sheets
    for name, obj of templates.sheet_related
      buffer =  obj.header
      buffer += obj.sheet(sheet) for sheet in sheets
      buffer += obj.footer
      zip.append buffer, {name, store: opts.store}

    zip.finalize (e, bytes)->
      return proxy.emit 'error', e if e?
      proxy.emit 'finalize', bytes

  return proxy
