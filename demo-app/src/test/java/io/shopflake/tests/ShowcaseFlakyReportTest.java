package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

/**
 * 👑 FLAKINESS SHOWCASE TEST
 * ========================================
 * This class is designed for demonstrations. It contains:
 * 1. 🟢 A Stable Test (0% Flaky)
 * 2. 🟡 An Async Race (Mildly Flaky)
 * 3. 💀 A Coin-Flip Test (100% Flaky/Max Entropy)
 * 4. 🔴 A Consistent Bug (0% Flaky - just broken)
 * 5. ♻️ A Stale Element Race (Auto-RCA demo)
 */
public class ShowcaseFlakyReportTest extends ShopFlakeBaseTest {

    /**
     * Case 1: 🟢 STABLE TEST
     * Predictable, always passes. Shows as 0% Entropy.
     */
    @Test
    public void stable_NavigationCheck() {
        navigate("/");
        WebElement brand = waitForElement(By.cssSelector("nav .brand"));
        assertThat(brand.getText()).contains("ShopFlake");
    }

    /**
     * Case 2: 🟡 MILDLY FLAKY (ASYNC RACE)
     * Fails about 30% of the time because it uses a short sleep
     * while the backend randomly takes up to 1500ms.
     */
    @Test
    public void flaky_AsyncTimingRace() throws InterruptedException {
        navigate("/");
        // 🚨 Problem: 300ms is not long enough for the backend random delay
        Thread.sleep(300);

        WebElement statusBar = driver.findElement(By.id("status-bar"));
        assertThat(statusBar.getText())
                .as("Status should be Loaded, but timing is too tight!")
                .contains("Loaded");
    }

    /**
     * Case 3: 💀 MAXIMALLY FLAKY (100% ENTROPY)
     * The /api/flash-deals endpoint is programmed 50/50.
     * This is the "Worst Case" for CI/CD trust.
     */
    @Test
    public void extreme_FlashDealsCoinFlip() {
        navigate("/deals");

        // Wait for results
        waitForElement(By.id("deals-container"));

        List<WebElement> deals = driver.findElements(By.cssSelector(".deal-card"));

        // 🚨 Problem: Backend randomly returns 1 or 2 deals (50/50)
        assertThat(deals.size())
                .as("Expect 2 deals, but backend is a coin flip!")
                .isEqualTo(2);
    }

    /**
     * Case 4: 🔴 CONSISTENTLY BROKEN (STABLE BUG)
     * Always fails. Shows as 0% Entropy Score (Predictable Bug).
     * This helps distinguish between Flakiness and simple Bugs.
     */
    @Test
    public void broken_ElementNotFound() {
        navigate("/");
        // 🚨 Problem: This ID does not exist in the HTML
        driver.findElement(By.id("missing-social-icon")).isDisplayed();
    }

    /**
     * Case 5: ♻️ STALE ELEMENT RCA DEMO
     * This test triggers a manual StaleElementReferenceException trace
     * to show how the Root Cause Analyzer (RCA) works.
     */
    @Test
    public void rca_StaleElementTrigger() {
        navigate("/");

        // 🚨 Problem: This logic is intentionally designed to trigger Stale Element
        // to showcase the RCA tagging feature.
        try {
            WebElement homeBtn = driver.findElement(By.linkText("Home"));
            driver.navigate().refresh(); // DOM changes
            homeBtn.click(); // BOOM: StaleElementReferenceException
        } catch (StaleElementReferenceException e) {
            fail("Simulating StaleElementReferenceException for RCA demonstration: " + e.getMessage());
        }
    }
}
