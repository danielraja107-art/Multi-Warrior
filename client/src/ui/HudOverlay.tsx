import { useGameStore } from '../state/GameStore';
import { PLAYER_COLOR_HEX } from '../state/GameStore';
import { PlayerColor } from '@storm-arena/shared';

const WEAPON_LABEL: Record<string, string> = {
  fist:         '✊ Fist',
  stick:        '🥢 Stick',
  baseball_bat: '⚾ Bat',
  axe:          '🪓 Axe',
  hammer:       '🔨 Hammer',
  rock:         '🪨 Rock',
};

export function HudOverlay() {
  const phase = useGameStore((s) => s.phase);
  const roomCode = useGameStore((s) => s.roomCode);
  const currentWave = useGameStore((s) => s.currentWave);
  const maxWaves = useGameStore((s) => s.maxWaves);
  const enemiesRemaining = useGameStore((s) => s.enemiesRemaining);
  const players = useGameStore((s) => s.players);
  const localSessionId = useGameStore((s) => s.localSessionId);
  const isHost = useGameStore((s) => s.isHost);
  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const setAudioEnabled = useGameStore((s) => s.setAudioEnabled);
  const boss = useGameStore((s) => s.boss);
  const connectionStatus = useGameStore((s) => s.connectionStatus);

  const local = localSessionId ? players[localSessionId] : undefined;
  const inMatch = phase === 'game';
  const isVictory = phase === 'victory';
  const isGameOver = phase === 'game_over';

  // Victory screen
  if (isVictory) {
    return (
      <div style={styles.victoryOverlay}>
        <div style={styles.victoryBox}>
          <div style={styles.victoryTitle}>VICTORY</div>
          <div style={styles.victorySubtitle}>Storm Arena Cleared</div>
          <div style={styles.victoryStats}>
            <div>Waves Cleared: <b>{currentWave}</b> / {maxWaves}</div>
            <div>Players: <b>{Object.keys(players).length}</b></div>
          </div>
          <div style={styles.victoryHint}>Waiting for lobby…</div>
        </div>
      </div>
    );
  }

  // Game over screen
  if (isGameOver) {
    return (
      <div style={styles.victoryOverlay}>
        <div style={{ ...styles.victoryBox, borderColor: '#5a2429' }}>
          <div style={{ ...styles.victoryTitle, color: '#e55', textShadow: '0 0 18px #a00' }}>
            GAME OVER
          </div>
          <div style={styles.victorySubtitle}>The Storm Wins</div>
          <div style={styles.victoryStats}>
            <div>Waves Reached: <b>{currentWave}</b> / {maxWaves}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!inMatch) return null;

  const hpPct = local ? local.health / Math.max(1, local.maxHealth) : 0;
  const bossHpPct = boss && boss.isActive ? boss.health / Math.max(1, boss.maxHealth) : 0;
  const playerColorHex = local ? PLAYER_COLOR_HEX[local.color as PlayerColor] ?? '#cfe0f2' : '#cfe0f2';
  const weaponLabel = local ? (WEAPON_LABEL[local.weapon] ?? local.weapon) : '✊ Fist';

  return (
    <>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div style={styles.pill}>
          ROOM <b>{roomCode}</b>
        </div>
        <div style={styles.pill}>
          WAVE <b>{currentWave}</b> / {maxWaves}
        </div>
        <div style={styles.pill}>
          ENEMIES <b style={{ color: enemiesRemaining > 0 ? '#ff8080' : '#6cd66c' }}>
            {enemiesRemaining}
          </b>
        </div>
        <div style={styles.pill}>
          <b>{Object.keys(players).length}</b> PLAYERS {isHost ? '· HOST' : ''}
        </div>
        {connectionStatus === 'connecting' && (
          <div style={{ ...styles.pill, color: '#ffb347' }}>RECONNECTING…</div>
        )}
        <button style={styles.audioBtn} onClick={() => setAudioEnabled(!audioEnabled)}>
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* ── Player health + weapon ── */}
      {local && (
        <div style={styles.playerBox}>
          <div style={styles.healthLabel}>
            <span style={{ color: playerColorHex }}>{local.color.toUpperCase()}</span>
            {' '}HP{' '}
            <span style={{ color: '#9ab0c8' }}>{local.health}/{local.maxHealth}</span>
          </div>
          <div style={styles.healthTrack}>
            <div
              style={{
                ...styles.healthFill,
                width: `${Math.max(0, hpPct * 100)}%`,
                background: hpPct > 0.6 ? '#52c46a' : hpPct > 0.25 ? '#e59a26' : '#e5484d',
              }}
            />
          </div>
          {!local.isAlive && (
            <div style={styles.deadLabel}>DEFEATED</div>
          )}
          <div style={styles.weaponLabel}>{weaponLabel}</div>
        </div>
      )}

      {/* ── All players mini-bar ── */}
      <div style={styles.allPlayersBars}>
        {Object.values(players)
          .filter((p) => p.sessionId !== localSessionId)
          .map((p) => {
            const pct = p.health / Math.max(1, p.maxHealth);
            const hex = PLAYER_COLOR_HEX[p.color as PlayerColor] ?? '#cfe0f2';
            return (
              <div key={p.sessionId} style={styles.remoteBar}>
                <div style={{ ...styles.remoteBarLabel, color: hex }}>
                  {p.color.slice(0, 3).toUpperCase()}
                </div>
                <div style={styles.remoteBarTrack}>
                  <div
                    style={{
                      ...styles.remoteBarFill,
                      width: `${Math.max(0, pct * 100)}%`,
                      background: pct > 0.3 ? hex : '#e5484d',
                      opacity: p.isAlive ? 1 : 0.3,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Boss health bar ── */}
      {boss && boss.isActive && boss.health > 0 && (
        <div style={styles.bossBox}>
          <div style={styles.bossLabel}>
            THE VILLAIN{' '}
            <span style={{ color: '#ff9060', fontSize: 11 }}>
              {boss.phase.replace('_', ' ').toUpperCase()}{boss.isEnraged ? ' · ENRAGED' : ''}
            </span>
          </div>
          <div style={styles.bossTrack}>
            <div
              style={{
                ...styles.bossFill,
                width: `${Math.max(0, bossHpPct * 100)}%`,
                background: boss.isEnraged
                  ? '#ff3a20'
                  : bossHpPct > 0.5
                    ? '#d64541'
                    : '#ff8040',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Controls hint ── */}
      <div style={styles.controls}>
        WASD move · Shift run · Space dodge · Click light · R-click heavy · E interact · Q block · F throw
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
    background: 'rgba(8,12,20,0.82)',
    border: '1px solid #233247',
    borderRadius: 6,
    padding: '4px 10px',
  },
  audioBtn: {
    background: 'rgba(8,12,20,0.82)',
    border: '1px solid #233247',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 16,
    color: '#cfe0f2',
  },
  playerBox: {
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
  healthFill: { height: '100%', transition: 'width 120ms linear, background 200ms linear' },
  deadLabel: {
    marginTop: 4,
    color: '#e55',
    fontSize: 11,
    letterSpacing: 2,
  },
  weaponLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#9ab0c8',
    letterSpacing: 1,
  },
  allPlayersBars: {
    position: 'fixed',
    bottom: 54,
    left: 264,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    zIndex: 20,
  },
  remoteBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  remoteBarLabel: {
    width: 28,
    textAlign: 'right',
    letterSpacing: 1,
  },
  remoteBarTrack: {
    width: 80,
    height: 7,
    background: '#10182a',
    border: '1px solid #2b3a55',
    borderRadius: 4,
    overflow: 'hidden',
  },
  remoteBarFill: {
    height: '100%',
    transition: 'width 120ms linear',
  },
  bossBox: {
    position: 'fixed',
    top: 52,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 340,
    fontFamily: 'monospace',
    color: '#ffd7c9',
    fontSize: 12,
    zIndex: 20,
    background: 'rgba(8,12,20,0.82)',
    border: '1px solid #5a2429',
    borderRadius: 8,
    padding: '8px 14px',
  },
  bossLabel: {
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 5,
    fontSize: 13,
  },
  bossTrack: {
    height: 10,
    background: '#1a0808',
    borderRadius: 5,
    overflow: 'hidden',
    border: '1px solid #3a1010',
  },
  bossFill: {
    height: '100%',
    transition: 'width 150ms linear, background 300ms linear',
  },
  controls: {
    position: 'fixed',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#4a5f78',
    zIndex: 20,
  },
  victoryOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(0,30,60,0.85) 0%, rgba(2,4,10,0.95) 70%)',
    zIndex: 50,
    fontFamily: 'monospace',
    color: '#d9e4f2',
  },
  victoryBox: {
    textAlign: 'center',
    padding: '40px 56px',
    border: '1px solid #2a4a2a',
    borderRadius: 16,
    background: 'rgba(8,18,12,0.95)',
    boxShadow: '0 0 60px rgba(60,200,80,0.12)',
  },
  victoryTitle: {
    fontSize: 48,
    letterSpacing: 8,
    color: '#6cd66c',
    textShadow: '0 0 24px #3a9a3a',
    marginBottom: 10,
  },
  victorySubtitle: {
    fontSize: 16,
    color: '#8aaa8a',
    letterSpacing: 3,
    marginBottom: 24,
  },
  victoryStats: {
    fontSize: 14,
    lineHeight: '2',
    color: '#9ab8a0',
  },
  victoryHint: {
    marginTop: 20,
    fontSize: 12,
    color: '#4a6a4a',
    letterSpacing: 2,
  },
};
