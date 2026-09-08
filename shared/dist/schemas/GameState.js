"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.WeaponPickup = exports.Boss = exports.Enemy = exports.Player = exports.Vector3 = void 0;
const schema_1 = require("@colyseus/schema");
const index_1 = require("../types/index");
class Vector3 extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}
exports.Vector3 = Vector3;
__decorate([
    (0, schema_1.type)('number')
], Vector3.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)('number')
], Vector3.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)('number')
], Vector3.prototype, "z", void 0);
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = '';
        this.sessionId = '';
        this.color = index_1.PlayerColor.RED;
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.state = index_1.PlayerState.IDLE;
        this.health = 100;
        this.maxHealth = 100;
        this.weapon = index_1.WeaponType.FIST;
        this.isHost = false;
        this.isAlive = true;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "color", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Player.prototype, "position", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Player.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "state", void 0);
__decorate([
    (0, schema_1.type)('number')
], Player.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)('number')
], Player.prototype, "maxHealth", void 0);
__decorate([
    (0, schema_1.type)('string')
], Player.prototype, "weapon", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], Player.prototype, "isHost", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], Player.prototype, "isAlive", void 0);
class Enemy extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = '';
        this.type = index_1.EnemyType.BASIC;
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.state = index_1.EnemyState.IDLE;
        this.health = 50;
        this.maxHealth = 50;
        this.targetPlayerId = '';
    }
}
exports.Enemy = Enemy;
__decorate([
    (0, schema_1.type)('string')
], Enemy.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string')
], Enemy.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Enemy.prototype, "position", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Enemy.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)('string')
], Enemy.prototype, "state", void 0);
__decorate([
    (0, schema_1.type)('number')
], Enemy.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)('number')
], Enemy.prototype, "maxHealth", void 0);
__decorate([
    (0, schema_1.type)('string')
], Enemy.prototype, "targetPlayerId", void 0);
class Boss extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = '';
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.health = 500;
        this.maxHealth = 500;
        this.phase = index_1.BossPhase.PHASE_1;
        this.currentAttack = '';
        this.isEnraged = false;
        this.isActive = false;
    }
}
exports.Boss = Boss;
__decorate([
    (0, schema_1.type)('string')
], Boss.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Boss.prototype, "position", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], Boss.prototype, "rotation", void 0);
__decorate([
    (0, schema_1.type)('number')
], Boss.prototype, "health", void 0);
__decorate([
    (0, schema_1.type)('number')
], Boss.prototype, "maxHealth", void 0);
__decorate([
    (0, schema_1.type)('string')
], Boss.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)('string')
], Boss.prototype, "currentAttack", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], Boss.prototype, "isEnraged", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], Boss.prototype, "isActive", void 0);
class WeaponPickup extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = '';
        this.type = index_1.WeaponType.STICK;
        this.position = new Vector3();
        this.isAvailable = true;
    }
}
exports.WeaponPickup = WeaponPickup;
__decorate([
    (0, schema_1.type)('string')
], WeaponPickup.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)('string')
], WeaponPickup.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)(Vector3)
], WeaponPickup.prototype, "position", void 0);
__decorate([
    (0, schema_1.type)('boolean')
], WeaponPickup.prototype, "isAvailable", void 0);
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.phase = index_1.RoomPhase.LOBBY;
        this.players = new schema_1.MapSchema();
        this.enemies = new schema_1.MapSchema();
        this.boss = new Boss();
        this.weaponPickups = new schema_1.MapSchema();
        this.currentWave = 0;
        this.maxWaves = 5;
        this.enemiesRemaining = 0;
        this.difficulty = index_1.Difficulty.NORMAL;
        this.roomCode = '';
        this.hostId = '';
        this.elapsedTime = 0;
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)('string')
], GameState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)({ map: Player })
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: Enemy })
], GameState.prototype, "enemies", void 0);
__decorate([
    (0, schema_1.type)(Boss)
], GameState.prototype, "boss", void 0);
__decorate([
    (0, schema_1.type)({ map: WeaponPickup })
], GameState.prototype, "weaponPickups", void 0);
__decorate([
    (0, schema_1.type)('number')
], GameState.prototype, "currentWave", void 0);
__decorate([
    (0, schema_1.type)('number')
], GameState.prototype, "maxWaves", void 0);
__decorate([
    (0, schema_1.type)('number')
], GameState.prototype, "enemiesRemaining", void 0);
__decorate([
    (0, schema_1.type)('string')
], GameState.prototype, "difficulty", void 0);
__decorate([
    (0, schema_1.type)('string')
], GameState.prototype, "roomCode", void 0);
__decorate([
    (0, schema_1.type)('string')
], GameState.prototype, "hostId", void 0);
__decorate([
    (0, schema_1.type)('number')
], GameState.prototype, "elapsedTime", void 0);
//# sourceMappingURL=GameState.js.map