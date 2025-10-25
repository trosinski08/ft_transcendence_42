import { t } from '../i18n/translations';
import {
  getPlayers, getQueue, getSchedule, getPlayerStats, getMatchHistory,
  addPlayer, addToQueue, removeFromQueue, addSchedule, updateSchedule, upsertStats,
  syncPlayersFromBackend, syncQueueFromBackend, syncScheduleFromBackend, syncPlayerStatsFromBackend,
  loadState, resetTournament, currentMatchIndex
} from '../state/gameState';
import { validateAlias } from '../utils/validation';

function sanitize(input: string): string {
  return input.replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim();
}

export function updatePlayers() {
  const ul = document.getElementById('players-list');
  if (!ul) return;
  ul.innerHTML = '';
  const players = getPlayers();
  if (Array.isArray(players)) {
    players.forEach((p) => {
      const li = document.createElement('li');
      li.textContent = p.alias;
      ul.appendChild(li);
    });
  }
}
export function updateQueue() {
  const ol = document.getElementById('queue-list');
  if (!ol) return;
  ol.innerHTML = '';
  // getQueue() returns array of { id, position, player, playerId }
  const queue = getQueue();
  if (Array.isArray(queue)) {
    queue.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = entry.player.alias;
      ol.appendChild(li);
    });
  }
}

export function renderSchedule() {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  list.innerHTML = '';
  getSchedule().forEach((m, idx) => {
    const li = document.createElement('li');
    const label = `${m.p1.alias} ${t((document.documentElement.lang as any) || 'en', 'common.vs')} ${m.p2.alias}`;
    let statusChar = '';
    if (m.status === 'pending') statusChar = '⏳';
    else if (m.status === 'playing') statusChar = '▶';
    else if (m.status === 'done') statusChar = `✔${m.winnerId ? ' ' + t((document.documentElement.lang as any) || 'en', 'tour.winner') + ': ' + (m.p1.id === m.winnerId ? m.p1.alias : m.p2.alias) : ''}`;
    li.textContent = `${label} ${statusChar}`;
    if (idx === currentMatchIndex) li.style.fontWeight = 'bold';
    list.appendChild(li);
  });
}

export function renderBracket() {
  const container = document.getElementById('bracket');
  if (!container) return;
  container.innerHTML = '';
  getSchedule().forEach((m, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '6px';
    div.textContent = t((document.documentElement.lang as any) || 'en', 'tour.match', { n: idx + 1, p1: m.p1.alias, p2: m.p2.alias }) + (m.status === 'done' ? ' → ' + (m.winnerId ? (m.p1.id === m.winnerId ? m.p1.alias : m.p2.alias) : '') : '');
    container.appendChild(div);
  });
}

export function renderStatsPage() {
  const top = document.getElementById('stats-top');
  const recent = document.getElementById('stats-recent');
  if (!top || !recent) return;
  top.innerHTML = '';
  recent.innerHTML = '';
  const statsArr = getPlayerStats();
  if (!statsArr.length) {
    const p = document.createElement('p');
    p.textContent = t((document.documentElement.lang as any) || 'en', 'stats.noData');
    top.appendChild(p);
  } else {
    // Join with player alias for display
    const players = getPlayers();
    const statsWithAlias = statsArr.map(s => ({
      ...s,
      alias: (Array.isArray(players) ? (players.find(p => p.id === s.playerId) || { alias: '??' }).alias : '??')
    }));
    const sorted = statsWithAlias.sort((a, b) => b.rating - a.rating).slice(0, 10);
    const maxRating = Math.max(...sorted.map(s => s.rating), 1200);
    sorted.forEach(s => {
      const row = document.createElement('div'); row.className = 'bar';
      const fill = document.createElement('i');
      const pct = Math.max(0.1, s.rating / maxRating);
      fill.style.width = (pct * 100).toFixed(1) + '%';
      const label = document.createElement('span');
      label.textContent = `${s.alias} • ${t((document.documentElement.lang as any) || 'en', 'stats.rating')}: ${s.rating} • ${t((document.documentElement.lang as any) || 'en', 'stats.wins')}: ${s.wins} • ${t((document.documentElement.lang as any) || 'en', 'stats.losses')}: ${s.losses}`;
      row.appendChild(fill); row.appendChild(label); top.appendChild(row);
    });
  }
  const recentTen = [...getMatchHistory()].sort((a,b)=>b.ts-a.ts).slice(0, 10);
  recentTen.forEach(m => {
    const li = document.createElement('li');
    const date = new Date(m.ts).toLocaleString();
    const winnerAlias = m.winnerId ? (m.p1.id === m.winnerId ? m.p1.alias : m.p2.alias) : '';
    li.textContent = `${date}: ${m.p1.alias} ${m.score1} - ${m.score2} ${m.p2.alias} → ${t((document.documentElement.lang as any) || 'en', 'tour.winner')}: ${winnerAlias}`;
    recent.appendChild(li);
  });
}

// You will need to reimplement scheduling and match logic using backend APIs.
// For now, here's a placeholder for starting the next match:
export function startNextScheduledMatch() {
  // This should call your backend to update the match status, then sync schedule.
  // Placeholder: just sync schedule and update UI.
  syncScheduleFromBackend().then(() => {
    renderSchedule();
    renderBracket();
  });
}

export function initTournamentBindings() {
  const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
  if (registerForm) {
    registerForm.addEventListener('submit', async (ev) => {
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
      const players = getPlayers();
      if (Array.isArray(players) && players.some(p => p.alias.toLowerCase() === lower)) {
        return showError(t((document.documentElement.lang as any) || 'en', 'errors.alias.duplicate'));
      }
      await addPlayer(alias);
      await syncPlayersFromBackend();
      // Find the playerId for the new alias
  const playersAfterSync = getPlayers();
  const player = Array.isArray(playersAfterSync) ? playersAfterSync.find(p => p.alias.toLowerCase() === lower) : undefined;
      if (player && !getQueue().some(q => q.playerId === player.id)) {
        await addToQueue(player.id);
        await syncQueueFromBackend();
      }
      updatePlayers();
      updateQueue();
      // You should implement schedule creation via backend here
      inputEl.value = '';
    });
  }

  const startBtn = document.getElementById('start-tournament');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      await syncQueueFromBackend();
      const queue = getQueue();
      if (queue.length < 2) {
        const next = document.getElementById('next-match');
        if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
        return;
      }
      // Build schedule from queue (pair up players)
      for (let i = 0; i < queue.length - 1; i += 2) {
        const p1 = queue[i].player;
        const p2 = queue[i + 1].player;
        await addSchedule(p1.id, p2.id);
      }
      await syncScheduleFromBackend();
      if (!getSchedule().length) {
        const next = document.getElementById('next-match');
        if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
        return;
      }
      startNextScheduledMatch();
      updateQueue();
    });
  }

  const newTourneyBtn = document.getElementById('new-tournament');
  if (newTourneyBtn) {
    newTourneyBtn.addEventListener('click', async () => {
      resetTournament();
      try { (window as any).resetMatch && (window as any).resetMatch(); } catch {}
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
