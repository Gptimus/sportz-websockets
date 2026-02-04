import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Stores WebSocket subscribers for specific matches.
 * Key: matchId (number)
 * Value: Set of WebSocket instances
 */
const matchSubscribers = new Map();

/**
 * Adds a socket to the list of subscribers for a specific match.
 */
function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

/**
 * Removes a socket from the list of subscribers for a specific match.
 * If no subscribers remain for that match, the entry is removed from the map.
 */
function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) {
    return;
  }
  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

/**
 * Cleans up all active subscriptions for a closing socket.
 */
function cleanupDeadSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

/**
 * Helper to send JSON payloads to a single socket.
 */
function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

/**
 * Broadcasts a JSON payload to every single connected client.
 * Currently used for 'match_created' events.
 */
function broadcastToAll(wss, payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Broadcasts a JSON payload ONLY to clients subscribed to a specific match.
 * Currently used for 'commentary_created' events.
 */
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify(payload);

  subscribers.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
}

/**
 * Handles incoming messages from the client.
 * Supports: 'subscribe' and 'unsubscribe' actions.
 */
const handleMessage = (socket, data) => {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, {
      type: "error",
      message: "Invalid JSON",
    });
    return;
  }

  // Client wants to follow a specific match's live feed
  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, {
      type: "subscribed",
      matchId: message.matchId,
    });
    return;
  }

  // Client wants to stop following a specific match
  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, {
      type: "unsubscribed",
      matchId: message.matchId,
    });
    return;
  }
};

/**
 * Initializes and attaches the WebSocket server to the core HTTP server.
 * Implements security, heatbeats, and broadcasting utilities.
 */
export function attachWebsocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    // 🛡️ Security Check (Arcjet)
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Too Many Requests"
            : "Forbidden";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("WebSocket connection error:", error);
        socket.close(1011, "Server security error");
        return;
      }
    }

    // ❤️ Heartbeat/Ping-Pong Setup
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    console.log("New WebSocket connection established");

    // Initialize per-socket subscription tracking
    socket.subscriptions = new Set();

    sendJson(socket, {
      type: "welcome",
      message: "Welcome to the Sportz API!",
    });

    socket.on("message", (data) => handleMessage(socket, data));

    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupDeadSubscriptions(socket);
    });
  });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  // 🧹 Periodic Cleanup (Every 30 seconds)
  // Terminates connections that haven't responded to pings
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log("Terminating dead client");
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Clear interval when server closes to prevent memory leaks
  wss.on("close", () => {
    clearInterval(interval);
  });

  /**
   * Global utility to notify all connected clients of new matches.
   */
  const broadcastMatchCreated = (match) => {
    console.log("Broadcasting match_created event:", match.id);
    broadcastToAll(wss, {
      type: "match_created",
      data: match,
    });
  };

  /**
   * Targeted utility to notify only match-specific subscribers of new commentary.
   */
  const broadcastCommentaryCreated = (matchId, comment) => {
    console.log("Broadcasting commentary_created event:", comment.id);
    broadcastToMatch(matchId, {
      type: "commentary_created",
      data: comment,
    });
  };

  return {
    wss,
    broadcastMatchCreated,
    broadcastCommentaryCreated,
  };
}
