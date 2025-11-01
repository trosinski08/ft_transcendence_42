import { logout, deleteCurrentUser } from '../apiClient';
import { t, DEFAULT_LANG, isLang, type Lang } from '../i18n/translations';
import { navigateTo } from '../routing/router';
import { resetTournament, loadState } from '../state/gameState';

function resolveLang(fallback: () => Lang): Lang {
  const langAttr = (document.documentElement.lang || '').toLowerCase();
  if (langAttr && isLang(langAttr)) {
    return langAttr;
  }
  return fallback() || DEFAULT_LANG;
}

type Tone = 'info' | 'success' | 'error';

export function initAccountControls(getLang: () => Lang) {
  const logoutBtn = document.getElementById('settings-logout') as HTMLButtonElement | null;
  const deleteBtn = document.getElementById('settings-delete-account') as HTMLButtonElement | null;
  const feedbackEl = document.getElementById('gdpr-feedback') as HTMLElement | null;

  if (!logoutBtn && !deleteBtn) return;

  let busy = false;

  const setBusy = (state: boolean) => {
    busy = state;
    if (logoutBtn) logoutBtn.disabled = state;
    if (deleteBtn) deleteBtn.disabled = state;
  };

  const showFeedback = (key: string, tone: Tone) => {
    if (!feedbackEl) return;
    const lang = resolveLang(getLang);
    feedbackEl.textContent = t(lang, key);
    feedbackEl.dataset.state = tone;
  };

  const clearFeedback = () => {
    if (feedbackEl) {
      feedbackEl.textContent = '';
      feedbackEl.dataset.state = '';
    }
  };

  logoutBtn?.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    showFeedback('settings.accountWorking', 'info');
    try {
      await logout();
      resetTournament();
      await loadState().catch(() => {});
      navigateTo('/');
      showFeedback('settings.logoutSuccess', 'success');
    } catch (error) {
      console.error('[AccountControls] logout failed', error);
      showFeedback('settings.logoutError', 'error');
    } finally {
      setBusy(false);
      setTimeout(clearFeedback, 5000);
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    if (busy) return;
    const lang = resolveLang(getLang);
    const confirmed = window.confirm(t(lang, 'settings.deleteConfirm'));
    if (!confirmed) return;

    setBusy(true);
    showFeedback('settings.accountWorking', 'info');
    try {
      await deleteCurrentUser();
      resetTournament();
      await loadState().catch(() => {});
      navigateTo('/');
      showFeedback('settings.deleteSuccess', 'success');
    } catch (error) {
      console.error('[AccountControls] delete account failed', error);
      showFeedback('settings.deleteError', 'error');
    } finally {
      setBusy(false);
      setTimeout(clearFeedback, 5000);
    }
  });
}
