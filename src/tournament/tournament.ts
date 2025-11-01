import { t } from '../i18n/translations';
import {
  getPlayers, getQueue, getSchedule, getPlayerStats, getMatchHistory, 
  getTournamentSchedule, addPlayer, addToQueue, removeFromQueue, 
  addSchedule, updateSchedule, upsertStats, syncPlayersFromBackend,
  syncQueueFromBackend, syncScheduleFromBackend, syncPlayerStatsFromBackend,
  loadState, resetTournament, resetTournamentWithBackend, currentMatchIndex, setCurrentMatchIndex,
  getCurrentMatch, setCurrentMatch, getPlayerAliasById
} from '../state/gameState';
import { navigateTo } from '../routing/router';
import { validateAlias } from '../utils/validation';
import { TournamentSchedule, Match, MatchUpdatePayload } from './tournamentTypes';

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
  const schedule = getTournamentSchedule();
  const matches = schedule && Array.isArray(schedule.matches) ? schedule.matches : [];
  matches.forEach((m, idx) => {
    const li = document.createElement('li');
    li.className = 'match-item';
    li.setAttribute('data-match-id', m.id);
    const p1Alias = m.player1Alias || getPlayerAliasById(m.p1Id);
    const p2Alias = m.player2Alias || getPlayerAliasById(m.p2Id);
    const label = `${p1Alias} ${t((document.documentElement.lang as any) || 'en', 'common.vs')} ${p2Alias}`;
    let statusChar = '';
    if (m.status === 'pending') statusChar = '⏳';
    else if (m.status === 'playing') statusChar = '▶';
    else if (m.status === 'completed') statusChar = `✔${m.winnerId ? ' ' + t((document.documentElement.lang as any) || 'en', 'tour.winner') + ': ' + (m.p1Id === m.winnerId ? m.player1Alias : m.player2Alias) : ''}`;
    li.textContent = `${label} ${statusChar}`;
  if (m.id === getCurrentMatch()?.id) li.style.fontWeight = 'bold';
    li.addEventListener('click', () => {
      setCurrentMatch(m.id);
      renderSchedule();
    });
    list.appendChild(li);
  });
}
export function handleNextGameClick() {
  const schedule = getTournamentSchedule();
  if (!schedule) return;
  const nextMatch = schedule.matches.find(m => m.status === 'pending');
  if (nextMatch) {
    setCurrentMatch(nextMatch.id);
    renderSchedule();
  } else {
    alert('No more games to play!');
  }
}

export function renderBracket() {
  const container = document.getElementById('bracket');
  if (!container) return;
  container.innerHTML = '';
  const schedule = getTournamentSchedule();
  const matches = schedule && Array.isArray(schedule.matches) ? schedule.matches : [];
  matches.forEach((m, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '6px';
    const p1Alias = m.player1Alias || getPlayerAliasById(m.p1Id);
    const p2Alias = m.player2Alias || getPlayerAliasById(m.p2Id);
    const winnerAlias = m.winnerId ? getPlayerAliasById(m.winnerId) : '';
    div.textContent = t((document.documentElement.lang as any) || 'en', 'tour.match', { n: idx + 1, p1: p1Alias, p2: p2Alias }) + (m.status === 'completed' ? ' → ' + (winnerAlias ? winnerAlias : '') : '');
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


export async function startNextScheduledMatch() {
  await syncScheduleFromBackend();
  const schedule = getTournamentSchedule();
  
  if (!schedule || !schedule.matches || schedule.matches.length === 0) {
    console.warn('[Tournament] No tournament schedule found or no matches.');
    // renderMessage('No tournament schedule found or no matches.'); // Wyświetl komunikat użytkownikowi
    return;
  }

  // Prefer resuming a match already marked as 'playing'; otherwise pick first 'pending'
  const nextMatch =
    schedule.matches.find(match => match.status === 'playing') ||
    schedule.matches.find(match => match.status === 'pending');

  if (nextMatch) {
    console.log('[Tournament] Starting next match:', nextMatch);
    // If the match isn't already in 'playing', switch it now
    if (nextMatch.status !== 'playing') {
      await updateSchedule(nextMatch.id, 'playing');
    }
    await syncScheduleFromBackend(); // Odśwież harmonogram po aktualizacji
    const updatedSchedule = getTournamentSchedule();
    const updatedMatchIndex = updatedSchedule?.matches.findIndex(m => m.id === nextMatch.id) || 0;
    setCurrentMatchIndex(updatedMatchIndex); // Ustaw bieżący indeks meczu
    setCurrentMatch(nextMatch.id); // Ustaw aktualny mecz dla kontekstu gry/UI
    navigateTo('/game'); // Przekieruj do widoku gry
  } else {
    console.log('[Tournament] No playable matches found (neither pending nor playing). Tournament might be completed or not started.');
    // renderMessage('No pending matches found. Tournament might be completed or not started.');
  }
}

export function initTournamentBindings() {
  updateTournamentView(); // Wywołaj przy pierwszym załadowaniu
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
      try {
        await addPlayer(alias);
        await syncPlayersFromBackend();
      } catch (e: any) {
        if (e && e.status === 409) {
          return showError(t((document.documentElement.lang as any) || 'en', 'errors.alias.duplicate'));
        }
        return showError((e && (e.body?.error || e.message)) || 'Request failed');
      }
      // Find the playerId for the new alias
  const playersAfterSync = getPlayers();
  const player = Array.isArray(playersAfterSync) ? playersAfterSync.find(p => p.alias.toLowerCase() === lower) : undefined;
      if (player && !getQueue().some(q => q.playerId === player.id)) {
        try {
          await addToQueue(player.id);
          await syncQueueFromBackend();
        } catch (e) {
          // leave error silent in UI for now
        }
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
      // Build schedule from queue (pair up players) with guards
      const existing = (getTournamentSchedule()?.matches || []).map(m => new Set([m.p1Id, m.p2Id]));
      for (let i = 0; i < queue.length - 1; i += 2) {
        const p1 = queue[i].player;
        const p2 = queue[i + 1].player;
        if (!p1 || !p2) { continue; }
        if (p1.id === p2.id) { continue; }
        const dup = existing.some(set => set.has(p1.id) && set.has(p2.id));
        if (dup) { continue; }
        await addSchedule(p1.id, p2.id);
      }
      await syncScheduleFromBackend();
      const schedule = getTournamentSchedule();
      const matches = schedule && Array.isArray(schedule.matches) ? schedule.matches : [];
      if (!matches.length) {
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
      await resetTournamentWithBackend();
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

export function initTournamentPage() {
  initTournamentBindings();
  updateTournamentView(); // Wywołaj przy pierwszym załadowaniu
}

export function updateTournamentView() {
  console.log('[UI] Updating entire tournament view...');
  updatePlayers();
  updateQueue();
  renderSchedule();
  renderBracket();

  const queue = getQueue();
  const schedule = getTournamentSchedule();
  const startBtn = document.getElementById('start-tournament') as HTMLButtonElement | null;
  const nextMatchBtn = document.getElementById('next-match-btn') as HTMLButtonElement | null;
  const nextMatchText = document.getElementById('next-match');

  if (!startBtn || !nextMatchBtn || !nextMatchText) return;

  // Logika sterująca widocznością i stanem przycisków
  if (schedule && schedule.matches && schedule.matches.length > 0) {
    // Jest już harmonogram, więc ukryj przycisk Start i pokaż Next Match
    startBtn.style.display = 'none';
    nextMatchBtn.style.display = 'inline-block';
    const playing = schedule.matches.find(m => m.status === 'playing');
    const pending = schedule.matches.find(m => m.status === 'pending');
    const show = playing || pending || null;
    if (show) {
      const p1Alias = show.player1Alias || getPlayerAliasById(show.p1Id);
      const p2Alias = show.player2Alias || getPlayerAliasById(show.p2Id);
      nextMatchText.textContent = `${sanitize(p1Alias)} vs ${sanitize(p2Alias)}`;
      nextMatchBtn.disabled = false;
    } else {
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.allMatchesCompleted');
      nextMatchBtn.disabled = true;
    }
  } else {
    // Nie ma harmonogramu, pokaż przycisk Start i ukryj Next Match
    startBtn.style.display = 'inline-block';
    nextMatchBtn.style.display = 'none';
    if (queue.length >= 2) {
      startBtn.disabled = false;
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.readyToStart');
    } else {
      startBtn.disabled = true;
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
    }
  }
}

