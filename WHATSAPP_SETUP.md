# WhatsApp Business API Setup Guide

## Overview
WhatsApp Business API requires:
1. A Meta Business Account
2. WhatsApp Business Account 
3. Verified business phone number
4. App with WhatsApp product added

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Enter your business name and details
4. Verify your business information

## Step 2: Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill in app details:
   - App name: "Meal Scheduler"
   - Contact email: your email
   - Business account: select the one you created

## Step 3: Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. This will create a WhatsApp Business Account automatically

## Step 4: Get Phone Number ID

1. In WhatsApp → Getting Started
2. You'll see a test phone number (starts with +1555...)
3. Copy the "Phone number ID" (looks like: 123456789012345)
4. Copy the "WhatsApp Business Account ID" 

## Step 5: Generate Access Token

1. In WhatsApp → Getting Started
2. Find "Temporary access token" 
3. Copy this token (starts with: EAAxxxxx...)
4. Note: This expires in 24 hours - for production use permanent tokens

## Step 6: Test Your Setup

Before adding to the app, test with curl:

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_PHONE_NUMBER",
    "type": "text",
    "text": {
      "body": "Hello from Meal Scheduler!"
    }
  }'
```

Replace:
- YOUR_PHONE_NUMBER_ID: The phone number ID from step 4
- YOUR_ACCESS_TOKEN: The access token from step 5  
- YOUR_PHONE_NUMBER: Your personal WhatsApp number (with country code, no +)

## Step 7: Add to Meal Scheduler

In Replit, add these secrets:

**WHATSAPP_ACCESS_TOKEN**
- Value: Your access token (EAAxxxxx...)

**WHATSAPP_PHONE_NUMBER_ID** 
- Value: Your phone number ID (123456789012345)

**WHATSAPP_BUSINESS_ACCOUNT_ID**
- Value: Your business account ID

## Important Notes

### Limitations with Test Numbers
- Test numbers can only send to verified phone numbers
- You need to verify recipient numbers in Meta Business settings
- Messages only work to/from verified numbers during testing

### Production Setup
For real use, you need:
1. Business verification with Meta
2. Your own phone number (not the test one)
3. Permanent access tokens
4. Webhook setup for two-way messaging

### Phone Number Format
WhatsApp requires phone numbers in international format:
- ✅ Correct: 15551234567 (no + or spaces)
- ❌ Wrong: +1 555-123-4567

## Troubleshooting

**"Invalid phone number" error:**
- Verify the recipient number in Meta Business settings
- Check phone number format (no + or spaces)

**"Access token expired":**
- Generate a new temporary token
- For production, set up permanent tokens

**"Phone number not verified":**
- Go to Meta Business → WhatsApp → Phone Numbers
- Verify your business phone number