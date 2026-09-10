import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { WeaponType } from '@storm-arena/shared';
import { WeaponMesh } from './WeaponMesh';
import { useGameStore, type ClientWeaponPickupState } from '../../state/GameStore';

interface WeaponPickupProps {
  pickup: ClientWeaponPickupState;
}

export function WeaponPickup({ pickup }: WeaponPickupProps) {
  const groupRef = useRef<Group>(null);
  const available = useGameStore(
    (s) => s.weaponPickups[pickup.id]?.isAvailable ?? pickup.isAvailable,
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const t = state.clock.elapsedTime;
    group.position.y = Math.sin(t * 2) * 0.06 + 0.25;
    group.rotation.y = t * 1.2;
  });

  if (!available) return null;

  return (
    <group position={[pickup.position.x, 0, pickup.position.z]}>
      <group ref={groupRef} position={[0, 0.3, 0]} scale={1.4}>
        <WeaponMesh type={pickup.type} />
      </group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#3b9eff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export function WeaponPickupLayer() {
  const pickups = useGameStore((s) => s.weaponPickups);
  return (
    <>
      {Object.values(pickups).map((p) => (
        <WeaponPickup key={p.id} pickup={p} />
      ))}
    </>
  );
}