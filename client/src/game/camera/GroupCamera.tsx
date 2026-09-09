import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { liveTransforms } from '../players/registry';
import { consumeCinematic } from './bus';

const DEFAULT_DISTANCE = 18;
const MIN_ZOOM = 14;
const MAX_ZOOM = 28;
const ZOOM_DAMP = 0.05;
const FOLLOW_SMOOTHNESS = 0.08;
const AZIMUTH = 0.35;
const PITCH_RATIO = 0.55;

const _center = new Vector3();
const _cur = new Vector3();
const _cinematic = new Vector3();
const _work = new Vector3();

interface GroupCameraProps {
  enabled?: boolean;
}

export function GroupCamera({ enabled = true }: GroupCameraProps) {
  const { camera } = useThree();
  const currentPos = useRef(new Vector3(0, 12, 18));
  const distance = useRef(DEFAULT_DISTANCE);
  const cinematicUntil = useRef(0);
  const cinematicStart = useRef(0);
  const cinematicFocus = useRef(new Vector3());

  useFrame((_, delta) => {
    if (!enabled) return;

    const center = computeGroupCenter();
    const spread = computeSpread(center);

    const now = performance.now();
    const request = consumeCinematic();
    if (request) {
      cinematicFocus.current.copy(request.position);
      cinematicFocus.current.y = Math.max(request.position.y, 1.5);
      cinematicStart.current = now;
      cinematicUntil.current = now + request.durationMs;
    }

    let focus = center;
    if (now < cinematicUntil.current) {
      const total = Math.max(1, cinematicUntil.current - cinematicStart.current);
      const t = Math.min(1, (now - cinematicStart.current) / (total * 0.7));
      _cinematic.lerpVectors(center, cinematicFocus.current, t);
      focus = _cinematic;
    }
    focus.y = Math.max(focus.y, 1.0);

    const desiredDist = clamp(DEFAULT_DISTANCE + spread * 0.8, MIN_ZOOM, MAX_ZOOM);
    distance.current += (desiredDist - distance.current) * ZOOM_DAMP;

    currentPos.current.lerp(focus, FOLLOW_SMOOTHNESS);
    _cur.copy(currentPos.current);

    const azX = Math.sin(AZIMUTH);
    const azZ = Math.cos(AZIMUTH);
    camera.position.set(
      _cur.x + azX * distance.current * 0.9,
      _cur.y + distance.current * PITCH_RATIO,
      _cur.z + azZ * distance.current * 0.78,
    );
    camera.lookAt(_cur.x, _cur.y, _cur.z);
  });

  return null;
}

function computeGroupCenter(): Vector3 {
  const values = [...liveTransforms.values()];
  _center.set(0, 0, 0);
  if (values.length === 0) return _center;
  let count = 0;
  const now = Date.now();
  for (const v of values) {
    if (now - v.updatedAt > 3000) continue;
    _center.add(v.position);
    count++;
  }
  if (count > 0) _center.multiplyScalar(1 / count);
  return _center;
}

function computeSpread(center: Vector3): number {
  const values = [...liveTransforms.values()];
  if (values.length === 0) return 0;
  let maxD = 0;
  const now = Date.now();
  for (const v of values) {
    if (now - v.updatedAt > 3000) continue;
    _work.copy(v.position).sub(center);
    maxD = Math.max(maxD, _work.length());
  }
  return maxD;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}