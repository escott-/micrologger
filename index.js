'use strict';

const Collectors  = require('./collectors');
const Levels      = require('./levels');
const Micrologger = require('./micrologger');

// Export the micrologger
module.exports = new Micrologger();
module.exports.Micrologger = Micrologger;

// Export the level classes
module.exports.Level = Levels.level;
module.exports.Levels = {};
let levelNames = Object.keys(Levels);
for (let level of levelNames) {
  if (level === 'level') continue;
  let capitalized = level.charAt(0).toUpperCase() + level.slice(1);
  module.exports.Levels[capitalized] = Levels[level];
}

// Export the collector classes
module.exports.Collector = Collectors.collector;
module.exports.Collectors = {};
let collNames = Object.keys(Collectors);
for (let collector of collNames) {
  if (collector === 'collector') continue;
  let capitalized = collector.charAt(0).toUpperCase() + collector.slice(1);
  module.exports.Collectors[capitalized] = Collectors[collector];
}
