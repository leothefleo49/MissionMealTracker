import { Missionary, Meal, InsertMessageLog, MessageStats } from '../shared/schema';
import { format } from 'date-fns';
import { db } from './db';
import { messageLogs } from '@shared/schema';
import { eq, and, gte, lte, sql, count, sum } from 'drizzle-orm';
import { EmailService } from './email-service';
import { WhatsAppService } from './whatsapp-service';

// Email and WhatsApp are free - no per-message costs
const EMAIL_RATE_PER_MESSAGE = 0.0; // Free
const WHATSAPP_RATE_PER_MESSAGE = 0.0; // Free (Business API free tier)

// Interface for notification services
interface INotificationService {
  sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean>;
  sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean>;
  sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean>;
}

// Base class for notification services with common formatting
abstract class BaseNotificationService implements INotificationService {
  protected formatDate(date: Date, pattern: string): string {
    return format(date, pattern);
  }
  
  protected formatMealMessage(meal: Meal): string {
    const mealDate = new Date(meal.date);
    const formattedDate = this.formatDate(mealDate, 'PPP'); // e.g., Monday, January 1, 2025
    
    // Format time from 24h to 12h
    const [hours, minutes] = meal.startTime.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    const formattedTime = `${formattedHour}:${minutes} ${ampm}`;
    
    let message = `Meal scheduled at ${meal.hostName}'s home on ${formattedDate} at ${formattedTime}.`;
    
    if (meal.mealDescription) {
      message += ` Menu: ${meal.mealDescription}.`;
    }
    
    if (meal.specialNotes) {
      message += ` Notes: ${meal.specialNotes}`;
    }
    
    return message;
  }
  
  // Calculate SMS segments based on character count (for legacy compatibility)
  public calculateSegments(message: string): number {
    // GSM-7 encoding allows 160 characters per segment
    // Unicode/non-standard characters use UCS-2 encoding, allowing 70 characters per segment
    
    // Check if message contains any non-GSM-7 characters
    const nonGsmChars = /[^\u0000-\u007F\u00A0-\u00FF\u20AC\u00A3\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\u00D8\u00F8\u00C5\u00E5\u00C6\u00E6\u00DF\u00C9\u00C4\u00D6\u00DC\u00E4\u00F6\u00FC\u00D1\u00F1\u00BF\u00A1\u00C0\u00C1\u00C2\u00C3\u00C8\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D2\u00D3\u00D4\u00D5\u00D7\u00D9\u00DA\u00DB\u00DD\u00DE\u00E0\u00E1\u00E2\u00E3\u00EA\u00EB\u00ED\u00EE\u00EF\u00F0\u00F3\u00F4\u00F5\u00F7\u00FA\u00FB\u00FE\u00FF]/;
    
    const charsPerSegment = nonGsmChars.test(message) ? 70 : 160;
    
    // For multi-segment messages, each segment has a 7-byte header that reduces capacity
    if (message.length <= charsPerSegment) {
      return 1;
    } else {
      // For multi-segment messages, each segment has reduced capacity (153 for GSM-7, 67 for UCS-2)
      const charsPerMultiSegment = nonGsmChars.test(message) ? 67 : 153;
      return Math.ceil(message.length / charsPerMultiSegment);
    }
  }
  
  // Implement the methods that will be used by derived classes
  abstract sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean>;
  abstract sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean>;
  abstract sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean>;
}

// Email notification service wrapper
export class EmailNotificationService extends BaseNotificationService {
  public emailService: EmailService;

  constructor() {
    super();
    this.emailService = new EmailService();
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    return this.emailService.sendMealReminder(missionary, meal);
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    return this.emailService.sendDayOfReminder(missionary, meals);
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    return this.emailService.sendWeeklySummary(missionary, meals);
  }
}

// WhatsApp notification service wrapper
export class WhatsAppNotificationService extends BaseNotificationService {
  public whatsappService: WhatsAppService;

  constructor() {
    super();
    this.whatsappService = new WhatsAppService();
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    return this.whatsappService.sendMealReminder(missionary, meal);
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    return this.whatsappService.sendDayOfReminder(missionary, meals);
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    return this.whatsappService.sendWeeklySummary(missionary, meals);
  }
}

// Legacy Twilio service (kept for backward compatibility but marked deprecated)
export class TwilioService extends BaseNotificationService {
  public twilioClient: any;
  public twilioPhoneNumber: string;

  constructor() {
    super();
    console.warn("TwilioService is deprecated. Please use EmailNotificationService or WhatsAppNotificationService instead.");
    
    // Always disable Twilio for the free notification system
    console.warn("Twilio SMS is now disabled. Using free email and WhatsApp notifications instead.");
    this.twilioClient = null;
    this.twilioPhoneNumber = '';
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const message = `🍽️ Meal Reminder: ${this.formatMealMessage(meal)}`;
    return this.sendText(missionary, message, 'before_meal');
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true;
    
    let message = `📅 Today's Meals:\n\n`;
    meals.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    message += "Have a wonderful day! 🌟";
    
    return this.sendText(missionary, message, 'day_of');
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    let message = `📋 Weekly Meal Summary:\n\n`;
    
    if (meals.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      meals.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
      });
      message += "Have a blessed week! 🙏";
    }
    
    return this.sendText(missionary, message, 'weekly_summary');
  }

  private async sendText(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    let successful = false;
    let failureReason: string | undefined;
    const segments = this.calculateSegments(message);

    if (!this.twilioClient) {
      console.log(`[SMS SIMULATION] Sending text to ${missionary.phoneNumber}:`);
      console.log(message);
      successful = true;
    } else {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: missionary.phoneNumber,
        });
        
        console.log(`SMS sent successfully to ${missionary.phoneNumber}, SID: ${result.sid}`);
        successful = true;
      } catch (error: unknown) {
        console.error(`Failed to send SMS to ${missionary.phoneNumber}:`, error);
        successful = false;
        failureReason = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Log the message attempt to database (using old format for compatibility)
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        content: message,
        method: 'sms',
        successful,
        failureReason,
        segmentCount: segments,
        estimatedCost: (segments * 0.0075).toString() // SMS cost
      };

      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error('Failed to log SMS message:', dbError);
    }

    return successful;
  }
}

// Legacy Messenger service (kept for backward compatibility)
export class MessengerService extends BaseNotificationService {
  constructor() {
    super();
    console.warn("MessengerService is deprecated. Please use EmailNotificationService or WhatsAppNotificationService instead.");
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const message = `🍽️ Meal Reminder: ${this.formatMealMessage(meal)}`;
    return this.sendMessengerMessage(missionary, message, 'before_meal');
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true;
    
    let message = `📅 Today's Meals:\n\n`;
    meals.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    message += "Have a wonderful day! 🌟";
    
    return this.sendMessengerMessage(missionary, message, 'day_of');
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    let message = `📋 Weekly Meal Summary:\n\n`;
    
    if (meals.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      meals.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
      });
      message += "Have a blessed week! 🙏";
    }
    
    return this.sendMessengerMessage(missionary, message, 'weekly_summary');
  }

  private async sendMessengerMessage(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    let successful = false;
    let failureReason: string | undefined;

    // Messenger integration would go here
    console.log(`[MESSENGER SIMULATION] Sending message to ${missionary.messengerAccount}:`);
    console.log(message);
    successful = true;

    // Log the message attempt to database
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        content: message,
        method: 'messenger',
        successful,
        failureReason,
        segmentCount: 1,
        estimatedCost: "0"
      };
      
      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error('Failed to log message statistics:', dbError);
    }
    
    return successful;
  }
}

// Message statistics service
export class MessageStatsService {
  private calculateEstimatedCost(segments: number): number {
    return segments * 0.0075; // Legacy SMS cost calculation
  }

  async getMessageStats(): Promise<MessageStats> {
    // Get total stats
    const [totalStats] = await db
      .select({
        totalMessages: count(),
        totalSuccessful: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        totalSegments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs);

    const totalFailed = totalStats.totalMessages - totalStats.totalSuccessful;

    // Get ward-based stats
    const byWard = await db
      .select({
        wardId: messageLogs.wardId,
        wardName: sql<string>`'Ward ' || ${messageLogs.wardId}::text`,
        messageCount: count(),
        successCount: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        segments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs)
      .groupBy(messageLogs.wardId);

    // Get missionary-based stats
    const byMissionary = await db
      .select({
        missionaryId: messageLogs.missionaryId,
        missionaryName: sql<string>`'Missionary ID ' || ${messageLogs.missionaryId}::text`,
        messageCount: count(),
        successCount: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        segments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs)
      .groupBy(messageLogs.missionaryId);
    
    // Get time-based stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Set to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const timeQueries = [
      { name: 'today', start: today, end: now },
      { name: 'this_week', start: startOfWeek, end: now },
      { name: 'this_month', start: startOfMonth, end: now },
      { name: 'last_month', start: startOfLastMonth, end: endOfLastMonth },
    ];
    
    const byPeriod = await Promise.all(
      timeQueries.map(async ({ name, start, end }) => {
        const [result] = await db
          .select({
            messageCount: count(),
            segments: sum(messageLogs.segmentCount),
          })
          .from(messageLogs)
          .where(
            and(
              gte(messageLogs.sentAt, start),
              lte(messageLogs.sentAt, end)
            )
          );
        
        return {
          period: name,
          messageCount: result.messageCount,
          segments: Number(result.segments) || 0,
          estimatedCost: this.calculateEstimatedCost(Number(result.segments) || 0),
        };
      })
    );

    return {
      totalMessages: totalStats.totalMessages,
      totalSuccessful: totalStats.totalSuccessful,
      totalFailed,
      totalCharacters: 0, // Not tracking characters in new system
      totalSegments: Number(totalStats.totalSegments) || 0,
      estimatedCost: 0, // Email and WhatsApp are free
      byWard: byWard.map(ward => ({
        wardId: ward.wardId,
        wardName: ward.wardName,
        messageCount: ward.messageCount,
        successRate: ward.messageCount > 0 ? (ward.successCount / ward.messageCount) * 100 : 0,
        characters: 0, // Not tracking characters
        segments: Number(ward.segments) || 0,
        estimatedCost: 0, // Free services
      })),
      byMissionary: byMissionary.map(missionary => ({
        missionaryId: missionary.missionaryId,
        missionaryName: missionary.missionaryName,
        messageCount: missionary.messageCount,
        successRate: missionary.messageCount > 0 ? (missionary.successCount / missionary.messageCount) * 100 : 0,
        characters: 0, // Not tracking characters
        segments: Number(missionary.segments) || 0,
        estimatedCost: 0, // Free services
      })),
      byPeriod,
    };
  }

  async getWardMessageStats(wardId: number): Promise<MessageStats> {
    // Similar implementation but filtered by wardId
    const [totalStats] = await db
      .select({
        totalMessages: count(),
        totalSuccessful: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        totalSegments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs)
      .where(eq(messageLogs.wardId, wardId));

    const totalFailed = totalStats.totalMessages - totalStats.totalSuccessful;

    return {
      totalMessages: totalStats.totalMessages,
      totalSuccessful: totalStats.totalSuccessful,
      totalFailed,
      totalCharacters: 0,
      totalSegments: Number(totalStats.totalSegments) || 0,
      estimatedCost: 0, // Free services
      byWard: [],
      byMissionary: [],
      byPeriod: [],
    };
  }
}

// Main notification manager
export class NotificationManager {
  public emailService: EmailNotificationService;
  public whatsappService: WhatsAppNotificationService;
  public smsService: TwilioService; // Legacy support
  public messengerService: MessengerService; // Legacy support
  private statsService: MessageStatsService;

  constructor() {
    this.emailService = new EmailNotificationService();
    this.whatsappService = new WhatsAppNotificationService();
    this.smsService = new TwilioService(); // Keep for backward compatibility
    this.messengerService = new MessengerService(); // Keep for backward compatibility
    this.statsService = new MessageStatsService();
  }

  public getServiceForMissionary(missionary: Missionary): BaseNotificationService {
    switch (missionary.preferredNotification) {
      case 'email':
        return this.emailService;
      case 'whatsapp':
        return this.whatsappService;
      case 'text':
      case 'sms':
        return this.smsService; // Legacy
      case 'messenger':
        return this.messengerService; // Legacy
      default:
        // Default to email for new system
        return this.emailService;
    }
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const service = this.getServiceForMissionary(missionary);
    return service.sendMealReminder(missionary, meal);
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    const service = this.getServiceForMissionary(missionary);
    return service.sendDayOfReminder(missionary, meals);
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    const service = this.getServiceForMissionary(missionary);
    return service.sendWeeklySummary(missionary, meals);
  }

  async scheduleNotifications(missionary: Missionary, meal: Meal): Promise<void> {
    // This would integrate with a job scheduler like node-cron or agenda
    console.log(`Scheduling notifications for ${missionary.name} for meal on ${meal.date}`);
    // Implementation would depend on notification schedule preferences
  }

  async getMessageStats(): Promise<MessageStats> {
    return this.statsService.getMessageStats();
  }

  async getWardMessageStats(wardId: number): Promise<MessageStats> {
    return this.statsService.getWardMessageStats(wardId);
  }

  async sendCustomMessage(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    const service = this.getServiceForMissionary(missionary);
    
    // For custom messages, we need to call the appropriate service methods
    if (service instanceof EmailNotificationService) {
      return service.emailService.sendCustomMessage(missionary, message, messageType);
    } else if (service instanceof WhatsAppNotificationService) {
      return service.whatsappService.sendCustomMessage(missionary, message, messageType);
    } else {
      // Legacy services don't have sendCustomMessage, so we'll simulate it
      console.log(`[${missionary.preferredNotification?.toUpperCase()} SIMULATION] Custom message to ${missionary.name}: ${message}`);
      return true;
    }
  }
}

export const notificationManager = new NotificationManager();