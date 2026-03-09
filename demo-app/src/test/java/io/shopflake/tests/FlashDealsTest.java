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
    public void flashDealTitleVisible() {
        navigate("/deals");

        try {
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));
            WebElement title = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("flash-deal-title")));
            assertThat(title.isDisplayed())
                    .as("Flash deal title should be visible when a deal is active")
                    .isTrue();
            assertThat(title.getText()).contains("FLASH DEAL");
        } catch (TimeoutException e) {
            throw new org.testng.SkipException("Deal not available in this run");
        }
    }

    /**
     * 🔴 MAXIMALLY FLAKY: Deal price only present 50% of the time
     */
    @Test
    public void flashDealPrice() {
        navigate("/deals");

        try {
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));
            WebElement price = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("flash-deal-price")));
            assertThat(price.getText())
                    .as("Deal price should be $49.99")
                    .isEqualTo("$49.99");
        } catch (TimeoutException e) {
            throw new org.testng.SkipException("Deal not available in this run");
        }
    }

    /**
     * 🔴 MAXIMALLY FLAKY: Deal timer is present 50% of the time
     * Even when present, the value changes (1–59s) — can't assert exact value.
     */
    @Test
    public void dealTimerShowsSeconds() {
        navigate("/deals");

        try {
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(3));
            WebElement timer = wait.until(ExpectedConditions.presenceOfElementLocated(By.id("flash-deal-timer")));
            String timerText = timer.getText();
            assertThat(timerText)
                    .as("Timer should contain 's' for seconds")
                    .containsPattern("\\d+s");
        } catch (TimeoutException e) {
            throw new org.testng.SkipException("Deal not available in this run");
        }
    }

    /**
     * 🔴 VERY FLAKY: Grab deal button only present 50% of the time
     */
    @Test
    public void grabDealButtonClickable() {
        navigate("/deals");

        try {
            WebElement grabBtn = new WebDriverWait(driver, Duration.ofSeconds(3))
                    .until(ExpectedConditions.elementToBeClickable(By.id("grab-deal-btn")));
            grabBtn.click();
            // If we get here without exception, test passes
        } catch (TimeoutException e) {
            // Button not present — deal not available this run
            throw new org.testng.SkipException("Deal not available in this run");
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
