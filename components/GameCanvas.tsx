import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';
import { useGameLoop } from '../hooks/useGameLoop';
import {
  AIDifficulty,
  FormationKey,
  GameMode,
  GameSnapshot,
  GameStatus,
  InputState,
  LeagueKey,
  MatchSetup,
  PlayerInputState,
  ScoreState,
  StadiumKey,
  Team,
  GoalScorerInfo,
} from '../types';
import { HUD } from './HUD';
import { ChampionsLeagueTables, GameOverMenu, GoalOverlay, HalftimeMenu, MainMenu, PauseMenu, PenaltyMenu, TeamSelectMenu, TrophyOverlay } from './Menus';
import { CLUBS, createDefaultMatchSetup, getClubById, getClubsByLeague } from '../game/clubs';

type LanRole = 'offline' | 'host' | 'guest';
type CompetitionType = 'KICK_OFF' | 'CHAMPIONS_LEAGUE';
type LanTransport = 'none' | 'ws' | 'local';

interface ChampionsLeagueStage {
  id: string;
  menuTitle: string;
  advanceLabel?: string;
}

interface ChampionsLeagueRun {
  playerClubId: string;
  seasonLabel: string;
  stageIndex: number;
  usedOpponentIds: string[];
  playerGroupLabel: string;
  currentOpponentId?: string;
  currentOpponentName?: string;
  currentTie?: {
    stageId: string;
    leg: 1 | 2;
    firstLegHome: number;
    firstLegAway: number;
  };
  groupTables: Array<{
    label: string;
    rows: Array<{
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
    }>;
  }>;
}

const CHAMPIONS_LEAGUE_STAGES: ChampionsLeagueStage[] = [
  { id: 'qualification', menuTitle: 'Qualification', advanceLabel: 'ENTER GROUP STAGE' },
  { id: 'group-stage', menuTitle: 'Group Stage', advanceLabel: 'ADVANCE TO ROUND OF 16' },
  { id: 'round-of-16', menuTitle: 'Round Of 16', advanceLabel: 'ADVANCE TO QUARTER-FINAL' },
  { id: 'quarter-final', menuTitle: 'Quarter-Final', advanceLabel: 'ADVANCE TO SEMI-FINAL' },
  { id: 'semi-final', menuTitle: 'Semi-Final', advanceLabel: 'ADVANCE TO FINAL' },
  { id: 'final', menuTitle: 'Final' },
];

const STADIUM_OPTIONS: Array<{ key: StadiumKey; label: string }> = [
  { key: 'METRO_DOME', label: 'Metro Dome' },
  { key: 'SUNSET_ARENA', label: 'Sunset Arena' },
  { key: 'ALPINE_PARK', label: 'Alpine Park' },
];
const LOCAL_LAN_LOBBY = 'arcade-fc-local-lobby';

const createEmptyPlayerInput = (): PlayerInputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  pass: false,
  sprint: false,
});

const createEmptyInputState = (): InputState => ({
  home: createEmptyPlayerInput(),
  away: createEmptyPlayerInput(),
});

const cloneSetup = (setup: MatchSetup): MatchSetup => ({
  home: { ...setup.home },
  away: { ...setup.away },
  stadium: setup.stadium,
});

const pickRandomClub = (excludeIds: string[]) => {
  const candidates = CLUBS.filter(club => !excludeIds.includes(club.id));
  return candidates[Math.floor(Math.random() * candidates.length)] || CLUBS[0];
};

const getSeasonLabel = () => {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 6 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
};

const didHomeTeamWin = (scoreState: ScoreState) => {
  if ((scoreState.shootoutHome ?? 0) !== (scoreState.shootoutAway ?? 0)) {
    return (scoreState.shootoutHome ?? 0) > (scoreState.shootoutAway ?? 0);
  }
  return scoreState.home > scoreState.away;
};

const isTwoLeggedStage = (stageId?: string) => ['round-of-16', 'quarter-final', 'semi-final', 'final'].includes(stageId || '');

const getAggregateState = (run: ChampionsLeagueRun | null, scoreState: ScoreState) => {
  if (!run?.currentTie || run.currentTie.leg !== 2) return null;
  return {
    home: run.currentTie.firstLegHome + scoreState.home,
    away: run.currentTie.firstLegAway + scoreState.away,
  };
};

const GROUP_LABELS = ['A', 'B', 'D', 'I'] as const;

const sortTableRows = <T extends { points: number; goalsFor: number; goalsAgainst: number; name: string }>(rows: T[]) => (
  [...rows].sort((a, b) => {
    const goalDiff = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    if (b.points !== a.points) return b.points - a.points;
    if (goalDiff !== 0) return goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  })
);

const createSimulatedRow = (clubId: string, name: string, isPlayer = false) => {
  if (isPlayer) {
    return { clubId, name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, isPlayer: true };
  }

  const wins = Math.floor(Math.random() * 2);
  const draws = Math.floor(Math.random() * 2);
  const losses = Math.max(0, 3 - wins - draws);
  const goalsFor = wins * (2 + Math.floor(Math.random() * 3)) + draws + Math.floor(Math.random() * 2);
  const goalsAgainst = losses * (1 + Math.floor(Math.random() * 3)) + draws + Math.floor(Math.random() * 2);
  return {
    clubId,
    name,
    played: 3,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points: wins * 3 + draws,
  };
};

const createChampionsLeagueGroups = (playerClubId: string) => {
  const availableClubs = CLUBS.filter(club => club.id !== playerClubId);
  const shuffled = [...availableClubs].sort(() => Math.random() - 0.5);
  const playerClub = getClubById(playerClubId);
  let cursor = 0;

  return GROUP_LABELS.map((label, groupIndex) => {
    const rows = [];
    if (groupIndex === 0) {
      rows.push(createSimulatedRow(playerClub.id, playerClub.name, true));
    }

    while (rows.length < 4 && cursor < shuffled.length) {
      const club = shuffled[cursor];
      cursor += 1;
      rows.push(createSimulatedRow(club.id, club.name));
    }

    return {
      label,
      rows: sortTableRows(rows),
    };
  });
};

const applyGroupStageResultToTables = (run: ChampionsLeagueRun, opponentClubId: string, scoreState: ScoreState): ChampionsLeagueRun => {
  if (CHAMPIONS_LEAGUE_STAGES[run.stageIndex]?.id !== 'group-stage') return run;

  const didPlayerWin = didHomeTeamWin(scoreState);
  const isDraw = (scoreState.shootoutHome ?? 0) === (scoreState.shootoutAway ?? 0) && scoreState.home === scoreState.away;

  const nextTables = run.groupTables.map(table => {
    if (table.label !== run.playerGroupLabel) return table;

    const updatedRows = table.rows.map(row => {
      if (row.clubId === run.playerClubId) {
        const wins = row.wins + (didPlayerWin ? 1 : 0);
        const draws = row.draws + (isDraw ? 1 : 0);
        const losses = row.losses + (!didPlayerWin && !isDraw ? 1 : 0);
        return {
          ...row,
          played: row.played + 1,
          wins,
          draws,
          losses,
          goalsFor: row.goalsFor + scoreState.home,
          goalsAgainst: row.goalsAgainst + scoreState.away,
          points: wins * 3 + draws,
        };
      }

      if (row.clubId === opponentClubId) {
        const wins = row.wins + (!didPlayerWin && !isDraw ? 1 : 0);
        const draws = row.draws + (isDraw ? 1 : 0);
        const losses = row.losses + (didPlayerWin ? 1 : 0);
        return {
          ...row,
          played: row.played + 1,
          wins,
          draws,
          losses,
          goalsFor: row.goalsFor + scoreState.away,
          goalsAgainst: row.goalsAgainst + scoreState.home,
          points: wins * 3 + draws,
        };
      }

      return row;
    });

    return {
      ...table,
      rows: sortTableRows(updatedRows),
    };
  });

  return {
    ...run,
    groupTables: nextTables,
  };
};

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputState>(createEmptyInputState());
  const remoteAwayInputRef = useRef<PlayerInputState>(createEmptyPlayerInput());
  const remoteSnapshotRef = useRef<GameSnapshot | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localLobbyRef = useRef<BroadcastChannel | null>(null);
  const localRoomRef = useRef<BroadcastChannel | null>(null);
  const localPeerIdRef = useRef(`peer-${Math.random().toString(36).slice(2, 10)}`);
  const localRoomCodeRef = useRef('');
  const transportRef = useRef<LanTransport>('none');
  const lanAttemptRef = useRef(0);
  const lanRoleRef = useRef<LanRole>('offline');
  const pendingLanActionRef = useRef<{ type: 'create' } | { type: 'join'; code: string } | null>(null);
  const lastSnapshotSentAtRef = useRef(0);

  const [gameState, setGameState] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState<ScoreState>({ home: 0, away: 0, time: 0, period: '1ST HALF' });
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.SINGLE_PLAYER);
  const [competitionType, setCompetitionType] = useState<CompetitionType>('KICK_OFF');
  const [championsLeagueRun, setChampionsLeagueRun] = useState<ChampionsLeagueRun | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');
  const [isChoosingMode, setIsChoosingMode] = useState(false);
  const [isChoosingLan, setIsChoosingLan] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [lanHost, setLanHost] = useState(() => window.location.hostname || 'localhost');
  const [roomCode, setRoomCode] = useState('');
  const [lanRole, setLanRole] = useState<LanRole>('offline');
  const [lanStatus, setLanStatus] = useState('Run `npm run lan-server` and `npm run dev:host` on the host PC.');
  const [lanError, setLanError] = useState('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [isConnectingLan, setIsConnectingLan] = useState(false);

  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const [selectionTeam, setSelectionTeam] = useState<Team>(Team.HOME);
  const [matchSetup, setMatchSetup] = useState<MatchSetup>(createDefaultMatchSetup());
  const [homeSelectionReady, setHomeSelectionReady] = useState(false);
  const [awaySelectionReady, setAwaySelectionReady] = useState(false);
  const [showPauseTactics, setShowPauseTactics] = useState(false);
  const [homePauseReady, setHomePauseReady] = useState(false);
  const [awayPauseReady, setAwayPauseReady] = useState(false);
  const [lastScorer, setLastScorer] = useState<GoalScorerInfo | null>(null);

  const syncHudState = useCallback((nextSnapshot: GameSnapshot) => {
    setScore(prev => {
      const normalized = {
        ...nextSnapshot.score,
        period: nextSnapshot.score.period || '1ST HALF',
      };
      if (
        prev.home === normalized.home &&
        prev.away === normalized.away &&
        Math.floor(prev.time) === Math.floor(normalized.time) &&
        prev.period === normalized.period &&
        prev.restartLabel === normalized.restartLabel &&
        prev.shootoutHome === normalized.shootoutHome &&
        prev.shootoutAway === normalized.shootoutAway
      ) {
        return prev;
      }
      return normalized;
    });
    setGameState(prev => (prev === nextSnapshot.status ? prev : nextSnapshot.status));
    setGameMode(prev => (prev === nextSnapshot.mode ? prev : nextSnapshot.mode));
  }, []);

  const sendLanMessage = useCallback((payload: object) => {
    if (transportRef.current === 'ws' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
    if (transportRef.current === 'local' && localRoomRef.current) {
      localRoomRef.current.postMessage({ ...payload, senderId: localPeerIdRef.current });
    }
  }, []);

  const sendGuestInput = useCallback(() => {
    if (lanRoleRef.current !== 'guest') return;
    sendLanMessage({
      type: 'guest_input',
      input: inputRef.current.away,
    });
  }, [sendLanMessage]);

  const closeLanConnection = useCallback(() => {
    lanAttemptRef.current += 1;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (localLobbyRef.current) {
      localLobbyRef.current.close();
      localLobbyRef.current = null;
    }
    if (localRoomRef.current) {
      localRoomRef.current.close();
      localRoomRef.current = null;
    }
    transportRef.current = 'none';
    localRoomCodeRef.current = '';
    lanRoleRef.current = 'offline';
    setLanRole('offline');
    setRoomCode('');
    setPeerConnected(false);
    setIsConnectingLan(false);
    remoteSnapshotRef.current = null;
    remoteAwayInputRef.current = createEmptyPlayerInput();
  }, []);

  const initLocalLanFallback = useCallback(() => {
    if (localLobbyRef.current) {
      localLobbyRef.current.close();
    }

    transportRef.current = 'local';
    const lobby = new BroadcastChannel(LOCAL_LAN_LOBBY);
    localLobbyRef.current = lobby;
    const peerId = localPeerIdRef.current;

    const openRoomChannel = (code: string, role: LanRole) => {
      if (localRoomRef.current) localRoomRef.current.close();
      const roomChannel = new BroadcastChannel(`arcade-fc-room-${code}`);
      localRoomRef.current = roomChannel;
      localRoomCodeRef.current = code;
      lanRoleRef.current = role;
      setLanRole(role);
      setRoomCode(code);
      setGameMode(GameMode.MULTI_PLAYER);
      engineRef.current.setMode(GameMode.MULTI_PLAYER);
      setIsConnectingLan(false);
      setLanError('');
      setLanStatus(role === 'host' ? 'Room created on localhost. Open another tab and join with room code.' : 'Joined localhost room. Waiting for host to start the match.');

      roomChannel.onmessage = event => {
        const message = event.data || {};
        if (message.senderId === peerId) return;

        if (message.type === 'guest_joined' && role === 'host') {
          setPeerConnected(true);
          setLanStatus('Guest connected. Starting LAN match...');
          sendLanMessage({ type: 'start_match' });
          return;
        }

        if (message.type === 'start_match') {
          const setup = cloneSetup(matchSetup);
          const engine = new GameEngine();
          engine.setMode(GameMode.MULTI_PLAYER);
          engine.setAIDifficulty(aiDifficulty);
          engine.configureMatch(setup);
          engine.startGame();
          engineRef.current = engine;
          inputRef.current = createEmptyInputState();
          remoteAwayInputRef.current = createEmptyPlayerInput();
          remoteSnapshotRef.current = null;
          setGameMode(GameMode.MULTI_PLAYER);
          setIsChoosingLan(false);
          setIsChoosingMode(false);
          setLanError('');
          setShowTeamSelect(false);
          setScore({ home: 0, away: 0, time: 0, period: '1ST HALF' });
          setLastScorer(null);
          setGameState(GameStatus.KICKOFF);
          return;
        }

        if (message.type === 'guest_input' && role === 'host') {
          remoteAwayInputRef.current = message.input as PlayerInputState;
          return;
        }

        if (message.type === 'host_state' && role === 'guest') {
          remoteSnapshotRef.current = message.snapshot as GameSnapshot;
          syncHudState(message.snapshot as GameSnapshot);
        }
      };
    };

    lobby.onmessage = event => {
      const message = event.data || {};
      if (message.senderId === peerId) return;

      if (message.type === 'local_join_request' && pendingLanActionRef.current?.type === 'create' && message.code === localRoomCodeRef.current) {
        setPeerConnected(true);
        openRoomChannel(message.code, 'host');
        lobby.postMessage({ type: 'local_join_accept', code: message.code, targetId: message.senderId, senderId: peerId });
        return;
      }

      if (message.type === 'local_join_accept' && pendingLanActionRef.current?.type === 'join' && message.targetId === peerId) {
        openRoomChannel(message.code, 'guest');
        sendLanMessage({ type: 'guest_joined' });
      }
    };

    if (pendingLanActionRef.current?.type === 'create') {
      let code = Math.random().toString(36).slice(2, 6).toUpperCase();
      localRoomCodeRef.current = code;
      setRoomCode(code);
      setPeerConnected(false);
      openRoomChannel(code, 'host');
      return;
    }

    if (pendingLanActionRef.current?.type === 'join') {
      const code = pendingLanActionRef.current.code;
      setLanStatus('Searching localhost room...');
      lobby.postMessage({ type: 'local_join_request', code, senderId: peerId });
      window.setTimeout(() => {
        if (transportRef.current === 'local' && lanRoleRef.current === 'offline' && pendingLanActionRef.current?.type === 'join') {
          setLanError('Local room not found on this browser session.');
          setIsConnectingLan(false);
        }
      }, 1500);
    }
  }, [aiDifficulty, matchSetup, roomCode, sendLanMessage, syncHudState]);

  const connectToLanServer = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const normalizedLanHost = lanHost.trim();
    const hostCandidates = Array.from(new Set([normalizedLanHost, window.location.hostname, 'localhost', '127.0.0.1'].filter(Boolean)));
    let candidateIndex = 0;
    const attemptId = ++lanAttemptRef.current;

    const attachSocketHandlers = (socket: WebSocket, host: string) => {
      wsRef.current = socket;

      socket.addEventListener('open', () => {
        if (attemptId !== lanAttemptRef.current || wsRef.current !== socket) return;
        setLanStatus(`Connected to LAN relay server (${host}:3001).`);
        setLanError('');

        if (pendingLanActionRef.current?.type === 'create') {
          socket.send(JSON.stringify({ type: 'create_room' }));
        }

        if (pendingLanActionRef.current?.type === 'join') {
          socket.send(JSON.stringify({ type: 'join_room', code: pendingLanActionRef.current.code }));
        }
      });

      socket.addEventListener('message', event => {
        if (attemptId !== lanAttemptRef.current || wsRef.current !== socket) return;
        const message = JSON.parse(event.data);
        if (message.type === 'connected') return;

        if (message.type === 'room_state') {
          const nextRole = message.role as LanRole;
          lanRoleRef.current = nextRole;
          setLanRole(nextRole);
          setRoomCode(message.code || '');
          setPeerConnected(Boolean(message.peerConnected));
          setIsConnectingLan(false);
          setGameMode(GameMode.MULTI_PLAYER);
          engineRef.current.setMode(GameMode.MULTI_PLAYER);
          setLanStatus(nextRole === 'host'
            ? (message.peerConnected ? 'Guest connected. Starting LAN match...' : 'Room created. Share this code and your host IP.')
            : 'Joined room. Waiting for host to start the match.');
          return;
        }

        if (message.type === 'peer_joined') {
          setPeerConnected(true);
          setLanStatus('Guest connected. Starting LAN match...');
          sendLanMessage({ type: 'start_match' });
          return;
        }

        if (message.type === 'peer_left') {
          setPeerConnected(false);
          setGameState(GameStatus.MENU);
          setIsChoosingLan(true);
          setLanStatus('Peer disconnected. You can wait for another player or create a new room.');
          return;
        }

        if (message.type === 'start_match') {
          const setup = cloneSetup(matchSetup);
          const engine = new GameEngine();
          engine.setMode(GameMode.MULTI_PLAYER);
          engine.setAIDifficulty(aiDifficulty);
          engine.configureMatch(setup);
          engine.startGame();
          engineRef.current = engine;
          inputRef.current = createEmptyInputState();
          remoteAwayInputRef.current = createEmptyPlayerInput();
          remoteSnapshotRef.current = null;
          setGameMode(GameMode.MULTI_PLAYER);
          setIsChoosingLan(false);
          setIsChoosingMode(false);
          setLanError('');
          setShowTeamSelect(false);
          setScore({ home: 0, away: 0, time: 0, period: '1ST HALF' });
          setLastScorer(null);
          setGameState(GameStatus.KICKOFF);
          return;
        }

        if (message.type === 'guest_input') {
          remoteAwayInputRef.current = message.input as PlayerInputState;
          return;
        }

        if (message.type === 'host_state') {
          remoteSnapshotRef.current = message.snapshot as GameSnapshot;
          syncHudState(message.snapshot as GameSnapshot);
          return;
        }

        if (message.type === 'error') {
          setLanError(message.message || 'LAN connection error.');
          setLanStatus('LAN connection needs attention.');
          setIsConnectingLan(false);
        }
      });

      socket.addEventListener('close', () => {
        if (attemptId !== lanAttemptRef.current) return;
        const wasConnected = lanRoleRef.current !== 'offline';
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (!wasConnected && candidateIndex < hostCandidates.length - 1) {
          candidateIndex += 1;
          attachSocketHandlers(new WebSocket(`${protocol}//${hostCandidates[candidateIndex]}:3001`), hostCandidates[candidateIndex]);
          return;
        }

        if (lanRoleRef.current !== 'offline') {
          setLanStatus('LAN server disconnected.');
          setLanError('Check that `npm run lan-server` is running on the host PC.');
        } else if (!wasConnected) {
          const hostForFallback = normalizedLanHost.toLowerCase();
          if (['localhost', '127.0.0.1', window.location.hostname.toLowerCase()].includes(hostForFallback)) {
            setLanStatus('LAN server not found. Switching to localhost browser relay...');
            initLocalLanFallback();
          } else {
            setLanStatus('LAN relay serverga ulanib bo`lmadi.');
            setLanError('`localhost:3001` yoki `127.0.0.1:3001` da server topilmadi.');
            setIsConnectingLan(false);
          }
        }
      });

      socket.addEventListener('error', () => {
        if (attemptId !== lanAttemptRef.current) return;
        socket.close();
      });
    };

    attachSocketHandlers(new WebSocket(`${protocol}//${hostCandidates[candidateIndex]}:3001`), hostCandidates[candidateIndex]);
  }, [aiDifficulty, initLocalLanFallback, lanHost, matchSetup, sendLanMessage, syncHudState]);

  const startConfiguredMatch = useCallback((setup: MatchSetup, mode: GameMode) => {
    inputRef.current = createEmptyInputState();
    remoteAwayInputRef.current = createEmptyPlayerInput();
    const engine = new GameEngine();
    engine.setMode(mode);
    engine.setAIDifficulty(aiDifficulty);
    engine.configureMatch(setup);
    engine.startGame();
    engineRef.current = engine;
    setGameMode(mode);
    setScore({ home: 0, away: 0, time: 0, period: '1ST HALF' });
    setGameState(GameStatus.KICKOFF);
    setLastScorer(null);
    setShowTeamSelect(false);
    setShowPauseTactics(false);
    setHomeSelectionReady(false);
    setAwaySelectionReady(false);
    setHomePauseReady(false);
    setAwayPauseReady(false);
  }, [aiDifficulty]);

  const finalizeSinglePlayerSelection = useCallback(() => {
    const homeClubId = matchSetup.home.clubId;
    const aiClub = pickRandomClub([homeClubId]);
    const nextSetup = cloneSetup(matchSetup);
    nextSetup.away.clubId = aiClub.id;
    nextSetup.away.league = aiClub.league;
    nextSetup.away.formation = '2-1-1';
    setMatchSetup(nextSetup);
    startConfiguredMatch(nextSetup, GameMode.SINGLE_PLAYER);
  }, [matchSetup, startConfiguredMatch]);

  const startChampionsLeagueStage = useCallback((run: ChampionsLeagueRun) => {
    const playerClub = getClubById(run.playerClubId);
    const stage = CHAMPIONS_LEAGUE_STAGES[run.stageIndex];
    const shouldKeepOpponent = isTwoLeggedStage(stage?.id) && run.currentTie?.leg === 2 && run.currentOpponentId;
    const excluded = [run.playerClubId, ...run.usedOpponentIds];
    const opponent = shouldKeepOpponent
      ? getClubById(run.currentOpponentId!)
      : pickRandomClub(excluded.length >= CLUBS.length - 1 ? [run.playerClubId] : excluded);
    const nextSetup: MatchSetup = {
      home: {
        ...matchSetup.home,
        clubId: playerClub.id,
        league: playerClub.league,
      },
      away: {
        ...matchSetup.away,
        clubId: opponent.id,
        league: opponent.league,
        formation: '2-1-1',
      },
      stadium: matchSetup.stadium,
    };

    setMatchSetup(nextSetup);
    setChampionsLeagueRun({
      ...run,
      currentOpponentId: opponent.id,
      currentOpponentName: opponent.name,
      usedOpponentIds: shouldKeepOpponent || run.usedOpponentIds.includes(opponent.id) ? run.usedOpponentIds : [...run.usedOpponentIds, opponent.id],
    });
    startConfiguredMatch(nextSetup, GameMode.SINGLE_PLAYER);
  }, [matchSetup.away, matchSetup.home, matchSetup.stadium, startConfiguredMatch]);

  const startChampionsLeagueRun = useCallback(() => {
    const run: ChampionsLeagueRun = {
      playerClubId: matchSetup.home.clubId,
      seasonLabel: getSeasonLabel(),
      stageIndex: 0,
      usedOpponentIds: [],
      playerGroupLabel: 'A',
      currentOpponentId: undefined,
      currentOpponentName: undefined,
      currentTie: undefined,
      groupTables: createChampionsLeagueGroups(matchSetup.home.clubId),
    };
    startChampionsLeagueStage(run);
  }, [matchSetup.home.clubId, startChampionsLeagueStage]);

  const updateCurrentSelection = (team: Team, updater: (draft: MatchSetup) => void) => {
    const nextSetup = cloneSetup(matchSetup);
    updater(nextSetup);
    setMatchSetup(nextSetup);
    if (team === Team.HOME) {
      setHomeSelectionReady(false);
    } else {
      setAwaySelectionReady(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    if (canvasRef.current) {
      rendererRef.current = new Renderer(canvasRef.current);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isGuest = lanRoleRef.current === 'guest';
      const isOfflineMultiplayer = lanRoleRef.current === 'offline' && gameMode === GameMode.MULTI_PLAYER;

      if (showTeamSelect) {
        if (e.code === 'ShiftLeft') setHomeSelectionReady(true);
        if (e.code === 'ShiftRight' && gameMode === GameMode.MULTI_PLAYER) setAwaySelectionReady(true);
        return;
      }

      if (gameState === GameStatus.PAUSED && showPauseTactics) {
        if (e.code === 'ShiftLeft') setHomePauseReady(true);
        if (e.code === 'ShiftRight' && gameMode === GameMode.MULTI_PLAYER) setAwayPauseReady(true);
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyO'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
          if (isGuest) {
            inputRef.current.away.up = true;
            sendGuestInput();
          } else {
            inputRef.current.home.up = true;
          }
          break;
        case 'KeyS':
          if (isGuest) {
            inputRef.current.away.down = true;
            sendGuestInput();
          } else {
            inputRef.current.home.down = true;
          }
          break;
        case 'KeyA':
          if (isGuest) {
            inputRef.current.away.left = true;
            sendGuestInput();
          } else {
            inputRef.current.home.left = true;
          }
          break;
        case 'KeyD':
          if (isGuest) {
            inputRef.current.away.right = true;
            sendGuestInput();
          } else {
            inputRef.current.home.right = true;
          }
          break;
        case 'KeyQ':
          if (isGuest) {
            inputRef.current.away.pass = true;
            sendGuestInput();
          } else {
            inputRef.current.home.pass = true;
          }
          break;
        case 'KeyE':
          if (isGuest) {
            inputRef.current.away.shoot = true;
            sendGuestInput();
          } else {
            inputRef.current.home.shoot = true;
          }
          break;
        case 'KeyR':
          if (isGuest) {
            engineRef.current.switchActivePlayer(Team.AWAY);
            sendGuestInput();
          } else {
            engineRef.current.switchActivePlayer(Team.HOME);
          }
          break;
        case 'ShiftLeft':
          if (isGuest) {
            inputRef.current.away.sprint = true;
            sendGuestInput();
          } else {
            inputRef.current.home.sprint = true;
          }
          break;
        case 'KeyI':
          if (isOfflineMultiplayer) inputRef.current.away.up = true;
          break;
        case 'KeyK':
          if (isOfflineMultiplayer) inputRef.current.away.down = true;
          break;
        case 'KeyJ':
          if (isOfflineMultiplayer) inputRef.current.away.left = true;
          break;
        case 'KeyL':
          if (isOfflineMultiplayer) inputRef.current.away.right = true;
          break;
        case 'KeyU':
          if (isOfflineMultiplayer) inputRef.current.away.pass = true;
          break;
        case 'KeyO':
          if (isOfflineMultiplayer) inputRef.current.away.shoot = true;
          break;
        case 'ShiftRight':
          if (isOfflineMultiplayer) inputRef.current.away.sprint = true;
          break;
        case 'Escape':
          if (lanRoleRef.current === 'guest') return;
          if (gameState === GameStatus.PLAYING) {
            setShowPauseTactics(false);
            setHomePauseReady(false);
            setAwayPauseReady(false);
            engineRef.current.status = GameStatus.PAUSED;
            setGameState(GameStatus.PAUSED);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isGuest = lanRoleRef.current === 'guest';
      const isOfflineMultiplayer = lanRoleRef.current === 'offline' && gameMode === GameMode.MULTI_PLAYER;

      switch (e.code) {
        case 'KeyW':
          if (isGuest) {
            inputRef.current.away.up = false;
            sendGuestInput();
          } else {
            inputRef.current.home.up = false;
          }
          break;
        case 'KeyS':
          if (isGuest) {
            inputRef.current.away.down = false;
            sendGuestInput();
          } else {
            inputRef.current.home.down = false;
          }
          break;
        case 'KeyA':
          if (isGuest) {
            inputRef.current.away.left = false;
            sendGuestInput();
          } else {
            inputRef.current.home.left = false;
          }
          break;
        case 'KeyD':
          if (isGuest) {
            inputRef.current.away.right = false;
            sendGuestInput();
          } else {
            inputRef.current.home.right = false;
          }
          break;
        case 'KeyQ':
          if (isGuest) {
            inputRef.current.away.pass = false;
            sendGuestInput();
          } else {
            inputRef.current.home.pass = false;
          }
          break;
        case 'KeyE':
          if (isGuest) {
            inputRef.current.away.shoot = false;
            sendGuestInput();
          } else {
            inputRef.current.home.shoot = false;
          }
          break;
        case 'ShiftLeft':
          if (isGuest) {
            inputRef.current.away.sprint = false;
            sendGuestInput();
          } else {
            inputRef.current.home.sprint = false;
          }
          break;
        case 'KeyI':
          if (isOfflineMultiplayer) inputRef.current.away.up = false;
          break;
        case 'KeyK':
          if (isOfflineMultiplayer) inputRef.current.away.down = false;
          break;
        case 'KeyJ':
          if (isOfflineMultiplayer) inputRef.current.away.left = false;
          break;
        case 'KeyL':
          if (isOfflineMultiplayer) inputRef.current.away.right = false;
          break;
        case 'KeyU':
          if (isOfflineMultiplayer) inputRef.current.away.pass = false;
          break;
        case 'KeyO':
          if (isOfflineMultiplayer) inputRef.current.away.shoot = false;
          break;
        case 'ShiftRight':
          if (isOfflineMultiplayer) inputRef.current.away.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameMode, gameState, sendGuestInput, showPauseTactics, showTeamSelect]);

  const gameStep = useCallback((dt: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (lanRoleRef.current === 'guest') {
      if (remoteSnapshotRef.current) {
        renderer.render(remoteSnapshotRef.current as unknown as GameEngine);
      }
      return;
    }

    const engine = engineRef.current;
    const frameInput = lanRoleRef.current === 'host'
      ? { home: inputRef.current.home, away: remoteAwayInputRef.current }
      : inputRef.current;

    engine.update(frameInput, dt);
    const snapshot = engine.toSnapshot();

    if (
      Math.floor(snapshot.score.time) !== Math.floor(score.time) ||
      snapshot.score.home !== score.home ||
      snapshot.score.away !== score.away ||
      snapshot.score.period !== score.period ||
      snapshot.score.restartLabel !== score.restartLabel ||
      snapshot.score.shootoutHome !== score.shootoutHome ||
      snapshot.score.shootoutAway !== score.shootoutAway ||
      snapshot.status !== gameState
    ) {
      setScore(snapshot.score);
      setGameState(snapshot.status);
    }

    // Sync last scorer for goal overlay
    const engineLastScorer = engine.lastScorer;
    if (engineLastScorer && (
      !lastScorer ||
      engineLastScorer.name !== lastScorer.name ||
      engineLastScorer.number !== lastScorer.number ||
      engineLastScorer.scoredAtMinute !== lastScorer.scoredAtMinute
    )) {
      setLastScorer(engineLastScorer);
    }

    renderer.render(engine);

    if (lanRoleRef.current === 'host') {
      const now = performance.now();
      if (now - lastSnapshotSentAtRef.current > 50) {
        sendLanMessage({
          type: 'host_state',
          snapshot,
        });
        lastSnapshotSentAtRef.current = now;
      }
    }
  }, [gameState, lastScorer, score, sendLanMessage]);

  useGameLoop(
    gameStep,
    showTeamSelect || gameState === GameStatus.PAUSED || gameState === GameStatus.MENU || gameState === GameStatus.GAME_OVER || gameState === GameStatus.HALFTIME,
  );

  useEffect(() => {
    if (gameState !== GameStatus.GAME_OVER || !championsLeagueRun) return;
    if (CHAMPIONS_LEAGUE_STAGES[championsLeagueRun.stageIndex]?.id !== 'group-stage') return;

    const playerRow = championsLeagueRun.groupTables
      .find(table => table.label === championsLeagueRun.playerGroupLabel)
      ?.rows.find(row => row.clubId === championsLeagueRun.playerClubId);

    if (!playerRow || playerRow.played > 0) return;

    setChampionsLeagueRun(prev => (
      prev ? applyGroupStageResultToTables(prev, matchSetup.away.clubId, score) : prev
    ));
  }, [championsLeagueRun, gameState, matchSetup.away.clubId, score]);

  const handleOfflineStart = () => {
    if (lanRoleRef.current !== 'offline') closeLanConnection();
    setIsChoosingMode(true);
    setIsChoosingLan(false);
    setLanError('');
    setCompetitionType('KICK_OFF');
    setChampionsLeagueRun(null);
  };

  const handleSelectMode = (mode: GameMode) => {
    const nextSetup = createDefaultMatchSetup();
    setGameMode(mode);
    setCompetitionType('KICK_OFF');
    setChampionsLeagueRun(null);
    setMatchSetup(nextSetup);
    setSelectionTeam(Team.HOME);
    setShowTeamSelect(true);
    setIsChoosingMode(false);
    setHomeSelectionReady(false);
    setAwaySelectionReady(false);
  };

  const handleSelectChampionsLeague = () => {
    const nextSetup = createDefaultMatchSetup();
    setGameMode(GameMode.SINGLE_PLAYER);
    setCompetitionType('CHAMPIONS_LEAGUE');
    setChampionsLeagueRun(null);
    setMatchSetup(nextSetup);
    setSelectionTeam(Team.HOME);
    setShowTeamSelect(true);
    setIsChoosingMode(false);
    setHomeSelectionReady(false);
    setAwaySelectionReady(false);
  };

  const handleOpenLanMenu = () => {
    setIsChoosingLan(true);
    setIsChoosingMode(false);
    setLanError('');
  };

  const handleCreateLanRoom = () => {
    if (wsRef.current) {
      lanAttemptRef.current += 1;
      wsRef.current.close();
      wsRef.current = null;
    }
    lanRoleRef.current = 'offline';
    setLanRole('offline');
    setRoomCode('');
    setPeerConnected(false);
    setIsConnectingLan(true);
    setLanError('');
    setLanStatus('Connecting to LAN relay server...');
    pendingLanActionRef.current = { type: 'create' };
    connectToLanServer();
  };

  const handleJoinLanRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setLanError('Enter a 4-letter room code first.');
      return;
    }
    if (wsRef.current) {
      lanAttemptRef.current += 1;
      wsRef.current.close();
      wsRef.current = null;
    }
    lanRoleRef.current = 'offline';
    setLanRole('offline');
    setRoomCode('');
    setPeerConnected(false);
    setIsConnectingLan(true);
    setLanError('');
    setLanStatus('Connecting to room...');
    pendingLanActionRef.current = { type: 'join', code };
    connectToLanServer();
  };

  const handleTeamLeagueSelect = (league: LeagueKey) => {
    updateCurrentSelection(selectionTeam, draft => {
      const clubs = getClubsByLeague(league);
      if (selectionTeam === Team.HOME) {
        draft.home.league = league;
        draft.home.clubId = clubs[0].id;
      } else {
        draft.away.league = league;
        draft.away.clubId = clubs[0].id;
      }
    });
  };

  const handleTeamClubSelect = (clubId: string) => {
    updateCurrentSelection(selectionTeam, draft => {
      if (selectionTeam === Team.HOME) {
        draft.home.clubId = clubId;
      } else {
        draft.away.clubId = clubId;
      }
    });
  };

  const handleStadiumSelect = (stadium: StadiumKey) => {
    setMatchSetup(prev => ({
      ...prev,
      stadium,
    }));
  };

  const handleBackFromTeamSelect = () => {
    if (selectionTeam === Team.AWAY && gameMode === GameMode.MULTI_PLAYER) {
      setSelectionTeam(Team.HOME);
      return;
    }
    setShowTeamSelect(false);
    setIsChoosingMode(true);
  };

  const handleContinueTeamSelect = () => {
    if (gameMode === GameMode.SINGLE_PLAYER) {
      if (competitionType === 'CHAMPIONS_LEAGUE') {
        startChampionsLeagueRun();
        return;
      }
      finalizeSinglePlayerSelection();
      return;
    }

    if (selectionTeam === Team.HOME) {
      setSelectionTeam(Team.AWAY);
      return;
    }

    if (homeSelectionReady && awaySelectionReady) {
      startConfiguredMatch(matchSetup, GameMode.MULTI_PLAYER);
    }
  };

  const handlePauseFormationSelect = (team: Team, formation: FormationKey) => {
    const nextSetup = cloneSetup(matchSetup);
    if (team === Team.HOME) {
      nextSetup.home.formation = formation;
      setHomePauseReady(false);
    } else {
      nextSetup.away.formation = formation;
      setAwayPauseReady(false);
    }
    setMatchSetup(nextSetup);
    engineRef.current.setFormation(team, formation, true);
  };

  const handleTogglePauseTactics = () => {
    setShowPauseTactics(prev => !prev);
    setHomePauseReady(false);
    setAwayPauseReady(false);
  };

  const handleResume = () => {
    engineRef.current.status = GameStatus.PLAYING;
    setGameState(GameStatus.PLAYING);
    setShowPauseTactics(false);
    setHomePauseReady(false);
    setAwayPauseReady(false);
    if (lanRoleRef.current === 'host') {
      sendLanMessage({ type: 'host_state', snapshot: engineRef.current.toSnapshot() });
    }
  };

  const handleExitToMenu = () => {
    inputRef.current = createEmptyInputState();
    remoteAwayInputRef.current = createEmptyPlayerInput();
    engineRef.current = new GameEngine();
    setShowPauseTactics(false);
    setShowTeamSelect(false);
    setHomePauseReady(false);
    setAwayPauseReady(false);
    setHomeSelectionReady(false);
    setAwaySelectionReady(false);
    setScore({ home: 0, away: 0, time: 0, period: '1ST HALF' });
    setLastScorer(null);
    setCompetitionType('KICK_OFF');
    setChampionsLeagueRun(null);
    setGameState(GameStatus.MENU);
  };

  const handleRestart = () => {
    if (lanRoleRef.current === 'guest') {
      setLanStatus('Waiting for host to restart the match.');
      return;
    }
    startConfiguredMatch(matchSetup, gameMode);
    if (lanRoleRef.current === 'host') {
      sendLanMessage({ type: 'start_match' });
    }
  };

  const handleRevanche = () => {
    if (lanRoleRef.current === 'guest') {
      setLanStatus('Waiting for host to start revenge match.');
      return;
    }
    // Swap teams: home becomes away, away becomes home
    const revancheSetup: MatchSetup = {
      home: { ...matchSetup.away },
      away: { ...matchSetup.home },
      stadium: matchSetup.stadium,
    };
    
    // If single player mode, we need to set up AI club for the new away team
    if (gameMode === GameMode.SINGLE_PLAYER) {
      const homeClubId = revancheSetup.home.clubId;
      const aiClub = pickRandomClub([homeClubId, matchSetup.away.clubId]);
      revancheSetup.away.clubId = aiClub.id;
      revancheSetup.away.league = aiClub.league;
      revancheSetup.away.formation = '2-1-1';
    }
    
    setMatchSetup(revancheSetup);
    startConfiguredMatch(revancheSetup, gameMode);
    if (lanRoleRef.current === 'host') {
      sendLanMessage({ type: 'start_match' });
    }
  };

  const handleContinueBreak = () => {
    engineRef.current.continueFromBreak();
    setGameState(GameStatus.KICKOFF);
  };

  const handleAdvanceChampionsLeague = () => {
    if (!championsLeagueRun) return;
    const stage = CHAMPIONS_LEAGUE_STAGES[championsLeagueRun.stageIndex];
    if (!stage) return;

    if (isTwoLeggedStage(stage.id) && championsLeagueRun.currentTie?.leg === 1) {
      const nextRun: ChampionsLeagueRun = {
        ...championsLeagueRun,
        currentTie: {
          stageId: stage.id,
          leg: 2,
          firstLegHome: score.home,
          firstLegAway: score.away,
        },
      };
      startChampionsLeagueStage(nextRun);
      return;
    }

    const nextStageIndex = championsLeagueRun.stageIndex + 1;
    if (nextStageIndex >= CHAMPIONS_LEAGUE_STAGES.length) return;

    const nextStage = CHAMPIONS_LEAGUE_STAGES[nextStageIndex];
    const nextRun: ChampionsLeagueRun = {
      ...championsLeagueRun,
      stageIndex: nextStageIndex,
      currentOpponentId: undefined,
      currentOpponentName: undefined,
      currentTie: isTwoLeggedStage(nextStage?.id)
        ? { stageId: nextStage.id, leg: 1, firstLegHome: 0, firstLegAway: 0 }
        : undefined,
    };
    startChampionsLeagueStage(nextRun);
  };

  const breakTitle = score.period === '2ND HALF +5'
    ? 'EXTRA TIME'
    : score.period === '3RD TIME'
      ? '4TH TIME'
      : 'HALF TIME';
  const breakActionLabel = score.period === '2ND HALF +5'
    ? 'START 3RD TIME'
    : score.period === '3RD TIME'
      ? 'START 4TH TIME'
      : 'START 2ND HALF';

  const currentLeague = selectionTeam === Team.HOME ? matchSetup.home.league : matchSetup.away.league;
  const currentClubId = selectionTeam === Team.HOME ? matchSetup.home.clubId : matchSetup.away.clubId;
  const currentChampionsStage = championsLeagueRun ? CHAMPIONS_LEAGUE_STAGES[championsLeagueRun.stageIndex] : null;
  const aggregateState = getAggregateState(championsLeagueRun, score);
  const firstLegScoreLabel = championsLeagueRun?.currentTie ? `${championsLeagueRun.currentTie.firstLegHome}-${championsLeagueRun.currentTie.firstLegAway}` : undefined;
  const aggregateScoreLabel = aggregateState ? `${aggregateState.home}-${aggregateState.away}` : undefined;
  const isKnockoutLegOne = Boolean(championsLeagueRun?.currentTie && championsLeagueRun.currentTie.leg === 1);
  const isKnockoutLegTwo = Boolean(championsLeagueRun?.currentTie && championsLeagueRun.currentTie.leg === 2);
  const knockoutLegTwoAdvance = Boolean(
    aggregateState &&
    (
      aggregateState.home > aggregateState.away ||
      (aggregateState.home === aggregateState.away && didHomeTeamWin(score))
    )
  );
  const championsLeagueWon = Boolean(
    championsLeagueRun &&
    currentChampionsStage?.id === 'final' &&
    gameState === GameStatus.GAME_OVER &&
    (isKnockoutLegTwo ? knockoutLegTwoAdvance : didHomeTeamWin(score)),
  );
  const championsLeagueSummary = championsLeagueRun ? `Champions League ${currentChampionsStage?.menuTitle}` : undefined;
  const canAdvanceChampionsLeague = Boolean(
    championsLeagueRun &&
    gameState === GameStatus.GAME_OVER &&
    currentChampionsStage?.id !== 'final' &&
    (
      !isTwoLeggedStage(currentChampionsStage?.id)
        ? didHomeTeamWin(score)
        : (isKnockoutLegOne || knockoutLegTwoAdvance)
    ),
  );
  const championsExtraContent = championsLeagueRun
    ? (
      <div className="space-y-4">
        {championsLeagueRun.currentTie && (
          <div className="rounded-2xl border border-amber-300/20 bg-black/25 px-5 py-4 text-center text-white">
            <div className="text-sm uppercase tracking-[0.35em] text-amber-200">{currentChampionsStage?.menuTitle}</div>
            <div className="mt-2 text-lg font-sport text-white">{championsLeagueRun.currentOpponentName}</div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm uppercase tracking-[0.24em] text-white/70">
              <span className="rounded-full bg-white/10 px-3 py-1">Leg {championsLeagueRun.currentTie.leg}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">First Leg {firstLegScoreLabel}</span>
              {aggregateScoreLabel && <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-200">Aggregate {aggregateScoreLabel}</span>}
            </div>
          </div>
        )}
        {currentChampionsStage?.id === 'group-stage' && (
          <ChampionsLeagueTables tables={championsLeagueRun.groupTables} playerGroupLabel={championsLeagueRun.playerGroupLabel} />
        )}
      </div>
    )
    : null;
  const teamSelectCanContinue =
    gameMode === GameMode.SINGLE_PLAYER
      ? Boolean(matchSetup.home.clubId) && homeSelectionReady
      : selectionTeam === Team.HOME
        ? Boolean(matchSetup.home.clubId)
        : Boolean(matchSetup.away.clubId) && homeSelectionReady && awaySelectionReady;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {gameState === GameStatus.MENU && (
        <MainMenu
          onOpenModeSelect={handleOfflineStart}
          onSelectMode={handleSelectMode}
          onSelectChampionsLeague={handleSelectChampionsLeague}
          onSelectDifficulty={setAiDifficulty}
          selectedDifficulty={aiDifficulty}
          isChoosingMode={isChoosingMode}
          onOpenLanMenu={handleOpenLanMenu}
          onCreateLanRoom={handleCreateLanRoom}
          onJoinLanRoom={handleJoinLanRoom}
          onJoinCodeChange={value => setJoinCode(value.toUpperCase())}
          onLanHostChange={value => setLanHost(value)}
          isChoosingLan={isChoosingLan}
          joinCode={joinCode}
          lanHost={lanHost}
          roomCode={roomCode}
          lanStatus={lanStatus}
          lanError={lanError}
          peerConnected={peerConnected}
          isConnectingLan={isConnectingLan}
        />
      )}

      {showTeamSelect && (
        <TeamSelectMenu
          mode={gameMode}
          currentTeam={selectionTeam}
          currentLeague={currentLeague}
          title={competitionType === 'CHAMPIONS_LEAGUE' ? 'CHAMPIONS LEAGUE CLUB SELECT' : undefined}
          subtitle={competitionType === 'CHAMPIONS_LEAGUE' ? 'Choose your club, then press Left Shift to begin the road to the final' : undefined}
          clubs={getClubsByLeague(currentLeague)}
          stadiums={STADIUM_OPTIONS}
          selectedStadium={matchSetup.stadium}
          selectedClubId={currentClubId}
          onSelectLeague={handleTeamLeagueSelect}
          onSelectClub={handleTeamClubSelect}
          onSelectStadium={handleStadiumSelect}
          onBack={handleBackFromTeamSelect}
          onContinue={handleContinueTeamSelect}
          homeReady={homeSelectionReady}
          awayReady={awaySelectionReady}
          canContinue={teamSelectCanContinue}
        />
      )}

      {gameState === GameStatus.PAUSED && (
        <PauseMenu
          mode={gameMode}
          showTactics={showPauseTactics}
          homeFormation={matchSetup.home.formation}
          awayFormation={matchSetup.away.formation}
          onSelectFormation={handlePauseFormationSelect}
          onToggleTactics={handleTogglePauseTactics}
          onContinue={handleResume}
          onExit={handleExitToMenu}
          homeReady={homePauseReady}
          awayReady={awayPauseReady}
        />
      )}

      {gameState === GameStatus.HALFTIME && <HalftimeMenu title={breakTitle} actionLabel={breakActionLabel} onContinue={handleContinueBreak} />}
      {gameState === GameStatus.PENALTY && <PenaltyMenu score={score} isAwayHuman={gameMode === GameMode.MULTI_PLAYER} />}
      {gameState === GameStatus.GOAL && (
        <GoalOverlay
          scorerName={lastScorer?.name}
          scorerNumber={lastScorer?.number}
          scoredAtMinute={lastScorer?.scoredAtMinute}
        />
      )}
      {gameState === GameStatus.GAME_OVER && (
        <GameOverMenu
          score={score}
          onRestart={handleRestart}
          onRevanche={championsLeagueRun ? undefined : handleRevanche}
          onExit={handleExitToMenu}
          onAdvance={canAdvanceChampionsLeague ? handleAdvanceChampionsLeague : undefined}
          advanceLabel={currentChampionsStage?.advanceLabel}
          summaryLabel={championsLeagueSummary}
          extraContent={championsExtraContent}
        />
      )}

      {championsLeagueWon && (
        <TrophyOverlay
          title={`${getClubById(championsLeagueRun!.playerClubId).name} wins Champions League`}
          season={championsLeagueRun!.seasonLabel}
        />
      )}

      {gameState === GameStatus.KICKOFF && (
        <div className="absolute top-32 left-0 w-full text-center pointer-events-none z-30">
          <div className="inline-block bg-black/60 text-white font-sport text-2xl px-6 py-2 rounded-full animate-pulse border border-green-500">
            {score.restartLabel || (lanRole === 'guest' ? 'HOST WILL START THE PLAY' : 'PRESS PASS OR SHOOT TO RESTART')}
          </div>
        </div>
      )}

      {(gameState === GameStatus.PLAYING || gameState === GameStatus.KICKOFF || gameState === GameStatus.GOAL || gameState === GameStatus.PAUSED || gameState === GameStatus.HALFTIME || gameState === GameStatus.PENALTY) && (
        <HUD
          score={score}
          gameMode={gameMode}
          tournamentInfo={championsLeagueRun ? {
            stageLabel: currentChampionsStage?.menuTitle || 'Champions League',
            legLabel: championsLeagueRun.currentTie ? `LEG ${championsLeagueRun.currentTie.leg}` : undefined,
            firstLegScore: firstLegScoreLabel,
            aggregateScore: aggregateScoreLabel,
          } : null}
        />
      )}
    </div>
  );
};

export default GameCanvas;
