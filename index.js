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
    if(this.opts.disk) {
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

  debug (ctx) {
    let severity = ctx.response.status >= 400 ? 'ERROR' : 'INFO';
    let requestClass = (ctx.request.header['x-correlation-id']) ? 'service_request' : 'client_request';
    let correlationId = uuid.v4();
    let request = {
      class: requestClass,
      correlation_id: ctx.request.header['x-correlation-id'] || correlationId,
      host: os.hostname(),
      pid: process.pid,
      path: ctx.request.url,
      request_id: uuid.v4(),
      method: ctx.request.method,
      request_time: new Date,
      message: `${ctx.request.method} ${ctx.request.url}`,
      severity: 'INFO'
    }
    let response = {
      class: requestClass,
      correlation_id: ctx.request.header['x-correlation-id'] || correlationId,
      host: os.hostname(),
      pid: process.pid,
      path: ctx.request.url,
      request_id: uuid.v4(),
      method: ctx.request.method,
      request_time: new Date,
      message: `${ctx.request.method} ${ctx.request.url}`,
      response_time: request.request_time,
      meta: {},
      client: '',
      status: ctx.response.status,
      resolution_time: '',
      severity: severity
    }
    this.pipeLogs(request);
    this.pipeLogs(response);
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
        /*
        if(debug) {
          console.log(ctx);
          // call debug method for development 
        }
        */
        let request = {
          id: uuid.v4(),
          timestamp: new Date,
          req: ctx.request
        }
        let response = {
          id: request.id, 
          timestamp: new Date,
          res: ctx.response
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
