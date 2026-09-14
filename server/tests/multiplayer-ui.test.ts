import { Client } from 'colyseus.js';
import { matchMaker } from 'colyseus';
import { GameRoom } from '../src/rooms/GameRoom.js';
import {
  RoomPhase,
  BossPhase,
  PlayerColor,
  GameEvent,
  Enemy,
} from '@storm-arena/shared';
import {
  createRoom,
  joinRoom,
  startGame,
  changeDifficulty,
  leaveRoom,
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

const PORT = 2566;
process.env.VITE_SERVER_URL = `ws://localhost:${PORT}`;
process.env.STORM_RECONNECT_TIMEOUT_MS = '5000';

const title = 'MULTIPLAYER UI';

async function main() {
  resetFailures();
  const { gameServer } = await startGameServer(PORT, GameRoom);
  console.log(`test game server listening on ${PORT}`);

  const raw = new Client(`ws://localhost:${PORT}`);

  // -------------------------------------------------------------------------
  // 4-player lobby: slots, colors, host indicator
  // -------------------------------------------------------------------------
  console.log('\n[4-player lobby state]');
  const hostRoom = await createRoom('easy');
  const filler1 = await raw.joinById(hostRoom.roomId, {});
  const filler2 = await raw.joinById(hostRoom.roomId, {});
  const filler3 = await raw.joinById(hostRoom.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length === 4,
    'lobby reaches 4 players',
  );

  const lobby = fresh().lobby;
  check(Object.keys(lobby.players).length === 4, '1 player + 3 guests populate all 4 slots');
  const colors = Object.values(lobby.players)
    .map((p) => p.color)
    .sort()
    .join(',');
  check(
    colors === [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW].sort().join(','),
    `four distinct player colors from server (${colors})`,
  );
  check(fresh().lobby.hostId === fresh().localPlayerId, 'host indicator matches creator');
  check(Boolean(fresh().isMatchActive) === false, 'lobby is not an active match');

  // -------------------------------------------------------------------------
  // Difficulty updates propagate from server
  // -------------------------------------------------------------------------
  console.log('\n[difficulty updates]');
  changeDifficulty('hard');
  await until(() => fresh().gameState?.difficulty === 'hard', 'difficulty flows to store');
  check(fresh().lobby.difficulty === 'hard', 'lobby difficulty updated from server state');

  const room = matchMaker.getRoomById(hostRoom.roomId) as InstanceType<typeof GameRoom>;
  check(room.state.difficulty === 'hard', 'server difficulty updated (authoritative)');

  // -------------------------------------------------------------------------
  // Start state
  // -------------------------------------------------------------------------
  console.log('\n[game start]');
  startGame();
  await until(() => fresh().gameState?.phase === RoomPhase.GAME, 'phase transitions to GAME');
  check(fresh().isMatchActive, 'match marked active while in GAME phase');

  // -------------------------------------------------------------------------
  // Authoritative wave / enemy / health / boss state consumption
  // -------------------------------------------------------------------------
  console.log('\n[authoritative combat values]');
  room.state.currentWave = 3;
  room.state.enemiesRemaining = 9;
  const e1 = new Enemy();
  e1.id = 'enemy-a';
  const e2 = new Enemy();
  e2.id = 'enemy-b';
  room.state.enemies.set(e1.id, e1);
  room.state.enemies.set(e2.id, e2);

  const roomId = matchMaker.getRoomById(hostRoom.roomId);
  roomId.state.boss.health = 300;
  roomId.state.boss.maxHealth = 500;
  roomId.state.boss.phase = BossPhase.PHASE_2;
  roomId.state.boss.isEnraged = true;
  roomId.state.boss.isActive = true;

  const localPlayer = roomId.state.players.get(fresh().localPlayerId!);
  if (localPlayer) {
    localPlayer.health = 30;
  }

  await until(
    () =>
      fresh().gameState?.currentWave === 3 &&
      fresh().gameState?.enemiesRemaining === 9 &&
      fresh().gameUI.bossHealth === 300,
    'wave/enemy/boss values reach store',
  );
  const gs = fresh().gameState!;
  check(gs.currentWave === 3, `wave number consumed (${gs.currentWave})`);
  check(gs.enemiesRemaining === 9, `enemy count consumed (${gs.enemiesRemaining})`);
  check(Object.keys(gs.enemies).length >= 2, 'enemy map consumed (includes test enemies)');
  check('enemy-a' in gs.enemies && 'enemy-b' in gs.enemies, 'manually added enemies present in map');
  const health = gs.players[fresh().localPlayerId!]?.health;
  check(health === 30, `authoritative player health consumed (${health})`);
  check(fresh().gameUI.bossHealth === 300, `boss health consumed (${fresh().gameUI.bossHealth})`);
  check(fresh().gameUI.bossPhase === BossPhase.PHASE_2, 'boss phase consumed');
  check(fresh().gameUI.bossEnraged, 'boss enraged state consumed');

  // -------------------------------------------------------------------------
  // Death / respawn state (authoritative)
  // -------------------------------------------------------------------------
  console.log('\n[death / respawn state]');
  const local = roomId.state.players.get(fresh().localPlayerId!);
  local!.isAlive = false;
  await until(() => fresh().gameUI.localPlayerDead === true, 'death state consumed');
  check(fresh().gameUI.localPlayerDead, 'local player death state from server');

  local!.isAlive = true;
  await until(() => fresh().gameUI.localPlayerDead === false, 'respawn state consumed');
  check(!fresh().gameUI.localPlayerDead, 'local player respawn restored from server');

  // -------------------------------------------------------------------------
  // Server game-event integration (wave start / weapon respawn / boss phase)
  // -------------------------------------------------------------------------
  console.log('\n[server game events]');
  roomId.broadcast('GAME_EVENT', {
    event: GameEvent.WAVE_START,
    data: { wave: 3, weaponRespawnIn: 10 },
  });
  await until(
    () => fresh().gameUI.showWaveTransition === true && fresh().gameUI.waveNumber === 3,
    'WAVE_START consumed',
  );
  check(fresh().gameUI.showWaveTransition && fresh().gameUI.waveNumber === 3, 'wave-start event drives transition UI');
  check(
    fresh().gameUI.weaponRespawnMessage?.includes('10') ?? false,
    'weapon respawn message from event',
  );

  roomId.broadcast('GAME_EVENT', {
    event: GameEvent.BOSS_PHASE_CHANGE,
    data: { phase: BossPhase.ENRAGED },
  });
  await until(
    () => fresh().gameUI.phaseTransitionMessage === 'BOSS ENRAGED',
    'BOSS_PHASE_CHANGE consumed',
  );
  check(fresh().gameUI.phaseTransitionMessage === 'BOSS ENRAGED', 'boss phase-transition notification rendered');

  // -------------------------------------------------------------------------
  // Victory + results data from the server
  // -------------------------------------------------------------------------
  console.log('\n[results data]');
  roomId.broadcast('GAME_EVENT', {
    event: GameEvent.WAVE_COMPLETE,
    data: { wave: 3, weaponRespawnIn: 10 },
  });
  await until(() => fresh().gameUI.waveComplete === true, 'WAVE_COMPLETE consumed');

  roomId.broadcast('GAME_EVENT', {
    event: GameEvent.MATCH_END,
    data: {
      victory: true,
      stats: {
        wavesCleared: 5,
        bossDefeated: true,
        duration: 120,
        kills: 4,
        damage: 350,
        deaths: 1,
        xpEarned: 340,
      },
    },
  });
  await until(
    () => fresh().gameUI.victory === true && fresh().gameUI.matchStats !== null,
    'MATCH_END consumed',
  );
  check(fresh().gameUI.victory, 'victory state from server');
  check(fresh().gameUI.matchStats?.bossDefeated === true, 'results show boss defeated');
  check(fresh().gameUI.matchStats?.wavesCleared === 5, 'results show waves cleared');
  check(fresh().gameUI.matchStats?.xpEarned === 340, 'XP reward included in results data');

  // -------------------------------------------------------------------------
  // 3-player / 2-player lobby sizes still update correctly
  // -------------------------------------------------------------------------
  console.log('\n[lobby size updates]');
  await leaveRoom();
  await sleep(400);
  await leaveAll([filler1, filler2, filler3]);
const room3 = await raw.create('game_room', { difficulty: 'normal' });
  await sleep(400);
  const joined3 = await joinRoom(room3.state.roomCode);
  await until(
    () => Object.keys(fresh().lobby.players).length >= 2,
    '2-player room [3-player scenario setup (1 player + 1 guest)]',
  );
  const guest2 = await raw.joinById(room3.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length >= 3,
    '3-player lobby reached',
  );
  check(Object.keys(fresh().lobby.players).length >= 3, '3 players after host + 2 guests');
  const guest3 = await raw.joinById(room3.roomId, {});
  await until(
    () => Object.keys(fresh().lobby.players).length >= 4,
    '4-player lobby reached',
  );
  check(Object.keys(fresh().lobby.players).length >= 4, '4 players after host + 3 guests (full room)');

  await leaveAll([joined3, guest2, guest3, room3]);
  finish(title);
}

// safety net: never hang the test run
setTimeout(finish, 45000, title).unref();

main().catch((err) => {
  console.error('MULTIPLAYER UI TEST FAILED (exception):', err);
  process.exit(1);
});