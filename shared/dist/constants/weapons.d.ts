import { WeaponType, AttackType } from '../types/index';
export interface WeaponProfile {
    type: WeaponType;
    name: string;
    damage: number;
    knockback: number;
    cooldown: number;
    activeFrames: number;
    hitboxType: 'sphere' | 'box';
    hitboxRadius: number;
    hitboxLength: number;
    lightMultiplier: number;
    heavyMultiplier: number;
    isProjectile: boolean;
    throwable: boolean;
}
export declare const WEAPONS: Record<WeaponType, WeaponProfile>;
export declare function getWeaponStats(type: WeaponType): WeaponProfile;
export declare function calculateDamage(weaponType: WeaponType, attackType: AttackType): number;
export declare function calculateKnockback(weaponType: WeaponType, attackType: AttackType): number;
//# sourceMappingURL=weapons.d.ts.map