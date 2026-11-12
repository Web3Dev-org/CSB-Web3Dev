# Frontend UI - USV Sports Booking

User interface built with **React** and **Vite**. Requires **Node.js 26.x**.

To run this service as part of the full dev stack, see the [root README](../README.md). This file covers working on the frontend alone.

## 💻 Local Execution (Standalone)

To bypass containers and use the local Vite server for UI development:

1. Install dependencies (required initially or when `package.json` is modified):
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

The local server expects the backend and database to be reachable — start them with the full-stack command from the [root README](../README.md), or see the [backend README](../backend/README.md) for a minimal DB-only setup.

## 🖼 Build Commands

* `npm run build` - Generates the optimized production bundle in the `/dist` directory.
* `npm run lint` - Executes static code analysis to enforce formatting and best practices (requires ESLint configuration).

## 🐳 Production Image (Testing)

To build and serve the optimized React bundle using Nginx locally:
```bash
# Run from the /frontend directory
docker build -t usv-frontend:prod -f Dockerfile.prod .

# Execute the container on port 8080
docker run -p 8080:80 usv-frontend:prod
```
*Access the standalone production container at `http://localhost:8080`.*

## 🐍 Container-Specific Notes

In the dev stack, the frontend container uses polling (`CHOKIDAR_USEPOLLING=true`) to detect file changes on the host OS, ensuring reliable Hot Module Replacement (HMR) across Windows, Linux, and macOS.

If new packages are installed via `npm install` locally on the host machine, the frontend container must be restarted to synchronize the `node_modules` directory:
```bash
docker compose -f docker-compose.dev.yaml restart frontend
```