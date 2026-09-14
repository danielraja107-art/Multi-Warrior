import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from '../game/GameScene';
import { LobbyOverlay } from '../ui/LobbyOverlay';
import { HudOverlay } from '../ui/HudOverlay';
import { AudioBoot } from './AudioBoot';
import { FPSOverlay } from '../game/debug/FPSMonitor';
import { installProductionTrackers } from '../game/debug/ProductionChecklist';
import { initInput } from '../game/Input';

export function App() {
  useEffect(() => {
    initInput();
    installProductionTrackers();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 16, 24] }}
      >
        <GameScene />
      </Canvas>
      <AudioBoot />
      <LobbyOverlay />
      <HudOverlay />
      <FPSOverlay />
    </div>
  );
}