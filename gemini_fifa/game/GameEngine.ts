import { Ball, Player } from './Entities';
import { Vector2D } from '../utils/Vector2D';
import { Team, GameStatus, InputState } from '../types';
import {
  PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS, BALL_RADIUS,
  PLAYER_KICK_FORCE, PLAYER_PASS_FORCE, GOAL_WIDTH, 
  PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT,
  PITCH_HEIGHT as H, PITCH_WIDTH as W
} from '../constants';

export class GameEngine {
  ball: Ball;
  players: Player[];
  status: GameStatus;
  score: { home: number; away: number };
  time: number; // in seconds
  activePlayerIndex: number; // Index of controlled player in players array
  
  private lastGoalTime: number = 0;
  private nextKickOffTeam: Team = Team.HOME;
  private lastPassInput: boolean = false; // To debounce pass key
  private aiKickOffTimer: number = 0; // Delay for AI kick off

  constructor() {
    this.ball = new Ball();
    this.players = [];
    this.status = GameStatus.MENU;
    this.score = { home: 0, away: 0 };
    this.time = 0;
    this.activePlayerIndex = -1;
    this.initTeams();
  }

  initTeams() {
    this.players = [];
    
    // HOME TEAM (Left side, attacking Right)
    // Indices: 0-GK, 1-DEF, 2-DEF, 3-MID, 4-FWD, 5-FWD
    this.players.push(new Player(100, H/2, Team.HOME, 1, 'GK'));
    this.players.push(new Player(400, H/2 - 200, Team.HOME, 4, 'DEF'));
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

    // Set initial active player (Home FWD #10 is index 4)
    this.activePlayerIndex = 4;
    this.players[this.activePlayerIndex].isControlled = true;
  }

  startGame() {
    this.score = { home: 0, away: 0 };
    this.time = 0;
    this.nextKickOffTeam = Team.HOME; // Start with Home kickoff
    this.resetPositions(this.nextKickOffTeam);
  }

  resetPositions(kickOffTeam: Team) {
    this.ball.reset();
    this.players.forEach(p => p.reset());

    // START IN KICKOFF STATE
    this.status = GameStatus.KICKOFF;
    this.aiKickOffTimer = 0;

    // Define Base Formations (x, y)
    const baseFormation = {
        GK: { x: 100, y: H/2 },
        DEF_top: { x: 400, y: H/2 - 200 },
        DEF_bot: { x: 400, y: H/2 + 200 },
        MID: { x: 700, y: H/2 },
        FWD_top: { x: 900, y: H/2 - 50 },
        FWD_bot: { x: 900, y: H/2 + 50 } 
    };

    const mirrorX = (x: number) => W - x;

    // --- HOME TEAM POSITIONING ---
    this.players[0].startPos = new Vector2D(baseFormation.GK.x, baseFormation.GK.y);
    this.players[1].startPos = new Vector2D(baseFormation.DEF_top.x, baseFormation.DEF_top.y);
    this.players[2].startPos = new Vector2D(baseFormation.DEF_bot.x, baseFormation.DEF_bot.y);
    this.players[3].startPos = new Vector2D(baseFormation.MID.x, baseFormation.MID.y);

    if (kickOffTeam === Team.HOME) {
        // Home Kickoff: Two FWDs in center circle
        this.players[4].startPos = new Vector2D(W/2, H/2); // Center Dot
        this.players[5].startPos = new Vector2D(W/2, H/2 + 60); // Nearby for pass
        
        this.ball.owner = this.players[4];
        this.setActivePlayer(this.players[4]);
    } else {
        // Away Kickoff: Home FWDs back in own half
        this.players[4].startPos = new Vector2D(baseFormation.FWD_top.x, baseFormation.FWD_top.y);
        this.players[5].startPos = new Vector2D(baseFormation.FWD_bot.x, baseFormation.FWD_bot.y);
        this.setActivePlayer(this.players[4]); 
    }

    // Apply startPos
    for(let i=0; i<6; i++) {
        this.players[i].pos = this.players[i].startPos.copy();
        this.players[i].facingAngle = 0; // Face Right
        this.players[i].vel = new Vector2D(0,0);
    }

    // --- AWAY TEAM POSITIONING ---
    this.players[6].startPos = new Vector2D(mirrorX(baseFormation.GK.x), baseFormation.GK.y);
    this.players[7].startPos = new Vector2D(mirrorX(baseFormation.DEF_top.x), baseFormation.DEF_top.y);
    this.players[8].startPos = new Vector2D(mirrorX(baseFormation.DEF_bot.x), baseFormation.DEF_bot.y);
    this.players[9].startPos = new Vector2D(mirrorX(baseFormation.MID.x), baseFormation.MID.y);

    if (kickOffTeam === Team.AWAY) {
        // Away Kickoff
        this.players[10].startPos = new Vector2D(W/2, H/2); // Center Dot
        this.players[11].startPos = new Vector2D(W/2, H/2 + 60);
        
        this.ball.owner = this.players[10];
    } else {
        // Home Kickoff
        this.players[10].startPos = new Vector2D(mirrorX(baseFormation.FWD_top.x), baseFormation.FWD_top.y);
        this.players[11].startPos = new Vector2D(mirrorX(baseFormation.FWD_bot.x), baseFormation.FWD_bot.y);
    }

    // Apply startPos
    for(let i=6; i<12; i++) {
        this.players[i].pos = this.players[i].startPos.copy();
        this.players[i].facingAngle = Math.PI; // Face Left
        this.players[i].vel = new Vector2D(0,0);
    }
  }

  setActivePlayer(p: Player) {
    const idx = this.players.indexOf(p);
    if (idx !== -1 && p.team === Team.HOME) {
        if (this.activePlayerIndex !== -1 && this.players[this.activePlayerIndex]) {
            this.players[this.activePlayerIndex].isControlled = false;
        }
        this.activePlayerIndex = idx;
        p.isControlled = true;
    }
  }

  switchActivePlayer() {
    const activePlayer = this.players[this.activePlayerIndex];
    if (this.ball.owner === activePlayer) return;

    // Find closest player to ball
    const closestIdx = this.getClosestPlayerToBall(Team.HOME);
    if (closestIdx !== -1 && closestIdx !== this.activePlayerIndex) {
        this.setActivePlayer(this.players[closestIdx]);
    }
  }

  // Helper to find closest player to ball for a specific team
  getClosestPlayerToBall(team: Team): number {
      let minDist = Infinity;
      let closestIdx = -1;
      this.players.forEach((p, idx) => {
          if (p.team === team) {
              const d = p.pos.dist(this.ball.pos);
              if (d < minDist) {
                  minDist = d;
                  closestIdx = idx;
              }
          }
      });
      return closestIdx;
  }

  update(input: InputState, dt: number) {
    // Debounce pass
    const isPassPressed = input.pass && !this.lastPassInput;
    this.lastPassInput = input.pass;

    if (this.status === GameStatus.GAME_OVER || this.status === GameStatus.MENU || this.status === GameStatus.PAUSED) {
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
            if (isPassPressed) {
                this.performKickOffPass(this.ball.owner);
            }
        } else if (this.ball.owner?.team === Team.AWAY) {
            this.aiKickOffTimer += dt; 
            if (this.aiKickOffTimer > 60) {
                 this.performKickOffPass(this.ball.owner);
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
        
        if (this.time >= 90 * 60) {
             this.status = GameStatus.GAME_OVER;
        }

        // 1. Identify "Chasers" (Closest player to ball for each team)
        const homeChaserIdx = this.getClosestPlayerToBall(Team.HOME);
        const awayChaserIdx = this.getClosestPlayerToBall(Team.AWAY);

        // 2. Handle Active Player (User)
        const activePlayer = this.players[this.activePlayerIndex];
        let inputDir = new Vector2D(0, 0);
        if (input.up) inputDir.y = -1;
        if (input.down) inputDir.y = 1;
        if (input.left) inputDir.x = -1;
        if (input.right) inputDir.x = 1;

        if (activePlayer) {
          activePlayer.update(inputDir, input.sprint, dt);
          if (this.ball.owner === activePlayer) {
            if (input.shoot && activePlayer.kickCooldown <= 0) {
              this.shootBall(activePlayer);
            } else if (isPassPressed && activePlayer.kickCooldown <= 0) {
              this.passBall(activePlayer, inputDir);
            }
          }
        }

        // 3. Update All Other Players (AI)
        this.players.forEach((p, idx) => {
          if (idx === this.activePlayerIndex) return; // Skip user controlled
          
          const isChaser = (p.team === Team.HOME && idx === homeChaserIdx) || 
                           (p.team === Team.AWAY && idx === awayChaserIdx);

          if (p.team === Team.HOME) {
            this.updateHomeAI(p, isChaser, dt);
          } else {
            this.updateAwayAI(p, isChaser, dt);
          }
        });

        // 4. Physics & Collisions
        this.updateBallPhysics(dt);
        this.handleCollisions();
        this.checkGoal();
        this.checkOutOfBounds();
    }
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
      }
  }

  shootBall(p: Player) {
    const isHome = p.team === Team.HOME;
    const goalPos = new Vector2D(isHome ? W : 0, H/2); 
    const shotDir = goalPos.sub(this.ball.pos).normalize();
    const noise = new Vector2D((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15);
    
    this.ball.owner = null;
    this.ball.vel = shotDir.add(noise).normalize().mult(PLAYER_KICK_FORCE);
    p.kickCooldown = 20;
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
      this.ball.owner = null;
      p.kickCooldown = 20;

      if (target) {
          const kickDir = (target as Player).pos.sub(this.ball.pos).normalize();
          this.ball.vel = kickDir.mult(PLAYER_PASS_FORCE);
      } else {
          this.ball.vel = fallbackDir.normalize().mult(PLAYER_PASS_FORCE);
      }
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
      // Calculate a position based on startPos but shifted by ball position to maintain formation
      let targetX = p.startPos.x;
      
      if (p.team === Team.HOME) {
          const shift = (this.ball.pos.x - p.startPos.x) * 0.5;
          targetX += shift;
          if (targetX < p.startPos.x - 200) targetX = p.startPos.x - 200;
          if (targetX > p.startPos.x + 400) targetX = p.startPos.x + 400;
      } else {
          const shift = (this.ball.pos.x - p.startPos.x) * 0.5;
          targetX += shift;
          if (targetX > p.startPos.x + 200) targetX = p.startPos.x + 200;
          if (targetX < p.startPos.x - 400) targetX = p.startPos.x - 400;
      }

      return new Vector2D(targetX, p.startPos.y);
  }

  updateHomeAI(p: Player, isChaser: boolean, dt: number) {
     let target = this.getStrategicPosition(p);
     const ballOwner = this.ball.owner;
     
     // GK Logic
     if (p.role === 'GK') {
         target = new Vector2D(p.startPos.x, this.ball.pos.y);
         if (target.y < H/2 - 150) target.y = H/2 - 150;
         if (target.y > H/2 + 150) target.y = H/2 + 150;
         if (target.x > PENALTY_AREA_WIDTH) target.x = PENALTY_AREA_WIDTH;
         this.moveAI(p, target, false, 1.0, false, dt);
         return;
     }

     if (ballOwner === null) {
         if (isChaser) target = this.ball.pos.copy();
     }
     else if (ballOwner.team === Team.HOME) {
         // Support logic
         if (p.role === 'FWD') target.x = ballOwner.pos.x + 300; 
         else if (p.role === 'MID') target.x = ballOwner.pos.x - 100;
     } 
     else {
         if (isChaser) target = this.ball.pos.copy(); // Press
         else {
             const goalPos = new Vector2D(0, H/2);
             const ballToGoal = goalPos.sub(this.ball.pos).mult(0.3);
             target = this.ball.pos.add(ballToGoal);
             target.y = (target.y + p.startPos.y) / 2; 
         }
     }
     
     this.moveAI(p, target, isChaser, 1.0, false, dt);
  }

  updateAwayAI(p: Player, isChaser: boolean, dt: number) {
    let target = this.getStrategicPosition(p);
    let sprint = false;

    // --- GK LOGIC (Strict Bounds) ---
    if (p.role === 'GK') {
        if (this.ball.owner === p) {
            this.executePass(p, null, new Vector2D(-1, 0)); 
            return;
        }
        target = new Vector2D(p.startPos.x, this.ball.pos.y);
        const minY = H/2 - GOAL_WIDTH/2 - 50;
        const maxY = H/2 + GOAL_WIDTH/2 + 50;
        if (target.y < minY) target.y = minY;
        if (target.y > maxY) target.y = maxY;
        const minX = W - PENALTY_AREA_WIDTH;
        if (target.x < minX) target.x = minX;
        this.moveAI(p, target, false, 1.0, false, dt);
        return;
    }

    // --- FIELD PLAYER LOGIC ---

    // 1. AI HAS BALL
    if (this.ball.owner === p) {
        p.decisionTimer -= dt;
        
        // --- 1. SHOOT FIRST (Aggressive Goal Seeking) ---
        // Away attacks Left (0), Home attacks Right (W)
        if (p.pos.x < 350 && Math.abs(p.pos.y - H/2) < 250 && p.kickCooldown <= 0) {
            this.shootBall(p);
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
                if (dist < 150 && opp.pos.x < p.pos.x) isBlockedFront = true;
            }
        });

        // Default: Dribble towards goal (Left)
        target = new Vector2D(0, H/2);
        
        // If holding ball less than X seconds AND not in immediate danger, Force Dribble
        if (possessionTime < forcedDribbleTime && closestEnemyDist > 80) {
            // Evasive Dribble: If someone is ahead, shift Y
            if (isBlockedFront) {
                target.y = p.pos.y < H/2 ? p.pos.y - 100 : p.pos.y + 100;
            }
            this.moveAI(p, target, true, 0.95, true, dt); // Sprint/Dribble
            return;
        }

        // --- 3. DECISION LOGIC (Pass vs Continue Dribble) ---
        if (p.decisionTimer <= 0) {
            // Only consider passing if BLOCKED or cornered
            if (isBlockedFront || closestEnemyDist < 60) {
                // Try to find a Forward Pass
                const bestTeammate = this.findBestPassCandidate(p);
                
                // Very low chance to pass even if valid, unless critical
                const passChance = isBlockedFront ? 0.3 : 0.05; 
                
                if (bestTeammate && Math.random() < passChance) {
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
            const dir = this.ball.pos.sub(p.pos).normalize();
            target = this.ball.pos.add(dir.mult(30)); 
            sprint = true;
        }
    }
    // 3. DEFENDING (Home has ball)
    else if (this.ball.owner.team === Team.HOME) {
        if (isChaser) {
            const dir = this.ball.pos.sub(p.pos).normalize();
            target = this.ball.pos.add(dir.mult(20));
            sprint = true;
        } else {
             target.x -= 100; // Contain
        }
    }
    // 4. ATTACKING SUPPORT (Teammate has ball)
    else if (this.ball.owner.team === Team.AWAY) {
         target.x = this.ball.owner.pos.x + (p.startPos.x - W/2); 
         if (Math.abs(p.pos.y - this.ball.owner.pos.y) < 100) {
             target.y = p.pos.y < H/2 ? p.pos.y - 150 : p.pos.y + 150;
         }
    }

    this.moveAI(p, target, sprint, 0.95, isChaser, dt);
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
              
              // Check blocked
              let lineBlocked = false;
              this.players.forEach(opp => {
                  if (opp.team !== p.team) {
                      if (opp.pos.dist(tm.pos) < 100) lineBlocked = true;
                  }
              });

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

          const actualSprint = sprint && speedFactor >= 1.0; 
          p.update(dir, actualSprint, dt);
          
          if (speedFactor < 1.0) p.vel = p.vel.mult(speedFactor);
      }
  }

  handleCollisions() {
    // Ball Collisions
    this.players.forEach(p => {
        const dist = p.pos.dist(this.ball.pos);
        if (dist < PLAYER_RADIUS + BALL_RADIUS + 5) {
            // Collect Loose Ball
            if (this.ball.owner === null) {
                if (p.kickCooldown <= 0) {
                    this.ball.owner = p;
                    // NEW: Set possession time
                    p.possessionStartTime = Date.now();
                    
                    if (p.team === Team.HOME) this.setActivePlayer(p);
                }
            } 
            // Steal
            else if (this.ball.owner !== p && this.ball.owner.team !== p.team) {
                if (p.kickCooldown <= 0) {
                    const victim = this.ball.owner;
                    // Steal!
                    this.ball.owner = p;
                    // NEW: Set possession time 
                    p.possessionStartTime = Date.now();

                    p.kickCooldown = 10;
                    victim.kickCooldown = 60; 
                    // Knockback victim
                    const knockback = victim.pos.sub(p.pos).normalize().mult(10);
                    victim.vel = victim.vel.add(knockback);
                    
                    if (p.team === Team.HOME) this.setActivePlayer(p);
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
        if (this.ball.pos.x < 0) {
            this.score.away++;
            this.nextKickOffTeam = Team.HOME;
            this.handleGoal();
        } else if (this.ball.pos.x > W) {
            this.score.home++;
            this.nextKickOffTeam = Team.AWAY;
            this.handleGoal();
        }
    }
  }

  handleGoal() {
      this.status = GameStatus.GOAL;
      this.lastGoalTime = Date.now();
      this.ball.owner = null;
      this.ball.vel = new Vector2D(0, 0);
  }

  checkOutOfBounds() {
      if (this.ball.pos.y < BALL_RADIUS) {
          this.ball.pos.y = BALL_RADIUS;
          this.ball.vel.y *= -0.8;
      }
      if (this.ball.pos.y > H - BALL_RADIUS) {
          this.ball.pos.y = H - BALL_RADIUS;
          this.ball.vel.y *= -0.8;
      }
      const goalTop = H/2 - GOAL_WIDTH/2;
      const goalBottom = H/2 + GOAL_WIDTH/2;
      const inGoalRange = this.ball.pos.y > goalTop && this.ball.pos.y < goalBottom;
      if (!inGoalRange) {
          if (this.ball.pos.x < BALL_RADIUS) {
              this.ball.pos.x = BALL_RADIUS;
              this.ball.vel.x *= -0.8;
          }
          if (this.ball.pos.x > W - BALL_RADIUS) {
              this.ball.pos.x = W - BALL_RADIUS;
              this.ball.vel.x *= -0.8;
          }
      }
  }
}