import { Room, Client } from 'colyseus';
import { GameState, Player } from '@storm-arena/shared';
import { RoomPhase, Difficulty, PlayerColor, PlayerState, WeaponType } from '@storm-arena/shared';
import { MESSAGE_CLIENT } from '@storm-arena/shared';

const PLAYER_COLORS: PlayerColor[] = [
  PlayerColor.RED,
  PlayerColor.BLUE,
  PlayerColor.GREEN,
  PlayerColor.YELLOW,
];

const MAX_PLAYERS = 4;
const TICK_INTERVAL_MS = 50;
const RECONNECT_TIMEOUT_MS = Number(process.env.STORM_RECONNECT_TIMEOUT_MS || '30000');

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface PlayerVelocity {
  x: number;
  y: number;
  z: number;
}

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private velocities: Map<string, PlayerVelocity> = new Map();

  onCreate(options: { difficulty?: string }) {
    this.setState(new GameState());
    this.state.roomCode = generateRoomCode();
    this.state.phase = RoomPhase.LOBBY;
    this.state.difficulty = options.difficulty ?? Difficulty.NORMAL;
    this.state.maxWaves = 5;
    this.setMetadata({ code: this.state.roomCode });

    this.setSimulationInterval((deltaTime: number) => {
      this.serverTick(deltaTime);
    }, TICK_INTERVAL_MS);

    this.onMessage(
      MESSAGE_CLIENT.PLAYER_MOVE,
      (
        client,
        payload: {
          direction: { x: number; y: number; z: number };
          rotation?: { x: number; y: number };
          timestamp: number;
        },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isAlive) return;

        const { x, y, z } = payload.direction;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        if (magnitude > 1.01) return;

        this.velocities.set(client.sessionId, { x, y, z });

        if (payload.rotation) {
          player.rotation.x = payload.rotation.x;
          player.rotation.y = payload.rotation.y;
        }
      },
    );

    this.onMessage(MESSAGE_CLIENT.HOST_START, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const playerCount = this.state.players.size;
      if (playerCount < 2) return;

      this.state.phase = RoomPhase.GAME;
    });

    this.onMessage(
      MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY,
      (client, payload: { difficulty: string }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isHost) return;
        if (this.state.phase !== RoomPhase.LOBBY) return;

        const validDifficulties: string[] = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
        if (validDifficulties.includes(payload.difficulty)) {
          this.state.difficulty = payload.difficulty;
        }
      },
    );
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

    this.velocities.set(client.sessionId, { x: 0, y: 0, z: 0 });
    this.state.players.set(client.sessionId, player);

    if (player.isHost) {
      this.state.hostId = player.id;
    }
  }

  onLeave(client: Client, consented: boolean) {
    if (this.state.phase === RoomPhase.LOBBY) {
      this.state.players.delete(client.sessionId);
      this.velocities.delete(client.sessionId);

      if (this.state.players.size > 0) {
        const firstEntry = this.state.players.entries().next().value;
        if (firstEntry) {
          firstEntry[1].isHost = true;
          this.state.hostId = firstEntry[1].id;
        }
      }
    } else {
      this.allowReconnection(client, RECONNECT_TIMEOUT_MS / 1000)
        .then(() => {
          const player = this.state.players.get(client.sessionId);
          if (player) {
            player.sessionId = client.sessionId;
          }
        })
        .catch(() => {
          this.state.players.delete(client.sessionId);
          this.velocities.delete(client.sessionId);
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
    this.velocities.clear();
  }

  private serverTick(deltaTime: number) {
    if (this.state.phase !== RoomPhase.GAME) return;

    this.state.elapsedTime += deltaTime;

    this.state.players.forEach((player) => {
      if (!player.isAlive) return;

      const vel = this.velocities.get(player.sessionId);
      if (!vel) return;

      const speed = 5.0;
      const dt = deltaTime / 1000;

      player.position.x += vel.x * speed * dt;
      player.position.y += vel.y * speed * dt;
      player.position.z += vel.z * speed * dt;

      const boundary = 20;
      player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
      player.position.y = Math.max(-boundary, Math.min(boundary, player.position.y));
      player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));

      const hasInput = Math.abs(vel.x) > 0.01 || Math.abs(vel.y) > 0.01 || Math.abs(vel.z) > 0.01;
      player.state = hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
    });
  }
}
