import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase';
import {
  DifficultySelection,
  GameStatus,
  PartyDoc,
  Player,
  PlayerRoundAnswer,
  ResponseMode,
} from '../types';
import { generateQuestions } from '../data/countries';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sans 'I' et 'O' pour éviter toute confusion

export function generatePartyCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

export const AVATAR_COLORS = [
  { id: 'red', hex: '#EF4444', label: 'Rouge' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
  { id: 'amber', hex: '#F59E0B', label: 'Ambre' },
  { id: 'green', hex: '#10B981', label: 'Vert' },
  { id: 'teal', hex: '#14B8A6', label: 'Turquoise' },
  { id: 'blue', hex: '#3B82F6', label: 'Bleu Roi' },
  { id: 'indigo', hex: '#6366F1', label: 'Indigo' },
  { id: 'purple', hex: '#8B5CF6', label: 'Violet' },
  { id: 'pink', hex: '#EC4899', label: 'Rose' },
  { id: 'rose', hex: '#F43F5E', label: 'Framboise' },
];

/**
 * Crée une nouvelle partie Firestore
 */
export async function createParty(
  hostNickname: string,
  hostColor: string,
  difficultySetting: DifficultySelection = 'mix',
  totalRounds: number = 5
): Promise<{ code: string; hostId: string }> {
  const hostId = await ensureAnonymousAuth();
  const code = generatePartyCode();

  const questions = generateQuestions(difficultySetting, totalRounds);

  const hostPlayer: Player = {
    id: hostId,
    nickname: hostNickname.trim() || 'Hôte',
    color: hostColor || AVATAR_COLORS[0].hex,
    isHost: true,
    totalScore: 0,
    lastRoundDelta: 0,
    currentAnswer: null,
    selectedMode: null,
    joinedAt: Date.now(),
  };

  const partyData: PartyDoc = {
    code,
    status: 'lobby',
    createdAt: Date.now(),
    hostId,
    difficultySetting,
    totalRounds,
    currentRoundIndex: 0,
    roundStartTime: 0,
    roundDuration: 20, // 20 secondes par manche
    questions,
    players: {
      [hostId]: hostPlayer,
    },
  };

  const partyRef = doc(db, 'parties', code);
  await setDoc(partyRef, partyData);

  return { code, hostId };
}

/**
 * Rejoint une partie existante avec un code
 */
export async function joinParty(
  code: string,
  nickname: string,
  color: string
): Promise<{ success: boolean; error?: string; playerId?: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length !== 4) {
    return { success: false, error: 'Le code doit comporter 4 lettres.' };
  }

  const playerId = await ensureAnonymousAuth();
  const partyRef = doc(db, 'parties', cleanCode);
  const partySnap = await getDoc(partyRef);

  if (!partySnap.exists()) {
    return { success: false, error: 'Partie introuvable. Vérifiez le code.' };
  }

  const party = partySnap.data() as PartyDoc;

  if (party.status !== 'lobby') {
    // Si le joueur faisait déjà partie de la partie, autoriser la reconnexion
    if (party.players && party.players[playerId]) {
      return { success: true, playerId };
    }
    return { success: false, error: 'Cette partie a déjà commencé.' };
  }

  const player: Player = {
    id: playerId,
    nickname: nickname.trim() || `Joueur ${Object.keys(party.players || {}).length + 1}`,
    color: color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].hex,
    isHost: party.hostId === playerId,
    totalScore: 0,
    lastRoundDelta: 0,
    currentAnswer: null,
    selectedMode: null,
    joinedAt: Date.now(),
  };

  await updateDoc(partyRef, {
    [`players.${playerId}`]: player,
  });

  return { success: true, playerId };
}

/**
 * Met à jour les paramètres de la partie (par l'hôte)
 */
export async function updatePartySettings(
  code: string,
  difficultySetting: DifficultySelection,
  totalRounds: number
): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const questions = generateQuestions(difficultySetting, totalRounds);

  await updateDoc(partyRef, {
    difficultySetting,
    totalRounds,
    questions,
  });
}

/**
 * Lance la partie (passage du lobby à la 1re question)
 */
export async function startPartyGame(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const snap = await getDoc(partyRef);
  if (!snap.exists()) return;

  const party = snap.data() as PartyDoc;
  const resetPlayers: Record<string, any> = {};

  Object.keys(party.players || {}).forEach((pId) => {
    resetPlayers[`players.${pId}.totalScore`] = 0;
    resetPlayers[`players.${pId}.lastRoundDelta`] = 0;
    resetPlayers[`players.${pId}.currentAnswer`] = null;
    resetPlayers[`players.${pId}.selectedMode`] = null;
  });

  await updateDoc(partyRef, {
    status: 'question',
    currentRoundIndex: 0,
    roundStartTime: Date.now(),
    roundDuration: 20,
    ...resetPlayers,
  });
}

/**
 * Sélectionne le mode individuel (Cash ou Carré) pour le joueur
 */
export async function setPlayerMode(
  code: string,
  playerId: string,
  mode: ResponseMode
): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    [`players.${playerId}.selectedMode`]: mode,
  });
}

/**
 * Soumet la réponse d'un joueur
 */
export async function submitPlayerAnswer(
  code: string,
  playerId: string,
  answer: PlayerRoundAnswer
): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const snap = await getDoc(partyRef);
  if (!snap.exists()) return;

  const party = snap.data() as PartyDoc;
  const currentTotal = party.players?.[playerId]?.totalScore || 0;

  await updateDoc(partyRef, {
    [`players.${playerId}.currentAnswer`]: answer,
    [`players.${playerId}.totalScore`]: currentTotal + answer.pointsEarned,
    [`players.${playerId}.lastRoundDelta`]: answer.pointsEarned,
  });
}

/**
 * Enregistre un timeout (0 point) pour un joueur qui n'a pas répondu
 */
export async function submitTimeoutAnswer(
  code: string,
  playerId: string
): Promise<void> {
  const timeoutAnswer: PlayerRoundAnswer = {
    mode: 'carre',
    answer: 'TIME',
    isCorrect: false,
    scoreFactor: 0,
    pointsEarned: 0,
    answeredAt: Date.now(),
    timeTaken: 20,
  };

  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    [`players.${playerId}.currentAnswer`]: timeoutAnswer,
    [`players.${playerId}.lastRoundDelta`]: 0,
  });
}

/**
 * Transitionne vers l'affichage de la carte du monde (2-3 secondes)
 */
export async function showRoundMap(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    status: 'round_map',
    phaseEndTime: Date.now() + 3000,
  });
}

/**
 * Transitionne vers l'écran de classement intermédiaire
 */
export async function showLeaderboard(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    status: 'leaderboard',
  });
}

/**
 * Passe à la manche suivante ou termine la partie
 */
export async function nextRoundOrEnd(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const snap = await getDoc(partyRef);
  if (!snap.exists()) return;

  const party = snap.data() as PartyDoc;
  const nextRoundIndex = party.currentRoundIndex + 1;

  if (nextRoundIndex >= party.questions.length) {
    // Fin de partie
    await updateDoc(partyRef, {
      status: 'game_over',
    });
  } else {
    // Manche suivante
    const resetPlayers: Record<string, any> = {};
    Object.keys(party.players || {}).forEach((pId) => {
      resetPlayers[`players.${pId}.currentAnswer`] = null;
      resetPlayers[`players.${pId}.selectedMode`] = null;
    });

    await updateDoc(partyRef, {
      status: 'question',
      currentRoundIndex: nextRoundIndex,
      roundStartTime: Date.now(),
      roundDuration: 20,
      ...resetPlayers,
    });
  }
}

/**
 * Recommence une nouvelle partie dans le même lobby
 */
export async function restartParty(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const snap = await getDoc(partyRef);
  if (!snap.exists()) return;

  const party = snap.data() as PartyDoc;
  const questions = generateQuestions(party.difficultySetting, party.totalRounds);

  const resetPlayers: Record<string, any> = {};
  Object.keys(party.players || {}).forEach((pId) => {
    resetPlayers[`players.${pId}.totalScore`] = 0;
    resetPlayers[`players.${pId}.lastRoundDelta`] = 0;
    resetPlayers[`players.${pId}.currentAnswer`] = null;
    resetPlayers[`players.${pId}.selectedMode`] = null;
  });

  await updateDoc(partyRef, {
    status: 'lobby',
    currentRoundIndex: 0,
    roundStartTime: 0,
    questions,
    ...resetPlayers,
  });
}

/**
 * Permet à l'hôte d'exclure un joueur
 */
export async function kickPlayer(code: string, playerId: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    [`players.${playerId}`]: deleteField(),
  });
}

/**
 * Permet à un joueur de quitter la partie
 */
export async function leaveParty(code: string, playerId: string): Promise<void> {
  try {
    const cleanCode = code.trim().toUpperCase();
    const partyRef = doc(db, 'parties', cleanCode);
    await updateDoc(partyRef, {
      [`players.${playerId}`]: deleteField(),
    });
  } catch (err) {
    console.error('Error leaving party:', err);
  }
}

/**
 * Écoute en temps réel les changements d'une partie
 */
export function subscribeToParty(
  code: string,
  onUpdate: (party: PartyDoc | null) => void
) {
  const cleanCode = code.trim().toUpperCase();
  const partyRef = doc(db, 'parties', cleanCode);
  return onSnapshot(
    partyRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...(snap.data() as PartyDoc), id: snap.id });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Firestore subscription error:', err);
    }
  );
}
