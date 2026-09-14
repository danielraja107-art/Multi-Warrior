import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { GameRoom } from '../src/rooms/GameRoom.js';
import { PLAYER_SPEED, MOVEMENT_BOUNDARY } from '../src/gameplay/movement/MovementSystem.js';

const PORT = 2580;
let failures: string[] = [];
let passes = 0;

function check(cond: boolean, msg: string) {
  if (cond) {
    passes++;
    console.log('  PASS:', msg);
  } else {
    console.log('  FAIL:', msg);
    failures.push(msg);
  }
}

function dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

async function main() {
  const gameServer = new Server();
  gameServer.define('game_room', GameRoom);
  await gameServer.listen(PORT);
  console.log('verification server on', PORT);

  const c1 = new Client(`ws://localhost:${PORT}`);
  const room1 = await c1.joinOrCreate('game_room');
  room1.onMessage('GAME_EVENT', () => {});
  const c2 = new Client(`ws://localhost:${PORT}`);
  const room2 = await c2.joinOrCreate('game_room');
  room2.onMessage('GAME_EVENT', () => {});

  await new Promise((r) => setTimeout(r, 200));
  room1.send('HOST_START', {});
  await new Promise((r) => setTimeout(r, 150));

  let st: any = room1.state;
  const getHost = () => [...st.players.values()].find((p: any) => p.isHost);
  let host = getHost();
  const start = { x: host.position.x, y: host.position.y, z: host.position.z };
  console.log('  info: host start pos', JSON.stringify(start));

  console.log('--- 1. Directional movement on correct axes ---');
  // Move +x for ~0.5s
  room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 500));
  st = room1.state; host = getHost();
  const dx = host.position.x - start.x;
  check(Math.abs(dx - PLAYER_SPEED * 0.5) < 0.6, `+x movement ~speed*0.5 (dx=${dx.toFixed(2)}, expect ~${(PLAYER_SPEED*0.5).toFixed(2)})`);
  check(Math.abs(host.position.y - start.y) < 0.01, `y unchanged on +x move (dy=${(host.position.y-start.y).toFixed(3)})`);

  // Stop
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 100));
  st = room1.state; host = getHost();
  const parked = host.position.x;
  await new Promise((r) => setTimeout(r, 150));
  st = room1.state; host = getHost();
  check(Math.abs(host.position.x - parked) < 0.001, `stops on zero input (dx=${(host.position.x-parked).toFixed(4)})`);
  check(host.state === 'idle', `state idle when stopped (state=${host.state})`);

  // Move -x
  room1.send('PLAYER_MOVE', { direction: { x: -1, y: 0, z: 0 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 200));
  st = room1.state; host = getHost();
  check(host.position.x < parked, `-x moves leftward (x=${host.position.x.toFixed(2)})`);
  check(host.state === 'running', `state running when moving (state=${host.state})`);

  // Move +z
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 1 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 200));
  st = room1.state; host = getHost();
  const prevX = host.position.x;
  check(host.position.z > 0, `+z moves forward (z=${host.position.z.toFixed(2)})`);
  check(Math.abs(host.position.x - prevX) < 0.01, `x unchanged on +z move`);

  console.log('--- 2. Rotation applied ---');
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 1 }, rotation: { x: 0.1, y: 1.234 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 100));
  st = room1.state; host = getHost();
  check(host.rotation.y === 1.234, `rotation.y synced (${host.rotation.y})`);
  check(Math.abs(host.rotation.x - 0.1) < 0.001, `rotation.x synced (${host.rotation.x})`);

  console.log('--- 3. Boundary clamping (±20) ---');
  // Run +x for a long time to hit boundary (from current x, need ~ up to 25 units at speed 5 = ~5s)
  room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  for (let i = 0; i < 120; i++) await new Promise((r) => setTimeout(r, 50));
  st = room1.state; host = getHost();
  check(host.position.x <= MOVEMENT_BOUNDARY + 0.001, `clamped at +boundary (x=${host.position.x.toFixed(2)})`);
  check(Math.abs(host.position.x - MOVEMENT_BOUNDARY) < 0.001, `stays at boundary (x=${host.position.x.toFixed(2)})`);

  // Attempt overshoot input, still clamped
  room1.send('PLAYER_MOVE', { direction: { x: 1, y: 0, z: 0 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 100));
  st = room1.state; host = getHost();
  check(host.position.x <= MOVEMENT_BOUNDARY + 0.001, `no overshoot beyond boundary (x=${host.position.x.toFixed(2)})`);

  console.log('--- 4. Client cannot inject position (authority) ---');
  // Send a crafted PLAYER_MOVE pretending to set position far away
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: Date.now(), position: { x: 999, y: 999, z: 999 } });
  await new Promise((r) => setTimeout(r, 100));
  st = room1.state; host = getHost();
  check(host.position.x !== 999, `position not overwritten by crafted payload (x=${host.position.x.toFixed(2)})`);

  console.log('--- 5. Invalid direction rejected (no crash, no move) ---');
  st = room1.state; host = getHost();
  const before = host.position.x;
  room1.send('PLAYER_MOVE', { direction: { x: 5000, y: 0, z: 0 }, timestamp: Date.now() });
  room1.send('PLAYER_MOVE', { direction: { x: NaN, y: 0, z: 0 }, timestamp: Date.now() });
  room1.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 0 }, timestamp: 'not-a-number' as any });
  await new Promise((r) => setTimeout(r, 150));
  st = room1.state; host = getHost();
  check(Math.abs(host.position.x - before) < 0.001, `invalid inputs rejected, position unchanged (x=${host.position.x.toFixed(2)})`);

  console.log('--- 6. Two players independent movement ---');
  // Move player 2 independently on +z while player 1 parked
  const getP2 = () => [...st.players.values()].find((p: any) => !p.isHost);
  let p2 = getP2();
  const p2Start = { x: p2.position.x, y: p2.position.y, z: p2.position.z };
  room2.send('PLAYER_MOVE', { direction: { x: 0, y: 0, z: 1 }, timestamp: Date.now() });
  await new Promise((r) => setTimeout(r, 300));
  st = room1.state; host = getHost(); p2 = getP2();
  const p1Still = Math.abs(host.position.x - before) < 0.001;
  check(p2.position.z > p2Start.z, `player2 moved on +z (z=${p2.position.z.toFixed(2)})`);
  check(p1Still, `player1 unaffected while player2 moves (p1 x=${host.position.x.toFixed(2)})`);

  console.log('--- 7. 20Hz tick sanity ---');
  // elapsedTime should advance ~50ms per tick over span
  st = room1.state;
  const t0 = st.elapsedTime;
  await new Promise((r) => setTimeout(r, 1000));
  st = room1.state;
  const elapsedDelta = st.elapsedTime - t0;
  check(elapsedDelta > 700 && elapsedDelta < 1300, `elapsedTime advanced ~1s (${elapsedDelta.toFixed(0)}ms)`);

  console.log(failures.length === 0 ? `\nALL ${passes} CHECKS PASSED` : `\n${failures.length} CHECKS FAILED of ${passes + failures.length}`);
  room1.leave();
  room2.leave();
  await gameServer.gracefullyShutdown();
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('VERIFICATION FAILED (exception):', err);
  process.exit(1);
});
