package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * 🟡 01 · Product Loading Tests [FLAKY]
 * ========================================
 */
public class ProductLoadingTest extends ShopFlakeBaseTest {

    /**
     * 🟡 FLAKY: Product count varies between 11 and 12
     * API randomly returns 11 or 12 products.
     * Test expects exactly 12 → fails ~50% of the time.
     */
    @Test
    public void productImagesVisible() throws InterruptedException {
        navigate("/");

        // ❌ FLAKINESS: Short fixed sleep instead of explicit wait
        Thread.sleep(1000); // Not enough if API takes >1000ms

        List<WebElement> cards = driver.findElements(By.cssSelector("[data-testid='product-card']"));

        // This assertion FLAKES because the API returns 11 or 12 products randomly
        assertThat(cards.size())
                .as("Product grid should contain exactly 12 products")
                .isEqualTo(12); // Fails ~50% due to API variability
    }

    /**
     * 🟡 FLAKY: Status bar may still say "Fetching" when API takes > 700ms
     * With a random 0–1500ms delay, a 700ms sleep gives ~50% chance of catching
     * the "Loaded" text before assertion — creating genuine flakiness.
     */
    @Test
    public void footerCopyrightAlwaysPresent() throws InterruptedException {
        navigate("/");

        // ✅ FIXED: Replaced arbitrary sleep with an explicit wait for the text to
        // appear
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

    /**
     * 🟢 STABLE: Navigation elements are always present
     * These don't depend on async data.
     */
    @Test
    public void navigationBarVisible() {
        navigate("/");

        WebElement brand = waitForElement(By.cssSelector("nav .brand"));
        assertThat(brand.getText()).contains("ShopFlake");

        WebElement cartLink = driver.findElement(By.linkText("Cart"));
        assertThat(cartLink.isDisplayed()).isTrue();
    }

    /**
     * 🟡 FLAKY: At least one product has stock status that randomly flips
     * The first product card's stock badge changes between in-stock/out-of-stock.
     */
    @Test
    public void checkProductPricesDefined() throws InterruptedException {
        navigate("/");
        Thread.sleep(1200); // Sometimes not enough

        WebElement firstCard = waitForElement(By.id("product-1"));
        String stockText = firstCard.findElement(By.cssSelector(".stock-badge")).getText();

        // ❌ FLAKINESS: API randomly sets inStock=true/false
        assertThat(stockText)
                .as("First product should be in stock")
                .contains("In Stock");
    }

    /**
     * 🟡 FLAKY: Add-to-cart button state depends on stock which flips randomly
     */
    @Test
    public void addToCartButtonEnabled() throws InterruptedException {
        navigate("/");
        Thread.sleep(1000);

        WebElement addBtn = waitForElement(By.id("add-btn-1"));
        // Flakes because button is disabled when product is out-of-stock (random)
        assertThat(addBtn.isEnabled())
                .as("Add to cart button should be enabled for in-stock product")
                .isTrue();
    }
}
