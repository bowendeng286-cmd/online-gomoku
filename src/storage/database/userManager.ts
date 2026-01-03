import { eq, and, SQL, like, sql } from "drizzle-orm";
import { getDb } from "./db";
import { 
  users, 
  userSessions,
  insertUserSchema, 
  updateUserSchema,
  insertUserSessionSchema,
  type User, 
  type InsertUser, 
  type UpdateUser,
  type UserSession,
  type InsertUserSession
} from "./shared/schema";

export class UserManager {
  async createUser(data: { username: string; password: string }): Promise<User> {
    const db = await getDb();
    const { password, ...userData } = data;
    
    // Hash password using bcrypt
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Insert user with all required fields
    const [user] = await db.insert(users).values({
      username: userData.username,
      passwordHash: passwordHash,
      userType: 'regular',
      eloRating: 1200,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
    }).returning();
    return user;
  }

  async createGuestUser(): Promise<User> {
    const db = await getDb();
    const bcrypt = require('bcryptjs');
    
    // Generate a random guest username
    const guestId = Math.random().toString(36).substring(2, 8);
    const username = `guest_${guestId}`;
    const password = Math.random().toString(36).substring(2, 15);
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Insert guest user
    const [user] = await db.insert(users).values({
      username,
      passwordHash,
      userType: 'guest',
      eloRating: 1200,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
    }).returning();
    return user;
  }

  async updateLastActivity(userId: number): Promise<void> {
    const db = await getDb();
    await db
      .update(users)
      .set({ 
        lastActivityAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(users.id, userId));
  }

  async cleanExpiredGuestUsers(expiryMinutes: number = 3): Promise<number> {
    const db = await getDb();

    // Calculate the expiry timestamp
    const expiryTime = new Date(Date.now() - expiryMinutes * 60 * 1000).toISOString();

    // Use raw SQL to delete expired guest users
    const result = await db.execute(
      sql.raw(`DELETE FROM users WHERE user_type = 'guest' AND last_activity_at <= '${expiryTime}'::timestamp RETURNING id`)
    );

    // Return the count of deleted users
    return result.rows.length;
  }

  async getUsers(options: { 
    skip?: number; 
    limit?: number; 
    filters?: Partial<Pick<User, 'id' | 'username'>> 
  } = {}): Promise<User[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(users.id, filters.id));
    }
    if (filters.username !== undefined) {
      conditions.push(eq(users.username, filters.username));
    }

    if (conditions.length > 0) {
      return db.select().from(users).where(and(...conditions)).limit(limit).offset(skip);
    }

    return db.select().from(users).limit(limit).offset(skip);
  }

  async getUserById(id: number): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async updateUser(id: number, data: UpdateUser): Promise<User | null> {
    const db = await getDb();
    const validated = updateUserSchema.parse(data);
    const [user] = await db
      .update(users)
      .set({ ...validated, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async createUserSession(userId: number, sessionToken: string, expiresAt: string | Date): Promise<UserSession> {
    const db = await getDb();
    const expiresAtStr = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
    const validated = insertUserSessionSchema.parse({
      userId,
      sessionToken,
      expiresAt: expiresAtStr
    });
    
    const [session] = await db.insert(userSessions).values(validated).returning();
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | null> {
    const db = await getDb();
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          sql`${userSessions.expiresAt} > CURRENT_TIMESTAMP`
        )
      );
    return session || null;
  }

  async cleanExpiredSessions(): Promise<void> {
    const db = await getDb();
    await db
      .delete(userSessions)
      .where(sql`${userSessions.expiresAt} <= CURRENT_TIMESTAMP`);
  }

  async deleteUserSession(sessionToken: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteUser(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserOptions(): Promise<{ id: number; username: string }[]> {
    const db = await getDb();
    return db
      .select({
        id: users.id,
        username: users.username
      })
      .from(users)
      .orderBy(users.username);
  }
}

export const userManager = new UserManager();