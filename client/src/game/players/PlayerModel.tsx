import { useMemo, useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Color } from 'three';
import { AnimationController } from './AnimationController';
import { mapPlayerStateToAnimation, type AnimationKey } from './animations';
import { PlayerColor, WeaponType } from '@storm-arena/shared';
import { PLAYER_COLOR_HEX } from '../../state/GameStore';

const PLAYER_MODELS: Record<string, string> = {
  [PlayerColor.RED]: '/assets/players/red.glb',
  [PlayerColor.BLUE]: '/assets/players/blue.glb',
  [PlayerColor.GREEN]: '/assets/players/green.glb',
  [PlayerColor.YELLOW]: '/assets/players/yellow.glb',
};

export function preloadPlayerModels() {
  Object.values(PLAYER_MODELS).forEach((url) => {
    useGLTF.preload(url);
  });
}

function getModelUrl(color: PlayerColor): string {
  return PLAYER_MODELS[color] ?? PLAYER_MODELS[PlayerColor.RED];
}

interface PlayerModelProps {
  color: PlayerColor;
  state: string;
  speed: number;
  alive: boolean;
  weapon?: WeaponType;
  weaponSwing?: number;
  isLocal?: boolean;
}

/**
 * Loads and renders the player GLB model with Mixamo animations.
 * Each player color has its own GLB file.
 * Expects these animation clips in the GLB:
 *   idle, walk, run, jump, fall, dodge, block, block_hit,
 *   punch_light, punch_heavy, hit_light, hit_heavy, knockdown,
 *   getup, death, victory
 */
export function PlayerModel({
  color,
  state,
  speed,
  alive,
  isLocal = false,
}: PlayerModelProps) {
  const url = getModelUrl(color);
  const gltf = useGLTF(url);
  const rootRef = useRef<Group>(null);

  const animKey = useMemo<AnimationKey>(() => {
    return mapPlayerStateToAnimation(state, speed, alive);
  }, [state, speed, alive]);

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          const copy = mat.clone();
          copy.roughness = 0.65;
          copy.metalness = 0.3;
          mesh.material = copy;
        }
      }
    });
    return root;
  }, [gltf]);

  useEffect(() => {
    if (!model) return;
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.emissive = new Color(PLAYER_COLOR_HEX[color] ?? '#ffffff');
          mat.emissiveIntensity = 0.08;
        }
      }
    });
  }, [model, color]);

  const animRequest = useMemo(() => {
    return { key: animKey, oneShot: false, speed: 1 };
  }, [animKey]);

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      <primitive object={model} />
      <AnimationController
        gltf={gltf}
        request={animRequest}
        fade={0.15}
      />
    </group>
  );
}
