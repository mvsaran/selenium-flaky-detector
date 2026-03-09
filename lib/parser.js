'use strict';

/**
 * Layer 2 · Surefire XML Parser
 * ==============================
 * Parses Maven Surefire/Failsafe JUnit XML reports into a normalized structure.
 * Supports both individual XML files and aggregated reports.
 */

const path = require('path');
const fs = require('fs-extra');
const xml2js = require('xml2js');
const chalk = require('chalk');

class SurefireParser {
    constructor({ projectPath }) {
        this.projectPath = projectPath;
    }

    /**
     * Parse all JUnit XML files in a report directory
     * @param {string} reportDir - Path to directory containing XML files
     * @returns {Promise<ParsedTest[]>}
     */
    async parse(reportDir) {
        let tests = [];

        if (!(await fs.pathExists(reportDir))) {
            console.log(chalk.yellow(`  ⚠️  Report dir not found: ${reportDir}`));
            return tests;
        }

        // Recursive file scan to find all .xml files (handles TestNG subdirectories)
        const findXmlFiles = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const files = [];
            for (const entry of entries) {
                const res = path.resolve(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...(await findXmlFiles(res)));
                } else if (entry.name.endsWith('.xml')) {
                    files.push(res);
                }
            }
            return files;
        };

        const allFiles = await findXmlFiles(reportDir);

        if (allFiles.length === 0) {
            console.log(chalk.yellow(`  ⚠️  No XML reports found in: ${reportDir}`));
            return tests;
        }

        for (const filePath of allFiles) {
            const fileName = path.basename(filePath);
            try {
                if (fileName === 'testng-results.xml') {
                    const parsed = await this._parseTestNGResults(filePath);
                    tests.push(...parsed);
                } else {
                    const parsed = await this._parseFile(filePath);
                    tests.push(...parsed);
                }
            } catch (err) {
                console.log(chalk.red(`  ⚠️  Failed to parse ${fileName}: ${err.message}`));
            }
        }

        // Deduplicate tests by fullName (TestNG can produce both TEST-*.xml and testng-results.xml)
        const seen = new Set();
        tests = tests.filter(t => {
            if (seen.has(t.fullName)) return false;
            seen.add(t.fullName);
            return true;
        });

        return tests;
    }

    /**
     * Parse TestNG's native results format
     */
    async _parseTestNGResults(filePath) {
        const xml = await fs.readFile(filePath, 'utf-8');
        const result = await xml2js.parseStringPromise(xml, { explicitArray: true });
        const tests = [];

        if (!result['testng-results'] || !result['testng-results'].suite) return tests;

        for (const suite of result['testng-results'].suite) {
            const suiteName = (suite.$ || {}).name || 'TestNG Suite';
            if (!suite.test) continue;

            for (const test of suite.test) {
                if (!test.class) continue;

                for (const cls of test.class) {
                    const className = (cls.$ || {}).name || 'UnknownClass';
                    if (!cls['test-method']) continue;

                    for (const method of cls['test-method']) {
                        const m = method.$;
                        if (m['is-config'] === 'true') continue; // Skip @Before/@After methods

                        const name = m.name || 'unknown';
                        const status = m.status === 'PASS' ? 'PASS' : (m.status === 'SKIP' ? 'SKIP' : 'FAIL');
                        const duration = parseFloat(m['duration-ms'] || '0') / 1000;

                        let errorMessage = '';
                        let errorType = '';
                        let stackTrace = '';

                        if (status === 'FAIL' && method.exception) {
                            const exc = method.exception[0];
                            errorType = (exc.$ || {}).class || '';
                            if (exc.message) errorMessage = exc.message[0];
                            if (exc['full-stacktrace']) stackTrace = exc['full-stacktrace'][0];

                            if (errorMessage) {
                                errorMessage = errorMessage.split('\n')[0].trim();
                            }
                        }

                        tests.push({
                            suiteName,
                            className,
                            testName: name,
                            fullName: `${className}#${name}`,
                            status,
                            duration,
                            errorMessage,
                            errorType,
                            stackTrace,
                            file: filePath
                        });
                    }
                }
            }
        }
        return tests;
    }

    /**
     * Parse a single JUnit XML file
     */
    async _parseFile(filePath) {
        const xml = await fs.readFile(filePath, 'utf-8');
        const result = await xml2js.parseStringPromise(xml, { explicitArray: true });

        const tests = [];

        // Handle both <testsuite> and <testsuites> root elements
        const suites = result.testsuites
            ? result.testsuites.testsuite || []
            : result.testsuite
                ? [result.testsuite]
                : [];

        for (const suite of suites) {
            const suiteName = suite.$.name || 'UnknownSuite';
            const testcases = suite.testcase || [];

            for (const tc of testcases) {
                const attrs = tc.$;
                const name = attrs.name || 'unknown';
                const className = attrs.classname || suiteName;
                const time = parseFloat(attrs.time || '0');

                const failures = tc.failure || [];
                const errors = tc.error || [];
                const skipped = tc.skipped || [];

                let status = 'PASS';
                let errorMessage = '';
                let errorType = '';
                let stackTrace = '';

                if (skipped.length > 0) {
                    status = 'SKIP';
                } else if (failures.length > 0 || errors.length > 0) {
                    status = 'FAIL';
                    const failEntry = failures[0] || errors[0];
                    errorMessage = failEntry._ || (typeof failEntry === 'string' ? failEntry : '');
                    errorType = (failEntry.$ || {}).type || '';
                    stackTrace = errorMessage;
                    // Normalize error message (first line only for matching)
                    errorMessage = errorMessage.split('\n')[0].trim();
                }

                tests.push({
                    suiteName,
                    className,
                    testName: name,
                    fullName: `${className}#${name}`,
                    status,          // 'PASS' | 'FAIL' | 'SKIP'
                    duration: time,
                    errorMessage,
                    errorType,
                    stackTrace,
                    file: filePath,
                });
            }
        }

        return tests;
    }
}

module.exports = { SurefireParser };
