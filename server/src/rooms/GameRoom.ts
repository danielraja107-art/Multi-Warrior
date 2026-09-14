import { Room, Client } from 'colyseus';
import { GameState, Player, Enemy } from '@storm-arena/shared';
import { RoomPhase, Difficulty, PlayerColor, PlayerState, WeaponType, EnemyType, EnemyState, GameEvent, MESSAGE_CLIENT, MESSAGE_SERVER } from '@storm-arena/shared';
import { MovementSystem, PLAYER_SPEED, MOVEMENT_BOUNDARY, MovementInput } from '../gameplay/movement/MovementSystem';
import { CombatManager } from '../gameplay/combat/CombatManager';
import { WeaponSystem } from '../gameplay/weapons/WeaponSystem';
import { RockProjectileSystem } from '../gameplay/weapons/RockProjectileSystem';
import { WaveDirector } from '../gameplay/waves/WaveDirector';
import { SpawnManager } from '../gameplay/waves/SpawnManager';
import { EnemySystem } from '../gameplay/enemies/EnemySystem';
import { BossSystem } from '../gameplay/bosses/BossSystem';

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

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private movement = new MovementSystem();
  private combat = new CombatManager(this);
  private weapons = new WeaponSystem(this);
  private projectiles = new RockProjectileSystem(this);
  private enemySystem = new EnemySystem(this);
  private bossSystem = new BossSystem(this);
  private spawnManager = new SpawnManager(this, this.enemySystem);
  private waveDirector = new WaveDirector(this, this.enemySystem, this.weapons, this.bossSystem);

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

    this.onMessage(MESSAGE_CLIENT.PLAYER_MOVE, (client, payload: MovementInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;

      const normalized = this.normalizeMoveInput(payload);
      if (!normalized) return;

      this.movement.enqueueInput(client.sessionId, normalized);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_ATTACK, (client, payload) => {
      if (!this.validateAttackPayload(payload, client.sessionId)) return;
      this.combat.handleAttack(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_DODGE, (client, payload) => {
      this.combat.handleDodge(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_BLOCK, (client, payload) => {
      this.combat.handleBlock(client, payload);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_PICKUP, (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      this.weapons.tryPickup(client.sessionId, payload.weaponPickupId);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_THROW, (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      if (player.weapon !== WeaponType.ROCK) return;
      this.projectiles.throwRock(
        client.sessionId,
        payload.direction,
        { x: player.position.x, y: player.position.y + 1.5, z: player.position.z }
      );
    });

    this.onMessage(MESSAGE_CLIENT.HOST_START, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const playerCount = this.state.players.size;
      if (playerCount < 2) return;

      this.waveDirector.startGame(this.state.difficulty as Difficulty);
      this.waveDirector.startNextWave();
    });

    this.onMessage(MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY, (client, payload: { difficulty: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const validDifficulties: string[] = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
      if (validDifficulties.includes(payload.difficulty)) {
        this.state.difficulty = payload.difficulty;
        this.waveDirector.setDifficulty(payload.difficulty as Difficulty);
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
    const player = this.state.players.get(client.sessionId);
    console.warn('[game-room]', 'player left', { sessionId: client.sessionId, consented, phase: this.state.phase });
    this.combat.onPlayerLeave(client.sessionId);
    this.weapons.onPlayerDeath(client.sessionId);

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
    } else if (player) {
      this.movement.clear(client.sessionId);

      this.allowReconnection(client, RECONNECT_TIMEOUT_MS / 1000).then(() => {
        const restored = this.state.players.get(client.sessionId);
        if (restored) {
          restored.sessionId = client.sessionId;
        }
      }).catch(() => {
        this.state.players.delete(client.sessionId);
        if (this.state.players.size === 0) {
          this.disconnect();
        }
      });
    }
  }

  onDispose() {
    console.warn('[game-room]', 'room disposed', { roomCode: this.state.roomCode, players: this.state.players.size });
    this.state.players.clear();
    this.state.enemies.clear();
    this.state.weaponPickups.clear();
    this.movement.clearAll();
    this.weapons.clearAll();
    this.projectiles.clearAll();
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
    if (Math.abs(x) > 1 || Math.abs(y) > 1 || Math.abs(z) > 1) return null;

    return {
      direction: { x, y, z },
      rotation: input.rotation ? { x: Number(input.rotation.x), y: Number(input.rotation.y) } : undefined,
      timestamp: ts,
    };
  }

  validateAttackPayload(payload: { type?: string; weapon?: string; timestamp?: number }, sessionId: string): boolean {
    const player = this.state.players.get(sessionId);
    if (!player || !player.isAlive) return false;
    if (!payload || typeof payload !== 'object') return false;
    if (payload.type !== 'light' && payload.type !== 'heavy') return false;
    if (!payload.weapon || typeof payload.weapon !== 'string') return false;
    if (payload.weapon !== player.weapon) return false;
    const ts = Number(payload.timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return true;
  }

  detectSpeedHack(sessionId: string, pos: { x: number; y: number; z: number }, elapsedMs: number): boolean {
    const player = this.state.players.get(sessionId);
    if (!player) return false;
    const dx = Math.abs(pos.x - player.position.x);
    const dz = Math.abs(pos.z - player.position.z);
    const dist = Math.sqrt(dx * dx + dz * dz);
    const elapsed = Math.max(1, Number(elapsedMs) || 1);
    const speed = dist / (elapsed / 1000);
    return speed > PLAYER_SPEED * 4.5;
  }

  private serverTick(deltaTime: number) {
    if (this.state.phase !== RoomPhase.GAME) return;

    this.state.elapsedTime += deltaTime;
    const dt = deltaTime / 1000;

    this.state.players.forEach((player, sessionId) => {
      if (!player.isAlive) return;

      const update = this.movement.update(sessionId, deltaTime);
      if (this.detectSpeedHack(sessionId, player.position, deltaTime)) {
        player.position.x = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.x));
        player.position.z = Math.max(-MOVEMENT_BOUNDARY, Math.min(MOVEMENT_BOUNDARY, player.position.z));
      }

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

      if (player.state !== PlayerState.ATTACKING && player.state !== PlayerState.DODGING && player.state !== PlayerState.BLOCKING) {
        player.state = update.hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
      }
    });

    this.combat.update(deltaTime);
    this.weapons.update?.(deltaTime);
    this.projectiles.update(deltaTime);
    this.enemySystem.update(deltaTime);
    this.bossSystem.update(deltaTime);
  }
}