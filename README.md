# Corporate Wars

© 2026 RineDC. All rights reserved.

Real-time multiplayer browser strategy MVP for 2-14 players. The game is server-authoritative, uses Phaser 3 on the client, and uses Node.js, Express, Socket.IO, and TypeScript on the server.

## Features

- Create and join rooms with 5-character room codes.
- Name and male/female CEO selection.
- Ready/unready lobby flow.
- Host-only start after all players are ready.
- Automatic host transfer on disconnect.
- Server-authoritative worker generation, attacks, travel timing, combat, eliminations, attack bonuses, anti-camping damage, and rankings.
- Refresh/reconnect using `playerId`, `roomId`, and `reconnectToken` in localStorage.
- Disconnected offices remain active and can still win.
- Eliminated players become spectators.
- Pixel-art-inspired lightweight Phaser rendering.
- Blueprint-backed map rendering from `client/public/assets/map/map.png`.
- Office/object coordinates are aligned to the provided master map image.
- Base game canvas is `1800x1400` with responsive FIT scaling.
- Empty map padding is rendered as `#050e02`.
- Worker routes use server-provided road waypoint paths.
- In-memory rooms only, with TTL cleanup.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
npm run build
npm test
```

## Run Locally

Terminal 1:

```bash
npm run dev --workspace server
```

Terminal 2:

```bash
npm run dev --workspace client
```

Open the Vite URL, usually `http://localhost:5173`.

By default the client connects to `http://localhost:3001`. Override with:

```bash
VITE_SERVER_URL=http://localhost:3001 npm run dev --workspace client
```

## Deployment

### Backend: Railway or Render

Use `/server` as the service root.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Environment variables:

```text
PORT=3001
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
NODE_ENV=production
```

The backend exposes:

```text
GET /health
```

### Frontend: Vercel

Use `/client` as the project root, or configure the monorepo build to target the client workspace.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Environment variable:

```text
VITE_SERVER_URL=https://your-backend.example.com
```

## Architecture

```text
/client
  Phaser 3 + TypeScript + Vite
  Renders setup, lobby, game, and end scenes.
  Sends intent only.

/server
  Node.js + Express + Socket.IO + TypeScript
  Owns rooms, players, timers, combat, anti-camping, reconnects, and end stats.
```

The server is authoritative. The client never decides combat, HP, worker counts, eliminations, or winners.

## Multiplayer Notes

- Attack power is captured when a worker is sent.
- Attacks against already destroyed offices disappear with no refund.
- Server calculates attack route waypoints and route-distance-based travel duration.
- Anti-camping timers reset on valid outgoing attacks only.
- Monster Client warning appears after 25 seconds of outgoing inactivity.
- Monster Client deals 20 damage after 30 seconds, then the timer resets.
- Simultaneous arrivals are resolved deterministically by arrival time and attack ID.
- Active marching workers are capped at 100 per player.

## Testing

```bash
npm test
```

Coverage includes:

- Blueprint office join limit.
- Ready/start flow.
- Host transfer.
- Reconnect state preservation.
- Worker generation.
- Attack validation.
- Combat.
- Office destruction.
- Attack bonuses.
- Monster warning/damage.
- Simultaneous attacks.
- Stress simulation with the maximum blueprint player count, attacks, disconnects, and reconnects.

## Troubleshooting

### Client cannot connect

Check that the server is running and that `VITE_SERVER_URL` points to the backend URL.

### CORS error in production

Set `CLIENT_ORIGIN` on the backend to the deployed frontend URL.

### Reconnect fails

Rooms are in-memory only. Reconnect works after browser refresh while the same backend process still has the room. It will fail after server restart or room TTL cleanup.

### Multiple backend instances

The MVP stores room state in memory, so run one backend instance. Horizontal scaling requires shared state and a Socket.IO Redis adapter.

## Known MVP Limits

- No database or persistent accounts.
- No matchmaking.
- No mobile-specific UI.
- The supplied master map contains 14 visible office buildings, so the current room cap is 14 to avoid inventing map locations.
- Gameplay overlays use separate office hit zones, CEO sprites, labels, worker sprites, and road-waypoint object coordinates over the master map layer.
- Single backend instance only.

## Copyright

© 2026 RineDC. All rights reserved.
