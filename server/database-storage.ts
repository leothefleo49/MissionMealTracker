import { IStorage } from './storage';
import {
  users, type User, type InsertUser,
  missionaries, type Missionary, type InsertMissionary,
  meals, type Meal, type InsertMeal, type UpdateMeal,
  congregations, type Congregation, type InsertCongregation,
  userCongregations, type UserCongregation, type InsertUserCongregation,
  regions, type Region,
  missions, type Mission,
  stakes, type Stake
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, or, isNull } from "drizzle-orm";
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

  async getUltraAdmin(): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.role, 'ultra'));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Congregation Hierarchy methods
  async getAllRegions(): Promise<Region[]> {
    return await db.select().from(regions);
  }

  async createRegion(region: { name: string }): Promise<Region> {
    const [newRegion] = await db.insert(regions).values(region).returning();
    return newRegion;
  }

  async updateRegion(id: number, data: Partial<Region>): Promise<Region | undefined> {
    const [updatedRegion] = await db.update(regions).set(data).where(eq(regions.id, id)).returning();
    return updatedRegion;
  }

  async deleteRegion(id: number): Promise<boolean> {
    await db.delete(regions).where(eq(regions.id, id));
    return true;
  }

  async getAllMissions(): Promise<Mission[]> {
    return await db.select().from(missions);
  }

  async getMissionsByRegion(regionId: number): Promise<Mission[]> {
    return await db.select().from(missions).where(eq(missions.regionId, regionId));
  }

  async createMission(mission: { name: string; regionId?: number | null }): Promise<Mission> {
    const [newMission] = await db.insert(missions).values(mission).returning();
    return newMission;
  }

  async updateMission(id: number, data: Partial<Mission>): Promise<Mission | undefined> {
    const [updatedMission] = await db.update(missions).set(data).where(eq(missions.id, id)).returning();
    return updatedMission;
  }

  async deleteMission(id: number): Promise<boolean> {
    await db.delete(missions).where(eq(missions.id, id));
    return true;
  }

  async getAllStakes(): Promise<Stake[]> {
    return await db.select().from(stakes);
  }

  async getStakesByMission(missionId: number): Promise<Stake[]> {
    return await db.select().from(stakes).where(eq(stakes.missionId, missionId));
  }

  async createStake(stake: { name: string; missionId?: number | null }): Promise<Stake> {
    const [newStake] = await db.insert(stakes).values(stake).returning();
    return newStake;
  }

  async updateStake(id: number, data: Partial<Stake>): Promise<Stake | undefined> {
    const [updatedStake] = await db.update(stakes).set(data).where(eq(stakes.id, id)).returning();
    return updatedStake;
  }

  async deleteStake(id: number): Promise<boolean> {
    await db.delete(stakes).where(eq(stakes.id, id));
    return true;
  }

  async getCongregationsByStake(stakeId: number): Promise<Congregation[]> {
    return await db.select().from(congregations).where(eq(congregations.stakeId, stakeId));
  }

  // Congregation methods
  async getCongregation(id: number): Promise<Congregation | undefined> {
    const [congregation] = await db.select().from(congregations).where(eq(congregations.id, id));
    return congregation || undefined;
  }

  async getCongregationByAccessCode(accessCode: string): Promise<Congregation | undefined> {
    const [congregation] = await db.select().from(congregations).where(eq(congregations.accessCode, accessCode));
    return congregation || undefined;
  }

  async getAllCongregations(): Promise<Congregation[]> {
    return await db.select().from(congregations);
  }

  async createCongregation(congregation: InsertCongregation): Promise<Congregation> {
    const [newCongregation] = await db
      .insert(congregations)
      .values(congregation)
      .returning();
    return newCongregation;
  }

  async updateCongregation(id: number, data: Partial<Congregation>): Promise<Congregation | undefined> {
    const [updatedCongregation] = await db
      .update(congregations)
      .set(data)
      .where(eq(congregations.id, id))
      .returning();
    return updatedCongregation || undefined;
  }

  // User-Congregation relationship methods
  async getUserCongregations(userId: number): Promise<Congregation[]> {
    const userCongregationResult = await db
      .select({
        congregation: congregations,
      })
      .from(userCongregations)
      .innerJoin(congregations, eq(userCongregations.congregationId, congregations.id))
      .where(eq(userCongregations.userId, userId));

    return userCongregationResult.map(result => result.congregation);
  }

  async addUserToCongregation(userCongregation: InsertUserCongregation): Promise<UserCongregation> {
    const [newUserCongregation] = await db
      .insert(userCongregations)
      .values(userCongregation)
      .returning();
    return newUserCongregation;
  }

  async removeUserFromCongregation(userId: number, congregationId: number): Promise<boolean> {
    await db
      .delete(userCongregations)
      .where(
        and(
          eq(userCongregations.userId, userId),
          eq(userCongregations.congregationId, congregationId)
        )
      );
    return true;
  }

  // Missionary methods
  async getMissionary(id: number): Promise<Missionary | undefined> {
    const [missionary] = await db.select().from(missionaries).where(eq(missionaries.id, id));
    return missionary || undefined;
  }

  async getMissionaryByName(congregationId: number, name: string): Promise<Missionary | undefined> {
    const [missionary] = await db
      .select()
      .from(missionaries)
      .where(
        and(
          eq(missionaries.congregationId, congregationId),
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
      .orderBy(missionaries.id);
    return missionary || undefined;
  }

  async getMissionariesByType(type: string, congregationId: number): Promise<Missionary[]> {
    return await db
      .select()
      .from(missionaries)
      .where(
        and(
          eq(missionaries.type, type),
          eq(missionaries.congregationId, congregationId),
          eq(missionaries.active, true)
        )
      );
  }

  async getMissionariesByCongregation(congregationId: number): Promise<Missionary[]> {
    return await db
      .select()
      .from(missionaries)
      .where(eq(missionaries.congregationId, congregationId));
  }

  async getAllMissionaries(): Promise<Missionary[]> {
    return await db.select().from(missionaries);
  }

  async createMissionary(insertMissionary: InsertMissionary): Promise<Missionary> {
    const missionaryData = {
      ...insertMissionary,
      consentStatus: insertMissionary.consentStatus || 'pending',
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

  async deleteMissionary(id: number): Promise<boolean> {
    await db
      .delete(missionaries)
      .where(eq(missionaries.id, id));
    return true;
  }

  // Meal methods
  async getMeal(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal || undefined;
  }

  async getMealsByDate(date: Date, congregationId?: number): Promise<Meal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let conditions = [
      gte(meals.date, startOfDay),
      lte(meals.date, endOfDay)
    ];

    if (congregationId !== undefined) {
      conditions.push(eq(meals.congregationId, congregationId));
    }

    return await db
      .select()
      .from(meals)
      .where(and(...conditions));
  }

  async getMealsByDateRange(startDate: Date, endDate: Date, congregationId?: number): Promise<Meal[]> {
    let conditions = [
      gte(meals.date, startDate),
      lte(meals.date, endDate)
    ];

    if (congregationId !== undefined) {
      conditions.push(eq(meals.congregationId, congregationId));
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

  async getUpcomingMealsByHostPhone(hostPhone: string, congregationId?: number): Promise<Meal[]> {
    const now = new Date();

    let conditions = [
      eq(meals.hostPhone, hostPhone),
      gte(meals.date, now),
      eq(meals.cancelled, false)
    ];

    if (congregationId !== undefined) {
      conditions.push(eq(meals.congregationId, congregationId));
    }

    return await db
      .select()
      .from(meals)
      .where(and(...conditions));
  }

  async checkMealAvailability(date: Date, missionaryTypeOrId: string, congregationId: number): Promise<boolean> {
    const mealsOnDate = await this.getMealsByDate(date, congregationId);
    const missionaryId = parseInt(missionaryTypeOrId, 10);

    if (!isNaN(missionaryId)) {
      const missionary = await this.getMissionary(missionaryId);
      if (!missionary || missionary.congregationId !== congregationId) return false;

      const existingMeal = mealsOnDate.find(
        meal => meal.missionaryId === missionaryId && !meal.cancelled
      );
      return !existingMeal;
    } else {
      const missionaries = await this.getMissionariesByType(missionaryTypeOrId, congregationId);
      if (missionaries.length === 0) return false;

      for (const missionary of missionaries) {
        const existingMeal = mealsOnDate.find(
          meal => meal.missionaryId === missionary.id && !meal.cancelled
        );
        if (!existingMeal) {
          return true;
        }
      }
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