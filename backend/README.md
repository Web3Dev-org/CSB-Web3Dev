# Backend API - USV Sports Booking

Core API services, built with **Java 21** and **Spring Boot 3**.

To run this service as part of the full dev stack, see the [root README](../README.md). This file covers working on the backend alone.

## 💻 Local Execution (Standalone)

To run the backend directly on the host machine (e.g., via an IDE), Java 21 must be installed, and the database must be running independently. The Maven Wrapper (`mvnw`) handles the Maven installation automatically.

1. Start the database container from the root directory:
   ```bash
   docker compose -f docker-compose.dev.yaml up -d db
   ```
2. Start the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```

## 🐳 Production Image (Testing)

To build and test the production image locally:
```bash
# Run from the /backend directory
docker build -t usv-backend:prod -f Dockerfile.prod .

# Execute the container (Note: DB environment variables must be provided)
docker run -p 8080:8080 --env-file ../.env usv-backend:prod
```

## 🐞 Remote Debugging

When the backend runs via the dev stack, it listens for debug connections on port `5005` by default.

* **IntelliJ IDEA:** Create a new *Remote JVM Debug* configuration, retain the default port 5005, and click *Debug*.
* **VS Code:** Install the *Debugger for Java* extension, add a launch configuration of type `java` with `attach` mode pointing at `localhost:5005`, and start debugging.