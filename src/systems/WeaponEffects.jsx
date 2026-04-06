import React, { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider, CylinderCollider } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

// Helper: resolve hit slop from collision and fire impulse
function resolveHit(event, effect, impulseFn) {
  const otherName = event.other?.rigidBodyObject?.name
  if (!otherName || otherName === effect.ownerId) return null
  // Must be a slop (player or bot-*)
  if (otherName !== 'player' && !otherName.startsWith('bot-')) return null
  impulseFn(otherName)
  return otherName
}

// ── Banana Peel ── drop trap, sensor on ground ──────────
function BananaEffect({ effect }) {
  const meshRef = useRef()
  const hitSet = useRef(new Set())

  const onHit = useCallback((event) => {
    const name = event.other?.rigidBodyObject?.name
    if (!name || name === effect.ownerId) return
    if (name !== 'player' && !name.startsWith('bot-')) return
    if (hitSet.current.has(name)) return
    hitSet.current.add(name)

    // Slide wildly — random sideways impulse
    const slideAngle = Math.random() * Math.PI * 2
    useGameStore.setState(s => ({
      pendingWeaponImpulses: [...s.pendingWeaponImpulses, {
        slopId: name,
        x: Math.cos(slideAngle) * 18,
        y: 4,
        z: Math.sin(slideAngle) * 18,
      }],
    }))
  }, [effect.ownerId])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = clock.elapsedTime * 3
    const pulse = 0.3 + Math.sin(clock.elapsedTime * 5) * 0.1
    meshRef.current.scale.setScalar(pulse)
  })

  return (
    <RigidBody
      type="fixed"
      position={[effect.x, 0.15, effect.z]}
      colliders={false}
      name={`weapon-${effect.effectId}`}
      sensor
    >
      <BallCollider args={[effect.radius]} sensor onIntersectionEnter={onHit} />
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.15, 8, 16, Math.PI * 1.5]} />
        <meshStandardMaterial
          color="#ffe135"
          emissive="#ffe135"
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
      {/* Slip zone indicator */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[effect.radius, 16]} />
        <meshBasicMaterial color="#ffe135" transparent opacity={0.15} side={2} />
      </mesh>
    </RigidBody>
  )
}

// ── Snowball ── physics projectile, destroyed on hit ────
function SnowballEffect({ effect }) {
  const meshRef = useRef()
  const hasHit = useRef(false)

  const onHit = useCallback((event) => {
    const name = event.other?.rigidBodyObject?.name
    if (!name || name === effect.ownerId || hasHit.current) return
    if (name !== 'player' && !name.startsWith('bot-')) return
    hasHit.current = true

    useGameStore.setState(s => ({
      pendingWeaponImpulses: [...s.pendingWeaponImpulses, {
        slopId: name,
        x: effect.dirX * 10,
        y: 3,
        z: effect.dirZ * 10,
        freeze: 3,
      }],
    }))
    // Remove projectile
    useGameStore.getState().removeWeaponEffect(effect.effectId)
  }, [effect.ownerId, effect.effectId, effect.dirX, effect.dirZ])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.2
      meshRef.current.rotation.z += 0.15
    }
  })

  return (
    <RigidBody
      position={[effect.x, 1.2, effect.z]}
      colliders={false}
      linearVelocity={[effect.dirX * 22, 2, effect.dirZ * 22]}
      gravityScale={0.3}
      linearDamping={0}
      name={`weapon-${effect.effectId}`}
      ccd
    >
      <BallCollider args={[0.35]} sensor onIntersectionEnter={onHit} />
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color="#aaeeff"
          emissive="#88ddff"
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {/* Frost trail */}
      <mesh position={[0, 0, 0.3]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#ccf0ff" transparent opacity={0.4} />
      </mesh>
    </RigidBody>
  )
}

// ── Rubber Chicken ── instant AoE shockwave (visual only, impulse applied immediately) ──
function ChickenEffect({ effect }) {
  const progress = effect.lifetime / effect.maxLifetime

  return (
    <group position={[effect.x, 0.5, effect.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1 + progress * 3, 1 + progress * 3, 1]}>
        <ringGeometry args={[0.5, 0.8, 16]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={1 - progress} side={2} />
      </mesh>
      <mesh scale={[1 - progress, 1 - progress, 1 - progress]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#ffee88" transparent opacity={0.6 * (1 - progress)} />
      </mesh>
    </group>
  )
}

// ── Goo Bomb ── physics projectile → becomes static sensor zone on land ──
function GooEffect({ effect }) {
  const meshRef = useRef()
  const bodyRef = useRef()
  const hasLanded = useRef(effect.landed)

  // When flying: hit ground/wall → become zone
  const onProjectileHit = useCallback((event) => {
    const name = event.other?.rigidBodyObject?.name
    // Land on anything that isn't the owner or another weapon
    if (name === effect.ownerId) return
    if (name && name.startsWith('weapon-')) return
    if (hasLanded.current) return
    hasLanded.current = true

    // Update store: mark as landed
    const effects = useGameStore.getState().activeWeaponEffects
    useGameStore.setState({
      activeWeaponEffects: effects.map(e =>
        e.effectId === effect.effectId ? { ...e, landed: true, speed: 0 } : e
      ),
    })
  }, [effect.ownerId, effect.effectId])

  // Zone: continuous slow effect on slops inside
  const onZoneEnter = useCallback((event) => {
    const name = event.other?.rigidBodyObject?.name
    if (!name || name === effect.ownerId) return
    if (name !== 'player' && !name.startsWith('bot-')) return

    // Pull toward center + slow
    useGameStore.setState(s => ({
      pendingWeaponImpulses: [...s.pendingWeaponImpulses, {
        slopId: name,
        x: 0,
        y: 0,
        z: 0,
        slow: true,
      }],
    }))
  }, [effect.ownerId])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    if (effect.landed) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.1
      meshRef.current.scale.set(effect.radius * pulse, 0.1, effect.radius * pulse)
    }
  })

  // Flying state: physics projectile
  if (!effect.landed) {
    return (
      <RigidBody
        ref={bodyRef}
        position={[effect.x, 1.8, effect.z]}
        colliders={false}
        linearVelocity={[effect.dirX * 16, 5, effect.dirZ * 16]}
        gravityScale={0.8}
        linearDamping={0}
        name={`weapon-${effect.effectId}`}
        ccd
      >
        <BallCollider args={[0.35]} sensor onIntersectionEnter={onProjectileHit} />
        <mesh castShadow>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial
            color="#44ff66"
            emissive="#22cc44"
            emissiveIntensity={0.6}
            roughness={0.8}
            transparent
            opacity={0.8}
          />
        </mesh>
      </RigidBody>
    )
  }

  // Landed state: static sensor zone
  return (
    <RigidBody
      type="fixed"
      position={[effect.x, 0.05, effect.z]}
      colliders={false}
      name={`weapon-zone-${effect.effectId}`}
    >
      <CylinderCollider args={[0.3, effect.radius]} sensor onIntersectionEnter={onZoneEnter} />
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial
          color="#44ff66"
          emissive="#22cc44"
          emissiveIntensity={0.3}
          roughness={0.9}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Bubbles */}
      {[0, 1, 2, 3].map(i => {
        const angle = (i / 4) * Math.PI * 2
        const r = effect.radius * 0.4
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.3, Math.sin(angle) * r]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#88ff99" transparent opacity={0.5} />
          </mesh>
        )
      })}
    </RigidBody>
  )
}

// ── Tornado ── physics projectile that plows through slops ──
function TornadoEffect({ effect }) {
  const groupRef = useRef()

  const onHit = useCallback((event) => {
    const name = event.other?.rigidBodyObject?.name
    if (!name || name === effect.ownerId) return
    if (name !== 'player' && !name.startsWith('bot-')) return

    // Find slop position to calculate push direction
    const slops = useGameStore.getState().slops
    const slop = slops.find(s => s.id === name)
    if (!slop) return

    const body = event.other?.rigidBody
    const tornadoPos = body ? undefined : null // we'll use effect pos
    const dx = slop.position[0] - effect.x
    const dz = slop.position[2] - effect.z
    const dist = Math.sqrt(dx * dx + dz * dz) || 1
    const normX = dx / dist
    const normZ = dz / dist

    useGameStore.setState(s => ({
      pendingWeaponImpulses: [...s.pendingWeaponImpulses, {
        slopId: name,
        x: normX * 14,
        y: 10,
        z: normZ * 14,
      }],
    }))
  }, [effect.ownerId, effect.x, effect.z])

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 8
    }
  })

  return (
    <RigidBody
      position={[effect.x, 0.5, effect.z]}
      colliders={false}
      linearVelocity={[effect.dirX * 14, 0, effect.dirZ * 14]}
      gravityScale={0}
      linearDamping={0}
      lockRotations
      name={`weapon-${effect.effectId}`}
      ccd
    >
      <BallCollider args={[effect.radius]} sensor onIntersectionEnter={onHit} />
      <group ref={groupRef}>
        {/* Stacked spinning rings */}
        {[0, 0.5, 1.0, 1.5, 2.0].map((yOff, i) => (
          <mesh key={i} position={[0, yOff + 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3 + i * 0.15, 0.5 + i * 0.15, 12]} />
            <meshBasicMaterial color="#88ccff" transparent opacity={0.5 - i * 0.08} side={2} />
          </mesh>
        ))}
        {/* Core funnel */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.1, 0.6, 2.5, 8, 1, true]} />
          <meshBasicMaterial color="#aaddff" transparent opacity={0.25} side={2} />
        </mesh>
      </group>
    </RigidBody>
  )
}

// ── Lightning Rod ── instant visual (impulse applied on creation) ──
function LightningEffect({ effect }) {
  const progress = effect.lifetime / effect.maxLifetime

  const points = useMemo(() => {
    if (!effect.targetX) return []
    const pts = []
    const steps = 6
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = THREE.MathUtils.lerp(effect.x, effect.targetX, t) + (i > 0 && i < steps ? (Math.random() - 0.5) * 1.5 : 0)
      const y = 3 + Math.sin(t * Math.PI) * 2 + (i > 0 && i < steps ? (Math.random() - 0.5) * 0.5 : 0)
      const z = THREE.MathUtils.lerp(effect.z, effect.targetZ, t) + (i > 0 && i < steps ? (Math.random() - 0.5) * 1.5 : 0)
      pts.push(new THREE.Vector3(x, y, z))
    }
    return pts
  }, [effect.effectId])

  if (points.length < 2) return null

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [points])

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#ffff44" linewidth={3} transparent opacity={1 - progress} />
      </line>
      {effect.targetX && (
        <mesh position={[effect.targetX, 0.5, effect.targetZ]} scale={[2 - progress * 2, 2 - progress * 2, 2 - progress * 2]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#ffff88" transparent opacity={0.6 * (1 - progress)} />
        </mesh>
      )}
    </group>
  )
}

// ── Spring Mine ── fixed sensor trap, launches on contact ──
function SpringEffect({ effect }) {
  const meshRef = useRef()
  const triggered = useRef(effect.triggered)

  const onHit = useCallback((event) => {
    if (triggered.current) return
    const name = event.other?.rigidBodyObject?.name
    if (!name || name === effect.ownerId) return
    if (name !== 'player' && !name.startsWith('bot-')) return
    triggered.current = true

    // SPRING — launch sky-high
    useGameStore.setState(s => ({
      pendingWeaponImpulses: [...s.pendingWeaponImpulses, {
        slopId: name,
        x: (Math.random() - 0.5) * 5,
        y: 35,
        z: (Math.random() - 0.5) * 5,
      }],
    }))

    // Mark triggered in store, remove shortly after
    const effects = useGameStore.getState().activeWeaponEffects
    useGameStore.setState({
      activeWeaponEffects: effects.map(e =>
        e.effectId === effect.effectId ? { ...e, triggered: true, maxLifetime: e.lifetime + 0.5 } : e
      ),
    })
  }, [effect.ownerId, effect.effectId])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const bounce = Math.sin(clock.elapsedTime * 6) * 0.05
    meshRef.current.position.y = 0.2 + bounce
    meshRef.current.rotation.y = clock.elapsedTime * 2
  })

  return (
    <RigidBody
      type="fixed"
      position={[effect.x, 0, effect.z]}
      colliders={false}
      name={`weapon-${effect.effectId}`}
    >
      <BallCollider args={[effect.radius]} sensor onIntersectionEnter={onHit} />
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.3, 0.4, 0.3, 8]} />
        <meshStandardMaterial
          color="#ff8844"
          emissive="#ff6622"
          emissiveIntensity={triggered.current ? 1.0 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[0.2, 0.05, 8, 12]} />
        <meshStandardMaterial color="#ffaa66" emissive="#ff8844" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 16]} />
        <meshBasicMaterial color="#ff8844" transparent opacity={0.2} side={2} />
      </mesh>
    </RigidBody>
  )
}

// ── Mega Fart ── instant AoE (visual only, impulse applied immediately) ──
function FartEffect({ effect }) {
  const progress = effect.lifetime / effect.maxLifetime

  return (
    <group position={[effect.x, 0.5, effect.z]}>
      {[0, 0.3, 0.6].map((delay, i) => {
        const p = Math.max(0, progress - delay)
        const scale = 1 + p * 6
        return (
          <mesh key={i} position={[0, i * 0.5, 0]} rotation={[-Math.PI / 2, 0, i]} scale={[scale, scale, 1]}>
            <ringGeometry args={[0.5, 1.0, 16]} />
            <meshBasicMaterial color="#99ff66" transparent opacity={Math.max(0, 0.5 - p)} side={2} />
          </mesh>
        )
      })}
      <mesh scale={[1 + progress * 3, 1 + progress * 2, 1 + progress * 3]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#bbff88" transparent opacity={0.3 * (1 - progress)} />
      </mesh>
    </group>
  )
}

// ── Effect Router ────────────────────────────────────
function WeaponEffect({ effect }) {
  switch (effect.weaponId) {
    case 'banana': return <BananaEffect effect={effect} />
    case 'snowball': return <SnowballEffect effect={effect} />
    case 'chicken': return <ChickenEffect effect={effect} />
    case 'goo': return <GooEffect effect={effect} />
    case 'tornado': return <TornadoEffect effect={effect} />
    case 'lightning': return <LightningEffect effect={effect} />
    case 'spring': return <SpringEffect effect={effect} />
    case 'fart': return <FartEffect effect={effect} />
    default: return null
  }
}

export function WeaponEffects() {
  const activeWeaponEffects = useGameStore(s => s.activeWeaponEffects)

  return (
    <>
      {activeWeaponEffects.map(effect => (
        <WeaponEffect key={effect.effectId} effect={effect} />
      ))}
    </>
  )
}
