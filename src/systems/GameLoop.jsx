import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/gameStore'

const PICKUP_SPAWN_INTERVAL = 8
const WEAPON_SPAWN_INTERVAL = 12
const FALL_DURATION = 3
const GRACE_PERIOD = 8 // seconds before tiles start cracking
const BASE_CRACK_INTERVAL = 4 // seconds between auto-cracks (no dead bots)
const DEAD_CRACK_INTERVAL = 2.5 // seconds between dead bot cracks

export function GameLoop() {
  const updateTimer = useGameStore(s => s.updateTimer)
  const botVoteCrack = useGameStore(s => s.botVoteCrack)
  const spawnPickup = useGameStore(s => s.spawnPickup)
  const spawnWeaponCrate = useGameStore(s => s.spawnWeaponCrate)
  const updateWeaponEffects = useGameStore(s => s.updateWeaponEffects)
  const nextArena = useGameStore(s => s.nextArena)
  const phase = useGameStore(s => s.phase)
  const eliminatedSlops = useGameStore(s => s.eliminatedSlops)
  const matchTime = useGameStore(s => s.matchTime)

  const botVoteTimerRef = useRef(GRACE_PERIOD)
  const pickupTimerRef = useRef(5)
  const weaponTimerRef = useRef(6)
  const fallTimerRef = useRef(0)

  useFrame((_, delta) => {
    if (phase === 'playing' || phase === 'voter') {
      updateTimer(delta)

      // Grace period — no tile cracking for the first N seconds
      if (matchTime < GRACE_PERIOD) {
        botVoteTimerRef.current = 2
      } else {
        const deadBots = eliminatedSlops.filter(s => s.id !== 'player')

        botVoteTimerRef.current -= delta
        if (botVoteTimerRef.current <= 0) {
          if (deadBots.length > 0) {
            // Dead bots crack tiles — more dead = slightly faster
            const votes = Math.min(Math.ceil(deadBots.length / 3), 3)
            for (let i = 0; i < votes; i++) {
              botVoteCrack()
            }
            botVoteTimerRef.current = DEAD_CRACK_INTERVAL
          } else {
            // Slow auto-crack to keep the game moving
            botVoteCrack()
            botVoteTimerRef.current = BASE_CRACK_INTERVAL
          }
        }
      }

      // Spawn pickups
      pickupTimerRef.current -= delta
      if (pickupTimerRef.current <= 0) {
        spawnPickup()
        pickupTimerRef.current = PICKUP_SPAWN_INTERVAL
      }

      // Spawn weapon crates
      weaponTimerRef.current -= delta
      if (weaponTimerRef.current <= 0) {
        spawnWeaponCrate()
        weaponTimerRef.current = WEAPON_SPAWN_INTERVAL
      }

      // Update weapon effects (move projectiles, decay lifetimes)
      updateWeaponEffects(delta)
    }

    // Fall transition
    if (phase === 'falling') {
      fallTimerRef.current += delta
      if (fallTimerRef.current >= FALL_DURATION) {
        fallTimerRef.current = 0
        nextArena()
      }
    }
  })

  return null
}
