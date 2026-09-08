import { Server } from 'colyseus';
import { GameRoom } from './rooms/GameRoom';

async function main() {
  const PORT = Number(process.env.PORT) || 2567;

  const gameServer = new Server();

  gameServer.define('game_room', GameRoom);

  await gameServer.listen(PORT);
  console.log(`Storm Arena server listening on ws://localhost:${PORT}`);
}

main();