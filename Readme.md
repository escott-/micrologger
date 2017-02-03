# micrologger

Meaningful application and request logs to be used with koa microservices

Support for rotating files and/or sending to a logging collector fluentd (more to come)

Add to the top of your koa application and pass in the koa app:

```js
const logger = require('micrologger');
logger(app);
```
This will give you all application and request logs:

Make sure to pass NODE_ENV=development for local development for console logs

That is all you need for micrologger to start collecting and sending logs.


The following is what you will get without anything else on your part:

**Logging levels:**

INFO
ERROR

**Fields for Request Logs:**
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

```sh
NODE_ENV=development node server
```
For local development you will get the following in the console: system errors, request, and response

Request logging will log the request and response with the following...

You can add fluentd as a collector

add the fluent block below and all the logs will be sent to fluentd

```js
logger(app, {
  fluent: {
    host: '127.0.0.1',
    port: '24224'
  }
});
```

```sh
node server
```

Example of application error in /logs/out.log

```json
{
  "class": "application",
  "host": "some-host",
  "pid": 40293,
  "severity": "ERROR",
  "timestamp": "2016-12-21T18:00:08.582Z",
  "message": "ReferenceError: thi is not defined at Object.module.exports.post ...rest of stack trace"
}
```
## Log info/error
```js
logger.info('Info Message');
logger.info('Some error message');
```
The info and error message will be logged with the following structure:

```json
{
  "class": "application",
  "host": "some-host",
  "pid": 40293,
  "severity": "INFO",
  "timestamp": "2016-12-21T18:00:08.582Z",
  "message": "Info Message"
}
```

```json
{
  "class": "application",
  "host": "some-host",
  "pid": 40293,
  "severity": "ERROR",
  "timestamp": "2016-12-21T18:00:08.582Z",
  "message": "Some error message"
}
```

## All options

```js
logger(app, {
  logsToFile: false,
  requestLogs: false,
  appLogs: false,
  backgroundColor: 'dark',
  fluent: {
    host: '127.0.0.1',
    port: '24224'
  }
})
```
* logToFile: (default is true)
* requestLogs: (default is true)
* appLogs: (default is true)
* backgroundColor: this is the background color of your terminal.  options are dark/light (default is dark)