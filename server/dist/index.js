"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const GameRoom_1 = require("./rooms/GameRoom");
async function main() {
    const PORT = Number(process.env.PORT) || 2567;
    const gameServer = new colyseus_1.Server();
    gameServer.define('game_room', GameRoom_1.GameRoom);
    await gameServer.listen(PORT);
    console.log(`Storm Arena server listening on ws://localhost:${PORT}`);
}
main();
//# sourceMappingURL=index.js.map