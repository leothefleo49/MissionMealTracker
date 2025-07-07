import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

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
  // Setup session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'missionary-meal-calendar-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
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
    if (req.body.password === "Ts2120130981!" && !req.body.username) {
      req.body.username = "superadmin";
    }

    passport.authenticate("local-regular", (err: Error, user: User | false) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
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

  app.post("/api/ward-login", (req, res, next) => {
    const { wardAccessCode, password } = req.body;

    if (!wardAccessCode || !password) {
      return res.status(400).json({ message: "Ward access code and password required" });
    }

    passport.authenticate("password-only", (err: Error, user: User | false) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid ward access code or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json({
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          wardAccessCode: wardAccessCode
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
}

export async function createSuperAdminUser() {
  try {
    const existingSuperAdmin = await storage.getUserByUsername("superadmin");
    if (!existingSuperAdmin) {
      const superAdminUser = {
        username: "superadmin",
        password: await hashPassword("Ts2120130981!"), 
        isAdmin: true,
        isSuperAdmin: true
      };
      await storage.createUser(superAdminUser);
      console.log("Super admin user created with default credentials");
    }
  } catch (error) {
    console.error("Error creating super admin user:", error);
  }
}