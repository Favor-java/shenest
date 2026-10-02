package com.shenest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real controllers, services, templates, and SQLite; no live application data is touched. */
@SpringBootTest(properties = {
        "shenest.seed=false",
        "shenest.jwt-secret=integration-test-secret",
        "spring.config.import=optional:classpath:unused-test.properties"
})
@AutoConfigureMockMvc
class ApplicationIntegrationTest {
    private static final Path TEMPORARY = temporaryDirectory();

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + TEMPORARY.resolve("test.db"));
        registry.add("shenest.upload-dir", () -> TEMPORARY.resolve("uploads").toString());
    }

    private static Path temporaryDirectory() {
        try {
            return Files.createTempDirectory("shenest-junit-");
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired Database database;
    @Autowired AuthService authentication;
    private Account renter;
    private Account landlord;
    private Account other;
    private Account admin;

    record Account(long id, String token) {}

    @BeforeEach
    void prepareAccounts() throws Exception {
        for (String table : List.of("safety_reports", "user_blocks", "property_details", "favorites",
                "bookings", "reviews", "roommate_profiles", "messages", "properties", "users")) {
            database.update("DELETE FROM " + table);
        }
        renter = register("renter", "USER");
        landlord = register("landlord", "LANDLORD");
        other = register("other", "LANDLORD");
        admin = register("admin", "USER");
        database.update("UPDATE users SET role = 'ADMIN' WHERE id = ?", admin.id());
    }

    private Account register(String name, String role) throws Exception {
        JsonNode response = api("POST", "/auth/register", null,
                Map.of("name", name, "email", name + "@test.example", "password", "password123", "role", role), 201);
        return new Account(response.path("user").path("id").asLong(), response.path("token").asText());
    }

    private JsonNode api(String method, String path, Account account, Object body, int expectedStatus)
            throws Exception {
        MockHttpServletRequestBuilder builder = request(HttpMethod.valueOf(method), "/api" + path);
        if (account != null) builder.header("Authorization", "Bearer " + account.token());
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
        MvcResult result = mvc.perform(builder).andExpect(status().is(expectedStatus)).andReturn();
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private Map<String, Object> listing() {
        return Map.of("title", "Lagos studio", "description", "A quiet home", "location", "Yaba",
                "price", 100000, "type", "Studio");
    }

    private long createListing() throws Exception {
        return api("POST", "/properties", landlord, listing(), 201).path("id").asLong();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/", "/properties", "/properties/new", "/roommates", "/login", "/register",
            "/favorites", "/account", "/landlord", "/admin", "/messages/1", "/privacy", "/terms"})
    void guestPagesRenderThroughPageService(String path) throws Exception {
        String html = mvc.perform(get(path)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(html).contains("<title>SheNest</title>", "<main", "href=\"/privacy\"", "href=\"/terms\"")
                .doesNotContain("th:", "<script", "/js/", "javascript:");
        var forms = java.util.regex.Pattern.compile("<form\\b[\\s\\S]*?</form>").matcher(html);
        while (forms.find()) {
            String form = forms.group();
            if (form.contains("method=\"post\"")) {
                assertThat(form).contains("name=\"_csrf\"", "action=\"/ui/forms/");
            }
        }
    }

    @Test
    void healthAndPropertyNotFoundUseExpectedStatuses() throws Exception {
        assertThat(api("GET", "/health", null, null, 200).path("ok").asBoolean()).isTrue();
        api("GET", "/properties/999999", null, null, 404);
        mvc.perform(get("/properties/999999")).andExpect(status().isNotFound());
    }

    @Test
    void registrationNormalizesEmailAndNeverExposesPasswordHash() throws Exception {
        JsonNode response = api("POST", "/auth/register", null,
                Map.of("name", "New member", "email", " NEW@Test.Example ", "password", "password123"), 201);
        assertThat(response.path("user").path("email").asText()).isEqualTo("new@test.example");
        assertThat(response.path("user").has("password")).isFalse();
        String hash = (String) database.findOne("SELECT password FROM users WHERE email = ?", "new@test.example").get("password");
        assertThat(hash).isNotEqualTo("password123");
        assertThat(authentication.passwordMatches("password123", hash)).isTrue();
        api("POST", "/auth/register", null,
                Map.of("name", "Duplicate", "email", "new@test.example", "password", "password123"), 409);
    }

    @Test
    void authenticationRejectsInvalidCredentialsTokensAndAdminRegistration() throws Exception {
        api("POST", "/auth/login", null, Map.of("email", "renter@test.example", "password", "wrong"), 401);
        api("POST", "/auth/register", null,
                Map.of("name", "Escalation", "email", "bad@test.example", "password", "password123", "role", "ADMIN"), 400);
        api("POST", "/auth/register", null,
                Map.of("name", "Short", "email", "short@test.example", "password", "short"), 400);
        api("GET", "/favorites", null, null, 401);
        api("GET", "/favorites", new Account(0, "invalid-token"), null, 401);
        assertThat(api("POST", "/auth/login", null,
                Map.of("email", "RENTER@test.example", "password", "password123"), 200).path("user").has("password")).isFalse();
    }

    @Test
    void propertyWorkflowEnforcesRolesOwnershipAndAdminVerification() throws Exception {
        api("POST", "/properties", renter, listing(), 403);
        long id = createListing();
        assertThat(api("GET", "/properties?search=Yaba&type=Studio", null, null, 200).size()).isEqualTo(1);
        assertThat(api("GET", "/properties?type=Apartment", null, null, 200).size()).isZero();
        assertThat(api("GET", "/properties/mine", landlord, null, 200).get(0).path("owner_id").asLong()).isEqualTo(landlord.id());
        api("PATCH", "/properties/" + id + "/details", other, Map.of("bedrooms", 2), 403);
        api("PATCH", "/properties/" + id + "/details", landlord, Map.of("bedrooms", 2, "amenities", "Wi-Fi\nWater"), 200);
        assertThat(api("GET", "/properties/" + id + "/details", null, null, 200).path("bedrooms").asInt()).isEqualTo(2);
        api("GET", "/properties/pending", renter, null, 403);
        assertThat(api("GET", "/properties/pending", admin, null, 200).size()).isEqualTo(1);
        api("PATCH", "/properties/" + id + "/verify", landlord, null, 403);
        assertThat(api("PATCH", "/properties/" + id + "/verify", admin, null, 200).path("verified").asInt()).isEqualTo(1);
        mvc.perform(get("/properties/" + id)).andExpect(status().isOk());
    }

    @Test
    void invalidPropertyDetailsRollBackTheEntireListingCreation() throws Exception {
        var invalid = new java.util.LinkedHashMap<>(listing());
        invalid.put("bedrooms", -1);
        api("POST", "/properties", landlord, invalid, 400);
        assertThat(api("GET", "/properties", null, null, 200).size()).isZero();
        assertThat(database.findAll("SELECT * FROM property_details")).isEmpty();
    }

    @Test
    void favoritesToggleAndBelongOnlyToTheirMember() throws Exception {
        long id = createListing();
        assertThat(api("POST", "/favorites/" + id, renter, null, 200).path("saved").asBoolean()).isTrue();
        assertThat(api("GET", "/favorites", renter, null, 200).size()).isEqualTo(1);
        assertThat(api("GET", "/favorites", other, null, 200).size()).isZero();
        assertThat(api("POST", "/favorites/" + id, renter, null, 200).path("saved").asBoolean()).isFalse();
        api("POST", "/favorites/999999", renter, null, 404);
    }

    @Test
    void bookingCanBeDecidedOnlyByThePropertyOwner() throws Exception {
        long id = createListing();
        long booking = api("POST", "/bookings", renter, Map.of("propertyId", id), 201).path("id").asLong();
        assertThat(api("GET", "/bookings/mine", renter, null, 200).get(0).path("status").asText()).isEqualTo("PENDING");
        assertThat(api("GET", "/bookings/landlord", landlord, null, 200).get(0).path("renter_name").asText()).isEqualTo("renter");
        api("PATCH", "/bookings/" + booking + "/status", other, Map.of("status", "APPROVED"), 404);
        api("PATCH", "/bookings/" + booking + "/status", landlord, Map.of("status", "INVALID"), 400);
        assertThat(api("PATCH", "/bookings/" + booking + "/status", landlord,
                Map.of("status", "approved"), 200).path("status").asText()).isEqualTo("APPROVED");
        api("POST", "/bookings", landlord, Map.of("propertyId", id), 400);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "6", "2.5", "oops"})
    void invalidReviewRatingsAreRejectedWithoutSaving(String rating) throws Exception {
        long id = createListing();
        api("POST", "/reviews/" + id, renter, Map.of("rating", rating), 400);
        assertThat(api("GET", "/reviews/" + id, null, null, 200).size()).isZero();
    }

    @Test
    void reviewAndRoommateProfileSaveAndUpdate() throws Exception {
        long id = createListing();
        api("POST", "/reviews/" + id, renter, Map.of("rating", 5, "comment", "Great home"), 201);
        assertThat(api("GET", "/reviews/" + id, null, null, 200).get(0).path("rating").asInt()).isEqualTo(5);
        Map<String, Object> profile = Map.of("bio", "Quiet", "location", "Yaba", "budget", 500000);
        long profileId = api("PUT", "/roommates/me", renter, profile, 200).path("id").asLong();
        JsonNode updated = api("PUT", "/roommates/me", renter,
                Map.of("bio", "Updated", "location", "Yaba", "budget", 600000), 200);
        assertThat(updated.path("id").asLong()).isEqualTo(profileId);
        assertThat(api("GET", "/roommates?location=Yaba", null, null, 200).get(0).path("bio").asText()).isEqualTo("Updated");
    }

    @Test
    void messagesRemainPrivateAndBlocksPreventContactInBothDirections() throws Exception {
        long propertyId = createListing();
        api("POST", "/messages/" + landlord.id(), renter, Map.of("text", " Hello "), 201);
        assertThat(api("GET", "/messages/" + renter.id(), landlord, null, 200).get(0).path("text").asText()).isEqualTo("Hello");
        assertThat(api("GET", "/messages/" + landlord.id(), other, null, 200).size()).isZero();
        api("PUT", "/blocks/" + landlord.id(), renter, null, 200);
        api("PUT", "/blocks/" + renter.id(), landlord, null, 200);
        api("POST", "/messages/" + landlord.id(), renter, Map.of("text", "Blocked"), 403);
        api("POST", "/messages/" + renter.id(), landlord, Map.of("text", "Blocked"), 403);
        api("POST", "/bookings", renter, Map.of("propertyId", propertyId), 403);
        assertThat(api("GET", "/messages/" + landlord.id(), renter, null, 200).size()).isEqualTo(1);
        api("DELETE", "/blocks/" + landlord.id(), renter, null, 200);
        api("POST", "/messages/" + landlord.id(), renter, Map.of("text", "Still blocked"), 403);
        api("DELETE", "/blocks/" + renter.id(), landlord, null, 200);
        api("POST", "/messages/" + landlord.id(), renter, Map.of("text", "Restored"), 201);
    }

    @Test
    void reportsKeepEvidencePrivateAndRequireAnAdminDecision() throws Exception {
        Map<String, Object> body = Map.of("targetType", "USER", "targetId", landlord.id(),
                "reason", "HARASSMENT", "details", "Private evidence");
        long report = api("POST", "/reports", renter, body, 201).path("id").asLong();
        api("POST", "/reports", renter, body, 409);
        JsonNode ownReport = api("GET", "/reports/mine", renter, null, 200).get(0);
        assertThat(ownReport.has("context")).isFalse();
        assertThat(ownReport.has("details")).isFalse();
        assertThat(api("GET", "/reports/mine", landlord, null, 200).size()).isZero();
        api("GET", "/admin/reports", renter, null, 403);
        assertThat(api("GET", "/admin/reports", admin, null, 200).get(0).path("details").asText()).isEqualTo("Private evidence");
        api("PATCH", "/admin/reports/" + report, renter, Map.of("status", "REVIEWED", "note", "Checked"), 403);
        api("PATCH", "/admin/reports/" + report, admin, Map.of("status", "REVIEWED", "note", "Checked"), 200);
        api("PATCH", "/admin/reports/" + report, admin, Map.of("status", "DISMISSED", "note", "Again"), 409);
        JsonNode reviewed = api("GET", "/reports/mine", renter, null, 200).get(0);
        assertThat(reviewed.path("status").asText()).isEqualTo("REVIEWED");
        assertThat(reviewed.has("review_note")).isFalse();
    }

    @Test
    void onlyTheMessageRecipientCanReportIt() throws Exception {
        long message = api("POST", "/messages/" + landlord.id(), renter, Map.of("text", "Message evidence"), 201).path("id").asLong();
        Map<String, Object> report = Map.of("targetType", "MESSAGE", "targetId", message, "reason", "OTHER", "details", "Please review");
        api("POST", "/reports", other, report, 404);
        api("POST", "/reports", renter, report, 404);
        api("POST", "/reports", landlord, report, 201);
    }

    @Test
    void browserLoginRotatesSessionAndRequiresCsrfForWrites() throws Exception {
        MockHttpSession session = (MockHttpSession) mvc.perform(get("/login"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        String originalId = session.getId();
        String csrf = (String) session.getAttribute("csrf");
        byte[] credentials = json.writeValueAsBytes(Map.of("email", "renter@test.example", "password", "password123"));
        mvc.perform(post("/ui/login").session(session).contentType(MediaType.APPLICATION_JSON).content(credentials))
                .andExpect(status().isForbidden());
        mvc.perform(post("/ui/login").session(session).header("X-CSRF-Token", csrf)
                .contentType(MediaType.APPLICATION_JSON).content(credentials)).andExpect(status().isOk());
        assertThat(session.getId()).isNotEqualTo(originalId);
        assertThat(session.getAttribute("userId")).isEqualTo(renter.id());
        mvc.perform(request(HttpMethod.PUT, "/api/blocks/" + landlord.id()).session(session))
                .andExpect(status().isForbidden());
        mvc.perform(post("/ui/logout").session(session).header("X-CSRF-Token", csrf)).andExpect(status().isOk());
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void uploadsEnforceRoleAndTypeAndServeSavedBytes() throws Exception {
        byte[] bytes = java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVWQAAAAASUVORK5CYII=");
        MockMultipartFile image = new MockMultipartFile("image", "../../image.png", "image/png", bytes);
        mvc.perform(multipart("/api/uploads/property-image").file(image).header("Authorization", "Bearer " + renter.token()))
                .andExpect(status().isForbidden());
        MvcResult result = mvc.perform(multipart("/api/uploads/property-image").file(image)
                .header("Authorization", "Bearer " + landlord.token())).andExpect(status().isCreated()).andReturn();
        String url = json.readTree(result.getResponse().getContentAsByteArray()).path("url").asText();
        assertThat(url).doesNotContain("..");
        byte[] downloaded = mvc.perform(get(java.net.URI.create(url).getPath())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(downloaded).isEqualTo(bytes);
        MockMultipartFile invalid = new MockMultipartFile("image", "bad.txt", "text/plain", bytes);
        mvc.perform(multipart("/api/uploads/property-image").file(invalid).header("Authorization", "Bearer " + landlord.token()))
                .andExpect(status().isBadRequest());
    }

    private MockHttpSession browserSession(Account account) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", account.id());
        session.setAttribute("csrf", java.util.UUID.randomUUID().toString());
        return session;
    }

    private MvcResult form(String action, MockHttpSession session, Map<String, ?> fields) throws Exception {
        var builder = post("/ui/forms/" + action).session(session)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("_csrf", (String) session.getAttribute("csrf"));
        fields.forEach((key, value) -> builder.param(key, String.valueOf(value)));
        return mvc.perform(builder).andExpect(status().is3xxRedirection()).andReturn();
    }

    @Test
    void nativeLoginRegistrationAndLogoutWorkWithoutScripts() throws Exception {
        MockHttpSession session = (MockHttpSession) mvc.perform(get("/login"))
                .andExpect(status().isOk()).andReturn().getRequest().getSession();
        String originalId = session.getId();
        MvcResult login = form("login", session, Map.of("email", "renter@test.example", "password", "password123"));
        assertThat(login.getResponse().getRedirectedUrl()).isEqualTo("/account");
        assertThat(session.getId()).isNotEqualTo(originalId);
        String account = mvc.perform(get("/account").session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(account).contains("renter@test.example", "/ui/forms/logout").doesNotContain("<script");
        form("logout", session, Map.of());
        assertThat(session.isInvalid()).isTrue();

        MockHttpSession registration = (MockHttpSession) mvc.perform(get("/register"))
                .andReturn().getRequest().getSession();
        MvcResult result = form("register", registration,
                Map.of("name", "Native user", "email", "NATIVE@test.example", "password", "password123", "role", "USER"));
        assertThat(result.getResponse().getRedirectedUrl()).isEqualTo("/account");
        assertThat(registration.getAttribute("userId")).isNotNull();
        assertThat(database.findOne("SELECT name FROM users WHERE email = ?", "native@test.example").get("name"))
                .isEqualTo("Native user");
    }

    @Test
    void nativeFormsRequireCsrfAndDoNotRelaxApiCsrfProtection() throws Exception {
        MockHttpSession session = browserSession(renter);
        mvc.perform(post("/ui/forms/favorite").session(session).param("propertyId", "1"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/ui/forms/logout").session(session).param("_csrf", "wrong"))
                .andExpect(status().isForbidden());
        mvc.perform(request(HttpMethod.PUT, "/api/blocks/" + landlord.id()).session(session)
                .param("_csrf", (String) session.getAttribute("csrf"))).andExpect(status().isForbidden());
        assertThat(database.findAll("SELECT * FROM user_blocks")).isEmpty();
    }

    @Test
    void nativeFavoritesToggleAndRejectExternalRedirects() throws Exception {
        long id = createListing();
        MockHttpSession session = browserSession(renter);
        MvcResult saved = form("favorite", session, Map.of("propertyId", id, "returnTo", "/properties/" + id));
        assertThat(saved.getResponse().getRedirectedUrl()).isEqualTo("/properties/" + id);
        assertThat(database.findAll("SELECT * FROM favorites WHERE user_id = ?", renter.id())).hasSize(1);
        String html = mvc.perform(get("/favorites").session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("heart-button saved", "/ui/forms/favorite").doesNotContain("<script");
        MvcResult removed = form("favorite", session, Map.of("propertyId", id, "returnTo", "//evil.example"));
        assertThat(removed.getResponse().getRedirectedUrl()).isEqualTo("/favorites");
        assertThat(database.findAll("SELECT * FROM favorites")).isEmpty();
    }

    @Test
    void nativeListingCreationUploadsPhotoAndSupportsOwnedDetailsEditing() throws Exception {
        MockHttpSession session = browserSession(landlord);
        MockMultipartFile image = new MockMultipartFile("image", "photo.png", "image/png", new byte[] {1, 2, 3});
        var create = multipart("/ui/forms/create-property").file(image).session(session)
                .param("_csrf", (String) session.getAttribute("csrf"));
        listing().forEach((key, value) -> create.param(key, String.valueOf(value)));
        MvcResult result = mvc.perform(create).andExpect(status().is3xxRedirection()).andReturn();
        Map<String, Object> property = database.findOne("SELECT * FROM properties");
        long id = Input.getId(property);
        assertThat(result.getResponse().getRedirectedUrl()).isEqualTo("/properties/" + id);
        assertThat((String) property.get("image")).contains("/uploads/").endsWith(".png");
        form("edit-property", session, Map.of("propertyId", id, "bedrooms", 2, "amenities", "Water\nWi-Fi"));
        assertThat(((Number) database.findOne("SELECT bedrooms FROM property_details WHERE property_id = ?", id)
                .get("bedrooms")).intValue()).isEqualTo(2);
        String edited = mvc.perform(get("/properties/" + id + "/edit").session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(edited).contains("/ui/forms/edit-property", "name=\"_csrf\"");
    }

    @Test
    void nativeValidationShowsMessagesAndRetainsServiceRoleAndRollbackChecks() throws Exception {
        MvcResult denied = form("create-property", browserSession(renter), listing());
        assertThat(denied.getFlashMap().get("noticeError")).isEqualTo(true);
        assertThat(database.findAll("SELECT * FROM properties")).isEmpty();
        var invalid = new java.util.LinkedHashMap<String, Object>(listing());
        invalid.put("bedrooms", -1);
        MvcResult failed = form("create-property", browserSession(landlord), invalid);
        assertThat(failed.getResponse().getRedirectedUrl()).isEqualTo("/properties/new");
        assertThat(failed.getFlashMap().get("noticeError")).isEqualTo(true);
        assertThat(database.findAll("SELECT * FROM properties")).isEmpty();

        MockHttpSession session = browserSession(renter);
        MvcResult login = form("login", session, Map.of("email", "renter@test.example", "password", "wrong"));
        assertThat(login.getResponse().getRedirectedUrl()).isEqualTo("/login");
        String errorPage = mvc.perform(get("/login").session(session).flashAttrs(login.getFlashMap()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(errorPage).contains("Email or password is incorrect.", "page-notice error");
    }

    @Test
    void nativeBookingsReviewsAndRoommateProfileSubmissionsPersist() throws Exception {
        long id = createListing();
        MockHttpSession session = browserSession(renter);
        form("book", session, Map.of("propertyId", id, "message", "Viewing please"));
        long booking = Input.getId(database.findOne("SELECT * FROM bookings"));
        form("booking-status", browserSession(landlord), Map.of("bookingId", booking, "status", "APPROVED"));
        assertThat(database.findOne("SELECT status FROM bookings WHERE id = ?", booking).get("status")).isEqualTo("APPROVED");
        form("review", session, Map.of("propertyId", id, "rating", 5, "comment", "A lovely home"));
        form("roommate", session, Map.of("bio", "Quiet reader", "location", "Yaba", "budget", 500000));
        String html = mvc.perform(get("/properties/" + id).session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("A lovely home", "/ui/forms/review", "/ui/forms/book");
        String profiles = mvc.perform(get("/roommates").param("location", "Yaba").session(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(profiles).contains("Quiet reader", "action=\"/roommates\"", "/ui/forms/roommate");
        String dashboard = mvc.perform(get("/landlord").session(browserSession(landlord)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(dashboard).contains("APPROVED", "Viewing please");
    }

    @Test
    void nativeMessagingAndBlockingUpdateConversationAndEnforceContactRules() throws Exception {
        MockHttpSession session = browserSession(renter);
        form("message", session, Map.of("userId", landlord.id(), "text", " Hello <script> "));
        form("block", session, Map.of("userId", landlord.id(), "returnTo", "/messages/" + landlord.id()));
        MvcResult blocked = form("message", session, Map.of("userId", landlord.id(), "text", "Blocked"));
        assertThat(blocked.getFlashMap().get("noticeError")).isEqualTo(true);
        assertThat(database.findAll("SELECT * FROM messages")).hasSize(1);
        String html = mvc.perform(get("/messages/" + landlord.id()).session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(html).contains("&lt;script&gt;", "/ui/forms/unblock").doesNotContain("action=\"/ui/forms/message\"");
        form("unblock", session, Map.of("userId", landlord.id(), "returnTo", "/messages/" + landlord.id()));
        form("message", session, Map.of("userId", landlord.id(), "text", "Contact restored"));
        assertThat(database.findAll("SELECT * FROM messages")).hasSize(2);
        String restored = mvc.perform(get("/messages/" + landlord.id()).session(session)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(restored).contains("/ui/forms/message", "Contact restored").doesNotContain("<script");
    }

    @Test
    void nativeReportsAndAdminActionsEnforcePermissionsAndRenderDecisions() throws Exception {
        long propertyId = createListing();
        MockHttpSession renterSession = browserSession(renter);
        form("report", renterSession, Map.of("targetType", "PROPERTY", "targetId", propertyId,
                "reason", "MISLEADING", "details", "Please check the listing"));
        long report = Input.getId(database.findOne("SELECT * FROM safety_reports"));
        String reportForm = mvc.perform(get("/report").param("type", "USER").param("id", String.valueOf(landlord.id()))
                .session(renterSession)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(reportForm).contains("/ui/forms/report", "name=\"_csrf\"");
        assertThat(form("verify", renterSession, Map.of("propertyId", propertyId)).getFlashMap().get("noticeError"))
                .isEqualTo(true);
        MockHttpSession adminSession = browserSession(admin);
        String adminPage = mvc.perform(get("/admin").session(adminSession)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(adminPage).contains("/ui/forms/verify", "/ui/forms/review-report");
        form("verify", adminSession, Map.of("propertyId", propertyId));
        form("review-report", adminSession, Map.of("reportId", report, "status", "REVIEWED", "note", "Checked the details"));
        assertThat(((Number) database.findOne("SELECT verified FROM properties WHERE id = ?", propertyId)
                .get("verified")).intValue()).isEqualTo(1);
        String decision = mvc.perform(get("/admin").session(adminSession)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(decision).contains("REVIEWED", "Checked the details").doesNotContain("<script");
    }
}
