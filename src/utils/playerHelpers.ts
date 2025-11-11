import { getPlayers } from '../state/gameState';

// Return alias for a player ID or a placeholder
export function getPlayerAliasById(playerId: string): string {
  const players = getPlayers();
  if (!Array.isArray(players)) return 'TBD';
  const player = players.find((p) => p.id === playerId);
  return player ? player.alias : 'TBD';
}

// Map a list of player IDs to aliases; fallback to 'unknown'
export function mapPlayerAliases(playerIds: string[]): string[] {
  const players = getPlayers();
  return playerIds.map((id) => {
    const found = Array.isArray(players) ? players.find((p) => p.id === id) : null;
    return found?.alias || 'unknown';
  });
}
