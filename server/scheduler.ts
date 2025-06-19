import { TransferManagementService } from './transfer-management';

export class NotificationScheduler {
  private transferService: TransferManagementService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.transferService = new TransferManagementService();
  }

  start(): void {
    // Check for transfers every hour
    this.intervalId = setInterval(async () => {
      try {
        await this.transferService.checkAndNotifyTransfers();
      } catch (error) {
        console.error('Error checking transfer notifications:', error);
      }
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    console.log('Transfer notification scheduler started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Transfer notification scheduler stopped');
    }
  }
}

export const notificationScheduler = new NotificationScheduler();