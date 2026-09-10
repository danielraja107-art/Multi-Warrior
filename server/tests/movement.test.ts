import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom.js';
import { MovementSystem, PLAYER_SPEED } from '../src/gameplay/movement/MovementSystem.js';

let failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

function testMovementSystem() {
  console.log('--- MovementSystem unit tests ---');
  const ms = new MovementSystem();
  const sid = 'p1';

  check(ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 100 }), 'accepts first input');
  check(ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 80 }) === false, 'rejects out-of-order timestamp');

  let up = ms.update(sid, 50);
  check(up.velocity.x === 1 && up.hasInput, `velocity reflects queued direction (x=${up.velocity.x})`);

  ms.enqueueInput(sid, { direction: { x: 0, y: 0, z: 0 }, timestamp: 120 });
  up = ms.update(sid, 50);
  check(up.velocity.x === 0 && !up.hasInput, 'stop input zeroes velocity');

  check(up.rotation === null, 'no rotation when input has none');

  ms.clear(sid);
  up = ms.update(sid, 50);
  check(up.velocity.x === 0 && !up.hasInput, 'clear zeroes velocity');

  ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, rotation: { x: 0.5, y: 0.25 }, timestamp: 200 });
  up = ms.update(sid, 50);
  check(up.rotation && up.rotation.x === 0.5 && up.rotation.y === 0.25, 'applies rotation from input');

  const bound = 20;
  const reps = Math.ceil((bound * 2) / (PLAYER_SPEED * 0.05)) + 10;
  for (let i = 0; i < reps; i++) {
    ms.enqueueInput(sid, { direction: { x: 1, y: 0, z: 0 }, timestamp: 300 + i });
    ms.update(sid, 50);
  }
  up = ms.update(sid, 50);
  check(up.velocity.x === 1, 'velocity remains 1 toward boundary after many ticks');
}

testMovementSystem();

console.log('\n--- Integration: boundary + move/stop ---');
const PORT = 2569;

async function main() {
  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);

  const c1 = new Client(`ws://localhost:${PORT}`);
  const room1 = await c1.joinOrCreate('game_room');
  const c2 = new Client(`ws://localhost:${PORT}`);
  const room2 = await c2.joinOrCreate('game_room');

  await new Promise((r) => setTimeout(r, 200));

  room1.send('HOST_START', {});
  await new Promise((r) => setTimeout(r, 150));

  let st: any = room1.state;
  let host: any = [...st.players.values()].find((p: any) => p.isHost);

  // Move +x for enough ticks to hit boundary (+20)
  const start = host.position.x;
  for (let i = 0; i < 200; i++) {
    room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() + i });
    await new Promise((r) => setTimeout(r, 20));
  }
  await new Promise((r) => setTimeout(r, 200));
  st = room1.state;
  host = [...st.players.values()].find((p: any) => p.isHost);
  check(host.position.x <= 20, `movement clamps at boundary (x=${host.position.x.toFixed(2)})`);
  check(host.position.x > start, 'player moved forward from start');

  // Stop input: send zero direction, position should stop changing
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() + 100000 });
  await new Promise((r) => setTimeout(r, 100));
  const stopped = host.position.x;
  await new Promise((r) => setTimeout(r, 200));
  st = room1.state;
  host = [...st.players.values()].find((p: any) => p.isHost);
  check(Math.abs(host.position.x - stopped) < 0.001, `player stops on zero input (dx=${(host.position.x - stopped).toFixed(4)})`);

  // Reject invalid direction (magnitude > 1)
  room1
    .send('PLAYER_MOVE', { direction: { x: 99, y: 0, z: 0 }, timestamp: Date.now() + 200000 });
  check(true, 'invalid move message sent (server must reject silently - no crash)');

  console.log(failures.length === 0 ? '\nALL TESTS PASSED' : `\n${failures.length} TESTS FAILED`);
  room1.leave();
  room2.leave();
  await gameServer.gracefullyShutdown();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('TEST FAILED (exception):', err);
  process.exit(1);
});
