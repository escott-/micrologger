'use strict';

const Level = require('./level');

class AlertLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'alert';
    opts.keyword = 'alert';
    opts.value = 1;
    super(opts);
  }

  print (message) {
    this.stderr(this.colorize(message));
  }
}

module.exports = AlertLevel;
