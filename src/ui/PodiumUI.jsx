import React from 'react'
import { useGameStore } from '../store/gameStore'

export function PodiumUI() {
  const slops = useGameStore(s => s.slops)
  const returnToMenu = useGameStore(s => s.returnToMenu)
  const goToSizeSelect = useGameStore(s => s.goToSizeSelect)
  const startGame = useGameStore(s => s.startGame)
  const matchTime = useGameStore(s => s.matchTime)
  const pushCount = useGameStore(s => s.pushCount)
  const tilesCrackedByPlayer = useGameStore(s => s.tilesCrackedByPlayer)
  const playerAlive = useGameStore(s => s.playerAlive)

  const winner = slops.find(s => s.alive)
  const isPlayerWinner = winner?.id === 'player'

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      zIndex: 20,
    }}>
      <div style={{
        background: 'rgba(20, 20, 40, 0.95)',
        borderRadius: 24,
        padding: '40px 50px',
        textAlign: 'center',
        border: '1px solid rgba(255, 68, 136, 0.3)',
        maxWidth: 420,
      }}>
        {isPlayerWinner ? (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>👑</div>
            <h2 style={{
              color: '#ffcc00',
              fontSize: '2.5rem',
              fontWeight: 800,
              margin: '0 0 5px',
              textShadow: '0 0 20px rgba(255, 204, 0, 0.5)',
              fontFamily: "'Bangers', system-ui, sans-serif",
              letterSpacing: '2px',
            }}>
              LAST SLOP STANDING!
            </h2>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🫠</div>
            <h2 style={{
              color: '#ff4488',
              fontSize: '2.2rem',
              fontWeight: 800,
              margin: '0 0 5px',
              fontFamily: "'Bangers', system-ui, sans-serif",
              letterSpacing: '2px',
            }}>
              SLOPPED
            </h2>
            {winner && (
              <>
                <p style={{ color: '#aaa', margin: '0 0 8px', fontSize: '0.9rem' }}>
                  {winner.name} wins!
                </p>
                <div style={{
                  width: 45,
                  height: 45,
                  borderRadius: '50%',
                  background: winner.color,
                  margin: '0 auto 10px',
                  boxShadow: `0 0 20px ${winner.color}`,
                }} />
              </>
            )}
          </>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          margin: '15px 0 25px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '1px' }}>SURVIVED</div>
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
              {Math.floor(matchTime)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '1px' }}>PUSHES</div>
            <div style={{ color: '#ffaa00', fontSize: '1.2rem', fontWeight: 700 }}>
              {pushCount}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '1px' }}>CRACKED</div>
            <div style={{ color: '#ff4488', fontSize: '1.2rem', fontWeight: 700 }}>
              {tilesCrackedByPlayer}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={startGame}
            style={{
              padding: '12px 30px',
              fontSize: '1.1rem',
              fontWeight: 700,
              border: 'none',
              borderRadius: 30,
              background: 'linear-gradient(135deg, #ff4488, #4444ff)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255, 68, 136, 0.3)',
              fontFamily: "'Bangers', system-ui, sans-serif",
              letterSpacing: '2px',
            }}
          >
            REMATCH
          </button>
          <button
            onClick={returnToMenu}
            style={{
              padding: '12px 20px',
              fontSize: '1rem',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 30,
              background: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
            }}
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  )
}
