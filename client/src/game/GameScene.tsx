import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { LocalPlayer } from './players/LocalPlayer';
import { RemotePlayer } from './players/RemotePlayer';
import { GroupCamera } from './camera/GroupCamera';
import { Arena } from './scene/Arena';
import { WaveDirector } from './scene/WaveDirector';
import { EnemyLayer } from './enemies/Enemy';
import { BossLayer } from './bosses/VillainBoss';
import { BossEnvironment } from './bosses/BossEnvironment';
import { WeaponPickupLayer } from './weapons/WeaponPickup';
import { EffectsLayer } from './effects/EffectsLayer';
import { ScreenShake } from './effects/ScreenShake';
import { FPSMonitorBridge } from './debug/FPSMonitor';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { useGameStore, type ClientPlayerState } from '../state/GameStore';

const RemotePlayers = memo(function RemotePlayers() {
  const remoteSessionIds = useGameStore(
    useShallow((s) => {
      const localId = s.localSessionId;
      return Object.keys(s.players).filter((id) => id !== localId);
    }),
  );
  const players = useGameStore((s) => s.players);

  return (
    <>
      {remoteSessionIds.map((id) => {
        const p = players[id];
        return p ? <RemotePlayer key={id} player={p} /> : null;
      })}
    </>
  );
});

export function GameScene() {
  const localSessionId = useGameStore((s) => s.localSessionId);
  const localPlayer = useGameStore((s) => {
    if (!s.localSessionId) return null;
    return s.players[s.localSessionId] ?? null;
  });

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
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.001}
      />
      <spotLight position={[0, 22, 0]} angle={0.6} penumbra={0.5} intensity={160} color="#5f9bff" />

      <Arena />

      <PhysicsWorld>
        {localPlayer && <LocalPlayer sessionId={localPlayer.sessionId} color={localPlayer.color} />}
      </PhysicsWorld>

      <RemotePlayers />

      <EnemyLayer />
      <BossLayer />
      <BossEnvironment />
      <WeaponPickupLayer />

      <EffectsLayer />
      <ScreenShake />

      <GroupCamera />
      <WaveDirector />
      <FPSMonitorBridge />
      <PerformanceMonitor />
    </>
  );
}
