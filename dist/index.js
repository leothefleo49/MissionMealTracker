var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  CongregationSchema: () => CongregationSchema,
  InsertMessageLogSchema: () => InsertMessageLogSchema,
  InsertMissionarySchema: () => InsertMissionarySchema,
  InsertUserSchema: () => InsertUserSchema,
  MealSchema: () => MealSchema,
  MessageLogSchema: () => MessageLogSchema,
  MissionSchema: () => MissionSchema,
  MissionarySchema: () => MissionarySchema,
  RegionSchema: () => RegionSchema,
  StakeSchema: () => StakeSchema,
  UserCongregationSchema: () => UserCongregationSchema,
  UserSchema: () => UserSchema,
  checkMealAvailabilitySchema: () => checkMealAvailabilitySchema,
  congregationRelations: () => congregationRelations,
  congregations: () => congregations,
  consentStatusEnum: () => consentStatusEnum,
  insertCongregationSchema: () => insertCongregationSchema,
  insertMealSchema: () => insertMealSchema,
  insertMissionSchema: () => insertMissionSchema,
  insertRegionSchema: () => insertRegionSchema,
  insertStakeSchema: () => insertStakeSchema,
  insertUserCongregationSchema: () => insertUserCongregationSchema,
  mealRelations: () => mealRelations,
  mealStatusEnum: () => mealStatusEnum,
  meals: () => meals,
  messageLogRelations: () => messageLogRelations,
  messageLogs: () => messageLogs,
  missionRelations: () => missionRelations,
  missionaries: () => missionaries,
  missionaryRelations: () => missionaryRelations,
  missionaryTypeEnum: () => missionaryTypeEnum,
  missions: () => missions,
  notificationPreferenceEnum: () => notificationPreferenceEnum,
  notificationScheduleTypeEnum: () => notificationScheduleTypeEnum,
  regionRelations: () => regionRelations,
  regions: () => regions,
  stakeRelations: () => stakeRelations,
  stakes: () => stakes,
  updateMealSchema: () => updateMealSchema,
  userCongregationRelations: () => userCongregationRelations,
  userCongregations: () => userCongregations,
  userRelations: () => userRelations,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
import { pgTable, serial, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
var userRoleEnum, missionaryTypeEnum, notificationPreferenceEnum, consentStatusEnum, mealStatusEnum, notificationScheduleTypeEnum, users, regions, missions, stakes, congregations, missionaries, meals, userCongregations, messageLogs, userRelations, regionRelations, missionRelations, stakeRelations, congregationRelations, missionaryRelations, mealRelations, userCongregationRelations, messageLogRelations, UserSchema, InsertUserSchema, MissionarySchema, InsertMissionarySchema, MealSchema, insertMealSchema, updateMealSchema, CongregationSchema, insertCongregationSchema, UserCongregationSchema, insertUserCongregationSchema, RegionSchema, insertRegionSchema, MissionSchema, insertMissionSchema, StakeSchema, insertStakeSchema, checkMealAvailabilitySchema, MessageLogSchema, InsertMessageLogSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    userRoleEnum = pgEnum("user_role", ["ultra", "region", "mission", "stake", "ward"]);
<<<<<<< HEAD
    missionaryTypeEnum = pgEnum("missionary_type", ["elders", "sisters"]);
    notificationPreferenceEnum = pgEnum("notification_preference", ["email", "text", "messenger", "none"]);
    consentStatusEnum = pgEnum("consent_status", ["pending", "granted", "denied"]);
    mealStatusEnum = pgEnum("meal_status", ["confirmed", "pending_host_confirm", "cancelled"]);
    notificationScheduleTypeEnum = pgEnum("notification_schedule_type", ["none", "before_meal", "day_of", "weekly_summary"]);
=======
    regions = pgTable("regions", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description")
    });
    insertRegionSchema = createInsertSchema(regions, {
      description: z.string().optional()
    }).pick({
      name: true,
      description: true
    });
    regionsRelations = relations(regions, ({ many }) => ({
      missions: many(missions),
      users: many(users)
    }));
    missions = pgTable("missions", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
      description: text("description")
    });
    insertMissionSchema = createInsertSchema(missions, {
      regionId: z.number().optional().nullable(),
      description: z.string().optional()
    }).pick({
      name: true,
      regionId: true,
      description: true
    });
    missionsRelations = relations(missions, ({ one, many }) => ({
      region: one(regions, { fields: [missions.regionId], references: [regions.id] }),
      stakes: many(stakes),
      users: many(users)
    }));
    stakes = pgTable("stakes", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      missionId: integer("mission_id").references(() => missions.id, { onDelete: "set null" }),
      description: text("description")
    });
    insertStakeSchema = createInsertSchema(stakes, {
      missionId: z.number().optional().nullable(),
      description: z.string().optional()
    }).pick({
      name: true,
      missionId: true,
      description: true
    });
    stakesRelations = relations(stakes, ({ one, many }) => ({
      mission: one(missions, { fields: [stakes.missionId], references: [missions.id] }),
      congregations: many(congregations),
      users: many(users)
    }));
    congregations = pgTable("congregations", {
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
      maxBookingsPerPhone: integer("max_bookings_per_phone").default(1)
    });
    congregationsRelations = relations(congregations, ({ one, many }) => ({
      stake: one(stakes, { fields: [congregations.stakeId], references: [stakes.id] }),
      missionaries: many(missionaries),
      userAccess: many(userCongregations)
    }));
    insertCongregationSchema = createInsertSchema(congregations, {
      description: z.string().optional(),
      // accessCode is now REQUIRED, matching the DB's NOT NULL constraint
      accessCode: z.string().min(6, { message: "Access code must be at least 6 characters" }),
      allowCombinedBookings: z.boolean().default(false),
      maxBookingsPerPeriod: z.number().min(0).default(0),
      maxBookingsPerAddress: z.number().min(0).default(1),
      maxBookingsPerPhone: z.number().min(0).default(1),
      bookingPeriodDays: z.number().min(1).default(30),
      active: z.boolean().default(true)
    }).omit({
      // Omit fields not provided by client or auto-generated
      id: true,
      stakeId: true
      // Client does not provide stakeId for creation
    });
>>>>>>> parent of c8b398f (yaaaaa budddyyyyy)
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").unique().notNull(),
      password: text("password").notNull(),
      // Hashed password
      role: userRoleEnum("role").notNull().default("ward"),
      canUsePaidNotifications: boolean("can_use_paid_notifications").notNull().default(false),
      // Foreign keys for hierarchical access
      regionId: integer("region_id"),
      missionId: integer("mission_id"),
      stakeId: integer("stake_id")
    });
    regions = pgTable("regions", {
      id: serial("id").primaryKey(),
      name: text("name").unique().notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    missions = pgTable("missions", {
      id: serial("id").primaryKey(),
      name: text("name").unique().notNull(),
      description: text("description"),
      regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    stakes = pgTable("stakes", {
      id: serial("id").primaryKey(),
      name: text("name").unique().notNull(),
      description: text("description"),
      missionId: integer("mission_id").references(() => missions.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    congregations = pgTable("congregations", {
      id: serial("id").primaryKey(),
      name: text("name").unique().notNull(),
      accessCode: text("access_code").unique().notNull(),
      // Used for public access to meal calendar
      description: text("description"),
      allowCombinedBookings: boolean("allow_combined_bookings").notNull().default(false),
      maxBookingsPerAddress: integer("max_bookings_per_address").notNull().default(1),
      maxBookingsPerPhone: integer("max_bookings_per_phone").notNull().default(1),
      maxBookingsPerPeriod: integer("max_bookings_per_period").notNull().default(0),
      // 0 for unlimited
      bookingPeriodDays: integer("booking_period_days").notNull().default(30),
      active: boolean("active").notNull().default(true),
      stakeId: integer("stake_id").references(() => stakes.id, { onDelete: "set null" }),
      // Added stakeId
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    missionaries = pgTable("missionaries", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      type: missionaryTypeEnum("type").notNull(),
      // 'elders' or 'sisters'
      congregationId: integer("congregation_id").references(() => congregations.id).notNull(),
      phoneNumber: text("phone_number"),
      emailAddress: text("email_address").unique(),
      emailVerified: boolean("email_verified").notNull().default(false),
      emailVerificationCode: text("email_verification_code"),
      emailVerificationSentAt: timestamp("email_verification_sent_at"),
      whatsappNumber: text("whatsapp_number"),
      // New field for WhatsApp
      messengerAccount: text("messenger_account"),
      // For Facebook Messenger or similar
      preferredNotification: notificationPreferenceEnum("preferred_notification").default("none").notNull(),
      notificationScheduleType: notificationScheduleTypeEnum("notification_schedule_type").default("before_meal").notNull(),
      hoursBefore: integer("hours_before").default(3),
      // For 'before_meal' schedule type
      dayOfTime: text("day_of_time").default("08:00"),
      // For 'day_of' schedule type (HH:MM)
      weeklySummaryDay: text("weekly_summary_day").default("monday"),
      // 'monday', 'tuesday', etc.
      weeklySummaryTime: text("weekly_summary_time").default("08:00"),
      // HH:MM
      active: boolean("active").notNull().default(true),
      consentStatus: consentStatusEnum("consent_status").notNull().default("pending"),
      consentDate: timestamp("consent_date"),
      consentVerificationToken: text("consent_verification_token"),
      consentVerificationSentAt: timestamp("consent_verification_sent_at"),
      password: text("password"),
      // Hashed password for portal login
      dietaryRestrictions: text("dietary_restrictions"),
      // Dietary restrictions
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    meals = pgTable("meals", {
      id: serial("id").primaryKey(),
      missionaryId: integer("missionary_id").references(() => missionaries.id).notNull(),
      congregationId: integer("congregation_id").references(() => congregations.id).notNull(),
      date: timestamp("date", { mode: "date" }).notNull(),
      // Date of the meal
      startTime: text("start_time").notNull(),
      // e.g., "18:00"
      hostName: text("host_name").notNull(),
      hostPhone: text("host_phone"),
      hostEmail: text("host_email"),
      mealDescription: text("meal_description"),
      specialNotes: text("special_notes"),
      status: mealStatusEnum("status").notNull().default("confirmed"),
      cancelled: boolean("cancelled").notNull().default(false),
      cancellationReason: text("cancellation_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    userCongregations = pgTable("user_congregations", {
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      congregationId: integer("congregation_id").references(() => congregations.id, { onDelete: "cascade" }).notNull()
    }, (t) => ({
      pk: {
        columns: [t.userId, t.congregationId],
        name: "user_congregation_pk"
      }
    }));
    messageLogs = pgTable("message_logs", {
      id: serial("id").primaryKey(),
      missionaryId: integer("missionary_id").references(() => missionaries.id, { onDelete: "set null" }),
      congregationId: integer("congregation_id").references(() => congregations.id, { onDelete: "set null" }),
      type: text("type").notNull(),
      // e.g., 'meal_reminder', 'consent_request', 'custom'
      method: notificationPreferenceEnum("method").notNull(),
      // 'email', 'text', 'whatsapp', 'messenger'
      status: text("status").notNull(),
      // 'sent', 'failed', 'delivered', 'read'
      // Provider message ID (e.g., Twilio SID)
      providerMessageId: text("provider_message_id"),
      // Cost associated with the message, if applicable (e.g., Twilio SMS cost)
      cost: text("cost"),
      // Stored as text to handle currency symbols if needed
      // Any error messages or details if status is 'failed'
      error: text("error_details"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userRelations = relations(users, ({ many }) => ({
      userCongregations: many(userCongregations)
    }));
    regionRelations = relations(regions, ({ many }) => ({
      missions: many(missions)
    }));
    missionRelations = relations(missions, ({ one, many }) => ({
      region: one(regions, {
        fields: [missions.regionId],
        references: [regions.id]
      }),
      stakes: many(stakes)
    }));
    stakeRelations = relations(stakes, ({ one, many }) => ({
      mission: one(missions, {
        fields: [stakes.missionId],
        references: [missions.id]
      }),
      congregations: many(congregations)
    }));
    congregationRelations = relations(congregations, ({ one, many }) => ({
      stake: one(stakes, {
        fields: [congregations.stakeId],
        references: [stakes.id]
      }),
      missionaries: many(missionaries),
      meals: many(meals),
      userCongregations: many(userCongregations)
    }));
    missionaryRelations = relations(missionaries, ({ one, many }) => ({
      congregation: one(congregations, {
        fields: [missionaries.congregationId],
        references: [congregations.id]
      }),
      meals: many(meals),
      messageLogs: many(messageLogs)
    }));
    mealRelations = relations(meals, ({ one }) => ({
      missionary: one(missionaries, {
        fields: [meals.missionaryId],
        references: [missionaries.id]
      }),
      congregation: one(congregations, {
        fields: [meals.congregationId],
        references: [congregations.id]
      })
    }));
    userCongregationRelations = relations(userCongregations, ({ one }) => ({
      user: one(users, {
        fields: [userCongregations.userId],
        references: [users.id]
      }),
      congregation: one(congregations, {
        fields: [userCongregations.congregationId],
        references: [congregations.id]
      })
    }));
    messageLogRelations = relations(messageLogs, ({ one }) => ({
      missionary: one(missionaries, {
        fields: [messageLogs.missionaryId],
        references: [missionaries.id]
      }),
      congregation: one(congregations, {
        fields: [messageLogs.congregationId],
        references: [congregations.id]
      })
    }));
    UserSchema = z.object({
      id: z.number().int().positive(),
      username: z.string().min(3).max(50),
      password: z.string().min(6),
      // This will be hashed, so min length here is for original password
      role: z.enum(userRoleEnum.enumValues),
      canUsePaidNotifications: z.boolean(),
      regionId: z.number().int().positive().nullable().optional(),
      missionId: z.number().int().positive().nullable().optional(),
      stakeId: z.number().int().positive().nullable().optional()
    });
    InsertUserSchema = UserSchema.omit({ id: true });
    MissionarySchema = z.object({
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
      updatedAt: z.date()
    });
    InsertMissionarySchema = MissionarySchema.omit({ id: true, createdAt: true, updatedAt: true });
    MealSchema = z.object({
      id: z.number().int().positive(),
      missionaryId: z.number().int().positive(),
      congregationId: z.number().int().positive(),
      date: z.preprocess((arg) => {
        if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
      }, z.date()),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Invalid time format (HH:MM)" }),
      // HH:MM
      hostName: z.string().min(2).max(100),
      hostPhone: z.string().nullable().optional(),
      hostEmail: z.string().email().nullable().optional(),
      mealDescription: z.string().nullable().optional(),
      specialNotes: z.string().nullable().optional(),
      status: z.enum(mealStatusEnum.enumValues),
      cancelled: z.boolean(),
      cancellationReason: z.string().nullable().optional(),
      createdAt: z.date(),
      updatedAt: z.date()
    });
    insertMealSchema = MealSchema.omit({ id: true, createdAt: true, updatedAt: true, cancelled: true, cancellationReason: true, status: true });
    updateMealSchema = MealSchema.partial().required({ id: true });
    CongregationSchema = z.object({
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
      stakeId: z.number().int().positive().nullable().optional(),
      // Added stakeId
      createdAt: z.date(),
      updatedAt: z.date()
    });
    insertCongregationSchema = CongregationSchema.omit({ id: true, createdAt: true, updatedAt: true });
    UserCongregationSchema = z.object({
      userId: z.number().int().positive(),
      congregationId: z.number().int().positive()
    });
    insertUserCongregationSchema = UserCongregationSchema;
    RegionSchema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(100),
      description: z.string().nullable().optional(),
      createdAt: z.date(),
      updatedAt: z.date()
    });
    insertRegionSchema = RegionSchema.omit({ id: true, createdAt: true, updatedAt: true });
    MissionSchema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(100),
      description: z.string().nullable().optional(),
      regionId: z.number().int().positive().nullable().optional(),
      createdAt: z.date(),
      updatedAt: z.date()
    });
    insertMissionSchema = MissionSchema.omit({ id: true, createdAt: true, updatedAt: true });
    StakeSchema = z.object({
      id: z.number().int().positive(),
      name: z.string().min(2).max(100),
      description: z.string().nullable().optional(),
      missionId: z.number().int().positive().nullable().optional(),
      createdAt: z.date(),
      updatedAt: z.date()
    });
    insertStakeSchema = StakeSchema.omit({ id: true, createdAt: true, updatedAt: true });
    checkMealAvailabilitySchema = z.object({
      date: z.string(),
      // ISO date string
      missionaryType: z.string(),
      // 'elders', 'sisters', or missionary ID as string
      congregationId: z.number().int().positive()
    });
    MessageLogSchema = z.object({
      id: z.number().int().positive(),
      missionaryId: z.number().int().positive().nullable().optional(),
      congregationId: z.number().int().positive().nullable().optional(),
      type: z.string(),
      method: z.enum(notificationPreferenceEnum.enumValues),
      status: z.string(),
      providerMessageId: z.string().nullable().optional(),
      cost: z.string().nullable().optional(),
      error: z.string().nullable().optional(),
      createdAt: z.date()
    });
    InsertMessageLogSchema = MessageLogSchema.omit({ id: true, createdAt: true });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/database-storage.ts
import { eq, and, gte, lte, isNull, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore, DatabaseStorage;
var init_database_storage = __esm({
  "server/database-storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_db();
    PostgresSessionStore = connectPg(session);
    DatabaseStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new PostgresSessionStore({
          pool,
          createTableIfMissing: true
        });
      }
      // User methods
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || void 0;
      }
      async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || void 0;
      }
      async getUltraAdmin() {
        const [user] = await db.select().from(users).where(eq(users.role, "ultra"));
        return user;
      }
      async createUser(insertUser) {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      }
      async getUsersInCongregation(congregationId) {
        const usersInCong = await db.query.userCongregations.findMany({
          where: eq(userCongregations.congregationId, congregationId),
          with: {
            user: true
          }
        });
        return usersInCong.map((uc) => uc.user);
      }
      // Congregation Hierarchy methods
      async getAllRegions() {
        return await db.query.regions.findMany({
          with: {
            missions: true
            // Eager-load all missions associated with each region
          }
        });
      }
      async createRegion(region) {
        const [newRegion] = await db.insert(regions).values(region).returning();
        return newRegion;
      }
      async updateRegion(id, data) {
        const [updatedRegion] = await db.update(regions).set(data).where(eq(regions.id, id)).returning();
        return updatedRegion;
      }
      async deleteRegion(id) {
        await db.delete(regions).where(eq(regions.id, id));
        return true;
      }
      async getAllMissions(showUnassignedOnly, searchTerm) {
        const conditions = [];
        if (showUnassignedOnly) {
          conditions.push(isNull(missions.regionId));
        }
        if (searchTerm) {
          conditions.push(ilike(missions.name, `%${searchTerm}%`));
        }
        return await db.query.missions.findMany({
          where: conditions.length > 0 ? and(...conditions) : void 0,
          with: {
            region: true,
            // Include region details
            stakes: true
            // Eager-load all stakes associated with each mission
          }
        });
      }
      async getMissionsByRegion(regionId) {
        return await db.query.missions.findMany({
          where: eq(missions.regionId, regionId),
          with: {
            region: true,
            stakes: true
            // Eager-load associated stakes
          }
        });
      }
      async createMission(mission) {
        const [newMission] = await db.insert(missions).values(mission).returning();
        return newMission;
      }
      async updateMission(id, data) {
        const [updatedMission] = await db.update(missions).set(data).where(eq(missions.id, id)).returning();
        return updatedMission;
      }
      async deleteMission(id) {
        await db.delete(missions).where(eq(missions.id, id));
        return true;
      }
      async getAllStakes(showUnassignedOnly, searchTerm) {
        const conditions = [];
        if (showUnassignedOnly) {
          conditions.push(isNull(stakes.missionId));
        }
        if (searchTerm) {
          conditions.push(ilike(stakes.name, `%${searchTerm}%`));
        }
        return await db.query.stakes.findMany({
          where: conditions.length > 0 ? and(...conditions) : void 0,
          with: {
            mission: true,
            // Include mission details for display
            congregations: true
            // Eager-load all congregations associated with each stake
          }
        });
      }
      async getStakesByMission(missionId) {
        return await db.query.stakes.findMany({
          where: eq(stakes.missionId, missionId),
          with: {
            mission: true,
            congregations: true
            // Eager-load associated congregations
          }
        });
      }
      async createStake(stake) {
        const [newStake] = await db.insert(stakes).values(stake).returning();
        return newStake;
      }
      async updateStake(id, data) {
        const [updatedStake] = await db.update(stakes).set(data).where(eq(stakes.id, id)).returning();
        return updatedStake;
      }
      async deleteStake(id) {
        await db.delete(stakes).where(eq(stakes.id, id));
        return true;
      }
      async getAllCongregations(showUnassignedOnly, searchTerm) {
        const conditions = [];
        if (showUnassignedOnly) {
          conditions.push(isNull(congregations.stakeId));
        }
        if (searchTerm) {
          conditions.push(ilike(congregations.name, `%${searchTerm}%`));
        }
        return await db.query.congregations.findMany({
          where: conditions.length > 0 ? and(...conditions) : void 0,
          with: {
            stake: true
            // Include stake details for display
          }
        });
      }
      async getCongregationsByStake(stakeId) {
        return await db.query.congregations.findMany({
          where: eq(congregations.stakeId, stakeId),
          with: {
            stake: true
          }
        });
      }
      // Congregation methods
      async getCongregation(id) {
        const [congregation] = await db.select().from(congregations).where(eq(congregations.id, id));
        return congregation || void 0;
      }
      async getCongregationByAccessCode(accessCode) {
        const [congregation] = await db.select().from(congregations).where(eq(congregations.accessCode, accessCode));
        return congregation || void 0;
      }
      async createCongregation(insertCongregation) {
        const [newCongregation] = await db.insert(congregations).values(insertCongregation).returning();
        return newCongregation;
      }
      async updateCongregation(id, data) {
        const [updatedCongregation] = await db.update(congregations).set(data).where(eq(congregations.id, id)).returning();
        return updatedCongregation || void 0;
      }
      // User-Congregation relationship methods
      async getUserCongregations(userId, showUnassignedOnly, searchTerm) {
        const conditions = [eq(userCongregations.userId, userId)];
        const userCongregationResults = await db.query.userCongregations.findMany({
          where: and(...conditions),
          with: {
            congregation: {
              with: {
                stake: true
              },
              where: (congregations2, { isNull: isNullFunc, ilike: ilikeFunc, and: andFunc }) => {
                const congregationConditions = [];
                if (showUnassignedOnly) {
                  congregationConditions.push(isNullFunc(congregations2.stakeId));
                }
                if (searchTerm) {
                  congregationConditions.push(ilikeFunc(congregations2.name, `%${searchTerm}%`));
                }
                return congregationConditions.length > 0 ? andFunc(...congregationConditions) : void 0;
              }
            }
          }
        });
        return userCongregationResults.filter((result) => result.congregation !== null).map((result) => result.congregation);
      }
      async addUserToCongregation(userCongregation) {
        const [newUserCongregation] = await db.insert(userCongregations).values(userCongregation).returning();
        return newUserCongregation;
      }
      async removeUserFromCongregation(userId, congregationId) {
        await db.delete(userCongregations).where(
          and(
            eq(userCongregations.userId, userId),
            eq(userCongregations.congregationId, congregationId)
          )
        );
        return true;
      }
      // Missionary methods
      async getMissionary(id) {
        const [missionary] = await db.select().from(missionaries).where(eq(missionaries.id, id));
        return missionary || void 0;
      }
      async getMissionaryByName(congregationId, name) {
        const [missionary] = await db.select().from(missionaries).where(
          and(
            eq(missionaries.congregationId, congregationId),
            eq(missionaries.name, name)
          )
        );
        return missionary || void 0;
      }
      async getMissionaryByEmail(emailAddress) {
        const [missionary] = await db.select().from(missionaries).where(eq(missionaries.emailAddress, emailAddress)).orderBy(missionaries.id);
        return missionary || void 0;
      }
      async getMissionariesByType(type, congregationId) {
        return await db.select().from(missionaries).where(
          and(
            eq(missionaries.type, type),
            eq(missionaries.congregationId, congregationId),
            eq(missionaries.active, true)
          )
        );
      }
      async getMissionariesByCongregation(congregationId, searchTerm) {
        const conditions = [eq(missionaries.congregationId, congregationId)];
        if (searchTerm) {
          conditions.push(ilike(missionaries.name, `%${searchTerm}%`));
        }
        return await db.select().from(missionaries).where(and(...conditions));
      }
      async getAllMissionaries(searchTerm) {
        const conditions = [];
        if (searchTerm) {
          conditions.push(ilike(missionaries.name, `%${searchTerm}%`));
        }
        return await db.select().from(missionaries).where(conditions.length > 0 ? and(...conditions) : void 0);
      }
      async createMissionary(insertMissionary) {
        const missionaryData = {
          ...insertMissionary,
          consentStatus: insertMissionary.consentStatus || "pending",
          consentDate: insertMissionary.consentDate || null,
          consentVerificationToken: insertMissionary.consentVerificationToken || null,
          consentVerificationSentAt: insertMissionary.consentVerificationSentAt || null
        };
        const [missionary] = await db.insert(missionaries).values(missionaryData).returning();
        return missionary;
      }
      async updateMissionary(id, data) {
        const [updatedMissionary] = await db.update(missionaries).set(data).where(eq(missionaries.id, id)).returning();
        return updatedMissionary || void 0;
      }
      async deleteMissionary(id) {
        await db.delete(missionaries).where(eq(missionaries.id, id));
        return true;
      }
      // Meal methods
      async getMeal(id) {
        const [meal] = await db.select().from(meals).where(eq(meals.id, id));
        return meal || void 0;
      }
      async getMealsByDate(date, congregationId) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        let conditions = [
          gte(meals.date, startOfDay),
          lte(meals.date, endOfDay)
        ];
        if (congregationId !== void 0) {
          conditions.push(eq(meals.congregationId, congregationId));
        }
        return await db.select().from(meals).where(and(...conditions));
      }
      async getMealsByDateRange(startDate, endDate, congregationId) {
        let conditions = [
          gte(meals.date, startDate),
          lte(meals.date, endDate)
        ];
        if (congregationId !== void 0) {
          conditions.push(eq(meals.congregationId, congregationId));
        }
        return await db.select().from(meals).where(and(...conditions));
      }
      async getMealsByMissionary(missionaryId) {
        return await db.select().from(meals).where(eq(meals.missionaryId, missionaryId));
      }
      async getUpcomingMealsByHostPhone(hostPhone, congregationId) {
        const now = /* @__PURE__ */ new Date();
        let conditions = [
          eq(meals.hostPhone, hostPhone),
          gte(meals.date, now),
          eq(meals.cancelled, false)
        ];
        if (congregationId !== void 0) {
          conditions.push(eq(meals.congregationId, congregationId));
        }
        return await db.select().from(meals).where(and(...conditions));
      }
      async checkMealAvailability(date, missionaryTypeOrId, congregationId) {
        const mealsOnDate = await this.getMealsByDate(date, congregationId);
        const missionaryId = parseInt(missionaryTypeOrId, 10);
        if (!isNaN(missionaryId)) {
          const missionary = await this.getMissionary(missionaryId);
          if (!missionary || missionary.congregationId !== congregationId) return false;
          const existingMeal = mealsOnDate.find(
            (meal) => meal.missionaryId === missionaryId && !meal.cancelled
          );
          return !existingMeal;
        } else {
          const missionaries2 = await this.getMissionariesByType(missionaryTypeOrId, congregationId);
          if (missionaries2.length === 0) return false;
          for (const missionary of missionaries2) {
            const existingMeal = mealsOnDate.find(
              (meal) => meal.missionaryId === missionary.id && !meal.cancelled
            );
            if (!existingMeal) {
              return true;
            }
          }
          return false;
        }
      }
      async createMeal(insertMeal) {
        const [meal] = await db.insert(meals).values(insertMeal).returning();
        return meal;
      }
      async updateMeal(mealUpdate) {
        const [updatedMeal] = await db.update(meals).set(mealUpdate).where(eq(meals.id, mealUpdate.id)).returning();
        return updatedMeal || void 0;
      }
      async cancelMeal(id, reason) {
        const [cancelledMeal] = await db.update(meals).set({
          cancelled: true,
          cancellationReason: reason || null
        }).where(eq(meals.id, id)).returning();
        return cancelledMeal || void 0;
      }
    };
  }
});

// server/storage.ts
var storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_database_storage();
    storage = new DatabaseStorage();
  }
});

// server/auth.ts
var auth_exports = {};
__export(auth_exports, {
  checkAndSetSetupMode: () => checkAndSetSetupMode,
  comparePasswords: () => comparePasswords,
  hashPassword: () => hashPassword,
  isSetupMode: () => isSetupMode,
  setSetupMode: () => setSetupMode,
  setupAuth: () => setupAuth
});
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
function setSetupMode(status) {
  isSetupMode = status;
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (e) {
    return false;
  }
}
function setupAuth(app) {
  const sessionStore = new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60
  });
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "missionary-meal-calendar-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1e3 * 60 * 60 * 24
    }
  };
  app.use(session2(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use("local-regular", new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password || !await comparePasswords(password, user.password)) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
  passport.use(
    "ward-login",
    new LocalStrategy(
      { usernameField: "wardAccessCode", passwordField: "password" },
      async (wardAccessCode, password, done) => {
        try {
          const congregation = await storage.getCongregationByAccessCode(wardAccessCode);
          if (!congregation) {
            return done(null, false, { message: "Invalid congregation access code" });
          }
          if (password !== "password") {
            return done(null, false, { message: "Invalid password" });
          }
          let wardAdmin = await storage.getUserByUsername(`ward_admin_${congregation.id}`);
          if (!wardAdmin) {
            wardAdmin = await storage.createUser({
              username: `ward_admin_${congregation.id}`,
              password: await hashPassword("password"),
              role: "ward"
            });
            await storage.addUserToCongregation({ userId: wardAdmin.id, congregationId: congregation.id });
          }
          return done(null, wardAdmin);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app.post("/api/login", (req, res, next) => {
    if (isSetupMode) {
      return res.status(403).json({ message: "Application is in setup mode. Please create an admin account first." });
    }
    passport.authenticate("local-regular", (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          role: user.role
        });
      });
    })(req, res, next);
  });
  app.post("/api/ward-login", (req, res, next) => {
    passport.authenticate("ward-login", (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          role: user.role
        });
      });
    })(req, res, next);
  });
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  app.use("/api/admin/*", (req, res, next) => {
    if (req.isAuthenticated() && ["ultra", "region", "mission", "stake"].includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Admin access required" });
  });
}
async function checkAndSetSetupMode() {
  try {
    const ultraAdmin = await storage.getUltraAdmin();
    if (!ultraAdmin) {
      console.log("No Ultra Admin found. Entering setup mode.");
      setSetupMode(true);
    } else {
      console.log("Ultra Admin found. Application starting normally.");
      setSetupMode(false);
    }
  } catch (error) {
    console.error("Error checking for Ultra Admin, entering setup mode as a failsafe:", error);
    setSetupMode(true);
  }
}
var PgStore, scryptAsync, isSetupMode;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_storage();
    init_db();
    PgStore = connectPgSimple(session2);
    scryptAsync = promisify(scrypt);
    isSetupMode = false;
  }
});

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  EmailService: () => EmailService
});
import nodemailer from "nodemailer";
import { format } from "date-fns";
var EmailService;
var init_email_service = __esm({
  "server/email-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    EmailService = class {
      transporter;
      fromEmail;
      constructor() {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
          console.warn("Gmail not configured. Email notifications will be logged but not sent.");
          this.transporter = null;
          this.fromEmail = "";
        } else {
          try {
            this.transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
                // App-specific password, not regular Gmail password
              }
            });
            this.fromEmail = process.env.GMAIL_USER;
            console.log("Gmail service initialized successfully.");
          } catch (error) {
            console.error("Failed to initialize Gmail service:", error);
            this.transporter = null;
            this.fromEmail = "";
          }
        }
      }
      formatMealMessage(meal) {
        const mealDate = new Date(meal.date);
        const formattedDate = format(mealDate, "PPP");
        const [hours, minutes] = meal.startTime.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 || 12;
        const formattedTime = `${formattedHour}:${minutes} ${ampm}`;
        let message = `Meal scheduled at ${meal.hostName}'s home on ${formattedDate} at ${formattedTime}.`;
        if (meal.mealDescription) {
          message += ` Menu: ${meal.mealDescription}.`;
        }
        if (meal.specialNotes) {
          message += ` Notes: ${meal.specialNotes}`;
        }
        return message;
      }
      async sendMealReminder(missionary, meal) {
        const subject = `\u{1F37D}\uFE0F Meal Reminder - ${format(new Date(meal.date), "PPP")}`;
        const message = this.formatMealMessage(meal);
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">\u{1F37D}\uFE0F Meal Reminder</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>${message}</p>
        <p>Looking forward to seeing you there!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
        return this.sendEmail(missionary, subject, message, htmlContent, "before_meal");
      }
      async sendDayOfReminder(missionary, meals2) {
        if (meals2.length === 0) return true;
        const subject = `\u{1F4C5} Today's Meals - ${format(/* @__PURE__ */ new Date(), "PPP")}`;
        let textContent = `Dear ${missionary.name},

Here are your meals for today:

`;
        let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">\u{1F4C5} Today's Meals</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>Here are your meals for today:</p>
        <ul>
    `;
        meals2.forEach((meal, index) => {
          const mealText = this.formatMealMessage(meal);
          textContent += `${index + 1}. ${mealText}

`;
          htmlContent += `<li style="margin-bottom: 10px;">${mealText}</li>`;
        });
        textContent += "Have a wonderful day!";
        htmlContent += `
        </ul>
        <p>Have a wonderful day!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
        return this.sendEmail(missionary, subject, textContent, htmlContent, "day_of");
      }
      async sendWeeklySummary(missionary, meals2) {
        const subject = `\u{1F4CB} Weekly Meal Summary`;
        if (meals2.length === 0) {
          const textContent2 = `Dear ${missionary.name},

No meals scheduled for the upcoming week.`;
          const htmlContent2 = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">\u{1F4CB} Weekly Meal Summary</h2>
          <p><strong>Dear ${missionary.name},</strong></p>
          <p>No meals scheduled for the upcoming week.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated message from the Ward Missionary Meal Scheduler.
          </p>
        </div>
      `;
          return this.sendEmail(missionary, subject, textContent2, htmlContent2, "weekly_summary");
        }
        let textContent = `Dear ${missionary.name},

Here are your meals for the upcoming week:

`;
        let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">\u{1F4CB} Weekly Meal Summary</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>Here are your meals for the upcoming week:</p>
        <ul>
    `;
        meals2.forEach((meal, index) => {
          const mealText = this.formatMealMessage(meal);
          textContent += `${index + 1}. ${mealText}

`;
          htmlContent += `<li style="margin-bottom: 10px;">${mealText}</li>`;
        });
        textContent += "Have a blessed week!";
        htmlContent += `
        </ul>
        <p>Have a blessed week!</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
        return this.sendEmail(missionary, subject, textContent, htmlContent, "weekly_summary");
      }
      async sendCustomMessage(missionary, message, messageType) {
        const subject = `\u{1F4E2} Ward Meal Scheduler Notification`;
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">\u{1F4E2} Notification</h2>
        <p><strong>Dear ${missionary.name},</strong></p>
        <p>${message}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
        return this.sendEmail(missionary, subject, message, htmlContent, messageType);
      }
      async sendEmail(missionary, subject, textContent, htmlContent, messageType) {
        if (!missionary.emailAddress) {
          console.log(`Cannot send email to ${missionary.name}: No email address provided`);
          return false;
        }
        let successful = false;
        let failureReason;
        if (!this.transporter) {
          console.log(`[EMAIL SIMULATION] Sending email to ${missionary.emailAddress}:`);
          console.log(`Subject: ${subject}`);
          console.log(`Content: ${textContent}`);
          successful = true;
        } else {
          try {
            const result = await this.transporter.sendMail({
              from: this.fromEmail,
              to: missionary.emailAddress,
              subject,
              text: textContent,
              html: htmlContent
            });
            console.log(`Email sent successfully to ${missionary.emailAddress}, ID: ${result.messageId}`);
            successful = true;
          } catch (error) {
            console.error(`Failed to send email to ${missionary.emailAddress}:`, error);
            successful = false;
            failureReason = error instanceof Error ? error.message : "Unknown error";
          }
        }
        try {
          const messageLog = {
            missionaryId: missionary.id,
            wardId: missionary.wardId,
            messageType,
            messageContent: textContent,
            deliveryMethod: "email",
            content: textContent,
            method: "email",
            successful,
            charCount: textContent.length,
            segmentCount: 1,
            estimatedCost: "0",
            failureReason
          };
          await db.insert(messageLogs).values(messageLog);
        } catch (logError) {
          console.error("Failed to log email message:", logError);
        }
        return successful;
      }
    };
  }
});

// server/index.ts
import express from "express";

// server/routes.ts
init_storage();
init_schema();
init_auth();
import { createServer } from "http";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// server/notifications.ts
init_db();
init_schema();
init_email_service();
import { format as format3 } from "date-fns";
import { eq as eq2, and as and2, gte as gte2, lte as lte2, sql as sql2, count, sum } from "drizzle-orm";

// server/whatsapp-service.ts
init_db();
init_schema();
import axios from "axios";
import { format as format2 } from "date-fns";
var WhatsAppService = class {
  accessToken;
  phoneNumberId;
  webhookVerifyToken;
  constructor() {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp Business API not configured. WhatsApp notifications will be logged but not sent.");
      this.accessToken = "";
      this.phoneNumberId = "";
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
    } else {
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
      console.log("WhatsApp Business API initialized successfully.");
    }
  }
  formatMealMessage(meal) {
    const mealDate = new Date(meal.date);
    const formattedDate = format2(mealDate, "EEEE, MMMM d, yyyy");
    const [hours, minutes] = meal.startTime.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    const formattedTime = `${formattedHour}:${minutes} ${ampm}`;
    let message = `\u{1F37D}\uFE0F Meal at ${meal.hostName}'s home
\u{1F4C5} ${formattedDate}
\u{1F550} ${formattedTime}`;
    if (meal.mealDescription) {
      message += `
\u{1F35C} Menu: ${meal.mealDescription}`;
    }
    if (meal.specialNotes) {
      message += `
\u{1F4DD} Notes: ${meal.specialNotes}`;
    }
    return message;
  }
  async sendMealReminder(missionary, meal) {
    const message = `\u{1F514} *Meal Reminder*

Hi ${missionary.name}!

${this.formatMealMessage(meal)}

Looking forward to seeing you there! \u{1F60A}`;
    return this.sendMessage(missionary, message, "before_meal");
  }
  async sendDayOfReminder(missionary, meals2) {
    if (meals2.length === 0) return true;
    let message = `\u{1F4C5} *Today's Meals*

Hi ${missionary.name}!

Here are your meals for today:

`;
    meals2.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
    });
    message += "Have a wonderful day! \u{1F31F}";
    return this.sendMessage(missionary, message, "day_of");
  }
  async sendWeeklySummary(missionary, meals2) {
    let message = `\u{1F4CB} *Weekly Meal Summary*

Hi ${missionary.name}!

`;
    if (meals2.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      meals2.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
      });
      message += "Have a blessed week! \u{1F64F}";
    }
    return this.sendMessage(missionary, message, "weekly_summary");
  }
  async sendCustomMessage(missionary, messageText, messageType) {
    const message = `\u{1F4E2} *Ward Meal Scheduler*

Hi ${missionary.name}!

${messageText}`;
    return this.sendMessage(missionary, message, messageType);
  }
  async sendMessage(missionary, message, messageType) {
    if (!missionary.whatsappNumber) {
      console.log(`Cannot send WhatsApp message to ${missionary.name}: No WhatsApp number provided`);
      return false;
    }
    let successful = false;
    let failureReason;
    if (!this.accessToken || !this.phoneNumberId) {
      console.log(`[WHATSAPP SIMULATION] Sending message to ${missionary.whatsappNumber}:`);
      console.log(message);
      successful = true;
    } else {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
          {
            messaging_product: "whatsapp",
            to: missionary.whatsappNumber,
            type: "text",
            text: {
              body: message
            }
          },
          {
            headers: {
              "Authorization": `Bearer ${this.accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );
        console.log(`WhatsApp message sent successfully to ${missionary.whatsappNumber}, ID: ${response.data.messages[0].id}`);
        successful = true;
      } catch (error) {
        console.error(`Failed to send WhatsApp message to ${missionary.whatsappNumber}:`, error);
        successful = false;
        failureReason = error instanceof Error ? error.message : "Unknown error";
      }
    }
    try {
      const messageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        messageContent: message,
        deliveryMethod: "whatsapp",
        content: message,
        method: "whatsapp",
        successful,
        charCount: message.length,
        segmentCount: 1,
        estimatedCost: "0",
        failureReason
      };
      await db.insert(messageLogs).values(messageLog);
    } catch (logError) {
      console.error("Failed to log WhatsApp message:", logError);
    }
    return successful;
  }
  // Webhook verification for WhatsApp
  verifyWebhook(mode, token, challenge) {
    if (mode === "subscribe" && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }
  // Process incoming WhatsApp messages (for consent verification)
  async processIncomingMessage(body) {
    try {
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        if (change.field === "messages" && change.value.messages) {
          const message = change.value.messages[0];
          const fromNumber = message.from;
          const messageText = message.text?.body?.trim().toLowerCase();
          if (!messageText) return;
          console.log(`Received WhatsApp message from ${fromNumber}: ${messageText}`);
          console.log("WhatsApp message processing would happen here");
        }
      }
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
    }
  }
};

// server/notifications.ts
var BaseNotificationService = class {
  formatDate(date, pattern) {
    return format3(date, pattern);
  }
  formatMealMessage(meal) {
    const mealDate = new Date(meal.date);
    const formattedDate = this.formatDate(mealDate, "PPP");
    const [hours, minutes] = meal.startTime.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    const formattedTime = `${formattedHour}:${minutes} ${ampm}`;
    let message = `Meal scheduled at ${meal.hostName}'s home on ${formattedDate} at ${formattedTime}.`;
    if (meal.mealDescription) {
      message += ` Menu: ${meal.mealDescription}.`;
    }
    if (meal.specialNotes) {
      message += ` Notes: ${meal.specialNotes}`;
    }
    return message;
  }
  // Calculate SMS segments based on character count (for legacy compatibility)
  calculateSegments(message) {
    const nonGsmChars = /[^\u0000-\u007F\u00A0-\u00FF\u20AC\u00A3\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\u00D8\u00F8\u00C5\u00E5\u00C6\u00E6\u00DF\u00C9\u00C4\u00D6\u00DC\u00E4\u00F6\u00FC\u00D1\u00F1\u00BF\u00A1\u00C0\u00C1\u00C2\u00C3\u00C8\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D2\u00D3\u00D4\u00D5\u00D7\u00D9\u00DA\u00DB\u00DD\u00DE\u00E0\u00E1\u00E2\u00E3\u00EA\u00EB\u00ED\u00EE\u00EF\u00F0\u00F3\u00F4\u00F5\u00F7\u00FA\u00FB\u00FE\u00FF]/;
    const charsPerSegment = nonGsmChars.test(message) ? 70 : 160;
    if (message.length <= charsPerSegment) {
      return 1;
    } else {
      const charsPerMultiSegment = nonGsmChars.test(message) ? 67 : 153;
      return Math.ceil(message.length / charsPerMultiSegment);
    }
  }
};
var EmailNotificationService = class extends BaseNotificationService {
  emailService;
  constructor() {
    super();
    this.emailService = new EmailService();
  }
  async sendMealReminder(missionary, meal) {
    return this.emailService.sendMealReminder(missionary, meal);
  }
  async sendDayOfReminder(missionary, meals2) {
    return this.emailService.sendDayOfReminder(missionary, meals2);
  }
  async sendWeeklySummary(missionary, meals2) {
    return this.emailService.sendWeeklySummary(missionary, meals2);
  }
};
var WhatsAppNotificationService = class extends BaseNotificationService {
  whatsappService;
  constructor() {
    super();
    this.whatsappService = new WhatsAppService();
  }
  async sendMealReminder(missionary, meal) {
    return this.whatsappService.sendMealReminder(missionary, meal);
  }
  async sendDayOfReminder(missionary, meals2) {
    return this.whatsappService.sendDayOfReminder(missionary, meals2);
  }
  async sendWeeklySummary(missionary, meals2) {
    return this.whatsappService.sendWeeklySummary(missionary, meals2);
  }
};
var TwilioService = class extends BaseNotificationService {
  twilioClient;
  twilioPhoneNumber;
  constructor() {
    super();
    console.warn("TwilioService is deprecated. Please use EmailNotificationService or WhatsAppNotificationService instead.");
    console.warn("Twilio SMS is now disabled. Using free email and WhatsApp notifications instead.");
    this.twilioClient = null;
    this.twilioPhoneNumber = "";
  }
  async sendMealReminder(missionary, meal) {
    const message = `\u{1F37D}\uFE0F Meal Reminder: ${this.formatMealMessage(meal)}`;
    return this.sendText(missionary, message, "before_meal");
  }
  async sendDayOfReminder(missionary, meals2) {
    if (meals2.length === 0) return true;
    let message = `\u{1F4C5} Today's Meals:

`;
    meals2.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
    });
    message += "Have a wonderful day! \u{1F31F}";
    return this.sendText(missionary, message, "day_of");
  }
  async sendWeeklySummary(missionary, meals2) {
    let message = `\u{1F4CB} Weekly Meal Summary:

`;
    if (meals2.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      meals2.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
      });
      message += "Have a blessed week! \u{1F64F}";
    }
    return this.sendText(missionary, message, "weekly_summary");
  }
  async sendText(missionary, message, messageType) {
    let successful = false;
    let failureReason;
    const segments = this.calculateSegments(message);
    if (!this.twilioClient) {
      console.log(`[SMS SIMULATION] Sending text to ${missionary.phoneNumber}:`);
      console.log(message);
      successful = true;
    } else {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: missionary.phoneNumber
        });
        console.log(`SMS sent successfully to ${missionary.phoneNumber}, SID: ${result.sid}`);
        successful = true;
      } catch (error) {
        console.error(`Failed to send SMS to ${missionary.phoneNumber}:`, error);
        successful = false;
        failureReason = error instanceof Error ? error.message : "Unknown error";
      }
    }
    try {
      const messageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        messageContent: message,
        deliveryMethod: "sms",
        content: message,
        method: "sms",
        successful,
        charCount: message.length,
        segmentCount: segments,
        estimatedCost: (segments * 75e-4).toString(),
        failureReason
      };
      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error("Failed to log SMS message:", dbError);
    }
    return successful;
  }
};
var MessengerService = class extends BaseNotificationService {
  constructor() {
    super();
    console.warn("MessengerService is deprecated. Please use EmailNotificationService or WhatsAppNotificationService instead.");
  }
  async sendMealReminder(missionary, meal) {
    const message = `\u{1F37D}\uFE0F Meal Reminder: ${this.formatMealMessage(meal)}`;
    return this.sendMessengerMessage(missionary, message, "before_meal");
  }
  async sendDayOfReminder(missionary, meals2) {
    if (meals2.length === 0) return true;
    let message = `\u{1F4C5} Today's Meals:

`;
    meals2.forEach((meal, index) => {
      message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
    });
    message += "Have a wonderful day! \u{1F31F}";
    return this.sendMessengerMessage(missionary, message, "day_of");
  }
  async sendWeeklySummary(missionary, meals2) {
    let message = `\u{1F4CB} Weekly Meal Summary:

`;
    if (meals2.length === 0) {
      message += "No meals scheduled for the upcoming week.";
    } else {
      message += "Here are your meals for the upcoming week:\n\n";
      meals2.forEach((meal, index) => {
        message += `${index + 1}. ${this.formatMealMessage(meal)}

`;
      });
      message += "Have a blessed week! \u{1F64F}";
    }
    return this.sendMessengerMessage(missionary, message, "weekly_summary");
  }
  async sendMessengerMessage(missionary, message, messageType) {
    let successful = false;
    let failureReason;
    console.log(`[MESSENGER SIMULATION] Sending message to ${missionary.messengerAccount}:`);
    console.log(message);
    successful = true;
    try {
      const messageLog = {
        missionaryId: missionary.id,
        wardId: missionary.wardId,
        messageType,
        messageContent: message,
        deliveryMethod: "messenger",
        content: message,
        method: "messenger",
        successful,
        charCount: message.length,
        segmentCount: 1,
        estimatedCost: "0",
        failureReason
      };
      await db.insert(messageLogs).values(messageLog);
    } catch (dbError) {
      console.error("Failed to log message statistics:", dbError);
    }
    return successful;
  }
};
var MessageStatsService = class {
  calculateEstimatedCost(segments) {
    return segments * 75e-4;
  }
  async getMessageStats() {
    const [totalStats] = await db.select({
      totalMessages: count(),
      totalSuccessful: count(
        sql2`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
      ),
      totalSegments: sum(messageLogs.segmentCount)
    }).from(messageLogs);
    const totalFailed = totalStats.totalMessages - totalStats.totalSuccessful;
    const byWard = await db.select({
      wardId: messageLogs.wardId,
      wardName: sql2`'Ward ' || ${messageLogs.wardId}::text`,
      messageCount: count(),
      successCount: count(
        sql2`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
      ),
      segments: sum(messageLogs.segmentCount)
    }).from(messageLogs).groupBy(messageLogs.wardId);
    const byMissionary = await db.select({
      missionaryId: messageLogs.missionaryId,
      missionaryName: sql2`'Missionary ID ' || ${messageLogs.missionaryId}::text`,
      messageCount: count(),
      successCount: count(
        sql2`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
      ),
      segments: sum(messageLogs.segmentCount)
    }).from(messageLogs).groupBy(messageLogs.missionaryId);
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const timeQueries = [
      { name: "today", start: today, end: now },
      { name: "this_week", start: startOfWeek, end: now },
      { name: "this_month", start: startOfMonth, end: now },
      { name: "last_month", start: startOfLastMonth, end: endOfLastMonth }
    ];
    const byPeriod = await Promise.all(
      timeQueries.map(async ({ name, start, end }) => {
        const [result] = await db.select({
          messageCount: count(),
          segments: sum(messageLogs.segmentCount)
        }).from(messageLogs).where(
          and2(
            gte2(messageLogs.sentAt, start),
            lte2(messageLogs.sentAt, end)
          )
        );
        return {
          period: name,
          messageCount: result.messageCount,
          segments: Number(result.segments) || 0,
          estimatedCost: this.calculateEstimatedCost(Number(result.segments) || 0)
        };
      })
    );
    const byMethodStats = await db.select({
      method: messageLogs.method,
      count: count()
    }).from(messageLogs).groupBy(messageLogs.method);
    const byNotificationMethod = {
      email: byMethodStats.find((m) => m.method === "email")?.count || 0,
      whatsapp: byMethodStats.find((m) => m.method === "whatsapp")?.count || 0,
      text: byMethodStats.find((m) => m.method === "text")?.count || 0,
      // Legacy
      messenger: byMethodStats.find((m) => m.method === "messenger")?.count || 0
      // Legacy
    };
    return {
      totalMessages: totalStats.totalMessages,
      totalSuccessful: totalStats.totalSuccessful,
      totalFailed,
      totalCharacters: 0,
      // Not tracking characters in new system
      totalSegments: Number(totalStats.totalSegments) || 0,
      estimatedCost: 0,
      // Email and WhatsApp are free
      byNotificationMethod,
      byWard: byWard.map((ward) => ({
        wardId: ward.wardId,
        wardName: ward.wardName,
        messageCount: ward.messageCount,
        successRate: ward.messageCount > 0 ? ward.successCount / ward.messageCount * 100 : 0,
        characters: 0,
        // Not tracking characters
        segments: Number(ward.segments) || 0,
        estimatedCost: 0
        // Free services
      })),
      byMissionary: byMissionary.map((missionary) => ({
        missionaryId: missionary.missionaryId,
        missionaryName: missionary.missionaryName,
        messageCount: missionary.messageCount,
        successRate: missionary.messageCount > 0 ? missionary.successCount / missionary.messageCount * 100 : 0,
        characters: 0,
        // Not tracking characters
        segments: Number(missionary.segments) || 0,
        estimatedCost: 0
        // Free services
      })),
      byPeriod
    };
  }
  async getWardMessageStats(wardId) {
    const [totalStats] = await db.select({
      totalMessages: count(),
      totalSuccessful: count(
        sql2`CASE WHEN ${messageLogs.successful} = true THEN 1 END`
      ),
      totalSegments: sum(messageLogs.segmentCount)
    }).from(messageLogs).where(eq2(messageLogs.wardId, wardId));
    const totalFailed = totalStats.totalMessages - totalStats.totalSuccessful;
    const byMethodStats = await db.select({
      method: messageLogs.method,
      count: count()
    }).from(messageLogs).where(eq2(messageLogs.wardId, wardId)).groupBy(messageLogs.method);
    const byNotificationMethod = {
      email: byMethodStats.find((m) => m.method === "email")?.count || 0,
      whatsapp: byMethodStats.find((m) => m.method === "whatsapp")?.count || 0,
      text: byMethodStats.find((m) => m.method === "text")?.count || 0,
      messenger: byMethodStats.find((m) => m.method === "messenger")?.count || 0
    };
    return {
      totalMessages: totalStats.totalMessages,
      totalSuccessful: totalStats.totalSuccessful,
      totalFailed,
      totalCharacters: 0,
      totalSegments: Number(totalStats.totalSegments) || 0,
      estimatedCost: 0,
      // Free services
      byNotificationMethod,
      byWard: [],
      byMissionary: [],
      byPeriod: []
    };
  }
};
var NotificationManager = class {
  emailService;
  whatsappService;
  smsService;
  // Legacy support
  messengerService;
  // Legacy support
  statsService;
  constructor() {
    this.emailService = new EmailNotificationService();
    this.whatsappService = new WhatsAppNotificationService();
    this.smsService = new TwilioService();
    this.messengerService = new MessengerService();
    this.statsService = new MessageStatsService();
  }
  getServiceForMissionary(missionary) {
    switch (missionary.preferredNotification) {
      case "email":
        return this.emailService;
      case "whatsapp":
        return this.whatsappService;
      case "text":
      case "sms":
        return this.smsService;
      // Legacy
      case "messenger":
        return this.messengerService;
      // Legacy
      default:
        return this.emailService;
    }
  }
  async sendMealReminder(missionary, meal) {
    const service = this.getServiceForMissionary(missionary);
    return service.sendMealReminder(missionary, meal);
  }
  async sendDayOfReminder(missionary, meals2) {
    const service = this.getServiceForMissionary(missionary);
    return service.sendDayOfReminder(missionary, meals2);
  }
  async sendWeeklySummary(missionary, meals2) {
    const service = this.getServiceForMissionary(missionary);
    return service.sendWeeklySummary(missionary, meals2);
  }
  async scheduleNotifications(missionary, meal) {
    console.log(`Scheduling notifications for ${missionary.name} for meal on ${meal.date}`);
  }
  async getMessageStats() {
    return this.statsService.getMessageStats();
  }
  async getWardMessageStats(wardId) {
    return this.statsService.getWardMessageStats(wardId);
  }
  async sendCustomMessage(missionary, message, messageType) {
    const service = this.getServiceForMissionary(missionary);
    if (service instanceof EmailNotificationService) {
      return service.emailService.sendCustomMessage(missionary, message, messageType);
    } else if (service instanceof WhatsAppNotificationService) {
      return service.whatsappService.sendCustomMessage(missionary, message, messageType);
    } else {
      console.log(`[${missionary.preferredNotification?.toUpperCase()} SIMULATION] Custom message to ${missionary.name}: ${message}`);
      return true;
    }
  }
};
var notificationManager = new NotificationManager();

// server/email-verification.ts
init_db();
init_schema();
import nodemailer2 from "nodemailer";
import { eq as eq3 } from "drizzle-orm";
var EmailVerificationService = class {
  transporter;
  fromEmail;
  constructor() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("Gmail not configured. Email verification will be simulated.");
      this.transporter = null;
      this.fromEmail = "";
    } else {
      try {
        this.transporter = nodemailer2.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        this.fromEmail = process.env.GMAIL_USER;
        console.log("Email verification service initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize email verification service:", error);
        this.transporter = null;
        this.fromEmail = "";
      }
    }
  }
  generateVerificationCode() {
    return Math.floor(1e5 + Math.random() * 9e5).toString();
  }
  async sendVerificationCode(email, missionaryId) {
    if (!email.endsWith("@missionary.org")) {
      throw new Error("Email must end with @missionary.org");
    }
    const verificationCode = this.generateVerificationCode();
    await db.update(missionaries).set({
      emailVerificationCode: verificationCode,
      emailVerificationSentAt: /* @__PURE__ */ new Date(),
      emailVerified: false
    }).where(eq3(missionaries.id, missionaryId));
    const subject = "Verify Your Email - Missionary Meal Scheduler";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; text-align: center;">Email Verification</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="margin: 0; color: #1e40af;">Your Verification Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; letter-spacing: 4px; font-family: monospace;">
            ${verificationCode}
          </div>
        </div>
        <p style="text-align: center; color: #64748b; font-size: 14px;">
          Enter this 4-digit code in the application to verify your email address.
        </p>
        <p style="text-align: center; color: #64748b; font-size: 14px;">
          This code will expire in 10 minutes for security.
        </p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated message from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    if (!this.transporter) {
      console.log(`[EMAIL VERIFICATION SIMULATION] Sending verification code to ${email}:`);
      console.log(`Verification Code: ${verificationCode}`);
      return true;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject,
        html: htmlContent
      });
      console.log(`Verification email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }
  async verifyCode(missionaryId, code) {
    const [missionary] = await db.select().from(missionaries).where(eq3(missionaries.id, missionaryId));
    if (!missionary) {
      throw new Error("Missionary not found");
    }
    if (!missionary.emailVerificationCode) {
      throw new Error("No verification code found");
    }
    if (missionary.emailVerificationSentAt) {
      const sentTime = new Date(missionary.emailVerificationSentAt);
      const now = /* @__PURE__ */ new Date();
      const diffMinutes = (now.getTime() - sentTime.getTime()) / (1e3 * 60);
      if (diffMinutes > 10) {
        throw new Error("Verification code has expired");
      }
    }
    if (missionary.emailVerificationCode === code) {
      await db.update(missionaries).set({
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationSentAt: null
      }).where(eq3(missionaries.id, missionaryId));
      return true;
    }
    return false;
  }
};

// server/transfer-management.ts
init_db();
init_schema();
init_email_service();
import { eq as eq4, and as and3, lte as lte3, isNotNull } from "drizzle-orm";
var TransferManagementService = class {
  emailService;
  constructor() {
    this.emailService = new EmailService();
  }
  async checkAndNotifyTransfers() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const missionariesWithTransfers = await db.select().from(missionaries).where(
      and3(
        isNotNull(missionaries.transferDate),
        lte3(missionaries.transferDate, tomorrow),
        eq4(missionaries.transferNotificationSent, false)
      )
    );
    if (missionariesWithTransfers.length === 0) {
      return;
    }
    const superAdmins = await db.select().from(users).where(eq4(users.isSuperAdmin, true));
    for (const missionary of missionariesWithTransfers) {
      const transferDate = new Date(missionary.transferDate);
      const formattedDate = transferDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      for (const admin of superAdmins) {
        await this.sendTransferNotification(admin, missionary, formattedDate);
      }
      await db.update(missionaries).set({ transferNotificationSent: true }).where(eq4(missionaries.id, missionary.id));
    }
  }
  async sendTransferNotification(admin, missionary, transferDate) {
    const subject = `\u{1F504} Missionary Transfer Reminder - ${missionary.name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; text-align: center;">\u{1F504} Transfer Reminder</h2>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Missionary Transfer Today</h3>
          <p><strong>Missionary:</strong> {missionary.name}</p>
          <p><strong>Type:</strong> {missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)}</p>
          <p><strong>Transfer Date:</strong> {transferDate}</p>
          <p><strong>Current Phone:</strong> {missionary.phoneNumber}</p>
          <p><strong>Current Email:</strong> {missionary.emailAddress || 'Not provided'}</p>
          <p><strong>WhatsApp:</strong> {missionary.whatsappNumber || 'Not provided'}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #0369a1;">Action Required</h4>
          <p>Please contact the missionary to update their information:</p>
          <ul style="margin: 10px 0;">
            <li>New phone number</li>
            <li>New @missionary.org email address</li>
            <li>New WhatsApp number (if different)</li>
            <li>Updated dietary restrictions/allergies</li>
            <li>New transfer date (if applicable)</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || "https://missionary-meals.replit.app"}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Missionary Information
          </a>
        </div>

        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is an automated reminder from the Ward Missionary Meal Scheduler.
        </p>
      </div>
    `;
    const textContent = `
Transfer Reminder - ${missionary.name}

Missionary: ${missionary.name}
Type: ${missionary.type.charAt(0).toUpperCase() + missionary.type.slice(1)}
Transfer Date: ${transferDate}
Current Phone: ${missionary.phoneNumber}
Current Email: ${missionary.emailAddress || "Not provided"}
WhatsApp: ${missionary.whatsappNumber || "Not provided"}

Action Required:
Please contact the missionary to update their information:
- New phone number
- New @missionary.org email address  
- New WhatsApp number (if different)
- Updated dietary restrictions/allergies
- New transfer date (if applicable)

Update at: ${process.env.APP_URL || "https://missionary-meals.replit.app"}
    `;
    if (!this.emailService) {
      console.log(`[TRANSFER NOTIFICATION SIMULATION] Would send to ${admin.username}:`);
      console.log(textContent);
      return;
    }
    console.log(`Sending transfer notification for ${missionary.name} to ${admin.username}`);
  }
  async scheduleTransferNotification(missionaryId, transferDate) {
    await db.update(missionaries).set({
      transferDate,
      transferNotificationSent: false
    }).where(eq4(missionaries.id, missionaryId));
  }
};

// server/routes.ts
async function registerRoutes(app) {
  setupAuth(app);
  await checkAndSetSetupMode();
  const emailVerificationService = new EmailVerificationService();
  const transferService = new TransferManagementService();
  const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };
  const requireAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || !["ultra", "region", "mission", "stake", "ward"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: Admin privileges required" });
    }
    next();
  };
  const requireSuperAdmin = (req, res, next) => {
    console.log("requireSuperAdmin: Checking user authentication and role for POST /api/admin/congregations.");
    if (!req.isAuthenticated()) {
      console.log("requireSuperAdmin: User is NOT authenticated.");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log(`requireSuperAdmin: User IS authenticated. User ID: ${req.user.id}, User Role: ${req.user.role}`);
    if (!["ultra", "region", "mission", "stake"].includes(req.user.role)) {
      console.log(`requireSuperAdmin: Access DENIED. User role '${req.user.role}' does not have SuperAdmin privileges.`);
      return res.status(403).json({ message: "Access denied: SuperAdmin privileges required" });
    }
    console.log("requireSuperAdmin: Access GRANTED for SuperAdmin role.");
    next();
  };
  const requireUltraAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== "ultra") {
      return res.status(403).json({ message: "Access denied: Ultra Admin privileges required" });
    }
    next();
  };
  app.get("/api/auth/is-setup", (req, res) => {
    res.json({ isSetupMode });
  });
  app.post("/api/auth/setup", async (req, res, next) => {
    console.log("--- START ADMIN SETUP ATTEMPT ---");
    console.log(`Current setup mode: ${isSetupMode}`);
    if (!isSetupMode) {
      console.log("Application is NOT in setup mode. Blocking setup request (HTTP 403).");
      console.log("--- END ADMIN SETUP ATTEMPT (BLOCKED) ---");
      return res.status(403).json({ message: "Application is not in setup mode" });
    }
    try {
      const { username, password } = req.body;
      console.log(`Received setup request for username: '${username}'`);
      if (!username || !password) {
        console.log("Username or password missing (HTTP 400).");
        console.log("--- END ADMIN SETUP ATTEMPT (FAILED) ---");
        return res.status(400).json({ message: "Username and password are required" });
      }
      console.log("Hashing password...");
      const hashedPassword = await hashPassword(password);
      console.log("Password hashed successfully.");
      const userToInsert = {
        username,
        password: hashedPassword,
        role: "ultra",
        // Defaulting other optional fields to null or false
        regionId: null,
        missionId: null,
        stakeId: null,
        canUsePaidNotifications: false
      };
      console.log(`Attempting to create user '${username}' in database...`);
      const user = await storage.createUser(userToInsert);
      console.log(`User created successfully with ID: ${user.id}, Username: '${user.username}', Role: '${user.role}'`);
      setSetupMode(false);
      console.log("Setup mode set to false.");
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in new user:", err);
          console.log("--- END ADMIN SETUP ATTEMPT (LOGIN FAILED) ---");
          return next(err);
        }
        console.log(`User '${user.username}' logged in successfully. Sending 201 response.`);
        res.status(201).json({
          id: user.id,
          username: user.username,
          role: user.role
        });
        console.log("--- END ADMIN SETUP ATTEMPT (SUCCESS) ---");
      });
    } catch (error) {
      console.error("Error during setup (catch block):", error);
      if (error.code === "23505" && error.detail && error.detail.includes("username")) {
        console.log("Duplicate username detected (HTTP 409).");
        res.status(409).json({ message: "Username already exists. An admin account might already be created, or the username is taken." });
      } else {
        console.log(`Generic error during setup: ${error.message} (HTTP 500).`);
        res.status(500).json({ message: error.message || "Failed to create admin user due to an unexpected error." });
      }
      console.log("--- END ADMIN SETUP ATTEMPT (FAILED) ---");
    }
  });
  const notifyMissionary = async (missionaryId, message) => {
    const missionary = await storage.getMissionary(missionaryId);
    if (!missionary) return false;
    if (missionary.preferredNotification === "text" && missionary.consentStatus !== "granted") {
      console.log(`Cannot send SMS to ${missionary.name}: Consent status is ${missionary.consentStatus}`);
      return false;
    }
    if (missionary.preferredNotification === "messenger" && !missionary.messengerAccount) {
      console.log(`Cannot send messenger notification to ${missionary.name}: No messenger account provided`);
      return false;
    }
    try {
      const service = notificationManager.getServiceForMissionary(missionary);
      return await notificationManager.sendCustomMessage(missionary, message, "status_update");
    } catch (error) {
      console.error(`Failed to send notification to ${missionary.name}:`, error);
      return false;
    }
  };
  const notifyAdmin = async (message) => {
    console.log(`Admin notification: ${message}`);
    return true;
  };
  const handleZodError = (err, res) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details
      });
    }
    console.error("API error:", err);
    return res.status(500).json({ message: "Internal server error" });
  };
  app.get("/api/regions", requireAdmin, async (req, res) => {
    try {
      const regions2 = await storage.getAllRegions();
      res.json(regions2);
    } catch (err) {
      console.error("Error fetching regions:", err);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });
  app.post("/api/regions", requireUltraAdmin, async (req, res) => {
    try {
      const regionData = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(regionData);
      res.status(201).json(region);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.patch("/api/regions/:id", requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const regionId = parseInt(id, 10);
      if (isNaN(regionId)) {
        return res.status(400).json({ message: "Invalid region ID" });
      }
      const regionData = insertRegionSchema.partial().parse(req.body);
      const updatedRegion = await storage.updateRegion(regionId, regionData);
      if (updatedRegion) {
        res.json(updatedRegion);
      } else {
        res.status(404).json({ message: "Region not found" });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.delete("/api/regions/:id", requireUltraAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const regionId = parseInt(id, 10);
      if (isNaN(regionId)) {
        return res.status(400).json({ message: "Invalid region ID" });
      }
      const success = await storage.deleteRegion(regionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Region not found" });
      }
    } catch (err) {
      console.error("Error deleting region:", err);
      res.status(500).json({ message: "Failed to delete region" });
    }
  });
  app.get("/api/missions", requireAdmin, async (req, res) => {
    try {
      const showUnassignedOnly = req.query.unassignedOnly === "true";
      const searchTerm = req.query.searchTerm;
      const missions2 = await storage.getAllMissions(showUnassignedOnly, searchTerm);
      res.json(missions2);
    } catch (err) {
      console.error("Error fetching missions:", err);
      res.status(500).json({ message: "Failed to fetch missions" });
    }
  });
  app.post("/api/missions", requireSuperAdmin, async (req, res) => {
    try {
      const missionData = insertMissionSchema.parse(req.body);
      const mission = await storage.createMission(missionData);
      res.status(201).json(mission);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.patch("/api/missions/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionId = parseInt(id, 10);
      if (isNaN(missionId)) {
        return res.status(400).json({ message: "Invalid mission ID" });
      }
      const missionData = insertMissionSchema.partial().parse(req.body);
      const updatedMission = await storage.updateMission(missionId, missionData);
      if (updatedMission) {
        res.json(updatedMission);
      } else {
        res.status(404).json({ message: "Mission not found" });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.delete("/api/missions/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionId = parseInt(id, 10);
      if (isNaN(missionId)) {
        return res.status(400).json({ message: "Invalid mission ID" });
      }
      const success = await storage.deleteMission(missionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Mission not found" });
      }
    } catch (err) {
      console.error("Error deleting mission:", err);
      res.status(500).json({ message: "Failed to delete mission" });
    }
  });
  app.get("/api/stakes", requireAdmin, async (req, res) => {
    try {
      const showUnassignedOnly = req.query.unassignedOnly === "true";
      const searchTerm = req.query.searchTerm;
      const stakes2 = await storage.getAllStakes(showUnassignedOnly, searchTerm);
      res.json(stakes2);
    } catch (err) {
      console.error("Error fetching stakes:", err);
      res.status(500).json({ message: "Failed to fetch stakes" });
    }
  });
  app.post("/api/stakes", requireSuperAdmin, async (req, res) => {
    try {
      const stakeData = insertStakeSchema.parse(req.body);
      const stake = await storage.createStake(stakeData);
      res.status(201).json(stake);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.patch("/api/stakes/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const stakeId = parseInt(id, 10);
      if (isNaN(stakeId)) {
        return res.status(400).json({ message: "Invalid stake ID" });
      }
      const stakeData = insertStakeSchema.partial().parse(req.body);
      const updatedStake = await storage.updateStake(stakeId, stakeData);
      if (updatedStake) {
        res.json(updatedStake);
      } else {
        res.status(404).json({ message: "Stake not found" });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.delete("/api/stakes/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const stakeId = parseInt(id, 10);
      if (isNaN(stakeId)) {
        return res.status(400).json({ message: "Invalid stake ID" });
      }
      const success = await storage.deleteStake(stakeId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Stake not found" });
      }
    } catch (err) {
      console.error("Error deleting stake:", err);
      res.status(500).json({ message: "Failed to delete stake" });
    }
  });
  app.get("/api/missionaries", async (req, res) => {
    try {
      const searchTerm = req.query.searchTerm;
      const missionaries2 = await storage.getAllMissionaries(searchTerm);
      res.json(missionaries2);
    } catch (err) {
      console.error("Error fetching missionaries:", err);
      res.status(500).json({ message: "Failed to fetch missionaries" });
    }
  });
  app.get("/api/missionaries/:typeOrId", async (req, res) => {
    try {
      const { typeOrId } = req.params;
      const congregationId = parseInt(req.query.congregationId, 10) || 1;
      if (!isNaN(parseInt(typeOrId, 10))) {
        const missionaryId = parseInt(typeOrId, 10);
        const missionary = await storage.getMissionary(missionaryId);
        if (!missionary) {
          return res.status(404).json({ message: "Missionary not found" });
        }
        return res.json(missionary);
      }
      if (typeOrId !== "elders" && typeOrId !== "sisters") {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }
      const missionaries2 = await storage.getMissionariesByType(typeOrId, congregationId);
      res.json(missionaries2);
    } catch (err) {
      console.error("Error fetching missionaries:", err);
      res.status(500).json({ message: "Failed to fetch missionaries" });
    }
  });
  app.get("/api/admin/missionaries/congregation/:congregationId", requireAdmin, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      const searchTerm = req.query.searchTerm;
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      if (req.user.role !== "ultra") {
        const userCongregations2 = await storage.getUserCongregations(req.user.id);
        const hasAccess = userCongregations2.some((congregation) => congregation.id === parsedCongregationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "You do not have access to this congregation" });
        }
      }
      const missionaries2 = await storage.getMissionariesByCongregation(parsedCongregationId, searchTerm);
      res.json(missionaries2);
    } catch (err) {
      console.error("Error fetching missionaries by congregation:", err);
      res.status(500).json({ message: "Failed to fetch missionaries" });
    }
  });
  app.post("/api/meals/check-availability", async (req, res) => {
    try {
      const data = checkMealAvailabilitySchema.parse(req.body);
      const date = new Date(data.date);
      const congregationId = data.congregationId;
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, congregationId);
      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.get("/api/meals", async (req, res) => {
    try {
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      const congregationIdParam = req.query.congregationId;
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const congregationId = congregationIdParam ? parseInt(congregationIdParam, 10) : void 0;
      const meals2 = await storage.getMealsByDateRange(startDate, endDate, congregationId);
      const missionaries2 = await storage.getAllMissionaries();
      const missionaryMap = new Map(missionaries2.map((m) => [m.id, m]));
      const mealsWithMissionaries = meals2.map((meal) => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error("Error fetching meals:", err);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });
  app.get("/api/meals/host/:phone", async (req, res) => {
    try {
      const { phone } = req.params;
      const meals2 = await storage.getUpcomingMealsByHostPhone(phone);
      const missionaries2 = await storage.getAllMissionaries();
      const missionaryMap = new Map(missionaries2.map((m) => [m.id, m]));
      const mealsWithMissionaries = meals2.map((meal) => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error("Error fetching meals by host:", err);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });
  app.post("/api/meals", async (req, res) => {
    try {
      console.log("Received meal booking request:", req.body);
      const requestData = {
        ...req.body,
        date: new Date(req.body.date)
      };
      const mealData = insertMealSchema.parse(requestData);
      const missionary = await storage.getMissionary(mealData.missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      const mealDate = new Date(mealData.date);
      const congregationId = mealData.congregationId;
      const isAvailable = await storage.checkMealAvailability(mealDate, missionary.id.toString(), congregationId);
      if (!isAvailable) {
        return res.status(409).json({
          message: `${missionary.name} is already booked for this date`
        });
      }
      const meal = await storage.createMeal(mealData);
      const formattedDate = mealDate.toLocaleDateString(void 0, {
        weekday: "long",
        month: "long",
        day: "numeric"
      });
      const notificationMessage = `New meal scheduled: ${formattedDate} at ${meal.startTime} with ${meal.hostName}. ` + (meal.mealDescription ? `Menu: ${meal.mealDescription}` : "") + (meal.specialNotes ? ` Notes: ${meal.specialNotes}` : "");
      if (missionary.preferredNotification === "text" && missionary.phoneNumber) {
        if (missionary.consentStatus === "granted") {
          await notifyMissionary(meal.missionaryId, notificationMessage);
        } else if (missionary.consentStatus === "pending") {
          const shouldResendVerification = !missionary.consentVerificationSentAt || (/* @__PURE__ */ new Date()).getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1e3;
          if (shouldResendVerification) {
            const verificationCode = generateVerificationCode();
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: /* @__PURE__ */ new Date()
            });
            const consentMessage = `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. Reply STOP at any time to opt out of messages. Msg & data rates may apply.`;
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        } else if (!missionary.consentStatus || missionary.consentStatus === "denied") {
          const verificationCode = generateVerificationCode();
          await storage.updateMissionary(missionary.id, {
            consentVerificationToken: verificationCode,
            consentVerificationSentAt: /* @__PURE__ */ new Date(),
            consentStatus: "pending"
          });
          const consentMessage = `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. Reply STOP at any time to opt out of messages. Msg & data rates may apply.`;
          if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
            await notificationManager.smsService.twilioClient.messages.create({
              body: consentMessage,
              from: notificationManager.smsService.twilioPhoneNumber,
              to: missionary.phoneNumber
            });
            console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
          } else {
            console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
          }
        }
      } else if (missionary.preferredNotification === "messenger" && missionary.messengerAccount) {
        await notifyMissionary(meal.missionaryId, notificationMessage);
      }
      res.status(201).json(meal);
    } catch (err) {
      console.error("Meal booking error:", err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: err.errors
        });
      }
      res.status(500).json({ message: "Failed to create meal" });
    }
  });
  app.patch("/api/meals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const mealId = parseInt(id, 10);
      if (isNaN(mealId)) {
        return res.status(400).json({ message: "Invalid meal ID" });
      }
      const existingMeal = await storage.getMeal(mealId);
      if (!existingMeal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      const updateData = updateMealSchema.parse({ id: mealId, ...req.body });
      const updatedMeal = await storage.updateMeal(updateData);
      if (updatedMeal) {
        const missionary = await storage.getMissionary(updatedMeal.missionaryId);
        if (updateData.cancelled) {
          const mealDate = new Date(updatedMeal.date);
          const formattedDate = mealDate.toLocaleDateString(void 0, {
            weekday: "long",
            month: "long",
            day: "numeric"
          });
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` + (updateData.cancellationReason ? `Reason: ${updateData.cancellationReason}` : "")
          );
          await notifyAdmin(
            `Meal cancelled: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName} for missionary ${missionary ? missionary.name : `ID ${updatedMeal.missionaryId}`}. ` + (updateData.cancellationReason ? `Reason: ${updateData.cancellationReason}` : "")
          );
        } else {
          const mealDate = new Date(updatedMeal.date);
          const formattedDate = mealDate.toLocaleDateString(void 0, {
            weekday: "long",
            month: "long",
            day: "numeric"
          });
          await notifyMissionary(
            updatedMeal.missionaryId,
            `Meal updated: ${formattedDate} at ${updatedMeal.startTime} with ${updatedMeal.hostName}. ` + (updatedMeal.mealDescription ? `Menu: ${updatedMeal.mealDescription}` : "") + (updatedMeal.specialNotes ? ` Notes: ${updatedMeal.specialNotes}` : "")
          );
        }
        if (missionary && missionary.preferredNotification === "text" && missionary.phoneNumber && missionary.consentStatus !== "granted") {
          const shouldResendVerification = !missionary.consentVerificationSentAt || (/* @__PURE__ */ new Date()).getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1e3;
          if (shouldResendVerification) {
            const verificationCode = generateVerificationCode();
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: /* @__PURE__ */ new Date()
            });
            const consentMessage = `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. Reply STOP at any time to opt out of messages. Msg & data rates may apply.`;
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        }
        res.json(updatedMeal);
      } else {
        res.status(404).json({ message: "Meal not found" });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.post("/api/meals/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const mealId = parseInt(id, 10);
      if (isNaN(mealId)) {
        return res.status(400).json({ message: "Invalid meal ID" });
      }
      const { reason } = req.body;
      const cancelledMeal = await storage.cancelMeal(mealId, reason);
      if (cancelledMeal) {
        const missionary = await storage.getMissionary(cancelledMeal.missionaryId);
        const mealDate = new Date(cancelledMeal.date);
        const formattedDate = mealDate.toLocaleDateString(void 0, {
          weekday: "long",
          month: "long",
          day: "numeric"
        });
        await notifyMissionary(
          cancelledMeal.missionaryId,
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName}. ` + (reason ? `Reason: ${reason}` : "")
        );
        await notifyAdmin(
          `Meal cancelled: ${formattedDate} at ${cancelledMeal.startTime} with ${cancelledMeal.hostName} for missionary ${missionary ? missionary.name : `ID ${cancelledMeal.missionaryId}`}. ` + (reason ? `Reason: ${reason}` : "")
        );
        if (missionary && missionary.preferredNotification === "text" && missionary.phoneNumber && missionary.consentStatus !== "granted") {
          const shouldResendVerification = !missionary.consentVerificationSentAt || (/* @__PURE__ */ new Date()).getTime() - new Date(missionary.consentVerificationSentAt).getTime() > 24 * 60 * 60 * 1e3;
          if (shouldResendVerification) {
            const verificationCode = generateVerificationCode();
            await storage.updateMissionary(missionary.id, {
              consentVerificationToken: verificationCode,
              consentVerificationSentAt: /* @__PURE__ */ new Date(),
              consentStatus: "pending"
            });
            const consentMessage = `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode}. Reply STOP at any time to opt out of messages. Msg & data rates may apply.`;
            if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
              await notificationManager.smsService.twilioClient.messages.create({
                body: consentMessage,
                from: notificationManager.smsService.twilioPhoneNumber,
                to: missionary.phoneNumber
              });
              console.log(`Consent verification sent to missionary ${missionary.id} (${missionary.name})`);
            } else {
              console.log(`[SMS CONSENT REQUEST] Would send to ${missionary.phoneNumber}: ${consentMessage}`);
            }
          }
        }
        res.json(cancelledMeal);
      } else {
        res.status(404).json({ message: "Meal not found" });
      }
    } catch (err) {
      console.error("Error cancelling meal:", err);
      res.status(500).json({ message: "Failed to cancel meal" });
    }
  });
  app.post("/api/admin/missionaries", requireAdmin, async (req, res) => {
    try {
      const missionaryData = InsertMissionarySchema.parse({
        // Corrected schema name
        ...req.body,
        emailVerified: true,
        // Automatically verify email for admin-created missionaries
        consentStatus: "granted"
        // Automatically grant consent
      });
      const missionary = await storage.createMissionary(missionaryData);
      res.status(201).json(missionary);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.patch("/api/admin/missionaries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      const existingMissionary = await storage.getMissionary(missionaryId);
      if (!existingMissionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      if (req.body.emailAddress && req.body.emailAddress !== existingMissionary.emailAddress) {
        req.body.emailVerified = false;
        req.body.emailVerificationCode = null;
        req.body.emailVerificationSentAt = null;
      }
      const updatedMissionary = await storage.updateMissionary(missionaryId, req.body);
      if (updatedMissionary) {
        res.json(updatedMissionary);
      } else {
        res.status(404).json({ message: "Missionary not found" });
      }
    } catch (err) {
      console.error("Error updating missionary:", err);
      res.status(500).json({ message: "Failed to update missionary" });
    }
  });
  app.delete("/api/missionaries/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      const meals2 = await storage.getMealsByMissionary(missionaryId);
      for (const meal of meals2) {
        await storage.cancelMeal(meal.id, "Missionary deleted");
      }
      await storage.deleteMissionary(missionaryId);
      res.json({ message: "Missionary deleted successfully" });
    } catch (err) {
      console.error("Error deleting missionary:", err);
      res.status(500).json({ message: "Failed to delete missionary" });
    }
  });
  app.post("/api/admin/missionaries/:id/send-verification", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      if (!missionary.emailAddress) {
        return res.status(400).json({ message: "No email address on file" });
      }
      if (!missionary.emailAddress.endsWith("@missionary.org")) {
        return res.status(400).json({ message: "Email must end with @missionary.org" });
      }
      const success = await emailVerificationService.sendVerificationCode(
        missionary.emailAddress,
        missionaryId
      );
      if (success) {
        res.json({ message: "Verification code sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send verification code" });
      }
    } catch (err) {
      console.error("Error sending verification code:", err);
      res.status(400).json({ message: err.message || "Failed to send verification code" });
    }
  });
  app.post("/api/admin/missionaries/:id/verify-email", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { code } = req.body;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      if (!code || code.length !== 4) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      const success = await emailVerificationService.verifyCode(missionaryId, code);
      if (success) {
        res.json({ message: "Email verified successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired verification code" });
      }
    } catch (err) {
      console.error("Error verifying email:", err);
      res.status(400).json({ message: "Verification failed" });
    }
  });
  app.post("/api/missionary-portal/authenticate", async (req, res) => {
    try {
      const { accessCode, emailAddress, password } = req.body;
      if (!accessCode || !emailAddress || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Invalid access code" });
      }
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
        return res.status(401).json({ authenticated: false });
      }
      if (!missionary.password) {
        return res.status(401).json({ authenticated: false, message: "Password not set. Please register first." });
      }
      const isValidPassword = await comparePasswords(password, missionary.password);
      if (!isValidPassword) {
        return res.status(401).json({ authenticated: false });
      }
      res.json({ authenticated: true, missionary: { id: missionary.id, name: missionary.name } });
    } catch (error) {
      console.error("Missionary portal authentication error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });
  app.post("/api/missionaries/register", async (req, res) => {
    try {
      const { name, type, emailAddress, congregationAccessCode, password } = req.body;
      if (!name || !type || !emailAddress || !congregationAccessCode || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!emailAddress.endsWith("@missionary.org")) {
        return res.status(400).json({ message: "Email must be a @missionary.org address" });
      }
      const congregation = await storage.getCongregationByAccessCode(congregationAccessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Invalid congregation access code" });
      }
      const existingMissionary = await storage.getMissionaryByEmail(emailAddress);
      if (existingMissionary) {
        if (!existingMissionary.password) {
          const hashedPassword = await hashPassword(password);
          const updatedMissionary = await storage.updateMissionary(existingMissionary.id, {
            password: hashedPassword
          });
          const success = await emailVerificationService.sendVerificationCode(
            emailAddress,
            existingMissionary.id
          );
          if (success) {
            res.json({
              message: "Registration successful. Verification email sent.",
              missionaryId: existingMissionary.id
            });
          } else {
            res.status(500).json({ message: "Failed to send verification email" });
          }
        } else {
          return res.status(409).json({ message: "Missionary already registered with this email" });
        }
      } else {
        const hashedPassword = await hashPassword(password);
        const missionary = await storage.createMissionary({
          name,
          type,
          emailAddress,
          congregationId: congregation.id,
          phoneNumber: "",
          // Will be updated later
          password: hashedPassword,
          active: true,
          preferredNotification: "email"
        });
        const success = await emailVerificationService.sendVerificationCode(
          emailAddress,
          missionary.id
        );
        if (success) {
          res.json({
            message: "Registration successful. Verification email sent.",
            missionaryId: missionary.id
          });
        } else {
          res.status(500).json({ message: "Failed to send verification email" });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app.post("/api/missionaries/verify", async (req, res) => {
    try {
      const { missionaryId, verificationCode } = req.body;
      if (!missionaryId || !verificationCode) {
        return res.status(400).json({ message: "Missionary ID and verification code are required" });
      }
      const success = await emailVerificationService.verifyCode(missionaryId, verificationCode);
      if (success) {
        res.json({ message: "Email verified successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired verification code" });
      }
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });
  app.post("/api/congregations/:congregationId/leave", requireAuth, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const userId = req.user.id;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const success = await storage.removeUserFromCongregation(userId, parsedCongregationId);
      if (success) {
        res.json({ message: "Successfully left the congregation" });
      } else {
        res.status(404).json({ message: "Congregation not found or user not a member" });
      }
    } catch (error) {
      console.error("Error leaving congregation:", error);
      res.status(500).json({ message: "Failed to leave congregation" });
    }
  });
  app.post("/api/congregations/:accessCode/rejoin", requireAuth, async (req, res) => {
    try {
      const { accessCode } = req.params;
      const userId = req.user.id;
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Invalid access code" });
      }
      const userCongregations2 = await storage.getUserCongregations(userId);
      const isAlreadyMember = userCongregations2.some((uc) => uc.id === congregation.id);
      if (isAlreadyMember) {
        return res.status(400).json({ message: "Already a member of this congregation" });
      }
      await storage.addUserToCongregation({ userId, congregationId: congregation.id });
      res.json({ message: "Successfully rejoined the congregation", congregation });
    } catch (error) {
      console.error("Error rejoining congregation:", error);
      res.status(500).json({ message: "Failed to rejoin congregation" });
    }
  });
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const congregationId = req.query.congregationId ? parseInt(req.query.congregationId, 10) : void 0;
      if (congregationId) {
        const userCongregations2 = await storage.getUserCongregations(req.user.id);
        const userCongregationIds = userCongregations2.map((congregation) => congregation.id);
        if (req.user.role !== "ultra") {
          const hasAccess = userCongregationIds.includes(congregationId);
          if (!hasAccess) {
            return res.status(403).json({ message: "You do not have access to this congregation" });
          }
        }
      }
      const meals2 = await storage.getMealsByDateRange(startOfMonth, endOfMonth, congregationId);
      const missionaries2 = congregationId ? await storage.getMissionariesByCongregation(congregationId) : await storage.getAllMissionaries();
      const stats = {
        totalMissionaries: missionaries2.length,
        activeMissionaries: missionaries2.filter((m) => m.active).length,
        totalMealsThisMonth: meals2.length,
        eldersBookings: meals2.filter((meal) => {
          const missionary = missionaries2.find((m) => m.id === meal.missionaryId);
          return missionary && missionary.type === "elders";
        }).length,
        sistersBookings: meals2.filter((meal) => {
          const missionary = missionaries2.find((m) => m.id === meal.missionaryId);
          return missionary && missionary.type === "sisters";
        }).length,
        cancelledMeals: meals2.filter((m) => m.cancelled).length
      };
      res.json(stats);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });
  app.get("/api/admin/congregations", requireAdmin, async (req, res) => {
    try {
      let congregations2;
      const showUnassignedOnly = req.query.unassignedOnly === "true";
      const searchTerm = req.query.searchTerm;
      if (req.user.role === "ultra") {
        congregations2 = await storage.getAllCongregations(showUnassignedOnly, searchTerm);
      } else {
        congregations2 = await storage.getUserCongregations(req.user.id, showUnassignedOnly, searchTerm);
      }
      res.json(congregations2);
    } catch (err) {
      console.error("Error fetching congregations:", err);
      res.status(500).json({ message: "Failed to fetch congregations" });
    }
  });
  app.post("/api/admin/congregations", requireSuperAdmin, async (req, res) => {
    try {
      const congregationData = insertCongregationSchema.parse(req.body);
      const congregation = await storage.createCongregation(congregationData);
      res.status(201).json(congregation);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.patch("/api/admin/congregations/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const congregationId = parseInt(id, 10);
      if (isNaN(congregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const existingCongregation = await storage.getCongregation(congregationId);
      if (!existingCongregation) {
        return res.status(404).json({ message: "Congregation not found" });
      }
      const updatedData = insertCongregationSchema.partial().parse(req.body);
      const updatedCongregation = await storage.updateCongregation(congregationId, updatedData);
      if (updatedCongregation) {
        res.json(updatedCongregation);
      } else {
        res.status(404).json({ message: "Congregation not found" });
      }
    } catch (err) {
      console.error("Error updating congregation:", err);
      handleZodError(err, res);
    }
  });
  app.post("/api/admin/congregations/:congregationId/users", requireAdmin, async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      if (req.user.role !== "ultra") {
        const userCongregations3 = await storage.getUserCongregations(req.user.id);
        const userCongregationIds = userCongregations3.map((congregation) => congregation.id);
        if (!userCongregationIds.includes(parsedCongregationId)) {
          return res.status(403).json({ message: "You do not have access to this congregation" });
        }
      }
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Valid username is required" });
      }
      const userToAdd = await storage.getUserByUsername(username);
      if (!userToAdd) {
        return res.status(404).json({ message: `User '${username}' not found. Please ensure the user exists.` });
      }
      const userCongregations2 = await storage.getUserCongregations(userToAdd.id);
      const isAlreadyMember = userCongregations2.some((uc) => uc.id === parsedCongregationId);
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already an admin of this congregation." });
      }
      const userCongregation = await storage.addUserToCongregation({
        userId: userToAdd.id,
        congregationId: parsedCongregationId
      });
      res.status(201).json({
        userId: userToAdd.id,
        congregationId: parsedCongregationId,
        username: userToAdd.username,
        role: userToAdd.role
        // Return role for display if needed
      });
    } catch (err) {
      console.error("Error adding user to congregation:", err);
      res.status(500).json({ message: "Failed to add user to congregation" });
    }
  });
  app.delete("/api/admin/congregations/:congregationId/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { congregationId, userId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      const parsedUserId = parseInt(userId, 10);
      if (isNaN(parsedCongregationId) || isNaN(parsedUserId)) {
        return res.status(400).json({ message: "Invalid congregation ID or user ID" });
      }
      if (req.user.role !== "ultra") {
        const userCongregations2 = await storage.getUserCongregations(req.user.id);
        const userCongregationIds = userCongregations2.map((congregation) => congregation.id);
        if (!userCongregationIds.includes(parsedCongregationId)) {
          return res.status(403).json({ message: "You do not have access to this congregation" });
        }
      }
      const congregationUsers = await storage.getUsersInCongregation(parsedCongregationId);
      if (congregationUsers.length === 1 && congregationUsers[0].id === parsedUserId) {
        if (req.user.role !== "ultra" && req.user.id !== parsedUserId) {
          return res.status(400).json({ message: "Cannot remove the last admin from this congregation. Assign another admin first." });
        }
      }
      const success = await storage.removeUserFromCongregation(parsedUserId, parsedCongregationId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "User-congregation relationship not found" });
      }
    } catch (err) {
      console.error("Error removing user from congregation:", err);
      res.status(500).json({ message: "Failed to remove user from congregation" });
    }
  });
  app.get("/api/congregations/:accessCode", async (req, res) => {
    try {
      const { accessCode } = req.params;
      if (!accessCode || accessCode.length < 10) {
        return res.status(400).json({ message: "Invalid access code" });
      }
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Congregation not found" });
      }
      if (!congregation.active) {
        return res.status(403).json({ message: "This congregation is no longer active" });
      }
      res.json({
        id: congregation.id,
        name: congregation.name,
        accessCode: congregation.accessCode
      });
    } catch (err) {
      console.error("Error accessing congregation by code:", err);
      res.status(500).json({ message: "Failed to access congregation" });
    }
  });
  app.get("/api/congregations/:congregationId/missionaries", async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const congregation = await storage.getCongregation(parsedCongregationId);
      if (!congregation) {
        return res.status(404).json({ message: "Congregation not found" });
      }
      if (!congregation.active) {
        return res.status(403).json({ message: "This congregation is no longer active" });
      }
      const missionaries2 = await storage.getMissionariesByCongregation(parsedCongregationId);
      res.json(missionaries2);
    } catch (err) {
      console.error("Error fetching missionaries for congregation:", err);
      res.status(500).json({ message: "Failed to fetch missionaries" });
    }
  });
  app.get("/api/congregations/:congregationId/missionaries/:type", async (req, res) => {
    try {
      const { congregationId, type } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      if (type !== "elders" && type !== "sisters") {
        return res.status(400).json({ message: 'Type must be either "elders" or "sisters"' });
      }
      const missionaries2 = await storage.getMissionariesByType(type, parsedCongregationId);
      res.json(missionaries2);
    } catch (err) {
      console.error("Error fetching missionaries by congregation and type:", err);
      res.status(500).json({ message: "Failed to fetch missionaries" });
    }
  });
  app.get("/api/congregations/:congregationId/meals", async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const meals2 = await storage.getMealsByDateRange(startDate, endDate, parsedCongregationId);
      const missionaries2 = await storage.getMissionariesByCongregation(parsedCongregationId);
      const missionaryMap = new Map(missionaries2.map((m) => [m.id, m]));
      const mealsWithMissionaries = meals2.map((meal) => ({
        ...meal,
        missionary: missionaryMap.get(meal.missionaryId)
      }));
      res.json(mealsWithMissionaries);
    } catch (err) {
      console.error("Error fetching meals by congregation:", err);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });
  app.post("/api/congregations/:congregationId/meals/check-availability", async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const data = checkMealAvailabilitySchema.parse({
        ...req.body,
        congregationId: parsedCongregationId
      });
      const date = new Date(data.date);
      const isAvailable = await storage.checkMealAvailability(date, data.missionaryType, parsedCongregationId);
      res.json({ available: isAvailable });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  app.get("/api/message-stats", requireAdmin, async (req, res) => {
    try {
      const congregationId = req.query.congregationId ? parseInt(req.query.congregationId) : void 0;
      let stats;
      if (congregationId) {
        if (req.user.role !== "ultra") {
          const userCongregations2 = await storage.getUserCongregations(req.user.id);
          const hasAccess = userCongregations2.some((congregation) => congregation.id === congregationId);
          if (!hasAccess) {
            return res.status(403).json({ message: "You do not have access to this congregation" });
          }
        }
        stats = await notificationManager.getWardMessageStats(congregationId);
      } else {
        if (req.user.role !== "ultra") {
          return res.status(403).json({ message: "Access to all stats requires super admin privileges" });
        }
        stats = await notificationManager.getMessageStats();
      }
      res.json(stats);
    } catch (err) {
      console.error("Error fetching message statistics:", err);
      res.status(500).json({ message: "Failed to fetch message statistics" });
    }
  });
  app.post("/api/admin/test-message", requireAdmin, async (req, res) => {
    try {
      const {
        contactInfo,
        notificationMethod,
        messageType,
        customMessage,
        mealDetails,
        schedulingOption,
        scheduledDate,
        scheduledTime,
        congregationId
      } = req.body;
      if (!contactInfo) {
        return res.status(400).json({ message: "Contact information is required" });
      }
      if (!notificationMethod || !["email", "whatsapp"].includes(notificationMethod)) {
        return res.status(400).json({ message: "Valid notification method (email or whatsapp) is required" });
      }
      if (messageType === "custom" && !customMessage) {
        return res.status(400).json({ message: "Message text is required for custom messages" });
      }
      if (schedulingOption === "scheduled" && (!scheduledDate || !scheduledTime)) {
        return res.status(400).json({ message: "Date and time are required for scheduled messages" });
      }
      const congregation = await storage.getCongregation(congregationId);
      if (!congregation) {
        return res.status(404).json({ message: "Congregation not found" });
      }
      if (req.user.role !== "ultra") {
        const userCongregations2 = await storage.getUserCongregations(req.user.id);
        const hasAccess = userCongregations2.some((c) => c.id === congregationId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied for this congregation" });
        }
      }
      console.log(`Test message: using contact info ${contactInfo}`);
      let testMissionary = await storage.getMissionaryByName(congregationId, "Test Missionary");
      if (!testMissionary) {
        try {
          const insertTestMissionary = {
            name: "Test Missionary",
            type: "elders",
            phoneNumber: notificationMethod === "whatsapp" ? contactInfo : "+15551234567",
            emailAddress: notificationMethod === "email" ? contactInfo : "test@missionary.org",
            whatsappNumber: notificationMethod === "whatsapp" ? contactInfo : null,
            preferredNotification: notificationMethod,
            active: true,
            notificationScheduleType: "before_meal",
            hoursBefore: 3,
            dayOfTime: "08:00",
            weeklySummaryDay: "monday",
            weeklySummaryTime: "08:00",
            congregationId,
            consentStatus: "granted",
            consentDate: /* @__PURE__ */ new Date(),
            consentVerificationToken: null,
            consentVerificationSentAt: null,
            dietaryRestrictions: "",
            messengerAccount: "",
            emailVerified: notificationMethod === "email"
          };
          testMissionary = await storage.createMissionary(insertTestMissionary);
          console.log(`Created new test missionary with ID: ${testMissionary.id}`);
        } catch (error) {
          console.error("Failed to create test missionary:", error);
          return res.status(500).json({ message: "Failed to create test missionary" });
        }
      } else {
        console.log(`Using existing test missionary with ID: ${testMissionary.id}`);
      }
      const mockMissionary = testMissionary;
      const mockMeal = mealDetails ? {
        id: 999999,
        // Use a very unlikely ID to avoid collisions
        date: mealDetails.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        startTime: mealDetails.startTime || "17:30",
        hostName: mealDetails.hostName || "Test Host",
        hostPhone: notificationMethod === "whatsapp" ? contactInfo : "+15551234567",
        hostEmail: "test@example.com",
        mealDescription: mealDetails.mealDescription || "Test meal",
        specialNotes: "",
        missionaryId: testMissionary.id,
        // Use the actual missionary ID for proper logging
        missionary: { type: "elders", name: "Test Missionary" },
        status: "confirmed",
        congregationId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      } : null;
      let result = false;
      console.log(`Test message will be sent via ${notificationMethod} to ${contactInfo}`);
      if (schedulingOption === "scheduled") {
        console.log(`Test message scheduled for ${scheduledDate} at ${scheduledTime}`);
        result = true;
      } else {
        switch (messageType) {
          case "meal_reminder":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for meal reminders" });
            }
            result = await notificationManager.sendMealReminder(mockMissionary, mockMeal);
            break;
          case "day_of":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for day-of reminders" });
            }
            result = await notificationManager.sendDayOfReminder(mockMissionary, [mockMeal]);
            break;
          case "weekly_summary":
            if (!mockMeal) {
              return res.status(400).json({ message: "Meal details are required for weekly summaries" });
            }
            result = await notificationManager.sendWeeklySummary(mockMissionary, [mockMeal]);
            break;
          case "custom":
            if (!customMessage) {
              if (mockMeal) {
                result = await notificationManager.sendMealReminder(mockMissionary, mockMeal);
              } else {
                return res.status(400).json({ message: "Message text is required for custom messages" });
              }
            } else {
              try {
                const customMeal = {
                  ...mockMeal,
                  mealDescription: customMessage,
                  specialNotes: ""
                };
                result = await notificationManager.sendMealReminder(mockMissionary, customMeal);
              } catch (error) {
                console.error("Error sending custom test message:", error);
                result = false;
              }
            }
            break;
          default:
            return res.status(400).json({ message: "Invalid message type" });
        }
      }
      if (result) {
        res.status(200).json({ success: true, message: "Test message sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test message" });
      }
    } catch (error) {
      console.error("Test message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  function generateVerificationCode() {
    return Math.floor(1e5 + Math.random() * 9e5).toString();
  }
  app.post("/api/missionaries/:id/request-consent", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      const verificationCode = generateVerificationCode();
      await storage.updateMissionary(missionary.id, {
        consentVerificationToken: verificationCode,
        consentVerificationSentAt: /* @__PURE__ */ new Date(),
        consentStatus: "pending"
      });
      const testMissionary = missionary;
      const consentMessage = `This is the Ward Missionary Meal Scheduler. To receive meal notifications, reply with YES ${verificationCode} (example: YES ${verificationCode}). Reply STOP at any time to opt out of messages. Msg & data rates may apply.`;
      let success = false;
      try {
        if (testMissionary.preferredNotification === "messenger" && testMissionary.messengerAccount) {
          console.log(`[MESSENGER CONSENT REQUEST] Sending to ${testMissionary.messengerAccount}: ${consentMessage}`);
        } else {
          if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
            await notificationManager.smsService.twilioClient.messages.create({
              body: consentMessage,
              from: notificationManager.smsService.twilioPhoneNumber,
              to: testMissionary.phoneNumber
            });
            success = true;
          } else {
            console.log(`[SMS CONSENT REQUEST] Sending to ${testMissionary.phoneNumber}: ${consentMessage}`);
            success = true;
          }
        }
      } catch (error) {
        console.error("Failed to send consent request:", error);
        success = false;
      }
      if (success) {
        res.status(200).json({ message: "Consent request sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send consent request" });
      }
    } catch (err) {
      console.error("Error requesting consent:", err);
      res.status(500).json({ message: "Failed to request consent" });
    }
  });
  app.post("/api/sms/webhook", async (req, res) => {
    try {
      const { Body: messageBody, From: fromNumber } = req.body;
      if (!messageBody || !fromNumber) {
        return res.status(200).send("<Response></Response>");
      }
      const phoneNumber = fromNumber.replace(/\s+/g, "");
      console.log(`Received SMS from: ${phoneNumber}, body: ${messageBody}`);
      const missionaries2 = await storage.getAllMissionaries();
      console.log(`Found ${missionaries2.length} missionaries in the database`);
      missionaries2.forEach((m) => {
        console.log(`Missionary ${m.id} (${m.name}): phone=${m.phoneNumber}`);
      });
      let missionary = missionaries2.find((m) => m.phoneNumber === phoneNumber);
      if (!missionary) {
        console.log("Missionary not found with exact phone number match, trying alternative formats...");
        const numberWithoutPlus = phoneNumber.startsWith("+") ? phoneNumber.substring(1) : phoneNumber;
        missionary = missionaries2.find(
          (m) => m.phoneNumber === numberWithoutPlus || m.phoneNumber.startsWith("+") && m.phoneNumber.substring(1) === numberWithoutPlus
        );
        if (missionary) {
          console.log(`Found missionary ${missionary.id} using alternative phone format matching`);
        }
      }
      if (!missionary) {
        return res.status(200).send("<Response></Response>");
      }
      const message = messageBody.trim().toLowerCase();
      console.log(`Processing message: "${message}"`);
      console.log(`Missionary ${missionary.id} verification token: ${missionary.consentVerificationToken}`);
      if (message.startsWith("yes ") || message.startsWith("YES ")) {
        console.log("Detected potential consent response");
        const parts = messageBody.trim().split(" ");
        if (parts.length >= 2) {
          const code = parts[1];
          console.log(`Verification code received: ${code}`);
          if (code === missionary.consentVerificationToken) {
            console.log("Verification code matches! Granting consent.");
            await storage.updateMissionary(missionary.id, {
              consentStatus: "granted",
              consentDate: /* @__PURE__ */ new Date()
            });
            const confirmMessage = "Thank you! You have successfully opted in to receive meal notifications. Reply STOP at any time to opt out.";
            const testMissionary = missionary;
            try {
              if (testMissionary.preferredNotification === "messenger" && testMissionary.messengerAccount) {
                console.log(`[MESSENGER CONFIRMATION] Sending to ${testMissionary.messengerAccount}: ${confirmMessage}`);
              } else {
                if (notificationManager.smsService && notificationManager.smsService.twilioClient) {
                  await notificationManager.smsService.twilioClient.messages.create({
                    body: confirmMessage,
                    from: notificationManager.smsService.twilioPhoneNumber,
                    to: testMissionary.phoneNumber
                  });
                } else {
                  console.log(`[SMS CONFIRMATION] Sending to ${testMissionary.phoneNumber}: ${confirmMessage}`);
                }
              }
            } catch (error) {
              console.error("Failed to send confirmation message:", error);
            }
            return res.status(200).send("<Response></Response>");
          }
        }
      } else if (message === "stop" || message === "unsubscribe" || message === "cancel") {
        await storage.updateMissionary(missionary.id, {
          consentStatus: "denied",
          consentDate: /* @__PURE__ */ new Date()
        });
        return res.status(200).send("<Response></Response>");
      }
      return res.status(200).send("<Response></Response>");
    } catch (err) {
      console.error("Error handling SMS webhook:", err);
      return res.status(200).send("<Response></Response>");
    }
  });
  app.get("/api/missionaries/:id/consent-status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const missionaryId = parseInt(id, 10);
      if (isNaN(missionaryId)) {
        return res.status(400).json({ message: "Invalid missionary ID" });
      }
      const missionary = await storage.getMissionary(missionaryId);
      if (!missionary) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      res.json({
        missionaryId: missionary.id,
        name: missionary.name,
        consentStatus: missionary.consentStatus,
        consentDate: missionary.consentDate,
        consentVerificationSentAt: missionary.consentVerificationSentAt
      });
    } catch (err) {
      console.error("Error fetching consent status:", err);
      res.status(500).json({ message: "Failed to fetch consent status" });
    }
  });
  app.get("/api/meal-stats/:congregationId", async (req, res) => {
    try {
      const { congregationId } = req.params;
      const parsedCongregationId = parseInt(congregationId, 10);
      if (isNaN(parsedCongregationId)) {
        return res.status(400).json({ message: "Invalid congregation ID" });
      }
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const meals2 = await storage.getMealsByDateRange(startDate, endDate, parsedCongregationId);
      const activeMeals = meals2.filter((meal) => !meal.cancelled);
      const missionaries2 = await storage.getMissionariesByCongregation(parsedCongregationId);
      const missionaryMap = new Map(missionaries2.map((m) => [m.id, m]));
      const totalMeals = activeMeals.length;
      const timeRangeInWeeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1e3)));
      const timeRangeInMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1e3)));
      const averageMealsPerWeek = totalMeals / timeRangeInWeeks;
      const averageMealsPerMonth = totalMeals / timeRangeInMonths;
      const missionaryMealCounts = /* @__PURE__ */ new Map();
      activeMeals.forEach((meal) => {
        const current = missionaryMealCounts.get(meal.missionaryId) || { count: 0, lastMeal: null };
        current.count++;
        const mealDate = new Date(meal.date);
        if (!current.lastMeal || mealDate > current.lastMeal) {
          current.lastMeal = mealDate;
        }
        missionaryMealCounts.set(meal.missionaryId, current);
      });
      const missionaryStats = missionaries2.map((missionary) => ({
        id: missionary.id,
        name: missionary.name,
        type: missionary.type,
        mealCount: missionaryMealCounts.get(missionary.id)?.count || 0,
        lastMeal: missionaryMealCounts.get(missionary.id)?.lastMeal?.toISOString() || null
      })).sort((a, b) => b.mealCount - a.mealCount);
      const monthlyBreakdown = /* @__PURE__ */ new Map();
      activeMeals.forEach((meal) => {
        const mealDate = new Date(meal.date);
        const monthKey = mealDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        monthlyBreakdown.set(monthKey, (monthlyBreakdown.get(monthKey) || 0) + 1);
      });
      const monthlyBreakdownArray = Array.from(monthlyBreakdown.entries()).map(([month, mealCount]) => ({
        month,
        mealCount
      })).sort((a, b) => (/* @__PURE__ */ new Date(a.month + " 1")).getTime() - (/* @__PURE__ */ new Date(b.month + " 1")).getTime());
      const stats = {
        totalMeals,
        averageMealsPerWeek: Math.round(averageMealsPerWeek * 10) / 10,
        averageMealsPerMonth: Math.round(averageMealsPerMonth * 10) / 10,
        missionaryStats,
        monthlyBreakdown: monthlyBreakdownArray
      };
      res.json(stats);
    } catch (err) {
      console.error("Error fetching meal statistics:", err);
      res.status(500).json({ message: "Failed to fetch meal statistics" });
    }
  });
  app.post("/api/missionary-forgot-password", async (req, res) => {
    try {
      const { emailAddress, accessCode } = req.body;
      if (!emailAddress || !accessCode) {
        return res.status(400).json({ message: "Email address and access code are required" });
      }
      if (!emailAddress.endsWith("@missionary.org")) {
        return res.status(400).json({ message: "Please use your @missionary.org email address" });
      }
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Invalid congregation access code" });
      }
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
        return res.status(404).json({ message: "Missionary not found in this congregation" });
      }
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const hashedTempPassword = await hashPassword2(tempPassword);
      await storage.updateMissionary(missionary.id, {
        password: hashedTempPassword
      });
      const emailService = new (await Promise.resolve().then(() => (init_email_service(), email_service_exports))).EmailService();
      const emailSent = await emailService.sendCustomMessage(
        missionary,
        `Your password has been reset. Your new temporary password is: ${tempPassword}

Please log in to the missionary portal and change your password immediately for security.`,
        "password_reset"
      );
      if (emailSent) {
        res.json({ message: "Password reset email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send password reset email" });
      }
    } catch (err) {
      console.error("Error processing password reset:", err);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });
  app.post("/api/missionary-change-password", async (req, res) => {
    try {
      const { accessCode, emailAddress, currentPassword, newPassword } = req.body;
      if (!accessCode || !emailAddress || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      const congregation = await storage.getCongregationByAccessCode(accessCode);
      if (!congregation) {
        return res.status(404).json({ message: "Invalid access code" });
      }
      const missionary = await storage.getMissionaryByEmail(emailAddress);
      if (!missionary || missionary.congregationId !== congregation.id) {
        return res.status(404).json({ message: "Missionary not found" });
      }
      if (!missionary.password) {
        return res.status(401).json({ message: "No password set. Please contact administrator." });
      }
      const { comparePasswords: comparePasswords2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const isValidPassword = await comparePasswords2(currentPassword, missionary.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const hashedNewPassword = await hashPassword2(newPassword);
      await storage.updateMissionary(missionary.id, {
        password: hashedNewPassword
      });
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Error changing password:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/index.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
dotenv.config();
async function startServer() {
  const app = express();
  const port = process.env.PORT || 5e3;
  app.use(express.json());
  app.set("trust proxy", 1);
  const httpServer = await registerRoutes(app);
  if (process.env.NODE_ENV === "production") {
    const clientBuildPath = path.join(__dirname, "public");
    app.use(express.static(clientBuildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  }
  httpServer.listen(port, () => {
    console.log(`5:${(/* @__PURE__ */ new Date()).getMinutes()}:${(/* @__PURE__ */ new Date()).getSeconds()} [express] serving on port ${port}`);
  });
}
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
