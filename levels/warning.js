'use strict';

const Level = require('./level');

class WarningLevel extends Level {
  constructor (opts) {
    opts.severity  = 'warning';
    opts.keyword = 'warn';
    opts.value = 3;
    super(opts);
  }

  print (message) {
    console.log(this.colorize(message));
  }
}

module.exports = WarningLevel;
