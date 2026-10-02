# SheNest

SheNest is an accommodation and roommate platform for women.

The complete application now runs on **Java 17 and Spring Boot**. Java renders
the frontend as **Thymeleaf HTML templates**. The original CSS, fonts, colors,
responsive breakpoints, spacing and SVG icon shapes are reused. Standard HTML
forms submit to Java services for login, filtering, favorites, uploads and all
other actions. The application has no JavaScript or npm dependencies.

## Stack

- Java 17, Spring Boot 3.5 and Spring MVC.
- Thymeleaf HTML templates, CSS and ordinary HTML forms.
- Spring JDBC and SQLite, with the existing schema and data.
- Browser sessions for the website; JWT authentication for REST API clients.
- bcrypt password hashing, local image uploads and Maven.
- JUnit 5, Spring Boot Test and MockMvc for automated tests.

## Run the website

Install JDK 17 or newer. Maven is downloaded by the wrapper automatically on its
first run. An internet connection is required for the initial dependency download.

From the project root:

```bash
cp server/.env.example server/.env
cd server
./mvnw spring-boot:run
```

Windows: use `mvnw.cmd spring-boot:run`.

Open **http://localhost:4000**. This single Java process serves both the website
and the REST API. There is no frontend development server or npm installation
required.

## Configuration

Run from `server/` so relative database/upload paths resolve correctly.
Spring reads `server/.env`; environment variables can override these values.

```properties
PORT=4000
JWT_SECRET=replace-this-with-a-long-random-secret
DATABASE_PATH=data/shenest.db
UPLOAD_DIR=uploads
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Use a long random JWT secret for deployment. Keep the previous secret if existing
REST API tokens should remain usable. Quoted dotenv secrets are supported.
CORS settings are only needed for separate API clients; the Java website uses
same-origin requests.

The SQLite file is created automatically. Create the parent directory first if
you choose a custom database path. Existing data and uploads are reused.

Website logins use HttpOnly session cookies with SameSite=Lax. Browser writes
include a session CSRF token. REST clients can continue using bearer JWT tokens.
For an HTTPS deployment, enable `server.servlet.session.cookie.secure=true`.

## Demo data

Stop the application, then run from `server/`:

```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments=--shenest.seed=true
```

This adds demo data and starts the application. Seeding is explicit and repeatable:
existing users, listings and edited profiles/bookings are preserved. It does not
clear application data. Normal starts do not seed.

Newly seeded accounts use `password123`:

| Role | Email |
| --- | --- |
| Landlord | landlord@shenest.test |
| Landlord | tomi.landlord@shenest.test |
| Admin | admin@shenest.test |
| User | ada@shenest.test |
| User | zainab@shenest.test |
| User | temi@shenest.test |
| User | chioma@shenest.test |
| User | rita@shenest.test |

The demo has eight users, eight Lagos listings, five roommate profiles, six
reviews, six favorites, five bookings and seven messages.

Generated demo images are included in `server/src/main/resources/static/images/seed/`
and packaged in the JAR. They are served automatically when a matching uploaded
seed image is not present. Files placed in `server/uploads/seed/` take priority:

```text
cozy-blush-studio.png
bright-yaba-room.png
modern-ikeja-apartment.png
premium-ikoyi-bedroom.png
akoka-shared-room.png
vi-city-studio.png
gbagada-apartment.png
surulere-room.png
```

For another server origin, pass
`--shenest.seed-base-url=https://your-api.example` when seeding.
Existing image URLs remain unchanged.

## Generated visual assets

The SheNest logo icon, homepage photo and eight listing photos are stored under
`server/src/main/resources/static/images/`. The transparent logo is used by the
navbar, login/signup screen and browser favicon. The photos fill the existing
image slots; colors, spacing, fonts and responsive layout remain unchanged.

These are AI-generated fictional demo interiors, not photos of actual rental
properties. Replace them with accurate property photographs before using these
listings commercially. Five extra interior photos appear in demo listing galleries.
Five fictional adult portraits appear only on the matching demo roommate profiles;
three also fill the homepage roommate circles. Real members keep their initials.
These portraits are AI-generated, not photographs of the named members.

`server/src/main/resources/image-assets.json` records the generation prompts and
filenames. Images were created with the built-in image-generation tool. The
additional prompts are recorded in `additional-image-assets.json` beside it. The
original generated outputs are retained separately; project copies are packaged
with the application.

## Build

From `server/`:

```bash
./mvnw test
./mvnw package
./mvnw clean install
java -jar target/shenest-server-1.0.0.jar
```

The JAR includes the backend, HTML templates, CSS, SVGs and images.
The wrapper runs Maven, so these are equivalent to `mvn test`, `mvn package`
and `mvn clean install` when Maven is installed. Both build commands run the
JUnit tests before producing the executable JAR; `clean install` also installs
the artifact in the local Maven repository.

All controller `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping` and
`@DeleteMapping` methods delegate processing to Spring `@Service` classes.
Controllers bind HTTP inputs and return responses. Services validate inputs,
enforce roles/ownership, perform database operations and manage transactions.
`Database` is the Spring JDBC repository; page services prepare Thymeleaf models.

GitHub Actions runs `clean install` on pushes and pull requests, and uploads the
JAR and Surefire reports as an artifact.
See [BUILD_VERIFICATION.md](BUILD_VERIFICATION.md) for recorded local results.
Do not rebuild a JAR while running directly from that same file; stop the process
first or run a separate copy.

## Features and pages

The original routes remain: home, property search/details/new listing, favorites,
roommates, messages, account, login/signup, landlord dashboard, admin verification
and the styled 404 page.

Property search and roommate filters submit GET requests and render the matching
results. HTML forms support registration/login, favorites, booking requests,
reviews, roommate profiles, direct messages and image uploads. Java redirects
after successful submissions and displays confirmation or validation messages.
Gallery thumbnails open the full photo in a new tab.
Landlords can approve/decline bookings; admins can verify properties.

Members can report a listing, roommate profile, member or received message.
Report links open a labeled form at `/report`; reports are visible only to their
reporter (status) and administrators (details and a snapshot of the reported content).
Admins review reports in `/admin`, recording a private note and marking them reviewed
or dismissed. This does not automatically remove content or suspend an account.
Only a message's recipient can report it; other conversations cannot be accessed
through the reporting API. Duplicate open reports for the same item are rejected.

Use **Block member** on a conversation page to stop new messages and booking
requests in both directions. Existing messages and bookings remain available,
and public profiles stay visible. Unblock on the conversation page or under
**Blocked members** in `/account`. If the other member also blocked you, contact
remains unavailable until both blocks are removed. Blocks and reports persist in
SQLite; their tables are added automatically without clearing existing data.

Public `/privacy` and `/terms` pages use generic school-project wording. They are
linked in every page's footer and in registration. Policy pages have section links;
the website has a keyboard skip link, visible focus indicators and announced form
results. Contact is through the school channel used to share the demo, without a
fictional company or email address.

Click anywhere on a property card to open its details; the favorite heart remains
independent. Details include galleries, amenities, room counts, rent information,
landlord information and viewing questions. Unknown facts are left for the landlord
to confirm. Owners can use **Edit property details** to save optional information;
older listings and their original descriptions are preserved.

The admin area is **http://localhost:4000/admin**. Log in with the seeded
`admin@shenest.test` / `password123` account (unless its password was changed).
Admins are redirected there after login and have an **Admin** navigation link.
The dashboard shows platform counts and listing verification; it is not a full
user-management or deletion console. Do not use demo credentials in production.

## Structure

```text
server/
  pom.xml                         Java application build
  mvnw / mvnw.cmd                 Maven wrapper
  src/main/java/com/shenest/
    PageController.java           HTML page routes
    PageService.java              Models, page data and view selection
    UiAuthController.java         Website login/signup/logout
    BrowserSession.java           Session lookup and CSRF protection
    HtmlErrors.java               Styled HTML error pages
    AuthController.java           REST registration/login
    AuthService.java              Registration, login, JWT and bcrypt authentication
    UiAuthService.java            Browser login session creation and logout
    FormController.java           Ordinary HTML form POST routes
    FormService.java              Form processing, validation messages and redirects
    PropertyController.java       Listing REST endpoints
    PropertyService.java          Listing validation, ownership and transactions
    SocialController.java         Favorites/bookings/reviews/roommates/messages
    SocialService.java            Social feature processing and transactions
    SafetyController.java         Private safety reports, admin review and blocks
    SafetyService.java            Report processing, reviews and block enforcement
    UploadController.java         Image upload endpoint
    UploadService.java            Image validation and file storage
    Database.java                 Spring JDBC SQL access
    DemoSeeder.java               Explicit demo setup
  src/main/resources/
    templates/                    Thymeleaf pages and reusable fragments
    static/css/                   Original stylesheets
    static/images/                Logo, homepage photo and generated demo photos
    image-assets.json             Image filenames and generation prompts
    schema.sql                    Existing SQLite schema
    demo-data.json                Demo records
    application.properties        Runtime configuration
  src/test/java/com/shenest/       JUnit integration and architecture tests
  data/shenest.db                  Existing/local data
  uploads/                        Existing/local images
```

## Beginner reading guide

Start with the files under `server/src/main/`.

1. `SheNestApplication.java`: the `main` method starts the application.
2. `PageController.java`: a browser URL selects a Java method. It delegates to
   `PageService`, which adds data to a `Model` and chooses the HTML template.
3. `templates/properties.html`: displays that data. `th:each` repeats HTML,
   `th:if` displays HTML conditionally, and `th:text` safely inserts text.
   `th:replace` inserts a shared template, such as a property card or the layout.
4. `PropertyController.java`: maps the listing API routes to `PropertyService`.
   `@GetMapping` reads data; `@PostMapping` creates it; `@PatchMapping` changes it.
5. `Database.java`: runs SQL. `findAll` returns a list of rows; `findOne` returns
   one row or `null`. Each row is a `Map`, so `row.get("title")` reads its title.
6. `FormController.java`: receives HTML form submissions under `/ui/forms`.
   `FormService` calls the same business services as the REST controllers and
   redirects to the result page. Hidden CSRF fields protect browser writes.

For example, opening `/properties` calls `showPropertiesPage`, which reads homes,
adds them to the model as `properties`, and renders `properties.html`. Clicking a
favorite submits a POST form to `/ui/forms/favorite`; `FormService` calls
`SocialService` to save the change, then redirects to the updated page.

SQL uses `?` placeholders with separate values, rather than building SQL from
user input. Login stores the user's ID in a browser session. CSRF protection
requires a session token when the browser changes data. Keep these safeguards
when experimenting with the code.

The Java methods use descriptive names, explicit checks and ordinary loops.
Comments explain the less obvious decisions. HTML and CSS are formatted for
reading; the original classes and style rules are retained.

## API and verification

The REST API remains under `/api`: health, auth, properties, favorites, bookings,
reviews, roommates, messages and uploads. Protected API requests can send
`Authorization: Bearer <token>`. The account page reads favorites and bookings.

Image uploads use multipart field `image`, a 5 MB limit, and JPEG, PNG, WebP or
GIF. Files are served under `/uploads/`.

The JUnit suite runs with `./mvnw test` from `server/`. It exercises real
controllers, services, SQLite and templates using temporary data, covering
authentication, roles, ownership, transaction rollback, favorites, bookings,
reviews, roommate updates, messaging privacy, safety reports, blocks, browser
sessions, CSRF, uploads and Java-handled HTML form workflows. Architecture tests
require controller dependencies to be Spring services. Test results appear in
`server/target/surefire-reports/`.

Local data, uploads, environment secrets and build outputs are ignored by Git.
