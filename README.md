# PowerMonitor API

![Version](https://img.shields.io/github/package-json/v/xhunter74/PowerMonitor.API?path=package.json&color=blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen)

PowerMonitor API is a backend service for monitoring, collecting, and analyzing power consumption and availability data. Built with [NestJS](https://nestjs.com/) and TypeScript, it provides RESTful endpoints for retrieving and managing power, voltage, amperage, and energy metering data, as well as system and calibration information.

## Features

- Collects and stores power, voltage, amperage, and energy metering data
- Provides daily, monthly, and yearly statistics on power consumption and availability
- Supports calibration coefficients and system information endpoints
- Scheduled tasks for data cleanup and maintenance
- JWT-based authentication and role-based access control
- MQTT integration for real-time data
- Logging with Winston
- Real-time updates via WebSockets (Socket.IO)
- Receives serial data frames from the monitoring board over a serial port, e.g.:
    ```json
    { "type": "data", "voltage": 220.0, "current": 5.0, "frequency": 50.0 }
    ```
- Centralized logging to Elasticsearch (via Winston Elasticsearch transport)
- Application Performance Monitoring with Elastic APM (elastic-apm-node)

## Project Structure

- `src/modules/` – NestJS modules, grouping related controllers and services
- `src/entities/` – TypeORM entities (database models)
- `src/common/` – Shared DTOs, models, interfaces, and utilities
- `src/migrations/` – Database migration scripts
- `src/constants.ts` – Application-wide constants
- `src/environments.ts` – Environment configuration
- `src/main.ts` – Application entry point
- `tests/` – Unit tests (Mocha + Chai)

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm
- PostgreSQL database

### Installation

1. Clone the repository:
    ```powershell
    git clone <repo-url>
    cd PowerMonitor.API
    ```
2. Install dependencies:
    ```powershell
    npm install
    ```
3. Configure environment variables:
    - Copy `development.env` or `production.env` and update with your settings.

### Database Setup

- Configure your PostgreSQL connection in `src/ormconfig.ts` or via environment variables.
- Run migrations if needed.

### Running the Application

- Development mode:
    ```powershell
    npm run start:dev
    ```
- Production build:
    ```powershell
    npm run build
    npm run start:prod
    ```

### API Endpoints

- Power data: `/api/power/*`
- Power consumption: `/api/power-consumption/*`
- Services/system info: `/api/services/*`
- WebSocket real-time data: Socket.IO endpoint at `/socket.io/`

Most endpoints require JWT authentication.

## Scripts

## Scripts

- `npm run build` – Build for production
- `npm run package` – Lint, version bump, replace build, and compile
- `npm run build-dev` – Build in development mode
- `npm run start` – Run with ts-node
- `npm run start:dev` – Start in watch/dev mode
- `npm run start:prod` – Run the production build
- `npm run start:debug` – Run in debug mode
- `npm run lint` – Lint the codebase
- `npm run format` – Format code with Prettier
- `npm run test` – Execute unit tests (Mocha + ts-node)
- `npm run coverage` – Generate code coverage report

## License

Copyright (c) 2025 Serhiy Krasovskyy xhunter74@gmail.com