package com.shenest;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** HTTP routes delegate processing to the Spring service. */
@RestController
@RequestMapping("/api/properties")
public class PropertyController {
    private final PropertyService service;
    private final AuthService authentication;

    public PropertyController(PropertyService service, AuthService authentication) {
        this.service = service;
        this.authentication = authentication;
    }

    @GetMapping({"", "/"})
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String type) {
        return service.list(search, type);
    }

    @GetMapping("/mine")
    public List<Map<String, Object>> mine(HttpServletRequest request) {
        return service.mine(authentication.requireLoggedInUser(request));
    }

    @GetMapping("/pending")
    public List<Map<String, Object>> pending(HttpServletRequest request) {
        return service.pending(authentication.requireLoggedInUser(request));
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping({"", "/"})
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.create(body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/{id}/details")
    public Map<String, Object> details(@PathVariable long id) {
        return service.details(id);
    }

    @PatchMapping("/{id}/details")
    public Map<String, Object> updateDetails(
            @PathVariable long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        return service.updateDetails(id, body, authentication.requireLoggedInUser(request));
    }

    @PatchMapping("/{id}/verify")
    public Map<String, Object> verify(@PathVariable long id, HttpServletRequest request) {
        return service.verify(id, authentication.requireLoggedInUser(request));
    }
}
