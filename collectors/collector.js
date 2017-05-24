'use strict';

class Collector {
  constructor () {
    this.type = 'generic';
  }

  collect (type='generic', data={}) {
    console.error(`BASE_COLLECTOR: ${type}: ${data}`)
  }
}

module.exports = Collector;
