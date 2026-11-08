import { Vector2D } from '../utils/Vector2D';
import { Team } from '../types';
import { 
  PLAYER_RADIUS, PLAYER_SPEED, PLAYER_SPRINT_SPEED, 
  STAMINA_DRAIN, STAMINA_REGEN, FRICTION, BALL_RADIUS,
  PITCH_WIDTH, PITCH_HEIGHT
} from '../constants';

export class Entity {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;

  constructor(x: number, y: number, radius: number) {
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(0, 0);
    this.radius = radius;
  }
}

export class Ball extends Entity {
  owner: Player | null = null; // Track who owns the ball

  constructor() {
    super(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, BALL_RADIUS);
  }

  update(dt: number) {
    // If owned, position is handled by the owner in GameEngine
    if (this.owner) return;

    // Apply Velocity with Delta Time
    this.pos = this.pos.add(this.vel.mult(dt));
    
    // Apply Friction (Scaled by dt)
    // pow(friction, dt) ensures consistent friction regardless of framerate
    this.vel = this.vel.mult(Math.pow(FRICTION, dt));

    if (this.vel.mag() < 0.1) {
      this.vel = new Vector2D(0, 0);
    }
  }

  reset() {
    this.pos = new Vector2D(PITCH_WIDTH / 2, PITCH_HEIGHT / 2);
    this.vel = new Vector2D(0, 0);
    this.owner = null;
  }
}

export class Player extends Entity {
  team: Team;
  number: number;
  name: string;
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
  startPos: Vector2D;
  stamina: number;
  isControlled: boolean;
  
  // Gameplay states
  kickCooldown: number;
  facingAngle: number; // For dribbling direction
  decisionTimer: number; // For AI decision delays
  possessionStartTime: number; // To force dribbling before passing
  tackleCooldown = 0;
  slideTimer = 0;
  isSentOff = false;
  diveTimer = 0;

  constructor(x: number, y: number, team: Team, number: number, role: 'GK' | 'DEF' | 'MID' | 'FWD', name: string = 'Player') {
    super(x, y, PLAYER_RADIUS);
    this.startPos = new Vector2D(x, y);
    this.team = team;
    this.number = number;
    this.name = name;
    this.role = role;
    this.stamina = 100;
    this.isControlled = false;
    this.kickCooldown = 0;
    this.facingAngle = 0;
    this.decisionTimer = 0;
    this.possessionStartTime = 0;
    this.tackleCooldown = 0;
    this.slideTimer = 0;
    this.isSentOff = false;
    this.diveTimer = 0;
  }

  reset() {
    this.pos = this.startPos.copy();
    this.vel = new Vector2D(0, 0);
    this.stamina = 100;
    this.kickCooldown = 0;
    this.facingAngle = 0;
    this.decisionTimer = 0;
    this.possessionStartTime = 0;
    this.tackleCooldown = 0;
    this.slideTimer = 0;
    this.diveTimer = 0;
  }

  update(inputTarget: Vector2D | null, isSprinting: boolean, dt: number) {
    let speed = isSprinting && this.stamina > 0 ? PLAYER_SPRINT_SPEED : PLAYER_SPEED;
    
    // Movement Logic
    if (inputTarget && inputTarget.mag() > 0) {
      // Input target is a direction vector for controlled player, or destination for AI
      const desiredVel = inputTarget.normalize().mult(speed);
      
      // Smooth acceleration
      const steer = desiredVel.sub(this.vel).limit(0.8 * dt);
      this.vel = this.vel.add(steer).limit(speed);

      // Update facing angle based on movement
      if (this.vel.mag() > 0.5) {
        this.facingAngle = Math.atan2(this.vel.y, this.vel.x);
      }
    } else {
      this.vel = this.vel.mult(Math.pow(0.85, dt)); // Decelerate if no input
    }

    // Apply Velocity with Delta Time
    this.pos = this.pos.add(this.vel.mult(dt));

    // Stamina logic
    if (isSprinting && this.vel.mag() > PLAYER_SPEED) {
      this.stamina = Math.max(0, this.stamina - (STAMINA_DRAIN * dt));
    } else {
      this.stamina = Math.min(100, this.stamina + (STAMINA_REGEN * dt));
    }

    if (this.kickCooldown > 0) this.kickCooldown -= dt;
    if (this.tackleCooldown > 0) this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);
    if (this.slideTimer > 0) this.slideTimer = Math.max(0, this.slideTimer - dt);
    if (this.diveTimer > 0) this.diveTimer = Math.max(0, this.diveTimer - dt);

    this.constrainToPitch();
  }

  constrainToPitch() {
    if (this.pos.x < 5) this.pos.x = 5;
    if (this.pos.x > PITCH_WIDTH - 5) this.pos.x = PITCH_WIDTH - 5;
    if (this.pos.y < 5) this.pos.y = 5;
    if (this.pos.y > PITCH_HEIGHT - 5) this.pos.y = PITCH_HEIGHT - 5;
  }
}
