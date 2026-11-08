import { Ball, Player } from './Entities';
import { Vector2D } from '../utils/Vector2D';
import { Team, GameStatus, InputState, PlayerInputState, GameMode, GameSnapshot, MatchSetup, FormationKey, GoalScorerInfo, AIDifficulty, StadiumKey } from '../types';
import {
  PLAYER_RADIUS, BALL_RADIUS,
  PLAYER_KICK_FORCE, PLAYER_PASS_FORCE, GOAL_WIDTH, 
  PENALTY_AREA_WIDTH,
  PITCH_HEIGHT as H, PITCH_WIDTH as W
} from '../constants';
import { getClubById } from './clubs';

type RestartType = 'KICK OFF' | 'THROW IN' | 'CORNER' | 'GOAL KICK' | 'FREE KICK';

export class GameEngine {
  ball: Ball;
  players: Player[];
  status: GameStatus;
  score: { home: number; away: number };
  time: number; // in seconds
  activePlayerIndices: Record<Team, number>;
  mode: GameMode;
  stadium: StadiumKey;
  isTrainingMultiplayer: boolean = false;
  penaltiesOnDraw = false;
  
  private lastGoalTime: number = 0;
  private nextKickOffTeam: Team = Team.HOME;
  private lastPassInput: Record<Team, boolean>;
  private aiKickOffTimer: number = 0; // Delay for AI kick off
  private matchSetup: MatchSetup | null = null;
  private currentPeriod: 1 | 2 | 3 | 4 = 1;
  private aiDifficulty: AIDifficulty = 'NORMAL';
  private formations: Record<Team, FormationKey> = {
    [Team.HOME]: '1-2-1',
    [Team.AWAY]: '1-2-1',
  };
  private homeLabel = 'HOM';
  private awayLabel = 'AWY';
  private lastTouchPlayer: Player | null = null;
  private restartType: RestartType = 'KICK OFF';
  private penaltyState = {
    active: false,
    currentTeam: Team.HOME as Team,
    shootoutHome: 0,
    shootoutAway: 0,
    historyHome: [] as boolean[],
    historyAway: [] as boolean[],
    lastPenalty: undefined as { team: Team; x: number; y: number; scored: boolean } | undefined,
    resolveAt: 0,
    aiTimer: 0,
    shotInFlight: false,
    shootingTeam: Team.HOME as Team,
    keeperDiveTarget: null as Vector2D | null,
    shotTarget: null as Vector2D | null,
    centralSave: false,
    shooterIndexHome: 0,
    shooterIndexAway: 0,
  };
  lastScorer: GoalScorerInfo | null = null;
  refereePos = new Vector2D(W / 2, H / 2);
  assistantsPos: [Vector2D, Vector2D] = [new Vector2D(W / 2, 28), new Vector2D(W / 2, H - 28)];
  offsideFlagRaised = false;
  matchEvent = '';
  cards: Record<Team, { yellow: number; red: number }> = {
    [Team.HOME]: { yellow: 0, red: 0 }, [Team.AWAY]: { yellow: 0, red: 0 },
  };
  private offsideCandidates: Player[] = [];
  private indirectOffsideRestart = false;
  private indirectKicker: Player | null = null;
  private matchEventUntil = 0;
  private refereeFocusTarget: Vector2D | null = null;
  private refereeFocusUntil = 0;

  constructor() {
    this.ball = new Ball();
    this.players = [];
    this.status = GameStatus.MENU;
    this.score = { home: 0, away: 0 };
    this.time = 0;
    this.mode = GameMode.SINGLE_PLAYER;
    this.stadium = 'METRO_DOME';
    this.activePlayerIndices = {
      [Team.HOME]: -1,
      [Team.AWAY]: -1,
    };
    this.lastPassInput = {
      [Team.HOME]: false,
      [Team.AWAY]: false,
    };
    this.initTeams();
  }

  initTeams() {
    this.players = [];
    
    // HOME TEAM (Left side, attacking Right)
    // Indices: 0-GK, 1-DEF, 2-DEF, 3-MID, 4-FWD, 5-FWD
    this.players.push(new Player(100, H/2, Team.HOME, 1, 'GK'));
    this.players.push(new Player(400, H/2 - 200, Team.HOME, 5, 'DEF'));
    this.players.push(new Player(400, H/2 + 200, Team.HOME, 5, 'DEF'));
    this.players.push(new Player(700, H/2, Team.HOME, 8, 'MID'));
    this.players.push(new Player(1000, H/2 - 100, Team.HOME, 10, 'FWD')); 
    this.players.push(new Player(1000, H/2 + 100, Team.HOME, 9, 'FWD'));

    // AWAY TEAM (Right side, attacking Left)
    // Indices: 6-GK, 7-DEF, 8-DEF, 9-MID, 10-FWD, 11-FWD
    this.players.push(new Player(W - 100, H/2, Team.AWAY, 1, 'GK'));
    this.players.push(new Player(W - 400, H/2 - 200, Team.AWAY, 4, 'DEF'));
    this.players.push(new Player(W - 400, H/2 + 200, Team.AWAY, 5, 'DEF'));
    this.players.push(new Player(W - 700, H/2, Team.AWAY, 8, 'MID'));
    this.players.push(new Player(W - 1000, H/2 - 100, Team.AWAY, 10, 'FWD'));
    this.players.push(new Player(W - 1000, H/2 + 100, Team.AWAY, 9, 'FWD'));

    this.players.forEach(player => {
      player.isControlled = false;
    });

    // Set initial active players for both teams
    this.activePlayerIndices[Team.HOME] = 4;
    this.activePlayerIndices[Team.AWAY] = 10;
    this.players[this.activePlayerIndices[Team.HOME]].isControlled = true;
    this.players[this.activePlayerIndices[Team.AWAY]].isControlled = true;
  }

  startGame() {
    this.players.forEach(player => { player.isSentOff = false; });
    this.score = { home: 0, away: 0 };
    this.time = 0;
    this.currentPeriod = 1;
    this.lastScorer = null;
    this.lastTouchPlayer = null;
    this.cards[Team.HOME] = { yellow: 0, red: 0 };
    this.cards[Team.AWAY] = { yellow: 0, red: 0 };
    this.offsideCandidates = [];
    this.indirectOffsideRestart = false;
    this.indirectKicker = null;
    this.offsideFlagRaised = false;
    this.matchEvent = '';
    this.restartType = 'KICK OFF';
    this.resetPenaltyState();
    this.nextKickOffTeam = Team.HOME; // Start with Home kickoff
    this.resetPositions(this.nextKickOffTeam);
  }

  startSecondHalf() {
    this.time = 45 * 60;
    this.currentPeriod = 2;
    this.restartType = 'KICK OFF';
    this.nextKickOffTeam = Team.AWAY; // Away kicks off second half
    this.resetPositions(this.nextKickOffTeam);
  }

  continueFromBreak() {
    if (this.currentPeriod === 1) {
      this.startSecondHalf();
      return;
    }
    this.startNextPeriod();
  }

  startNextPeriod() {
    if (this.currentPeriod === 2 && this.score.home === this.score.away && !this.penaltiesOnDraw) {
      this.currentPeriod = 3;
      this.time = 95 * 60;
      this.restartType = 'KICK OFF';
      this.nextKickOffTeam = Team.HOME;
      this.resetPositions(this.nextKickOffTeam);
      return;
    }

    if (this.currentPeriod === 3) {
      this.currentPeriod = 4;
      this.time = 140 * 60;
      this.restartType = 'KICK OFF';
      this.nextKickOffTeam = Team.AWAY;
      this.resetPositions(this.nextKickOffTeam);
      return;
    }

    if (this.currentPeriod === 4 && this.score.home === this.score.away) {
      this.startPenaltyShootout();
    }
  }

  setMode(mode: GameMode) {
    this.mode = mode;
  }

  setAIDifficulty(difficulty: AIDifficulty) {
    this.aiDifficulty = difficulty;
  }

  isHumanControlled(team: Team): boolean {
    if (this.mode === GameMode.SINGLE_PLAYER) {
        return team === Team.HOME;
    }
    if (this.mode === GameMode.MULTI_PLAYER) {
        return true; 
    }
    if (this.mode === GameMode.STANDARD_TRAINING || this.mode === GameMode.MATCH_TRAINING) {
        if (this.isTrainingMultiplayer) return true;
        return team === Team.HOME;
    }
    return false;
  }

  private getAiSettings() {
    if (this.aiDifficulty === 'EASY') return { keeper: 0.5, speed: 0.7, passRisk: 0.45, shootRange: 260 };
    if (this.aiDifficulty === 'NORMAL') return { keeper: 1.0, speed: 0.8, passRisk: 0.58, shootRange: 320 };
    if (this.aiDifficulty === 'MEDIUM') return { keeper: 1.2, speed: 0.9, passRisk: 0.66, shootRange: 360 };
    if (this.aiDifficulty === 'HARD') return { keeper: 1.3, speed: 1.0, passRisk: 0.76, shootRange: 410 };
    return { keeper: 1.4, speed: 1.1, passRisk: 0.88, shootRange: 470 };
  }

  private constrainGoalkeeperToPenaltyArea(p: Player) {
    if (p.role !== 'GK') return;
    const minY = (H - 600) / 2;
    const maxY = minY + 600;
    p.pos.y = Math.max(minY, Math.min(maxY, p.pos.y));

    if (p.team === Team.HOME) {
      p.pos.x = Math.max(20, Math.min(PENALTY_AREA_WIDTH, p.pos.x));
    } else {
      p.pos.x = Math.max(W - PENALTY_AREA_WIDTH, Math.min(W - 20, p.pos.x));
    }
  }

  private getPeriodLabel() {
    if (this.currentPeriod === 1) return '1ST HALF';
    if (this.currentPeriod === 2) {
      return this.time >= 90 * 60 ? '2ND HALF +5' : '2ND HALF';
    }
    if (this.currentPeriod === 3) return '3RD TIME';
    return '4TH TIME';
  }

  toSnapshot(): GameSnapshot {
    return {
      status: this.status,
      score: {
        home: this.score.home,
        away: this.score.away,
        time: this.time,
        period: this.penaltyState.active ? 'PENALTIES' : this.getPeriodLabel(),
        restartLabel: this.status === GameStatus.KICKOFF ? this.restartType : undefined,
        homeLabel: this.homeLabel,
        awayLabel: this.awayLabel,
        shootoutHome: this.penaltyState.active || this.penaltyState.historyHome.length ? this.penaltyState.shootoutHome : undefined,
        shootoutAway: this.penaltyState.active || this.penaltyState.historyAway.length ? this.penaltyState.shootoutAway : undefined,
        penaltyHistoryHome: [...this.penaltyState.historyHome],
        penaltyHistoryAway: [...this.penaltyState.historyAway],
        lastPenalty: this.penaltyState.lastPenalty,
        cardsHome: { ...this.cards[Team.HOME] },
        cardsAway: { ...this.cards[Team.AWAY] },
        matchEvent: this.matchEvent || undefined,
      },
      mode: this.mode,
      stadium: this.stadium,
      players: this.players.map(player => ({
        team: player.team,
        number: player.number,
        name: player.name,
        role: player.role,
        pos: { x: player.pos.x, y: player.pos.y },
        vel: { x: player.vel.x, y: player.vel.y },
        stamina: player.stamina,
        isControlled: player.isControlled,
        kickCooldown: player.kickCooldown,
        facingAngle: player.facingAngle,
        slideTimer: player.slideTimer,
        tackleCooldown: player.tackleCooldown,
        isSentOff: player.isSentOff,
        diveTimer: player.diveTimer,
      })),
      ball: {
        pos: { x: this.ball.pos.x, y: this.ball.pos.y },
        vel: { x: this.ball.vel.x, y: this.ball.vel.y },
      },
      officials: {
        referee: { x: this.refereePos.x, y: this.refereePos.y },
        assistants: this.assistantsPos.map(pos => ({ x: pos.x, y: pos.y })) as [{ x: number; y: number }, { x: number; y: number }],
        offsideFlag: this.offsideFlagRaised,
        cardsHome: { ...this.cards[Team.HOME] },
        cardsAway: { ...this.cards[Team.AWAY] },
        event: this.matchEvent || undefined,
      },
    };
  }

  configureMatch(setup: MatchSetup) {
    this.matchSetup = {
      home: { ...setup.home },
      away: { ...setup.away },
      stadium: setup.stadium,
    };
    this.formations[Team.HOME] = setup.home.formation;
    this.formations[Team.AWAY] = setup.away.formation;
    this.stadium = setup.stadium;

    const homeClub = getClubById(setup.home.clubId);
    const awayClub = getClubById(setup.away.clubId);

    this.homeLabel = homeClub.shortName;
    this.awayLabel = awayClub.shortName;

    this.applyClubToTeam(Team.HOME, homeClub.players, setup.home.lineupIndices);
    this.applyClubToTeam(Team.AWAY, awayClub.players, setup.away.lineupIndices);
  }

  setFormation(team: Team, formation: FormationKey, refreshPositions = false) {
    this.formations[team] = formation;
    if (this.matchSetup) {
      if (team === Team.HOME) {
        this.matchSetup.home.formation = formation;
      } else {
        this.matchSetup.away.formation = formation;
      }
    }
    if (refreshPositions) {
      this.resetPositions(this.nextKickOffTeam);
    }
  }

  private applyClubToTeam(team: Team, squad: Array<{ name: string; number: number; role: 'GK' | 'DEF' | 'MID' | 'FWD' }>, lineupIndices?: number[]) {
    let orderedPlayers = [];
    if (lineupIndices && lineupIndices.length === 6) {
      orderedPlayers = lineupIndices.map(idx => squad[idx]).filter(Boolean);
    } else {
      orderedPlayers = [
        squad.find(player => player.role === 'GK'),
        ...squad.filter(player => player.role === 'DEF').slice(0, 2),
        squad.find(player => player.role === 'MID'),
        ...squad.filter(player => player.role === 'FWD').slice(0, 2),
      ].filter(Boolean) as Array<{ name: string; number: number; role: 'GK' | 'DEF' | 'MID' | 'FWD' }>;
    }

    const baseIndex = team === Team.HOME ? 0 : 6;
    for (let i = 0; i < 6; i += 1) {
      const source = orderedPlayers[i] || orderedPlayers[orderedPlayers.length - 1];
      const player = this.players[baseIndex + i];
      if (source && player) {
        player.name = source.name;
        player.number = source.number;
        player.role = source.role;
      }
    }
  }

  substitutePlayer(team: Team, pitchIndex: number, newPlayer: { name: string; number: number; role: 'GK' | 'DEF' | 'MID' | 'FWD' }) {
    const baseIndex = team === Team.HOME ? 0 : 6;
    const playerIndex = baseIndex + pitchIndex;
    const player = this.players[playerIndex];
    if (player && !player.isSentOff && newPlayer) {
      player.name = newPlayer.name;
      player.number = newPlayer.number;
      player.role = newPlayer.role;
      player.stamina = 100;
    }
  }

  private getFormationLayout(team: Team, kickOffTeam: Team) {
    const formation = this.formations[team];
    const isHome = team === Team.HOME;
    const mirrorX = (x: number) => (isHome ? x : W - x);
    const layout = {
      GK: new Vector2D(mirrorX(100), H / 2),
      DEF1: new Vector2D(mirrorX(360), H / 2 - 170),
      DEF2: new Vector2D(mirrorX(360), H / 2 + 170),
      MID: new Vector2D(mirrorX(680), H / 2),
      FWD1: new Vector2D(mirrorX(940), H / 2 - 90),
      FWD2: new Vector2D(mirrorX(940), H / 2 + 90),
    };

    if (formation === '2-1-1') {
      layout.DEF1 = new Vector2D(mirrorX(380), H / 2 - 135);
      layout.DEF2 = new Vector2D(mirrorX(380), H / 2 + 135);
      layout.MID = new Vector2D(mirrorX(730), H / 2);
      layout.FWD1 = new Vector2D(mirrorX(980), H / 2 - 55);
      layout.FWD2 = new Vector2D(mirrorX(980), H / 2 + 55);
    }

    if (formation === '1-1-2') {
      layout.DEF1 = new Vector2D(mirrorX(420), H / 2 - 75);
      layout.DEF2 = new Vector2D(mirrorX(420), H / 2 + 75);
      layout.MID = new Vector2D(mirrorX(780), H / 2);
      layout.FWD1 = new Vector2D(mirrorX(1040), H / 2 - 135);
      layout.FWD2 = new Vector2D(mirrorX(1040), H / 2 + 135);
    }

    const kickOffIndex = isHome ? 4 : 10;
    const supportIndex = isHome ? 5 : 11;
    if (kickOffTeam === team) {
      this.players[kickOffIndex].startPos = new Vector2D(W / 2, H / 2);
      this.players[supportIndex].startPos = new Vector2D(W / 2, H / 2 + 60);
    } else {
      this.players[kickOffIndex].startPos = layout.FWD1.copy();
      this.players[supportIndex].startPos = layout.FWD2.copy();
    }

    return layout;
  }

  resetPositions(kickOffTeam: Team) {
    this.ball.reset();
    this.players.forEach(p => p.reset());
    this.offsideCandidates = [];
    this.lastPassInput[Team.HOME] = false;
    this.lastPassInput[Team.AWAY] = false;

    // START IN KICKOFF STATE
    this.status = GameStatus.KICKOFF;
    this.restartType = 'KICK OFF';
    this.aiKickOffTimer = 0;

    const homeLayout = this.getFormationLayout(Team.HOME, kickOffTeam);
    const awayLayout = this.getFormationLayout(Team.AWAY, kickOffTeam);

    // --- HOME TEAM POSITIONING ---
    this.players[0].startPos = homeLayout.GK.copy();
    this.players[1].startPos = homeLayout.DEF1.copy();
    this.players[2].startPos = homeLayout.DEF2.copy();
    this.players[3].startPos = homeLayout.MID.copy();

    // Apply startPos
    for(let i=0; i<6; i++) {
        if (this.mode === GameMode.STANDARD_TRAINING && i !== this.activePlayerIndices[Team.HOME]) {
            this.players[i].pos = new Vector2D(-1000, -1000);
            this.players[i].startPos = new Vector2D(-1000, -1000);
            this.players[i].vel = new Vector2D(0,0);
            continue;
        }
        if (this.players[i].isSentOff) { this.players[i].pos = new Vector2D(-1000, -1000); this.players[i].startPos = new Vector2D(-1000, -1000); continue; }
        this.players[i].pos = this.players[i].startPos.copy();
        this.players[i].facingAngle = 0; // Face Right
        this.players[i].vel = new Vector2D(0,0);
    }

    // --- AWAY TEAM POSITIONING ---
    this.players[6].startPos = awayLayout.GK.copy();
    this.players[7].startPos = awayLayout.DEF1.copy();
    this.players[8].startPos = awayLayout.DEF2.copy();
    this.players[9].startPos = awayLayout.MID.copy();

    // Apply startPos
    for(let i=6; i<12; i++) {
        if (this.mode === GameMode.STANDARD_TRAINING && this.players[i].role !== 'GK') {
            this.players[i].pos = new Vector2D(-1000, -1000);
            this.players[i].startPos = new Vector2D(-1000, -1000);
            this.players[i].vel = new Vector2D(0,0);
            continue;
        }
        if (this.players[i].isSentOff) { this.players[i].pos = new Vector2D(-1000, -1000); this.players[i].startPos = new Vector2D(-1000, -1000); continue; }
        this.players[i].pos = this.players[i].startPos.copy();
        this.players[i].facingAngle = Math.PI; // Face Left
        this.players[i].vel = new Vector2D(0,0);
    }

    if (kickOffTeam === Team.HOME) {
      this.ball.owner = this.players[4];
      this.lastTouchPlayer = this.players[4];
      this.setActivePlayer(this.players[4]);
    } else {
      this.ball.owner = this.players[10];
      this.lastTouchPlayer = this.players[10];
      this.setActivePlayer(this.players[10]);
    }
  }

  setActivePlayer(p: Player) {
    if (p.isSentOff) return;
    const idx = this.players.indexOf(p);
    if (idx !== -1) {
        const currentIdx = this.activePlayerIndices[p.team];
        if (currentIdx !== -1 && this.players[currentIdx]) {
            this.players[currentIdx].isControlled = false;
        }
        this.activePlayerIndices[p.team] = idx;
        p.isControlled = true;
    }
  }

  switchActivePlayer(team: Team) {
    const activePlayer = this.players[this.activePlayerIndices[team]];
    if (activePlayer?.isSentOff) {
      const replacement = this.players.find(player => player.team === team && !player.isSentOff && player.role !== 'GK')
        || this.players.find(player => player.team === team && !player.isSentOff);
      if (replacement) this.setActivePlayer(replacement);
    }
    if (this.ball.owner === activePlayer) return;

    // Find closest player to ball
    const closestIdx = this.getClosestPlayerToBall(team);
    if (closestIdx !== -1 && closestIdx !== this.activePlayerIndices[team]) {
        this.setActivePlayer(this.players[closestIdx]);
    }
  }

  // Helper to find closest player to ball for a specific team
  getClosestPlayerToBall(team: Team): number {
      let minDist = Infinity;
      let closestIdx = -1;
      this.players.forEach((p, idx) => {
          if (p.team === team && !p.isSentOff) {
              const d = p.pos.dist(this.ball.pos);
              if (d < minDist) {
                  minDist = d;
                  closestIdx = idx;
              }
          }
      });
      return closestIdx;
  }

  private setRefereeFocus(target: Vector2D, durationMs: number) {
    this.refereeFocusTarget = target.copy();
    this.refereeFocusUntil = Date.now() + durationMs;
  }

  private issueCard(team: Team, culprit: Player | null, cardType: 'yellow' | 'red', severeFault = false) {
    if (!culprit || culprit.isSentOff) return;

    const cardState = this.cards[team];
    const focusTarget = culprit.pos.copy();
    if (cardType === 'yellow') {
      cardState.yellow += 1;
      this.matchEvent = severeFault ? 'SERIOUS FOUL - RED CARD' : 'FOUL - YELLOW CARD';
      this.matchEventUntil = Date.now() + 2400;
      this.setRefereeFocus(focusTarget, 2200);

      if (cardState.yellow >= 2) {
        cardState.yellow = 0;
        cardState.red += 1;
        culprit.isSentOff = true;
        culprit.pos = new Vector2D(-1000, -1000);
        culprit.vel = new Vector2D(0, 0);
        this.matchEvent = 'SECOND YELLOW - RED CARD';
        this.matchEventUntil = Date.now() + 2600;
        this.setRefereeFocus(focusTarget, 2400);

        const replacement = this.players.find(player => player.team === team && player !== culprit && !player.isSentOff && player.role !== 'GK')
          || this.players.find(player => player.team === team && player !== culprit && !player.isSentOff);
        if (replacement) this.setActivePlayer(replacement);
      }
      return;
    }

    cardState.red += 1;
    culprit.isSentOff = true;
    this.setRefereeFocus(focusTarget, 2600);
    culprit.pos = new Vector2D(-1000, -1000);
    culprit.vel = new Vector2D(0, 0);
    this.matchEvent = 'SERIOUS FOUL - RED CARD';
    this.matchEventUntil = Date.now() + 2800;

    const replacement = this.players.find(player => player.team === team && player !== culprit && !player.isSentOff && player.role !== 'GK')
      || this.players.find(player => player.team === team && player !== culprit && !player.isSentOff);
    if (replacement) this.setActivePlayer(replacement);
  }

  update(input: InputState, dt: number) {
    if (this.matchEvent && Date.now() > this.matchEventUntil) {
      if (this.matchEvent.includes('OFFSIDE')) this.offsideFlagRaised = false;
      this.matchEvent = '';
    }
    if (this.refereeFocusTarget && Date.now() > this.refereeFocusUntil) {
      this.refereeFocusTarget = null;
    }
    const isHomePassPressed = input.home.pass && !this.lastPassInput[Team.HOME];
    const isAwayPassPressed = input.away.pass && !this.lastPassInput[Team.AWAY];
    this.lastPassInput[Team.HOME] = input.home.pass;
    this.lastPassInput[Team.AWAY] = input.away.pass;

    if (this.status === GameStatus.GAME_OVER || this.status === GameStatus.MENU || this.status === GameStatus.PAUSED) {
        return;
    }

    if (this.status === GameStatus.PENALTY) {
        this.updatePenaltyShootout(input, dt, isHomePassPressed, isAwayPassPressed);
        return;
    }

    if (this.status === GameStatus.GOAL) {
        if (Date.now() - this.lastGoalTime > 3000) {
            this.resetPositions(this.nextKickOffTeam);
        }
        return; 
    }

    // --- KICK OFF STATE ---
    if (this.status === GameStatus.KICKOFF) {
        if (this.ball.owner) {
             const offsetDist = PLAYER_RADIUS + BALL_RADIUS + 2;
             const angle = this.ball.owner.team === Team.HOME ? 0 : Math.PI;
             this.ball.pos.x = this.ball.owner.pos.x + Math.cos(angle) * offsetDist;
             this.ball.pos.y = this.ball.owner.pos.y + Math.sin(angle) * offsetDist;
             this.ball.vel = new Vector2D(0, 0);
        }

        if (this.ball.owner?.team === Team.HOME) {
            if (isHomePassPressed || input.home.shoot) {
                this.performRestart(this.ball.owner, input.home, isHomePassPressed);
            }
        } else if (this.ball.owner?.team === Team.AWAY) {
            this.aiKickOffTimer += dt;
            if (
              (this.isHumanControlled(Team.AWAY) && (isAwayPassPressed || input.away.shoot)) ||
              (!this.isHumanControlled(Team.AWAY) && this.aiKickOffTimer > 40)
            ) {
                 this.performRestart(this.ball.owner, input.away, isAwayPassPressed);
            }
        }
        return;
    }

    // --- PLAYING STATE ---
    if (this.status === GameStatus.PLAYING) {
        // Speed up time so 90 in-game minutes = 90 real-time seconds.
        // dt is approx 1.0 per frame (1/60s).
        // Adding dt each frame means +60 per real second.
        // 90 real seconds * 60 = 5400.
        // 90 in-game minutes = 90 * 60 seconds = 5400.
        this.time += dt;
        
        if (this.currentPeriod === 1 && this.time >= 45 * 60) {
             this.status = GameStatus.HALFTIME;
             return;
        } else if (this.currentPeriod === 2 && this.time >= 95 * 60) {
             if (this.score.home === this.score.away) {
               if (this.penaltiesOnDraw) this.startPenaltyShootout();
               else this.status = GameStatus.HALFTIME;
             } else {
               this.status = GameStatus.GAME_OVER;
             }
             return;
        } else if (this.currentPeriod === 3 && this.time >= 140 * 60) {
             this.status = GameStatus.HALFTIME;
             return;
        } else if (this.currentPeriod === 4 && this.time >= 185 * 60) {
             if (this.score.home === this.score.away) {
               this.startPenaltyShootout();
             } else {
               this.status = GameStatus.GAME_OVER;
             }
             return;
        }

        // 1. Identify "Chasers" (Closest player to ball for each team)
        const homeChaserIdx = this.getClosestPlayerToBall(Team.HOME);
        const awayChaserIdx = this.getClosestPlayerToBall(Team.AWAY);

        // 2. Handle both user-controlled players
        this.updateControlledPlayer(
          Team.HOME,
          input.home,
          isHomePassPressed,
          dt
        );
        if (this.isHumanControlled(Team.AWAY)) {
          this.updateControlledPlayer(
            Team.AWAY,
            input.away,
            isAwayPassPressed,
            dt
          );
        }

        // 3. Update All Other Players (AI)
        this.players.forEach((p, idx) => {
          if (p.isSentOff) return;
          if (idx === this.activePlayerIndices[Team.HOME]) {
            return;
          }
          if (this.isHumanControlled(Team.AWAY) && idx === this.activePlayerIndices[Team.AWAY]) {
            return;
          }
          
          const isChaser = (p.team === Team.HOME && idx === homeChaserIdx) || 
                           (p.team === Team.AWAY && idx === awayChaserIdx);

          if (p.team === Team.HOME) {
            this.updateHomeAI(p, isChaser, dt);
          } else {
            this.updateAwayAI(p, isChaser, dt);
          }
        });

        this.players.forEach(player => {
          if (!player.isSentOff && player.role === 'GK') {
            this.constrainGoalkeeperToPenaltyArea(player);
          }
        });

        // 4. Physics & Collisions
        this.updateBallPhysics(dt);
        this.handleCollisions();
        this.checkGoal();
        if (this.status === GameStatus.PLAYING) this.checkOutOfBounds();
        if (this.refereeFocusTarget) {
          this.refereePos = this.refereePos.add(this.refereeFocusTarget.sub(this.refereePos).limit(5 * dt));
        } else {
          const refTarget = this.ball.pos.add(new Vector2D(-50, -35));
          this.refereePos = this.refereePos.add(refTarget.sub(this.refereePos).limit(4 * dt));
        }
        this.assistantsPos = [
          new Vector2D(Math.max(30, Math.min(W - 30, this.ball.pos.x)), 28),
          new Vector2D(Math.max(30, Math.min(W - 30, this.ball.pos.x)), H - 28),
        ];
    }
  }

  predictBallPosition(framesAhead: number) {
    if (this.ball.owner) {
      return this.ball.owner.pos.copy();
    }
    return this.ball.pos.add(this.ball.vel.mult(framesAhead));
  }

  getOpponentsNear(p: Player, radius: number) {
    return this.players.filter(other => other.team !== p.team && other.pos.dist(p.pos) < radius);
  }

  isPassLaneBlocked(from: Player, to: Player) {
    const segment = to.pos.sub(from.pos);
    const lengthSq = Math.max(1, segment.x * segment.x + segment.y * segment.y);

    return this.players.some(opp => {
      if (opp.team === from.team) return false;
      const toOpp = opp.pos.sub(from.pos);
      const projection = Math.max(0, Math.min(1, (toOpp.x * segment.x + toOpp.y * segment.y) / lengthSq));
      const closestPoint = from.pos.add(segment.mult(projection));
      return opp.pos.dist(closestPoint) < 55;
    });
  }

  getSupportPosition(p: Player, ballOwner: Player) {
    const attackingRight = p.team === Team.HOME;
    const isUpperLane = p.startPos.y < H / 2;
    const laneY = isUpperLane ? -1 : 1;

    let forwardOffset = attackingRight ? 220 : -220;
    let lateralOffset = laneY * 190;

    if (p.role === 'DEF') {
      forwardOffset = attackingRight ? -80 : 80;
      lateralOffset = laneY * 240;
    } else if (p.role === 'MID') {
      forwardOffset = attackingRight ? 130 : -130;
      lateralOffset = laneY * 120;
    } else if (p.role === 'FWD') {
      forwardOffset = attackingRight ? 300 : -300;
      lateralOffset = laneY * 150;
    }

    let targetX = ballOwner.pos.x + forwardOffset;
    let targetY = ballOwner.pos.y + lateralOffset;

    if (Math.abs(targetX - ballOwner.pos.x) < 90) {
      targetX += attackingRight ? 110 : -110;
    }

    if (Math.abs(targetY - ballOwner.pos.y) < 70) {
      targetY += laneY * 90;
    }

    if (p.role !== 'DEF') {
      targetX = attackingRight
        ? Math.max(targetX, ballOwner.pos.x + 90)
        : Math.min(targetX, ballOwner.pos.x - 90);
    }

    return new Vector2D(
      Math.max(120, Math.min(W - 120, targetX)),
      Math.max(90, Math.min(H - 90, targetY))
    );
  }

  updateControlledPlayer(team: Team, input: PlayerInputState, isPassPressed: boolean, dt: number) {
    const activePlayer = this.players[this.activePlayerIndices[team]];
    if (!activePlayer) return;

    let inputDir = new Vector2D(0, 0);
    if (input.up) inputDir.y = -1;
    if (input.down) inputDir.y = 1;
    if (input.left) inputDir.x = -1;
    if (input.right) inputDir.x = 1;

    activePlayer.update(inputDir, input.sprint, dt);
    this.constrainGoalkeeperToPenaltyArea(activePlayer);

    if (input.tackle && activePlayer.tackleCooldown <= 0) {
      activePlayer.tackleCooldown = 42;
      activePlayer.slideTimer = 18;
      const slideDirection = inputDir.mag() > 0
        ? inputDir.normalize()
        : new Vector2D(Math.cos(activePlayer.facingAngle), Math.sin(activePlayer.facingAngle));
      activePlayer.vel = activePlayer.vel.add(slideDirection.mult(5));
      const victim = this.ball.owner;
      const opponents = this.players.filter(player => player.team !== team && player.role !== 'GK' && player.pos.dist(activePlayer.pos) < PLAYER_RADIUS * 2 + 24);
      if (victim && victim.team !== team && victim.pos.dist(activePlayer.pos) < PLAYER_RADIUS * 2 + 24) {
        const foulSpeed = activePlayer.vel.mag();
        const isSevereFoul = foulSpeed > 7.5 || activePlayer.slideTimer > 10 || (victim.pos.dist(activePlayer.pos) < 18 && foulSpeed > 4.5);
        if (isSevereFoul) {
          this.issueCard(team, activePlayer, 'red', true);
        } else {
          this.issueCard(team, activePlayer, 'yellow', false);
        }
        this.setupRestart('FREE KICK', victim.team, this.ball.pos.copy());
        return;
      }
      if (opponents.length > 0 && !victim) {
        this.ball.owner = activePlayer;
        this.lastTouchPlayer = activePlayer;
        this.setActivePlayer(activePlayer);
      }
    }

    if (this.ball.owner === activePlayer) {
      if (input.shoot && activePlayer.kickCooldown <= 0) {
        this.shootBall(activePlayer, input.sprint);
      } else if (isPassPressed && activePlayer.kickCooldown <= 0) {
        this.passBall(activePlayer, inputDir);
      }
    } else if (isPassPressed) {
      this.switchActivePlayer(team);
    }
  }

  performRestart(kicker: Player, input: PlayerInputState, isPassPressed: boolean) {
      if (this.indirectOffsideRestart) {
          if (isPassPressed || input.shoot || !this.isHumanControlled(kicker.team)) this.performKickOffPass(kicker);
          return;
      }
      if (this.restartType === 'THROW IN' || isPassPressed) {
          this.performKickOffPass(kicker);
          return;
      }

      if (input.shoot) {
          this.shootBall(kicker, input.sprint);
          this.status = GameStatus.PLAYING;
          this.restartType = 'KICK OFF';
          return;
      }

      this.performKickOffPass(kicker);
  }

  performKickOffPass(kicker: Player) {
      let receiver: Player | null = null;
      let bestScore = -Infinity;
      
      this.players.forEach(p => {
          if (p.team === kicker.team && p !== kicker) {
              const dist = p.pos.dist(kicker.pos);
              if (dist > 300) return; // Too far
              let score = -dist;
              // Prefer backward/parallel passes
              const isBehind = kicker.team === Team.HOME ? (p.pos.x < kicker.pos.x) : (p.pos.x > kicker.pos.x);
              if (isBehind) score += 500;
              if (score > bestScore) {
                  bestScore = score;
                  receiver = p;
              }
          }
      });

      if (receiver) {
          this.ball.owner = null;
          kicker.kickCooldown = 20;
          const kickDir = (receiver as Player).pos.sub(kicker.pos).normalize();
          this.ball.vel = kickDir.mult(PLAYER_PASS_FORCE * 0.9);
          this.status = GameStatus.PLAYING;
          this.restartType = 'KICK OFF';
      }
  }

  shootBall(p: Player, isPowerShot = false) {
    this.ball.pos = p.pos.add(new Vector2D(Math.cos(p.facingAngle), Math.sin(p.facingAngle)).mult(PLAYER_RADIUS + BALL_RADIUS + 2));
    this.offsideCandidates = [];
    const isHome = p.team === Team.HOME;
    const targetBias = p.pos.y < H / 2 ? GOAL_WIDTH * 0.22 : -GOAL_WIDTH * 0.22;
    const targetY = Math.max(H / 2 - GOAL_WIDTH / 2 + 20, Math.min(H / 2 + GOAL_WIDTH / 2 - 20, H / 2 + targetBias + (Math.random() - 0.5) * GOAL_WIDTH * 0.28));
    const goalPos = new Vector2D(isHome ? W : 0, targetY);
    const shotDir = goalPos.sub(this.ball.pos).normalize();
    const noiseSize = isPowerShot ? 0.05 : 0.09;
    const noise = new Vector2D((Math.random() - 0.5) * noiseSize, (Math.random() - 0.5) * noiseSize);
    
    this.ball.owner = null;
    this.lastTouchPlayer = p;
    this.ball.vel = shotDir.add(noise).normalize().mult(PLAYER_KICK_FORCE * (isPowerShot ? 1.6 : 1.12));
    p.kickCooldown = isPowerShot ? 18 : 13;
  }

  passBall(p: Player, inputDir: Vector2D) {
    // USER PASS LOGIC (Directional)
    const teammates = this.players.filter(t => t.team === p.team && t !== p);
    let target: Player | null = null;
    let bestScore = -Infinity;

    const defaultDir = p.team === Team.HOME ? new Vector2D(1, 0) : new Vector2D(-1, 0);
    const searchDir = inputDir.mag() > 0 ? inputDir.normalize() : defaultDir;

    teammates.forEach(tm => {
        const toMate = tm.pos.sub(p.pos);
        const dist = toMate.mag();
        const dirToMate = toMate.normalize();
        const alignment = searchDir.x * dirToMate.x + searchDir.y * dirToMate.y;
        
        if (alignment > 0.3) { 
            const score = (alignment * 2000) - dist; 
            if (score > bestScore) {
                bestScore = score;
                target = tm;
            }
        }
    });

    this.executePass(p, target, searchDir);
  }

  // Unified helper for mechanics
  executePass(p: Player, target: Player | null, fallbackDir: Vector2D) {
      this.ball.pos = p.pos.add(new Vector2D(Math.cos(p.facingAngle), Math.sin(p.facingAngle)).mult(PLAYER_RADIUS + BALL_RADIUS + 2));
      this.offsideCandidates = this.getOffsideCandidates(p);
      this.offsideFlagRaised = false;
      this.ball.owner = null;
      p.kickCooldown = 20;
      this.lastTouchPlayer = p;

      if (target) {
          const kickDir = (target as Player).pos.sub(this.ball.pos).normalize();
          this.ball.vel = kickDir.mult(PLAYER_PASS_FORCE);
      } else {
          this.ball.vel = fallbackDir.normalize().mult(PLAYER_PASS_FORCE);
      }
  }

  private getOffsideCandidates(passer: Player): Player[] {
    const attackingRight = passer.team === Team.HOME;
    const opponents = this.players.filter(player => player.team !== passer.team && !player.isSentOff).sort((a, b) =>
      attackingRight ? b.pos.x - a.pos.x : a.pos.x - b.pos.x,
    );
    if (opponents.length < 2) return [];
    const secondLastDefender = opponents[1].pos.x;
    const line = attackingRight ? Math.max(this.ball.pos.x, secondLastDefender) : Math.min(this.ball.pos.x, secondLastDefender);
    return this.players.filter(player => {
      if (player.team !== passer.team || player === passer || player.role === 'GK' || player.isSentOff) return false;
      const inOpponentHalf = attackingRight ? player.pos.x > W / 2 : player.pos.x < W / 2;
      const beyondLine = attackingRight ? player.pos.x > line : player.pos.x < line;
      return inOpponentHalf && beyondLine;
    });
  }

  private whistleOffside(player: Player) {
    this.offsideFlagRaised = true;
    this.matchEvent = 'OFFSIDE';
    this.matchEventUntil = Date.now() + 2400;
    this.lastTouchPlayer = player;
    const defendingTeam = player.team === Team.HOME ? Team.AWAY : Team.HOME;
    this.offsideCandidates = [];
    this.setupRestart('FREE KICK', defendingTeam, this.ball.pos.copy());
    this.indirectOffsideRestart = true;
    this.indirectKicker = this.ball.owner;
  }

  updateBallPhysics(dt: number) {
      if (this.ball.owner) {
          const offsetDist = PLAYER_RADIUS + BALL_RADIUS + 2;
          const offsetX = Math.cos(this.ball.owner.facingAngle) * offsetDist;
          const offsetY = Math.sin(this.ball.owner.facingAngle) * offsetDist;
          this.ball.pos.x = this.ball.owner.pos.x + offsetX;
          this.ball.pos.y = this.ball.owner.pos.y + offsetY;
          this.ball.vel = new Vector2D(0, 0);
      } else {
          this.ball.update(dt);
      }
  }

  // --- AI LOGIC ---

  getStrategicPosition(p: Player): Vector2D {
      let targetX = p.startPos.x;
      let targetY = p.startPos.y;
      const ballInfluence = p.role === 'DEF' ? 0.18 : p.role === 'MID' ? 0.28 : 0.22;
      const verticalInfluence = p.role === 'MID' ? 0.2 : 0.12;

      if (p.team === Team.HOME) {
          const shift = (this.ball.pos.x - p.startPos.x) * ballInfluence;
          targetX += shift;
          if (targetX < p.startPos.x - 120) targetX = p.startPos.x - 120;
          if (targetX > p.startPos.x + 220) targetX = p.startPos.x + 220;
      } else {
          const shift = (this.ball.pos.x - p.startPos.x) * ballInfluence;
          targetX += shift;
          if (targetX > p.startPos.x + 120) targetX = p.startPos.x + 120;
          if (targetX < p.startPos.x - 220) targetX = p.startPos.x - 220;
      }

      targetY += (this.ball.pos.y - p.startPos.y) * verticalInfluence;
      if (targetY < p.startPos.y - 120) targetY = p.startPos.y - 120;
      if (targetY > p.startPos.y + 120) targetY = p.startPos.y + 120;

      return new Vector2D(targetX, targetY);
  }

  updateHomeAI(p: Player, isChaser: boolean, dt: number) {
     let target = this.getStrategicPosition(p);
     const ballOwner = this.ball.owner;
     const ai = this.getAiSettings();
     
     // GK Logic - Enhanced AI Goalkeeper
      if (p.role === 'GK') {
          if (this.ball.owner === p) {
              const safeMate = this.findBestPassCandidate(p);
              this.executePass(p, safeMate, new Vector2D(1, 0)); 
              return;
          }
          
          // Goalkeeper stays near his line.
          let targetY = this.ball.pos.y;
          let targetX = p.startPos.x;
          
          const ballToGoal = this.ball.pos.x;
          if (ballToGoal < W * 0.4 && this.ball.vel.x < -2) {
              targetY = this.ball.pos.y + this.ball.vel.y * 1.35;
          }
         
         // Clamp Y position to goal area with better coverage
         const minY = H/2 - GOAL_WIDTH/2 - 30;
         const maxY = H/2 + GOAL_WIDTH/2 + 30;
         if (targetY < minY) targetY = minY;
         if (targetY > maxY) targetY = maxY;
         
         // Clamp X position
          if (targetX > p.startPos.x + 10) targetX = p.startPos.x + 10;
          if (targetX < p.startPos.x - 10) targetX = p.startPos.x - 10;
          
          target = new Vector2D(targetX, targetY);
          
          const reactionSpeed = (ballToGoal < W * 0.18 ? 1.18 : 0.92) * Math.min(ai.keeper, 1.05);
          this.moveAI(p, target, false, reactionSpeed, true, dt);
          return;
      }

     if (ballOwner === null) {
         if (isChaser) {
             const intercept = this.predictBallPosition(12);
             target = intercept;
         } else {
             target = this.getStrategicPosition(p);
         }
     }
     else if (ballOwner.team === Team.HOME) {
         target = this.getSupportPosition(p, ballOwner);
     } 
     else {
          if (isChaser) {
             target = this.predictBallPosition(6);
          }
          else {
             const markOffset = p.role === 'DEF' ? 140 : 240;
             target = new Vector2D(
               Math.max(p.startPos.x - 40, ballOwner.pos.x - markOffset),
               p.startPos.y + ((ballOwner.pos.y - p.startPos.y) * 0.3)
             );
          }
      }
     
     const shouldSprint = isChaser || p.pos.dist(target) > 180;
     this.moveAI(p, target, shouldSprint, ai.speed, !isChaser, dt);
  }

  updateAwayAI(p: Player, isChaser: boolean, dt: number) {
    let target = this.getStrategicPosition(p);
    let sprint = false;
    const ai = this.getAiSettings();

    // --- GK LOGIC (Enhanced AI Goalkeeper) ---
    if (p.role === 'GK') {
        if (this.ball.owner === p) {
            const safeMate = this.findBestPassCandidate(p);
            this.executePass(p, safeMate, new Vector2D(-1, 0)); 
            return;
        }
        
        // Goalkeeper stays near his line.
        let targetY = this.ball.pos.y;
        let targetX = p.startPos.x;
        
        const ballToGoal = W - this.ball.pos.x;
        if (ballToGoal < W * 0.4 && this.ball.vel.x > 2) {
            targetY = this.ball.pos.y + this.ball.vel.y * 1.35;
        }
        
        // Clamp Y position to goal area with better coverage
        const minY = H/2 - GOAL_WIDTH/2 - 30;
        const maxY = H/2 + GOAL_WIDTH/2 + 30;
        if (targetY < minY) targetY = minY;
        if (targetY > maxY) targetY = maxY;
        
        // Clamp X position
        if (targetX < p.startPos.x - 10) targetX = p.startPos.x - 10;
        if (targetX > p.startPos.x + 10) targetX = p.startPos.x + 10;
        
        target = new Vector2D(targetX, targetY);
        
        const reactionSpeed = (ballToGoal < W * 0.18 ? 1.18 : 0.92) * Math.min(ai.keeper, 1.05);
        this.moveAI(p, target, false, reactionSpeed, true, dt);
        return;
    }

    // --- FIELD PLAYER LOGIC ---

    // 1. AI HAS BALL
    if (this.ball.owner === p) {
        p.decisionTimer -= dt;
        
        // --- 1. SHOOT FIRST (Aggressive Goal Seeking) ---
        // Away attacks Left (0), Home attacks Right (W)
        const opponentsNear = this.getOpponentsNear(p, 150).length;
        if (p.pos.x < ai.shootRange && Math.abs(p.pos.y - H/2) < 240 && p.kickCooldown <= 0 && (opponentsNear < 3 || p.pos.x < 220)) {
            this.shootBall(p, false);
            return;
        }

        // --- 2. MANDATORY DRIBBLE (Don't pass immediately) ---
        const possessionTime = Date.now() - p.possessionStartTime;
        const forcedDribbleTime = 2500; // 2.5 seconds minimum dribble
        
        // Determine threat level (closest enemy)
        let closestEnemyDist = Infinity;
        let isBlockedFront = false;
        this.players.forEach(opp => {
            if (opp.team === Team.HOME) {
                const dist = p.pos.dist(opp.pos);
                if (dist < closestEnemyDist) closestEnemyDist = dist;
                // Check if blocking path to goal (Left)
                if (dist < 170 && opp.pos.x < p.pos.x && Math.abs(opp.pos.y - p.pos.y) < 120) isBlockedFront = true;
            }
        });

        // Default: Dribble towards goal (Left)
        target = new Vector2D(0, H/2);
        
        // If holding ball less than X seconds AND not in immediate danger, Force Dribble
        if (possessionTime < forcedDribbleTime && closestEnemyDist > 80) {
            // Evasive Dribble: If someone is ahead, shift Y
            if (isBlockedFront) {
                target.y = p.pos.y < H/2 ? p.pos.y - 120 : p.pos.y + 120;
            }
            this.moveAI(p, target, true, 0.95, true, dt); // Sprint/Dribble
            return;
        }

        // --- 3. DECISION LOGIC (Pass vs Continue Dribble) ---
        if (p.decisionTimer <= 0) {
            // Only consider passing if BLOCKED or cornered
            if (isBlockedFront || closestEnemyDist < 70) {
                // Try to find a Forward Pass
                const bestTeammate = this.findBestPassCandidate(p);
                
                const passChance = isBlockedFront ? ai.passRisk : ai.passRisk * 0.5; 
                
                if (bestTeammate && !this.isPassLaneBlocked(p, bestTeammate) && Math.random() < passChance) {
                    const passDir = bestTeammate.pos.sub(p.pos);
                    this.executePass(p, bestTeammate, passDir);
                    p.decisionTimer = 0.5;
                    return;
                }
            }
            
            // If we didn't pass, reset timer for next thought
            p.decisionTimer = 0.3 + Math.random() * 0.4;
        }
        
        // Continue Dribbling (Forward)
        this.moveAI(p, target, true, 0.95, true, dt);
        return;
    } 
    // 2. LOOSE BALL
    else if (!this.ball.owner) {
        if (isChaser) {
            target = this.predictBallPosition(10);
            sprint = true;
        } else {
            target = this.getStrategicPosition(p);
        }
    }
    // 3. DEFENDING (Home has ball)
    else if (this.ball.owner.team === Team.HOME) {
        if (isChaser) {
            target = this.predictBallPosition(6);
            sprint = true;
        } else {
             target = new Vector2D(
               Math.min(p.startPos.x + 40, this.ball.owner.pos.x + 180),
               p.startPos.y + ((this.ball.owner.pos.y - p.startPos.y) * 0.3)
             );
        }
    }
    // 4. ATTACKING SUPPORT (Teammate has ball)
    else if (this.ball.owner.team === Team.AWAY) {
         target = this.getSupportPosition(p, this.ball.owner);
    }

    const speedFactor = (this.ball.owner?.team === Team.AWAY ? 1.0 : 0.97) * ai.speed;
    this.moveAI(p, target, sprint || p.pos.dist(target) > 200, speedFactor, !isChaser, dt);
  }

  // Find best teammate to pass to (Strictly SAME TEAM)
  findBestPassCandidate(p: Player): Player | null {
      let bestTeammate = null;
      let bestScore = -Infinity;
      const isAttackingHalf = p.team === Team.AWAY ? p.pos.x < W/2 : p.pos.x > W/2;

      this.players.forEach(tm => {
          if (tm.team === p.team && tm !== p) {
              const dist = p.pos.dist(tm.pos);
              
              // 1. NO DUMB PASSES (Too close)
              if (dist < 150) return; 

              // 2. MAX RANGE
              if (dist > 700) return;

              // 3. NO BACK PASSES IN ATTACK
              if (isAttackingHalf) {
                  // Away attacks Left (smaller X). If tm.x > p.x, it's a back pass.
                  if (p.team === Team.AWAY && tm.pos.x > p.pos.x + 50) return;
                  // Home attacks Right (larger X). If tm.x < p.x, it's a back pass.
                  if (p.team === Team.HOME && tm.pos.x < p.pos.x - 50) return;
              }

              let score = -dist; // Prefer closer

              // Prefer Forward positioning
              if (p.team === Team.AWAY) {
                   if (tm.pos.x < p.pos.x) score += 600; 
              } else {
                   if (tm.pos.x > p.pos.x) score += 600;
              }

              if (tm.role === 'FWD') score += 150;
              if (Math.abs(tm.pos.y - p.pos.y) < 180) score += 120;
              
              const lineBlocked = this.isPassLaneBlocked(p, tm);

              if (!lineBlocked) {
                  if (score > bestScore) {
                      bestScore = score;
                      bestTeammate = tm;
                  }
              }
          }
      });
      return bestTeammate;
  }

  moveAI(p: Player, target: Vector2D, sprint: boolean, speedFactor: number = 1.0, ignoreSeparation: boolean = false, dt: number) {
      const dist = p.pos.dist(target);
      
      let separation = new Vector2D(0, 0);
      
      // Only apply separation if NOT chasing the ball aggressively
      if (!ignoreSeparation) {
        let count = 0;
        this.players.forEach(other => {
            if (other !== p) {
                const d = p.pos.dist(other.pos);
                if (d < 80 && d > 0) {
                    const push = p.pos.sub(other.pos).normalize().mult(100 / d);
                    separation = separation.add(push);
                    count++;
                }
            }
        });
        if (count > 0) separation = separation.div(count);
      }

      // If very close to target (and not separating), stop jitter
      if (dist < 10 && separation.mag() < 1) {
          p.update(null, false, dt);
      } else {
          let dir = target.sub(p.pos).normalize();
          
          if (!ignoreSeparation) {
             dir = dir.add(separation.mult(1.5)).normalize();
          }

          const actualSprint = sprint; 
          p.update(dir, actualSprint, dt);
          
          if (speedFactor < 1.0) p.vel = p.vel.mult(speedFactor);
      }

      this.constrainGoalkeeperToPenaltyArea(p);
  }

  handleCollisions() {
    // Ball Collisions
    this.players.forEach(p => {
        if (p.isSentOff) return;
        if (p.role === 'GK' && this.ball.owner === null) {
            const keeperRange = PLAYER_RADIUS + BALL_RADIUS + 28;
            const closeToGoal = p.team === Team.HOME ? this.ball.pos.x < PENALTY_AREA_WIDTH * 0.65 : this.ball.pos.x > W - PENALTY_AREA_WIDTH * 0.65;
            const shotComingIn = p.team === Team.HOME ? this.ball.vel.x < -0.8 : this.ball.vel.x > 0.8;
            if (closeToGoal && shotComingIn && p.pos.dist(this.ball.pos) < keeperRange + 30) {
                this.ball.owner = p;
                this.lastTouchPlayer = p;
                p.kickCooldown = 14;
                p.possessionStartTime = Date.now();
                p.diveTimer = 12;
                this.setActivePlayer(p);
                return;
            }
        }

        const dist = p.pos.dist(this.ball.pos);
        if (dist < PLAYER_RADIUS + BALL_RADIUS + 5) {
            if (this.indirectOffsideRestart && p !== this.indirectKicker) {
              this.indirectOffsideRestart = false;
              this.indirectKicker = null;
            }
            // Collect Loose Ball
            if (this.ball.owner === null) {
                if (p.kickCooldown <= 0) {
                    if (this.offsideCandidates.length && this.offsideCandidates[0].team !== p.team) this.offsideCandidates = [];
                    if (this.offsideCandidates.includes(p)) {
                        this.whistleOffside(p);
                        return;
                    }
                    this.ball.owner = p;
                    this.lastTouchPlayer = p;
                    // NEW: Set possession time
                    p.possessionStartTime = Date.now();
                    
                    this.setActivePlayer(p);
                }
            } 
            // Steal
            else if (this.ball.owner !== p && this.ball.owner.team !== p.team) {
                if (p.kickCooldown <= 0) {
                    if (this.offsideCandidates.length && this.offsideCandidates[0].team !== p.team) this.offsideCandidates = [];
                    if (this.offsideCandidates.includes(p)) {
                        this.whistleOffside(p);
                        return;
                    }
                    const victim = this.ball.owner;
                    // Steal!
                    this.ball.owner = p;
                    this.lastTouchPlayer = p;
                    // NEW: Set possession time 
                    p.possessionStartTime = Date.now();

                    p.kickCooldown = 10;
                    victim.kickCooldown = 60; 
                    // Knockback victim
                    const knockback = victim.pos.sub(p.pos).normalize().mult(10);
                    victim.vel = victim.vel.add(knockback);
                    
                    this.setActivePlayer(p);
                }
            }
        }
    });

    // Player vs Player
    for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
            const p1 = this.players[i];
            const p2 = this.players[j];
            const dist = p1.pos.dist(p2.pos);
            const minDist = PLAYER_RADIUS * 2;
            if (dist < minDist) {
                const overlap = minDist - dist;
                const dir = p1.pos.sub(p2.pos).normalize();
                const move = dir.mult(overlap / 2);
                p1.pos = p1.pos.add(move);
                p2.pos = p2.pos.sub(move);
            }
        }
    }
  }

  checkGoal() {
    const goalTop = H/2 - GOAL_WIDTH/2;
    const goalBottom = H/2 + GOAL_WIDTH/2;
    if (this.ball.pos.y > goalTop && this.ball.pos.y < goalBottom) {
        if (this.indirectOffsideRestart && (this.ball.pos.x < 0 || this.ball.pos.x > W)) {
            const crossedGoalFor = this.ball.pos.x < 0 ? Team.AWAY : Team.HOME;
            const isOwnGoal = this.lastTouchPlayer?.team !== crossedGoalFor;
            const restartTeam = isOwnGoal ? crossedGoalFor : crossedGoalFor === Team.HOME ? Team.AWAY : Team.HOME;
            const spot = isOwnGoal
              ? new Vector2D(this.ball.pos.x < 0 ? 45 : W - 45, this.ball.pos.y < H / 2 ? 45 : H - 45)
              : new Vector2D(this.ball.pos.x < 0 ? 140 : W - 140, H / 2);
            this.setupRestart(isOwnGoal ? 'CORNER' : 'GOAL KICK', restartTeam, spot);
            return;
        }
        if (this.ball.pos.x < 0) {
            this.score.away++;
            this.nextKickOffTeam = Team.HOME;
            this.captureLastScorer(Team.AWAY);
            this.handleGoal();
        } else if (this.ball.pos.x > W) {
            this.score.home++;
            this.nextKickOffTeam = Team.AWAY;
            this.captureLastScorer(Team.HOME);
            this.handleGoal();
        }
    }
  }

  private captureLastScorer(team: Team) {
    const scorer = this.lastTouchPlayer && this.lastTouchPlayer.team === team
      ? this.lastTouchPlayer
      : this.players.find(player => player.team === team && player.role === 'FWD') || null;

    if (!scorer) {
      this.lastScorer = null;
      return;
    }

    this.lastScorer = {
      name: scorer.name,
      number: scorer.number,
      scoredAtMinute: Math.max(1, Math.ceil(this.time / 60)),
      team,
    };
  }

  handleGoal() {
      this.status = GameStatus.GOAL;
      this.lastGoalTime = Date.now();
      this.matchEvent = 'GOAL!';
      this.matchEventUntil = Date.now() + 4000;
      this.ball.owner = null;
      this.ball.vel = new Vector2D(0, 0);
  }

  private resetPenaltyState() {
      this.penaltyState.active = false;
      this.penaltyState.currentTeam = Team.HOME;
      this.penaltyState.shootoutHome = 0;
      this.penaltyState.shootoutAway = 0;
      this.penaltyState.historyHome = [];
      this.penaltyState.historyAway = [];
      this.penaltyState.lastPenalty = undefined;
      this.penaltyState.resolveAt = 0;
      this.penaltyState.aiTimer = 0;
      this.penaltyState.shotInFlight = false;
      this.penaltyState.shootingTeam = Team.HOME;
      this.penaltyState.keeperDiveTarget = null;
      this.penaltyState.shotTarget = null;
      this.penaltyState.centralSave = false;
      this.penaltyState.shooterIndexHome = 0;
      this.penaltyState.shooterIndexAway = 0;
  }

  private startPenaltyShootout() {
      this.resetPenaltyState();
      this.status = GameStatus.PENALTY;
      this.penaltyState.active = true;
      this.penaltyState.currentTeam = Team.HOME;
      this.penaltyState.resolveAt = 0;
      this.penaltyState.aiTimer = 0;
      this.setupPenaltyScene(Team.HOME);
  }

  private updatePenaltyShootout(input: InputState, dt: number, isHomePassPressed: boolean, isAwayPassPressed: boolean) {
      if (!this.penaltyState.active) return;

      if (this.penaltyState.shotInFlight) {
          this.updatePenaltyShot(dt);
          return;
      }

      if (this.penaltyState.resolveAt > 0) {
          this.penaltyState.resolveAt -= dt;
          if (this.penaltyState.resolveAt <= 0) {
              if (this.shouldEndShootout()) {
                  this.status = GameStatus.GAME_OVER;
                  this.penaltyState.active = false;
                  return;
              }
              this.penaltyState.currentTeam = this.penaltyState.currentTeam === Team.HOME ? Team.AWAY : Team.HOME;
              this.setupPenaltyScene(this.penaltyState.currentTeam);
          }
          return;
      }

      const team = this.penaltyState.currentTeam;
      const teamInput = team === Team.HOME ? input.home : input.away;
      const wantsShot = team === Team.HOME ? (teamInput.shoot || isHomePassPressed) : (teamInput.shoot || isAwayPassPressed);

      if (this.isHumanControlled(team)) {
          if (wantsShot) {
              const keeperInput = team === Team.HOME ? input.away : input.home;
              this.launchPenaltyShot(team, teamInput, this.isHumanControlled(team === Team.HOME ? Team.AWAY : Team.HOME) ? keeperInput : undefined);
          }
      } else {
          this.penaltyState.aiTimer += dt;
          if (this.penaltyState.aiTimer > 180) {
              this.launchPenaltyShot(team, {
                up: Math.random() > 0.5,
                down: Math.random() > 0.5,
                left: Math.random() > 0.5,
                right: Math.random() > 0.5,
                shoot: true,
                pass: false,
                sprint: false,
                tackle: false,
              }, this.isHumanControlled(Team.HOME) ? input.home : undefined);
          }
      }
  }

  private launchPenaltyShot(team: Team, input: PlayerInputState, humanKeeperInput?: PlayerInputState) {
      const striker = this.ball.owner;
      if (!striker) return;

      const shootingToRight = team === Team.HOME;
      const targetXNormalized = input.aimX ?? (input.left ? 0.24 : input.right ? 0.76 : 0.5);
      const targetYNormalized = input.aimX !== undefined || input.aimY !== undefined
        ? (input.aimX ?? 0.5) * 0.65 + (input.aimY ?? 0.5) * 0.35
        : input.up ? 0.26 : input.down ? 0.72 : 0.48;
      const goalX = shootingToRight ? W + 5 : -5;
      const goalY = H / 2 - GOAL_WIDTH / 2 + (GOAL_WIDTH * targetYNormalized);
      const shotTarget = new Vector2D(goalX, goalY);
      const shotDir = shotTarget.sub(this.ball.pos).normalize();
      const power = PLAYER_KICK_FORCE * (input.sprint ? 1.34 : 1.12);
      const keeper = this.players.find(player => player.team !== team && player.role === 'GK') || null;
      const centralShot = targetXNormalized > 0.38 && targetXNormalized < 0.62 && targetYNormalized > 0.32 && targetYNormalized < 0.68;

      this.penaltyState.shotInFlight = true;
      this.penaltyState.shootingTeam = team;
      this.penaltyState.shotTarget = shotTarget;
      this.penaltyState.aiTimer = 0;
      this.penaltyState.centralSave = Boolean(keeper && centralShot && !humanKeeperInput && !this.isHumanControlled(team === Team.HOME ? Team.AWAY : Team.HOME) && Math.random() < 0.7);

      if (keeper) {
        const saveBias = this.aiDifficulty === 'EXTREME' ? 0.75 : this.aiDifficulty === 'HARD' ? 0.62 : this.aiDifficulty === 'MEDIUM' ? 0.54 : 0.45;
        const guessX = Math.random() < saveBias ? targetXNormalized : 0.2 + Math.random() * 0.6;
        // A human keeper can click the save position before the AI takes its shot.
        // The AI also reads central penalties more reliably to stop routine shots.
        const humanDiveY = humanKeeperInput && (humanKeeperInput.aimX !== undefined || humanKeeperInput.aimY !== undefined)
          ? (humanKeeperInput.aimX ?? 0.5) * 0.65 + (humanKeeperInput.aimY ?? 0.5) * 0.35
          : undefined;
        const guessY = humanDiveY ?? (this.penaltyState.centralSave ? targetYNormalized : Math.random() < saveBias ? targetYNormalized : 0.2 + Math.random() * 0.6);
        const keeperLineX = shootingToRight ? W - 88 : 88;
        const keeperLineY = H / 2 - GOAL_WIDTH / 2 + (GOAL_WIDTH * guessY);
        this.penaltyState.keeperDiveTarget = new Vector2D(keeperLineX, keeperLineY);
      }

      this.ball.owner = null;
      this.lastTouchPlayer = striker;
      this.ball.vel = shotDir.mult(power);
      striker.kickCooldown = 22;
  }

  private updatePenaltyShot(dt: number) {
      this.ball.update(dt);

      const keeper = this.players.find(player => player.team !== this.penaltyState.shootingTeam && player.role === 'GK') || null;
      if (keeper && this.penaltyState.keeperDiveTarget) {
        const diveDir = this.penaltyState.keeperDiveTarget.sub(keeper.pos);
        keeper.update(diveDir, true, dt);
        keeper.diveTimer = 18;
        this.constrainGoalkeeperToPenaltyArea(keeper);

        if (keeper.pos.dist(this.ball.pos) < PLAYER_RADIUS + BALL_RADIUS + 4) {
          this.completePenalty(false);
          return;
        }
      }

      const goalTop = H / 2 - GOAL_WIDTH / 2;
      const goalBottom = H / 2 + GOAL_WIDTH / 2;
      if (this.ball.pos.y > goalTop && this.ball.pos.y < goalBottom) {
        if (this.penaltyState.shootingTeam === Team.HOME && this.ball.pos.x > W) {
          this.completePenalty(!this.penaltyState.centralSave);
          return;
        }
        if (this.penaltyState.shootingTeam === Team.AWAY && this.ball.pos.x < 0) {
          this.completePenalty(!this.penaltyState.centralSave);
          return;
        }
      }

      if (
        this.ball.pos.y < -40 ||
        this.ball.pos.y > H + 40 ||
        this.ball.pos.x < -80 ||
        this.ball.pos.x > W + 80 ||
        this.ball.vel.mag() < 0.35
      ) {
        this.completePenalty(false);
      }
  }

  private completePenalty(scored: boolean) {
      const team = this.penaltyState.shootingTeam;
      const target = this.penaltyState.shotTarget || new Vector2D(W / 2, H / 2);
      const targetX = Math.max(0.08, Math.min(0.92, target.x / W));
      const targetY = Math.max(0.18, Math.min(0.82, (target.y - (H / 2 - GOAL_WIDTH / 2)) / GOAL_WIDTH));

      if (team === Team.HOME) {
        this.penaltyState.historyHome.push(scored);
        if (scored) this.penaltyState.shootoutHome += 1;
        this.penaltyState.shooterIndexHome += 1;
      } else {
        this.penaltyState.historyAway.push(scored);
        if (scored) this.penaltyState.shootoutAway += 1;
        this.penaltyState.shooterIndexAway += 1;
      }

      this.penaltyState.lastPenalty = { team, x: targetX, y: targetY, scored };
      this.penaltyState.shotInFlight = false;
      this.penaltyState.shotTarget = null;
      this.penaltyState.keeperDiveTarget = null;
      this.penaltyState.centralSave = false;
      this.penaltyState.resolveAt = 60;
      this.penaltyState.aiTimer = 0;
      this.ball.owner = null;
      this.ball.vel = new Vector2D(0, 0);
  }

  private shouldEndShootout() {
      const takenHome = this.penaltyState.historyHome.length;
      const takenAway = this.penaltyState.historyAway.length;
      const remainingHome = Math.max(0, 5 - takenHome);
      const remainingAway = Math.max(0, 5 - takenAway);

      if (this.penaltyState.shootoutHome > this.penaltyState.shootoutAway + remainingAway) return true;
      if (this.penaltyState.shootoutAway > this.penaltyState.shootoutHome + remainingHome) return true;

      if (takenHome >= 5 && takenAway >= 5 && takenHome === takenAway) {
        return this.penaltyState.shootoutHome !== this.penaltyState.shootoutAway;
      }

      return false;
  }

  private setupPenaltyScene(team: Team) {
      this.ball.owner = null;
      this.ball.vel = new Vector2D(0, 0);
      this.aiKickOffTimer = 0;

      const shootingToRight = team === Team.HOME;
      const teamPlayers = this.players.filter(p => p.team === team && p.role !== 'GK' && !p.isSentOff);
      const shooterIndex = team === Team.HOME ? this.penaltyState.shooterIndexHome : this.penaltyState.shooterIndexAway;
      const striker = teamPlayers.length ? teamPlayers[shooterIndex % teamPlayers.length] : this.players.find(p => p.team === team && !p.isSentOff)!;
      const keeper = this.players.find(player => player.team !== team && player.role === 'GK') || this.players.find(player => player.team !== team)!;
      const penaltySpotX = shootingToRight ? W - 240 : 240;
      const keeperX = shootingToRight ? W - 95 : 95;

      striker.pos = new Vector2D(penaltySpotX - (shootingToRight ? 110 : -110), H / 2);
      striker.facingAngle = shootingToRight ? 0 : Math.PI;
      striker.vel = new Vector2D(0, 0);
      striker.kickCooldown = 0;
      this.setActivePlayer(striker);

      keeper.pos = new Vector2D(keeperX, H / 2);
      keeper.vel = new Vector2D(0, 0);

      this.ball.pos = new Vector2D(penaltySpotX, H / 2);
      this.ball.owner = striker;
      this.lastTouchPlayer = striker;
  }

  checkOutOfBounds() {
      const goalTop = H/2 - GOAL_WIDTH/2;
      const goalBottom = H/2 + GOAL_WIDTH/2;
      const inGoalRange = this.ball.pos.y > goalTop && this.ball.pos.y < goalBottom;
      if (this.ball.owner) return;

      // Side-line exits are throw-ins; end-line exits are corners or goal kicks.
      if (this.ball.pos.y < 0) {
          const restartTeam = this.lastTouchPlayer?.team === Team.HOME ? Team.AWAY : Team.HOME;
          this.setupRestart('THROW IN', restartTeam, new Vector2D(Math.max(120, Math.min(W - 120, this.ball.pos.x)), 35));
          return;
      }

      if (this.ball.pos.y > H) {
          const restartTeam = this.lastTouchPlayer?.team === Team.HOME ? Team.AWAY : Team.HOME;
          this.setupRestart('THROW IN', restartTeam, new Vector2D(Math.max(120, Math.min(W - 120, this.ball.pos.x)), H - 35));
          return;
      }

      if (!inGoalRange && this.ball.pos.x < 0) {
          if (this.lastTouchPlayer?.team === Team.HOME) {
              this.setupRestart('CORNER', Team.AWAY, new Vector2D(45, this.ball.pos.y < H / 2 ? 45 : H - 45));
          } else {
              this.setupRestart('GOAL KICK', Team.HOME, new Vector2D(140, H / 2));
          }
          return;
      }

      if (!inGoalRange && this.ball.pos.x > W) {
          if (this.lastTouchPlayer?.team === Team.AWAY) {
              this.setupRestart('CORNER', Team.HOME, new Vector2D(W - 45, this.ball.pos.y < H / 2 ? 45 : H - 45));
          } else {
              this.setupRestart('GOAL KICK', Team.AWAY, new Vector2D(W - 140, H / 2));
          }
      }
  }

  private setupRestart(type: RestartType, team: Team, spot: Vector2D) {
      this.indirectOffsideRestart = false;
      this.indirectKicker = null;
      this.status = GameStatus.KICKOFF;
      this.restartType = type;
      this.aiKickOffTimer = 0;
      this.ball.owner = null;
      this.ball.vel = new Vector2D(0, 0);

      const taker = this.getRestartTaker(team, type, spot);
      taker.pos = spot.copy();
      taker.vel = new Vector2D(0, 0);
      taker.kickCooldown = 0;
      taker.possessionStartTime = Date.now();
      this.ball.owner = taker;
      this.offsideCandidates = [];
      this.lastTouchPlayer = taker;
      this.setActivePlayer(taker);

      const support = this.players.find(player => player.team === team && player !== taker && !player.isSentOff && player.role !== 'GK')
        || this.players.find(player => player.team === team && player !== taker && !player.isSentOff);
      if (support) {
        const offsetX = team === Team.HOME ? -90 : 90;
        support.pos = new Vector2D(
          Math.max(60, Math.min(W - 60, spot.x + offsetX)),
          Math.max(60, Math.min(H - 60, spot.y + 60))
        );
        support.vel = new Vector2D(0, 0);
      }

      this.players.forEach(player => {
        if (!player.isSentOff && player.team !== team && player.pos.dist(spot) < 140) {
          const pushX = team === Team.HOME ? 150 : -150;
          player.pos = new Vector2D(
            Math.max(40, Math.min(W - 40, spot.x + pushX)),
            Math.max(40, Math.min(H - 40, player.pos.y))
          );
          player.vel = new Vector2D(0, 0);
        }
      });
  }

  private getRestartTaker(team: Team, type: RestartType, spot: Vector2D) {
      if (type === 'GOAL KICK') {
        return this.players.find(player => player.team === team && player.role === 'GK' && !player.isSentOff)
          || this.players.find(player => player.team === team && !player.isSentOff)!;
      }

      return this.players
        .filter(player => player.team === team && player.role !== 'GK' && !player.isSentOff)
        .sort((a, b) => a.pos.dist(spot) - b.pos.dist(spot))[0] || this.players[this.activePlayerIndices[team]];
  }
}
