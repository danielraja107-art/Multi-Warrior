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
const database_1 = require("@storm-arena/database");
const config_1 = require("./config");
const AuthRouter_1 = require("./api/AuthRouter");
const ProfileRouter_1 = require("./api/ProfileRouter");
const MatchRouter_1 = require("./api/MatchRouter");
const AchievementRouter_1 = require("./api/AchievementRouter");
const GameRoomRouter_1 = require("./api/GameRoomRouter");
const validation_1 = require("./util/validation");
const AchievementService_1 = require("./services/AchievementService");
const logger_1 = require("./util/logger");
process.on('uncaughtException', (err) => {
    logger_1.logger.error('process', 'uncaughtException', { name: err.name, message: err.message, stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('process', 'unhandledRejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
    });
});
async function databaseStatus() {
    const started = Date.now();
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return { ok: true, latencyMs: Date.now() - started };
    }
    catch (err) {
        logger_1.logger.error('db', 'database health check failed', { message: String(err) });
        return { ok: false, latencyMs: Date.now() - started };
    }
}
async function main() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, cors_1.default)({
        origin: config_1.config.corsOrigin === '*' ? true : config_1.config.corsOrigin.split(','),
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '100kb' }));
    app.use('/api', (req, res, next) => {
        const started = Date.now();
        res.on('finish', () => {
            logger_1.logger.info('http', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
                durationMs: Date.now() - started,
            });
        });
        next();
    });
    const globalLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    });
    app.use('/api', globalLimiter);
    app.get('/health', async (_req, res) => {
        const db = await databaseStatus();
        res.header('Cache-Control', 'no-store');
        res.json({
            status: db.ok ? 'ok' : 'degraded',
            uptime: process.uptime(),
            database: db,
        });
    });
    app.post('/api/log/client-error', globalLimiter, (req, res) => {
        const body = (req.body ?? {});
        if (!body.message || typeof body.message !== 'string' || body.message.length === 0) {
            return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'message is required.' } });
        }
        logger_1.logger.warn('client', String(body.message).slice(0, 1000), {
            code: typeof body.code === 'string' ? body.code : undefined,
            location: typeof body.location === 'string' ? body.location.slice(0, 500) : undefined,
        });
        return res.json({ ok: true });
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
    logger_1.logger.info('startup', 'Achievements ensured.');
    const dbBoot = await databaseStatus();
    logger_1.logger[dbBoot.ok ? 'info' : 'error']('startup', dbBoot.ok ? 'Database connection established.' : 'Database connection FAILED.', dbBoot);
    const gameServer = new colyseus_1.Server({ server: httpServer });
    gameServer.define('game_room', GameRoom_1.GameRoom);
    httpServer.listen(config_1.config.port, () => {
        logger_1.logger.info('startup', `Storm Arena server listening on http://localhost:${config_1.config.port}`);
    });
}
main().catch((err) => {
    logger_1.logger.error('startup', 'Server failed to start', {
        name: err instanceof Error ? err.name : undefined,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
});
//# sourceMappingURL=index.js.map