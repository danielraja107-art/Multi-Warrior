export type EffectKind =
  | 'spark'
  | 'wood'
  | 'flash'
  | 'blood'
  | 'shockwave'
  | 'dust'
  | 'trail'
  | 'death'
  | 'impact'
  | 'enemy_death'
  | 'boss_phase'
  | 'lightning_flash';

export interface BurstSpec {
  id: number;
  kind: EffectKind;
  position: [number, number, number];
  color?: string;
  count?: number;
  power?: number;
}

const MAX_BURSTS = 48;
let nextId = 1;
let bursts: BurstSpec[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

export function emitBurst(
  kind: EffectKind,
  position: [number, number, number],
  opts?: { color?: string; count?: number; power?: number },
): number {
  const id = nextId++;
  const spec: BurstSpec = {
    id,
    kind,
    position,
    color: opts?.color,
    count: opts?.count,
    power: opts?.power,
  };
  bursts.push(spec);
  if (bursts.length > MAX_BURSTS) {
    bursts = bursts.slice(bursts.length - MAX_BURSTS);
  }
  notify();
  return id;
}

export function removeBurst(id: number) {
  bursts = bursts.filter((b) => b.id !== id);
  notify();
}

export function getBursts(): BurstSpec[] {
  return bursts;
}

export function subscribeBursts(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function clearBursts() {
  bursts = [];
  notify();
}

export const EFFECT_COLORS: Record<EffectKind, string> = {
  spark: '#ffe9a8',
  wood: '#a4723a',
  flash: '#fff3c4',
  blood: '#7a1620',
  shockwave: '#8fd4ff',
  dust: '#9aa0a5',
  trail: '#9fd8ff',
  death: '#ff9a3d',
  impact: '#ffd27a',
  enemy_death: '#a33a3a',
  boss_phase: '#ff5a3a',
  lightning_flash: '#e8f2ff',
};