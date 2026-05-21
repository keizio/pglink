# Payment Providers

This document provides detailed information about the payment provider integrations in PGLink Payment Aggregator, including Xendit and Midtrans.

## Overview

PGLink Payment Aggregator integrates with multiple payment providers through a unified interface. This abstraction allows applications to switch between providers or use multiple providers simultaneously without changing their integration code.

## Provider Abstraction Layer

All payment providers implement the `PaymentProvider` interface located in `src/modules/payments/providers/payment-provider.interface.ts`:

```typescript
interface PaymentProvider {
  createPayment(paymentDto: PaymentDto): Promise<PaymentResponse>;
  verifyWebhook(request: Request): Promise<boolean>;
  handleWebhook(payload: any): Promise<WebhookResult>;
  refundPayment(refundDto: RefundDto): Promise<RefundResponse>;
  cancelPayment(cancelDto: CancelDto): Promise<CancelResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>;
  // Subscription methods
  createSubscription(
    subscriptionDto: SubscriptionDto,
  ): Promise<SubscriptionResponse>;
  cancelSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionCancelResponse>;
}
```

This design ensures:

- Consistent API across different providers
- Easy addition of new providers
- Isolation of provider-specific complexities
- Simplified testing and maintenance

## Xendit Integration

### Provider Location

`src/modules/payments/providers/xendit.provider.ts`

### Configuration Requirements

To use Xendit, you need to configure these environment variables:

```env
XENDIT_API_KEY=your_xendit_api_key_here
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token_here
```

You can obtain these from your [Xendit Dashboard](https://dashboard.xendit.co/).

### Supported Payment Methods

Xendit supports a wide range of payment methods popular in Indonesia:

#### Bank Transfer (Virtual Account)

- **BCA** - Bank Central Asia
- **BRI** - Bank Rakyat Indonesia
- **BNI** - Bank Negara Indonesia
- **MANDIRI** - Bank Mandiri
- **PERMATA** - Permata Bank
- **CIMB** - CIMB Niaga
- **DANAMON** - Bank Danamon Indonesia
- **BSI** - Bank Syariah Indonesia

#### E-Wallet

- **OVO** - Indonesia's leading e-wallet
- **DANA** - Popular e-wallet with wide merchant acceptance
- **LINKAJA** - Government-backed e-wallet
- **SHOPEEPAY** - Shopee's e-wallet
- **GRABPAY** - Grab's e-wallet
- **PAYMAYA** - Philippine-based e-wallet (also accepted in Indonesia)

#### Card Payments

- **CARD** - Supports Visa, Mastercard, JCB, and other major cards

#### QR Payments

- **QRIS** - Standard Indonesian QR Code format supported by multiple e-wallets and banks

### Features

#### 1. Virtual Account Bank Transfers

- Generate unique virtual account numbers for each transaction
- Automatic payment matching
- Support for multiple banks
- Typically settles within 1-2 business days

#### 2. E-Wallet Payments

- Instant payment confirmation
- Support for major Indonesian e-wallets
- Seamless user experience within e-wallet apps

#### 3. Card Payments

- Secure card tokenization
- 3D Secure 2.0 support
- Installment options (where available)
- Fraud detection tools

#### 4. QRIS Payments

- Single QR code works with multiple e-wallets and banking apps
- Standardized across Indonesian payment ecosystem
- Growing adoption among merchants

#### 5. Recurring Payments (Subscriptions)

- Automatic recurring billing
- Flexible scheduling (daily, weekly, monthly, yearly)
- Easy cancellation and modification
- Failed payment retry logic

### Implementation Details

#### Payment Request Format

When creating a payment with Xendit provider:

```typescript
{
  amount: 50000, // in rupiah
  provider: 'XENDIT',
  applicationOrderId: 'ORDER-12345',
  xenditPaymentMethod: 'BCA', // or any other supported method
  customerEmail: 'customer@example.com',
  description: 'Payment description'
}
```

#### Webhook Verification

Xendit webhooks are verified using the `x-callback-token` header:

1. Extract token from request header
2. Compare with `XENDIT_WEBHOOK_TOKEN` environment variable
3. If match, process webhook; otherwise reject

#### Webhook Payload Structure

Xendit sends various webhook types. PGLink primarily handles:

- `payment` events for payment status changes
- `refund` events for refund status changes
- `subscription` events for subscription-related updates

### Error Handling

Xendit-specific errors are mapped to standardized error responses:

- Authentication errors → 401 Unauthorized
- Validation errors → 400 Bad Request
- Insufficient funds → 402 Payment Required
- Bank/eci downtime → 503 Service Unavailable
- Other errors → 500 Internal Server Error (with details in response)

### Testing

Xendit provides test credentials for sandbox testing:

- Use special API keys for test mode
- Test payments use simulated bank accounts
- No actual money movement occurs
- Webhooks can be simulated via dashboard or API

## Midtrans Integration

### Provider Location

`src/modules/payments/providers/midtrans.provider.ts`

### Configuration Requirements

To use Midtrans, you need to configure these environment variables:

```env
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
```

You can obtain these from your [Midtrans Merchant Portal](https://merchant.midtrans.com/).

### Supported Payment Methods

Midtrans offers comprehensive payment options for the Indonesian market:

#### Bank Transfer

- **Bank Transfer** with specific bank codes:
  - `bca` - Bank Central Asia
  - `bni` - Bank Negara Indonesia
  - `bri` - Bank Rakyat Indonesia
  - `mandiri` - Bank Mandiri
  - `permata` - Permata Bank
  - `cimb` - CIMB Niaga
  - `danamon` - Bank Danamon
  - `bsi` - Bank Syariah Indonesia

#### E-Wallet

- **gopay** - Gojek's e-wallet with massive user base
- **shopeepay** - Shopee's e-wallet
- **qris** - QRIS Standard QR Code
- **dana** - DANA e-wallet

#### Card Payments

- **credit_card** - Supports Visa, Mastercard, JCB, Amex

#### OTC (Over The Counter)

- **indomaret** - Indonesia's largest convenience store chain
- **alfamart** - Another major convenience store chain

#### Cardless Credit

- **akulaku** - Buy now, pay later service
- **kredivo** - Another popular BNPL service

### Features

#### 1. Bank Transfers

- Virtual account numbers for each transaction
- Real-time payment notifications
- Support for 8+ major Indonesian banks
- Typically settles within 1 business day

#### 2. E-Wallet Payments

- GoPay: Integrated with Gojek ecosystem
- ShopeePay: Tied to Shopee marketplace
- DANA: Widely accepted e-wallet
- QRIS: Works with any QRIS-compatible app

#### 3. Card Payments

- Local and international card support
- Installment options (3, 6, 12 months)
- One-click tokenization for returning customers
- 3D Secure 2.0 authentication
- Fraud detection scoring system

#### 4. OTC Payments

- Payment via Indomaret or Alfamart stores
- Customers receive a payment code
- Payment confirmation typically within 1 hour of store payment
- No bank account needed for customers

#### 5. Cardless Credit

- Akulaku: Popular BNPL service
- Kredivo: Another trusted BNPL provider
- Instant credit approval for eligible customers
- Flexible payment terms

#### 6. Snap Integration

- Midtrans Snap provides a seamless payment UI
- Handles all payment methods in one interface
- Mobile-optimized experience
- Reduces PCI DSS compliance scope

### Implementation Details

#### Payment Request Format

When creating a payment with Midtrans provider:

```typescript
{
  amount: 50000, // in rupiah
  provider: 'MIDTRANS',
  applicationOrderId: 'ORDER-12345',
  midtransPaymentMethod: 'bank_transfer', // or other method
  midtransBankCode: 'bca', // required for bank_transfer
  customerEmail: 'customer@example.com',
  description: 'Payment description'
}
```

For e-wallet payments:

```typescript
{
  amount: 75000,
  provider: 'MIDTRANS',
  applicationOrderId: 'ORDER-12346',
  midtransPaymentMethod: 'gopay',
  customerEmail: 'customer@example.com',
  description: 'Payment for food order'
}
```

#### Webhook Verification

Midtrans webhooks are verified using SHA256 signature:

1. Construct signature string: `order_id + status_code + gross_amount + server_key`
2. Calculate SHA256 hash of this string
3. Compare with signature provided in webhook payload
4. If match, process webhook; otherwise reject

#### Webhook Payload Structure

Midtrans sends webhooks in `application/json` format with:

- `transaction_status`: payment status
- `fraud_status`: fraud detection result
- `payment_type`: payment method used
- `gross_amount`: transaction amount
- `order_id`: your application order ID
- `transaction_id`: Midtrans transaction ID
- `signature_key`: SHA256 hash for verification
- Additional fields depending on payment type

### Error Handling

Midtrans-specific errors are mapped to standardized error responses:

- Authentication errors → 401 Unauthorized
- Validation errors → 400 Bad Request
- Expired transactions → 410 Gone
- Pending asynchronous payments → 202 Accepted
- Other errors → 500 Internal Server Error (with details)

### Testing

Midtrans provides sandbox environment for testing:

- Use sandbox server keys
- Test payments with special test card numbers
- Simulate various payment outcomes
- Test webhooks via dashboard simulation tools

## Provider Comparison

| Feature                   | Xendit                         | Midtrans                              |
| ------------------------- | ------------------------------ | ------------------------------------- |
| **Primary Strength**      | Bank transfers, QRIS           | E-wallets, card payments, OTC         |
| **Ease of Integration**   | Simple API, good documentation | Comprehensive SDK, Snap UI            |
| **Bank Transfer Support** | Excellent (8+ banks)           | Excellent (8+ banks)                  |
| **E-Wallet Support**      | Good (OVO, DANA, etc.)         | Excellent (GoPay, ShopeePay, etc.)    |
| **Card Payment Support**  | Basic                          | Advanced (installments, tokenization) |
| **OTC Support**           | Limited                        | Excellent (Indomaret, Alfamart)       |
| **QRIS Support**          | Native                         | Native                                |
| **Subscription Support**  | Full-featured                  | Full-featured                         |
| **Refund Processing**     | Automated                      | Automated                             |
| **Settlement Time**       | 1-2 business days              | 1 business day (varies by method)     |
| **Fee Structure**         | Competitive, volume-based      | Competitive, volume-based             |
| **Dashboard**             | Clean, functional              | Feature-rich, analytics-heavy         |
| **Best For**              | Bank transfer-heavy businesses | Diverse payment method needs          |

## Choosing a Provider

### Choose Xendit When:

- Your customers prefer bank transfers
- You need strong QRIS support
- You want simpler integration
- Your primary market is Indonesia
- You need reliable virtual account services

### Choose Midtrans When:

- You want to offer GoPay (very popular)
- You need OTC payment options (Indomaret/Alfamart)
- You want advanced card features (installments, tokenization)
- You prefer a complete payment UI solution (Snap)
- You need extensive fraud detection tools

### Using Both Providers

PGLink allows you to:

1. Register applications with preferred providers
2. Switch providers per transaction
3. Offer multiple payment options to customers
4. Implement provider fallback logic
5. Route specific payment methods to optimal providers

## Implementation Notes

### Currency Handling

Both providers expect amounts in the smallest currency unit:

- For IDR (Indonesian Rupiah): Use integer values (e.g., 50000 = Rp 500.00)
- No decimal points or currency symbols in API requests
- Both providers primarily support IDR, though Xendit supports other currencies

### Idempotency

Both providers support idempotency keys:

- PGLink generates idempotency keys based on `applicationOrderId`
- Prevents duplicate payments if request is resent
- Important for unreliable network connections

### Refunds

Both providers support full and partial refunds:

- Refunds processed to original payment method
- Typically take 1-7 business days depending on method
- Some methods (like OTC) may have restrictions

### Subscription Management

Both providers support recurring payments:

- Flexible billing intervals
- Automatic retry for failed payments
- Easy cancellation and modification
- Webhook notifications for subscription events

### Security Features

Both providers offer:

- PCI DSS compliance (when using their hosted fields/Snap)
- Tokenization for card data
- Fraud detection tools
- Secure webhook verification
- Regular security audits

## Troubleshooting

### Common Xendit Issues

1. **Invalid API Key**: Double-check your XENDIT_API_KEY
2. **Webhook Verification Failed**: Ensure XENDIT_WEBHOOK_TOKEN matches exactly
3. **Bank Not Supported**: Verify the bank code is correct and active
4. **Insufficient Funds**: Customer account lacks sufficient balance
5. **Expired Virtual Account**: VA expired before customer paid

### Common Midtrans Issues

1. **Invalid Signature**: Check your MIDTRANS_SERVER_KEY is correct
2. **Payment Method Not Activated**: Ensure payment method is enabled in dashboard
3. **Transaction Not Found**: Order ID may be duplicate or incorrect
4. **Pending Asynchronous**: Some payment methods require customer action
5. **Expired Token**: Customer took too long to complete payment

### Debugging Tips

1. Check provider dashboards for transaction status
2. Verify webhook logs in your application
3. Use provider sandbox environments for testing
4. Enable debug logging in development mode
5. Contact provider support with transaction IDs for investigation

## Future Enhancements

### Planned Provider Features

1. **Additional Providers**: Integration with other payment gateways (Doku, LinkAja, etc.)
2. **Smart Routing**: Automatic provider selection based on cost, success rate, or user preference
3. **Unified Reporting**: Consolidated transaction reports across providers
4. **Advanced Fraud Tools**: Machine learning-based fraud detection
5. **Settlement Optimization**: Faster settlement options
6. **International Expansion**: Support for cross-border payments and multiple currencies

### Provider-Specific Roadmap

- **Xendit**: Enhanced BI tools, improved settlement timing, expanded international capabilities
- **Midtrans**: Expanded BNPL options, improved international payment acceptance, enhanced analytics

## Resources

### Xendit Resources

- [Xendit Documentation](https://xendit.dev/en/reference)
- [Xendit Dashboard](https://dashboard.xendit.co/)
- [Xendit Sandbox Credentials](https://xendit.dev/en/credential.html)
- [Xendit API Reference](https://xendit.dev/en/reference)
- [Xendit Webhook Guide](https://xendit.dev/en/webhook)

### Midtrans Resources

- [Midtrans Documentation](https://docs.midtrans.com/)
- [Midtrans Merchant Portal](https://merchant.midtrans.com/)
- [Midtrans Snap Documentation](https://docs.midtrans.com/en/snap-sdk/getting-started)
- [Midtrans API Reference](https://docs.midtrans.com/en/core-api/overview)
- [Midtrans Webhook Verification](https://docs.midtrans.com/en/core-api/notification#verification-notification-html)

### PGLink Resources

- [Source Code](https://github.com/your-org/pglink)
- [API Reference](./api-reference.md)
- [Architecture Overview](./architecture.md)
- [Getting Started Guide](./getting-started.md)
