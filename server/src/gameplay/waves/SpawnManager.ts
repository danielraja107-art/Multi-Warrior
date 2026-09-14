import { Room } from 'colyseus';
import { GameState, Enemy, EnemyType, EnemyState } from '@storm-arena/shared';
import { getEnemyStats } from '@storm-arena/shared';
import { MOVEMENT_BOUNDARY } from '../movement/MovementSystem';
import { EnemySystem } from '../enemies/EnemySystem';

export interface SpawnPosition {
  x: number;
  y: number;
  z: number;
}

const SAFE_DISTANCE_FROM_PLAYERS = 5;
const MIN_SPAWN_DISTANCE = 3;
const MAX_SPAWN_ATTEMPTS = 10;
const ARENA_RADIUS = 18;

export class SpawnManager {
  private room: Room<GameState>;
  private enemySystem: EnemySystem;
  private spawnPoints: SpawnPosition[] = [];
  private usedSpawnPoints: Set<number> = new Set();

  constructor(room: Room<GameState>, enemySystem: EnemySystem) {
    this.room = room;
    this.enemySystem = enemySystem;
    this.generateSpawnPoints();
  }

  private generateSpawnPoints(): void {
    const ringCount = 3;
    const pointsPerRing = 8;

    for (let ring = 0; ring < ringCount; ring++) {
      const radius = 6 + ring * 5;
      for (let i = 0; i < pointsPerRing; i++) {
        const angle = (i / pointsPerRing) * Math.PI * 2;
        this.spawnPoints.push({
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
        });
      }
    }

    const cornerCount = 4;
    const cornerRadius = 16;
    for (let i = 0; i < cornerCount; i++) {
      const angle = (i / cornerCount) * Math.PI * 2 + Math.PI / 4;
      this.spawnPoints.push({
        x: Math.cos(angle) * cornerRadius,
        y: 0,
        z: Math.sin(angle) * cornerRadius,
      });
    }
  }

  getSafeSpawnPosition(type: EnemyType): { x: number; y: number; z: number } {
    let attempts = 0;

    while (attempts < MAX_SPAWN_ATTEMPTS) {
      const pointIndex = Math.floor(Math.random() * this.spawnPoints.length);
      if (this.usedSpawnPoints.has(pointIndex)) {
        attempts++;
        continue;
      }

      const pos = this.spawnPoints[pointIndex];

      if (!this.isNearPlayer(pos) && !this.isNearOtherEnemy(pos)) {
        this.usedSpawnPoints.add(pointIndex);
        return { ...pos };
      }

      attempts++;
    }

    const fallback = this.getFallbackPosition();
    return fallback;
  }

  private isNearPlayer(pos: SpawnPosition): boolean {
    const players = this.room.state.players;
    let near = false;

    players.forEach((player) => {
      if (!player.isAlive) return;
      const dx = player.position.x - pos.x;
      const dz = player.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < SAFE_DISTANCE_FROM_PLAYERS) {
        near = true;
      }
    });

    return near;
  }

  private isNearOtherEnemy(pos: SpawnPosition): boolean {
    const enemies = this.room.state.enemies;
    let near = false;

    enemies.forEach((enemy) => {
      if (enemy.state === EnemyState.DEAD) return;
      const dx = enemy.position.x - pos.x;
      const dz = enemy.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < MIN_SPAWN_DISTANCE) {
        near = true;
      }
    });

    return near;
  }

  private getFallbackPosition(): SpawnPosition {
    let attempts = 0;
    while (attempts < 20) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * ARENA_RADIUS;
      const pos = {
        x: Math.cos(angle) * radius,
        y: 0,
        z: Math.sin(angle) * radius,
      };

      if (!this.isNearPlayer(pos) && !this.isNearOtherEnemy(pos)) {
        return pos;
      }
      attempts++;
    }

    return { x: 0, y: 0, z: 0 };
  }

  releaseSpawnPoint(index: number): void {
    this.usedSpawnPoints.delete(index);
  }

  clearUsedPoints(): void {
    this.usedSpawnPoints.clear();
  }

  getSpawnPoints(): ReadonlyArray<SpawnPosition> {
    return this.spawnPoints;
  }
}