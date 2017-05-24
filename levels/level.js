'use strict';

const STRIP_ANSI = require('strip-ansi');

// Level classes are used to determing how a given level should be written to the console.
//   All data being collected must be of a standard format, so it is unaffected by the level
class Level {
  constructor (opts={}) {
    this.severity        = opts.name || 'NOOP';      // level name for debugging
    this.keyword         = opts.keyword || 'NOOP';   // level/function name for use in the logger
    this.weight          = opts.weight || Infinity;  // weight used for min logging level
    this.enabled         = opts.enabled || false;    // whether or not the level is enables for print
    this.color           = opts.color || false;      // Text color the level should print with
    this.bold            = opts.bold || false;       // Whether or not the text should be bold
    this.backgroundColor = opts.backgroundColor;     // background color of the text
    this.colorize        = opts.colorize || ((s) => s); // function to set color of text
    this.customFormatter = opts.formatter || false   // formatter to run instead of the default

    if (this.color) this.setColor(opts.color);

    if (this.customFormatter) customFormatter.bind(this);

    // If the backgroundColor is white, make sure the text is dark
    if(opts.backgroundColor === 'white' && !this.color) {
      this.color    = 'black'
      this.colorize = chalk.black;
    }
  }

  // Format a string to print
  format (data={}) {
    if (this.customFormatter) {
      return this.customFormatter(data);
    } else {
      return `${this.keyword.toUpperCase()}: ${data.message}`
    }
  }

  // Print the string
  print (message) {
    console.log(message);
  }

  // format and print the data, if level is enabled
  log (data) {
    if (!this.enabled) return;
    this.print(this.format(data))
  }

  enable () {
    this.enabled = true;
  }

  disable () {
    this.enabled = false;
  }

  setColor(color) {
    let colorize = chalk[color];
    if (!colorize) {
      throw Error(`Attempted to set unsupported color [${color}]`);
    }

    this.color    = color;
    this.colorize = colorize;

  }
}

module.exports = Level;
