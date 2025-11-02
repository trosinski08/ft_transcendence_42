import { DEFAULT_LANG, isLang, t } from '../i18n/translations';
import { fetchSchedule } from '../apiClient';
import {
  getPlayers, getQueue, getPlayerStats,
  getTournamentSchedule, addPlayer, addToQueue,
  updateSchedule, syncPlayersFromBackend,
  syncQueueFromBackend, syncScheduleFromBackend, syncPlayerStatsFromBackend,
  resetTournamentWithBackend, setCurrentMatchIndex,
  getCurrentMatch, setCurrentMatch, getPlayerAliasById, initializeTournamentBracket,
  clearScheduleWithBackend, clearPlayersWithBackend
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

export async function renderStatsPage() {
  const top = document.getElementById('stats-top');
  const recent = document.getElementById('stats-recent');
  if (!top || !recent) return;
  top.innerHTML = '';
  recent.innerHTML = '';
  const langAttr = (document.documentElement.lang || '').toLowerCase();
  const lang = isLang(langAttr) ? langAttr : DEFAULT_LANG;

  const loadingTop = document.createElement('p');
  loadingTop.textContent = t(lang, 'stats.loading');
  top.appendChild(loadingTop);
  const loadingRecent = document.createElement('li');
  loadingRecent.textContent = t(lang, 'stats.loading');
  recent.appendChild(loadingRecent);

  try {
    const [, , schedule] = await Promise.all([
      syncPlayersFromBackend(),
      syncPlayerStatsFromBackend(),
      fetchSchedule()
    ]);

    const statsArr = getPlayerStats();
    top.innerHTML = '';
    if (!statsArr.length) {
      const p = document.createElement('p');
      p.textContent = t(lang, 'stats.noData');
      top.appendChild(p);
    } else {
      const players = getPlayers();
      const statsWithAlias = statsArr.map((s) => ({
        ...s,
        alias: (Array.isArray(players) ? (players.find((p) => p.id === s.playerId) || { alias: '??' }).alias : '??')
      }));
      const sorted = statsWithAlias.sort((a, b) => b.rating - a.rating).slice(0, 10);
      const maxRating = Math.max(...sorted.map((s) => s.rating), 1200);
      sorted.forEach((s) => {
        const row = document.createElement('div');
        row.className = 'bar';
        const fill = document.createElement('i');
        const pct = Math.max(0.1, s.rating / maxRating);
        fill.style.width = (pct * 100).toFixed(1) + '%';
        const label = document.createElement('span');
        label.textContent = `${s.alias} • ${t(lang, 'stats.rating')}: ${s.rating} • ${t(lang, 'stats.wins')}: ${s.wins} • ${t(lang, 'stats.losses')}: ${s.losses}`;
        row.appendChild(fill);
        row.appendChild(label);
        top.appendChild(row);
      });
    }

    recent.innerHTML = '';
    const matches = Array.isArray(schedule) ? schedule : [];
    const completed = matches.filter((m) => {
      const status = (m?.status || '').toLowerCase();
      return status === 'completed' || status === 'done';
    });
    const sortedMatches = completed
      .sort((a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime())
      .slice(0, 10);

    if (!sortedMatches.length) {
      const li = document.createElement('li');
      li.textContent = t(lang, 'stats.noMatches');
      recent.appendChild(li);
    } else {
      sortedMatches.forEach((m) => {
        const li = document.createElement('li');
        const date = m.ts ? new Date(m.ts).toLocaleString() : '';
        const p1Alias = m.p1?.alias || getPlayerAliasById(m.p1Id);
        const p2Alias = m.p2?.alias || getPlayerAliasById(m.p2Id);
        const winnerAlias = m.winnerId ? (m.winnerId === m.p1Id ? p1Alias : p2Alias) : '';
        const winnerPart = winnerAlias ? ` → ${t(lang, 'tour.winner')}: ${winnerAlias}` : '';
        li.textContent = `${date}: ${p1Alias} ${m.score1} - ${m.score2} ${p2Alias}${winnerPart}`;
        recent.appendChild(li);
      });
    }
  } catch (error) {
    console.error('[Stats] Failed to load stats dashboard', error);
    top.innerHTML = '';
    recent.innerHTML = '';
    const errMsg = document.createElement('p');
    errMsg.textContent = t(lang, 'stats.error');
    top.appendChild(errMsg);
    const errRecent = document.createElement('li');
    errRecent.textContent = t(lang, 'stats.error');
    recent.appendChild(errRecent);
  }
}


export async function startNextScheduledMatch() {
  await syncScheduleFromBackend();
  const schedule = getTournamentSchedule();
  
  if (!schedule || !schedule.matches || schedule.matches.length === 0) {
    console.warn('[Tournament] No tournament schedule found or no matches.');
    // renderMessage('No tournament schedule found or no matches.'); // Surface the warning in UI when desired
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
    await syncScheduleFromBackend(); // Refresh the schedule after updating the status
    const updatedSchedule = getTournamentSchedule();
    const updatedMatchIndex = updatedSchedule?.matches.findIndex(m => m.id === nextMatch.id) || 0;
    setCurrentMatchIndex(updatedMatchIndex); // Track the active match for navigation
    setCurrentMatch(nextMatch.id); // Expose the current match for game and UI context
    navigateTo('/game'); // Move the user into the game view
  } else {
    console.log('[Tournament] No playable matches found (neither pending nor playing). Tournament might be completed or not started.');
    // renderMessage('No pending matches found. Tournament might be completed or not started.');
  }
}

export function initTournamentBindings() {
  updateTournamentView(); // Populate initial data on the first load
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

      try {
        localStorage.setItem('tournamentAlias', alias);
      } catch (storageError) {
        console.warn('[tournament] Could not persist alias:', storageError);
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
      inputEl.value = '';
    });
  }

  const startBtn = document.getElementById('start-tournament');
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      await syncQueueFromBackend();
      const schedule = getTournamentSchedule();
      const queue = getQueue();
      const hasSchedule = !!(schedule && schedule.matches && schedule.matches.length > 0);

      if (hasSchedule) {
        // Continue existing bracket: start next pending/playing match
        await startNextScheduledMatch();
      } else {
        // Initialize new bracket from current queue
        if (queue.length < 2) {
          const next = document.getElementById('next-match');
          if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
          return;
        }
        const playerIds = queue.map(q => q.player.id);
        await clearScheduleWithBackend();
        await initializeTournamentBracket(playerIds);
        await startNextScheduledMatch();
      }
      updateQueue();
    });
  }
  const newTourneyBtn = document.getElementById('new-tournament');
  if (newTourneyBtn) {
    newTourneyBtn.addEventListener('click', async () => {
      newTourneyBtn.setAttribute('disabled', 'true');
      try {
        await clearPlayersWithBackend();
        try { (window as any).resetMatch && (window as any).resetMatch(); } catch {}
        await syncPlayersFromBackend();
        await syncQueueFromBackend();
        await syncScheduleFromBackend();

        updatePlayers();
        updateQueue();
        renderSchedule();
        renderBracket();

        const next = document.getElementById('next-match');
        if (next) next.textContent = t((document.documentElement.lang as any) || 'en', 'tour.noMatch');

        const errEl = document.getElementById('alias-error') as HTMLElement | null;
        if (errEl) { errEl.textContent=''; errEl.classList.remove('visible'); }
        try { (window as any).navigateTo && (window as any).navigateTo('/register'); } catch {}
      } finally {
        newTourneyBtn.removeAttribute('disabled');
      }
    });
  }
}

export function initTournamentPage() {
  initTournamentBindings();
  updateTournamentView();
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
  const nextMatchText = document.getElementById('next-match');

  if (!startBtn || !nextMatchText) return;
  const hasSchedule = !!(schedule && schedule.matches && schedule.matches.length > 0);

  if (hasSchedule) {
    // Reuse start button as "Next match"
    startBtn.style.display = 'inline-block';
    const playing = schedule!.matches.find(m => m.status === 'playing');
    const pending = schedule!.matches.find(m => m.status === 'pending');
    const show = playing || pending || null;
    if (show) {
      const p1Alias = show.player1Alias || getPlayerAliasById(show.p1Id);
      const p2Alias = show.player2Alias || getPlayerAliasById(show.p2Id);
      nextMatchText.textContent = `${sanitize(p1Alias)} vs ${sanitize(p2Alias)}`;
      startBtn.disabled = false;
    } else {
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.allMatchesCompleted');
      startBtn.disabled = true; // nothing left to start
    }
  } else {
    // No schedule yet -> use start button to create bracket
    startBtn.style.display = 'inline-block';
    if (queue.length >= 2) {
      startBtn.disabled = false;
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.readyToStart');
    } else {
      startBtn.disabled = true;
      nextMatchText.textContent = t((document.documentElement.lang as any) || 'en', 'tour.needTwo');
    }
  }
}

if (typeof window !== 'undefined') {
  (window as any).renderStatsPage = () => { renderStatsPage(); };
}

