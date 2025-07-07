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

    if (missionary.preferredNotification === 'text' && missionary.consentStatus !== 'granted') {
      console.log(`Cannot send SMS to ${missionary.name}: Consent status is ${missionary.consentStatus}`);
      return false;
    }

    if (missionary.preferredNotification === 'messenger' && !missionary.messengerAccount) {
      console.log(`Cannot send messenger notification to ${missionary.name}: No messenger account provided`);
      return false;
    }

    try {
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
  app.get('/api/missionaries', async (req, res) => {
    try {
      const missionaries = await storage.getAllMissionaries();
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  app.get('/api/missionaries/:typeOrId', async (req, res) => {
    try {
      const { typeOrId } = req.params;
      const wardId = parseInt(req.query.wardId as string, 10) || 1; 

      if (!isNaN(parseInt(typeOrId, 10))) {
        const missionaryId = parseInt(typeOrId, 10);
        const missionary = await storage.getMissionary(missionaryId);

        if (!missionary) {
          return res.status(404).json({ message: 'Missionary not found' });
        }

        return res.json(missionary);
      } 

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

  app.get('/api/admin/missionaries/ward/:wardId', requireAdmin, async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);

      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }

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

  app.post('/api/meals/check-availability', async (req, res) => {
    try {
      const data = checkMealAvailabilitySchema.parse(req.body);
      const date = new Date(data.date);
      const wardId = data.wardId || 1;

      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, wardId);
      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.get('/api/meals', async (req, res) => {
    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;

      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }

      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const meals = await storage.getMealsByDateRange(startDate, endDate, wardId);

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

  app.get('/api/meals/host/:phone', async (req, res) => {
    try {
      const { phone } = req.params;
      const meals = await storage.getUpcomingMealsByHostPhone(phone);

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

  app.post('/api/meals', async (req, res) => {
    try {
      const requestData = {
        ...req.body,
        date: new Date(req.body.date)
      };
      const mealData = insertMealSchema.parse(requestData);

      const missionary = await storage.getMissionary(mealData.missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      const mealDate = new Date(mealData.date);
      const wardId = mealData.wardId || 1;
      const isAvailable = await storage.checkMealAvailability(mealDate, mealData.missionaryId.toString(), wardId);

      if (!isAvailable) {
        return res.status(409).json({ 
          message: `${missionary.name} is already booked for this date` 
        });
      }

      const meal = await storage.createMeal(mealData);

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
        res.json(updatedMeal);
      } else {
        res.status(404).json({ message: 'Meal not found' });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

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
        const missionary = await storage.getMissionary(cancelledMeal.missionaryId);

        const mealDate = new Date(cancelledMeal.date);
        const formattedDate = mealDate.toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });

        await notifyMissionary(
          cancelledMeal.missionaryId,
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName}. ` +
          (reason ? `Reason: ${reason}` : '')
        );

        await notifyAdmin(
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName} for ` +
          `missionary ${missionary ? missionary.name : `ID ${cancelledMeal.missionaryId}`}. ` +
          (reason ? `Reason: ${reason}` : '')
        );

        res.json(cancelledMeal);
      } else {
        res.status(404).json({ message: 'Meal not found' });
      }
    } catch (err) {
      console.error('Error cancelling meal:', err);
      res.status(500).json({ message: 'Failed to cancel meal' });
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

      const meals = await storage.getMealsByMissionary(missionaryId);
      for (const meal of meals) {
        await storage.cancelMeal(meal.id, "Missionary deleted");
      }

      await storage.deleteMissionary(missionaryId);

      res.json({ message: 'Missionary deleted successfully' });
    } catch (err) {
      console.error('Error deleting missionary:', err);
      res.status(500).json({ message: 'Failed to delete missionary' });
    }
  });

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

  app.post('/api/missionary-portal/authenticate', async (req, res) => {
    try {
      const { accessCode, emailAddress, password } = req.body;

      if (!accessCode || !emailAddress || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const ward = await storage.getWardByAccessCode(accessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.wardId !== ward.id) {
        return res.status(401).json({ authenticated: false });
      }

      if (!missionary.password) {
        return res.status(401).json({ authenticated: false, message: 'Password not set. Please register first.' });
      }

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

  app.post('/api/missionaries/register', async (req, res) => {
    try {
      const { name, type, emailAddress, wardAccessCode, password } = req.body;

      if (!name || !type || !emailAddress || !wardAccessCode || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (!emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Email must be a @missionary.org address' });
      }

      const ward = await storage.getWardByAccessCode(wardAccessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid ward access code' });
      }

      const existingMissionary = await storage.getMissionaryByEmail(emailAddress);
      if (existingMissionary) {
        if (!existingMissionary.password) {
          const hashedPassword = await hashPassword(password);
          await storage.updateMissionary(existingMissionary.id, {
            password: hashedPassword
          });

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
        const hashedPassword = await hashPassword(password);
        const missionary = await storage.createMissionary({
          name,
          type,
          emailAddress,
          wardId: ward.id,
          phoneNumber: '',
          password: hashedPassword,
          active: true,
          preferredNotification: 'email'
        });

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

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;

      if (wardId) {
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);

        if (!req.user!.isSuperAdmin && !userWardIds.includes(wardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }

      const meals = await storage.getMealsByDateRange(startOfMonth, now, wardId);

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

  app.get('/api/admin/wards', requireAdmin, async (req, res) => {
    try {
      let wards;

      if (req.user!.isSuperAdmin) {
        wards = await storage.getAllWards();
      } else {
        wards = await storage.getUserWards(req.user!.id);
      }

      res.json(wards);
    } catch (err) {
      console.error('Error fetching wards:', err);
      res.status(500).json({ message: 'Failed to fetch wards' });
    }
  });

  app.post('/api/admin/wards', requireSuperAdmin, async (req, res) => {
    try {
      const wardData = insertWardSchema.parse(req.body);
      const ward = await storage.createWard(wardData);
      res.status(201).json(ward);
    } catch (err) {
      handleZodError(err, res);
    }
  });

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

  app.post('/api/admin/wards/:wardId/users', requireAdmin, async (req, res) => {
    try {
      const { wardId } = req.params;
      const parsedWardId = parseInt(wardId, 10);

      if (isNaN(parsedWardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }

      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);

        if (!userWardIds.includes(parsedWardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }

      const { userId } = req.body;
      if (!userId || isNaN(parseInt(userId, 10))) {
        return res.status(400).json({ message: 'Valid userId is required' });
      }

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

  app.delete('/api/admin/wards/:wardId/users/:userId', requireAdmin, async (req, res) => {
    try {
      const { wardId, userId } = req.params;
      const parsedWardId = parseInt(wardId, 10);
      const parsedUserId = parseInt(userId, 10);

      if (isNaN(parsedWardId) || isNaN(parsedUserId)) {
        return res.status(400).json({ message: 'Invalid ward ID or user ID' });
      }

      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const userWardIds = userWards.map(ward => ward.id);

        if (!userWardIds.includes(parsedWardId)) {
          return res.status(403).json({ message: 'You do not have access to this ward' });
        }
      }

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

  app.get('/api/wards/:accessCode', async (req, res) => {
    try {
      const { accessCode } = req.params;

      if (!accessCode || accessCode.length < 1) {
        return res.status(400).json({ message: 'Invalid access code' });
      }

      const ward = await storage.getWardByAccessCode(accessCode);

      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }

      if (!ward.active) {
        return res.status(403).json({ message: 'This ward is no longer active' });
      }

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

  app.get('/api/message-stats', requireAdmin, async (req, res) => {
    try {
      const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;

      let stats;
      if (wardId) {
        if (!req.user!.isSuperAdmin) {
          const userWards = await storage.getUserWards(req.user!.id);
          const hasAccess = userWards.some(ward => ward.id === wardId);

          if (!hasAccess) {
            return res.status(403).json({ message: 'You do not have access to this ward' });
          }
        }

        stats = await notificationManager.getWardMessageStats(wardId);
      } else {
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

  app.post("/api/admin/test-message", requireAdmin, async (req, res) => {
    try {
      const {
        contactInfo,
        notificationMethod,
        messageType,
        customMessage,
        wardId
      } = req.body;

      if (!contactInfo) {
        return res.status(400).json({ message: "Contact information is required" });
      }

      if (!notificationMethod || !["email", "whatsapp"].includes(notificationMethod)) {
        return res.status(400).json({ message: "Valid notification method (email or whatsapp) is required" });
      }

      if (messageType === "custom" && !customMessage) {
        return res.status(400).json({ message: "Message text is required for custom messages" });
      }

      const ward = await storage.getWard(wardId);
      if (!ward) {
        return res.status(404).json({ message: "Ward not found" });
      }

      if (!req.user!.isSuperAdmin) {
        const userWards = await storage.getUserWards(req.user!.id);
        const hasAccess = userWards.some(w => w.id === wardId);

        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied for this ward' });
        }
      }

      let testMissionary = await storage.getMissionaryByName(wardId, "Test Missionary");

      if (!testMissionary) {
        try {
          testMissionary = await storage.createMissionary({
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
          });
        } catch (error) {
          console.error("Failed to create test missionary:", error);
          return res.status(500).json({ message: "Failed to create test missionary" });
        }
      }

      let result = false;

      if(messageType === "custom" && customMessage) {
        result = await notificationManager.sendCustomMessage(testMissionary, customMessage, "test_message");
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

  app.post('/api/missionary-forgot-password', async (req, res) => {
    try {
      const { emailAddress, accessCode } = req.body;

      if (!emailAddress || !accessCode) {
        return res.status(400).json({ message: 'Email address and access code are required' });
      }

      if (!emailAddress.endsWith('@missionary.org')) {
        return res.status(400).json({ message: 'Please use your @missionary.org email address' });
      }

      const ward = await storage.getWardByAccessCode(accessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid ward access code' });
      }

      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.wardId !== ward.id) {
        return res.status(404).json({ message: 'Missionary not found in this ward' });
      }

      const tempPassword = randomBytes(8).toString('hex');
      const hashedTempPassword = await hashPassword(tempPassword);

      await storage.updateMissionary(missionary.id, {
        password: hashedTempPassword
      });

      const emailSent = await emailVerificationService.sendVerificationCode(emailAddress, missionary.id);

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

  app.post('/api/missionary-change-password', async (req, res) => {
    try {
      const { accessCode, emailAddress, currentPassword, newPassword } = req.body;

      if (!accessCode || !emailAddress || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      const ward = await storage.getWardByAccessCode(accessCode);
      if (!ward) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.wardId !== ward.id) {
        return res.status(404).json({ message: 'Missionary not found' });
      }

      if (!missionary.password) {
        return res.status(401).json({ message: 'No password set. Please contact administrator.' });
      }

      const isValidPassword = await comparePasswords(currentPassword, missionary.password!);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await storage.updateMissionary(missionary.id, {
        password: hashedNewPassword
      });

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  app.get('/api/meal-stats/:wardId', async (req, res) => {
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
      const activeMeals = meals.filter(meal => !meal.cancelled);

      const missionaries = await storage.getMissionariesByWard(parsedWardId);
      const missionaryMap = new Map(missionaries.map(m => [m.id, m]));

      const totalMeals = activeMeals.length;
      const timeRangeInWeeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const timeRangeInMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

      const averageMealsPerWeek = totalMeals / timeRangeInWeeks;
      const averageMealsPerMonth = totalMeals / timeRangeInMonths;

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

  const httpServer = createServer(app);
  return httpServer;
}