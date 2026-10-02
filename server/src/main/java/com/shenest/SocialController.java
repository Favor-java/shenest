package com.shenest;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** HTTP routes delegate processing to the Spring service. */
@RestController
@RequestMapping("/api")
public class SocialController {
    private final SocialService service;
    private final AuthService authentication;

    public SocialController(SocialService service, AuthService authentication) {
        this.service = service;
        this.authentication = authentication;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return service.health();
    }

    @GetMapping("/favorites")
    public List<Map<String, Object>> favorites(HttpServletRequest request) {
        return service.favorites(authentication.requireLoggedInUser(request));
    }

    @PostMapping("/favorites/{propertyId}")
    public Map<String, Boolean> toggleFavorite(
            @PathVariable long propertyId, HttpServletRequest request) {
        return service.toggleFavorite(propertyId, authentication.requireLoggedInUser(request));
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createBooking(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.createBooking(body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/bookings/mine")
    public List<Map<String, Object>> myBookings(HttpServletRequest request) {
        return service.myBookings(authentication.requireLoggedInUser(request));
    }

    @GetMapping("/bookings/landlord")
    public List<Map<String, Object>> landlordBookings(HttpServletRequest request) {
        return service.landlordBookings(authentication.requireLoggedInUser(request));
    }

    @PatchMapping("/bookings/{id}/status")
    public Map<String, Object> updateBookingStatus(
            @PathVariable long id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        return service.updateBookingStatus(id, body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/reviews/{propertyId}")
    public List<Map<String, Object>> reviews(@PathVariable long propertyId) {
        return service.reviews(propertyId);
    }

    @PostMapping("/reviews/{propertyId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addReview(
            @PathVariable long propertyId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        return service.addReview(propertyId, body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/roommates")
    public List<Map<String, Object>> roommates(@RequestParam(defaultValue = "") String location) {
        return service.roommates(location);
    }

    @PutMapping("/roommates/me")
    public Map<String, Object> saveRoommateProfile(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        return service.saveRoommateProfile(body, authentication.requireLoggedInUser(request));
    }

    @GetMapping("/messages/{userId}")
    public List<Map<String, Object>> messages(
            @PathVariable long userId, HttpServletRequest request) {
        return service.messages(userId, authentication.requireLoggedInUser(request));
    }

    @PostMapping("/messages/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> sendMessage(
            @PathVariable long userId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        return service.sendMessage(userId, body, authentication.requireLoggedInUser(request));
    }
}
