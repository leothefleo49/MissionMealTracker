import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User, type InsertUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// Define user roles from the schema
type UserRole = "ultra_admin" | "region_admin" | "mission_admin" | "stake_admin" | "ward_admin";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: UserRole;
      regionId?: number | null;
      missionId?: number | null;
      stakeId?: number | null;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false; // Invalid stored password format
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

  if (hashedBuf.length !== suppliedBuf.length) {
    return false;
  }

  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'missionary-meal-calendar-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Strategy for tiered admins (Ultra, Region, Stake, Ward)
  passport.use('admin-login', new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user || !user.password) {
          return done(null, false, { message: "Invalid username or password." });
        }

        // This strategy is for the main /admin login. Mission Admins have a separate portal.
        if (user.role === 'mission_admin') {
           return done(null, false, { message: "Mission Admins should use the missionary portal login." });
        }

        const passwordsMatch = await comparePasswords(password, user.password);
        if (!passwordsMatch) {
          return done(null, false, { message: "Invalid username or password." });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Strategy for Mission Admins (restricted access)
  passport.use('missionary-portal-login', new LocalStrategy(
    { usernameField: 'emailAddress', passwordField: 'password', passReqToCallback: true },
    async (req, emailAddress, password, done) => {
        try {
            const { accessCode } = req.body;
            if (!accessCode) {
                return done(null, false, { message: 'Ward access code is required.' });
            }
            const ward = await storage.getWardByAccessCode(accessCode);
            if (!ward) {
                return done(null, false, { message: 'Invalid ward access code.' });
            }

            const missionary = await storage.getMissionaryByEmail(emailAddress);
            if (!missionary || !missionary.password || missionary.wardId !== ward.id) {
                return done(null, false, { message: 'Invalid credentials for this ward.' });
            }

            const passwordsMatch = await comparePasswords(password, missionary.password);
            if (!passwordsMatch) {
                return done(null, false, { message: 'Invalid credentials.' });
            }

            // This is a missionary login, not a standard user, so we return the missionary object.
            // We'll need a way to distinguish this in the session.
            // For now, we'll return a user-like object for session compatibility.
            const missionaryUser = {
                id: missionary.id,
                username: missionary.name,
                role: 'missionary' // Custom role for session
            };

            return done(null, missionaryUser as any);
        } catch (error) {
            return done(error);
        }
    }
  ));


  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // This will need to handle both standard users and missionary "users"
      const user = await storage.getUser(id);
      if (user) {
        return done(null, user);
      }
      // If not a standard user, check if it's a missionary
      const missionary = await storage.getMissionary(id);
      if (missionary) {
        const missionaryUser = {
            id: missionary.id,
            username: missionary.name,
            role: 'missionary'
        };
        return done(null, missionaryUser as any);
      }
      done(new Error('User not found.'));
    } catch (error) {
      done(error);
    }
  });

  // Main admin login for Ultra, Region, Stake, Ward Admins
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("admin-login", (err: Error, user: Express.User, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        const { id, username, role, regionId, missionId, stakeId } = user;
        return res.status(200).json({ id, username, role, regionId, missionId, stakeId });
      });
    })(req, res, next);
  });

  // Login for Missionaries (and restricted Mission Admins if they use this portal)
  app.post("/api/missionary-portal/authenticate", (req, res, next) => {
      passport.authenticate("missionary-portal-login", (err: Error, user: Express.User, info: { message: string }) => {
          if (err) return next(err);
          if (!user) return res.status(401).json({ authenticated: false, message: info.message });

          req.login(user, (loginErr) => {
              if (loginErr) return next(loginErr);

              const { id, username } = user;
              return res.status(200).json({ authenticated: true, missionary: { id, name: username } });
          });
      })(req, res, next);
  });


  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully." });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export async function createInitialUltraAdmin() {
  try {
    const existingAdmin = await storage.getUserByUsername("ultra_admin");
    if (!existingAdmin) {
      const hashedPassword = await hashPassword(process.env.ULTRA_ADMIN_PASSWORD || "default_ultra_password");
      const adminData: InsertUser = {
        username: "ultra_admin",
        password: hashedPassword,
        role: "ultra_admin",
      };
      await storage.createUser(adminData);
      console.log("Ultra Admin user created successfully.");
    }
  } catch (error) {
    console.error("Error creating Ultra Admin user:", error);
  }
}