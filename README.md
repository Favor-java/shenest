# SheNest

SheNest helps women find accommodation and roommates. Built with Java Spring Boot,
Thymeleaf and SQLite, it supports property listings, favorites, bookings and messaging.
The website uses HTML forms with no JavaScript.

## Run

Requires Java 17 or newer. From the project root:

```bash
cd server
./mvnw spring-boot:run
```

Open http://localhost:4000.

## Test and build

From `server/`:

```bash
./mvnw test
./mvnw package
./mvnw clean install
```

Run the packaged application:

```bash
java -jar target/shenest-server-1.0.0.jar
```

See [build verification](BUILD_VERIFICATION.md) for test and build results.
