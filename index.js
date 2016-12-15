'use strict';
const os = require('os');
const stream = require('stream');
const logrotate = require('logrotate-stream');

class Logger {
  constructor (opts) {
    this.opts = opts;
  }
  app () {
    if(this.opts.env === "development") {
      let log = {
        class: 'application',
        hostname: os.hostname(),
        pid: process.pid,
        level: level,
        timestamp: new Date,
        msg: data.toString()
      }
      this.pipeLogs(log);
      console.log(clc.blue(data.toString()))
    }
  }
  pipeLogs (data) {
    let bufferStream = new stream.PassThrough()
    bufferStream.end(new Buffer(JSON.stringify(data) + '\n'));
    let toLogFile = logrotate({ file: './logs/out.log', size: '100k', keep: 7 });
    bufferStream.pipe(toLogFile);
  }
}

module.exports = Logger;
