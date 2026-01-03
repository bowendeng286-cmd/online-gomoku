import { sql } from "drizzle-orm";
import {
  pgTable,
  unique,
  serial,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    username: varchar({ length: 50 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    userType: varchar("user_type", { length: 10 }).default("regular").notNull(),
    eloRating: integer("elo_rating").default(1200),
    gamesPlayed: integer("games_played").default(0),
    gamesWon: integer("games_won").default(0),
    gamesLost: integer("games_lost").default(0),
    gamesDrawn: integer("games_drawn").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique("users_username_key").on(table.username),
  ]
);

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: serial().primaryKey().notNull(),
    roomId: varchar("room_id", { length: 20 }).notNull(),
    blackPlayerId: integer("black_player_id"),
    whitePlayerId: integer("white_player_id"),
    winner: varchar({ length: 10 }),
    endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("game_sessions_room_id_idx").on(table.roomId),
  ]
);

export const gameMoves = pgTable("game_moves", {
  id: serial().primaryKey().notNull(),
  sessionId: integer("session_id"),
  playerId: integer("player_id"),
  moveNumber: integer("move_number").notNull(),
  row: integer().notNull(),
  col: integer().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id"),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique("user_sessions_session_token_key").on(table.sessionToken),
    index("user_sessions_user_id_idx").on(table.userId),
  ]
);

// Use createSchemaFactory with date coercion for handling string to Date conversion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Zod schemas for validation
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  username: true,
  passwordHash: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    username: true,
    eloRating: true,
    gamesPlayed: true,
    gamesWon: true,
    gamesLost: true,
    gamesDrawn: true,
  })
  .partial();

export const insertGameSessionSchema = createCoercedInsertSchema(gameSessions).pick({
  roomId: true,
  blackPlayerId: true,
  whitePlayerId: true,
  winner: true,
  endTime: true,
});

export const insertGameMoveSchema = createCoercedInsertSchema(gameMoves).pick({
  sessionId: true,
  playerId: true,
  moveNumber: true,
  row: true,
  col: true,
});

export const insertUserSessionSchema = createCoercedInsertSchema(userSessions).pick({
  userId: true,
  sessionToken: true,
  expiresAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameMove = typeof gameMoves.$inferSelect;
export type InsertGameMove = z.infer<typeof insertGameMoveSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
