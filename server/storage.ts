import { meals, missionaries, users, type User, type InsertUser, type Missionary, type InsertMissionary, type Meal, type InsertMeal, type UpdateMeal } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Missionary methods
  getMissionary(id: number): Promise<Missionary | undefined>;
  getMissionariesByType(type: string): Promise<Missionary[]>;
  getAllMissionaries(): Promise<Missionary[]>;
  createMissionary(missionary: InsertMissionary): Promise<Missionary>;
  updateMissionary(id: number, data: Partial<Missionary>): Promise<Missionary | undefined>;
  
  // Meal methods
  getMeal(id: number): Promise<Meal | undefined>;
  getMealsByDate(date: Date): Promise<Meal[]>;
  getMealsByDateRange(startDate: Date, endDate: Date): Promise<Meal[]>;
  getMealsByMissionary(missionaryId: number): Promise<Meal[]>;
  getUpcomingMealsByHostPhone(hostPhone: string): Promise<Meal[]>;
  checkMealAvailability(date: Date, missionaryType: string): Promise<boolean>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(mealUpdate: UpdateMeal): Promise<Meal | undefined>;
  cancelMeal(id: number, reason?: string): Promise<Meal | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private missionaries: Map<number, Missionary>;
  private meals: Map<number, Meal>;
  private userCurrentId: number;
  private missionaryCurrentId: number;
  private mealCurrentId: number;

  constructor() {
    this.users = new Map();
    this.missionaries = new Map();
    this.meals = new Map();
    this.userCurrentId = 1;
    this.missionaryCurrentId = 1;
    this.mealCurrentId = 1;
    
    // Create default admin user
    this.createUser({ 
      username: 'admin', 
      password: 'admin123' // in production, would be hashed
    }).then(user => {
      // Update admin status
      const adminUser = { ...user, isAdmin: true };
      this.users.set(user.id, adminUser);
      
      // Create initial missionary data
      this.createMissionary({
        name: 'Elder Johnson & Elder Smith',
        type: 'elders',
        phoneNumber: '5551234567',
        messengerAccount: 'missionaries.elders',
        preferredNotification: 'text'
      });
      
      this.createMissionary({
        name: 'Sister Williams & Sister Davis',
        type: 'sisters',
        phoneNumber: '5559876543',
        messengerAccount: 'missionaries.sisters',
        preferredNotification: 'messenger'
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
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  // Missionary Methods
  async getMissionary(id: number): Promise<Missionary | undefined> {
    return this.missionaries.get(id);
  }

  async getMissionariesByType(type: string): Promise<Missionary[]> {
    return Array.from(this.missionaries.values()).filter(
      missionary => missionary.type === type && missionary.active
    );
  }

  async getAllMissionaries(): Promise<Missionary[]> {
    return Array.from(this.missionaries.values()).filter(
      missionary => missionary.active
    );
  }

  async createMissionary(insertMissionary: InsertMissionary): Promise<Missionary> {
    const id = this.missionaryCurrentId++;
    const missionary: Missionary = { ...insertMissionary, id, active: true };
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

  async getMealsByDate(date: Date): Promise<Meal[]> {
    // Set the time to the beginning of the day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.meals.values()).filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startOfDay && mealDate <= endOfDay;
    });
  }

  async getMealsByDateRange(startDate: Date, endDate: Date): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startDate && mealDate <= endDate;
    });
  }

  async getMealsByMissionary(missionaryId: number): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(
      meal => meal.missionaryId === missionaryId
    );
  }

  async getUpcomingMealsByHostPhone(hostPhone: string): Promise<Meal[]> {
    const now = new Date();
    return Array.from(this.meals.values()).filter(
      meal => meal.hostPhone === hostPhone && new Date(meal.date) >= now && !meal.cancelled
    );
  }

  async checkMealAvailability(date: Date, missionaryType: string): Promise<boolean> {
    const mealsOnDate = await this.getMealsByDate(date);
    
    // Get missionaries of the requested type
    const missionaries = await this.getMissionariesByType(missionaryType);
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
    const meal: Meal = { 
      ...insertMeal,
      id,
      cancelled: false,
      cancellationReason: ''
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
      cancellationReason: reason || ''
    };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }
}

export const storage = new MemStorage();
