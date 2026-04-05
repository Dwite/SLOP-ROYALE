import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

function HexTile({ tile, arenaConfig, yBase }) {
  const meshRef = useRef()
  const crackTimeRef = useRef(0)
  const breakTile = useGameStore(s => s.breakTile)

  const warningColor = useMemo(() => {
    if (tile.crackVotes === 0) return null
    const ratio = tile.crackVotes / arenaConfig.crackThreshold
    return new THREE.Color().lerpColors(
      new THREE.Color('#3a3a6a'),
      new THREE.Color('#ff4444'),
      Math.min(ratio, 0.9)
    )
  }, [tile.crackVotes, arenaConfig.crackThreshold])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    if (tile.state === 'cracking') {
      crackTimeRef.current += delta
      // Shake and sink
      meshRef.current.position.y = yBase - crackTimeRef.current * 2
      meshRef.current.rotation.x = Math.sin(crackTimeRef.current * 30) * 0.1
      meshRef.current.rotation.z = Math.cos(crackTimeRef.current * 25) * 0.1

      if (crackTimeRef.current > 1.0) {
        breakTile(tile.id)
      }
    } else if (tile.state === 'solid' && warningColor) {
      // Pulse warning
      const pulse = Math.sin(Date.now() * 0.008 * tile.crackVotes) * 0.15
      meshRef.current.scale.y = 1 + pulse
    }
  })

  if (tile.state === 'broken') return null

  const color = tile.state === 'cracking'
    ? '#ff2222'
    : warningColor
      ? `#${warningColor.getHexString()}`
      : '#3a3a6a'

  const emissiveIntensity = tile.state === 'cracking' ? 0.5 : tile.crackVotes > 0 ? 0.2 : 0.05

  return (
    <RigidBody type="fixed" position={[tile.x, yBase, tile.z]}>
      <CylinderCollider args={[0.15, arenaConfig.radius * 0.95]} />
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[arenaConfig.radius, arenaConfig.radius, 0.3, 6]} />
        <meshStandardMaterial
          color={color}
          roughness={arenaConfig.friction > 0.2 ? 0.6 : 0.1}
          metalness={arenaConfig.friction > 0.2 ? 0.1 : 0.4}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Crack indicator ring */}
      {tile.crackVotes > 0 && tile.state === 'solid' && (
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[arenaConfig.radius * 0.7, arenaConfig.radius * 0.9, 6]} />
          <meshBasicMaterial
            color="#ff4444"
            transparent
            opacity={0.3 * (tile.crackVotes / arenaConfig.crackThreshold)}
            side={2}
          />
        </mesh>
      )}
    </RigidBody>
  )
}

export function HexArena() {
  const tiles = useGameStore(s => s.tiles)
  const currentArena = useGameStore(s => s.currentArena)
  const phase = useGameStore(s => s.phase)

  const arenaConfig = useMemo(() => {
    const configs = [
      { id: 1, tiles: 127, radius: 1.8, friction: 0.3, restitution: 0.8, crackThreshold: 5 },
      { id: 2, tiles: 61, radius: 1.8, friction: 0.05, restitution: 0.3, crackThreshold: 3 },
      { id: 3, tiles: 37, radius: 1.8, friction: 0.5, restitution: 0.5, crackThreshold: 2 },
    ]
    return configs[currentArena] || configs[0]
  }, [currentArena])

  const yBase = 0

  // Compute arena radius for boundary walls
  const arenaRadius = useMemo(() => {
    if (tiles.length === 0) return 10
    let maxDist = 0
    for (const t of tiles) {
      const d = Math.sqrt(t.x * t.x + t.z * t.z)
      if (d > maxDist) maxDist = d
    }
    return maxDist + arenaConfig.radius + 0.5
  }, [tiles, arenaConfig.radius])

  // Generate wall segments around the perimeter
  const wallSegments = useMemo(() => {
    const segments = []
    const count = 12
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const nextAngle = ((i + 1) / count) * Math.PI * 2
      const midAngle = (angle + nextAngle) / 2
      const x = Math.cos(midAngle) * arenaRadius
      const z = Math.sin(midAngle) * arenaRadius
      segments.push({ x, z, rotation: midAngle + Math.PI / 2 })
    }
    return segments
  }, [arenaRadius])

  return (
    <>
      {tiles.map(tile => (
        <HexTile
          key={tile.id}
          tile={tile}
          arenaConfig={arenaConfig}
          yBase={yBase}
        />
      ))}

      {/* Invisible boundary walls — keep slops on the arena */}
      {wallSegments.map((seg, i) => (
        <RigidBody key={`wall-${i}`} type="fixed" position={[seg.x, 3, seg.z]} rotation={[0, seg.rotation, 0]}>
          <CuboidCollider args={[arenaRadius * 0.6, 5, 0.3]} restitution={0.8} />
        </RigidBody>
      ))}

      {/* Solid floor slightly below tiles — catches slops in gaps */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <CuboidCollider args={[arenaRadius + 1, 0.2, arenaRadius + 1]} />
        <mesh receiveShadow>
          <boxGeometry args={[(arenaRadius + 1) * 2, 0.1, (arenaRadius + 1) * 2]} />
          <meshStandardMaterial color="#1a1a3a" roughness={1} transparent opacity={0.5} />
        </mesh>
      </RigidBody>

      {/* Kill zone far below — only reachable through broken tiles */}
      <RigidBody type="fixed" position={[0, -15, 0]} sensor>
        <CuboidCollider args={[50, 1, 50]} />
      </RigidBody>

      {/* Arena border glow ring */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[arenaRadius - 0.5, arenaRadius, 64]} />
        <meshBasicMaterial color="#ff44ff" transparent opacity={0.2} side={2} />
      </mesh>
    </>
  )
}
