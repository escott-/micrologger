'use strict';
/*
  Options:
  {
    meta: {
      team: 'platform',
      project: 'User Authentication',
    },
    disk: true,
    logFolder: './logs'
    zmq: { host: 'localhost', port: 5555 }
  }
*/
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
        host: os.hostname(),
        pid: process.pid,
        level: level,
        timestamp: new Date,
        message: data.toString()
      }
      this.pipeLogs(log);
      console.log(clc.blue(data.toString()))
    }
  }
  request () {
    const self = this;
    return function *(next) {
      try {
        yield next;
      } catch (err) {
        throw err;
      }
      let onFinish = done.bind(null, 'finish');
      let onClose = done.bind(null, 'close');
      let ctx = this;
      let res = this.res;
      res.once("finish", onFinish);
      res.onse("close", onClose);
      function done(evt) {
        res.removeListener("finish", onFinish);
        res.removeListener("close", onClose);
        if(self.opts.env === "development") {
          console.log(ctx);
          // call debug method for development 
        }
      }
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
