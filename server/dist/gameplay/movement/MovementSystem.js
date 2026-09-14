"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementSystem = exports.MAX_STORED_INPUTS_PER_PLAYER = exports.MOVEMENT_BOUNDARY = exports.PLAYER_SPEED = void 0;
exports.PLAYER_SPEED = 5.0;
exports.MOVEMENT_BOUNDARY = 20;
exports.MAX_STORED_INPUTS_PER_PLAYER = 64;
class MovementSystem {
    constructor() {
        this.inputQueues = new Map();
        this.velocities = new Map();
        this.rotations = new Map();
        this.lastTimestamp = new Map();
    }
    enqueueInput(sessionId, input) {
        const lastTs = this.lastTimestamp.get(sessionId);
        if (lastTs !== undefined && input.timestamp <= lastTs) {
            return false;
        }
        this.lastTimestamp.set(sessionId, input.timestamp);
        const queue = this.inputQueues.get(sessionId) ?? [];
        queue.push(input);
        if (queue.length > exports.MAX_STORED_INPUTS_PER_PLAYER) {
            queue.shift();
        }
        this.inputQueues.set(sessionId, queue);
        return true;
    }
    drainQueue(sessionId) {
        const queue = this.inputQueues.get(sessionId) ?? [];
        this.inputQueues.delete(sessionId);
        return queue;
    }
    update(sessionId, deltaTimeMs) {
        const inputs = this.drainQueue(sessionId);
        if (inputs.length > 0) {
            const last = inputs[inputs.length - 1];
            this.velocities.set(sessionId, { ...last.direction });
            if (last.rotation) {
                this.rotations.set(sessionId, { ...last.rotation, z: last.rotation.z ?? 0 });
            }
        }
        const velocity = this.velocities.get(sessionId) ?? { x: 0, y: 0, z: 0 };
        const rotation = this.rotations.get(sessionId) ?? null;
        const hasInput = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01 || Math.abs(velocity.z) > 0.01;
        return { velocity, rotation, hasInput };
    }
    clear(sessionId) {
        this.inputQueues.delete(sessionId);
        this.velocities.delete(sessionId);
        this.rotations.delete(sessionId);
        this.lastTimestamp.delete(sessionId);
    }
    clearAll() {
        this.inputQueues.clear();
        this.velocities.clear();
        this.rotations.clear();
        this.lastTimestamp.clear();
    }
}
exports.MovementSystem = MovementSystem;
//# sourceMappingURL=MovementSystem.js.map