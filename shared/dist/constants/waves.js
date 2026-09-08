"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_WAVES = exports.SPAWN_STAGGER_WINDOW_MS = exports.SPAWN_STAGGER_MS = exports.REST_HEAL_AMOUNT = exports.REST_PERIOD_MS = exports.BOSS_HEALTH_PER_PLAYER = exports.BOSS_HEALTH_BASE = exports.WAVES = exports.WAVE_COST = exports.WAVE_BUDGET = void 0;
exports.getWaveComposition = getWaveComposition;
exports.calculateEnemyBudget = calculateEnemyBudget;
exports.getBossHealth = getBossHealth;
const index_1 = require("../types/index");
exports.WAVE_BUDGET = {
    baseBudget: 100,
    budgetPerPlayer: 25,
    difficultyMultiplier: {
        [index_1.Difficulty.EASY]: 0.7,
        [index_1.Difficulty.NORMAL]: 1.0,
        [index_1.Difficulty.HARD]: 1.4,
    },
};
exports.WAVE_COST = {
    [index_1.EnemyType.BASIC]: 10,
    [index_1.EnemyType.FAST]: 12,
    [index_1.EnemyType.HEAVY]: 20,
    [index_1.EnemyType.SHIELD]: 18,
    [index_1.EnemyType.RANGED]: 15,
    [index_1.EnemyType.ELITE]: 30,
};
exports.WAVES = [
    {
        wave: 1,
        name: 'The Awakening',
        enemies: [
            { type: index_1.EnemyType.BASIC, count: 4 },
            { type: index_1.EnemyType.FAST, count: 1 },
        ],
        isBossWave: false,
    },
    {
        wave: 2,
        name: 'Growing Threat',
        enemies: [
            { type: index_1.EnemyType.BASIC, count: 4 },
            { type: index_1.EnemyType.FAST, count: 2 },
            { type: index_1.EnemyType.HEAVY, count: 1 },
        ],
        isBossWave: false,
    },
    {
        wave: 3,
        name: 'The Siege',
        enemies: [
            { type: index_1.EnemyType.BASIC, count: 3 },
            { type: index_1.EnemyType.FAST, count: 3 },
            { type: index_1.EnemyType.HEAVY, count: 2 },
            { type: index_1.EnemyType.RANGED, count: 2 },
        ],
        isBossWave: false,
    },
    {
        wave: 4,
        name: 'Elite Assault',
        enemies: [
            { type: index_1.EnemyType.ELITE, count: 2 },
            { type: index_1.EnemyType.HEAVY, count: 3 },
            { type: index_1.EnemyType.RANGED, count: 3 },
            { type: index_1.EnemyType.SHIELD, count: 2 },
        ],
        isBossWave: false,
    },
    {
        wave: 5,
        name: 'The Boss',
        enemies: [],
        isBossWave: true,
    },
];
exports.BOSS_HEALTH_BASE = 500;
exports.BOSS_HEALTH_PER_PLAYER = 150;
exports.REST_PERIOD_MS = 10000;
exports.REST_HEAL_AMOUNT = 20;
exports.SPAWN_STAGGER_MS = 500;
exports.SPAWN_STAGGER_WINDOW_MS = 5000;
exports.MAX_WAVES = 5;
function getWaveComposition(wave) {
    return exports.WAVES.find((w) => w.wave === wave);
}
function calculateEnemyBudget(playerCount, difficulty) {
    const budget = exports.WAVE_BUDGET.baseBudget + exports.WAVE_BUDGET.budgetPerPlayer * (playerCount - 1);
    const multiplier = exports.WAVE_BUDGET.difficultyMultiplier[difficulty] ?? 1.0;
    return Math.round(budget * multiplier);
}
function getBossHealth(playerCount) {
    return exports.BOSS_HEALTH_BASE + exports.BOSS_HEALTH_PER_PLAYER * (playerCount - 1);
}
//# sourceMappingURL=waves.js.map