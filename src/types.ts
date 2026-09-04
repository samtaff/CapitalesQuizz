export type Difficulty = 'facile' | 'moyen' | 'difficile';
export type DifficultySelection = Difficulty | 'mix';

export type ResponseMode = 'cash' | 'carre';

export type GameMode = 'classic' | 'wheel';

export type GameStatus = 'lobby' | 'wheel' | 'question' | 'round_map' | 'leaderboard' | 'game_over';

export interface WheelState {
  activePlayerId: string; // Joueur actif qui doit répondre
  eligiblePlayerIds: string[]; // Joueurs présents sur la roue pour ce tour
  remainingPlayerIds: string[]; // Joueurs restants pour les tours suivants du cycle
  cycleNumber: number; // Numéro du cycle (1, 2, ...)
  targetPlayerId: string; // Joueur sélectionné par la roue
  spinTargetAngle: number; // Angle total de rotation en degrés
  spinStartTime: number; // Horodatage du début de rotation
  spinDuration: number; // Durée de rotation en ms (ex: 4500ms)
}

export interface CapitalCoordinates {
  lat: number;
  lng: number;
}

export interface CountryItem {
  id: string; // ISO 2-letter
  country: string; // Nom en français
  capital: string; // Nom en français
  flag: string; // Emoji
  difficulty: Difficulty;
  distractors: [string, string, string]; // 3 fausses propositions réalistes
  coordinates: CapitalCoordinates;
  acceptableAnswers?: string[]; // Variantes acceptables
}

export interface PlayerRoundAnswer {
  mode: ResponseMode;
  answer: string;
  isCorrect: boolean;
  scoreFactor: number; // 1.0 (exact cash), 0.5 (faute cash ou carre), 0 (rate)
  pointsEarned: number;
  levenshteinDistance?: number;
  punchline?: string;
  answeredAt: number; // timestamp
  timeTaken: number; // in seconds
}

export interface Player {
  id: string; // uid
  nickname: string;
  color: string; // hex code
  isHost: boolean;
  totalScore: number;
  lastRoundDelta: number;
  currentAnswer?: PlayerRoundAnswer | null;
  selectedMode?: ResponseMode | null;
  joinedAt: number;
}

export interface GameQuestion {
  countryId: string;
  country: string;
  capital: string;
  flag: string;
  difficulty: Difficulty;
  options: string[]; // 4 options for Carré
  coordinates: CapitalCoordinates;
  acceptableAnswers?: string[];
}

export interface PartyDoc {
  id?: string;
  code: string;
  status: GameStatus;
  createdAt: number;
  hostId: string;
  difficultySetting: DifficultySelection;
  totalRounds: number;
  currentRoundIndex: number;
  roundStartTime: number;
  roundDuration: number;
  questions: GameQuestion[];
  players: Record<string, Player>;
  phaseEndTime?: number; // for automated transitions
  gameMode?: GameMode; // 'classic' ou 'wheel'
  wheelState?: WheelState; // État de la roue de tirage
}

export interface LevenshteinEvaluation {
  distance: number;
  isAccepted: boolean;
  pointsPercentage: number; // 0, 50, or 100
  normalizedTarget: string;
  normalizedInput: string;
  note: 'exact' | 'minor_error' | 'incorrect';
}
