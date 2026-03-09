package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

import static org.assertj.core.api.Assertions.*;

/**
 * 🟡 05 · Search & Session Tests [MIXED — Some Flaky, Some Stable]
 * ===================================================================
 */
public class SearchAndSessionTest extends ShopFlakeBaseTest {

    /**
     * 🟢 STABLE: Search input exists and accepts text
     */
    @Test
    public void searchInputAcceptsText() {
        navigate("/");

        WebElement input = waitForElement(By.id("search-input"));
        input.sendKeys("java");
        assertThat(input.getAttribute("value")).isEqualTo("java");
    }

    /**
     * 🟡 MILDLY FLAKY: Status bar should update with search result
     * The search API has 0–800ms delay; we only wait 600ms. But the status bar
     * might still show "Loaded N products" from the initial load, which is also
     * valid. This test only flakes if both loads race past the 600ms window.
     */
    @Test
    public void searchStatusUpdates() throws InterruptedException {
        navigate("/");
        Thread.sleep(1200); // Let initial product load settle

        WebElement input = waitForElement(By.id("search-input"));
        input.sendKeys("shoe");

        // ❌ FLAKINESS: Search API has 0–800ms delay; we only wait 600ms
        Thread.sleep(600);

        WebElement status = driver.findElement(By.id("status-bar"));
        String statusText = status.getText();

        // Accept: "N result(s) for..." OR "Loaded N products" (when search is too slow)
        // Flakes when status still shows "Fetching" (page hasn't loaded at all yet)
        assertThat(statusText)
                .as("Status should show search results or loaded products")
                .containsPattern("(?:result|Search|Loaded)");
    }

    /**
     * 🟡 FLAKY: Session state is unpredictable (25% expired)
     * Tests that user is logged in — fails 25% of time when session expires.
     */
    @Test
    public void userSessionActive() throws InterruptedException {
        // Hit the session API directly via JS
        navigate("/");
        Thread.sleep(200);

        // Execute API call via JavaScript
        JavascriptExecutor js = (JavascriptExecutor) driver;

        // Fetch session status
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> session = (java.util.Map<String, Object>) js.executeScript(
                "const response = await fetch('/api/user/session');" +
                        "return await response.json();");

        // ❌ FLAKINESS: 25% chance session is expired
        assertThat(session.get("loggedIn"))
                .as("User session should be active")
                .isEqualTo(true);
    }

    /**
     * 🟢 STABLE: Reload button is always present
     */
    @Test
    public void reloadButtonClickable() {
        navigate("/");

        WebElement reloadBtn = waitForClickable(By.id("reload-btn"));
        assertThat(reloadBtn.isDisplayed()).isTrue();
        assertThat(reloadBtn.isEnabled()).isTrue();
    }

    /**
     * 🟡 FLAKY: Cart badge count race — check via JS
     */
    @Test
    public void cartBadgeStartsAtZero() {
        navigate("/");

        // Short wait for page to settle
        new WebDriverWait(driver, Duration.ofSeconds(2))
                .until(ExpectedConditions.presenceOfElementLocated(By.id("nav-cart-count")));

        WebElement badge = driver.findElement(By.id("nav-cart-count"));
        assertThat(badge.getText())
                .as("Cart badge should start at 0 on page load")
                .isEqualTo("0");
    }
}
