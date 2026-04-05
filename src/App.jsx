import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useGameStore } from './store/gameStore'
import { GameScene } from './components/GameScene'
import { MenuUI } from './ui/MenuUI'
import { SizeSelectUI } from './ui/SizeSelectUI'
import { HUD } from './ui/HUD'
import { VoterUI } from './ui/VoterUI'
import { PodiumUI } from './ui/PodiumUI'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const currentArena = useGameStore(s => s.currentArena)

  // Arena physics preset
  const gravityY = -20

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {phase === 'menu' && <MenuUI />}
      {phase === 'sizeSelect' && <SizeSelectUI />}

      {(phase === 'playing' || phase === 'voter' || phase === 'falling' || phase === 'podium') && (
        <>
          <Canvas
            shadows
            camera={{ position: [0, 15, 20], fov: 50 }}
            gl={{ antialias: true, alpha: false }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Suspense fallback={null}>
              <Physics gravity={[0, gravityY, 0]} timeStep="vary">
                <GameScene />
              </Physics>
            </Suspense>
          </Canvas>
          <HUD />
          {phase === 'voter' && <VoterUI />}
          {phase === 'podium' && <PodiumUI />}
        </>
      )}
    </div>
  )
}
