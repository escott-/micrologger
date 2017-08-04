'use strict';

const STRIP_ANSI = require('strip-ansi');
const CHALK      = require('chalk');

const Level = require('./level');

class InformationalLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'information';
    opts.keyword = 'info';
    opts.value = 6;
    super(opts);
  }

  print (message) {
    let msg = message;
    
    // Special case: request logging
    if(message.indexOf('<--') !== -1) {
      msg = CHALK.cyan.underline.bold(message);

    // Special case: response logging
    } else if(message.indexOf('-->') !== -1) {
      msg = CHALK.green.bold(message);


    } else {
      msg = this.colorize(message);
    }

    this.stdout(msg);
  }
}

module.exports = InformationalLevel;
