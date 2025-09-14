import './styles.css';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') || null;


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
  if (e.code === 'Space') running = !running;
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

// --- SPA + Tournament state ---
const pages = {
  home: document.getElementById('home-page') as HTMLElement | null,
  register: document.getElementById('register-page') as HTMLElement | null,
  tournament: document.getElementById('tournament-page') as HTMLElement | null,
  game: document.getElementById('game-page') as HTMLElement | null,
};

const STORAGE_KEY = 'ft_transcendence_players_v1';
const QUEUE_KEY = 'ft_transcendence_queue_v1';
const players: string[] = [];
const queue: string[] = [];

function navigateTo(path: string) {
  [pages.home, pages.register, pages.tournament, pages.game].forEach((p) => {
    if (p) p.style.display = 'none';
  });
  if (path === '/' && pages.home) pages.home.style.display = 'block';
  else if (path === '/register' && pages.register) pages.register.style.display = 'block';
  else if (path === '/tournament' && pages.tournament) pages.tournament.style.display = 'block';
  else if (path === '/game' && pages.game) pages.game.style.display = 'block';
  history.pushState({}, '', path);
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const a = (target.closest && target.closest('[data-link]')) as HTMLAnchorElement | null;
  if (a) {
    e.preventDefault();
    navigateTo(a.getAttribute('href') || '/');
    return;
  }
  const btn = (target.closest && target.closest('[data-href]')) as HTMLButtonElement | null;
  if (btn) {
    e.preventDefault();
    navigateTo(btn.getAttribute('data-href') || '/');
  }
});

function loadState() {
  try {
    const p = localStorage.getItem(STORAGE_KEY);
    const q = localStorage.getItem(QUEUE_KEY);
    if (p) JSON.parse(p).forEach((x: string) => players.push(x));
    if (q) JSON.parse(q).forEach((x: string) => queue.push(x));
  } catch (e) {
    console.warn('Failed to load stored players', e);
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save players', e);
  }
}

function updatePlayers() {
  const ul = document.getElementById('players-list');
  ul.innerHTML = '';
  players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}
function updateQueue() {
  const ol = document.getElementById('queue-list');
  ol.innerHTML = '';
  queue.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ol.appendChild(li);
  });
}

const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
if (registerForm) {
  registerForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const alias = (document.getElementById('alias') as HTMLInputElement).value.trim();
    if (alias) {
      if (!players.includes(alias)) players.push(alias);
      if (!queue.includes(alias)) queue.push(alias);
      updatePlayers();
      updateQueue();
      saveState();
      (document.getElementById('alias') as HTMLInputElement).value = '';
    }
  });
}

const startBtn = document.getElementById('start-tournament');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (queue.length >= 2) {
      const p1 = queue.shift()!;
      const p2 = queue.shift()!;
      const next = document.getElementById('next-match');
      if (next) next.textContent = `${p1} vs ${p2}`;
      const p1a = document.getElementById('p1-alias');
      const p2a = document.getElementById('p2-alias');
      if (p1a) p1a.textContent = p1;
      if (p2a) p2a.textContent = p2;
      navigateTo('/game');
    } else alert('Need at least two players in queue');
    saveState();
    updateQueue();
  });
}

const newTourneyBtn = document.getElementById('new-tournament');
if (newTourneyBtn) {
  newTourneyBtn.addEventListener('click', () => {
    players.length = 0;
    queue.length = 0;
    saveState();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(QUEUE_KEY);
    updatePlayers();
    updateQueue();
    const next = document.getElementById('next-match');
    if (next) next.textContent = 'No match';
    navigateTo('/register');
  });
}

// Initial UI state load
loadState();
updatePlayers();
updateQueue();
navigateTo('/');
