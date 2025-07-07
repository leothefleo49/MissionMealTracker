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

  // Middleware to check if user is admin (any admin role)
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !(req.user?.isAdmin || req.user?.isSuperAdmin || req.user?.isMissionAdmin || req.user?.isStakeAdmin)) {
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

      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }

      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const meals = await storage.getMealsByDateRange(startDate, endDate);
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
        return res.status(409).json({ message: `${missionary.name} is already booked for this date` });
      }

      const meal = await storage.createMeal(mealData);

      // ... (notification logic)

      res.status(201).json(meal);
    } catch (err) {
      handleZodError(err, res);
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
        // ... (notification logic)
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
        // ... (notification logic)
        res.json(cancelledMeal);
      } else {
        res.status(404).json({ message: 'Meal not found' });
      }
    } catch (err) {
      console.error('Error cancelling meal:', err);
      res.status(500).json({ message: 'Failed to cancel meal' });
    }
  });

  // Secure all /api/admin/* routes with the requireAdmin middleware
  app.use("/api/admin/*", requireAdmin);

  app.get('/api/admin/wards', async (req, res) => {
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

  app.get('/api/admin/missionaries/ward/:wardId', async (req, res) => {
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

  app.post('/api/admin/missionaries', async (req, res) => {
    try {
      const missionaryData = insertMissionarySchema.parse(req.body);

      if (missionaryData.password) {
        missionaryData.password = await hashPassword(missionaryData.password);
      }

      missionaryData.consentStatus = 'granted';
      missionaryData.consentDate = new Date();
      missionaryData.emailVerified = true;

      const missionary = await storage.createMissionary(missionaryData);
      res.status(201).json(missionary);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete('/api/missionaries/:id', async (req, res) => {
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

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const wardId = req.query.wardId ? parseInt(req.query.wardId as string, 10) : undefined;

      if (wardId) {
        if (!req.user!.isSuperAdmin) {
          const userWards = await storage.getUserWards(req.user!.id);
          const hasAccess = userWards.some(ward => ward.id === wardId);

          if (!hasAccess) {
            return res.status(403).json({ message: 'You do not have access to this ward' });
          }
        }
      }

      const meals = await storage.getMealsByDateRange(startOfMonth, endOfMonth, wardId);
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

  const httpServer = createServer(app);
  return httpServer;
}