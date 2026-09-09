import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { Html } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useGameStore, type ClientBossState } from '../../state/GameStore';
import { emitBurst } from '../effects/effectsBus';
import { triggerScreenShake } from '../effects/screenShakeBus';
import { playSound } from '../audio/AudioManager';
import { BossModel, preloadBossModel } from './BossModel';

preloadBossModel();

const _target = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();

interface VillainBossProps {
  boss: ClientBossState;
}

export function VillainBoss({ boss }: VillainBossProps) {
  const groupRef = useRef<Group>(null);
  const current = useRef(new Vector3(boss.position.x, 0, boss.position.z));
  const wasActive = useRef(false);
  const lastPhase = useRef(boss.phase);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (boss.isActive && !wasActive.current) {
      wasActive.current = true;
    }
    if (!boss.isActive && wasActive.current) {
      wasActive.current = false;
    }

    if (lastPhase.current !== boss.phase) {
      emitBurst('boss_phase', [boss.position.x, 2, boss.position.z], { color: '#ff5a3a', count: 30, power: 1.5 });
      triggerScreenShake(1.1);
      if (boss.phase === 'enraged') playSound('boss_enraged');
      else playSound('boss_phase_change');
      lastPhase.current = boss.phase;
    }

    _target.set(boss.position.x, 0, boss.position.z);
    const alpha = 1 - Math.exp(-10 * delta);
    current.current.lerp(_target, alpha);
    _euler.set(boss.rotation.x, boss.rotation.y, boss.rotation.z);
    _quat.setFromEuler(_euler);
    group.position.copy(current.current);
    if (boss.isActive) {
      group.quaternion.slerp(_quat, alpha);
    }
  });

  const hpPct = boss.health / Math.max(1, boss.maxHealth);

  if (!boss.isActive) return null;

  return (
    <>
      <RigidBody type="kinematicPosition" colliders={false} position={[current.current.x, 1.05, current.current.z]}>
        <CapsuleCollider args={[0.55, 0.5]} />
      </RigidBody>

      <group ref={groupRef} position={[boss.position.x, 0, boss.position.z]} scale={2.1}>
        <BossModel phase={boss.phase} isEnraged={boss.isEnraged} currentAttack={boss.currentAttack} />

        {boss.isEnraged && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 0.95, 24]} />
            <meshBasicMaterial color="#ff4a2a" transparent opacity={0.35} blending={2} depthWrite={false} />
          </mesh>
        )}

        {boss.health > 0 && (
          <Html center position={[0, 1.3, 0]} distanceFactor={14} zIndexRange={[10, 0]}>
            <div style={{ width: 90, fontFamily: 'monospace', fontSize: 12, color: '#ffd7c9', textAlign: 'center' }}>
              <div style={{ letterSpacing: 2 }}>THE VILLAIN</div>
              <div style={{ height: 8, background: '#161a20', borderRadius: 4, overflow: 'hidden', border: '1px solid #000' }}>
                <div
                  style={{
                    width: `${hpPct * 100}%`,
                    height: '100%',
                    background: '#d64541',
                  }}
                />
              </div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {boss.phase.replace('_', ' ').toUpperCase()}{boss.isEnraged ? ' · ENRAGED' : ''}
              </div>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

export function BossLayer() {
  const boss = useGameStore((s) => s.boss);
  if (!boss) return null;
  return <VillainBoss boss={boss} />;
}