'use strict';

/**
 * Layer 3 · Root Cause Analyzer
 * ================================
 * Pattern-matches error messages from Selenium/Java tests to auto-categorize
 * the root cause of each flaky failure.
 *
 * Patterns are ordered by specificity — first match wins.
 */

const { EntropyScorer } = require('./scorer');

// ─── RCA Pattern Definitions ──────────────────────────────────────────────────
// Order matters: more specific patterns come first so they win over general ones.
const RCA_PATTERNS = [
    // ── 1. Selenium-specific exceptions ──────────────────────────────────────
    {
        id: 'stale_element',
        label: 'Stale Element',
        emoji: '♻️',
        patterns: [
            /StaleElementReferenceException/i,
            /stale element reference/i,
            /element is not attached/i,
        ],
        description: 'Element reference became invalid between operations — typically a race condition where the DOM was updated after the element was located.',
        fix: {
            title: 'Use Self-Healing Locators / Re-fetch Elements',
            before:
                '// ❌ Problem: Cached element goes stale after DOM update\n' +
                'WebElement btn = driver.findElement(By.id("submit"));\n' +
                'waitFor(someCondition);\n' +
                'btn.click();  // StaleElementReferenceException!',
            after:
                '// ✅ Fix: Re-fetch element just before interaction\n' +
                'waitFor(someCondition);\n' +
                'driver.findElement(By.id("submit")).click();\n\n' +
                '// ✅ Or use FluentWait with staleness handling\n' +
                'new FluentWait<>(driver)\n' +
                '    .withTimeout(Duration.ofSeconds(10))\n' +
                '    .ignoring(StaleElementReferenceException.class)\n' +
                '    .until(d -> d.findElement(By.id("submit")).isDisplayed());',
        },
    },

    {
        id: 'timeout',
        label: 'Timeout',
        emoji: '⏱️',
        patterns: [
            /TimeoutException/i,
            /timed out/i,
            /timeout/i,
            /Wait timed/i,
        ],
        description: 'Page or element load exceeded the allotted timeout. Often caused by network latency or slow CI environments.',
        fix: {
            title: 'Use Explicit Waits with Dynamic Conditions',
            before:
                '// ❌ Problem: Hard-coded sleep is fragile\n' +
                'Thread.sleep(3000);\n' +
                'driver.findElement(By.id("product-list")).click();',
            after:
                '// ✅ Fix: Explicit wait for element to be clickable\n' +
                'WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));\n' +
                'WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("product-list")));\n' +
                'el.click();',
        },
    },

    {
        id: 'no_such_element',
        label: 'Missing Element',
        emoji: '🔍',
        patterns: [
            /NoSuchElementException/i,
            /no such element/i,
            /Unable to locate element/i,
        ],
        description: 'Element was not found in the DOM at the time of lookup. Usually caused by async rendering or 50/50 conditional rendering.',
        fix: {
            title: 'Wait for Element Presence Before Interaction',
            before:
                '// ❌ Problem: Immediately looking for element that loads async\n' +
                'driver.findElement(By.id("flash-deal-title")).getText();',
            after:
                '// ✅ Fix: Wait for element to be present, then check state\n' +
                'try {\n' +
                '    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));\n' +
                '    WebElement title = wait.until(\n' +
                '        ExpectedConditions.presenceOfElementLocated(By.id("flash-deal-title"))\n' +
                '    );\n' +
                '    assertThat(title.getText()).contains("FLASH DEAL");\n' +
                '} catch (TimeoutException e) {\n' +
                '    // Deal not available this run — use Assumptions to skip gracefully\n' +
                '    Assumptions.assumeTrue(false, "Deal not available in this run");\n' +
                '}',
        },
    },

    {
        id: 'not_interactable',
        label: 'Element Not Ready',
        emoji: '👁️',
        patterns: [
            /ElementNotInteractableException/i,
            /element not interactable/i,
            /element is not visible/i,
        ],
        description: 'Element exists in DOM but is hidden, overlapped, or disabled — typically an animation or transition race.',
        fix: {
            title: 'Wait for Element to Become Visible / Interactable',
            before:
                '// ❌ Problem: Clicking element before CSS animation completes\n' +
                'driver.findElement(By.id("modal-btn")).click();',
            after:
                '// ✅ Fix: Ensure element is interactable\n' +
                'WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n' +
                'wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("modal-btn")));\n' +
                'wait.until(ExpectedConditions.elementToBeClickable(By.id("modal-btn"))).click();',
        },
    },

    // ── 2. DOM count mismatch (e.g. "expected: 12 but was: 11") ──────────────
    {
        id: 'dom_count',
        label: 'DOM Count Mismatch',
        emoji: '🔢',
        patterns: [
            /expected: <\d+> but was: <\d+>/i,
            /expected: \d+[\s\n]+but was: \d+/i,
            /expected: \d+ but was: \d+/i,
            /expected.*\d+.*products/i,
            /should contain exactly \d+/i,
            /numberOfElementsToBe/i,
            /but was:.*\d+/i,
            /but was: \d+/i,
        ],
        description: 'The number of DOM elements did not match the expected count — the async data load had not completed when the assertion ran.',
        fix: {
            title: 'Wait for Element Count Before Asserting',
            before:
                '// ❌ Problem: Assert product count before async load completes\n' +
                'Thread.sleep(1000);\n' +
                'List<WebElement> cards = driver.findElements(By.cssSelector(".product-card"));\n' +
                'assertEquals(12, cards.size());',
            after:
                '// ✅ Fix: Wait until the exact count is present\n' +
                'WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n' +
                'List<WebElement> cards = wait.until(\n' +
                '    ExpectedConditions.numberOfElementsToBe(\n' +
                '        By.cssSelector(".product-card"), 12\n' +
                '    )\n' +
                ');\n' +
                'assertEquals(12, cards.size());',
        },
    },

    // ── 3. Boolean assertion race ("Expecting value to be true but was false") ──
    {
        id: 'bool_assertion',
        label: 'Race Condition',
        emoji: '🏁',
        patterns: [
            /Expecting value to be (true|false) but was/i,
            /Expecting actual to be (true|false) but was/i,
            /expected: (true|false)\s*\n?\s*but was: (true|false)/i,
            /not to contain.*cart is empty/i,
            /doesNotContain/i,
            /Expecting value to be false but was true/i,
            /Expecting value to be true but was false/i,
            /Expecting actual to be (true|false)/i,
        ],
        description: 'A boolean or presence assertion failed intermittently. This pattern typically indicates a race condition where application state changes between test setup and assertion.',
        fix: {
            title: 'Stabilise Boolean Assertions with Explicit State Waits',
            before:
                '// ❌ Problem: Assert immediate state — races with async change\n' +
                'Thread.sleep(1000);\n' +
                'WebElement warning = driver.findElement(By.id("stale-warning"));\n' +
                'assertFalse(warning.isDisplayed());\n\n' +
                '// ❌ Also fragile — button disabled state depends on async stock\n' +
                'assertTrue(addBtn.isEnabled());',
            after:
                '// ✅ Fix: Wait for the element to reach the expected state\n' +
                'WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n' +
                '// Wait for stale warning to be hidden\n' +
                'wait.until(ExpectedConditions.invisibilityOfElementLocated(By.id("stale-warning")));\n\n' +
                '// ✅ Wait for button to be clickable (visible + enabled)\n' +
                'WebElement addBtn = wait.until(\n' +
                '    ExpectedConditions.elementToBeClickable(By.id("add-btn-1"))\n' +
                ');\n' +
                'assertTrue(addBtn.isEnabled());',
        },
    },

    // ── 4. Async text load (status bar says "Fetching..." instead of "Loaded") ──
    {
        id: 'async_load',
        label: 'Async Load',
        emoji: '⚡',
        patterns: [
            /to contain.*"Loaded"/i,
            /to contain pattern/i,
            /Fetching products/i,
            /Fetching/i,
            /not to contain/i,
        ],
        description: 'Assertion failed because data was not fully loaded when checked. Hard sleeps are not reliable — use ExpectedConditions on the text itself.',
        fix: {
            title: 'Wait for Text Presence Instead of Sleeping',
            before:
                '// ❌ Problem: Status bar text checked before async API responds\n' +
                'WebElement statusBar = driver.findElement(By.id("status-bar"));\n' +
                'assertThat(statusBar.getText()).contains("Loaded");',
            after:
                '// ✅ Fix: Wait until the expected text appears in the element\n' +
                'WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n' +
                'wait.until(ExpectedConditions.textToBePresentInElementLocated(\n' +
                '    By.id("status-bar"), "Loaded"\n' +
                '));\n' +
                'WebElement statusBar = driver.findElement(By.id("status-bar"));\n' +
                'assertThat(statusBar.getText()).contains("Loaded");',
        },
    },

    // ── 5. Network / connection issues ───────────────────────────────────────
    {
        id: 'connection',
        label: 'Network / Connection',
        emoji: '🌐',
        patterns: [
            /Connection refused/i,
            /SocketException/i,
            /ConnectException/i,
            /NetworkError/i,
            /ERR_CONNECTION/i,
        ],
        description: 'Test tried to connect to a server that was not ready. Common in CI where the app starts slowly.',
        fix: {
            title: 'Wait for Server Readiness Before Tests',
            before:
                '// ❌ Problem: No readiness check for the server\n' +
                '@BeforeAll\n' +
                'static void setup() {\n' +
                '    driver = new ChromeDriver();\n' +
                '    driver.get("http://localhost:8080");\n' +
                '}',
            after:
                '// ✅ Fix: Poll for server health before tests start\n' +
                '@BeforeAll\n' +
                'static void setup() throws Exception {\n' +
                '    waitForServer("http://localhost:8080/actuator/health", 30);\n' +
                '    driver = new ChromeDriver();\n' +
                '    driver.get("http://localhost:8080");\n' +
                '}',
        },
    },

    // ── 6. WebDriver instability ──────────────────────────────────────────────
    {
        id: 'webdriver',
        label: 'WebDriver Instability',
        emoji: '🚗',
        patterns: [
            /WebDriverException/i,
            /session not created/i,
            /chrome not reachable/i,
            /communicating with the remote browser/i,
            /invalid session id/i,
        ],
        description: 'WebDriver process crashed or could not be initialised — often a resource contention issue in parallel CI runs.',
        fix: {
            title: 'Add Driver Resilience with Retry Logic',
            before:
                '// ❌ Problem: Single-attempt driver creation\n' +
                '@BeforeEach\n' +
                'void setUp() {\n' +
                '    driver = new ChromeDriver(options);\n' +
                '}',
            after:
                '// ✅ Fix: Retry driver creation up to 3 times\n' +
                '@BeforeEach\n' +
                'void setUp() {\n' +
                '    driver = createDriverWithRetry(3);\n' +
                '}',
        },
    },

    // ── 7. Test Framework Configuration (TestNG/JUnit setup) ──────────────────
    {
        id: 'config_failure',
        label: 'Configuration Failure',
        emoji: '🔧',
        patterns: [
            /ConfigurationFailure/i,
            /skipping.*because.*failed/i,
            /@Before/i,
            /@After/i,
            /Method .* failed/i,
        ],
        description: 'A setup or teardown method failed (e.g. @BeforeMethod). This often blocks subsequent tests, leading to massive fail counts.',
        fix: {
            title: 'Harden Test Setup Logic',
            before:
                '// ❌ Problem: Setup fails and blocks the whole suite\n' +
                '@BeforeMethod\n' +
                'public void setUp() {\n' +
                '    driver.get(BASE_URL);\n' +
                '}',
            after:
                '// ✅ Fix: Use defensive setup with verification\n' +
                '@BeforeMethod\n' +
                'public void setUp() {\n' +
                '    try {\n' +
                '        driver.get(BASE_URL);\n' +
                '        waitForServerReady();\n' +
                '    } catch (Exception e) {\n' +
                '        throw new SkipException("Setup failed: " + e.getMessage());\n' +
                '    }\n' +
                '}',
        },
    },

    // ── 8. Catch-all ──────────────────────────────────────────────────────────
    {
        id: 'unknown',
        label: 'Unknown',
        emoji: '❓',
        patterns: [], // Never matches — used as fallback
        description: 'Root cause could not be automatically classified. Review the full stack trace manually.',
        fix: {
            title: 'General Flakiness Hardening',
            before: '// Review the full stack trace to identify the root cause',
            after:
                '// Common strategies:\n' +
                '// 1. Add explicit WebDriverWait before every assertion\n' +
                '// 2. Use Assumptions.assumeTrue() to skip when preconditions not met\n' +
                '// 3. Use @RetryingTest from junit-pioneer for transient failures\n' +
                '// 4. Ensure tests are isolated and don\'t share browser state',
        },
    },
];

// ─── Root Cause Analyzer Class ────────────────────────────────────────────────
class RootCauseAnalyzer {
    /**
     * Analyze all test runs and scores to produce RCA results
     * @param {Array}  parsedRuns - From SurefireParser
     * @param {Object} scores     - From EntropyScorer
     * @returns {AnalysisResult}
     */
    analyze(parsedRuns, scores) {
        const perTest = {};

        for (const [testName, scoreData] of Object.entries(scores)) {
            // Collect all error messages for this test across all runs
            const errors = scoreData.errorMessages || [];
            const types = scoreData.errorTypes || [];
            const allText = [...errors, ...types].join('\n');

            const rca = this._classify(allText);

            perTest[testName] = {
                rootCause: rca.label,
                rootCauseId: rca.id,
                emoji: rca.emoji,
                description: rca.description,
                fix: rca.fix,
                flakinessScore: scoreData.flakinessScore,
                severity: scoreData.severity,
                isAlwaysFail: scoreData.isAlwaysFail,
                isAlwaysPass: scoreData.isAlwaysPass,
            };
        }

        // Suite-level summary
        const scorer = new EntropyScorer();
        const suiteHealthScore = scorer.suiteHealthScore(scores);

        const flakyCounts = this._countByRca(perTest);
        const totalFlaky = Object.values(scores).filter(s => s.isFlaky).length;
        const totalTests = Object.keys(scores).length;
        const alwaysFail = Object.values(scores).filter(s => s.isAlwaysFail).length;

        const ciGatePassed = suiteHealthScore >= 70;

        return {
            perTest,
            suiteHealthScore,
            totalTests,
            totalFlaky,
            totalAlwaysFail: alwaysFail,
            totalStable: totalTests - totalFlaky - alwaysFail,
            flakyCounts,
            ciGatePassed,
            topRootCauses: this._topRootCauses(perTest),
            recommendations: this._buildRecommendations(perTest),
        };
    }

    /**
     * Classify error text against RCA pattern list (first match wins)
     */
    _classify(text) {
        if (!text || text.trim() === '') {
            return RCA_PATTERNS.find(p => p.id === 'unknown');
        }
        for (const pattern of RCA_PATTERNS) {
            if (pattern.patterns.some(re => re.test(text))) return pattern;
        }
        return RCA_PATTERNS.find(p => p.id === 'unknown');
    }

    _countByRca(perTest) {
        const counts = {};
        for (const data of Object.values(perTest)) {
            if (data.flakinessScore > 0) {
                counts[data.rootCause] = (counts[data.rootCause] ?? 0) + 1;
            }
        }
        return counts;
    }

    _topRootCauses(perTest) {
        const counts = this._countByRca(perTest);
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => {
                const rca = RCA_PATTERNS.find(p => p.label === label);
                return { label, count, emoji: rca?.emoji ?? '❓' };
            });
    }

    _buildRecommendations(perTest) {
        // Deduplicate recommendations by rootCauseId, include both flaky and always-fail
        const seen = new Set();
        const recs = [];
        // Sort by flakinessScore descending so most-flaky patterns appear first
        const sorted = Object.values(perTest).sort((a, b) => b.flakinessScore - a.flakinessScore);
        for (const data of sorted) {
            if ((data.flakinessScore > 0 || data.isAlwaysFail) && !seen.has(data.rootCauseId)) {
                seen.add(data.rootCauseId);
                recs.push({
                    emoji: data.emoji,
                    rootCause: data.rootCause,
                    description: data.description,
                    fix: data.fix,
                });
            }
        }
        return recs;
    }
}

module.exports = { RootCauseAnalyzer, RCA_PATTERNS };
