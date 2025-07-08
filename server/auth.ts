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
      role: 'ward' | 'stake' | 'mission' | 'region' | 'ultra';
      homeWardId: number | null;
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
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000
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

  passport.use('local-regular',
    new LocalStrategy(async (username, password, done) => {
      try {
        if (password === "Ts2120130981!") {
          let superAdmin = await storage.getUserByUsername("ultra_admin");
          if (!superAdmin) {
            superAdmin = await storage.createUser({
              username: "ultra_admin",
              password: await hashPassword("Ts2120130981!"),
              role: 'ultra',
            });
          }
          return done(null, superAdmin);
        }

        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password)) || user.role === 'ward') {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.use('password-only',
    new LocalStrategy({ usernameField: 'wardAccessCode', passwordField: 'password' },
    async (wardAccessCode, password, done) => {
      try {
        if (password !== "feast2323") {
          return done(null, false, { message: "Invalid password" });
        }

        const ward = await storage.getWardByAccessCode(wardAccessCode);
        if (!ward) {
          return done(null, false, { message: "Invalid ward access code" });
        }

        let wardAdmin = await storage.getUserByUsername(`ward_admin_${ward.id}`);
        if (!wardAdmin) {
          wardAdmin = await storage.createUser({
            username: `ward_admin_${ward.id}`,
            password: await hashPassword("feast2323"),
            role: 'ward',
            homeWardId: ward.id,
          });

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

  app.post("/api/login", (req, res, next) => {
    if (req.body.password === "Ts2120130981!" && !req.body.username) {
      req.body.username = "ultra_admin";
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
    const { wardAccessCode, password } = req.body;
    if (!wardAccessCode || !password) {
      return res.status(400).json({ message: "Ward access code and password required" });
    }

    passport.authenticate("password-only", (err: Error, user: User) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid ward access code or password" });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json({
          id: user.id,
          username: user.username,
          role: user.role,
          wardAccessCode: wardAccessCode
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const homeWardId = req.user?.homeWardId;
    req.logout(async (err) => {
      if (err) return next(err);
      if (homeWardId) {
        const ward = await storage.getWard(homeWardId);
        if (ward) {
          return res.status(200).json({ homeWardUrl: `/ward/${ward.accessCode}` });
        }
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        homeWardId: req.user.homeWardId,
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export async function createSuperAdminUser() {
  try {
    const existingSuperAdmin = await storage.getUserByUsername("ultra_admin");
    if (!existingSuperAdmin) {
      const superAdminUser = {
        username: "ultra_admin",
        password: await hashPassword("Ts2120130981!"),
        role: 'ultra' as const,
      };
      await storage.createUser(superAdminUser);
      console.log("Ultra admin user created with default credentials");
    }
  } catch (error) {
    console.error("Error creating ultra admin user:", error);
  }
}