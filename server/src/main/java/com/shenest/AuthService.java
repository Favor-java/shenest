package com.shenest;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Locale;

/** Password hashing and the login checks shared by the controllers. */
@Service
public class AuthService {
    private final Database database;
    private final Algorithm tokenAlgorithm;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

    public AuthService(Database database, @Value("${shenest.jwt-secret}") String secret) {
        this.database = database;

        // Older .env files used quotes around the secret. Remove those quotes.
        if (secret.length() >= 2
                && secret.charAt(0) == '"'
                && secret.charAt(secret.length() - 1) == '"') {
            secret = secret.substring(1, secret.length() - 1);
        }
        this.tokenAlgorithm = Algorithm.HMAC256(secret);
    }

    public String hashPassword(String password) {
        return passwordEncoder.encode(password);
    }

    public boolean passwordMatches(String password, String storedHash) {
        return passwordEncoder.matches(password, storedHash);
    }

    // API clients use a signed token. The website uses a browser session instead.
    public String createToken(Map<String, Object> user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(7, ChronoUnit.DAYS);

        return JWT.create()
                .withClaim("userId", Input.getId(user))
                .withClaim("role", (String) user.get("role"))
                .withIssuedAt(now)
                .withExpiresAt(expiresAt)
                .sign(tokenAlgorithm);
    }

    public AuthenticatedUser requireLoggedInUser(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");

        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            return findUserFromToken(token);
        }

        return findUserFromSession(request);
    }

    private AuthenticatedUser findUserFromSession(HttpServletRequest request) {
        // false means "look for an existing session; do not create one".
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new ApiException(401, "Please log in first.");
        }

        Object userId = session.getAttribute("userId");
        if (userId == null) {
            throw new ApiException(401, "Please log in first.");
        }

        Map<String, Object> user =
                database.findOne("SELECT id, role FROM users WHERE id = ?", userId);
        if (user == null) {
            throw new ApiException(401, "Please log in first.");
        }

        return new AuthenticatedUser(Input.getId(user), (String) user.get("role"));
    }

    private AuthenticatedUser findUserFromToken(String token) {
        try {
            DecodedJWT decodedToken = JWT.require(tokenAlgorithm).build().verify(token);
            Long userId = decodedToken.getClaim("userId").asLong();

            if (userId == null || decodedToken.getExpiresAt() == null) {
                throw expiredLogin();
            }

            // Read the current role from the database, rather than trusting an old role.
            Map<String, Object> user =
                    database.findOne("SELECT id, role FROM users WHERE id = ?", userId);
            if (user == null) {
                throw expiredLogin();
            }

            return new AuthenticatedUser(userId, (String) user.get("role"));
        } catch (JWTVerificationException | IllegalArgumentException exception) {
            throw expiredLogin();
        }
    }

    private ApiException expiredLogin() {
        return new ApiException(401, "Your login has expired. Please log in again.");
    }

    public AuthenticatedUser requireRole(
            HttpServletRequest request, String requiredRole, String errorMessage) {
        return requireRole(requireLoggedInUser(request), requiredRole, errorMessage);
    }

    public AuthenticatedUser requireRole(
            AuthenticatedUser user, String requiredRole, String errorMessage) {
        if (!user.getRole().equals(requiredRole)) {
            throw new ApiException(403, errorMessage);
        }
        return user;
    }

    public Map<String, Object> register(Map<String, Object> body) {
        // 1. Read and validate the submitted fields.
        String name = Input.requireText(body, "name");
        String email = Input.requireText(body, "email").toLowerCase(Locale.ROOT);
        String password = Input.getText(body, "password");
        if (password.length() < 8) {
            throw new ApiException(400, "Password must be at least 8 characters.");
        }

        String role = "USER";
        if (body.containsKey("role")) {
            role = Input.getText(body, "role");
        }
        if (!role.equals("USER") && !role.equals("LANDLORD")) {
            throw new ApiException(400, "Invalid account type.");
        }

        Map<String, Object> existingUser =
                database.findOne("SELECT id FROM users WHERE email = ?", email);
        if (existingUser != null) {
            throw new ApiException(409, "Email already exists.");
        }

        // 2. Save a password hash, never the original password.
        String passwordHash = hashPassword(password);
        long userId =
                database.insert(
                        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                        name,
                        email,
                        passwordHash,
                        role);

        // 3. Return the new user's public details and an API token.
        Map<String, Object> user =
                database.findOne("SELECT id, name, email, role FROM users WHERE id = ?", userId);
        return createLoginResponse(user);
    }

    public Map<String, Object> login(Map<String, Object> body) {
        String email = Input.getText(body, "email").trim().toLowerCase(Locale.ROOT);
        String password = Input.getText(body, "password");
        Map<String, Object> storedUser =
                database.findOne("SELECT * FROM users WHERE email = ?", email);

        if (storedUser == null) {
            throw new ApiException(401, "Email or password is incorrect.");
        }

        String storedHash = (String) storedUser.get("password");
        if (!passwordMatches(password, storedHash)) {
            throw new ApiException(401, "Email or password is incorrect.");
        }

        Map<String, Object> publicUser =
                database.findOne(
                        "SELECT id, name, email, role FROM users WHERE id = ?",
                        Input.getId(storedUser));
        return createLoginResponse(publicUser);
    }

    private Map<String, Object> createLoginResponse(Map<String, Object> user) {
        String token = createToken(user);
        return Map.of("token", token, "user", user);
    }
}
