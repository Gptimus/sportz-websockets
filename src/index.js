import express from "express";
import { matchRouter } from "./routes/matches.js";
import http from "http";
import { attachWebsocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

const server = http.createServer(app);

// Middleware to parse JSON bodies
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Sportz API!" });
});

// Matches routes
app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebsocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running at ${baseUrl}`);
  console.log(
    `WebSocket server running at ${baseUrl.replace("http", "ws")}/ws`,
  );
});
