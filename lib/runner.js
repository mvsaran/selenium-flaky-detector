'use strict';

/**
 * Layer 2 · Multi-Run Manager
 * ============================
 * Runs the Maven/Gradle test suite N times sequentially.
 * Captures exit codes and points to Surefire/Failsafe report directories.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class MultiRunManager {
    constructor({ runs, projectPath, buildTool, specPattern }) {
        this.runs = runs;
        this.projectPath = projectPath;
        this.buildTool = buildTool;
        this.specPattern = specPattern;
    }

    /**
     * Execute the test suite N times
     * @returns {Promise<RunResult[]>}
     */
    async execute() {
        const results = [];

        // Clear stale results from previous detection sessions
        const baseRunDir = path.join(this.projectPath, 'target', 'flaky-runs');
        const surefireDir = path.join(this.projectPath, 'target', 'surefire-reports');

        if (await fs.pathExists(baseRunDir)) await fs.emptyDir(baseRunDir);
        if (await fs.pathExists(surefireDir)) await fs.emptyDir(surefireDir);

        for (let i = 1; i <= this.runs; i++) {
            console.log(chalk.cyan(`\n  🔄  Run ${i} of ${this.runs}`) + chalk.gray(' ─────────────────────────────────'));

            // Unique report dir per run to avoid overwriting
            const runReportDir = await this._prepareRunDir(i);

            const { command, args } = this._buildCommand(i, runReportDir);
            const startTime = Date.now();

            let exitCode = 0;
            let stdout = '';
            let stderr = '';

            try {
                const result = await this._runCommand(command, args, this.projectPath);
                stdout = result.stdout;
                stderr = result.stderr;
                exitCode = result.exitCode;
            } catch (err) {
                exitCode = 1;
                stderr = err.message;
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            const status = exitCode === 0 ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');
            console.log(`  ${status} ${chalk.gray(`(${duration}s)`)}`);

            // After the run, copy Surefire reports to our per-run directory
            await this._copySurefireReports(runReportDir);

            results.push({
                runNumber: i,
                exitCode,
                duration: parseFloat(duration),
                reportDir: runReportDir,
                stdout,
                stderr,
            });
        }

        return results;
    }

    /**
     * Build the Maven or Gradle command for a single run
     */
    _buildCommand(runNumber, runReportDir) {
        if (this.buildTool === 'gradle') {
            const args = ['test', '--rerun-tasks', '--info'];
            if (this.specPattern) args.push(`--tests`, this.specPattern);
            return { command: 'gradlew', args };
        }

        // Maven (default)
        const args = [
            'test',
            '-Dsurefire.failIfNoSpecifiedTests=false',
            '-Dmaven.test.failure.ignore=true',  // Don't stop on failures so we get all results
        ];
        if (this.specPattern) {
            args.push(`-Dtest=${this.specPattern}`);
        }
        // Direct Surefire reports to unique directory
        args.push(`-Dsurefire.reportsDirectory=${runReportDir}`);

        return { command: process.platform === 'win32' ? 'mvn.cmd' : 'mvn', args };
    }

    /**
     * Create per-run report directory
     */
    async _prepareRunDir(runNumber) {
        const dir = path.join(this.projectPath, 'target', 'flaky-runs', `run-${runNumber}`);
        await fs.ensureDir(dir);
        return dir;
    }

    /**
     * Copy existing Surefire reports to per-run archive directory
     */
    async _copySurefireReports(runReportDir) {
        const surefireDir = path.join(this.projectPath, 'target', 'surefire-reports');
        if (await fs.pathExists(surefireDir)) {
            await fs.copy(surefireDir, runReportDir, { overwrite: true });
        }
    }

    /**
     * Spawn a command and capture output
     */
    _runCommand(command, args, cwd) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, {
                cwd,
                shell: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                const line = data.toString();
                stdout += line;
                // Show Maven build progress
                if (line.includes('Tests run:') || line.includes('BUILD') || line.includes('ERROR')) {
                    process.stdout.write(chalk.gray('    │ ') + line.trim() + '\n');
                }
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code ?? 0 });
            });

            proc.on('error', reject);
        });
    }
}

module.exports = { MultiRunManager };
