<<<<<<< HEAD
// shared/schema.ts
import { pgTable, serial, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
=======
import { relations, sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
>>>>>>> parent of c8b398f (yaaaaa budddyyyyy)
import { z } from "zod";

// --- Enums ---
export const userRoleEnum = pgEnum("user_role", ["ultra", "region", "mission", "stake", "ward"]);
export const missionaryTypeEnum = pgEnum("missionary_type", ["elders", "sisters"]);
export const notificationPreferenceEnum = pgEnum("notification_preference", ["email", "text", "messenger", "none"]);
export const consentStatusEnum = pgEnum("consent_status", ["pending", "granted", "denied"]);
export const mealStatusEnum = pgEnum("meal_status", ["confirmed", "pending_host_confirm", "cancelled"]);
export const notificationScheduleTypeEnum = pgEnum("notification_schedule_type", ["none", "before_meal", "day_of", "weekly_summary"]);


// --- Tables ---

<<<<<<< HEAD
=======
// Stakes table
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "set null" }),
  description: text("description"),
});

export const insertStakeSchema = createInsertSchema(stakes, {
    missionId: z.number().optional().nullable(),
    description: z.string().optional(),
}).pick({
    name: true,
    missionId: true,
    description: true,
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
  stakeId: integer("stake_id").references(() => stakes.id, { onDelete: "set null" }),
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

// CORRECTED SCHEMA FOR CONGREGATION INSERTION
export const insertCongregationSchema = createInsertSchema(congregations, {
    description: z.string().optional(),
    // accessCode is now REQUIRED, matching the DB's NOT NULL constraint
    // accessCode is now REQUIRED, matching the DB's NOT NULL constraint
    accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }),
    allowCombinedBookings: z.boolean().default(false),
    maxBookingsPerPeriod: z.number().min(0).default(0),
    maxBookingsPerAddress: z.number().min(0).default(1),
    maxBookingsPerPhone: z.number().min(0).default(1),
    bookingPeriodDays: z.number().min(1).default(30),
    active: z.boolean().default(true),
}).omit({ // Omit fields not provided by client or auto-generated
}).omit({ // Omit fields not provided by client or auto-generated
  id: true,
  stakeId: true, // Client does not provide stakeId for creation
  stakeId: true, // Client does not provide stakeId for creation
});


export type InsertCongregation = z.infer<typeof insertCongregationSchema>;
export type Congregation = typeof congregations.$inferSelect;

// Users table
>>>>>>> parent of c8b398f (yaaaaa budddyyyyy)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(), // Hashed password
  role: userRoleEnum("role").notNull().default('ward'),
  canUsePaidNotifications: boolean("can_use_paid_notifications").notNull().default(false),
  // Foreign keys for hierarchical access
  regionId: integer("region_id"),
  missionId: integer("mission_id"),
  stakeId: integer("stake_id"),
});

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const congregations = pgTable("congregations", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  accessCode: text("access_code").unique().notNull(), // Used for public access to meal calendar
  description: text("description"),
  allowCombinedBookings: boolean("allow_combined_bookings").notNull().default(false),
  maxBookingsPerAddress: integer("max_bookings_per_address").notNull().default(1),
  maxBookingsPerPhone: integer("max_bookings_per_phone").notNull().default(1),
  maxBookingsPerPeriod: integer("max_bookings_per_period").notNull().default(0), // 0 for unlimited
  bookingPeriodDays: integer("booking_period_days").notNull().default(30),
  active: boolean("active").notNull().default(true),
  stakeId: integer("stake_id").references(() => stakes.id, { onDelete: "set null" }), // Added stakeId
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const missionaries = pgTable("missionaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: missionaryTypeEnum("type").notNull(), // 'elders' or 'sisters'
  congregationId: integer("congregation_id").references(() => congregations.id).notNull(),
  phoneNumber: text("phone_number"),
  emailAddress: text("email_address").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationSentAt: timestamp("email_verification_sent_at"),
  whatsappNumber: text("whatsapp_number"), // New field for WhatsApp
  messengerAccount: text("messenger_account"), // For Facebook Messenger or similar
  preferredNotification: notificationPreferenceEnum("preferred_notification").default('none').notNull(),
  notificationScheduleType: notificationScheduleTypeEnum("notification_schedule_type").default('before_meal').notNull(),
  hoursBefore: integer("hours_before").default(3), // For 'before_meal' schedule type
  dayOfTime: text("day_of_time").default('08:00'), // For 'day_of' schedule type (HH:MM)
  weeklySummaryDay: text("weekly_summary_day").default('monday'), // 'monday', 'tuesday', etc.
  weeklySummaryTime: text("weekly_summary_time").default('08:00'), // HH:MM
  active: boolean("active").notNull().default(true),
  consentStatus: consentStatusEnum("consent_status").notNull().default('pending'),
  consentDate: timestamp("consent_date"),
  consentVerificationToken: text("consent_verification_token"),
  consentVerificationSentAt: timestamp("consent_verification_sent_at"),
  password: text("password"), // Hashed password for portal login
  dietaryRestrictions: text("dietary_restrictions"), // Dietary restrictions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").references(() => missionaries.id).notNull(),
  congregationId: integer("congregation_id").references(() => congregations.id).notNull(),
  date: timestamp("date", { mode: 'date' }).notNull(), // Date of the meal
  startTime: text("start_time").notNull(), // e.g., "18:00"
  hostName: text("host_name").notNull(),
  hostPhone: text("host_phone"),
  hostEmail: text("host_email"),
  mealDescription: text("meal_description"),
  specialNotes: text("special_notes"),
  status: mealStatusEnum("status").notNull().default('confirmed'),
  cancelled: boolean("cancelled").notNull().default(false),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCongregations = pgTable("user_congregations", {
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  congregationId: integer("congregation_id").references(() => congregations.id, { onDelete: "cascade" }).notNull(),
}, (t) => ({
  pk: {
    columns: [t.userId, t.congregationId],
    name: "user_congregation_pk",
  },
}));

export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  missionaryId: integer("missionary_id").references(() => missionaries.id, { onDelete: "set null" }),
  congregationId: integer("congregation_id").references(() => congregations.id, { onDelete: "set null" }),
  type: text("type").notNull(), // e.g., 'meal_reminder', 'consent_request', 'custom'
  method: notificationPreferenceEnum("method").notNull(), // 'email', 'text', 'whatsapp', 'messenger'
  status: text("status").notNull(), // 'sent', 'failed', 'delivered', 'read'
  // Provider message ID (e.g., Twilio SID)
  providerMessageId: text("provider_message_id"),
  // Cost associated with the message, if applicable (e.g., Twilio SMS cost)
  cost: text("cost"), // Stored as text to handle currency symbols if needed
  // Any error messages or details if status is 'failed'
  error: text("error_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const userRelations = relations(users, ({ many }) => ({
  userCongregations: many(userCongregations),
}));

export const regionRelations = relations(regions, ({ many }) => ({
  missions: many(missions),
}));

export const missionRelations = relations(missions, ({ one, many }) => ({
  region: one(regions, {
    fields: [missions.regionId],
    references: [regions.id],
  }),
  stakes: many(stakes),
}));

export const stakeRelations = relations(stakes, ({ one, many }) => ({
  mission: one(missions, {
    fields: [stakes.missionId],
    references: [missions.id],
  }),
  congregations: many(congregations),
}));

export const congregationRelations = relations(congregations, ({ one, many }) => ({
  stake: one(stakes, {
    fields: [congregations.stakeId],
    references: [stakes.id],
  }),
  missionaries: many(missionaries),
  meals: many(meals),
  userCongregations: many(userCongregations),
}));

export const missionaryRelations = relations(missionaries, ({ one, many }) => ({
  congregation: one(congregations, {
    fields: [missionaries.congregationId],
    references: [congregations.id],
  }),
  meals: many(meals),
  messageLogs: many(messageLogs),
}));

export const mealRelations = relations(meals, ({ one }) => ({
  missionary: one(missionaries, {
    fields: [meals.missionaryId],
    references: [missionaries.id],
  }),
  congregation: one(congregations, {
    fields: [meals.congregationId],
    references: [congregations.id],
  }),
}));

export const userCongregationRelations = relations(userCongregations, ({ one }) => ({
  user: one(users, {
    fields: [userCongregations.userId],
    references: [users.id],
  }),
  congregation: one(congregations, {
    fields: [userCongregations.congregationId],
    references: [congregations.id],
  }),
}));

export const messageLogRelations = relations(messageLogs, ({ one }) => ({
  missionary: one(missionaries, {
    fields: [messageLogs.missionaryId],
    references: [missionaries.id],
  }),
  congregation: one(congregations, {
    fields: [messageLogs.congregationId],
    references: [congregations.id],
  }),
}));

// --- Schemas for Zod validation ---

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(3).max(50),
  password: z.string().min(6), // This will be hashed, so min length here is for original password
  role: z.enum(userRoleEnum.enumValues),
  canUsePaidNotifications: z.boolean(),
  regionId: z.number().int().positive().nullable().optional(),
  missionId: z.number().int().positive().nullable().optional(),
  stakeId: z.number().int().positive().nullable().optional(),
});

export const InsertUserSchema = UserSchema.omit({ id: true });
export type User = z.infer<typeof UserSchema>;
export type InsertUser = z.infer<typeof InsertUserSchema>;

export const MissionarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  type: z.enum(missionaryTypeEnum.enumValues),
  congregationId: z.number().int().positive(),
  phoneNumber: z.string().nullable().optional(),
  emailAddress: z.string().email().nullable().optional(),
  emailVerified: z.boolean(),
  emailVerificationCode: z.string().nullable().optional(),
  emailVerificationSentAt: z.date().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  messengerAccount: z.string().nullable().optional(),
  preferredNotification: z.enum(notificationPreferenceEnum.enumValues),
  notificationScheduleType: z.enum(notificationScheduleTypeEnum.enumValues),
  hoursBefore: z.number().int().min(0).nullable().optional(),
  dayOfTime: z.string().nullable().optional(),
  weeklySummaryDay: z.string().nullable().optional(),
  weeklySummaryTime: z.string().nullable().optional(),
  active: z.boolean(),
  consentStatus: z.enum(consentStatusEnum.enumValues),
  consentDate: z.date().nullable().optional(),
  consentVerificationToken: z.string().nullable().optional(),
  consentVerificationSentAt: z.date().nullable().optional(),
  password: z.string().nullable().optional(),
  dietaryRestrictions: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InsertMissionarySchema = MissionarySchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Missionary = z.infer<typeof MissionarySchema>;
export type InsertMissionary = z.infer<typeof InsertMissionarySchema>;

export const MealSchema = z.object({
  id: z.number().int().positive(),
  missionaryId: z.number().int().positive(),
  congregationId: z.number().int().positive(),
  date: z.preprocess((arg) => {
    if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
  }, z.date()),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }), // HH:MM
  hostName: z.string().min(2).max(100),
  hostPhone: z.string().nullable().optional(),
  hostEmail: z.string().email().nullable().optional(),
  mealDescription: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
  status: z.enum(mealStatusEnum.enumValues),
  cancelled: z.boolean(),
  cancellationReason: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertMealSchema = MealSchema.omit({ id: true, createdAt: true, updatedAt: true, cancelled: true, cancellationReason: true, status: true });
export const updateMealSchema = MealSchema.partial().required({ id: true });
export type Meal = z.infer<typeof MealSchema>;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type UpdateMeal = z.infer<typeof updateMealSchema>;

export const CongregationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  accessCode: z.string().min(6).max(20),
  description: z.string().nullable().optional(),
  allowCombinedBookings: z.boolean(),
  maxBookingsPerAddress: z.number().int().min(0),
  maxBookingsPerPhone: z.number().int().min(0),
  maxBookingsPerPeriod: z.number().int().min(0),
  bookingPeriodDays: z.number().int().min(1),
  active: z.boolean(),
  stakeId: z.number().int().positive().nullable().optional(), // Added stakeId
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertCongregationSchema = CongregationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Congregation = z.infer<typeof CongregationSchema>;
export type InsertCongregation = z.infer<typeof insertCongregationSchema>;

export const UserCongregationSchema = z.object({
  userId: z.number().int().positive(),
  congregationId: z.number().int().positive(),
});

export const insertUserCongregationSchema = UserCongregationSchema;
export type UserCongregation = z.infer<typeof UserCongregationSchema>;
export type InsertUserCongregation = z.infer<typeof insertUserCongregationSchema>;

export const RegionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertRegionSchema = RegionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Region = z.infer<typeof RegionSchema>;
export type InsertRegion = z.infer<typeof insertRegionSchema>;

export const MissionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  regionId: z.number().int().positive().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertMissionSchema = MissionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Mission = z.infer<typeof MissionSchema>;
export type InsertMission = z.infer<typeof insertMissionSchema>;

export const StakeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  missionId: z.number().int().positive().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertStakeSchema = StakeSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Stake = z.infer<typeof StakeSchema>;
export type InsertStake = z.infer<typeof insertStakeSchema>;

export const checkMealAvailabilitySchema = z.object({
  date: z.string(), // ISO date string
  missionaryType: z.string(), // 'elders', 'sisters', or missionary ID as string
  congregationId: z.number().int().positive(),
});

export const MessageLogSchema = z.object({
  id: z.number().int().positive(),
  missionaryId: z.number().int().positive().nullable().optional(),
  congregationId: z.number().int().positive().nullable().optional(),
  type: z.string(),
  method: z.enum(notificationPreferenceEnum.enumValues),
  status: z.string(),
  providerMessageId: z.string().nullable().optional(),
  cost: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const InsertMessageLogSchema = MessageLogSchema.omit({ id: true, createdAt: true });
export type MessageLog = z.infer<typeof MessageLogSchema>;
export type InsertMessageLog = z.infer<typeof InsertMessageLogSchema>;