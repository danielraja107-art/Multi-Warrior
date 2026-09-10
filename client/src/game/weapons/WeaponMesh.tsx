import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { WeaponType } from '@storm-arena/shared';

interface WeaponMeshProps {
  type: WeaponType;
  /** 0..1 swing progress; when provided the weapon swings in an arc. */
  swing?: number;
  /** Swing handedness: +1 right, -1 left. */
  handedness?: number;
  scale?: number;
}

const WOOD = '#8a5a2b';
const WOOD_DARK = '#5f3c1a';
const METAL = '#9aa3ad';
const METAL_DARK = '#4a5058';
const ROCK = '#6f7378';

/**
 * Procedural stand-in meshes for the six project weapons.
 * These are replaced by GLB models once the asset pipeline is complete.
 * The root group is centered at the gripping hand.
 */
export function WeaponMesh({ type, swing = 0, handedness = 1, scale = 1 }: WeaponMeshProps) {
  const groupRef = useRef<Group>(null);
  const rotRef = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (swing > 0 && swing < 1) {
      const target = -handedness * (0.2 + swing * 2.4);
      rotRef.current += (target - rotRef.current) * Math.min(1, 18 * delta);
    } else {
      rotRef.current += (0 - rotRef.current) * Math.min(1, 10 * delta);
    }
    group.rotation.x = rotRef.current;
  });

  return (
    <group ref={groupRef} scale={scale}>
      {renderWeapon(type)}
    </group>
  );
}

function renderWeapon(type: WeaponType) {
  switch (type) {
    case WeaponType.FIST:
      return null;
    case WeaponType.STICK:
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.05, 1.2, 6]} />
            <meshStandardMaterial color={WOOD} roughness={0.9} />
          </mesh>
        </group>
      );
    case WeaponType.BASEBALL_BAT:
      return (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0.28, 0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.55, 8]} />
            <meshStandardMaterial color={WOOD} roughness={0.55} />
          </mesh>
          <mesh position={[-0.32, 0, 0]} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.66, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
          </mesh>
          <mesh position={[-0.64, 0, 0]} castShadow>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
          </mesh>
        </group>
      );
    case WeaponType.AXE:
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.95, 6]} />
              <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>
          </group>
          <mesh position={[0.34, 0.06, 0]} rotation={[0, 0, 0.18]} castShadow>
            <boxGeometry args={[0.34, 0.35, 0.03]} />
            <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.85} />
          </mesh>
        </group>
      );
    case WeaponType.HAMMER:
      return (
        <group>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh position={[0.15, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 0.9, 8]} />
              <meshStandardMaterial color={WOOD} roughness={0.85} />
            </mesh>
          </group>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.32, 0.14, 0.14]} />
            <meshStandardMaterial color={METAL_DARK} roughness={0.4} metalness={0.9} />
          </mesh>
          <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.14, 0.3, 0.14]} />
            <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.9} />
          </mesh>
        </group>
      );
    case WeaponType.ROCK:
      return (
        <mesh castShadow>
          <icosahedronGeometry args={[0.22, 1]} />
          <meshStandardMaterial color={ROCK} roughness={0.95} />
        </mesh>
      );
    default:
      return null;
  }
}