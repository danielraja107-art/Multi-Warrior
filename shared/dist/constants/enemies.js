"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENEMIES = void 0;
exports.getEnemyStats = getEnemyStats;
exports.getScaledHealth = getScaledHealth;
exports.getScaledDamage = getScaledDamage;
const index_1 = require("../types/index");
exports.ENEMIES = {
    [index_1.EnemyType.BASIC]: {
        type: index_1.EnemyType.BASIC,
        name: 'Basic',
        health: 50,
        damage: 10,
        speed: 3.0,
        attackRange: 1.5,
        detectionRange: 12.0,
        attackCooldown: 1500,
        knockbackResistance: 1.0,
    },
    [index_1.EnemyType.FAST]: {
        type: index_1.EnemyType.FAST,
        name: 'Fast',
        health: 35,
        damage: 8,
        speed: 5.5,
        attackRange: 1.3,
        detectionRange: 14.0,
        attackCooldown: 1000,
        knockbackResistance: 0.7,
    },
    [index_1.EnemyType.HEAVY]: {
        type: index_1.EnemyType.HEAVY,
        name: 'Heavy',
        health: 120,
        damage: 18,
        speed: 2.0,
        attackRange: 2.0,
        detectionRange: 10.0,
        attackCooldown: 2000,
        knockbackResistance: 2.0,
    },
    [index_1.EnemyType.SHIELD]: {
        type: index_1.EnemyType.SHIELD,
        name: 'Shield',
        health: 80,
        damage: 12,
        speed: 2.5,
        attackRange: 1.8,
        detectionRange: 8.0,
        attackCooldown: 1800,
        knockbackResistance: 1.5,
    },
    [index_1.EnemyType.RANGED]: {
        type: index_1.EnemyType.RANGED,
        name: 'Ranged',
        health: 40,
        damage: 12,
        speed: 2.5,
        attackRange: 10.0,
        detectionRange: 16.0,
        attackCooldown: 2000,
        knockbackResistance: 0.8,
    },
    [index_1.EnemyType.ELITE]: {
        type: index_1.EnemyType.ELITE,
        name: 'Elite',
        health: 200,
        damage: 22,
        speed: 3.5,
        attackRange: 2.2,
        detectionRange: 14.0,
        attackCooldown: 1200,
        knockbackResistance: 2.5,
    },
};
function getEnemyStats(type) {
    const stats = exports.ENEMIES[type];
    if (!stats) {
        throw new Error(`Unknown enemy type: ${type}`);
    }
    return stats;
}
function getScaledHealth(baseHealth, wave, difficultyMultiplier) {
    const waveScaling = 1 + (wave - 1) * 0.15;
    return Math.round(baseHealth * waveScaling * difficultyMultiplier);
}
function getScaledDamage(baseDamage, wave, difficultyMultiplier) {
    const waveScaling = 1 + (wave - 1) * 0.1;
    return Math.round(baseDamage * waveScaling * difficultyMultiplier);
}
//# sourceMappingURL=enemies.js.map