'use strict';

const mocha   = require('mocha');
const expect  = require('chai').expect;
const sinon   = require('sinon');
const mockery = require('mockery');

const Micrologger = require('../micrologger');
const Level       = require('../levels/level');
const Collector   = require('../collectors/collector');

const m = require('..');

const LEVELS = [
  'Emergency', 'Alert', 'Critical', 'Error',
  'Warning', 'Notice', 'Informational', 'Debug'
];

const COLLECTORS = [
  'Zmq', 'File', 'Fluent'
];

describe('module', () => {
  describe('exports', () => {
    it('should export an instance of micrologger', () => {
      expect(m).instanceof(Micrologger);
    });

    it('should export micrologger class', () => {
      expect(m.Micrologger).to.be.a('function');
      expect(new m.Micrologger()).instanceof(Micrologger);
    });

    it('should export the Level class', () => {
      expect(m.Level).to.be.a('function');
      expect(new m.Level()).to.be.instanceof(Level);
    });

    it('should export the default level classes', () => {
      expect(m.Levels).to.be.an('object');
      expect(Object.keys(m.Levels)).to.have.length(LEVELS.length);
      for (let level of LEVELS) {
        expect(m.Levels[level]).to.be.a('function');
        expect(new m.Levels[level]()).instanceof(m.Levels[level]);
      }
    });

    it('should export the Collector class', () => {
      expect(m.Collector).to.be.a('function');
      expect(new m.Collector()).to.be.instanceof(Collector);
    });

    it('should export the default collector classes', () => {
      expect(m.Collectors).to.be.an('object');
      expect(Object.keys(m.Collectors)).to.have.length(COLLECTORS.length);
      for (let collector of COLLECTORS) {
        expect(m.Collectors[collector]).to.be.a('function');
        expect(new m.Collectors[collector]()).instanceof(m.Collectors[collector]);
      }
    });
  })
});
