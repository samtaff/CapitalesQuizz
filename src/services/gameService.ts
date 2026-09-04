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
  GameMode,
  GameStatus,
  PartyDoc,
  Player,
  PlayerRoundAnswer,
  ResponseMode,
  WheelState,
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
    gameMode: 'classic',
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
 * Calcule les paramètres de rotation et le joueur tiré pour la Roue (Règle d'équité par cycle)
 */
export function computeWheelSpin(
  eligiblePlayerIds: string[],
  cycleNumber: number
): WheelState {
  if (eligiblePlayerIds.length === 0) {
    throw new Error('Impossible de lancer la roue sans joueur éligible.');
  }

  // Sélection aléatoire équiprobable parmi les joueurs du cycle en cours
  const randomIndex = Math.floor(Math.random() * eligiblePlayerIds.length);
  const targetPlayerId = eligiblePlayerIds[randomIndex];
  const remainingPlayerIds = eligiblePlayerIds.filter((id) => id !== targetPlayerId);

  const numSegments = eligiblePlayerIds.length;
  const sliceAngle = 360 / numSegments;
  // Le pointeur fixe est en haut à 12h (0°).
  // La portion i va de i * sliceAngle à (i + 1) * sliceAngle.
  // Le centre de la portion cible est à (randomIndex + 0.5) * sliceAngle.
  // Pour amener ce centre à 0° après une rotation horaire de R degrés :
  // R % 360 = (360 - centre) % 360.
  const fullRotations = 6; // 6 tours complets pour un effet casino immersif
  const centerOfSlice = (randomIndex + 0.5) * sliceAngle;
  // Légère variation aléatoire au sein de la portion (+- 25% de la portion)
  const jitter = (Math.random() - 0.5) * (sliceAngle * 0.4);
  const finalAngleOffset = (360 - centerOfSlice + jitter + 360) % 360;
  const spinTargetAngle = fullRotations * 360 + finalAngleOffset;

  return {
    activePlayerId: targetPlayerId,
    eligiblePlayerIds,
    remainingPlayerIds,
    cycleNumber,
    targetPlayerId,
    spinTargetAngle,
    spinStartTime: Date.now(),
    spinDuration: 4500, // 4.5 secondes
  };
}

/**
 * Met à jour les paramètres de la partie (par l'hôte)
 */
export async function updatePartySettings(
  code: string,
  difficultySetting: DifficultySelection,
  totalRounds: number,
  gameMode?: GameMode
): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  const questions = generateQuestions(difficultySetting, totalRounds);

  const updates: Record<string, any> = {
    difficultySetting,
    totalRounds,
    questions,
  };
  if (gameMode) {
    updates.gameMode = gameMode;
  }

  await updateDoc(partyRef, updates);
}

/**
 * Lance la partie (passage du lobby à la 1re question ou 1er tirage de roue)
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

  const isWheelMode = party.gameMode === 'wheel';
  const allPlayerIds = Object.keys(party.players || {});

  if (isWheelMode && allPlayerIds.length > 0) {
    const wheelState = computeWheelSpin(allPlayerIds, 1);
    await updateDoc(partyRef, {
      status: 'wheel',
      currentRoundIndex: 0,
      roundStartTime: 0,
      wheelState,
      ...resetPlayers,
    });
  } else {
    await updateDoc(partyRef, {
      status: 'question',
      currentRoundIndex: 0,
      roundStartTime: Date.now(),
      roundDuration: 20,
      ...resetPlayers,
    });
  }
}

/**
 * Démarre la question après la fin de l'animation de la roue
 */
export async function startWheelQuestion(code: string): Promise<void> {
  const partyRef = doc(db, 'parties', code);
  await updateDoc(partyRef, {
    status: 'question',
    roundStartTime: Date.now(),
    roundDuration: 20,
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

    const isWheelMode = party.gameMode === 'wheel';
    const presentPlayerIds = Object.keys(party.players || {});

    if (isWheelMode && presentPlayerIds.length > 0) {
      // Règle d'équité : vérifier les joueurs restants dans le cycle
      let remaining = (party.wheelState?.remainingPlayerIds || []).filter((id) =>
        presentPlayerIds.includes(id)
      );
      let cycle = party.wheelState?.cycleNumber || 1;

      // Si tous les joueurs présents sont passés dans le cycle, reconstituer la roue avec tout le monde
      if (remaining.length === 0) {
        remaining = [...presentPlayerIds];
        cycle += 1;
      }

      const wheelState = computeWheelSpin(remaining, cycle);

      await updateDoc(partyRef, {
        status: 'wheel',
        currentRoundIndex: nextRoundIndex,
        roundStartTime: 0,
        wheelState,
        ...resetPlayers,
      });
    } else {
      await updateDoc(partyRef, {
        status: 'question',
        currentRoundIndex: nextRoundIndex,
        roundStartTime: Date.now(),
        roundDuration: 20,
        ...resetPlayers,
      });
    }
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
