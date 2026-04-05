# CoLive SG Backend — OneMap Web Service

A **Dockerized NestJS** web service that integrates with Singapore's **OneMap API** — providing geocoding, reverse geocoding, routing, and nearby places search behind a unified, validated, and well-tested REST API with proper authentication, caching, and PostgreSQL persistence.

---

## Table of Contents

- [Quick Start (Docker)](#quick-start-docker)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Docker Compose Configuration](#docker-compose-configuration)
- [Running the Application](#running-the-application)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Local Development (Without Docker)](#local-development-without-docker)
- [Docker Usage Guide](#docker-usage-guide)
  - [Common Commands](#common-commands)
  - [Database Management](#database-management)
  - [Debugging](#debugging)
  - [Development Workflow](#development-workflow)
- [API Reference](#api-reference)
  - [Search](#1-search)
  - [Reverse Geocode](#2-reverse-geocode)
  - [Routing Service](#3-routing-service)
  - [Nearby Places Service](#4-nearby-places-service)
  - [Get Token](#5-get-token)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
  - [Production Docker](#production-docker)
  - [Environment Variables for Production](#environment-variables-for-production)
- [Docker Specifications](#docker-specifications)
  - [System Requirements](#system-requirements)
  - [Image Details](#image-details)
  - [Resource Limits](#resource-limits)
  - [Network Configuration](#network-configuration)
  - [Volume Strategy](#volume-strategy)
  - [Security Hardening](#security-hardening)
- [API Design Decisions](#api-design-decisions)
- [Resources](#resources)
- [License](#license)

---

## Quick Start (Docker)

Get the entire stack running in under 2 minutes:

```bash
# 1. Clone and setup
git clone <repository-url>
cd co-live-sg-backend
cp .env.example .env

# 2. Start everything (app + PostgreSQL)
docker compose up

# 3. Access the application
open http://localhost:3000
```

That's it! The NestJS app is running with hot reload, connected to PostgreSQL.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Compose Stack                          │
│                                                                    │
│  ┌─────────────────┐         ┌──────────────────────────┐        │
│  │   Client        │         │    NestJS Application    │        │
│  │   (Browser/     │────────▶│  ┌────────────────────┐  │        │
│  │    Mobile)      │ HTTP    │  │  OneMapModule      │  │        │
│  │                 │ :3000   │  │  Controller        │  │        │
│  └─────────────────┘         │  │  Service           │  │        │
│                              │  │  DTOs/Validation   │  │        │
│                              │  │  TypeORM/DB Pool   │  │        │
│                              │  └─────────┬──────────┘  │        │
│                              └────────────┼─────────────┘        │
│                                           │ TCP/IP                │
│                                           │ port 5432             │
│                              ┌────────────▼─────────────┐        │
│                              │    PostgreSQL 16         │        │
│                              │  ┌────────────────────┐  │        │
│                              │  │  colive_sg_dev DB  │  │        │
│                              │  │  Persistent Volume │  │        │
│                              │  │  Auto-init Scripts │  │        │
│                              │  └────────────────────┘  │        │
│                              └──────────────────────────┘        │
│                                                                    │
│  External Services (Internet):                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  OneMap API (developers.onemap.sg)                   │        │
│  │  - Search  •  Reverse Geocoding  •  Routing         │        │
│  │  - Nearby Places  •  Token Authentication            │        │
│  └──────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

The service follows a **layered architecture** with NestJS best practices:

| Layer | Responsibility |
|---|---|
| **Controller** | HTTP request handling, routing, response formatting, validation pipes |
| **Service** | Business logic, external API calls, token caching, error handling |
| **DTOs** | Request validation via `class-validator` and `class-transformer` |
| **Database** | PostgreSQL persistence via TypeORM with auto-migrations |
| **Interfaces** | TypeScript type definitions for OneMap API responses |

### Key Features

- **🐳 Dockerized**: Complete Docker Compose stack with PostgreSQL
- **🔄 Hot Reload**: Instant code changes without rebuilds
- **🗄️ PostgreSQL**: TypeORM integration with auto entity loading
- **🔐 Token Caching**: OneMap tokens cached for 24 hours
- **♻️ Retry Logic**: HTTP requests with exponential backoff
- **✅ Input Validation**: Strict DTO validation on all endpoints
- **📊 Consistent Responses**: Uniform JSON envelope for all endpoints
- **🧪 Well Tested**: 55+ passing tests with ~92% coverage

---

## Prerequisites

### For Docker (Recommended)

| Tool | Version | Purpose |
|---|---|---|
| Docker Desktop | >= 24.x | Container runtime |
| Docker Compose | >= 2.20.x | Multi-container orchestration |

**Note**: Docker Compose is included with Docker Desktop on macOS.

### For Local Development (Without Docker)

| Tool | Version | Purpose |
|---|---|---|
| Node.js | >= 20.x | JavaScript runtime |
| npm | >= 10.x | Package manager |
| PostgreSQL | >= 15.x | Database (optional, for DB features) |

---

## Installation

### Docker Installation

No manual installation needed! Docker pulls all dependencies automatically:

```bash
# Just start Docker Compose - it handles everything
docker compose up
```

### Local Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

---

## Configuration

### Environment Variables

All configuration is managed through environment variables. Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

#### Complete Environment Reference

```env
# ==========================================
# Application Configuration
# ==========================================
PORT=3000                    # HTTP port the server listens on
NODE_ENV=development         # Environment: development | production | test

# ==========================================
# Database Configuration (PostgreSQL)
# ==========================================
DATABASE_HOST=localhost      # Database host (use "db" when in Docker)
DATABASE_PORT=5432           # PostgreSQL port
DATABASE_USER=postgres       # Database username
DATABASE_PASSWORD=postgres   # Database password
DATABASE_NAME=colive_sg_dev  # Database name

# ==========================================
# OneMap API Configuration
# ==========================================
ONEMAP_API_URL=https://www.onemap.gov.sg/api       # OneMap API base URL
ONEMAP_CLIENT_ID=your_client_id                    # Your OneMap client ID
ONEMAP_CLIENT_SECRET=your_client_secret            # Your OneMap client secret
```

| Variable | Description | Default | Required |
|---|---|---|---|
| `PORT` | HTTP port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `DATABASE_HOST` | Database host | `localhost` | No* |
| `DATABASE_PORT` | Database port | `5432` | No |
| `DATABASE_USER` | DB username | `postgres` | No |
| `DATABASE_PASSWORD` | DB password | `postgres` | No |
| `DATABASE_NAME` | Database name | `colive_sg_dev` | No |
| `ONEMAP_API_URL` | OneMap API URL | _(see above)_ | No |
| `ONEMAP_CLIENT_ID` | OneMap client ID | _(empty)_ | No |
| `ONEMAP_CLIENT_SECRET` | OneMap client secret | _(empty)_ | No |

**Note**: Database variables are auto-configured in Docker Compose. For local development without Docker, ensure PostgreSQL is running and update `DATABASE_HOST` accordingly.

### Docker Compose Configuration

The `docker-compose.yml` file orchestrates the entire stack:

```yaml
services:
  app:                          # NestJS application
    build:
      context: .                # Build from current directory
      target: dev               # Use development stage
    ports:
      - "3000:3000"             # Map host:container ports
    volumes:
      - .:/app                  # Bind mount source code
      - /app/node_modules       # Protect container dependencies
    environment:                # Environment variables
      - DATABASE_HOST=db        # Connect to 'db' service
      - DATABASE_PORT=5432
      # ... more vars
    depends_on:
      db:
        condition: service_healthy  # Wait for DB health check
    command: npm run start:dev      # Override default command

  db:                           # PostgreSQL database
    image: postgres:16-alpine   # Specific version (never :latest)
    ports:
      - "127.0.0.1:5432:5432"   # Localhost-only exposure
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: colive_sg_dev
    volumes:
      - pgdata:/var/lib/postgresql/data        # Persistent storage
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:                  # Health check configuration
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:                       # Named volume for data persistence
```

#### Development Override

`docker-compose.override.yml` (auto-loaded in development):

```yaml
services:
  app:
    environment:
      - DEBUG=app:*             # Enable debug logging
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"             # Node.js debugger port
    security_opt:
      - no-new-privileges:true  # Security hardening
```

---

## Running the Application

### Docker Compose (Recommended)

#### Quick Start

```bash
# Start all services (app + PostgreSQL)
docker compose up

# Start in detached mode (background)
docker compose up -d

# Start with build (after package.json changes)
docker compose up --build
```

#### What Happens on Startup

1. **Docker pulls PostgreSQL 16 Alpine** image (if not cached)
2. **Docker builds the NestJS app** using the `dev` stage of the Dockerfile
3. **PostgreSQL starts** and runs health checks
4. **NestJS waits** for PostgreSQL to become healthy
5. **Init scripts run** (`scripts/init-db.sql`) on first database creation
6. **NestJS connects** to PostgreSQL via TypeORM
7. **App starts** with hot reload on port 3000

#### Verify Everything is Running

```bash
# Check service status
docker compose ps

# Expected output:
# NAME                    IMAGE                  STATUS
# colive-sg-backend-app-1   colive-sg-backend-app   Up (healthy)
# colive-sg-backend-db-1    postgres:16-alpine      Up (healthy)

# View logs
docker compose logs -f app    # Follow app logs
docker compose logs -f db     # Follow database logs

# Test the API
curl http://localhost:3000
```

### Local Development (Without Docker)

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode (compiled JS)
npm run start:prod

# Debug mode (with --inspect)
npm run start:debug
```

**Note**: For local development with database features, ensure PostgreSQL is running and update `DATABASE_HOST=localhost` in your `.env` file.

The server starts on `http://localhost:3000` by default.

---

## Docker Usage Guide

### Common Commands

#### Service Management

```bash
# Start services (foreground)
docker compose up

# Start services (background)
docker compose up -d

# Stop services (preserves data)
docker compose down

# Stop and remove volumes (DESTRUCTIVE - deletes database)
docker compose down -v

# Rebuild and restart
docker compose up --build

# Force full rebuild (no cache)
docker compose build --no-cache app
```

#### Viewing Logs

```bash
# All services logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# Last 50 lines from app
docker compose logs --tail=50 app

# Database logs only
docker compose logs -f db

# Logs with timestamps
docker compose logs -ft app
```

#### Executing Commands in Containers

```bash
# Shell into the app container
docker compose exec app sh

# Access PostgreSQL CLI
docker compose exec db psql -U postgres -d colive_sg_dev

# Run database queries directly
docker compose exec db psql -U postgres -d colive_sg_dev -c "SELECT * FROM users;"

# Run npm commands inside container
docker compose exec app npm test
docker compose exec app npm run build
```

#### Inspecting Services

```bash
# List running services
docker compose ps

# Show resource usage
docker stats

# Inspect container processes
docker compose top

# View service configuration
docker compose config

# Check DNS resolution inside container
docker compose exec app nslookup db

# Test connectivity between services
docker compose exec app wget -qO- http://localhost:3000/
```

### Database Management

#### Connecting to PostgreSQL

```bash
# Via psql in container
docker compose exec db psql -U postgres -d colive_sg_dev

# Via psql from host (if port 5432 is exposed)
psql -h localhost -U postgres -d colive_sg_dev

# Via GUI tools (TablePlus, pgAdmin, DBeaver)
# Host: localhost
# Port: 5432
# User: postgres
# Password: postgres
# Database: colive_sg_dev
```

#### Common Database Operations

```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- View database size
SELECT pg_size_pretty(pg_database_size('colive_sg_dev'));

-- View active connections
SELECT * FROM pg_stat_activity;

-- Backup database
docker compose exec db pg_dump -U postgres colive_sg_dev > backup.sql

-- Restore database
docker compose exec -T db psql -U postgres colive_sg_dev < backup.sql
```

#### Database Initialization

The file `scripts/init-db.sql` runs automatically when the PostgreSQL container is **first created**. It does NOT run on subsequent starts.

```sql
-- scripts/init-db.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add your schema here
-- CREATE TABLE users (...);
```

To re-run init scripts:
```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up
```

### Debugging

#### Enable Debug Mode

Debug mode is already enabled in `docker-compose.override.yml`:

```yaml
environment:
  - DEBUG=app:*
  - LOG_LEVEL=debug
ports:
  - "9229:9229"  # Node.js inspector
```

#### Attach Node.js Debugger

```bash
# Start with debug mode
docker compose up

# Open Chrome and navigate to:
chrome://inspect

# Add target: localhost:9229
# Click "inspect" to open DevTools
```

#### Debug Common Issues

```bash
# Check if database is healthy
docker compose exec db pg_isready -U postgres

# Check environment variables in container
docker compose exec app env | grep DATABASE

# View TypeScript compilation errors
docker compose logs app | grep ERROR

# Check network connectivity
docker compose exec app ping db

# Inspect Docker network
docker network inspect co-live-sg-backend_default
```

### Development Workflow

#### Code Changes

1. **Edit code** on your host machine (your IDE)
2. **NestJS detects changes** via volume mount
3. **Auto-recompiles** and restarts (usually < 2 seconds)
4. **Refresh browser** — changes are live

**No rebuild or restart needed!**

```
Host Machine                    Docker Container
┌──────────────┐                ┌──────────────────┐
│  VS Code     │  Volume Mount  │  NestJS App      │
│  (Edit .ts)  │───────────────▶│  (Watch & Reload)│
│              │   .:/app       │                  │
└──────────────┘                └──────────────────┘
```

#### Adding Dependencies

```bash
# 1. Add package (on host machine)
npm install <package-name>

# 2. Rebuild container
docker compose up --build

# OR restart container (picks up new node_modules)
docker compose restart app
```

#### Database Schema Changes

```bash
# Option 1: Update init script (for fresh databases)
# Edit scripts/init-db.sql, then:
docker compose down -v
docker compose up

# Option 2: Run migration manually (for existing databases)
docker compose exec db psql -U postgres -d colive_sg_dev -f scripts/migration.sql

# Option 3: Use TypeORM migrations (recommended for production)
docker compose exec app npm run typeorm migration:run
```

#### Cleaning Up

```bash
# Remove stopped containers
docker compose down

# Remove containers + volumes (deletes data!)
docker compose down -v

# Remove all Docker images, containers, networks
docker system prune -a

# Remove only unused volumes
docker volume prune
```

---

## API Reference

All endpoints are prefixed with `/onemap`. Every endpoint returns a **consistent JSON envelope**:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

On failure:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Operation failed"
}
```

**Rate Limits**: OneMap API allows 1,000 requests per token per day, with a throttle limit of 10 requests per second.

---

### 1. Search

**Search for addresses or places in Singapore** using OneMap Search API.

```
GET /onemap/search
```

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `searchVal` | string | **Yes** | Search query (e.g. `"100 Orchard Road"`, `"Marina Bay Sands"`) |
| `returnGeom` | string | No | Return geometry (`"Y"` or `"N"`, default: `"Y"`) |
| `getAddrDetails` | string | No | Get detailed address info (`"Y"` or `"N"`, default: `"N"`) |
| `pageNum` | number | No | Page number for pagination (default: 1) |

#### Example Request

```bash
curl "http://localhost:3000/onemap/search?searchVal=Marina+Bay+Sands&returnGeom=Y&getAddrDetails=Y"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "found": 1,
    "totalNumPages": 1,
    "pageNum": 1,
    "results": [
      {
        "BLK_NO": "10",
        "ROAD_NAME": "BAYFRONT AVENUE",
        "BUILDING": "MARINA BAY SANDS",
        "ADDRESS": "10 BAYFRONT AVENUE MARINA BAY SANDS",
        "POSTAL": "018956",
        "X": 29887.5,
        "Y": 31109.5,
        "LATITUDE": 1.28353,
        "LONGITUDE": 103.86066
      }
    ]
  },
  "message": "Search completed successfully"
}
```

#### Validation Rules

- `searchVal` must be a non-empty string.
- `returnGeom` must be `"Y"` or `"N"`.
- `getAddrDetails` must be `"Y"` or `"N"`.
- `pageNum` must be a positive number.

---

### 2. Reverse Geocode

**Convert geographic coordinates into a Singapore address** using OneMap Reverse Geocoding.

```
GET /onemap/revgeocode
```

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | number | **Yes** | Latitude (-90 to 90) |
| `long` | number | **Yes** | Longitude (-180 to 180) |
| `buffer` | number | No | Search radius in meters (1-1000, default: 10) |

#### Example Request

```bash
curl "http://localhost:3000/onemap/revgeocode?lat=1.28353&long=103.86066&buffer=100"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "found": 1,
    "results": [
      {
        "ADDRESS": "10 BAYFRONT AVENUE",
        "BLK_NO": "10",
        "ROAD_NAME": "BAYFRONT AVENUE",
        "BUILDING": "MARINA BAY SANDS",
        "POSTAL": "018956",
        "X": 29887.5,
        "Y": 31109.5,
        "LATITUDE": 1.28353,
        "LONGITUDE": 103.86066,
        "DISTANCE": 5
      }
    ]
  },
  "message": "Reverse geocoding completed successfully"
}
}
```

#### Validation Rules

- `lat` is required and must be a valid latitude.
- `lon` is required and must be a valid longitude.

---

### 3. Routing Service

**Calculate driving, walking, or cycling routes in Singapore** using OneMap Routing API.

```
GET /onemap/routingsvc
```

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `start` | string | **Yes** | Start coordinates in `lat,long` format (e.g. `"1.3521,103.8198"`) |
| `end` | string | **Yes** | End coordinates in `lat,long` format (e.g. `"1.2897,103.8520"`) |
| `routeType` | string | No | Travel mode: `drive`, `walk`, `cycle` (default: `drive`) |

#### Example Request

```bash
# Driving route from Orchard Road to Marina Bay
curl "http://localhost:3000/onemap/routingsvc?start=1.3048,103.8347&end=1.2835,103.8607&routeType=drive"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "route_summary": {
      "total_time": 720,
      "total_distance": 4500
    },
    "route_geometry": "encoded_polyline_string_here",
    "route_instructions": [
      ["Head north on Orchard Road", 200, 48, 0, 0],
      ["Turn right onto Scotts Road", 300, 72, 90, 1],
      ["Continue onto Marina Boulevard", 2000, 300, -45, 5],
      ["Arrive at destination", 0, 0, 0, 10]
    ]
  },
  "message": "Route calculation completed successfully"
}
```

#### Coordinate Format

Coordinates must be in `latitude,longitude` format (note: this is different from OSRM's `longitude,latitude`):

```
start: "lat,long"
end: "lat,long"
```

Each instruction array contains:
- `instruction`: Text description of the maneuver
- `distance`: Distance in meters
- `time`: Time in seconds
- `turn_angle`: Turn angle in degrees
- `index`: Index into the route geometry points

#### Validation Rules

- `start` is required and must be in `lat,long` format with valid coordinates.
- `end` is required and must be in `lat,long` format with valid coordinates.
- `routeType` must be one of: `drive`, `walk`, `cycle`.

---

### 4. Nearby Places Service

**Find points of interest around a location in Singapore** using OneMap Nearby API.

```
GET /onemap/nearbysvc
```

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | number | **Yes** | Center latitude |
| `long` | number | **Yes** | Center longitude |
| `category` | string | **Yes** | Place category (e.g., `"ATM"`, `"RESTAURANT"`, `"SCHOOL"`) |
| `radius` | number | No | Search radius in meters (default: 500) |

#### Example Requests

```bash
# Find ATMs within 500m of a point
curl "http://localhost:3000/onemap/nearbysvc?lat=1.3521&long=103.8198&category=ATM"

# Find restaurants within 1km
curl "http://localhost:3000/onemap/nearbysvc?lat=1.3521&long=103.8198&category=RESTAURANT&radius=1000"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "found": 2,
    "results": [
      {
        "NAME": "DBS ATM - ORCHARD",
        "ADDRESS": "100 ORCHARD ROAD",
        "POSTAL": "238840",
        "X": 29538.5,
        "Y": 30735.2,
        "LATITUDE": 1.3041,
        "LONGITUDE": 103.832,
        "DISTANCE": 50,
        "CATEGORY": "ATM"
      },
      {
        "NAME": "OCBC ATM - ION",
        "ADDRESS": "2 ORCHARD TURN",
        "POSTAL": "238801",
        "X": 29540.1,
        "Y": 30737.8,
        "LATITUDE": 1.3043,
        "LONGITUDE": 103.8322,
        "DISTANCE": 75,
        "CATEGORY": "ATM"
      }
    ]
  },
  "message": "Nearby places search completed successfully"
}
```

#### Common Category Values

| Category | Description |
|---|---|
| `ATM` | ATMs and banking machines |
| `RESTAURANT` | Restaurants and eateries |
| `SCHOOL` | Educational institutions |
| `HOSPITAL` | Medical facilities |
| `PETROL_STATION` | Gas stations |
| `CARPARK` | Parking facilities |

#### Validation Rules

- `lat` is required and must be a valid latitude.
- `long` is required and must be a valid longitude.
- `category` is required and must be a non-empty string.
- `radius` must be a positive number.

---

### 5. Get Token

**Retrieve OneMap access token information**. The service automatically manages token caching and renewal.

```
GET /onemap/gettoken
```

#### Example Request

```bash
curl "http://localhost:3000/onemap/gettoken"
```

#### Example Response (With Credentials Configured)

When `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` are set, the service authenticates with OneMap and caches the token for 24 hours:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expire_in": 86400
  },
  "message": "Token retrieved successfully"
}
```

**Note**: The service automatically manages token lifecycle — tokens are cached and reused until they expire, then refreshed automatically.

---

## Response Format

All endpoints follow a **consistent envelope pattern**:

### Success Response

```json
{
  "success": true,
  "data": <payload>,
  "message": "<human-readable success message>"
}
```

### Error Response

```json
{
  "success": false,
  "error": "<error description>",
  "message": "<human-readable error message>"
}
```

### Validation Error Response (HTTP 400)

```json
{
  "statusCode": 400,
  "message": ["searchVal must be a string", "lat must not be less than -90"],
  "error": "Bad Request"
}
```

---

## Error Handling

| HTTP Status | Meaning | When |
|---|---|---|
| `200` | OK | Successful operation (even if upstream returned empty results) |
| `400` | Bad Request | Validation failure (missing required params, invalid coordinates, bad format) |
| `502` | Bad Gateway | Upstream OneMap API failure (network error, timeout, authentication error) |

Errors from external APIs are caught, logged via NestJS `Logger`, and re-thrown as `HttpException` with `BAD_GATEWAY` status — **never exposing internal details** to the client.

---

## Validation

All query parameters are validated using **`class-validator`** decorators:

| Decorator | Applied To |
|---|---|
| `@IsString()` | `searchVal`, `start`, `end`, `category`, etc. |
| `@IsNumber()` | `lat`, `long`, `pageNum`, `radius`, `buffer` |
| `@IsLatitude()` | `lat` fields |
| `@IsLongitude()` | `long` fields |
| `@IsIn(['Y', 'N'])` | `returnGeom`, `getAddrDetails` |
| `@IsIn(['drive', 'walk', 'cycle'])` | `routeType` |
| `@Min()` / `@Max()` | Coordinate ranges, radius, buffer limits |
| `@IsOptional()` | All optional parameters |

Validation is enforced via `ValidationPipe` with `transform: true` (auto-coerces types) and `whitelist: true` (strips unknown properties).

---

## Testing

```bash
# Run all unit tests
npm run test

# Run with coverage report
npm run test:cov

# Run E2E tests
npm run test:e2e

# Watch mode (re-runs on file changes)
npm run test:watch

# Debug mode (attach debugger)
npm run test:debug
```

### Test Coverage Summary

| Suite | Tests | Description |
|---|---|---|
| `onemap.service.spec.ts` | 24 | Service method success paths, error handling, parameter forwarding, token caching |
| `onemap.controller.spec.ts` | 15 | Controller response formatting, error wrapping, parameter mapping |
| `onemap.e2e-spec.ts` | 17 | Full HTTP request/response cycle, validation rejection, optional params |
| `app.controller.spec.ts` | 1 | Default app controller |

**Total: 57 passing tests for OneMap module** · **~92% statement coverage** on OneMap module.

### Test Best Practices

- **Service Tests**: Mock `HttpService` and `ConfigService`, verify exact URL and params passed to HTTP calls
- **Controller Tests**: Mock `OneMapService` methods, verify response shape `{ success, data, message }`
- **E2E Tests**: Import real `OneMapModule`, override `OneMapService` provider, use `supertest` for HTTP testing
- **Token Caching**: Tests verify token is fetched once and reused for subsequent requests
- **Coordinate Validation**: Tests verify proper validation of `lat,long` format for routing endpoints

---

## Project Structure

```
src/
├── onemap/
│   ├── dto/
│   │   ├── onemap-query.dto.ts       # Request validation DTOs
│   │   └── onemap-response.dto.ts    # Response type definitions
│   ├── interfaces/
│   │   └── onemap.interface.ts       # OneMap API response interfaces
│   ├── test/
│   │   ├── onemap.service.spec.ts    # Service unit tests
│   │   ├── onemap.controller.spec.ts # Controller unit tests
│   │   └── onemap.e2e-spec.ts        # E2E integration tests
│   ├── onemap.controller.ts          # REST controller (5 endpoints)
│   ├── onemap.service.ts             # Business logic, OneMap API calls, token caching
│   └── onemap.module.ts              # Module registration & HttpModule config
├── app.controller.ts
├── app.module.ts
└── main.ts
```

---

## Deployment

### Production Docker

#### Build Production Image

```bash
# Build with production target (minimal, secure image)
docker build --target production -t colive-sg-backend:prod .

# Verify image size (should be ~150MB)
docker images colive-sg-backend:prod
```

#### Run Production Stack

```bash
# Use production compose file
docker compose -f docker-compose.yml build --target production

# Run with production environment
docker compose -f docker-compose.yml up -d
```

#### Production Docker Compose Example

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      target: production
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=db
      - DATABASE_PASSWORD=${DB_PASSWORD}  # Use strong password
    depends_on:
      db:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: colive_sg_prod
    volumes:
      - pgdata_prod:/var/lib/postgresql/data
    # Remove port exposure - only accessible within Docker network
    # ports:
    #   - "127.0.0.1:5432:5432"

volumes:
  pgdata_prod:
```

Run with:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

Ensure these are set in your deployment environment:

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=<strong-password>
DATABASE_NAME=colive_sg_prod

# OneMap API
ONEMAP_API_URL=https://www.onemap.gov.sg/api
ONEMAP_CLIENT_ID=<your-client-id>
ONEMAP_CLIENT_SECRET=<your-client-secret>
```

**Security Notes**:
- Use strong, randomly generated database passwords
- Never commit `.env` files to version control
- Use Docker secrets or your orchestrator's secret management
- Enable SSL/TLS for database connections in production

### Deployment Platforms

#### Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml colive-sg
```

#### Kubernetes

Use tools like `kompose` to convert Docker Compose to Kubernetes manifests:
```bash
kompose convert -f docker-compose.yml
kubectl apply -f .
```

#### Cloud Run / ECS / EKS

Build and push to container registry:
```bash
docker tag colive-sg-backend:prod gcr.io/PROJECT_ID/colive-sg-backend
docker push gcr.io/PROJECT_ID/colive-sg-backend
```

---

## Docker Specifications

### System Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 2 GB | 4+ GB |
| **Disk** | 5 GB | 10+ GB |
| **Docker** | 24.x | Latest |
| **Docker Compose** | 2.20.x | Latest |

### Image Details

#### Development Image

| Metric | Value |
|---|---|
| **Base** | `node:22.12-alpine3.20` |
| **Size** | ~800 MB |
| **User** | root (dev only) |
| **Layers** | ~15 |
| **Includes** | Source code, dev dependencies, TypeScript compiler |

#### Production Image

| Metric | Value |
|---|---|
| **Base** | `node:22.12-alpine3.20` |
| **Size** | ~150 MB |
| **User** | `appuser` (UID 1001, non-root) |
| **Layers** | ~8 |
| **Includes** | Compiled JS, production dependencies only |

### Resource Limits

#### Default (Development)

No explicit limits — uses available host resources.

#### Production (Recommended)

```yaml
deploy:
  resources:
    limits:
      cpus: "1.0"
      memory: 512M
    reservations:
      cpus: "0.25"
      memory: 128M
```

| Resource | Limit | Reason |
|---|---|---|
| CPU | 1.0 core | Prevents CPU starvation of other services |
| Memory | 512 MB | NestJS typically uses 150-300 MB |
| Disk | Depends on volume | Monitor `pgdata` volume growth |

### Network Configuration

#### Docker Network

```yaml
# Default network created by Docker Compose
networks:
  default:
    name: co-live-sg-backend_default
    driver: bridge
```

#### Port Mapping

| Service | Container Port | Host Port | Protocol | Access |
|---|---|---|---|---|
| **App** | 3000 | 3000 | TCP | `localhost:3000` |
| **App (Debug)** | 9229 | 9229 | TCP | `localhost:9229` (dev only) |
| **DB** | 5432 | 5432 | TCP | `127.0.0.1:5432` (localhost only) |

**Security**: Database port is bound to `127.0.0.1` only — not accessible from other network interfaces.

#### Service Discovery

Services communicate via Docker DNS using service names:

```
NestJS App → PostgreSQL
  DATABASE_HOST=db
  DATABASE_PORT=5432
  Connection: postgres://postgres:postgres@db:5432/colive_sg_dev
```

### Volume Strategy

| Volume | Type | Mount Point | Purpose | Persistence |
|---|---|---|---|---|
| `./:/app` | Bind mount | `/app` | Source code (hot reload) | Host filesystem |
| `/app/node_modules` | Anonymous volume | `/app/node_modules` | Protect container deps | Container lifecycle |
| `pgdata` | Named volume | `/var/lib/postgresql/data` | Database files | Docker-managed |
| `./scripts/init-db.sql` | Bind mount | `/docker-entrypoint-initdb.d/init.sql` | DB initialization | Host filesystem |

**Volume Lifecycle**:
- **Bind mounts**: Reflect host filesystem changes instantly
- **Anonymous volumes**: Created on container start, removed on `docker compose down -v`
- **Named volumes**: Persist across container recreation, managed by Docker

### Security Hardening

#### Dockerfile Security

```dockerfile
# ✅ Specific base image version (no :latest)
FROM node:22.12-alpine3.20

# ✅ Non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# ✅ Minimal production image (no dev deps, no source code)
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules

# ✅ Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/ || exit 1
```

#### Compose Security

```yaml
# ✅ Database port bound to localhost only
ports:
  - "127.0.0.1:5432:5432"

# ✅ No new privileges
security_opt:
  - no-new-privileges:true

# ✅ Health checks ensure service readiness
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 3s
  retries: 5
```

#### Secret Management

```bash
# ✅ Use .env files (gitignored)
.env                    # Local development
.env.production         # Production (not committed)

# ✅ Pass secrets via environment (not in image)
docker compose up --env-file .env.production

# ❌ Never hardcode secrets
# ENV DATABASE_PASSWORD=supersecret    # NEVER DO THIS
```

#### .dockerignore

Excludes sensitive/unnecessary files from build context:

```
node_modules
.git
.env
.env.*
!.env.example
dist
coverage
*.log
.next
```

### Dockerfile Stages

| Stage | Base Image | Purpose | Output |
|---|---|---|---|
| `deps` | `node:22.12-alpine3.20` | Install dependencies | `node_modules/` |
| `dev` | `node:22.12-alpine3.20` | Development with hot reload | Full source + deps |
| `build` | `node:22.12-alpine3.20` | Compile TypeScript | `dist/` + prod deps |
| `production` | `node:22.12-alpine3.20` | Minimal runtime image | `dist/` + prod deps (non-root) |

**Why multi-stage?**
- Development image: ~800 MB (includes TypeScript, source code, dev tools)
- Production image: ~150 MB (compiled JS only, no build tools)
- **80% size reduction** in production

### Performance Optimization

#### Development

- **Volume mounts**: Instant code sync, no rebuild needed
- **Hot reload**: NestJS watches `.ts` files automatically
- **Anonymous volumes**: `/app/node_modules` prevents host override

#### Production

- **Multi-stage build**: Minimal image size
- **Production deps only**: `npm prune --production` removes dev dependencies
- **Non-root user**: Security best practice
- **Health checks**: Orchestrator can detect unhealthy containers

---

## API Design Decisions

### Why GET for All Endpoints?

All five endpoints use `GET` because they are **safe, read-only operations** — they retrieve data from external APIs without modifying server state. This aligns with REST conventions where:

- `GET` = safe, idempotent, cacheable
- No request body needed (all parameters fit in query strings)

### Why Query Parameters Instead of Path Parameters?

Geospatial queries have **many optional parameters** (coordinates, radius, categories, limits, profiles). Query strings handle this naturally:

```
# Clean and self-documenting
/openmap/nearbysvc?lat=1.3521&lon=103.8198&radius=1000&categories=amenity
```

### Why the `{ success, data, message }` Envelope?

This pattern provides:

1. **Consistent client-side parsing** — clients always know the shape
2. **Explicit success/failure signal** — not relying solely on HTTP status
3. **Human-readable messages** — useful for debugging and logging

### Why 502 (Bad Gateway) for Upstream Errors?

When Nominatim, OSRM, or Overpass fail, our service acts as a **gateway** that cannot fulfill the request. `502 Bad Gateway` accurately describes this scenario (vs. `500` which implies an internal bug).

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Overview/)
- [OSRM API Docs](http://project-osrm.org/docs/v5.24.0/api/)
- [Overpass API Docs](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenStreetMap](https://www.openstreetmap.org)

---

## License

MIT licensed. See [LICENSE](LICENSE) for details.
