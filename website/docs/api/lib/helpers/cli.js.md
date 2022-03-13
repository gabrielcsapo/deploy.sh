<a name="CLI"></a>

## CLI

**Kind**: global class

- [CLI](#CLI)
  - [new CLI(options)](#new_CLI_new)
  - [.createBundle(directory)](#CLI.createBundle) ⇒ <code>Promise</code>
  - [.removeBundle(directory)](#CLI.removeBundle) ⇒ <code>Promise</code>
  - [.uploadBundle(options)](#CLI.uploadBundle) ⇒ <code>Promise</code>
  - [.login(options)](#CLI.login) ⇒ <code>Promise</code>
  - [.register(options)](#CLI.register) ⇒ <code>Promise</code>
  - [.logout(options)](#CLI.logout) ⇒ <code>Promise</code>
  - [.getLogs(options)](#CLI.getLogs) ⇒ <code>Promise</code>
  - [.getDeployments(options)](#CLI.getDeployments) ⇒ <code>Promise</code>
  - [.deleteDeployment(options)](#CLI.deleteDeployment) ⇒ <code>Promise</code>
  - [.getUserDetails()](#CLI.getUserDetails) ⇒ <code>Promise</code>
  - [.cacheCredentials(options)](#CLI.cacheCredentials) ⇒ <code>Promise</code>
  - [.getCredentials()](#CLI.getCredentials) ⇒ <code>Promise</code>

<a name="new_CLI_new"></a>

### new CLI(options)

the cli instance that holds all options and methods to talk to the deploy.sh service

| Param               | Type                | Description                                                                                  |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| options             | <code>Object</code> | contains defaults and overrides                                                              |
| options.url         | <code>String</code> | the url of the remote deploy.sh service                                                      |
| options.application | <code>String</code> | the deployed application name to alter                                                       |
| options.mongo       | <code>String</code> | the mongo connection string used by deploy.sh service when running `deploy serve --mongo ''` |

<a name="CLI.createBundle"></a>

### CLI.createBundle(directory) ⇒ <code>Promise</code>

creates a bundle to send to the server for deployment

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param     | Type                | Description                                   |
| --------- | ------------------- | --------------------------------------------- |
| directory | <code>String</code> | the directory that is to be turned into a tar |

<a name="CLI.removeBundle"></a>

### CLI.removeBundle(directory) ⇒ <code>Promise</code>

removes the bundle from the given directory

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param     | Type                | Description       |
| --------- | ------------------- | ----------------- |
| directory | <code>String</code> | path to directory |

<a name="CLI.uploadBundle"></a>

### CLI.uploadBundle(options) ⇒ <code>Promise</code>

Deals with uploading a specified bundle

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param          | Type                | Description                           |
| -------------- | ------------------- | ------------------------------------- |
| options        | <code>Object</code> |                                       |
| options.name   | <code>String</code> | the name of the specified application |
| options.bundle | <code>Stream</code> | a file stream of the tar              |

<a name="CLI.login"></a>

### CLI.login(options) ⇒ <code>Promise</code>

calls the login api to get a token to persist for future requests

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                          |
| ---------------- | ------------------- | ------------------------------------ |
| options          | <code>Object</code> |                                      |
| options.username | <code>String</code> | username of the account              |
| options.password | <code>String</code> | password associated with the account |

<a name="CLI.register"></a>

### CLI.register(options) ⇒ <code>Promise</code>

prompts the user to register account

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                          |
| ---------------- | ------------------- | ------------------------------------ |
| options          | <code>Object</code> |                                      |
| options.username | <code>String</code> | username of the account              |
| options.password | <code>String</code> | password associated with the account |

<a name="CLI.logout"></a>

### CLI.logout(options) ⇒ <code>Promise</code>

calls the logout api to invalidate token

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options          | <code>Object</code> |                                   |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |

<a name="CLI.getLogs"></a>

### CLI.getLogs(options) ⇒ <code>Promise</code>

gets the application logs

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options          | <code>Object</code> |                                   |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |
| options.name     | <code>String</code> | name of the deployment            |

<a name="CLI.getDeployments"></a>

### CLI.getDeployments(options) ⇒ <code>Promise</code>

gets the user's deployed applications

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options          | <code>Object</code> |                                   |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |
| [options.name]   | <code>String</code> | name of the deployment            |

<a name="CLI.deleteDeployment"></a>

### CLI.deleteDeployment(options) ⇒ <code>Promise</code>

deletes the specified deployment

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options          | <code>Object</code> |                                   |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |
| options.name     | <code>String</code> | name of the deployment            |

<a name="CLI.getUserDetails"></a>

### CLI.getUserDetails() ⇒ <code>Promise</code>

gets the user details

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |

<a name="CLI.cacheCredentials"></a>

### CLI.cacheCredentials(options) ⇒ <code>Promise</code>

persists the token and username locally

**Kind**: static method of [<code>CLI</code>](#CLI)

| Param            | Type                | Description                       |
| ---------------- | ------------------- | --------------------------------- |
| options          | <code>Object</code> |                                   |
| options.token    | <code>String</code> | token to make authenticated calls |
| options.username | <code>String</code> | username linked to the token      |

<a name="CLI.getCredentials"></a>

### CLI.getCredentials() ⇒ <code>Promise</code>

gets the token and username that were persisted locally

**Kind**: static method of [<code>CLI</code>](#CLI)
