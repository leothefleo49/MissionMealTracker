import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertMealSchema, 
  updateMealSchema, 
  checkMealAvailabilitySchema, 
  insertMissionarySchema,
  insertWardSchema,
  insertUserWardSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, createSuperAdminUser, comparePasswords, hashPassword } from "./auth";
import { notificationManager } from "./notifications";
import { EmailVerificationService } from "./email-verification";
import { TransferManagementService } from "./transfer-management";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  await createSuperAdminUser();

  // Initialize services
  const emailVerificationService = new EmailVerificationService();
  const transferService = new TransferManagementService();
  
  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
  };

  // Middleware to check if user is admin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }
    next();
  };
  
  // Middleware to check if user is superadmin
  const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isSuperAdmin) {
      return res.status(403).json({ message: 'Access denied: SuperAdmin privileges required' });
    }
    next();
  };
  
  // Helper for notifications
  const notifyMissionary = async (missionaryId: number, message: string) => {
    const missionary = await storage.getMissionary(missionaryId);
    if (!missionary) return false;
    
    // If this is SMS and the missionary hasn't granted consent, don't send the message
    if (missionary.preferredNotification === 'text' && missionary.consentStatus !== 'granted') {
      console.log(`Cannot send SMS to ${missionary.name}: Consent status is ${missionary.consentStatus}`);
      return false;
    }
    
    // For messenger, we assume consent policies are handled by the platform
    if (missionary.preferredNotification === 'messenger' && !missionary.messengerAccount) {
      console.log(`Cannot send messenger notification to ${missionary.name}: No messenger account provided`);
      return false;
    }
    
    // Use the notification manager to send the message
    try {
      const service = notificationManager.getServiceForMissionary(missionary);
      
      // Custom notification message (not a standard message type, so we use a generic method)
      return await notificationManager.sendCustomMessage(missionary, message, 'status_update');
    } catch (error) {
      console.error(`Failed to send notification to ${missionary.name}:`, error);
      return false;
    }
  };

  const notifyAdmin = async (message: string) => {
    // This would send notifications to the admin via a designated method
    console.log(`Admin notification: ${message}`);
    return true;
  };

  // Error handling middleware
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationError.details 
      });
    }
    
    console.error('API error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  };

  // API Routes
  // Get all missionaries
  app.get('/api/missionaries', async (req, res) => {
    try {
      const missionaries = await storage.getAllMissionaries();
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Get missionaries by type
  app.get('/api/missionaries/:typeOrId', async (req, res) => {
    try {
      const { typeOrId } = req.params;
      const wardId = parseInt(req.query.wardId as string, 10) || 1; // Default to ward 1 if not specified
      
      // Check if this is a missionary ID (numeric) or a type (elders/sisters)
      if (!isNaN(parseInt(typeOrId, 10))) {
        // This is a missionary ID
        const missionaryId = parseInt(typeOrId, 10);
        const missionary = await storage.getMissionary(missionaryId);
        
        if (!missionary) {
          return res.status(404).json({ message: 'Missionary not found' });
        }
        
        return res.json(missionary);
      } 
      
      // This is a missionary type
      if (typeOrId !== 'elders' && typeOrId !== 'sisters') {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }
      
      const missionaries = await storage.getMissionariesByType(typeOrId, wardId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });
  
  // Get missionaries by ward
  app.get('/api/admin/missionaries/ward/:wardId', requireAdmin, async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      // Check if user has access to this ward
      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const hasAccess = userWards.some(ward => ward.id === parsedWardId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }
      
      const missionaries = await storage.getMissionariesByWard(parsedWardId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries by ward:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Check meal availability
  app.post('/api/meals/check-availability', async (req, res) => {
    try {
      const data = checkMealAvailabilitySchema.parse(req.body);
      const date = new Date(data.date);
      const wardId = data.wardId || 1;  // Default to 1 if not provided
      
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, wardId);
      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Get meals by date range
  app.get('/api/meals', async (req, res) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      const meals = await storage.getMealsByDateRange(startDate, endDate);
      
      // Get missionaries to include their information
      const missionaries = await storage.getAllMissionaries();
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));
      
      const mealsWithMissionaries = meals.map(meal => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error('Error fetching meals:', err);
      res.status(500).json({ message: 'Failed to fetch meals' });
    }
  });

  // Get meals by host phone
  app.get('/api/meals/host/:phone', async (req, res) => {
    try {
      const { phone } = req.params;
      const meals = await storage.getUpcomingMealsByHostPhone(phone);
      
      // Get missionaries to include their information
      const missionaries = await storage.getAllMissionaries();
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));
      
      const mealsWithMissionaries = meals.map(meal => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error('Error fetching meals by host:', err);
      res.status(500).json({ message: 'Failed to fetch meals' });
    }
  });

  // Create a new meal
  app.post('/api/meals', async (req, res) => {
    try {
      const mealData = insertMealSchema.parse(req.body);
      
      // Verify the missionary exists
      const missionary = await storage.getMissionary(mealData.missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }
      
      // Check meal availability for this date and missionary
      const mealDate = new Date(mealData.date);
      const wardId = mealData.wardId || 1;
      const isAvailable = await storage.checkMealAvailability(mealDate, mealData.missionaryId.toString(), wardId);
      
      if (!isAvailable) {
        return res.status(409).json({ 
          message: `${missionary.name} is already booked for this date` 
        });
      }
      
      const meal = await storage.createMeal(mealData);
      
      // Format notification message
      const formattedDate = mealDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const notificationMessage = `New meal scheduled: ${formattedDate} at ${meal.startTime} with ${meal.hostName}. ` + 
        (meal.mealDescription ? `Menu: ${meal.mealDescription}` : '') +
        (meal.specialNotes ? ` Notes: ${meal.specialNotes}` : '');
      
      // Check if the missionary has consent to receive messages
      if (missionary.preferredNotification === 'text' && missionary.phoneNumber) {
        if (missionary.consentStatus === 'granted') {
          // If consent is granted, send the notification
          await notifyMissionary(meal.missionaryId, notificationMessage);
        } else if (missionary.consentStatus === 'pending') {
          // If consent is pending but verification token hasn't been sent OR was sent more than 24 hours ago
          // resend the verification request
          const shouldResendVerification = !missionary.consentVerificationSentAt || 
            (new Date().getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1000);
            
          if (shouldResendVerification) {
            // Generate a verification code
            const verificationCode = generateVerificationCode();
            
            // Update missionary with the verification token and timestamp
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: new Date(),
            });
            
            // Prepare consent message
            const consentMessage = 
              `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. ` +
              "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
            
            // Send the message using Twilio directly (bypassing consent checks since we're asking for consent)
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              // Fallback for development without Twilio
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        } else if (!missionary.consentStatus || missionary.consentStatus === 'denied') {
          // If consent hasn't been requested or was denied, send a new verification request
          // Generate a verification code
          const verificationCode = generateVerificationCode();
          
          // Update missionary with the verification token and timestamp
          await storage.updateMissionary(missionary.id, {
            consentVerificationToken: verificationCode,
            consentVerificationSentAt: new Date(),
            consentStatus: 'pending'
          });
          
          // Prepare consent message
          const consentMessage = 
            `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. ` +
            "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
          
          // Send the message using Twilio directly (bypassing consent checks since we're asking for consent)
          if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
            await notificationManager.smsService.twilioClient.messages.create({
              body: consentMessage,
              from: notificationManager.smsService.twilioPhoneNumber,
              to: missionary.phoneNumber
            });
            
            console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
          } else {
            // Fallback for development without Twilio
            console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
          }
        }
      } else if (missionary.preferredNotification === 'messenger' && missionary.messengerAccount) {
        // For messenger, we don't need explicit consent (this would depend on the platform's policies)
        await notifyMissionary(meal.missionaryId, notificationMessage);
      }
      
      res.status(201).json(meal);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Update a meal
  app.patch('/api/meals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const mealId = parseInt(id, 10);
      
      if (isNaN(mealId)) {
        return res.status(400).json({ message: 'Invalid meal ID' });
      }
      
      const existingMeal = await storage.getMeal(mealId);
      if (!existingMeal) {
        return res.status(404).json({ message: 'Meal not found' });
      }
      
      const updateData = updateMealSchema.parse({ id: mealId, ...req.body });
      const updatedMeal = await storage.updateMeal(updateData);
      
      if (updatedMeal) {
        // Get the missionary to check consent status
        const missionary = await storage.getMissionary(updatedMeal.missionaryId);
        
        if (updateData.cancelled) {
          // Send cancellation notification
          const mealDate = new Date(updatedMeal.date);
          const formattedDate = mealDate.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Try to notify the missionary (the function will check consent status)
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` +
            (updateData.cancellationReason ? `Reason: ${updateData.cancellationReason}` : '')
          );
          
          // Also notify admin about the cancellation
          await notifyAdmin(
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName} for ` +
            `missionary ${missionary ? missionary.name : `ID ${updatedMeal.missionaryId}`}. ` +
            (updateData.cancellationReason ? `Reason: ${updateData.cancellationReason}` : '')
          );
        } else {
          // Notify about the update
          const mealDate = new Date(updatedMeal.date);
          const formattedDate = mealDate.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Try to notify the missionary (the function will check consent status)
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal updated: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` +
            (updatedMeal.mealDescription ? `Menu: ${updatedMeal.mealDescription}` : '') +
            (updatedMeal.specialNotes ? ` Notes: ${updatedMeal.specialNotes}` : '')
          );
        }
        
        // If missionary exists and doesn't have consent, request it
        if (missionary && missionary.preferredNotification === 'text' && 
            missionary.phoneNumber && missionary.consentStatus !== 'granted') {
          // Only resend if consent verification hasn't been sent or was sent more than 24 hours ago
          const shouldResendVerification = !missionary.consentVerificationSentAt || 
            (new Date().getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1000);
            
          if (shouldResendVerification) {
            // Generate a verification code
            const verificationCode = generateVerificationCode();
            
            // Update missionary with the verification token and timestamp
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: new Date(),
              consentStatus: 'pending'
            });
            
            // Prepare consent message
            const consentMessage = 
              `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. ` +
              "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
            
            // Send the message using Twilio directly (bypassing consent checks since we're asking for consent)
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              // Fallback for development without Twilio
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        }
        
        res.json(updatedMeal);
      } else {
        res.status(404).json({ message: 'Meal not found' });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Cancel a meal
  app.post('/api/meals/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const mealId = parseInt(id, 10);
      
      if (isNaN(mealId)) {
        return res.status(400).json({ message: 'Invalid meal ID' });
      }
      
      const { reason } = req.body;
      const cancelledMeal = await storage.cancelMeal(mealId, reason);
      
      if (cancelledMeal) {
        // Get the missionary to check consent status
        const missionary = await storage.getMissionary(cancelledMeal.missionaryId);
        
        // Send cancellation notification
        const mealDate = new Date(cancelledMeal.date);
        const formattedDate = mealDate.toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Try to notify the missionary (the function will check consent status)
        await notifyMissionary(
          cancelledMeal.missionaryId,
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName}. ` +
          (reason ? `Reason: ${reason}` : '')
        );
        
        // Also notify admin
        await notifyAdmin(
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName} for ` +
          `missionary ${missionary ? missionary.name : `ID ${cancelledMeal.missionaryId}`}. ` +
          (reason ? `Reason: ${reason}` : '')
        );
        
        // If missionary exists and doesn't have consent, request it
        if (missionary && missionary.preferredNotification === 'text' && 
            missionary.phoneNumber && missionary.consentStatus !== 'granted') {
          // Only resend if consent verification hasn't been sent or was sent more than 24 hours ago
          const shouldResendVerification = !missionary.consentVerificationSentAt || 
            (new Date().getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1000);
            
          if (shouldResendVerification) {
            // Generate a verification code
            const verificationCode = generateVerificationCode();
            
            // Update missionary with the verification token and timestamp
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: new Date(),
              consentStatus: 'pending'
            });
            
            // Prepare consent message
            const consentMessage = 
              `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. ` +
              "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
            
            // Send the message using Twilio directly (bypassing consent checks since we're asking for consent)
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              // Fallback for development without Twilio
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        }
        
        res.json(cancelledMeal);
      } else {
        res.status(404).json({ message: 'Meal not found' });
      }
    } catch (err) {
      console.error('Error cancelling meal:', err);
      res.status(500).json({ message: 'Failed to cancel meal' });
    }
  });

  // Admin-only routes for managing missionaries
  app.post('/api/admin/missionaries', requireAdmin, async (req, res) => {
    try {
      const missionaryData = insertMissionarySchema.parse(req.body);
      const missionary = await storage.createMissionary(missionaryData);
      
      // Automatically send a consent request for new missionaries with phone numbers
      if (missionary.phoneNumber && missionary.preferredNotification === 'text') {
        try {
          // Generate a verification code
          const verificationCode = generateVerificationCode();
          
          // Update missionary with the verification token and timestamp
          await storage.updateMissionary(missionary.id, {
            consentVerificationToken: verificationCode,
            consentVerificationSentAt: new Date(),
          });
          
          // Fetch the updated missionary to get the verification token
          const updatedMissionary = await storage.getMissionary(missionary.id);
          if (updatedMissionary) {
            // Prepare consent message
            const consentMessage = 
              `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode} (example: YES ${verificationCode}). ` +
              "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
            
            // Send the message using Twilio directly (bypassing consent checks since we're asking for consent)
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: updatedMissionary.phoneNumber
              });
              
              console.log(`Consent verification sent to new missionary ${missionary.id} (${missionary.name})`);
            } else {
              // Fallback for development without Twilio
              console.log(`[SMS CONSENT REQUEST] Would send to ${updatedMissionary.phoneNumber}: ${consentMessage}`);
            }
          }
        } catch (consentErr) {
          console.error(`Error sending initial consent request to missionary ${missionary.id}:`, consentErr);
          // We don't fail the creation even if consent request fails - just log the error
        }
      }
      
      res.status(201).json(missionary);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch('/api/admin/missionaries/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: 'Invalid missionary ID' });
      }
      
      const existingMissionary = await storage.getMissionary(missionaryId);
      if (!existingMissionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      // If email address is being updated, mark as unverified
      if (req.body.emailAddress && req.body.emailAddress !== existingMissionary.emailAddress) {
        req.body.emailVerified = false;
        req.body.emailVerificationCode = null;
        req.body.emailVerificationSentAt = null;
      }
      
      const updatedMissionary = await storage.updateMissionary(missionaryId, req.body);
      
      if (updatedMissionary) {
        res.json(updatedMissionary);
      } else {
        res.status(404).json({ message: 'Missionary not found' });
      }
    } catch (err) {
      console.error('Error updating missionary:', err);
      res.status(500).json({ message: 'Failed to update missionary' });
    }
  });

  // Delete missionary endpoint
  app.delete('/api/missionaries/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: 'Invalid missionary ID' });
      }
      
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }
      
      // Delete all meals associated with this missionary first
      const meals = await storage.getMealsByMissionary(missionaryId);
      for (const meal of meals) {
        await storage.cancelMeal(meal.id, "Missionary deleted");
      }
      
      // Delete the missionary
      await storage.deleteMissionary(missionaryId);
      
      res.json({ message: 'Missionary deleted successfully' });
    } catch (err) {
      console.error('Error deleting missionary:', err);
      res.status(500).json({ message: 'Failed to delete missionary' });
    }
  });

  // Email verification routes
  app.post('/api/admin/missionaries/:id/send-verification', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: 'Invalid missionary ID' });
      }
      
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      if (!missionary.emailAddress) {
        return res.status(400).json({ message: 'No email address on file' });
      }

      if (!missionary.emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Email must end with @missionary.org' });
      }
      
      const success = await emailVerificationService.sendVerificationCode(
        missionary.emailAddress,
        missionaryId
      );
      
      if (success) {
        res.json({ message: 'Verification code sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send verification code' });
      }
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      res.status(400).json({ message: err.message || 'Failed to send verification code' });
    }
  });

  app.post('/api/admin/missionaries/:id/verify-email', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { code } = req.body;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: 'Invalid missionary ID' });
      }

      if (!code || code.length !== 4) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      
      const success = await emailVerificationService.verifyCode(missionaryId, code);
      
      if (success) {
        res.json({ message: 'Email verified successfully' });
      } else {
        res.status(400).json({ message: 'Invalid or expired verification code' });
      }
    } catch (err: any) {
      console.error('Error verifying email:', err);
      res.status(400).json({ message: err.message || 'Verification failed' });
    }
  });

  // Missionary portal authentication
  app.post('/api/missionary-portal/authenticate', async (req, res) => {
    try {
      const { accessCode, emailAddress, password } = req.body;
      
      if (!accessCode || !emailAddress || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get ward by access code
      const ward = await storage.getWardByAccessCode(accessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid access code' });
      }
      
      // Get missionary by email
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.wardId !== ward.id) {
        return res.status(401).json({ authenticated: false });
      }
      
      // Check if missionary has a password set
      if (!missionary.password) {
        return res.status(401).json({ authenticated: false, message: 'Password not set. Please register first.' });
      }
      
      // Verify password
      const isValidPassword = await comparePasswords(password, missionary.password);
      if (!isValidPassword) {
        return res.status(401).json({ authenticated: false });
      }
      
      res.json({ authenticated: true, missionary: { id: missionary.id, name: missionary.name } });
    } catch (error) {
      console.error('Missionary portal authentication error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Missionary registration for portal access
  app.post('/api/missionaries/register', async (req, res) => {
    try {
      const { name, type, emailAddress, wardAccessCode, password } = req.body;
      
      if (!name || !type || !emailAddress || !wardAccessCode || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      if (!emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Email must be a @missionary.org address' });
      }
      
      // Get ward by access code
      const ward = await storage.getWardByAccessCode(wardAccessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid ward access code' });
      }
      
      // Check if missionary with this email already exists
      const existingMissionary = await storage.getMissionaryByEmail(emailAddress);
      if (existingMissionary) {
        // If missionary exists but has no password, update with password
        if (!existingMissionary.password) {
          const hashedPassword = await hashPassword(password);
          const updatedMissionary = await storage.updateMissionary(existingMissionary.id, {
            password: hashedPassword
          });
          
          // Send verification email
          const success = await emailVerificationService.sendVerificationCode(
            emailAddress,
            existingMissionary.id
          );
          
          if (success) {
            res.json({ 
              message: 'Registration successful. Verification email sent.',
              missionaryId: existingMissionary.id 
            });
          } else {
            res.status(500).json({ message: 'Failed to send verification email' });
          }
        } else {
          return res.status(409).json({ message: 'Missionary already registered with this email' });
        }
      } else {
        // Create new missionary
        const hashedPassword = await hashPassword(password);
        const missionary = await storage.createMissionary({
          name,
          type,
          emailAddress,
          wardId: ward.id,
          phoneNumber: '', // Will be updated later
          password: hashedPassword,
          active: true,
          preferredNotification: 'email'
        });
        
        // Send verification email
        const success = await emailVerificationService.sendVerificationCode(
          emailAddress,
          missionary.id
        );
        
        if (success) {
          res.json({ 
            message: 'Registration successful. Verification email sent.',
            missionaryId: missionary.id 
          });
        } else {
          res.status(500).json({ message: 'Failed to send verification email' });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Verify missionary email
  app.post('/api/missionaries/verify', async (req, res) => {
    try {
      const { missionaryId, verificationCode } = req.body;
      
      if (!missionaryId || !verificationCode) {
        return res.status(400).json({ message: 'Missionary ID and verification code are required' });
      }
      
      const success = await emailVerificationService.verifyCode(missionaryId, verificationCode);
      
      if (success) {
        res.json({ message: 'Email verified successfully' });
      } else {
        res.status(400).json({ message: 'Invalid or expired verification code' });
      }
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Ward leave/rejoin functionality
  app.post('/api/wards/:wardId/leave', requireAuth, async (req, res) => {
    try {
      const { wardId } = req.params;
      const userId = req.user!.id;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      const success = await storage.removeUserFromWard(userId, parsedWardId);
      
      if (success) {
        res.json({ message: 'Successfully left the ward' });
      } else {
        res.status(404).json({ message: 'Ward not found or user not a member' });
      }
    } catch (error) {
      console.error('Error leaving ward:', error);
      res.status(500).json({ message: 'Failed to leave ward' });
    }
  });

  app.post('/api/wards/:accessCode/rejoin', requireAuth, async (req, res) => {
    try {
      const { accessCode } = req.params;
      const userId = req.user!.id;
      
      const ward = await storage.getWardByAccessCode(accessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid access code' });
      }
      
      // Check if user is already a member
      const userWards = await storage.getUserWards(userId);
      const isAlreadyMember = userWards.some(uw => uw.id === ward.id);
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: 'Already a member of this ward' });
      }
      
      await storage.addUserToWard({ userId, wardId: ward.id });
      res.json({ message: 'Successfully rejoined the ward', ward });
    } catch (error) {
      console.error('Error rejoining ward:', error);
      res.status(500).json({ message: 'Failed to rejoin ward' });
    }
  });

  // Admin dashboard statistics
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get wardId from query parameter, defaults to user's wards if not provided
      const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;
      
      // Validate ward access if wardId is provided
      if (wardId) {
        // Get user's wards
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);
        
        // Check if user has access to this ward or is superadmin
        if (!req.user!.isSuperAdmin && !userWardIds.includes(wardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }
      
      // Get meals for this month and optionally filtered by ward
      const meals = await storage.getMealsByDateRange(startOfMonth, endOfMonth, wardId);
      
      // Get all missionaries, optionally filtered by ward
      const missionaries = wardId 
        ? await storage.getMissionariesByWard(wardId)
        : await storage.getAllMissionaries();
      
      const stats = {
        totalMissionaries: missionaries.length,
        activeMissionaries: missionaries.filter(m => m.active).length,
        totalMealsThisMonth: meals.length,
        eldersBookings: meals.filter(meal => {
          const missionary = missionaries.find(m => m.id === meal.missionaryId);
          return missionary && missionary.type === 'elders';
        }).length,
        sistersBookings: meals.filter(meal => {
          const missionary = missionaries.find(m => m.id === meal.missionaryId);
          return missionary && missionary.type === 'sisters';
        }).length,
        cancelledMeals: meals.filter(m => m.cancelled).length
      };
      
      res.json(stats);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });
  
  // Ward Management Routes (SuperAdmin only)
  app.get('/api/admin/wards', requireAdmin, async (req, res) => {
    try {
      let wards;
      
      // If super admin, get all wards
      if (req.user!.isSuperAdmin) {
        wards = await storage.getAllWards();
      } else {
        // Regular admin can only see their wards
        wards = await storage.getUserWards(req.user!.id);
      }
      
      res.json(wards);
    } catch (err) {
      console.error('Error fetching wards:', err);
      res.status(500).json({ message: 'Failed to fetch wards' });
    }
  });
  
  // Create new ward (SuperAdmin only)
  app.post('/api/admin/wards', requireSuperAdmin, async (req, res) => {
    try {
      const wardData = insertWardSchema.parse(req.body);
      const ward = await storage.createWard(wardData);
      res.status(201).json(ward);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Update ward (SuperAdmin only)
  app.patch('/api/admin/wards/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const wardId = parseInt(id, 10);
      
      if (isNaN(wardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      const existingWard = await storage.getWard(wardId);
      if (!existingWard) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      const updatedWard = await storage.updateWard(wardId, req.body);
      
      if (updatedWard) {
        res.json(updatedWard);
      } else {
        res.status(404).json({ message: 'Ward not found' });
      }
    } catch (err) {
      console.error('Error updating ward:', err);
      res.status(500).json({ message: 'Failed to update ward' });
    }
  });
  
  // Add user to ward (Admin only)
  app.post('/api/admin/wards/:wardId/users', requireAdmin, async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      // Check if user is superadmin or has access to this ward
      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);
        
        if (!userWardIds.includes(parsedWardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }
      
      // Validate request body
      const { userId } = req.body;
      if (!userId || isNaN(parseInt(userId, 10))) {
        return res.status(400).json({ message: 'Valid userId is required' });
      }
      
      // Add user to ward
      const userWard = await storage.addUserToWard({ 
        userId: parseInt(userId, 10), 
        wardId: parsedWardId 
      });
      
      res.status(201).json(userWard);
    } catch (err) {
      console.error('Error adding user to ward:', err);
      res.status(500).json({ message: 'Failed to add user to ward' });
    }
  });
  
  // Remove user from ward (Admin only)
  app.delete('/api/admin/wards/:wardId/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { wardId, userId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      const parsedUserId = parseInt(userId, 10);
      
      if (isNaN(parsedWardId) || isNaN(parsedUserId)) {
        return res.status(400).json({ message: 'Invalid ward ID or user ID' });
      }
      
      // Check if user is superadmin or has access to this ward
      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);
        
        if (!userWardIds.includes(parsedWardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }
      
      // Remove user from ward
      const success = await storage.removeUserFromWard(parsedUserId, parsedWardId);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'User-ward relationship not found' });
      }
    } catch (err) {
      console.error('Error removing user from ward:', err);
      res.status(500).json({ message: 'Failed to remove user from ward' });
    }
  });
  
  // Public access to ward by access code
  app.get('/api/wards/:accessCode', async (req, res) => {
    try {
      const { accessCode } = req.params;
      
      if (!accessCode || accessCode.length < 10) {
        return res.status(400).json({ message: 'Invalid access code' });
      }
      
      const ward = await storage.getWardByAccessCode(accessCode);
      
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      if (!ward.active) {
        return res.status(403).json({ message: 'This ward is no longer active' });
      }
      
      // Return basic ward info without sensitive data
      res.json({
        id: ward.id,
        name: ward.name,
        accessCode: ward.accessCode
      });
    } catch (err) {
      console.error('Error accessing ward by code:', err);
      res.status(500).json({ message: 'Failed to access ward' });
    }
  });
  
  // Get all missionaries for a specific ward
  app.get('/api/wards/:wardId/missionaries', async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      const ward = await storage.getWard(parsedWardId);
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      if (!ward.active) {
        return res.status(403).json({ message: 'This ward is no longer active' });
      }
      
      const missionaries = await storage.getMissionariesByWard(parsedWardId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries for ward:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });
  
  // Get missionaries by ward and type for the meal calendar
  app.get('/api/wards/:wardId/missionaries/:type', async (req, res) => {
    try {
      const { wardId, type } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      if (type !== 'elders' && type !== 'sisters') {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }
      
      const missionaries = await storage.getMissionariesByType(type, parsedWardId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries by ward and type:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });
  
  // Get all meals for a specific ward
  app.get('/api/wards/:wardId/meals', async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      const meals = await storage.getMealsByDateRange(startDate, endDate, parsedWardId);
      
      // Get missionaries to include their information
      const missionaries = await storage.getMissionariesByWard(parsedWardId);
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));
      
      const mealsWithMissionaries = meals.map(meal => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error('Error fetching meals by ward:', err);
      res.status(500).json({ message: 'Failed to fetch meals' });
    }
  });
  
  // Check meal availability for a specific ward
  app.post('/api/wards/:wardId/meals/check-availability', async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      
      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      const data = checkMealAvailabilitySchema.parse({
        ...req.body,
        wardId: parsedWardId
      });
      
      const date = new Date(data.date);
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, parsedWardId);
      
      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Message statistics API route
  app.get('/api/message-stats', requireAdmin, async (req, res) => {
    try {
      const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
      
      let stats;
      if (wardId) {
        // If user is not super admin, verify they have access to this ward
        if (!req.user!.isSuperAdmin) {
          const userWards = await storage.getUserWards(req.user!.id);
          const hasAccess = userWards.some(ward => ward.id === wardId);
          
          if (!hasAccess) {
            return res.status(403).json({ message: 'You do not have access to this ward' });
          }
        }
        
        stats = await notificationManager.getWardMessageStats(wardId);
      } else {
        // If not super admin, return error since regular admins can only see their wards
        if (!req.user!.isSuperAdmin) {
          return res.status(403).json({ message: 'Access to all stats requires super admin privileges' });
        }
        
        stats = await notificationManager.getMessageStats();
      }
      
      res.json(stats);
    } catch (err) {
      console.error('Error fetching message statistics:', err);
      res.status(500).json({ message: 'Failed to fetch message statistics' });
    }
  });
  
  // Test message endpoint
  app.post("/api/admin/test-message", requireAdmin, async (req, res) => {
    try {
      const {
        contactInfo,
        notificationMethod,
        messageType,
        customMessage,
        mealDetails,
        schedulingOption,
        scheduledDate,
        scheduledTime,
        wardId
      } = req.body;
      
      // Basic validation
      if (!contactInfo) {
        return res.status(400).json({ message: "Contact information is required" });
      }
      
      if (!notificationMethod || !["email", "whatsapp"].includes(notificationMethod)) {
        return res.status(400).json({ message: "Valid notification method (email or whatsapp) is required" });
      }
      
      if (messageType === "custom" && !customMessage) {
        return res.status(400).json({ message: "Message text is required for custom messages" });
      }
      
      // For scheduled messages, we need both date and time
      if (schedulingOption === "scheduled" && (!scheduledDate || !scheduledTime)) {
        return res.status(400).json({ message: "Date and time are required for scheduled messages" });
      }
      
      // Get the target ward
      const ward = await storage.getWard(wardId);
      if (!ward) {
        return res.status(404).json({ message: "Ward not found" });
      }
      
      // Check if user is admin of this ward
      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const hasAccess = userWards.some(w => w.id === wardId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied for this ward' });
        }
      }
      
      // Set up test missionary data for notification tracking
      console.log(`Test message: using contact info ${contactInfo}`);
      
      // First try to find an existing test missionary for this ward
      let testMissionary = await storage.getMissionaryByName(wardId, "Test Missionary");
      
      // If no test missionary exists for this ward, create one
      if (!testMissionary) {
        try {
          const insertTestMissionary = {
            name: "Test Missionary",
            type: "elders" as const,
            phoneNumber: notificationMethod === "whatsapp" ? contactInfo : "+15551234567",
            emailAddress: notificationMethod === "email" ? contactInfo : "test@missionary.org",
            whatsappNumber: notificationMethod === "whatsapp" ? contactInfo : null,
            preferredNotification: notificationMethod as "email" | "whatsapp",
            active: true,
            notificationScheduleType: "before_meal",
            hoursBefore: 3,
            dayOfTime: "08:00",
            weeklySummaryDay: "monday",
            weeklySummaryTime: "08:00",
            wardId,
            consentStatus: 'granted',
            consentDate: new Date(),
            consentVerificationToken: null,
            consentVerificationSentAt: null,
            dietaryRestrictions: "",
            messengerAccount: "",
            emailVerified: notificationMethod === "email"
          };
          
          testMissionary = await storage.createMissionary(insertTestMissionary);
          console.log(`Created new test missionary with ID: ${testMissionary.id}`);
        } catch (error) {
          console.error("Failed to create test missionary:", error);
          return res.status(500).json({ message: "Failed to create test missionary" });
        }
      } else {
        console.log(`Using existing test missionary with ID: ${testMissionary.id}`);
      }
      
      const mockMissionary = testMissionary;
      
      // Set up mock meal
      const mockMeal = mealDetails ? {
        id: 999999, // Use a very unlikely ID to avoid collisions
        date: mealDetails.date || new Date().toISOString().split('T')[0],
        startTime: mealDetails.startTime || "17:30",
        hostName: mealDetails.hostName || "Test Host",
        hostPhone: notificationMethod === "whatsapp" ? contactInfo : "+15551234567",
        hostEmail: "test@example.com",
        mealDescription: mealDetails.mealDescription || "Test meal",
        specialNotes: mealDetails.specialNotes || "",
        missionaryId: testMissionary.id, // Use the actual missionary ID for proper logging
        missionary: { type: "elders", name: "Test Missionary" },
        status: "confirmed",
        wardId,
        createdAt: new Date(),
        updatedAt: new Date()
      } : null;
      
      // Handle different message types
      let result = false;
      
      // Gmail and WhatsApp don't require SMS consent - proceed directly with test message
      console.log(`Test message will be sent via ${notificationMethod} to ${contactInfo}`);
      
      // For scheduled messages, add to a queue (just mock this for now)
      if (schedulingOption === "scheduled") {
        console.log(`Test message scheduled for ${scheduledDate} at ${scheduledTime}`);
        result = true;
      } else {
        // Send immediate message
        switch (messageType) {
          case "meal_reminder":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for meal reminders" });
            }
            result = await notificationManager.sendMealReminder(mockMissionary as any, mockMeal as any);
            break;
            
          case "day_of":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for day-of reminders" });
            }
            result = await notificationManager.sendDayOfReminder(mockMissionary as any, [mockMeal as any]);
            break;
            
          case "weekly_summary":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for weekly summaries" });
            }
            result = await notificationManager.sendWeeklySummary(mockMissionary as any, [mockMeal as any]);
            break;
            
          case "custom":
            // For custom messages, we'd need to extend the notification system
            // For now, use the sendMealReminder with a modified meal object
            if (!customMessage) {
              // If mockMeal is available, we can use that as a fallback instead of failing
              if (mockMeal) {
                result = await notificationManager.sendMealReminder(mockMissionary as any, mockMeal as any);
              } else {
                return res.status(400).json({ message: "Message text is required for custom messages" });
              }
            } else {
              try {
                const customMeal = {
                  ...mockMeal,
                  mealDescription: customMessage,
                  specialNotes: "",
                };
                
                result = await notificationManager.sendMealReminder(mockMissionary as any, customMeal as any);
              } catch (error) {
                console.error("Error sending custom test message:", error);
                result = false;
              }
            }
            break;
            
          default:
            return res.status(400).json({ message: "Invalid message type" });
        }
      }
      
      if (result) {
        res.status(200).json({ success: true, message: "Test message sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test message" });
      }
    } catch (error) {
      console.error("Test message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Utility function to generate a random 6-digit verification code
  function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send consent request message to a missionary
  app.post("/api/missionaries/:id/request-consent", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      
      // Generate a verification code
      const verificationCode = generateVerificationCode();
      
      // Update missionary with the verification token and timestamp
      await storage.updateMissionary(missionaryId, {
        consentVerificationToken: verificationCode,
        consentVerificationSentAt: new Date(),
        consentStatus: 'pending'
      });
      
      // We can use the actual missionary as test message tracking will now work properly
      const testMissionary = missionary;
      
      // Prepare consent message
      const consentMessage = 
        `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode} (example: YES ${verificationCode}). ` +
        "Reply STOP at any time to opt out of messages. Msg & data rates may apply.";
      
      // Send the message without checking consent status (since we're asking for consent)
      // We're using a custom message directly to bypass consent checks
      let success = false;
      
      try {
        if (testMissionary.preferredNotification === 'messenger' && testMissionary.messengerAccount) {
          // For messenger notifications
          console.log(`[MESSENGER CONSENT REQUEST] Sending to ${testMissionary.messengerAccount}: ${consentMessage}`);
          success = true;
        } else {
          // For SMS notifications - using Twilio client directly to bypass consent checks
          if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
            await notificationManager.smsService.twilioClient.messages.create({
              body: consentMessage,
              from: notificationManager.smsService.twilioPhoneNumber,
              to: testMissionary.phoneNumber
            });
            success = true;
          } else {
            // Fallback for development without Twilio
            console.log(`[SMS CONSENT REQUEST] Sending to ${testMissionary.phoneNumber}: ${consentMessage}`);
            success = true;
          }
        }
      } catch (error) {
        console.error("Failed to send consent request:", error);
        success = false;
      }
      
      if (success) {
        res.json({ message: "Consent request sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send consent request" });
      }
    } catch (err) {
      console.error("Error requesting consent:", err);
      res.status(500).json({ message: "Failed to request consent" });
    }
  });

  // Endpoint for Twilio webhook to receive message responses
  app.post("/api/sms/webhook", async (req, res) => {
    try {
      // Extract the message content and sender phone number
      const { Body: messageBody, From: fromNumber } = req.body;
      
      if (!messageBody || !fromNumber) {
        return res.status(200).send("<Response></Response>");
      }
      
      // Clean up the phone number (Twilio sends it with a + prefix)
      const phoneNumber = fromNumber.replace(/\s+/g, "");
      
      console.log(`Received SMS from: ${phoneNumber}, body: ${messageBody}`);
      
      // Try to find the missionary by phone number - add logging for diagnosis
      const missionaries = await storage.getAllMissionaries();
      console.log(`Found ${missionaries.length} missionaries in the database`);
      
      // Log all missionary phone numbers for debugging
      missionaries.forEach(m => {
        console.log(`Missionary ${m.id} (${m.name}): phone=${m.phoneNumber}`);
      });
      
      // Try both exact match and normalized match (removing + prefix for better compatibility)
      let missionary = missionaries.find(m => m.phoneNumber === phoneNumber);
      
      // If not found with exact match, try alternative formats
      if (!missionary) {
        console.log("Missionary not found with exact phone number match, trying alternative formats...");
        
        // Try without the + prefix
        const numberWithoutPlus = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
        missionary = missionaries.find(m => 
          m.phoneNumber === numberWithoutPlus || 
          (m.phoneNumber.startsWith('+') && m.phoneNumber.substring(1) === numberWithoutPlus)
        );
        
        if (missionary) {
          console.log(`Found missionary ${missionary.id} using alternative phone format matching`);
        }
      }
      
      if (!missionary) {
        return res.status(200).send("<Response></Response>");
      }
      
      // Check if this is a consent response
      const message = messageBody.trim().toLowerCase();
      
      console.log(`Processing message: "${message}"`);
      console.log(`Missionary ${missionary.id} verification token: ${missionary.consentVerificationToken}`);
      
      // Accept both formats: "YES code" and "yes code" for better user experience
      if (message.startsWith("yes ") || message.startsWith("YES ")) {
        console.log("Detected potential consent response");
        const parts = messageBody.trim().split(" ");
        if (parts.length >= 2) {
          const code = parts[1];
          console.log(`Verification code received: ${code}`);
          
          // Verify the code matches the one we sent
          if (code === missionary.consentVerificationToken) {
            console.log("Verification code matches! Granting consent.");
            // Update missionary consent status
            await storage.updateMissionary(missionary.id, {
              consentStatus: 'granted',
              consentDate: new Date()
            });
            
            // Send confirmation
            const confirmMessage = "Thank you! You have successfully opted in to receive meal notifications. Reply STOP at any time to opt out.";
            
            // Use the actual missionary for sending confirmation messages
            const testMissionary = missionary;
            
            try {
              if (testMissionary.preferredNotification === 'messenger' && testMissionary.messengerAccount) {
                console.log(`[MESSENGER CONFIRMATION] Sending to ${testMissionary.messengerAccount}: ${confirmMessage}`);
              } else {
                // Use Twilio client directly to bypass consent checks (we just received consent)
                if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
                  await notificationManager.smsService.twilioClient.messages.create({
                    body: confirmMessage,
                    from: notificationManager.smsService.twilioPhoneNumber,
                    to: testMissionary.phoneNumber
                  });
                } else {
                  console.log(`[SMS CONFIRMATION] Sending to ${testMissionary.phoneNumber}: ${confirmMessage}`);
                }
              }
            } catch (error) {
              console.error("Failed to send confirmation message:", error);
            }
            
            return res.status(200).send("<Response></Response>");
          }
        }
      } 
      else if (message === "stop" || message === "unsubscribe" || message === "cancel") {
        // Handle opt-out requests
        await storage.updateMissionary(missionary.id, {
          consentStatus: 'denied',
          consentDate: new Date()
        });
        
        return res.status(200).send("<Response></Response>");
      }
      
      // For all other messages, just acknowledge
      return res.status(200).send("<Response></Response>");
    } catch (err) {
      console.error("Error handling SMS webhook:", err);
      return res.status(200).send("<Response></Response>");
    }
  });
  
  // Get consent status for a missionary
  app.get("/api/missionaries/:id/consent-status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      
      res.json({
        missionaryId: missionary.id,
        name: missionary.name,
        consentStatus: missionary.consentStatus,
        consentDate: missionary.consentDate,
        consentVerificationSentAt: missionary.consentVerificationSentAt
      });
    } catch (err) {
      console.error("Error fetching consent status:", err);
      res.status(500).json({ message: "Failed to fetch consent status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
