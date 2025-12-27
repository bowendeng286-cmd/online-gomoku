import { relations } from "drizzle-orm/relations";
import { users, gameSessions, gameMoves, userSessions } from "./schema";

export const gameSessionsRelations = relations(gameSessions, ({one, many}) => ({
	user_blackPlayerId: one(users, {
		fields: [gameSessions.blackPlayerId],
		references: [users.id],
		relationName: "gameSessions_blackPlayerId_users_id"
	}),
	user_whitePlayerId: one(users, {
		fields: [gameSessions.whitePlayerId],
		references: [users.id],
		relationName: "gameSessions_whitePlayerId_users_id"
	}),
	gameMoves: many(gameMoves),
}));

export const usersRelations = relations(users, ({many}) => ({
	gameSessions_blackPlayerId: many(gameSessions, {
		relationName: "gameSessions_blackPlayerId_users_id"
	}),
	gameSessions_whitePlayerId: many(gameSessions, {
		relationName: "gameSessions_whitePlayerId_users_id"
	}),
	gameMoves: many(gameMoves),
	userSessions: many(userSessions),
}));

export const gameMovesRelations = relations(gameMoves, ({one}) => ({
	gameSession: one(gameSessions, {
		fields: [gameMoves.sessionId],
		references: [gameSessions.id]
	}),
	user: one(users, {
		fields: [gameMoves.playerId],
		references: [users.id]
	}),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));