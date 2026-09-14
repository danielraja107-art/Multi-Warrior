import { Room, Client } from 'colyseus';
import { GameState, Player, Boss } from '@storm-arena/shared';
import {
  RoomPhase,
  Difficulty,
  PlayerColor,
  PlayerState,
  WeaponType,
  AttackType,
  BossPhase,
} from '@storm-arena/shared';
import { MESSAGE_CLIENT } from '@storm-arena/shared';
import { BossAI } from '../boss/BossAI';
import { CombatSystem } from '../boss/CombatSystem';

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

interface PlayerVelocity {
  x: number;
  y: number;
  z: number;
}

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private velocities: Map<string, PlayerVelocity> = new Map();
  private bossAI: BossAI | null = null;
  private combat = new CombatSystem();
  private bossSpawned = false;
  private bossDefeated = false;

  onCreate(options: { difficulty?: string }) {
    this.setState(new GameState());
    this.state.roomCode = generateRoomCode();
    this.state.phase = RoomPhase.LOBBY;
    this.state.difficulty = options.difficulty ?? Difficulty.NORMAL;
    this.state.maxWaves = 5;

    this.setSimulationInterval((deltaTime: number) => {
      this.serverTick(deltaTime);
    }, TICK_INTERVAL_MS);

    this.onMessage(MESSAGE_CLIENT.PLAYER_MOVE, (client, payload: { direction: { x: number; y: number; z: number }; rotation?: { x: number; y: number }; timestamp: number }) => {
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
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_ATTACK, (client, payload: { type: AttackType; weapon: WeaponType; timestamp: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      if (this.state.phase !== RoomPhase.GAME) return;

      player.state = PlayerState.ATTACKING;

      if (this.state.boss.isActive && this.bossAI) {
        const result = this.combat.handlePlayerAttack(
          player,
          payload.type,
          payload.weapon,
          this.state.boss,
          this.bossAI,
          performance.now(),
        );

        if (result) {
          this.broadcast('BOSS_DAMAGE', {
            attackerId: client.sessionId,
            damage: result.damage,
            isDead: result.isDead,
            knockbackX: result.knockbackX,
            knockbackZ: result.knockbackZ,
          });

          if (result.isDead) {
            this.handleBossDefeated();
          }
        }
      }

      setTimeout(() => {
        const p = this.state.players.get(client.sessionId);
        if (p && p.state === PlayerState.ATTACKING) {
          p.state = PlayerState.IDLE;
        }
      }, 400);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_DODGE, (client, payload: { direction: { x: number; y: number; z: number }; timestamp: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      player.state = PlayerState.DODGING;
      setTimeout(() => {
        const p = this.state.players.get(client.sessionId);
        if (p && p.state === PlayerState.DODGING) {
          p.state = PlayerState.IDLE;
        }
      }, 250);
    });

    this.onMessage(MESSAGE_CLIENT.PLAYER_BLOCK, (client, payload: { active: boolean; timestamp: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isAlive) return;
      player.state = payload.active ? PlayerState.BLOCKING : PlayerState.IDLE;
    });

    this.onMessage(MESSAGE_CLIENT.HOST_START, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.state.phase !== RoomPhase.LOBBY) return;

      const playerCount = this.state.players.size;
      if (playerCount < 2) return;

      this.state.phase = RoomPhase.GAME;
      this.startWave(1);
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
      this.allowReconnection(client, RECONNECT_TIMEOUT_MS).then(() => {
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.sessionId = client.sessionId;
        }
      }).catch(() => {
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
    this.bossAI = null;
    this.combat.reset();
  }

  private startWave(waveNumber: number): void {
    this.state.currentWave = waveNumber;

    if (waveNumber === 5) {
      this.spawnBoss();
      return;
    }

    this.broadcast('WAVE_START', { wave: waveNumber });
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;

    this.bossAI = new BossAI(this.state.boss, this.state.difficulty);
    this.bossAI.spawn(this.state.players.size);

    this.state.boss = Object.assign(this.state.boss, {
      id: this.state.boss.id,
      health: this.state.boss.health,
      maxHealth: this.state.boss.maxHealth,
      phase: this.state.boss.phase,
      isActive: this.state.boss.isActive,
      position: this.state.boss.position,
      rotation: this.state.boss.rotation,
    });

    this.broadcast('BOSS_SPAWN', {
      bossId: this.state.boss.id,
      health: this.state.boss.health,
      maxHealth: this.state.boss.maxHealth,
    });
  }

  private handleBossDefeated(): void {
    if (this.bossDefeated) return;
    this.bossDefeated = true;

    this.state.boss.isActive = false;

    const damageLog = this.combat.resetDamageLog();

    this.broadcast('BOSS_DEFEATED', {
      bossId: this.state.boss.id,
      damageLog: Object.fromEntries(damageLog),
    });

    setTimeout(() => {
      this.state.phase = RoomPhase.VICTORY;
      this.broadcast('VICTORY', {
        wave: this.state.currentWave,
        elapsedTime: this.state.elapsedTime,
      });
    }, 3000);
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
      if (player.state !== PlayerState.ATTACKING && player.state !== PlayerState.DODGING) {
        player.state = hasInput ? PlayerState.RUNNING : PlayerState.IDLE;
      }
    });

    if (this.state.boss.isActive && this.bossAI) {
      this.bossAI.tick(deltaTime, this.state.players);

      const bossResults = this.combat.handleBossAttackPlayers(
        this.state.boss,
        this.bossAI,
        this.state.players,
        performance.now(),
      );

      for (const result of bossResults) {
        const player = this.state.players.get(result.targetId);
        if (player && result.isDead) {
          player.isAlive = false;
          player.state = PlayerState.DEAD;
          player.health = 0;

          this.broadcast('PLAYER_DIED', {
            playerId: result.targetId,
            killedBy: 'boss',
          });
        }

        this.broadcast('PLAYER_DAMAGED', {
          targetId: result.targetId,
          damage: result.damage,
          isDead: result.isDead,
          knockbackX: result.knockbackX,
          knockbackZ: result.knockbackZ,
        });
      }
    }
  }
}
