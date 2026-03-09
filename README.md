# 🔍 selenium-flaky-detector

> **Entropy-Based Flaky Test Detection for Selenium/Java Projects**
>
> Detect, score, and fix flaky Selenium tests with a premium interactive dashboard, root-cause analysis, and smart fix recommendations.

[![npm version](https://img.shields.io/npm/v/selenium-flaky-detector?style=flat-square&color=6366f1)](https://www.npmjs.com/package/selenium-flaky-detector)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14-brightgreen?style=flat-square)](https://nodejs.org)
[![Java](https://img.shields.io/badge/Java-17%2B-orange?style=flat-square)](https://adoptium.net)

---

## 🧠 What is Entropy-Based Detection?

A **flaky test** is a test that sometimes passes and sometimes fails without any code changes. This is extremely common in Selenium/Java due to async logic, variable network latency, and DOM rendering "race conditions."

Traditional testing tools just tell you: *"Test A Failed"*. But if it failed 1 out of 3 times, how bad is the flakiness?

This detector handles that by using an **Information Theory formula (Entropy)** to calculate a true `Flakiness Percentage` rather than just giving you pass/fail states:

*   **0% Entropy (Total Order):** Tests that *Always Pass* or *Always Fail* are predictable and get a 0% flaky score.
*   **100% Entropy (Maximum Chaos):** A test that passes exactly 50% of the time is a true coin flip, destroying CI/CD trust, and scores 100%.

By focusing on entropy, we ignore "consistently broken" tests (which are just regular bugs) and surgically spotlight the **truly chaotic timing and network issues**.

---

## ⚡ Simplified Usage (The 3-Step Guide)

If you just want to get started immediately, follow these three simple steps:

### 1️⃣ Step 1: Install the Plugin
Open your terminal and install the tool globally so you can use it anywhere:
```bash
npm install -g selenium-flaky-detector
```

### 2️⃣ Step 2: Run the Command
Navigate to your Maven/Gradle project folder and trigger the detector:
```bash
# Recommended for development (runs 3 times)
npx selenium-flaky-detect --runs 3
```

### 3️⃣ Step 3: See the Reports
Once finished, an interactive **HTML Dashboard** will automatically pop up in your browser. Review your "Flakiness Score" and apply the smart fix recommendations!

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  🎭  LAYER 1 · Orchestration                                         │
│                                                                      │
│   ┌──────────────┐      ┌──────────────────┐      ┌──────────────┐  │
│   │ Your Project │─────▶│ ⚙️  Orchestrator  │─────▶│ ☕  Maven    │  │
│   │ (Maven/Gradle)│      │  Engine          │      │   Runner     │  │
│   │              │      │  Command         │      │ (Surefire)   │  │
│   └──────────────┘      └──────────────────┘      └──────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  🔁  LAYER 2 · Test Execution Loop                                   │
│                                                                      │
│   ┌──────────────┐      ┌──────────────────┐      ┌──────────────┐  │
│   │ 🔢 Multi-Run  │─────▶│ 📄 Surefire XML  │─────▶│ 💥 Failure   │  │
│   │   Manager    │      │  Aggregation     │      │   Capture    │  │
│   │ (N Repeats)  │      │  (JUnit XML)     │      │   Engine     │  │
│   └──────────────┘      └──────────────────┘      └──────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  🧠  LAYER 3 · Intelligence & Scoring                                │
│                                                                      │
│   ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │ 📊 Entropy    │    │ 🔍 Root Cause    │    │ 💯 Health Score  │  │
│   │   Scorer     │    │   Analyzer       │    │   Calculator     │  │
│   │  (0–100%)    │    │  (Auto-Diag)     │    │   (0–100)        │  │
│   └──────────────┘    └──────────────────┘    └──────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  📋  LAYER 4 · Actionable Reporting                                  │
│                                                                      │
│   ┌──────────────┐      ┌──────────────────┐      ┌──────────────┐  │
│   │ 🖥️ Interactive│─────▶│ 💡 Fix Advice    │─────▶│ 🚦 CI Trust  │  │
│   │   Dashboard  │      │  (Smart RCA)     │      │   Gate       │  │
│   └──────────────┘      └──────────────────┘      └──────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 🧩 Understanding the Layers

*   **Layer 1: Orchestration.** Handles the CLI orchestrator to launch your test suite. It manages the lifecycle of the Maven/Gradle runner.
*   **Layer 2: Test Execution Loop.** Executes your Selenium test suite multiple times (`N` repeats) to gather a reliable sample size. It continuously parses the generated `Surefire XML` reports, capturing every failure trace, error message, and test duration.
*   **Layer 3: Intelligence & Scoring.** The brain of the detector. The **Entropy Scorer** mathematically calculates a test's exact `Flakiness Percentage` (0–100%) and generates a global `Suite Health Score`. Next, the **Root Cause Analyzer** scans the failed Java stack traces, pattern-matching against known Selenium exceptions to categorize exactly *why* it failed (e.g., `StaleElementReferenceException`). 
*   **Layer 4: Actionable Reporting.** Translates the raw data into an interactive HTML dashboard. Recommends specific, pattern-based Java/Selenium code fixes (e.g., *“Add explicit wait here”*) based on the identified root cause. Optionally acts as a **CI Trust Gate** to aggressively block builds if flaky tests cross a configured threshold.

---

## 🚀 Step-by-Step Guide

### 1. Install the CLI Globally
To use the tool across any project on your machine, install it globally via npm:
```bash
npm install -g selenium-flaky-detector
```

### 2. Verify Installation
Ensure the CLI is installed correctly by checking the version or help menu:
```bash
selenium-flaky-detect --help
```

### 3. Prepare Your Java Project
The detector relies on Maven Surefire to generate XML test reports. You must ensure your `pom.xml` is configured to **not fail the build immediately** when a test fails, so all tests can finish.

Add this property to your `maven-surefire-plugin` configuration:
```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.2.5</version>
  <configuration>
    <!-- Crucial: Let the build succeed even if tests fail -->
    <testFailureIgnore>true</testFailureIgnore>
  </configuration>
</plugin>
```

### 4. Run the Detector on Your Project
Navigate to your project's root directory (where the `pom.xml` lives) and run the `npx` command:

```bash
# Recommended for development (runs 3 times)
npx selenium-flaky-detect --runs 3
```

> [!TIP]
> **Choosing the right run count:**
> - `--runs 2`: Quick sanity check after applying a fix.
> - `--runs 3`: (Default) Balanced speed and accuracy for local dev.
> - `--runs 5+`: Recommended for CI/CD to catch rare, elusive flakes.

If your terminal is somewhere else, you can provide the **absolute path** to your Java project:
```bash
npx selenium-flaky-detect --project /Users/mvsaran/my-java-app --runs 5
```

If you only want to analyze a specific subset of test classes (to save time):
```bash
npx selenium-flaky-detect --runs 3 --spec "LoginTest,CheckoutTest"
```

### 5. Review the Premium Report
Once all runs are complete, the tool will automatically open a highly interactive HTML dashboard in your default browser:
*   **Identify** tests with a `Flakiness Score` between 1% and 99%.
*   **Analyze** the automatically generated *Root Cause (RCA)* tags (e.g., Timeout, Stale Element).
*   **Fix** the tests using the recommended code suggestions provided for each specific RCA.

### 🔄 6. Fix, Re-Run, and Verify
**This is the most important step!** After you apply a fix to your Java files:
1.  **Do NOT** run `mvn test` directly (it will fail on the first error and stop).
2.  **Instead**, re-run the detector using `npx`: `npx selenium-flaky-detect --runs 3`.
3.  The tool will automatically handle the errors, finish the runs, and update your **Health Score** to show that the test is now 🟢 **STABLE**.

---

## 📦 Installation

```bash
# Global CLI (recommended)
npm install -g selenium-flaky-detector

# Or use directly with npx (no install needed)
npx selenium-flaky-detect --help
```

**Requirements:**
- Node.js ≥ 14
- Java 17+
- Maven or Gradle
- Google Chrome + ChromeDriver (auto-managed by WebDriverManager)

---

## ⚙️ CLI Options

| Option | Default | Description |
|---|---|---|
| `--runs <n>` | `3` | Number of times to repeat the test suite |
| `--project <path>` | `.` | Path to the Maven/Gradle project |
| `--output <path>` | `./flaky-report` | Output directory for the HTML report |
| `--spec <pattern>` | *(all)* | Test class filter (e.g. `*Login*`) |
| `--threshold <n>` | `70` | CI gate minimum health score (0–100) |
| `--no-open` | *(auto-open)* | Skip auto-opening the HTML report |
| `--demo` | — | Run the built-in ShopFlake Java demo |

---

## 🧩 Programmatic API

```javascript
const { FlakyDetector } = require('selenium-flaky-detector');

const detector = new FlakyDetector({
  runs: 3,
  projectPath: './my-java-project',
  outputDir: './flaky-report',
  specPattern: '**/LoginTest*',
  ciThreshold: 80,
  openReport: true,
  buildTool: 'maven', // or 'gradle' — auto-detected by default
});

const result = await detector.run();

console.log(result.healthScore);    // 0–100
console.log(result.passed);         // true if healthScore >= threshold
console.log(result.scores);         // per-test flakiness scores
console.log(result.analysis);       // root cause analysis
console.log(result.reportPath);     // absolute path to HTML report
```

---

## 📊 Entropy-Based Flakiness Scoring

```
╔══════════════════════════════════════════════════╗
║  Flakiness = 4 × passRate × (1 − passRate) × 100  ║
╚══════════════════════════════════════════════════╝
```

| Score | Meaning | Indicator |
|---|---|---|
| 0% | Stable — always passes OR always fails | 🟢 |
| 1–49% | Mildly flaky | 🟡 |
| 50–79% | Moderately flaky | 🟠 |
| 80–99% | Severely flaky | 🔴 |
| 100% | Perfectly flaky — exact 50/50 split | 💀 |

---

## 🔍 Root Cause Analysis

The engine auto-classifies Selenium failures:

```
┌────────────────────────────────────────────────────────────────┐
│  Selenium RCA Pattern Engine                                   │
│                                                                │
│  StaleElementReferenceException  ──▶  ♻️  Stale Element       │
│  TimeoutException                ──▶  ⏱️  Timeout             │
│  NoSuchElementException          ──▶  🔍  Missing Element      │
│  ElementNotInteractableException ──▶  👁️  Element Not Ready   │
│  AssertionError / TestNG Assert  ──▶  ⚡  Async Load           │
│  SocketException / ConnectError  ──▶  🌐  Network / Connection │
│  WebDriverException              ──▶  🚗  WebDriver Instability│
│  ConfigurationFailure            ──▶  🔧  Config Failure      │
└────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Smart Fix Recommendations

### ♻️ Fix: StaleElementReferenceException

```java
// ❌ Problem: Cached element goes stale after DOM update
WebElement btn = driver.findElement(By.id("submit"));
waitFor(someCondition);
btn.click();  // StaleElementReferenceException!

// ✅ Fix: Re-fetch element just before interaction
waitFor(someCondition);
driver.findElement(By.id("submit")).click();
```

### ⏱️ Fix: TimeoutException / Hard Waits

```java
// ❌ Problem: Hard-coded sleep is fragile
Thread.sleep(3000);
driver.findElement(By.id("product-list")).click();

// ✅ Fix: Explicit wait for element to be clickable
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("product-list")));
el.click();
```

### ⚡ Fix: AssertionError on Async Count

```java
// ❌ Problem: Count assertion before async load completes
List<WebElement> products = driver.findElements(By.className("product-card"));
assertEquals(12, products.size());

// ✅ Fix: Wait for expected count first
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
List<WebElement> products = wait.until(
    ExpectedConditions.numberOfElementsToBe(By.className("product-card"), 12)
);
assertEquals(12, products.size());
```

---

## 📁 Project Structure

```
selenium-flaky-detector/
│
├── 📦 package.json               # npm configuration & CLI bin entry
├── 🚀 run-demo.js                # One-click demo orchestrator
│
├── bin/
│   └── 💻 flaky-detect.js        # CLI entry point (global binary)
│
├── lib/
│   ├── 📋 index.js               # Public API — FlakyDetector class
│   ├── ⚙️  orchestrator.js        # Layer 1: Demo lifecycle manager
│   ├── 🔢 runner.js              # Layer 2: Multi-run Maven/Gradle executor
│   ├── 📄 parser.js              # Layer 2: Surefire XML report parser
│   ├── 📊 scorer.js              # Layer 3: Entropy scorer + health score
│   ├── 🔍 analyzer.js            # Layer 3: Root cause analyzer (7 patterns)
│   └── 🖥️  reporter.js           # Layer 4: Premium HTML dashboard generator
│
└── demo-app/                     # ☕ Java Spring Boot ShopFlake Demo
    ├── pom.xml                   # Maven config (Selenium 4, JUnit 5)
    └── src/
        ├── main/java/io/shopflake/
        │   ├── ShopFlakeApplication.java   # Spring Boot entry point
        │   └── controller/
        │       ├── ShopController.java     # Page routes (/, /cart, /deals)
        │       └── ApiController.java      # REST API (7 flakiness sources!)
        ├── main/resources/
        │   ├── application.properties
        │   └── templates/
        │       ├── index.html              # 🛒 Product grid (flaky: async load)
        │       ├── cart.html               # 🛒 Cart (flaky: 30% stale data)
        │       └── deals.html              # ⚡ Deals (maximally flaky: 50/50)
        └── test/java/io/shopflake/tests/
            ├── ShopFlakeBaseTest.java       # Shared WebDriver setup
            ├── ProductLoadingTest.java      # 🟡 FLAKY: async timing
            ├── CartFunctionalityTest.java   # 🟠 FLAKY: race conditions
            ├── FlashDealsTest.java          # 🔴 VERY FLAKY: 50/50
            ├── StableControlTest.java       # 🟢 STABLE: control group
            └── SearchAndSessionTest.java    # 🟡 MIXED: some flaky
```

---

---


## 📊 Report Features

```
╔══════════════════════════════════════════════════════════════════╗
║  📋  FLAKY TEST REPORT                           Health: 68/100  ║
╠══════════════════════════════════════════════════════════════════╣
║  💯  Suite Health Score     ██████████████░░░░  68 / 100         ║
║  🔥  Pass/Fail Heatmap      [Run 1][Run 2][Run 3][Run 4][Run 5]  ║
║  💡  Precision Recommendations  7 recommendations found      ║
║  🏷️  Root Cause Labels      ⏱Timeout · ♻Stale · ✅Reliable   ║
╚══════════════════════════════════════════════════════════════════╝
```

| Feature | Description |
|---|---|
| 💯 Suite Health Score | Overall reliability index from 0–100 (animated ring) |
| 🔥 Pass/Fail Heatmap | Visual grid — ✓/✗ per test per run |
| 💡 Precision Recommendations | Specific, actionable Java/Selenium fix snippets |
| 🏷️ Root Cause Labels | Auto-tags: Timeout, Stale Element, Reliable Pass, etc. |
| 🚦 CI Trust Gate | Hard pass/fail with configurable threshold |

---

## 🤖 CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Flaky Detection
  run: npx selenium-flaky-detect --runs 3 --threshold 75
  # Exits with code 1 if health score < 75 (blocks merge)
```

```json
// package.json scripts
{
  "scripts": {
    "flaky:check": "selenium-flaky-detect --runs 3 --threshold 70"
  }
}
```

---

## 📄 Framework Configuration

The detector supports both **JUnit 5** and **TestNG** projects via Maven Surefire or Gradle.

### Maven (JUnit 5 / TestNG)
Ensure your `pom.xml` generates standard reports:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.2.5</version>
  <configuration>
    <!-- Never stop on failures — let detector analyze all results -->
    <testFailureIgnore>true</testFailureIgnore>
    <!-- JUnit XML report location (Automatically parsed) -->
    <reportsDirectory>${project.build.directory}/surefire-reports</reportsDirectory>
    
    <!-- TestNG Specific: If using testng.xml -->
    <!-- <suiteXmlFiles><suiteXmlFile>src/test/resources/testng.xml</suiteXmlFile></suiteXmlFiles> -->
  </configuration>
</plugin>
```

### TestNG results.xml (Native)
We also support parsing the native `testng-results.xml` file if your configuration generates it! Simply point the detector to the directory containing this file.

---

---

## 🔧 Troubleshooting & Common Issues

### ❌ Error: "Requires a project to execute but there is no POM in this directory"
This happens when Maven cannot find your `pom.xml` file. 

**Resolution Steps:**
1.  **Check your path:** Ensure you are running the command in the exact folder that contains `pom.xml`. 
2.  **Subdirectories:** If your Java project is in a subfolder (e.g., `eclipse-workspace/MyProject`), you must point to that folder:
    ```bash
    npx selenium-flaky-detect --project "./MyProject" --runs 3
    ```
3.  **Use Absolute Paths:** If relative paths are failing, use the full path to the project:
    ```bash
    npx selenium-flaky-detect --project "C:\Users\Name\eclipse-workspace\TestNGFramework" --runs 3
    ```
4.  **Confirm Build Tool:** The tool auto-detects Maven (`pom.xml`) and Gradle (`build.gradle`). Ensure one of these files exists in the target directory.

### ⚠️ Error: "No XML reports found"
This usually means the tests didn't run at all or failed to generate reports.

**Resolution Steps:**
1.  **Run manually first:** Try running `mvn test` in your project folder to ensure Maven is installed and your tests are valid.
2.  **Check `target` folder:** Ensure Maven is generating XML files in `target/surefire-reports`.
3.  **Check Plugin Config:** Ensure `testFailureIgnore` is set to `true` in your `pom.xml` (see Step 3 in the Step-by-Step guide).

---

## 🔗 Links

- [npm Package](https://www.npmjs.com/package/selenium-flaky-detector)
- [GitHub Repository](https://github.com/mvsaran/selenium-flaky-detector)
- [Report Issues](https://github.com/mvsaran/selenium-flaky-detector/issues)
- [Changelog](CHANGELOG.md)

---

## 📄 License

MIT © [SeleniumFlaky Contributors](https://github.com/mvsaran/selenium-flaky-detector)
