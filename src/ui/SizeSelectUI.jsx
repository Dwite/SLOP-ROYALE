import React from 'react'
import { useGameStore } from '../store/gameStore'

const SIZES = [
  { key: 'small', emoji: '🏃', label: 'SMALL', desc: 'Fast & light — flies when pushed', color: '#44ff88', scale: 0.7 },
  { key: 'medium', emoji: '🫧', label: 'MEDIUM', desc: 'Balanced — all-rounder', color: '#4488ff', scale: 1 },
  { key: 'big', emoji: '🏋️', label: 'BIG', desc: 'Slow & heavy — bulldozer', color: '#ff4488', scale: 1.3 },
]

export function SizeSelectUI() {
  const selectSize = useGameStore(s => s.selectSize)
  const startGame = useGameStore(s => s.startGame)
  const playerSize = useGameStore(s => s.playerSize)

  const handleSelect = (size) => {
    selectSize(size)
  }

  const handleStart = () => {
    startGame()
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%)',
      zIndex: 10,
    }}>
      <h2 style={{
        color: '#fff',
        fontSize: '2rem',
        fontWeight: 800,
        margin: '0 0 8px',
        fontFamily: "'Bangers', system-ui, sans-serif",
        letterSpacing: '2px',
      }}>
        PICK YOUR SLOP
      </h2>
      <p style={{ color: '#888', marginBottom: 30, fontSize: '0.9rem' }}>
        Size affects speed, weight, and pushability
      </p>

      <div style={{ display: 'flex', gap: 16 }}>
        {SIZES.map(size => (
          <button
            key={size.key}
            onClick={() => handleSelect(size.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '20px 24px',
              borderRadius: 16,
              border: playerSize === size.key
                ? `2px solid ${size.color}`
                : '2px solid rgba(255,255,255,0.1)',
              background: playerSize === size.key
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.02)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: 140,
              boxShadow: playerSize === size.key
                ? `0 0 20px ${size.color}40`
                : 'none',
            }}
          >
            <div style={{
              width: 50 * size.scale,
              height: 50 * size.scale,
              borderRadius: '50%',
              background: size.color,
              boxShadow: `0 0 15px ${size.color}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20 * size.scale,
            }}>
              {size.emoji}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{size.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center' }}>{size.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleStart}
        style={{
          marginTop: 30,
          padding: '14px 50px',
          fontSize: '1.3rem',
          fontWeight: 700,
          border: 'none',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #ff4488, #4444ff)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 30px rgba(255, 68, 136, 0.4)',
          fontFamily: "'Bangers', system-ui, sans-serif",
          letterSpacing: '2px',
        }}
      >
        DROP IN
      </button>
    </div>
  )
}
