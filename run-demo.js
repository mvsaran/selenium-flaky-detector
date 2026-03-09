#!/usr/bin/env node
'use strict';

/**
 * run-demo.js — One-click orchestrator
 * 
 * Usage:
 *   node run-demo.js
 *   $env:RUNS="5"; node run-demo.js   (PowerShell)
 *   RUNS=5 node run-demo.js           (bash/mac)
 */

const { runDemo } = require('./lib/orchestrator');

runDemo().catch(err => {
    const chalk = require('chalk');
    console.error(chalk.red('\n❌ Demo failed: ' + err.message));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});
