'use strict';

const Level = require('./level');

class WarningLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'warning';
    opts.keyword = 'warn';
    opts.value = 4;
    super(opts);
  }

  print (message) {
    this.stdout(this.colorize(message));
  }
}

module.exports = WarningLevel;
