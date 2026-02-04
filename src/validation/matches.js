import { z } from "zod";

/**
 * Constants for Match Status
 */
export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

/**
 * Validates query parameters for listing matches.
 */
export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().positive().max(100).optional(),
});

/**
 * Validates the 'id' parameter in match routes.
 */
export const matchIdParamSchema = z.object({
  id: z.coerce.number().positive(),
});

/**
 * Helper to validate ISO date strings.
 */
const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Invalid ISO date string",
});

/**
 * Schema for creating a new match.
 * Includes chronological validation for start and end times.
 */
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, "Sport is required"),
    homeTeam: z.string().min(1, "Home team is required"),
    awayTeam: z.string().min(1, "Away team is required"),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().int().nonnegative().optional().default(0),
    awayScore: z.coerce.number().int().nonnegative().optional().default(0),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

/**
 * Schema for updating match scores.
 */
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
