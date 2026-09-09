import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom.js';
import { createRoom, joinRoom, leaveRoom, startGame } from '../../client/src/network/socket';
import { check, fresh, until, startGameServer, leaveAll, finish, sleep, resetFailures } from './helpers';

const PORT = 2561;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

async function main() {
  resetFailures();
  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log('listening', PORT);
  const raw = new Client(`ws://localhost:${PORT}`);

  const r1 = await createRoom('easy');
  const f1 = await raw.joinById(r1.roomId, {});
  const f2 = await raw.joinById(r1.roomId, {});
  const f3 = await raw.joinById(r1.roomId, {});
  await until(() => Object.keys(fresh().lobby.players).length === 4, 'lobby 4');
  startGame();
  await until(() => fresh().gameState?.phase === 'game', 'phase game');

  await leaveRoom();
  await sleep(400);
  console.log('leaving fillers...');
  await leaveAll([f1, f2, f3]);

  console.log('creating room3...');
  const room3 = await raw.create('game_room', { difficulty: 'normal' });
  await sleep(500);
  console.log('room3 code:', JSON.stringify(room3.state.roomCode), 'roomId:', room3.roomId);

  console.log('joining via network module...');
  const joined = await joinRoom(room3.state.roomCode);
  console.log('joined roomId:', (joined as any).roomId);
  await sleep(500);
  console.log('store lobby players:', JSON.stringify(Object.keys(fresh().lobby.players)), 'conn:', fresh().connection.status);

  console.log('joining guests...');
  const g2 = await raw.joinById(room3.roomId, {});
  console.log('g2 in, lobby:', JSON.stringify(Object.keys(fresh().lobby.players)));
  await raw.joinById(room3.roomId, {});
  await sleep(700);
  console.log('after 3rd add, lobby:', JSON.stringify(Object.keys(fresh().lobby.players)));

  await leaveAll([joined, g2, room3, f1, f2, f3, r1]);
  finish('DEBUG');
}

setTimeout(finish, 20000, 'DEBUG').unref();
main().catch((e) => { console.error('exception:', e); process.exit(1); });