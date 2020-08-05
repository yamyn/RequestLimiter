# [request-limiter](https://github.com/yamyn/RequestLimiter#readme) _1.0.0_

![onix](https://img.shields.io/badge/onix-systems-blue.svg)

> Simple request limiter that allows you to control the number of simultaneous request to any resource

# Install

```sh
npm i request-limiter
```

# Examples

## Require module

```javascript
const ReqLimiter = require('request-limiter').getInstance('myInstance', options);
```

#### ReqLimiter.getInstance(instance, options)

_Get or create instance_
**Returns**: instance of ReqLimiter

##### Parameters

| Name     | Type     | Description                      | Required |
| -------- | -------- | -------------------------------- | -------- |
| instance | `string` | ReqLimiter instance`s name |true |
| options  | `object` | ReqLimiter configuration options | false    |

##### options properties

| Name                | Type       | Description                                                                                                                                  | default                     |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| maxAttempts         | `number`   | Maximum number of request attempts for one function                                                                                          | 42                          |
| maxRepeatAttempts   | `number`   | Maximum number of attempts to request a request after receiving an error from the remote resource about exceeding the limit                  | 6                           |
| checkDelay          | `number`   | The amount of time in millisecond after which the limiter will make a new attempt to add the request to the queue                            | 1200                        |
| maxOneTimeReq       | `number`   | The number of request that can be executed simultaneously in one port                                                                        | 6                           |
| clientName          | `string`   | The name to be passed to the callback function in the reqWithCheck method                                                                    | client                      |
| limitErrorValidator | `function` | A simple function that checks whether an error sent from a remote resource belongs to an error exceeding the request limit returns a boolean | error => error.code === 403 |
| ReqLimitError       | `Error`    | Error class or classes that extend it. allows to give a custom error to the client                                                           | ReqLimitError               |

#### ReqLimiter.haveConnect(port)

_checks if a port exists and if there is cached data for it_
**Returns**: any

| Name | Type     | Description                             | Required |
| ---- | -------- | --------------------------------------- | -------- |
| port | `string` | name of the port you would like, of use | true     |

```javascript
const isConnect = ReqLimiter.haveConnect('myPort');
```

#### ReqLimiter.setClient(port, client)

_set client data for your port_
**Returns**: void

| Name   | Type     | Description                                                                                                                                        | Required |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| port   | `string` | name of the port you would like, of use                                                                                                            | true     |
| client | `any`    | any information you want to saved that it will be passed as a parameter named <ReqLimiter. clientName> for the callback in the reqWithCheck method | true     |

```javascript
ReqLimiter.setClient('myPort', { accessToken: 'myAccessToken' });
```

#### ReqLimiter.reqWithCheck(port, cb, args, attempts)

_Method that takes a function that needs to be queued for a given port_

**Returns**: cb call results

| Name     | Type       | Description                                                   | Required |
| -------- | ---------- | ------------------------------------------------------------- | -------- |
| port     | `string`   | name of the port you would like, of use                       | true     |
| cb       | `function` | callback function, that need add to port que                  | true     |
| args     | `object`   | arguments for callback function                               | false    |
| attempts | `number`   | The number of attempts that have already been made, default 0 | false    |

```javascript
const fetchToImage = ({ client, id }) => {
    return myFetcher('url', { accessToken: client.accessToken, id });
};
ReqLimiter.reqWithCheck('myPort', fetchToImage, { id: 'myImgId' }).then((data) => {
    // console.log(data)
    // returns result to call fetchToImage
});
```

_Documentation generated with [doxdox](https://github.com/neogeek/doxdox)._
