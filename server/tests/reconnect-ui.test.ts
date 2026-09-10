process.env.STORM_RECONNECT_TIMEOUT_MS = '5000';

import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { RoomPhase, ConnectionStatus } from '@storm-arena/shared';
import {
  createRoom,
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

interface ServerRoomLike {
  state: {
    players: {
      size: number;
      forEach: (cb: (p: any) => void) => void;
    };
    phase: string;
  };
}

function serverRoom(roomId: string): ServerRoomLike | undefined {
  try {
    return matchMaker.getRoomById(roomId) as unknown as ServerRoomLike;
  } catch {
    return undefined;
  }
}

function findPlayer(room: ServerRoomLike, sessionId: string) {
  let found: any = undefined;
  room.state.players.forEach((p) => {
    if (p.sessionId === sessionId) found = p;
  });
  return found;
}

function countHostees(room: ServerRoomLike): any[] {
  const hosts: any[] = [];
  room.state.players.forEach((p) => {
    if (p.isHost) hosts.push(p);
  });
  return hosts;
}

function serverPosition(room: ServerRoomLike, sessionId: string) {
  const p = findPlayer(room, sessionId);
  return p ? { x: p.position.x, y: p.position.y, z: p.position.z } : null;
}

async function main() {
  resetFailures();
  const { GameRoom } = await import('../src/rooms/GameRoom.js');

  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);
  console.log('reconnect window is 5000ms (STORM_RECONNECT_TIMEOUT_MS)');

  const raw = new Client(`ws://localhost:${PORT}`);

  // -------------------------------------------------------------------------
  // Lobby disconnect is permanent (player removed, host authority re-assigned)
  // -------------------------------------------------------------------------
  console.log('\n[lobby disconnect is permanent]');
  const lobbyRoom = await createRoom('easy');
  const lobbyGuest = await raw.joinById(lobbyRoom.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 2,
    'lobby reaches 2 players',
  );
  check(serverRoom(lobbyRoom.roomId)!.state.players.size === 2, 'two players before lobby disconnect');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => serverRoom(lobbyRoom.roomId)!.state.players.size === 1,
    'server removes lobby-leaver immediately',
  );
  check(
    serverRoom(lobbyRoom.roomId)!.state.players.size === 1,
    'lobby disconnect removes the player permanently (no seat held)',
  );
  check(
    fresh().connection.status === ConnectionStatus.RECONNECTING,
    'unexpected leave enters reconnecting client state',
  );
  check(
    countHostees(serverRoom(lobbyRoom.roomId)!).length === 1,
    'host authority re-assigned to a remaining player',
  );
  await sleep(300);

  // -------------------------------------------------------------------------
  // In-game disconnect holds the slot for the reconnect window
  // -------------------------------------------------------------------------
  console.log('\n[in-game disconnect holds slot and freezes player]');
  const gameRoom = await createRoom('normal');
  const gameGuest = await raw.joinById(gameRoom.roomId, {});
  await until(
    () => serverRoom(gameRoom.roomId)!.state.players.size === 2,
    'game room reaches 2 players',
  );
  startGame();
  await until(
    () => fresh().gameState?.phase === RoomPhase.GAME,
    'game room transitioned to GAME',
  );

  // Move the local player a little so state restoration is Observable.
  (getCurrentRoom() as any).send('PLAYER_MOVE', {
    direction: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await until(
    () => {
      const localId = fresh().localPlayerId;
      return !!localId && (fresh().gameState?.players[localId]?.position.x ?? -5) > -3;
    },
    'local player moved before disconnect',
  );

  const localIdBefore = fresh().localPlayerId!;
  const posAtDisconnect = serverPosition(serverRoom(gameRoom.roomId)!, localIdBefore);
  check(posAtDisconnect !== null && posAtDisconnect.x > -3, 'local player position advanced');

  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    'in-game disconnect enters reconnecting state',
  );
  check(
    serverRoom(gameRoom.roomId)!.state.players.size === 2,
    'player slot kept during the reconnection window',
  );

  await sleep(400);
  const posDuringHold = serverPosition(serverRoom(gameRoom.roomId)!, localIdBefore);
  const frozen =
    posDuringHold !== null &&
    posAtDisconnect !== null &&
    Math.abs(posDuringHold.x - posAtDisconnect.x) < 1e-3;
  check(frozen, 'held player freezes in place (no drift during window)');

  // -------------------------------------------------------------------------
  // Reconnect within the window restores the player's state
  // -------------------------------------------------------------------------
  console.log('\n[reconnect within window]');
  const restored = await reconnect();
  check(Boolean(restored), 'reconnect() restored a live room');
  await until(
    () =>
      fresh().connection.status === ConnectionStatus.CONNECTED &&
      serverRoom(gameRoom.roomId)!.state.players.size === 2 &&
      fresh().gameState?.phase === RoomPhase.GAME,
    'game state restored after reconnect',
  );

  const localIdAfter = fresh().localPlayerId!;
  const posAfter = serverPosition(serverRoom(gameRoom.roomId)!, localIdAfter);
  const stateRestored =
    posAfter !== null &&
    posAtDisconnect !== null &&
    Math.abs(posAfter.x - posAtDisconnect.x) < 1e-3;
  check(fresh().connection.status === ConnectionStatus.CONNECTED, 'connection reports connected after reconnect');
  check(serverRoom(gameRoom.roomId)!.state.players.size === 2, 'player slots restored after reconnect');
  check(fresh().gameState?.phase === RoomPhase.GAME, 'game phase preserved after reconnect');
  check(stateRestored, 'player position restored after reconnect');

  // Movement must keep working for the restored player (inputs route by session id).
  const restoredRoom = getCurrentRoom();
  check(restoredRoom != null, 'restored room is the active room');
  if (restoredRoom) {
    restoredRoom.send('PLAYER_MOVE', {
      direction: { x: 1, y: 0, z: 0 },
      timestamp: Date.now(),
    });
    await until(
      () => (serverPosition(serverRoom(gameRoom.roomId)!, fresh().localPlayerId!)?.x ?? -999) > (posAtDisconnect?.x ?? 0) + 0.5,
      'movement resumes after reconnect',
    );
    check(true, 'server accepts movement from the reconnected player');
  }

  // -------------------------------------------------------------------------
  // Reconnect after the window expires is rejected and the slot is removed
  // -------------------------------------------------------------------------
  console.log('\n[reconnect after window expiry]');
  (getCurrentRoom() as any).connection.close(4001);
  await until(
    () => fresh().connection.status === ConnectionStatus.RECONNECTING,
    'second disconnect enters reconnecting state',
  );
  await until(
    () => serverRoom(gameRoom.roomId)!.state.players.size === 1,
    'server removes player after the reconnect window expires',
    12000,
  );

  let rejected = false;
  try {
    await reconnect();
  } catch (err) {
    rejected = err instanceof RoomError;
  }
  check(rejected, 'reconnect after window expiry is rejected');
  check(
    fresh().connection.status === ConnectionStatus.DISCONNECTED,
    'connection returns to disconnected after failed reconnect',
  );

  // -------------------------------------------------------------------------
  // Room destroyed when the last player leaves
  // -------------------------------------------------------------------------
  console.log('\n[room destroyed when empty]');
  const lastGuest = await raw.joinById(gameRoom.roomId, {});
  await until(() => serverRoom(gameRoom.roomId)!.state.players.size === 2, 'a player joins the empty-ish room');
  await lastGuest.leave();
  await gameGuest.leave();
  await until(() => serverRoom(gameRoom.roomId)?.state.players.size === 0 || !serverRoom(gameRoom.roomId), 'room empties after the last client leaves');
  await until(() => !serverRoom(gameRoom.roomId), 'room destroyed when empty', 10000);
  check(true, 'empty room is disposed by the server');

  await leaveAll([gameRoom, gameGuest, lobbyRoom, lobbyGuest]);
  finish(title);
}

// safety net: never hang the test run
setTimeout(finish, 60000, title).unref();

main().catch((err) => {
  console.error('RECONNECTION UI TEST FAILED (exception):', err);
  process.exit(1);
});