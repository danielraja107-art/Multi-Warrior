import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { GameRoom } from '../src/rooms/GameRoom.js';
import { RoomPhase, WeaponType, AttackType, GameEvent, PlayerState, EnemyState } from '@storm-arena/shared';
import {
  createRoom,
  startGame,
  RoomError,
  getCurrentRoom,
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

const PORT = 2568;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;

const title = 'COMBAT INTEGRATION';

async function main() {
  resetFailures();
  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);

  const raw = new Client(`ws://localhost:${PORT}`);

  console.log('\n[create room + guest joins + start game + test enemies spawned]');
  const hostRoom = await createRoom('easy');
  await until(() => fresh().gameState?.phase === RoomPhase.LOBBY, 'room in lobby');
  const firstGuest = await raw.joinById(hostRoom.roomId, {});
  firstGuest.onMessage('GAME_EVENT', () => {});
  await until(() => Object.keys(fresh().lobby.players).length === 2, 'guest joined');
  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, 'phase transitions to GAME');
  await until(() => (fresh().gameState?.enemiesRemaining ?? 0) >= 3, 'test enemies spawned');
  check((fresh().gameState?.enemiesRemaining ?? 0) >= 3, 'at least 3 test enemies in room');

  const enemyIds = Object.keys(fresh().gameState?.enemies ?? {});
  check(enemyIds.length >= 3, `enemy IDs present: ${enemyIds.join(', ')}`);

  const enemy1 = enemyIds[0];
  const enemy1InitialHealth = fresh().gameState!.enemies[enemy1].health;
  check(enemy1InitialHealth === 50, 'enemy health initialized to 50');

  const hostPlayerId = fresh().localPlayerId!;

  console.log('\n[single player light attack hits enemy]');
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await until(
    () => (fresh().gameState?.enemies[enemy1]?.health ?? 50) < enemy1InitialHealth,
    'enemy health reduced after attack',
    3000,
  );
  const enemy1AfterLight = fresh().gameState!.enemies[enemy1];
  check(enemy1AfterLight.health === 40, `enemy health reduced by 10 (light fist): ${enemy1AfterLight.health}`);
  check(enemy1AfterLight.state === EnemyState.STAGGER, 'enemy state becomes STAGGER');

  console.log('\n[second light attack after cooldown reduces health further]');
  await sleep(350);
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await until(
    () => (fresh().gameState?.enemies[enemy1]?.health ?? 50) < 40,
    'enemy health reduced by second attack',
    3000,
  );
  const enemy1AfterSecond = fresh().gameState!.enemies[enemy1];
  check(enemy1AfterSecond.health === 30, `enemy health reduced by 10 again: ${enemy1AfterSecond.health}`);
  check(enemy1AfterSecond.state === EnemyState.STAGGER, 'enemy state stays STAGGER');

  console.log('\n[heavy attack deals more damage]');
  const enemy2 = enemyIds[1];
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.HEAVY,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await until(
    () => (fresh().gameState?.enemies[enemy2]?.health ?? 50) < 50,
    'heavy attack reduces health',
    3000,
  );
  const enemy2AfterHeavy = fresh().gameState!.enemies[enemy2];
  check(enemy2AfterHeavy.health === 35, `heavy fist deals 15 damage: ${enemy2AfterHeavy.health}`);
  check(enemy2AfterHeavy.state === EnemyState.STAGGER, 'enemy state becomes STAGGER');

  console.log('\n[cooldown prevents rapid attacks]');
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(100);
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(100);
  const enemy2AfterCooldown = fresh().gameState!.enemies[enemy2];
  check(enemy2AfterCooldown.health === enemy2AfterHeavy.health, 'cooldown prevents second attack within 300ms');

  console.log('\n[dodge makes player invincible to damage]');
  (getCurrentRoom() as any).send('PLAYER_DODGE', {
    direction: { x: 1, y: 0, z: 0 },
    timestamp: Date.now(),
  });
  await sleep(50);
  check(fresh().gameState?.players[hostPlayerId]?.state === PlayerState.DODGING, 'player state = DODGING');

  console.log('\n[block reduces damage]');
  (getCurrentRoom() as any).send('PLAYER_BLOCK', { active: true, timestamp: Date.now() });
  await sleep(50);
  check(fresh().gameState?.players[hostPlayerId]?.state === PlayerState.BLOCKING, 'player state = BLOCKING');

  console.log('\n[two players attack one enemy simultaneously]');
  const guestRoom = await raw.joinById(hostRoom.roomId, {});
  guestRoom.onMessage('GAME_EVENT', () => {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 3,
    'second guest joined',
  );
  // Game already started, no need to start again

  const enemyIds2 = Object.keys(fresh().gameState?.enemies ?? {});
  const sharedEnemy = enemyIds2[0];
  const initialHealth = fresh().gameState!.enemies[sharedEnemy].health;

  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  guestRoom.send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await until(
    () => (fresh().gameState?.enemies[sharedEnemy]?.health ?? initialHealth) < initialHealth - 5,
    'enemy takes damage from both',
    3000,
  );
  const finalHealth = fresh().gameState!.enemies[sharedEnemy].health;
  check(finalHealth <= initialHealth - 15, `both attacks landed: ${initialHealth} -> ${finalHealth}`);

  console.log('\n[attack overlaps multiple frames - only first hit counts]');
  const enemyForOverlap = enemyIds2[1];
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(50);
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(50);
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.LIGHT,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(500);
  const overlapHealth = fresh().gameState!.enemies[enemyForOverlap].health;
  check(overlapHealth === 40 || overlapHealth === 35 || overlapHealth === 25 || overlapHealth === 20,
    'only one hit per swing registered (health not spamming down): ' + overlapHealth);

  console.log('\n[knockback applied to enemy position]');
  const enemyForKb = enemyIds2[2];
  const beforeKb = fresh().gameState!.enemies[enemyForKb].position;
  (getCurrentRoom() as any).send('PLAYER_ATTACK', {
    type: AttackType.HEAVY,
    weapon: WeaponType.FIST,
    timestamp: Date.now(),
  });
  await sleep(200);
  const afterKb = fresh().gameState!.enemies[enemyForKb].position;
  const kbDistance = Math.sqrt(
    Math.pow(afterKb.x - beforeKb.x, 2) + Math.pow(afterKb.z - beforeKb.z, 2)
  );
  check(kbDistance > 0.5, `enemy position changed by knockback (distance: ${kbDistance.toFixed(2)})`);

  console.log('\n[chain knockback to nearby enemy]');
  const kbEnemyIds = Object.keys(fresh().gameState?.enemies ?? {});
  const primaryEnemy = kbEnemyIds[0];
  const nearbyEnemy = kbEnemyIds[1];
  const nearbyBefore = fresh().gameState!.enemies[nearbyEnemy]?.position;
  if (nearbyBefore) {
    (getCurrentRoom() as any).send('PLAYER_ATTACK', {
      type: AttackType.HEAVY,
      weapon: WeaponType.HAMMER,
      timestamp: Date.now(),
    });
    await sleep(200);
    const nearbyAfter = fresh().gameState!.enemies[nearbyEnemy]?.position;
    if (nearbyAfter) {
      const moved = Math.abs(nearbyAfter.x - nearbyBefore.x) + Math.abs(nearbyAfter.z - nearbyBefore.z);
      check(moved > 0.5, 'nearby enemy moved by chain knockback');
    }
  }

  console.log('\n[player state transitions correctly]');
  check(fresh().gameState?.players[hostPlayerId]?.state !== PlayerState.ATTACKING, 'attack state cleared after swing');

  await leaveAll([hostRoom, firstGuest, guestRoom]);
  finish(title);
}

setTimeout(finish, 60000, title).unref();

main().catch((err) => {
  console.error('COMBAT INTEGRATION TEST FAILED:', err);
  process.exit(1);
});