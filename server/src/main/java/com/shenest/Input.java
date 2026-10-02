package com.shenest;

import java.util.Map;

/** Shared checks for fields received from a browser or API client. */
final class Input {
    // This class only has static helper methods, so it does not need an instance.
    private Input() {}

    public static String getText(Map<String, Object> body, String fieldName) {
        Object value = body.get(fieldName);
        if (value instanceof String) {
            return (String) value;
        }
        return "";
    }

    public static String requireText(Map<String, Object> body, String fieldName) {
        String value = getText(body, fieldName).trim();
        if (value.isEmpty()) {
            throw new ApiException(400, "Please complete all required fields.");
        }
        return value;
    }

    public static String getOptionalText(Map<String, Object> body, String fieldName) {
        String value = getText(body, fieldName);
        if (value.isEmpty()) {
            return null;
        }
        return value;
    }

    // Form fields may contain numbers as strings, for example "500000".
    public static long requireWholeNumber(Map<String, Object> body, String fieldName) {
        Object value = body.get(fieldName);
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new ApiException(400, fieldName + " must be a whole number.");
        }
    }

    public static long getId(Map<String, Object> row) {
        Number id = (Number) row.get("id");
        return id.longValue();
    }
}
