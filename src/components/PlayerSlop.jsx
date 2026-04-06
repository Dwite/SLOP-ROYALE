import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

const JUMP_FORCE = 10
const DASH_FORCE = 18
const DASH_COOLDOWN = 1.5
const WEAPON_COOLDOWN = 0.5

export function PlayerSlop() {
  const bodyRef = useRef()
  const meshRef = useRef()
  const keysRef = useRef({})
  const canJumpRef = useRef(false)
  const dashTimerRef = useRef(0)
  const weaponCooldownRef = useRef(0)
  const lastMoveDir = useRef([0, -1]) // default facing forward
  const slop = useGameStore(s => s.slops.find(b => b.id === 'player'))
  const playerAlive = useGameStore(s => s.playerAlive)
  const eliminateSlop = useGameStore(s => s.eliminateSlop)
  const updateSlopPosition = useGameStore(s => s.updateSlopPosition)
  const grantPushBoost = useGameStore(s => s.grantPushBoost)
  const playerSpeedBoost = useGameStore(s => s.playerSpeedBoost)
  const playerGhost = useGameStore(s => s.playerGhost)
  const playerHeavy = useGameStore(s => s.playerHeavy)
  const playerWeapon = useGameStore(s => s.playerWeapon)
  const usePlayerWeapon = useGameStore(s => s.usePlayerWeapon)
  const phase = useGameStore(s => s.phase)

  const [squash, setSquash] = useState(1)
  const bounceTimerRef = useRef(0)
  const bounceIntensityRef = useRef(0)
  const knockbackTimerRef = useRef(0) // reduces movement control after hit

  useEffect(() => {
    const onKeyDown = (e) => { keysRef.current[e.code] = true }
    const onKeyUp = (e) => { keysRef.current[e.code] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!bodyRef.current || !playerAlive || phase === 'falling') return

    const body = bodyRef.current
    const keys = keysRef.current
    const pos = body.translation()
    const vel = body.linvel()

    // Fall detection
    if (pos.y < -10) {
      eliminateSlop('player')
      return
    }

    updateSlopPosition('player', [pos.x, pos.y, pos.z])

    const baseSpeed = slop?.speed || 8
    const speedMult = 1 + (playerSpeedBoost > 0 ? 0.5 : 0)
    const totalSpeed = baseSpeed * speedMult

    // Movement
    const moveDir = new THREE.Vector3()
    if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1
    if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1
    if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1
    moveDir.normalize()

    // Reduce control during knockback so collisions feel impactful
    knockbackTimerRef.current = Math.max(0, knockbackTimerRef.current - delta)
    const knockbackFade = knockbackTimerRef.current > 0 ? knockbackTimerRef.current / 0.4 : 0
    const lerpFactor = THREE.MathUtils.lerp(0.15, 0.02, knockbackFade)

    body.setLinvel({
      x: THREE.MathUtils.lerp(vel.x, moveDir.x * totalSpeed, lerpFactor),
      y: vel.y,
      z: THREE.MathUtils.lerp(vel.z, moveDir.z * totalSpeed, lerpFactor),
    }, true)

    // Ground check
    canJumpRef.current = Math.abs(vel.y) < 0.5

    // Jump
    if (keys['Space'] && canJumpRef.current) {
      body.setLinvel({ x: vel.x, y: JUMP_FORCE, z: vel.z }, true)
      setSquash(0.6)
      setTimeout(() => setSquash(1), 150)
    }

    // Track facing direction
    if (moveDir.length() > 0) {
      lastMoveDir.current = [moveDir.x, moveDir.z]
    }

    // Dash-push (shift)
    dashTimerRef.current = Math.max(0, dashTimerRef.current - delta)
    if (keys['ShiftLeft'] && dashTimerRef.current <= 0 && moveDir.length() > 0) {
      body.applyImpulse({
        x: moveDir.x * DASH_FORCE * (slop?.mass || 1),
        y: 3,
        z: moveDir.z * DASH_FORCE * (slop?.mass || 1),
      }, true)
      dashTimerRef.current = DASH_COOLDOWN
      setSquash(1.4)
      setTimeout(() => setSquash(1), 200)
    }

    // Weapon use (Q or E)
    weaponCooldownRef.current = Math.max(0, weaponCooldownRef.current - delta)
    if ((keys['KeyQ'] || keys['KeyE']) && playerWeapon && weaponCooldownRef.current <= 0) {
      usePlayerWeapon([pos.x, pos.y, pos.z], lastMoveDir.current)
      weaponCooldownRef.current = WEAPON_COOLDOWN
      keys['KeyQ'] = false
      keys['KeyE'] = false
      setSquash(0.7)
      setTimeout(() => setSquash(1), 200)
    }

    // Consume weapon impulses aimed at player
    const pending = useGameStore.getState().pendingWeaponImpulses
    if (pending && pending.length > 0) {
      const myImpulses = pending.filter(i => i.slopId === 'player')
      if (myImpulses.length > 0) {
        for (const imp of myImpulses) {
          body.applyImpulse({ x: imp.x, y: imp.y, z: imp.z }, true)
        }
        // Remove consumed impulses
        const remaining = pending.filter(i => i.slopId !== 'player')
        useGameStore.setState({ pendingWeaponImpulses: remaining })
      }
    }

    // Collision bounce decay
    if (bounceTimerRef.current > 0) {
      bounceTimerRef.current -= delta
      // Damped spring oscillation: squish → stretch → squish → settle
      const t = bounceTimerRef.current
      const intensity = bounceIntensityRef.current
      const spring = 1 + Math.sin(t * 18) * intensity * Math.exp(-t * 4) * 0.5
      setSquash(spring)
      if (bounceTimerRef.current <= 0) setSquash(1)
    }

    // Squash-stretch + wobble
    if (meshRef.current) {
      const scale = slop?.scale || 0.5
      const targetScaleY = THREE.MathUtils.lerp(meshRef.current.scale.y, scale * squash, 0.25)
      const targetScaleXZ = THREE.MathUtils.lerp(meshRef.current.scale.x, scale / Math.sqrt(squash), 0.25)
      const wobble = Math.sin(Date.now() * 0.005) * 0.02 * scale
      meshRef.current.scale.set(targetScaleXZ, targetScaleY + wobble, targetScaleXZ)
    }
  })

  if (!playerAlive || !slop || phase === 'podium') return null

  const appearance = slop.appearance || { eyeOffsetX: 0, eyeOffsetY: 0, leftEyeSize: 0.08, rightEyeSize: 0.08 }
  const scale = slop.scale || 0.5

  return (
    <RigidBody
      ref={bodyRef}
      position={slop.position}
      colliders={false}
      mass={playerHeavy ? 10 : slop.mass}
      linearDamping={0.5}
      angularDamping={1}
      lockRotations
      name="player"
    >
      <BallCollider args={[scale]} restitution={0.9} friction={0.5}
        onCollisionEnter={(e) => {
          const other = e.other?.rigidBodyObject?.name
          if (!other) return
          if (other === 'player' || (!other.startsWith('bot-') && !other.startsWith('weapon-'))) return
          if (!other.startsWith('bot-')) return

          grantPushBoost()

          // Funny bounce — squash on impact then spring back
          bounceIntensityRef.current = 0.6 + Math.random() * 0.4
          bounceTimerRef.current = 0.8
          knockbackTimerRef.current = 0.4

          // Strong repulsion impulse away from the other slop
          if (bodyRef.current) {
            const myPos = bodyRef.current.translation()
            const otherBody = e.other?.rigidBody
            if (otherBody) {
              const otherPos = otherBody.translation()
              let dx = myPos.x - otherPos.x
              let dz = myPos.z - otherPos.z
              const dist = Math.sqrt(dx * dx + dz * dz) || 0.1
              dx /= dist
              dz /= dist
              const pushForce = 8 + Math.random() * 4
              bodyRef.current.applyImpulse(
                { x: dx * pushForce, y: 4 + Math.random() * 3, z: dz * pushForce },
                true
              )
            }
          }
        }}
      />
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={slop.color}
          roughness={0.2}
          metalness={0.15}
          emissive={slop.color}
          emissiveIntensity={playerGhost ? 0.05 : 0.2}
          transparent={playerGhost}
          opacity={playerGhost ? 0.3 : 1}
        />
      </mesh>
      {/* Eyes — slightly wrong */}
      <group position={[appearance.eyeOffsetX, 0.15 + appearance.eyeOffsetY, scale * 0.85]}>
        <mesh position={[-0.15 * scale, 0, 0]}>
          <sphereGeometry args={[appearance.leftEyeSize * scale * 2, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.15 * scale, 0, 0]}>
          <sphereGeometry args={[appearance.rightEyeSize * scale * 2, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.15 * scale, 0, 0.03 * scale]}>
          <sphereGeometry args={[appearance.leftEyeSize * scale, 16, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.15 * scale, 0, 0.03 * scale]}>
          <sphereGeometry args={[appearance.rightEyeSize * scale, 16, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      {/* Shield visual */}
      {useGameStore.getState().playerShield && (
        <mesh>
          <sphereGeometry args={[scale * 1.3, 16, 16]} />
          <meshBasicMaterial color="#44aaff" transparent opacity={0.2} side={2} />
        </mesh>
      )}
    </RigidBody>
  )
}
