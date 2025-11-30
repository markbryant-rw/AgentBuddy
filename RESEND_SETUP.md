# Resend Email Setup Guide

## Why emails aren't being delivered

Your invitation emails are currently using Resend's test domain `onboarding@resend.dev`, which has strict limitations:
- **Limited delivery**: Only works for verified email addresses
- **Low reputation**: May be blocked by spam filters
- **Not production-ready**: Meant for testing only

## How to fix email delivery

### Step 1: Sign up for Resend
1. Go to [resend.com](https://resend.com)
2. Create a free account (100 emails/day free)

### Step 2: Verify your domain
1. Go to [Domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain (e.g., `raywhite.com`)
4. Add the DNS records to your domain provider:
   - **SPF**: `v=spf1 include:_spf.resend.com ~all`
   - **DKIM**: Copy the provided DKIM record
   - **DMARC**: Optional but recommended

⏱️ **Wait 10-15 minutes** for DNS propagation

### Step 3: Get your API Key
1. Go to [API Keys](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Give it a name (e.g., "AgentBuddy Production")
4. Copy the key (starts with `re_...`)

### Step 4: Configure in Lovable
1. Open your Lovable project
2. Go to **Cloud → Secrets**
3. Update `RESEND_API_KEY` with your new key
4. Add a new secret:
   - Name: `RESEND_FROM_EMAIL`
   - Value: `noreply@yourdomain.com` (use your verified domain)

### Step 5: Test it!
1. Try inviting a new user
2. Check your Resend dashboard for delivery status
3. Check spam folder if not received

## Troubleshooting

### Emails still not arriving?

**Check Resend Logs:**
1. Go to [Resend Dashboard](https://resend.com/emails)
2. Look for your sent emails
3. Check the status (Delivered, Bounced, etc.)

**Common Issues:**
- ❌ **DNS not propagated**: Wait 15-30 minutes after adding records
- ❌ **Wrong from address**: Must use your verified domain
- ❌ **Recipient email invalid**: Check email format
- ❌ **Spam filters**: Ask recipients to check spam folder

**Verify DNS records:**
```bash
# Check SPF
dig TXT yourdomain.com | grep spf

# Check DKIM
dig TXT resend._domainkey.yourdomain.com
```

## Free Tier Limits
- **100 emails/day** for free
- Upgrade to paid plan for more volume
- See [pricing](https://resend.com/pricing)

## Support
- [Resend Documentation](https://resend.com/docs)
- [Resend Discord](https://resend.com/discord)
