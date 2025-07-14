// server/database-storage.ts
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
import { eq, and, gte, lte, desc, sql, or, isNull, ilike } from "drizzle-orm"; // Import ilike for case-insensitive search
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
  async getAllRegions(): Promise<(Region & { missions: Mission[] })[]> {
    return await db.query.regions.findMany({
      with: {
        missions: true, // Eager-load all missions associated with each region
      }
    });
  }

  async createRegion(region: { name: string, description?: string }): Promise<Region> {
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

  async getAllMissions(showUnassignedOnly?: boolean, searchTerm?: string): Promise<(Mission & { region?: Region | null, stakes: Stake[] })[]> {
    const conditions = [];

    if (showUnassignedOnly) {
      conditions.push(isNull(missions.regionId));
    }

    if (searchTerm) {
      conditions.push(ilike(missions.name, `%${searchTerm}%`));
    }

    // Eager-load associated stakes for each mission
    return await db.query.missions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        region: true, // Include region details
        stakes: true, // Eager-load all stakes associated with each mission
      }
    });
  }

  async getMissionsByRegion(regionId: number): Promise<(Mission & { region?: Region | null, stakes: Stake[] })[]> {
    return await db.query.missions.findMany({
      where: eq(missions.regionId, regionId),
      with: {
        region: true,
        stakes: true, // Eager-load associated stakes
      }
    });
  }

  async createMission(mission: { name: string; regionId?: number | null, description?: string }): Promise<Mission> {
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

  async getAllStakes(showUnassignedOnly?: boolean, searchTerm?: string): Promise<(Stake & { mission?: Mission | null, congregations: Congregation[] })[]> {
    const conditions = [];

    if (showUnassignedOnly) {
      conditions.push(isNull(stakes.missionId));
    }

    if (searchTerm) {
      conditions.push(ilike(stakes.name, `%${searchTerm}%`));
    }

    // Eager-load associated congregations for each stake
    return await db.query.stakes.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        mission: true, // Include mission details for display
        congregations: true, // Eager-load all congregations associated with each stake
      }
    });
  }

  async getStakesByMission(missionId: number): Promise<(Stake & { mission?: Mission | null, congregations: Congregation[] })[]> {
    return await db.query.stakes.findMany({
      where: eq(stakes.missionId, missionId),
      with: {
        mission: true,
        congregations: true, // Eager-load associated congregations
      }
    });
  }

  async createStake(stake: { name: string; missionId?: number | null, description?: string }): Promise<Stake> {
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

  async getAllCongregations(showUnassignedOnly?: boolean, searchTerm?: string): Promise<(Congregation & { stake?: Stake | null })[]> {
    const conditions = [];

    if (showUnassignedOnly) {
      conditions.push(isNull(congregations.stakeId));
    }

    if (searchTerm) {
      conditions.push(ilike(congregations.name, `%${searchTerm}%`));
    }

    return await db.query.congregations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        stake: true, // Include stake details for display
      }
    });
  }

  async getCongregationsByStake(stakeId: number): Promise<(Congregation & { stake?: Stake | null })[]> {
    return await db.query.congregations.findMany({
      where: eq(congregations.stakeId, stakeId),
      with: {
        stake: true,
      }
    });
  }

  // Congregation methods
  async getCongregation(id: number): Promise<Congregation | undefined> {
    const [congregation] = await db.select().from(congregations).where(eq(congregations.id, id));
    return congregation || undefined;
  }

  async getCongregationByAccessCode(accessCode: string): Promise<Congregation | undefined> {
    const [congregation] = await db.select().from(congregations).where(eq(congregations.accessCode, accessCode));
    return congregation || undefined;


  }async createCongregation(congregation: InsertCongregation): Promise<Congregation> {
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
  async getUserCongregations(userId: number, showUnassignedOnly?: boolean, searchTerm?: string): Promise<(Congregation & { stake?: Stake | null })[]> {
    const conditions = [eq(userCongregations.userId, userId)];

    if (showUnassignedOnly) {
      conditions.push(isNull(congregations.stakeId));
    }

    if (searchTerm) {
      conditions.push(ilike(congregations.name, `%${searchTerm}%`));
    }

    const userCongregationResult = await db.query.userCongregations.findMany({
      where: and(...conditions),
      with: {
        congregation: { // Include the full congregation object
          with: {
            stake: true, // Also include stake details for the congregation
          },
        },
      },
    });

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

  async getMissionariesByCongregation(congregationId: number, searchTerm?: string): Promise<Missionary[]> {
    const conditions = [eq(missionaries.congregationId, congregationId)];

    if (searchTerm) {
      conditions.push(ilike(missionaries.name, `%${searchTerm}%`));
    }

    return await db
      .select()
      .from(missionaries)
      .where(and(...conditions));
  }

  async getAllMissionaries(searchTerm?: string): Promise<Missionary[]> {
    const conditions = [];

    if (searchTerm) {
      conditions.push(ilike(missionaries.name, `%${searchTerm}%`));
    }

    return await db
      .select()
      .from(missionaries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
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
    // If setting active to false, set deletedAt timestamp. If setting to true, clear deletedAt.
    if (data.active === false) {
      data.deletedAt = new Date();
    } else if (data.active === true) {
      data.deletedAt = null;
    }

    const [updatedMissionary] = await db
      .update(missionaries)
      .set(data)
      .where(eq(missionaries.id, id))
      .returning();
    return updatedMissionary || undefined;
  }

  async deleteMissionary(id: number): Promise<boolean> {
    // This method is now used for permanent deletion
    await db
      .delete(meals) // Delete associated meals first due to foreign key constraints
      .where(eq(meals.missionaryId, id));

    await db
      .delete(missionaries)
      .where(eq(missionaries.id, id));
    return true;
  }

  async getInactiveMissionariesOlderThan(months: number): Promise<Missionary[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return await db.select().from(missionaries).where(
      and(
        eq(missionaries.active, false),
        sql`${missionaries.deletedAt} < ${cutoffDate}`
      )
    );
  }

  async permanentlyDeleteMissionary(id: number): Promise<boolean> {
      // This function already exists as deleteMissionary
      // Renaming it for clarity but keeping the original implementation.
      return this.deleteMissionary(id);
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