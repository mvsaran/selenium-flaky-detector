'use strict';

/**
 * selenium-flaky-detector · Public API Index
 * ==========================================
 * Exports the main FlakyDetector class for programmatic usage.
 *
 * Usage:
 *   const { FlakyDetector } = require('selenium-flaky-detector');
 *   const detector = new FlakyDetector({ runs: 3, projectPath: './my-project' });
 *   const result = await detector.run();
 */

const { MultiRunManager } = require('./runner');
const { SurefireParser } = require('./parser');
const { EntropyScorer } = require('./scorer');
const { RootCauseAnalyzer } = require('./analyzer');
const { ReportGenerator } = require('./reporter');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class FlakyDetector {
    /**
     * @param {Object} options
     * @param {number}  options.runs           - Number of test suite repetitions (default: 3)
     * @param {string}  options.projectPath    - Absolute path to Maven/Gradle project
     * @param {string}  options.outputDir      - Directory to write the HTML report
     * @param {string}  options.specPattern    - Optional test class filter (Maven -Dtest=)
     * @param {number}  options.ciThreshold    - Health score threshold for CI gate (default: 70)
     * @param {boolean} options.openReport     - Auto-open HTML report after generation
     * @param {string}  options.buildTool      - 'maven' or 'gradle' (auto-detected)
     */
    constructor(options = {}) {
        this.runs = options.runs ?? 3;
        this.projectPath = options.projectPath ?? process.cwd();
        this.outputDir = options.outputDir ?? path.join(this.projectPath, 'flaky-report');
        this.specPattern = options.specPattern ?? '';
        this.ciThreshold = options.ciThreshold ?? 70;
        this.openReport = options.openReport ?? true;
        this.buildTool = options.buildTool ?? this._detectBuildTool();
    }

    /**
     * Auto-detect whether the project uses Maven or Gradle
     */
    _detectBuildTool() {
        if (fs.existsSync(path.join(this.projectPath, 'pom.xml'))) return 'maven';
        if (fs.existsSync(path.join(this.projectPath, 'build.gradle'))) return 'gradle';
        if (fs.existsSync(path.join(this.projectPath, 'build.gradle.kts'))) return 'gradle';
        return 'maven'; // default
    }

    /**
     * Run the full detection pipeline
     * @returns {Promise<DetectionResult>}
     */
    async run() {
        console.log(chalk.bold.cyan('\n📋  Starting Selenium Flaky Detector'));
        console.log(chalk.gray(`   Project   : ${this.projectPath}`));
        console.log(chalk.gray(`   Build Tool: ${this.buildTool}`));
        console.log(chalk.gray(`   Runs      : ${this.runs}`));
        console.log(chalk.gray(`   Output    : ${this.outputDir}`));
        console.log('');

        // Layer 2 — Run the suite N times
        const runner = new MultiRunManager({
            runs: this.runs,
            projectPath: this.projectPath,
            buildTool: this.buildTool,
            specPattern: this.specPattern,
        });
        const runResults = await runner.execute();

        // Layer 2 — Parse Surefire XML for each run
        const parser = new SurefireParser({ projectPath: this.projectPath });
        const parsedRuns = [];
        for (const run of runResults) {
            const parsed = await parser.parse(run.reportDir);
            parsedRuns.push({ ...run, tests: parsed });
        }

        // Layer 3 — Entropy scoring
        const scorer = new EntropyScorer();
        const scores = scorer.score(parsedRuns);

        // ── Guard: no tests found at all ──────────────────────────────────────
        const totalTestsFound = Object.keys(scores).length;
        if (totalTestsFound === 0) {
            const allRanFailed = parsedRuns.every(r => r.exitCode !== 0);
            console.log('');
            if (allRanFailed) {
                console.log(chalk.red.bold('  ❌  No test results found — Maven failed on all runs.'));
                console.log(chalk.yellow('     Possible reasons:'));
                console.log(chalk.yellow('       • No pom.xml found at: ' + this.projectPath));
                console.log(chalk.yellow('       • Maven is not installed or not on PATH'));
                console.log(chalk.yellow('       • --project path does not point to a Maven/Gradle project'));
                console.log(chalk.yellow('     Tip: Use --demo to run the built-in ShopFlake demo instead.'));
            } else {
                console.log(chalk.yellow('  ⚠️   No tests were discovered. Check your --spec filter or Surefire config.'));
            }
            console.log('');
            return {
                healthScore: 0,
                scores: {},
                analysis: { suiteHealthScore: 0, totalTests: 0, totalFlaky: 0 },
                reportPath: null,
                passed: false,
                error: 'NO_TESTS_FOUND',
            };
        }

        // Layer 3 — Root cause analysis
        const analyzer = new RootCauseAnalyzer();
        const analysis = analyzer.analyze(parsedRuns, scores);

        // Layer 4 — Report generation
        const reporter = new ReportGenerator({ outputDir: this.outputDir });
        const reportPath = await reporter.generate({
            runs: parsedRuns,
            scores,
            analysis,
            config: {
                runs: this.runs,
                projectPath: this.projectPath,
                buildTool: this.buildTool,
                ciThreshold: this.ciThreshold,
            },
        });

        const healthScore = analysis.suiteHealthScore;
        console.log(chalk.bold('\n═══════════════════════════════════════════════════'));
        console.log(chalk.bold('  📊  DETECTION COMPLETE'));
        console.log(chalk.bold('═══════════════════════════════════════════════════'));

        // Print summary table
        for (const [testName, data] of Object.entries(scores)) {
            const isAlwaysFail = data.isAlwaysFail;
            const isAlwaysPass = data.isAlwaysPass;
            const flakinessScore = data.flakinessScore;
            const testAnalysis = analysis.perTest[testName] ?? {};

            const rca = (isAlwaysFail || flakinessScore > 0) && testAnalysis.rootCause
                ? `${testAnalysis.emoji} RCA: ${testAnalysis.rootCause}`
                : '';

            const statusText = isAlwaysFail ? chalk.red('💀 BROKEN') :
                isAlwaysPass ? chalk.green('🟢 STABLE') :
                    chalk.yellow(`${flakinessScore.toFixed(1)}% flaky`);

            console.log(`  ${isAlwaysPass ? '🟢' : '🔴'}  ${chalk.cyan(testName.padEnd(50))} ${statusText}  ${rca}`);
        }

        console.log('');
        console.log(`  💯  Suite Health Score : ${this._colorScore(healthScore)}  ${this._healthBar(healthScore)}`);
        console.log(`  📄  Report             : ${chalk.underline.blue(reportPath)}`);
        console.log(chalk.bold('═══════════════════════════════════════════════════\n'));

        if (this.openReport) {
            try {
                const open = require('open');
                await open(reportPath);
            } catch (e) { /* ignore if open fails in CI */ }
        }

        return {
            healthScore,
            scores,
            analysis,
            reportPath,
            passed: healthScore >= this.ciThreshold,
        };
    }

    _colorScore(score) {
        const s = `${score}/100`;
        if (score >= 80) return chalk.green.bold(s);
        if (score >= 60) return chalk.yellow.bold(s);
        return chalk.red.bold(s);
    }

    _healthBar(score) {
        const filled = Math.round(score / 5);
        const empty = 20 - filled;
        return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    }
}

module.exports = { FlakyDetector };
