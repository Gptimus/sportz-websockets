import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

/**
 * Match Status Enum
 * Defines the possible states of a sports match.
 */
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

/**
 * Matches Table
 * Stores core information about sports events.
 */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  status: matchStatusEnum("status").default("scheduled").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Commentary Table
 * Stores real-time live commentary and event logs for specific matches.
 */
export const commentary = pgTable("commentary", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  minute: integer("minute"),
  sequence: integer("sequence").notNull(), // To ensure correct ordering within the same minute
  period: text("period"), // e.g., 'Q1', 'H1', 'OT'
  eventType: text("event_type").notNull(), // e.g., 'goal', 'foul', 'substitution'
  actor: text("actor"), // Usually the player involved
  team: text("team"), // Usually 'home' or 'away'
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Flexible storage for specific event details
  tags: text("tags").array(), // Searchable tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
