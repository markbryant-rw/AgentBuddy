# API Rate Limiting & Request Validation Implementation

## Overview

This document describes the rate limiting and request validation system implemented for all API endpoints to prevent abuse and ensure data integrity.

## Components

### 1. Database Layer

**Migration:** `supabase/migrations/20251126_add_generic_rate_limiting.sql`

Creates:
- `api_rate_limits` table - Tracks rate limit counters per user/IP and action
- `suspicious_activity_log` table - Logs rate limit violations and suspicious behavior
- `check_rate_limit()` function - Generic rate limit checker
- `log_suspicious_activity()` function - Logs suspicious activities
- `cleanup_old_rate_limits()` function - Maintenance function

### 2. Shared Utilities

**Rate Limiting:** `supabase/functions/_shared/rateLimit.ts`
- `checkRateLimit()` - Check if action is within rate limits
- `createRateLimitResponse()` - Create standardized 429 response
- `getIpAddress()` - Extract client IP from request
- `logSuspiciousActivity()` - Log suspicious activities
- Predefined rate limits for all endpoint types

**Validation:** `supabase/functions/_shared/validation.ts`
- `validateRequest()` - Validate and sanitize request data
- `parseAndValidateJSON()` - Parse and validate JSON bodies
- `detectMaliciousInput()` - Detect SQL injection and XSS attempts
- `sanitizeObject()` - Sanitize complex objects
- Common validation schemas

## Rate Limits by Endpoint Type

| Endpoint Type | Hourly Limit | Daily Limit | Reason |
|---------------|--------------|-------------|---------|
| **Critical Operations** | | | |
| delete-user | 2 | 10 | Account deletion |
| change-user-role | 5 | 20 | Privilege escalation |
| suspend-user | 5 | 20 | Account management |
| **AI Operations** | | | |
| coaches-corner-chat | 30 | 100 | API costs |
| notes-ai | 30 | 100 | API costs |
| generate-listing-description | 20 | 100 | API costs |
| **Notifications** | | | |
| send-notification | 50 | 200 | Spam prevention |
| send-announcement | 10 | 30 | Spam prevention |
| **Data Operations** | | | |
| geocode-* | 100 | 500 | Third-party API quota |
| get-weather | 100 | 500 | Third-party API quota |

See `_shared/rateLimit.ts` for complete list.

## Implementation Guide

### Step 1: Import Utilities

```typescript
import { checkRateLimit, createRateLimitResponse, getIpAddress, logSuspiciousActivity } from '../_shared/rateLimit.ts';
import { validateRequest, createValidationErrorResponse, parseAndValidateJSON } from '../_shared/validation.ts';
```

### Step 2: Add Rate Limiting (After Authentication)

```typescript
// After authenticating the user
const ipAddress = getIpAddress(req);
const rateLimitResult = await checkRateLimit(
  supabase,
  user.id,
  ipAddress,
  'your-function-name' // Must match key in RATE_LIMITS
);

if (!rateLimitResult.allowed) {
  await logSuspiciousActivity(supabase, {
    userId: user.id,
    ipAddress: ipAddress || undefined,
    actionType: 'your-function-name',
    reason: 'rate_limit_exceeded',
    severity: 'medium', // low, medium, high, critical
    requestDetails: { limit_type: rateLimitResult.limitType }
  });
  return createRateLimitResponse(rateLimitResult, corsHeaders);
}
```

### Step 3: Add Request Validation

```typescript
// Parse request body
const { data: bodyData, error: parseError } = await parseAndValidateJSON(req);
if (parseError || !bodyData) {
  return new Response(
    JSON.stringify({ error: parseError || 'Invalid request body' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Define validation schema
const validation = validateRequest(bodyData, {
  fieldName: {
    required: true,
    type: 'string', // string, number, boolean, email, uuid, url, date, array, object
    minLength: 1,
    maxLength: 100,
    enum: ['option1', 'option2'], // optional
    pattern: /^[a-zA-Z]+$/, // optional regex
  },
  optionalField: {
    required: false,
    type: 'number',
    min: 0,
    max: 100,
  }
});

if (!validation.valid) {
  await logSuspiciousActivity(supabase, {
    userId: user.id,
    ipAddress: ipAddress || undefined,
    actionType: 'your-function-name',
    reason: 'invalid_input',
    severity: 'medium',
    requestDetails: { errors: validation.errors }
  });
  return createValidationErrorResponse(validation.errors!, corsHeaders);
}

// Use sanitized data
const { fieldName, optionalField } = validation.sanitizedData!;
```

### Step 4: Add Malicious Input Detection (For Critical Operations)

```typescript
import { detectMaliciousInput } from '../_shared/validation.ts';

const maliciousCheck = detectMaliciousInput(userInput);
if (maliciousCheck.isMalicious) {
  await logSuspiciousActivity(supabase, {
    userId: user.id,
    ipAddress: ipAddress || undefined,
    actionType: 'your-function-name',
    reason: maliciousCheck.reason!,
    severity: 'critical',
    requestDetails: { input: userInput }
  });
  return new Response(
    JSON.stringify({ error: 'Invalid input detected' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Complete Example

See the following files for complete implementations:
- `supabase/functions/delete-user/index.ts` - Critical operation
- `supabase/functions/change-user-role/index.ts` - Role management
- `supabase/functions/send-notification/index.ts` - Notification sending

## Custom Rate Limits

To use custom rate limits not in the predefined list:

```typescript
const rateLimitResult = await checkRateLimit(
  supabase,
  user.id,
  ipAddress,
  'custom-action',
  { hourlyLimit: 10, dailyLimit: 50 } // Custom limits
);
```

## Monitoring Suspicious Activity

Query the `suspicious_activity_log` table to monitor:
- Rate limit violations
- Invalid input attempts
- Malicious input detection
- Authorization failures

```sql
-- Recent suspicious activity
SELECT * FROM suspicious_activity_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- High severity events
SELECT * FROM suspicious_activity_log
WHERE severity IN ('high', 'critical')
ORDER BY created_at DESC
LIMIT 100;

-- Rate limit violations by user
SELECT user_id, COUNT(*) as violation_count
FROM suspicious_activity_log
WHERE reason = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY violation_count DESC;
```

## Maintenance

Run the cleanup function periodically (e.g., daily cron job):

```sql
-- Cleanup old rate limit records (> 7 days)
SELECT cleanup_old_rate_limits();
```

## Security Best Practices

1. **Always validate user input** before processing
2. **Use sanitized data** from validation results, not raw input
3. **Log suspicious activity** for monitoring and alerting
4. **Set appropriate severity levels** based on the risk
5. **Review rate limits periodically** and adjust based on usage patterns
6. **Monitor the suspicious_activity_log** for attack patterns

## Endpoints Requiring Rate Limiting

The following 45 endpoints still need rate limiting implemented:

### High Priority (Critical Operations)
- [ ] suspend-user
- [ ] reactivate-user
- [ ] repair-user
- [ ] assign-role-to-user
- [ ] merge-duplicate-users

### Medium Priority (AI & Expensive Operations)
- [ ] coaches-corner-chat
- [ ] notes-ai
- [ ] generate-listing-description
- [ ] analyze-bug-report
- [ ] analyze-feature-request
- [ ] ai-task-suggestions
- [ ] generate-vendor-report
- [ ] generate-daily-quote
- [ ] generate-metric-info
- [ ] generate-team-meeting

### Medium Priority (Notifications)
- [ ] notify-bug-status-change
- [ ] notify-team-transaction
- [ ] send-announcement

### Lower Priority (Data Operations)
- [ ] geocode-listing
- [ ] geocode-transaction
- [ ] geocode-past-sale
- [ ] extract-website-logo
- [ ] get-weather
- [ ] giphy-search
- [ ] get-board-data

### Invitation & User Management
- [ ] resend-invitation
- [ ] accept-invitation
- [ ] get-invitation-details
- [ ] request-bug-satisfaction

## Testing

To test rate limiting:

1. Make rapid requests to a protected endpoint
2. Verify you receive a 429 response after exceeding limits
3. Check the `Retry-After` header for cooldown time
4. Verify suspicious activity is logged in `suspicious_activity_log`

Example test with curl:
```bash
# Make 3 requests (limit is 2/hour for delete-user)
for i in {1..3}; do
  curl -X POST https://your-project.supabase.co/functions/v1/delete-user \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"targetUserId": "uuid-here"}'
  echo "\n---"
done
```

The third request should return:
```json
{
  "error": "Rate limit exceeded. Maximum 2 requests per hour allowed for this action.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3456,
  "limit_type": "hourly",
  "current_count": 2,
  "limit": 2
}
```
