# Build stage
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY server/.mvn .mvn
COPY server/mvnw server/pom.xml ./
RUN ./mvnw -q dependency:go-offline
COPY server/src src
RUN ./mvnw -q package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/shenest-server-1.0.0.jar app.jar
ENV DATABASE_PATH=/data/shenest.db UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads
EXPOSE 4000
CMD ["java", "-jar", "app.jar"]
