# micrologger

simple but helpful logs to be used with microservices and koa

Support for rotating files or sending to a logging service

# example for application logging

```
let Logger = require('micrologger');
let logger = new Logger({
  meta: {
    team: 'platform',
    project: 'User Service'
  }
  disk: "true",
  folder: './logs',
  zmq: { host: 'localhost', port: 5555 }
});

process.stdout.on('data', (data) => { 
  logger.app("info", data);
});
process.stderr.on('data', (data) => { 
  logger.app("error", data);
});

the above INFO returns:
{
  "class":"application",
  "hostname": "Eriks-MacBook-Pro.local",
  "pid": 23844,
  "severity": "info",
  "timestamp": "2016-12-15T20:21:36.954Z",
  "message": "user service listening to: 127.0.0.1:5555"
}
or ERROR:
{
  "class": "application",
  "hostname": "Eriks-MacBook-Pro.local",
  "pid": 974,
  "severity": "error",
  "timestamp": "2016-12-13T22:50:56.019Z",
  "message": "ReferenceError: id is not defined blah blah"
}
```
# example for request logging 
```
app.use(logger.request());

the above INFO returns:
{
  "class":"client_request",
  "request_id":"6db6fa99-148c-46d4-91f3-4d82ffbe15e3",
  "correlation_id":"355167b5-9996-4048-a1a4-ffb65f3046c3",
  "host":"Eriks-MacBook-Pro.local",
  "pid":23845,
  "path":"/somepath",
  "method":"GET",
  "request_time":"2016-12-15T20:52:30.076Z",
  "message":"GET /somepath",
  "response_time":"2016-12-15T20:52:30.076Z",
  "meta":{},
  "client":"client info",
  "status":200,
  "resolution_time":"8ms",
  "severity":"INFO"
}

or ERROR:
{
  "class":"client_request",
  "request_id":"a45e3d39-79ce-4c33-9ac4-58b88c533b2f",
  "correlation_id":"770a8c3f-3a07-4939-9ec2-5a1a090692a1",
  "host":"Eriks-MacBook-Pro.local",
  "pid":23845,
  "path":"/v2.0/user/login/token/creat",
  "method":"POST",
  "request_time":"2016-12-15T20:31:31.390Z",
  "message":"POST /v2.0/user/login/token/creat",
  "response_time":"2016-12-15T20:31:31.390Z",
  "meta":{},
  "client":"client info",
  "status":404,
  "resolution_time":"10ms",
  "severity":"ERROR"
}

```
# fields:

class = type of request (client_request or service_request)

request id = UID to link log messages

correlation id = UID generated/forwarded through the system

host = hostname 

pid = process id 

path = path of request

method = request method

request time = UTC epoch of request

message = log message with details about application, request, response or error 

response time = UTC epoch of response 

meta = metadata specific to the request that was made.  this can be specific event data that is helpful outside system logs 

client= client ip address

status = status code 

resolution time = track the time for request to be resolved

severity = logging levels (info, error, warn, debug)

options.disk




