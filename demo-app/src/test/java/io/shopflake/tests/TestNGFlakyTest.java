package io.shopflake.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.*;
import org.openqa.selenium.support.ui.*;
import org.testng.annotations.*;
import org.testng.Assert;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TestNG-based Flaky Test
 * ========================
 * Demonstrates support for Maven + TestNG framework.
 */
public class TestNGFlakyTest {

    private WebDriver driver;
    private static final String BASE_URL = System.getProperty("app.url", "http://localhost:8080");
    private static final boolean HEADLESS = Boolean.parseBoolean(System.getProperty("selenium.headless", "true"));

    @BeforeMethod
    public void setUp() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        if (HEADLESS) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--window-size=1280,800", "--no-sandbox", "--disable-dev-shm-usage");
        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofMillis(500));
    }

    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    /**
     * 🟢 STABLE: Home page loads correctly
     */
    @Test
    public void testNGHomePageStable() {
        driver.get(BASE_URL + "/");
        Assert.assertEquals(driver.getTitle(), "ShopFlake · E-Commerce Demo");
    }

    /**
     * 🟡 FLAKY: Flash deals are only available 50% of the time.
     * This will fail in TestNG exactly like it does in JUnit.
     */
    @Test
    public void testNGFlashDealFlaky() {
        driver.get(BASE_URL + "/deals");

        // Wait for either the deal or the "no deal" message to appear
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
        WebElement element = wait.until(d -> {
            try {
                return d.findElement(By.id("flash-deal-title"));
            } catch (Exception e) {
            }
            try {
                return d.findElement(By.id("no-deal-msg"));
            } catch (Exception e) {
            }
            return null;
        });

        // This will be flaky because flash-deal-title is only there 50% of the time
        Assert.assertEquals(element.getAttribute("id"), "flash-deal-title", "Flash deal should be available!");
        assertThat(element.getText()).contains("FLASH DEAL");
    }

    /**
     * 🟡 FLAKY: Product count mismatch
     * AssertJ assertion will be caught by our RCA analyzer.
     */
    @Test
    public void testNGProductCountFlaky() throws InterruptedException {
        driver.get(BASE_URL + "/");
        // Random 0-1500ms delay in app, 800ms wait is flaky
        Thread.sleep(800);

        List<WebElement> products = driver.findElements(By.className("product-card"));
        assertThat(products.size())
                .as("Should have exactly 12 products")
                .isEqualTo(12);
    }
}
