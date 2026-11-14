# USV Sports Booking - Development Environment

This monorepo contains the complete application stack:
- **Backend:** Java 21, Spring Boot, Hibernate → [backend/README.md](backend/README.md)
- **Frontend:** React, Vite, Node 26 → [frontend/README.md](frontend/README.md)
- **Database:** MySQL 8.4

This file is the canonical reference for running the **full stack**. For working on a single service (standalone dev server, production image builds, service-specific notes), see the linked READMEs.

## ⚙️ Prerequisites

The environment supports both **Docker** and **Podman**.
* For Docker: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Docker Compose.
* For Podman (Recommended for Linux): Install `podman` and `podman-compose`.

> **Podman users:** every command below written as `docker compose ...` works identically as `podman-compose ...` (or via the Docker CLI pointed at the Podman socket). All other instructions are identical for both runtimes.

## 🚀 Initial Setup

Before starting the application, the environment variables file must be initialized:
```bash
cp .env.example .env
```

## 🛠 Running the Application (Development)

The development containers are configured with hot-reload enabled. Source code modifications (both frontend and backend) are reflected automatically.

```bash
docker compose -f docker-compose.dev.yaml up -d --build
```

To start only a subset of services (e.g., just the database for local backend development):
```bash
docker compose -f docker-compose.dev.yaml up -d db
docker compose -f docker-compose.dev.yaml up -d db backend
```

## 🔍 Logs and Debugging

* **View all service logs:**
  ```bash
  docker compose -f docker-compose.dev.yaml logs -f
  ```
* **View specific service logs:**
  ```bash
  docker compose -f docker-compose.dev.yaml logs -f backend
  docker compose -f docker-compose.dev.yaml logs -f db
  ```
* **Remote Debugging (Backend):** the backend dev container exposes port `5005` for JDWP. Setup instructions for IntelliJ and VS Code are in [backend/README.md](backend/README.md#-remote-debugging).

## 🛑 Teardown and Cleanup
* Standard shutdown (preserves volumes and database state):
  ```bash
  docker compose -f docker-compose.dev.yaml down
  ```
* Complete shutdown and **database wipe** (use for a clean reset):
  ```bash
  docker compose -f docker-compose.dev.yaml down -v
  ```