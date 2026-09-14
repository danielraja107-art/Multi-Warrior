import { Boss, Player, AttackType, WeaponType } from '@storm-arena/shared';
import { BossAI } from './BossAI';

const WEAPON_DAMAGE: Record<string, { light: number; heavy: number }> = {
  [WeaponType.FIST]: { light: 8, heavy: 15 },
  [WeaponType.STICK]: { light: 10, heavy: 18 },
  [WeaponType.BASEBALL_BAT]: { light: 14, heavy: 24 },
  [WeaponType.AXE]: { light: 16, heavy: 28 },
  [WeaponType.HAMMER]: { light: 12, heavy: 32 },
  [WeaponType.ROCK]: { light: 6, heavy: 10 },
};

const ATTACK_RANGE = 3.0;
const HEAVY_ATTACK_RANGE = 3.5;

export interface DamageResult {
  targetId: string;
  damage: number;
  isDead: boolean;
  knockbackX: number;
  knockbackZ: number;
}

export interface BossDamageResult {
  damage: number;
  isDead: boolean;
  knockbackX: number;
  knockbackZ: number;
}

export class CombatSystem {
  private hitCooldowns: Map<string, number> = new Map();
  private bossHitCooldown = 0;
  private damageLog: Map<string, number> = new Map();

  handlePlayerAttack(
    attacker: Player,
    attackType: AttackType,
    weapon: WeaponType,
    boss: Boss,
    bossAI: BossAI | null,
    now: number,
  ): BossDamageResult | null {
    if (!boss.isActive || boss.health <= 0) return null;
    if (!bossAI) return null;

    const cooldownKey = `${attacker.sessionId}_boss`;
    const lastHit = this.hitCooldowns.get(cooldownKey) ?? 0;
    if (now - lastHit < 400) return null;

    const dx = boss.position.x - attacker.position.x;
    const dz = boss.position.z - attacker.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const range = attackType === AttackType.HEAVY ? HEAVY_ATTACK_RANGE : ATTACK_RANGE;
    if (dist > range) return null;

    const weaponDmg = WEAPON_DAMAGE[weapon] ?? WEAPON_DAMAGE[WeaponType.FIST];
    const baseDamage = attackType === AttackType.HEAVY ? weaponDmg.heavy : weaponDmg.light;

    const damage = Math.round(baseDamage * (0.9 + Math.random() * 0.2));

    boss.health = Math.max(0, boss.health - damage);
    this.hitCooldowns.set(cooldownKey, now);

    const prevDmg = this.damageLog.get(attacker.sessionId) ?? 0;
    this.damageLog.set(attacker.sessionId, prevDmg + damage);

    const knockbackX = dx / (dist || 1) * 2;
    const knockbackZ = dz / (dist || 1) * 2;

    return {
      damage,
      isDead: boss.health <= 0,
      knockbackX,
      knockbackZ,
    };
  }

  handleBossAttackPlayers(
    boss: Boss,
    bossAI: BossAI,
    players: Map<string, Player>,
    now: number,
  ): DamageResult[] {
    const results: DamageResult[] = [];

    const hitbox = bossAI.getAttackHitbox();
    if (!hitbox) return results;

    const cooldownKey = 'boss_aoe';
    const lastHit = this.hitCooldowns.get(cooldownKey) ?? 0;
    const cooldown = boss.currentAttack === 'charge' ? 600 : 800;
    if (now - lastHit < cooldown) return results;

    this.hitCooldowns.set(cooldownKey, now);

    players.forEach((player, id) => {
      if (!player.isAlive) return;

      const dx = player.position.x - hitbox.x;
      const dz = player.position.z - hitbox.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > hitbox.radius) return;

      const damage = Math.round(hitbox.damage * (0.85 + Math.random() * 0.3));

      player.health = Math.max(0, player.health - damage);

      const kbX = dist > 0.01 ? (dx / dist) * 3 : 0;
      const kbZ = dist > 0.01 ? (dz / dist) * 3 : 0;

      results.push({
        targetId: id,
        damage,
        isDead: player.health <= 0,
        knockbackX: kbX,
        knockbackZ: kbZ,
      });
    });

    return results;
  }

  resetDamageLog(): Map<string, number> {
    const log = new Map(this.damageLog);
    this.damageLog.clear();
    return log;
  }

  reset(): void {
    this.hitCooldowns.clear();
    this.bossHitCooldown = 0;
    this.damageLog.clear();
  }
}
