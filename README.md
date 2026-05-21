# PGLink Payment Aggregator

A NestJS-based payment aggregator that supports multiple payment providers (Xendit, Midtrans) with PostgreSQL and TypeORM. Applications can be registered to obtain API keys and initiate payment requests.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Applications API](#applications-api)
  - [Payments API](#payments-api)
- [Payment Providers](#payment-providers)
  - [Xendit Integration](#xendit-integration)
  - [Midtrans Integration](#midtrans-integration)
- [Webhooks](#webhooks)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

PGLink Payment Aggregator is a scalable payment processing platform that allows businesses to integrate with multiple payment providers through a single unified API. Built with NestJS, TypeORM, and PostgreSQL, it provides:

- Multi-provider payment processing (Xendit, Midtrans)
- Application management with API key authentication
- Secure payment processing with webhook handling
- Subscription management capabilities
- Administrative dashboard for monitoring transactions

## Features

- **Multi-provider Support**: Seamlessly switch between Xendit and Midtrans payment providers
- **Application Management**: Register applications to obtain secure API keys
- **Flexible Payment Methods**: Support for bank transfers, e-wallets, cards, and QR payments
- **Webhook Handling**: Secure callback processing from payment providers
- **Subscription Management**: Recurring billing capabilities
- **Administrative Dashboard**: Monitor payments, subscriptions, and application performance
- **Security**: JWT authentication for admin routes, API key protection for payment endpoints
- **Database**: PostgreSQL with TypeORM ORM for reliable data storage
- **Testing**: Comprehensive unit and end-to-end test coverage

## Architecture

The system follows a modular NestJS architecture with clear separation of concerns:

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module configuration
├── config/                 # Configuration files
├── common/                 # Shared components (guards, decorators, strategies)
└── modules/                # Feature modules
    ├── applications/       # Application registration & management
    ├── payments/           # Payment processing core
    └── admin/              # Administrative dashboard
```

### Key Components

- **Applications Module**: Handles application registration, API key generation, and management
- **Payments Module**: Core payment processing logic with provider abstractions
- **Providers**: Xendit and Midtrans implementations following a common interface
- **Common**: Shared guards (JWT, API key), decorators, and strategies
- **Admin Module**: Dashboard for monitoring and managing payments/applications

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- PNPM package manager
- Xendit and/or Midtrans accounts (for production)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pglink

# Install dependencies
pnpm install
```

### Environment Setup

Create a `.env` file based on the provided example:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=PGLink_payment

# JWT
JWT_SECRET=your-jwt-secret-here

# Payment Providers
XENDIT_API_KEY=xendit-api-key
XENDIT_WEBHOOK_TOKEN=xendit-webhook-token
MIDTRANS_SERVER_KEY=midtrans-server-key
MIDTRANS_CLIENT_KEY=midtrans-client-key
```

### Running the Application

```bash
# Development mode (with hot reload)
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod

# Debug mode
pnpm run start:debug
```

## API Documentation

### Applications API

JWT-protected endpoints for managing applications.

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| POST   | `/applications`     | Register new application |
| GET    | `/applications`     | List all applications    |
| GET    | `/applications/:id` | Get application details  |
| POST   | `/applications/:id` | Update application       |
| DELETE | `/applications/:id` | Delete application       |

#### Register Application

```http
POST /applications
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "My E-commerce Store",
  "webhookUrl": "https://my-store.com/webhook/payment"
}
```

#### Response

```json
{
  "id": "uuid",
  "name": "My E-commerce Store",
  "apiKey": "sk_live_abcdef123456",
  "webhookUrl": "https://my-store.com/webhook/payment",
  "createdAt": "2026-03-05T12:00:00.000Z",
  "updatedAt": "2026-03-05T12:00:00.000Z"
}
```

### Payments API

API key protected endpoints via `X-API-Key` header for processing payments.

| Method | Endpoint                      | Description                                         |
| ------ | ----------------------------- | --------------------------------------------------- |
| POST   | `/payments`                   | Create payment request                              |
| GET    | `/payments`                   | List payments for application                       |
| POST   | `/payments/xendit-callback`   | Xendit webhook (requires `x-callback-token` header) |
| POST   | `/payments/midtrans-callback` | Midtrans webhook (signature verified in body)       |

#### Create Payment Request

```http
POST /payments
Content-Type: application/json
X-API-Key: sk_live_abcdef123456

{
  "amount": 50000,
  "provider": "XENDIT",
  "applicationOrderId": "ORDER-12345",
  "xenditPaymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment description"
}
```

#### Response

```json
{
  "id": "uuid",
  "applicationId": "application-uuid",
  "amount": 50000,
  "provider": "XENDIT",
  "applicationOrderId": "ORDER-12345",
  "paymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment description",
  "status": "PENDING",
  "externalId": "payment-ext-12345",
  "createdAt": "2026-03-05T12:00:00.000Z",
  "updatedAt": "2026-03-05T12:00:00.000Z"
}
```

#### Xendit Payment Methods

- **Bank Transfer**: `BCA`, `BRI`, `BNI`, `MANDIRI`, `PERMATA`, `CIMB`, `DANAMON`, `BSI`
- **E-Wallet**: `OVO`, `DANA`, `LINKAJA`, `SHOPEEPAY`, `GRABPAY`, `PAYMAYA`
- **Card**: `CARD`
- **QR**: `QRIS`

#### Midtrans Payment Methods

```json
{
  "amount": 50000,
  "provider": "MIDTRANS",
  "midtransPaymentMethod": "bank_transfer",
  "midtransBankCode": "bca"
}
```

- **Bank Transfer**: `bank_transfer` with `bankCode`: `bca`, `bni`, `bri`, `mandiri`, `permata`, `cimb`, `danamon`, `bsi`
- **E-Wallet**: `gopay`, `shopeepay`, `qris`, `dana`
- **Card**: `credit_card`
- **OTC**: `indomaret`, `alfamart`
- **Cardless**: `akulaku`, `kredivo`

## Payment Providers

### Xendit Integration

The Xendit provider is located in `src/modules/payments/providers/xendit.provider.ts` and implements the `PaymentProvider` interface.

#### Configuration

Xendit requires:

- API Key (from Xendit dashboard)
- Webhook Token (for verifying callbacks)

#### Supported Features

- Virtual Account payments
- E-wallet payments (OVO, DANA, etc.)
- Card payments
- QRIS payments
- Recurring payments (subscriptions)

#### Webhook Handling

Xendit callbacks are handled at `/payments/xendit-callback` and require the `x-callback-token` header matching your `XENDIT_WEBHOOK_TOKEN`.

### Midtrans Integration

The Midtrans provider is located in `src/modules/payments/providers/midtrans.provider.ts` and implements the `PaymentProvider` interface.

#### Configuration

Midtrans requires:

- Server Key (for API calls)
- Client Key (for client-side integration)

#### Supported Features

- Bank transfers
- E-wallet payments (GoPay, ShopeePay, etc.)
- Credit card payments
- OTC payments (Indomaret, Alfamart)
- Cardless credit (Akulaku, Kredivo)

#### Webhook Handling

Midtrans callbacks are handled at `/payments/midtrans-callback` and verify signatures using SHA256(order_id + status_code + gross_amount + server_key).

## Webhooks

When payment status changes, the system forwards callbacks to your application's configured webhook URL.

### Webhook Payload

```json
{
  "paymentId": "uuid",
  "applicationOrderId": "ORDER-12345",
  "externalId": "payment-ext-...",
  "amount": 50000,
  "currency": "IDR",
  "status": "SUCCESS",
  "provider": "XENDIT",
  "paymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment description",
  "metadata": {},
  "processedAt": "2026-03-05T12:00:00.000Z"
}
```

### Webhook Headers

- `X-API-Key`: Application's API key
- `X-Payment-Id`: Payment UUID

### Handling Webhooks

Your webhook endpoint should:

1. Verify the `X-API-Key` header matches your application's API key
2. Process the payment status update
3. Return HTTP 200 to acknowledge receipt
4. Implement idempotency to handle duplicate callbacks

## Testing

### Running Tests

```bash
# Unit tests
pnpm run test

# Test watch mode
pnpm run test:watch

# Test coverage
pnpm run test:cov

# End-to-end tests
pnpm run test:e2e
```

### Test Structure

- Unit tests: Located alongside source files with `.spec.ts` extension
- E2E tests: Located in the `test/` directory
- Mocking: External dependencies (payment providers, HTTP clients) are mocked

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t pglink .

# Run container
docker run -p 3000:3000 --env-file .env pglink
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down
```

### Environment Variables for Production

Ensure these are set in your production environment:

- `NODE_ENV=production`
- Secure `JWT_SECRET`
- Valid payment provider credentials
- Database connection string

## Project Structure

```
pglink/
├── src/                    # Source code
│   ├── main.ts             # Application entry point
│   ├── app.module.ts       # Root application module
│   ├── config/             # Configuration files
│   │   └── configuration.ts
│   ├── common/             # Shared components
│   │   ├── decorators/     # Custom decorators
│   │   ├── guards/         # Auth guards (JwtAuthGuard, ApiKeyGuard)
│   │   ├── strategies/     # Authentication strategies
│   │   └── interfaces/     # Shared TypeScript interfaces
│   └── modules/            # Feature modules
│       ├── applications/   # Application registration & management
│       │   ├── entities/   # TypeORM entities
│   │   │   └── application.entity.ts
│   │   ├── dto/            # Data Transfer Objects
│   │   │   └── application.dto.ts
│   │   ├── applications.controller.ts
│   │   ├── applications.service.ts
│   │   └── applications.module.ts
│       ├── payments/       # Payment processing
│       │   ├── entities/   # Payment and subscription entities
│   │   │   ├── payment.entity.ts
│   │   │   └── subscription.entity.ts
│   │   ├── dto/            # Payment DTOs
│   │   │   ├── payment.dto.ts
│   │   │   ├── midtrans-payment.dto.ts
│   │   │   └── xendit-payment.dto.ts
│   │   ├── providers/      # Payment provider implementations
│   │   │   ├── xendit.provider.ts
│   │   │   ├── midtrans.provider.ts
│   │   │   ├── payment-provider.interface.ts
│   │   │   ├── xendit-subscription.provider.ts
│   │   │   └── midtrans-subscription.provider.ts
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── subscriptions.controller.ts
│   │   ├── subscriptions.service.ts
│   │   └── payments.module.ts
│       └── admin/          # Administrative dashboard
│           ├── admin.controller.ts
│           ├── admin.service.ts
│           ├── admin.module.ts
│           └── dto/        # Admin-specific DTOs
├── test/                   # End-to-end tests
├── views/                  # Template files (if applicable)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── docker-compose.yml      # Docker compose configuration
├── Dockerfile              # Docker build instructions
├── package.json            # Project dependencies and scripts
├── pnpm-lock.yaml          # Locked dependency versions
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (Prettier, ESLint)
- Write unit tests for new functionality
- Update documentation as needed
- Keep pull requests focused and descriptive

## License

This project is licensed under the UNLICENSED license - see the [LICENSE](LICENSE) file for details.

## Support

For questions and support, please open an issue in the repository or contact the development team.

---

_Documentation generated on: 2026-05-21_
