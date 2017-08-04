'use strict';

const Level = require('./level');

class ErrorLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'error';
    opts.keyword = 'err';
    opts.value = 3;
    super(opts);
  }

  print (message) {
    this.stderr(this.colorize(message));
  }
}

module.exports = ErrorLevel;
