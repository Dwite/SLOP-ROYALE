import React from 'react'
import { useGameStore } from '../store/gameStore'

const ARENA_NAMES = ['THE CROWD', 'THE SCRAMBLE', 'THE PEAK']

export function HUD() {
  const arenaTimer = useGameStore(s => s.arenaTimer)
  const slops = useGameStore(s => s.slops)
  const phase = useGameStore(s => s.phase)
  const currentArena = useGameStore(s => s.currentArena)
  const tiles = useGameStore(s => s.tiles)
  const tilesCracked = useGameStore(s => s.tilesCracked)
  const announcement = useGameStore(s => s.announcement)
  const playerPickup = useGameStore(s => s.playerPickup)
  const playerPickupTimer = useGameStore(s => s.playerPickupTimer)
  const playerSpeedBoost = useGameStore(s => s.playerSpeedBoost)

  const aliveCount = slops.filter(s => s.alive).length
  const totalCount = slops.length
  const seconds = Math.ceil(arenaTimer)
  const solidTiles = tiles.filter(t => t.state === 'solid').length
  const totalTiles = tiles.length

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {/* Announcement flash */}
      {announcement && (
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          animation: 'announcePop 0.4s ease-out',
          zIndex: 50,
        }}>
          <div style={{
            color: '#fff',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            textShadow: '0 0 30px #ff44ff, 0 0 60px #4444ff, 0 4px 0 #aa2266',
            fontFamily: "'Bangers', system-ui, sans-serif",
            letterSpacing: '3px',
          }}>
            {announcement.text}
          </div>
          {announcement.sub && (
            <div style={{
              color: '#ccc',
              fontSize: '1rem',
              marginTop: 6,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}>
              {announcement.sub}
            </div>
          )}
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '12px 16px',
      }}>
        {/* Arena + Alive */}
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: '8px 14px',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ color: '#ff4488', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
            ARENA {currentArena + 1} — {ARENA_NAMES[currentArena]}
          </div>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginTop: 2 }}>
            🫧 {aliveCount}/{totalCount} alive
          </div>
        </div>

        {/* Timer */}
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: '8px 20px',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}>
          <div style={{ color: '#666', fontSize: '0.65rem', letterSpacing: '1px' }}>TIME</div>
          <span style={{
            color: seconds <= 10 ? '#ff4444' : '#fff',
            fontSize: '1.4rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {seconds}s
          </span>
        </div>

        {/* Tiles remaining */}
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: '8px 14px',
          backdropFilter: 'blur(10px)',
          textAlign: 'right',
        }}>
          <div style={{ color: '#666', fontSize: '0.65rem', letterSpacing: '1px' }}>TILES</div>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
            {solidTiles}/{totalTiles}
          </div>
        </div>
      </div>

      {/* Active pickup indicator */}
      {playerPickup && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 10,
          padding: '6px 14px',
          border: '1px solid rgba(68, 170, 255, 0.4)',
        }}>
          <span style={{ color: '#44aaff', fontSize: '0.9rem', fontWeight: 600 }}>
            {playerPickup.toUpperCase()} {playerPickupTimer > 0 ? `${Math.ceil(playerPickupTimer)}s` : ''}
          </span>
        </div>
      )}

      {/* Speed boost indicator */}
      {playerSpeedBoost > 0 && !playerPickup && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 170, 0, 0.2)',
          borderRadius: 10,
          padding: '4px 12px',
          border: '1px solid rgba(255, 170, 0, 0.4)',
        }}>
          <span style={{ color: '#ffaa00', fontSize: '0.8rem' }}>
            ⚡ PUSH BOOST
          </span>
        </div>
      )}

      {/* Voter mode label */}
      {phase === 'voter' && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 10,
            padding: '8px 20px',
            border: '1px solid rgba(255, 68, 136, 0.4)',
          }}>
            <span style={{ color: '#ff4488', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px' }}>
              {'>'} PROMPT ENGINEER MODE
            </span>
            <div style={{ color: '#888', fontSize: '0.75rem', marginTop: 2 }}>
              Click tiles to crack them under survivors
            </div>
          </div>
        </div>
      )}

      {/* Falling transition overlay */}
      {phase === 'falling' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{
            color: '#fff',
            fontSize: '3rem',
            fontWeight: 900,
            textShadow: '0 0 40px #ff44ff',
            fontFamily: "'Bangers', system-ui, sans-serif",
            animation: 'fallShake 0.1s infinite',
          }}>
            FLOOR COLLAPSE!
          </div>
        </div>
      )}

      <style>{`
        @keyframes announcePop {
          from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes fallShake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 2px); }
          50% { transform: translate(3px, -2px); }
          75% { transform: translate(-2px, 3px); }
          100% { transform: translate(2px, -3px); }
        }
      `}</style>
    </div>
  )
}
