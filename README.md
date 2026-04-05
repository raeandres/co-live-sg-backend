# CoLive SG Backend — OneMap Web Service

A NestJS-based web service that integrates with Singapore's **OneMap API** — providing geocoding, reverse geocoding, routing, and nearby places search behind a unified, validated, and well-tested REST API with proper authentication and caching.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
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
- [API Design Decisions](#api-design-decisions)

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│   Client     │────▶│  NestJS App      │────▶│  OneMap API (Singapore)  │
│  (Browser/   │     │  OneMapModule    │     │  developers.onemap.sg    │
│   Mobile)    │     │                  │     │  - Search                │
└──────────────┘     │  Controller      │     │  - Reverse Geocoding     │
                     │  Service         │     │  - Routing               │
                     │  DTOs/Validation │     │  - Nearby Places         │
                     │  Token Cache     │     └──────────────────────────┘
                     └──────────────────┘
```

The service follows a **layered architecture** with NestJS best practices:

| Layer | Responsibility |
|---|---|
| **Controller** | HTTP request handling, routing, response formatting, validation pipes |
| **Service** | Business logic, external API calls, token caching, error handling |
| **DTOs** | Request validation via `class-validator` and `class-transformer` |
| **Interfaces** | TypeScript type definitions for OneMap API responses |

### Key Features

- **Token Caching**: OneMap tokens are cached for 24 hours to avoid unnecessary API calls
- **Retry Logic**: HTTP requests include automatic retries with exponential backoff
- **Input Validation**: All endpoints use DTOs with strict validation
- **Coordinate Validation**: Route endpoints validate coordinate formats before API calls
- **Consistent Response Format**: All endpoints return a uniform JSON envelope

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | >= 20.x |
| npm | >= 10.x |

---

## Installation

```bash
# Install dependencies
npm install
```

---

## Configuration

Copy the `.env` file and adjust values for your environment:

```env
# OneMap API Configuration
ONEMAP_BASE_URL=https://developers.onemap.sg/privateapi
ONEMAP_AUTH_URL=https://developers.onemap.sg/privateapi/auth/token
ONEMAP_EMAIL=your_registered_email@example.com
ONEMAP_PASSWORD=your_password

# Server Configuration
PORT=3000
```

| Variable | Description | Default |
|---|---|---|
| `ONEMAP_BASE_URL` | OneMap API base URL | `https://developers.onemap.sg/privateapi` |
| `ONEMAP_AUTH_URL` | OneMap authentication endpoint | `https://developers.onemap.sg/privateapi/auth/token` |
| `ONEMAP_EMAIL` | Your OneMap registered email | _(empty — uses mock token)_ |
| `ONEMAP_PASSWORD` | Your OneMap password | _(empty — uses mock token)_ |
| `PORT` | HTTP port the server listens on | `3000` |

**Note**: If `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` are not configured, the service will use mock tokens for development. For production use, register at [OneMap Developer Portal](https://www.onemap.gov.sg/) and provide your credentials.

---

## Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode (compiled JS)
npm run start:prod

# Debug mode (with --inspect)
npm run start:debug
```

The server starts on `http://localhost:3000` by default.

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

### Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Run in Production

```bash
npm run start:prod
```

### Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY .env .env
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment Variables for Production

Ensure these are set in your deployment environment:

```env
OPENMAP_NOMINATIM_URL=https://nominatim.openstreetmap.org
OPENMAP_OSRM_URL=https://router.project-osrm.org/route/v1
OPENMAP_OVERPASS_URL=https://overpass-api.de/api
OPENMAP_TOKEN_URL=https://your-auth-provider.com/token   # if using auth
OPENMAP_API_KEY=your-api-key                             # if using auth
PORT=3000
```

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
