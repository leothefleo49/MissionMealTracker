import { Missionary, Meal } from '@shared/schema';
import { formatDate } from '@client/src/lib/utils';

// Interface for notification services
interface INotificationService {
  sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean>;
  sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean>;
  sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean>;
}

// Base class for notification services with common formatting
abstract class BaseNotificationService implements INotificationService {
  protected formatMealMessage(meal: Meal): string {
    const mealDate = new Date(meal.date);
    const formattedDate = formatDate(mealDate, 'PPP'); // e.g., Monday, January 1, 2025
    
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
  
  // Implement the methods that will be used by derived classes
  abstract sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean>;
  abstract sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean>;
  abstract sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean>;
}

// Twilio SMS Service
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
        // We don't want to import Twilio if it's not configured to avoid unnecessary errors
        const twilio = require('twilio');
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
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
    return this.sendText(missionary.phoneNumber, reminderText);
  }
  
  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true; // No meals to remind about
    
    let messageText = `Today's meals for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendText(missionary.phoneNumber, messageText);
  }
  
  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) {
      const noMealsMessage = `Weekly Summary for ${missionary.name}: No meals scheduled for the upcoming week.`;
      return this.sendText(missionary.phoneNumber, noMealsMessage);
    }
    
    let messageText = `Weekly Meal Summary for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendText(missionary.phoneNumber, messageText);
  }
  
  private async sendText(phoneNumber: string, message: string): Promise<boolean> {
    // If Twilio is not configured, just log the message
    if (!this.twilioClient) {
      console.log(`[TWILIO SIMULATION] Sending SMS to ${phoneNumber}: ${message}`);
      return true;
    }
    
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber
      });
      
      console.log(`SMS sent successfully to ${phoneNumber}, SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return false;
    }
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
    return this.sendMessengerMessage(missionary.messengerAccount, reminderText);
  }
  
  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (!missionary.messengerAccount || meals.length === 0) return false;
    
    let messageText = `Today's meals for ${missionary.name}:\n\n`;
    
    meals.forEach((meal, index) => {
      messageText += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    return this.sendMessengerMessage(missionary.messengerAccount, messageText);
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
    
    return this.sendMessengerMessage(missionary.messengerAccount, messageText);
  }
  
  private async sendMessengerMessage(messengerAccount: string, message: string): Promise<boolean> {
    // This is a placeholder - actual implementation would use Facebook's Messenger API
    console.log(`[MESSENGER SIMULATION] Sending message to ${messengerAccount}: ${message}`);
    
    // To implement Facebook Messenger API, you would need:
    // 1. A Facebook App with Messenger permissions
    // 2. A Page Access Token for the API
    // 3. Facebook user ID of the recipient
    
    // The API implementation would look something like:
    /*
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      console.warn("Facebook API not configured. Messages will be logged but not sent.");
      return true;
    }
    
    try {
      const response = await fetch(`https://graph.facebook.com/v15.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: userIdFromUsername(messengerAccount) },
          message: { text: message }
        })
      });
      
      const data = await response.json();
      return data.message_id ? true : false;
    } catch (error) {
      console.error(`Failed to send Messenger message to ${messengerAccount}:`, error);
      return false;
    }
    */
    
    return true; // Simulate success
  }
}

// Notification Manager handles service selection based on missionary preferences
export class NotificationManager {
  private smsService: TwilioService;
  private messengerService: MessengerService;
  
  constructor() {
    this.smsService = new TwilioService();
    this.messengerService = new MessengerService();
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
}

// Export singleton instance
export const notificationManager = new NotificationManager();