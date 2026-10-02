package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Prepares page data and chooses views using the application services. */
@Service
public class PageService {
    private final Database database;
    private final AuthService authentication;
    private final BrowserSession browserSession;
    private final PropertyService properties;
    private final SocialService social;
    private final PropertyDetails propertyDetails;
    private final SafetyService safety;

    public PageService(
            Database database, AuthService authentication,
            BrowserSession browserSession,
            PropertyService properties,
            SocialService social,
            PropertyDetails propertyDetails, SafetyService safety) {
        this.database = database;
        this.authentication = authentication;
        this.browserSession = browserSession;
        this.properties = properties;
        this.social = social;
        this.propertyDetails = propertyDetails;
        this.safety = safety;
    }

    // Spring runs this before every page method. These values are shared by the navbar.

    public void addSharedPageData(Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);

        model.addAttribute("currentUser", currentUser);
        model.addAttribute("loggedIn", currentUser != null);
        model.addAttribute("isLandlord", hasRole(currentUser, "LANDLORD"));
        model.addAttribute("isAdmin", hasRole(currentUser, "ADMIN"));
        model.addAttribute("csrf", browserSession.getCsrfToken(request));
    }

    private boolean hasRole(Map<String, Object> user, String role) {
        if (user == null) {
            return false;
        }
        return role.equals(user.get("role"));
    }

    // Add a "saved" value to each card without changing the actual database row.
    private List<Map<String, Object>> addFavoriteStatus(
            List<Map<String, Object>> properties, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        Set<Long> savedPropertyIds = new HashSet<>();

        if (currentUser != null) {
            List<Map<String, Object>> favorites =
                    database.findAll(
                            "SELECT property_id FROM favorites WHERE user_id = ?",
                            Input.getId(currentUser));
            for (Map<String, Object> favorite : favorites) {
                Number propertyId = (Number) favorite.get("property_id");
                savedPropertyIds.add(propertyId.longValue());
            }
        }

        List<Map<String, Object>> cards = new ArrayList<>();
        for (Map<String, Object> property : properties) {
            Map<String, Object> card = new LinkedHashMap<>(property);
            useLocalDemoImage(card);
            boolean isSaved = savedPropertyIds.contains(Input.getId(property));
            card.put("saved", isSaved);
            cards.add(card);
        }
        return cards;
    }

    // Older demo rows point to localhost:4000. A relative URL also works on other
    // ports and deployed hosts. This changes display data, not the stored row.
    private void useLocalDemoImage(Map<String, Object> property) {
        Object image = property.get("image");
        String oldPrefix = "http://localhost:4000/uploads/seed/";
        if (image instanceof String && ((String) image).startsWith(oldPrefix)) {
            String filename = ((String) image).substring(oldPrefix.length());
            property.put("image", "/uploads/seed/" + filename);
        }
    }

    private List<Map<String, Object>> useLocalDemoImages(List<Map<String, Object>> properties) {
        for (Map<String, Object> property : properties) {
            useLocalDemoImage(property);
        }
        return properties;
    }

    public String showHomePage(Model model, HttpServletRequest request) {
        List<Map<String, Object>> allProperties = properties.list("", "");
        List<Map<String, Object>> cards = addFavoriteStatus(allProperties, request);
        List<Map<String, Object>> featuredProperties = new ArrayList<>();

        int numberToShow = Math.min(3, cards.size());
        for (int index = 0; index < numberToShow; index++) {
            featuredProperties.add(cards.get(index));
        }

        model.addAttribute("properties", featuredProperties);
        return "home";
    }

    public String showPropertiesPage(
            String search,
            String type,
            Model model,
            HttpServletRequest request) {
        List<Map<String, Object>> properties = this.properties.list(search, type);

        model.addAttribute("search", search);
        model.addAttribute("type", type);
        model.addAttribute("properties", addFavoriteStatus(properties, request));
        return "properties";
    }

    public String showCreatePropertyPage(Model model) {
        model.addAttribute("details", propertyDetails.emptyDetails());
        return "create-property";
    }

    public String showPropertyDetails(
            long id,
            Model model,
            HttpServletRequest request,
            HttpServletResponse response) {
        Map<String, Object> property =
                database.findOne("SELECT * FROM properties WHERE id = ?", id);
        if (property == null) {
            response.setStatus(404);
            model.addAttribute("homeMissing", true);
            return "not-found";
        }

        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        boolean isOwner = false;
        if (currentUser != null) {
            Number ownerId = (Number) property.get("owner_id");
            isOwner = Input.getId(currentUser) == ownerId.longValue();
        }

        useLocalDemoImage(property);
        Map<String, Object> details = propertyDetails.getForProperty(property);
        List<Map<String, Object>> reviews = social.reviews(id);
        long totalRating = 0;
        for (Map<String, Object> review : reviews) {
            totalRating += ((Number) review.get("rating")).longValue();
        }
        double averageRating = 0;
        if (!reviews.isEmpty()) {
            averageRating = (double) totalRating / reviews.size();
        }

        String coverImage = (String) property.get("image");
        if (coverImage == null || coverImage.isBlank()) {
            coverImage = "/images/hero-home.png";
        }
        List<String> gallery = new ArrayList<>();
        gallery.add(coverImage);
        for (Object image : (List<?>) details.get("gallery")) {
            gallery.add((String) image);
        }
        Map<String, Object> landlord =
                database.findOne(
                        "SELECT id, name FROM users WHERE id = ?", property.get("owner_id"));
        if (landlord == null) {
            landlord = Map.of("name", "SheNest landlord");
        }

        model.addAttribute("property", property);
        model.addAttribute("details", details);
        model.addAttribute("amenities", propertyDetails.getLines(details.get("amenities")));
        model.addAttribute("houseRules", propertyDetails.getLines(details.get("house_rules")));
        model.addAttribute("gallery", gallery);
        model.addAttribute("landlord", landlord);
        model.addAttribute(
                "monthlyEquivalent",
                Math.round(((Number) property.get("price")).longValue() / 12.0));
        model.addAttribute("averageRating", averageRating);
        model.addAttribute("reviews", reviews);
        model.addAttribute("isOwner", isOwner);
        return "property-details";
    }

    public String showEditPropertyDetails(
            long id, Model model, HttpServletRequest request) {
        Map<String, Object> property = properties.get(id);
        Map<String, Object> user = browserSession.getCurrentUser(request);
        if (user == null) {
            return "redirect:/login";
        }
        Number ownerId = (Number) property.get("owner_id");
        if (!hasRole(user, "LANDLORD") || Input.getId(user) != ownerId.longValue()) {
            throw new ApiException(403, "Only this property's landlord can edit its details.");
        }
        model.addAttribute("property", property);
        model.addAttribute("details", propertyDetails.getForProperty(property));
        return "edit-property-details";
    }

    public String showFavoritesPage(Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        if (currentUser != null) {
            List<Map<String, Object>> favorites = social.favorites(authentication.requireLoggedInUser(request));
            model.addAttribute("properties", addFavoriteStatus(favorites, request));
        }
        return "favorites";
    }

    public String showRoommatesPage(String location, Model model) {
        model.addAttribute("location", location);
        List<Map<String, Object>> profiles = social.roommates(location);
        for (Map<String, Object> profile : profiles) {
            profile.put("portrait", findDemoPortrait(profile));
        }
        model.addAttribute("profiles", profiles);
        return "roommates";
    }

    private String findDemoPortrait(Map<String, Object> profile) {
        Map<String, Object> user =
                database.findOne(
                        "SELECT email, name FROM users WHERE id = ?", profile.get("user_id"));
        if (user == null) {
            return null;
        }
        // Synthetic portraits belong only to the five named fictional demo accounts.
        // All other users keep their initials; their private email is never rendered.
        Map<String, String> names =
                Map.of(
                        "ada",
                        "Ada Nwosu",
                        "zainab",
                        "Zainab Bello",
                        "temi",
                        "Temi Adebayo",
                        "chioma",
                        "Chioma Eze",
                        "rita",
                        "Rita George");
        for (String key : names.keySet()) {
            if ((key + "@shenest.test").equals(user.get("email"))
                    && names.get(key).equals(user.get("name"))) {
                return "/images/roommates/" + key + ".png";
            }
        }
        return null;
    }

    public String showMessagesPage(
            long userId, Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        model.addAttribute("recipientId", userId);

        if (currentUser != null) {
            Map<String, Object> recipient = database.findOne("SELECT name FROM users WHERE id = ?", userId);
            if (recipient == null) throw new ApiException(404, "Member not found.");
            SafetyService.BlockState blockState = safety.getBlockState(Input.getId(currentUser), userId);
            model.addAttribute("blockedByMe", blockState.blockedByMe());
            model.addAttribute("contactBlocked", blockState.contactBlocked());
            model.addAttribute("isSelf", userId == Input.getId(currentUser));
            List<Map<String, Object>> messages = social.messages(userId, authentication.requireLoggedInUser(request));
            String otherPersonName = (String) recipient.get("name");

            if (!messages.isEmpty()) {
                Map<String, Object> firstMessage = messages.get(0);
                Number senderId = (Number) firstMessage.get("sender_id");

                if (senderId.longValue() == Input.getId(currentUser)) {
                    otherPersonName = (String) firstMessage.get("receiver_name");
                } else {
                    otherPersonName = (String) firstMessage.get("sender_name");
                }
            }

            model.addAttribute("messages", messages);
            model.addAttribute("otherName", otherPersonName);
        }
        return "messages";
    }

    public String showLandlordPage(Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        if (hasRole(currentUser, "LANDLORD")) {
            model.addAttribute("properties", useLocalDemoImages(properties.mine(authentication.requireLoggedInUser(request))));
            model.addAttribute("bookings", social.landlordBookings(authentication.requireLoggedInUser(request)));
        }
        return "landlord";
    }

    public String showAdminPage(Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        if (hasRole(currentUser, "ADMIN")) {
            model.addAttribute("reports", safety.adminReports(authentication.requireLoggedInUser(request)));
            model.addAttribute("properties", useLocalDemoImages(properties.pending(authentication.requireLoggedInUser(request))));
            model.addAttribute(
                    "platformStats",
                    database.findOne(
                            """
                            SELECT
                                (SELECT COUNT(*) FROM users) AS members,
                                (SELECT COUNT(*) FROM properties) AS homes,
                                (SELECT COUNT(*) FROM properties WHERE verified = 0) AS pending,
                                (SELECT COUNT(*) FROM bookings) AS bookings
                            """));
        }
        return "admin";
    }

    public String showAccountPage(Model model, HttpServletRequest request) {
        Map<String, Object> currentUser = browserSession.getCurrentUser(request);
        if (currentUser != null) {
            model.addAttribute("favorites", social.favorites(authentication.requireLoggedInUser(request)));
            model.addAttribute("bookings", social.myBookings(authentication.requireLoggedInUser(request)));
            model.addAttribute("blocks", safety.blocks(authentication.requireLoggedInUser(request)));
            model.addAttribute("reports", safety.myReports(authentication.requireLoggedInUser(request)));
        }
        return "account";
    }

    public String showLoginOrRegistrationPage(Model model, HttpServletRequest request) {
        boolean isRegistrationPage = request.getRequestURI().equals("/register");
        model.addAttribute("register", isRegistrationPage);
        return "auth";
    }

    public String showReportPage(String type, long id,
            Model model, HttpServletRequest request) {
        Map<String, Object> user = browserSession.getCurrentUser(request);
        if (user == null) return "redirect:/login";
        Map<String, Object> target = safety.reportTarget(type, id, Input.getId(user));
        model.addAttribute("targetType", type);
        model.addAttribute("targetId", id);
        model.addAttribute("targetName", target.get("name"));
        return "report";
    }

    public String showPolicyPage(Model model, HttpServletRequest request) {
        return request.getRequestURI().equals("/privacy") ? "privacy" : "terms";
    }
}
