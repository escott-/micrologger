'use strict';
const os = require('os') 
  , fs = require('fs')
  , fluentlogger = require('fluent-logger')
  , zeromq = require('zmq')
  , sock = zeromq.socket('pub')
  , chalk = require('chalk')
  , humanize = require('humanize-number')
  , uuid = require('uuid')
  , stream = require('stream')
  , logrotate = require('logrotate-stream')
  , reqPath = require('app-root-path').require
  , name = reqPath('/package.json').name

let collector;
let logToFile = true;
let color = chalk.bold.white;
function app(app, opts) {
  if(opts && opts.backgroundColor) {
    if(opts.backgroundColor === 'white'){
      color = chalk.bold.black;
    } else {
      color = chalk.bold.white;
    }
  }
  if(opts && opts.fluent) {
    fluentlogger.configure('tag_prefix', {
      host: opts.fluent.host,
      port: opts.fluent.port,
      timeout: 3.0,
      reconnectInterval: 600000
    });
    collector = 'fluent';
  }
  if(opts && opts.zmq) {
    sock.connect(`tcp://${opts.zmq.addr}`);
    collector = 'zmq';
  }
  if(opts && opts.logToFile === false) {
    logToFile = false
  } 
  if(!opts || opts && opts.appLogs !== false) {
    logUncaughtError();
  } 
  if(!opts || opts && opts.requestLogs !== false) {
    app.use(request());
  } 
}

function logUncaughtError (err) {
  process.on('uncaughtException', function(err) {
    err = err.stack.replace(/(?:\r\n|\r|\n)\s\s+/g, ' ');
    let log = {
      class: 'application',
      ident: name,
      host: os.hostname(),
      pid: process.pid,
      severity: 'INFO',
      message: err
    }
    if(logToFile) {
      pipeLogsToFile(log);
    }
    if(process.env.NODE_ENV === 'development') {
      console.log(chalk.red.bold(err));
    } else {
      collectLogs('application', log);
    }
    setTimeout(process.exit.bind(process, 1), 1000);
  });
}

function logInfo (data) {
  let log = {
    class: 'application',
    ident: name,
    host: os.hostname(),
    pid: process.pid,
    severity: 'INFO',
    message: data
  }
  if(logToFile) {
    pipeLogsToFile(log);
  }
  if(process.env.NODE_ENV === 'development') {
    console.log(color(data));
  } else {
    collectLogs('application', log);
  }
}

function logError (err) {
  let log = {
    class: 'application',
    ident: name,
    host: os.hostname(),
    pid: process.pid,
    severity: 'ERROR',
    message: err
  }
  if(logToFile) {
    pipeLogsToFile(log);
  }
  if(process.env.NODE_ENV === 'development') {
    console.log(chalk.red.bold(err));
  } else {
    collectLogs('application', log);
  }
}

function pipeLogsToFile (data) {
  let bufferStream = new stream.PassThrough();
  bufferStream.end(new Buffer(JSON.stringify(data) + '\n'));
  if (!fs.existsSync('./logs')){		
    fs.mkdirSync('./logs');		
  }
  let toLogFile = logrotate({ file: './logs/out.log', size: '500k', keep: 7 });
  bufferStream.pipe(toLogFile);
}

function request() {
  return function *(next) {
    let ctx = this;
    let res = ctx.res;
    let reqTime = new Date;
    let classname = (ctx.request.headers['x-correlation-id']) ? 'service_request' : 'client_request';
    let correlationId = ctx.request.headers['x-correlation-id'] || uuid.v4();
    ctx.request.headers['x-correlation-id'] = correlationId;
    try {
      yield next;
    } catch (err) {
      throw err;
    }
    let onFinish = done.bind(null, 'finish');
    let onClose = done.bind(null, 'close');
    res.once('finish', onFinish);
    res.once('close', onClose);
    function done(evt) {
      let resTime = new Date;
      let resolvedTime = time(reqTime);
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
      let requestId = uuid.v4();
      let request = {
        request_id: requestId,
        ident: name,
        class: classname,
        message: `${ctx.request.method} ${ctx.request.url}`,
        host: os.hostname(),
        client: ctx.request.ip || ctx.request.headers['x-forwarded-for'],
        path: ctx.request.url,
        method: ctx.request.method,
        request_time: Date().toString(),
        correlation_id: correlationId,
        severity: 'INFO',
        metadata: {}
      }
      let response = {
        request_id: requestId,
        ident: name,
        class: classname,
        message: `${ctx.response.status} ${ctx.response.message} ${ctx.request.url}`,
        host: os.hostname(),
        client: ctx.request.ip || ctx.request.headers['x-forwarded-for'],
        path: ctx.request.url,
        method: ctx.request.method,
        response_time: resTime.toString(),
        resolution_time: resolvedTime,
        correlation_id: correlationId,
        status: ctx.response.status,
        severity: ctx.response.status >= 400 ? 'ERROR' : 'INFO',
        metadata: {}
      }
      if(logToFile){
        pipeLogsToFile(request);
        pipeLogsToFile(response);
      }
      if(process.env.NODE_ENV === 'development') {
        console.log(chalk.cyan.underline.bold(request.message));
        if(response.severity === 'ERROR') {
          console.log(chalk.red.bold(response.message));
        } else {
          console.log(chalk.green.bold(response.message));
        }
      } else {
        collectLogs('request', request);
        collectLogs('response', response);
      }
    }
  }
}

function collectLogs(type, data) {
  switch (collector) {
    case 'fluent':
      fluentlogger.emit('label', data);
      break;
    case 'zmq':
      sock.send([type, JSON.stringify(data)]);
      break;
    default:
      console.log(color('Not a valid log collector'));
  }
}

function time(start) {
  var delta = new Date - start;
  delta = delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's';
  return humanize(delta);
}

module.exports = app
module.exports.info = logInfo
module.exports.error = logError