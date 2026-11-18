# SheNest Project Report.

## 1. Executive summary

SheNest is a Java Spring Boot web application for helping women discover accommodation and roommates. It is a self-contained platform built around a small SQLite database, server-side HTML rendering with Thymeleaf, and a REST-style API for programmatic actions.

At a high level, the system does four things:

- lets users register and log in as `USER` or `LANDLORD`
- lets landlords create, manage, and verify property listings
- supports favorites, booking requests, reviews, private messaging, roommate profiles, and safety reporting
- exposes a browser-first interface with server-rendered pages and form posts, while also supporting API endpoints for authenticated clients

The application is intentionally simple and opinionated: no frontend framework, no Node build step, no microservices, and no external auth provider. The business rules live in Java services, persistence is handled with `JdbcTemplate`, and the UI is generated from templates and HTML forms.

---

## 2. Project purpose and product model

The product is meant to serve a specific market need: safe and practical housing discovery for women. The domain model includes:

- users, with roles and login credentials
- properties, each owned by a landlord and optionally verified by an admin
- bookings between renters and landlords
- favorites to save property listings
- reviews on listings
- roommate profiles for matching people looking for shared living
- private messages between users
- safety reporting and blocking tools to protect members

The product is not a generic marketplace; it is built around trust, suitability, moderation, and private communication. The design explicitly includes member reporting, admin review, and contact restrictions between blocked users.

---

## 3. Core technology stack

### 3.1 Java and Spring Boot

The server is a Spring Boot application using Java 17.

Key dependencies from `server/pom.xml`:

- `spring-boot-starter-web` for HTTP routes and controllers
- `spring-boot-starter-thymeleaf` for server-rendered HTML views
- `spring-boot-starter-jdbc` for JDBC access
- `sqlite-jdbc` for SQLite storage
- `spring-security-crypto` for password hashing
- `java-jwt` for signed JWT tokens for API auth
- `spring-boot-starter-test` for integration and architecture tests

### 3.2 SQLite database

The app uses SQLite as its primary datastore. The database is configured in `server/src/main/resources/application.properties`:

- DB file: `data/shenest.db` by default
- connection is configured through `spring.datasource.url`
- SQLite foreign keys are enabled via `PRAGMA foreign_keys=ON`
- a single DB connection is used by default for simplicity and low operational overhead

This makes the project easy to run locally and easy to package as a single JAR.

### 3.3 Thymeleaf and server-rendered pages

The UI is not React or another JavaScript-heavy framework. The app renders HTML templates from Spring controllers, and ordinary HTML forms submit to server-side actions. This reduces complexity and matches the project’s “simple web app” intent.

The frontend is therefore closer to classic server-rendered web applications than modern SPAs.

---

## 4. Runtime startup and configuration

The application entry point is `server/src/main/java/com/shenest/SheNestApplication.java`.

When the app starts:

1. it creates the `data` directory if it does not exist
2. it loads Spring Boot
3. it reads environment settings from `server/.env` if present
4. it initializes the database schema using `schema.sql`
5. it begins serving HTTP traffic on port `4000` by default

### Environment configuration

The file `server/.env.example` shows the expected environment variables:

- `PORT`
- `JWT_SECRET`
- `DATABASE_PATH`
- `UPLOAD_DIR`
- `CORS_ORIGINS`

The runtime configuration is loaded by `application.properties`, which also maps the upload directory and custom CORS origins.

---

## 5. High-level architecture

SheNest follows a classic layered MVC-style architecture with explicit service boundaries.

### 5.1 Layering pattern

The design uses a consistent pattern across the application:

- controllers receive HTTP requests
- services contain business logic and validation
- `Database` wraps JDBC operations and runs SQL queries
- SQLite tables store the persistent state
- templates render the HTML pages and forms

This is visible across classes such as:

- `AuthController` -> `AuthService`
- `PropertyController` -> `PropertyService`
- `SocialController` -> `SocialService`
- `SafetyController` -> `SafetyService`
- `UploadController` -> `UploadService`
- `PageController` -> `PageService`
- `FormController` -> `FormService`

The architecture test enforces this pattern by asserting that controller fields point only to Spring services.

### 5.2 Request flow

The app supports two main request styles:

#### A. Browser-driven HTML flow

- a user visits a route such as `/properties`, `/account`, `/landlord`, or `/roommates`
- `PageController` delegates to `PageService`
- `PageService` fetches data and returns a Thymeleaf template name
- templates render HTML forms with CSRF hidden tokens
- form submissions are routed through `/ui/forms/{action}` and handled by `FormController`
- form actions are implemented in `FormService`

#### B. API-style flow

- clients call `/api/...` endpoints
- controllers bind JSON payloads and delegate to services
- services validate input and enforce permissions
- responses return JSON maps and status codes

This dual model gives the project both a user-facing website and a clean backend surface.

---

## 6. Internal structure

The Java code lives under `server/src/main/java/com/shenest`.

### 6.1 Core application files

Main application files and their role:

- `SheNestApplication.java` – Spring Boot entry point
- `Database.java` – thin JDBC wrapper around raw SQL queries
- `WebConfig.java` – static resource settings, upload path, CORS, and interceptors
- `BrowserSession.java` – browser auth/session manager and CSRF enforcement
- `Input.java` – helper for request validation and type conversion
- `ApiException.java` and `ApiErrors.java` – centralized error handling and API errors
- `HtmlErrors.java` – HTML error handling and simple page-based error views

### 6.2 Auth-related code

- `AuthController.java` – registers and logs in API users
- `AuthService.java` – password hashing, user lookup, JWT generation, role checks
- `UiAuthController.java` and `UiAuthService.java` – browser session login/logout flows
- `AuthenticatedUser.java` – lightweight authenticated user model

These classes separate API JWT authentication from server session-based browser authentication while sharing the same core password-validation logic.

### 6.3 Property lifecycle

- `PropertyController.java` – REST endpoints for property listing queries and creation
- `PropertyService.java` – core listing validation, ownership checks, verification actions
- `PropertyDetails.java` – details rows stored separately from the base property record

The design intentionally separates the main `properties` table from optional extra listing details stored in `property_details`. This makes the schema flexible and reduces risk of damaging older rows when data is optional or partial.

### 6.4 Social and marketplace features

- `SocialController.java` – favorites, bookings, reviews, roommate profiles, messages
- `SocialService.java` – feature business logic

The project’s social layer covers the main community features:

- save property listings
- request a booking with an optional message
- approve or decline booking requests
- leave property reviews
- show roommate profiles by location
- save or update a roommate profile
- send and read private messages

### 6.5 Safety and moderation

- `SafetyController.java` – report and block endpoints
- `SafetyService.java` – private reports, block lists, admin decisions

This module enforces interpersonal safety and moderation. It includes:

- `user_blocks` records to prevent contact between users
- `safety_reports` for complaints and reported content
- report target checks to ensure only valid objects are reported
- status flow: `OPEN` -> `REVIEWED` or `DISMISSED`

Only administrators can read the complete report queue and close out reports.

### 6.6 Uploads

- `UploadController.java` and `UploadService.java` handle uploading property images
- `WebConfig.java` exposes uploaded files under `/uploads/**`

Uploads are stored on disk, not in the database, and are limited to image types and file size. The app checks for JPEG, PNG, WebP, and GIF, with a hard 5 MB cap.

### 6.7 Pages and forms

- `PageController.java` – page-level routes for website pages
- `PageService.java` – prepares page data and fetches model objects for templates
- `FormController.java` and `FormService.java` – form actions such as login, favorite toggles, booking decisions, property editing, review posting, messages, blocks, and admin review

This is where the browser-first portion of the project is assembled.

---

## 7. Database model

The schema is defined in `server/src/main/resources/schema.sql`.

### 7.1 Core tables

#### `users`
Stores:

- `id`
- `name`
- `email` (unique)
- `password` (hashed)
- `role` (`USER`, `LANDLORD`, `ADMIN`)
- timestamps

#### `properties`
Stores:

- base listing metadata: title, description, location, price, type, image
- verification status (`verified`)
- owner relationship to a user
- creation date

#### `favorites`
A join table with composite key `(user_id, property_id)`.

#### `bookings`
Tracks viewing or booking requests:

- `user_id`
- `property_id`
- optional message
- `status` (`PENDING`, `APPROVED`, and `DECLINED` by business logic)

#### `reviews`
Stores rating and comment by property.

#### `roommate_profiles`
One profile per user, used for roommate matching.

#### `messages`
Stores chat messages with `sender_id` and `receiver_id`.

### 7.2 Supporting detail tables

#### `property_details`
Used to store optional extras for listings without altering older properties. It holds:

- bedroom and bathroom counts
- occupancy limits
- furnishing type
- available_from
- amenities
- house rules
- rent terms
- additional costs
- gallery-related detail data is represented as JSON-style or list-like content

#### `user_blocks`
Stores who blocked whom. The schema prevents self-blocking.

#### `safety_reports`
Represents moderated safety complaints. It records:

- reporter and subject user
- target type (`USER`, `PROPERTY`, `MESSAGE`)
- reason
- details and context
- status (`OPEN`, `REVIEWED`, `DISMISSED`)
- review metadata and note

The app also adds indexes for report lookup by status.

---

## 8. How the application works in practice

### 8.1 Registration and login

User registration happens in `AuthService.register()`:

1. validate name, email, password, and role
2. normalize the email to lowercase
3. check for duplicates
4. hash the password with BCrypt
5. insert the user into the `users` table
6. return the user profile plus a JWT token for API clients

Browser login is handled by `UiAuthService`, which reuses the same underlying login logic and stores a session user ID in the server-side session.

### 8.2 Property creation and verification

Landlords create listings through `PropertyService.create()`.

Validation includes:

- only `LANDLORD` users may create listings
- price must be positive
- title, description, location, and type are required
- property is inserted into `properties`
- optional extra details are saved in `property_details`

Verification is admin-only. When admin verification happens, the `verified` column on the property is set to `1`.

### 8.3 Favorites and bookings

Favorites are transactional inserts or deletes in the `favorites` table.

Booking requests work like this:

1. the renter calls `createBooking` with a property ID and optional message
2. the app verifies the property exists and is not the renter’s own property
3. the app checks that the two users are not blocked from contacting each other
4. a row is inserted in `bookings`
5. the landlord can later approve or decline via an update on the booking row

### 8.4 Reviews and roommate matchmaking

A review is inserted into the `reviews` table with a numeric rating between 1 and 5 and an optional comment.

Roommate profiles are stored in `roommate_profiles`, keyed by `user_id`. The app supports upsert behavior: if a user already has a profile, it updates it; otherwise it creates one.

### 8.5 Messaging and safety

Messages are stored in `messages` with `sender_id` and `receiver_id`. The application enforces:

- users cannot message themselves
- receiver and sender must be allowed to contact each other
- block checks are enforced before sending

Safety reporting provides a private moderation flow. Reports are tied to a target type and held in `safety_reports`. Admins review the queue and can mark a case as `REVIEWED` or `DISMISSED`.

---

## 9. Security and trust model

The project has several practical safeguards built in:

### 9.1 Password hashing

Passwords are never stored in plaintext. `AuthService` uses BCrypt with a cost factor of 10.

### 9.2 JWT and session auth

API requests may use a bearer token. Browser requests use an HTTP session cookie (`SHENEST_SESSION`).

`AuthService.requireLoggedInUser()` checks the request in this order:

1. `Authorization: Bearer ...` header
2. active session cookie for browser requests

It revalidates the user’s role from the database instead of trusting stale session or token data.

### 9.3 CSRF protection

The `BrowserSession` interceptor checks for a CSRF token on non-GET requests. It compares a server-side token stored in the session against a request header or hidden form field named `_csrf`.

This is especially important because the site uses HTML forms for state-changing actions.

### 9.4 Role enforcement

The app enforces permissions in service methods:

- landlords may create and manage own listings
- admins may verify properties and review safety reports
- members can block and report others but cannot report themselves or contact blocked users

This keeps the business logic centralized and consistent across both REST and HTML form flows.

### 9.5 File upload validation

`UploadService` validates image type and size before accepting content. It also requires the current user to be a landlord.

### 9.6 CORS configuration

`WebConfig` defines a small allowlist of approved origins and only permits configured methods and headers.

---

## 10. Frontend structure and templates

The templates live in `server/src/main/resources/templates`.

Important pages include:

- `home.html`
- `properties.html`
- `property-details.html`
- `create-property.html`
- `edit-property-details.html`
- `favorites.html`
- `roommates.html`
- `messages.html`
- `landlord.html`
- `admin.html`
- `account.html`
- `auth.html`
- `report.html`
- `privacy.html`
- `terms.html`
- `not-found.html`

There are also reusable fragments:

- `fragments/layout.html`
- `fragments/property-card.html`
- `fragments/property-fields.html`
- `fragments/icons.html`

The layout fragments centralize navigation, shared page metadata, and common UI composition.

---

## 11. Demo data and seed behavior

The application includes a demo seeding mechanism under `DemoSeeder.java`.

It loads data from `demo-data.json` when the app starts with:

- `--shenest.seed=true`

The seed behavior:

- creates demo users if they do not already exist
- creates demo property listings
- seeds favorites, reviews, bookings, messages, and roommate profiles
- keeps existing data intact rather than resetting the database

This is useful for local development, product demos, and UI validation without needing production-style fixtures.

---

## 12. Test strategy and verification

The repository includes real application tests, not just unit tests.

### 12.1 Integration tests

`ApplicationIntegrationTest` exercises the actual controllers, services, templates, and SQLite database. It validates:

- registration and login flows
- role restrictions
- property listing creation and admin verification
- favorites and booking logic
- reviews, messages, blocks, and reports
- CSRF and session behavior
- file uploads

### 12.2 Architecture tests

`ControllerArchitectureTest` checks that controllers delegate through Spring services and do not own logic directly.

### 12.3 Build verification

The project’s verification documentation confirms successful package and install builds with Java 17 and Maven wrapper. The standard validation command is:

```bash
cd server
./mvnw test
./mvnw clean install
```

The testing output confirms the project is in a passing state.

---

## 13. Operational model and deployment shape

This project is intentionally simple operationally:

- one Java process
- one SQLite database file
- static uploads in a local directory
- no message broker, no cache cluster, no external database service

This means the app is easy to run in a small environment or local workstation, but it is also intentionally limited in scale and distribution. The application is a monolith, not a horizontally distributed system.

In practical deployment terms, the app is packaged as a single runnable JAR and can be launched with:

```bash
cd server
./mvnw spring-boot:run
```

or from the built artifact:

```bash
java -jar target/shenest-server-1.0.0.jar
```

---

## 14. Architectural conclusions

SheNest is a compact, domain-driven monolith designed around a narrow but complete housing marketplace workflow. The strongest architectural characteristics are:

- clear service boundaries
- centralized validation and role enforcement
- database-first persistence
- no JavaScript frontend complexity
- browser HTML forms plus API support
- privacy and moderation built directly into the stack

The project’s design choice to keep business logic in services and make controllers thin is one of its main strengths. It keeps the code predictable, testable, and easy to reason about.

The main tradeoff is that it is a single-server application, so scaling, advanced multi-service orchestration, and heavily asynchronous workloads are not part of the current project design. That is consistent with the project’s goal: an approachable, low-complexity housing platform that is easy to run and maintain.

---

## 15. Summary

SheNest is a full-stack Spring Boot housing marketplace with a strong focus on community safety, landlord management, and roommate matching. It combines server-rendered pages, database-backed business logic, role-based access control, and explicit moderation tools.

Its internal structure remains easy to follow because the project consistently uses the same pattern: HTTP controller -> service -> repository/database -> SQLite -> HTML or JSON response.

That architecture is the central reason the project remains readable, testable, and operationally simple.
