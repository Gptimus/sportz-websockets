import { z } from "zod";

/**
 * List Commentary Query Schema
 * Validates optional limit for pagination/data retrieval.
 */
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Create Commentary Schema
 * Validates data for inserting new commentary entries.
 * Aligned with PostgreSQL 'commentary' table.
 */
export const createCommentarySchema = z.object({
  matchId: z.coerce.number().int().positive(), // Required for database relation
  minute: z.coerce.number().int().nonnegative().optional(),
  sequence: z.coerce.number().int().nonnegative(),
  period: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
});
