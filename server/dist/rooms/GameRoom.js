"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const colyseus_1 = require("colyseus");
const shared_1 = require("@storm-arena/shared");
const shared_2 = require("@storm-arena/shared");
const shared_3 = require("@storm-arena/shared");
const PLAYER_COLORS = [
    shared_2.PlayerColor.RED,
    shared_2.PlayerColor.BLUE,
    shared_2.PlayerColor.GREEN,
    shared_2.PlayerColor.YELLOW,
];
const MAX_PLAYERS = 4;
const TICK_INTERVAL_MS = 50;
const RECONNECT_TIMEOUT_MS = 30000;
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
class GameRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = MAX_PLAYERS;
        this.velocities = new Map();
    }
    onCreate(options) {
        this.setState(new shared_1.GameState());
        this.state.roomCode = generateRoomCode();
        this.state.phase = shared_2.RoomPhase.LOBBY;
        this.state.difficulty = options.difficulty ?? shared_2.Difficulty.NORMAL;
        this.state.maxWaves = 5;
        this.setMetadata({ code: this.state.roomCode });
        this.setSimulationInterval((deltaTime) => {
            this.serverTick(deltaTime);
        }, TICK_INTERVAL_MS);
        this.onMessage(shared_3.MESSAGE_CLIENT.PLAYER_MOVE, (client, payload) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isAlive)
                return;
            const { x, y, z } = payload.direction;
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
                return;
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            if (magnitude > 1.01)
                return;
            this.velocities.set(client.sessionId, { x, y, z });
            if (payload.rotation) {
                player.rotation.x = payload.rotation.x;
                player.rotation.y = payload.rotation.y;
            }
        });
        this.onMessage(shared_3.MESSAGE_CLIENT.HOST_START, (client) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isHost)
                return;
            if (this.state.phase !== shared_2.RoomPhase.LOBBY)
                return;
            const playerCount = this.state.players.size;
            if (playerCount < 2)
                return;
            this.state.phase = shared_2.RoomPhase.GAME;
        });
        this.onMessage(shared_3.MESSAGE_CLIENT.HOST_CHANGE_DIFFICULTY, (client, payload) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isHost)
                return;
            if (this.state.phase !== shared_2.RoomPhase.LOBBY)
                return;
            const validDifficulties = [shared_2.Difficulty.EASY, shared_2.Difficulty.NORMAL, shared_2.Difficulty.HARD];
            if (validDifficulties.includes(payload.difficulty)) {
                this.state.difficulty = payload.difficulty;
            }
        });
    }
    onJoin(client) {
        const playerCount = this.state.players.size;
        const colorIndex = playerCount % PLAYER_COLORS.length;
        const color = PLAYER_COLORS[colorIndex];
        const player = new shared_1.Player();
        player.id = client.sessionId;
        player.sessionId = client.sessionId;
        player.color = color;
        player.health = 100;
        player.maxHealth = 100;
        player.weapon = shared_2.WeaponType.FIST;
        player.isHost = playerCount === 0;
        player.isAlive = true;
        player.state = shared_2.PlayerState.IDLE;
        player.position.x = -5 + playerCount * 3;
        player.position.y = 0;
        player.position.z = 0;
        this.velocities.set(client.sessionId, { x: 0, y: 0, z: 0 });
        this.state.players.set(client.sessionId, player);
        if (player.isHost) {
            this.state.hostId = player.id;
        }
    }
    onLeave(client, consented) {
        if (this.state.phase === shared_2.RoomPhase.LOBBY) {
            this.state.players.delete(client.sessionId);
            this.velocities.delete(client.sessionId);
            if (this.state.players.size > 0) {
                const firstEntry = this.state.players.entries().next().value;
                if (firstEntry) {
                    firstEntry[1].isHost = true;
                    this.state.hostId = firstEntry[1].id;
                }
            }
        }
        else {
            this.allowReconnection(client, RECONNECT_TIMEOUT_MS)
                .then(() => {
                const player = this.state.players.get(client.sessionId);
                if (player) {
                    player.sessionId = client.sessionId;
                }
            })
                .catch(() => {
                this.state.players.delete(client.sessionId);
                this.velocities.delete(client.sessionId);
                if (this.state.players.size === 0) {
                    this.disconnect();
                }
            });
        }
    }
    onDispose() {
        this.state.players.clear();
        this.state.enemies.clear();
        this.state.weaponPickups.clear();
        this.velocities.clear();
    }
    serverTick(deltaTime) {
        if (this.state.phase !== shared_2.RoomPhase.GAME)
            return;
        this.state.elapsedTime += deltaTime;
        this.state.players.forEach((player) => {
            if (!player.isAlive)
                return;
            const vel = this.velocities.get(player.sessionId);
            if (!vel)
                return;
            const speed = 5.0;
            const dt = deltaTime / 1000;
            player.position.x += vel.x * speed * dt;
            player.position.y += vel.y * speed * dt;
            player.position.z += vel.z * speed * dt;
            const boundary = 20;
            player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
            player.position.y = Math.max(-boundary, Math.min(boundary, player.position.y));
            player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));
            const hasInput = Math.abs(vel.x) > 0.01 || Math.abs(vel.y) > 0.01 || Math.abs(vel.z) > 0.01;
            player.state = hasInput ? shared_2.PlayerState.RUNNING : shared_2.PlayerState.IDLE;
        });
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=GameRoom.js.map