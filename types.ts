export enum GameStatus {
  MENU = 'MENU',
  KICKOFF = 'KICKOFF',
  PLAYING = 'PLAYING',
  HALFTIME = 'HALFTIME',
  PAUSED = 'PAUSED',
  PENALTY = 'PENALTY',
  GOAL = 'GOAL',
  GAME_OVER = 'GAME_OVER'
}

export enum Team {
  HOME = 'HOME', // Player 1
  AWAY = 'AWAY'  // Player 2
}

export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER',
  MULTI_PLAYER = 'MULTI_PLAYER',
  STANDARD_TRAINING = 'STANDARD_TRAINING',
  MATCH_TRAINING = 'MATCH_TRAINING',
}

export type AIDifficulty = 'EASY' | 'NORMAL' | 'MEDIUM' | 'HARD' | 'EXTREME';

export enum LeagueKey {
  LA_LIGA = 'LA_LIGA',
  PREMIER_LEAGUE = 'PREMIER_LEAGUE',
  LIGUE_1 = 'LIGUE_1',
  SERIE_A = 'SERIE_A',
  PORTUGAL_LIGA = 'PORTUGAL_LIGA',
  NATIONAL_LEAGUE = 'NATIONAL_LEAGUE',
}

export type FormationKey = '1-2-1' | '2-1-1' | '1-1-2';
export type StadiumKey = 'METRO_DOME' | 'SUNSET_ARENA' | 'ALPINE_PARK';

export interface PlayerProfile {
  name: string;
  number: number;
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
}

export interface ClubDefinition {
  id: string;
  name: string;
  shortName: string;
  league: LeagueKey;
  logoUrl?: string;
  badge?: string;
  badgeColors?: [string, string];
  country?: string;
  players: PlayerProfile[];
}

export interface TeamSelection {
  league: LeagueKey;
  clubId: string;
  formation: FormationKey;
  lineupIndices: number[]; // Indices of the 6 starting players in the club's players array
  subIndices: number[]; // Indices of the remaining players on the bench
}

export interface MatchSetup {
  home: TeamSelection;
  away: TeamSelection;
  stadium: StadiumKey;
}

export interface GoalScorerInfo {
  name: string;
  number: number;
  scoredAtMinute: number;
  team: Team;
}

export interface PlayerInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pass: boolean;
  sprint: boolean;
  tackle: boolean;
  aimX?: number;
  aimY?: number;
}

export interface InputState {
  home: PlayerInputState;
  away: PlayerInputState;
}

export interface GameConfig {
  matchDuration: number; // in seconds
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ScoreState {
  home: number;
  away: number;
  time: number; // in seconds
  period?: string;
  restartLabel?: string;
  homeLabel?: string;
  awayLabel?: string;
  shootoutHome?: number;
  shootoutAway?: number;
  penaltyHistoryHome?: boolean[];
  penaltyHistoryAway?: boolean[];
  lastPenalty?: {
    team: Team;
    x: number;
    y: number;
    scored: boolean;
  };
  cardsHome?: { yellow: number; red: number };
  cardsAway?: { yellow: number; red: number };
  matchEvent?: string;
}

export interface SnapshotVector {
  x: number;
  y: number;
}

export interface PlayerSnapshot {
  team: Team;
  number: number;
  name: string;
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
  pos: SnapshotVector;
  vel: SnapshotVector;
  stamina: number;
  isControlled: boolean;
  kickCooldown: number;
  facingAngle: number;
  slideTimer?: number;
  tackleCooldown?: number;
  isSentOff?: boolean;
  diveTimer?: number;
}

export interface GameSnapshot {
  status: GameStatus;
  score: ScoreState;
  mode: GameMode;
  stadium?: StadiumKey;
  players: PlayerSnapshot[];
  ball: {
    pos: SnapshotVector;
    vel: SnapshotVector;
  };
  officials?: {
    referee: SnapshotVector;
    assistants: [SnapshotVector, SnapshotVector];
    offsideFlag: boolean;
    cardsHome: { yellow: number; red: number };
    cardsAway: { yellow: number; red: number };
    event?: string;
  };
}
