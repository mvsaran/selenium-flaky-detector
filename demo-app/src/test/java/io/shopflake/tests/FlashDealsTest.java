package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;

import static org.assertj.core.api.Assertions.*;

/**
 * 🔴 03 · Flash Deals Tests [VERY FLAKY — 50/50]
 * ==================================================
 */
public class FlashDealsTest extends ShopFlakeBaseTest {

    /**
     * 🔴 MAXIMALLY FLAKY: Deal title only present 50% of the time
     * Entropy score = 4 × 0.5 × 0.5 × 100 = 100% — perfectly flaky
     */
    @Test
    public void flashDealTitleVisible() throws InterruptedException {
        navigate("/deals");

        // Wait for API (300–800ms delay)
        Thread.sleep(800);

        try {
            WebElement title = driver.findElement(By.id("flash-deal-title"));
            // ❌ FLAKINESS: Element doesn't exist 50% of the time (no deal)
            assertThat(title.isDisplayed())
                    .as("Flash deal title should be visible when a deal is active")
                    .isTrue();
            assertThat(title.getText())
                    .contains("FLASH DEAL");
        } catch (NoSuchElementException e) {
            fail("NoSuchElementException — flash deal not available in this run. " +
                    "Root cause: NoSuchElementException (50% occurrence rate)");
        }
    }

    /**
     * 🔴 MAXIMALLY FLAKY: Deal price only present 50% of the time
     */
    @Test
    public void flashDealPrice() throws InterruptedException {
        navigate("/deals");
        Thread.sleep(900);

        try {
            WebElement price = driver.findElement(By.id("flash-deal-price"));
            assertThat(price.getText())
                    .as("Deal price should be $49.99")
                    .isEqualTo("$49.99");
        } catch (NoSuchElementException e) {
            fail("NoSuchElementException — deal not available. " +
                    "Root cause: NoSuchElementException");
        }
    }

    /**
     * 🔴 MAXIMALLY FLAKY: Deal timer is present 50% of the time
     * Even when present, the value changes (1–59s) — can't assert exact value.
     */
    @Test
    public void dealTimerShowsSeconds() throws InterruptedException {
        navigate("/deals");
        Thread.sleep(800);

        try {
            WebElement timer = driver.findElement(By.id("flash-deal-timer"));
            String timerText = timer.getText();
            // ❌ FLAKINESS: timer value is random AND element may not exist
            assertThat(timerText)
                    .as("Timer should contain 's' for seconds")
                    .containsPattern("\\d+s");
        } catch (NoSuchElementException e) {
            fail("NoSuchElementException — deal timer not visible (no deal this run). " +
                    "Root cause: NoSuchElementException");
        }
    }

    /**
     * 🔴 VERY FLAKY: Grab deal button only present 50% of the time
     */
    @Test
    public void grabDealButtonClickable() throws InterruptedException {
        navigate("/deals");
        Thread.sleep(900);

        try {
            WebElement grabBtn = new WebDriverWait(driver, Duration.ofSeconds(2))
                    .until(ExpectedConditions.elementToBeClickable(By.id("grab-deal-btn")));
            grabBtn.click();
            // If we get here without exception, test passes
        } catch (TimeoutException e) {
            // Button not present — deal not available this run
            fail("TimeoutException waiting for grab-deal button — deal not available. " +
                    "Root cause: TimeoutException");
        }
    }

    /**
     * 🟢 STABLE: The reload button is always present regardless of deal state
     */
    @Test
    public void reloadDealButtonAlwaysVisible() {
        navigate("/deals");

        WebElement reloadBtn = waitForElement(By.id("reload-deal"));
        assertThat(reloadBtn.isDisplayed()).isTrue();
        assertThat(reloadBtn.getText()).contains("Check Again");
    }
}
