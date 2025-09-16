import './styles.css';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') || null;


const W = canvas.width;
const H = canvas.height;

// Gameplay constants (uniform rules)
const PADDLE_SPEED = 6; // base units per input tick
const BALL_INIT_SPEED_X = 3;
const BALL_INIT_SPEED_Y_RANGE = 4; // random range (-range/2 .. range/2)
const BALL_RADIUS = 6;
const BALL_SPEED_INC_FACTOR = 1.03; // acceleration per paddle hit
const BALL_MAX_SPEED = 11; // hard cap to preserve fairness

// Scoring and match state
let score1 = 0;
let score2 = 0;
const WIN_SCORE = 11;
let winner: string | null = null;
let firstStartShown = true; // controls initial "press space" prompt

let running = false;
let p1Y = H / 2 - 40;
let p2Y = H / 2 - 40;
const paddleH = 80;
const paddleW = 8;
let ball = { x: W / 2, y: H / 2, vx: BALL_INIT_SPEED_X, vy: 2, r: BALL_RADIUS };

function resetBall(direction: number = (Math.random() > 0.5 ? 1 : -1)) {
  const vy = (Math.random() - 0.5) * BALL_INIT_SPEED_Y_RANGE;
  ball = { x: W / 2, y: H / 2, vx: direction * BALL_INIT_SPEED_X, vy, r: BALL_RADIUS };
  running = false;
}

function resetMatch() {
  score1 = 0; score2 = 0; winner = null; updateScoreUI();
  resetBall();
  firstStartShown = true;
}

function updateScoreUI() {
  const s1 = document.getElementById('score1');
  const s2 = document.getElementById('score2');
  if (s1) s1.textContent = String(score1);
  if (s2) s2.textContent = String(score2);
  const next = document.getElementById('next-match');
  if (winner && next) next.textContent = `Winner: ${winner}`;
}

function clear() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
}

function draw() {
  clear();
  // Paddles
  ctx.fillStyle = '#0f0';
  ctx.fillRect(30, p1Y, paddleW, paddleH);
  ctx.fillRect(W - 30 - paddleW, p2Y, paddleW, paddleH);
  // Ball
  ctx.beginPath();
  ctx.fillStyle = '#fff';
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  // Center line (cosmetic)
  ctx.strokeStyle = 'rgba(0,255,106,0.35)';
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.setLineDash([]);
  // Overlay messages
  if (winner) {
    ctx.fillStyle = '#00ff6a';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner} WINS! (Press R to reset)`, W / 2, H / 2);
  } else if (!running && firstStartShown) {
    ctx.fillStyle = '#0f0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO START', W / 2, H / 2);
  }
}

function step() {
  if (running && !winner) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    // Wall collision
    if (ball.y < ball.r || ball.y > H - ball.r) ball.vy *= -1;
    // Paddle collisions
    if (ball.x - ball.r < 30 + paddleW && ball.y > p1Y && ball.y < p1Y + paddleH) {
      ball.vx = Math.min(Math.abs(ball.vx) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
    }
    if (ball.x + ball.r > W - 30 - paddleW && ball.y > p2Y && ball.y < p2Y + paddleH) {
      ball.vx = -Math.min(Math.abs(ball.vx) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
    }
    // Scoring
    if (ball.x < -ball.r) {
      score2 += 1; updateScoreUI();
      afterScoreUpdateObserver();
      if (score2 >= WIN_SCORE) { winner = (document.getElementById('p2-alias')?.textContent || 'Player 2'); }
      resetBall(1);
    } else if (ball.x > W + ball.r) {
      score1 += 1; updateScoreUI();
      afterScoreUpdateObserver();
      if (score1 >= WIN_SCORE) { winner = (document.getElementById('p1-alias')?.textContent || 'Player 1'); }
      resetBall(-1);
    }
  }
  draw();
  requestAnimationFrame(step);
}

const keys = new Set<number>();
window.addEventListener('keydown', (e) => {
  keys.add(e.keyCode);
  if (e.code === 'Space') {
    if (winner) return; // ignore after game end
    running = !running;
    if (running) firstStartShown = false;
  }
  if (e.code === 'KeyR') {
    resetMatch();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.keyCode));

function handleInput() {
  if (keys.has(87)) p1Y -= PADDLE_SPEED;
  if (keys.has(83)) p1Y += PADDLE_SPEED;
  if (keys.has(38)) p2Y -= PADDLE_SPEED;
  if (keys.has(40)) p2Y += PADDLE_SPEED;
  p1Y = Math.max(10, Math.min(H - paddleH - 10, p1Y));
  p2Y = Math.max(10, Math.min(H - paddleH - 10, p2Y));
  setTimeout(handleInput, 12);
}

updateScoreUI();
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
let schedule: Array<{ p1: string; p2: string; status: 'pending' | 'playing' | 'done'; winner?: string }> = [];
let currentMatchIndex: number | null = null;

function showRoute(path: string) {
  [pages.home, pages.register, pages.tournament, pages.game].forEach((p) => { if (p) p.style.display = 'none'; });
  switch (path) {
    case '/':
      if (pages.home) pages.home.style.display = 'block';
      break;
    case '/register':
      if (pages.register) pages.register.style.display = 'block';
      break;
    case '/tournament':
      if (pages.tournament) pages.tournament.style.display = 'block';
      break;
    case '/game':
      if (pages.game) pages.game.style.display = 'block';
      break;
    default:
      // fallback to home for unknown paths
      if (pages.home) pages.home.style.display = 'block';
      path = '/';
  }
  return path; // return possibly normalized path
}

function navigateTo(path: string, replace = false) {
  const normalized = showRoute(path);
  if (normalized === window.location.pathname) {
    // if only hash/query changed we might handle separately later
    if (replace) history.replaceState({}, '', normalized);
    return;
  }
  if (replace) history.replaceState({}, '', normalized); else history.pushState({}, '', normalized);
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  showRoute(window.location.pathname);
});

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

function buildSchedule() {
  schedule = [];
  // Simple round-robin pairing or sequential pairing if even count
  const playersCopy = [...players];
  if (playersCopy.length < 2) return;
  // Pair sequentially for MVP
  for (let i = 0; i < playersCopy.length - 1; i += 2) {
    if (playersCopy[i + 1]) schedule.push({ p1: playersCopy[i], p2: playersCopy[i + 1], status: 'pending' });
  }
  renderSchedule();
  renderBracket();
}

function renderSchedule() {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  list.innerHTML = '';
  schedule.forEach((m, idx) => {
    const li = document.createElement('li');
    const label = `${m.p1} vs ${m.p2}`;
    let statusChar = '';
    if (m.status === 'pending') statusChar = '⏳';
    else if (m.status === 'playing') statusChar = '▶';
    else if (m.status === 'done') statusChar = `✔${m.winner ? ' ' + m.winner : ''}`;
    li.textContent = `${label} ${statusChar}`;
    if (idx === currentMatchIndex) li.style.fontWeight = 'bold';
    list.appendChild(li);
  });
}

function renderBracket() {
  const container = document.getElementById('bracket');
  if (!container) return;
  container.innerHTML = '';
  // MVP: simple vertical list; future: tree layout
  schedule.forEach((m, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '6px';
    div.textContent = `Match ${idx + 1}: ${m.p1} vs ${m.p2} ${m.status === 'done' ? '→ ' + (m.winner || '') : ''}`;
    container.appendChild(div);
  });
}

function startNextScheduledMatch() {
  if (!schedule.length) return;
  // Find next pending
  const nextIdx = schedule.findIndex(m => m.status === 'pending');
  if (nextIdx === -1) return; // none left
  currentMatchIndex = nextIdx;
  schedule[nextIdx].status = 'playing';
  const { p1, p2 } = schedule[nextIdx];
  const next = document.getElementById('next-match');
  if (next) next.textContent = `${p1} vs ${p2}`;
  const p1a = document.getElementById('p1-alias');
  const p2a = document.getElementById('p2-alias');
  if (p1a) p1a.textContent = p1;
  if (p2a) p2a.textContent = p2;
  // Reset current game state
  resetMatch();
  renderSchedule();
  renderBracket();
  navigateTo('/game');
}

// Hook into winner assignment (poll each frame)
function afterScoreUpdateObserver() {
  if (winner && currentMatchIndex != null && schedule[currentMatchIndex]) {
    if (schedule[currentMatchIndex].status !== 'done') {
      schedule[currentMatchIndex].status = 'done';
      schedule[currentMatchIndex].winner = winner;
      renderSchedule();
      renderBracket();
    }
  }
}

const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
if (registerForm) {
  registerForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const inputEl = document.getElementById('alias') as HTMLInputElement;
    const errEl = document.getElementById('alias-error') as HTMLElement | null;
    const raw = inputEl.value;
    const sanitized = raw.replace(/\s+/g, ' ').trim();
    const alias = sanitized; // we only trim/collapse whitespace; disallow spaces below
    const ALIAS_RE = /^[A-Za-z0-9_\-]{2,20}$/;
    function showError(msg: string) { if (errEl) { errEl.textContent = msg; errEl.style.display = 'inline'; } }
    function clearError() { if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; } }
    clearError();
    if (!alias) return showError('Alias required');
    if (!ALIAS_RE.test(alias)) return showError('2-20 chars: A-Z a-z 0-9 _ -');
    // case-insensitive uniqueness
    const lower = alias.toLowerCase();
    if (players.some(p => p.toLowerCase() === lower)) return showError('Alias already registered');
    players.push(alias);
    if (!queue.some(p => p.toLowerCase() === lower)) queue.push(alias);
    updatePlayers();
    updateQueue();
    buildSchedule();
    saveState();
    inputEl.value = '';
  });
}

const startBtn = document.getElementById('start-tournament');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    // Use schedule instead of raw queue for matches
    if (!schedule.length) buildSchedule();
    startNextScheduledMatch();
    saveState();
    updateQueue();
  });
}

const newTourneyBtn = document.getElementById('new-tournament');
if (newTourneyBtn) {
  newTourneyBtn.addEventListener('click', () => {
    players.length = 0;
    queue.length = 0;
    schedule = [];
    currentMatchIndex = null;
    resetMatch();
    saveState();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(QUEUE_KEY);
    updatePlayers();
    updateQueue();
    renderSchedule();
    renderBracket();
    const next = document.getElementById('next-match');
    if (next) next.textContent = 'No match';
    const errEl = document.getElementById('alias-error') as HTMLElement | null;
    if (errEl) { errEl.textContent=''; errEl.style.display='none'; }
    navigateTo('/register');
  });
}

// Initial UI state load + route hydration
loadState();
updatePlayers();
updateQueue();
buildSchedule();
// Hydrate initial path (supports deep-link reload); fallback handled inside showRoute
navigateTo(window.location.pathname || '/', true);
