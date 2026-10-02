package com.shenest;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Reads and saves optional listing details without changing older property rows. */
@Service
public class PropertyDetails {
    private final Database database;
    private final Map<String, Map<String, Object>> demoDetails;

    public PropertyDetails(Database database, ObjectMapper jsonMapper) throws Exception {
        this.database = database;
        try (InputStream input =
                new ClassPathResource("demo-property-details.json").getInputStream()) {
            demoDetails =
                    jsonMapper.readValue(
                            input, new TypeReference<Map<String, Map<String, Object>>>() {});
        }
    }

    public Map<String, Object> getForProperty(Map<String, Object> property) {
        Map<String, Object> details = emptyDetails();

        // Demo facts only apply to the original demo listing and its original owner.
        // Never invent amenities or portraits for a newly registered user's property.
        Map<String, Object> demo = findDemoDetails(property);
        if (demo != null) {
            details.putAll(demo);
            details.put("demo", true);
        }

        Map<String, Object> saved =
                database.findOne(
                        "SELECT * FROM property_details WHERE property_id = ?",
                        Input.getId(property));
        if (saved != null) {
            details.putAll(saved);
        }
        return details;
    }

    public Map<String, Object> emptyDetails() {
        Map<String, Object> details = new LinkedHashMap<>();
        for (String field :
                List.of(
                        "bedrooms",
                        "bathrooms",
                        "max_occupants",
                        "furnishing",
                        "available_from",
                        "amenities",
                        "house_rules",
                        "rent_terms",
                        "additional_costs")) {
            details.put(field, null);
        }
        details.put("gallery", List.of());
        details.put("demo", false);
        return details;
    }

    private Map<String, Object> findDemoDetails(Map<String, Object> property) {
        Map<String, Object> demo = demoDetails.get(property.get("title"));
        Object image = property.get("image");
        if (demo == null || !(image instanceof String)) {
            return null;
        }
        String expectedPath = "/uploads/seed/" + demo.get("imageFile");
        if (!((String) image).endsWith(expectedPath)) {
            return null;
        }
        Map<String, Object> owner =
                database.findOne("SELECT email FROM users WHERE id = ?", property.get("owner_id"));
        if (owner == null) {
            return null;
        }
        String email = (String) owner.get("email");
        if (!email.equals("landlord@shenest.test") && !email.equals("tomi.landlord@shenest.test")) {
            return null;
        }
        return demo;
    }

    // A textarea contains one item per line. Templates display these as simple lists.
    public List<String> getLines(Object value) {
        List<String> lines = new ArrayList<>();
        if (!(value instanceof String)) {
            return lines;
        }
        for (String line : ((String) value).split("\\r?\\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                lines.add(trimmed);
            }
        }
        return lines;
    }

    @Transactional
    public Map<String, Object> save(Map<String, Object> property, Map<String, Object> body) {
        Map<String, Object> details = getForProperty(property);
        readNumber(body, details, "bedrooms", "bedrooms", 0);
        readNumber(body, details, "bathrooms", "bathrooms", 0);
        readNumber(body, details, "maxOccupants", "max_occupants", 1);
        readText(body, details, "furnishing", "furnishing");
        readText(body, details, "availableFrom", "available_from");
        readText(body, details, "amenities", "amenities");
        readText(body, details, "houseRules", "house_rules");
        readText(body, details, "rentTerms", "rent_terms");
        readText(body, details, "additionalCosts", "additional_costs");

        Object furnishing = details.get("furnishing");
        if (furnishing != null
                && !List.of("Furnished", "Partly furnished", "Unfurnished").contains(furnishing)) {
            throw new ApiException(400, "Please choose a valid furnishing option.");
        }
        Object availableFrom = details.get("available_from");
        if (availableFrom != null) {
            try {
                LocalDate.parse((String) availableFrom);
            } catch (DateTimeParseException exception) {
                throw new ApiException(400, "Availability must be a valid date (YYYY-MM-DD).");
            }
        }

        long propertyId = Input.getId(property);
        Map<String, Object> existing =
                database.findOne(
                        "SELECT property_id FROM property_details WHERE property_id = ?",
                        propertyId);
        if (existing == null) {
            database.update(
                    """
                    INSERT INTO property_details
                        (bedrooms, bathrooms, max_occupants, furnishing, available_from,
                         amenities, house_rules, rent_terms, additional_costs, property_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    details.get("bedrooms"),
                    details.get("bathrooms"),
                    details.get("max_occupants"),
                    details.get("furnishing"),
                    details.get("available_from"),
                    details.get("amenities"),
                    details.get("house_rules"),
                    details.get("rent_terms"),
                    details.get("additional_costs"),
                    propertyId);
        } else {
            database.update(
                    """
UPDATE property_details
SET bedrooms = ?, bathrooms = ?, max_occupants = ?, furnishing = ?, available_from = ?,
    amenities = ?, house_rules = ?, rent_terms = ?, additional_costs = ?
WHERE property_id = ?
""",
                    details.get("bedrooms"),
                    details.get("bathrooms"),
                    details.get("max_occupants"),
                    details.get("furnishing"),
                    details.get("available_from"),
                    details.get("amenities"),
                    details.get("house_rules"),
                    details.get("rent_terms"),
                    details.get("additional_costs"),
                    propertyId);
        }
        return getForProperty(property);
    }

    private void readNumber(
            Map<String, Object> body,
            Map<String, Object> details,
            String inputName,
            String columnName,
            long minimum) {
        if (!body.containsKey(inputName)) {
            return; // A partial update keeps fields that were not submitted.
        }
        Object value = body.get(inputName);
        if (value == null || String.valueOf(value).trim().isEmpty()) {
            details.put(columnName, null);
            return;
        }
        long number = Input.requireWholeNumber(body, inputName);
        if (number < minimum || number > 50) {
            throw new ApiException(400, inputName + " must be between " + minimum + " and 50.");
        }
        details.put(columnName, number);
    }

    private void readText(
            Map<String, Object> body,
            Map<String, Object> details,
            String inputName,
            String columnName) {
        if (!body.containsKey(inputName)) {
            return;
        }
        String value = Input.getText(body, inputName).trim();
        if (value.length() > 4000) {
            throw new ApiException(400, inputName + " must be at most 4000 characters.");
        }
        if (value.isEmpty()) {
            details.put(columnName, null);
        } else {
            details.put(columnName, value);
        }
    }
}
