import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { Html } from '@react-three/drei';
import { EnemyType } from '@storm-arena/shared';
import { useGameStore, type ClientEnemyState } from '../../state/GameStore';
import { mapEnemyStateToAnimation } from '../players/animations';
import { emitBurst } from '../effects/effectsBus';

const ENEMY_STYLE: Record<string, { color: string; scale: number; glow: string }> = {
  [EnemyType.BASIC]: { color: '#8a8f98', scale: 0.9, glow: '#3a3f46' },
  [EnemyType.FAST]: { color: '#9ccc65', scale: 0.78, glow: '#5c8a3a' },
  [EnemyType.HEAVY]: { color: '#b4564a', scale: 1.25, glow: '#7a2e26' },
  [EnemyType.SHIELD]: { color: '#82a3b8', scale: 1.05, glow: '#3d6a86' },
  [EnemyType.RANGED]: { color: '#a78bfa', scale: 0.92, glow: '#5b3f8f' },
  [EnemyType.ELITE]: { color: '#d64541', scale: 1.4, glow: '#fff' },
};

const _targetPos = new Vector3();
const _targetQuat = new Quaternion();
const _euler = new Euler();

interface EnemyProps {
  enemy: ClientEnemyState;
}

export const Enemy = memo(function Enemy({ enemy }: EnemyProps) {
  const groupRef = useRef<Group>(null);
  const armRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const current = useRef(new Vector3(enemy.position.x, enemy.position.y, enemy.position.z));
  const style = useMemo(() => ENEMY_STYLE[enemy.type] ?? ENEMY_STYLE[EnemyType.BASIC], [enemy.type]);

  const wasAlive = useRef(true);
  const spawned = useRef(false);
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!spawned.current) {
      spawned.current = true;
      emitBurst('dust', [enemy.position.x, 0.4, enemy.position.z], { color: '#9aa0a5', count: 8, power: 0.8 });
    }

    if (wasAlive.current && enemy.state === 'dead') {
      wasAlive.current = false;
      emitBurst('enemy_death', [enemy.position.x, 0.6, enemy.position.z], { color: '#a33a3a', count: 16, power: 1.2 });
    }
    if (!wasAlive.current && enemy.state !== 'dead') {
      wasAlive.current = true;
    }

    _targetPos.set(enemy.position.x, enemy.position.y, enemy.position.z);
    const alpha = 1 - Math.exp(-14 * delta);
    current.current.lerp(_targetPos, alpha);
    _euler.set(enemy.rotation.x, enemy.rotation.y, enemy.rotation.z);
    _targetQuat.setFromEuler(_euler);
    group.position.copy(current.current);
    if (enemy.state !== 'dead') {
      group.quaternion.slerp(_targetQuat, alpha);
    }

    const speed = Math.hypot(_targetPos.x - current.current.x, _targetPos.z - current.current.z) / Math.max(delta, 1e-3);
    const anim = mapEnemyStateToAnimation(enemy.state, speed);

    const body = bodyRef.current;
    if (body) {
      const bob = anim === 'walk' || anim === 'run' ? Math.abs(Math.sin(Date.now() * 0.02)) * 0.05 : 0;
      body.position.y = bob;
    }

    const arm = armRef.current;
    if (arm) {
      if (anim === 'punch_heavy') {
        const t = Date.now() * 0.03;
        arm.rotation.x = -1.1 + Math.sin(t) * 1.2;
      } else if (anim === 'run') {
        arm.rotation.x = Math.sin(Date.now() * 0.02) * 0.6;
      } else {
        arm.rotation.x = 0;
      }
    }
  });

  const hpPct = enemy.health / Math.max(1, enemy.maxHealth);

  return (
    <>
      <group ref={groupRef} position={[enemy.position.x, 0, enemy.position.z]} scale={style.scale}>
        <group ref={bodyRef} position={[0, 0.55, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.2, 0.45, 6, 12]} />
            <meshStandardMaterial color={style.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.66, 0]} castShadow>
            <sphereGeometry args={[0.24, 14, 14]} />
            <meshStandardMaterial color={style.color} roughness={0.75} emissive={style.glow} emissiveIntensity={enemy.type === EnemyType.ELITE ? 0.35 : 0.12} />
          </mesh>
          <mesh position={[0, 0.72, 0.16]}>
            <boxGeometry args={[0.14, 0.05, 0.02]} />
            <meshStandardMaterial color="#1a1420" />
          </mesh>

          <group ref={armRef} position={[0.28, 0.3, 0]}>
            <mesh position={[0, 0.02, 0.12]} castShadow>
              <capsuleGeometry args={[0.07, 0.3, 4, 8]} />
              <meshStandardMaterial color="#2a2e36" roughness={0.85} />
            </mesh>
            {enemy.type === EnemyType.SHIELD && (
              <group position={[0, 0.05, 0.35]} scale={1.5}>
                <mesh>
                  <boxGeometry args={[0.4, 0.6, 0.06]} />
                  <meshStandardMaterial color="#5b7488" roughness={0.4} metalness={0.5} />
                </mesh>
              </group>
            )}
            {enemy.type === EnemyType.RANGED && (
              <group position={[0, 0.05, 0.35]} scale={1.4}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.14, 0.03, 6, 10]} />
                  <meshStandardMaterial color="#d0bcf0" emissive="#8a6fd0" emissiveIntensity={0.4} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {enemy.state !== 'dead' && (
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshBasicMaterial color={style.glow} />
          </mesh>
        )}
      </group>

      {hpPct > 0 && enemy.state !== 'dead' && (
        <Html center position={[enemy.position.x, 2.1, enemy.position.z]} distanceFactor={12} zIndexRange={[10, 0]}>
          <div
            style={{
              width: 44,
              height: 5,
              background: '#1a1e26',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid #00000088',
            }}
          >
            <div
              style={{
                width: `${hpPct * 100}%`,
                height: '100%',
                background: hpPct > 0.4 ? '#6cb85c' : '#cf5b54',
              }}
            />
          </div>
        </Html>
      )}
    </>
  );
});

export function EnemyLayer() {
  const enemies = useGameStore((s) => s.enemies);
  return (
    <>
      {Object.values(enemies).map((e) => (
        <Enemy key={e.id} enemy={e} />
      ))}
    </>
  );
}
