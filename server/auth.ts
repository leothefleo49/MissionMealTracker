import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    }
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Create a MemoryStore for session storage (in production we would use a proper store)
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  // Setup session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'missionary-meal-calendar-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup Passport local strategy with username and password
  passport.use('local-regular', 
    new LocalStrategy(async (username, password, done) => {
      try {
        // Handle superadmin login with fixed password
        if (password === "Ts2120130981!") {
          // Find or create the superadmin account
          let superAdmin = await storage.getUserByUsername("superadmin");
          if (!superAdmin) {
            // Create superadmin if it doesn't exist
            superAdmin = await storage.createUser({
              username: "superadmin",
              password: await hashPassword("Ts2120130981!"),
              isAdmin: true,
              isSuperAdmin: true
            });
          }
          return done(null, superAdmin);
        }
        
        // Regular user authentication
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );
  
  // Setup password-only strategy for ward access with fixed password
  passport.use('password-only',
    new LocalStrategy({ usernameField: 'wardAccessCode', passwordField: 'password' }, 
    async (wardAccessCode, password, done) => {
      try {
        // Check if password matches the ward access password
        if (password !== "feast2323") {
          return done(null, false, { message: "Invalid password" });
        }
        
        // Get the ward by access code
        const ward = await storage.getWardByAccessCode(wardAccessCode);
        if (!ward) {
          return done(null, false, { message: "Invalid ward access code" });
        }
        
        // Create or find ward admin user
        let wardAdmin = await storage.getUserByUsername(`ward_admin_${ward.id}`);
        if (!wardAdmin) {
          // Create a ward admin user
          wardAdmin = await storage.createUser({
            username: `ward_admin_${ward.id}`,
            password: await hashPassword("feast2323"),
            isAdmin: true,
            isSuperAdmin: false
          });
          
          // Associate with ward
          await storage.addUserToWard({
            userId: wardAdmin.id,
            wardId: ward.id
          });
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

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json({
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        isSuperAdmin: req.user.isSuperAdmin
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Middleware to check if user is authenticated and is an admin
  app.use("/api/admin/*", (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden - Admin access required" });
  });
}

// Helper function to create an admin user
export async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await storage.getUserByUsername("WardMissionFoodCalendar");
    if (!existingAdmin) {
      // Create an admin user with specified credentials
      const adminUser = {
        username: "WardMissionFoodCalendar",
        password: await hashPassword("feast"), 
        isAdmin: true,
        isSuperAdmin: true
      };
      await storage.createUser(adminUser);
      console.log("Admin user created with custom credentials");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}