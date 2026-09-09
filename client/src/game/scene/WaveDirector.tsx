import { useEffect, useRef } from 'react';
import { useGameStore } from '../../state/GameStore';
import { GameEvent, RoomPhase } from '@storm-arena/shared';
import { playSound, setMusicIntensity, stopMusic } from '../audio/AudioManager';
import { emitBurst } from '../effects/effectsBus';
import { triggerScreenShake } from '../effects/screenShakeBus';
import { triggerBossCinematic } from '../camera/bus';

/**
 * Listens to match/wave state and drives world-side presentation:
 * music intensity, wave start/complete effects, boss entrance cinematic.
 * The formal HUD belongs to Member 3.
 */
export function WaveDirector() {
  const phase = useGameStore((s) => s.phase);
  const currentWave = useGameStore((s) => s.currentWave);
  const enemiesRemaining = useGameStore((s) => s.enemiesRemaining);
  const boss = useGameStore((s) => s.boss);

  const lastWave = useRef(0);
  const lastBossActive = useRef(false);
  const lastBossPhase = useRef<string | null>(null);
  const prevEnemies = useRef(0);

  useEffect(() => {
    if (phase === RoomPhase.GAME) {
      if (currentWave !== lastWave.current && currentWave > 0) {
        lastWave.current = currentWave;
        playSound('wave_start');
        if (currentWave >= 4) triggerScreenShake(0.6);
      }
      setMusicIntensity(currentWave >= 5 ? 2.5 : currentWave >= 4 ? 2 : currentWave >= 2 ? 1 : 0.5);
    } else if (phase === RoomPhase.VICTORY) {
      playSound('victory');
      stopMusic();
    } else {
      stopMusic();
    }
  }, [phase, currentWave]);

  useEffect(() => {
    if (boss?.isActive) {
      if (!lastBossActive.current) {
        lastBossActive.current = true;
        playSound('boss_entrance');
        triggerBossCinematic(boss.position.x, boss.position.y || 1.5, boss.position.z, 1500);
      }
      if (boss.phase !== lastBossPhase.current && lastBossPhase.current != null) {
        if (boss.phase === 'enraged') {
          playSound('boss_enraged');
          triggerScreenShake(1.2);
        } else {
          playSound('boss_phase_change');
          triggerScreenShake(0.8);
        }
      }
      lastBossPhase.current = boss.phase;
    } else {
      if (lastBossActive.current && boss?.isActive === false) {
        playSound('boss_death');
        triggerScreenShake(1.4);
        emitBurst('boss_phase', [boss?.position.x ?? 0, 1, boss?.position.z ?? 0], {
          color: '#ff9a3d',
          count: 40,
          power: 2,
        });
      }
      lastBossActive.current = false;
    }
  }, [boss]);

  useEffect(() => {
    if (enemiesRemaining === 0 && prevEnemies.current > 0) {
      playSound('wave_complete');
    }
    if (prevEnemies.current !== enemiesRemaining) {
      prevEnemies.current = enemiesRemaining;
    }
  }, [enemiesRemaining]);

  return null;
}