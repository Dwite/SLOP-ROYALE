import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

const JUMP_FORCE = 10
const DASH_FORCE = 18
const DASH_COOLDOWN = 1.5

export function PlayerSlop() {
  const bodyRef = useRef()
  const meshRef = useRef()
  const keysRef = useRef({})
  const canJumpRef = useRef(false)
  const dashTimerRef = useRef(0)
  const slop = useGameStore(s => s.slops.find(b => b.id === 'player'))
  const playerAlive = useGameStore(s => s.playerAlive)
  const eliminateSlop = useGameStore(s => s.eliminateSlop)
  const updateSlopPosition = useGameStore(s => s.updateSlopPosition)
  const grantPushBoost = useGameStore(s => s.grantPushBoost)
  const playerSpeedBoost = useGameStore(s => s.playerSpeedBoost)
  const playerGhost = useGameStore(s => s.playerGhost)
  const playerHeavy = useGameStore(s => s.playerHeavy)
  const phase = useGameStore(s => s.phase)

  const [squash, setSquash] = useState(1)

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

    const lerpFactor = 0.15

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

    // Squash-stretch + wobble
    if (meshRef.current) {
      const scale = slop?.scale || 0.5
      const targetScaleY = THREE.MathUtils.lerp(meshRef.current.scale.y, scale * squash, 0.2)
      const targetScaleXZ = THREE.MathUtils.lerp(meshRef.current.scale.x, scale / Math.sqrt(squash), 0.2)
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
      <BallCollider args={[scale]} restitution={0.6} friction={0.8}
        onCollisionEnter={(e) => {
          const other = e.other?.rigidBodyObject?.name
          if (other && other.startsWith('bot-')) {
            grantPushBoost()
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
