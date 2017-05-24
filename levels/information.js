'use strict';

const STRIP_ANSI = require('strip-ansi');
const CHALK      = require('chalk');

const Level = require('./level');

class InformationLevel extends Level {
  constructor (opts) {
    opts.severity  = 'information';
    opts.keyword = 'info';
    opts.value = 6;
    super(opts);
  }

  print (message) {
    let msg = message;

    // Special case: request logging
    if(data.indexOf('<--') !== -1) {
      msg = CHALK.cyan.underline.bold(message);

    // Special case: response logging
    } else if(data.indexOf('-->') !== -1) {
      msg = CHALK.green.bold(message);


    } else {
      msg = this.colorize(message);
    }

    console.log(msg);
  }
}

module.exports = InformationLevel;
