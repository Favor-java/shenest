package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;

/**
 * Helps the website remember who is logged in. It also checks a CSRF token before a browser changes
 * data. This prevents another website from submitting actions using a visitor's cookie.
 */
@Component
public class BrowserSession implements HandlerInterceptor {
    private final Database database;

    public BrowserSession(Database database) {
        this.database = database;
    }

    public Map<String, Object> getCurrentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }

        Object userId = session.getAttribute("userId");
        if (userId == null) {
            return null;
        }

        // Do not include the password hash in the data sent to an HTML template.
        return database.findOne("SELECT id, name, email, role FROM users WHERE id = ?", userId);
    }

    public String getCsrfToken(HttpServletRequest request) {
        HttpSession session = request.getSession();
        String token = (String) session.getAttribute("csrf");

        if (token == null) {
            token = UUID.randomUUID().toString();
            session.setAttribute("csrf", token);
        }

        return token;
    }

    // Spring calls this before the requested API or website-login method.
    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();
        if (method.equals("GET") || method.equals("HEAD") || method.equals("OPTIONS")) {
            return true;
        }

        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return true;
        }

        // API clients without a browser cookie keep their original login contract.
        HttpSession session = request.getSession(false);
        if (session == null && request.getRequestURI().startsWith("/api/")) {
            return true;
        }

        String expectedToken = getCsrfToken(request);
        String suppliedToken = request.getHeader("X-CSRF-Token");
        if (suppliedToken == null && request.getRequestURI().startsWith("/ui/forms/")) {
            suppliedToken = request.getParameter("_csrf");
        }
        if (suppliedToken == null) {
            throw new ApiException(403, "Please reload the page and try again.");
        }

        byte[] expectedBytes = expectedToken.getBytes(StandardCharsets.UTF_8);
        byte[] suppliedBytes = suppliedToken.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedBytes, suppliedBytes)) {
            throw new ApiException(403, "Please reload the page and try again.");
        }

        return true;
    }
}
