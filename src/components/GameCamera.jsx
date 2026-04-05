import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

export function GameCamera() {
  const { camera } = useThree()
  const slops = useGameStore(s => s.slops)
  const cameraMode = useGameStore(s => s.cameraMode)
  const currentArena = useGameStore(s => s.currentArena)
  const targetPos = useRef(new THREE.Vector3(0, 15, 20))
  const targetLook = useRef(new THREE.Vector3(0, 0, 0))
  const shakeRef = useRef(0)

  useFrame((_, delta) => {
    if (cameraMode === 'follow') {
      const player = slops.find(s => s.id === 'player')
      if (player?.alive) {
        const [px, py, pz] = player.position
        targetPos.current.set(px, py + 14, pz + 20)
        targetLook.current.set(px, py, pz - 3)
      }
    } else if (cameraMode === 'voter') {
      // Top-down view of the arena
      const height = 30 - currentArena * 5
      targetPos.current.set(0, height, 12)
      targetLook.current.set(0, 0, 0)
    } else if (cameraMode === 'falling') {
      // Pull out to show the fall
      targetPos.current.set(0, 35, 30)
      targetLook.current.set(0, -10, 0)
      shakeRef.current = 0.8
    } else if (cameraMode === 'podium') {
      targetPos.current.set(0, 10, 15)
      targetLook.current.set(0, 1, 0)
    }

    // Shake decay
    shakeRef.current = Math.max(0, shakeRef.current - delta * 1.5)
    const shake = shakeRef.current
    const shakeX = shake * (Math.random() - 0.5) * 0.5
    const shakeY = shake * (Math.random() - 0.5) * 0.3

    camera.position.lerp(targetPos.current, 3 * delta)
    camera.position.x += shakeX
    camera.position.y += shakeY
    camera.lookAt(targetLook.current)
  })

  return null
}
