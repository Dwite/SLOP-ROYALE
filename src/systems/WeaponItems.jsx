import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

function WeaponCrate({ crate, index }) {
  const meshRef = useRef()
  const collectWeaponCrate = useGameStore(s => s.collectWeaponCrate)
  const slops = useGameStore(s => s.slops)
  const playerWeapon = useGameStore(s => s.playerWeapon)

  useFrame(({ clock }) => {
    if (!meshRef.current) return

    // Float, spin, and pulse
    const t = clock.elapsedTime
    meshRef.current.position.y = 1.2 + Math.sin(t * 2.5 + index * 1.7) * 0.25
    meshRef.current.rotation.y = t * 1.5
    meshRef.current.rotation.x = Math.sin(t * 1.2) * 0.15

    // Check collection by any alive slop
    for (const slop of slops) {
      if (!slop.alive) continue
      // Player can only hold one weapon
      if (slop.id === 'player' && playerWeapon) continue
      // Bots can only hold one weapon
      if (slop.id !== 'player' && slop.weapon) continue

      const dx = slop.position[0] - crate.x
      const dz = slop.position[2] - crate.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 1.4) {
        collectWeaponCrate(index, slop.id)
        return
      }
    }
  })

  return (
    <group position={[crate.x, 0, crate.z]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={crate.color}
          emissive={crate.color}
          emissiveIntensity={0.6}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>
      {/* Question mark glow */}
      <mesh position={[0, 2, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      {/* Ground glow ring */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.8, 6]} />
        <meshBasicMaterial
          color={crate.color}
          transparent
          opacity={0.4}
          side={2}
        />
      </mesh>
    </group>
  )
}

export function WeaponItems() {
  const activeWeaponCrates = useGameStore(s => s.activeWeaponCrates)

  return (
    <>
      {activeWeaponCrates.map((crate, i) => (
        <WeaponCrate key={`${crate.id}-${crate.spawnTime}`} crate={crate} index={i} />
      ))}
    </>
  )
}
