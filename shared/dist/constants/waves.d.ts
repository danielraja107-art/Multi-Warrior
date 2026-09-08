import { EnemyType, Difficulty } from '../types/index';
export interface WaveComposition {
    wave: number;
    name: string;
    enemies: Array<{
        type: EnemyType;
        count: number;
    }>;
    isBossWave: boolean;
}
export interface WaveBudget {
    baseBudget: number;
    budgetPerPlayer: number;
    difficultyMultiplier: Record<Difficulty, number>;
}
export declare const WAVE_BUDGET: WaveBudget;
export declare const WAVE_COST: Record<EnemyType, number>;
export declare const WAVES: WaveComposition[];
export declare const BOSS_HEALTH_BASE = 500;
export declare const BOSS_HEALTH_PER_PLAYER = 150;
export declare const REST_PERIOD_MS = 10000;
export declare const REST_HEAL_AMOUNT = 20;
export declare const SPAWN_STAGGER_MS = 500;
export declare const SPAWN_STAGGER_WINDOW_MS = 5000;
export declare const MAX_WAVES = 5;
export declare function getWaveComposition(wave: number): WaveComposition | undefined;
export declare function calculateEnemyBudget(playerCount: number, difficulty: Difficulty): number;
export declare function getBossHealth(playerCount: number): number;
//# sourceMappingURL=waves.d.ts.map