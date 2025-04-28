import { Missionary, Meal, InsertMessageLog, MessageStats } from '../shared/schema';
import { format } from 'date-fns';
import { db } from './db';
import { messageLogs } from '@shared/schema';
import { eq, and, gte, lte, sql, count, sum } from 'drizzle-orm';

// Standard Twilio SMS rate - can be updated as needed
const SMS_RATE_PER_SEGMENT = 0.0075; // $0.0075 per SMS segment

// Interface for notification services
interface INotificationService {
  sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean>;
  sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean>;
  sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean>;
}

// Base class for notification services with common formatting
abstract class BaseNotificationService implements INotificationService {
  protected formatDate(date: Date, pattern: string): string {
    // Simple implementation of the formatDate function
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
  
  // Calculate SMS segments based on character count
  protected calculateSegments(message: string): number {
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

// Twilio SMS Service
import twilio from 'twilio';

export class TwilioService extends BaseNotificationService {
  private twilioClient: any;
  private twilioPhoneNumber: string;
  
  constructor() {
    super();
    
    // Check for Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio not configured. SMS notifications will be logged but not sent.");
      this.twilioClient = null;
      this.twilioPhoneNumber = '';
    } else {
      try {
        // Initialize the Twilio client with account credentials
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        console.log("Twilio client initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize Twilio client:", error);
        this.twilioClient = null;
        this.twilioPhoneNumber = '';
      }
    }
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const message = this.formatMealMessage(meal);
    const reminderText = `MEAL REMINDER: ${message} See you soon!`;
    return this.sendText(missionary, reminderText, 'before_meal');
  }
  
  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true; // No meals to remind about
    
    let messageText = `Today's meals for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendText(missionary, messageText, 'day_of');
  }
  
  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) {
      const noMealsMessage = `Weekly Summary for ${missionary.name}: No meals scheduled for the upcoming week.`;
      return this.sendText(missionary, noMealsMessage, 'weekly_summary');
    }
    
    let messageText = `Weekly Meal Summary for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendText(missionary, messageText, 'weekly_summary');
  }
  
  private async sendText(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    const charCount = message.length;
    const segmentCount = this.calculateSegments(message);
    let successful = false;
    let failureReason: string | undefined;
    
    // If Twilio is not configured, just log the message
    if (!this.twilioClient) {
      console.log(`[TWILIO SIMULATION] Sending SMS to ${missionary.phoneNumber}: ${message}`);
      successful = true;
    } else {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: missionary.phoneNumber
        });
        
        console.log(`SMS sent successfully to ${missionary.phoneNumber}, SID: ${result.sid}`);
        successful = true;
      } catch (error) {
        console.error(`Failed to send SMS to ${missionary.phoneNumber}:`, error);
        successful = false;
        failureReason = error.message || 'Unknown error';
      }
    }
    
    // Log the message statistics to the database
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        messageContent: message,
        deliveryMethod: 'sms',
        successful,
        failureReason,
        charCount,
        segmentCount
      };
      
      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error('Failed to log message statistics:', dbError);
    }
    
    return successful;
  }
}

// Facebook Messenger Service
export class MessengerService extends BaseNotificationService {
  constructor() {
    super();
  }
  
  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    if (!missionary.messengerAccount) {
      console.warn(`No messenger account set for missionary ${missionary.name}. Skipping notification.`);
      return false;
    }
    
    const message = this.formatMealMessage(meal);
    const reminderText = `MEAL REMINDER: ${message} See you soon!`;
    return this.sendMessengerMessage(missionary, reminderText, 'before_meal');
  }
  
  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (!missionary.messengerAccount || meals.length === 0) return false;
    
    let messageText = `Today's meals for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendMessengerMessage(missionary, messageText, 'day_of');
  }
  
  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (!missionary.messengerAccount) return false;
    
    let messageText = meals.length === 0
      ? `Weekly Summary for ${missionary.name}: No meals scheduled for the upcoming week.`
      : `Weekly Meal Summary for ${missionary.name}:\n\n`;
    
    if (meals.length > 0) {
      meals.forEach((meal, index) => {
        messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
      });
    }
    
    return this.sendMessengerMessage(missionary, messageText, 'weekly_summary');
  }
  
  private async sendMessengerMessage(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    if (!missionary.messengerAccount) return false;
    
    const charCount = message.length;
    const segmentCount = 1; // Facebook doesn't have message segments like SMS
    let successful = false;
    let failureReason: string | undefined;
    
    // This is a placeholder - actual implementation would use Facebook's Messenger API
    console.log(`[MESSENGER SIMULATION] Sending message to ${missionary.messengerAccount}: ${message}`);
    successful = true;
    
    // Log the message statistics to the database
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        messageContent: message,
        deliveryMethod: 'messenger',
        successful,
        failureReason,
        charCount,
        segmentCount
      };
      
      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error('Failed to log message statistics:', dbError);
    }
    
    return successful;
  }
}

// Message Stats Service for tracking and reporting on message usage
export class MessageStatsService {
  // Calculate estimated cost based on segment count
  private calculateEstimatedCost(segments: number): number {
    return segments * SMS_RATE_PER_SEGMENT;
  }
  
  // Get overall message statistics
  async getMessageStats(): Promise<MessageStats> {
    // Get total counts
    const [totalCounts] = await db
      .select({
        totalMessages: count(),
        totalSuccessful: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        totalFailed: count(
          sql`CASE WHEN ${messageLogs.successful} = false THEN 1 END`
        ),
        totalCharacters: sum(messageLogs.charCount),
        totalSegments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs);
    
    // Get stats by ward
    const byWard = await db
      .select({
        wardId: messageLogs.wardId,
        wardName: sql<string>`'Ward ID ' || ${messageLogs.wardId}::text`,
        messageCount: count(),
        successCount: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        characters: sum(messageLogs.charCount),
        segments: sum(messageLogs.segmentCount),
      })
      .from(messageLogs)
      .groupBy(messageLogs.wardId);
    
    // Get stats by missionary
    const byMissionary = await db
      .select({
        missionaryId: messageLogs.missionaryId,
        missionaryName: sql<string>`'Missionary ID ' || ${messageLogs.missionaryId}::text`,
        messageCount: count(),
        successCount: count(
          sql`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
        ),
        characters: sum(messageLogs.charCount),
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
          messageCount: result.messageCount || 0,
          segments: result.segments || 0,
          estimatedCost: this.calculateEstimatedCost(result.segments || 0),
        };
      })
    );
    
    // Calculate success rates and costs for ward and missionary statistics
    const formattedByWard = byWard.map((ward) => ({
      wardId: ward.wardId,
      wardName: ward.wardName,
      messageCount: ward.messageCount,
      successRate: ward.messageCount > 0 ? (ward.successCount / ward.messageCount) * 100 : 100,
      characters: ward.characters || 0,
      segments: ward.segments || 0,
      estimatedCost: this.calculateEstimatedCost(ward.segments || 0),
    }));
    
    const formattedByMissionary = byMissionary.map((missionary) => ({
      missionaryId: missionary.missionaryId,
      missionaryName: missionary.missionaryName,
      messageCount: missionary.messageCount,
      successRate: missionary.messageCount > 0 ? (missionary.successCount / missionary.messageCount) * 100 : 100,
      characters: missionary.characters || 0,
      segments: missionary.segments || 0,
      estimatedCost: this.calculateEstimatedCost(missionary.segments || 0),
    }));
    
    // Calculate overall estimated cost
    const estimatedCost = this.calculateEstimatedCost(totalCounts.totalSegments || 0);
    
    return {
      totalMessages: totalCounts.totalMessages || 0,
      totalSuccessful: totalCounts.totalSuccessful || 0,
      totalFailed: totalCounts.totalFailed || 0,
      totalCharacters: totalCounts.totalCharacters || 0,
      totalSegments: totalCounts.totalSegments || 0,
      estimatedCost,
      byWard: formattedByWard,
      byMissionary: formattedByMissionary,
      byPeriod,
    };
  }
  
  // Get message statistics for a specific ward
  async getWardMessageStats(wardId: number): Promise<MessageStats> {
    // Implementation similar to getMessageStats but filtered by wardId
    const stats = await this.getMessageStats();
    
    return {
      ...stats,
      byWard: stats.byWard.filter(ward => ward.wardId === wardId),
      byMissionary: stats.byMissionary.filter(missionary => {
        // Check if missionary belongs to the specified ward
        // This would require joining with the missionaries table in a real implementation
        // For now, we'll assume the data is filtered correctly
        return true;
      }),
    };
  }
}

// Notification Manager handles service selection based on missionary preferences
export class NotificationManager {
  private smsService: TwilioService;
  private messengerService: MessengerService;
  private statsService: MessageStatsService;
  
  constructor() {
    this.smsService = new TwilioService();
    this.messengerService = new MessengerService();
    this.statsService = new MessageStatsService();
  }
  
  private getServiceForMissionary(missionary: Missionary): BaseNotificationService {
    return missionary.preferredNotification === 'messenger' && missionary.messengerAccount 
      ? this.messengerService 
      : this.smsService;
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
  
  // Schedule reminders based on missionary's notification preferences
  async scheduleNotifications(missionary: Missionary, meal: Meal): Promise<void> {
    // Check the missionary's notification preferences
    switch (missionary.notificationScheduleType) {
      case 'before_meal':
        // Calculate when to send the reminder based on hoursBefore
        const mealTime = new Date(meal.date);
        const [hours, minutes] = meal.startTime.split(':');
        mealTime.setHours(parseInt(hours), parseInt(minutes));
        
        const reminderTime = new Date(mealTime.getTime());
        reminderTime.setHours(reminderTime.getHours() - missionary.hoursBefore);
        
        // For demo purposes, log the scheduled notification
        console.log(`Reminder for ${missionary.name} scheduled for ${reminderTime.toISOString()} (${missionary.hoursBefore} hours before meal)`);
        
        // In a real application, use a job scheduler like node-cron
        /*
        const scheduler = require('node-cron');
        
        // Schedule the notification at the appropriate time
        const cronExpression = `${reminderTime.getMinutes()} ${reminderTime.getHours()} ${reminderTime.getDate()} ${reminderTime.getMonth() + 1} *`;
        scheduler.schedule(cronExpression, () => {
          this.sendMealReminder(missionary, meal);
        });
        */
        break;
        
      case 'day_of':
        // In a real application, schedule for the morning of the meal day
        console.log(`Day-of reminder for ${missionary.name} scheduled for ${meal.date} at ${missionary.dayOfTime}`);
        break;
        
      case 'weekly_summary':
        // In a real application, add this meal to the weekly summary data
        console.log(`Meal added to weekly summary for ${missionary.name} (sent on ${missionary.weeklySummaryDay}s at ${missionary.weeklySummaryTime})`);
        break;
        
      case 'multiple':
        // Schedule both immediate and weekly reminders
        if (missionary.useMultipleNotifications) {
          console.log(`Multiple notifications scheduled for ${missionary.name}`);
          // Schedule both types of notifications
        }
        break;
    }
  }
  
  // Get message statistics
  async getMessageStats(): Promise<MessageStats> {
    return this.statsService.getMessageStats();
  }
  
  // Get message statistics for a specific ward
  async getWardMessageStats(wardId: number): Promise<MessageStats> {
    return this.statsService.getWardMessageStats(wardId);
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();