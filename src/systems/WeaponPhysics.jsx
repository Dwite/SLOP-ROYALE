import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

// Handles:
// 1. Instant weapon effects (chicken, lightning, fart) — applied once on spawn
// 2. Lifetime cleanup for all effects
// Physics-based weapons (snowball, tornado, banana, spring, goo) use Rapier
// colliders directly in WeaponEffects.jsx

export function WeaponPhysics() {
  const processedRef = useRef(new Set()) // track which instant effects we've already fired

  useFrame(() => {
    const state = useGameStore.getState()
    if (state.activeWeaponEffects.length === 0) return

    const { slops, activeWeaponEffects } = state
    const aliveSlops = slops.filter(s => s.alive)
    const impulses = []

    for (const effect of activeWeaponEffects) {
      // Only process instant weapons, and only once per effect
      if (processedRef.current.has(effect.effectId)) continue

      if (effect.weaponId === 'chicken') {
        // Melee bonk — hit all slops within radius immediately
        processedRef.current.add(effect.effectId)
        for (const slop of aliveSlops) {
          if (slop.id === effect.ownerId) continue
          const dx = slop.position[0] - effect.x
          const dz = slop.position[2] - effect.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist > effect.radius) continue

          const normX = dist > 0.01 ? dx / dist : 0
          const normZ = dist > 0.01 ? dz / dist : 0
          impulses.push({
            slopId: slop.id,
            x: normX * 12,
            y: 22,
            z: normZ * 12,
          })
        }
      } else if (effect.weaponId === 'lightning') {
        // Zap the targeted slop immediately
        processedRef.current.add(effect.effectId)
        if (effect.targetId) {
          const target = aliveSlops.find(s => s.id === effect.targetId)
          if (target) {
            impulses.push({
              slopId: target.id,
              x: (Math.random() - 0.5) * 10,
              y: 18,
              z: (Math.random() - 0.5) * 10,
            })
          }
        }
      } else if (effect.weaponId === 'fart') {
        // AoE knockback — push all nearby slops immediately
        processedRef.current.add(effect.effectId)
        for (const slop of aliveSlops) {
          if (slop.id === effect.ownerId) continue
          const dx = slop.position[0] - effect.x
          const dz = slop.position[2] - effect.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist > effect.radius) continue

          const normX = dist > 0.01 ? dx / dist : 0
          const normZ = dist > 0.01 ? dz / dist : 0
          const pushForce = 20 * (1 - dist / effect.radius)
          impulses.push({
            slopId: slop.id,
            x: normX * pushForce,
            y: 6 + Math.random() * 3,
            z: normZ * pushForce,
          })
        }
      }
    }

    if (impulses.length > 0) {
      useGameStore.setState(s => ({
        pendingWeaponImpulses: [...s.pendingWeaponImpulses, ...impulses],
      }))
    }

    // Clean up processed refs for expired effects
    const activeIds = new Set(activeWeaponEffects.map(e => e.effectId))
    for (const id of processedRef.current) {
      if (!activeIds.has(id)) processedRef.current.delete(id)
    }
  })

  return null
}
