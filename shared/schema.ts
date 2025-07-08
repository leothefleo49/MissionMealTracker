import { relations, sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['ward', 'stake', 'mission', 'region', 'ultra']);

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const regionsRelations = relations(regions, ({ many }) => ({
  missions: many(missions),
}));

// Missions table
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  regionId: integer("region_id").references(() => regions.id),
});

export const missionsRelations = relations(missions, ({ one, many }) => ({
  region: one(regions, { fields: [missions.regionId], references: [regions.id] }),
  stakes: many(stakes),
}));

// Stakes table
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  missionId: integer("mission_id").references(() => missions.id),
});

export const stakesRelations = relations(stakes, ({ one, many }) => ({
  mission: one(missions, { fields: [stakes.missionId], references: [missions.id] }),
  wards: many(wards),
}));

// Wards table
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accessCode: text("access_code").notNull().unique(),
  description: text("description"),
  allowCombinedBookings: boolean("allow_combined_bookings").default(false),
  maxBookingsPerPeriod: integer("max_bookings_per_period").default(1),
  bookingPeriodDays: integer("booking_period_days").default(30),
  active: boolean("active").default(true),
  maxBookingsPerAddress: integer("max_bookings_per_address").default(1),
  maxBookingsPerPhone: integer("max_bookings_per_phone").default(1),
  stakeId: integer("stake_id").references(() => stakes.id),
});

export const wardsRelations = relations(wards, ({ one, many }) => ({
  stake: one(stakes, { fields: [wards.stakeId], references: [stakes.id] }),
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
  role: userRoleEnum("role").default('ward').notNull(),
  canUsePaidNotifications: boolean("can_use_paid_notifications").default(false).notNull(),
  homeWardId: integer("home_ward_id").references(() => wards.id),
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

export const usersRelations = relations(users, ({ one, many }) => ({
  wardAccess: many(userWards),
  homeWard: one(wards, { fields: [users.homeWardId], references: [wards.id] }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
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
  personalPhone: text("personal_phone"),
  emailAddress: text("email_address"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationSentAt: timestamp("email_verification_sent_at"),
  whatsappNumber: text("whatsapp_number"),
  messengerAccount: text("messenger_account"),
  preferredNotification: text("preferred_notification").default("email").notNull(),
  active: boolean("active").default(true).notNull(),
  foodAllergies: text("food_allergies"),
  petAllergies: text("pet_allergies"),
  allergySeverity: text("allergy_severity").default("mild"),
  favoriteMeals: text("favorite_meals"),
  dietaryRestrictions: text("dietary_restrictions"),
  transferDate: timestamp("transfer_date"),
  transferNotificationSent: boolean("transfer_notification_sent").default(false),
  notificationScheduleType: text("notification_schedule_type").default("before_meal").notNull(),
  hoursBefore: integer("hours_before").default(3),
  dayOfTime: text("day_of_time").default("09:00"),
  weeklySummaryDay: text("weekly_summary_day").default("sunday"),
  weeklySummaryTime: text("weekly_summary_time").default("18:00"),
  useMultipleNotifications: boolean("use_multiple_notifications").default(false),
  password: text("password"),
  consentStatus: text("consent_status").default("granted").notNull(),
  consentDate: timestamp("consent_date"),
  consentVerificationToken: text("consent_verification_token"),
  consentVerificationSentAt: timestamp("consent_verification_sent_at"),
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
  personalPhone: true,
  emailAddress: true,
  whatsappNumber: true,
  messengerAccount: true,
  preferredNotification: true,
  active: true,
  foodAllergies: true,
  petAllergies: true,
  allergySeverity: true,
  favoriteMeals: true,
  dietaryRestrictions: true,
  transferDate: true,
  notificationScheduleType: true,
  hoursBefore: true,
  dayOfTime: true,
  weeklySummaryDay: true,
  weeklySummaryTime: true,
  useMultipleNotifications: true,
  password: true,
  consentStatus: true,
  consentDate: true,
  consentVerificationToken: true,
  consentVerificationSentAt: true,
});

export type InsertMissionary = z.infer<typeof insertMissionarySchema>;
export type Missionary = typeof missionaries.$inferSelect;

// Meals table
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
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
  missionaryType: z.string(),
  wardId: z.number(),
});

export type CheckMealAvailability = z.infer<typeof checkMealAvailabilitySchema>;

// Message Logs table
export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  wardId: integer("ward_id").notNull().references(() => wards.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  messageType: text("message_type").notNull(),
  messageContent: text("message_content").notNull(),
  deliveryMethod: text("delivery_method").notNull(),
  successful: boolean("successful").notNull(),
  failureReason: text("failure_reason"),
  charCount: integer("char_count").notNull().default(0),
  segmentCount: integer("segment_count").notNull().default(1),
  content: text("content").notNull(),
  method: text("method").notNull(),
  estimatedCost: text("estimated_cost").notNull().default("0"),
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
  content: true,
  method: true,
  estimatedCost: true,
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
  byNotificationMethod: z.object({
    email: z.number(),
    whatsapp: z.number(),
    text: z.number(),
    messenger: z.number(),
  }).optional(),
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
    period: z.string(),
    messageCount: z.number(),
    segments: z.number(),
    estimatedCost: z.number(),
  })),
});

export type MessageStats = z.infer<typeof messageStatsSchema>;