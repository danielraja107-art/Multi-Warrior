import { ReactNode } from 'react';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

const HALF_EXTENT = 24;
const WALL_HEIGHT = 4;
const WALL_THICK = 0.6;

function BoundaryWalls() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_EXTENT, WALL_HEIGHT, WALL_THICK]} position={[0, WALL_HEIGHT, HALF_EXTENT]} />
        <CuboidCollider args={[HALF_EXTENT, WALL_HEIGHT, WALL_THICK]} position={[0, WALL_HEIGHT, -HALF_EXTENT]} />
        <CuboidCollider args={[WALL_THICK, WALL_HEIGHT, HALF_EXTENT]} position={[HALF_EXTENT, WALL_HEIGHT, 0]} />
        <CuboidCollider args={[WALL_THICK, WALL_HEIGHT, HALF_EXTENT]} position={[-HALF_EXTENT, WALL_HEIGHT, 0]} />
      </RigidBody>
    </group>
  );
}

interface PhysicsWorldProps {
  children: ReactNode;
}

export function PhysicsWorld({ children }: PhysicsWorldProps) {
  return (
    <Physics gravity={[0, -20, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF_EXTENT, 0.5, HALF_EXTENT]} position={[0, -0.5, 0]} />
      </RigidBody>
      <BoundaryWalls />
      {children}
    </Physics>
  );
}