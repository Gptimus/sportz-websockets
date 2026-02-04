import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Helper to send JSON payloads to a single socket
 */
function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

/**
 * Helper to broadcast JSON payloads to all connected clients
 */
function broadcast(wss, payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Attaches the WebSocket server to the existing HTTP server
 * and returns broadcasting utilities.
 */
export function attachWebsocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
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
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    console.log("New WebSocket connection established");

    sendJson(socket, {
      type: "welcome",
      message: "Welcome to the Sportz API!",
    });

    socket.on("error", (error) => {
      console.error("WebSocket socket error:", error);
    });

    socket.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  // Cleanup dead clients every 30 seconds
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

  // Cleanup interval on server close
  wss.on("close", () => {
    clearInterval(interval);
  });

  /**
   * Utility to broadcast a 'match_created' event
   */
  const broadcastMatchCreated = (match) => {
    console.log("Broadcasting match_created event:", match.id);
    broadcast(wss, {
      type: "match_created",
      data: match,
    });
  };

  /**
   * Return both the server instance and the utilities
   */
  return {
    wss,
    broadcastMatchCreated,
  };
}
