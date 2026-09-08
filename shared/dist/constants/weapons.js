"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEAPONS = void 0;
exports.getWeaponStats = getWeaponStats;
exports.calculateDamage = calculateDamage;
exports.calculateKnockback = calculateKnockback;
const index_1 = require("../types/index");
exports.WEAPONS = {
    [index_1.WeaponType.FIST]: {
        type: index_1.WeaponType.FIST,
        name: 'Fist',
        damage: 10,
        knockback: 5,
        cooldown: 300,
        activeFrames: 3,
        hitboxType: 'sphere',
        hitboxRadius: 1.5,
        hitboxLength: 0,
        lightMultiplier: 1.0,
        heavyMultiplier: 1.5,
        isProjectile: false,
        throwable: false,
    },
    [index_1.WeaponType.STICK]: {
        type: index_1.WeaponType.STICK,
        name: 'Stick',
        damage: 15,
        knockback: 8,
        cooldown: 400,
        activeFrames: 4,
        hitboxType: 'box',
        hitboxRadius: 2.0,
        hitboxLength: 2.5,
        lightMultiplier: 1.0,
        heavyMultiplier: 1.6,
        isProjectile: false,
        throwable: true,
    },
    [index_1.WeaponType.BASEBALL_BAT]: {
        type: index_1.WeaponType.BASEBALL_BAT,
        name: 'Baseball Bat',
        damage: 20,
        knockback: 12,
        cooldown: 500,
        activeFrames: 5,
        hitboxType: 'box',
        hitboxRadius: 2.2,
        hitboxLength: 3.0,
        lightMultiplier: 1.0,
        heavyMultiplier: 1.8,
        isProjectile: false,
        throwable: false,
    },
    [index_1.WeaponType.AXE]: {
        type: index_1.WeaponType.AXE,
        name: 'Axe',
        damage: 25,
        knockback: 10,
        cooldown: 600,
        activeFrames: 5,
        hitboxType: 'box',
        hitboxRadius: 2.0,
        hitboxLength: 2.8,
        lightMultiplier: 1.0,
        heavyMultiplier: 2.0,
        isProjectile: false,
        throwable: true,
    },
    [index_1.WeaponType.HAMMER]: {
        type: index_1.WeaponType.HAMMER,
        name: 'Hammer',
        damage: 30,
        knockback: 15,
        cooldown: 800,
        activeFrames: 6,
        hitboxType: 'sphere',
        hitboxRadius: 2.5,
        hitboxLength: 0,
        lightMultiplier: 1.0,
        heavyMultiplier: 2.2,
        isProjectile: false,
        throwable: false,
    },
    [index_1.WeaponType.ROCK]: {
        type: index_1.WeaponType.ROCK,
        name: 'Rock',
        damage: 12,
        knockback: 6,
        cooldown: 200,
        activeFrames: 2,
        hitboxType: 'sphere',
        hitboxRadius: 0.8,
        hitboxLength: 0,
        lightMultiplier: 1.0,
        heavyMultiplier: 1.0,
        isProjectile: true,
        throwable: true,
    },
};
function getWeaponStats(type) {
    const weapon = exports.WEAPONS[type];
    if (!weapon) {
        throw new Error(`Unknown weapon type: ${type}`);
    }
    return weapon;
}
function calculateDamage(weaponType, attackType) {
    const weapon = getWeaponStats(weaponType);
    const multiplier = attackType === index_1.AttackType.HEAVY ? weapon.heavyMultiplier : weapon.lightMultiplier;
    return Math.round(weapon.damage * multiplier);
}
function calculateKnockback(weaponType, attackType) {
    const weapon = getWeaponStats(weaponType);
    const multiplier = attackType === index_1.AttackType.HEAVY ? 1.5 : 1.0;
    return Math.round(weapon.knockback * multiplier);
}
//# sourceMappingURL=weapons.js.map