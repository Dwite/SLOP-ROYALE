import { create } from 'zustand'

// Arena configs — same component, different presets
const ARENA_CONFIGS = [
  { id: 1, name: 'THE CROWD', tiles: 127, radius: 1.8, friction: 0.3, restitution: 0.8, duration: 60, crackThreshold: 5, yOffset: 0, desc: 'Bouncy · Low stakes · Comedy phase' },
  { id: 2, name: 'THE SCRAMBLE', tiles: 61, radius: 1.8, friction: 0.05, restitution: 0.3, duration: 45, crackThreshold: 3, yOffset: -25, desc: 'Icy · Every tile matters · Tension rises' },
  { id: 3, name: 'THE PEAK', tiles: 37, radius: 1.8, friction: 0.5, restitution: 0.5, duration: 25, crackThreshold: 2, yOffset: -50, desc: 'Shrinking · Pure survival · Climax' },
]

const PICKUPS = [
  { id: 'shield', emoji: '🛡️', name: 'Shield Bubble', desc: 'Survive one tile crack', duration: 0, color: '#44aaff' },
  { id: 'dash', emoji: '⚡', name: 'Dash Boost', desc: 'Burst of speed', duration: 3, color: '#ffaa00' },
  { id: 'heavy', emoji: '🏋️', name: 'Heavy Slop', desc: "Can't be pushed", duration: 5, color: '#aa44ff' },
  { id: 'ghost', emoji: '👻', name: 'Ghost Mode', desc: 'Invisible to voters', duration: 5, color: '#88ffaa' },
  { id: 'magnet', emoji: '🧲', name: 'Magnet', desc: 'Pull nearby slop toward you', duration: 3, color: '#ff44aa' },
]

const WEAPONS = [
  { id: 'banana', emoji: '🍌', name: 'Banana Peel', desc: 'Drop behind — slops slide wildly', color: '#ffe135', type: 'drop' },
  { id: 'snowball', emoji: '❄️', name: 'Snowball', desc: 'Throw forward — freezes on hit', color: '#aaeeff', type: 'projectile' },
  { id: 'chicken', emoji: '🐔', name: 'Rubber Chicken', desc: 'Bonk nearby slop skyward', color: '#ffcc44', type: 'melee' },
  { id: 'goo', emoji: '💚', name: 'Goo Bomb', desc: 'Creates sticky slow zone', color: '#44ff66', type: 'projectile' },
  { id: 'tornado', emoji: '🌪️', name: 'Tornado', desc: 'Pushes everything in its path', color: '#88ccff', type: 'projectile' },
  { id: 'lightning', emoji: '⚡', name: 'Lightning Rod', desc: 'Zaps closest slop — stun!', color: '#ffff44', type: 'instant' },
  { id: 'spring', emoji: '🔧', name: 'Spring Mine', desc: 'Place trap — launches walkers', color: '#ff8844', type: 'drop' },
  { id: 'fart', emoji: '💨', name: 'Mega Fart', desc: 'AoE knockback all nearby', color: '#99ff66', type: 'instant' },
]

const SLOP_SIZES = {
  small: { mass: 0.5, speed: 12, scale: 0.4, pushResist: 0.3, label: 'Small — Fast & light' },
  medium: { mass: 1, speed: 8, scale: 0.5, pushResist: 0.6, label: 'Medium — Balanced' },
  big: { mass: 2, speed: 5, scale: 0.65, pushResist: 1.0, label: 'Big — Slow & heavy' },
}

const SLOP_COLORS = [
  '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff',
  '#44ffff', '#ff8844', '#8844ff', '#44ff88', '#ff4488',
  '#88ff44', '#4488ff', '#ffaa00', '#aa00ff', '#00ffaa',
  '#ff0088', '#0088ff', '#88ff00', '#ff00aa', '#00aaff',
]

// Generate hex grid positions (axial coordinates → world positions)
function generateHexGrid(count, radius) {
  const positions = []
  const spacing = radius * 2 * 0.88
  // Spiral outward from center
  positions.push({ q: 0, r: 0 })
  let ring = 1
  while (positions.length < count) {
    // Each ring has 6 * ring tiles
    let q = ring, r = 0
    const dirs = [
      [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0], [0, 1]
    ]
    for (let d = 0; d < 6 && positions.length < count; d++) {
      for (let s = 0; s < ring && positions.length < count; s++) {
        positions.push({ q, r })
        q += dirs[d][0]
        r += dirs[d][1]
      }
    }
    ring++
  }

  return positions.map((hex, i) => {
    const x = spacing * (hex.q + hex.r * 0.5)
    const z = spacing * (hex.r * (Math.sqrt(3) / 2))
    return { id: `tile-${i}`, q: hex.q, r: hex.r, x, z, crackVotes: 0, state: 'solid' }
  })
}

// Generate slop appearance (slightly wrong)
function generateSlopAppearance() {
  const eyeOffsetX = (Math.random() - 0.5) * 0.1
  const eyeOffsetY = (Math.random() - 0.5) * 0.08
  const eyeScale = 0.7 + Math.random() * 0.6
  const leftEyeSize = 0.06 + Math.random() * 0.04
  const rightEyeSize = 0.06 + Math.random() * 0.04
  const wobbleSpeed = 3 + Math.random() * 3
  const wobbleAmount = 0.02 + Math.random() * 0.04
  return { eyeOffsetX, eyeOffsetY, eyeScale, leftEyeSize, rightEyeSize, wobbleSpeed, wobbleAmount }
}

export const useGameStore = create((set, get) => ({
  // Game state
  phase: 'menu', // menu | sizeSelect | playing | voter | falling | podium
  currentArena: 0, // 0, 1, 2
  arenaTimer: 0,
  matchTime: 0,

  // Player
  playerAlive: true,
  playerSize: 'medium',
  playerPickup: null,
  playerPickupTimer: 0,
  playerSpeedBoost: 0,
  playerGhost: false,
  playerHeavy: false,
  playerShield: false,

  // Slops
  slops: [],
  eliminatedSlops: [],

  // Arena tiles
  tiles: [],
  tilesCracked: 0,
  tilesNeededToCrack: 0, // how many need to break before floor collapse

  // Voter state
  voterCursor: null, // which tile voter is hovering

  // Pickups on the field
  activePickups: [],

  // Weapons
  playerWeapon: null, // current weapon the player holds
  activeWeaponCrates: [], // weapon crates on the field
  activeWeaponEffects: [], // active projectiles, zones, traps on the field
  pendingWeaponImpulses: [], // impulses from weapon hits to be consumed by slop physics
  weaponUseCount: 0, // stat tracking

  // Camera
  cameraMode: 'follow', // follow | voter | falling | podium
  spectatorTarget: null,

  // Fall transition
  fallProgress: 0,

  // Announcements
  announcement: null,

  // Stats
  pushCount: 0,
  tilesCrackedByPlayer: 0,

  // Actions
  selectSize: (size) => {
    set({ playerSize: size })
  },

  startGame: () => {
    const state = get()
    const sizeConfig = SLOP_SIZES[state.playerSize]
    const sizes = ['small', 'medium', 'big']

    const arenaConfig = ARENA_CONFIGS[0]
    const tiles = generateHexGrid(arenaConfig.tiles, arenaConfig.radius)
    // Shuffle tiles for spawn positions
    const spawnTiles = [...tiles].sort(() => Math.random() - 0.5)

    const bots = Array.from({ length: 19 }, (_, i) => {
      const botSize = sizes[Math.floor(Math.random() * 3)]
      const botSizeConfig = SLOP_SIZES[botSize]
      const spawnTile = spawnTiles[(i + 1) % spawnTiles.length]
      return {
        id: `bot-${i}`,
        name: `Slop${i + 1}`,
        color: SLOP_COLORS[i + 1],
        alive: true,
        size: botSize,
        mass: botSizeConfig.mass,
        speed: botSizeConfig.speed,
        scale: botSizeConfig.scale,
        pushResist: botSizeConfig.pushResist,
        position: [spawnTile.x, 2, spawnTile.z],
        velocity: [0, 0, 0],
        pickup: null,
        ghost: false,
        heavy: false,
        shield: false,
        speedBoost: 0,
        weapon: null,
        appearance: generateSlopAppearance(),
      }
    })

    const playerSpawnTile = spawnTiles[0]

    set({
      phase: 'playing',
      currentArena: 0,
      arenaTimer: arenaConfig.duration,
      matchTime: 0,
      playerAlive: true,
      playerPickup: null,
      playerPickupTimer: 0,
      playerSpeedBoost: 0,
      playerGhost: false,
      playerHeavy: false,
      playerShield: false,
      slops: [
        {
          id: 'player',
          name: 'You',
          color: SLOP_COLORS[0],
          alive: true,
          size: state.playerSize,
          mass: sizeConfig.mass,
          speed: sizeConfig.speed,
          scale: sizeConfig.scale,
          pushResist: sizeConfig.pushResist,
          position: [playerSpawnTile.x, 2, playerSpawnTile.z],
          velocity: [0, 0, 0],
          pickup: null,
          ghost: false,
          heavy: false,
          shield: false,
          speedBoost: 0,
          appearance: generateSlopAppearance(),
        },
        ...bots,
      ],
      eliminatedSlops: [],
      tiles,
      tilesCracked: 0,
      tilesNeededToCrack: Math.floor(arenaConfig.tiles * 0.6),
      activePickups: [],
      playerWeapon: null,
      activeWeaponCrates: [],
      activeWeaponEffects: [],
      pendingWeaponImpulses: [],
      weaponUseCount: 0,
      cameraMode: 'follow',
      fallProgress: 0,
      announcement: { text: arenaConfig.name, sub: arenaConfig.desc, time: 3 },
      pushCount: 0,
      tilesCrackedByPlayer: 0,
    })
  },

  goToSizeSelect: () => {
    set({ phase: 'sizeSelect' })
  },

  eliminateSlop: (slopId) => {
    const state = get()
    const slop = state.slops.find(s => s.id === slopId)
    if (!slop || !slop.alive) return

    const updatedSlops = state.slops.map(s =>
      s.id === slopId ? { ...s, alive: false } : s
    )
    const eliminated = [...state.eliminatedSlops, slop]
    const aliveCount = updatedSlops.filter(s => s.alive).length
    const isPlayer = slopId === 'player'

    // Check for winner (last slop standing)
    if (aliveCount <= 1) {
      const winner = updatedSlops.find(s => s.alive)
      set({
        slops: updatedSlops,
        eliminatedSlops: eliminated,
        phase: 'podium',
        cameraMode: 'podium',
        spectatorTarget: winner?.id || null,
        announcement: winner?.id === 'player'
          ? { text: 'YOU WIN!', sub: 'Last slop standing!', time: 5 }
          : { text: 'GAME OVER', sub: `${winner?.name || 'Nobody'} wins!`, time: 5 },
      })
      return
    }

    const updates = {
      slops: updatedSlops,
      eliminatedSlops: eliminated,
    }

    if (isPlayer) {
      updates.playerAlive = false
      updates.phase = 'voter'
      updates.cameraMode = 'voter'
      updates.announcement = { text: '> PROMPT ENGINEER MODE', sub: 'Click tiles to crack them. Destroy the survivors.', time: 3 }
    }

    set(updates)
  },

  // Voter clicks a tile to add crack vote
  voteCrackTile: (tileId) => {
    const state = get()
    if (state.phase !== 'voter') return

    const arenaConfig = ARENA_CONFIGS[state.currentArena]
    const updatedTiles = state.tiles.map(t => {
      if (t.id !== tileId || t.state !== 'solid') return t
      const newVotes = t.crackVotes + 1
      if (newVotes >= arenaConfig.crackThreshold) {
        return { ...t, crackVotes: newVotes, state: 'cracking' }
      }
      return { ...t, crackVotes: newVotes }
    })

    const newCracked = updatedTiles.filter(t => t.state === 'cracking' || t.state === 'broken').length

    set({
      tiles: updatedTiles,
      tilesCracked: newCracked,
      tilesCrackedByPlayer: state.tilesCrackedByPlayer + 1,
    })
  },

  // Called by physics system when a cracking tile finishes its animation
  breakTile: (tileId) => {
    const state = get()
    const updatedTiles = state.tiles.map(t =>
      t.id === tileId ? { ...t, state: 'broken' } : t
    )
    const crackedCount = updatedTiles.filter(t => t.state === 'broken').length

    const updates = { tiles: updatedTiles, tilesCracked: crackedCount }

    // Check if enough tiles cracked for floor collapse
    if (crackedCount >= state.tilesNeededToCrack) {
      updates.phase = 'falling'
      updates.cameraMode = 'falling'
      updates.fallProgress = 0
      updates.announcement = { text: 'FLOOR COLLAPSE!', sub: 'Hold on...', time: 2 }
    }

    set(updates)
  },

  // Transition to next arena after fall
  nextArena: () => {
    const state = get()
    const nextIdx = state.currentArena + 1

    if (nextIdx >= ARENA_CONFIGS.length) {
      // Final arena already done — find winner from alive slops
      const alive = state.slops.filter(s => s.alive)
      const winner = alive.length > 0 ? alive[0] : null
      set({
        phase: 'podium',
        cameraMode: 'podium',
        spectatorTarget: winner?.id || null,
        announcement: winner?.id === 'player'
          ? { text: 'YOU WIN!', sub: 'Last slop standing!', time: 5 }
          : { text: 'GAME OVER', sub: `${winner?.name || 'Nobody'} wins!`, time: 5 },
      })
      return
    }

    const arenaConfig = ARENA_CONFIGS[nextIdx]
    const tiles = generateHexGrid(arenaConfig.tiles, arenaConfig.radius)

    set({
      currentArena: nextIdx,
      arenaTimer: arenaConfig.duration,
      tiles,
      tilesCracked: 0,
      tilesNeededToCrack: Math.floor(arenaConfig.tiles * 0.6),
      phase: state.playerAlive ? 'playing' : 'voter',
      cameraMode: state.playerAlive ? 'follow' : 'voter',
      fallProgress: 0,
      activePickups: [],
      playerWeapon: null,
      activeWeaponCrates: [],
      activeWeaponEffects: [],
      announcement: { text: `ARENA ${nextIdx + 1}`, sub: arenaConfig.name + ' — ' + arenaConfig.desc, time: 3 },
    })
  },

  // Bot auto-crack tiles (simulating dead bot voters)
  botVoteCrack: () => {
    const state = get()
    if (state.phase !== 'playing' && state.phase !== 'voter') return
    const deadBots = state.eliminatedSlops.filter(s => s.id !== 'player')
    if (deadBots.length === 0) return

    const solidTiles = state.tiles.filter(t => t.state === 'solid')
    if (solidTiles.length === 0) return

    // Each dead bot has a chance to vote
    const arenaConfig = ARENA_CONFIGS[state.currentArena]
    const tile = solidTiles[Math.floor(Math.random() * solidTiles.length)]

    const updatedTiles = state.tiles.map(t => {
      if (t.id !== tile.id) return t
      const newVotes = t.crackVotes + 1
      if (newVotes >= arenaConfig.crackThreshold) {
        return { ...t, crackVotes: newVotes, state: 'cracking' }
      }
      return { ...t, crackVotes: newVotes }
    })

    const newCracked = updatedTiles.filter(t => t.state === 'cracking' || t.state === 'broken').length
    set({ tiles: updatedTiles, tilesCracked: newCracked })
  },

  updateSlopPosition: (slopId, position) => {
    const state = get()
    set({
      slops: state.slops.map(s =>
        s.id === slopId ? { ...s, position: [...position] } : s
      ),
    })
  },

  applyPickup: (slopId, pickupId) => {
    const pickup = PICKUPS.find(p => p.id === pickupId)
    if (!pickup) return
    const state = get()

    if (slopId === 'player') {
      const updates = { playerPickup: pickupId }
      if (pickupId === 'shield') updates.playerShield = true
      if (pickupId === 'ghost') updates.playerGhost = true
      if (pickupId === 'heavy') updates.playerHeavy = true
      if (pickupId === 'dash') updates.playerSpeedBoost = 3
      if (pickup.duration > 0) updates.playerPickupTimer = pickup.duration
      set(updates)
    }
  },

  spawnPickup: () => {
    const state = get()
    const solidTiles = state.tiles.filter(t => t.state === 'solid')
    if (solidTiles.length === 0 || state.activePickups.length >= 3) return

    const tile = solidTiles[Math.floor(Math.random() * solidTiles.length)]
    const pickup = PICKUPS[Math.floor(Math.random() * PICKUPS.length)]

    set({
      activePickups: [...state.activePickups, {
        ...pickup,
        tileId: tile.id,
        x: tile.x,
        z: tile.z,
        spawnTime: Date.now(),
      }],
    })
  },

  collectPickup: (pickupIndex) => {
    const state = get()
    set({
      activePickups: state.activePickups.filter((_, i) => i !== pickupIndex),
    })
  },

  updateTimer: (dt) => {
    const state = get()
    if (state.phase !== 'playing' && state.phase !== 'voter') return

    const updates = { matchTime: state.matchTime + dt }

    // Arena timer
    const newTimer = Math.max(0, state.arenaTimer - dt)
    updates.arenaTimer = newTimer

    // If arena timer runs out, collapse floor
    if (newTimer <= 0 && state.phase !== 'falling') {
      updates.phase = 'falling'
      updates.cameraMode = 'falling'
      updates.fallProgress = 0
      updates.announcement = { text: 'TIME UP!', sub: 'Floor collapsing...', time: 2 }
    }

    // Player pickup timer
    if (state.playerPickupTimer > 0) {
      updates.playerPickupTimer = Math.max(0, state.playerPickupTimer - dt)
      if (updates.playerPickupTimer <= 0) {
        updates.playerPickup = null
        updates.playerGhost = false
        updates.playerHeavy = false
        updates.playerSpeedBoost = 0
      }
    }

    // Speed boost decay
    if (state.playerSpeedBoost > 0 && !state.playerPickup) {
      updates.playerSpeedBoost = Math.max(0, state.playerSpeedBoost - dt)
    }

    // Announcement timer
    if (state.announcement && state.announcement.time > 0) {
      const newAnnoTime = state.announcement.time - dt
      if (newAnnoTime <= 0) {
        updates.announcement = null
      } else {
        updates.announcement = { ...state.announcement, time: newAnnoTime }
      }
    }

    set(updates)
  },

  grantPushBoost: () => {
    set({
      playerSpeedBoost: 1.5,
      pushCount: get().pushCount + 1,
    })
  },

  // === WEAPON ACTIONS ===

  spawnWeaponCrate: () => {
    const state = get()
    const solidTiles = state.tiles.filter(t => t.state === 'solid')
    if (solidTiles.length === 0 || state.activeWeaponCrates.length >= 2) return

    const tile = solidTiles[Math.floor(Math.random() * solidTiles.length)]
    const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)]

    set({
      activeWeaponCrates: [...state.activeWeaponCrates, {
        ...weapon,
        tileId: tile.id,
        x: tile.x,
        z: tile.z,
        spawnTime: Date.now(),
      }],
    })
  },

  collectWeaponCrate: (crateIndex, slopId) => {
    const state = get()
    const crate = state.activeWeaponCrates[crateIndex]
    if (!crate) return

    const updates = {
      activeWeaponCrates: state.activeWeaponCrates.filter((_, i) => i !== crateIndex),
    }

    if (slopId === 'player') {
      updates.playerWeapon = crate.id
    }

    // Update bot weapon in slops array
    if (slopId !== 'player') {
      updates.slops = state.slops.map(s =>
        s.id === slopId ? { ...s, weapon: crate.id } : s
      )
    }

    set(updates)
  },

  usePlayerWeapon: (playerPos, facingDir) => {
    const state = get()
    if (!state.playerWeapon) return null

    const weaponDef = WEAPONS.find(w => w.id === state.playerWeapon)
    if (!weaponDef) return null

    const weaponId = state.playerWeapon
    const effectId = `effect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const effect = {
      effectId,
      weaponId,
      color: weaponDef.color,
      type: weaponDef.type,
      ownerId: 'player',
      x: playerPos[0],
      y: playerPos[1],
      z: playerPos[2],
      dirX: facingDir[0],
      dirZ: facingDir[1],
      spawnTime: Date.now(),
      lifetime: 0,
    }

    // Weapon-specific properties
    if (weaponId === 'banana') {
      // Drop behind player
      effect.x -= facingDir[0] * 1.5
      effect.z -= facingDir[1] * 1.5
      effect.maxLifetime = 8
      effect.radius = 1.2
    } else if (weaponId === 'snowball') {
      effect.speed = 20
      effect.maxLifetime = 2
      effect.radius = 0.8
    } else if (weaponId === 'chicken') {
      effect.maxLifetime = 0.3
      effect.radius = 2.5
    } else if (weaponId === 'goo') {
      effect.speed = 15
      effect.maxLifetime = 6
      effect.radius = 2.0
      effect.landed = false
    } else if (weaponId === 'tornado') {
      effect.speed = 12
      effect.maxLifetime = 3
      effect.radius = 2.0
    } else if (weaponId === 'lightning') {
      // Find closest slop
      const aliveSlops = state.slops.filter(s => s.alive && s.id !== 'player')
      let closest = null
      let closestDist = Infinity
      for (const s of aliveSlops) {
        const dx = s.position[0] - playerPos[0]
        const dz = s.position[2] - playerPos[2]
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < closestDist && dist < 8) {
          closestDist = dist
          closest = s
        }
      }
      if (closest) {
        effect.targetId = closest.id
        effect.targetX = closest.position[0]
        effect.targetZ = closest.position[2]
      }
      effect.maxLifetime = 0.5
      effect.radius = 1.0
    } else if (weaponId === 'spring') {
      effect.maxLifetime = 10
      effect.radius = 1.0
      effect.triggered = false
    } else if (weaponId === 'fart') {
      effect.maxLifetime = 0.6
      effect.radius = 4.0
    }

    set({
      playerWeapon: null,
      weaponUseCount: state.weaponUseCount + 1,
      activeWeaponEffects: [...state.activeWeaponEffects, effect],
    })

    return effect
  },

  useBotWeapon: (botId, botPos, facingDir) => {
    const state = get()
    const bot = state.slops.find(s => s.id === botId)
    if (!bot || !bot.weapon) return

    const weaponDef = WEAPONS.find(w => w.id === bot.weapon)
    if (!weaponDef) return

    const weaponId = bot.weapon
    const effectId = `effect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const effect = {
      effectId,
      weaponId,
      color: weaponDef.color,
      type: weaponDef.type,
      ownerId: botId,
      x: botPos[0],
      y: botPos[1] || 0.5,
      z: botPos[2],
      dirX: facingDir[0],
      dirZ: facingDir[1],
      spawnTime: Date.now(),
      lifetime: 0,
    }

    if (weaponId === 'banana') {
      effect.x -= facingDir[0] * 1.5
      effect.z -= facingDir[1] * 1.5
      effect.maxLifetime = 8
      effect.radius = 1.2
    } else if (weaponId === 'snowball') {
      effect.speed = 20
      effect.maxLifetime = 2
      effect.radius = 0.8
    } else if (weaponId === 'chicken') {
      effect.maxLifetime = 0.3
      effect.radius = 2.5
    } else if (weaponId === 'goo') {
      effect.speed = 15
      effect.maxLifetime = 6
      effect.radius = 2.0
      effect.landed = false
    } else if (weaponId === 'tornado') {
      effect.speed = 12
      effect.maxLifetime = 3
      effect.radius = 2.0
    } else if (weaponId === 'lightning') {
      const aliveSlops = state.slops.filter(s => s.alive && s.id !== botId)
      let closest = null
      let closestDist = Infinity
      for (const s of aliveSlops) {
        const dx = s.position[0] - botPos[0]
        const dz = s.position[2] - botPos[2]
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < closestDist && dist < 8) {
          closestDist = dist
          closest = s
        }
      }
      if (closest) {
        effect.targetId = closest.id
        effect.targetX = closest.position[0]
        effect.targetZ = closest.position[2]
      }
      effect.maxLifetime = 0.5
      effect.radius = 1.0
    } else if (weaponId === 'spring') {
      effect.maxLifetime = 10
      effect.radius = 1.0
      effect.triggered = false
    } else if (weaponId === 'fart') {
      effect.maxLifetime = 0.6
      effect.radius = 4.0
    }

    set({
      slops: state.slops.map(s => s.id === botId ? { ...s, weapon: null } : s),
      activeWeaponEffects: [...state.activeWeaponEffects, effect],
    })
  },

  updateWeaponEffects: (dt) => {
    const state = get()
    if (state.activeWeaponEffects.length === 0) return

    // Only track lifetimes — Rapier handles projectile movement
    const updated = []
    for (const effect of state.activeWeaponEffects) {
      const e = { ...effect, lifetime: effect.lifetime + dt }
      if (e.lifetime < e.maxLifetime) {
        updated.push(e)
      }
    }

    set({ activeWeaponEffects: updated })
  },

  removeWeaponEffect: (effectId) => {
    const state = get()
    set({
      activeWeaponEffects: state.activeWeaponEffects.filter(e => e.effectId !== effectId),
    })
  },

  returnToMenu: () => set({ phase: 'menu' }),

  getArenaConfig: () => ARENA_CONFIGS[get().currentArena],
  getSlopSizes: () => SLOP_SIZES,
  getPickups: () => PICKUPS,
  getWeapons: () => WEAPONS,
}))
