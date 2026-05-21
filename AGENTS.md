# AGENTS.md - PGLink Payment Aggregator

## Project Overview

NestJS-based payment aggregator that supports multiple payment providers (Xendit, Midtrans) with PostgreSQL and TypeORM. Applications can be registered to obtain API keys and initiate payment requests.

## Build, Lint, and Test Commands

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run start:dev     # Start with hot reload
pnpm run start:debug  # Start with debugging
```

### Build

```bash
pnpm run build         # Build for production
pnpm run start:prod   # Run production build
```

### Linting

```bash
pnpm run lint         # Lint and fix all TypeScript files
```

### Testing

```bash
pnpm run test                    # Run all unit tests
pnpm run test -- src/path/to/file.spec.ts  # Run single test file
pnpm run test -- --testNamePattern="test name"  # Run specific test
pnpm run test:watch             # Watch mode
pnpm run test:cov               # Coverage report
pnpm run test:e2e               # End-to-end tests
```

### Formatting

```bash
pnpm run format    # Format with Prettier
```

---

## Code Style Guidelines

### General Rules

- **Language**: TypeScript with strict typing enabled
- **Framework**: NestJS (Dependency Injection, Controllers, Services)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT for guards, API keys for application authentication
- **Line length**: Use Prettier default (80-100 chars)

### Formatting (Prettier)

- Single quotes for strings
- Trailing commas on all objects/arrays
- 2-space indentation

### TypeScript Conventions

- Use explicit return types on public methods
- Enable `strictNullChecks` - always handle null/undefined
- Use interfaces for data transfer objects (DTOs)
- Use enums for status constants

### Naming Conventions

| Element          | Convention                  | Example                        |
| ---------------- | --------------------------- | ------------------------------ |
| Controllers      | `PascalCase` + `Controller` | `PaymentsController`           |
| Services         | `PascalCase` + `Service`    | `PaymentService`               |
| Entities         | `PascalCase`                | `Application`, `Payment`       |
| DTOs             | `PascalCase` + `Dto`        | `CreatePaymentDto`             |
| Guards           | `PascalCase` + `Guard`      | `JwtAuthGuard`                 |
| Interfaces       | `PascalCase`                | `PaymentProvider`              |
| Variables        | `camelCase`                 | `applicationKey`               |
| Constants        | `UPPER_SNAKE_CASE`          | `PAYMENT_STATUS_PENDING`       |
| Database columns | `snake_case`                | `created_at`, `application_id` |

### File Structure

```
src/
├── main.ts
├── app.module.ts
├── config/
│   └── configuration.ts       # Environment config
├── common/
│   ├── decorators/            # Custom decorators (@CurrentApplication)
│   ├── guards/               # Auth guards (JwtAuthGuard, ApiKeyGuard)
│   ├── strategies/            # JWT strategy
│   └── interfaces/           # TypeScript interfaces
├── modules/
│   ├── applications/         # Application registration & API keys
│   │   ├── entities/
│   │   ├── dto/
│   │   ├── applications.controller.ts
│   │   ├── applications.service.ts
│   │   └── applications.module.ts
│   └── payments/            # Payment processing
│       ├── entities/
│       ├── dto/
│       ├── providers/        # Xendit, Midtrans implementations
│       ├── payments.controller.ts
│       ├── payments.service.ts
│       └── payments.module.ts
```

### Import Order (ESLint groups)

1. External libraries (`@nestjs/*`, `axios`, etc.)
2. Internal modules (`src/modules/*`)
3. Common (`src/common/*`)
4. Relative imports

### Error Handling

- Use NestJS built-in `HttpException` for HTTP errors
- Create custom exception filters for domain-specific errors
- Always return structured error responses with status code and message
- Log errors with context using NestJS `Logger`

```typescript
throw new HttpException(
  { status: 'error', message: 'Payment failed', code: 'PAYMENT_FAILED' },
  HttpStatus.BAD_REQUEST,
);
```

### Database (TypeORM)

- Use TypeORM entities with decorators (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`)
- Use snake_case for column names
- Always define relationships with lazy loading where appropriate
- Use migrations for schema changes (synchronize: true for dev)

### Testing

- Follow NestJS testing patterns with `Test.createTestingModule`
- Use unit tests for services, integration tests for controllers
- Mock external dependencies (TypeORM repositories, HTTP clients)
- Test file naming: `*.spec.ts`

---

## Environment Variables

Create `.env` file with:

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
JWT_SECRET=your-jwt-secret

# Payment Providers
XENDIT_API_KEY=xendit-api-key
XENDIT_WEBHOOK_TOKEN=xendit-webhook-token
MIDTRANS_SERVER_KEY=midtrans-server-key
MIDTRANS_CLIENT_KEY=midtrans-client-key
```

---

## API Endpoints

### Applications (JWT Protected)

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| POST   | `/applications`     | Register new application |
| GET    | `/applications`     | List all applications    |
| GET    | `/applications/:id` | Get application details  |
| POST   | `/applications/:id` | Update application       |
| DELETE | `/applications/:id` | Delete application       |

### Payments (API Key Protected via `X-API-Key` header)

| Method | Endpoint                      | Description                                         |
| ------ | ----------------------------- | --------------------------------------------------- |
| POST   | `/payments`                   | Create payment request                              |
| GET    | `/payments`                   | List payments for application                       |
| POST   | `/payments/xendit-callback`   | Xendit webhook (requires `x-callback-token` header) |
| POST   | `/payments/midtrans-callback` | Midtrans webhook (signature verified in body)       |

### Create Payment Request

```json
POST /payments
{
  "amount": 50000,
  "provider": "XENDIT",
  "applicationOrderId": "ORDER-12345",
  "xenditPaymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment description"
}
```

**Xendit Payment Methods:**

- Bank Transfer: `BCA`, `BRI`, `BNI`, `MANDIRI`, `PERMATA`, `CIMB`, `DANAMON`, `BSI`
- E-Wallet: `OVO`, `DANA`, `LINKAJA`, `SHOPEEPAY`, `GRABPAY`, `PAYMAYA`
- Card: `CARD`
- QR: `QRIS`

**Midtrans Payment Methods:**

```json
{
  "amount": 50000,
  "provider": "MIDTRANS",
  "midtransPaymentMethod": "bank_transfer",
  "midtransBankCode": "bca"
}
```

- Bank Transfer: `bank_transfer` with `bankCode`: `bca`, `bni`, `bri`, `mandiri`, `permata`, `cimb`, `danamon`, `bsi`
- E-Wallet: `gopay`, `shopeepay`, `qris`, `dana`
- Card: `credit_card`
- OTC: `indomaret`, `alfamart`
- Cardless: `akulaku`, `kredivo`

---

## Callback Webhook Forwarding

When payment status changes, callback is forwarded to application's `webhookUrl` with:

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

Headers sent to webhook:

- `X-API-Key`: Application's API key
- `X-Payment-Id`: Payment UUID

---

## Notes for Agents

- Always validate API key from `X-API-Key` header before processing payment requests
- Xendit callbacks require `x-callback-token` header matching `XENDIT_WEBHOOK_TOKEN`
- Midtrans callbacks verify signature using SHA256(order_id + status_code + gross_amount + server_key)
- Forward payment callbacks to application's configured webhook URL
- Handle idempotency for callback processing (don't process same callback twice)
- Use transactions for payment status updates
- Log all payment operations for audit trails
