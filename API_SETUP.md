# API Configuration Guide

This application uses **free notification services** (Gmail and WhatsApp) by default. SMS and Messenger options are disabled and require special permissions.

## Gmail Email Notifications (Free)

### Step 1: Create Gmail App Password
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", enable "2-Step Verification" if not already enabled
4. After 2FA is enabled, you'll see "App passwords" appear in the same section
5. Click "App passwords"
6. Select "Mail" from the dropdown and "Other" for device
7. Enter "Meal Scheduler" as the app name
8. Click "Generate" - copy the 16-character password (no spaces)

**Note**: If you don't see "App passwords", make sure 2-Step Verification is fully enabled and wait a few minutes for it to appear.

### Alternative: If App Passwords Don't Appear
Some Google accounts don't show the App Passwords option. In this case:
1. Try using OAuth2 instead (more complex setup)
2. Use a different Gmail account specifically for this app
3. Or use only WhatsApp notifications (which don't require Gmail)

### Important Security Note
- **NEVER use your regular Gmail password** - this won't work and is less secure
- App passwords look like: `abcd efgh ijkl mnop` (16 characters with spaces)
- The app password is different from your login password

### Step 2: Configure Environment Variables
Add these to your environment:
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
GMAIL_FROM_EMAIL=your-email@gmail.com
```

## WhatsApp Business API (Free Tier)

### Step 1: Get WhatsApp Business API Access
1. Go to Meta for Developers (developers.facebook.com)
2. Create a new app → Business → WhatsApp
3. Get your access token and phone number ID
4. Verify your business phone number

### Step 2: Configure Environment Variables
Add these to your environment:
```
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
```

## SMS/Messenger (Requires Permission)

These services are **disabled by default** because they cost money:
- SMS via Twilio: ~$0.0075 per message
- Facebook Messenger: Requires business verification

To enable paid services, contact your administrator to grant special permissions.

## Testing Configuration

Use the "Test Message" feature in the admin dashboard to verify your API configuration:

1. **Gmail**: Enter any email address and select "Gmail Email"
2. **WhatsApp**: Enter a phone number with country code (+1234567890) and select "WhatsApp"

## Troubleshooting

### Gmail Issues
- **Authentication Error**: Check app password is correct and 2FA is enabled
- **Connection Error**: Verify GMAIL_USER and GMAIL_FROM_EMAIL match
- **Rate Limiting**: Gmail has sending limits - space out test messages

### WhatsApp Issues
- **Invalid Token**: Regenerate access token in Meta Developer Console
- **Phone Number Not Verified**: Complete business verification process
- **Message Failed**: Check phone number format includes country code

### General Issues
- Check environment variables are set correctly
- Restart the application after adding new environment variables
- Check console logs for detailed error messages

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor usage to prevent unexpected charges (for paid services)

## Free vs Paid Services

### Free Services (Default)
- ✅ Gmail Email: Completely free
- ✅ WhatsApp Business: Free tier available

### Paid Services (Disabled)
- ❌ SMS/Text: Requires Twilio account ($$$)
- ❌ Messenger: Requires business verification ($$$)

The application is designed to work entirely with free services for most use cases.