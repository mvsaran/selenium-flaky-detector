package io.shopflake.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.*;
import org.openqa.selenium.support.ui.*;
import org.testng.annotations.*;

import java.time.Duration;

/**
 * Base class for all ShopFlake Selenium tests.
 * =============================================
 * Handles WebDriver setup/teardown and provides utility methods.
 * ChromeDriver is managed automatically by WebDriverManager.
 */
public abstract class ShopFlakeBaseTest {

    protected WebDriver driver;
    protected WebDriverWait wait;

    protected static final String BASE_URL = System.getProperty("app.url", "http://localhost:8080");
    protected static final boolean HEADLESS = Boolean.parseBoolean(System.getProperty("selenium.headless", "true"));

    @BeforeMethod
    public void setUp() {
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        if (HEADLESS) {
            options.addArguments("--headless=new");
        }
        options.addArguments(
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--window-size=1280,800",
                "--disable-extensions",
                "--disable-infobars");

        driver = new ChromeDriver(options);
        // Short implicit wait intentionally — to expose timing flakiness
        driver.manage().timeouts().implicitlyWait(Duration.ofMillis(500));
        wait = new WebDriverWait(driver, Duration.ofSeconds(5));
    }

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            try {
                driver.quit();
            } catch (Exception ignored) {
            }
        }
    }

    // ─── Utility helpers ──────────────────────────────────────────────────

    protected void navigate(String path) {
        driver.get(BASE_URL + path);
    }

    /**
     * Wait for an element to be present in the DOM.
     * Uses a short timeout intentionally to expose timing issues.
     */
    protected WebElement waitForElement(By locator) {
        return new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    protected WebElement waitForClickable(By locator) {
        return new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.elementToBeClickable(locator));
    }

    protected java.util.List<WebElement> waitForElements(By locator) {
        new WebDriverWait(driver, Duration.ofSeconds(5))
                .until(ExpectedConditions.presenceOfElementLocated(locator));
        return driver.findElements(locator);
    }
}
