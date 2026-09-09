import { useMemo } from 'react';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { LocalPlayer } from './players/LocalPlayer';
import { RemotePlayer } from './players/RemotePlayer';
import { GroupCamera } from './camera/GroupCamera';
import { Arena } from './scene/Arena';
import { WaveDirector } from './scene/WaveDirector';
import { EnemyLayer } from './enemies/Enemy';
import { BossLayer } from './bosses/VillainBoss';
import { WeaponPickupLayer } from './weapons/WeaponPickup';
import { EffectsLayer } from './effects/EffectsLayer';
import { ScreenShake } from './effects/ScreenShake';
import { useGameStore, type ClientPlayerState } from '../state/GameStore';

export function GameScene() {
  const players = useGameStore((s) => s.players);
  const localSessionId = useGameStore((s) => s.localSessionId);

  const { local, remote } = useMemo(() => {
    const list = Object.values(players as Record<string, ClientPlayerState>);
    const local = list.find((p) => p.sessionId === localSessionId) ?? null;
    const remote = list.filter((p) => p.sessionId !== localSessionId);
    return { local, remote };
  }, [players, localSessionId]);

  return (
    <>
      <color attach="background" args={['#05080f']} />
      <fog attach="fog" args={['#0a101c', 55, 120]} />

      <ambientLight intensity={0.35} color="#8fa8d8" />
      <hemisphereLight args={['#44506e', '#0c0e12', 0.5]} />
      <directionalLight
        position={[14, 26, 10]}
        intensity={1.5}
        color="#b8c8ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
      />
      <spotLight position={[0, 22, 0]} angle={0.6} penumbra={0.5} intensity={160} color="#5f9bff" />

      <Arena />

      <PhysicsWorld>
        {local && <LocalPlayer sessionId={local.sessionId} color={local.color} />}
      </PhysicsWorld>

      {remote.map((p) => (
        <RemotePlayer key={p.sessionId} player={p} />
      ))}

      <EnemyLayer />
      <BossLayer />
      <WeaponPickupLayer />

      <EffectsLayer />
      <ScreenShake />

      <GroupCamera />
      <WaveDirector />
    </>
  );
}