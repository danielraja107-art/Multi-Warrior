import assert from 'node:assert/strict';
import { GameRoom } from '../src/rooms/GameRoom';
import { Difficulty, RoomPhase } from '@storm-arena/shared';

const room = new GameRoom() as any;
room.listing = {
  metadata: {},
  remove: () => undefined,
};
room.broadcast = () => undefined;
room.onCreate({ difficulty: Difficulty.NORMAL });
room.onJoin({ sessionId: 'p1' });

const validMove = room.normalizeMoveInput({
  direction: { x: 0.5, y: 0, z: 0.5 },
  rotation: { x: 0, y: 0.5, z: 0 },
  timestamp: 1000,
});
assert.ok(validMove && validMove.direction.x === 0.5, 'valid movement payload should be accepted');

const invalidMove = room.normalizeMoveInput({
  direction: { x: 99, y: 0, z: 0 },
  timestamp: 1001,
});
assert.equal(invalidMove, null, 'impossible movement magnitude should be rejected');

const invalidAttack = room.validateAttackPayload({
  type: 'light',
  weapon: 'hammer',
  timestamp: Date.now(),
}, 'p1');
assert.equal(invalidAttack, false, 'invalid weapon claims should be rejected');

const validAttack = room.validateAttackPayload({
  type: 'light',
  weapon: 'fist',
  timestamp: Date.now(),
}, 'p1');
assert.equal(validAttack, true, 'valid attack payload should be accepted');

const suspicious = room.detectSpeedHack('p1', { x: 50, y: 0, z: 0 }, 50);
assert.equal(suspicious, true, 'speed hacks should be detected');

assert.equal(room.state.phase, RoomPhase.LOBBY, 'room starts in lobby');
console.log('PHASE 9 SECURITY: PASS');
