import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Color } from 'three';

const BOSS_MODEL_URL = '/assets/bosses/boss.glb';

export interface BossTint {
  emissive: string;
  intensity: number;
}

export const BOSS_TINTS: Record<string, BossTint> = {
  phase_1: { emissive: '#4a2030', intensity: 0.3 },
  phase_2: { emissive: '#7a2a4a', intensity: 0.45 },
  phase_3: { emissive: '#a83444', intensity: 0.6 },
  enraged: { emissive: '#ff4a2a', intensity: 1.0 },
};

export function preloadBossModel() {
  useGLTF.preload(BOSS_MODEL_URL);
}

interface BossModelProps {
  phase: string;
  isEnraged: boolean;
  currentAttack: string;
}

/**
 * Mounts the real villain GLB (static mesh, textured) with phase/enrage
 * emissive tinting and lightweight procedural motion pending the rigged,
 * animated build. Falls back to a procedural figure if the GLB cannot load.
 */
export function BossModel({ phase, isEnraged, currentAttack }: BossModelProps) {
  const gltf = useGLTF(BOSS_MODEL_URL);
  const rootRef = useRef<Group>(null);

  const tint = BOSS_TINTS[phase] ?? BOSS_TINTS.phase_1;
  const speedScale = isEnraged ? 1.6 : 1;

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    let hasMesh = false;
    root.traverse((obj) => {
      if (obj.type === 'PointLight') {
        obj.visible = false;
      }
      if ((obj as Mesh).isMesh) {
        hasMesh = true;
        const mesh = obj as Mesh;
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          const copy = mat.clone();
          copy.roughness = 0.6;
          copy.metalness = 0.7;
          mesh.material = copy;
        }
      }
    });

    if (!hasMesh) return null;

    root.position.y = 0.5;
    return root;
  }, [gltf]);

  useEffect(() => {
    if (!model) return;
    const emissive = new Color(tint.emissive);
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.emissive.copy(emissive);
          mat.emissiveIntensity = isEnraged ? 1.0 : tint.intensity;
        }
      }
    });
  }, [model, tint, isEnraged]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root || !model) return;

    const t = performance.now() * 0.001;
    if (currentAttack) {
      const lunge = (1 - Math.abs(Math.sin(t * 6 * speedScale))) * 0.22;
      root.rotation.x = lunge;
      root.position.z = -lunge * 0.4;
    } else {
      root.rotation.x = 0;
      root.position.z = 0;
      root.position.y = Math.sin(t * 1.2) * 0.04;
      root.rotation.z = Math.sin(t * 0.7) * 0.02 * speedScale;
    }
  });

  if (!model) {
    return (
      <group ref={rootRef} position={[0, 0.6, 0]} scale={2.1}>
        <mesh castShadow>
          <capsuleGeometry args={[0.42, 0.9, 8, 16]} />
          <meshStandardMaterial color="#2b2e38" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.28, 0]} castShadow>
          <sphereGeometry args={[0.4, 18, 18]} />
          <meshStandardMaterial color="#241720" roughness={0.5} emissive={tint.emissive} emissiveIntensity={isEnraged ? 0.7 : 0.25} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={rootRef} position={[0, 0, 0]} scale={2.1}>
      <primitive object={model} />
    </group>
  );
}