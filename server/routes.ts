import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertMealSchema, updateMealSchema, checkMealAvailabilitySchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helpers for notifications (simulated for now)
  const notifyMissionary = async (missionaryId: number, message: string) => {
    const missionary = await storage.getMissionary(missionaryId);
    if (!missionary) return;
    
    // This would integrate with Twilio or Facebook Messenger API
    console.log(`Notification to ${missionary.name} via ${missionary.preferredNotification}: ${message}`);
    return true;
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
  app.get('/api/missionaries/:type', async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== 'elders' && type !== 'sisters') {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }
      
      const missionaries = await storage.getMissionariesByType(type);
      res.json(missionaries);
    } catch (err) {
      console.error('Error fetching missionaries by type:', err);
      res.status(500).json({ message: 'Failed to fetch missionaries' });
    }
  });

  // Check meal availability
  app.post('/api/meals/check-availability', async (req, res) => {
    try {
      const data = checkMealAvailabilitySchema.parse(req.body);
      const date = new Date(data.date);
      
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType);
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
      
      // Check meal availability for this date and missionary type
      const mealDate = new Date(mealData.date);
      const isAvailable = await storage.checkMealAvailability(mealDate, missionary.type);
      
      if (!isAvailable) {
        return res.status(409).json({ 
          message: `${missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)} are already booked for this date` 
        });
      }
      
      const meal = await storage.createMeal(mealData);
      
      // Send notification
      const formattedDate = mealDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      await notifyMissionary(
        meal.missionaryId,
        `New meal scheduled: ${formattedDate} at ${meal.startTime} with ${meal.hostName}. ` + 
        (meal.mealDescription ? `Menu: ${meal.mealDescription}` : '') +
        (meal.specialNotes ? ` Notes: ${meal.specialNotes}` : '')
      );
      
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
        if (updateData.cancelled) {
          // Send cancellation notification
          const mealDate = new Date(updatedMeal.date);
          const formattedDate = mealDate.toLocaleDateString(undefined, { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` +
            (updateData.cancellationReason ? `Reason: ${updateData.cancellationReason}` : '')
          );
          
          // Also notify admin about the cancellation
          await notifyAdmin(
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName} for ` +
            `missionary ID ${updatedMeal.missionaryId}. ` +
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
          
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal updated: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` +
            (updatedMeal.mealDescription ? `Menu: ${updatedMeal.mealDescription}` : '') +
            (updatedMeal.specialNotes ? ` Notes: ${updatedMeal.specialNotes}` : '')
          );
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
        // Send cancellation notification
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
        
        // Also notify admin
        await notifyAdmin(
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName} for ` +
          `missionary ID ${cancelledMeal.missionaryId}. ` +
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

  const httpServer = createServer(app);
  return httpServer;
}
