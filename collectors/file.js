'use strict';

const FS         = require('fs');
const LOG_ROTATE = require('logrotate-stream');

const Collector = require('./collector');

class FileCollector extends Collector {
  constructor (opts={}) {
    super(opts);
    this.type = 'fluent';
    this.path  = opts.path || './logs/out.log';
  }

  collect (type='generic', data={}) {
    let bufferStream = new stream.PassThrough();
    bufferStream.end(new Buffer(JSON.stringify(data) + '\n'));
    if (!fs.existsSync('./logs')){
      fs.mkdirSync('./logs');
    }
    let toLogFile = LOG_ROTATE({ file: './logs/out.log', size: '500k', keep: 7 });
    bufferStream.pipe(toLogFile);
  }
}

module.exports = FileCollector;
