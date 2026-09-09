process.env.STORM_RECONNECT_TIMEOUT_MS = '5000';

import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { RoomPhase, ConnectionStatus } from '@storm-arena/shared';
import {
  createRoom,
  joinRoom,
  startGame,
  reconnect,
  getCurrentRoom,
  RoomError,
} from '../../client/src/network/socket';
import {
  resetFailures,
  check,
  fresh,
  until,
  startGameServer,
  leaveAll,
  finish,
  sleep,
} from './helpers';

const PORT = 2565;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

const title = 'RECONNECTION UI';

function serverRoom(roomId: string) {
  try {
    return matchMaker.getRoomById(roomId) as { state: { players: { size: number } } } | undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  resetFailures();
  const { GameRoom } = await import('../src/rooms/GameRoom.js');

  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);
  console.log('reconnect window is 5000ms (STORM_RECONNECT_TIMEOUT_MS)');

  const raw = new Client(`ws://localhost:${PORT}`);

  // -------------------------------------------------------------------------
  // Lobby disconnect is permanent (player removed, no reconnection)
  // -------------------------------------------------------------------------
  console.log('\n[disconnect in lobby]');
  const hostRoom = await createRoom('easy');
  const guest = await raw.joinById(hostRoom.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    'lobby reaches 2 players',
  );

  check(serverRoom(hostRoom.roomId)!.state.players.size === 2, 'two players in room before disconnect');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    'unexpected leave enters reconnecting state',
  );
  check(fresh().connection.roomId === null, 'connection cleared after unexpected leave');
  check(
    serverRoom(hostRoom.roomId)!.state.players.size === 1,
    'lobby disconnect removes the player from the server',
  );

  // -------------------------------------------------------------------------
  // In-game disconnect + reconnect within window
  // -------------------------------------------------------------------------
  console.log('\n[reconnect within window]');
  await raw.joinById(hostRoom.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    'lobby reaches 2 players again',
  );
  if (fresh().lobby.hostId !== fresh().localPlayerId) {
    raw.send('HOST_START', {});
  } else {
    startGame();
  }
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, 'phase transitions to GAME');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    'disconnect during game enters reconnecting state',
  );
  check(
    serverRoom(hostRoom.roomId)!.state.players.size === 1,
    'player kept in room during reconnection window',
  );

  const restored = await reconnect();
  check(Boolean(restored), 'reconnect() restored a live room');
  await until(
    () =>
      fresh().connection.status === ConnectionStatus.CONNECTED &&
      Object.keys(fresh().lobby.players).length === 2 &&
      fresh().gameState?.phase === RoomPhase.GAME,
    'game state restored after reconnect',
  );
  check(fresh().connection.status === ConnectionStatus.CONNECTED, 'connection reports connected after reconnect');
  check(Object.keys(fresh().lobby.players).length === 2, 'player slots restored after reconnect');
  check(fresh().gameState?.phase === RoomPhase.GAME, 'game phase preserved after reconnect');

  // -------------------------------------------------------------------------
  // Reconnect after the window expired (server removes the player)
  // -------------------------------------------------------------------------
  console.log('\n[reconnect after window expiry]');
  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    'second disconnect enters reconnecting state',
  );
  await until(
    () => serverRoom(hostRoom.roomId)!.state.players.size === 1,
    'server removes player after reconnect window expires',
    12000,
  );

  let failed = false;
  try {
    await reconnect();
  } catch (err) {
    failed = err instanceof RoomError;
  }
  check(failed, 'reconnect after window expiry is rejected');
  check(
    fresh().connection.status === ConnectionStatus.DISCONNECTED,
    'connection returns to disconnected after failed reconnect',
  );

  // -------------------------------------------------------------------------
  // Room destroyed when the last player leaves
  // -------------------------------------------------------------------------
  console.log('\n[room destroyed handling]');
  const guestLast = await raw.joinById(hostRoom.roomId, {});
  await sleep(400);
  await guestLast.leave();
  await until(() => !serverRoom(hostRoom.roomId), 'room destroyed when empty');
  check(true, 'empty room is disposed by the server');

  await leaveAll([hostRoom, guest]);
  finish(title);
}

// safety net: never hang the test run
setTimeout(finish, 45000, title).unref();

main().catch((err) => {
  console.error('RECONNECTION UI TEST FAILED (exception):', err);
  process.exit(1);
});