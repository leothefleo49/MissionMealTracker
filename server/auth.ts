// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util"; // Corrected this line
import { storage } from "./storage";
import { User, userRoleEnum, InsertUser } from "@shared/schema";
import { pool } from "./db"; // Import the pg pool from your db setup

const PgStore = connectPgSimple(session);

const scryptAsync = promisify(scrypt);

// This flag will determine if the application is in "setup" mode.
export let isSetupMode = false;

// Function to update the setup mode status
export function setSetupMode(status: boolean) {
  isSetupMode = status;
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: (typeof userRoleEnum.enumValues)[number];
      regionId?: number | null;
      missionId?: number | null;
      stakeId?: number | null;
    }
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (e) {
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionStore = new PgStore({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60,
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'missionary-meal-calendar-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('local-regular', new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !user.password || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.use('ward-login', new LocalStrategy({ usernameField: 'wardAccessCode', passwordField: 'password' },
    async (wardAccessCode, password, done) => {
      try {
        const congregation = await storage.getCongregationByAccessCode(wardAccessCode);
        if (!congregation) {
          return done(null, false, { message: "Invalid congregation access code" });
        }

        // This is a placeholder for a real password check for ward-level users
        if (password !== "password") {
            return done(null, false, { message: "Invalid password" });
        }

        let wardAdmin = await storage.getUserByUsername(`ward_admin_${congregation.id}`);
        if (!wardAdmin) {
          wardAdmin = await storage.createUser({
            username: `ward_admin_${congregation.id}`,
            password: await hashPassword("password"),
            role: 'ward',
          });
          await storage.addUserToCongregation({ userId: wardAdmin.id, congregationId: congregation.id });
        }

        return done(null, wardAdmin);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // If in setup mode, don't allow login
    if (isSetupMode) {
        return res.status(403).json({ message: "Application is in setup mode. Please create an admin account first." });
    }
    passport.authenticate("local-regular", (err: Error, user: User) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  app.post("/api/ward-login", (req, res, next) => {
    passport.authenticate("ward-login", (err: Error, user: User) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: "Invalid credentials" });

        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            return res.status(200).json({
                id: user.id,
                username: user.username,
                role: user.role,
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
        role: req.user.role,
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.use("/api/admin/*", (req, res, next) => {
    if (req.isAuthenticated() && ['ultra', 'region', 'mission', 'stake'].includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Admin access required" });
  });
}

/**
 * Checks if an ultra admin exists. If not, sets the application to setup mode.
 * This should be called once on server startup.
 */
export async function checkAndSetSetupMode() {
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