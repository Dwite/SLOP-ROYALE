import React from 'react'
import { useGameStore } from '../store/gameStore'

export function MenuUI() {
  const goToSizeSelect = useGameStore(s => s.goToSizeSelect)

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
      {/* Floating slops background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 15 + Math.random() * 50,
              height: 15 + Math.random() * 50,
              borderRadius: '50%',
              background: `hsl(${Math.random() * 360}, 70%, 60%)`,
              opacity: 0.12,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 5}s ease-in-out infinite alternate`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div style={{
        fontSize: '1rem',
        color: '#ff44ff',
        letterSpacing: '6px',
        textTransform: 'uppercase',
        marginBottom: 8,
        fontWeight: 300,
        opacity: 0.7,
      }}>
        VIBE JAM 2026
      </div>

      <h1 style={{
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 0 40px #ff44ff, 0 0 80px #4444ff, 0 4px 0 #aa2266',
        margin: 0,
        letterSpacing: '-2px',
        fontFamily: "'Bangers', system-ui, sans-serif",
      }}>
        SLOP ROYALE
      </h1>

      <p style={{
        color: '#999',
        fontSize: '1rem',
        margin: '8px 0 0',
        fontStyle: 'italic',
      }}>
        90% AI-generated. 100% chaos. 0% apologies.
      </p>

      <p style={{
        color: '#aaa',
        fontSize: '1.1rem',
        margin: '10px 0 35px',
        textAlign: 'center',
        maxWidth: 400,
      }}>
        20 slops. Collapsing hex tiles. Push each other off.<br/>
        <span style={{ color: '#ff4488' }}>Die → become a prompt engineer → crack tiles under survivors.</span>
      </p>

      <button
        onClick={goToSizeSelect}
        style={{
          padding: '18px 60px',
          fontSize: '1.4rem',
          fontWeight: 700,
          border: 'none',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #ff4488, #4444ff)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 30px rgba(255, 68, 136, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Bangers', system-ui, sans-serif",
          letterSpacing: '2px',
        }}
        onMouseEnter={e => {
          e.target.style.transform = 'scale(1.05)'
          e.target.style.boxShadow = '0 6px 40px rgba(255, 68, 136, 0.6)'
        }}
        onMouseLeave={e => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 4px 30px rgba(255, 68, 136, 0.4)'
        }}
      >
        PLAY
      </button>

      <div style={{
        marginTop: 30,
        color: '#555',
        fontSize: '0.85rem',
        textAlign: 'center',
      }}>
        <p>WASD to move · Space to jump · Shift to dash-push</p>
        <p style={{ marginTop: 4, color: '#444' }}>The dead control the living.</p>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(0deg); }
          to { transform: translateY(-25px) rotate(10deg); }
        }
      `}</style>
    </div>
  )
}
