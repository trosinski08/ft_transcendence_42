  import { t } from '../i18n/translations';
import { players, queue, schedule, currentMatchIndex, playerStats, matchHistory, saveState, buildSchedule, recordMatch, resetTournament, startNextScheduledMatch as stateStartNext } from '../state/gameState';
import { validateAlias } from '../utils/validation';

function sanitize(input: string): string {
  // Basic sanitization: remove angle brackets and control chars, collapse whitespace, trim ends.
  // Adjust as needed for your application's security requirements.
  return input.replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim();
}

export function updatePlayers() {
  const ul = document.getElementById('players-list');
  if (!ul) return;
  ul.innerHTML = '';
  players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}
export function updateQueue() {
  const ol = document.getElementById('queue-list');
  if (!ol) return;
  ol.innerHTML = '';
  queue.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ol.appendChild(li);
  });
}

export function renderSchedule() {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  list.innerHTML = '';
  schedule.forEach((m, idx) => {
    const li = document.createElement('li');
    const label = `${m.p1} ${t((document.documentElement.lang as any) || 'en', 'common.vs')} ${m.p2}`;
    let statusChar = '';
    if (m.status === 'pending') statusChar = '⏳';
    else if (m.status === 'playing') statusChar = '▶';
    else if (m.status === 'done') statusChar = `✔${m.winner ? ' ' + t((document.documentElement.lang as any) || 'en', 'tour.winner') + ': ' + m.winner : ''}`;
    li.textContent = `${label} ${statusChar}`;
    if (idx === currentMatchIndex) li.style.fontWeight = 'bold';
    list.appendChild(li);
  });
}

export function renderBracket() {
  const container = document.getElementById('bracket');
  if (!container) return;
  container.innerHTML = '';
  schedule.forEach((m, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '6px';
    div.textContent = t((document.documentElement.lang as any) || 'en', 'tour.match', { n: idx + 1, p1: m.p1, p2: m.p2 }) + (m.status === 'done' ? ' → ' + (m.winner || '') : '');
    container.appendChild(div);
  });
}

export function renderStatsPage() {
  const top = document.getElementById('stats-top');
  const recent = document.getElementById('stats-recent');
  if (!top || !recent) return;
  top.innerHTML = '';
  recent.innerHTML = '';
  const entries = Object.entries(playerStats);
  if (!entries.length) {
    const p = document.createElement('p');
    p.textContent = t((document.documentElement.lang as any) || 'en', 'stats.noData');
    top.appendChild(p);
  } else {
    const sorted = entries.sort((a, b) => b[1].rating - a[1].rating).slice(0, 10);
    const maxRating = Math.max(...sorted.map(([, s]) => s.rating), 1200);
    sorted.forEach(([name, s]) => {
      const row = document.createElement('div'); row.className = 'bar';
      const fill = document.createElement('i');
      const pct = Math.max(0.1, s.rating / maxRating);
      fill.style.width = (pct * 100).toFixed(1) + '%';
      const label = document.createElement('span');
      label.textContent = `${name} • ${t((document.documentElement.lang as any) || 'en', 'stats.rating')}: ${s.rating} • ${t((document.documentElement.lang as any) || 'en', 'stats.wins')}: ${s.wins} • ${t((document.documentElement.lang as any) || 'en', 'stats.losses')}: ${s.losses}`;
      row.appendChild(fill); row.appendChild(label); top.appendChild(row);
    });
  }
  const recentTen = [...matchHistory].sort((a,b)=>b.ts-a.ts).slice(0, 10);
  recentTen.forEach(m => {
    const li = document.createElement('li');
    const date = new Date(m.ts).toLocaleString();
    li.textContent = `${date}: ${m.p1} ${m.score[0]} - ${m.score[1]} ${m.p2} → ${t((document.documentElement.lang as any) || 'en', 'tour.winner')}: ${m.winner}`;
    recent.appendChild(li);
  });
}

export function startNextScheduledMatch() {
  const res = stateStartNext();
  if (!res) return;
  const { idx: nextIdx, p1, p2 } = res;
  const next = document.getElementById('next-match');
  if (next) next.textContent = `${p1} vs ${p2}`;
  const p1a = document.getElementById('p1-alias');
  const p2a = document.getElementById('p2-alias');
  if (p1a) p1a.textContent = p1;
  if (p2a) p2a.textContent = p2;
  // Reset current game state by calling window-level resetMatch if available
  try { (window as any).resetMatch && (window as any).resetMatch(); } catch {}
  renderSchedule();
  renderBracket();
  try { (window as any).navigateTo && (window as any).navigateTo('/game'); } catch {}
  try { (window as any).updateP2Alias && (window as any).updateP2Alias(); } catch {}
}

export function initTournamentBindings() {
  const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
  if (registerForm) {
    registerForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const inputEl = document.getElementById('alias') as HTMLInputElement;
      const errEl = document.getElementById('alias-error') as HTMLElement | null;
      const raw = inputEl.value;
      const sanitized = sanitize(raw);
      const alias = sanitized;
      function showError(msg: string) {
        if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
      }
      function clearError() {
        if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
      }
      clearError();
      const res = validateAlias(alias);
      if (!res.ok) {
        if (res.reason === 'required') return showError(t((document.documentElement.lang as any) || 'en', 'errors.alias.required'));
        return showError(t((document.documentElement.lang as any) || 'en', 'errors.alias.invalid'));
      }
      const lower = alias.toLowerCase();
      if (players.some(p => p.toLowerCase() === lower)) return showError(t((document.documentElement.lang as any) || 'en', 'errors.alias.duplicate'));
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
      if (!schedule.length) buildSchedule();
      if (!schedule.length) {
        const next = document.getElementById('next-match');
        if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
        return;
      }
      startNextScheduledMatch();
      saveState();
      updateQueue();
    });
  }

  const newTourneyBtn = document.getElementById('new-tournament');
  if (newTourneyBtn) {
    newTourneyBtn.addEventListener('click', () => {
      resetTournament();
      try { (window as any).resetMatch && (window as any).resetMatch(); } catch {}
      saveState();
      updatePlayers();
      updateQueue();
      renderSchedule();
      renderBracket();
      const next = document.getElementById('next-match');
      if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.noMatch');
      const errEl = document.getElementById('alias-error') as HTMLElement | null;
      if (errEl) { errEl.textContent=''; errEl.style.display='none'; }
      try { (window as any).navigateTo && (window as any).navigateTo('/register'); } catch {}
    });
  }
}
