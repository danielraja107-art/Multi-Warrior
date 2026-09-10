export type AnimationKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dodge'
  | 'block'
  | 'block_hit'
  | 'punch_light'
  | 'punch_heavy'
  | 'bat_swing'
  | 'axe_swing'
  | 'hammer_swing'
  | 'stick_swing'
  | 'rock_throw'
  | 'hit_light'
  | 'hit_heavy'
  | 'knockdown'
  | 'getup'
  | 'pickup'
  | 'death'
  | 'victory';

export interface PlaybackRequest {
  key: AnimationKey | null;
  /** Trigger an one-shot action; cleared after playback. */
  oneShot?: boolean;
  speed?: number;
}

/**
 * Maps server-enum strings to the canonical visual animation key.
 * - Player movement states derive from speed.
 * - Action-derived clips are triggered by client events, not state.
 */
export function mapPlayerStateToAnimation(
  state: string,
  speed: number,
  alive: boolean,
): AnimationKey {
  if (!alive) return 'death';
  if (state === 'blocking') return 'block';
  if (state === 'dodging') return 'dodge';
  if (state === 'staggered') return 'hit_light';
  if (state === 'attacking') return 'punch_light';
  if (speed > 7.5) return 'run';
  if (speed > 0.5) return 'walk';
  return 'idle';
}

export function mapEnemyStateToAnimation(state: string, speed: number): AnimationKey {
  if (state === 'dead') return 'death';
  if (state === 'stagger' || state === 'knockback') return 'hit_heavy';
  if (state === 'attack') return 'punch_heavy';
  if (state === 'detect') return 'idle';
  if (speed > 3.0) return 'run';
  if (speed > 0.5) return 'walk';
  return 'idle';
}

export function mapWeaponToSwingAnimation(weapon: string): AnimationKey {
  switch (weapon) {
    case 'baseball_bat':
      return 'bat_swing';
    case 'axe':
      return 'axe_swing';
    case 'hammer':
      return 'hammer_swing';
    case 'stick':
      return 'stick_swing';
    case 'rock':
      return 'rock_throw';
    default:
      return 'punch_light';
  }
}

export type BossClipName =
  | 'idle'
  | 'walk'
  | 'attack_heavy_punch'
  | 'attack_sweep'
  | 'roar'
  | 'phase2_transition'
  | 'attack_charge'
  | 'attack_slam'
  | 'phase3_transition'
  | 'attack_spin'
  | 'attack_grab_throw'
  | 'enrage'
  | 'death';

export const BOSS_CLIP_SET: Record<BossClipName, true> = {
  idle: true,
  walk: true,
  attack_heavy_punch: true,
  attack_sweep: true,
  roar: true,
  phase2_transition: true,
  attack_charge: true,
  attack_slam: true,
  phase3_transition: true,
  attack_spin: true,
  attack_grab_throw: true,
  enrage: true,
  death: true,
};

export interface BossActionFeed {
  phase: BossPhaseLike;
  currentAttack: string;
  isEnraged: boolean;
  isActive: boolean;
  health: number;
  maxHealth: number;
}

/** Server boss phase strings. Loosely typed to stay contract-agnostic. */
export type BossPhaseLike = string;

/**
 * Maps live boss state to the canonical rigged clip name. Falls back to
 * procedural motion while the GLB build is unrigged; once the animated
 * build lands feed the result into AnimationController.
 */
export function mapBossStateToClip(feed: BossActionFeed): {
  clip: BossClipName;
  oneShot: boolean;
  rate: number;
} {
  if (!feed.isActive || feed.health <= 0) {
    return { clip: 'death', oneShot: true, rate: 1 };
  }
  if (feed.isEnraged) {
    if (feed.currentAttack) return { clip: 'attack_charge', oneShot: true, rate: 1.6 };
    return { clip: 'enrage', oneShot: false, rate: 1.6 };
  }
  if (feed.currentAttack) {
    return { clip: 'attack_heavy_punch', oneShot: true, rate: 1 };
  }
  const phasePct = feed.health / Math.max(1, feed.maxHealth);
  if (phasePct <= 0.5 && phasePct > 0.2) {
    return { clip: 'phase3_transition', oneShot: false, rate: 1 };
  }
  if (phasePct <= 0.75 && phasePct > 0.5) {
    return { clip: 'phase2_transition', oneShot: false, rate: 1 };
  }
  return { clip: 'idle', oneShot: false, rate: 1 };
}