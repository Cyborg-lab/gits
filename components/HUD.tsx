import React from 'react';
import { GameMode, ScoreState } from '../types';

interface HUDProps {
  score: ScoreState;
  gameMode: GameMode;
  isLanGuest?: boolean;
  tournamentInfo?: {
    stageLabel: string;
    legLabel?: string;
    firstLegScore?: string;
    aggregateScore?: string;
  } | null;
}

export const HUD: React.FC<HUDProps> = ({ score, gameMode, tournamentInfo, isLanGuest = false }) => {
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
  const homeCards = score.cardsHome || { yellow: 0, red: 0 };
  const awayCards = score.cardsAway || { yellow: 0, red: 0 };

  return (
    <div className="absolute top-3 left-3 sm:top-6 sm:left-6 p-2 sm:p-4 pointer-events-none flex flex-col z-30 font-sport">
      <div className="flex items-stretch shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-700 text-white flex items-center px-4 py-2 border-b-[3px] border-rose-500">
          <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center mr-3 font-black text-[10px] shadow-inner">P1</div>
          <span className="text-2xl font-black tracking-[0.12em]">{homeLabel}</span>
          <span className="ml-4 text-3xl font-black w-9 text-center bg-slate-950/70 rounded-md">{score.home}</span>
        </div>

        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-4 py-2 flex items-center justify-center min-w-[90px] border-b-[3px] border-cyan-400">
          <span className="text-xl font-mono font-black tracking-[0.18em] text-cyan-300">
            {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>

        <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-slate-900 text-white flex items-center px-4 py-2 border-b-[3px] border-blue-400">
          <span className="mr-4 text-3xl font-black w-9 text-center bg-slate-950/70 rounded-md">{score.away}</span>
          <span className="text-2xl font-black tracking-[0.12em]">{awayLabel}</span>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-3 font-black text-[10px] shadow-inner">P2</div>
        </div>
      </div>

      <div className="mt-1 flex justify-center gap-3 rounded-b-2xl bg-slate-950/85 px-3 py-1 text-xs font-black text-white/90 border-x border-b border-white/10 backdrop-blur-sm">
        <span>{homeCards.yellow > 0 && `🟨 ${homeCards.yellow}`} {homeCards.red > 0 && `🟥 ${homeCards.red}`}</span>
        <span className="text-white/35">•</span>
        <span>{awayCards.yellow > 0 && `🟨 ${awayCards.yellow}`} {awayCards.red > 0 && `🟥 ${awayCards.red}`}</span>
      </div>

      <div className="mt-2 flex items-center gap-2 opacity-90 flex-wrap">
        <div className="text-[10px] text-cyan-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-cyan-400/30">{periodLabel}</div>
        {restartLabel && <div className="text-[10px] text-emerald-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-emerald-400/30">{restartLabel}</div>}
        {shootoutLabel && <div className="text-[10px] text-amber-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-amber-400/30">{shootoutLabel}</div>}
        {tournamentInfo?.stageLabel && <div className="text-[10px] text-amber-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-amber-400/30">{tournamentInfo.stageLabel}</div>}
        {tournamentInfo?.legLabel && <div className="text-[10px] text-orange-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-orange-400/30">{tournamentInfo.legLabel}</div>}
        {tournamentInfo?.firstLegScore && <div className="text-[10px] text-white uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-white/20">FIRST LEG {tournamentInfo.firstLegScore}</div>}
        {tournamentInfo?.aggregateScore && <div className="text-[10px] text-cyan-200 uppercase tracking-[0.22em] bg-black/50 px-2 py-1 rounded-md border border-cyan-400/30">AGG {tournamentInfo.aggregateScore}</div>}
        <div className="text-[10px] text-white uppercase tracking-[0.18em] bg-black/50 px-2 py-1 rounded-md border border-white/20">{isLanGuest ? 'AWAY: WASD Q E F SHIFT' : 'P1: WASD Q E R F SHIFT'}</div>
        {gameMode === GameMode.MULTI_PLAYER ? (
          !isLanGuest && <div className="text-[10px] text-white uppercase tracking-[0.18em] bg-black/50 px-2 py-1 rounded-md border border-white/20">P2: IJKL U O P ; RIGHT SHIFT</div>
        ) : (
          <div className="text-[10px] text-white uppercase tracking-[0.18em] bg-black/50 px-2 py-1 rounded-md border border-white/20">AWAY: SMART AI</div>
        )}
      </div>

      {score.matchEvent && (
        <div className={`mt-3 self-start rounded-xl border px-5 py-2 text-lg font-black tracking-[0.2em] shadow-[0_10px_25px_rgba(0,0,0,0.35)] ${score.matchEvent.includes('RED') ? 'border-red-400 bg-red-500/90 text-white' : score.matchEvent.includes('YELLOW') ? 'border-yellow-300 bg-yellow-400/95 text-slate-900' : score.matchEvent.includes('OFFSIDE') ? 'border-amber-300 bg-amber-500/95 text-slate-950' : 'border-white/30 bg-slate-950/90 text-white'}`}>
          {score.matchEvent}
        </div>
      )}
    </div>
  );
};
