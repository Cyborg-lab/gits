import { GameEngine } from './GameEngine';
import {
  PITCH_WIDTH, PITCH_HEIGHT, GRASS_COLOR_1, GRASS_COLOR_2, LINE_COLOR,
  PLAYER_RADIUS, BALL_RADIUS, HOME_KIT_PRIMARY, HOME_KIT_SECONDARY, AWAY_KIT_PRIMARY, AWAY_KIT_SECONDARY, SKIN_COLOR,
  GOAL_WIDTH, PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT
} from '../constants';
import { StadiumKey, Team, GameStatus } from '../types';
import { Vector2D } from '../utils/Vector2D';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  camera: Vector2D;
  grassPattern: CanvasPattern | null = null;
  offscreenCanvas: HTMLCanvasElement;
  stadium: StadiumKey = 'METRO_DOME';
  zoom = 1.08;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    this.camera = new Vector2D(0, 0);
    this.offscreenCanvas = document.createElement('canvas');
    this.generateGrassTexture();
  }

  generateGrassTexture() {
    // Create a noise texture for grass
    const size = 256;
    this.offscreenCanvas.width = size;
    this.offscreenCanvas.height = size;
    const ctx = this.offscreenCanvas.getContext('2d')!;

    // Base fill
    ctx.fillStyle = GRASS_COLOR_1;
    ctx.fillRect(0, 0, size, size);

    // Noise
    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 1 + Math.random() * 2;
        const h = 1 + Math.random() * 2;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        ctx.fillRect(x, y, w, h);
    }
    
    this.grassPattern = this.ctx.createPattern(this.offscreenCanvas, 'repeat');
  }

  render(game: GameEngine) {
    this.stadium = game.stadium;
    // 1. Update Camera
    this.updateCamera(game.ball.pos);

    // 2. Clear & Transform
    this.ctx.fillStyle = '#0f172a'; // Dark background outside pitch
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.canvas.width / 2 - this.camera.x, -this.canvas.height / 2 - this.camera.y);

    // 3. Draw Pitch
    this.drawPitch();

    // 4. Draw Entities
    // Sort players by Y to simulate depth
    const sortedPlayers = [...game.players].sort((a, b) => a.pos.y - b.pos.y);
    
    sortedPlayers.forEach(p => this.drawPlayer(p, game));
    this.drawBall(game);

    this.ctx.restore();
  }

  updateCamera(target: Vector2D) {
    const viewportWidth = this.canvas.width / this.zoom;
    const viewportHeight = this.canvas.height / this.zoom;
    const targetX = target.x - viewportWidth / 2;
    const targetY = target.y - viewportHeight / 2;
    this.camera.x += (targetX - this.camera.x) * 0.1; // Smooth follow
    this.camera.y += (targetY - this.camera.y) * 0.1;

    // Soft bounds
    const margin = 100;
    if (this.camera.x < -margin) this.camera.x = -margin;
    if (this.camera.y < -margin) this.camera.y = -margin;
    if (this.camera.x > PITCH_WIDTH + margin - viewportWidth) this.camera.x = PITCH_WIDTH + margin - viewportWidth;
    if (this.camera.y > PITCH_HEIGHT + margin - viewportHeight) this.camera.y = PITCH_HEIGHT + margin - viewportHeight;
  }

  drawPitch() {
    const stadiumTheme = {
      METRO_DOME: { grass1: '#2f7a32', grass2: '#3b933f', wall: '#0f172a' },
      SUNSET_ARENA: { grass1: '#477a26', grass2: '#5f9231', wall: '#5b2d0f' },
      ALPINE_PARK: { grass1: '#246b45', grass2: '#2f8a5c', wall: '#10243a' },
    }[this.stadium];
    // 1. Grass Base
    if (this.grassPattern) {
        this.ctx.fillStyle = stadiumTheme.wall;
        this.ctx.fillRect(-140, -140, PITCH_WIDTH + 280, PITCH_HEIGHT + 280);
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    }

    // 2. Mowing Patterns (Stripes)
    this.ctx.fillStyle = stadiumTheme.grass2;
    this.ctx.globalAlpha = 0.24;
    const stripeWidth = 120;
    for (let x = 0; x < PITCH_WIDTH; x += stripeWidth * 2) {
        this.ctx.fillRect(x, 0, stripeWidth, PITCH_HEIGHT);
    }
    this.ctx.globalAlpha = 1;

    // 3. Lines
    this.ctx.strokeStyle = LINE_COLOR;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
    this.ctx.shadowBlur = 4;
    this.ctx.strokeRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);

    // Center Line
    this.ctx.beginPath();
    this.ctx.moveTo(PITCH_WIDTH / 2, 0);
    this.ctx.lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT);
    this.ctx.stroke();

    // Center Circle
    this.ctx.beginPath();
    this.ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 100, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Center Dot
    this.ctx.fillStyle = LINE_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Penalty Areas
    const drawBox = (x: number, y: number, w: number, h: number) => {
        this.ctx.strokeRect(x, y, w, h);
    };

    // Left Area
    drawBox(0, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT * 2) / 2, PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT * 2);
    drawBox(0, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT) / 2, PENALTY_AREA_WIDTH / 2, PENALTY_AREA_HEIGHT); // 6 yard box approximation
    
    // Right Area
    drawBox(PITCH_WIDTH - PENALTY_AREA_WIDTH, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT * 2) / 2, PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT * 2);
    drawBox(PITCH_WIDTH - (PENALTY_AREA_WIDTH/2), (PITCH_HEIGHT - PENALTY_AREA_HEIGHT) / 2, PENALTY_AREA_WIDTH/2, PENALTY_AREA_HEIGHT);

    this.ctx.shadowBlur = 0; // Reset shadow

    // Goals (Net effect)
    this.ctx.fillStyle = 'rgba(230, 230, 230, 0.2)';
    this.ctx.strokeStyle = '#888';
    this.ctx.lineWidth = 1;
    
    const drawGoal = (x: number, y: number, w: number, h: number) => {
        // Net pattern
        this.ctx.beginPath();
        for(let i=x; i<x+w; i+=10) { this.ctx.moveTo(i, y); this.ctx.lineTo(i, y+h); }
        for(let j=y; j<y+h; j+=10) { this.ctx.moveTo(x, j); this.ctx.lineTo(x+w, j); }
        this.ctx.stroke();
        this.ctx.fillRect(x, y, w, h);
        // Posts
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x, y, w, h);
    };

    drawGoal(-60, PITCH_HEIGHT/2 - GOAL_WIDTH/2, 60, GOAL_WIDTH);
    drawGoal(PITCH_WIDTH, PITCH_HEIGHT/2 - GOAL_WIDTH/2, 60, GOAL_WIDTH);
  }

  drawPlayer(p: any, game: GameEngine) {
    const isHome = p.team === Team.HOME;
    const primaryColor = isHome ? HOME_KIT_PRIMARY : AWAY_KIT_PRIMARY;
    const secondaryColor = isHome ? HOME_KIT_SECONDARY : AWAY_KIT_SECONDARY;
    
    // 1. Shadow (Soft, offset)
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.beginPath();
    this.ctx.ellipse(p.pos.x, p.pos.y + 12, PLAYER_RADIUS * 1.2, PLAYER_RADIUS * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Active Indicator (FIFA Triangle)
    if (p.isControlled) {
        this.ctx.fillStyle = p.team === Team.HOME ? '#ef4444' : '#3b82f6'; // Match team color
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        
        // Triangle above head
        const triY = p.pos.y - PLAYER_RADIUS - 20;
        this.ctx.beginPath();
        this.ctx.moveTo(p.pos.x, triY + 10);
        this.ctx.lineTo(p.pos.x - 8, triY);
        this.ctx.lineTo(p.pos.x + 8, triY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Ring at feet
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    // 3. Body (Jersey with gradient for 3D look)
    const gradient = this.ctx.createRadialGradient(p.pos.x - 5, p.pos.y - 5, 2, p.pos.x, p.pos.y, PLAYER_RADIUS);
    if (p.role === 'GK') {
        gradient.addColorStop(0, '#fcd34d');
        gradient.addColorStop(1, '#d97706');
    } else {
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);
    }
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    // 4. Shoulder Details (Stripes)
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS, Math.PI * 1.2, Math.PI * 1.8);
    this.ctx.fill();

    // 5. Head
    this.ctx.fillStyle = SKIN_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS * 0.45, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Hair
    this.ctx.fillStyle = '#262626';
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS * 0.45, Math.PI, Math.PI * 2);
    this.ctx.fill();

    // 6. Number
    this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
    this.ctx.font = `bold 14px "Rajdhani"`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(p.number.toString(), p.pos.x, p.pos.y + 8);

    // 6.5 Player name
    this.ctx.fillStyle = 'rgba(255,255,255,0.92)';
    this.ctx.font = `bold 11px "Rajdhani"`;
    this.ctx.fillText(p.name || 'Player', p.pos.x, p.pos.y + PLAYER_RADIUS + 14);

    // 7. Stamina Ring (Subtle)
    if (p.isControlled && p.stamina < 100) {
        this.ctx.strokeStyle = p.stamina > 30 ? '#22c55e' : '#ef4444';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS + 4, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * (p.stamina/100)));
        this.ctx.stroke();
    }
  }

  drawBall(game: GameEngine) {
      const b = game.ball;
      
      // Shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.beginPath();
      this.ctx.ellipse(b.pos.x + 2, b.pos.y + 4, BALL_RADIUS, BALL_RADIUS * 0.6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Ball Body (White)
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(b.pos.x, b.pos.y, BALL_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();

      // Simple Pattern (Hexagon-ish, static rotation for stability)
      this.ctx.fillStyle = '#1e293b'; 
      this.ctx.beginPath();
      
      // Draw a fixed pattern that doesn't jitter based on position
      // Just a simple "Adidas Telstar" look (center pentagon + radiating lines)
      const r = BALL_RADIUS;
      
      // Center pentagon
      for(let i=0; i<5; i++) {
          const ang = (i * (Math.PI * 2 / 5)) - Math.PI/2;
          const px = b.pos.x + Math.cos(ang) * (r * 0.4);
          const py = b.pos.y + Math.sin(ang) * (r * 0.4);
          if (i===0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Outer patches
      for(let i=0; i<5; i++) {
        const ang = (i * (Math.PI * 2 / 5)) - Math.PI/2;
        const px = b.pos.x + Math.cos(ang) * r;
        const py = b.pos.y + Math.sin(ang) * r;
        
        this.ctx.beginPath();
        this.ctx.arc(px, py, r*0.3, 0, Math.PI*2);
        this.ctx.fill();
      }
      
      // Shine
      this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
      this.ctx.beginPath();
      this.ctx.arc(b.pos.x - 3, b.pos.y - 3, r * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
  }
}
