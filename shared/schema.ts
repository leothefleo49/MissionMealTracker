import { relations, sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Regions table
export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const regionsRelations = relations(regions, ({ many }) => ({
  missions: many(missions),
}));

// Missions table
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionId: integer("region_id").references(() => regions.id),
});

export const missionsRelations = relations(missions, ({ one, many }) => ({
  region: one(regions, { fields: [missions.regionId], references: [regions.id] }),
  stakes: many(stakes),
}));

// Stakes table
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
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
  stakeId: integer("stake_id").references(() => stakes.id),
  allowCombinedBookings: boolean("allow_combined_bookings").default(false),
  maxBookingsPerPeriod: integer("max_bookings_per_period").default(1),
  bookingPeriodDays: integer("booking_period_days").default(30),
  active: boolean("active").default(true),
  mealReminderThreshold: integer("meal_reminder_threshold").default(2), // New field
  maxBookingsPerAddress: integer("max_bookings_per_address").default(1),
  maxBookingsPerPhone: integer("max_bookings_per_phone").default(1),
});

export const wardsRelations = relations(wards, ({ one, many }) => ({
  stake: one(stakes, { fields: [wards.stakeId], references: [stakes.id] }),
  missionaries: many(missionaries),
  userAccess: many(userWards),
  meals: many(meals),
}));

export const insertWardSchema = createInsertSchema(wards);
export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;

// Users table with new role system
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["ultra_admin", "region_admin", "mission_admin", "stake_admin", "ward_admin"] }).notNull(),
  regionId: integer("region_id").references(() => regions.id),
  missionId: integer("mission_id").references(() => missions.id),
  stakeId: integer("stake_id").references(() => stakes.id),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  wardAccess: many(userWards),
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  mission: one(missions, { fields: [users.missionId], references: [missions.id] }),
  stake: one(stakes, { fields: [users.stakeId], references: [stakes.id] }),
}));

export const userWards = pgTable("user_wards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wardId: integer("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
});

export const userWardsRelations = relations(userWards, ({ one }) => ({
  user: one(users, { fields: [userWards.userId], references: [users.id] }),
  ward: one(wards, { fields: [userWards.wardId], references: [wards.id] }),
}));


export const insertUserSchema = createInsertSchema(users);
export const insertUserWardSchema = createInsertSchema(userWards);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserWard = z.infer<typeof insertUserWardSchema>;
export type User = typeof users.$inferSelect;
export type UserWard = typeof userWards.$inferSelect;

// Missionaries table
export const missionaries = pgTable("missionaries", {
  id: serial("id").primaryKey(),
  wardId: integer("ward_id").references(() => wards.id, { onDelete: 'set null' }), // Set to null on ward deletion
  missionId: integer("mission_id").references(() => missions.id),
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
  active: boolean("active").default(true).notNull(), // Used for soft delete
  isTrio: boolean("is_trio").default(false).notNull(), // New field for trio companionships

  // Enhanced dietary and preference information
  foodAllergies: text("food_allergies"),
  petAllergies: text("pet_allergies"),
  allergySeverity: text("allergy_severity").default("mild"),
  favoriteMeals: text("favorite_meals"),
  dietaryRestrictions: text("dietary_restrictions"),

  // Transfer management
  transferDate: timestamp("transfer_date"),
  transferNotificationSent: boolean("transfer_notification_sent").default(false),

  // Notification settings
  notificationScheduleType: text("notification_schedule_type").default("before_meal").notNull(),
  hoursBefore: integer("hours_before").default(3),
  dayOfTime: text("day_of_time").default("09:00"),
  weeklySummaryDay: text("weekly_summary_day").default("sunday"),
  weeklySummaryTime: text("weekly_summary_time").default("18:00"),
  useMultipleNotifications: boolean("use_multiple_notifications").default(false),

  // Authentication fields
  password: text("password"),

  // Consent management
  consentStatus: text("consent_status").default("granted").notNull(),
  consentDate: timestamp("consent_date"),
  consentVerificationToken: text("consent_verification_token"),
  consentVerificationSentAt: timestamp("consent_verification_sent_at"),
});

export const missionariesRelations = relations(missionaries, ({ one, many }) => ({
  ward: one(wards, { fields: [missionaries.wardId], references: [wards.id] }),
  mission: one(missions, { fields: [missionaries.missionId], references: [missions.id] }),
  meals: many(meals),
  messagesSent: many(messageLogs),
}));

export const insertMissionarySchema = createInsertSchema(missionaries);
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
  hostEmail: text("host_email"), // New field for host email
  mealDescription: text("meal_description"),
  specialNotes: text("special_notes"),
  cancelled: boolean("cancelled").default(false).notNull(),
  cancellationReason: text("cancellation_reason"),
});

export const mealsRelations = relations(meals, ({ one }) => ({
  missionary: one(missionaries, { fields: [meals.missionaryId], references: [missionaries.id] }),
  ward: one(wards, { fields: [meals.wardId], references: [wards.id] }),
}));

export const insertMealSchema = createInsertSchema(meals);
export const updateMealSchema = createInsertSchema(meals).partial();

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

export const insertMessageLogSchema = createInsertSchema(messageLogs);
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
  // New statistics fields
  memberLeaderboard: z.array(z.object({
    hostEmail: z.string(),
    mealCount: z.number(),
  })).optional(),
  uniqueMembers: z.number().optional(),
});

export type MessageStats = z.infer<typeof messageStatsSchema>;