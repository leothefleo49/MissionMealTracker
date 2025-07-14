// server/scheduler.ts
import { TransferManagementService } from './transfer-management';
import { storage } from './storage'; // Import the storage module
import cron from 'node-cron'; // Import node-cron

export class NotificationScheduler {
private transferService: TransferManagementService;
private intervalId: NodeJS.Timeout | null = null;
private missionaryCleanupJob: cron.ScheduledTask | null = null; // Declare a property for the cron job

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

// NEW: Schedule missionary cleanup job
// This job will run once every day at 2:00 AM (local time)
this.missionaryCleanupJob = cron.schedule('0 2 * * *', async () => { // "0 2 * * *" means "at 02:00 every day"
  console.log('Running daily missionary cleanup job...');
  try {
    const monthsToDelete = 25; // As per the requirement
    const missionariesToDelete = await storage.getInactiveMissionariesOlderThan(monthsToDelete);

    if (missionariesToDelete.length > 0) {
      console.log(`Found ${missionariesToDelete.length} inactive missionaries older than ${monthsToDelete} months for permanent deletion.`);
      for (const missionary of missionariesToDelete) {
        console.log(`Permanently deleting missionary: ${missionary.name} (ID: ${missionary.id})`);
        await storage.permanentlyDeleteMissionary(missionary.id);
      }
      console.log('Missionary cleanup job completed successfully.');
    } else {
      console.log('No inactive missionaries found for permanent deletion.');
    }
  } catch (error) {
    console.error('Error during missionary cleanup job:', error);
  }
}, {
  scheduled: true,
  timezone: "America/Chicago" // Use Central Time Zone (CDT/CST) or adjust as needed
});

console.log('Missionary cleanup scheduler started, runs daily at 2:00 AM CST/CDT.');
}

stop(): void {
if (this.intervalId) {
clearInterval(this.intervalId);
this.intervalId = null;
console.log('Transfer notification scheduler stopped');
}
if (this.missionaryCleanupJob) {
this.missionaryCleanupJob.stop();
this.missionaryCleanupJob = null;
console.log('Missionary cleanup scheduler stopped');
}
}
}

export const notificationScheduler = new NotificationScheduler();