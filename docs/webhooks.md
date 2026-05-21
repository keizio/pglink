#### 4. Webhook Processing Failures

**Symptoms**: Webhooks are delivered but not processed correctly in your application
**Possible Causes**:

- Errors in your webhook processing code
- Missing required fields in webhook payload
- Database connection issues in your application
- Exception thrown during processing that isn't caught

**Solutions**:

- Check your application logs for processing errors
- Add more detailed logging to your webhook handler
- Validate webhook payload structure before processing
- Implement proper error handling and retry mechanisms
- Test with sample webhook payloads

#### 5. Security Verification Failures

**Symptoms**: PGLink rejects webhooks from payment providers
**Possible Causes**:

- Incorrect webhook token/signature configuration
- Server key changed in provider dashboard
- Clock skew causing timestamp issues
- Network intermediaries modifying request headers/body

**Solutions**:

- Verify your environment variables match provider dashboard
- Regenerate webhook tokens/keys if suspected compromised
- Ensure server time is synchronized (use NTP)
- Check for proxies, load balancers, or middleware that might alter requests
- Contact provider support with webhook IDs for investigation

## Testing Webhooks

### Local Testing Tools

You can test webhook handling locally using:

#### Using curl

```bash
# Test Xendit webhook simulation
curl -X POST http://localhost:3000/payments/xendit-callback \
  -H "x-callback-token: your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "vg_abcdef123456",
    "status": "SETTLED",
    "external_id": "ORDER-12345",
    "amount": 50000,
    "currency": "IDR",
    "payment_method": "BANK_TRANSFER"
  }'

# Test Midtrans webhook simulation
curl -X POST http://localhost:3000/payments/midtrans-callback \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "midtrans_abcdef123456",
    "order_id": "ORDER-12345",
    "gross_amount": "50000.00",
    "payment_type": "bank_transfer",
    "transaction_time": "2026-03-05 10:30:00",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "signature_key": "expected_signature_here",
    "status_code": "200",
    "bank": "bca"
  }'
```

#### Using Ngrok for Local Development

1. Install ngrok: `brew install ngrok` (macOS) or download from ngrok.com
2. Start your local server: `pnpm run start:dev`
3. Create tunnel: `ngrok http 3000`
4. Use the ngrok URL as your webhook URL in application registration
5. Provider webhooks will be forwarded to your local environment

### Test Webhook Scenarios

Test these scenarios to ensure robust webhook handling:

1. **Successful Payment Webhook**
   - Status: SUCCESS
   - Verify order marked as paid
   - Verify inventory adjusted (if applicable)
   - Verify customer notification sent

2. **Failed Payment Webhook**
   - Status: FAILED
   - Verify order marked as payment_failed
   - Verify customer notified of failure
   - Verify retry options provided

3. **Pending Payment Webhook**
   - Status: PENDING
   - Verify order shows as awaiting payment
   - Verify no inventory adjustment yet
   - Verify timeout logic initiated (if applicable)

4. **Duplicate Webhook Delivery**
   - Send same webhook twice with same paymentId
   - Verify processed only once
   - Verify no double-charging or double-fulfillment

5. **Malformed Webhook Payload**
   - Missing required fields
   - Invalid data types
   - Extra unexpected fields
   - Verify appropriate error handling

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Webhook Delivery Success Rate**: Percentage of webhooks successfully delivered to your endpoint
2. **Webhook Processing Latency**: Time from webhook receipt to processing completion
3. **Webhook Error Rate**: Percentage of webhooks that result in errors in your application
4. **Duplicate Webhook Rate**: Percentage of webhooks that are duplicates
5. **Webhook Volume**: Number of webhooks received per time period

### Recommended Alerts

1. **Delivery Failure Rate > 5%**: Alert if more than 5% of webhooks fail to deliver
2. **Processing Error Rate > 2%**: Alert if more than 2% of webhooks result in processing errors
3. **Latency > 5 Seconds**: Alert if average processing latency exceeds 5 seconds
4. **No Webhooks for 1 Hour**: Alert if you normally receive webhooks but none in the last hour
5. **Sudden Volume Spike**: Alert if webhook volume increases significantly above baseline

### Logging Best Practices

1. **Incoming Webhooks**: Log receipt of webhook (without sensitive data)
2. **Verification Results**: Log success/failure of security verification
3. **Processing Start/End**: Log when webhook processing begins and ends
4. **Errors**: Log full stack traces for any processing errors
5. **Outgoing Actions**: Log any actions taken as a result of webhook (email sent, inventory updated, etc.)

### Log Sample Structure

```json
{
  "timestamp": "2026-03-05T12:00:00.000Z",
  "event": "webhook_received",
  "paymentId": "uuid",
  "provider": "XENDIT",
  "status": "SUCCESS",
  "ipAddress": "123.45.67.89",
  "userAgent": "PGLink-Payment-Aggregator/1.0"
}
```

## Compliance and Data Handling

### Data Minimization

PGLink only sends necessary data in webhooks:

- No full card numbers
- No sensitive authentication details
- Only transactional status and identifiers

### Data Retention

- Webhook payloads are not stored by PGLink after delivery
- Your application is responsible for storing any needed webhook data
- Consider your own data retention policies for webhook logs

### Privacy Considerations

- Customer email is included if provided in original payment request
- Consider hashing or pseudonymizing email if storing webhook logs
- Ensure compliance with applicable data protection regulations (GDPR, CCPA, etc.)
- Provide privacy notice to customers about payment processing and webhooks

## Frequently Asked Webhook Questions

### Q: Can I use the same webhook URL for multiple applications?

A: Yes, you can use the same webhook URL for multiple applications. PGLink includes the `X-API-Key` header so you can distinguish between applications. You'll need to look up the API key in your database to determine which application the webhook belongs to.

### Q: What happens if my webhook endpoint is down?

A: PGLink will retry webhook delivery up to 3 times with exponential backoff. If all attempts fail, the webhook is marked as failed and can be retried manually via the admin interface. No payment data is lost.

### Q: How do I know which payment method was used in a webhook?

A: The `paymentMethod` field in the webhook payload specifies the exact payment method used (e.g., "BCA", "GOPAY", "CREDIT_CARD").

### Q: Can I customize the webhook payload format?

A: Not currently. PGLink uses a standardized webhook format to ensure consistency. If you need different fields, you can derive them from the standard fields or store additional data in your application at payment creation time.

### Q: How secure are webhooks compared to API polling?

A: Webhooks are generally more secure and efficient than polling because:

- They eliminate the need to store API keys on your server for outbound requests
- They reduce unnecessary requests (only sent when status changes)
- They provide real-time updates
- They include verification mechanisms (tokens/signatures)
- However, they require you to maintain a publicly accessible endpoint

### Q: What should I do if I suspect a webhook spoofing attack?

A:

1. Immediately verify your webhook security credentials haven't been compromised
2. Check logs for suspicious patterns (same IP sending many invalid webhooks)
3. Consider temporarily requiring additional verification (like checking order ID against your database)
4. Contact PGLink team if you believe there's an issue in the verification logic
5. Implement additional application-specific validation if needed

## Advanced Topics

### Webhook Signature Customization

While PGLink uses standard verification methods, you can add additional application-level verification:

1. **HMAC Verification**: Add your own HMAC signature to webhook payloads
2. **JWT Signing**: Sign webhooks with a JWT using your application's secret
3. **Custom Headers**: Add application-specific headers for verification

### Webhook Transformation Services

For complex applications, consider using a webhook transformation service:

1. Receive webhook from PGLink
2. Validate and enrich with additional data
3. Transform to multiple formats for different systems
4. Forward to multiple endpoints (microservices, analytics, etc.)
5. Handle retry logic and dead letter queues

### Event-Driven Architecture

For high-scale applications:

1. Use webhooks to publish events to a message queue (Apache Kafka, RabbitMQ)
2. Have multiple consumers process different aspects (inventory, analytics, notifications)
3. Implement event sourcing for audit trails
4. Use CQRS to separate read and write models

### Webhook Versioning

As your application evolves:

1. Include version information in your webhook endpoint URL (`/v1/webhook/payment`)
2. Maintain backward compatibility for a period
3. Provide migration guides for webhook format changes
4. Consider content negotiation via Accept headers for different formats

## Conclusion

Webhooks are a critical component of the PGLink Payment Aggregator, enabling real-time payment status notifications to your application. By following the security best practices, implementing proper idempotency, and monitoring webhook delivery, you can build a reliable payment integration that handles the asynchronous nature of payment processing effectively.

Remember to:

1. Always verify the `X-API-Key` header on incoming webhooks
2. Implement idempotency to handle duplicate deliveries
3. Respond with HTTP 200 OK to acknowledge webhook receipt
4. Monitor webhook delivery and processing metrics
5. Test thoroughly with both success and failure scenarios
6. Keep your webhook endpoint secure and performant

For additional help, refer to:

- [API Reference](./api-reference.md)
- [Payment Providers Documentation](./payment-providers.md)
- [Getting Started Guide](./getting-started.md)
- [Architecture Overview](./architecture.md)
