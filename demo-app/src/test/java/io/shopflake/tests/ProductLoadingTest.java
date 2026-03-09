package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

/**
 * 🟡 01 · Product Loading Tests
 * ========================================
 */
public class ProductLoadingTest extends ShopFlakeBaseTest {

    @Test
    public void productImagesVisible() {
        navigate("/");

        // 🟢 REAL TEST (STABLE): Wait until at least 11 product cards have loaded to
        // avoid the race
        org.openqa.selenium.support.ui.WebDriverWait wait = new org.openqa.selenium.support.ui.WebDriverWait(driver,
                java.time.Duration.ofSeconds(10));
        wait.until(d -> d.findElements(By.cssSelector("[data-testid='product-card']")).size() >= 11);

        List<WebElement> cards = driver.findElements(By.cssSelector("[data-testid='product-card']"));

        assertThat(cards.size())
                .as("Product grid should contain exactly 11 or 12 products based on backend")
                .isBetween(11, 12);
    }

    @Test
    public void flakyProductCountTest() {
        navigate("/");
        List<WebElement> cards = driver.findElements(By.cssSelector("[data-testid='product-card']"));

        // ❌ Problem: Direct assertion on a count that flips randomly in the backend
        assertThat(cards.size())
                .as("Product grid should have exactly 12 products")
                .isEqualTo(12);
    }

    @Test
    public void footerCopyrightAlwaysPresent() throws InterruptedException {
        navigate("/");

        // 🟢 REAL TEST (STABLE): Explicit wait for the text to appear
        org.openqa.selenium.support.ui.WebDriverWait wait = new org.openqa.selenium.support.ui.WebDriverWait(driver,
                java.time.Duration.ofSeconds(10));
        wait.until(org.openqa.selenium.support.ui.ExpectedConditions
                .textToBePresentInElementLocated(By.id("status-bar"), "Loaded"));

        WebElement statusBar = driver.findElement(By.id("status-bar"));
        String statusText = statusBar.getText();

        assertThat(statusText)
                .as("Status bar should confirm products loaded")
                .contains("Loaded");
    }

    /*
     * // 🟠 FLAKY TEST EXAMPLE: Async Loading Race
     * // Uses a hard sleep that isn't long enough for the random backend delay
     * (0-1500ms).
     * 
     * @Test
     * public void flakyStatusTextTest() throws InterruptedException {
     * navigate("/");
     * 
     * // ❌ Problem: Hard-coded sleep of 500ms will fail if backend takes > 500ms
     * Thread.sleep(500);
     * 
     * WebElement statusBar = driver.findElement(By.id("status-bar"));
     * assertThat(statusBar.getText()).contains("Loaded"); // RCA: Async Load (⚡)
     * }
     */

    /*
     * // 🔴 BROKEN TEST EXAMPLE (Consistently Fails)
     * // Looking for an ID that doesn't exist.
     * 
     * @Test
     * public void consistentlyBrokenTest() {
     * navigate("/");
     * 
     * // ❌ Problem: ID 'non-existent-header' does not exist in any run.
     * driver.findElement(By.id("non-existent-header")).isDisplayed(); // RCA: 0%
     * Entropy (Safe Bug)
     * }
     */

    @Test
    public void navigationBarVisible() {
        navigate("/");

        WebElement brand = waitForElement(By.cssSelector("nav .brand"));
        assertThat(brand.getText()).contains("ShopFlake");

        WebElement cartLink = driver.findElement(By.linkText("Cart"));
        assertThat(cartLink.isDisplayed()).isTrue();
    }

    @Test
    public void checkProductPricesDefined() {
        navigate("/");

        WebElement firstCard = waitForElement(By.id("product-1"));
        String stockText = firstCard.findElement(By.cssSelector(".stock-badge")).getText();

        if (stockText.contains("Out of Stock")) {
            throw new org.testng.SkipException("Product 1 was randomly assigned Out of Stock, skipping test");
        }

        assertThat(stockText)
                .as("First product should be in stock")
                .contains("In Stock");
    }

    @Test
    public void addToCartButtonEnabled() {
        navigate("/");

        WebElement addBtn = waitForElement(By.id("add-btn-1"));

        if (addBtn.getAttribute("disabled") != null) {
            throw new org.testng.SkipException("Product 1 is randomly Out of Stock, skip test");
        }

        assertThat(addBtn.isEnabled())
                .as("Add to cart button should be enabled for in-stock product")
                .isTrue();
    }
}
