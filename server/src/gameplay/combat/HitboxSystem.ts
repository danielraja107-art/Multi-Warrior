import { getWeaponStats, WeaponType, WeaponProfile } from '@storm-arena/shared';
import { PositionHistory } from '../../lag/PositionHistory';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ActiveHitbox {
  attackerId: string;
  attackerPos: Vec3;
  weaponType: WeaponType;
  attackType: 'light' | 'heavy';
  startTimestamp: number;
  startTick: number;
  currentTick: number;
  hitEnemies: Set<string>;
  weaponProfile: WeaponProfile;
}

const TICK_INTERVAL_MS = 50;

export class HitboxSystem {
  private activeHitboxes: ActiveHitbox[] = [];
  private positionHistory: PositionHistory;

  constructor(positionHistory: PositionHistory) {
    this.positionHistory = positionHistory;
  }

  startAttack(
    attackerId: string,
    attackerPos: Vec3,
    weaponType: WeaponType,
    attackType: 'light' | 'heavy',
    timestamp: number,
    currentTick: number
  ): ActiveHitbox {
    const weaponProfile = getWeaponStats(weaponType);
    const activeFrames = weaponProfile.activeFrames;

    const hitbox: ActiveHitbox = {
      attackerId,
      attackerPos: { ...attackerPos },
      weaponType,
      attackType,
      startTimestamp: timestamp,
      startTick: currentTick,
      currentTick,
      hitEnemies: new Set(),
      weaponProfile,
    };

    this.activeHitboxes.push(hitbox);
    return hitbox;
  }

  update(currentTick: number, serverTime: number): void {
    this.activeHitboxes = this.activeHitboxes.filter((hb) => {
      hb.currentTick = currentTick;
      const elapsedTicks = currentTick - hb.startTick;
      return elapsedTicks < hb.weaponProfile.activeFrames;
    });
  }

  checkHits(
    attackerId: string,
    enemies: Map<string, { position: Vec3; id: string; health: number }>,
    attackerLatencyMs: number,
    serverTime: number
  ): Array<{ enemyId: string; hitPosition: Vec3 }> {
    const results: Array<{ enemyId: string; hitPosition: Vec3 }> = [];

    for (const hb of this.activeHitboxes) {
      if (hb.attackerId !== attackerId) continue;

      for (const [enemyId, enemy] of enemies) {
        if (hb.hitEnemies.has(enemyId)) continue;

        const targetTimestamp = hb.startTimestamp - attackerLatencyMs;
        const snapshot = this.positionHistory.getSnapshotAt(`enemy-${enemyId}`, targetTimestamp);

        const checkPos = snapshot ? snapshot.position : enemy.position;
        const hit = this.checkHitboxOverlap(hb, checkPos);

        if (hit) {
          hb.hitEnemies.add(enemyId);
          results.push({ enemyId, hitPosition: checkPos });
        }
      }
    }

    return results;
  }

  private checkHitboxOverlap(hb: ActiveHitbox, enemyPos: Vec3): boolean {
    const { weaponProfile, attackerPos } = hb;
    const radius = weaponProfile.hitboxType === 'sphere' ? weaponProfile.hitboxRadius : 1.0;
    const dx = enemyPos.x - attackerPos.x;
    const dz = enemyPos.z - attackerPos.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= radius * radius;
  }

  clearAttackerHitboxes(attackerId: string): void {
    this.activeHitboxes = this.activeHitboxes.filter((hb) => hb.attackerId !== attackerId);
  }

  getActiveHitboxes(): ReadonlyArray<ActiveHitbox> {
    return this.activeHitboxes;
  }
}