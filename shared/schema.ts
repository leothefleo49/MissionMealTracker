import { relations, sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Wards table
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accessCode: text("access_code").notNull().unique(),
  description: text("description"),
  allowCombinedBookings: boolean("allow_combined_bookings").default(false),
  maxBookingsPerPeriod: integer("max_bookings_per_period").default(1), // Simplified control (0 means unlimited)
  bookingPeriodDays: integer("booking_period_days").default(30), // Default 30 days for tracking limits
  active: boolean("active").default(true),
  // Keeping these fields for database compatibility, but they won't be used in the UI
  maxBookingsPerAddress: integer("max_bookings_per_address").default(1),
  maxBookingsPerPhone: integer("max_bookings_per_phone").default(1),
});

export const wardsRelations = relations(wards, ({ many }) => ({
  missionaries: many(missionaries),
  userAccess: many(userWards),
}));

export const insertWardSchema = createInsertSchema(wards).pick({
  name: true,
  accessCode: true,
});

export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
});

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
  
  // Notification settings
  notificationScheduleType: text("notification_schedule_type").default("before_meal").notNull(), // 'before_meal', 'day_of', 'weekly_summary', 'multiple'
  hoursBefore: integer("hours_before").default(3), // Hours before the meal to send notification
  dayOfTime: text("day_of_time").default("09:00"), // Time of day to send notification for 'day_of' schedule
  weeklySummaryDay: text("weekly_summary_day").default("sunday"), // Day of week to send weekly summary
  weeklySummaryTime: text("weekly_summary_time").default("18:00"), // Time to send weekly summary
  useMultipleNotifications: boolean("use_multiple_notifications").default(false), // True if using multiple notification types
});

export const missionariesRelations = relations(missionaries, ({ one, many }) => ({
  ward: one(wards, { fields: [missionaries.wardId], references: [wards.id] }),
  meals: many(meals),
  messagesSent: many(messageLogs),
}));

export const insertMissionarySchema = createInsertSchema(missionaries).pick({
  wardId: true,
  name: true,
  type: true,
  phoneNumber: true,
  messengerAccount: true,
  preferredNotification: true,
  active: true,
  notificationScheduleType: true,
  hoursBefore: true,
  dayOfTime: true,
  weeklySummaryDay: true,
  weeklySummaryTime: true,
  useMultipleNotifications: true,
});

export type InsertMissionary = z.infer<typeof insertMissionarySchema>;
export type Missionary = typeof missionaries.$inferSelect;

// Meals table
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
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
  ward: one(wards, { fields: [meals.wardId], references: [wards.id] }),
}));

export const insertMealSchema = createInsertSchema(meals).pick({
  missionaryId: true,
  wardId: true,
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

// Message Logs table - for tracking SMS/Messenger notifications
export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  wardId: integer("ward_id").notNull().references(() => wards.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  messageType: text("message_type").notNull(), // 'before_meal', 'day_of', 'weekly_summary'
  messageContent: text("message_content").notNull(),
  deliveryMethod: text("delivery_method").notNull(), // 'sms', 'messenger'
  successful: boolean("successful").notNull(),
  failureReason: text("failure_reason"),
  charCount: integer("char_count").notNull(),
  segmentCount: integer("segment_count").notNull(), // For SMS that are split into multiple messages
});

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
  missionary: one(missionaries, { fields: [messageLogs.missionaryId], references: [missionaries.id] }),
  ward: one(wards, { fields: [messageLogs.wardId], references: [wards.id] }),
}));

export const insertMessageLogSchema = createInsertSchema(messageLogs).pick({
  missionaryId: true,
  wardId: true,
  messageType: true,
  messageContent: true,
  deliveryMethod: true,
  successful: true,
  failureReason: true,
  charCount: true,
  segmentCount: true,
});

export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
export type MessageLog = typeof messageLogs.$inferSelect;

// Message Stats schema for API responses
export const messageStatsSchema = z.object({
  totalMessages: z.number(),
  totalSuccessful: z.number(),
  totalFailed: z.number(),
  totalCharacters: z.number(),
  totalSegments: z.number(),
  estimatedCost: z.number(),
  byWard: z.array(z.object({
    wardId: z.number(),
    wardName: z.string(),
    messageCount: z.number(),
    successRate: z.number(),
    characters: z.number(),
    segments: z.number(),
    estimatedCost: z.number(),
  })),
  byMissionary: z.array(z.object({
    missionaryId: z.number(),
    missionaryName: z.string(),
    messageCount: z.number(),
    successRate: z.number(),
    characters: z.number(),
    segments: z.number(),
    estimatedCost: z.number(),
  })),
  byPeriod: z.array(z.object({
    period: z.string(), // 'today', 'this_week', 'this_month', 'last_month'
    messageCount: z.number(),
    segments: z.number(),
    estimatedCost: z.number(),
  })),
});

export type MessageStats = z.infer<typeof messageStatsSchema>;