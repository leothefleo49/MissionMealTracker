import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const missionaries = pgTable("missionaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'elders' or 'sisters'
  phoneNumber: text("phone_number").notNull(),
  messengerAccount: text("messenger_account"),
  preferredNotification: text("preferred_notification").default("text").notNull(), // 'text' or 'messenger'
  active: boolean("active").default(true).notNull(),
});

export const insertMissionarySchema = createInsertSchema(missionaries).pick({
  name: true,
  type: true,
  phoneNumber: true,
  messengerAccount: true,
  preferredNotification: true,
});

export type InsertMissionary = z.infer<typeof insertMissionarySchema>;
export type Missionary = typeof missionaries.$inferSelect;

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // Format: "HH:MM" in 24h format
  hostName: text("host_name").notNull(),
  hostPhone: text("host_phone").notNull(), 
  mealDescription: text("meal_description"),
  specialNotes: text("special_notes"),
  cancelled: boolean("cancelled").default(false).notNull(),
  cancellationReason: text("cancellation_reason"),
});

export const insertMealSchema = createInsertSchema(meals).pick({
  missionaryId: true,
  date: true,
  startTime: true,
  hostName: true,
  hostPhone: true,
  mealDescription: true,
  specialNotes: true,
});

export const updateMealSchema = z.object({
  id: z.number(),
  cancelled: z.boolean().optional(),
  cancellationReason: z.string().optional(),
  hostName: z.string().optional(),
  hostPhone: z.string().optional(),
  startTime: z.string().optional(),
  mealDescription: z.string().optional(),
  specialNotes: z.string().optional(),
});

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type UpdateMeal = z.infer<typeof updateMealSchema>;
export type Meal = typeof meals.$inferSelect;

// Schema for meal availability checking
export const checkMealAvailabilitySchema = z.object({
  date: z.string(),
  missionaryType: z.enum(["elders", "sisters"]),
});

export type CheckMealAvailability = z.infer<typeof checkMealAvailabilitySchema>;
