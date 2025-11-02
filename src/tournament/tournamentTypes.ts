export type Player = {
  id: string;
  alias: string;
  // Add other player properties if they exist, e.g. score, wins, losses
};
export type PlayerStats = {
    id: string;
    playerId: string;
    wins: number;
    losses: number;
    streak: number;
    rating: number;
};

export type Match = {
  id: string;
  p1Id: string;
  p2Id: string;
  player1Alias: string; // Denormalized for easier display
  player2Alias: string; // Denormalized for easier display
  status: 'pending' | 'playing' | 'completed'; // Match status
  winnerId: string | null;
  score1: number | null; // Score for player1
  score2: number | null; // Score for player2
  round: number; // Which tournament round
  matchNumber: number; // Match number in the round
};

export type TournamentSchedule = {
  id: string; // Tournament ID
  name: string;
  status: 'pending' | 'started' | 'completed';
  players: Player[]; // All players participating in the tournament
  matches: Match[]; // Generated schedule of matches
  currentRound: number;
  // Add other tournament properties if needed
};

// Type for match update
export type MatchUpdatePayload = {
  status?: 'pending' | 'playing' | 'completed';
  winnerId?: string;
  score1?: number;
  score2?: number;
};
