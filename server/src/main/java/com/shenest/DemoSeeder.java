package com.shenest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Adds example data only when the app starts with --shenest.seed=true. Existing records are kept,
 * so running the seed again does not reset the app.
 */
@Component
@ConditionalOnProperty(name = "shenest.seed", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {
    private final Database database;
    private final AuthService authentication;
    private final ObjectMapper jsonMapper;
    private final String baseUrl;

    public DemoSeeder(
            Database database,
            AuthService authentication,
            ObjectMapper jsonMapper,
            @Value("${shenest.seed-base-url:http://localhost:4000}") String baseUrl) {
        this.database = database;
        this.authentication = authentication;
        this.jsonMapper = jsonMapper;
        this.baseUrl = baseUrl;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) throws Exception {
        Map<String, List<Map<String, Object>>> demoData;
        try (InputStream input = new ClassPathResource("demo-data.json").getInputStream()) {
            demoData =
                    jsonMapper.readValue(
                            input, new TypeReference<Map<String, List<Map<String, Object>>>>() {});
        }

        // Demo IDs may differ from real database IDs when data already exists.
        // These maps let later records point to the correct users and properties.
        Map<Long, Long> userIds = seedUsers(demoData.get("users"));
        Map<Long, Long> propertyIds = seedProperties(demoData.get("properties"), userIds);

        seedRoommateProfiles(demoData.get("roommate_profiles"), userIds);
        seedFavorites(demoData.get("favorites"), userIds, propertyIds);
        seedReviews(demoData.get("reviews"), userIds, propertyIds);
        seedBookings(demoData.get("bookings"), userIds, propertyIds);
        seedMessages(demoData.get("messages"), userIds);

        System.out.println("SheNest demo seed complete. Demo password: password123");
    }

    private Map<Long, Long> seedUsers(List<Map<String, Object>> users) {
        Map<Long, Long> userIds = new HashMap<>();
        String passwordHash = authentication.hashPassword("password123");

        for (Map<String, Object> user : users) {
            Map<String, Object> existingUser =
                    database.findOne("SELECT id FROM users WHERE email = ?", user.get("email"));

            long databaseId;
            if (existingUser != null) {
                databaseId = Input.getId(existingUser);
            } else {
                databaseId =
                        database.insert(
                                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?,"
                                    + " ?)",
                                user.get("name"),
                                user.get("email"),
                                passwordHash,
                                user.get("role"));
            }

            userIds.put(Input.getId(user), databaseId);
        }
        return userIds;
    }

    private Map<Long, Long> seedProperties(
            List<Map<String, Object>> properties, Map<Long, Long> userIds) {
        Map<Long, Long> propertyIds = new HashMap<>();

        for (Map<String, Object> property : properties) {
            Map<String, Object> existingProperty =
                    database.findOne(
                            "SELECT id FROM properties WHERE title = ?", property.get("title"));

            long databaseId;
            if (existingProperty != null) {
                databaseId = Input.getId(existingProperty);
            } else {
                long ownerId = getMappedId(property, "owner_id", userIds);
                String imageUrl = (String) property.get("image");
                imageUrl = imageUrl.replace("http://localhost:4000", baseUrl);

                String sql =
                        """
                        INSERT INTO properties
                            (title, description, location, price, type, image, verified, owner_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """;
                databaseId =
                        database.insert(
                                sql,
                                property.get("title"),
                                property.get("description"),
                                property.get("location"),
                                property.get("price"),
                                property.get("type"),
                                imageUrl,
                                property.get("verified"),
                                ownerId);
            }

            propertyIds.put(Input.getId(property), databaseId);
        }
        return propertyIds;
    }

    private void seedRoommateProfiles(List<Map<String, Object>> profiles, Map<Long, Long> userIds) {
        for (Map<String, Object> profile : profiles) {
            long userId = getMappedId(profile, "user_id", userIds);
            Map<String, Object> existingProfile =
                    database.findOne("SELECT id FROM roommate_profiles WHERE user_id = ?", userId);
            if (existingProfile != null) {
                continue; // Keep any changes the user made to their profile.
            }

            String sql =
                    """
INSERT INTO roommate_profiles (user_id, bio, location, budget, move_in, lifestyle)
VALUES (?, ?, ?, ?, ?, ?)
""";
            database.update(
                    sql,
                    userId,
                    profile.get("bio"),
                    profile.get("location"),
                    profile.get("budget"),
                    profile.get("move_in"),
                    profile.get("lifestyle"));
        }
    }

    private void seedFavorites(
            List<Map<String, Object>> favorites,
            Map<Long, Long> userIds,
            Map<Long, Long> propertyIds) {
        for (Map<String, Object> favorite : favorites) {
            long userId = getMappedId(favorite, "user_id", userIds);
            long propertyId = getMappedId(favorite, "property_id", propertyIds);
            Map<String, Object> existingFavorite =
                    database.findOne(
                            "SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?",
                            userId,
                            propertyId);

            if (existingFavorite == null) {
                database.update(
                        "INSERT INTO favorites (user_id, property_id) VALUES (?, ?)",
                        userId,
                        propertyId);
            }
        }
    }

    private void seedReviews(
            List<Map<String, Object>> reviews,
            Map<Long, Long> userIds,
            Map<Long, Long> propertyIds) {
        for (Map<String, Object> review : reviews) {
            long userId = getMappedId(review, "user_id", userIds);
            long propertyId = getMappedId(review, "property_id", propertyIds);
            String findSql =
                    """
                    SELECT id FROM reviews
                    WHERE user_id = ? AND property_id = ? AND rating = ? AND comment IS ?
                    """;
            Map<String, Object> existingReview =
                    database.findOne(
                            findSql,
                            userId,
                            propertyId,
                            review.get("rating"),
                            review.get("comment"));

            if (existingReview == null) {
                database.update(
                        "INSERT INTO reviews (user_id, property_id, rating, comment) VALUES (?, ?,"
                            + " ?, ?)",
                        userId,
                        propertyId,
                        review.get("rating"),
                        review.get("comment"));
            }
        }
    }

    private void seedBookings(
            List<Map<String, Object>> bookings,
            Map<Long, Long> userIds,
            Map<Long, Long> propertyIds) {
        for (Map<String, Object> booking : bookings) {
            long userId = getMappedId(booking, "user_id", userIds);
            long propertyId = getMappedId(booking, "property_id", propertyIds);
            Map<String, Object> existingBooking =
                    database.findOne(
                            "SELECT id FROM bookings WHERE user_id = ? AND property_id = ?",
                            userId,
                            propertyId);
            if (existingBooking != null) {
                continue; // Keep a landlord's existing approval or decline.
            }

            database.update(
                    "INSERT INTO bookings (user_id, property_id, message, status) VALUES (?, ?, ?,"
                        + " ?)",
                    userId,
                    propertyId,
                    booking.get("message"),
                    booking.get("status"));
        }
    }

    private void seedMessages(List<Map<String, Object>> messages, Map<Long, Long> userIds) {
        for (Map<String, Object> message : messages) {
            long senderId = getMappedId(message, "sender_id", userIds);
            long receiverId = getMappedId(message, "receiver_id", userIds);
            Map<String, Object> existingMessage =
                    database.findOne(
                            "SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND"
                                + " text = ?",
                            senderId,
                            receiverId,
                            message.get("text"));

            if (existingMessage == null) {
                database.update(
                        "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
                        senderId,
                        receiverId,
                        message.get("text"));
            }
        }
    }

    private long getMappedId(Map<String, Object> row, String fieldName, Map<Long, Long> ids) {
        Number demoId = (Number) row.get(fieldName);
        return ids.get(demoId.longValue());
    }
}
