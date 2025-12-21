# Build stage
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src

# Fix imports before building (jakarta.crypto -> javax.crypto)
RUN find /app/src -name "*.java" -type f -exec sed -i 's/import jakarta\.crypto\./import javax.crypto./g' {} \; && \
    find /app/src -name "*.java" -type f -exec sed -i 's/import jakarta\.crypto\.spec\./import javax.crypto.spec./g' {} \;

RUN mvn clean package -DskipTests

# Runtime stage - using jre instead of jdk for smaller image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S legalswami && adduser -S legalswami -G legalswami
USER legalswami

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8080

# Health check (with curl installed in alpine)
USER root
RUN apk add --no-cache curl
USER legalswami

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/public/status || exit 1

# Run application with better JVM options
ENTRYPOINT ["java", "-Xmx512m", "-XX:+UseContainerSupport", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
