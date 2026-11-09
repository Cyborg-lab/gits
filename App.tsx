import React from 'react';
import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#02040a',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      }}
    >
      <GameCanvas />
    </div>
  );
}

export default App;
