# micrologger

Simple but meaningful application and request logs to be used with koa2 microservices.

Support for rotating files and/or sending over zmq, or to a logging collector fluentd (more to come).

Easily injectable log levels and collection utilities.

Add to the top of your koa2 application and pass in koa2 app to get started:

```js
const Koa = require('koa');
const logger = require('micrologger');

const app = new Koa();

app.use(logger());

app.use(async (ctx, next) => {
  logger.info('Hello from handler!');
})
```
This will give you all application and request logs:

## Logging severity/levels [syslog based]:

- emergency/emerg
- alert/alert
- critical/crit
- error/err
- warning/warn
- notice/notice
- informational/info
- debug/debug

## Fields for Request Logs:

**class** - class field represents the origin of the request. application, client\_request or service\_request

**host** - hostname

**ident** - name of app from package.json

**pid** - process id

**severity** - logging level

**timestamp** - UTC epoch

**message** - log message with details about application, request, response or error

**path** - path of request

**method** - request method

**request\_id** - UID generated to track the individual request

**correlation\_id** - UID generated/forwarded through all services

**response\_time** - UTC epoch of response

**resolution\_time** - track the time for request to be resolved

**status** - status code

**metadata** - metadata specific to the request that was made. this can be specific event data that is helpful outside system logs

Example of request logging (the request)

```json
{
  "class": "client_request",
  "ident": "app name from package.json",
  "message": "GET /status",
  "host": "some-host",
  "client": "client-ip",
  "path": "/status",
  "method": "GET",
  "request_id": "3eeb945c-f5b5-4431-a5fe-177dfae7fec5",
  "correlation_id": "d4cc5b41-c023-49bc-a55e-558093918de4",
  "request_time": "2016-12-21T21:05:57.620Z",
  "pid":17636,
  "severity": "INFO",
  "metadata": {}
}
```

Example of request logging (the response)

```json
{
  "class": "client_request",
  "ident": "app name from package.json",
  "message": "200 OK /",
  "host": "some-host",
  "client": "client-ip",
  "path": "/status",
  "method": "GET",
  "request_id": "33931f5e-9915-466c-9d23-10977ab48da6",
  "correlation_id": "d4cc5b41-c023-49bc-a55e-558093918de4",
  "response_time": "2016-12-21T21:05:57.920Z",
  "resolution_time": "300ms",
  "status": 200,
  "pid":17636,
  "severity": "INFO",
  "metadata": {},
}
```

The correlation id will be generated if the x-correlation-id isn't found in the header. Services should pass this along in the header.

## Configuration

### Global Logger

Basic customization is available in the global logger. for more granular control, it is recommended to build a new logger

```javascript
const logger = require('micrologger');

// set the color printed into stdout
logger.setColor('blue');

// set whether or not to bold text printed to stdout
logger.setBold(true);

// set whether or not to strip ansi encoding out of logs
logger.setStripAnsi(false);

// set max logging level (syslog levels)
logger.setLevel('warning');

// add a pre-implemented collector
logger.useCollector('zmq', {
  host: '127.0.0.1',
  port: 5555,
});

// add a custom collector
class FooCollector extends logger.Collector {
  constructor () {
    super();
    this.type = foo;
  }
  collect () {
    // TODO: perform some action
  }
}

logger.useCollector(new FooCollector());

```

### New logger

```javascript
const logger = new logger.Logger({
  name              : '', // instance name to log with. defaults to package name
  level             : ''; // level severity to log with. [emergency, ...debug]
  color             : '', // console text color from the supported colors of chalk [https://www.npmjs.com/package/chalk]
  bold              : false, // bold text in console
  backgroundColor   : '', // console background color. if black, it is used to set text color to white
  stripAnsi         : true, // should strip ansi characters. defaults to true
  hostname          : '', // hostname of the system. defaults to os hostname
  requestIdHeader   : '' // request ID header. defaults to `x-request-id`
  correlationHeader : ''; // correlation header name to use for retrieval. defaults to `x-correlation-id`
  correlationGen    : () => {}, // Correlation generator. only used if correlation ID is not recovered from headers
  levels            : {} // Object map of logger.Level() inherited levels. used for logging to console (see below)
  collectors        : { // collector specification. collectors will only be used if configured
    zmq: {
      host: '', // ZMQ pub/sub receiver host
      port: 5555, // ZMQ pub/sub receiver port
    },
    file: {
      path: '', // directory to place rotating logs
    },
    fluent: {
      host: '', // fluent host
      port: 3000, // fluent port
      timeout: 3.0, // fluent request timeout
      reconnectInterval: 600000, // fleunt reconnection interval
    }
  },
});
```

## Customization

The customizable components of the logger are Levels, and Collectors. This divide is create to allow a separation of concerns between transmitting logs for machine use (eg. indexing), and printing logs for human readable use. Generally, on a live server, only the collector will be of real concern, but log levels still apply.

### Levels

Levels are used only to defined severity for filtering logs based on level, and printing to console. specialty action should be performed using Collectors

Custom levels can be set for new instances of Micrologger. They must extend `micrologger.Level`, and should be concerned with:
- `level.severity`
  - Full name to represent the severity of the level
- `level.keyword`
  - keyword/shorthand to represent the severity of the level
- `level.value`
  - numerical value/weight of the level. use when comparing `micrologger.level` to determine whether or not to execute the log level
- `level.format([Object: Log])`
  - Function called to translate a log object to a string for printing
  - Should return a string formatted the desired way before the logger calls `print`
  - Default string is `${this.keyword.toUpperCase()}: ${data.message}`
  - Custom formatters can also be set with the `level.customFormatter` property of existing formatters
- `level.print([String])`
  - Function called to print to the console
  - Default definition simple calls `console.log()`

```javascript
// ${YOUR_PROJECT_PATH}/lib/custom_log.js
const logger = require('micrologger');

class ErrorLevel extends logger.Level {
  constructor () {
    super();
    this.severity = 'error';
    this.keyword  = 'err';
    this.value    = 0;
  }

  format (data) {
    return `ERR [${new Date()}]: ${data.message}`;
  }
}

class InfoLevel extends logger.Level {
  constructor () {
    super();
    this.severity = 'information';
    this.keyword  = 'info';
    this.value    = 1;
  }

  format (data) {
    return `INFO [${new Date()}]: ${data.message}`;
  }
}



let log = logger.Micrologger({
  levels : {
    info  : new InfoLevel(),
    error : new ErrorLevel(),
  }
});
```

### Collectors

Collectors are used for moving log data to a target location.

Custom Collectors can be added to an existing Micrologger, or injected into a new one. They must extend `micrologger.Collector`, and should be concerned with:
- `level.collect([Object: Log])`
  - Function called to print to the console
  - Default definition simple calls `console.log()`

``` javascript
const Axios =  require('axios');
const logger = require('micrologger');

class FooCollector extends logger.Collector{
  constructor (host) {
    this.host = `http://${host}/index`
  }

  collect (log) {
    Axios({
      url    : this.host,
      method : 'POST',
      body   : log
    }).catch((e) => console.warn(e));
  }
}

// Existing logger
logger.useCollector('file', { path: './logs' });
logger.useCollector(new FooCollector('127.0.0.1:8080'));
logger.info('Hello world') // => print to stdout, write to log file and post to 127.0.0.1:8080/index

// New logger
const fooLogger = new logger.Micrologger({
  file : {
    path : './logs'
  }
  foo : new FooCollector('127.0.0.1:8080'),
});
fooLogger.info('Hello world') // => print to stdout, write to log file and post to 127.0.0.1:8080/index
```
