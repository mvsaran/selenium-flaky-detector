package io.shopflake.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the ShopFlake demo HTML pages via Thymeleaf templates.
 */
@Controller
public class ShopController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/cart")
    public String cart() {
        return "cart";
    }

    @GetMapping("/deals")
    public String deals() {
        return "deals";
    }
}
