# SwiftRoute — Bus Ticket Booking System
## Complete Application Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Backend API](#6-backend-api)
7. [Frontend Application](#7-frontend-application)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [User Roles & Features](#9-user-roles--features)
10. [Booking Flow](#10-booking-flow)
11. [Wallet & Refund System](#11-wallet--refund-system)
12. [Audit Logging](#12-audit-logging)
13. [Running the Application](#13-running-the-application)
14. [Testing](#14-testing)
15. [API Reference](#15-api-reference)

---

## 1. Project Overview

SwiftRoute is a full-stack bus ticket booking platform that connects bus operators with customers.
Operators manage their fleet, routes, and schedules. Customers search for buses, book seats,
pay via gateway or in-app wallet, and manage their trips. Admins oversee the entire platform.

**Key capabilities:**
- Multi-role system: Admin, Operator, Customer
- Real-time seat availability with race-condition protection
- Tiered cancellation refunds based on time before departure
- In-app wallet for payments and refunds
- Promo code discounts
- Operator analytics and revenue tracking
- Full audit trail of all API activity

---

## 2. Technology Stack

### Backend
| Component | Technology |
|---|---|
| Framework | ASP.NET Core 8.0 Web API |
| Language | C# (.NET 8) |
| Database | SQL Server (EF Core 8 Code-First) |
| ORM | Entity Framework Core 8 |
| Authentication | JWT Bearer Tokens (HMAC-SHA256) |
| Password Hashing | ASP.NET Identity PasswordHasher (PBKDF2) |
| API Docs | Swagger / OpenAPI (Swashbuckle) |
| Testing | xUnit 2.9 + Moq + EF InMemory |

### Frontend
| Component | Technology |
|---|---|
| Framework | Angular 17+ (Standalone Components) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State Management | Angular Signals |
| HTTP Client | Angular HttpClient |
| Routing | Angular Router (lazy-loaded) |

---

## 3. System Architecture

```
Angular Frontend (Standalone Components + Signals + Lazy Loading)
  Customer UI  |  Operator UI  |  Admin UI
        |
        | HTTP/JSON (JWT Bearer)  http://localhost:5299/api
        |
ASP.NET Core 8 API
  Middleware Pipeline: CORS -> Auth -> AuthZ -> Audit -> GlobalException
  Controllers -> Services -> Repositories -> DbContext
        |
        | EF Core
        |
SQL Server Database
  Users | Buses | Routes | Schedules | Bookings | Wallet
```

---

## 4. Project Structure

```
Bus-Ticket-Back-Front/
├── Backend/
│   ├── BusTicketBooking.Api/
│   │   ├── Controllers/        HTTP endpoints
│   │   ├── Services/           Business logic
│   │   ├── Interfaces/         Service contracts
│   │   ├── Repositories/       Generic data access
│   │   ├── Models/             EF Core entities
│   │   ├── Dtos/               Request/Response DTOs
│   │   ├── Contexts/           AppDbContext
│   │   ├── Migrations/         EF Core migrations
│   │   ├── Midlewares/         Audit + Exception middleware
│   │   ├── Exceptions/         Custom exception types
│   │   ├── Seed/               Dev database seeder
│   │   └── Program.cs          App startup and DI config
│   └── BusTicketBooking.Tests/
│       ├── Services/           Service unit tests (124 tests)
│       └── Helpers/            DbHelper, SeedHelper
│
└── bus-booking-frontend/
    └── src/app/
        ├── core/               Guards, interceptors
        ├── models/             TypeScript interfaces
        ├── services/           HTTP service layer
        ├── pages/
        │   ├── auth/           Login, Register
        │   ├── home/           Search form
        │   ├── search/         Search results
        │   ├── booking/        Seat selection, Passengers, Payment
        │   ├── my-bookings/    Booking list and detail
        │   ├── wallet/         Wallet balance and transactions
        │   ├── operator/       Operator dashboard and management
        │   └── admin/          Admin dashboard and tools
        └── shared/             Navbar, Toast
```

---

## 5. Database Design

### Core Tables

| Table | Purpose |
|---|---|
| Users | All accounts (Admin, Operator, Customer, PendingOperator) |
| BusOperators | Operator company profile linked to a User |
| Buses | Fleet — each bus belongs to an operator |
| Stops | Physical bus stops with city, name, lat/lng |
| BusRoutes | Named routes owned by an operator |
| RouteStops | Ordered stop sequence for each route |
| BusSchedules | A specific bus running a route at a departure time |
| Bookings | Customer booking for a schedule |
| BookingPassengers | Individual passengers per booking |
| Payments | Payment record per booking |
| Wallets | In-app wallet balance per user |
| WalletTransactions | Full transaction history (credits and debits) |
| PromoCodes | Discount codes created by operators |
| Reviews | Customer ratings per booking |
| Complaints | Customer complaints per booking |
| Announcements | Operator announcements per schedule |
| AuditLogs | System-wide activity and error log |

### Key Constraints
- Username and Email are unique per user
- Bus Code is unique per operator
- Route Code is unique per operator
- A bus cannot have two schedules at the same departure time
- One review per booking
- One wallet per user

---

## 6. Backend API

### Middleware Pipeline (in order)

```
Request
  -> CORS
  -> UseAuthentication      (JWT token parsed, ctx.User populated)
  -> UseAuthorization       (role checks applied)
  -> AuditMiddleware        (logs every /api/* request after response)
  -> GlobalExceptionMiddleware  (catches unhandled exceptions -> 500 JSON)
  -> Controllers
```

### Service Layer Pattern

All business logic lives in Services. Controllers are thin — they only handle HTTP concerns.

```
Controller
  -> validates input
  -> calls Service method
  -> maps result to HTTP response

Service
  -> validates business rules
  -> calls Repository / DbContext
  -> returns DTO

Repository<T>
  -> wraps EF Core DbSet<T>
  -> provides GetById, GetAll, Find, Add, Update, Remove
```

### Services Summary

| Service | Responsibility |
|---|---|
| UserService | User lookup and account creation |
| PasswordService | PBKDF2 password hashing and verification |
| TokenService | JWT access token generation |
| BusService | Bus fleet CRUD with role-aware ownership |
| RouteService | Route and stop management |
| ScheduleService | Schedule CRUD, search, seat availability, cancellation |
| BookingService | Full booking lifecycle with seat locking and refunds |
| WalletService | Balance management, credits, debits |
| StopService | Stop and city management |
| AuditLogService | Activity and error logging |

---

## 7. Frontend Application

### Routing Structure

```
/                         redirects to /auth/login
/home                     Search form (public)
/auth/login               Login page
/auth/register            Register page
/auth/pending-approval    Waiting for admin approval
/search                   Search results (public)
/booking/seats/:id        Step 1: Seat selection (auth required)
/booking/passengers/:id   Step 2: Passenger details (auth required)
/booking/confirm/:id      Step 3: Payment (auth required)
/my-bookings              Booking list (auth required)
/my-bookings/:id          Booking detail (auth required)
/wallet                   Wallet balance and history (auth required)
/profile                  User profile (auth required)
/operator                 Operator dashboard (Operator/Admin only)
/operator/buses           Manage buses
/operator/routes          Manage routes
/operator/schedules       Manage schedules
/operator/analytics       Revenue analytics
/operator/promo-codes     Promo code management
/operator/announcements   Schedule announcements
/operator/manifest        Passenger manifest
/operator/complaints      Customer complaints
/admin                    Admin dashboard (Admin only)
/admin/stops              Manage stops
/admin/audit-logs         System audit logs
/admin/operator-approvals Approve/reject operators
/admin/manage-users       User management
/admin/operator-performance Operator analytics
/admin/complaints         All complaints
```

### Route Guards

| Guard | Behaviour |
|---|---|
| authGuard | Redirects to /auth/login if not logged in or token expired |
| noAuthGuard | Redirects logged-in users to their role's home page |
| roleGuard(...roles) | Redirects to /home if user's role is not in the allowed list |

### Auth Interceptor

Every outgoing HTTP request automatically gets the `Authorization: Bearer <token>` header injected.
On a 401 response, the user is logged out and redirected to login.

### State Management

Angular Signals are used throughout. Key state:

- `AuthService._currentUser` — persisted to localStorage, loaded on app start
- `BookingStateService._draft` — in-memory booking flow state (schedule -> seats -> passengers)

---

## 8. Authentication & Authorization

### Registration Flow

```
User registers -> Role assigned:
  Customer      -> Role = "Customer"          (immediate access)
  Operator      -> Role = "PendingOperator"   (awaits admin approval)
```

### Login Flow

```
POST /api/auth/login
  -> Verify username + password (PBKDF2)
  -> Generate JWT (HMAC-SHA256, configurable expiry)
  -> Return token + user info + companyName (for operators)
  -> Frontend stores in localStorage
  -> Redirect based on role:
       Admin           -> /admin
       Operator        -> /operator
       PendingOperator -> /auth/pending-approval
       Customer        -> /home
```

### JWT Token Claims

| Claim | Value |
|---|---|
| sub | User GUID |
| unique_name | Username |
| email | Email address |
| name | Full name |
| role | Admin / Operator / Customer / PendingOperator |
| jti | Unique token ID (prevents replay) |

### Configuration (appsettings.json)

```json
{
  "Jwt": {
    "Key": "<secret-key-min-32-chars>",
    "Issuer": "BusTicketBookingApi",
    "Audience": "BusTicketBookingClient",
    "AccessTokenMinutes": 60
  }
}
```

---

## 9. User Roles & Features

### Admin
- View and search all users
- Approve or reject pending operator applications
- Manage stops (create, update, delete)
- View all buses, routes, schedules
- View all bookings and cancel any booking
- View all complaints and reply to them
- View all promo codes
- View operator performance analytics
- View system audit logs (filterable, paginated)
- Wallet access

### Operator
- Register (requires admin approval)
- Manage own buses (create, update status, delete)
- Manage own routes (create by city/stop name, update, delete)
- Manage own schedules (create, update, cancel with reason, delete)
- View bookings for own schedules
- View booking stats (total, confirmed, revenue)
- Create and manage promo codes
- Post announcements on schedules
- View and reply to complaints on own buses
- Revenue analytics (daily revenue, top routes, occupancy, ratings)
- Wallet access

### Customer
- Register and login
- Search buses by city, date, filters (price, bus type, amenities)
- View seat availability
- Book seats (up to 6 per booking)
- Apply promo codes at booking
- Pay via mock gateway or in-app wallet
- View all own bookings with live refund policy
- Cancel bookings (tiered refund)
- Report bus miss (within 5 min of departure, 75% refund)
- Submit reviews on completed trips
- Raise complaints during/after travel
- Wallet: view balance, top up, view transaction history

---

## 10. Booking Flow

### Step-by-Step

```
1. SEARCH
   Customer enters: From City, To City, Date
   -> POST /api/schedules/search-by-keys
   -> Results filtered: future departures, not cancelled, correct direction
   -> Client-side filters: bus type, time slot, price range, amenities

2. SEAT SELECTION  (/booking/seats/:scheduleId)
   -> GET /api/schedules/:id/seats  (live availability)
   -> Visual 4-column seat map (A=Window, B=Aisle, C=Aisle, D=Window)
   -> Max 6 seats per booking
   -> 10-minute client-side hold timer

3. PASSENGER DETAILS  (/booking/passengers/:scheduleId)
   -> Fill name, age for each selected seat
   -> First passenger auto-filled from logged-in user
   -> Optional promo code validation
   -> POST /api/bookings  -> creates Booking (Pending) + Payment (Initiated)
   -> Seat conflict check inside SERIALIZABLE transaction

4. PAYMENT  (/booking/confirm/:bookingId)
   -> Option A: Mock gateway -> POST /api/bookings/:id/pay
   -> Option B: Wallet payment -> same endpoint with useWallet=true
   -> Booking status: Pending -> Confirmed
   -> Payment status: Initiated -> Success

5. CONFIRMATION
   -> Booking confirmed banner
   -> Download E-Ticket (HTML print page)
   -> Navigate to My Bookings
```

### Seat Conflict Prevention

Seat availability is checked inside a SERIALIZABLE database transaction:

```
BEGIN TRANSACTION (Serializable)
  1. Validate promo code + increment UsedCount
  2. Check requested seats are not taken
  3. Create Booking + Passengers + Payment
COMMIT
```

This prevents two users from booking the same seat simultaneously.

---

## 11. Wallet & Refund System

### Wallet Operations

| Operation | Trigger | Amount |
|---|---|---|
| Top-up | Customer manually adds money | Any (1 to 50,000) |
| Booking payment | Customer pays with wallet | Booking total |
| Cancellation refund | Customer cancels booking | Based on refund policy |
| Operator cancel refund | Operator cancels schedule | 100% of booking total |
| Bus miss refund | Customer reports missed bus | 75% of booking total |

### Cancellation Refund Policy

| Time before departure | Refund % |
|---|---|
| 48 hours or more | 100% |
| 24 to 48 hours | 75% |
| 6 to 24 hours | 50% |
| 0 to 6 hours | 25% |
| Already departed | 0% |

Refunds are only issued for Confirmed bookings with a successful payment.
Pending (unpaid) bookings are cancelled with no refund.

### Bus Miss Feature

- Available window: 5 minutes before to 5 minutes after departure
- Customer reports via the booking detail page
- 75% of booking amount is credited to wallet immediately
- Booking status changes to BusMissed

---

## 12. Audit Logging

Every API request is automatically logged to the AuditLogs table by AuditMiddleware.

### What is logged

| Field | Description |
|---|---|
| LogType | "Audit" for normal requests, "Error" for exceptions |
| Action | HTTP method (GET, POST, PUT, etc.) |
| Description | Human-readable summary |
| Username | Who made the request (null for anonymous) |
| UserRole | Their role at the time |
| EntityType | Inferred from URL (Bus, Booking, Schedule, etc.) |
| Endpoint | Full request path |
| StatusCode | HTTP response code |
| DurationMs | How long the request took |
| IsSuccess | True if status < 400 |

### Viewing Logs (Admin only)

GET /api/auditlogs with query params:
- logType — "Audit" or "Error"
- username — partial match
- entityType — exact match
- isSuccess — true/false
- from / to — date range
- page / pageSize — pagination

---

## 13. Running the Application

### Prerequisites

- .NET 8 SDK
- Node.js 18+
- SQL Server (local or Docker)
- Angular CLI: npm install -g @angular/cli

### Backend Setup

```bash
cd Backend/BusTicketBooking.Api

# Set connection string
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Database=BusTicketBooking;Trusted_Connection=True;"

# Set JWT secret
dotnet user-secrets set "Jwt:Key" "your-super-secret-key-minimum-32-characters"
dotnet user-secrets set "Jwt:Issuer" "BusTicketBookingApi"
dotnet user-secrets set "Jwt:Audience" "BusTicketBookingClient"

# Apply migrations
dotnet ef database update

# Run (auto-seeds dev data on first run)
dotnet run
```

API available at: https://localhost:5299
Swagger UI at: https://localhost:5299/swagger

### Frontend Setup

```bash
cd bus-booking-frontend
npm install
ng serve
```

App available at: http://localhost:4200

### Dev Seed Data

On first run in Development, the seeder creates:
- Admin account (credentials in appsettings or user secrets)
- Sample operator account
- Sample stops (cities and bus stops)

---

## 14. Testing

### Running Tests

```bash
dotnet test Backend/BusTicketBooking.Tests/BusTicketBooking.Tests.csproj
```

### Test Coverage

| Test File | Service Tested | Tests |
|---|---|---|
| BookingServiceTests.cs | BookingService | 14 |
| BusServiceTests.cs | BusService | 14 |
| RouteServiceTests.cs | RouteService | 10 |
| ScheduleServiceTests.cs | ScheduleService | 14 |
| StopServiceTests.cs | StopService | 10 |
| UserServiceTests.cs | UserService | 6 |
| PasswordServiceTests.cs | PasswordService | 5 |
| TokenServiceTests.cs | TokenService | 7 |
| WalletServiceTests.cs | WalletService | 9 |
| PromoCodeTests.cs | BookingService (promos) | 10 |
| AuditLogServiceTests.cs | AuditLogService | 10 |
| Total | | 124 |

### Test Approach

- Each test gets its own isolated EF InMemory database — no shared state
- DbHelper.CreateDb() creates a fresh database per test
- SeedHelper provides reusable entity factories
- Moq is used for IPasswordService in UserService tests
- No external dependencies — tests run fully offline

---

## 15. API Reference

Base URL: http://localhost:5299/api

All protected endpoints require: Authorization: Bearer token

### Auth  /api/auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /register | Public | Register new account |
| POST | /login | Public | Login and get JWT token |
| GET | /users | Admin | List all users with filters |

### Buses  /api/buses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | Admin/Operator | Create bus |
| GET | / | Admin/Operator | Get all buses (role-filtered) |
| PUT | /{id} | Admin/Operator | Update bus details |
| PATCH | /{id}/status | Admin/Operator | Update bus status only |
| DELETE | /{id} | Admin/Operator | Delete bus |
| POST | /by-operator | Operator | Create bus by operator username |
| GET | /{identity}/{code} | Admin/Operator | Get bus by operator + code |
| PATCH | /{identity}/{code}/status | Admin/Operator | Update status by code |

### Routes  /api/routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Admin/Operator | Get all routes |
| POST | /by-keys | Operator | Create route by city/stop names |
| GET | /{identity}/{code} | Admin/Operator | Get route by operator + code |
| PUT | /{identity}/{code} | Operator | Update route |
| DELETE | /{identity}/{code} | Admin/Operator | Delete route |

### Schedules  /api/schedules

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Admin/Operator | Get all schedules (role-filtered) |
| POST | / | Admin/Operator | Create schedule |
| GET | /{id} | Public | Get schedule by ID |
| PUT | /{id} | Admin/Operator | Update schedule |
| DELETE | /{id} | Admin/Operator | Delete/soft-cancel schedule |
| PATCH | /{id}/cancel | Admin/Operator | Cancel with reason + refund all |
| GET | /{id}/seats | Public | Get seat availability |
| POST | /by-keys | Operator | Create by bus code + route code |
| POST | /search-by-keys | Public | Search by city/stop names + filters |

### Bookings  /api/bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | Any auth | Create booking by schedule ID |
| GET | /my | Any auth | Get own bookings |
| GET | /{id} | Any auth | Get booking by ID |
| POST | /{id}/pay | Any auth | Pay for booking |
| POST | /{id}/cancel | Any auth | Cancel booking |
| POST | /{id}/bus-miss | Customer | Report missed bus (75% refund) |
| GET | /operator-stats | Operator/Admin | Booking totals for operator |
| GET | /schedule/{id} | Operator/Admin | All bookings for a schedule |

### Stops  /api/Stops

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /cities | Public | All cities with stop counts |
| GET | /by-city/{city} | Public | Stops in a city |
| POST | / | Admin | Create stop |
| PUT | /{id} | Admin | Update stop |
| DELETE | /{id} | Admin | Delete stop |

### Wallet  /api/wallet

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Any auth | Get balance + last 50 transactions |
| POST | /topup | Any auth | Add money to wallet |

### Promo Codes  /api/promocodes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | Operator | Create promo code |
| GET | /my | Operator | Get own promo codes |
| PATCH | /{id}/toggle | Operator | Toggle active/inactive |
| DELETE | /{id} | Operator | Delete promo code |
| POST | /validate | Any auth | Validate code against amount |
| GET | / | Admin | Get all promo codes |

### Reviews  /api/reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | Any auth | Submit review for booking |
| GET | /schedule/{id} | Public | All reviews for a schedule |
| GET | /schedule/{id}/summary | Public | Rating summary |
| GET | /my/{bookingId} | Any auth | Get own review for a booking |

### Complaints  /api/complaints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /booking/{id} | Customer | Raise complaint on booking |
| GET | /my | Customer | Get own complaints |
| GET | / | Operator/Admin | Get all complaints |
| PATCH | /{id}/reply | Operator/Admin | Reply and resolve complaint |

### Announcements  /api/announcements

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | / | Operator | Create announcement for schedule |
| GET | /schedule/{id} | Public | Get announcements for schedule |
| GET | /my | Operator | Get own announcements |
| DELETE | /{id} | Operator | Delete announcement |

### Operator Approvals  /api/operator-approvals

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Admin | List pending operator applications |
| POST | /{id}/approve | Admin | Approve operator + create profile |
| POST | /{id}/reject | Admin | Reject and downgrade to Customer |

### Analytics  /api/analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /operator | Operator/Admin | Revenue analytics for operator fleet |
| GET | /operators | Admin | Performance metrics for all operators |
| GET | /admin-summary | Admin | Dashboard summary counts |

### Audit Logs  /api/auditlogs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | / | Admin | Paginated logs with filters |

---

*SwiftRoute Bus Ticket Booking System — End-to-End Documentation*
