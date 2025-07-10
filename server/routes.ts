// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertMealSchema,
  updateMealSchema,
  checkMealAvailabilitySchema,
  insertMissionarySchema,
  insertCongregationSchema,
  insertUserCongregationSchema,
  insertRegionSchema,
  insertMissionSchema,
  type InsertUser
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, checkAndSetSetupMode, comparePasswords, hashPassword, isSetupMode, setSetupMode } from "./auth";
import { notificationManager } from "./notifications";
import { EmailVerificationService } from "./email-verification";
import { TransferManagementService } from "./transfer-management";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  await checkAndSetSetupMode();

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

  // Middleware to check if user is an admin (any level)
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !['ultra', 'region', 'mission', 'stake', 'ward'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }
    next();
  };

  // Middleware to check if user is superadmin (ultra, region, mission, stake)
  const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !['ultra', 'region', 'mission', 'stake'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: SuperAdmin privileges required' });
    }
    next();
  };

  const requireUltraAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || req.user.role !== 'ultra') {
      return res.status(403).json({ message: 'Access denied: Ultra Admin privileges required' });
    }
    next();
  };

  // New endpoint to check if the application is in setup mode
  app.get('/api/auth/is-setup', (req, res) => {
    res.json({ isSetupMode });
  });

  // New endpoint to create the first admin user during setup
    app.post('/api/auth/setup', async (req, res, next) => {
        console.log("--- START ADMIN SETUP ATTEMPT ---");
        console.log(`Current setup mode: ${isSetupMode}`);
        if (!isSetupMode) {
            console.log("Application is NOT in setup mode. Blocking setup request (HTTP 403).");
            console.log("--- END ADMIN SETUP ATTEMPT (BLOCKED) ---");
            return res.status(403).json({ message: 'Application is not in setup mode' });
        }
        try {
            const { username, password } = req.body;
            console.log(`Received setup request for username: '${username}'`);
            if (!username || !password) {
                console.log("Username or password missing (HTTP 400).");
                console.log("--- END ADMIN SETUP ATTEMPT (FAILED) ---");
                return res.status(400).json({ message: 'Username and password are required' });
            }

            console.log("Hashing password...");
            const hashedPassword = await hashPassword(password);
            console.log("Password hashed successfully.");
            const userToInsert: InsertUser = {
                username,
                password: hashedPassword,
                role: 'ultra',
                // Defaulting other optional fields to null or false
                regionId: null,
                missionId: null,
                stakeId: null,
                canUsePaidNotifications: false,
            };

            console.log(`Attempting to create user '${username}' in database...`);
            const user = await storage.createUser(userToInsert);
            console.log(`User created successfully with ID: ${user.id}, Username: '${user.username}', Role: '${user.role}'`);

            // Exit setup mode
            setSetupMode(false);
            console.log("Setup mode set to false.");

            // Log the new user in
            req.login(user, (err) => {
                if (err) {
                    console.error("Error logging in new user:", err);
                    console.log("--- END ADMIN SETUP ATTEMPT (LOGIN FAILED) ---");
                    return next(err); // Pass error to Express error handler
                }
                console.log(`User '${user.username}' logged in successfully. Sending 201 response.`);
                res.status(201).json({
                    id: user.id,
                    username: user.username,
                    role: user.role,
                });
                console.log("--- END ADMIN SETUP ATTEMPT (SUCCESS) ---");
            });
        } catch (error: any) {
            console.error("Error during setup (catch block):", error);
            // Check for duplicate key error (e.g., if ultra admin already exists from a previous failed attempt)
            if (error.code === '23505' && error.detail && error.detail.includes('username')) { // PostgreSQL unique violation error code
                console.log("Duplicate username detected (HTTP 409).");
                res.status(409).json({ message: 'Username already exists. An admin account might already be created, or the username is taken.' });
            } else {
                console.log(`Generic error during setup: ${error.message} (HTTP 500).`);
                res.status(500).json({ message: error.message || 'Failed to create admin user due to an unexpected error.' });
            }
            console.log("--- END ADMIN SETUP ATTEMPT (FAILED) ---");
        }
    });

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

  // Regions API Routes
  app.get('/api/regions', requireAdmin, async (req, res) => {
    try {
      const regions = await storage.getAllRegions();
      res.json(regions);
    } catch (err) {
      console.error('Error fetching regions:', err);
      res.status(500).json({ message: 'Failed to fetch regions' });
    }
  });

  app.post('/api/regions', requireUltraAdmin, async (req, res) => {
    try {
      const regionData = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(regionData);
      res.status(201).json(region);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch('/api/regions/:id', requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const regionId = parseInt(id, 10);
      if (isNaN(regionId)) {
        return res.status(400).json({ message: 'Invalid region ID' });
      }
      const regionData = insertRegionSchema.partial().parse(req.body);
      const updatedRegion = await storage.updateRegion(regionId, regionData);
      if (updatedRegion) {
        res.json(updatedRegion);
      } else {
        res.status(404).json({ message: 'Region not found' });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete('/api/regions/:id', requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const regionId = parseInt(id, 10);
      if (isNaN(regionId)) {
        return res.status(400).json({ message: 'Invalid region ID' });
      }
      const success = await storage.deleteRegion(regionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'Region not found' });
      }
    } catch (err) {
      console.error('Error deleting region:', err);
      res.status(500).json({ message: 'Failed to delete region' });
    }
  });

  // Missions API Routes
  app.get('/api/missions', requireAdmin, async (req, res) => {
    try {
      const missions = await storage.getAllMissions();
      res.json(missions);
    } catch (err) {
      console.error('Error fetching missions:', err);
      res.status(500).json({ message: 'Failed to fetch missions' });
    }
  });

  app.post('/api/missions', requireUltraAdmin, async (req, res) => {
    try {
      const missionData = insertMissionSchema.parse(req.body);
      const mission = await storage.createMission(missionData);
      res.status(201).json(mission);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch('/api/missions/:id', requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionId = parseInt(id, 10);
      if (isNaN(missionId)) {
        return res.status(400).json({ message: 'Invalid mission ID' });
      }
      const missionData = insertMissionSchema.partial().parse(req.body);
      const updatedMission = await storage.updateMission(missionId, missionData);
      if (updatedMission) {
        res.json(updatedMission);
      } else {
        res.status(404).json({ message: 'Mission not found' });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete('/api/missions/:id', requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionId = parseInt(id, 10);
      if (isNaN(missionId)) {
        return res.status(400).json({ message: 'Invalid mission ID' });
      }
      const success = await storage.deleteMission(missionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'Mission not found' });
      }
    } catch (err) {
      console.error('Error deleting mission:', err);
      res.status(500).json({ message: 'Failed to delete mission' });
    }
  });


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
      const congregationId = parseInt(req.query.congregationId as string, 10) || 1; // Default to congregation 1 if not specified

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

      const missionaries = await storage.getMissionariesByType(typeOrId, congregationId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Get missionaries by congregation
  app.get('/api/admin/missionaries/congregation/:congregationId', requireAdmin, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      // Check if user has access to this congregation
      if (req.user!.role !== 'ultra') {
        const userCongregations = await storage.getUserCongregations(req.user!.id);
        const hasAccess = userCongregations.some(congregation => congregation.id === parsedCongregationId);

        if (!hasAccess) {
          return res.status(403).json({ message: 'You do not have access to this congregation' });
        }
      }

      const missionaries = await storage.getMissionariesByCongregation(parsedCongregationId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries by congregation:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Check meal availability
  app.post('/api/meals/check-availability', async (req, res) => {
    try {
      const data = checkMealAvailabilitySchema.parse(req.body);
      const date = new Date(data.date);
      const congregationId = data.congregationId; // Use provided congregationId directly

      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, congregationId);
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
      const congregationIdParam = req.query.congregationId as string;

      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }

      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const congregationId = congregationIdParam ? parseInt(congregationIdParam, 10) : undefined;

      const meals = await storage.getMealsByDateRange(startDate, endDate, congregationId);

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
      console.log('Received meal booking request:', req.body);
      // Convert date string to Date object before validation
      const requestData = {
        ...req.body,
        date: new Date(req.body.date)
      };
      const mealData = insertMealSchema.parse(requestData);

      // Verify the missionary exists
      const missionary = await storage.getMissionary(mealData.missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      // Check meal availability for this date and missionary
      const mealDate = new Date(mealData.date);
      const congregationId = mealData.congregationId; // Use actual congregationId from parsed data
      const isAvailable = await storage.checkMealAvailability(mealDate, missionary.id.toString(), congregationId);

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
      console.error('Meal booking error:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: err.errors
        });
      }
      res.status(500).json({ message: 'Failed to create meal' });
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
  // Admin create missionary
  app.post('/api/admin/missionaries', requireAdmin, async (req, res) => {
    try {
      const missionaryData = insertMissionarySchema.parse({
        ...req.body,
        emailVerified: true, // Automatically verify email for admin-created missionaries
        consentStatus: 'granted', // Automatically grant consent
      });
      const missionary = await storage.createMissionary(missionaryData);
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
      res.status(400).json({ message: 'Verification failed' });
    }
  });

  // Missionary portal authentication
  app.post('/api/missionary-portal/authenticate', async (req, res) => {
    try {
      const { accessCode, emailAddress, password } = req.body;

      if (!accessCode || !emailAddress || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Get congregation by access code
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      // Get missionary by email
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
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
      const { name, type, emailAddress, congregationAccessCode, password } = req.body;

      if (!name || !type || !emailAddress || !congregationAccessCode || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (!emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Email must be a @missionary.org address' });
      }

      // Get congregation by access code
      const congregation = await storage.getCongregationByAccessCode(congregationAccessCode);
      if (!congregation) {
        return res.status(404).json({ message: 'Invalid congregation access code' });
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
          congregationId: congregation.id,
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

  // Congregation leave/rejoin functionality
  app.post('/api/congregations/:congregationId/leave', requireAuth, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const userId = req.user!.id;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      const success = await storage.removeUserFromCongregation(userId, parsedCongregationId);

      if (success) {
        res.json({ message: 'Successfully left the congregation' });
      } else {
        res.status(404).json({ message: 'Congregation not found or user not a member' });
      }
    } catch (error) {
      console.error('Error leaving congregation:', error);
      res.status(500).json({ message: 'Failed to leave congregation' });
    }
  });

  app.post('/api/congregations/:accessCode/rejoin', requireAuth, async (req, res) => {
    try {
      const { accessCode } = req.params;
      const userId = req.user!.id;

      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      // Check if user is already a member
      const userCongregations = await storage.getUserCongregations(userId);
      const isAlreadyMember = userCongregations.some(uc => uc.id === congregation.id);

      if (isAlreadyMember) {
        return res.status(400).json({ message: 'Already a member of this congregation' });
      }

      await storage.addUserToCongregation({ userId, congregationId: congregation.id });
      res.json({ message: 'Successfully rejoined the congregation', congregation });
    } catch (error) {
      console.error('Error rejoining congregation:', error);
      res.status(500).json({ message: 'Failed to rejoin congregation' });
    }
  });

  // Admin dashboard statistics
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get congregationId from query parameter, defaults to user's congregations if not provided
      const congregationId = req.query.congregationId ? parseInt(req.query.congregationId as string, 10) : undefined;

      // Validate congregation access if congregationId is provided
      if (congregationId) {
        // Get user's congregations
        const userCongregations = await storage.getUserCongregations(req.user!.id);
        const userCongregationIds = userCongregations.map(congregation => congregation.id);

        // Check if user has access to this congregation or is superadmin
        if (req.user!.role !== 'ultra' && !userCongregationIds.includes(congregationId)) {
          return res.status(403).json({ message: 'You do not have access to this congregation' });
        }
      }

      // Get meals for this month and optionally filtered by congregation
      const meals = await storage.getMealsByDateRange(startOfMonth, endOfMonth, congregationId);

      // Get all missionaries, optionally filtered by congregation
      const missionaries = congregationId
        ? await storage.getMissionariesByCongregation(congregationId)
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

  // Congregation Management Routes (Admin/SuperAdmin)
  app.get('/api/admin/congregations', requireAdmin, async (req, res) => {
    try {
      let congregations;

      if (req.user!.role === 'ultra') {
        congregations = await storage.getAllCongregations();
      } else {
        // For non-ultra admins, only return congregations they have access to
        congregations = await storage.getUserCongregations(req.user!.id);
      }

      res.json(congregations);
    } catch (err) {
      console.error('Error fetching congregations:', err);
      res.status(500).json({ message: 'Failed to fetch congregations' });
    }
  });

  // Create new congregation (SuperAdmin only)
  app.post('/api/admin/congregations', requireSuperAdmin, async (req, res) => {
    try {
      const congregationData = insertCongregationSchema.parse(req.body);
      const congregation = await storage.createCongregation(congregationData);
      res.status(201).json(congregation);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Update congregation (SuperAdmin only)
  app.patch('/api/admin/congregations/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const congregationId = parseInt(id, 10);

      if (isNaN(congregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      const existingCongregation = await storage.getCongregation(congregationId);
      if (!existingCongregation) {
        return res.status(404).json({ message: 'Congregation not found' });
      }

      const updatedCongregation = await storage.updateCongregation(congregationId, req.body);

      if (updatedCongregation) {
        res.json(updatedCongregation);
      } else {
        res.status(404).json({ message: 'Congregation not found' });
      }
    } catch (err) {
      console.error('Error updating congregation:', err);
      res.status(500).json({ message: 'Failed to update congregation' });
    }
  });

  // Add user to congregation (Admin only)
  app.post('/api/admin/congregations/:congregationId/users', requireAdmin, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      // Check if user is superadmin or has access to this congregation
      if (req.user!.role !== 'ultra') {
        const userCongregations = await storage.getUserCongregations(req.user!.id);
        const userCongregationIds = userCongregations.map(congregation => congregation.id);

        if (!userCongregationIds.includes(parsedCongregationId)) {
          return res.status(403).json({ message: 'You do not have access to this congregation' });
        }
      }

      // Validate request body
      const { username } = req.body; // Changed from userId to username for adding existing users
      if (!username) {
        return res.status(400).json({ message: 'Valid username is required' });
      }

      // Find user by username
      const userToAdd = await storage.getUserByUsername(username);
      if (!userToAdd) {
        return res.status(404).json({ message: `User '${username}' not found. Please ensure the user exists.` });
      }

      // Check if user is already a member of this congregation
      const userCongregations = await storage.getUserCongregations(userToAdd.id);
      const isAlreadyMember = userCongregations.some(uc => uc.id === parsedCongregationId);
      if (isAlreadyMember) {
          return res.status(400).json({ message: 'User is already an admin of this congregation.' });
      }

      // Add user to congregation
      const userCongregation = await storage.addUserToCongregation({
        userId: userToAdd.id,
        congregationId: parsedCongregationId
      });

      // Return simplified user data
      res.status(201).json({
        userId: userToAdd.id,
        congregationId: parsedCongregationId,
        username: userToAdd.username,
        role: userToAdd.role // Return role for display if needed
      });
    } catch (err) {
      console.error('Error adding user to congregation:', err);
      res.status(500).json({ message: 'Failed to add user to congregation' });
    }
  });

  // Remove user from congregation (Admin only)
  app.delete('/api/admin/congregations/:congregationId/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { congregationId, userId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      const parsedUserId = parseInt(userId, 10);

      if (isNaN(parsedCongregationId) || isNaN(parsedUserId)) {
        return res.status(400).json({ message: 'Invalid congregation ID or user ID' });
      }

      // Check if user is superadmin or has access to this congregation
      if (req.user!.role !== 'ultra') {
        const userCongregations = await storage.getUserCongregations(req.user!.id);
        const userCongregationIds = userCongregations.map(congregation => congregation.id);

        if (!userCongregationIds.includes(parsedCongregationId)) {
          return res.status(403).json({ message: 'You do not have access to this congregation' });
        }
      }

      // Prevent removing the last admin from a congregation if it's the only one
      // This logic can be enhanced later if needed, e.g., ensure at least one admin always remains for a congregation
      const congregationUsers = await storage.getUsersInCongregation(parsedCongregationId);
      if (congregationUsers.length === 1 && congregationUsers[0].id === parsedUserId) {
          // This is the last admin for this congregation, prevent removal unless it's an ultra admin removing themselves
          // or another ultra admin removing the last admin.
          if (req.user!.role !== 'ultra' && req.user!.id !== parsedUserId) {
              return res.status(400).json({ message: 'Cannot remove the last admin from this congregation. Assign another admin first.' });
          }
      }

      // Remove user from congregation
      const success = await storage.removeUserFromCongregation(parsedUserId, parsedCongregationId);

      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'User-congregation relationship not found' });
      }
    } catch (err) {
      console.error('Error removing user from congregation:', err);
      res.status(500).json({ message: 'Failed to remove user from congregation' });
    }
  });

  // Public access to congregation by access code
  app.get('/api/congregations/:accessCode', async (req, res) => {
    try {
      const { accessCode } = req.params;

      if (!accessCode || accessCode.length < 10) {
        return res.status(400).json({ message: 'Invalid access code' });
      }

      const congregation = await storage.getCongregationByAccessCode(accessCode);

      if (!congregation) {
        return res.status(404).json({ message: 'Congregation not found' });
      }

      if (!congregation.active) {
        return res.status(403).json({ message: 'This congregation is no longer active' });
      }

      // Return basic congregation info without sensitive data
      res.json({
        id: congregation.id,
        name: congregation.name,
        accessCode: congregation.accessCode
      });
    } catch (err) {
      console.error('Error accessing congregation by code:', err);
      res.status(500).json({ message: 'Failed to access congregation' });
    }
  });

  // Get all missionaries for a specific congregation
  app.get('/api/congregations/:congregationId/missionaries', async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      const congregation = await storage.getCongregation(parsedCongregationId);
      if (!congregation) {
        return res.status(404).json({ message: 'Congregation not found' });
      }

      if (!congregation.active) {
        return res.status(403).json({ message: 'This congregation is no longer active' });
      }

      const missionaries = await storage.getMissionariesByCongregation(parsedCongregationId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries for congregation:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Get missionaries by congregation and type for the meal calendar
  app.get('/api/congregations/:congregationId/missionaries/:type', async (req, res) => {
    try {
      const { congregationId, type } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      if (type !== 'elders' && type !== 'sisters') {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }

      const missionaries = await storage.getMissionariesByType(type, parsedCongregationId);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries by congregation and type:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Get all meals for a specific congregation
  app.get('/api/congregations/:congregationId/meals', async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
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

      const meals = await storage.getMealsByDateRange(startDate, endDate, parsedCongregationId);

      // Get missionaries to include their information
      const missionaries = await storage.getMissionariesByCongregation(parsedCongregationId);
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));

      const mealsWithMissionaries = meals.map(meal => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));

      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error('Error fetching meals by congregation:', err);
      res.status(500).json({ message: 'Failed to fetch meals' });
    }
  });

  // Check meal availability for a specific congregation
  app.post('/api/congregations/:congregationId/meals/check-availability', async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
      }

      const data = checkMealAvailabilitySchema.parse({
        ...req.body,
        congregationId: parsedCongregationId
      });

      const date = new Date(data.date);
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, parsedCongregationId);

      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Message statistics API route
  app.get('/api/message-stats', requireAdmin, async (req, res) => {
    try {
      const congregationId = req.query.congregationId ? parseInt(req.query.congregationId as string) : undefined;

      let stats;
      if (congregationId) {
        // If user is not super admin, verify they have access to this congregation
        if (req.user!.role !== 'ultra') {
          const userCongregations = await storage.getUserCongregations(req.user!.id);
          const hasAccess = userCongregations.some(congregation => congregation.id === congregationId);

          if (!hasAccess) {
            return res.status(403).json({ message: 'You do not have access to this congregation' });
          }
        }

        stats = await notificationManager.getWardMessageStats(congregationId); // Note: getWardMessageStats now implies congregationId
      } else {
        // If not super admin, return error since regular admins can only see their congregations
        if (req.user!.role !== 'ultra') {
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
        congregationId
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

      // Get the target congregation
      const congregation = await storage.getCongregation(congregationId);
      if (!congregation) {
        return res.status(404).json({ message: "Congregation not found" });
      }

      // Check if user is admin of this congregation
      if (req.user!.role !== 'ultra') {
        const userCongregations = await storage.getUserCongregations(req.user!.id);
        const hasAccess = userCongregations.some(c => c.id === congregationId);

        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied for this congregation' });
        }
      }

      // Set up test missionary data for notification tracking
      console.log(`Test message: using contact info ${contactInfo}`);

      // First try to find an existing test missionary for this congregation
      let testMissionary = await storage.getMissionaryByName(congregationId, "Test Missionary");

      // If no test missionary exists for this congregation, create one
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
            congregationId,
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
        congregationId,
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
        return res.status(400).json({ message: 'Invalid missionary ID' });
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
      res.status(500).json({ message: 'Failed to request consent' });
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
        return res.status(400).json({ message: 'Invalid missionary ID' });
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
      res.status(500).json({ message: 'Failed to fetch consent status' });
    }
  });

  // Meal statistics API endpoint
  app.get('/api/meal-stats/:congregationId', async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);

      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: 'Invalid congregation ID' });
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

      // Get all meals for the congregation in the date range
      const meals = await storage.getMealsByDateRange(startDate, endDate, parsedCongregationId);
      const activeMeals = meals.filter(meal => !meal.cancelled);

      // Get all missionaries for the congregation
      const missionaries = await storage.getMissionariesByCongregation(parsedCongregationId);
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));

      // Calculate statistics
      const totalMeals = activeMeals.length;
      const timeRangeInWeeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const timeRangeInMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

      const averageMealsPerWeek = totalMeals / timeRangeInWeeks;
      const averageMealsPerMonth = totalMeals / timeRangeInMonths;

      // Missionary statistics
      const missionaryMealCounts = new Map<number, { count: number, lastMeal: Date | null }>();

      activeMeals.forEach(meal => {
        const current = missionaryMealCounts.get(meal.missionaryId) || { count: 0, lastMeal: null };
        current.count++;
        const mealDate = new Date(meal.date);
        if (!current.lastMeal || mealDate > current.lastMeal) {
          current.lastMeal = mealDate;
        }
        missionaryMealCounts.set(meal.missionaryId, current);
      });

      const missionaryStats = missionaries.map(missionary => ({
        id: missionary.id,
        name: missionary.name,
        type: missionary.type,
        mealCount: missionaryMealCounts.get(missionary.id)?.count || 0,
        lastMeal: missionaryMealCounts.get(missionary.id)?.lastMeal?.toISOString() || null
      })).sort((a, b) => b.mealCount - a.mealCount);

      // Monthly breakdown
      const monthlyBreakdown = new Map<string, number>();
      activeMeals.forEach(meal => {
        const mealDate = new Date(meal.date);
        const monthKey = mealDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + 1);
      });

      const monthlyBreakdownArray = Array.from(monthlyBreakdown.entries()).map(([month, mealCount]) => ({
        month,
        mealCount
      })).sort((a, b) => new Date(a.month + ' 1').getTime() - new Date(b.month + ' 1').getTime());

      const stats = {
        totalMeals,
        averageMealsPerWeek: Math.round(averageMealsPerWeek * 10) / 10,
        averageMealsPerMonth: Math.round(averageMealsPerMonth * 10) / 10,
        missionaryStats,
        monthlyBreakdown: monthlyBreakdownArray
      };

      res.json(stats);
    } catch (err) {
      console.error('Error fetching meal statistics:', err);
      res.status(500).json({ message: 'Failed to fetch meal statistics' });
    }
  });

  // Missionary password reset endpoint
  app.post('/api/missionary-forgot-password', async (req, res) => {
    try {
      const { emailAddress, accessCode } = req.body;

      if (!emailAddress || !accessCode) {
        return res.status(400).json({ message: 'Email address and access code are required' });
      }

      // Validate email format
      if (!emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Please use your @missionary.org email address' });
      }

      // Find the congregation by access code
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: 'Invalid congregation access code' });
      }

      // Find the missionary by email
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
        return res.status(404).json({ message: 'Missionary not found in this congregation' });
      }

      // Generate a new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const { hashPassword } = await import('./auth');
      const hashedTempPassword = await hashPassword(tempPassword);

      // Update missionary with temporary password
      await storage.updateMissionary(missionary.id, {
        password: hashedTempPassword
      });

      // Send password reset email
      const emailService = new (await import('./email-service')).EmailService();
      const emailSent = await emailService.sendCustomMessage(
        missionary,
        `Your password has been reset. Your new temporary password is: ${tempPassword}\n\nPlease log in to the missionary portal and change your password immediately for security.`,
        'password_reset'
      );

      if (emailSent) {
        res.json({ message: 'Password reset email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send password reset email' });
      }
    } catch (err) {
      console.error('Error processing password reset:', err);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Missionary password change endpoint
  app.post('/api/missionary-change-password', async (req, res) => {
    try {
      const { accessCode, emailAddress, currentPassword, newPassword } = req.body;

      if (!accessCode || !emailAddress || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Get congregation by access code
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      // Get missionary by email
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      // Check if missionary has a password set
      if (!missionary.password) {
        return res.status(401).json({ message: 'No password set. Please contact administrator.' });
      }

      // Verify current password
      const { comparePasswords } = await import('./auth');
      const isValidPassword = await comparePasswords(currentPassword, missionary.password!);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const { hashPassword } = await import('./auth');
      const hashedNewPassword = await hashPassword(newPassword);

      // Update missionary password
      await storage.updateMissionary(missionary.id, {
        password: hashedNewPassword
      });

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}