# Storm Arena — Shared Contract & Build Documentation

## Contract Version: 0.1.0 (Foundation)

This document is the source of truth for shared contracts between Server (Member 1), Client (Member 2), and UI/Platform (Member 3).

## Monorepo Layout

```text
shared/   → @storm-arena/shared   (shared contracts, schemas, constants)
server/   → @storm-arena/server   (Colyseus authoritative server)
client/   → @storm-arena/client   (3D client — Member 2)
database/ → (match persistence — Phase 8+)
docs/     → documentation
```

## Getting Started

```bash
npm install            # install all workspaces
npm run build:shared   # build shared contracts
npm run dev:server     # run server at ws://localhost:2567
npm run test --workspace=server   # run server integration tests
```

## Server

- Colyseus WebSocket server on port `2567` (override with `PORT` env).
- Room name: `game_room`.
- Authoritative simulation at **20 Hz** (`setSimulationInterval`, 50 ms).
- Health check: `GET /` (colyseus matchmaking routes), `GET /health` (Express, Phase 9).

## Shared Contracts (do not change casually)

| Contract | Path | Status |
|---|---|---|
| Game state schema | `shared/src/schemas/GameState.ts` | v0.1.0 |
| Message types | `shared/src/messages/index.ts` | v0.1.0 |
| Type enums | `shared/src/types/index.ts` | v0.1.0 |
| Weapon constants | `shared/src/constants/weapons.ts` | v0.1.0 |
| Enemy constants | `shared/src/constants/enemies.ts` | v0.1.0 |
| Wave constants | `shared/src/constants/waves.ts` | v0.1.0 |

## Client → Server Messages

| Type | Purpose |
|---|---|
| `PLAYER_MOVE` | Direction + rotation for authoritative movement |
| `PLAYER_ATTACK` | Light/heavy attack intent |
| `PLAYER_DODGE` | Dodge intent |
| `PLAYER_BLOCK` | Block toggle |
| `PLAYER_PICKUP` | Weapon pickup intent |
| `PLAYER_THROW` | Rock throw intent |
| `HOST_START` | Host starts the game |
| `HOST_CHANGE_DIFFICULTY` | Host changes difficulty (lobby only) |

## Server → Client (via state sync + events)

- Room state is authoritative and synced via Colyseus schema (`GameState`).
- Server events: `WAVE_START`, `WAVE_COMPLETE`, `BOSS_SPAWN`, `BOSS_PHASE_CHANGE`, `BOSS_DEFEATED`, `PLAYER_DIED`, `PLAYER_KILLED`, `WEAPON_PICKUP`, `WEAPON_DROP`, `MATCH_END`.

## Player Colors (fixed order)

Red → Blue → Green → Yellow (player 1–4).
