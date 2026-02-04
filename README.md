# Sportz API 🏟️

A high-performance, real-time sports commentary and match tracking API built with Node.js, Express, and Drizzle ORM.

## 🚀 Overview

Sportz API provides a robust foundation for building real-time sports applications. It features a complete match management system and a live commentary feed powered by WebSockets with a targeted Pub/Sub architecture.

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: PostgreSQL (via [Neon](https://neon.tech/))
- **Validation**: [Zod](https://zod.dev/)
- **Security**: [Arcjet](https://arcjet.com/) (Rate limiting, Bot detection, Shield)
- **Real-time**: [ws](https://github.com/websockets/ws) (WebSockets)
- **Monitoring**: ManageEngine APM Insight

## ✨ Key Features

- **Live Commentary Feed**: Real-time push updates for match events.
- **WebSocket Pub/Sub**: Clients can subscribe to specific matches to receive targeted updates.
- **Strict Validation**: Type-safe requests using Zod with complex chronological checks.
- **Advanced Security**: Integrated Arcjet middleware for Shield protection, bot detection, and rate limiting.
- **Heartbeat System**: Automatic cleanup of dead WebSocket connections.
- **Database Migrations**: Managed via Drizzle Kit.

## 🏁 Getting Started

### 1. Prerequisites

- Node.js (v20+)
- A Neon PostgreSQL database instance
- An Arcjet account and API key

### 2. Installation

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add the following:

```env
DATABASE_URL="your_neon_connection_string"
ARCJET_KEY="your_arcjet_key"
ARCJET_MODE="LIVE" # or "DRY_RUN"
PORT=8000
HOST="0.0.0.0"
```

### 4. Database Migrations

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio to view data
npm run db:studio
```

### 5. Start the Server

```bash
# Development mode (with --watch)
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Matches

- `GET /matches`: List all matches (supports `?limit=`).
- `POST /matches`: Create a new match.

### Commentary

- `GET /matches/:id/commentary`: Fetch latest commentary for a specific match.
- `POST /matches/:id/commentary`: Add live commentary to a match (broadcasts in real-time).

## 🔌 WebSocket (Pub/Sub)

**URL**: `ws://localhost:8000/ws`

### Client Actions

Clients interact with the WebSocket server by sending JSON messages:

#### Subscribe to a Match

```json
{
  "type": "subscribe",
  "matchId": 1
}
```

#### Unsubscribe from a Match

```json
{
  "type": "unsubscribe",
  "matchId": 1
}
```

### Server Events

- `match_created`: Broadcast to all connected clients.
- `commentary_created`: Sent ONLY to clients subscribed to that specific `matchId`.
- `welcome`: Sent upon connection.

## 🛡️ Security

The application is protected by Arcjet:

- **Shield**: Protects against SQL injection and XSS.
- **Bot Detection**: Blocks known malicious bots while allowing search engines.
- **Rate Limiting**:
  - **HTTP**: 50 requests per 10 seconds.
  - **WebSocket**: 5 connections per 2 seconds.

## 🧪 Testing

A load test script is provided to verify the rate limits:

```bash
./test-load.sh
```

## 📄 License

ISC
