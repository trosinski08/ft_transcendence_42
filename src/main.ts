import './styles.css';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') || null;

throw new Error('Canvas context not available');

const W = canvas.width;
const H = canvas.height;

let running = false;
let p1Y = H / 2 - 40;
let p2Y = H / 2 - 40;
const paddleH = 80;
const paddleW = 8;
let ball = { x: W / 2, y: H / 2, vx: 3, vy: 2, r: 6 };

function clear() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
}

function draw() {
  clear();
  ctx.fillStyle = '#0f0';
  ctx.fillRect(30, p1Y, paddleW, paddleH);
  ctx.fillRect(W - 30 - paddleW, p2Y, paddleW, paddleH);
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO START', W / 2, H / 2);
}

function step() {
  if (running) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < ball.r || ball.y > H - ball.r) ball.vy *= -1;
    if (ball.x - ball.r < 30 + paddleW && ball.y > p1Y && ball.y < p1Y + paddleH) ball.vx = Math.abs(ball.vx);
    if (ball.x + ball.r > W - 30 - paddleW && ball.y > p2Y && ball.y < p2Y + paddleH) ball.vx = -Math.abs(ball.vx);
    if (ball.x < -50 || ball.x > W + 50) {
      ball = { x: W / 2, y: H / 2, vx: (Math.random() > 0.5 ? 1 : -1) * 3, vy: (Math.random() - 0.5) * 4, r: 6 };
      running = false;
    }
  }
  draw();
  requestAnimationFrame(step);
}

const keys = new Set<number>();
window.addEventListener('keydown', (e) => {
  keys.add(e.keyCode);
});
window.addEventListener('keyup', (e) => keys.delete(e.keyCode));

function handleInput() {
  if (keys.has(87)) p1Y -= 6;
  if (keys.has(83)) p1Y += 6;
  if (keys.has(38)) p2Y -= 6;
  if (keys.has(40)) p2Y += 6;
  p1Y = Math.max(10, Math.min(H - paddleH - 10, p1Y));
  p2Y = Math.max(10, Math.min(H - paddleH - 10, p2Y));
  setTimeout(handleInput, 12);
}

draw();
handleInput();
requestAnimationFrame(step);

(window as any).game = { start: () => (running = true), stop: () => (running = false) };
