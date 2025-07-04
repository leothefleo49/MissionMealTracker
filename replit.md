# Missionary Meal Scheduler

## Overview

This is a full-stack web application for scheduling and managing meals for missionaries in LDS wards. The system allows ward members to book meals for missionaries, with automatic notification capabilities via free services (Gmail and WhatsApp). The application supports both Elder and Sister missionaries with comprehensive dietary management, notification preferences, and administrative oversight.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React Context for auth
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties
- **Build Tool**: Vite with ESM modules

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with RESTful API design
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

## Key Components

### Database Schema
- **Users**: Admin accounts with role-based permissions (admin, super admin)
- **Wards**: Organization units with access codes and settings
- **Missionaries**: Individual missionaries with contact info, dietary restrictions, and notification preferences
- **Meals**: Scheduled meals with host information, timing, and dietary details
- **Message Logs**: Notification tracking for all sent messages
- **User-Ward Relations**: Many-to-many relationship for admin access

### Authentication System
- **Super Admin**: Password-only login for system-wide access
- **Ward Admin**: Ward access code + password for specific ward management
- **Missionary Portal**: Email + password for missionaries to manage their own profiles
- **Session Management**: PostgreSQL-backed sessions with automatic cleanup

### Notification Services
- **Gmail Integration**: Free email notifications using Gmail SMTP with app passwords
- **WhatsApp Business API**: Free tier messaging via Meta's Business API
- **Message Tracking**: All notifications logged with delivery status and cost tracking
- **Fallback Strategy**: Graceful degradation when services are unavailable

## Data Flow

### Meal Booking Process
1. Ward members access calendar via ward access code
2. Select date and missionary type (Elders/Sisters)
3. Fill booking form with host details and meal information
4. System validates availability and creates meal record
5. Automatic notifications sent to assigned missionaries

### Missionary Registration
1. Missionaries register using ward access code
2. Email verification with 6-digit code sent to @missionary.org address
3. Profile completion with dietary restrictions and notification preferences
4. Admin approval for activation (configurable per ward)

### Notification Flow
1. Meal booking triggers immediate confirmation
2. Scheduled reminders based on missionary preferences
3. Day-of reminders sent morning of meal
4. Weekly summaries with upcoming meals
5. All messages logged for tracking and cost analysis

## External Dependencies

### Core Services
- **PostgreSQL Database**: Primary data storage via Neon or similar provider
- **Gmail SMTP**: Free email notifications (requires app password setup)
- **WhatsApp Business API**: Free messaging service (requires Meta developer account)

### Development Dependencies
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling framework

### Optional Integrations
- **SendGrid**: Alternative email service (disabled by default)
- **SMS Services**: Disabled due to cost considerations
- **Facebook Messenger**: Available but requires additional setup

## Deployment Strategy

### Environment Variables Required
```
DATABASE_URL=postgresql://...
GMAIL_USER=notifications@yourdomain.com
GMAIL_APP_PASSWORD=your-16-char-app-password
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
SESSION_SECRET=your-session-secret
```

### Build Process
1. `npm run build` - Builds both frontend (Vite) and backend (esbuild)
2. Frontend assets compiled to `dist/public`
3. Backend compiled to `dist/index.js` as ESM module
4. Database migrations applied via `npm run db:push`

### Production Considerations
- Database connection pooling configured for serverless environments
- Session store uses PostgreSQL for persistence across restarts
- Static assets served from build directory
- Error handling with proper HTTP status codes
- Rate limiting and input validation on all endpoints

## Changelog

- July 03, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.