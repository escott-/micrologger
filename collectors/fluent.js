'use strict';

const FLUENT = require('fluent-logger')

const Collector = require('./collector');

class FluentCollector extends Collector {
  constructor (opts={}) {
    super(opts);
    this.type              = 'fluent';
    this.host              = opts.host || '127.0.0.1';
    this.port              = opts.port || 3000;
    this.timeout           = opts.timeout || 3.0;
    this.reconnectInterval = opts.reconnectInterval || 600000;
    FLUENT.configure('tag_prefix', this);
  }

  collect (data={}) {
    fluentlogger.emit('label', data);
  }
}

module.exports = FluentCollector;
