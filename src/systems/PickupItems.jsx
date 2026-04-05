import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

function PickupOrb({ pickup, index }) {
  const meshRef = useRef()
  const collectPickup = useGameStore(s => s.collectPickup)
  const applyPickup = useGameStore(s => s.applyPickup)
  const slops = useGameStore(s => s.slops)

  useFrame(({ clock }) => {
    if (!meshRef.current) return

    // Float and spin
    meshRef.current.position.y = 1 + Math.sin(clock.elapsedTime * 3 + index) * 0.3
    meshRef.current.rotation.y = clock.elapsedTime * 2

    // Check if any alive slop is close enough to collect
    for (const slop of slops) {
      if (!slop.alive) continue
      const dx = slop.position[0] - pickup.x
      const dz = slop.position[2] - pickup.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 1.2) {
        applyPickup(slop.id, pickup.id)
        collectPickup(index)
        return
      }
    }
  })

  return (
    <group position={[pickup.x, 0, pickup.z]}>
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={pickup.color}
          emissive={pickup.color}
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial
          color={pickup.color}
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
    </group>
  )
}

export function PickupItems() {
  const activePickups = useGameStore(s => s.activePickups)

  return (
    <>
      {activePickups.map((pickup, i) => (
        <PickupOrb key={`${pickup.id}-${pickup.spawnTime}`} pickup={pickup} index={i} />
      ))}
    </>
  )
}
