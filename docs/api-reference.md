# API Reference

This document provides detailed information about all available API endpoints in the PGLink Payment Aggregator.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3000
```

In production, replace `localhost:3000` with your domain.

## Authentication

The API uses two different authentication methods depending on the endpoint:

### 1. JWT Authentication

Used for application management endpoints (`/applications/*`)

- Header: `Authorization: Bearer <jwt-token>`
- Tokens obtained via authentication endpoint (not yet implemented in current version)
- For development, you can use a test token or disable auth in development mode

### 2. API Key Authentication

Used for payment processing endpoints (`/payments/*`)

- Header: `X-API-Key: <application-api-key>`
- API keys are generated when applications are registered

## Status Codes

The API uses standard HTTP status codes:

| Code | Description           |
| ---- | --------------------- |
| 200  | OK                    |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Unprocessable Entity  |
| 500  | Internal Server Error |
| 503  | Service Unavailable   |

## Applications API

Endpoints for managing applications. Requires JWT authentication.

### Register a New Application

```http
POST /applications
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Request Body

| Field      | Type   | Required | Description                     |
| ---------- | ------ | -------- | ------------------------------- |
| name       | string | Yes      | Application name                |
| webhookUrl | string | No       | URL to receive payment webhooks |

#### Example Request

```json
{
  "name": "My E-commerce Store",
  "webhookUrl": "https://my-store.com/webhook/payment"
}
```

#### Success Response

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

#### Error Responses

- 400: Invalid request body
- 401: Missing or invalid JWT token
- 409: Application with same name already exists
- 500: Internal server error

### Get All Applications

```http
GET /applications
Authorization: Bearer <jwt-token>
```

#### Query Parameters

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| limit     | number | No       | Maximum number of results (default: 10) |
| offset    | number | No       | Number of results to skip (default: 0)  |

#### Success Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My E-commerce Store",
      "apiKey": "sk_live_abcdef123456",
      "webhookUrl": "https://my-store.com/webhook/payment",
      "createdAt": "2026-03-05T12:00:00.000Z",
      "updatedAt": "2026-03-05T12:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Get Application by ID

```http
GET /applications/:id
Authorization: Bearer <jwt-token>
```

#### Path Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| id        | string | Yes      | Application UUID |

#### Success Response

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

#### Error Responses

- 401: Missing or invalid JWT token
- 404: Application not found
- 500: Internal server error

### Update Application

```http
POST /applications/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| id        | string | Yes      | Application UUID |

#### Request Body

| Field      | Type   | Required | Description                     |
| ---------- | ------ | -------- | ------------------------------- |
| name       | string | No       | Application name                |
| webhookUrl | string | No       | URL to receive payment webhooks |

#### Example Request

```json
{
  "name": "Updated Store Name",
  "webhookUrl": "https://my-store.com/webhook/payment-v2"
}
```

#### Success Response

```json
{
  "id": "uuid",
  "name": "Updated Store Name",
  "apiKey": "sk_live_abcdef123456",
  "webhookUrl": "https://my-store.com/webhook/payment-v2",
  "createdAt": "2026-03-05T12:00:00.000Z",
  "updatedAt": "2026-03-05T12:30:00.000Z"
}
```

#### Error Responses

- 400: Invalid request body
- 401: Missing or invalid JWT token
- 404: Application not found
- 409: Application with same name already exists
- 500: Internal server error

### Delete Application

```http
DELETE /applications/:id
Authorization: Bearer <jwt-token>
```

#### Path Parameters

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| id        | string | Yes      | Application UUID |

#### Success Response

```json
{
  "message": "Application deleted successfully"
}
```

#### Error Responses

- 401: Missing or invalid JWT token
- 404: Application not found
- 500: Internal server error

## Payments API

Endpoints for processing payments. Requires API key authentication.

### Create Payment Request

```http
POST /payments
Content-Type: application/json
X-API-Key: <application-api-key>
```

#### Request Body

##### Common Fields

| Field              | Type   | Required | Description                                                                    |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------------ |
| amount             | number | Yes      | Payment amount in smallest currency unit (e.g., cents for USD, rupiah for IDR) |
| provider           | string | Yes      | Payment provider (`XENDIT` or `MIDTRANS`)                                      |
| applicationOrderId | string | Yes      | Your internal order ID                                                         |
| customerEmail      | string | No       | Customer email address                                                         |
| description        | string | No       | Payment description                                                            |

##### Provider-Specific Fields

###### For Xendit (`provider: "XENDIT"`)

| Field               | Type   | Required | Description                                       |
| ------------------- | ------ | -------- | ------------------------------------------------- |
| xenditPaymentMethod | string | Yes      | Payment method (see Xendit Payment Methods below) |

###### For Midtrans (`provider: "MIDTRANS"`)

| Field                 | Type   | Required    | Description                                         |
| --------------------- | ------ | ----------- | --------------------------------------------------- |
| midtransPaymentMethod | string | Yes         | Payment method (see Midtrans Payment Methods below) |
| midtransBankCode      | string | Conditional | Bank code (required for bank_transfer method)       |

#### Example Request (Xendit Bank Transfer)

```json
{
  "amount": 50000,
  "provider": "XENDIT",
  "applicationOrderId": "ORDER-12345",
  "xenditPaymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment for order #12345"
}
```

#### Example Request (Midtrans E-Wallet)

```json
{
  "amount": 75000,
  "provider": "MIDTRANS",
  "applicationOrderId": "ORDER-12346",
  "midtransPaymentMethod": "gopay",
  "customerEmail": "customer@test.com",
  "description": "Payment for order #12346"
}
```

#### Success Response

```json
{
  "id": "uuid",
  "applicationId": "application-uuid",
  "amount": 50000,
  "provider": "XENDIT",
  "applicationOrderId": "ORDER-12345",
  "paymentMethod": "BCA",
  "customerEmail": "customer@test.com",
  "description": "Payment for order #12345",
  "status": "PENDING",
  "externalId": "payment-ext-12345",
  "createdAt": "2026-03-05T12:00:00.000Z",
  "updatedAt": "2026-03-05T12:00:00.000Z"
}
```

#### Error Responses

- 400: Invalid request body or missing required fields
- 401: Missing or invalid API key
- 402: Payment provider error (details in response body)
- 404: Application not found for API key
- 429: Rate limit exceeded
- 500: Internal server error
- 503: Payment provider unavailable

### Get Payments for Application

```http
GET /payments
Content-Type: application/json
X-API-Key: <application-api-key>
```

#### Query Parameters

| Parameter | Type         | Required | Description                              |
| --------- | ------------ | -------- | ---------------------------------------- |
| limit     | number       | No       | Maximum number of results (default: 10)  |
| offset    | number       | No       | Number of results to skip (default: 0)   |
| status    | string       | No       | Filter by payment status                 |
| startDate | string (ISO) | No       | Filter payments created after this date  |
| endDate   | string (ISO) | No       | Filter payments created before this date |

#### Success Response

```json
{
  "data": [
    {
      "id": "uuid",
      "applicationId": "application-uuid",
      "amount": 50000,
      "provider": "XENDIT",
      "applicationOrderId": "ORDER-12345",
      "paymentMethod": "BCA",
      "customerEmail": "customer@test.com",
      "description": "Payment for order #12345",
      "status": "SUCCESS",
      "externalId": "payment-ext-12345",
      "createdAt": "2026-03-05T12:00:00.000Z",
      "updatedAt": "2026-03-05T12:05:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Xendit Callback Webhook

```http
POST /payments/xendit-callback
Content-Type: application/json
x-callback-token: <your-xendit-webhook-token>
```

> **Note**: This endpoint is called by Xendit, not by your application.

#### Headers

| Header           | Required | Description                                               |
| ---------------- | -------- | --------------------------------------------------------- |
| x-callback-token | Yes      | Must match your XENDIT_WEBHOOK_TOKEN environment variable |

#### Request Body

The request body contains the Xendit webhook payload. Refer to [Xendit Documentation](https://xendit.dev/en/reference#virtual-account-bank-transfer) for the full structure.

#### Success Response

```json
{
  "message": "Callback processed successfully"
}
```

#### Error Responses

- 401: Invalid or missing x-callback-token
- 400: Invalid payload
- 500: Internal server error

### Midtrans Callback Webhook

```http
POST /payments/midtrans-callback
Content-Type: application/json
```

> **Note**: This endpoint is called by Midtrans, not by your application.

#### Request Body

The request body contains the Midtrans webhook payload. Refer to [Midtrans Documentation](https://docs.midtrans.com/en/core-api/snap-api#notification) for the full structure.

Midtrans verifies the webhook signature using:

```
SHA256(order_id + status_code + gross_amount + server_key)
```

#### Success Response

```json
{
  "message": "Callback processed successfully"
}
```

#### Error Responses

- 400: Invalid signature or payload
- 500: Internal server error

## Payment Methods

### Xendit Payment Methods

#### Bank Transfer

- `BCA` - Bank Central Asia
- `BRI` - Bank Rakyat Indonesia
- `BNI` - Bank Negara Indonesia
- `MANDIRI` - Bank Mandiri
- `PERMATA` - Permata Bank
- `CIMB` - CIMB Niaga
- `DANAMON` - Bank Danamon Indonesia
- `BSI` - Bank Syariah Indonesia

#### E-Wallet

- `OVO` - OVO
- `DANA` - DANA
- `LINKAJA` - LinkAja
- `SHOPEEPAY` - ShopeePay
- `GRABPAY` - GrabPay
- `PAYMAYA` - PayMaya

#### Card

- `CARD` - Credit/Debit card

#### QR

- `QRIS` - QRIS Standard QR Code

### Midtrans Payment Methods

#### Bank Transfer

Use `midtransPaymentMethod: "bank_transfer"` with:

- `midtransBankCode: "bca"` - Bank Central Asia
- `midtransBankCode: "bni"` - Bank Negara Indonesia
- `midtransBankCode: "bri"` - Bank Rakyat Indonesia
- `midtransBankCode: "mandiri"` - Bank Mandiri
- `midtransBankCode: "permata"` - Permata Bank
- `midtransBankCode: "cimb"` - CIMB Niaga
- `midtransBankCode: "danamon"` - Bank Danamon
- `midtransBankCode: "bsi"` - Bank Syariah Indonesia

#### E-Wallet

- `gopay` - GoPay
- `shopeepay` - ShopeePay
- `qris` - QRIS
- `dana` - DANA

#### Card

- `credit_card` - Credit/Debit card

#### OTC (Over The Counter)

- `indomaret` - Indomaret
- `alfamart` - Alfamart

#### Cardless Credit

- `akulaku` - Akulaku
- `kredivo` - Kredivo

## Webhooks

When payment status changes, PGLink sends a webhook to your application's configured webhook URL.

### Webhook Payload

| Field              | Type         | Description                                                  |
| ------------------ | ------------ | ------------------------------------------------------------ |
| paymentId          | string       | PGLink payment UUID                                          |
| applicationOrderId | string       | Your internal order ID                                       |
| externalId         | string       | Payment provider's transaction ID                            |
| amount             | number       | Payment amount in smallest currency unit                     |
| currency           | string       | Currency code (IDR)                                          |
| status             | string       | Payment status (`PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`) |
| provider           | string       | Payment provider (`XENDIT` or `MIDTRANS`)                    |
| paymentMethod      | string       | Payment method used                                          |
| customerEmail      | string       | Customer email (if provided)                                 |
| description        | string       | Payment description                                          |
| metadata           | object       | Additional data (empty object if none)                       |
| processedAt        | string (ISO) | Timestamp when payment was processed                         |

### Webhook Headers

| Header       | Description                |
| ------------ | -------------------------- |
| X-API-Key    | Your application's API key |
| X-Payment-Id | PGLink payment UUID        |

### Handling Webhooks

Your webhook endpoint should:

1. **Verify Authentication**

   ```javascript
   // Pseudocode
   if (request.headers['x-api-key'] !== YOUR_API_KEY) {
     return 401; // Unauthorized
   }
   ```

2. **Process the Event**
   - Update your order status based on `status` field
   - Record payment details for reconciliation
   - Trigger any post-payment workflows (shipping, email notifications, etc.)

3. **Respond Appropriately**

   ```javascript
   // Return 200 OK to acknowledge receipt
   return { message: 'Webhook received' }; // HTTP 200
   ```

4. **Implement Idempotency**
   - Store received `paymentId` values
   - Ignore webhooks with previously processed payment IDs
   - Prevents duplicate processing if webhook is resent

### Webhook Retry Logic

PGLink implements retry logic for failed webhook deliveries:

- Maximum 3 attempts
- Exponential backoff (1s, 2s, 4s)
- Considered failed after all attempts exhausted
- Failed webhooks can be manually retried via admin interface

## Error Responses

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes

| Code                        | Description                       |
| --------------------------- | --------------------------------- |
| VALIDATION_ERROR            | Invalid request data              |
| AUTHENTICATION_FAILED       | Missing or invalid credentials    |
| APPLICATION_NOT_FOUND       | Application not found for API key |
| PAYMENT_PROVIDER_ERROR      | Error from payment provider       |
| WEBHOOK_VERIFICATION_FAILED | Invalid webhook signature/token   |
| RATE_LIMIT_EXCEEDED         | Too many requests                 |
| INTERNAL_SERVER_ERROR       | Unexpected server error           |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- Applications API: 100 requests per hour per JWT token
- Payments API: 1000 requests per hour per API key
- Webhook endpoints: No rate limiting (called by trusted providers)

When rate limited, you'll receive a 429 status code with:

```json
{
  "status": "error",
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Versioning

The API follows semantic versioning:

- Current version: v1 (implicitly in all endpoints)
- Breaking changes will increment the major version
- Minor versions add backward-compatible features
- Patch versions fix bugs without changing the API

## Getting Help

If you encounter issues with the API:

1. Check the error response for details
2. Verify your authentication credentials
3. Ensure your request body matches the expected schema
4. Consult the [FAQ](./faq.md)
5. Open an issue in the repository with:
   - Request details (endpoint, method, headers, body)
   - Response details (status code, body)
   - Timestamp of the request
   - Steps to reproduce the issue
