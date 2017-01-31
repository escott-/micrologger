# micrologger

meaningful application and request logs to be used with koa microservices

Support for rotating files or sending to a logging collector fluentd (more to come)

Add to your koa application above any router middleware:

```js
const logger = require('micrologger');
app.use(logger.request());
```

Make sure to pass NODE_ENV=development for local 

That is all you need for micrologger to start collecting logs.

The rest is what the module will add...

**Logging levels:**

INFO
ERROR

**Fields:**
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

The correlation id will be generated if the x-correlation-id is not found in the header. Services should pass this along in the header.

In development you get all the logs in stdout. Also, local will create rotating files and will rotate files at 100K and keep 7 files. The files will be stored in the logs folder at the project root: /logs/out0.log, /logs/out1.log, /logs/out3.log, etc...


```sh
NODE_ENV=development node server
```

request logging with koa:

```js
app.use(logger.request());
```

Request logging will log the request and response with the following...

Example of request logging (request)

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
  "meta": {}
}
```

Example of request logging (response)

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

request logging by adding fluentd (more collectors to come)

if you're not using 'NODE_ENV=development' you can add fluentd as the collector, logs will be sent to fluentd

add the fluent block below and 

```js
logger.fluent({
  host: 'localhost',
  port: '24224'
});
```

```sh
NODE_ENV=production node server
```


For Application logging...
```js
const logger = require('micrologger');
let child = spawn(process.execPath, [process.argv[1]]);
child.stdout.on('data', function(data) {
  logger.app('info', data.toString());
});
```

Example of application debug in /logs/out.log

```json
{
  "class":"application",
  "host":"some-host",
  "pid":38131,
  "severity":"INFO",
  "timestamp":"2016-12-21T17:41:01.271Z",
  "message":"REST service listening on port: 3000"
}

```

Example of application error in /logs/out.log

```json
{
  "class":"application",
  "host":"some-host",
  "pid":40293,
  "severity":"ERROR",
  "timestamp":"2016-12-21T18:00:08.582Z",
  "message":"ReferenceError: thi is not defined at Object.module.exports.post ...rest of stack trace"
}
```

application logging with fluentd (more collectors to come)

```js
logger.fluent({
  host: 'localhost',
  port: '24224'
});
```