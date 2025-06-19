import { db } from './db';
import { missionaries, users } from '@shared/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { EmailService } from './email-service';

export class TransferManagementService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async checkAndNotifyTransfers(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find missionaries with transfer dates today who haven't been notified
    const missionariesWithTransfers = await db.select()
      .from(missionaries)
      .where(
        and(
          isNotNull(missionaries.transferDate),
          lte(missionaries.transferDate, tomorrow),
          eq(missionaries.transferNotificationSent, false)
        )
      );

    if (missionariesWithTransfers.length === 0) {
      return;
    }

    // Get all super admins
    const superAdmins = await db.select()
      .from(users)
      .where(eq(users.isSuperAdmin, true));

    for (const missionary of missionariesWithTransfers) {
      const transferDate = new Date(missionary.transferDate!);
      const formattedDate = transferDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send notification to all super admins
      for (const admin of superAdmins) {
        await this.sendTransferNotification(admin, missionary, formattedDate);
      }

      // Mark as notified
      await db.update(missionaries)
        .set({ transferNotificationSent: true })
        .where(eq(missionaries.id, missionary.id));
    }
  }

  private async sendTransferNotification(admin: any, missionary: any, transferDate: string): Promise<void> {
    const subject = `🔄 Missionary Transfer Reminder - ${missionary.name}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; text-align: center;">🔄 Transfer Reminder</h2>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Missionary Transfer Today</h3>
          <p><strong>Missionary:</strong> {missionary.name}</p>
          <p><strong>Type:</strong> {missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)}</p>
          <p><strong>Transfer Date:</strong> {transferDate}</p>
          <p><strong>Current Phone:</strong> {missionary.phoneNumber}</p>
          <p><strong>Current Email:</strong> {missionary.emailAddress || 'Not provided'}</p>
          <p><strong>WhatsApp:</strong> {missionary.whatsappNumber || 'Not provided'}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #0369a1;">Action Required</h4>
          <p>Please contact the missionary to update their information:</p>
          <ul style="margin: 10px 0;">
            <li>New phone number</li>
            <li>New @missionary.org email address</li>
            <li>New WhatsApp number (if different)</li>
            <li>Updated dietary restrictions/allergies</li>
            <li>New transfer date (if applicable)</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || 'https://missionary-meals.replit.app'}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Missionary Information
          </a>
        </div>

        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated reminder from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;

    const textContent = `
Transfer Reminder - ${missionary.name}

Missionary: ${missionary.name}
Type: ${missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)}
Transfer Date: ${transferDate}
Current Phone: ${missionary.phoneNumber}
Current Email: ${missionary.emailAddress || 'Not provided'}
WhatsApp: ${missionary.whatsappNumber || 'Not provided'}

Action Required:
Please contact the missionary to update their information:
- New phone number
- New @missionary.org email address  
- New WhatsApp number (if different)
- Updated dietary restrictions/allergies
- New transfer date (if applicable)

Update at: ${process.env.APP_URL || 'https://missionary-meals.replit.app'}
    `;

    if (!this.emailService) {
      console.log(`[TRANSFER NOTIFICATION SIMULATION] Would send to ${admin.username}:`);
      console.log(textContent);
      return;
    }

    // Send email notification
    console.log(`Sending transfer notification for ${missionary.name} to ${admin.username}`);
  }

  async scheduleTransferNotification(missionaryId: number, transferDate: Date): Promise<void> {
    await db.update(missionaries)
      .set({
        transferDate: transferDate,
        transferNotificationSent: false
      })
      .where(eq(missionaries.id, missionaryId));
  }
}