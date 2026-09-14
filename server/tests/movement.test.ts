import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom.js';

const PORT = 2570;
let failures: string[] = [];

function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setupGame(): Promise<{ room1: any; state: any }> {
  const client1 = new Client(`ws://localhost:${PORT}`);
  const room1 = await client1.joinOrCreate('game_room');
  const client2 = new Client(`ws://localhost:${PORT}`);
  await client2.joinOrCreate('game_room');
  await wait(200);

  room1.send('HOST_START', {});
  await wait(200);
  return { room1, state: room1.state };
}

async function findHost(state: any): Promise<any> {
  return [...state.players.values()].find((p: any) => p.isHost);
}

async function main() {
  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);
  console.log('test server listening on', PORT);

  const { room1, state } = await setupGame();
  const host = await findHost(state);
  const startX = host.position.x;
  check(startX === -5, `host spawns at x=-5 (x=${startX})`);

  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  let hostP = await findHost(state);
  check(Math.abs(hostP.position.x - startX) < 1e-3, 'zero input produces no movement');

  room1.send('PLAYER_MOVE', { direction: { x: 5, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  hostP = await findHost(state);
  check(
    Math.abs(hostP.position.x - startX) < 1e-3,
    'over-normalized direction (magnitude 5) rejected',
  );

  room1.send('PLAYER_MOVE', { direction: { x: Number.NaN, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(300);
  hostP = await findHost(state);
  check(Math.abs(hostP.position.x - startX) < 1e-3, 'non-finite direction rejected');

  room1.send('PLAYER_MOVE', { direction: { x: -1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(3600);
  hostP = await findHost(state);
  check(
    Math.abs(hostP.position.x - -20) < 0.5,
    `movement clamped at negative boundary (x=${hostP.position.x.toFixed(2)})`,
  );

  const atBoundary = hostP.position.x;
  room1.send('PLAYER_MOVE', { direction: { x: -1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(700);
  hostP = await findHost(state);
  check(Math.abs(hostP.position.x - atBoundary) < 1e-3, 'player cannot move past boundary');

  room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(200);
  hostP = await findHost(state);
  const stateLabel = hostP.state;
  check(stateLabel === 'running', `running state set on valid input (state=${stateLabel})`);

  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await wait(200);
  hostP = await findHost(state);
  check(hostP.state === 'idle', `idle state restored on empty input (state=${hostP.state})`);

  console.log(
    failures.length === 0
      ? '\nALL MOVEMENT TESTS PASSED'
      : `\n${failures.length} MOVEMENT TESTS FAILED`,
  );
  room1.leave();
  await gameServer.gracefullyShutdown();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('MOVEMENT TEST FAILED (exception):', err);
  process.exit(1);
});
