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
                .doesNotContain("th:");
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
}
