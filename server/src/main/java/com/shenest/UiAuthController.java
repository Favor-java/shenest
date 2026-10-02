package com.shenest;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** HTTP routes delegate processing to the Spring service. */
@RestController
@RequestMapping("/ui")
public class UiAuthController {
    private final UiAuthService service;

    public UiAuthController(UiAuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.login(body, request);
    }

    @PostMapping("/register")
    public Map<String, Object> register(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.register(body, request);
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request) {
        return service.logout(request);
    }
}
