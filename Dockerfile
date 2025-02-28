# Build stage
FROM eclipse-temurin:21-jdk AS builder
LABEL authors="axltorres"

WORKDIR /app

# Copy all project files
COPY . .

# Build the application JAR
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jdk AS runtime

WORKDIR /app

# Set default environment variables for PostgreSQL connection
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/ingSoftware
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=asd
ENV SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
ENV SPRING_JPA_HIBERNATE_DDL_AUTO=update

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose port 8080
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "app.jar"]