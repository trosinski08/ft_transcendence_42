import { getCurrentMatch, updateSchedule } from '../../state/gameState';
import { navigateTo } from '../../routing/router';
import { sendLog_frontend } from '../../elk_logs';

/**
 * Creates a controller for a requestAnimationFrame loop.
 * @param stepFn The function to call on each frame.
 */
export function createRAFLoop(stepFn: () => void) {
  let running = false;
  let rafId: number | null = null;

  function loop() {
    if (!running) return;
    try { stepFn(); } catch (e) { 
      console.error('Error in game loop step', e); 
      sendLog_frontend('ERROR', 'Error in game loop step', { eventType: 'game_loop_error', error: e.message, stack: e.stack });
}
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      sendLog_frontend('INFO', 'Game loop started', { eventType: 'game_loop_start' });
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    },
    isRunning() { return running; }
  };
}

/**
 * Checks if the game has ended and handles the outcome for a tournament match.
 * This function should be called within the game's main update/step function.
 * @param scores An object containing the current scores, e.g., { score1: 4, score2: 5 }.
 * @param winScore The score required to win the match.
 * @param winner The current winner status. Should be null if the game is ongoing.
 * @param loopController The game loop controller with a `stop()` method.
 * @returns An object `{ winner: number | null, handled: boolean }`.
 *          `winner` is 1 or 2 if a player won.
 *          `handled` is true if it was a tournament match and this function took control.
 */
export function handleTournamentMatchEnd(
  scores: { score1: number, score2: number },
  winScore: number,
  winner: string | null,
  loopController: { stop: () => void }
): { winner: number | null, handled: boolean } {
  // Check if the match is over
  if (winner || (scores.score1 < winScore && scores.score2 < winScore)) {
    return { winner: null, handled: false }; // Match is not over or has already been won
  }

  const tournamentMatch = getCurrentMatch();

  if (tournamentMatch) {
    // This is a tournament match that just ended
    const winnerNum = scores.score1 >= winScore ? 1 : 2;
    const winnerId = winnerNum === 1 ? tournamentMatch.p1Id : tournamentMatch.p2Id;
    sendLog_frontend('INFO', 'Tournament match ended', { eventType: 'tournament_match_end', winnerNum, winnerId, scores, winScore });

    // Stop the game loop immediately
    loopController.stop();

    // Asynchronously update the schedule and navigate away
    updateSchedule(
      tournamentMatch.id,
      'completed',
      winnerId,
      scores.score1,
      scores.score2
    ).then(() => {
      console.log('Match result saved. Returning to tournament view.');
      navigateTo('/tournament');
    }).catch(err => {
      console.error('Error saving match result:', err);
      alert('An error occurred while saving the match result.');
      navigateTo('/tournament');
    });
    
    return { winner: winnerNum, handled: true }; // Indicate that the match end was handled
  } else {
    // This is a regular (non-tournament) match that just ended
    const winnerNum = scores.score1 >= winScore ? 1 : 2;

    sendLog_frontend('INFO', 'Regular match ended', { eventType: 'regular_match_end', winnerNum, scores, winScore });

    return { winner: winnerNum, handled: false }; // Indicate it was not a tournament match
  }
}