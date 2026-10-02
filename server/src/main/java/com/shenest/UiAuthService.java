package com.shenest;

import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

/** Website login uses the same password checks as the API, then starts a session. */
@Service
public class UiAuthService {
    private final AuthService authentication;

    public UiAuthService(AuthService authentication) {
        this.authentication = authentication;
    }

    public Map<String, Object> login(
            Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> result = authentication.login(body);
        return startBrowserSession(result, request);
    }

    public Map<String, Object> register(
            Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> result = authentication.register(body);
        return startBrowserSession(result, request);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> startBrowserSession(
            Map<String, Object> loginResponse, HttpServletRequest request) {
        // The login response contains a nested Map called "user".
        Map<String, Object> user = (Map<String, Object>) loginResponse.get("user");

        // Change the session ID at login so an old ID cannot be reused by someone else.
        request.getSession();
        request.changeSessionId();
        request.getSession().setAttribute("userId", Input.getId(user));
        return Map.of("user", user);
    }

    public Map<String, Boolean> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        return Map.of("ok", true);
    }
}
