'use strict';

/**
 * Layer 3 · Entropy Scorer
 * =========================
 * Calculates flakiness percentage for each test using entropy-based scoring.
 *
 *   Flakiness = 4 × passRate × (1 − passRate) × 100
 *
 * A test that ALWAYS passes → 0%  (no entropy)
 * A test that ALWAYS fails  → 0%  (consistently broken, not flaky)
 * A test that passes 50%    → 100% (maximally flaky)
 */

class EntropyScorer {
    /**
     * Score all tests across all runs
     * @param {Array} parsedRuns - Array of { runNumber, tests[] }
     * @returns {Object} Map of testFullName → ScoreResult
     */
    score(parsedRuns) {
        // Collect unique test names and their results per run
        const testMap = new Map(); // testFullName → { results: boolean[] }

        for (const run of parsedRuns) {
            for (const test of run.tests) {
                if (test.status === 'SKIP') continue; // Ignore skipped tests in scoring
                if (!testMap.has(test.fullName)) {
                    testMap.set(test.fullName, {
                        fullName: test.fullName,
                        className: test.className,
                        testName: test.testName,
                        suiteName: test.suiteName,
                        results: [],      // true=pass, false=fail per run
                        durations: [],
                        errorMessages: [],
                        errorTypes: [],
                    });
                }
                const entry = testMap.get(test.fullName);
                entry.results.push(test.status === 'PASS');
                entry.durations.push(test.duration);
                if (test.errorMessage) entry.errorMessages.push(test.errorMessage);
                if (test.errorType) entry.errorTypes.push(test.errorType);
            }
        }

        // Calculate scores
        const scores = {};
        for (const [name, data] of testMap.entries()) {
            const totalRuns = data.results.length;
            const passes = data.results.filter(Boolean).length;
            const passRate = totalRuns > 0 ? passes / totalRuns : 0;

            // Entropy formula (same as Cypress edition)
            const flakinessScore = 4 * passRate * (1 - passRate) * 100;

            const isFlaky = flakinessScore > 0 && flakinessScore < 100;
            const isAlwaysFail = passes === 0;
            const isAlwaysPass = passes === totalRuns;

            const avgDuration = data.durations.length > 0
                ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
                : 0;

            const maxDuration = data.durations.length > 0
                ? Math.max(...data.durations)
                : 0;

            scores[name] = {
                fullName: name,
                className: data.className,
                testName: data.testName,
                suiteName: data.suiteName,
                totalRuns,
                passes,
                failures: totalRuns - passes,
                passRate: parseFloat((passRate * 100).toFixed(2)),
                flakinessScore: parseFloat(flakinessScore.toFixed(2)),
                severity: this._severity(flakinessScore),
                isFlaky,
                isAlwaysFail,
                isAlwaysPass,
                avgDuration: parseFloat(avgDuration.toFixed(3)),
                maxDuration: parseFloat(maxDuration.toFixed(3)),
                errorMessages: [...new Set(data.errorMessages)],
                errorTypes: [...new Set(data.errorTypes)],
                runResults: data.results,
            };
        }

        return scores;
    }

    /**
   * Calculate overall suite health score (0–100, higher is better)
   *
   * Scoring logic:
   *   - Always-pass tests    → 0% penalty  (fully healthy)
   *   - Flaky tests          → flakinessScore% penalty (weighted ×2)
   *   - Always-fail tests    → 60% penalty (broken = worse than random) (weighted ×3)
   */
    suiteHealthScore(scores) {
        const values = Object.values(scores);
        if (values.length === 0) return 100;

        let totalWeight = 0;
        let weightedPenalty = 0;

        for (const s of values) {
            if (s.isAlwaysPass) {
                totalWeight += 1;
                weightedPenalty += 0;
            } else if (s.isAlwaysFail) {
                // Broken tests carry heavier weight than flaky ones
                totalWeight += 3;
                weightedPenalty += 60 * 3; // Fixed 60-point penalty for consistently broken tests
            } else {
                // Flaky tests — weight ×2
                totalWeight += 2;
                weightedPenalty += s.flakinessScore * 2;
            }
        }

        const avgPenalty = weightedPenalty / totalWeight;
        return Math.max(0, Math.round(100 - avgPenalty));
    }

    _severity(score) {
        if (score === 0) return 'stable';
        if (score < 50) return 'mild';
        if (score < 80) return 'moderate';
        if (score < 100) return 'severe';
        return 'critical';
    }
}

module.exports = { EntropyScorer };
