import React, { useCallback } from 'react'
import { useGameStore } from '../store/gameStore'

export function VoterUI() {
  const tiles = useGameStore(s => s.tiles)
  const voteCrackTile = useGameStore(s => s.voteCrackTile)
  const tilesCrackedByPlayer = useGameStore(s => s.tilesCrackedByPlayer)

  // This UI shows as an overlay — the actual tile clicking
  // happens via raycasting in the 3D scene, but we also provide
  // a tile grid overlay for clarity

  const solidTiles = tiles.filter(t => t.state === 'solid')

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
      pointerEvents: 'auto',
    }}>
      {/* Voter stats panel */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 14,
        padding: 14,
        width: 200,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 68, 136, 0.3)',
      }}>
        <div style={{
          color: '#ff4488',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '2px',
          marginBottom: 8,
        }}>
          {'>'} PROMPT LOG
        </div>

        <div style={{
          color: '#44ff88',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          marginBottom: 6,
          lineHeight: 1.5,
        }}>
          {`> tiles_cracked: ${tilesCrackedByPlayer}`}<br/>
          {`> tiles_remaining: ${solidTiles.length}`}<br/>
          {`> status: DESTROYING`}
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 8,
          marginTop: 8,
        }}>
          <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 6 }}>
            TARGET A TILE:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {solidTiles.slice(0, 16).map(tile => {
              const crackRatio = tile.crackVotes / 3
              return (
                <button
                  key={tile.id}
                  onClick={() => voteCrackTile(tile.id)}
                  style={{
                    width: 40,
                    height: 35,
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: crackRatio > 0.5
                      ? `rgba(255, ${Math.floor(100 - crackRatio * 100)}, 50, 0.4)`
                      : 'rgba(58, 58, 106, 0.4)',
                    color: '#fff',
                    fontSize: '0.6rem',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255, 68, 136, 0.5)'}
                  onMouseLeave={e => e.target.style.background = crackRatio > 0.5
                    ? `rgba(255, ${Math.floor(100 - crackRatio * 100)}, 50, 0.4)`
                    : 'rgba(58, 58, 106, 0.4)'
                  }
                >
                  {tile.crackVotes > 0 ? `${tile.crackVotes}` : ''}
                </button>
              )
            })}
          </div>
          {solidTiles.length > 16 && (
            <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 4, textAlign: 'center' }}>
              +{solidTiles.length - 16} more tiles
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
