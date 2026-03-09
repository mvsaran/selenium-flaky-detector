package io.shopflake;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ShopFlake Demo Application
 * ===========================
 * A Spring Boot e-commerce demo intentionally designed with sources
 * of flakiness for the Selenium Flaky Detector demonstration.
 *
 * Flakiness sources:
 *   - Network delays (random 0–2000ms on API endpoints)
 *   - Race conditions (products loaded async via JS)
 *   - Flash deals with 50/50 availability chance
 *   - Authentication session inconsistency
 *   - Cart state race with concurrent requests
 */
@SpringBootApplication
public class ShopFlakeApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShopFlakeApplication.class, args);
    }
}
