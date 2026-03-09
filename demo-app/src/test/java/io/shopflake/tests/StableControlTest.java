package io.shopflake.tests;

import org.testng.annotations.*;
import org.openqa.selenium.*;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * 🟢 04 · Stable Tests (Control Group)
 * ======================================
 */
public class StableControlTest extends ShopFlakeBaseTest {

    /**
     * 🟢 STABLE: Home page title is always the same
     */
    @Test
    public void homePageTitle() {
        navigate("/");
        assertThat(driver.getTitle())
                .as("Page title should be ShopFlake")
                .isEqualTo("ShopFlake · E-Commerce Demo");
    }

    /**
     * 🟢 STABLE: Navigation links are always present and correct
     */
    @Test
    public void navigationLinksPresent() {
        navigate("/");

        WebElement brand = waitForElement(By.cssSelector("nav .brand"));
        assertThat(brand.getText()).isEqualTo("🛒 ShopFlake");

        List<WebElement> links = driver.findElements(By.cssSelector("nav a"));
        assertThat(links).hasSize(3);

        assertThat(driver.findElement(By.linkText("Products")).getAttribute("href"))
                .endsWith("/");
        assertThat(driver.findElement(By.linkText("Cart")).getAttribute("href"))
                .endsWith("/cart");
    }

    /**
     * 🟢 STABLE: Cart page loads (even if empty)
     */
    @Test
    public void cartPageLoads() {
        navigate("/cart");

        WebElement container = waitForElement(By.id("cart-container"));
        assertThat(container).isNotNull();

        assertThat(driver.getTitle()).contains("Cart");
    }

    /**
     * 🟢 STABLE: Deals page hero section always renders
     */
    @Test
    public void dealsPageHero() {
        navigate("/deals");

        WebElement h1 = waitForElement(By.tagName("h1"));
        assertThat(h1.getText()).contains("Flash Deals");

        WebElement subtitle = driver.findElement(By.cssSelector(".subtitle"));
        assertThat(subtitle.isDisplayed()).isTrue();
    }

    /**
     * 🟢 STABLE: Home page filter input is always interactable
     */
    @Test
    public void searchInputInteractable() {
        navigate("/");

        WebElement input = waitForElement(By.id("search-input"));
        assertThat(input.isDisplayed()).isTrue();
        assertThat(input.isEnabled()).isTrue();

        // Can type into it
        input.sendKeys("headphones");
        assertThat(input.getAttribute("value")).isEqualTo("headphones");
    }
}
