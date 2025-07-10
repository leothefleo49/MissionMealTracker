// server/auth.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { db } from './db'; // Your Drizzle DB instance
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { userRoleEnum } from '@shared/schema';

const PgSession = connectPgSimple(session);

// Function to compare passwords
export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Function to hash passwords
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Variable to track setup mode
export let isSetupMode: boolean = true;

// Function to set setup mode
export const setSetupMode = (mode: boolean) => {
    isSetupMode = mode;
};

// Check if an ultra admin exists in the database
export const checkAndSetSetupMode = async () => {
    try {
        const ultraAdminCount = await db.select().from(users).where(eq(users.role, 'ultra')).limit(1);
        if (ultraAdminCount.length > 0) {
            setSetupMode(false);
            console.log("Ultra Admin found. Application starting normally.");
        } else {
            setSetupMode(true);
            console.log("No Ultra Admin found. Application is in setup mode.");
        }
    } catch (error) {
        console.error("Error checking setup mode, defaulting to setup mode:", error);
        setSetupMode(true);
    }
};

declare module 'express-session' {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: 'ultra' | 'region' | 'mission' | 'stake' | 'ward';
      regionId?: number | null;
      missionId?: number | null;
      stakeId?: number | null;
      canUsePaidNotifications: boolean;
      // Add any other user properties here
    }
  }
}

export async function setupAuth(app: Express) {
  // Session configuration
  app.use(
    session({
      store: new (PgSession(session))({
        pool: db.pool, // Connection pool
        tableName: 'session', // Use a custom table name for sessions
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key', // Ensure this is a strong, consistent secret
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' }, // 30 days
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[AUTH] Deserializing user with ID: ${id}`);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user) {
        console.log(`[AUTH] Deserialized user: ${JSON.stringify({ id: user.id, username: user.username, role: user.role })}`);
        done(null, user);
      } else {
        console.log(`[AUTH] User with ID ${id} not found.`);
        done(null, false);
      }
    } catch (err) {
      console.error("[AUTH] Error during deserializeUser:", err);
      done(err, null);
    }
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
}