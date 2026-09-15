# ⚡ Storm Arena (Multi-Warrior) — Setup & Quickstart Guide

A fast-paced 3D multiplayer arena brawler built with **React 19**, **Three.js / React Three Fiber**, **Rapier Physics**, **Colyseus Realtime Server**, **TypeScript**, and **Prisma ORM**.

---

## 📋 Table of Contents

1. [System Requirements](#-system-requirements)
2. [Prerequisites & Installation](#-prerequisites--installation)
3. [Environment Configuration](#-environment-configuration)
4. [Starting the Game](#-starting-the-game)
   - [Development Mode (Recommended)](#1-development-mode-recommended)
   - [Docker Mode](#2-docker-mode)
   - [Production Build](#3-production-build)
5. [How to Play](#-how-to-play)
   - [Controls](#controls)
   - [Game Modes](#game-modes)
6. [Testing & Verification](#-testing--verification)
7. [Project Architecture](#-project-architecture)
8. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 💻 System Requirements

### Minimum Hardware Requirements
| Component | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+, Debian, Fedora, Arch) | Any 64-bit OS |
| **CPU** | Dual-core 2.0 GHz x64 | Quad-core 2.5 GHz+ x64 / Apple Silicon |
| **RAM** | 4 GB | 8 GB or more |
| **GPU** | Integrated Graphics with WebGL 2.0 support | Dedicated GPU (Nvidia / AMD / Apple M-series) |
| **Storage** | 1 GB free disk space | 2 GB free disk space |

### Software & Runtime Requirements
- **Node.js**: `v20.0.0` or higher (`v20.x` or `v22.x` LTS recommended)
- **npm**: `v9.0.0` or higher
- **Web Browser**: Modern browser with WebGL 2.0 & Web Audio API enabled:
  - Google Chrome / Chromium 90+
  - Mozilla Firefox 90+
  - Microsoft Edge 90+
  - Apple Safari 15+
- *(Optional)* **Docker & Docker Compose**: For containerized PostgreSQL and game server execution.

---

## 📦 Prerequisites & Installation

### 1. Clone or Open the Repository
```bash
git clone https://github.com/danielraja107-art/Multi-Warrior.git
cd Multi-Warrior
```

### 2. Install Monorepo Dependencies
Install dependencies for all workspaces (`shared`, `database`, `server`, `client`) with a single command:

```bash
npm install
```

### 3. Generate Prisma Database Client
```bash
npm run db:generate
```

---

## ⚙️ Environment Configuration

The repository works out of the box with sensible defaults for local development. If you wish to customize ports or database connections, create a `.env` file or export environment variables:

```env
# Server Configuration
PORT=2567
NODE_ENV=development
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*

# Database Connection (Optional - server gracefully degrades if offline)
DATABASE_URL=postgresql://stormarena:stormarena@localhost:5433/stormarena?schema=public

# Client Configuration (Optional)
VITE_SERVER_URL=http://localhost:2567
```

> **Note:** If PostgreSQL is not running, the server automatically enters graceful fallback mode, allowing full gameplay, room lobbies, multiplayer combat, and solo play without a database.

---

## 🚀 Starting the Game

### 1. Development Mode (Recommended)

To run the game in development with live hot-reloading:

#### Step 1: Start the Game Server
In your first terminal tab:
```bash
npm run dev:server
```
*The server will start listening on `http://localhost:2567`.*

#### Step 2: Start the Web Client
In a second terminal tab:
```bash
npm run dev:client
```
*The client will start on `http://localhost:5173`.*

#### Step 3: Open the Game in Your Browser
Open your browser and navigate to:
```
http://localhost:5173
```

---

### 2. Docker Mode

You can run the PostgreSQL database or the entire containerized server stack via Docker:

```bash
# Start PostgreSQL Database
docker compose up -d db

# Apply Database Migrations (if DB is running)
npm run db:deploy

# Or start the full stack (DB + Server)
docker compose up --build
```

---

### 3. Production Build

To create optimized production builds for all workspaces:

```bash
# Build shared, database, server, and client packages
npm run build

# Start the production server
npm run start --workspace=server

# Preview the built production client
npm run preview --workspace=client
```

---

## 🎮 How to Play

### Controls

| Action | Keyboard & Mouse |
|---|---|
| **Move** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Run / Sprint** | Hold `Left Shift` |
| **Light Attack / Throw** | `Left Mouse Click` or `J` |
| **Heavy Attack** | `Right Mouse Click` or `K` |
| **Dodge / Dash** | `Spacebar` |
| **Block / Guard** | `F` or `E` (Toggles block stance, -50% damage) |
| **Camera Rotation** | Move Mouse |

### Game Modes

1. **Solo / Practice Mode**:
   - Click **Create Room** on the main menu.
   - Choose your warrior color and difficulty (*Easy*, *Normal*, *Hard*).
   - Click **Start Game** immediately to fight solo against enemy waves and the boss.

2. **Multiplayer Arena (Up to 4 Players)**:
   - Host: Click **Create Room** and share the 4-letter **Room Code** (e.g. `AB12`) with your friends.
   - Guests: Click **Join Room**, enter the code, and pick a unique color.
   - Host clicks **Start Game** when all players are ready.
   - Work together to defeat waves of enemies, chain knockbacks, pick up weapons, and vanquish the final boss!

3. **Reconnection Support**:
   - If a player accidentally refreshes or loses connection, they have a 30-second reconnection window to seamlessly rejoin the ongoing match with their health and state intact.

---

## 🧪 Testing & Verification

Storm Arena includes a full automated test suite covering unit physics, combat hitboxes, server tick loops, enemy AI state machines, and reconnection UI:

```bash
# Run the complete test suite
npm test

# Run API Integration tests
npm run test:api
```

---

## 🏗️ Project Architecture

```
Multi-Warrior/
├── .github/workflows/ci.yml # Automated CI pipeline (Build & Test)
├── docker-compose.yml       # Containerized Postgres & Server setup
├── Dockerfile.server        # Production server Docker image
├── package.json             # Root monorepo workspace configuration
├── shared/                  # Shared types, combat schemas, weapon & enemy constants
│   ├── src/constants/       # Difficulty, weapon damages, hitbox radiuses, wave configs
│   ├── src/schema/          # Colyseus sync state schemas (Player, Enemy, Boss, Room)
│   └── src/types/           # Network payloads and protocol definitions
├── database/                # Prisma ORM schema, migrations, and seed scripts
│   └── prisma/schema.prisma # User, Profile, Match, and Achievement models
├── server/                  # Authoritative Node.js Colyseus game server
│   ├── src/gameplay/        # CombatManager, HitboxSystem, KnockbackSystem, EnemyAI
│   ├── src/rooms/           # GameRoom lobby, state synchronization, and tick loops
│   └── tests/               # 8 automated test suites with 100% pass rate
└── client/                  # React 19 + Three.js + R3F 3D Client
    ├── src/game/            # 3D Arena scene, physics, combat controllers, Web Audio
    ├── src/network/         # Colyseus client connection, lag reconciliation
    ├── src/ui/              # Lobby, HUD, Leaderboards, Match detail, Health bars
    └── src/state/           # Zustand state management
```

---

## ❓ Troubleshooting & FAQ

### Q: The page is blank or Three.js fails to render.
- Verify that **Hardware Acceleration** is enabled in your browser settings (`chrome://settings/system` or `about:preferences` in Firefox).
- Make sure your graphics driver supports WebGL 2.0 (check at [webglreport.com](https://webglreport.com/?v=2)).

### Q: Port 2567 or 5173 is already in use.
- You can specify a different port when launching:
  ```bash
  PORT=3000 npm run dev:server
  ```
- And configure the client to connect to it via `VITE_SERVER_URL=http://localhost:3000 npm run dev:client`.

### Q: How do I test with multiple players on a single machine?
- Open your browser in normal mode and create a room.
- Open a second window in **Incognito / Private Browsing** mode (or a different browser like Firefox/Brave).
- Go to `http://localhost:5173`, click **Join Room**, and enter the 4-letter room code.

---

**Enjoy the battle in Storm Arena! ⚔️🌪️**
