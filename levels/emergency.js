'use strict';

const Level = require('./level');

class EmergencyLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'emergency';
    opts.keyword = 'emerg';
    opts.value = 0;
    super(opts);
  }

  print (message) {
    this.stderr(this.colorize(message));
  }
}

module.exports = EmergencyLevel;
