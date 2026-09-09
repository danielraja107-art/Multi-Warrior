import { useEffect } from 'react';
import { initAudio, playSound } from '../game/audio/AudioManager';
import { emitBurst } from '../game/effects/effectsBus';
import { triggerScreenShake } from '../game/effects/screenShakeBus';

/**
 * Initializes WebAudio on the first user gesture (browser autoplay policy)
 * and drives environment/impact feedback for events the server reports
 * through the existing GAME_EVENT contract.
 */
export function AudioBoot() {
  useEffect(() => {
    const unlock = () => {
      initAudio();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return null;
}

let lastHitAt = 0;

/**
 * Called when the client receives a confirmed hit from the server.
 * Currently wired to the GAME_EVENT payloads the server emits; the visual
 * systems stay presentation-only while damage stays server-authoritative.
 */
export function presentConfirmedHit(data: Record<string, unknown>) {
  const now = performance.now();
  if (now - lastHitAt < 40) return;
  lastHitAt = now;

  const px = typeof data.x === 'number' ? data.x : 0;
  const py = typeof data.y === 'number' ? data.y : 0;
  const pz = typeof data.z === 'number' ? data.z : 0;
  const weapon = typeof data.weapon === 'string' ? data.weapon : 'fist';
  const heavy = data.heavy === true;

  playSound(weaponImpact(weapon));
  emitBurst(effectKind(weapon), [px, py, pz], {
    color: effectColor(weapon),
    count: heavy ? 18 : 10,
    power: heavy ? 1.4 : 1,
  });
  if (heavy) triggerScreenShake(0.35);
}

function weaponImpact(weapon: string) {
  switch (weapon) {
    case 'baseball_bat':
      return 'bat_impact';
    case 'axe':
      return 'axe_impact';
    case 'hammer':
      return 'hammer_impact';
    case 'stick':
      return 'stick_impact';
    case 'rock':
      return 'rock_impact';
    default:
      return 'punch_light';
  }
}

function effectKind(weapon: string) {
  switch (weapon) {
    case 'stick':
      return 'wood';
    case 'baseball_bat':
      return 'flash';
    case 'axe':
      return 'blood';
    case 'hammer':
      return 'shockwave';
    case 'rock':
      return 'dust';
    default:
      return 'spark';
  }
}

function effectColor(weapon: string) {
  switch (weapon) {
    case 'stick':
      return '#a4723a';
    case 'axe':
      return '#7a1620';
    case 'rock':
      return '#9aa0a5';
    default:
      return '#ffe9a8';
  }
}