'use strict';

const mocha   = require('mocha');
const expect  = require('chai').expect;
const sinon   = require('sinon');
const mockery = require('mockery');
const OS      = require('os');

const PACKAGE = require('../package.json');

const Micrologger = require('../micrologger');
const Level       = require('../levels/level');
const Collector   = require('../collectors/collector');

const LEVEL_NAMES = [
    'emergency', 'alert', 'critical', 'error',
    'warning', 'notice', 'informational', 'debug'
];
const LEVEL_KEYWORDS = [
    'emerg', 'alert', 'crit', 'err',
    'warning', 'notice', 'info', 'debug'
];

const CTX = () => ({
  method   : 'get',
  path     : '/',
  request  : {
    headers : {},
    ip      : '127.0.0.1'
  },
  response : {},
  res      : {
    removeListener : ()         => {},
    once           : (evnt, cb) => {
      if (evnt === 'finish') cb()
    },
  }
});

describe('micrologger', () => {
  describe('constructor', () => {
    it('should return an itialized logger with default levels and no collectors', () => {
      let m = new Micrologger();
      expect(m.name).to.equal(PACKAGE.name);
      expect(m.color).to.be.false;
      expect(m.bold).to.be.false;
      expect(m.backgroundColor).to.be.false;
      expect(m.stripAnsi).to.be.true;
      expect(m.hostname).to.equal(OS.hostname());
      expect(m.formatReq).to.be.a('function');
      expect(m.formatRes).to.be.a('function');

      // Collectors should be empty by default
      expect(m.collectors).to.be.an('object');
      expect(Object.keys(m.collectors)).to.be.length(0);

      // Header management
      expect(m.requestIdHeader).to.equal('x-request-id');
      expect(m.correlationHeader).to.equal('x-correlation-id');
      expect(m.correlationGen).to.be.a('function');

      // Levels should default to syslog presets
      expect(m.levelSeverity).to.equal('ALL');
      expect(m.levelValue).to.equal(Infinity);
      expect(Object.keys(m.levels)).to.have.length(LEVEL_NAMES.length);
      for (let name of LEVEL_NAMES) {
        let capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        let regex       = new RegExp(`[Function: ${capitalized}Level]`);
        expect(m.levels[name]).instanceof(Level);
        expect(m.levels[name].constructor).match(regex);
      }
    });

    it('should add log level shortcuts to the base of the logger', () => {
      let m = new Micrologger();
      for (let level of LEVEL_NAMES) {
        let lvl = m.levels[level];
        expect(m[lvl.severity]).to.be.a('function');
        expect(m[lvl.severity].isLevel).to.be.true;
        expect(m[lvl.keyword]).to.be.a('function');
        expect(m[lvl.keyword].isLevel).to.be.true;
      }
    });

    it('should allow settings overrides', () => {
      let opts = {
        name: 'NAME',
        color: 'green',
        bold: 'BOLD',
        backgroundColor: 'BKG_COLOR',
        stripAnsi: false,
        hostname: 'HOSTNAME',
        formatReq: () => 'FORMATTED',
        formatRes: () => 'FORMATTED',
      }
      let m = new Micrologger(opts);
      for (let key of Object.keys(opts)) {
        expect(m[key]).to.equal(opts[key]);
      }
    });

    it('should allow setting individual collector', () => {
      let type = 'my_collector';
      class MyCollector extends Collector {
        constructor () {
          super();
          this.type = type;
        }
      }
      let collector = new MyCollector();
      let m = new Micrologger({ collector: collector });

      expect(Object.keys(m.collectors)).to.have.length(1);
      expect(m.collectors[type]).to.equal(collector);
    });

    it('should allow setting map of collectors', () => {
      let typeOne = 'my_collector_one';
      class OneCollector extends Collector {
        constructor () {
          super();
          this.type = typeOne;
        }
      }
      let typeTwo = 'my_collector_two';
      class TwoCollector extends Collector {
        constructor () {
          super();
          this.type = typeTwo;
        }
      }

      let collectors = {};
      collectors[typeOne] = new OneCollector();
      collectors[typeTwo] = new TwoCollector();
      let m = new Micrologger({ collectors });

      expect(Object.keys(m.collectors)).to.have.length(2);
      expect(m.collectors[typeOne]).to.equal(collectors[typeOne]);
      expect(m.collectors[typeTwo]).to.equal(collectors[typeTwo]);
    });

    it('should allow settings levels', () => {
      let typeOne = 'my_level_one';
      class OneLevel extends Level {
        constructor () {
          super();
          this.severity = typeOne;
          this.keyword  = typeOne;
          this.value    = 0;
        }
      }
      let typeTwo = 'my_level_two';
      class TwoLevel extends Level {
        constructor () {
          super();
          this.severity = typeTwo;
          this.keyword  = typeTwo;
          this.value    = 0;
        }
      }

      let levels = {};
      levels[typeOne] = new OneLevel ();
      levels[typeTwo] = new TwoLevel ();
      let m = new Micrologger({ levels });
      expect(Object.keys(m.levels)).to.have.length(2);
      expect(m.levels[typeOne]).to.equal(levels[typeOne]);
      expect(m.levels[typeTwo]).to.equal(levels[typeTwo]);
    });

    it('should allow settings overrides', () => {
      let m = new Micrologger();
      // TODO
    });
  });

  describe('useCollector', () => {
    it('should add the predefined collectors to the list of active collectors', () => {
      let m = new Micrologger();
      m.useCollector('zmq', {
        host : '127.0.0.1',
        port : 5555,
      });

      expect(m.collectors.zmq).instanceof(Collector);
      m.collectors.zmq.collect = sinon.spy();
      m.collect('test');
      expect(m.collectors.zmq.collect.called).to.be.true;
    });

    it('should add the custom collector to the list of active collectors', () => {
      class MyCollector extends Collector{
        constructor () {
          super();
          this.type = 'mine';
          this.collect = sinon.spy();
        }
      }

      let m = new Micrologger();
      m.useCollector(new MyCollector());

      expect(m.collectors.mine).instanceof(Collector);
      m.collect('test');
      expect(m.collectors.mine.collect.called).to.be.true;
    });

    it('should error if the collector is invalid', () => {
      let m = new Micrologger();
      expect(() => m.useCollector('fail')).throw(Error);
      expect(Object.keys(m.collectors)).to.have.length(0);
    });
  });

  describe('setColor', () => {
    it('should set all levels to use the color', () => {
      let m = new Micrologger();
      m.setColor('blue');
      let levels = Object.keys(m.levels);
      for (let lvl of levels) expect(m.levels[lvl].color).to.equal('blue');
    });

    it('error for unsupported colors', () => {
      let m = new Micrologger();
      expect(() => m.setColor('nonsense')).to.throw(Error);
    });
  });

  describe('setBold', () => {
    it('should set all levels to use the bold setting', () => {
      let m = new Micrologger();
      let levels = Object.keys(m.levels);
      m.setBold(true);
      for (let lvl of levels) expect(m.levels[lvl].bold).to.be.true;
      m.setBold(false);
      for (let lvl of levels) expect(m.levels[lvl].bold).to.be.false;
    });
  });

  describe('setStripAnsi', () => {
    it('should set all levels to use the strip-ansi-encoding setting', () => {
      let m = new Micrologger();
      let levels = Object.keys(m.levels);
      m.setStripAnsi(true);
      expect(m.stripAnsi).to.be.true;
      m.setStripAnsi(false);
      expect(m.stripAnsi).to.be.false;
    });
  });

  describe('log', () => {
    it('should use the level specified to print the data object message, and collect to registered collectors', () => {
      let m     = new Micrologger();
      let level = 'debug';
      let data  = { message: 'test' };
      sinon.spy(m, 'collect');
      m.levels[level].log = sinon.spy(); // dont log to console
      m.log(level, data);

      // validate call to collector with normalized data
      expect(m.collect.calledOnce).to.be.true
      let collectData = m.collect.getCall(0).args[0];
      expect(collectData.message).to.equal(data.message);
      expect(collectData.severity).to.equal('DEBUG');
      expect(collectData.level).to.equal('debug');

      // validate call to level with normalized data
      expect(m.levels[level].log.calledOnce).to.be.true
      let levelData = m.levels[level].log.getCall(0).args[0];
      expect(levelData.message).to.equal(data.message);
      expect(levelData.severity).to.equal('DEBUG');
      expect(levelData.level).to.equal('debug');

      // Make sure data was not changed
      expect(data.severity).to.be.undefined;
      expect(data.level).to.be.undefined;
    });

    it('should accept string instead of an object', () => {
      let m     = new Micrologger();
      let level = 'debug';
      let data  = 'test';
      sinon.spy(m, 'collect');
      m.levels[level].log = sinon.spy(); // dont log to console
      m.log(level, 'test');

      // validate call to collector with normalized data
      expect(m.collect.calledOnce).to.be.true
      let collectData = m.collect.getCall(0).args[0];
      expect(collectData.message).to.equal(data);
      expect(collectData.severity).to.equal('DEBUG');
      expect(collectData.level).to.equal('debug');

      // validate call to level with normalized data
      expect(m.levels[level].log.calledOnce).to.be.true
      let levelData = m.levels[level].log.getCall(0).args[0];
      expect(levelData.message).to.equal(data);
      expect(levelData.severity).to.equal('DEBUG');
      expect(levelData.level).to.equal('debug');
    });

    it('should ignore call if the level is above the logging level set', () => {
      let m = new Micrologger({ level: 'warning' });
      for (let level of Object.keys(m.levels)) m.levels[level].log = () => {};
      sinon.spy(m, 'collect');
      m.log('debug');
      expect(m.collect.called).to.be.false;
      m.log('informational');
      expect(m.collect.called).to.be.false;
      m.log('notice');
      expect(m.collect.called).to.be.false;
      m.log('warning');
      expect(m.collect.callCount).to.equal(1);
      m.log('error');
      expect(m.collect.callCount).to.equal(2);
      m.log('critical');
      expect(m.collect.callCount).to.equal(3);
      m.log('alert');
      expect(m.collect.callCount).to.equal(4);
      m.log('emergency');
      expect(m.collect.callCount).to.equal(5);
    });
  });

  describe('collect', () => {
    it('should execute collect on each collector', () => {
      let m = new Micrologger();
      m.collect(); // should not error  if no collectorrs are assigned
      m.collectors = {
        one: { collect: sinon.spy() },
        two: { collect: sinon.spy() },
      };
      m.collect('one');
      expect(m.collectors.one.collect.calledWith('one')).to.be.true;
      expect(m.collectors.two.collect.calledWith('one')).to.be.true;
      m.collect('two');
      expect(m.collectors.one.collect.calledWith('two')).to.be.true;
      expect(m.collectors.two.collect.calledWith('two')).to.be.true;
      m.collect('three');
      expect(m.collectors.one.collect.calledWith('three')).to.be.true;
      expect(m.collectors.two.collect.calledWith('three')).to.be.true;
    });
  });

  describe('middleware', () => {
    it('should return a middleware function which accepts (ctx, next) and returns a promise', async () => {
      let m          = new Micrologger();
      m.log          = sinon.spy();
      let middleware = m.middleware();
      let called     = false;
      await middleware(CTX(), async () => (called = true));
      expect(called).to.be.true;
    });


    describe('function', () => {
      it('should log req and res data', async () => {
        let m          = new Micrologger();
        m.levels['informational'].stdout = sinon.spy();
        m.levels['error'].stderr         = sinon.spy();

        sinon.spy(m, 'log');
        let middleware = m.middleware();
        let ctx        = CTX();

        await middleware(ctx, async () => {});

        let reqCall = m.log.getCall(0).args;
        let reqLog = reqCall[1];
        expect(reqCall[0]).to.equal('informational');
        expect(reqLog.request_id).to.be.a('string');
        expect(reqLog.correlation_id).to.be.a('string');
        expect(reqLog.class).to.equal('client_request');
        expect(reqLog.request_time).to.be.a('string');
        expect(reqLog.message).to.equal(`<-- ${ctx.method} ${ctx.path}`);
        expect(reqLog.ident).to.equal(PACKAGE.name);
        expect(reqLog.host).to.equal(OS.hostname());
        expect(reqLog.client).to.equal(ctx.request.ip);
        expect(reqLog.path).to.equal(ctx.path);
        expect(reqLog.method).to.equal(ctx.method);
        expect(reqLog.severity).to.equal('informational');
        expect(reqLog.metadata).to.be.an('object');

        let resCall = m.log.getCall(1).args;
        let resLog = resCall[1];
        expect(reqCall[0]).to.equal('informational');
        expect(resLog.request_id).to.equal(reqLog.request_id);
        expect(resLog.correlation_id).to.equal(reqLog.correlation_id);
        expect(resLog.class).to.equal('client_request');
        expect(resLog.response_time).to.be.a('string');
        expect(resLog.message).to.equal(`--> ${ctx.method} ${ctx.path} ${ctx.status}`);
        expect(resLog.ident).to.equal(PACKAGE.name);
        expect(resLog.host).to.equal(OS.hostname());
        expect(resLog.client).to.equal(ctx.request.ip);
        expect(resLog.path).to.equal(ctx.path);
        expect(resLog.method).to.equal(ctx.method);
        expect(resLog.severity).to.equal('informational');
        expect(resLog.metadata).to.be.an('object');
      });
    });
  });
});
