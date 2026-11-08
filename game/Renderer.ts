import { GameEngine } from './GameEngine';
import { getClubById } from './clubs';
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
    this.stadium = (game as unknown as { stadium?: StadiumKey }).stadium || this.stadium;
    this.updateCamera(game.ball.pos);

    this.ctx.fillStyle = '#030b17';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = true;

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.canvas.width / 2 - this.camera.x, -this.canvas.height / 2 - this.camera.y);

    this.drawPitch();
    this.drawStadium(game);

    const sortedPlayers = [...game.players].sort((a, b) => a.pos.y - b.pos.y);
    sortedPlayers.forEach(p => this.drawPlayer(p, game));
    this.drawOfficials(game);
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
    const margin = 230;
    if (this.camera.x < -margin) this.camera.x = -margin;
    if (this.camera.y < -margin) this.camera.y = -margin;
    if (this.camera.x > PITCH_WIDTH + margin - viewportWidth) this.camera.x = PITCH_WIDTH + margin - viewportWidth;
    if (this.camera.y > PITCH_HEIGHT + margin - viewportHeight) this.camera.y = PITCH_HEIGHT + margin - viewportHeight;
  }

  private drawClubSectorBanners(homeClub: { shortName: string; badgeColors?: [string, string] }, awayClub: { shortName: string; badgeColors?: [string, string] }, time: number) {
    const ctx = this.ctx;
    const wave = Math.sin(time * 2.4) * 7;
    const makeBanner = (x: number, y: number, palette: [string, string], label: string, isLeft = false) => {
      const w = 92;
      const h = 42;
      ctx.save();
      ctx.translate(x, y + wave);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
      ctx.fillStyle = palette[0];
      ctx.fillRect(6, 6, 22, h - 12);
      ctx.fillStyle = palette[1];
      ctx.fillRect(34, 6, w - 40, h - 12);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, isLeft ? 58 : 60, 26);
      ctx.textAlign = 'left';
      ctx.restore();
    };

    for (let i = 0; i < 4; i++) {
      const leftY = -120 + i * 80;
      const rightY = -120 + i * 80;
      makeBanner(-125, leftY, homeClub.badgeColors || ['#ef4444', '#f8fafc'], homeClub.shortName, true);
      makeBanner(PITCH_WIDTH + 33, rightY, awayClub.badgeColors || ['#2563eb', '#f8fafc'], awayClub.shortName, false);
    }
  }

  private drawFloodlightArches(time: number) {
    const ctx = this.ctx;
    const glow = Math.sin(time * 2.1) * 20;
    const archPositions = [80, 220, 360, 500, 640, 780, 920, 1060];

    archPositions.forEach((x) => {
      const poleTop = -160;
      const range = 140 + glow;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, -35);
      ctx.lineTo(x, poleTop);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 24, poleTop);
      ctx.lineTo(x + 24, poleTop);
      ctx.lineTo(x + 48, -35);
      ctx.lineTo(x - 48, -35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const lightGlow = ctx.createRadialGradient(x, -60, 8, x, -60, range);
      lightGlow.addColorStop(0, 'rgba(255,255,230,0.55)');
      lightGlow.addColorStop(0.35, 'rgba(255,255,200,0.22)');
      lightGlow.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = lightGlow;
      ctx.fillRect(x - range, -60 - range, range * 2, range * 2);
      ctx.restore();
    });
  }

  private drawEndClubWalls(homeClub: { shortName: string; badgeColors?: [string, string] }, awayClub: { shortName: string; badgeColors?: [string, string] }, time: number) {
    const ctx = this.ctx;
    const pulse = Math.sin(time * 3.4) * 6;
    const drawWall = (x: number, palette: [string, string], label: string) => {
      const wallWidth = 100;
      const wallHeight = PITCH_HEIGHT - 120;
      const wallY = 60;
      ctx.save();
      ctx.translate(x, wallY + pulse);
      ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
      ctx.fillRect(0, 0, wallWidth, wallHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, wallWidth, wallHeight);
      ctx.fillStyle = palette[0];
      ctx.fillRect(8, 12, wallWidth - 16, 18);
      ctx.fillStyle = palette[1];
      ctx.fillRect(8, 36, wallWidth - 16, wallHeight - 48);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, wallWidth / 2, wallHeight / 2 + 6);
      ctx.restore();
    };

    drawWall(-100, homeClub.badgeColors || ['#ef4444', '#f8fafc'], homeClub.shortName);
    drawWall(PITCH_WIDTH - 0, awayClub.badgeColors || ['#2563eb', '#f8fafc'], awayClub.shortName);
  }

  drawStadium(game: GameEngine) {
    const ctx = this.ctx;
    const time = performance.now() / 1000;
    const event = (game as unknown as { matchEvent?: string }).matchEvent || (game as unknown as { score: { matchEvent?: string } }).score.matchEvent;
    const reaction = event?.includes('GOAL') ? 'cheer' : event?.includes('OFFSIDE') || event?.includes('FOUL') ? 'react' : 'calm';
    const viewWidth = this.canvas.width / this.zoom; const viewHeight = this.canvas.height / this.zoom;
    const left = this.camera.x - 30; const right = this.camera.x + viewWidth + 30;
    const top = this.camera.y - 30; const bottom = this.camera.y + viewHeight + 30;
    const homeClub = getClubById((game as unknown as { matchSetup?: { home?: { clubId?: string } } }).matchSetup?.home?.clubId || 'real-madrid');
    const awayClub = getClubById((game as unknown as { matchSetup?: { away?: { clubId?: string } } }).matchSetup?.away?.clubId || 'man-city');
    const homeColors = homeClub.badgeColors || ['#ef4444', '#f8fafc'];
    const awayColors = awayClub.badgeColors || ['#2563eb', '#f8fafc'];

    ctx.save();
    const stand = ctx.createLinearGradient(0, -260, 0, PITCH_HEIGHT + 260);
    stand.addColorStop(0, '#1e293b');
    stand.addColorStop(0.12, '#0f172a');
    stand.addColorStop(0.28, '#1d4ed8');
    stand.addColorStop(0.5, '#0f172a');
    stand.addColorStop(0.72, '#1e293b');
    stand.addColorStop(1, '#111827');
    ctx.fillStyle = stand;
    ctx.fillRect(-180, -260, PITCH_WIDTH + 360, 185);
    ctx.fillRect(-180, PITCH_HEIGHT + 75, PITCH_WIDTH + 360, 185);
    ctx.fillRect(-250, -120, 170, PITCH_HEIGHT + 240);
    ctx.fillRect(PITCH_WIDTH + 80, -120, 170, PITCH_HEIGHT + 240);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
    for (let tier = 0; tier < 4; tier += 1) {
      const y = -235 + tier * 52;
      const height = tier === 3 ? 38 : 28;
      ctx.fillRect(-150, y, PITCH_WIDTH + 300, height);
      ctx.fillRect(-150, PITCH_HEIGHT + 82 + tier * 52, PITCH_WIDTH + 300, height);
    }

    this.drawFloodlightArches(time);
    this.drawClubSectorBanners(homeClub, awayClub, time);
    this.drawEndClubWalls(homeClub, awayClub, time);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    for (let row = 0; row < 3; row += 1) {
      for (const y of [-218 + row * 48, PITCH_HEIGHT + 92 + row * 48]) {
        if (y > top - 20 && y < bottom + 20) ctx.fillRect(Math.max(-150, left), y, Math.min(PITCH_WIDTH + 150, right) - Math.max(-150, left), 4);
      }
      for (let x = Math.max(-130, Math.floor(left / 18) * 18); x < Math.min(PITCH_WIDTH + 130, right); x += 18) {
        for (const rowY of [-210 + row * 48, PITCH_HEIGHT + 82 + row * 48]) {
          if (rowY < top - 20 || rowY > bottom + 20) continue;
          this.drawSupporter(x, rowY, x / 18 + row * 37 + (rowY > PITCH_HEIGHT ? 71 : 0), time, reaction, false, homeColors, awayColors);
        }
      }
      for (let y = Math.max(-45, Math.floor(top / 18) * 18); y < Math.min(PITCH_HEIGHT + 45, bottom); y += 18) {
        for (const baseX of [-195, PITCH_WIDTH + 92]) {
          const x = baseX + row * 45;
          if (x < left - 18 || x > right + 18) continue;
          this.drawSupporter(x, y, y / 18 + row * 29, time, reaction, true, homeColors, awayColors);
        }
      }
    }

    ctx.globalAlpha = 0.72;
    const sectorBannerY = -148;
    for (let i = 0; i < 5; i++) {
      const bannerX = i * 210 + 12;
      const bannerW = 170;
      const bannerH = 28;
      const palette = i % 2 === 0 ? homeColors : awayColors;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(bannerX, sectorBannerY, bannerW, bannerH);
      ctx.fillStyle = palette[0];
      ctx.fillRect(bannerX + 2, sectorBannerY + 2, 34, bannerH - 4);
      ctx.fillStyle = palette[1];
      ctx.fillRect(bannerX + 40, sectorBannerY + 2, bannerW - 44, bannerH - 4);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Rajdhani, sans-serif';
      ctx.fillText(i % 2 === 0 ? homeClub.shortName : awayClub.shortName, bannerX + 52, sectorBannerY + 18);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.18)';
    ctx.fillRect(0, -12, PITCH_WIDTH, 12);
    ctx.fillRect(0, PITCH_HEIGHT + 1, PITCH_WIDTH, 12);

    for (const [x, y] of [[80, 80], [PITCH_WIDTH - 80, 80], [80, PITCH_HEIGHT - 80], [PITCH_WIDTH - 80, PITCH_HEIGHT - 80]]) {
      const glow = ctx.createRadialGradient(x, y, 12, x, y, 260);
      glow.addColorStop(0, 'rgba(255,255,220,0.14)');
      glow.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 260, y - 260, 520, 520);
    }
    this.drawStadiumScoreboard(game);
    ctx.restore();
  }

  drawSupporter(x: number, y: number, seed: number, time: number, reaction: 'calm' | 'react' | 'cheer', sideStand = false, homeColors: [string, string] = ['#ef4444', '#f8fafc'], awayColors: [string, string] = ['#2563eb', '#f8fafc']) {
    const ctx = this.ctx;
    const kits = [...homeColors, ...awayColors, '#f59e0b', '#16a34a', '#a855f7', '#fb7185'];
    const skin = ['#f2c9a5', '#d9a47f', '#8d5b43', '#f3d2b1'];
    const index = Math.abs(Math.floor(seed * 13)) % kits.length;
    const shirt = kits[index]; const head = skin[Math.abs(Math.floor(seed * 7)) % skin.length];
    const waveSync = Math.sin(time * (reaction === 'cheer' ? 10 : 5) + seed * 8 + (sideStand ? 1.4 : 0)) * (reaction === 'cheer' ? 6 : reaction === 'react' ? 3 : 1.5);
    const bob = waveSync + Math.sin(time * (reaction === 'cheer' ? 9 : 3.5) + seed) * (reaction === 'cheer' ? 4 : reaction === 'react' ? 2 : 0.8);
    const waving = reaction === 'cheer' || Math.sin(time * 2 + seed) > 0.62;
    const flag = Math.abs(Math.floor(seed * 19)) % 17 === 0;
    const posterFan = Math.abs(Math.floor(seed * 29)) % 11 === 0;
    const posterText = ['HOME', 'AWAY', 'GOAL', 'CITY', 'ULTRA', 'MATCHDAY'][Math.abs(Math.floor(seed * 11)) % 6];
    const bannerTone = (Math.abs(Math.floor(seed * 7)) % 2 === 0) ? homeColors : awayColors;

    ctx.save();
    if (sideStand) { ctx.translate(x, y); ctx.rotate(-Math.PI / 2); x = 0; y = 0; }
    ctx.fillStyle = '#64748b'; ctx.fillRect(x - 7, y + 9 + bob, 14, 3);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 2, y + 6 + bob); ctx.lineTo(x - 3, y + 11 + bob); ctx.moveTo(x + 2, y + 6 + bob); ctx.lineTo(x + 4, y + 11 + bob); ctx.stroke();
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.roundRect(x - 5, y - 1 + bob, 10, 10, 3); ctx.fill();
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(x, y - 5 + bob, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = index % 2 ? '#f8fafc' : '#facc15'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 1 + bob); ctx.lineTo(x, y + 3 + bob); ctx.lineTo(x + 5, y + 1 + bob); ctx.stroke();
    const armLift = waving ? -9 - Math.abs(Math.sin(time * 5 + seed)) * 5 : 1;
    ctx.strokeStyle = head; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 4, y + bob); ctx.lineTo(x - 8, y + armLift + bob);
    ctx.moveTo(x + 4, y + bob); ctx.lineTo(x + 8, y + (flag ? armLift - 3 : 1) + bob); ctx.stroke();
    if (flag) {
      const flagTop = y + armLift - 11 + Math.sin(time * 8 + seed) * 3 + bob;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 8, y + armLift + bob); ctx.lineTo(x + 8, flagTop + 3); ctx.stroke();
      ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(x + 9, flagTop); ctx.lineTo(x + 18 + Math.sin(time * 8 + seed) * 2, flagTop + 3); ctx.lineTo(x + 9, flagTop + 7); ctx.closePath(); ctx.fill();
    }
    if (posterFan) {
      const posterX = x + (sideStand ? 15 : 18);
      const posterY = y - 16 + bob;
      const posterW = sideStand ? 26 : 28;
      const posterH = 18;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.fillRect(posterX, posterY, posterW, posterH);
      ctx.strokeStyle = bannerTone[0];
      ctx.lineWidth = 2;
      ctx.strokeRect(posterX, posterY, posterW, posterH);
      ctx.fillStyle = bannerTone[0];
      ctx.fillRect(posterX + 2, posterY + 2, 8, posterH - 4);
      ctx.fillStyle = bannerTone[1];
      ctx.fillRect(posterX + 12, posterY + 2, posterW - 14, posterH - 4);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 7px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(posterText, posterX + posterW / 2, posterY + 11);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  drawStadiumScoreboard(game: GameEngine) {
    const ctx = this.ctx;
    const syncScore = (game as unknown as { score: { home: number; away: number; time?: number; period?: string; homeLabel?: string; awayLabel?: string; cardsHome?: { yellow: number; red: number }; cardsAway?: { yellow: number; red: number }; matchEvent?: string } }).score;
    const matchTime = syncScore.time ?? game.time;
    const cardState = (game as unknown as { cards?: Record<Team, { yellow: number; red: number }> }).cards;
    const homeCards = cardState?.[Team.HOME] || syncScore.cardsHome || { yellow: 0, red: 0 };
    const awayCards = cardState?.[Team.AWAY] || syncScore.cardsAway || { yellow: 0, red: 0 };
    const event = (game as unknown as { matchEvent?: string }).matchEvent || syncScore.matchEvent;
    const x = PITCH_WIDTH / 2 - 210; const y = -160;
    const glow = ctx.createLinearGradient(x, y, x, y + 110);
    glow.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    glow.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
    ctx.fillStyle = glow;
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, 420, 110);
    ctx.strokeRect(x, y, 420, 110);

    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 15px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    const labels = game as unknown as { homeLabel?: string; awayLabel?: string };
    ctx.fillText(`${labels.homeLabel || syncScore.homeLabel || 'HOME'}    ${labels.awayLabel || syncScore.awayLabel || 'AWAY'}`, PITCH_WIDTH / 2, y + 22);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px Rajdhani, sans-serif';
    ctx.fillText(`${game.score.home} - ${game.score.away}`, PITCH_WIDTH / 2, y + 60);
    const mins = Math.floor(matchTime / 60); const secs = Math.floor(matchTime % 60);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px Rajdhani, sans-serif';
    const half = syncScore.period || (matchTime < 45 * 60 ? '1ST HALF' : matchTime < 95 * 60 ? '2ND HALF' : 'EXTRA TIME');
    ctx.fillText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}   ${half}`, PITCH_WIDTH / 2, y + 82);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px Rajdhani, sans-serif';
    ctx.fillText(`Y ${homeCards.yellow}  R ${homeCards.red}      Y ${awayCards.yellow}  R ${awayCards.red}`, PITCH_WIDTH / 2, y + 100);
    if (event) {
      ctx.fillStyle = event.includes('OFFSIDE') ? '#facc15' : '#e2e8f0';
      ctx.font = 'bold 16px Rajdhani, sans-serif';
      ctx.fillText(event, PITCH_WIDTH / 2, y - 10);
    }
    ctx.textAlign = 'left';
  }

  drawOfficials(game: GameEngine) {
    const officials = (game as unknown as { officials?: { referee: { x: number; y: number }; assistants: Array<{ x: number; y: number }>; offsideFlag: boolean; event?: string } }).officials;
    const event = (game as unknown as { matchEvent?: string }).matchEvent || (game as unknown as { score: { matchEvent?: string } }).score.matchEvent;
    const referee = officials?.referee || game.refereePos;
    const assistants = officials?.assistants || game.assistantsPos;
    const time = performance.now() * 0.006;
    const drawPerson = (x: number, y: number, isAssistant = false) => {
      const bob = Math.sin(time * 4 + x * 0.08) * (isAssistant ? 1.2 : 1.8);
      const armSwing = Math.sin(time * 5 + y * 0.1) * 5;

      this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y + 11, 15, 7, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#facc15';
      this.ctx.beginPath();
      this.ctx.arc(x, y + bob, 9, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#111827';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 4, y + 12 + bob);
      this.ctx.lineTo(x - 7, y + 23 + bob);
      this.ctx.moveTo(x + 4, y + 12 + bob);
      this.ctx.lineTo(x + 7, y + 23 + bob);
      this.ctx.moveTo(x - 5, y + 8 + bob);
      this.ctx.lineTo(x - 14, y + 12 + armSwing + bob);
      this.ctx.moveTo(x + 5, y + 8 + bob);
      this.ctx.lineTo(x + 14, y + 12 - armSwing + bob);
      this.ctx.stroke();

      this.ctx.fillStyle = '#111827';
      this.ctx.fillRect(x - 6, y + 8 + bob, 12, 13);

      if (isAssistant) {
        const flagY = officials?.offsideFlag ? y - 17 : y + 25;
        this.ctx.strokeStyle = '#f8fafc';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 6, y + 12 + bob);
        this.ctx.lineTo(x + 18, flagY + bob);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.moveTo(x + 18, flagY + bob);
        this.ctx.lineTo(x + 29, flagY + 2 + bob);
        this.ctx.lineTo(x + 19, flagY + 8 + bob);
        this.ctx.fill();
      }
    };

    drawPerson(referee.x, referee.y);
    if (event?.includes('CARD')) {
      const cardColor = event.includes('RED') ? '#ef4444' : '#facc15';
      const cardWidth = 9;
      const cardHeight = 14;
      const bob = Math.sin(time * 10) * 2;
      this.ctx.fillStyle = cardColor;
      this.ctx.fillRect(referee.x + 11, referee.y - 30 + bob, cardWidth, cardHeight);
      this.ctx.strokeStyle = '#111827';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(referee.x + 11, referee.y - 30 + bob, cardWidth, cardHeight);
    }
    assistants.forEach(point => drawPerson(point.x, point.y, true));
  }

  drawPitch() {
    const stadiumTheme = {
      METRO_DOME: { grass1: '#2f7a32', grass2: '#3b933f', wall: '#0f172a' },
      SUNSET_ARENA: { grass1: '#477a26', grass2: '#5f9231', wall: '#5b2d0f' },
      ALPINE_PARK: { grass1: '#246b45', grass2: '#2f8a5c', wall: '#10243a' },
    }[this.stadium];

    if (this.grassPattern) {
      this.ctx.fillStyle = stadiumTheme.wall;
      this.ctx.fillRect(-150, -150, PITCH_WIDTH + 300, PITCH_HEIGHT + 300);
      this.ctx.fillStyle = this.grassPattern;
      this.ctx.fillRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    }

    this.ctx.fillStyle = stadiumTheme.grass2;
    this.ctx.globalAlpha = 0.24;
    for (let x = 0; x < PITCH_WIDTH; x += 76) {
      this.ctx.fillRect(x, 0, 38, PITCH_HEIGHT);
    }
    this.ctx.globalAlpha = 1;

    this.ctx.strokeStyle = LINE_COLOR;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = 'rgba(0,0,0,0.18)';
    this.ctx.shadowBlur = 5;
    this.ctx.strokeRect(0, 0, PITCH_WIDTH, PITCH_HEIGHT);
    this.ctx.beginPath();
    this.ctx.moveTo(PITCH_WIDTH / 2, 0);
    this.ctx.lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 100, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = LINE_COLOR;
    this.ctx.beginPath();
    this.ctx.arc(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 5, 0, Math.PI * 2);
    this.ctx.fill();

    const drawBox = (x: number, y: number, w: number, h: number) => {
      this.ctx.strokeRect(x, y, w, h);
    };
    drawBox(0, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT * 2) / 2, PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT * 2);
    drawBox(0, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT) / 2, PENALTY_AREA_WIDTH / 2, PENALTY_AREA_HEIGHT);
    drawBox(PITCH_WIDTH - PENALTY_AREA_WIDTH, (PITCH_HEIGHT - PENALTY_AREA_HEIGHT * 2) / 2, PENALTY_AREA_WIDTH, PENALTY_AREA_HEIGHT * 2);
    drawBox(PITCH_WIDTH - (PENALTY_AREA_WIDTH / 2), (PITCH_HEIGHT - PENALTY_AREA_HEIGHT) / 2, PENALTY_AREA_WIDTH / 2, PENALTY_AREA_HEIGHT);

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.ctx.strokeStyle = '#dfe7f0';
    this.ctx.lineWidth = 1.3;

    const drawGoal = (x: number, y: number, w: number, h: number) => {
      const visibleX = Math.max(0, x);
      const visibleW = Math.min(w, PITCH_WIDTH - visibleX);
      if (visibleW <= 0) return;

      this.ctx.fillRect(visibleX, y, visibleW, h);
      this.ctx.beginPath();
      for (let i = visibleX; i <= visibleX + visibleW; i += 10) {
          this.ctx.moveTo(i, y);
          this.ctx.lineTo(i, y + h);
        }
        for (let j = y; j <= y + h; j += 10) {
          this.ctx.moveTo(visibleX, j);
          this.ctx.lineTo(visibleX + visibleW, j);
        }
        this.ctx.stroke();

        this.ctx.strokeStyle = '#f8fafc';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(visibleX, y, visibleW, h);
        this.ctx.beginPath();
        this.ctx.moveTo(visibleX, y);
        this.ctx.lineTo(visibleX, y + h);
        this.ctx.moveTo(visibleX + visibleW, y);
        this.ctx.lineTo(visibleX + visibleW, y + h);
        this.ctx.stroke();
    };

    drawGoal(-6, PITCH_HEIGHT / 2 - GOAL_WIDTH / 2, 12, GOAL_WIDTH);
    drawGoal(PITCH_WIDTH - 12, PITCH_HEIGHT / 2 - GOAL_WIDTH / 2, 12, GOAL_WIDTH);

    // Penalty spots, arcs and corner quadrants complete the broadcast pitch layout.
    this.ctx.fillStyle = LINE_COLOR;
    for (const x of [PENALTY_AREA_WIDTH * 0.62, PITCH_WIDTH - PENALTY_AREA_WIDTH * 0.62]) {
      this.ctx.beginPath(); this.ctx.arc(x, PITCH_HEIGHT / 2, 5, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.strokeStyle = LINE_COLOR; this.ctx.lineWidth = 3;
    this.ctx.beginPath(); this.ctx.arc(PENALTY_AREA_WIDTH * 0.62, PITCH_HEIGHT / 2, 100, -0.86, 0.86); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.arc(PITCH_WIDTH - PENALTY_AREA_WIDTH * 0.62, PITCH_HEIGHT / 2, 100, Math.PI - 0.86, Math.PI + 0.86); this.ctx.stroke();
    for (const [x, y, start] of [[0, 0, 0], [PITCH_WIDTH, 0, Math.PI / 2], [0, PITCH_HEIGHT, -Math.PI / 2], [PITCH_WIDTH, PITCH_HEIGHT, Math.PI]]) {
      this.ctx.beginPath(); this.ctx.arc(x, y, 30, start, start + Math.PI / 2); this.ctx.stroke();
    }
  }

  drawPlayer(p: any, game: GameEngine) {
    if (p.isSentOff) return;
    const isHome = p.team === Team.HOME;
    const primaryColor = isHome ? HOME_KIT_PRIMARY : AWAY_KIT_PRIMARY;
    const secondaryColor = isHome ? HOME_KIT_SECONDARY : AWAY_KIT_SECONDARY;

    this.ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.ctx.beginPath();
    this.ctx.ellipse(p.pos.x, p.pos.y + 13, PLAYER_RADIUS * 1.2, PLAYER_RADIUS * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    if (p.isControlled) {
      this.ctx.strokeStyle = isHome ? 'rgba(239,68,68,0.9)' : 'rgba(59,130,246,0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS + 9, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    const gradient = this.ctx.createRadialGradient(p.pos.x - 4, p.pos.y - 6, 2, p.pos.x, p.pos.y, PLAYER_RADIUS + 2);
    gradient.addColorStop(0, p.role === 'GK' ? '#fef3c7' : primaryColor);
    gradient.addColorStop(1, p.role === 'GK' ? '#f59e0b' : secondaryColor);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this.ctx.beginPath();
    this.ctx.arc(p.pos.x - 4, p.pos.y - 5, PLAYER_RADIUS * 0.32, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.font = 'bold 12px Rajdhani';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.strokeText(String(p.number), p.pos.x, p.pos.y + 1);
    this.ctx.fillText(String(p.number), p.pos.x, p.pos.y + 1);

    const labelY = p.pos.y - PLAYER_RADIUS - 12;
    this.ctx.font = 'bold 10px Rajdhani';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.strokeStyle = 'rgba(2, 6, 23, 0.9)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(p.name?.trim() || `P${p.number}`, p.pos.x, labelY);
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillText(p.name?.trim() || `P${p.number}`, p.pos.x, labelY);

    if (p.role === 'GK') {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS * 0.8, 0, Math.PI * 2);
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
