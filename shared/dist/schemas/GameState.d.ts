import { Schema, MapSchema } from '@colyseus/schema';
export declare class Vector3 extends Schema {
    x: number;
    y: number;
    z: number;
}
export declare class Player extends Schema {
    id: string;
    sessionId: string;
    color: string;
    position: Vector3;
    rotation: Vector3;
    state: string;
    health: number;
    maxHealth: number;
    weapon: string;
    isHost: boolean;
    isAlive: boolean;
}
export declare class Enemy extends Schema {
    id: string;
    type: string;
    position: Vector3;
    rotation: Vector3;
    state: string;
    health: number;
    maxHealth: number;
    targetPlayerId: string;
}
export declare class Boss extends Schema {
    id: string;
    position: Vector3;
    rotation: Vector3;
    health: number;
    maxHealth: number;
    phase: string;
    currentAttack: string;
    isEnraged: boolean;
    isActive: boolean;
}
export declare class WeaponPickup extends Schema {
    id: string;
    type: string;
    position: Vector3;
    isAvailable: boolean;
}
export declare class GameState extends Schema {
    phase: string;
    players: MapSchema<Player>;
    enemies: MapSchema<Enemy>;
    boss: Boss;
    weaponPickups: MapSchema<WeaponPickup>;
    currentWave: number;
    maxWaves: number;
    enemiesRemaining: number;
    difficulty: string;
    roomCode: string;
    hostId: string;
    elapsedTime: number;
}
//# sourceMappingURL=GameState.d.ts.map