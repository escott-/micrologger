'use strict';

const Level = require('./level');

class DebugLevel extends Level {
  constructor (opts) {
    opts.severity  = 'debug';
    opts.keyword = 'debug';
    opts.value = 7;
    super(opts);
  }

  print (message) {
    console.log(this.colorize(message));
  }
}

module.exports = DebugLevel;
