package com.shenest;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Runs website actions using the same validation and permissions as the REST API. */
@Service
public class FormService {
    private static final Set<String> ACTIONS = Set.of("login", "register", "logout",
            "create-property", "edit-property", "favorite", "book", "booking-status",
            "review", "roommate", "message", "block", "unblock", "verify", "report", "review-report");
    private final AuthService authentication;
    private final UiAuthService browserAuthentication;
    private final PropertyService properties;
    private final SocialService social;
    private final SafetyService safety;
    private final UploadService uploads;

    public FormService(AuthService authentication, UiAuthService browserAuthentication,
            PropertyService properties, SocialService social, SafetyService safety, UploadService uploads) {
        this.authentication = authentication;
        this.browserAuthentication = browserAuthentication;
        this.properties = properties;
        this.social = social;
        this.safety = safety;
        this.uploads = uploads;
    }

    public String submit(String action, Map<String, Object> fields, MultipartFile image,
            HttpServletRequest request, RedirectAttributes redirect) throws IOException {
        if (!ACTIONS.contains(action)) throw new ApiException(404, "Form action not found.");
        String target = failureTarget(action, fields);
        String notice = "Changes saved.";
        try {
            switch (action) {
                case "login", "register" -> {
                    Map<String, Object> result = action.equals("login")
                            ? browserAuthentication.login(fields, request)
                            : browserAuthentication.register(fields, request);
                    Map<?, ?> user = (Map<?, ?>) result.get("user");
                    target = "ADMIN".equals(user.get("role")) ? "/admin" : "/account";
                    notice = "Welcome to SheNest.";
                }
                case "logout" -> {
                    browserAuthentication.logout(request);
                    target = "/";
                    notice = "You have logged out.";
                }
                case "create-property" -> {
                    AuthenticatedUser owner = currentUser(request);
                    Map<String, Object> body = new LinkedHashMap<>(fields);
                    if (image != null && !image.isEmpty()) {
                        String base = ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
                        body.put("image", uploads.upload(image, owner, base).get("url"));
                    }
                    long id = Input.getId(properties.create(body, owner));
                    target = "/properties/" + id;
                    notice = "Your property listing has been created.";
                }
                case "edit-property" -> {
                    long id = Input.requireWholeNumber(fields, "propertyId");
                    properties.updateDetails(id, fields, currentUser(request));
                    target = "/properties/" + id;
                    notice = "Property details updated.";
                }
                case "favorite" -> {
                    boolean saved = social.toggleFavorite(Input.requireWholeNumber(fields, "propertyId"),
                            currentUser(request)).get("saved");
                    target = returnTarget(fields, "/favorites");
                    notice = saved ? "Home saved to favorites." : "Home removed from favorites.";
                }
                case "book" -> {
                    social.createBooking(fields, currentUser(request));
                    notice = "Your booking request has been sent.";
                }
                case "booking-status" -> {
                    social.updateBookingStatus(Input.requireWholeNumber(fields, "bookingId"), fields, currentUser(request));
                    notice = "Booking decision saved.";
                }
                case "review" -> {
                    social.addReview(Input.requireWholeNumber(fields, "propertyId"), fields, currentUser(request));
                    notice = "Your review has been posted.";
                }
                case "roommate" -> {
                    social.saveRoommateProfile(fields, currentUser(request));
                    notice = "Your roommate profile has been saved.";
                }
                case "message" -> {
                    social.sendMessage(Input.requireWholeNumber(fields, "userId"), fields, currentUser(request));
                    notice = "Message sent.";
                }
                case "block" -> {
                    safety.block(Input.requireWholeNumber(fields, "userId"), currentUser(request));
                    target = returnTarget(fields, "/account#blocked-members");
                    notice = "Member blocked.";
                }
                case "unblock" -> {
                    safety.unblock(Input.requireWholeNumber(fields, "userId"), currentUser(request));
                    target = returnTarget(fields, "/account#blocked-members");
                    notice = "Member unblocked.";
                }
                case "verify" -> {
                    properties.verify(Input.requireWholeNumber(fields, "propertyId"), currentUser(request));
                    notice = "Property verified.";
                }
                case "report" -> {
                    safety.report(fields, currentUser(request));
                    target = "/account#your-reports";
                    notice = "Your private report has been submitted.";
                }
                case "review-report" -> {
                    safety.review(Input.requireWholeNumber(fields, "reportId"), fields, currentUser(request));
                    notice = "Report decision saved.";
                }
                default -> throw new IllegalStateException("Unhandled form action.");
            }
            redirect.addFlashAttribute("notice", notice);
        } catch (ApiException exception) {
            if (exception.status() == 401) target = "/login";
            redirect.addFlashAttribute("notice", exception.getMessage());
            redirect.addFlashAttribute("noticeError", true);
        }
        // Redirect after a POST so refreshing a page doesn't submit the action again.
        return "redirect:" + target;
    }

    private AuthenticatedUser currentUser(HttpServletRequest request) {
        return authentication.requireLoggedInUser(request);
    }

    private String failureTarget(String action, Map<String, Object> fields) {
        String property = numericText(fields, "propertyId");
        return switch (action) {
            case "login" -> "/login";
            case "register" -> "/register";
            case "logout" -> "/";
            case "create-property" -> "/properties/new";
            case "edit-property" -> property == null ? "/landlord" : "/properties/" + property + "/edit";
            case "book", "review" -> property == null ? "/properties" : "/properties/" + property;
            case "roommate" -> "/roommates";
            case "message" -> numericText(fields, "userId") == null ? "/roommates" : "/messages/" + numericText(fields, "userId");
            case "booking-status" -> "/landlord";
            case "verify", "review-report" -> "/admin";
            case "report" -> reportPage(fields);
            default -> returnTarget(fields, "/account");
        };
    }

    private String reportPage(Map<String, Object> fields) {
        String type = Input.getText(fields, "targetType");
        String id = numericText(fields, "targetId");
        return id != null && Set.of("USER", "PROPERTY", "MESSAGE").contains(type)
                ? "/report?type=" + type + "&id=" + id : "/account";
    }

    private String numericText(Map<String, Object> fields, String key) {
        String value = Input.getText(fields, key);
        return value.matches("[0-9]{1,18}") ? value : null;
    }

    private String returnTarget(Map<String, Object> fields, String fallback) {
        String value = Input.getText(fields, "returnTo");
        // Only known local pages are valid return destinations; never redirect to another site.
        return value.matches("/(?:properties(?:/[0-9]+(?:/edit)?)?|favorites|account|roommates|messages/[0-9]+|landlord|admin|login|register|)(?:#[A-Za-z0-9_-]+)?")
                ? value : fallback;
    }
}
