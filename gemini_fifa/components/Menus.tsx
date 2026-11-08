import React from 'react';

interface MenuProps {
  onStart: () => void;
}

export const MainMenu: React.FC<MenuProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-purple-950 to-black flex flex-col items-center justify-center z-50 text-white overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-40"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-600 rounded-full blur-[150px] opacity-40"></div>

      <div className="z-10 flex flex-col items-center">
        <h1 className="text-8xl font-sport font-bold mb-2 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          ARCADE FC
        </h1>
        <p className="mb-12 text-cyan-100/60 font-sport tracking-[0.5em] text-sm uppercase">The Beautiful Game</p>
        
        <div className="flex gap-8">
            <button 
              onClick={onStart}
              className="group relative w-64 h-40 glass-panel skew-x-[-10deg] hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-pointer flex flex-col items-center justify-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
              <span className="skew-x-[10deg] text-3xl font-sport font-bold mb-1 group-hover:text-cyan-400 transition-colors">KICK OFF</span>
              <span className="skew-x-[10deg] text-xs text-gray-400 uppercase tracking-widest">Start Match</span>
            </button>

            <div className="w-64 h-40 glass-panel skew-x-[-10deg] opacity-50 flex flex-col items-center justify-center grayscale cursor-not-allowed">
              <div className="absolute top-0 left-0 w-2 h-full bg-pink-600"></div>
              <span className="skew-x-[10deg] text-2xl font-sport font-bold">CAREER</span>
              <span className="skew-x-[10deg] text-xs text-gray-400 uppercase tracking-widest">Locked</span>
            </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-12 z-10 glass-panel p-6 rounded-lg border-l-4 border-l-cyan-500 max-w-md">
        <h3 className="font-sport font-bold text-xl mb-4 text-cyan-400 uppercase">Controls</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-sport text-sm">
          <div className="flex justify-between border-b border-white/10 pb-1"><span>Move</span> <span className="font-bold text-white">WASD</span></div>
          <div className="flex justify-between border-b border-white/10 pb-1"><span>Sprint</span> <span className="font-bold text-white">SHIFT</span></div>
          <div className="flex justify-between border-b border-white/10 pb-1"><span>Shoot</span> <span className="font-bold text-cyan-300">X</span></div>
          <div className="flex justify-between border-b border-white/10 pb-1"><span>Pass</span> <span className="font-bold text-green-300">SPACE</span></div>
        </div>
      </div>
    </div>
  );
};

export const PauseMenu: React.FC<{ onResume: () => void }> = ({ onResume }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-lg flex flex-col items-center justify-center z-50">
      <h2 className="text-6xl font-sport font-black text-white mb-8 italic tracking-tighter">PAUSED</h2>
      <button 
        onClick={onResume}
        className="px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-sport font-bold text-xl rounded skew-x-[-10deg] shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all hover:scale-105"
      >
        <span className="block skew-x-[10deg]">RESUME MATCH</span>
      </button>
    </div>
  );
};

export const GoalOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-pulse"></div>
      <h1 className="text-9xl font-black italic font-sport text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-bounce tracking-tighter">
        GOAL!
      </h1>
    </div>
  );
};

export const GameOverMenu: React.FC<{ score: {home: number, away: number}, onRestart: () => void }> = ({ score, onRestart }) => {
    const isWin = score.home > score.away;
    
    return (
    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-50">
      <h2 className="text-4xl font-sport text-gray-400 mb-2 tracking-widest uppercase">Full Time</h2>
      
      <div className="flex items-center gap-12 mb-12">
         <div className="text-center">
             <div className="text-8xl font-sport font-bold text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-rose-600">{score.home}</div>
             <div className="text-rose-500 font-sport tracking-widest">HOME</div>
         </div>
         <div className="h-16 w-px bg-gray-700 rotate-12"></div>
         <div className="text-center">
             <div className="text-8xl font-sport font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600">{score.away}</div>
             <div className="text-blue-500 font-sport tracking-widest">AWAY</div>
         </div>
      </div>

      <button 
        onClick={onRestart}
        className="px-10 py-4 border border-white/20 hover:bg-white hover:text-black text-white font-sport font-bold text-xl transition-all duration-300"
      >
        PLAY AGAIN
      </button>
    </div>
  );
}