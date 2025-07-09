import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, userRoleEnum } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

const scryptAsync = promisify(scrypt);

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
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

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

  passport.use('local-regular', new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
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
          return done(null, false, { message: "Invalid ward access code" });
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

export async function createSuperAdminUser() {
    try {
      const existingSuperAdmin = await storage.getUserByUsername("ultraadmin");
      if (!existingSuperAdmin) {
        const superAdminUser: InsertUser = {
          username: "ultraadmin",
          password: await hashPassword("password"),
          role: 'ultra',
        };
        await storage.createUser(superAdminUser);
        console.log("Ultra admin user created with default credentials");
      }
    } catch (error) {
      console.error("Error creating ultra admin user:", error);
    }
}