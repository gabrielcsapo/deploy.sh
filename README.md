# node-distribute
> node ☁️

[![Npm Version](https://img.shields.io/npm/v/node-distribute.svg)](https://www.npmjs.com/package/node-distribute)
[![Dependency Status](https://david-dm.org/gabrielcsapo/node-distribute.svg)](https://david-dm.org/gabrielcsapo/node-distribute)
[![devDependency Status](https://david-dm.org/gabrielcsapo/node-distribute/dev-status.svg)](https://david-dm.org/gabrielcsapo/node-distribute#info=devDependencies)
[![Build Status](https://travis-ci.org/gabrielcsapo/node-distribute.svg?branch=master)](https://travis-ci.org/gabrielcsapo/node-distribute)
[![Coverage Status](https://coveralls.io/repos/github/gabrielcsapo/node-distribute/badge.svg?branch=master)](https://coveralls.io/github/gabrielcsapo/node-distribute?branch=master)
![npm](https://img.shields.io/npm/dt/node-distribute.svg)
![npm](https://img.shields.io/npm/dm/node-distribute.svg)

![logo](./docs/node-distribute.png)

# What is this

`node-distribute` is an easy way to deploy node applications to a single service provider.

Simply add a `distribute.json` file to your repository specifying your startup information and push to the remote server `node-distribute` is running on.

# Usage

```javascript
{
    "name": String, // The subdomain of the application, if the name is * it denotes default path
    "script" : String, // The relative path to the script to start the application
    "type": String, // (optional) Default is NODE, this can also be static
    "directory": String, // (optional) the directory to serve static files from
    "instances" : Number // The number of instances
}
```

# More

To learn more visit [http://www.gabrielcsapo.com/node-distribute/](http://www.gabrielcsapo.com/node-distribute/)
