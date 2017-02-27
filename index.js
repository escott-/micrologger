'use strict';
const os = require('os') 
  , fs = require('fs')
  , fluentlogger = require('fluent-logger')
  , zeromq = require('zmq')
  , sock = zeromq.socket('pub')
  , chalk = require('chalk')
  , humanize = require('humanize-number')
  , stripAnsi = require('strip-ansi')
  , uuid = require('uuid')
  , stream = require('stream')
  , logrotate = require('logrotate-stream')
  , reqPath = require('app-root-path').require
  , name = reqPath('/package.json').name

let collector;
let logToFile = false;
let color = chalk.bold.white;
let req;
let error = false;
function log(opts) {
  if(opts && opts.backgroundColor) {
    if(opts.backgroundColor === 'white'){
      color = chalk.bold.black;
    } else {
      color = chalk.bold.white;
    }
  }
  if(opts && opts.zmq) {
    sock.connect(`tcp://${opts.zmq.addr}`);
    collector = 'zmq';
  }
  if(opts && opts.logToFile === true) {
    logToFile = true
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
  if(opts && opts.appLogs !== false) {
    logUncaughtError();
  } 
  return function *(next) {
    let ctx = this;
    let res = ctx.res;
    let reqTime = new Date;
    let classname = (ctx.request.headers['x-correlation-id']) ? 'service_request' : 'client_request';
    let correlationId = ctx.request.headers['x-correlation-id'] || uuid.v4();
    ctx.request.headers['x-correlation-id'] = correlationId;
    req = true;
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
        message: `<-- ${ctx.request.method} ${ctx.request.url}`,
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
        message: `--> ${ctx.response.status} ${ctx.response.message} ${ctx.request.url}`,
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
      logInfo(request.message);
      if(response.severity === 'ERROR') {
        logError(response.message);
      } else {
        logInfo(response.message);
      }
      if(process.env.NODE_ENV === 'development') {
        if(logToFile){
          pipeLogsToFile(request);
          pipeLogsToFile(response); 
        }
      } else if(collector) {
        collectLogs('request', request);
        collectLogs('response', response);
      }
    }
  }
}

function logUncaughtError () {
  process.on('uncaughtException', function(err) {
    err = stripAnsi(err.stack);
    logError(err)
    setTimeout(process.exit.bind(process, 1), 1000);
  });
}

function logInfo (data) {
  data = stripAnsi(data);
  let log = {
    class: 'application',
    ident: name,
    host: os.hostname(),
    pid: process.pid,
    severity: 'INFO',
    message: data
  }
  if(data.indexOf('<--') !== -1){
    console.log(chalk.cyan.underline.bold(data));
  } else if(data.indexOf('-->') !== -1) {
    console.log(chalk.green.bold(data));
  } else {
    console.log(color(data));
    if(process.env.NODE_ENV === 'development') {
      if(logToFile){
        pipeLogsToFile(log);
      }
    } else if(collector) {
        collectLogs('application', log);
    }
  }
}

function logError (err) {
  err = stripAnsi(err);
  let log = {
    class: 'application',
    ident: name,
    host: os.hostname(),
    pid: process.pid,
    severity: 'ERROR',
    message: err
  }
  console.error(chalk.red.bold(err));
  if(process.env.NODE_ENV === 'development') {
    if(logToFile){
      pipeLogsToFile(log);
    }
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

module.exports = log
module.exports.info = logInfo
module.exports.error = logError
