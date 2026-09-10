import { Room, Client } from 'colyseus';
import { GameState, Player } from '@storm-arena/shared';
import { RoomPhase, Difficulty, PlayerColor, PlayerState, WeaponType } from '@storm-arena/shared';
import { MESSAGE_CLIENT } from '@storm-arena/shared';
import { MovementSystem, PLAYER_SPEED, MOVEMENT_BOUNDARY, MovementInput } from '../gameplay/movement/MovementSystem';

const PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
];

const MAX_PLAYERS = 4;
const TICK_INTERVAL_MS = 50;
const RECONNECT_TIMEOUT_MS = 30000;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private movement = new MovementSystem();

  onCreate(options: { difficulty?: string }) {
    this.setState(new GameState());
    this.state.roomCode = generateRoomCode();
    this.state.phase = RoomPhase.LOBBY;
    this.state.difficulty = options.difficulty ?? Difficulty.NORMAL;
    this.state.maxWaves = 5;

    this.setSimulationInterval((deltaTime: number) => {
      this.serverTick(deltaTime);
    }, TICK_INTERVAL_MS);

    this.onMessage(MESSAGE_CLIENT.PLAYER_MOVE, (client, payload: MovementInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;

      const normalized = this.normalizeMoveInput(payload);
      if (!normalized) return;

      this.movement.enqueueInput(client.sessionId, normalized);
    });

    this.onMessage(MESSAGE_CLIENT.HOST_START, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const playerCount = this.state.players.size;
      if (playerCount < 2) return;

      this.state.phase = RoomPhase.GAME;
    });

    this.onMessage(MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY, (client, payload: { difficulty: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const validDifficulties: string[] = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
      if (validDifficulties.includes(payload.difficulty)) {
        this.state.difficulty = payload.difficulty;
      }
    });
  }

  onJoin(client: Client) {
    const playerCount = this.state.players.size;
    const colorIndex = playerCount % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[colorIndex];

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.color = color;
    player.health = 100;
    player.maxHealth = 100;
    player.weapon = WeaponType.FIST;
    player.isHost = playerCount === 0;
    player.isAlive = true;
    player.state = PlayerState.IDLE;

    player.position.x = -5 + playerCount * 3;
    player.position.y = 0;
    player.position.z = 0;

    this.state.players.set(client.sessionId, player);

    if (player.isHost) {
      this.state.hostId = player.id;
    }
  }

  onLeave(client: Client, consented: boolean) {
    if (this.state.phase === RoomPhase.LOBBY) {
      this.state.players.delete(client.sessionId);
      this.movement.clear(client.sessionId);

      if (this.state.players.size > 0) {
        const firstEntry = this.state.players.entries().next().value;
        if (firstEntry) {
          firstEntry[1].isHost = true;
          this.state.hostId = firstEntry[1].id;
        }
      }
    } else {
      this.allowReconnection(client, RECONNECT_TIMEOUT_MS).then(() => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.sessionId = client.sessionId;
        }
      }).catch(() => {
        this.state.players.delete(client.sessionId);
        this.movement.clear(client.sessionId);
        if (this.state.players.size === 0) {
          this.disconnect();
        }
      });
    }
  }

  onDispose() {
    this.state.players.clear();
    this.state.enemies.clear();
    this.state.weaponPickups.clear();
    this.movement.clearAll();
  }

  private normalizeMoveInput(input: MovementInput): MovementInput | null {
    if (!input || typeof input !== 'object') return null;

    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts)) return null;
    if (!input.direction || typeof input.direction !== 'object') return null;

    const { x, y, z } = input.direction;
    if (
      typeof x !== 'number' || !Number.isFinite(x) ||
      typeof y !== 'number' || !Number.isFinite(y) ||
      typeof z !== 'number' || !Number.isFinite(z)
    ) {
      return null;
    }

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude > 1.01) return null;

    return {
      direction: { x, y, z },
      rotation: input.rotation ? { x: Number(input.rotation.x), y: Number(input.rotation.y) } : undefined,
      timestamp: ts,
    };
  }

  private serverTick(deltaTime: number) {
    if (this.state.phase !== RoomPhase.GAME) return;

    this.state.elapsedTime += deltaTime;
    const dt = deltaTime / 1000;

    this.state.players.forEach((player, sessionId) => {
      if (!player.isAlive) return;

      const update = this.movement.update(sessionId, deltaTime);

      player.position.x += update.velocity.x * PLAYER_SPEED * dt;
      player.position.y += update.velocity.y * PLAYER_SPEED * dt;
      player.position.z += update.velocity.z * PLAYER_SPEED * dt;

      player.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.x));
      player.position.y = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.y));
      player.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.z));

      if (update.rotation) {
        player.rotation.x = update.rotation.x;
        player.rotation.y = update.rotation.y;
        player.rotation.z = update.rotation.z ?? 0;
      }

      player.state = update.hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
    });
  }
}