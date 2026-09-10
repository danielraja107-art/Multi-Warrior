import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from '../game/GameScene';
import { LobbyOverlay } from '../ui/LobbyOverlay';
import { HudOverlay } from '../ui/HudOverlay';
import { AudioBoot } from './AudioBoot';
import { initInput } from '../game/Input';

export function App() {
  useEffect(() => {
    initInput();
    return () => {
      // clearInput owned by module life; keep listeners for app lifetime
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 16, 24] }}
      >
        <GameScene />
      </Canvas>
      <AudioBoot />
      <LobbyOverlay />
      <HudOverlay />
    </div>
  );
}