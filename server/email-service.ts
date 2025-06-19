import nodemailer from 'nodemailer';
import { Missionary, Meal, InsertMessageLog } from '@shared/schema';
import { format } from 'date-fns';
import { db } from './db';
import { messageLogs } from '@shared/schema';

interface EmailConfig {
  user: string;
  password: string;
  from: string;
}

export class EmailService {
  private transporter: any;
  private fromEmail: string;

  constructor() {
    // Check for Gmail configuration
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Gmail not configured. Email notifications will be logged but not sent.");
      this.transporter = null;
      this.fromEmail = '';
    } else {
      try {
        // Create Gmail SMTP transporter
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD // App-specific password, not regular Gmail password
          }
        });
        this.fromEmail = process.env.GMAIL_USER;
        console.log("Gmail service initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize Gmail service:", error);
        this.transporter = null;
        this.fromEmail = '';
      }
    }
  }

  private formatMealMessage(meal: Meal): string {
    const mealDate = new Date(meal.date);
    const formattedDate = format(mealDate, 'PPP'); // e.g., Monday, January 1, 2025
    
    // Format time from 24h to 12h
    const [hours, minutes] = meal.startTime.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
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

  async sendMealReminder(missionary: Missionary, meal: Meal): Promise<boolean> {
    const subject = `🍽️ Meal Reminder - ${format(new Date(meal.date), 'PPP')}`;
    const message = this.formatMealMessage(meal);
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🍽️ Meal Reminder</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>${message}</p>
        <p>Looking forward to seeing you there!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    
    return this.sendEmail(missionary, subject, message, htmlContent, 'before_meal');
  }

  async sendDayOfReminder(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    if (meals.length === 0) return true;
    
    const subject = `📅 Today's Meals - ${format(new Date(), 'PPP')}`;
    let textContent = `Dear ${missionary.name},\n\nHere are your meals for today:\n\n`;
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📅 Today's Meals</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>Here are your meals for today:</p>
        <ul>
    `;
    
    meals.forEach((meal, index) => {
      const mealText = this.formatMealMessage(meal);
      textContent += `${index + 1}. ${mealText}\n\n`;
      htmlContent += `<li style="margin-bottom: 10px;">${mealText}</li>`;
    });
    
    textContent += "Have a wonderful day!";
    htmlContent += `
        </ul>
        <p>Have a wonderful day!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    
    return this.sendEmail(missionary, subject, textContent, htmlContent, 'day_of');
  }

  async sendWeeklySummary(missionary: Missionary, meals: Meal[]): Promise<boolean> {
    const subject = `📋 Weekly Meal Summary`;
    
    if (meals.length === 0) {
      const textContent = `Dear ${missionary.name},\n\nNo meals scheduled for the upcoming week.`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📋 Weekly Meal Summary</h2>
          <p><strong>Dear ${missionary.name},</strong></p>
          <p>No meals scheduled for the upcoming week.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated message from the Ward Missionary Meal Scheduler.
          </p>
        </div>
      `;
      return this.sendEmail(missionary, subject, textContent, htmlContent, 'weekly_summary');
    }
    
    let textContent = `Dear ${missionary.name},\n\nHere are your meals for the upcoming week:\n\n`;
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📋 Weekly Meal Summary</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>Here are your meals for the upcoming week:</p>
        <ul>
    `;
    
    meals.forEach((meal, index) => {
      const mealText = this.formatMealMessage(meal);
      textContent += `${index + 1}. ${mealText}\n\n`;
      htmlContent += `<li style="margin-bottom: 10px;">${mealText}</li>`;
    });
    
    textContent += "Have a blessed week!";
    htmlContent += `
        </ul>
        <p>Have a blessed week!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    
    return this.sendEmail(missionary, subject, textContent, htmlContent, 'weekly_summary');
  }

  async sendCustomMessage(missionary: Missionary, message: string, messageType: string): Promise<boolean> {
    const subject = `📢 Ward Meal Scheduler Notification`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📢 Notification</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>${message}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    
    return this.sendEmail(missionary, subject, message, htmlContent, messageType);
  }

  private async sendEmail(
    missionary: Missionary, 
    subject: string, 
    textContent: string, 
    htmlContent: string, 
    messageType: string
  ): Promise<boolean> {
    // Check if missionary has email
    if (!missionary.emailAddress) {
      console.log(`Cannot send email to ${missionary.name}: No email address provided`);
      return false;
    }

    let successful = false;
    let failureReason: string | undefined;

    // If Gmail is not configured, just log the message
    if (!this.transporter) {
      console.log(`[EMAIL SIMULATION] Sending email to ${missionary.emailAddress}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${textContent}`);
      successful = true;
    } else {
      try {
        const result = await this.transporter.sendMail({
          from: this.fromEmail,
          to: missionary.emailAddress,
          subject: subject,
          text: textContent,
          html: htmlContent
        });
        
        console.log(`Email sent successfully to ${missionary.emailAddress}, ID: ${result.messageId}`);
        successful = true;
      } catch (error: unknown) {
        console.error(`Failed to send email to ${missionary.emailAddress}:`, error);
        successful = false;
        failureReason = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Log the message attempt to database
    try {
      const messageLog: InsertMessageLog = {
        missionaryId: missionary.id,
        messageType,
        content: textContent,
        method: 'email',
        successful,
        sentAt: new Date(),
        segmentCount: 1, // Email is always 1 "segment"
        estimatedCost: 0, // Email is free
        failureReason
      };

      await db.insert(messageLogs).values(messageLog);
    } catch (logError) {
      console.error('Failed to log email message:', logError);
    }

    return successful;
  }
}