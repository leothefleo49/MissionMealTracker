import { relations, sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['ultra', 'region', 'mission', 'stake', 'ward']);

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertRegionSchema = createInsertSchema(regions).pick({
  name: true,
});

export const regionsRelations = relations(regions, ({ many }) => ({
  missions: many(missions),
  users: many(users),
}));

// Missions table
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionId: integer("region_id").references(() => regions.id, { onDelete: "cascade" }),
});

export const insertMissionSchema = createInsertSchema(missions, {
  regionId: z.number().optional(),
}).pick({
  name: true,
  regionId: true,
});

export const missionsRelations = relations(missions, ({ one, many }) => ({
  region: one(regions, { fields: [missions.regionId], references: [regions.id] }),
  stakes: many(stakes),
  users: many(users),
}));

// Stakes table
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "cascade" }),
});

export const insertStakeSchema = createInsertSchema(stakes, {
    missionId: z.number().optional(),
}).pick({
    name: true,
    missionId: true,
});

export const stakesRelations = relations(stakes, ({ one, many }) => ({
  mission: one(missions, { fields: [stakes.missionId], references: [missions.id] }),
  congregations: many(congregations),
  users: many(users),
}));

// Congregations (formerly Wards) table
export const congregations = pgTable("congregations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accessCode: text("access_code").notNull().unique(),
  description: text("description"),
  stakeId: integer("stake_id").references(() => stakes.id, { onDelete: "cascade" }),
  allowCombinedBookings: boolean("allow_combined_bookings").default(false),
  maxBookingsPerPeriod: integer("max_bookings_per_period").default(1),
  bookingPeriodDays: integer("booking_period_days").default(30),
  active: boolean("active").default(true),
  maxBookingsPerAddress: integer("max_bookings_per_address").default(1),
  maxBookingsPerPhone: integer("max_bookings_per_phone").default(1),
});

export const congregationsRelations = relations(congregations, ({ one, many }) => ({
  stake: one(stakes, { fields: [congregations.stakeId], references: [stakes.id] }),
  missionaries: many(missionaries),
  userAccess: many(userCongregations),
}));

export const insertCongregationSchema = createInsertSchema(congregations, {
    stakeId: z.number().optional(),
}).pick({
  name: true,
  accessCode: true,
  stakeId: true,
});

export type InsertCongregation = z.infer<typeof insertCongregationSchema>;
export type Congregation = typeof congregations.$inferSelect;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum('role').notNull().default('ward'),
  regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "set null" }),
  stakeId: integer("stake_id").references(() => stakes.id, { onDelete: "set null" }),
  canUsePaidNotifications: boolean("can_use_paid_notifications").default(false).notNull(),
});

export const userCongregations = pgTable("user_congregations", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    congregationId: integer("congregation_id").notNull().references(() => congregations.id, { onDelete: "cascade" }),
});

export const userCongregationsRelations = relations(userCongregations, ({ one }) => ({
    user: one(users, { fields: [userCongregations.userId], references: [users.id] }),
    congregation: one(congregations, { fields: [userCongregations.congregationId], references: [congregations.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  mission: one(missions, { fields: [users.missionId], references: [missions.id] }),
  stake: one(stakes, { fields: [users.stakeId], references: [stakes.id] }),
  congregationAccess: many(userCongregations),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  regionId: true,
  missionId: true,
  stakeId: true,
});

export const insertUserCongregationSchema = createInsertSchema(userCongregations).pick({
    userId: true,
    congregationId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserCongregation = z.infer<typeof insertUserCongregationSchema>;
export type User = typeof users.$inferSelect;
export type UserCongregation = typeof userCongregations.$inferSelect;

// Missionaries table
export const missionaries = pgTable("missionaries", {
  id: serial("id").primaryKey(),
  congregationId: integer("congregation_id").notNull().references(() => congregations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'elders' or 'sisters'
  isTrio: boolean("is_trio").default(false).notNull(),
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
  congregation: one(congregations, { fields: [missionaries.congregationId], references: [congregations.id] }),
  meals: many(meals),
  messagesSent: many(messageLogs),
}));

export const insertMissionarySchema = createInsertSchema(missionaries).pick({
  congregationId: true,
  name: true,
  type: true,
  isTrio: true,
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
  congregationId: integer("congregation_id").notNull().references(() => congregations.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  hostName: text("host_name").notNull(),
  hostPhone: text("host_phone").notNull(),
  hostEmail: text("host_email"),
  mealDescription: text("meal_description"),
  specialNotes: text("special_notes"),
  cancelled: boolean("cancelled").default(false).notNull(),
  cancellationReason: text("cancellation_reason"),
});

export const mealsRelations = relations(meals, ({ one }) => ({
  missionary: one(missionaries, { fields: [meals.missionaryId], references: [missionaries.id] }),
  congregation: one(congregations, { fields: [meals.congregationId], references: [congregations.id] }),
}));

export const insertMealSchema = createInsertSchema(meals).pick({
  missionaryId: true,
  congregationId: true,
  date: true,
  startTime: true,
  hostName: true,
  hostPhone: true,
  hostEmail: true,
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
  congregationId: z.number(),
});

export type CheckMealAvailability = z.infer<typeof checkMealAvailabilitySchema>;

// Message Logs table
export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").notNull().references(() => missionaries.id),
  congregationId: integer("congregation_id").notNull().references(() => congregations.id),
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
  congregation: one(congregations, { fields: [messageLogs.congregationId], references: [congregations.id] }),
}));

export const insertMessageLogSchema = createInsertSchema(messageLogs).pick({
  missionaryId: true,
  congregationId: true,
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

// Message Stats schema
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
  byCongregation: z.array(z.object({
    congregationId: z.number(),
    congregationName: z.string(),
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