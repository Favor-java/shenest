package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** HTTP routes delegate processing to the Spring service. */
@RestController
@RequestMapping("/api")
public class SafetyController {
    private final SafetyService service;
    private final AuthService authentication;

    public SafetyController(SafetyService service, AuthService authentication) {
        this.service = service;
        this.authentication = authentication;
    }

    @GetMapping("/blocks")
    public List<Map<String, Object>> blocks(HttpServletRequest request) {
        return service.blocks(authentication.requireLoggedInUser(request));
    }

    @PutMapping("/blocks/{userId}")
    public Map<String, Boolean> block(@PathVariable long userId, HttpServletRequest request) {
        return service.block(userId, authentication.requireLoggedInUser(request));
    }

    @DeleteMapping("/blocks/{userId}")
    public Map<String, Boolean> unblock(@PathVariable long userId, HttpServletRequest request) {
        return service.unblock(userId, authentication.requireLoggedInUser(request));
    }

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> report(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.report(body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/reports/mine")
    public List<Map<String, Object>> myReports(HttpServletRequest request) {
        return service.myReports(authentication.requireLoggedInUser(request));
    }

    @GetMapping("/admin/reports")
    public List<Map<String, Object>> adminReports(HttpServletRequest request) {
        return service.adminReports(authentication.requireLoggedInUser(request));
    }

    @PatchMapping("/admin/reports/{id}")
    public Map<String, Object> review(@PathVariable long id, @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        return service.review(id, body, authentication.requireLoggedInUser(request));
    }
}
