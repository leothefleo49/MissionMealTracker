import {
  User, InsertUser,
  Congregation, InsertCongregation,
  Missionary, InsertMissionary,
  Meal, InsertMeal, UpdateMeal,
  Region, Mission, Stake,
  UserCongregation, InsertUserCongregation
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from './database-storage';

export interface IStorage {
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUltraAdmin(): Promise<User | undefined>; // Added this line
  createUser(user: InsertUser): Promise<User>;
  getUserCongregations(userId: number): Promise<Congregation[]>;
  addUserToCongregation(userCongregation: InsertUserCongregation): Promise<UserCongregation>;
  removeUserFromCongregation(userId: number, congregationId: number): Promise<boolean>;

  // Congregation Hierarchy Methods
  getAllRegions(): Promise<Region[]>;
  getMissionsByRegion(regionId: number): Promise<Mission[]>;
  getStakesByMission(missionId: number): Promise<Stake[]>;
  getCongregationsByStake(stakeId: number): Promise<Congregation[]>;

  // Congregation (formerly Ward) methods
  getCongregation(id: number): Promise<Congregation | undefined>;
  getCongregationByAccessCode(accessCode: string): Promise<Congregation | undefined>;
  getAllCongregations(): Promise<Congregation[]>;
  createCongregation(congregation: InsertCongregation): Promise<Congregation>;
  updateCongregation(id: number, data: Partial<Congregation>): Promise<Congregation | undefined>;

  // Missionary methods
  getMissionary(id: number): Promise<Missionary | undefined>;
  getMissionaryByName(congregationId: number, name: string): Promise<Missionary | undefined>;
  getMissionaryByEmail(emailAddress: string): Promise<Missionary | undefined>;
  getMissionariesByType(type: string, congregationId: number): Promise<Missionary[]>;
  getMissionariesByCongregation(congregationId: number): Promise<Missionary[]>;
  getAllMissionaries(): Promise<Missionary[]>;
  createMissionary(missionary: InsertMissionary): Promise<Missionary>;
  updateMissionary(id: number, data: Partial<Missionary>): Promise<Missionary | undefined>;
  deleteMissionary(id: number): Promise<boolean>;

  // Meal methods
  getMeal(id: number): Promise<Meal | undefined>;
  getMealsByDate(date: Date, congregationId?: number): Promise<Meal[]>;
  getMealsByDateRange(startDate: Date, endDate: Date, congregationId?: number): Promise<Meal[]>;
  getMealsByMissionary(missionaryId: number): Promise<Meal[]>;
  getUpcomingMealsByHostPhone(hostPhone: string, congregationId?: number): Promise<Meal[]>;
  checkMealAvailability(date: Date, missionaryType: string, congregationId: number): Promise<boolean>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(mealUpdate: UpdateMeal): Promise<Meal | undefined>;
  cancelMeal(id: number, reason?: string): Promise<Meal | undefined>;
}

// Use DatabaseStorage for persistent storage
export const storage = new DatabaseStorage();