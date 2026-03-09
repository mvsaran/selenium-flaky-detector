'use strict';

/**
 * Layer 1 · Orchestrator Engine
 * ==============================
 * Manages the full demo lifecycle:
 *   1. Starts the Spring Boot demo app (ShopFlake)
 *   2. Waits for it to be ready
 *   3. Triggers Maven test suite N times via MultiRunManager
 *   4. Runs the detection pipeline
 *   5. Opens the HTML report
 */

const path = require('path');
const fs = require('fs-extra');
const { spawn, execSync } = require('child_process');
const chalk = require('chalk');
const { FlakyDetector } = require('./index');

const DEMO_APP_DIR = path.join(__dirname, '..', 'demo-app');
const DEMO_PORT = 8080;

let appProcess = null;

/**
 * Run the full ShopFlake demo
 * @param {number} requestedRuns - Number of runs (from CLI)
 */
async function runDemo(requestedRuns) {
    printHeader();

    // Step 1 — Build the demo app if needed
    console.log(chalk.bold.cyan('  📦  Step 1 · Building ShopFlake Demo App (Maven)...\n'));
    await buildDemoApp();

    // Step 2 — Start the Spring Boot app
    console.log(chalk.bold.cyan('\n  🚀  Step 2 · Starting ShopFlake Demo App on port ' + DEMO_PORT + '...\n'));
    await startDemoApp();

    // Step 3 — Wait for app to be ready
    console.log(chalk.bold.cyan('\n  ⏳  Step 3 · Waiting for app to become healthy...\n'));
    await waitForApp(`http://localhost:${DEMO_PORT}/actuator/health`, 60);
    console.log(chalk.green('  ✅  App is ready!\n'));

    try {
        // Step 4 — Run the Flaky Detector
        console.log(chalk.bold.cyan('\n  🔍  Step 4 · Running Flaky Detection...\n'));
        const runs = requestedRuns || parseInt(process.env.RUNS || '3', 10);
        const detector = new FlakyDetector({
            runs,
            projectPath: DEMO_APP_DIR,
            outputDir: path.join(__dirname, '..', 'flaky-report'),
            openReport: true,
            buildTool: 'maven',
        });
        await detector.run();
    } finally {
        // Step 5 — Shut down the demo app
        stopDemoApp();
    }
}

function printHeader() {
    console.log('');
    console.log(chalk.magenta.bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.magenta.bold('║') + chalk.cyan.bold('   🛒  SHOPFLAKE DEMO · Selenium Flaky Detector              ') + chalk.magenta.bold('║'));
    console.log(chalk.magenta.bold('║') + chalk.gray('   Java Spring Boot · Intentional Flakiness Demo             ') + chalk.magenta.bold('║'));
    console.log(chalk.magenta.bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log('');
}

async function buildDemoApp() {
    return new Promise((resolve, reject) => {
        const mvn = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
        const proc = spawn(mvn, ['package', '-DskipTests', '-q'], {
            cwd: DEMO_APP_DIR,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        proc.stdout.on('data', d => process.stdout.write(chalk.gray('  │ ') + d.toString().trim() + '\n'));
        proc.stderr.on('data', d => {
            const msg = d.toString().trim();
            if (msg && !msg.includes('WARNING')) process.stdout.write(chalk.yellow('  │ ') + msg + '\n');
        });
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Maven build failed (exit ${code})`)));
        proc.on('error', reject);
    });
}

async function startDemoApp() {
    return new Promise((resolve, reject) => {
        const mvn = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';
        appProcess = spawn(mvn, ['spring-boot:run', '-q'], {
            cwd: DEMO_APP_DIR,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
        });
        appProcess.stdout.on('data', d => {
            const line = d.toString().trim();
            if (line.includes('Started') || line.includes('Tomcat')) {
                console.log(chalk.green('  ✅ ' + line));
                resolve();
            }
        });
        appProcess.stderr.on('data', () => { });
        appProcess.on('error', reject);

        // Resolve after 3s even if 'Started' not detected
        setTimeout(resolve, 3000);
    });
}

async function waitForApp(url, timeoutSec) {
    const http = require('http');
    const deadline = Date.now() + timeoutSec * 1000;
    while (Date.now() < deadline) {
        const ok = await new Promise(resolve => {
            try {
                const req = http.get(url, res => resolve(res.statusCode === 200));
                req.setTimeout(1000);
                req.on('error', () => resolve(false));
                req.on('timeout', () => { req.destroy(); resolve(false); });
            } catch { resolve(false); }
        });
        if (ok) return;
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
    }
    console.log('');
    throw new Error(`App not ready after ${timeoutSec}s`);
}

function stopDemoApp() {
    if (appProcess) {
        console.log(chalk.gray('\n  🔴  Stopping demo app...'));
        try {
            if (process.platform === 'win32') {
                execSync(`taskkill /F /T /PID ${appProcess.pid}`, { stdio: 'ignore' });
            } else {
                process.kill(-appProcess.pid, 'SIGTERM');
            }
        } catch (e) { /* ignore */ }
        appProcess = null;
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => { stopDemoApp(); process.exit(0); });
process.on('SIGTERM', () => { stopDemoApp(); process.exit(0); });

module.exports = { runDemo };
