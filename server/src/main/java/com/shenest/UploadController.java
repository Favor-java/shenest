package com.shenest;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

/** HTTP routes delegate processing to the Spring service. */
@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final UploadService service;
    private final AuthService authentication;

    public UploadController(UploadService service, AuthService authentication) {
        this.service = service;
        this.authentication = authentication;
    }

    @PostMapping("/property-image")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> upload(
            @RequestParam(required = false) MultipartFile image, HttpServletRequest request)
            throws IOException {
        return service.upload(image, authentication.requireLoggedInUser(request),
                ServletUriComponentsBuilder.fromCurrentContextPath().toUriString());
    }
}
