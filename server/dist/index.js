"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const colyseus_1 = require("colyseus");
const GameRoom_1 = require("./rooms/GameRoom");
const config_1 = require("./config");
const AuthRouter_1 = require("./api/AuthRouter");
const ProfileRouter_1 = require("./api/ProfileRouter");
const MatchRouter_1 = require("./api/MatchRouter");
const AchievementRouter_1 = require("./api/AchievementRouter");
const GameRoomRouter_1 = require("./api/GameRoomRouter");
const validation_1 = require("./util/validation");
const AchievementService_1 = require("./services/AchievementService");
async function main() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, cors_1.default)({
        origin: config_1.config.corsOrigin === '*' ? true : config_1.config.corsOrigin.split(','),
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '100kb' }));
    const globalLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    });
    app.use('/api', globalLimiter);
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', uptime: process.uptime() });
    });
    app.use('/api/auth', AuthRouter_1.authRouter);
    app.use('/api', GameRoomRouter_1.gameRoomRouter);
    app.use('/api', ProfileRouter_1.profileRouter);
    app.use('/api', MatchRouter_1.matchRouter);
    app.use('/api', AchievementRouter_1.achievementRouter);
    app.use(validation_1.notFoundHandler);
    app.use(validation_1.errorHandler);
    const httpServer = http_1.default.createServer(app);
    const achievements = new AchievementService_1.AchievementService();
    await achievements.ensureDefinitions();
    console.log('Achievements ensured.');
    const gameServer = new colyseus_1.Server({ server: httpServer });
    gameServer.define('game_room', GameRoom_1.GameRoom);
    httpServer.listen(config_1.config.port, () => {
        console.log(`Storm Arena server listening on http://localhost:${config_1.config.port}`);
    });
}
main();
//# sourceMappingURL=index.js.map