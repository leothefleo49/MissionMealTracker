import nodemailer from 'nodemailer';
import { db } from './db';
import { missionaries } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class EmailVerificationService {
  private transporter: any;
  private fromEmail: string;

  constructor() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Gmail not configured. Email verification will be simulated.");
      this.transporter = null;
      this.fromEmail = '';
    } else {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        this.fromEmail = process.env.GMAIL_USER;
        console.log("Email verification service initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize email verification service:", error);
        this.transporter = null;
        this.fromEmail = '';
      }
    }
  }

  generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async sendVerificationCode(email: string, missionaryId: number): Promise<boolean> {
    if (!email.endsWith('@missionary.org')) {
      throw new Error('Email must end with @missionary.org');
    }

    const verificationCode = this.generateVerificationCode();
    
    // Store verification code in database
    await db.update(missionaries)
      .set({
        emailVerificationCode: verificationCode,
        emailVerificationSentAt: new Date(),
        emailVerified: false
      })
      .where(eq(missionaries.id, missionaryId));

    const subject = 'Verify Your Email - Missionary Meal Scheduler';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; text-align: center;">Email Verification</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0; color: #1e40af;">Your Verification Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; letter-spacing: 4px; font-family: monospace;">
            ${verificationCode}
          </div>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 14px;">
          Enter this 4-digit code in the application to verify your email address.
        </p>
        <p style="text-align: center; color: #64748b; font-size: 14px;">
          This code will expire in 10 minutes for security.
        </p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;

    if (!this.transporter) {
      console.log(`[EMAIL VERIFICATION SIMULATION] Sending verification code to ${email}:`);
      console.log(`Verification Code: ${verificationCode}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: subject,
        html: htmlContent
      });
      
      console.log(`Verification email sent successfully to ${email}`);
      return true;
    } catch (error: unknown) {
      console.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async verifyCode(missionaryId: number, code: string): Promise<boolean> {
    const [missionary] = await db.select()
      .from(missionaries)
      .where(eq(missionaries.id, missionaryId));

    if (!missionary) {
      throw new Error('Missionary not found');
    }

    if (!missionary.emailVerificationCode) {
      throw new Error('No verification code found');
    }

    // Check if code expired (10 minutes)
    if (missionary.emailVerificationSentAt) {
      const sentTime = new Date(missionary.emailVerificationSentAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - sentTime.getTime()) / (1000 * 60);
      
      if (diffMinutes > 10) {
        throw new Error('Verification code has expired');
      }
    }

    if (missionary.emailVerificationCode === code) {
      // Mark email as verified
      await db.update(missionaries)
        .set({
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationSentAt: null
        })
        .where(eq(missionaries.id, missionaryId));
      
      return true;
    }

    return false;
  }
}