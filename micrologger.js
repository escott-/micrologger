'use strict';

const STRIP_ANSI = require('strip-ansi');
const UUID       = require('uuid');
const REQ_PATH   = require('app-root-path').require;
const HUMANIZE   = require('humanize-number')

const COLLECTORS = require('./collectors');
const LEVELS     = require('./levels');

class Micrologger {
  constructor (opts={}) {
    this.name              = opts.name || reqPath('/package.json').name;
    this.color             = opts.color || false;
    this.bold              = opts.bold || false;
    this.backgroundColor   = opts.backgroundColor || false;
    this.logToFile         = (opts.logToFile === true);
    this.collectors        = opts.collectors || {};
    this.requestIdHeader   = opts.requestIdHeader || 'x-request-id';
    this.correlationHeader = opts.correlationHeader || 'x-correlation-id';
    this.correlationGen    = opts.correlationGen || (() => UUID.v4());
    this.hostname          = opts.hostname || os.hostname();
    this.stripAnsi         = this.stripAnsi === false || true;
    this.levels            = opts.levels || false;
    this.levelSeverity     = opts.level || opts.severity ||  'ALL';
    this.levelValue        = Infinity;

    this.formatReq = opts.formatReq || ((ctx) => {
      return `<-- ${ctx.request.method} ${ctx.request.url}`;
    });

    this.formatRes = opts.formatRes || ((ctx) => {
      return `--> ${ctx.response.status} ${ctx.response.message} ${ctx.request.url}`;
    })


    // If a single collector was specified, add it
    let collectors = Object.keys(this.collectors);
    if (this.collector && !collectors.length) {
      this.useCollector(this.collector);

    // Add the list of collectors passed
    } else {
      for (collector of collectors) {
        this.setCollector(this.collector, this.collector);
      }
    }

    // If custom levels were not set
    if (!this.levels) {
      this.levels = {};
      let levels = Object.keys(LEVELS);
      if (let severity of levels) {
        this.levels[severity] = new levels[severity]({
          color : this.color,
          bold  : this.bold,
        });
      }
    }

    // find the lowest level allowed to be logged
    if (opts.levelSeverity && (opts.level || opts.severity)) {
      let level = this.levels[opts.levelSeverity];
      if (!level) {
        throw Error(`Attempted to set unknown logging level [${opts.levelSeverity}]`);
      }
      this.levelValue = level.value;
    }

    // Enable/disable levels based on value, and expose them on the base of the object
    let levels = Object.keys(this.levels);
    for (let level of levels) {
      let lvl    = this.levels[level];
      let lvlVal = lvl.value
      if (lvlVal >= log.levelValue) {
        this.levels[level].enable();
      } else {
        this.levels[level].disable();
      }

      if (this[lvl.severity]) {
        throw Error(`Attempted to overwrite existing logger propterty level with severity [${level}]`)
      }

      if (this[lvl.keyword]) {
        throw Error(`Attempted to overwrite existing logger propterty level keyword [${level}]`)
      }

      this[lvl.severity] = this[lvl.keyword] = (data) => this.log(level, data);
    }
  }

  // Add the collector for the logger
  useCollector (collector, config={}) {
    if (!collector) {
       throw Error('Attempted to set undefined collector');
    }

    let type = (collector.type || '').toLowerCase();

    // Custom collector injection
    if (collector.prototype instanceof COLLECTORS.Collector) {
      this.collectors[type] = collector;
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

  collect (data={}) {
    let names = Object.keys(this.collectors || []);
    for (let name of names) {
console.log(`COLLECTING [${name}]: ${data}`) // TODO: remove
      this.collectors[name].collect(data);
    }
  }

  log (level, data) {
    // Normalize data
    if (typeof data === 'string') data = { message: data };
    data.severity = level.toUpperCase();
    data.level    = level.toLowerCase();
    data.message  = this.stripAnsi ? STRIP_ANSI(data.message): data.message;

    // Use the appropriate logger
    let logger    = this.levels[data.level];
    if (logger && logger.enabled) {
      logger.log(data);
      this.collect(data);
    } else {
      console.warn(`Tried to use unknown log level [${data.level}] for message: ${data.message}`);
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
      let ctx           = this;
      let res           = ctx.res;
      let reqTime       = new Date();
      let reqId         = UUID.v4();
      let classname     = (ctx.request.headers[correlationHeader]) ? 'service_request' : 'client_request';
      let correlationId = ctx.request.headers[correlationHeader] || correlationGen();
      ctx.request.headers[correlationHeader] = correlationId;
      ctx.request.headers[requestIdHeader]   = correlationId;

      try {
        yield next;
      } catch (err) {
        throw err;
      }

      let done(evt) => {
        let resTime = new Date();
        res.removeListener('finish', onFinish);
        res.removeListener('close', onClose);
        let logBase = {
          requestId      : reqId,
          classname      : classname,
          correlationId  : correlationId,
          message        : format(ctx),
          resolutionTime : resTime - reqTime,
          requestTime    : reqTime.toString(),
          responseTime   : res.toString(),
          formatRes      : formatReq,
          formatRes      : formatRes,
        };

        this.log('INFO', this._buildReqLog(ctx, logBase));
        let resLevel = (ctx.response.status >= 400 ? 'INFO' : 'ERROR');
        this.log(resLevel, this._buildResLog(ctx, logBase));
      };

      let onFinish = done.bind(null, 'finish');
      let onClose = done.bind(null, 'close');
      res.once('finish', onFinish);
      res.once('close', onClose);
    }
  }

  //
  // Helpers
  //

  _buildReqLog (ctx, base) {
    return {
      request_id     : base.requestId,
      class          : base.classname,
      correlation_id : base.correlationId,
      request_time   : base.requestTime,
      message        : base.format(ctx),
      ident          : this.name,
      host           : this.hostname,
      client         : ctx.request.ip || ctx.request.headers['x-forwarded-for'],
      path           : ctx.request.url,
      method         : ctx.request.method,
      severity       : 'INFO',
      metadata       : {}
    }
  }

  _buildResLog (ctx, base) {
    return {
      request_id      : base.requestId,
      class           : base.classname,
      correlation_id  : base.correlationId,
      message         : base.format(ctx),
      resolution_time : base.resolvedTime,
      ident           : this.name,
      host            : this.hostname,
      client          : ctx.request.ip || ctx.request.headers['x-forwarded-for'],
      path            : ctx.request.url,
      method          : ctx.request.method,
      response_time   : resTime.toString(),
      status          : ctx.response.status,
      severity        : ctx.response.status >= 400 ? 'ERROR' : 'INFO',
      metadata        : {}
    }
  }
}

module.export = Micrologger;
