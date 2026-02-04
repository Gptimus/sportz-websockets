import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { eq, desc } from "drizzle-orm";

const MAX_LIMIT = 100;

/**
 * Commentary Router
 * Uses 'mergeParams: true' to access the match ID (:id) from the parent match router.
 */
export const commentaryRouter = Router({ mergeParams: true });

/**
 * GET /matches/:id/commentary
 * Fetches latest commentary for a specific match, ordered chronologically (newest first).
 */
commentaryRouter.get("/", async (req, res) => {
  // 1. Validate both URL Parameters (:id) and Query parameters (?limit=)
  const paramValidation = matchIdParamSchema.safeParse(req.params);
  const queryValidation = listCommentaryQuerySchema.safeParse(req.query);

  if (!paramValidation.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramValidation.error.issues,
    });
  }

  if (!queryValidation.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: queryValidation.error.issues,
    });
  }

  const matchId = paramValidation.data.id;

  // Apply safety cap to limit
  const limit = Math.min(queryValidation.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    // 2. Fetch commentary specifically linked to this matchId
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.status(200).json({
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Commentary fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch commentary",
    });
  }
});

/**
 * POST /matches/:id/commentary
 * Creates a new commentary event for a specific match and broadcasts it in real-time.
 */
commentaryRouter.post("/", async (req, res) => {
  // 1. Security: Validate URL match ID
  const paramValidation = matchIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramValidation.error.issues,
    });
  }

  const matchId = paramValidation.data.id;

  // 2. Integrity: Validate body data and ensure it matches the URL's ID
  const bodyValidation = createCommentarySchema.safeParse({
    ...req.body,
    matchId,
  });

  if (!bodyValidation.success) {
    return res.status(400).json({
      error: "Invalid commentary payload",
      details: bodyValidation.error.issues,
    });
  }

  try {
    // 3. Persistence: Insert into PostgreSQL via Drizzle
    const [newCommentary] = await db
      .insert(commentary)
      .values(bodyValidation.data)
      .returning();

    // 4. Real-time: Broadcast to WebSocket subscribers following this specific match
    if (res.app.locals.broadcastCommentaryCreated) {
      try {
        res.app.locals.broadcastCommentaryCreated(
          newCommentary.matchId,
          newCommentary,
        );
      } catch (broadcastError) {
        console.error("Broadcast commentary_created failed:", broadcastError);
      }
    }

    return res.status(201).json({ data: newCommentary });
  } catch (error) {
    console.error("Commentary insertion error:", error);

    // Specific check for Foreign Key violation (Match doesn't exist)
    if (error.code === "23503") {
      return res.status(404).json({
        error: "Match not found",
      });
    }

    return res.status(500).json({
      error: "Failed to create commentary",
    });
  }
});
