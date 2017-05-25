'use strict';

const ZMQ = require('zmq');

const Collector = require('./collector');

class ZmqCollector extends Collector {
  constructor (opts={}) {
    super(opts);
    this.type = 'zmq';
    this.host = opts.host || '127.0.0.1';
    this.port = opts.port || 5555;
    this.sock = ZMQ.socket('pub');
    this.sock.connect(`tcp://${this.host}:${this.port}`);
  }

  collect (type='generic', data={}) {
    sock.send([type, JSON.stringify(data)]);
  }
}

module.exports = ZmqCollector;
