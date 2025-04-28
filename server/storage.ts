import { meals, missionaries, users, wards, userWards, type User, type InsertUser, type Missionary, type InsertMissionary, type Meal, type InsertMeal, type UpdateMeal, type Ward, type InsertWard, type InsertUserWard, type UserWard } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import crypto from "crypto";

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // Ward methods
  getWard(id: number): Promise<Ward | undefined>;
  getWardByAccessCode(accessCode: string): Promise<Ward | undefined>;
  getAllWards(): Promise<Ward[]>;
  createWard(ward: InsertWard): Promise<Ward>;
  updateWard(id: number, data: Partial<Ward>): Promise<Ward | undefined>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWards(userId: number): Promise<Ward[]>;
  addUserToWard(userWard: InsertUserWard): Promise<UserWard>;
  removeUserFromWard(userId: number, wardId: number): Promise<boolean>;
  
  // Missionary methods
  getMissionary(id: number): Promise<Missionary | undefined>;
  getMissionariesByType(type: string, wardId: number): Promise<Missionary[]>;
  getMissionariesByWard(wardId: number): Promise<Missionary[]>;
  getAllMissionaries(): Promise<Missionary[]>;
  createMissionary(missionary: InsertMissionary): Promise<Missionary>;
  updateMissionary(id: number, data: Partial<Missionary>): Promise<Missionary | undefined>;
  
  // Meal methods
  getMeal(id: number): Promise<Meal | undefined>;
  getMealsByDate(date: Date, wardId?: number): Promise<Meal[]>;
  getMealsByDateRange(startDate: Date, endDate: Date, wardId?: number): Promise<Meal[]>;
  getMealsByMissionary(missionaryId: number): Promise<Meal[]>;
  getUpcomingMealsByHostPhone(hostPhone: string, wardId?: number): Promise<Meal[]>;
  checkMealAvailability(date: Date, missionaryType: string, wardId: number): Promise<boolean>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(mealUpdate: UpdateMeal): Promise<Meal | undefined>;
  cancelMeal(id: number, reason?: string): Promise<Meal | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private missionaries: Map<number, Missionary>;
  private meals: Map<number, Meal>;
  private wards: Map<number, Ward>;
  private userWards: Map<number, UserWard>;
  
  private userCurrentId: number;
  private missionaryCurrentId: number;
  private mealCurrentId: number;
  private wardCurrentId: number;
  private userWardCurrentId: number;
  
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.missionaries = new Map();
    this.meals = new Map();
    this.wards = new Map();
    this.userWards = new Map();
    
    this.userCurrentId = 1;
    this.missionaryCurrentId = 1;
    this.mealCurrentId = 1;
    this.wardCurrentId = 1;
    this.userWardCurrentId = 1;
    
    // Create a memory session store for auth
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create default super admin user
    this.createUser({ 
      username: 'admin', 
      password: 'admin123', // in production, would be hashed
      isAdmin: true,
      isSuperAdmin: true
    }).then(user => {
      // Create initial ward
      this.createWard({
        name: 'Main Ward',
        accessCode: crypto.randomUUID(), // Generate random access code
      }).then(ward => {
        // Add admin to ward
        this.addUserToWard({ userId: user.id, wardId: ward.id });
        
        // Create initial missionary data for this ward
        this.createMissionary({
          wardId: ward.id,
          name: 'Elder Johnson & Elder Smith',
          type: 'elders',
          phoneNumber: '5551234567',
          messengerAccount: 'missionaries.elders',
          preferredNotification: 'text',
          active: true,
          notificationScheduleType: 'before_meal',
          hoursBefore: 3,
          dayOfTime: '09:00',
          weeklySummaryDay: 'sunday',
          weeklySummaryTime: '18:00',
          useMultipleNotifications: false
        });
        
        this.createMissionary({
          wardId: ward.id,
          name: 'Sister Williams & Sister Davis',
          type: 'sisters',
          phoneNumber: '5559876543',
          messengerAccount: 'missionaries.sisters',
          preferredNotification: 'messenger',
          active: true,
          notificationScheduleType: 'day_of',
          hoursBefore: 2,
          dayOfTime: '08:00',
          weeklySummaryDay: 'monday',
          weeklySummaryTime: '17:00',
          useMultipleNotifications: false
        });
      });
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    // Ensure both isAdmin and isSuperAdmin are set with defaults if not provided
    const user: User = { 
      ...insertUser, 
      id, 
      isAdmin: insertUser.isAdmin ?? false,
      isSuperAdmin: insertUser.isSuperAdmin ?? false 
    };
    this.users.set(id, user);
    return user;
  }

  // Ward Methods
  async getWard(id: number): Promise<Ward | undefined> {
    return this.wards.get(id);
  }

  async getWardByAccessCode(accessCode: string): Promise<Ward | undefined> {
    return Array.from(this.wards.values()).find(
      (ward) => ward.accessCode === accessCode
    );
  }

  async getAllWards(): Promise<Ward[]> {
    return Array.from(this.wards.values()).filter(ward => ward.active);
  }

  async createWard(ward: InsertWard): Promise<Ward> {
    const id = this.wardCurrentId++;
    // If accessCode not provided, generate a random UUID
    const accessCode = ward.accessCode || crypto.randomUUID();
    const newWard: Ward = { 
      ...ward, 
      id, 
      accessCode,
      description: null,
      allowCombinedBookings: false,
      maxBookingsPerPeriod: 1,
      bookingPeriodDays: 30,
      active: true,
      maxBookingsPerAddress: 1,
      maxBookingsPerPhone: 1
    };
    this.wards.set(id, newWard);
    return newWard;
  }

  async updateWard(id: number, data: Partial<Ward>): Promise<Ward | undefined> {
    const ward = await this.getWard(id);
    if (!ward) return undefined;
    
    const updatedWard = { ...ward, ...data };
    this.wards.set(id, updatedWard);
    return updatedWard;
  }

  // User-Ward Methods
  async getUserWards(userId: number): Promise<Ward[]> {
    // Find all user-ward relationships for this user
    const userWardRelations = Array.from(this.userWards.values())
      .filter(userWard => userWard.userId === userId);
    
    // Get all wards from these relationships
    const wards: Ward[] = [];
    for (const relation of userWardRelations) {
      const ward = await this.getWard(relation.wardId);
      if (ward && ward.active) {
        wards.push(ward);
      }
    }
    
    return wards;
  }

  async addUserToWard(userWard: InsertUserWard): Promise<UserWard> {
    const id = this.userWardCurrentId++;
    const newUserWard: UserWard = { ...userWard, id };
    this.userWards.set(id, newUserWard);
    return newUserWard;
  }

  async removeUserFromWard(userId: number, wardId: number): Promise<boolean> {
    // Find the user-ward relationship
    const userWardEntry = Array.from(this.userWards.entries()).find(
      ([_, userWard]) => userWard.userId === userId && userWard.wardId === wardId
    );
    
    if (userWardEntry) {
      const [id] = userWardEntry;
      this.userWards.delete(id);
      return true;
    }
    
    return false;
  }

  // Missionary Methods
  async getMissionary(id: number): Promise<Missionary | undefined> {
    return this.missionaries.get(id);
  }

  async getMissionariesByType(type: string, wardId: number): Promise<Missionary[]> {
    return Array.from(this.missionaries.values()).filter(
      missionary => missionary.type === type && 
                    missionary.active && 
                    missionary.wardId === wardId
    );
  }

  async getMissionariesByWard(wardId: number): Promise<Missionary[]> {
    return Array.from(this.missionaries.values()).filter(
      missionary => missionary.wardId === wardId && missionary.active
    );
  }

  async getAllMissionaries(): Promise<Missionary[]> {
    return Array.from(this.missionaries.values()).filter(
      missionary => missionary.active
    );
  }

  async createMissionary(insertMissionary: InsertMissionary): Promise<Missionary> {
    const id = this.missionaryCurrentId++;
    // Ensure proper null handling for optional fields and set default values for notification settings
    const missionary: Missionary = { 
      ...insertMissionary, 
      id, 
      active: true,
      messengerAccount: insertMissionary.messengerAccount || null,
      preferredNotification: insertMissionary.preferredNotification || 'text',
      // Default notification settings if not provided
      notificationScheduleType: insertMissionary.notificationScheduleType || 'before_meal',
      hoursBefore: insertMissionary.hoursBefore || 3,
      dayOfTime: insertMissionary.dayOfTime || '09:00',
      weeklySummaryDay: insertMissionary.weeklySummaryDay || 'sunday',
      weeklySummaryTime: insertMissionary.weeklySummaryTime || '18:00',
      useMultipleNotifications: insertMissionary.useMultipleNotifications || false
    };
    this.missionaries.set(id, missionary);
    return missionary;
  }

  async updateMissionary(id: number, data: Partial<Missionary>): Promise<Missionary | undefined> {
    const missionary = await this.getMissionary(id);
    if (!missionary) return undefined;
    
    const updatedMissionary = { ...missionary, ...data };
    this.missionaries.set(id, updatedMissionary);
    return updatedMissionary;
  }

  // Meal Methods
  async getMeal(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }

  async getMealsByDate(date: Date, wardId?: number): Promise<Meal[]> {
    // Set the time to the beginning of the day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const meals = Array.from(this.meals.values()).filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startOfDay && mealDate <= endOfDay;
    });

    // If ward filtering is requested
    if (wardId !== undefined) {
      // Get all missionaries in the ward
      const wardMissionaries = await this.getMissionariesByWard(wardId);
      const wardMissionaryIds = wardMissionaries.map(m => m.id);
      
      // Filter meals to only include those for missionaries in this ward
      return meals.filter(meal => wardMissionaryIds.includes(meal.missionaryId));
    }
    
    return meals;
  }

  async getMealsByDateRange(startDate: Date, endDate: Date, wardId?: number): Promise<Meal[]> {
    const meals = Array.from(this.meals.values()).filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startDate && mealDate <= endDate;
    });

    // If ward filtering is requested
    if (wardId !== undefined) {
      // Get all missionaries in the ward
      const wardMissionaries = await this.getMissionariesByWard(wardId);
      const wardMissionaryIds = wardMissionaries.map(m => m.id);
      
      // Filter meals to only include those for missionaries in this ward
      return meals.filter(meal => wardMissionaryIds.includes(meal.missionaryId));
    }
    
    return meals;
  }

  async getMealsByMissionary(missionaryId: number): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(
      meal => meal.missionaryId === missionaryId
    );
  }

  async getUpcomingMealsByHostPhone(hostPhone: string, wardId?: number): Promise<Meal[]> {
    const now = new Date();
    const meals = Array.from(this.meals.values()).filter(
      meal => meal.hostPhone === hostPhone && new Date(meal.date) >= now && !meal.cancelled
    );

    // If ward filtering is requested
    if (wardId !== undefined) {
      // Get all missionaries in the ward
      const wardMissionaries = await this.getMissionariesByWard(wardId);
      const wardMissionaryIds = wardMissionaries.map(m => m.id);
      
      // Filter meals to only include those for missionaries in this ward
      return meals.filter(meal => wardMissionaryIds.includes(meal.missionaryId));
    }
    
    return meals;
  }

  async checkMealAvailability(date: Date, missionaryType: string, wardId: number): Promise<boolean> {
    const mealsOnDate = await this.getMealsByDate(date, wardId);
    
    // Get missionaries of the requested type in this ward
    const missionaries = await this.getMissionariesByType(missionaryType, wardId);
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

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const id = this.mealCurrentId++;
    // Ensure proper null handling for optional fields
    const meal: Meal = { 
      ...insertMeal,
      id,
      cancelled: false,
      cancellationReason: null,
      mealDescription: insertMeal.mealDescription || null,
      specialNotes: insertMeal.specialNotes || null
    };
    this.meals.set(id, meal);
    return meal;
  }

  async updateMeal(mealUpdate: UpdateMeal): Promise<Meal | undefined> {
    const meal = await this.getMeal(mealUpdate.id);
    if (!meal) return undefined;
    
    const updatedMeal = { ...meal, ...mealUpdate };
    this.meals.set(meal.id, updatedMeal);
    return updatedMeal;
  }

  async cancelMeal(id: number, reason?: string): Promise<Meal | undefined> {
    const meal = await this.getMeal(id);
    if (!meal) return undefined;
    
    const updatedMeal = { 
      ...meal, 
      cancelled: true, 
      cancellationReason: reason || null
    };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }
}

export const storage = new MemStorage();
