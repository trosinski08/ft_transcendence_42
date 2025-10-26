export type Player = {
  id: string;
  alias: string;
  // Dodaj inne właściwości gracza, jeśli istnieją, np. score, wins, losses
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
  player1Id: string;
  player2Id: string;
  player1Alias: string; // Zdenormalizowane dla łatwiejszego wyświetlania
  player2Alias: string; // Zdenormalizowane dla łatwiejszego wyświetlania
  status: 'pending' | 'playing' | 'completed'; // Zmieniono 'done' na 'completed'
  winnerId: string | null;
  score1: number | null; // Wynik dla player1
  score2: number | null; // Wynik dla player2
  round: number; // Która runda turnieju
  matchNumber: number; // Numer meczu w rundzie
};

export type TournamentSchedule = {
  id: string; // ID turnieju
  name: string;
  status: 'pending' | 'started' | 'completed';
  players: Player[]; // Wszyscy gracze uczestniczący w turnieju
  matches: Match[]; // Wygenerowany harmonogram meczów
  currentRound: number;
  // Dodaj inne właściwości turnieju, jeśli potrzebne
};

// Typ dla aktualizacji meczu
export type MatchUpdatePayload = {
  status?: 'pending' | 'playing' | 'completed';
  winnerId?: string;
  score1?: number;
  score2?: number;
};