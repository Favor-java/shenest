package com.shenest;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Listing API: read listings, add a listing, or verify one as an admin. */
@Service
public class PropertyService {
    private final Database database;
    private final AuthService authentication;
    private final PropertyDetails propertyDetails;

    public PropertyService(
            Database database, AuthService authentication, PropertyDetails propertyDetails) {
        this.database = database;
        this.authentication = authentication;
        this.propertyDetails = propertyDetails;
    }

    public List<Map<String, Object>> list(
            String search,
            String type) {
        // In SQL LIKE, % matches any characters before or after the search text.
        String searchPattern = "%" + search + "%";

        if (type.isEmpty()) {
            String sql =
                    """
                    SELECT * FROM properties
                    WHERE title LIKE ? OR location LIKE ?
                    ORDER BY id DESC
                    """;
            return database.findAll(sql, searchPattern, searchPattern);
        }

        String sql =
                """
                SELECT * FROM properties
                WHERE (title LIKE ? OR location LIKE ?) AND type = ?
                ORDER BY id DESC
                """;
        return database.findAll(sql, searchPattern, searchPattern, type);
    }

    public List<Map<String, Object>> mine(AuthenticatedUser currentUser) {
        AuthenticatedUser user = currentUser;
        return database.findAll(
                "SELECT * FROM properties WHERE owner_id = ? ORDER BY id DESC", user.getId());
    }

    public List<Map<String, Object>> pending(AuthenticatedUser currentUser) {
        authentication.requireRole(currentUser, "ADMIN", "Admin access required.");
        return database.findAll("SELECT * FROM properties WHERE verified = 0 ORDER BY id ASC");
    }

    public Map<String, Object> get(long id) {
        Map<String, Object> property =
                database.findOne("SELECT * FROM properties WHERE id = ?", id);
        if (property == null) {
            throw new ApiException(404, "Property not found.");
        }
        return property;
    }

    @Transactional
    public Map<String, Object> create(
            Map<String, Object> body, AuthenticatedUser currentUser) {
        AuthenticatedUser owner =
                authentication.requireRole(
                        currentUser,
                        "LANDLORD",
                        "Only landlord accounts can create property listings.");

        long price = Input.requireWholeNumber(body, "price");
        if (price <= 0) {
            throw new ApiException(400, "Price must be positive.");
        }

        String title = Input.requireText(body, "title");
        String description = Input.requireText(body, "description");
        String location = Input.requireText(body, "location");
        String type = Input.requireText(body, "type");
        String image = Input.getOptionalText(body, "image");

        String sql =
                """
                INSERT INTO properties (title, description, location, price, type, image, owner_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """;
        long propertyId =
                database.insert(
                        sql, title, description, location, price, type, image, owner.getId());
        Map<String, Object> property = get(propertyId);
        propertyDetails.save(property, body);
        return property;
    }

    public Map<String, Object> details(long id) {
        return propertyDetails.getForProperty(get(id));
    }

    public Map<String, Object> updateDetails(
            long id,
            Map<String, Object> body,
            AuthenticatedUser currentUser) {
        AuthenticatedUser user =
                authentication.requireRole(
                        currentUser, "LANDLORD", "Only the listing's landlord can update its details.");
        Map<String, Object> property = get(id);
        Number ownerId = (Number) property.get("owner_id");
        if (ownerId.longValue() != user.getId()) {
            throw new ApiException(403, "You can only update your own property details.");
        }
        return propertyDetails.save(property, body);
    }

    public Map<String, Object> verify(long id, AuthenticatedUser currentUser) {
        authentication.requireRole(currentUser, "ADMIN", "Admin access required.");
        get(id); // Check that the listing exists before changing it.
        database.update("UPDATE properties SET verified = 1 WHERE id = ?", id);
        return get(id);
    }
}
