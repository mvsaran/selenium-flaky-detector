package io.shopflake.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * REST API Controller — Intentional Flakiness Sources
 * =====================================================
 * This controller simulates real-world flakiness scenarios:
 *
 * GET /api/products — Random delay (0–1500ms). Simulates slow network.
 * GET /api/cart — 30% chance of returning stale/empty cart.
 * GET /api/deals — 50/50 flash deal availability. Maximally flaky.
 * POST /api/cart/add — Occasional race condition (200ms delay once per 3
 * calls).
 * GET /api/search — Async delay 0–800ms. Results count may vary.
 * GET /api/user/session — 25% chance of returning expired session.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    private static final Random RANDOM = ThreadLocalRandom.current();
    private final AtomicInteger addCartCallCount = new AtomicInteger(0);

    // ─── Products Endpoint (flakiness: random delay) ──────────────────────
    @GetMapping("/products")
    public ResponseEntity<List<Map<String, Object>>> getProducts(
            @RequestParam(defaultValue = "") String category) throws InterruptedException {

        // 🔥 FLAKINESS SOURCE 1: Random network delay (0–1500ms)
        int delay = RANDOM.nextInt(1500);
        Thread.sleep(delay);

        List<Map<String, Object>> products = new ArrayList<>();
        String[] categories = { "Electronics", "Clothing", "Books", "Food", "Sports" };
        String[] names = {
                "Wireless Headphones", "Premium T-Shirt", "Java Programming Guide",
                "Organic Coffee", "Running Shoes", "Smart Watch", "Hoodie",
                "Design Patterns Book", "Protein Bar", "Yoga Mat",
                "Earbuds", "Denim Jacket", "Spring Boot in Action",
                "Green Tea", "Tennis Racket"
        };

        // 🔥 FLAKINESS SOURCE 2: Product count varies randomly (11–12 items)
        // This causes assertion failures when tests check for exactly 12 items
        int count = RANDOM.nextBoolean() ? 12 : 11;

        for (int i = 0; i < count; i++) {
            Map<String, Object> product = new HashMap<>();
            product.put("id", i + 1);
            product.put("name", names[i % names.length]);
            product.put("price", 9.99 + (i * 10.5));
            product.put("category", categories[i % categories.length]);
            product.put("inStock", RANDOM.nextBoolean()); // 🔥 FLAKINESS: stock status flips
            product.put("rating", 3.0 + RANDOM.nextDouble() * 2.0);
            products.add(product);
        }

        return ResponseEntity.ok(products);
    }

    // ─── Cart Endpoint (flakiness: stale data 30% of the time) ───────────
    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart() {
        Map<String, Object> response = new HashMap<>();

        // 🔥 FLAKINESS SOURCE 3: 30% chance of returning empty/stale cart
        if (RANDOM.nextInt(10) < 3) {
            response.put("items", Collections.emptyList());
            response.put("total", 0.0);
            response.put("stale", true); // Simulates cache invalidation race
            return ResponseEntity.ok(response);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> item = new HashMap<>();
        item.put("id", 1);
        item.put("name", "Wireless Headphones");
        item.put("quantity", 1);
        item.put("price", 79.99);
        items.add(item);

        response.put("items", items);
        response.put("total", 79.99);
        response.put("stale", false);
        return ResponseEntity.ok(response);
    }

    // ─── Flash Deals (flakiness: 50/50 availability — MAXIMALLY FLAKY) ──
    @GetMapping("/deals")
    public ResponseEntity<Map<String, Object>> getFlashDeals() throws InterruptedException {
        // 🔥 FLAKINESS SOURCE 4: 500ms async delay for deal computation
        Thread.sleep(RANDOM.nextInt(500) + 300);

        Map<String, Object> response = new HashMap<>();
        boolean dealAvailable = RANDOM.nextBoolean(); // Perfect 50/50 split

        response.put("dealAvailable", dealAvailable);
        response.put("dealTitle", dealAvailable ? "⚡ FLASH DEAL: 50% OFF Smart Watch!" : "No deals available");
        response.put("dealPrice", dealAvailable ? 49.99 : null);
        response.put("expiresIn", dealAvailable ? (RANDOM.nextInt(59) + 1) + "s" : null); // 🔥 Timer value flips
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    // ─── Add to Cart (flakiness: race condition every 3rd call) ──────────
    @PostMapping("/cart/add")
    public ResponseEntity<Map<String, Object>> addToCart(@RequestBody Map<String, Object> payload)
            throws InterruptedException {

        int callNum = addCartCallCount.incrementAndGet();

        // 🔥 FLAKINESS SOURCE 5: Simulated race condition every 3rd call
        if (callNum % 3 == 0) {
            Thread.sleep(400); // Simulates DB lock contention
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Added to cart");
        response.put("cartCount", callNum);
        return ResponseEntity.ok(response);
    }

    // ─── Search (flakiness: variable result count) ────────────────────────
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String q) throws InterruptedException {

        // 🔥 FLAKINESS SOURCE 6: Async search delay 0–800ms
        Thread.sleep(RANDOM.nextInt(800));

        List<String> results = new ArrayList<>();
        // Vary result count to cause assertion flakiness
        int count = RANDOM.nextInt(3) + 2; // returns 2, 3, or 4 results
        for (int i = 0; i < count; i++) {
            results.add("Result for '" + q + "' item " + (i + 1));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("query", q);
        response.put("results", results);
        response.put("count", results.size());
        return ResponseEntity.ok(response);
    }

    // ─── User Session (flakiness: 25% expired session) ───────────────────
    @GetMapping("/user/session")
    public ResponseEntity<Map<String, Object>> getSession() {
        Map<String, Object> response = new HashMap<>();

        // 🔥 FLAKINESS SOURCE 7: 25% expired session
        boolean expired = RANDOM.nextInt(4) == 0;
        response.put("loggedIn", !expired);
        response.put("username", expired ? null : "john.doe@example.com");
        response.put("sessionExpired", expired);
        return ResponseEntity.ok(response);
    }
}
