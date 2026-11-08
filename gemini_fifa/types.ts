export enum GameStatus {
  MENU = 'MENU',
  KICKOFF = 'KICKOFF',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GOAL = 'GOAL',
  GAME_OVER = 'GAME_OVER'
}

export enum Team {
  HOME = 'HOME', // Player
  AWAY = 'AWAY'  // CPU
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pass: boolean;
  sprint: boolean;
}

export interface GameConfig {
  matchDuration: number; // in seconds
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ScoreState {
  home: number;
  away: number;
  time: number; // in seconds
}