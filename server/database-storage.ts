import { IStorage } from './storage';
import { 
  users, type User, type InsertUser,
  missionaries, type Missionary, type InsertMissionary,
  meals, type Meal, type InsertMeal, type UpdateMeal,
  wards, type Ward, type InsertWard,
  userWards, type UserWard, type InsertUserWard,
  messageLogs, type MessageLog, type InsertMessageLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from './db';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Ward methods
  async getWard(id: number): Promise<Ward | undefined> {
    const [ward] = await db.select().from(wards).where(eq(wards.id, id));
    return ward || undefined;
  }

  async getWardByAccessCode(accessCode: string): Promise<Ward | undefined> {
    const [ward] = await db.select().from(wards).where(eq(wards.accessCode, accessCode));
    return ward || undefined;
  }

  async getAllWards(): Promise<Ward[]> {
    return await db.select().from(wards);
  }

  async createWard(ward: InsertWard): Promise<Ward> {
    const [newWard] = await db
      .insert(wards)
      .values(ward)
      .returning();
    return newWard;
  }

  async updateWard(id: number, data: Partial<Ward>): Promise<Ward | undefined> {
    const [updatedWard] = await db
      .update(wards)
      .set(data)
      .where(eq(wards.id, id))
      .returning();
    return updatedWard || undefined;
  }

  // User-Ward relationship methods
  async getUserWards(userId: number): Promise<Ward[]> {
    const userWardsResult = await db
      .select({
        ward: wards,
      })
      .from(userWards)
      .innerJoin(wards, eq(userWards.wardId, wards.id))
      .where(eq(userWards.userId, userId));
    
    return userWardsResult.map(result => result.ward);
  }

  async addUserToWard(userWard: InsertUserWard): Promise<UserWard> {
    const [newUserWard] = await db
      .insert(userWards)
      .values(userWard)
      .returning();
    return newUserWard;
  }

  async removeUserFromWard(userId: number, wardId: number): Promise<boolean> {
    const result = await db
      .delete(userWards)
      .where(
        and(
          eq(userWards.userId, userId),
          eq(userWards.wardId, wardId)
        )
      );
    return true;
  }

  // Missionary methods
  async getMissionary(id: number): Promise<Missionary | undefined> {
    const [missionary] = await db.select().from(missionaries).where(eq(missionaries.id, id));
    return missionary || undefined;
  }
  
  async getMissionaryByName(wardId: number, name: string): Promise<Missionary | undefined> {
    const [missionary] = await db
      .select()
      .from(missionaries)
      .where(
        and(
          eq(missionaries.wardId, wardId),
          eq(missionaries.name, name)
        )
      );
    return missionary || undefined;
  }

  async getMissionariesByType(type: string, wardId: number): Promise<Missionary[]> {
    return await db
      .select()
      .from(missionaries)
      .where(
        and(
          eq(missionaries.type, type),
          eq(missionaries.wardId, wardId),
          eq(missionaries.active, true)
        )
      );
  }

  async getMissionariesByWard(wardId: number): Promise<Missionary[]> {
    return await db
      .select()
      .from(missionaries)
      .where(eq(missionaries.wardId, wardId));
  }

  async getAllMissionaries(): Promise<Missionary[]> {
    return await db.select().from(missionaries);
  }

  async createMissionary(insertMissionary: InsertMissionary): Promise<Missionary> {
    // Ensure consent fields have default values if not explicitly provided
    const missionaryData = {
      ...insertMissionary,
      // Set explicit default for consent status if not provided
      consentStatus: insertMissionary.consentStatus || 'pending',
      // Make sure other consent fields are null if not provided
      consentDate: insertMissionary.consentDate || null,
      consentVerificationToken: insertMissionary.consentVerificationToken || null,
      consentVerificationSentAt: insertMissionary.consentVerificationSentAt || null
    };
    
    const [missionary] = await db
      .insert(missionaries)
      .values(missionaryData)
      .returning();
    return missionary;
  }

  async updateMissionary(id: number, data: Partial<Missionary>): Promise<Missionary | undefined> {
    const [updatedMissionary] = await db
      .update(missionaries)
      .set(data)
      .where(eq(missionaries.id, id))
      .returning();
    return updatedMissionary || undefined;
  }

  // Meal methods
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal || undefined;
  }

  async getMealsByDate(date: Date, wardId?: number): Promise<Meal[]> {
    // Set the time to the beginning of the day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    let conditions = [
      gte(meals.date, startOfDay),
      lte(meals.date, endOfDay)
    ];
    
    if (wardId !== undefined) {
      conditions.push(eq(meals.wardId, wardId));
    }
    
    return await db
      .select()
      .from(meals)
      .where(and(...conditions));
  }

  async getMealsByDateRange(startDate: Date, endDate: Date, wardId?: number): Promise<Meal[]> {
    let conditions = [
      gte(meals.date, startDate),
      lte(meals.date, endDate)
    ];
    
    if (wardId !== undefined) {
      conditions.push(eq(meals.wardId, wardId));
    }
    
    return await db
      .select()
      .from(meals)
      .where(and(...conditions));
  }

  async getMealsByMissionary(missionaryId: number): Promise<Meal[]> {
    return await db
      .select()
      .from(meals)
      .where(eq(meals.missionaryId, missionaryId));
  }

  async getUpcomingMealsByHostPhone(hostPhone: string, wardId?: number): Promise<Meal[]> {
    const now = new Date();
    
    let conditions = [
      eq(meals.hostPhone, hostPhone),
      gte(meals.date, now),
      eq(meals.cancelled, false)
    ];
    
    if (wardId !== undefined) {
      conditions.push(eq(meals.wardId, wardId));
    }
    
    return await db
      .select()
      .from(meals)
      .where(and(...conditions));
  }

  async checkMealAvailability(date: Date, missionaryTypeOrId: string, wardId: number): Promise<boolean> {
    const mealsOnDate = await this.getMealsByDate(date, wardId);
    
    // Check if missionaryTypeOrId is a numeric ID
    const missionaryId = parseInt(missionaryTypeOrId, 10);
    
    if (!isNaN(missionaryId)) {
      // This is a missionary ID, check if this specific missionary has a meal on this date
      const missionary = await this.getMissionary(missionaryId);
      if (!missionary || missionary.wardId !== wardId) return false;
      
      const existingMeal = mealsOnDate.find(
        meal => meal.missionaryId === missionaryId && !meal.cancelled
      );
      
      // Return true if the missionary doesn't have a meal on this date
      return !existingMeal;
    } else {
      // This is a missionary type, get missionaries of the requested type in this ward
      const missionaries = await this.getMissionariesByType(missionaryTypeOrId, wardId);
      if (missionaries.length === 0) return false;
      
      // Check if any of these missionaries already has a meal on this date
      for (const missionary of missionaries) {
        const existingMeal = mealsOnDate.find(
          meal => meal.missionaryId === missionary.id && !meal.cancelled
        );
        
        if (!existingMeal) {
          // This missionary doesn't have a meal on this date, so it's available
          return true;
        }
      }
      
      // All missionaries of this type already have meals on this date
      return false;
    }
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const [meal] = await db
      .insert(meals)
      .values(insertMeal)
      .returning();
    return meal;
  }

  async updateMeal(mealUpdate: UpdateMeal): Promise<Meal | undefined> {
    const [updatedMeal] = await db
      .update(meals)
      .set(mealUpdate)
      .where(eq(meals.id, mealUpdate.id))
      .returning();
    return updatedMeal || undefined;
  }

  async cancelMeal(id: number, reason?: string): Promise<Meal | undefined> {
    const [cancelledMeal] = await db
      .update(meals)
      .set({ 
        cancelled: true, 
        cancellationReason: reason || null 
      })
      .where(eq(meals.id, id))
      .returning();
    return cancelledMeal || undefined;
  }
}