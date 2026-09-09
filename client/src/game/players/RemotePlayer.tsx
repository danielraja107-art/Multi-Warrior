import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Quaternion, Euler, type Group } from 'three';
import { Html } from '@react-three/drei';
import { useGameStore, type ClientPlayerState } from '../../state/GameStore';
import { setLiveTransform, clearLiveTransform } from './registry';
import { PlaceholderPlayer } from './PlaceholderPlayer';
import { defaultPose } from './pose';
import { mapPlayerStateToAnimation } from './animations';

const _targetPos = new Vector3();
const _targetQuat = new Quaternion();
const _euler = new Euler();

interface RemotePlayerProps {
  player: ClientPlayerState;
}

export function RemotePlayer({ player }: RemotePlayerProps) {
  const groupRef = useRef<Group>(null);
  const currentPos = useRef(new Vector3(player.position.x, player.position.y, player.position.z));
  const currentQuat = useRef(new Quaternion());
  const pose = useRef(defaultPose()).current;

  useEffect(() => {
    return () => {
      clearLiveTransform(player.sessionId);
    };
  }, [player.sessionId]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    _targetPos.set(player.position.x, player.position.y, player.position.z);
    const alpha = 1 - Math.exp(-12 * delta);
    currentPos.current.lerp(_targetPos, alpha);

    _euler.set(player.rotation.x, player.rotation.y, player.rotation.z);
    _targetQuat.setFromEuler(_euler);
    currentQuat.current.slerp(_targetQuat, alpha);

    group.position.copy(currentPos.current);
    group.quaternion.copy(currentQuat.current);

    setLiveTransform(player.sessionId, currentPos.current.clone(), currentQuat.current.clone());

    const speed = Math.hypot(
      _targetPos.x - currentPos.current.x,
      _targetPos.z - currentPos.current.z,
    ) / Math.max(delta, 1e-3);

    const anim = mapPlayerStateToAnimation(player.state, speed, player.isAlive);
    pose.idle = anim === 'idle';
    pose.runAmount = anim === 'run' ? 1 : 0;
    pose.speed = anim === 'run' ? 8 : anim === 'walk' ? 3.5 : 0;
    pose.blocking = anim === 'block';
    pose.dodge = anim === 'dodge' ? 1 : Math.max(0, pose.dodge - delta * 4);
    pose.stagger = anim === 'hit_light' ? 1 : Math.max(0, pose.stagger - delta * 3);
    pose.fallen = anim === 'death' || anim === 'knockdown';
    pose.attack = 0;
    pose.attackKind = null;
  });

  return (
    <>
      <group ref={groupRef}>
        <PlaceholderPlayer
          color={player.color}
          poseRef={{ current: pose }}
          weapon={player.weapon}
          weaponSwing={0}
        />
        {player.isHost && (
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.3, 0.08, 0.3]} />
            <meshStandardMaterial color="#ffd54f" emissive="#ffb300" emissiveIntensity={0.6} />
          </mesh>
        )}
      </group>
      <Html center position={[player.position.x, 2.5, player.position.z]} distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          style={{
            background: 'rgba(10,14,22,0.75)',
            color: '#e6eef8',
            font: '12px monospace',
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {player.color} {player.isHost ? '· HOST' : ''}
        </div>
      </Html>
    </>
  );
}

export function cleanupRemotePlayer(sessionId: string) {
  clearLiveTransform(sessionId);
}