'use strict';

const STRIP_ANSI = require('strip-ansi');
const UUID       = require('uuid');
const REQ_PATH   = require('app-root-path').require;
const OS         = require('os');

const COLLECTORS = require('./collectors');
const LEVELS     = require('./levels');

class Micrologger {
  constructor (opts={}) {
    this.name              = opts.name || REQ_PATH('/package.json').name;
    this.color             = opts.color || false;
    this.bold              = opts.bold || false;
    this.backgroundColor   = opts.backgroundColor || false;
    this.stripAnsi         = (opts.stripAnsi === false ? false : true);
    this.hostname          = opts.hostname || OS.hostname();
    this.collectors        = opts.collectors || {};
    this.requestIdHeader   = opts.requestIdHeader || 'x-request-id';
    this.correlationHeader = opts.correlationHeader || 'x-correlation-id';
    this.correlationGen    = opts.correlationGen || (() => UUID.v4());
    this.levels            = opts.levels || false;
    this.levelSeverity     = opts.level || opts.severity ||  'ALL';
    this.levelValue        = Infinity;

    this.formatReq = opts.formatReq || ((ctx) => {
      return `<-- ${ctx.method} ${ctx.path}`;
    });

    this.formatRes = opts.formatRes || ((ctx) => {
      return `--> ${ctx.method} ${ctx.path} ${ctx.status}`;
    })


    // If a single collector was specified, add it
    let collectors = Object.keys(this.collectors);
    if (opts.collector && !collectors.length) {
      this.useCollector(opts.collector);

    // Add the list of collectors passed
    } else {
      for (let collector of collectors) {
        let cltr = this.collectors[collector];
        this.useCollector(cltr, cltr);
      }
    }

    // If custom levels were not set, apply default syslog
    if (!this.levels) {
      this.levels = {};
      let levels = Object.keys(LEVELS);
      for (let severity of levels) {
        if (severity === 'level') continue;
        this.levels[severity] = new LEVELS[severity]({
          color           : this.color,
          bold            : this.bold,
          backgroundColor : this.backgroundColor,
        });
      }

    // Validate custom levels
    } else {
      let levels = Object.keys(this.levels);
      for (let severity of levels) {
        if (!(this.levels[severity] instanceof LEVELS.level)) {
          throw Error(`Attempted to use level which is not a subclass of Level: [${severity}]`);
        }
      }
    }

    // find the lowest level allowed to be logged (if passed as an option)
    if (this.levelSeverity && (opts.level || opts.severity)) {
      let level = this.levels[this.levelSeverity.toLowerCase()];
      if (!level) {
        throw Error(`Attempted to set unknown logging level [${opts.levelSeverity}]`);
      }
      this.levelValue = level.value;
    }

    // Enable/disable levels based on value, and expose them on the base of the object
    this.setLevel(this.levelSeverity)
    let levels = Object.keys(this.levels);
    for (let level of levels) {
      let lvl    = this.levels[level];

      if (this[lvl.severity] && !this[lvl.severity].isLevel) {
        throw Error(`Attempted to overwrite existing logger propterty level with severity [${level}]`)
      }

      if (this[lvl.keyword] && !this[lvl.keyword].isLevel) {
        throw Error(`Attempted to overwrite existing logger propterty level keyword [${level}]`)
      }
      this[lvl.severity] = this[lvl.keyword] = (data) => this.log(level, data);
      this[lvl.severity].isLevel = this[lvl.keyword].isLevel = true
    }
  }

  // Add the collector for the logger
  useCollector (collector, config={}) {
    if (!collector) {
       throw Error('Attempted to set undefined collector');
    }

    let type = ((typeof collector === 'string' ? collector: collector.type) || '').toLowerCase();

    // Custom collector injection
    if (collector instanceof COLLECTORS.collector) {
      this.collectors[type] = collector;
      return;
    }

    // Known collector configuration
    if (!type) {
      throw Error('Collector type not specified in setCollector');
    }

    let Collector = COLLECTORS[type];
    if (!Collector) {
      throw Error(`Collector type [${type}] not known`);
    }

    this.collectors[type] = new Collector(config);
  }

  // set color for levels
  setColor (color) {
    let levels = Object.keys(LEVELS);
    for (let severity of levels) {
      if (severity === 'level') continue;
      this.levels[severity].setColor(color);
    }
  }

  // set boldness for levels
  setBold (bold=true) {
    let levels = Object.keys(LEVELS);
    for (let severity of levels) {
      if (severity === 'level') continue;
      this.levels[severity].bold = bold;
    }
  }

  // set whether or not to strip ansi encoding
  setStripAnsi (bool=true) {
    this.stripAnsi = bool;
  }

  // set what level to log to
  setLevel (severity) {
    this.levelSeverity = severity;
    let levels = Object.keys(this.levels);
    for (let level of levels) {
      let lvl    = this.levels[level];
      let lvlVal = lvl.value
      if (lvlVal <= this.levelValue) {
        this.levels[level].enable();
      } else {
        this.levels[level].disable();
      }
    }
  }

  collect (data={}) {
    let names = Object.keys(this.collectors || []);
    for (let name of names) {
      this.collectors[name].collect(data);
    }
  }

  log (level='', data='') {
    let norm = {};

    // Assign string s object
    if (typeof data === 'string') {
      norm.message = data;

    // Naive clone to leave data unaffected
    } else {
      let keys = Object.keys(data);
      for (let key of keys) norm[key] = data[key];
    }

    // Perform normalizations
    norm.severity = level.toUpperCase();
    norm.level    = level.toLowerCase();
    norm.message  = this.stripAnsi ? STRIP_ANSI(norm.message): norm.message;

    // Use the appropriate logger
    let logger = this.levels[norm.level];
    if (!logger) {
      return console.warn(`Attempted to use unknown log level [${norm.level}] for message: ${norm.message}`);
    }

    if (logger.enabled) {
      logger.log(norm);
      this.collect(norm);
    }
  }

  // Middleware for req/res logging
  middleware (opts={}) {
    let correlationHeader = opts.correlationHeader || this.correlationHeader;
    let formatReq         = opts.formatReq || this.formatReq;
    let formatRes         = opts.formatRes || this.formatRes;
    let correlationGen    = opts.correlationGen || this.correlationGen;
    let requestIdHeader   = opts.requestIdHeader || this.requestIdHeader;

    return async (ctx, next) => {
      let res           = ctx.res;
      let reqTime       = new Date();
      let reqId         = UUID.v4();
      let classname     = (ctx.request.headers[correlationHeader]) ? 'service_request' : 'client_request';
      let correlationId = ctx.request.headers[correlationHeader] || correlationGen();
      ctx.request.headers[correlationHeader] = correlationId;
      ctx.request.headers[requestIdHeader]   = correlationId;

      let done = (evt) => {
        let resTime = new Date();
        res.removeListener('finish', onFinish);
        res.removeListener('close', onClose);
        let logBase = {
          requestId      : reqId,
          classname      : classname,
          correlationId  : correlationId,
          resolutionTime : resTime - reqTime,
          requestTime    : reqTime.toString(),
          responseTime   : res.toString(),
          formatRes      : formatReq,
          formatRes      : formatRes,
        };

        logBase.message = formatReq(ctx);
        this.log('informational', this.buildReqLog(ctx, logBase));
        let resLevel    = (ctx.response.status >= 400 ? 'informational' : 'error');
        logBase.message = formatRes(ctx);
        this.log(resLevel, this.buildResLog(ctx, logBase));
      };

      let onFinish = done.bind(null, 'finish');
      let onClose = done.bind(null, 'close');
      res.once('finish', onFinish);
      res.once('close', onClose);

      try {
        await next();
      } catch (err) {
        throw err;
      }
    }
  }

  //
  // Helpers
  //

  buildReqLog (ctx, base) {
    return {
      request_id     : base.requestId,
      class          : base.classname,
      correlation_id : base.correlationId,
      request_time   : base.requestTime,
      message        : base.message,
      ident          : this.name,
      host           : this.hostname,
      client         : ctx.request.ip || ctx.request.headers['x-forwarded-for'],
      path           : ctx.path,
      method         : ctx.method,
      severity       : 'informational',
      metadata       : {}
    }
  }

  buildResLog (ctx, base) {
    return {
      request_id      : base.requestId,
      class           : base.classname,
      correlation_id  : base.correlationId,
      message         : base.message,
      resolution_time : base.resolvedTime,
      response_time   : base.resolutionTime.toString(),
      ident           : this.name,
      host            : this.hostname,
      client          : ctx.request.ip || ctx.request.headers['x-forwarded-for'],
      path            : ctx.path,
      method          : ctx.method,
      status          : ctx.response.status,
      severity        : ctx.response.status >= 400 ? 'error' : 'informational',
      metadata        : {}
    }
  }
}

module.exports = Micrologger;
