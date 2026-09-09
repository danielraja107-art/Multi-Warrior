import { useState } from 'react';
import { PlayerColor, PlayerState, WeaponType, RoomPhase, Difficulty } from '@storm-arena/shared';
import {
  useGameStore,
} from '../state/GameStore';
import {
  createRoom,
  joinRoomByCode,
  leaveRoom,
} from '../network/ColyseusClient';
import { sendHostStart, sendHostChangeDifficulty } from '../network/commands';

const MODES = ['online', 'practice'] as const;

export function LobbyOverlay() {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const connectError = useGameStore((s) => s.connectError);
  const roomCode = useGameStore((s) => s.roomCode);
  const phase = useGameStore((s) => s.phase);
  const isHost = useGameStore((s) => s.isHost);
  const difficulty = useGameStore((s) => s.difficulty);
  const players = useGameStore((s) => s.players);
  const localSessionId = useGameStore((s) => s.localSessionId);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  const inGame = phase === 'game' && connectionStatus === 'connected';
  const inPractice = phase === 'game' && connectionStatus !== 'connected';

  async function handleCreate() {
    setBusy(true);
    try {
      await createRoom();
    } catch {
      /* handled by store */
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (joinCodeInput.trim().length === 0) return;
    setBusy(true);
    try {
      await joinRoomByCode(joinCodeInput.trim().toUpperCase());
    } catch {
      /* handled by store */
    } finally {
      setBusy(false);
    }
  }

  function startPractice() {
    const store = useGameStore.getState();
    store.resetMatch();
    store.upsertPlayer({
      sessionId: 'practice',
      color: PlayerColor.RED,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      state: PlayerState.IDLE,
      health: 100,
      maxHealth: 100,
      weapon: WeaponType.FIST,
      isHost: true,
      isAlive: true,
    });
    store.setLocalSessionId('practice');
    store.setRoomMeta({
      roomCode: 'SOLO',
      phase: RoomPhase.GAME,
      difficulty: Difficulty.NORMAL,
      currentWave: 1,
      maxWaves: 5,
      enemiesRemaining: 0,
      hostId: 'practice',
      localSessionId: 'practice',
      isHost: true,
    });
  }

  if (inGame || inPractice) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h1 style={styles.title}>STORM ARENA</h1>
        <p style={styles.subtitle}>Co-op 3D arena beat-'em-up</p>

        {connectionStatus === 'disconnected' && connectError && (
          <div style={styles.error}>{connectError}</div>
        )}

        {connectionStatus === 'connecting' && <div style={styles.hint}>Connecting…</div>}

        {connectionStatus === 'connected' && phase === 'lobby' && (
          <div style={styles.roomBox}>
            <div style={styles.hint}>Room Code</div>
            <div style={styles.roomCode}>{roomCode || '—'}</div>
            <div style={styles.hint}>
              {Object.values(players).length} / 4 players · host:{' '}
              {Object.values(players).some((p) => p.isHost) ? 'yes' : 'no'}
            </div>
            <div style={styles.difficultyRow}>
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => isHost && sendHostChangeDifficulty(d)}
                  disabled={!isHost}
                  style={{
                    ...styles.smallBtn,
                    background: difficulty === d ? '#2b6cb0' : '#1a2333',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            {isHost && (
              <button
                style={styles.primaryBtn}
                onClick={() => sendHostStart(difficulty)}
              >
                Start Game
              </button>
            )}
            {!isHost && <div style={styles.hint}>Waiting for host to start…</div>}
          </div>
        )}

        {(connectionStatus === 'idle' || connectionStatus === 'disconnected') && (
          <div style={styles.joinBox}>
            <button style={styles.primaryBtn} onClick={handleCreate} disabled={busy}>
              Create Game
            </button>
            <div style={styles.hint}>or join with a code</div>
            <div style={styles.row}>
              <input
                style={styles.input}
                value={joinCodeInput}
                placeholder="XXXX"
                maxLength={4}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              />
              <button style={styles.secondaryBtn} onClick={handleJoin} disabled={busy || !joinCodeInput}>
                Join
              </button>
            </div>
            <div style={styles.divider} />
            <button style={styles.secondaryBtn} onClick={startPractice}>
              Solo Practice (offline)
            </button>
            {(connectionStatus === 'disconnected' && roomCode) && (
              <button style={styles.linkBtn} onClick={() => leaveRoom()}>
                Back to menu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #0b1120 0%, #04060c 70%)',
    fontFamily: 'monospace',
    color: '#d9e4f2',
    zIndex: 100,
  },
  panel: {
    width: 380,
    padding: 32,
    border: '1px solid #233247',
    borderRadius: 12,
    background: 'rgba(10,15,26,0.92)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: 30,
    letterSpacing: 4,
    color: '#8fd1ff',
    textShadow: '0 0 18px #2f7fd0',
  },
  subtitle: { margin: '6px 0 18px', fontSize: 13, color: '#6c7f9c' },
  roomBox: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  joinBox: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  roomCode: { fontSize: 40, letterSpacing: 8, color: '#ffd54f', fontWeight: 'bold' },
  hint: { fontSize: 12, color: '#7a8aa6' },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  input: {
    width: 90,
    padding: '8px 10px',
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 4,
    background: '#0b1220',
    border: '1px solid #2b3a55',
    borderRadius: 6,
    color: '#d9e4f2',
    outline: 'none',
  },
  primaryBtn: {
    padding: '10px 22px',
    fontSize: 15,
    letterSpacing: 2,
    color: '#061019',
    background: '#5fb0ff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    padding: '8px 16px',
    fontSize: 13,
    color: '#bcd4ee',
    background: '#16233a',
    border: '1px solid #2b3a55',
    borderRadius: 6,
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '5px 12px',
    fontSize: 12,
    color: '#cfe0f2',
    border: '1px solid #2b3a55',
    borderRadius: 6,
    cursor: 'pointer',
  },
  linkBtn: {
    padding: 6,
    fontSize: 12,
    color: '#6f8db3',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  difficultyRow: { display: 'flex', gap: 8 },
  error: {
    fontSize: 12,
    color: '#ff8f8f',
    background: '#2a1215',
    border: '1px solid #5a2429',
    padding: '8px 12px',
    borderRadius: 6,
    marginBottom: 12,
  },
  divider: { height: 1, width: '100%', background: '#1d2a42', margin: '8px 0' },
};