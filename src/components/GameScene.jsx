import React, { useMemo } from 'react'
import { Stars } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import { PlayerSlop } from './PlayerSlop'
import { BotSlop } from './BotSlop'
import { HexArena } from '../levels/HexArena'
import { GameCamera } from './GameCamera'
import { Lighting } from './Lighting'
import { PickupItems } from '../systems/PickupItems'
import { GameLoop } from '../systems/GameLoop'

export function GameScene() {
  const slops = useGameStore(s => s.slops)
  const phase = useGameStore(s => s.phase)

  const bots = useMemo(
    () => slops.filter(s => s.id !== 'player'),
    [slops]
  )

  return (
    <>
      <Lighting />
      <GameCamera />
      <Stars radius={100} depth={50} count={3000} factor={4} />
      <fog attach="fog" args={['#0a0a2e', 40, 100]} />

      <HexArena />

      {(phase === 'playing' || phase === 'voter' || phase === 'falling') && (
        <>
          <PlayerSlop />
          {bots.map(bot => (
            <BotSlop key={bot.id} bot={bot} />
          ))}
        </>
      )}

      <PickupItems />
      <GameLoop />
    </>
  )
}
