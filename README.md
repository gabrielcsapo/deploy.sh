# node-distribute
> continuous deployment of node services, make your own vpn ☁️

[![Npm Version](https://img.shields.io/npm/v/node-distribute.svg)](https://www.npmjs.com/package/node-distribute)
[![Dependency Status](https://david-dm.org/gabrielcsapo/node-distribute.svg)](https://david-dm.org/gabrielcsapo/node-distribute)
[![devDependency Status](https://david-dm.org/gabrielcsapo/node-distribute/dev-status.svg)](https://david-dm.org/gabrielcsapo/node-distribute#info=devDependencies)
[![Build Status](https://travis-ci.org/gabrielcsapo/node-distribute.svg?branch=master)](https://travis-ci.org/gabrielcsapo/node-distribute)
[![npm](https://img.shields.io/npm/dt/node-distribute.svg)]()
[![npm](https://img.shields.io/npm/dm/node-distribute.svg)]()

## setup

> requires `redis-cli` to be installed locally

- `npm install node-distribute -g`
- `node-distribute start` // server will now be running

## Configuration

> how to configure node-distribute
> two services are started with node-distribute a git server and a http server to host the admin page
(admin:1337) and (git server:7000)

- run `node-distribute configure`
    - this will log two files, repos and user

### repos.json

```javascript
[
    {
        "subdomain": "test", // test.location:1337
        "name": "test", // the name of the repository
        "type": String (NODE, STATIC) // the type of application
        "anonRead": false, // allow anonymous access
        "users": [ // array of users that are allowed to push to this repository
            {
                "user": {
                    "username": "root",
                    "password": "aaa6c4b09f5650ed2780e6210d785ff2c5223954"
                },
                "permissions": [
                    "R",
                    "W"
                ]
            }
        ]
    }
]
```

#### How do I get an app to deploy with no subdomain?

> to deploy an app to the root level just simply use the `*` character in the subdomain field

```javascript
[
    {
        "subdomain": "*", // location:1337
        ...
    }
]
```

> to push to this repository simply run

`git push http://{user}:{password}@localhost:7000/test.git master`

### user.json
> admin account

```javascript
{
    "username": "root",
    "password": "aaa6c4b09f5650ed2780e6210d785ff2c5223954"
}
```

## additional information

> setting a wildcard domain up on localhost (mac)

http://asciithoughts.com/posts/2014/02/23/setting-up-a-wildcard-dns-domain-on-mac-os-x/

## updating docs

If you update the docs, please also copy changes to `/test/fixtures/main-app`

Thank you!
