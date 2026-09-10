import type { Room } from 'colyseus.js';
import {
  MESSAGE_SERVER,
  RoomPhase,
  GameEvent,
  type GameEventPayload,
  type MatchResultPayload,
  type ServerErrorPayload,
} from '@storm-arena/shared';
import { useGameStore, toClientPlayer, toClientEnemy, toClientBoss, toClientWeaponPickup } from '../state/GameStore';
import { playSound } from '../game/audio/AudioManager';
import { emitBurst } from '../game/effects/effectsBus';

interface ColyseusVector3 {
  x: number;
  y: number;
  z: number;
}

interface ColyseusPlayer {
  sessionId: string;
  color: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  state: string;
  health: number;
  maxHealth: number;
  weapon: string;
  isHost: boolean;
  isAlive: boolean;
}

interface ColyseusEnemy {
  id: string;
  type: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  state: string;
  health: number;
  maxHealth: number;
  targetPlayerId: string;
}

interface ColyseusBoss {
  id: string;
  position: ColyseusVector3;
  rotation: ColyseusVector3;
  health: number;
  maxHealth: number;
  phase: string;
  currentAttack: string;
  isEnraged: boolean;
  isActive: boolean;
}

interface ColyseusWeaponPickup {
  id: string;
  type: string;
  position: ColyseusVector3;
  isAvailable: boolean;
}

interface ColyseusState {
  phase: string;
  roomCode: string;
  hostId: string;
  difficulty: string;
  currentWave: number;
  maxWaves: number;
  enemiesRemaining: number;
  players: Map<string, ColyseusPlayer>;
  enemies: Map<string, ColyseusEnemy>;
  boss: ColyseusBoss | null;
  weaponPickups: Map<string, ColyseusWeaponPickup>;
}

let syncRoom: Room | null = null;

function bindMeta(state: ColyseusState) {
  const localSessionId = useGameStore.getState().localSessionId;
  const local = localSessionId ? state.players.get(localSessionId) : undefined;
  const localIsHost = !!local?.isHost;

  useGameStore.getState().setRoomMeta({
    roomCode: state.roomCode,
    phase: state.phase as RoomPhase,
    difficulty: state.difficulty as never,
    currentWave: state.currentWave,
    maxWaves: state.maxWaves,
    enemiesRemaining: state.enemiesRemaining,
    hostId: state.hostId,
    localSessionId: localSessionId ?? '',
    isHost: localIsHost,
  });
}

function applyFullSync(state: ColyseusState) {
  const store = useGameStore.getState();

  store.clearPlayers();
  store.clearEnemies();
  store.clearWeaponPickups();

  state.players.forEach((p) => store.upsertPlayer(toClientPlayer(p as ColyseusPlayer)));
  state.enemies.forEach((e) => store.upsertEnemy(toClientEnemy(e as ColyseusEnemy)));
  state.weaponPickups.forEach((w) =>
    store.upsertWeaponPickup(toClientWeaponPickup(w as ColyseusWeaponPickup)),
  );
  if (state.boss) {
    store.setBoss(toClientBoss(state.boss));
  }

  bindMeta(state);
}

export function attachRoom(room: Room<any>, localSessionId: string) {
  syncRoom = room;
  useGameStore.getState().setLocalSessionId(localSessionId);
  useGameStore.getState().setConnectionStatus('connected');

  const state = room.state as unknown as ColyseusState;
  applyFullSync(state);

  const players = state.players as unknown as {
    onAdd: (cb: (v: ColyseusPlayer, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusPlayer, k: string) => void) => void;
    onClear: (cb: () => void) => void;
  };
  players.onAdd((player: ColyseusPlayer) => {
    useGameStore.getState().upsertPlayer(toClientPlayer(player));
  });
  players.onRemove((player: ColyseusPlayer) => {
    useGameStore.getState().removePlayer(player.sessionId);
  });
  players.onClear(() => useGameStore.getState().clearPlayers());

  const enemies = state.enemies as unknown as {
    onAdd: (cb: (v: ColyseusEnemy, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusEnemy, k: string) => void) => void;
    onClear: (cb: () => void) => void;
  };
  enemies.onAdd((enemy: ColyseusEnemy) => {
    useGameStore.getState().upsertEnemy(toClientEnemy(enemy));
  });
  enemies.onRemove((enemy: ColyseusEnemy) => {
    useGameStore.getState().removeEnemy(enemy.id);
  });
  enemies.onClear(() => useGameStore.getState().clearEnemies());

  const weaponPickups = state.weaponPickups as unknown as {
    onAdd: (cb: (v: ColyseusWeaponPickup, k: string) => void) => void;
    onRemove: (cb: (v: ColyseusWeaponPickup, k: string) => void) => void;
    onClear: (cb: () => void) => void;
  };
  weaponPickups.onAdd((w: ColyseusWeaponPickup) => {
    useGameStore.getState().upsertWeaponPickup(toClientWeaponPickup(w));
  });
  weaponPickups.onRemove((w: ColyseusWeaponPickup) => {
    useGameStore.getState().removeWeaponPickup(w.id);
  });
  weaponPickups.onClear(() => useGameStore.getState().clearWeaponPickups());

  room.onMessage(MESSAGE_SERVER.STATE_UPDATE, () => {
    applyFullSync(room.state as unknown as ColyseusState);
  });

  room.onMessage(MESSAGE_SERVER.GAME_EVENT, (payload: GameEventPayload) => {
    handleGameEvent(payload);
  });

  room.onMessage(MESSAGE_SERVER.MATCH_RESULT, (_payload: MatchResultPayload) => {
    useGameStore.getState().setPhase(RoomPhase.VICTORY);
  });

  room.onMessage(MESSAGE_SERVER.ERROR, (payload: ServerErrorPayload) => {
    console.error('[server error]', payload.code, payload.message);
  });

  room.onLeave((_code: number) => {
    useGameStore.getState().setConnectionStatus('disconnected');
  });
}

function handleGameEvent(payload: GameEventPayload) {
  const store = useGameStore.getState();
  const { event } = payload;
  const data = payload.data ?? {};

  switch (event) {
    case GameEvent.WAVE_START:
      playSound('wave_start');
      if (typeof data.wave === 'number') {
        store.setWave(data.wave, store.maxWaves, store.enemiesRemaining);
      }
      break;
    case GameEvent.WAVE_COMPLETE:
      playSound('wave_complete');
      if (typeof data.wave === 'number') {
        store.setWave(data.wave, store.maxWaves, store.enemiesRemaining);
      }
      break;
    case GameEvent.BOSS_SPAWN:
      playSound('boss_entrance');
      break;
    case GameEvent.BOSS_PHASE_CHANGE:
      playSound(data.phase === 'enraged' ? 'boss_enraged' : 'boss_phase_change');
      break;
    case GameEvent.BOSS_DEFEATED:
      playSound('boss_death');
      emitBurst('boss_phase', [0, 1, 0], { color: '#ff9a3d', count: 40, power: 2 });
      break;
    case GameEvent.PLAYER_DIED:
      playSound('player_death');
      break;
    case GameEvent.PLAYER_KILLED:
      playSound('enemy_death');
      break;
    case GameEvent.WEAPON_PICKUP:
      playSound('weapon_pickup');
      break;
    case GameEvent.WEAPON_DROP:
      playSound('weapon_drop');
      break;
    case GameEvent.MATCH_END:
      if (data.victory === true) {
        store.setPhase(RoomPhase.VICTORY);
        playSound('victory');
      }
      break;
    default:
      break;
  }
}

export function detachRoom() {
  if (syncRoom) {
    try {
      syncRoom.leave();
    } catch (err) {
      console.warn('[detach] failed to leave room', err);
    }
    syncRoom = null;
  }
  const store = useGameStore.getState();
  store.setConnectionStatus('idle');
  store.setLocalSessionId(null);
  store.clearPlayers();
}