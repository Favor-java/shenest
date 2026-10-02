package com.shenest;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Business operations for favorites, bookings, reviews, roommates, and messages. Each method follows the
 * same order: validate input, enforce access, run SQL, then return the result.
 */
@Service
public class SocialService {
    private final Database database;
    private final SafetyService safety;

    public SocialService(Database database, SafetyService safety) {
        this.database = database;
        this.safety = safety;
    }

    private Map<String, Object> requireProperty(long propertyId) {
        Map<String, Object> property =
                database.findOne("SELECT id, owner_id FROM properties WHERE id = ?", propertyId);
        if (property == null) {
            throw new ApiException(404, "Property not found.");
        }
        return property;
    }

    private Map<String, Object> findBooking(long bookingId) {
        return database.findOne("SELECT * FROM bookings WHERE id = ?", bookingId);
    }

    public Map<String, Object> health() {
        return Map.of("ok", true, "message", "SheNest REST API is working.");
    }

    // FAVORITES: read a user's saved properties, or toggle one property.

    public List<Map<String, Object>> favorites(AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        String sql =
                """
                SELECT properties.*
                FROM favorites
                JOIN properties ON properties.id = favorites.property_id
                WHERE favorites.user_id = ?
                ORDER BY properties.id DESC
                """;
        return database.findAll(sql, user.getId());
    }

    @Transactional
    public Map<String, Boolean> toggleFavorite(
            long propertyId, AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        requireProperty(propertyId);

        Map<String, Object> existingFavorite =
                database.findOne(
                        "SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?",
                        user.getId(),
                        propertyId);

        if (existingFavorite != null) {
            database.update(
                    "DELETE FROM favorites WHERE user_id = ? AND property_id = ?",
                    user.getId(),
                    propertyId);
            return Map.of("saved", false);
        }

        database.update(
                "INSERT INTO favorites (user_id, property_id) VALUES (?, ?)",
                user.getId(),
                propertyId);
        return Map.of("saved", true);
    }

    // BOOKINGS: renters request a viewing; only the property owner can decide.

    public Map<String, Object> createBooking(
            Map<String, Object> body, AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        long propertyId = Input.requireWholeNumber(body, "propertyId");
        Map<String, Object> property = requireProperty(propertyId);

        Number ownerId = (Number) property.get("owner_id");
        if (ownerId.longValue() == user.getId()) {
            throw new ApiException(400, "You cannot book your own property.");
        }
        safety.requireContactAllowed(user.getId(), ownerId.longValue());

        String message = Input.getOptionalText(body, "message");
        long bookingId =
                database.insert(
                        "INSERT INTO bookings (user_id, property_id, message) VALUES (?, ?, ?)",
                        user.getId(),
                        propertyId,
                        message);
        return findBooking(bookingId);
    }

    public List<Map<String, Object>> myBookings(AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        String sql =
                """
                SELECT bookings.*, properties.title AS property_title, properties.location
                FROM bookings
                JOIN properties ON properties.id = bookings.property_id
                WHERE bookings.user_id = ?
                ORDER BY bookings.id DESC
                """;
        return database.findAll(sql, user.getId());
    }

    public List<Map<String, Object>> landlordBookings(AuthenticatedUser currentUser) {
        AuthenticatedUser landlord = currentUser;
        String sql =
                """
                SELECT bookings.*, properties.title AS property_title, properties.location,
                       users.name AS renter_name, users.email AS renter_email
                FROM bookings
                JOIN properties ON properties.id = bookings.property_id
                JOIN users ON users.id = bookings.user_id
                WHERE properties.owner_id = ?
                ORDER BY bookings.id DESC
                """;
        return database.findAll(sql, landlord.getId());
    }

    public Map<String, Object> updateBookingStatus(
            long id,
            Map<String, Object> body,
            AuthenticatedUser currentUser) {
        AuthenticatedUser owner = currentUser;
        String status = Input.getText(body, "status").toUpperCase(Locale.ROOT);

        if (!status.equals("APPROVED") && !status.equals("DECLINED")) {
            throw new ApiException(400, "Status must be APPROVED or DECLINED.");
        }

        String sql =
                """
                SELECT bookings.id
                FROM bookings
                JOIN properties ON properties.id = bookings.property_id
                WHERE bookings.id = ? AND properties.owner_id = ?
                """;
        Map<String, Object> ownedBooking = database.findOne(sql, id, owner.getId());
        if (ownedBooking == null) {
            throw new ApiException(404, "Booking request not found.");
        }

        database.update("UPDATE bookings SET status = ? WHERE id = ?", status, id);
        return findBooking(id);
    }

    // REVIEWS: each review belongs to an existing property and has 1 to 5 stars.

    public List<Map<String, Object>> reviews(long propertyId) {
        return database.findAll(
                "SELECT * FROM reviews WHERE property_id = ? ORDER BY id DESC", propertyId);
    }

    public Map<String, Object> addReview(
            long propertyId,
            Map<String, Object> body,
            AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        long rating = Input.requireWholeNumber(body, "rating");
        if (rating < 1 || rating > 5) {
            throw new ApiException(400, "Rating must be between 1 and 5.");
        }
        requireProperty(propertyId);

        String comment = Input.getOptionalText(body, "comment");
        long reviewId =
                database.insert(
                        "INSERT INTO reviews (user_id, property_id, rating, comment) VALUES (?, ?,"
                            + " ?, ?)",
                        user.getId(),
                        propertyId,
                        rating,
                        comment);
        return database.findOne("SELECT * FROM reviews WHERE id = ?", reviewId);
    }

    // ROOMMATES: one profile per user, updated when they save it again.

    public List<Map<String, Object>> roommates(String location) {
        String searchPattern = "%" + location + "%";
        String sql =
                """
                SELECT roommate_profiles.*, users.name
                FROM roommate_profiles
                JOIN users ON users.id = roommate_profiles.user_id
                WHERE roommate_profiles.location LIKE ?
                ORDER BY roommate_profiles.id DESC
                """;
        return database.findAll(sql, searchPattern);
    }

    @Transactional
    public Map<String, Object> saveRoommateProfile(
            Map<String, Object> body, AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        String bio = Input.requireText(body, "bio");
        String location = Input.requireText(body, "location");
        long budget = Input.requireWholeNumber(body, "budget");
        if (budget <= 0) {
            throw new ApiException(400, "Budget must be positive.");
        }

        String moveIn = Input.getOptionalText(body, "moveIn");
        String lifestyle = Input.getOptionalText(body, "lifestyle");
        Map<String, Object> existingProfile =
                database.findOne(
                        "SELECT id FROM roommate_profiles WHERE user_id = ?", user.getId());

        if (existingProfile == null) {
            String sql =
                    """
INSERT INTO roommate_profiles (user_id, bio, location, budget, move_in, lifestyle)
VALUES (?, ?, ?, ?, ?, ?)
""";
            database.update(sql, user.getId(), bio, location, budget, moveIn, lifestyle);
        } else {
            String sql =
                    """
                    UPDATE roommate_profiles
                    SET bio = ?, location = ?, budget = ?, move_in = ?, lifestyle = ?
                    WHERE user_id = ?
                    """;
            database.update(sql, bio, location, budget, moveIn, lifestyle, user.getId());
        }

        return database.findOne("SELECT * FROM roommate_profiles WHERE user_id = ?", user.getId());
    }

    // MESSAGES: a conversation includes messages sent in both directions.

    public List<Map<String, Object>> messages(
            long userId, AuthenticatedUser currentUser) {
        String sql =
                """
                SELECT messages.*, sender.name AS sender_name, receiver.name AS receiver_name
                FROM messages
                JOIN users AS sender ON sender.id = messages.sender_id
                JOIN users AS receiver ON receiver.id = messages.receiver_id
                WHERE (sender_id = ? AND receiver_id = ?)
                   OR (sender_id = ? AND receiver_id = ?)
                ORDER BY messages.id ASC
                """;
        return database.findAll(sql, currentUser.getId(), userId, userId, currentUser.getId());
    }

    public Map<String, Object> sendMessage(
            long userId,
            Map<String, Object> body,
            AuthenticatedUser currentUser) {
        AuthenticatedUser sender = currentUser;
        String text = Input.getText(body, "text").trim();

        if (text.isEmpty()) {
            throw new ApiException(400, "Message cannot be empty.");
        }
        if (sender.getId() == userId) {
            throw new ApiException(400, "You cannot message yourself.");
        }

        Map<String, Object> receiver =
                database.findOne("SELECT id FROM users WHERE id = ?", userId);
        if (receiver == null) {
            throw new ApiException(404, "That SheNest member does not exist.");
        }
        safety.requireContactAllowed(sender.getId(), userId);

        long messageId =
                database.insert(
                        "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
                        sender.getId(),
                        userId,
                        text);
        return database.findOne("SELECT * FROM messages WHERE id = ?", messageId);
    }
}
