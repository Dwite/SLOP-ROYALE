# SLOP ROYALE

> 20 slops. Collapsing platforms. Push each other off. Die → type chaos into existence. Last slop standing wins.

**Vibe Jam 2026 Entry** — *90% AI-generated. 100% chaos. 0% apologies.*

## Play

```bash
npm install
npm run dev
```

Open http://localhost:3000 — slop in motion within 5 seconds.

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Space | Jump |
| Shift | Dash-push |

When eliminated → **Prompt Engineer Mode**: click tiles to crack them under survivors.

## The Concept

Every party game: die = sit and watch.
SLOP ROYALE: die = **power shift** → you become a prompt engineer who cracks tiles under survivors.

Both roles are active. Both roles are fun. Nobody watches.

## Three Arenas

The match is one continuous 2-minute experience across 3 stacked hex arenas:

| Arena | Tiles | Physics | Vibe |
|---|---|---|---|
| **1 — THE CROWD** | 37 | Bouncy | Comedy phase, low stakes |
| **2 — THE SCRAMBLE** | 19 | Icy | Tension rises, every tile matters |
| **3 — THE PEAK** | 7 | Shrinking | Pure survival, climax |

When enough tiles crack → **floor collapses** → all slops fall to the next arena.

## Slop Sizes

| Size | Speed | Weight | Push Resistance |
|---|---|---|---|
| Small | Fast | Light | Low — flies when pushed |
| Medium | Balanced | Normal | Medium |
| Big | Slow | Heavy | High — bulldozer |

## Pickups

| Pickup | Effect |
|---|---|
| 🛡️ Shield | Survive one tile crack |
| ⚡ Dash Boost | Burst of speed |
| 🏋️ Heavy Slop | Can't be pushed |
| 👻 Ghost Mode | Invisible to voters |
| 🧲 Magnet | Pull nearby slop toward you |

## Tech Stack

| Layer | Choice |
|---|---|
| Rendering | Three.js + React Three Fiber |
| Physics | Rapier.js (@react-three/rapier) |
| State | Zustand |
| Build | Vite |

## Architecture

All three arenas use the same reusable `HexArena` component with different configs:

```js
arena1: { tiles: 37, friction: 0.3, restitution: 0.8 }  // bouncy
arena2: { tiles: 19, friction: 0.05, restitution: 0.3 } // icy
arena3: { tiles: 7,  friction: 0.5, shrinkRate: 0.1 }   // shrinking
```

## Design Principles

1. Slop in motion within 5 seconds
2. Both roles are fun — surviving (push) and dying (crack tiles)
3. Juice before features — squash, stretch, shake, particles
4. The verb is the game — PUSH for survivors, CRACK for voters
5. Build for clips — every floor collapse is shareable
6. Ship > perfect

## License

MIT
