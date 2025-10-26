import { drawFour } from '../rendering/renderer';
import { syncQueueFromBackend, getQueue } from '../state/gameState';

type P4 = { x: number; y: number; w: number; h: number; dir: 'H'|'V'; color: string; score: number; alias: string };

export function createFourController(W_init: number, H_init: number, WIN_SCORE: number, paddleSpeed: number) {
  let p4ctx: CanvasRenderingContext2D | null = null;
  let p4W = W_init, p4H = H_init;
  let p4Ball = { x: p4W/2, y: p4H/2, vx: 4, vy: 3, r: 6 };
  let P4_SPEED = Math.max(3, Math.min(10, paddleSpeed));
  let p4Players: P4[] = [];
  let p4Running = false;
  let p4Winner: string | null = null;
  let p4FirstStart = true;

  function init(names: string[]) {
    const cv = document.getElementById('game4') as HTMLCanvasElement | null;
    p4ctx = cv?.getContext('2d') || null;
    if (!cv || !p4ctx) return false;
    p4W = cv.width; p4H = cv.height;
    const n = names.slice(0,4);
    p4Players = [
      { x: 16, y: p4H/2 - 40, w: 10, h: 80, dir: 'V', color: '#00ff6a', score:0, alias: n[0] || 'P1' },
      { x: p4W-26, y: p4H/2 - 40, w: 10, h: 80, dir: 'V', color: '#00c3ff', score:0, alias: n[1] || 'P2' },
      { x: p4W/2 - 40, y: 16, w: 80, h: 10, dir: 'H', color: '#ffa500', score:0, alias: n[2] || 'P3' },
      { x: p4W/2 - 40, y: p4H-26, w: 80, h: 10, dir: 'H', color: '#ff4d4f', score:0, alias: n[3] || 'P4' },
    ];
    p4Ball = { x: p4W/2, y: p4H/2, vx: 4, vy: 3, r: 6 };
    p4Winner = null;
    p4FirstStart = true;
    return true;
  }

  function step() {
    if (!p4Running) return;
    p4Ball.x += p4Ball.vx; p4Ball.y += p4Ball.vy;
    let scoredIndex: number | null = null;
    p4Players.forEach((p, idx) => {
      if (p.dir==='V') {
        const inY = p4Ball.y > p.y && p4Ball.y < p.y + p.h;
        if (idx===0 && p4Ball.x - p4Ball.r < p.x + p.w && inY) { p4Ball.vx = Math.abs(p4Ball.vx); }
        if (idx===1 && p4Ball.x + p4Ball.r > p.x && inY) { p4Ball.vx = -Math.abs(p4Ball.vx); }
        if (idx===0 && p4Ball.x < 0) scoredIndex = 1;
        if (idx===1 && p4Ball.x > p4W) scoredIndex = 0;
      } else {
        const inX = p4Ball.x > p.x && p4Ball.x < p.x + p.w;
        if (idx===2 && p4Ball.y - p4Ball.r < p.y + p.h && inX) { p4Ball.vy = Math.abs(p4Ball.vy); }
        if (idx===3 && p4Ball.y + p4Ball.r > p.y && inX) { p4Ball.vy = -Math.abs(p4Ball.vy); }
        if (idx===2 && p4Ball.y < 0) scoredIndex = 3;
        if (idx===3 && p4Ball.y > p4H) scoredIndex = 2;
      }
    });
    if (scoredIndex!=null) {
      p4Players[scoredIndex].score += 1;
      if (!p4Winner && p4Players[scoredIndex].score >= WIN_SCORE) {
        p4Winner = p4Players[scoredIndex].alias || `P${scoredIndex+1}`;
        p4Running = false;
        // Optionally: Record match result to backend here
      }
      const dirX = scoredIndex===1 ? -1 : scoredIndex===0 ? 1 : 0;
      const dirY = scoredIndex===3 ? -1 : scoredIndex===2 ? 1 : 0;
      p4Ball = { x: p4W/2, y: p4H/2, vx: (dirX||1)*4, vy: (dirY||1)*3, r: 6 };
    }
    drawFour(p4ctx, { p4W, p4H, p4Players, p4Ball, p4Winner, lang: (document.documentElement.lang as any) || 'en' });
  }

  function startIfReady(playersList: string[]) {
    const msg = document.getElementById('multi-msg');
    if (playersList.length < 4) { if (msg) msg.style.display='block'; return; }
    if (msg) msg.style.display='none';
    if (!init(playersList)) return;
    if (!p4Running) { p4Running = false; drawFour(p4ctx, { p4W, p4H, p4Players, p4Ball, p4Winner, lang: (document.documentElement.lang as any) || 'en' }); p4FirstStart = true; }
  }

  function handleKey(e: KeyboardEvent) {
    if (!p4Players.length) return;
    switch (e.code) {
      case 'KeyW': p4Players[0].y -= P4_SPEED; break;
      case 'KeyS': p4Players[0].y += P4_SPEED; break;
      case 'ArrowUp': p4Players[1].y -= P4_SPEED; break;
      case 'ArrowDown': p4Players[1].y += P4_SPEED; break;
      case 'KeyA': p4Players[2].x -= P4_SPEED; break;
      case 'KeyD': p4Players[2].x += P4_SPEED; break;
      case 'KeyJ': p4Players[3].x -= P4_SPEED; break;
      case 'KeyL': p4Players[3].x += P4_SPEED; break;
      case 'Space':
        e.preventDefault();
        if (!p4Winner) { p4Running = !p4Running; p4FirstStart = false; }
        break;
      case 'KeyR':
        p4Players.forEach(p => p.score = 0);
        p4Winner = null;
        p4Ball = { x: p4W/2, y: p4H/2, vx: 4, vy: 3, r: 6 };
        p4Running = false; p4FirstStart = true;
        break;
    }
    if (p4Players[0]) p4Players[0].y = Math.max(8, Math.min(p4H - p4Players[0].h - 8, p4Players[0].y));
    if (p4Players[1]) p4Players[1].y = Math.max(8, Math.min(p4H - p4Players[1].h - 8, p4Players[1].y));
    if (p4Players[2]) p4Players[2].x = Math.max(8, Math.min(p4W - p4Players[2].w - 8, p4Players[2].x));
    if (p4Players[3]) p4Players[3].x = Math.max(8, Math.min(p4W - p4Players[3].w - 8, p4Players[3].x));
  }

  return { init, step, startIfReady, handleKey };
}

const WIN_SCORE = 5;
const PADDLE_SPEED = 10;

const four = createFourController(600, 600, WIN_SCORE, PADDLE_SPEED);

// When the multiplayer page is loaded or shown:
async function startFourPlayerFromQueue() {
  await syncQueueFromBackend();
  const queue = getQueue();
  const playerNames = queue.map(entry => entry.player.alias);
  four.startIfReady(playerNames);
}

// Automatically start multiplayer mode if on /multiplayer page
if (window.location.pathname === '/multiplayer') {
  startFourPlayerFromQueue();
}
