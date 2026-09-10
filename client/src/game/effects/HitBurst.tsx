import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BurstSpec } from './effectsBus';
import { removeBurst } from './effectsBus';
import { triggerScreenShake } from './screenShakeBus';

interface HitBurstProps {
  spec: BurstSpec;
}

const GRAVITY = -9.8;

interface ParticleState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

function createParticles(spec: BurstSpec): ParticleState[] {
  const count = spec.count ?? 12;
  const speed = (spec.power ?? 1) * 3;
  const particles: ParticleState[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.abs(Math.cos(phi)) * 0.6 + 0.3,
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      pos: new THREE.Vector3(spec.position[0], spec.position[1] + 0.3, spec.position[2]),
      vel: dir.multiplyScalar(v),
      life: 0,
      maxLife: 0.35 + Math.random() * 0.3,
    });
  }
  return particles;
}

/**
 * One-shot particle burst. Manages its own particle attributes and
 * removes itself from the effects bus when finished.
 */
export function HitBurst({ spec }: HitBurstProps) {
  const particles = useMemo(() => createParticles(spec), [spec]);
  const posAttr = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = p.pos.x;
      arr[i * 3 + 1] = p.pos.y;
      arr[i * 3 + 2] = p.pos.z;
    });
    return new THREE.BufferAttribute(arr, 3);
  }, [particles]);

  const colAttr = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    const base = new THREE.Color(spec.color ?? '#ffffff');
    arr.fill(0);
    const v = new THREE.Color();
    particles.forEach((_, i) => {
      v.copy(base).multiplyScalar(0.45 + Math.random() * 0.55);
      arr[i * 3] = v.r;
      arr[i * 3 + 1] = v.g;
      arr[i * 3 + 2] = v.b;
    });
    return new THREE.BufferAttribute(arr, 3);
  }, [particles, spec.color]);

  const color = useMemo(() => new THREE.Color(spec.color ?? '#ffffff'), [spec.color]);
  const killed = useRef(false);
  const anim = useRef({ t: 0 });

  useEffect(() => {
    if (spec.kind === 'shockwave') {
      triggerScreenShake(0.4 + (spec.power ?? 1) * 0.2);
    }
    const timeout = setTimeout(() => {
      if (!killed.current) {
        killed.current = true;
        removeBurst(spec.id);
      }
    }, 1200);
    return () => {
      clearTimeout(timeout);
      killed.current = true;
    };
  }, [spec]);

  useFrame((_, delta) => {
    anim.current.t += delta;
    const arr = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;
    let allDead = true;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) continue;
      allDead = false;
      p.vel.y += GRAVITY * delta;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.multiplyScalar(1 - delta * 1.5);
      arr[i * 3] = p.pos.x;
      arr[i * 3 + 1] = p.pos.y;
      arr[i * 3 + 2] = p.pos.z;

      const t = Math.max(0, 1 - p.life / p.maxLife);
      col[i * 3] = color.r * t;
      col[i * 3 + 1] = color.g * t;
      col[i * 3 + 2] = color.b * t;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    if (allDead && !killed.current) {
      killed.current = true;
      removeBurst(spec.id);
    }
  });

  const size = spec.kind === 'shockwave' ? 0.14 : 0.06;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posAttr.array as Float32Array, 3]} />
        <bufferAttribute attach="attributes-color" args={[colAttr.array as Float32Array, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={size}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}