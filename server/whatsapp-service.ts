import axios from 'axios';
import { Missionary, Meal, InsertMessageLog } from '@shared/schema';
import { format } from 'date-fns';
import { db } from './db';
import { messageLogs } from '@shared/schema';

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private webhookVerifyToken: string;

  constructor() {
    // Check for WhatsApp Business API configuration
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp Business API not configured. WhatsApp notifications will be logged but not sent.");
      this.accessToken = '';
      this.phoneNumberId = '';
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
    } else {
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
      console.log("WhatsApp Business API initialized successfully.");
    }
  }

  private formatMealMessage(meal: Meal): string {
    const mealDate = new Date(meal.date);
    const formattedDate = format(mealDate, 'EEEE, MMMM d, yyyy'); // e.g., Monday, January 1, 2025
    
    // Format time from 24h to 12h
    const [hours, minutes] = meal.startTime.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedTime = `${formattedHour}:${minutes} ${ampm}`;
    
    let message = `🍽️ Meal at ${meal.hostName}'s home\n📅 ${formattedDate}\n🕐 ${formattedTime}`;
    
    if (meal.mealDescription) {
      message += `\n🍜 Menu: ${meal.mealDescription}`;
    }
    
    if (meal.specialNotes) {
      message += `\n📝 Notes: ${meal.specialNotes}`;
    }
    
    return message;
  }

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const message = `🔔 *Meal Reminder*\n\nHi ${missionary.name}!\n\n${this.formatMealMessage(meal)}\n\nLooking forward to seeing you there! 😊`;
    return this.sendMessage(missionary, message, 'before_meal');
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true;
    
    let message = `📅 *Today's Meals*\n\nHi ${missionary.name}!\n\nHere are your meals for today:\n\n`;
    
    meals.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
    });
    
    message += "Have a wonderful day! 🌟";
    
    return this.sendMessage(missionary, message, 'day_of');
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    let message = `📋 *Weekly Meal Summary*\n\nHi ${missionary.name}!\n\n`;
    
    if (meals.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      
      meals.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}\n\n`;
      });
      
      message += "Have a blessed week! 🙏";
    }
    
    return this.sendMessage(missionary, message, 'weekly_summary');
  }

  async sendCustomMessage(missionary: Missionary, messageText: string, messageType: string): Promise<boolean> {
    const message = `📢 *Ward Meal Scheduler*\n\nHi ${missionary.name}!\n\n${messageText}`;
    return this.sendMessage(missionary, message, messageType);
  }

  private async sendMessage(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    // Check if missionary has WhatsApp number
    if (!missionary.whatsappNumber) {
      console.log(`Cannot send WhatsApp message to ${missionary.name}: No WhatsApp number provided`);
      return false;
    }

    let successful = false;
    let failureReason: string | undefined;

    // If WhatsApp is not configured, just log the message
    if (!this.accessToken || !this.phoneNumberId) {
      console.log(`[WHATSAPP SIMULATION] Sending message to ${missionary.whatsappNumber}:`);
      console.log(message);
      successful = true;
    } else {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: missionary.whatsappNumber,
            type: 'text',
            text: {
              body: message
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`WhatsApp message sent successfully to ${missionary.whatsappNumber}, ID: ${response.data.messages[0].id}`);
        successful = true;
      } catch (error: unknown) {
        console.error(`Failed to send WhatsApp message to ${missionary.whatsappNumber}:`, error);
        successful = false;
        failureReason = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Log the message attempt to database
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        content: message,
        method: 'whatsapp',
        successful,
        segmentCount: 1, // WhatsApp messages are typically 1 segment
        estimatedCost: "0", // WhatsApp Business API has free tier
        failureReason
      };

      await db.insert(messageLogs).values(messageLog);
    } catch (logError) {
      console.error('Failed to log WhatsApp message:', logError);
    }

    return successful;
  }

  // Webhook verification for WhatsApp
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  // Process incoming WhatsApp messages (for consent verification)
  async processIncomingMessage(body: any): Promise<void> {
    try {
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        
        if (change.field === 'messages' && change.value.messages) {
          const message = change.value.messages[0];
          const fromNumber = message.from;
          const messageText = message.text?.body?.trim().toLowerCase();
          
          if (!messageText) return;
          
          console.log(`Received WhatsApp message from ${fromNumber}: ${messageText}`);
          
          // Find missionary by WhatsApp number
          // This would need to be implemented based on your storage system
          // For now, just log the interaction
          console.log('WhatsApp message processing would happen here');
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
    }
  }
}