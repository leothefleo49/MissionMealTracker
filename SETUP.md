# Missionary Meal Scheduler - Complete Setup Guide

This application uses **completely free** notification services (Gmail email and WhatsApp Business API) instead of paid SMS services, making it cost-free to operate. Features include enhanced dietary management, email verification, transfer notifications, and comprehensive missionary information tracking.

## 🔧 Developer Setup

### 1. Gmail Email Notifications (Recommended - Completely Free)

Gmail notifications work out of the box without any API keys for local development. For production deployment:

1. **Create a Gmail account** (or use existing) for sending notifications
2. **Enable 2-Factor Authentication** on the Gmail account
3. **Generate an App Password**:
   - Go to Google Account Settings → Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and your device
   - Copy the generated 16-character password

4. **Set environment variables**:
   ```bash
   GMAIL_USER=your-gmail-address@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   ```

### 2. WhatsApp Business API (Optional - Free Tier Available)

WhatsApp setup is more complex but provides excellent delivery rates:

1. **Create a Facebook Business Account**
2. **Set up WhatsApp Business API**:
   - Go to Facebook Developers Console
   - Create a new app → Business → WhatsApp
   - Get your Phone Number ID and Access Token

3. **Set environment variables**:
   ```bash
   WHATSAPP_ACCESS_TOKEN=your-access-token
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-custom-webhook-token
   ```

### 3. Database Setup

The application uses PostgreSQL. Run this to update the schema:

```sql
-- Add email and WhatsApp support to missionaries
ALTER TABLE missionaries 
ADD COLUMN IF NOT EXISTS email_address TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Update default notification method to email
ALTER TABLE missionaries 
ALTER COLUMN preferred_notification SET DEFAULT 'email';

-- Update message logs for new notification system
ALTER TABLE message_logs 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS method TEXT,
ADD COLUMN IF NOT EXISTS estimated_cost TEXT DEFAULT '0';
```

### 4. Environment Variables Summary

**Required for Gmail (Recommended)**:
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**Optional for WhatsApp**:
```bash
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-token
```

**Database** (auto-configured on Replit):
```bash
DATABASE_URL=postgresql://...
```

## 👥 End User Guide

### For Ward Clerks and Administrators

#### 1. Adding Missionaries

When adding new missionaries to the system:

1. **Required Information**:
   - Name
   - Type (Elders/Sisters)
   - Mission phone number
   - Email address (must end with @missionary.org)

2. **Optional Enhanced Information**:
   - Personal phone number (for emergency contact)
   - WhatsApp number (can be same as mission phone)
   - Food allergies (specific allergens)
   - Pet allergies (cats, dogs, etc.)
   - Allergy severity (mild, moderate, severe, life-threatening)
   - Favorite meals (helps meal providers)
   - Other dietary restrictions (vegetarian, kosher, etc.)
   - Transfer date (for automatic update reminders)

3. **Email Verification Process**:
   - System requires @missionary.org email addresses
   - 4-digit verification code sent to email
   - Must verify before receiving email notifications
   - Codes expire in 10 minutes for security

4. **Transfer Management**:
   - Set transfer dates to receive automatic reminders
   - Super admins notified on transfer day
   - Reminders include current contact information
   - Helps ensure information stays current

#### 2. Notification Methods Comparison

| Method | Cost | Setup Difficulty | Reliability | Engagement |
|--------|------|------------------|-------------|------------|
| **Email** | Free ✅ | Easy ✅ | High ✅ | Good |
| **WhatsApp** | Free* ✅ | Medium | Very High ✅ | Excellent ✅ |
| SMS | Paid ❌ | Easy | High | Good |

*WhatsApp Business API has generous free tier

#### 3. Setting Up Missionaries

**For Email Notifications**:
1. Ask missionary for their email address
2. Set "Preferred Notification" to "Email"
3. Test by sending a meal reminder

**For WhatsApp Notifications**:
1. Ask missionary for their WhatsApp phone number
2. Ensure they have WhatsApp installed and active
3. Set "Preferred Notification" to "WhatsApp" 
4. Test by sending a meal reminder

#### 4. Notification Scheduling Options

The system supports multiple notification schedules:

- **Before Meal**: Send reminder X hours before meal (default: 3 hours)
- **Day Of**: Send reminder at specific time on meal day (default: 9:00 AM)
- **Weekly Summary**: Send weekly meal schedule (default: Sunday 6:00 PM)
- **Multiple**: Combine different notification types

### For Missionaries

#### 1. Receiving Notifications

**Email Notifications**:
- Check your email regularly for meal reminders
- Notifications include meal details, host information, and timing
- Mark as important or create a filter for meal notifications

**WhatsApp Notifications**:
- Ensure WhatsApp is installed and notifications enabled
- Messages come from the ward's WhatsApp Business account
- You can reply for questions or confirmations

#### 2. Updating Your Information

Contact your ward clerk to:
- Change your preferred notification method
- Update email address or WhatsApp number
- Modify notification timing preferences
- Add dietary restrictions or preferences

## 🚀 Deployment

### Deploying on Replit

1. **Set Environment Variables** in Replit Secrets:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   ```

2. **Database**: Automatically configured with Replit PostgreSQL

3. **Deploy**: Click the "Deploy" button in Replit

### Deploying Elsewhere

1. **Set up PostgreSQL database**
2. **Configure environment variables**
3. **Run database migrations**:
   ```bash
   npm run db:push
   ```
4. **Start the application**:
   ```bash
   npm run dev
   ```

## 💰 Cost Analysis

### Previous System (Twilio SMS)
- **Cost**: $0.0075 per SMS segment
- **Monthly estimate**: $50-200+ depending on usage
- **Annual cost**: $600-2400+

### New System (Gmail + WhatsApp)
- **Gmail cost**: $0 (completely free)
- **WhatsApp cost**: $0 (free tier: 1000 conversations/month)
- **Monthly estimate**: $0
- **Annual cost**: $0

**Savings**: 100% cost reduction while maintaining or improving notification reliability.

## 🔧 Troubleshooting

### Gmail Issues
- **Authentication failed**: Verify app password is correct
- **Messages not sending**: Check Gmail account isn't locked
- **Spam folder**: Recipients should check spam initially

### WhatsApp Issues
- **Setup complexity**: WhatsApp Business API requires Facebook Business account
- **Rate limits**: Free tier has limits but suitable for most wards
- **Phone verification**: Ensure missionaries' WhatsApp numbers are correct

### General Issues
- **Database errors**: Check PostgreSQL connection
- **Missing notifications**: Verify missionary contact information
- **Permission errors**: Ensure proper ward access codes

## 📧 Support

For technical issues:
1. Check application logs for error messages
2. Verify environment variables are set correctly
3. Test with a single missionary first
4. Contact system administrator with specific error details

The new notification system provides better reliability at zero cost while maintaining all the features of the previous SMS-based system.