import { Room, Client } from 'colyseus';
import { GameState, Player, Enemy } from '@storm-arena/shared';
import { RoomPhase, Difficulty, PlayerColor, PlayerState, WeaponType, EnemyType, EnemyState, GameEvent, MESSAGE_CLIENT, MESSAGE_SERVER } from '@storm-arena/shared';
import { MovementSystem, PLAYER_SPEED, MOVEMENT_BOUNDARY, MovementInput } from '../gameplay/movement/MovementSystem';
import { CombatManager } from '../gameplay/combat/CombatManager';
import { WeaponSystem } from '../gameplay/weapons/WeaponSystem';
import { RockProjectileSystem } from '../gameplay/weapons/RockProjectileSystem';

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

      this.state.phase = RoomPhase.GAME;
      this.startWave(this.state.currentWave + 1);
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
    const player = this.state.players.get(client.sessionId);
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
    this.state.players.clear();
    this.state.enemies.clear();
    this.state.weaponPickups.clear();
    this.movement.clearAll();
    this.weapons.clearAll();
    this.projectiles.clearAll();
  }

  private startWave(wave: number): void {
    this.state.currentWave = wave;
    this.state.enemiesRemaining = 0;
    this.weapons.startWave(wave);
    this.spawnWaveEnemies(wave);
  }

  private spawnWaveEnemies(wave: number): void {
    this.state.enemies.clear();
    this.state.enemiesRemaining = 0;

    const enemyCount = this.calculateEnemyCount(wave);
    const types = this.selectEnemyTypes(wave);

    for (let i = 0; i < enemyCount; i++) {
      const type = types[i % types.length];
      this.spawnEnemy(type);
    }
  }

  private calculateEnemyCount(wave: number): number {
    const baseCount = 3 + Math.floor(wave * 1.5);
    const diffMult = this.getDifficultyMultiplier(this.state.difficulty);
    return Math.round(baseCount * diffMult);
  }

  private getDifficultyMultiplier(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 0.8;
      case 'normal': return 1.0;
      case 'hard': return 1.3;
      default: return 1.0;
    }
  }

  private selectEnemyTypes(wave: number): EnemyType[] {
    const pool: EnemyType[] = [EnemyType.BASIC];
    if (wave >= 2) pool.push(EnemyType.FAST);
    if (wave >= 3) pool.push(EnemyType.HEAVY);
    if (wave >= 4) pool.push(EnemyType.SHIELD);
    if (wave >= 5) pool.push(EnemyType.RANGED);
    if (wave >= 6) pool.push(EnemyType.ELITE);
    return pool;
  }

  private spawnEnemy(type: EnemyType): void {
    const baseStats = this.getEnemyBaseStats(type);
    const diffMult = this.getDifficultyMultiplier(this.state.difficulty);

    const maxHealth = Math.round(baseStats.health * (1 + (this.state.currentWave - 1) * 0.15) * diffMult);
    const damage = Math.round(baseStats.damage * (1 + (this.state.currentWave - 1) * 0.1) * diffMult);

    const enemy = new Enemy();
    enemy.id = `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    enemy.type = type;
    enemy.health = maxHealth;
    enemy.maxHealth = maxHealth;
    enemy.state = EnemyState.IDLE;
    enemy.position.x = (Math.random() - 0.5) * 20;
    enemy.position.y = 0;
    enemy.position.z = (Math.random() - 0.5) * 20;
    enemy.targetPlayerId = '';
    this.state.enemies.set(enemy.id, enemy);
    this.state.enemiesRemaining++;
  }

  private getEnemyBaseStats(type: EnemyType): { health: number; damage: number; speed: number; attackRange: number; detectionRange: number; attackCooldown: number; knockbackResistance: number } {
    const stats: Record<EnemyType, any> = {
      [EnemyType.BASIC]: { health: 50, damage: 10, speed: 3.0, attackRange: 1.5, detectionRange: 12.0, attackCooldown: 1500, knockbackResistance: 1.0 },
      [EnemyType.FAST]: { health: 35, damage: 8, speed: 5.5, attackRange: 1.3, detectionRange: 14.0, attackCooldown: 1000, knockbackResistance: 0.7 },
      [EnemyType.HEAVY]: { health: 120, damage: 18, speed: 2.0, attackRange: 2.0, detectionRange: 10.0, attackCooldown: 2000, knockbackResistance: 2.0 },
      [EnemyType.SHIELD]: { health: 80, damage: 12, speed: 2.5, attackRange: 1.8, detectionRange: 8.0, attackCooldown: 1800, knockbackResistance: 1.5 },
      [EnemyType.RANGED]: { health: 40, damage: 12, speed: 2.5, attackRange: 10.0, detectionRange: 16.0, attackCooldown: 2000, knockbackResistance: 0.8 },
      [EnemyType.ELITE]: { health: 200, damage: 22, speed: 3.5, attackRange: 2.2, detectionRange: 14.0, attackCooldown: 1200, knockbackResistance: 2.5 },
    };
    return stats[type] ?? stats[EnemyType.BASIC];
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

      if (player.state !== PlayerState.ATTACKING && player.state !== PlayerState.DODGING && player.state !== PlayerState.BLOCKING) {
        player.state = update.hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
      }
    });

    this.combat.update(deltaTime);
    this.weapons.update?.(deltaTime);
    this.projectiles.update(deltaTime);

    this.checkWaveComplete();
  }

  private checkWaveComplete(): void {
    if (this.state.enemiesRemaining === 0 && this.state.currentWave > 0) {
      if (this.state.currentWave >= this.state.maxWaves) {
        this.state.phase = RoomPhase.VICTORY;
        this.broadcast(MESSAGE_SERVER.GAME_EVENT, {
          event: GameEvent.MATCH_END,
          data: { victory: true },
        });
      } else {
        this.state.phase = RoomPhase.LOBBY;
        this.broadcast(MESSAGE_SERVER.GAME_EVENT, {
          event: GameEvent.WAVE_COMPLETE,
          data: { wave: this.state.currentWave },
        });
      }
    }
  }
}