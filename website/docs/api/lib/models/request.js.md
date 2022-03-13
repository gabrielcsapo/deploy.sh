<a name="Request"></a>

## Request

**Kind**: global class  
**Properties**

| Name           | Type                | Description                                                   |
| -------------- | ------------------- | ------------------------------------------------------------- |
| subdomain      | <code>String</code> | the subdomain of the request                                  |
| url            | <code>String</code> | the url that was being accessed                               |
| time           | <code>Number</code> | the time it took to access the resource                       |
| method         | <code>String</code> | the http verb that describes the request                      |
| statusCode     | <code>String</code> | the statusCode associated with the request                    |
| userAgent      | <code>String</code> | the userAgent that access the resource                        |
| referer        | <code>String</code> | the referer that the user was at before accessing the address |
| acceptLanguage | <code>String</code> | browser based language preferences                            |

- [Request](#Request)
  - [new Request()](#new_Request_new)
  - [.log(req, res, next)](#Request.log)
  - [.count(subdomain)](#Request.count) ⇒ <code>Promise</code>
  - [.del(subdomain)](#Request.del) ⇒ <code>Promise</code>

<a name="new_Request_new"></a>

### new Request()

Request definition

<a name="Request.log"></a>

### Request.log(req, res, next)

express middleware that logs requests

**Kind**: static method of [<code>Request</code>](#Request)

| Param | Type                  | Description             |
| ----- | --------------------- | ----------------------- |
| req   | <code>Object</code>   | express request object  |
| res   | <code>Object</code>   | express response object |
| next  | <code>function</code> | callback function       |

<a name="Request.count"></a>

### Request.count(subdomain) ⇒ <code>Promise</code>

returns the amount of requests for the specified subdomain

**Kind**: static method of [<code>Request</code>](#Request)

| Param     | Type                | Description                                             |
| --------- | ------------------- | ------------------------------------------------------- |
| subdomain | <code>string</code> | the subdomain of which to get the count of requests for |

<a name="Request.del"></a>

### Request.del(subdomain) ⇒ <code>Promise</code>

removes all entries associated with a particular subdomain

**Kind**: static method of [<code>Request</code>](#Request)

| Param     | Type                | Description                                   |
| --------- | ------------------- | --------------------------------------------- |
| subdomain | <code>String</code> | the subdomain that the entries are related to |
