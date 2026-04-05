import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

export function BotSlop({ bot }) {
  const bodyRef = useRef()
  const meshRef = useRef()
  const eliminateSlop = useGameStore(s => s.eliminateSlop)
  const updateSlopPosition = useGameStore(s => s.updateSlopPosition)
  const tiles = useGameStore(s => s.tiles)
  const phase = useGameStore(s => s.phase)

  const behavior = useMemo(() => ({
    wanderAngle: Math.random() * Math.PI * 2,
    changeTimer: 0,
    changeInterval: 1 + Math.random() * 3,
    jumpChance: 0.015,
  }), [])

  useFrame((_, delta) => {
    if (!bodyRef.current || !bot.alive || phase === 'falling') return

    const body = bodyRef.current
    const pos = body.translation()
    const vel = body.linvel()

    if (pos.y < -10) {
      eliminateSlop(bot.id)
      return
    }

    updateSlopPosition(bot.id, [pos.x, pos.y, pos.z])

    // Smart tile-aware movement
    behavior.changeTimer += delta
    if (behavior.changeTimer > behavior.changeInterval) {
      behavior.changeTimer = 0

      const solidTiles = tiles.filter(t => t.state === 'solid')
      if (solidTiles.length > 0) {
        // Check if currently standing on a dangerous tile
        const currentTile = tiles.find(t => {
          const d = Math.hypot(t.x - pos.x, t.z - pos.z)
          return d < 1.5
        })
        const onDanger = currentTile && (currentTile.state === 'cracking' || currentTile.state === 'broken' || currentTile.crackVotes > 0)

        if (onDanger) {
          // FLEE — find nearest safe tile with no cracks and run to it
          const safeTiles = solidTiles.filter(t => t.crackVotes === 0)
          const target = (safeTiles.length > 0 ? safeTiles : solidTiles)
            .reduce((best, t) => {
              const d = Math.hypot(t.x - pos.x, t.z - pos.z)
              return d < best.dist ? { tile: t, dist: d } : best
            }, { tile: solidTiles[0], dist: Infinity })
          behavior.wanderAngle = Math.atan2(target.tile.z - pos.z, target.tile.x - pos.x)
          behavior.changeInterval = 0.3 // react fast when in danger
        } else if (Math.random() > 0.4) {
          // Pick a random solid tile to wander toward (prefer safe ones)
          const safeTiles = solidTiles.filter(t => t.crackVotes === 0)
          const pool = safeTiles.length > 3 ? safeTiles : solidTiles
          const target = pool[Math.floor(Math.random() * pool.length)]
          behavior.wanderAngle = Math.atan2(target.z - pos.z, target.x - pos.x)
          behavior.changeInterval = 1 + Math.random() * 2
        } else {
          // Random wander
          behavior.wanderAngle += (Math.random() - 0.5) * 1.5
          behavior.changeInterval = 1 + Math.random() * 3
        }
      }
    }

    const speed = bot.speed || 6
    const moveX = Math.cos(behavior.wanderAngle) * speed
    const moveZ = Math.sin(behavior.wanderAngle) * speed

    body.setLinvel({
      x: THREE.MathUtils.lerp(vel.x, moveX, 0.1),
      y: vel.y,
      z: THREE.MathUtils.lerp(vel.z, moveZ, 0.1),
    }, true)

    // Random jump
    if (Math.random() < behavior.jumpChance && Math.abs(vel.y) < 0.5) {
      body.setLinvel({ x: vel.x, y: 9, z: vel.z }, true)
    }

    // Wobble animation
    if (meshRef.current) {
      const s = bot.scale || 0.5
      const wobble = Math.sin(Date.now() * (bot.appearance?.wobbleSpeed || 4) + bot.id.charCodeAt(4) * 100) * (bot.appearance?.wobbleAmount || 0.03)
      meshRef.current.scale.set(s + wobble, s - wobble, s + wobble)
    }
  })

  if (!bot.alive) return null

  const appearance = bot.appearance || { eyeOffsetX: 0, eyeOffsetY: 0, leftEyeSize: 0.08, rightEyeSize: 0.08 }
  const scale = bot.scale || 0.5

  return (
    <RigidBody
      ref={bodyRef}
      position={bot.position}
      colliders={false}
      mass={bot.mass || 1}
      linearDamping={0.5}
      angularDamping={1}
      lockRotations
      name={bot.id}
    >
      <BallCollider args={[scale]} restitution={0.6} friction={0.8} />
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={bot.color}
          roughness={0.2}
          metalness={0.15}
          emissive={bot.color}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Eyes */}
      <group position={[appearance.eyeOffsetX, 0.15 + appearance.eyeOffsetY, scale * 0.85]}>
        <mesh position={[-0.15 * scale, 0, 0]}>
          <sphereGeometry args={[appearance.leftEyeSize * scale * 2, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.15 * scale, 0, 0]}>
          <sphereGeometry args={[appearance.rightEyeSize * scale * 2, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.15 * scale, 0, 0.03 * scale]}>
          <sphereGeometry args={[appearance.leftEyeSize * scale, 12, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.15 * scale, 0, 0.03 * scale]}>
          <sphereGeometry args={[appearance.rightEyeSize * scale, 12, 12]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    </RigidBody>
  )
}
