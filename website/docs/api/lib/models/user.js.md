<a name="User"></a>

## User

**Kind**: global class  
**Properties**

| Name     | Type                | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| username | <code>String</code> | a string that defines the user's accounts |
| password | <code>String</code> | a password for the user                   |
| [token]  | <code>String</code> | an access token                           |

- [User](#User)
  - [new User()](#new_User_new)
  - [.authenticateMiddleware(req, res, next)](#User.authenticateMiddleware)
  - [.authenticate(token, username)](#User.authenticate) ⇒ <code>Promise</code>
  - [.logout(token, username)](#User.logout) ⇒ <code>Promise</code>
  - [.login(username, password)](#User.login) ⇒ <code>Promise</code>
  - [.register(username, password)](#User.register) ⇒ <code>Promise</code>

<a name="new_User_new"></a>

### new User()

User definition

<a name="User.authenticateMiddleware"></a>

### User.authenticateMiddleware(req, res, next)

middleware to verify the username and token are valid, will then set the user to req.user

**Kind**: static method of [<code>User</code>](#User)

| Param | Type                  | Description                       |
| ----- | --------------------- | --------------------------------- |
| req   | <code>Object</code>   | express request                   |
| res   | <code>Object</code>   | express response                  |
| next  | <code>function</code> | callback to go to next middleware |

<a name="User.authenticate"></a>

### User.authenticate(token, username) ⇒ <code>Promise</code>

verify the username and token are valid

**Kind**: static method of [<code>User</code>](#User)

| Param    | Type                | Description                            |
| -------- | ------------------- | -------------------------------------- |
| token    | <code>String</code> | the token associated with the username |
| username | <code>String</code> | the username of the user               |

<a name="User.logout"></a>

### User.logout(token, username) ⇒ <code>Promise</code>

logs out a user by deleting their token

**Kind**: static method of [<code>User</code>](#User)

| Param    | Type                | Description                            |
| -------- | ------------------- | -------------------------------------- |
| token    | <code>String</code> | the token associated with the username |
| username | <code>String</code> | the username of the user               |

<a name="User.login"></a>

### User.login(username, password) ⇒ <code>Promise</code>

logs in a user and returns

**Kind**: static method of [<code>User</code>](#User)

| Param    | Type                | Description                                |
| -------- | ------------------- | ------------------------------------------ |
| username | <code>String</code> | the username of the user who is logging in |
| password | <code>String</code> | the password associated with the user      |

<a name="User.register"></a>

### User.register(username, password) ⇒ <code>Promise</code>

registers a user

**Kind**: static method of [<code>User</code>](#User)

| Param    | Type                | Description                                |
| -------- | ------------------- | ------------------------------------------ |
| username | <code>String</code> | the username of the user who is logging in |
| password | <code>String</code> | the password associated with the user      |
