export declare const PLAYER_SPEED = 5;
export declare const MOVEMENT_BOUNDARY = 20;
export declare const MAX_STORED_INPUTS_PER_PLAYER = 64;
export interface MovementInput {
    direction: {
        x: number;
        y: number;
        z: number;
    };
    rotation?: {
        x: number;
        y: number;
        z?: number;
    };
    timestamp: number;
}
export interface Rotation {
    x: number;
    y: number;
    z: number;
}
export interface MovementUpdate {
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    rotation: Rotation | null;
    hasInput: boolean;
}
export declare class MovementSystem {
    private inputQueues;
    private velocities;
    private rotations;
    private lastTimestamp;
    enqueueInput(sessionId: string, input: MovementInput): boolean;
    private drainQueue;
    update(sessionId: string, deltaTimeMs: number): MovementUpdate;
    clear(sessionId: string): void;
    clearAll(): void;
}
//# sourceMappingURL=MovementSystem.d.ts.map