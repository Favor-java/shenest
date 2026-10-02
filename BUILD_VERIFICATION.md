# Build and test verification

Verified locally on **2 October 2026**, using Java **17.0.20.1**, Maven
**3.9.11** (the committed wrapper), and Spring Boot **3.5.16**.

## 1. Spring Boot and services

All GET, POST, PUT, PATCH and DELETE controller methods delegate processing to
Spring services:

| Controller | Processing service |
| --- | --- |
| AuthController | AuthService |
| UiAuthController | UiAuthService |
| PropertyController | PropertyService |
| SocialController | SocialService |
| SafetyController | SafetyService |
| UploadController | UploadService |
| PageController | PageService |

Controllers bind requests and return responses. Services validate inputs,
enforce permissions and perform operations through the `Database` repository.
Transactions cover listing creation/details, favorite toggles, roommate upserts
and safety report creation. The listing rollback test verifies that invalid
details leave neither a listing nor a details row behind.

## 2. Maven packaging and installation

From `server/`, the commands executed were:

```bash
./mvnw -Dmaven.repo.local=/tmp/shenest-m2 -o -B package
./mvnw -Dmaven.repo.local=/tmp/shenest-m2 -B clean install
```

The temporary Maven repository keeps dependency/cache writes separate from the
project. `-o` used the downloaded dependencies for the package run. Normal
commands are `./mvnw package` and `./mvnw clean install`, or `mvn package` and
`mvn clean install` when Maven is installed.

Both commands completed with **BUILD SUCCESS** and produced:

```text
server/target/shenest-server-1.0.0.jar
```

The executable JAR contains dependencies, templates, styles, scripts and images.
Its manifest starts `com.shenest.SheNestApplication` using Spring Boot's
`JarLauncher`. `clean install` also installed the JAR and POM into the local
Maven repository.

GitHub Actions publishes the executable JAR and current test reports after each
build.

## 3. Tests executed

JUnit ran during **both** builds:

```text
ApplicationIntegrationTest: Tests run: 30, Failures: 0, Errors: 0, Skipped: 0
ControllerArchitectureTest: Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
Tests run: 37, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Integration tests exercise the real controllers, services, templates and SQLite
with temporary data. Coverage includes authentication/password hashing, roles,
ownership, rollback, favorites, bookings, reviews, roommate updates, messaging
privacy, reports, blocks, session rotation, CSRF and uploads. Architecture tests
require controller dependencies to be Spring services.

Run the suite separately with `cd server && ./mvnw test`. Surefire reports are
generated under `server/target/surefire-reports/`. Tests use Mockito's subclass
mock maker to avoid requiring JVM agent attachment in restricted environments.

## 4. GitHub verification

The GitHub Actions workflow in `.github/workflows/maven.yml` repeats
`./mvnw -B clean install` for pushes and pull requests. It uploads the executable
JAR and Surefire reports as the
`shenest-jar-and-test-reports` artifact.

Build outputs, environment secrets, local databases and uploads are excluded
from Git; the Java sources, resources, tests and wrapper are committed.
