# PowerMonitor API

PowerMonitor API is a backend service for monitoring, collecting, and analyzing power consumption and availability data. Built with [NestJS](https://nestjs.com/) and TypeScript, it provides RESTful endpoints for retrieving and managing power, voltage, amperage, and energy metering data, as well as system and calibration information.

## Features
- Collects and stores power, voltage, amperage, and energy metering data
- Provides daily, monthly, and yearly statistics on power consumption and availability
- Supports calibration coefficients and system information endpoints
- Scheduled tasks for data cleanup and maintenance
- JWT-based authentication and role-based access control
- MQTT integration for real-time data
- Logging with Winston

## Project Structure
- `src/controllers/` – API controllers (REST endpoints)
- `src/services/` – Business logic and data processing
- `src/entities/` – TypeORM entities (database models)
- `src/models/` – Data transfer objects and interfaces
- `src/modules/` – NestJS modules
- `src/filters/` – Global exception filters
- `src/guards/` – Authorization guards
- `src/logger/` – Logging decorators

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
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

Most endpoints require JWT authentication.

## Scripts
- `npm run build` – Build for production
- `npm run start:dev` – Start in development mode
- `npm run start:prod` – Start in production mode
- `npm run lint` – Lint the codebase
- `npm run format` – Format code with Prettier

## License
Copyright (c) 2025 Serhiy Krasovskyy xhunter74@gmail.com
