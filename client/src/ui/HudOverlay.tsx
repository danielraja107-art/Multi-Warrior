import { useGameStore } from '../state/GameStore';

export function HudOverlay() {
  const phase = useGameStore((s) => s.phase);
  const roomCode = useGameStore((s) => s.roomCode);
  const currentWave = useGameStore((s) => s.currentWave);
  const maxWaves = useGameStore((s) => s.maxWaves);
  const players = useGameStore((s) => s.players);
  const localSessionId = useGameStore((s) => s.localSessionId);
  const isHost = useGameStore((s) => s.isHost);
  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const setAudioEnabled = useGameStore((s) => s.setAudioEnabled);

  const local = localSessionId ? players[localSessionId] : undefined;
  const inMatch = phase === 'game';

  if (!inMatch) return null;

  return (
    <>
      <div style={styles.topBar}>
        <div style={styles.pill}>
          ROOM <b>{roomCode}</b>
        </div>
        <div style={styles.pill}>
          WAVE <b>{currentWave}</b> / {maxWaves}
        </div>
        <div style={styles.pill}>
          <b>{Object.keys(players).length}</b> PLAYERS {isHost ? '· HOST' : ''}
        </div>
        <button style={styles.audioBtn} onClick={() => setAudioEnabled(!audioEnabled)}>
          AUDIO {audioEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {local && (
        <div style={styles.healthBox}>
          <div style={styles.healthLabel}>{local.color.toUpperCase()} HP</div>
          <div style={styles.healthTrack}>
            <div
              style={{
                ...styles.healthFill,
                width: `${Math.max(0, (local.health / local.maxHealth) * 100)}%`,
                background: local.health / local.maxHealth > 0.3 ? '#52c46a' : '#e5484d',
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.controls}>
        <span>WASD move</span> · <span>Shift run</span> · <span>Space dodge</span> ·{' '}
        <span>Click light attack</span> · <span>Right-click heavy</span> ·{' '}
        <span>E interact</span> · <span>Q block</span> · <span>F throw</span>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    position: 'fixed',
    top: 12,
    left: 12,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#cfe0f2',
    zIndex: 20,
  },
  pill: {
    background: 'rgba(8,12,20,0.8)',
    border: '1px solid #233247',
    borderRadius: 6,
    padding: '4px 10px',
  },
  audioBtn: {
    background: 'rgba(8,12,20,0.8)',
    border: '1px solid #233247',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 14,
  },
  healthBox: {
    position: 'fixed',
    bottom: 54,
    left: 12,
    width: 240,
    fontFamily: 'monospace',
    color: '#cfe0f2',
    fontSize: 12,
    zIndex: 20,
  },
  healthLabel: { marginBottom: 4, letterSpacing: 1 },
  healthTrack: {
    height: 12,
    background: '#10182a',
    border: '1px solid #2b3a55',
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthFill: { height: '100%', transition: 'width 120ms linear' },
  controls: {
    position: 'fixed',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#5f7290',
    zIndex: 20,
  },
};