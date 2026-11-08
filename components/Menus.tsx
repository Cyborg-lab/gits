import React, { useEffect, useState } from 'react';
import { AIDifficulty, ClubDefinition, FormationKey, GameMode, LeagueKey, ScoreState, StadiumKey, Team } from '../types';
import { getMatchHistory, MatchRecord } from '../game/matchDatabase';

interface MenuProps {
  onOpenModeSelect: () => void;
  onSelectMode: (mode: GameMode, isMultiplayer?: boolean) => void;
  onSelectChampionsLeague: () => void;
  onSelectNationalLeague: () => void;
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
  selectedFormation?: FormationKey;
  onSelectLeague: (league: LeagueKey) => void;
  onSelectClub: (clubId: string) => void;
  onSelectFormation?: (formation: FormationKey) => void;
  onSelectStadium: (stadium: StadiumKey) => void;
  onBack: () => void;
  onContinue: () => void;
  homeReady: boolean;
  awayReady: boolean;
  canContinue: boolean;
}

export interface SquadSelectMenuProps {
  clubName: string;
  players: { name: string; number: number; role: string }[];
  lineupIndices: number[];
  subIndices: number[];
  onSwap: (lineupIndex: number, subIndex: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface PauseMenuProps {
  mode: GameMode;
  showTactics: boolean;
  homeFormation: FormationKey;
  awayFormation: FormationKey;
  onSelectFormation: (team: Team, formation: FormationKey) => void;
  onToggleTactics: () => void;
  onToggleSquad: () => void;
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
  if (league === LeagueKey.PORTUGAL_LIGA) return 'Portugal Liga';
  return 'National League';
};

const FORMATIONS: FormationKey[] = ['1-2-1', '2-1-1', '1-1-2'];
const FORMATION_LAYOUTS: Record<FormationKey, Array<{ x: number; y: number; role: string }>> = {
  '1-2-1': [
    { x: 0.08, y: 0.55, role: 'GK' },
    { x: 0.28, y: 0.24, role: 'DEF' },
    { x: 0.28, y: 0.76, role: 'DEF' },
    { x: 0.52, y: 0.5, role: 'MID' },
    { x: 0.74, y: 0.26, role: 'FWD' },
    { x: 0.74, y: 0.74, role: 'FWD' },
  ],
  '2-1-1': [
    { x: 0.08, y: 0.55, role: 'GK' },
    { x: 0.28, y: 0.18, role: 'DEF' },
    { x: 0.28, y: 0.82, role: 'DEF' },
    { x: 0.52, y: 0.5, role: 'MID' },
    { x: 0.8, y: 0.36, role: 'FWD' },
    { x: 0.8, y: 0.64, role: 'FWD' },
  ],
  '1-1-2': [
    { x: 0.08, y: 0.55, role: 'GK' },
    { x: 0.3, y: 0.5, role: 'DEF' },
    { x: 0.5, y: 0.22, role: 'MID' },
    { x: 0.5, y: 0.78, role: 'MID' },
    { x: 0.78, y: 0.28, role: 'FWD' },
    { x: 0.78, y: 0.72, role: 'FWD' },
  ],
};

const FootballFormationBoard: React.FC<{ clubName: string; formation: FormationKey; players: { name: string; number: number; role: string }[]; }> = ({ clubName, formation, players }) => {
  const layout = FORMATION_LAYOUTS[formation];

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.2),_rgba(15,23,42,0.95))] p-5 shadow-[0_0_35px_rgba(34,211,238,0.15)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.32em] text-cyan-300/75">Football Formation Diagram</div>
          <div className="mt-1 font-sport text-2xl text-white">{clubName}</div>
        </div>
        <div className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 font-sport text-lg text-cyan-200">{formation}</div>
      </div>

      <div className="relative h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,_rgba(30,122,57,0.9),_rgba(18,85,43,0.96))]">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20% 20%' }} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85" />
        <div className="absolute inset-y-0 left-0 w-1/4 border-r border-white/40" />
        <div className="absolute inset-y-0 right-0 w-1/4 border-l border-white/40" />

        {layout.map((slot, index) => {
          const player = players[index] ?? { name: 'Bench', number: index + 1, role: slot.role };
          const x = slot.x * 100;
          const y = slot.y * 100;
          return (
            <div
              key={`${clubName}-${formation}-${index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-slate-950/85 text-[10px] font-black text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.45)]">
                  {player.number}
                </div>
                <div className="rounded-full border border-white/15 bg-slate-900/75 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-white/80">{slot.role}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MainMenu: React.FC<MenuProps> = ({
  onOpenModeSelect,
  onSelectMode,
  onSelectChampionsLeague,
  onSelectNationalLeague,
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
  const [selectedPrimaryAction, setSelectedPrimaryAction] = useState('play');
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    let active = true;
    getMatchHistory().then(records => { if (active) setMatchHistory(records); });
    return () => { active = false; };
  }, []);
  const featuredMatch = matchHistory[0];

  const primaryActions = [
    { key: 'play', label: 'PLAY', subtitle: 'Select mode', accent: 'cyan', action: onOpenModeSelect },
    { key: 'kickoff', label: 'KICK OFF', subtitle: 'Instant match', accent: 'amber', action: () => onSelectMode(GameMode.SINGLE_PLAYER) },
    { key: 'tournament', label: 'TOURNAMENT', subtitle: 'Champions League', accent: 'violet', action: onSelectChampionsLeague },
    { key: 'teams', label: 'TEAMS', subtitle: 'Clubs & nations', accent: 'emerald', action: onOpenModeSelect },
    { key: 'lan', label: 'LOCAL WIFI', subtitle: 'Host or join', accent: 'blue', action: onOpenLanMenu },
  ];

  const accentMap: Record<string, { edge: string; glow: string; panel: string; title: string; chip: string }> = {
    cyan: {
      edge: 'from-cyan-300 via-sky-300 to-cyan-500',
      glow: 'shadow-[0_0_35px_rgba(34,211,238,0.2)]',
      panel: 'border-cyan-400/35 bg-[linear-gradient(135deg,rgba(10,20,35,0.92),rgba(20,31,52,0.75))]',
      title: 'text-cyan-200',
      chip: 'bg-cyan-400/15 text-cyan-100 border-cyan-300/35',
    },
    amber: {
      edge: 'from-amber-300 via-yellow-200 to-orange-500',
      glow: 'shadow-[0_0_35px_rgba(251,191,36,0.2)]',
      panel: 'border-amber-400/30 bg-[linear-gradient(135deg,rgba(27,18,8,0.94),rgba(32,24,10,0.72))]',
      title: 'text-amber-100',
      chip: 'bg-amber-400/15 text-amber-100 border-amber-300/35',
    },
    violet: {
      edge: 'from-violet-300 via-fuchsia-300 to-purple-500',
      glow: 'shadow-[0_0_35px_rgba(168,85,247,0.2)]',
      panel: 'border-violet-400/30 bg-[linear-gradient(135deg,rgba(23,12,35,0.94),rgba(30,17,52,0.72))]',
      title: 'text-violet-100',
      chip: 'bg-violet-400/15 text-violet-100 border-violet-300/35',
    },
    emerald: {
      edge: 'from-emerald-300 via-green-300 to-emerald-500',
      glow: 'shadow-[0_0_35px_rgba(16,185,129,0.2)]',
      panel: 'border-emerald-400/30 bg-[linear-gradient(135deg,rgba(8,26,19,0.94),rgba(18,34,30,0.72))]',
      title: 'text-emerald-100',
      chip: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/35',
    },
    blue: {
      edge: 'from-blue-300 via-sky-300 to-blue-500',
      glow: 'shadow-[0_0_35px_rgba(59,130,246,0.2)]',
      panel: 'border-blue-400/30 bg-[linear-gradient(135deg,rgba(9,18,33,0.94),rgba(17,28,52,0.72))]',
      title: 'text-blue-100',
      chip: 'bg-blue-400/15 text-blue-100 border-blue-300/35',
    },
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(20,35,58,0.95),_rgba(2,6,23,1)_52%)] text-white">
      <div className="menu-stadium-lights pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="menu-light-beam menu-light-beam-left" />
        <div className="menu-light-beam menu-light-beam-right" />
        <div className="menu-stadium-crowd" />
        <div className="menu-stadium-pitch" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.8))]" />
      <div className="absolute -top-40 -left-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/20 blur-[120px]" />

      <div className="relative z-10 w-[min(1200px,92vw)] rounded-[30px] border border-white/10 bg-slate-950/35 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.7)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pb-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-500/10 font-sport text-sm text-cyan-200">FC</div>
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.5em] text-cyan-200/80">FIFA 2026</div>
              <div className="font-sport text-2xl tracking-tight text-white">ARCADE FC</div>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.58rem] uppercase tracking-[0.38em] text-white/70">
            LIVE MODE
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[0.6rem] uppercase tracking-[0.42em] text-slate-300/80">Main Menu</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.5rem] uppercase tracking-[0.28em] text-slate-200/70">01</div>
            </div>

            <div className="space-y-3">
              {primaryActions.map(({ key, label, subtitle, accent, action }) => {
                const styles = accentMap[accent];
                const isSelected = selectedPrimaryAction === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onMouseEnter={() => setSelectedPrimaryAction(key)}
                    onFocus={() => setSelectedPrimaryAction(key)}
                    onClick={() => {
                      setSelectedPrimaryAction(key);
                      action();
                    }}
                    className={`group relative block w-full overflow-hidden rounded-[22px] border p-0 text-left transition-all duration-300 ${isSelected ? `translate-x-1 ${styles.glow} ${styles.panel}` : 'border-white/10 bg-slate-900/30 hover:border-white/20 hover:bg-slate-900/45'} ${isSelected ? 'scale-[1.01]' : ''}`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-[5px] bg-gradient-to-b ${styles.edge}`} />
                    <div className="relative flex items-center justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <div className={`font-sport text-[1.5rem] uppercase ${isSelected ? styles.title : 'text-white'}`}>{label}</div>
                        <div className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-slate-300/75">{subtitle}</div>
                      </div>
                      <div className={`rounded-full border px-2 py-1 text-[0.5rem] uppercase tracking-[0.25em] ${isSelected ? styles.chip : 'border-white/10 bg-white/5 text-slate-200/70'}`}>
                        {isSelected ? 'ON' : 'GO'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-4">
              <div className="text-[0.55rem] uppercase tracking-[0.42em] text-white/60">Quick Info</div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-200/80">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[0.46rem] uppercase tracking-[0.26em] text-slate-400">Mode</div>
                  <div className="mt-2 font-sport text-lg text-white">Quick</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[0.46rem] uppercase tracking-[0.26em] text-slate-400">Teams</div>
                  <div className="mt-2 font-sport text-lg text-white">World</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[0.46rem] uppercase tracking-[0.26em] text-slate-400">Match</div>
                  <div className="mt-2 font-sport text-lg text-white">90min</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[0.46rem] uppercase tracking-[0.26em] text-slate-400">Style</div>
                  <div className="mt-2 font-sport text-lg text-white">FC26</div>
                </div>
              </div>
            </div>
          </aside>

          <section className="relative overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(4,12,24,0.9),rgba(7,19,38,0.78))] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),transparent_33%),radial-gradient(circle_at_bottom,_rgba(13,148,136,0.12),transparent_28%)]" />
            <div className="relative flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[0.6rem] uppercase tracking-[0.42em] text-cyan-200/80">Match History</div>
                  <div className="mt-1 font-sport text-4xl text-white">RECENT RESULTS</div>
                </div>
                <div className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-[0.5rem] uppercase tracking-[0.38em] text-cyan-100">{matchHistory.length} PLAYED</div>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.8),rgba(8,15,24,0.95))] p-5">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 to-transparent" />
                <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                <div className="relative grid h-full gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/20 p-4">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.2),rgba(17,24,39,0.75))]" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between text-[0.52rem] uppercase tracking-[0.32em] text-slate-200/80">
                        <span>{featuredMatch ? new Date(featuredMatch.playedAt).toLocaleString() : 'MATCH HISTORY'}</span>
                        <span>{featuredMatch?.stadium.replaceAll('_', ' ') || 'LOCAL DATABASE'}</span>
                      </div>

                      <div className="relative mx-auto mt-3 flex w-full max-w-[520px] items-center justify-between rounded-[20px] border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                        <div className="text-left">
                          <div className="text-[0.5rem] uppercase tracking-[0.34em] text-slate-300">Home</div>
                          <div className="mt-1 font-sport text-3xl text-white">{featuredMatch?.home || '—'}</div>
                        </div>
                        <div className="px-5 text-center">
                          <div className="text-[0.5rem] uppercase tracking-[0.38em] text-cyan-200">{featuredMatch?.mode.replaceAll('_', ' ') || 'NO MATCHES YET'}</div>
                          <div className="mt-2 font-sport text-5xl tracking-tight text-white">{featuredMatch ? `${featuredMatch.homeScore} - ${featuredMatch.awayScore}` : '— : —'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[0.5rem] uppercase tracking-[0.34em] text-slate-300">Away</div>
                          <div className="mt-1 font-sport text-3xl text-white">{featuredMatch?.away || '—'}</div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div className="rounded-[18px] border border-cyan-400/30 bg-cyan-500/10 px-4 py-3">
                          <div className="text-[0.46rem] uppercase tracking-[0.32em] text-cyan-200/80">Matches</div>
                          <div className="mt-2 font-sport text-3xl text-white">{matchHistory.length}</div>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                          <div className="text-[0.46rem] uppercase tracking-[0.32em] text-slate-300">Latest</div>
                          <div className="mt-2 font-sport text-3xl text-white">{featuredMatch ? new Date(featuredMatch.playedAt).toLocaleDateString() : '—'}</div>
                        </div>
                        <div className="rounded-[18px] border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                          <div className="text-[0.46rem] uppercase tracking-[0.32em] text-amber-200/80">Storage</div>
                          <div className="mt-2 font-sport text-3xl text-white">IndexedDB</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="min-h-0 flex-1 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
                      <div className="text-[0.5rem] uppercase tracking-[0.38em] text-slate-300/80">All Previous Matches</div>
                      <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                        {matchHistory.length === 0 && <div className="text-sm text-slate-200/60">Завершённые матчи появятся здесь.</div>}
                        {matchHistory.map(match => (
                          <div key={match.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-2 text-sm text-white">
                              <span className="truncate">{match.home}</span>
                              <span className="text-center font-sport text-xl text-cyan-200">{match.homeScore} : {match.awayScore}{match.shootoutHome !== undefined && <span className="block text-[9px] leading-none text-amber-200">PEN {match.shootoutHome} : {match.shootoutAway}</span>}</span>
                              <span className="truncate text-right">{match.away}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-400">{new Date(match.playedAt).toLocaleString()} · {match.mode.replaceAll('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-3 rounded-[22px] border border-white/10 bg-slate-950/40 p-4 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="text-[0.52rem] uppercase tracking-[0.32em] text-slate-300">P1 Controls</div>
            <div className="mt-2 text-sm text-slate-200/80">WASD • Q • E • R • F • Shift</div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="text-[0.52rem] uppercase tracking-[0.32em] text-slate-300">P2 Controls</div>
            <div className="mt-2 text-sm text-slate-200/80">IJKL • U • O • P • ; • Shift</div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="text-[0.52rem] uppercase tracking-[0.32em] text-slate-300">Modes</div>
            <div className="mt-2 text-sm text-slate-200/80">Kick off • Champions League • LAN • Clubs</div>
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
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectMode(GameMode.SINGLE_PLAYER)}
                onKeyDown={event => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelectMode(GameMode.SINGLE_PLAYER);
                  }
                }}
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
              </div>

              <button
                onClick={() => onSelectMode(GameMode.MULTI_PLAYER)}
                className="text-left rounded-2xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 px-5 py-6 transition-all"
              >
                <div className="font-sport text-2xl text-blue-300">P1 VS P2</div>
                <div className="mt-2 text-sm text-white/70">P2 controls: IJKL move, U pass, O shoot, Right Shift sprint</div>
              </button>

              <button
                onClick={onSelectChampionsLeague}
                className="text-left rounded-2xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-6 transition-all"
              >
                <div className="font-sport text-2xl text-amber-300">CHAMPIONS LEAGUE</div>
                <div className="mt-2 text-sm text-white/70">Qualification, group stage and knockout rounds</div>
              </button>

              <button
                onClick={onSelectNationalLeague}
                className="text-left rounded-2xl border border-violet-400/30 bg-violet-500/10 hover:bg-violet-500/20 px-5 py-6 transition-all"
              >
                <div className="font-sport text-2xl text-violet-300">NATIONAL LEAGUE</div>
                <div className="mt-2 text-sm text-white/70">World nations from Europe to Oceania and global rivalry</div>
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

export const SquadSelectMenu: React.FC<SquadSelectMenuProps> = ({
  clubName,
  players,
  lineupIndices,
  subIndices,
  onSwap,
  onContinue,
  onBack,
}) => {
  const [selectedLineupSlot, setSelectedLineupSlot] = useState<number | null>(null);

  const formationPlayers = lineupIndices.map(index => players[index]);

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-50 text-white">
      <div className="w-[min(95vw,1200px)] glass-panel rounded-3xl border border-white/10 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-sport text-cyan-300">{clubName} SQUAD</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.28em] text-white/45">
              Pick a starter, then choose a reserve to swap in
            </p>
          </div>
          <button onClick={onBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm uppercase tracking-[0.2em] text-white/70 hover:bg-white/10">
            Back
          </button>
        </div>

        <div className="mt-8 grid xl:grid-cols-[1.2fr_0.8fr] gap-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-white/45 mb-4">Starting 6</div>
              <div className="flex flex-col gap-2">
                {lineupIndices.map((playerIndex, slotIndex) => (
                  <button
                    key={`lineup-${slotIndex}`}
                    onClick={() => setSelectedLineupSlot(selectedLineupSlot === slotIndex ? null : slotIndex)}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-colors ${
                      selectedLineupSlot === slotIndex ? 'border-cyan-400 bg-cyan-400/20' : 'border-white/10 bg-black/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-sport text-xl text-white/50 w-6">{players[playerIndex].number}</span>
                      <span className="font-sport text-xl">{players[playerIndex].name}</span>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">{players[playerIndex].role}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-white/45 mb-4">Substitutes</div>
              <div className="flex flex-col gap-2">
                {subIndices.map((playerIndex, slotIndex) => (
                  <button
                    key={`sub-${slotIndex}`}
                    onClick={() => {
                      if (selectedLineupSlot !== null) {
                        onSwap(selectedLineupSlot, slotIndex);
                        setSelectedLineupSlot(null);
                      }
                    }}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl border transition-colors ${
                      selectedLineupSlot !== null ? 'border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 cursor-pointer' : 'border-white/10 bg-black/30 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-sport text-xl text-white/50 w-6">{players[playerIndex].number}</span>
                      <span className="font-sport text-xl">{players[playerIndex].name}</span>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-amber-300">{players[playerIndex].role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.14),_rgba(15,23,42,0.96))] p-4 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.36em] text-cyan-300/70">Tactical Formation Board</div>
                <div className="mt-1 font-sport text-2xl text-white">{clubName}</div>
              </div>
              <div className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 font-sport text-lg text-cyan-200">2-1-1</div>
            </div>

            <div className="relative mt-4 h-[250px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,_rgba(30,122,57,0.9),_rgba(18,85,43,0.96))]">
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20% 20%' }} />
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
              {[{x:0.08,y:0.55},{x:0.28,y:0.24},{x:0.28,y:0.76},{x:0.52,y:0.5},{x:0.74,y:0.26},{x:0.74,y:0.74}].map((slot, index) => {
                const player = formationPlayers[index] ?? { name: 'Bench', number: index + 1, role: 'MID' };
                return (
                  <div key={`board-${player.name}-${index}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-slate-950/85 text-[9px] font-black text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.45)]">
                        {player.number}
                      </div>
                      <div className="rounded-full border border-white/15 bg-slate-900/75 px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-white/80">{player.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onContinue} className="rounded-xl bg-cyan-400 px-8 py-3 font-sport text-xl text-slate-950 hover:bg-cyan-300 transition-colors">
            CONFIRM LINEUP
          </button>
        </div>
      </div>
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
  selectedFormation = '2-1-1',
  onSelectLeague,
  onSelectClub,
  onSelectFormation,
  onSelectStadium,
  onBack,
  onContinue,
  homeReady,
  awayReady,
  canContinue,
}) => {
  const selectedClub = clubs.find(club => club.id === selectedClubId) ?? clubs[0];
  const visibleClubs = clubs.slice(0, 6);

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-50 text-white">
      <div className="w-[min(95vw,1200px)] glass-panel rounded-3xl border border-white/10 p-8">
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

        <div className="mt-8">
          <div className="mt-8 flex flex-wrap gap-3">
            {[LeagueKey.LA_LIGA, LeagueKey.PREMIER_LEAGUE, LeagueKey.LIGUE_1, LeagueKey.SERIE_A, LeagueKey.PORTUGAL_LIGA, LeagueKey.NATIONAL_LEAGUE].map(league => (
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

          <div className="mt-6 grid xl:grid-cols-[1.45fr_0.9fr] gap-5">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleClubs.map(club => {
                const badgeText = club.badge || (club.shortName || club.name).slice(0, 3).toUpperCase();
                const [badgeFrom, badgeTo] = club.badgeColors || ['#0ea5e9', '#1e293b'];
                return (
                  <button
                    key={club.id}
                    onClick={() => onSelectClub(club.id)}
                    className={`group rounded-2xl border px-5 py-5 text-left transition-all duration-300 ${
                      selectedClubId === club.id ? 'border-cyan-300 bg-cyan-400/15 shadow-[0_0_30px_rgba(34,211,238,0.18)]' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 text-lg font-black tracking-[0.12em] text-white shadow-[inset_0_-8px_12px_rgba(15,23,42,0.5)]"
                        style={{ background: `linear-gradient(135deg, ${badgeFrom}, ${badgeTo})` }}
                      >
                        <span>{badgeText}</span>
                        {club.logoUrl && <img src={club.logoUrl} alt={`${club.name} logo`} className="absolute inset-0 h-full w-full rounded-full bg-white object-contain p-1.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-sport text-2xl text-white">{club.name}</div>
                        <div className="mt-1 text-sm text-white/60">{leagueLabel(club.league)}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {club.country || club.players.slice(0, 3).map(player => player.name).join(' • ')}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedClub && (
              <div className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_rgba(15,23,42,0.95))] p-4 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.32em] text-cyan-300/70">Selected Club</div>
                    <div className="mt-1 flex items-center gap-2 font-sport text-2xl text-white">
                      {selectedClub.logoUrl && <img src={selectedClub.logoUrl} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-1" />}
                      {selectedClub.name}
                    </div>
                  </div>
                  <div className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 font-sport text-lg text-cyan-200">{selectedClub.country}</div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {FORMATIONS.map(formation => (
                    <button
                      key={formation}
                      onClick={() => onSelectFormation?.(formation)}
                      className={`rounded-full px-3 py-2 font-sport text-sm transition-colors ${
                        selectedFormation === formation ? 'bg-cyan-300 text-slate-950' : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {formation}
                    </button>
                  ))}
                </div>

                <FootballFormationBoard
                  clubName={selectedClub.name}
                  formation={selectedFormation}
                  players={selectedClub.players.slice(0, 6).map(player => ({
                    name: player.name,
                    number: player.number,
                    role: player.role,
                  }))}
                />
              </div>
            )}
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
  onToggleSquad,
  onContinue,
  onExit,
  homeReady,
  awayReady,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-900/88 backdrop-blur-lg flex items-center justify-center z-50 text-white">
      <div className="w-[min(92vw,980px)] glass-panel rounded-3xl border border-white/10 p-8">
        <h2 className="text-5xl font-sport font-black text-white tracking-tight">PAUSED</h2>
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-white/50">Continue, open tactics, substitutions, or exit match</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <button onClick={onContinue} className="rounded-xl bg-cyan-500 px-6 py-3 font-sport text-xl text-white hover:bg-cyan-400 transition-colors">
            CONTINUE
          </button>
          <button onClick={onToggleTactics} className="rounded-xl bg-white/10 px-6 py-3 font-sport text-xl text-white hover:bg-white/20 transition-colors">
            {showTactics ? 'CLOSE TACTICS' : 'TACTICS'}
          </button>
          <button onClick={onToggleSquad} className="rounded-xl bg-white/10 px-6 py-3 font-sport text-xl text-white hover:bg-white/20 transition-colors">
            SQUAD / SUBS
          </button>
          <button onClick={onExit} className="rounded-xl bg-rose-500/80 px-6 py-3 font-sport text-xl text-white hover:bg-rose-500 transition-colors">
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
                    className={`rounded-xl px-5 py-3 font-sport transition-colors ${homeFormation === formation ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                      className={`rounded-xl px-5 py-3 font-sport transition-colors ${awayFormation === formation ? 'bg-blue-300 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
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

export const PenaltyMenu: React.FC<{ score: ScoreState; isAwayHuman: boolean; isKeeperTurn: boolean; onChooseTarget: (aimX: number, aimY: number) => void }> = ({ score, isAwayHuman, isKeeperTurn, onChooseTarget }) => {
  const [selectedTarget, setSelectedTarget] = useState<{ x: number; y: number } | null>(null);
  const homeHistory = score.penaltyHistoryHome || [];
  const awayHistory = score.penaltyHistoryAway || [];
  const lastPenalty = score.lastPenalty;

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 pointer-events-auto">
      <div className="rounded-2xl border border-white/10 bg-black/85 px-6 py-4 text-center text-white shadow-xl min-w-[min(420px,94vw)] max-w-lg">
        <div className="font-sport text-3xl text-cyan-300">PENALTY SHOOTOUT</div>
        <div className="mt-2 text-4xl font-black">{score.shootoutHome ?? 0} - {score.shootoutAway ?? 0}</div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <button type="button" aria-label={isKeeperTurn ? 'Choose where the goalkeeper dives' : 'Aim and take the penalty'} onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            const aimX = Math.max(0.18, Math.min(0.82, (event.clientX - rect.left) / rect.width));
            const aimY = Math.max(0.18, Math.min(0.82, (event.clientY - rect.top) / rect.height));
            setSelectedTarget({ x: aimX, y: aimY });
            onChooseTarget(aimX, aimY);
          }} className="relative mx-auto block h-36 w-64 cursor-crosshair rounded-t-3xl border-4 border-white bg-gradient-to-b from-sky-300/20 to-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-300">
            <div className="absolute inset-x-4 bottom-0 h-1/2 border-x-2 border-t-2 border-white/70"></div>
            <svg className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/80" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="7" r="4" fill="currentColor" />
              <path d="M24 12v14m0-9-12 6m12-6 12 6m-12 3-9 13m9-13 9 13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="m8 20-3 3m35-3 3 3" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {lastPenalty && (
              <div
                className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${lastPenalty.scored ? 'bg-emerald-400' : 'bg-rose-500'}`}
                style={{ left: `${lastPenalty.x * 100}%`, top: `${lastPenalty.y * 100}%` }}
              />
            )}
            {selectedTarget && (
              <div className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.9)]" style={{ left: `${selectedTarget.x * 100}%`, top: `${selectedTarget.y * 100}%` }} />
            )}
          </button>
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
          {isKeeperTurn ? 'Click the goal to choose where to dive. The AI shoots in a moment.' : `Click the goal to aim and shoot${isAwayHuman ? ' · P2 takes away penalties' : ''}.`}
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
