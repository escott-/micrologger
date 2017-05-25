'use strict';

const Level = require('./level');

class NoticeLevel extends Level {
  constructor (opts={}) {
    opts.severity  = 'notice';
    opts.keyword = 'notice';
    opts.value = 5;
    super(opts);
  }

  print (message) {
    this.stdout(this.colorize(message));
  }
}

module.exports = NoticeLevel;
