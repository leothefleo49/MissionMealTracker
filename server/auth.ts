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
      isUltraAdmin: boolean;
      isRegionAdmin: boolean;
      isMissionAdmin: boolean;
      isStakeAdmin: boolean;
      // isAdmin is derived based on the new roles for convenience in the client
      isAdmin: boolean; 
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

  passport.use('local-regular', 
    new LocalStrategy(async (username, password, done) => {
      try {
        // Handle Ultra Admin login with fixed password
        if (password === "Ts2120130981!") {
          let ultraAdmin = await storage.getUserByUsername("ultraadmin");
          if (!ultraAdmin) {
            ultraAdmin = await storage.createUser({
              username: "ultraadmin",
              password: await hashPassword("Ts2120130981!"),
              isUltraAdmin: true,
              isRegionAdmin: false,
              isMissionAdmin: false,
              isStakeAdmin: false,
            });
          }
          // The `isAdmin` property will be set during serialization based on new roles
          return done(null, ultraAdmin);
        }

        // Regular admin/user authentication
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        // The `isAdmin` property will be set during serialization based on new roles
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
          // Create a ward admin user with ward_admin role
          wardAdmin = await storage.createUser({
            username: `ward_admin_${ward.id}`,
            password: await hashPassword("feast2323"),
            isUltraAdmin: false,
            isRegionAdmin: false,
            isMissionAdmin: false,
            isStakeAdmin: false,
          });

          // Associate with ward
          await storage.addUserToWard({
            userId: wardAdmin.id,
            wardId: ward.id
          });
        }
        // The `isAdmin` property will be set during serialization based on new roles
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
      if (user) {
        // Dynamically determine `isAdmin` based on new roles
        const isAdmin = user.isUltraAdmin || user.isRegionAdmin || user.isMissionAdmin || user.isStakeAdmin;
        done(null, { ...user, isAdmin });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    // If a password for superadmin is provided without a username, assume superadmin login
    if (req.body.password === "Ts2120130981!" && !req.body.username) {
      req.body.username = "ultraadmin";
    }

    passport.authenticate("local-regular", (err: Error, user: User) => {
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
        // Send back all the new role flags
        return res.status(200).json({
          id: user.id,
          username: user.username,
          isUltraAdmin: user.isUltraAdmin,
          isRegionAdmin: user.isRegionAdmin,
          isMissionAdmin: user.isMissionAdmin,
          isStakeAdmin: user.isStakeAdmin,
          isAdmin: user.isAdmin, // This will be true if any of the above admin roles are true
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
          isUltraAdmin: user.isUltraAdmin,
          isRegionAdmin: user.isRegionAdmin,
          isMissionAdmin: user.isMissionAdmin,
          isStakeAdmin: user.isStakeAdmin,
          isAdmin: user.isAdmin, // This will be true for ward admins
          wardAccessCode: wardAccessCode // Keep wardAccessCode for client-side routing logic
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
      // Return all new role flags
      res.json({
        id: req.user.id,
        username: req.user.username,
        isUltraAdmin: req.user.isUltraAdmin,
        isRegionAdmin: req.user.isRegionAdmin,
        isMissionAdmin: req.user.isMissionAdmin,
        isStakeAdmin: req.user.isStakeAdmin,
        isAdmin: req.user.isAdmin, // This is derived in deserializeUser
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Middleware to check if user has any admin privileges (ward, stake, mission, region, ultra)
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if the user is explicitly a higher-tier admin
    if (req.user.isUltraAdmin || req.user.isRegionAdmin || req.user.isMissionAdmin || req.user.isStakeAdmin) {
      return next();
    }

    // Check if the user is a ward admin (associated with any ward)
    const userWards = await storage.getUserWards(req.user.id);
    if (userWards.length > 0) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
  };

  // Middleware to check if user is Ultra Admin
  const requireUltraAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user.isUltraAdmin) {
      return res.status(403).json({ message: 'Access denied: Ultra Admin privileges required' });
    }
    next();
  };

  // Apply the general admin middleware to the /api/admin routes
  app.use("/api/admin/*", requireAdmin);

  // Example of using requireUltraAdmin for routes that only Ultra Admins can access
  // For now, keep existing requireSuperAdmin replaced with requireUltraAdmin
  // You might want to apply this more granularly as the hierarchy features are built out
  app.post('/api/admin/wards', requireUltraAdmin);
  app.patch('/api/admin/wards/:id', requireUltraAdmin);
}

// Helper function to create ultra admin user
export async function createSuperAdminUser() {
  try {
    const existingUltraAdmin = await storage.getUserByUsername("ultraadmin");
    if (!existingUltraAdmin) {
      const ultraAdminUser = {
        username: "ultraadmin",
        password: await hashPassword("Ts2120130981!"), 
        isUltraAdmin: true,
        isRegionAdmin: false,
        isMissionAdmin: false,
        isStakeAdmin: false,
      };
      await storage.createUser(ultraAdminUser);
      console.log("Ultra admin user created with default credentials");
    }
  } catch (error) {
    console.error("Error creating ultra admin user:", error);
  }
}