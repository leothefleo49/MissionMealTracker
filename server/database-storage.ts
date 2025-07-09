import { IStorage } from './storage';
import { 
  users, type User, type InsertUser,
  missionaries, type Missionary, type InsertMissionary,
  meals, type Meal, type InsertMeal, type UpdateMeal,
  wards, type Ward, type InsertWard,
  userWards, type UserWard, type InsertUserWard,
  messageLogs, type MessageLog, type InsertMessageLog,
  regions, missions, stakes // Import new schema tables
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, isNull, or } from "drizzle-orm";
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

  // --- Hierarchy Management ---
  async createRegion(name: string) {
    const [newRegion] = await db.insert(regions).values({ name }).returning();
    return newRegion;
  }
  async createMission(name: string, regionId: number) {
    const [newMission] = await db.insert(missions).values({ name, regionId }).returning();
    return newMission;
  }
  async createStake(name: string, missionId: number) {
    const [newStake] = await db.insert(stakes).values({ name, missionId }).returning();
    return newStake;
  }

  // --- User Methods ---
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

  // --- Ward Methods ---
  async getWard(id: number): Promise<Ward | undefined> {
    const [ward] = await db.select().from(wards).where(eq(wards.id, id));
    return ward || undefined;
  }

  async getWardByAccessCode(accessCode: string): Promise<Ward | undefined> {
    const [ward] = await db.select().from(wards).where(eq(wards.accessCode, accessCode));
    return ward || undefined;
  }

  async getAllWards(): Promise<Ward[]> {
    return await db.select().from(wards).where(eq(wards.active, true));
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

  // --- User-Ward Relationship Methods ---
  async getUserWards(userId: number): Promise<Ward[]> {
    const userWardsResult = await db
      .select({
        ward: wards,
      })
      .from(userWards)
      .innerJoin(wards, eq(userWards.wardId, wards.id))
      .where(and(eq(userWards.userId, userId), eq(wards.active, true)));

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
    await db
      .delete(userWards)
      .where(
        and(
          eq(userWards.userId, userId),
          eq(userWards.wardId, wardId)
        )
      );
    return true;
  }

  // --- Missionary Methods ---
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

  async getMissionaryByEmail(emailAddress: string): Promise<Missionary | undefined> {
    const [missionary] = await db
      .select()
      .from(missionaries)
      .where(eq(missionaries.emailAddress, emailAddress))
      .orderBy(desc(missionaries.active), desc(missionaries.id)); // Prioritize active missionaries
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
      .where(and(eq(missionaries.wardId, wardId), eq(missionaries.active, true)));
  }

  async getMissionariesByMission(missionId: number): Promise<Missionary[]> {
      return await db
        .select()
        .from(missionaries)
        .where(eq(missionaries.missionId, missionId));
  }

  // New method to get missionaries needing a meal
  async getMissionariesNeedingMeal(wardId: number, thresholdDays: number): Promise<Missionary[]> {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      const recentMealsSubquery = db
        .select({ missionaryId: meals.missionaryId })
        .from(meals)
        .where(and(
            eq(meals.wardId, wardId),
            gte(meals.date, thresholdDate)
        ))
        .groupBy(meals.missionaryId);

      return await db
        .select()
        .from(missionaries)
        .where(and(
            eq(missionaries.wardId, wardId),
            eq(missionaries.active, true),
            sql`${missionaries.id} NOT IN ${recentMealsSubquery}`
        ));
  }

  async getAllMissionaries(): Promise<Missionary[]> {
    return await db.select().from(missionaries);
  }

  async createMissionary(insertMissionary: InsertMissionary): Promise<Missionary> {
    const [missionary] = await db
      .insert(missionaries)
      .values(insertMissionary)
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

  async deleteMissionary(id: number): Promise<boolean> {
    // Soft delete is handled by setting active=false in the route
    // This function can remain for hard deletion if ever needed, or be removed.
    // For now, it will perform a hard delete if called directly.
    await db.delete(missionaries).where(eq(missionaries.id, id));
    return true;
  }

  // --- Meal Methods ---
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal || undefined;
  }

  async getMealsByDate(date: Date, wardId?: number): Promise<Meal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = db.select().from(meals).where(and(
        gte(meals.date, startOfDay),
        lte(meals.date, endOfDay)
    ));

    if (wardId !== undefined) {
      query = query.where(eq(meals.wardId, wardId));
    }

    return await query;
  }

  async getMealsByDateRange(startDate: Date, endDate: Date, wardId?: number): Promise<Meal[]> {
    let query = db.select().from(meals).where(and(
      gte(meals.date, startDate),
      lte(meals.date, endDate)
    ));

    if (wardId !== undefined) {
      query = query.where(eq(meals.wardId, wardId));
    }

    return await query;
  }

  async getMealsByMissionary(missionaryId: number): Promise<Meal[]> {
    return await db
      .select()
      .from(meals)
      .where(eq(meals.missionaryId, missionaryId));
  }

  async getUpcomingMealsByHostPhone(hostPhone: string, wardId?: number): Promise<Meal[]> {
    const now = new Date();

    let query = db.select().from(meals).where(and(
        eq(meals.hostPhone, hostPhone),
        gte(meals.date, now),
        eq(meals.cancelled, false)
    ));

    if (wardId !== undefined) {
      query = query.where(eq(meals.wardId, wardId));
    }

    return await query;
  }

  async checkMealAvailability(date: Date, missionaryTypeOrId: string, wardId: number): Promise<boolean> {
    const mealsOnDate = await this.getMealsByDate(date, wardId);

    const missionaryId = parseInt(missionaryTypeOrId, 10);
    if (!isNaN(missionaryId)) {
        const existingMeal = mealsOnDate.find(m => m.missionaryId === missionaryId && !m.cancelled);
        return !existingMeal;
    } 

    const missionaries = await this.getMissionariesByType(missionaryTypeOrId, wardId);
    if (missionaries.length === 0) return false;

    // Check if ALL missionaries of this type are booked
    const bookedMissionaryIds = new Set(mealsOnDate.map(m => m.missionaryId));
    const allBooked = missionaries.every(m => bookedMissionaryIds.has(m.id));

    return !allBooked;
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const [meal] = await db
      .insert(meals)
      .values(insertMeal)
      .returning();
    return meal;
  }

  async updateMeal(mealId: number, mealUpdate: Partial<Meal>): Promise<Meal | undefined> {
    const [updatedMeal] = await db
      .update(meals)
      .set(mealUpdate)
      .where(eq(meals.id, mealId))
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

  // New method for engagement reminders
  async getHostEmailsForWard(wardId: number): Promise<string[]> {
      const results = await db
        .selectDistinct({ hostEmail: meals.hostEmail })
        .from(meals)
        .where(and(
            eq(meals.wardId, wardId),
            isNotNull(meals.hostEmail)
        ));

      return results.map(r => r.hostEmail).filter((email): email is string => !!email);
  }
}