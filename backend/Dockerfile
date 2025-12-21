# Build stage
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src

# Fix imports before building
RUN find /app/src -name "*.java" -type f -exec sed -i 's/import jakarta\.crypto\./import javax.crypto./g' {} \; && \
    find /app/src -name "*.java" -type f -exec sed -i 's/import jakarta\.crypto\.spec\./import javax.crypto.spec./g' {} \;

# Fix ChatController method calls
RUN sed -i 's/chatService\.processMessage(request)/chatService.processMessage(request, userId)/g' /app/src/main/java/com/legalswami/controller/ChatController.java

# Add missing processMessageStream method to ChatService if it doesn't exist
RUN if ! grep -q "public String processMessageStream" /app/src/main/java/com/legalswami/service/ChatService.java; then \
    echo "Adding processMessageStream method to ChatService"; \
    # Find line number before the last closing brace
    LINE=$(grep -n "^}" /app/src/main/java/com/legalswami/service/ChatService.java | tail -1 | cut -d: -f1); \
    # Insert the method
    sed -i "${LINE}i\\
    // Method added for compatibility\\
    public String processMessageStream(ChatRequest request, String userId) {\\
        // For now, just return a non-streaming response wrapped in SSE format\\
        ChatResponse response = processMessage(request, userId);\\
        return \\"data: \\" + response.getResponse().replace(\"\\\\n\", \"\\\\\\\\n\") + \"\\\\\\\\n\\\\\\\\n\";\\
    }" /app/src/main/java/com/legalswami/service/ChatService.java; \
fi

# Also fix the processMessageStream call in ChatController
RUN sed -i 's/chatService\.processMessageStream(request)/chatService.processMessageStream(request, userId)/g' /app/src/main/java/com/legalswami/controller/ChatController.java

RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl && \
    addgroup -S legalswami && adduser -S legalswami -G legalswami && \
    mkdir -p /app/logs && \
    chown -R legalswami:legalswami /app
USER legalswami
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/chat/health || exit 1
ENTRYPOINT ["java", "-Xmx512m", "-XX:+UseContainerSupport", "-jar", "app.jar"]
