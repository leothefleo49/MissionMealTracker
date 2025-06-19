# Quick Gmail Setup Guide

## Step 1: Get Gmail App Password

1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google":
   - Turn on "2-Step Verification" (if not already on)
   - Wait 5 minutes after enabling 2FA
   - Click "App passwords" (appears after 2FA is enabled)
3. Generate app password:
   - Select app: "Mail"
   - Select device: "Other (custom name)"
   - Name it: "Meal Scheduler"
   - Click "Generate"
4. Copy the 16-character password (looks like: abcd efgh ijkl mnop)

## Step 2: Add to Replit

In your Replit project:
1. Click the "Secrets" tab (lock icon) in the left sidebar
2. Add three secrets:

**GMAIL_USER**
- Value: your-email@gmail.com

**GMAIL_APP_PASSWORD** 
- Value: the 16-character password (remove spaces: abcdefghijklmnop)

**GMAIL_FROM_EMAIL**
- Value: your-email@gmail.com (same as GMAIL_USER)

## WhatsApp Setup (Optional - More Complex)

For WhatsApp Business API, you need:
1. A verified business
2. WhatsApp Business Account
3. Phone number verification

Skip WhatsApp for now - Gmail notifications work great on their own!

## Test Gmail

After adding the secrets, restart the app and use the "Test Message" feature in the admin dashboard.