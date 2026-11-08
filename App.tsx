import React from 'react';
import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: 'radial-gradient(circle at top, #1d4ed8 0%, #0b1120 24%, #04070d 55%, #02040a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        padding: 18,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          border: '1px solid rgba(148, 163, 184, 0.36)',
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 26px 80px rgba(15, 23, 42, 0.85)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.92))',
        }}
      >
        <GameCanvas />
      </div>
    </div>
  );
}

export default App;