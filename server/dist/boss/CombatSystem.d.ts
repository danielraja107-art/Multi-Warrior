import { Boss, Player, AttackType, WeaponType } from '@storm-arena/shared';
import { BossAI } from './BossAI';
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
export declare class CombatSystem {
    private hitCooldowns;
    private bossHitCooldown;
    private damageLog;
    handlePlayerAttack(attacker: Player, attackType: AttackType, weapon: WeaponType, boss: Boss, bossAI: BossAI | null, now: number): BossDamageResult | null;
    handleBossAttackPlayers(boss: Boss, bossAI: BossAI, players: Map<string, Player>, now: number): DamageResult[];
    resetDamageLog(): Map<string, number>;
    reset(): void;
}
//# sourceMappingURL=CombatSystem.d.ts.map