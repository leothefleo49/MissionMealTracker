import { pgTable, text, serial, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Wards table (new)
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accessCode: uuid("access_code").notNull().unique(), // Unique access code for direct ward access
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wardsRelations = relations(wards, ({ many }) => ({
  users: many(userWards),
  missionaries: many(missionaries),
}));

export const insertWardSchema = createInsertSchema(wards).pick({
  name: true,
});

export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(), // Can manage all wards
});

// User-Ward relationship table (new)
export const userWards = pgTable("user_wards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
});

export const userWardsRelations = relations(userWards, ({ one }) => ({
  user: one(users, { fields: [userWards.userId], references: [users.id] }),
  ward: one(wards, { fields: [userWards.wardId], references: [wards.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  wardAccess: many(userWards),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
  isSuperAdmin: true,
});

export const insertUserWardSchema = createInsertSchema(userWards).pick({
  userId: true,
  wardId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserWard = z.infer<typeof insertUserWardSchema>;
export type User = typeof users.$inferSelect;
export type UserWard = typeof userWards.$inferSelect;

// Missionaries table
export const missionaries = pgTable("missionaries", {
  id: serial("id").primaryKey(),
  wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'elders' or 'sisters'
  phoneNumber: text("phone_number").notNull(),
  messengerAccount: text("messenger_account"),
  preferredNotification: text("preferred_notification").default("text").notNull(), // 'text' or 'messenger'
  active: boolean("active").default(true).notNull(),
});

export const missionariesRelations = relations(missionaries, ({ one, many }) => ({
  ward: one(wards, { fields: [missionaries.wardId], references: [wards.id] }),
  meals: many(meals),
}));

export const insertMissionarySchema = createInsertSchema(missionaries).pick({
  wardId: true,
  name: true,
  type: true,
  phoneNumber: true,
  messengerAccount: true,
  preferredNotification: true,
  active: true,
});

export type InsertMissionary = z.infer<typeof insertMissionarySchema>;
export type Missionary = typeof missionaries.$inferSelect;

// Meals table
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // Format: "HH:MM" in 24h format
  hostName: text("host_name").notNull(),
  hostPhone: text("host_phone").notNull(), 
  mealDescription: text("meal_description"),
  specialNotes: text("special_notes"),
  cancelled: boolean("cancelled").default(false).notNull(),
  cancellationReason: text("cancellation_reason"),
});

export const mealsRelations = relations(meals, ({ one }) => ({
  missionary: one(missionaries, { fields: [meals.missionaryId], references: [missionaries.id] }),
}));

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
  wardId: z.number(),
});

export type CheckMealAvailability = z.infer<typeof checkMealAvailabilitySchema>;
