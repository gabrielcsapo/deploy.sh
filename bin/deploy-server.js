#!/usr/bin/env node

const Async = require('async');
const inquirer = require('inquirer');

const program = require('commander');
program
    .option('-u, --url [url]', 'The endpoint of the deploy.sh server', 'http://localhost:5000')
    .parse(process.argv);

require('../lib/server');
