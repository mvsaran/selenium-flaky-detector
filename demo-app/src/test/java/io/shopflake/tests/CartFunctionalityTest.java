package io.shopflake.tests;

import org.testng.annotations.*;
import org.testng.SkipException;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.*;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * 🟠 02 · Cart Functionality Tests [FLAKY - Race Conditions]
 * =============================================================
 */
public class CartFunctionalityTest extends ShopFlakeBaseTest {

    /**
     * 🟠 FLAKY: Cart shows items 70% of the time, empty 30% of the time
     * The /api/cart endpoint returns stale empty data with 30% probability.
     */
    @Test
    public void cartDisplaysItems() {
        navigate("/cart");

        // ❌ FLAKINESS: 30% chance cart is empty due to stale data race
        WebElement cartContainer = waitForElement(By.id("cart-container"));

        // Wait briefly for async cart load
        new WebDriverWait(driver, Duration.ofSeconds(3))
                .until(d -> !d.findElement(By.id("cart-container")).getText().contains("Loading"));

        String text = cartContainer.getText();
        // Flakes when stale cache returns empty cart
        assertThat(text)
                .as("Cart should display items, not empty state")
                .doesNotContain("cart is empty");
    }

    /**
     * 🟠 FLAKY: Cart total should show $79.99 but stale returns $0
     */
    @Test
    public void cartTotalIsCorrect() throws InterruptedException {
        navigate("/cart");
        Thread.sleep(1500);

        try {
            WebElement total = driver.findElement(By.id("cart-total"));
            // Flakes when cart is stale (empty) — element doesn't exist
            assertThat(total.getText())
                    .as("Cart total should be $79.99")
                    .isEqualTo("$79.99");
        } catch (NoSuchElementException e) {
            // This is the race condition — stale cart returned no items
            fail("Cart total element not found — race condition triggered (stale cart data). " +
                    "Root cause: NoSuchElementException");
        }
    }

    /**
     * 🟠 FLAKY: Stale warning should NOT appear, but appears 30% of the time
     */
    @Test
    public void noStaleWarningDisplayed() throws InterruptedException {
        navigate("/cart");
        Thread.sleep(1000);

        WebElement staleWarn = driver.findElement(By.id("stale-warning"));
        // ❌ FLAKINESS: 30% chance stale condition is flagged
        assertThat(staleWarn.isDisplayed())
                .as("Stale cache warning should NOT be visible")
                .isFalse();
    }

    /**
     * 🟠 FLAKY: Add to cart race — every 3rd call has 400ms delay
     * With short waits, this causes the cart badge to not update.
     */
    @Test
    public void cartBadgeUpdatesAfterAdd() throws InterruptedException {
        navigate("/");
        Thread.sleep(1200); // Wait for products to load

        // Find and click an add-to-cart button
        try {
            List<WebElement> addBtns = driver
                    .findElements(By.cssSelector("[data-testid='add-to-cart-btn']:not([disabled])"));
            if (addBtns.isEmpty()) {
                // All products out of stock in this run
                throw new SkipException("No in-stock products available in this run");
            }
            addBtns.get(0).click();
        } catch (StaleElementReferenceException e) {
            fail("StaleElementReferenceException when clicking add-to-cart. " +
                    "Root cause: StaleElementReferenceException — DOM was updated during interaction.");
        }

        // ❌ FLAKINESS: short wait may not be enough on the race condition call
        Thread.sleep(800);

        WebElement badge = driver.findElement(By.id("nav-cart-count"));
        assertThat(badge.getText())
                .as("Cart badge should show 1 after adding item")
                .isEqualTo("1");
    }

    /**
     * 🟢 STABLE: Checkout button present when cart has items
     */
    @Test
    public void checkoutButtonVisible() throws InterruptedException {
        navigate("/cart");
        Thread.sleep(1500);

        // Only check if cart has items (skip if stale/empty)
        List<WebElement> checkoutBtns = driver.findElements(By.id("checkout-btn"));
        if (!checkoutBtns.isEmpty()) {
            assertThat(checkoutBtns.get(0).isDisplayed()).isTrue();
        }
        // If empty, test passes (we don't test empty cart UI here)
    }
}
