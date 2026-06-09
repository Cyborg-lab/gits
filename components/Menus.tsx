import React from 'react';
import { AIDifficulty, ClubDefinition, FormationKey, GameMode, LeagueKey, ScoreState, StadiumKey, Team } from '../types';

interface MenuProps {
  onOpenModeSelect: () => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectChampionsLeague: () => void;
  onSelectDifficulty: (difficulty: AIDifficulty) => void;
  selectedDifficulty: AIDifficulty;
  isChoosingMode: boolean;
  onOpenLanMenu: () => void;
  onCreateLanRoom: () => void;
  onJoinLanRoom: () => void;
  onJoinCodeChange: (value: string) => void;
  onLanHostChange: (value: string) => void;
  isChoosingLan: boolean;
  joinCode: string;
  lanHost: string;
  roomCode: string;
  lanStatus: string;
  lanError: string;
  peerConnected: boolean;
  isConnectingLan: boolean;
}

interface GroupTableRow {
  clubId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  isPlayer?: boolean;
}

interface GroupTable {
  label: string;
  rows: GroupTableRow[];
}

interface TeamSelectMenuProps {
  mode: GameMode;
  currentTeam: Team;
  currentLeague: LeagueKey;
  title?: string;
  subtitle?: string;
  clubs: ClubDefinition[];
  stadiums: Array<{ key: StadiumKey; label: string }>;
  selectedStadium: StadiumKey;
  selectedClubId: string;
  onSelectLeague: (league: LeagueKey) => void;
  onSelectClub: (clubId: string) => void;
  onSelectStadium: (stadium: StadiumKey) => void;
  onBack: () => void;
  onContinue: () => void;
  homeReady: boolean;
  awayReady: boolean;
  canContinue: boolean;
}

interface PauseMenuProps {
  mode: GameMode;
  showTactics: boolean;
  homeFormation: FormationKey;
  awayFormation: FormationKey;
  onSelectFormation: (team: Team, formation: FormationKey) => void;
  onToggleTactics: () => void;
  onContinue: () => void;
  onExit: () => void;
  homeReady: boolean;
  awayReady: boolean;
}

const leagueLabel = (league: LeagueKey) => {
  if (league === LeagueKey.LA_LIGA) return 'La Liga';
  if (league === LeagueKey.PREMIER_LEAGUE) return 'Premier League';
  if (league === LeagueKey.LIGUE_1) return 'Ligue 1';
  if (league === LeagueKey.SERIE_A) return 'Serie A';
  return 'Portugal Liga';
};

const FORMATIONS: FormationKey[] = ['1-2-1', '2-1-1', '1-1-2'];

export const MainMenu: React.FC<MenuProps> = ({
  onOpenModeSelect,
  onSelectMode,
  onSelectChampionsLeague,
  onSelectDifficulty,
  selectedDifficulty,
  isChoosingMode,
  onOpenLanMenu,
  onCreateLanRoom,
  onJoinLanRoom,
  onJoinCodeChange,
  onLanHostChange,
  isChoosingLan,
  joinCode,
  lanHost,
  roomCode,
  lanStatus,
  lanError,
  peerConnected,
  isConnectingLan,
}) => {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-sky-950 to-black flex flex-col items-center justify-center z-50 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-40"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600 rounded-full blur-[150px] opacity-30"></div>

      <div className="z-10 flex flex-col items-center">
        <h1 className="text-8xl font-sport font-bold mb-2 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">
          ARCADE FC
        </h1>
        <p className="mb-12 text-cyan-100/60 font-sport tracking-[0.45em] text-sm uppercase">Street Style Football</p>

        <div className="flex gap-8">
          <button
            onClick={onOpenModeSelect}
            className="group relative w-64 h-40 glass-panel skew-x-[-10deg] hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
            <span className="skew-x-[10deg] text-3xl font-sport font-bold mb-1 group-hover:text-cyan-400 transition-colors">KICK OFF</span>
            <span className="skew-x-[10deg] text-xs text-gray-400 uppercase tracking-widest">Start Match</span>
          </button>

          <button
            onClick={onOpenLanMenu}
            className="group relative w-64 h-40 glass-panel skew-x-[-10deg] hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
            <span className="skew-x-[10deg] text-3xl font-sport font-bold mb-1 group-hover:text-blue-300 transition-colors">LOCAL WIFI</span>
            <span className="skew-x-[10deg] text-xs text-gray-400 uppercase tracking-widest">Host Or Join LAN</span>
          </button>
        </div>

        <div className="mt-10 w-[min(94vw,900px)] rounded-3xl border border-white/10 bg-black/25 p-6 text-left shadow-2xl">
          <div className="text-sm font-sport uppercase tracking-[0.35em] text-cyan-300">How To Play</div>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-sport text-lg text-white">P1 Controls</div>
              <div className="mt-2">Move: `WASD`</div>
              <div>Pass: `Q`</div>
              <div>Shoot: `E`</div>
              <div>Switch: `R`</div>
              <div>Sprint: `Left Shift`</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-sport text-lg text-white">P2 Controls</div>
              <div className="mt-2">Move: `IJKL`</div>
              <div>Pass: `U`</div>
              <div>Shoot: `O`</div>
              <div>Sprint: `Right Shift`</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-sport text-lg text-white">Modes</div>
              <div className="mt-2">Kick Off: quick match</div>
              <div>Local WiFi: host and guest</div>
              <div>Champions League: qualification, groups and knockouts</div>
              <div>Pause: `Esc` for tactics</div>
            </div>
          </div>
        </div>
      </div>

      {isChoosingMode && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
          <div className="glass-panel rounded-2xl p-8 w-[min(92vw,640px)] border border-white/10">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-sport font-bold tracking-tight text-cyan-300">CHOOSE MATCH MODE</h2>
              <p className="text-sm uppercase tracking-[0.35em] text-white/50 mt-2">Choose a club after this</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => onSelectMode(GameMode.SINGLE_PLAYER)}
                className="text-left rounded-2xl border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-5 py-6 transition-all"
              >
                <div className="font-sport text-2xl text-cyan-300">SMART AI</div>
                <div className="mt-2 text-sm text-white/70">P1 chooses a club, AI gets a random rival</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(['EASY', 'NORMAL', 'MEDIUM', 'HARD', 'EXTREME'] as AIDifficulty[]).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        onSelectDifficulty(level);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider ${
                        selectedDifficulty === level ? 'bg-cyan-300 text-slate-950' : 'bg-black/30 text-white/75'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </button>

              <button
                onClick={() => onSelectMode(GameMode.MULTI_PLAYER)}
                className="text-left rounded-2xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 px-5 py-6 transition-all"
              >
                <div className="font-sport text-2xl text-blue-300">P1 VS P2</div>
                <div className="mt-2 text-sm text-white/70">P2 controls: IJKL move, U pass, O shoot, Right Shift sprint</div>
              </button>

              <button
                onClick={onSelectChampionsLeague}
                className="text-left rounded-2xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-6 transition-all md:col-span-2"
              >
                <div className="font-sport text-2xl text-amber-300">CHAMPIONS LEAGUE</div>
                <div className="mt-2 text-sm text-white/70">Qualification, group stage, round of 32, round of 16, quarter-final, semi-final and final</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {isChoosingLan && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
          <div className="glass-panel rounded-2xl p-8 w-[min(92vw,760px)] border border-white/10">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-sport font-bold tracking-tight text-blue-300">LOCAL WIFI MULTIPLAYER</h2>
              <p className="text-sm uppercase tracking-[0.3em] text-white/50 mt-2">Host runs LAN server and opens the game with --host</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                <div className="font-sport text-2xl text-white">Host Room</div>
                <div className="mt-2 text-sm text-white/70">Create room on this PC, then share code and IP.</div>
                <button
                  onClick={onCreateLanRoom}
                  disabled={isConnectingLan}
                  className="mt-5 w-full rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 px-4 py-3 font-sport text-lg text-white transition-colors"
                >
                  CREATE ROOM
                </button>
                {roomCode && (
                  <div className="mt-4 rounded-xl bg-black/30 border border-white/10 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.25em] text-white/50">Room Code</div>
                    <div className="text-3xl font-sport text-blue-300">{roomCode}</div>
                    <div className="mt-2 text-sm text-white/70">{peerConnected ? 'Guest connected. Match will start on host.' : 'Waiting for guest to join.'}</div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                <div className="font-sport text-2xl text-white">Join Room</div>
                <div className="mt-2 text-sm text-white/70">Host IP yoz, keyin room code bilan ulan.</div>
                <input
                  value={lanHost}
                  onChange={e => onLanHostChange(e.target.value)}
                  placeholder="HOST IP or localhost"
                  className="mt-5 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-center text-lg text-white outline-none"
                />
                <input
                  value={joinCode}
                  onChange={e => onJoinCodeChange(e.target.value)}
                  maxLength={4}
                  placeholder="ROOM"
                  className="mt-4 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-center text-2xl font-sport tracking-[0.35em] text-white outline-none"
                />
                <button
                  onClick={onJoinLanRoom}
                  disabled={isConnectingLan}
                  className="mt-4 w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 px-4 py-3 font-sport text-lg text-slate-950 transition-colors"
                >
                  JOIN ROOM
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/75">
              <div>{lanStatus}</div>
              {lanError && <div className="mt-2 text-rose-300">{lanError}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TeamSelectMenu: React.FC<TeamSelectMenuProps> = ({
  mode,
  currentTeam,
  currentLeague,
  title,
  subtitle,
  clubs,
  stadiums,
  selectedStadium,
  selectedClubId,
  onSelectLeague,
  onSelectClub,
  onSelectStadium,
  onBack,
  onContinue,
  homeReady,
  awayReady,
  canContinue,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-50 text-white">
      <div className="w-[min(95vw,1100px)] glass-panel rounded-3xl border border-white/10 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-sport text-cyan-300">{title || (currentTeam === Team.HOME ? 'P1 CLUB SELECT' : 'P2 CLUB SELECT')}</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.28em] text-white/45">
              {subtitle || (mode === GameMode.SINGLE_PLAYER ? 'Choose your club, then press Left Shift' : 'Both players choose club and confirm with Shift')}
            </p>
          </div>
          <button onClick={onBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm uppercase tracking-[0.2em] text-white/70 hover:bg-white/10">
            Back
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {[LeagueKey.LA_LIGA, LeagueKey.PREMIER_LEAGUE, LeagueKey.LIGUE_1, LeagueKey.SERIE_A, LeagueKey.PORTUGAL_LIGA].map(league => (
            <button
              key={league}
              onClick={() => onSelectLeague(league)}
              className={`rounded-full px-5 py-3 font-sport text-lg transition-colors ${
                currentLeague === league ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {leagueLabel(league)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map(club => (
            <button
              key={club.id}
              onClick={() => onSelectClub(club.id)}
              className={`rounded-2xl border px-5 py-5 text-left transition-all ${
                selectedClubId === club.id ? 'border-cyan-300 bg-cyan-400/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="font-sport text-2xl text-white">{club.name}</div>
              <div className="mt-2 text-sm text-white/60">{leagueLabel(club.league)}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.25em] text-white/40">
                {club.players.slice(0, 3).map(player => player.name).join(' • ')}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <div className="text-sm uppercase tracking-[0.28em] text-white/45">Choose Stadium</div>
          <div className="mt-3 flex flex-wrap gap-3">
            {stadiums.map(stadium => (
              <button
                key={stadium.key}
                onClick={() => onSelectStadium(stadium.key)}
                className={`rounded-full px-5 py-3 font-sport text-base transition-colors ${
                  selectedStadium === stadium.key ? 'bg-amber-300 text-slate-950' : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {stadium.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
          <div className="text-sm text-white/70">
            {mode === GameMode.SINGLE_PLAYER
              ? `P1: ${homeReady ? 'READY' : 'PRESS LEFT SHIFT'}`
              : `P1 ${homeReady ? 'READY' : 'WAIT'} | P2 ${awayReady ? 'READY' : 'WAIT'}`}
          </div>
          <button disabled={!canContinue} onClick={onContinue} className="rounded-xl bg-cyan-400 disabled:opacity-45 px-6 py-3 font-sport text-lg text-slate-950">
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

export const PauseMenu: React.FC<PauseMenuProps> = ({
  mode,
  showTactics,
  homeFormation,
  awayFormation,
  onSelectFormation,
  onToggleTactics,
  onContinue,
  onExit,
  homeReady,
  awayReady,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-900/88 backdrop-blur-lg flex items-center justify-center z-50 text-white">
      <div className="w-[min(92vw,980px)] glass-panel rounded-3xl border border-white/10 p-8">
        <h2 className="text-5xl font-sport font-black text-white tracking-tight">PAUSED</h2>
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-white/50">Continue, open tactics, or exit match</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <button onClick={onContinue} className="rounded-xl bg-cyan-500 px-6 py-3 font-sport text-xl text-white">
            CONTINUE
          </button>
          <button onClick={onToggleTactics} className="rounded-xl bg-white/10 px-6 py-3 font-sport text-xl text-white">
            {showTactics ? 'CLOSE TACTICS' : 'TACTICS'}
          </button>
          <button onClick={onExit} className="rounded-xl bg-rose-500/80 px-6 py-3 font-sport text-xl text-white">
            EXIT MATCH
          </button>
        </div>

        {showTactics && (
          <div className={`mt-8 grid gap-5 ${mode === GameMode.MULTI_PLAYER ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
              <div className="font-sport text-2xl text-cyan-300">P1 Tactics</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {FORMATIONS.map(formation => (
                  <button
                    key={formation}
                    onClick={() => onSelectFormation(Team.HOME, formation)}
                    className={`rounded-xl px-5 py-3 font-sport ${homeFormation === formation ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-white'}`}
                  >
                    {formation}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm text-white/60">Formation changes apply instantly.</div>
            </div>

            {mode === GameMode.MULTI_PLAYER && (
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
                <div className="font-sport text-2xl text-blue-300">P2 Tactics</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {FORMATIONS.map(formation => (
                    <button
                      key={formation}
                      onClick={() => onSelectFormation(Team.AWAY, formation)}
                      className={`rounded-xl px-5 py-3 font-sport ${awayFormation === formation ? 'bg-blue-300 text-slate-950' : 'bg-white/10 text-white'}`}
                    >
                      {formation}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-sm text-white/60">Formation changes apply instantly.</div>
              </div>
            )}

            <div className="md:col-span-2 text-sm text-white/60">
              Tactics update immediately. Press continue when you are ready.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const HalftimeMenu: React.FC<{ title?: string; actionLabel?: string; onContinue: () => void }> = ({ title = 'HALF TIME', actionLabel = 'START NEXT PERIOD', onContinue }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/88 backdrop-blur-lg flex flex-col items-center justify-center z-50 text-white">
      <div className="glass-panel rounded-3xl border border-white/10 px-12 py-10 text-center">
        <h2 className="text-6xl font-sport text-cyan-300">{title}</h2>
        <p className="mt-4 text-sm uppercase tracking-[0.35em] text-white/55">Continue match flow</p>
        <button onClick={onContinue} className="mt-8 rounded-2xl bg-cyan-400 px-10 py-4 font-sport text-2xl text-slate-950">
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export const PenaltyMenu: React.FC<{ score: ScoreState; isAwayHuman: boolean }> = ({ score, isAwayHuman }) => {
  const homeHistory = score.penaltyHistoryHome || [];
  const awayHistory = score.penaltyHistoryAway || [];
  const lastPenalty = score.lastPenalty;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="rounded-2xl border border-white/10 bg-black/70 px-6 py-4 text-center text-white shadow-xl min-w-[420px]">
        <div className="font-sport text-3xl text-cyan-300">PENALTY SHOOTOUT</div>
        <div className="mt-2 text-4xl font-black">{score.shootoutHome ?? 0} - {score.shootoutAway ?? 0}</div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <div className="relative mx-auto h-36 w-64 rounded-t-3xl border-4 border-white">
            <div className="absolute inset-x-4 bottom-0 h-1/2 border-x-2 border-t-2 border-white/70"></div>
            {lastPenalty && (
              <div
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${lastPenalty.scored ? 'bg-emerald-400' : 'bg-rose-500'}`}
                style={{ left: `${lastPenalty.x * 100}%`, top: `${lastPenalty.y * 100}%` }}
              />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-white/60">{score.homeLabel || 'P1'}</span>
            <div className="flex gap-1">
              {homeHistory.map((made, index) => (
                <div key={`home-${index}`} className={`h-3 w-3 rounded-full ${made ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {awayHistory.map((made, index) => (
                <div key={`away-${index}`} className={`h-3 w-3 rounded-full ${made ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              ))}
            </div>
            <span className="text-xs uppercase tracking-[0.25em] text-white/60">{score.awayLabel || 'P2'}</span>
          </div>
        </div>
        <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/60">
          Aim with movement keys, then shoot with E {isAwayHuman ? '| P2 shoots with O' : '| AI takes away pens'}
        </div>
      </div>
    </div>
  );
};

export const ChampionsLeagueTables: React.FC<{ tables: GroupTable[]; playerGroupLabel?: string }> = ({ tables, playerGroupLabel }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tables.map(table => (
        <div key={table.label} className={`rounded-2xl border p-4 ${playerGroupLabel === table.label ? 'border-amber-300/35 bg-amber-500/10' : 'border-white/10 bg-black/20'}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-sport text-xl text-white">Group {table.label}</div>
            {playerGroupLabel === table.label && <div className="rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">YOUR GROUP</div>}
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-xs text-white/80">
              <thead className="bg-white/10 text-[11px] uppercase tracking-[0.2em] text-white/55">
                <tr>
                  <th className="px-3 py-2 text-left">Club</th>
                  <th className="px-2 py-2">P</th>
                  <th className="px-2 py-2">W</th>
                  <th className="px-2 py-2">D</th>
                  <th className="px-2 py-2">L</th>
                  <th className="px-2 py-2">GF</th>
                  <th className="px-2 py-2">GA</th>
                  <th className="px-2 py-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map(row => (
                  <tr key={row.clubId} className={row.isPlayer ? 'bg-cyan-400/10 text-cyan-100' : 'border-t border-white/5'}>
                    <td className="px-3 py-2 text-left font-semibold">{row.name}</td>
                    <td className="px-2 py-2 text-center">{row.played}</td>
                    <td className="px-2 py-2 text-center">{row.wins}</td>
                    <td className="px-2 py-2 text-center">{row.draws}</td>
                    <td className="px-2 py-2 text-center">{row.losses}</td>
                    <td className="px-2 py-2 text-center">{row.goalsFor}</td>
                    <td className="px-2 py-2 text-center">{row.goalsAgainst}</td>
                    <td className="px-2 py-2 text-center font-bold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export const GoalOverlay: React.FC<{ scorerName?: string; scorerNumber?: number; scoredAtMinute?: number }> = ({ scorerName, scorerNumber, scoredAtMinute }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/30 via-transparent to-transparent animate-ping"></div>
      
      {/* Confetti particles */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-cyan-400 rounded-full animate-[bounce_1s_infinite]"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-[bounce_1.2s_infinite]"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-pink-400 rounded-full animate-[bounce_0.8s_infinite]"></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-[bounce_1.4s_infinite]"></div>
        <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-[bounce_1.1s_infinite]"></div>
      </div>
      
      <div className="flex flex-col items-center animate-[scaleIn_0.5s_ease-out]">
        <h1 className="text-9xl font-black italic font-sport text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-[bounce_0.5s_ease-out] tracking-tighter">
          GOAL!
        </h1>
        {scorerName && (
          <div className="mt-4 flex flex-col items-center gap-3 animate-[slideIn_0.8s_ease-out_0.3s_both]">
            <div className="flex items-center gap-4 rounded-2xl border border-cyan-300/35 bg-slate-950/70 px-6 py-4 shadow-[0_0_35px_rgba(34,211,238,0.35)]">
              <span className="text-5xl font-sport font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-[pulse_1s_infinite]">
                {scorerName}
              </span>
              {scorerNumber !== undefined && (
                <span className="text-4xl font-sport font-bold text-cyan-300 animate-[glow_1s_infinite]">#{scorerNumber}</span>
              )}
            </div>
            {scoredAtMinute !== undefined && (
              <div className="rounded-full border border-white/20 bg-black/60 px-5 py-2 text-2xl font-sport text-amber-300 animate-[bounce_0.9s_ease-out]">
                {scoredAtMinute}'
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Score flash effect */}
      <div className="absolute inset-0 border-4 border-cyan-500/50 animate-[ripple_1s_ease-out]"></div>
    </div>
  );
};

export const TrophyOverlay: React.FC<{ title: string; season: string }> = ({ title, season }) => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center bg-black/35">
      <div className="animate-[slideIn_1s_ease-out] rounded-[2rem] border border-amber-300/35 bg-[linear-gradient(135deg,rgba(120,53,15,0.96),rgba(251,191,36,0.92))] px-10 py-8 shadow-[0_25px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-24">
            <div className="absolute left-1/2 top-0 h-20 w-14 -translate-x-1/2 rounded-b-[1.8rem] rounded-t-[0.8rem] border-4 border-amber-100 bg-amber-300/80"></div>
            <div className="absolute left-1 top-3 h-10 w-6 rounded-l-full border-4 border-r-0 border-amber-100"></div>
            <div className="absolute right-1 top-3 h-10 w-6 rounded-r-full border-4 border-l-0 border-amber-100"></div>
            <div className="absolute bottom-7 left-1/2 h-7 w-6 -translate-x-1/2 bg-amber-100"></div>
            <div className="absolute bottom-0 left-1/2 h-8 w-20 -translate-x-1/2 rounded-xl bg-slate-900/85"></div>
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.45em] text-slate-950/70">Trophy Unlocked</div>
            <div className="mt-2 max-w-[520px] text-4xl font-sport text-slate-950">{title}</div>
            <div className="mt-3 inline-block rounded-full bg-slate-950/85 px-5 py-2 text-lg font-sport text-amber-200">{season}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GameOverMenu: React.FC<{
  score: ScoreState;
  onRestart: () => void;
  onRevanche?: () => void;
  onExit?: () => void;
  onAdvance?: () => void;
  advanceLabel?: string;
  summaryLabel?: string;
  extraContent?: React.ReactNode;
}> = ({ score, onRestart, onRevanche, onExit, onAdvance, advanceLabel, summaryLabel, extraContent }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/90 z-50 overflow-y-auto px-6 py-8">
      <div className="mx-auto flex min-h-full w-[min(95vw,1100px)] flex-col items-center justify-start">
      <h2 className="text-4xl font-sport text-gray-400 mb-2 tracking-widest uppercase">Full Time</h2>
      {summaryLabel && <div className="mb-6 rounded-full border border-amber-300/20 bg-amber-500/10 px-5 py-2 text-center text-sm uppercase tracking-[0.3em] text-amber-200">{summaryLabel}</div>}

      <div className="flex items-center gap-12 mb-8">
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

      {(score.shootoutHome !== undefined || score.shootoutAway !== undefined) && (
        <div className="mb-10 text-center">
          <div className="text-sm uppercase tracking-[0.3em] text-white/50">Penalty Shootout</div>
          <div className="mt-2 text-4xl font-sport text-cyan-300">{score.shootoutHome ?? 0} - {score.shootoutAway ?? 0}</div>
        </div>
      )}

      {extraContent && <div className="mb-8 w-[min(95vw,980px)]">{extraContent}</div>}

      <div className="sticky bottom-4 mt-auto flex w-full justify-center pt-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/88 px-6 py-5 shadow-2xl">
        {onAdvance && (
          <button
            onClick={onAdvance}
            className="px-7 py-3 border border-amber-300/50 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 font-sport font-bold text-base transition-all duration-300"
          >
            {advanceLabel || 'NEXT MATCH'}
          </button>
        )}
        {onRevanche && (
          <button
            onClick={onRevanche}
            className="px-10 py-4 border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-sport font-bold text-xl transition-all duration-300"
          >
            MATCH REVENGE
          </button>
        )}
        <button
          onClick={onRestart}
          className="px-10 py-4 border border-white/20 hover:bg-white hover:text-black text-white font-sport font-bold text-xl transition-all duration-300"
        >
          NEW GAME
        </button>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-2 px-10 py-4 border border-white/10 hover:bg-rose-500/50 text-white/70 font-sport font-bold text-xl transition-all duration-300"
          >
            EXIT TO MENU
          </button>
        )}
      </div>
      </div>
      </div>
    </div>
  );
};
