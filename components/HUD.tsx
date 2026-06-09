import React from 'react';
import { GameMode, ScoreState } from '../types';

interface HUDProps {
  score: ScoreState;
  gameMode: GameMode;
  tournamentInfo?: {
    stageLabel: string;
    legLabel?: string;
    firstLegScore?: string;
    aggregateScore?: string;
  } | null;
}

export const HUD: React.FC<HUDProps> = ({ score, gameMode, tournamentInfo }) => {
  const minutes = Math.floor(score.time / 60);
  const seconds = Math.floor(score.time % 60);
  const periodLabel = score.period || '1ST HALF';
  const restartLabel = score.restartLabel;
  const homeLabel = score.homeLabel || 'HOM';
  const awayLabel = score.awayLabel || 'AWY';
  const shootoutLabel =
    score.shootoutHome !== undefined || score.shootoutAway !== undefined
      ? `PENS ${score.shootoutHome ?? 0}-${score.shootoutAway ?? 0}`
      : null;
  
  return (
    <div className="absolute top-8 left-8 p-4 pointer-events-none flex flex-col z-30 font-sport">
      
      {/* Broadcast Scoreboard Container */}
      <div className="flex items-stretch shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        
        {/* Home Team */}
        <div className="bg-slate-900 text-white flex items-center px-4 py-2 border-b-4 border-rose-600">
            <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center mr-3 font-bold text-xs shadow-inner">P1</div>
            <span className="text-2xl font-bold tracking-wider">{homeLabel}</span>
            <span className="ml-4 text-3xl font-black w-8 text-center bg-slate-800 rounded">{score.home}</span>
        </div>

        {/* Timer (Center) */}
        <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-center min-w-[80px] border-b-4 border-slate-600">
             <span className="text-xl font-mono tracking-wider text-cyan-400">
                {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
             </span>
        </div>

        {/* Away Team */}
        <div className="bg-slate-900 text-white flex items-center px-4 py-2 border-b-4 border-blue-600">
            <span className="mr-4 text-3xl font-black w-8 text-center bg-slate-800 rounded">{score.away}</span>
            <span className="text-2xl font-bold tracking-wider">{awayLabel}</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center ml-3 font-bold text-xs shadow-inner">P2</div>
        </div>

      </div>

      {/* Stamina / Status Indicator (Optional, Bottom Left) */}
      <div className="mt-2 flex items-center gap-2 opacity-80">
          <div className="text-xs text-cyan-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">{periodLabel}</div>
          {restartLabel && <div className="text-xs text-emerald-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">{restartLabel}</div>}
          {shootoutLabel && <div className="text-xs text-amber-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">{shootoutLabel}</div>}
          {tournamentInfo?.stageLabel && <div className="text-xs text-amber-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">{tournamentInfo.stageLabel}</div>}
          {tournamentInfo?.legLabel && <div className="text-xs text-orange-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">{tournamentInfo.legLabel}</div>}
          {tournamentInfo?.firstLegScore && <div className="text-xs text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded">FIRST LEG {tournamentInfo.firstLegScore}</div>}
          {tournamentInfo?.aggregateScore && <div className="text-xs text-cyan-200 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">AGG {tournamentInfo.aggregateScore}</div>}
          <div className="text-xs text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded">P1: WASD Q E R SHIFT</div>
          {gameMode === GameMode.MULTI_PLAYER ? (
            <div className="text-xs text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded">P2: IJKL U O RIGHT SHIFT</div>
          ) : (
            <div className="text-xs text-white uppercase tracking-widest bg-black/50 px-2 py-1 rounded">AWAY: SMART AI</div>
          )}
      </div>

    </div>
  );
};
