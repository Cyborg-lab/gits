import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Renderer } from '../game/Renderer';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameStatus, InputState } from '../types';
import { HUD } from './HUD';
import { MainMenu, PauseMenu, GoalOverlay, GameOverMenu } from './Menus';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputState>({
    up: false, down: false, left: false, right: false,
    shoot: false, pass: false, sprint: false
  });

  const [gameState, setGameState] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState({ home: 0, away: 0, time: 0 });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial
    
    // Init Renderer
    if (canvasRef.current) {
        rendererRef.current = new Renderer(canvasRef.current);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Input Events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling for game keys
      if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch(e.code) {
        case 'KeyW': inputRef.current.up = true; break;
        case 'KeyS': inputRef.current.down = true; break;
        case 'KeyA': inputRef.current.left = true; break;
        case 'KeyD': inputRef.current.right = true; break;
        case 'ArrowUp': inputRef.current.up = true; break;
        case 'ArrowDown': inputRef.current.down = true; break;
        case 'ArrowLeft': inputRef.current.left = true; break;
        case 'ArrowRight': inputRef.current.right = true; break;
        case 'KeyX': inputRef.current.shoot = true; break;
        case 'Space': 
            inputRef.current.pass = true; 
            if (engineRef.current.status === GameStatus.PLAYING) {
                 // Check if we should switch player (only if we don't have the ball)
                 // The actual switch logic is inside engine.switchActivePlayer() which checks ball ownership
                 engineRef.current.switchActivePlayer();
            }
            break;
        case 'ShiftLeft': inputRef.current.sprint = true; break;
        case 'Escape': 
          setGameState(prev => {
            if (prev === GameStatus.PLAYING) return GameStatus.PAUSED;
            if (prev === GameStatus.PAUSED) return GameStatus.PLAYING;
            return prev;
          });
          engineRef.current.status = engineRef.current.status === GameStatus.PLAYING ? GameStatus.PAUSED : GameStatus.PLAYING;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': inputRef.current.up = false; break;
        case 'KeyS': inputRef.current.down = false; break;
        case 'KeyA': inputRef.current.left = false; break;
        case 'KeyD': inputRef.current.right = false; break;
        case 'ArrowUp': inputRef.current.up = false; break;
        case 'ArrowDown': inputRef.current.down = false; break;
        case 'ArrowLeft': inputRef.current.left = false; break;
        case 'ArrowRight': inputRef.current.right = false; break;
        case 'KeyX': inputRef.current.shoot = false; break;
        case 'Space': inputRef.current.pass = false; break;
        case 'ShiftLeft': inputRef.current.sprint = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game Loop
  const gameStep = useCallback((dt: number) => {
    const engine = engineRef.current;
    const renderer = rendererRef.current;

    // Update Logic
    engine.update(inputRef.current, dt);

    // Sync React State (Throttled ideally, but OK for now)
    if (Math.floor(engine.time) !== Math.floor(score.time) || 
        engine.score.home !== score.home || 
        engine.score.away !== score.away ||
        engine.status !== gameState) {
            
        setScore({
            home: engine.score.home,
            away: engine.score.away,
            time: engine.time
        });
        setGameState(engine.status);
    }

    // Render
    if (renderer) {
        renderer.render(engine);
    }
  }, [gameState, score]);

  useGameLoop(gameStep, gameState === GameStatus.PAUSED || gameState === GameStatus.MENU || gameState === GameStatus.GAME_OVER);

  const handleStart = () => {
    engineRef.current.startGame();
    setGameState(GameStatus.KICKOFF);
  };

  const handleResume = () => {
    engineRef.current.status = GameStatus.PLAYING;
    setGameState(GameStatus.PLAYING);
  };

  const handleRestart = () => {
    engineRef.current = new GameEngine(); // hard reset
    engineRef.current.startGame();
    setGameState(GameStatus.KICKOFF);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {gameState === GameStatus.MENU && <MainMenu onStart={handleStart} />}
      {gameState === GameStatus.PAUSED && <PauseMenu onResume={handleResume} />}
      {gameState === GameStatus.GOAL && <GoalOverlay />}
      {gameState === GameStatus.GAME_OVER && <GameOverMenu score={score} onRestart={handleRestart} />}
      
      {gameState === GameStatus.KICKOFF && (
         <div className="absolute top-32 left-0 w-full text-center pointer-events-none z-30">
             <div className="inline-block bg-black/60 text-white font-sport text-2xl px-6 py-2 rounded-full animate-pulse border border-green-500">
                 PRESS SPACE TO START
             </div>
         </div>
      )}

      {(gameState === GameStatus.PLAYING || gameState === GameStatus.KICKOFF || gameState === GameStatus.GOAL || gameState === GameStatus.PAUSED) && (
        <HUD score={score} />
      )}
    </div>
  );
};

export default GameCanvas;