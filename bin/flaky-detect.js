#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { runDemo } = require('../lib/orchestrator');

program
  .name('selenium-flaky-detect')
  .description('Entropy-based flaky test detector for Selenium/Java')
  .version('1.0.0')
  .option('--demo', 'Run the built-in ShopFlake demo')
  .option('--runs <number>', 'Number of test runs', '3')
  .option('--project <path>', 'Path to Maven/Gradle project', '.')
  .option('--output <path>', 'Output directory for reports', './flaky-report')
  .option('--spec <pattern>', 'Glob pattern for test classes', '')
  .option('--threshold <number>', 'CI health score threshold (0-100)', '70')
  .option('--no-open', 'Do not open report automatically')
  .parse(process.argv);

const opts = program.opts();

(async () => {
  try {
    if (opts.demo) {
      await runDemo(parseInt(opts.runs, 10));
    } else {
      const { FlakyDetector } = require('../lib/index');
      const detector = new FlakyDetector({
        runs: parseInt(opts.runs, 10),
        projectPath: path.resolve(opts.project),
        outputDir: path.resolve(opts.output),
        specPattern: opts.spec,
        ciThreshold: parseInt(opts.threshold, 10),
        openReport: opts.open,
      });

      const result = await detector.run();

      // CI Gate exit code
      if (result.healthScore < parseInt(opts.threshold, 10)) {
        console.log('');
        console.log(chalk.red.bold('🚦 CI GATE FAILED') + chalk.gray(` — Health score ${result.healthScore} < threshold ${opts.threshold}`));
        process.exit(1);
      }
      console.log('');
      console.log(chalk.green.bold('✅ CI GATE PASSED') + chalk.gray(` — Health score ${result.healthScore} ≥ threshold ${opts.threshold}`));
    }
  } catch (err) {
    console.error(chalk.red('❌ Fatal error: ') + err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
})();
