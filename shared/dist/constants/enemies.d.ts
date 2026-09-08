import { EnemyType } from '../types/index';
export interface EnemyStats {
    type: EnemyType;
    name: string;
    health: number;
    damage: number;
    speed: number;
    attackRange: number;
    detectionRange: number;
    attackCooldown: number;
    knockbackResistance: number;
}
export declare const ENEMIES: Record<EnemyType, EnemyStats>;
export declare function getEnemyStats(type: EnemyType): EnemyStats;
export declare function getScaledHealth(baseHealth: number, wave: number, difficultyMultiplier: number): number;
export declare function getScaledDamage(baseDamage: number, wave: number, difficultyMultiplier: number): number;
//# sourceMappingURL=enemies.d.ts.map