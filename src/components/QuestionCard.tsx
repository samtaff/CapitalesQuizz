import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  LayoutGrid,
  ArrowRight,
  RotateCcw,
  MapPin,
  SkipForward,
  Trophy,
} from 'lucide-react';
import {
  GameQuestion,
  PartyDoc,
  Player,
  PlayerRoundAnswer,
  ResponseMode,
} from '../types';
import {
  calculateRoundScore,
  evaluateCashAnswer,
} from '../utils/levenshtein';
import {
  setPlayerMode,
  showRoundMap,
  submitPlayerAnswer,
  nextRoundOrEnd,
} from '../services/gameService';
import { sounds } from '../utils/soundEffects';
import { FlagImage } from './FlagImage';
import {
  getRandomSuccessPunchline,
  getRandomFailurePunchline,
} from '../utils/humorMessages';

interface QuestionCardProps {
  party: PartyDoc;
  question: GameQuestion;
  currentPlayerId: string;
  onOpenLeaderboard?: () => void;
  onLeave?: () => void;
}

const SHAPES = [
  { id: 'rouge', color: '#E21B3C', bgClass: 'bg-[#E21B3C]' },
  { id: 'bleu', color: '#1368CE', bgClass: 'bg-[#1368CE]' },
  { id: 'jaune', color: '#D89E00', bgClass: 'bg-[#D89E00]' },
  { id: 'vert', color: '#26890C', bgClass: 'bg-[#26890C]' },
];

export const QuestionCard: React.FC<QuestionCardProps> = ({
  party,
  question,
  currentPlayerId,
  onOpenLeaderboard,
  onLeave,
}) => {
  const isHost = party.hostId === currentPlayerId;
  const currentPlayer = party.players?.[currentPlayerId];

  // Local states
  const [selectedMode, setSelectedMode] = useState<ResponseMode | null>(
    currentPlayer?.selectedMode || null
  );
  const [cashInput, setCashInput] = useState('');
  const [hasSubmittedLocally, setHasSubmittedLocally] = useState(false);
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [selectedCarreOption, setSelectedCarreOption] = useState<string | null>(null);
  const [submittedAnswerText, setSubmittedAnswerText] = useState<string>('');
  const [activePunchline, setActivePunchline] = useState<string>('');
  const [localFeedback, setLocalFeedback] = useState<{
    status: 'correct' | 'minor_error' | 'wrong' | null;
    message: string;
    points: number;
    distance?: number;
  }>({ status: null, message: '', points: 0 });

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync / Reset on new question round
  useEffect(() => {
    setSelectedMode(currentPlayer?.selectedMode || null);
    setCashInput('');
    setHasSubmittedLocally(false);
    setFlashColor(null);
    setSelectedCarreOption(null);
    setSubmittedAnswerText('');
    setActivePunchline('');
    setLocalFeedback({ status: null, message: '', points: 0 });
  }, [question.countryId, party.currentRoundIndex]);

  const alreadyAnswered = Boolean(currentPlayer?.currentAnswer);

  // Difficulty accent theme
  const difficultyTheme = {
    facile: {
      color: '#4ADE80',
      label: 'Difficulté Facile (10 pts)',
      glow: 'rgba(74, 222, 128, 0.25)',
    },
    moyen: {
      color: '#FB923C',
      label: 'Difficulté Moyenne (25 pts)',
      glow: 'rgba(251, 146, 60, 0.25)',
    },
    difficile: {
      color: '#F87171',
      label: 'Difficulté Élevée (50 pts)',
      glow: 'rgba(248, 113, 113, 0.25)',
    },
  }[question.difficulty];

  // Focus input when Cash mode is chosen
  useEffect(() => {
    if (selectedMode === 'cash' && !alreadyAnswered) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [selectedMode, alreadyAnswered]);

  // Mode selection
  const handleSelectMode = async (mode: ResponseMode) => {
    if (alreadyAnswered || hasSubmittedLocally) return;
    sounds.playClick();
    setSelectedMode(mode);
    await setPlayerMode(party.code, currentPlayerId, mode);
  };

  const handleResetMode = async () => {
    if (alreadyAnswered || hasSubmittedLocally) return;
    sounds.playClick();
    setSelectedMode(null);
    setCashInput('');
  };

  // Submit Answer for Cash
  const handleCashSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cashInput.trim() || alreadyAnswered || hasSubmittedLocally) return;

    setHasSubmittedLocally(true);
    const answerText = cashInput.trim();
    setSubmittedAnswerText(answerText);

    const evaluation = evaluateCashAnswer(
      answerText,
      question.capital,
      question.acceptableAnswers
    );

    const scoreResult = calculateRoundScore(
      question.difficulty,
      'cash',
      evaluation.isAccepted,
      evaluation.pointsPercentage
    );

    const isCorrect = evaluation.isAccepted;
    const punchline = isCorrect
      ? getRandomSuccessPunchline()
      : getRandomFailurePunchline();
    setActivePunchline(punchline);
    setFlashColor(isCorrect ? 'green' : 'red');

    const answerRecord: PlayerRoundAnswer = {
      mode: 'cash',
      answer: answerText,
      isCorrect,
      scoreFactor: evaluation.pointsPercentage / 100,
      pointsEarned: scoreResult.points,
      levenshteinDistance: evaluation.distance,
      punchline,
      answeredAt: Date.now(),
      timeTaken: 0,
    };

    if (evaluation.distance === 0) {
      sounds.playCorrect();
      setLocalFeedback({
        status: 'correct',
        message: punchline,
        points: scoreResult.points,
      });
    } else if (evaluation.distance <= 2) {
      sounds.playMinorError();
      setLocalFeedback({
        status: 'minor_error',
        message: punchline,
        points: scoreResult.points,
        distance: evaluation.distance,
      });
    } else {
      sounds.playWrong();
      setLocalFeedback({
        status: 'wrong',
        message: punchline,
        points: 0,
        distance: evaluation.distance,
      });
    }

    await submitPlayerAnswer(party.code, currentPlayerId, answerRecord);
  };

  // Submit Answer for Carré
  const handleCarreSelect = async (chosenCity: string) => {
    if (alreadyAnswered || hasSubmittedLocally) return;

    setHasSubmittedLocally(true);
    setSelectedCarreOption(chosenCity);
    setSubmittedAnswerText(chosenCity);

    const isCorrect =
      chosenCity.toLowerCase().trim() === question.capital.toLowerCase().trim();

    const scoreResult = calculateRoundScore(
      question.difficulty,
      'carre',
      isCorrect,
      isCorrect ? 50 : 0
    );

    const punchline = isCorrect
      ? getRandomSuccessPunchline()
      : getRandomFailurePunchline();
    setActivePunchline(punchline);
    setFlashColor(isCorrect ? 'green' : 'red');

    const answerRecord: PlayerRoundAnswer = {
      mode: 'carre',
      answer: chosenCity,
      isCorrect,
      scoreFactor: isCorrect ? 0.5 : 0,
      pointsEarned: scoreResult.points,
      punchline,
      answeredAt: Date.now(),
      timeTaken: 0,
    };

    if (isCorrect) {
      sounds.playCorrect();
      setLocalFeedback({
        status: 'correct',
        message: punchline,
        points: scoreResult.points,
      });
    } else {
      sounds.playWrong();
      setLocalFeedback({
        status: 'wrong',
        message: punchline,
        points: 0,
      });
    }

    await submitPlayerAnswer(party.code, currentPlayerId, answerRecord);
  };

  const handleAdvanceToMap = async () => {
    sounds.playClick();
    await showRoundMap(party.code);
  };

  const handleSkipMap = async () => {
    sounds.playClick();
    await nextRoundOrEnd(party.code);
  };

  const playersList = Object.values(party.players || {}) as Player[];
  const answeredCount = playersList.filter((p) => p.currentAnswer).length;
  const totalPlayers = playersList.length;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col justify-between select-none px-2 sm:px-4 py-1 sm:py-2 min-h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)] overflow-hidden relative">
      {/* Immediate Screen Flash (Green for success, Soft red for failure) */}
      {flashColor && (
        <motion.div
          key={`screen-flash-${flashColor}`}
          initial={{ opacity: flashColor === 'green' ? 0.35 : 0.28 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className={`fixed inset-0 pointer-events-none z-50 ${
            flashColor === 'green' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
      )}

      {/* Discreet multiplayer indicator (only when multiple players) */}
      {totalPlayers > 1 && (
        <div className="flex justify-end items-center mb-1 shrink-0">
          <span className="text-[11px] text-white/70 font-semibold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{answeredCount}/{totalPlayers} ont répondu</span>
          </span>
        </div>
      )}

      {/* ================= MAIN QUESTION PRESENTATION (Zero-scroll, FlagImage) ================= */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-auto py-1 shrink min-h-0">
        <div className="relative flex flex-col items-center w-full max-w-full">
          {/* Difficulty Badge */}
          <div
            className="px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 shadow-sm text-[#1A1443]"
            style={{
              backgroundColor: difficultyTheme.color,
            }}
          >
            {difficultyTheme.label}
          </div>

          {/* Country Name */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight mb-1 text-white drop-shadow-md px-2 max-w-full break-words">
            {question.country}
          </h1>

          {/* Flag Showcase with real FlagImage component */}
          <div className="w-44 h-28 sm:w-64 sm:h-40 md:w-72 md:h-44 rounded-2xl overflow-hidden shadow-2xl border-2 sm:border-3 border-white/25 bg-black/20 backdrop-blur-md flex items-center justify-center my-1.5 sm:my-2 ring-4 ring-white/10 transition-transform hover:scale-[1.02]">
            <FlagImage
              countryId={question.countryId}
              countryName={question.country}
              className="w-full h-full object-cover"
              fallbackEmoji={question.flag}
            />
          </div>
        </div>
      </main>

      {/* ================= FOOTER / INTERACTION AREA (Compact, Fits without scrolling) ================= */}
      <footer className="w-full mt-1 sm:mt-2 flex flex-col items-center shrink-0">
        {/* State 1: Answered Feedback */}
        {alreadyAnswered || hasSubmittedLocally ? (() => {
          const currentAns = currentPlayer?.currentAnswer;
          const isCorrect = localFeedback.status
            ? (localFeedback.status === 'correct' || localFeedback.status === 'minor_error')
            : (currentAns?.isCorrect ?? false);
          const status = localFeedback.status
            ? localFeedback.status
            : (currentAns?.isCorrect ? 'correct' : 'wrong');
          const points = localFeedback.status
            ? localFeedback.points
            : (currentAns?.pointsEarned ?? 0);
          const punchline = activePunchline
            || currentAns?.punchline
            || (isCorrect ? getRandomSuccessPunchline() : getRandomFailurePunchline());

          const effectiveMode = currentAns?.mode || selectedMode || 'carre';
          const answeredCity = currentAns?.answer || submittedAnswerText || selectedCarreOption || '';

          return (
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xl flex flex-col items-center gap-2"
            >
              {/* If Carre: show the 4 choices with pulse and highlights */}
              {effectiveMode === 'carre' && (
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
                  {question.options.map((option, idx) => {
                    const shape = SHAPES[idx % SHAPES.length];
                    const isCapital = option.toLowerCase().trim() === question.capital.toLowerCase().trim();
                    const isSelected = (answeredCity || selectedCarreOption)?.toLowerCase().trim() === option.toLowerCase().trim();

                    if (isCapital) {
                      // Correct answer highlight with green pulse and clean stacked layout
                      return (
                        <div
                          key={option}
                          className="bg-emerald-600 border-2 border-emerald-300 ring-4 ring-emerald-400/80 shadow-2xl scale-[1.02] animate-pulse rounded-xl sm:rounded-2xl px-2.5 py-2 sm:py-2.5 flex flex-col items-center justify-center text-center shadow-emerald-950/60"
                        >
                          <span className="text-xs sm:text-sm md:text-base font-black text-white uppercase tracking-wide leading-tight break-words text-center w-full">
                            {option}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-300 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/40 mt-1 font-bold shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {isSelected ? `+${points} pts` : 'Bonne réponse'}
                          </span>
                        </div>
                      );
                    }

                    if (isSelected && !isCapital) {
                      // Wrong selection: pulse + soft red with clean stacked layout
                      return (
                        <div
                          key={option}
                          className="bg-rose-800/90 border-2 border-rose-400 ring-4 ring-rose-400/50 shadow-md rounded-xl sm:rounded-2xl px-2.5 py-2 sm:py-2.5 flex flex-col items-center justify-center text-center animate-pulse"
                        >
                          <span className="text-xs sm:text-sm md:text-base font-black text-rose-100 uppercase tracking-wide leading-tight line-through break-words text-center w-full">
                            {option}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-rose-950/90 text-rose-300 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full border border-rose-400/40 mt-1 font-bold shrink-0">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            Votre choix
                          </span>
                        </div>
                      );
                    }

                    // Other dimmed options
                    return (
                      <div
                        key={option}
                        className={`${shape.bgClass} opacity-25 grayscale-[60%] border border-white/10 rounded-xl sm:rounded-2xl px-2.5 py-2 sm:py-2.5 flex items-center justify-center text-center font-bold text-white/50 uppercase text-xs sm:text-sm pointer-events-none`}
                      >
                        <span className="break-words text-center leading-tight">{option}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If Cash: show text field and user input */}
              {effectiveMode === 'cash' && (
                <div className="w-full">
                  <div
                    className={`w-full rounded-xl px-3.5 py-2 border-2 flex items-center justify-between text-xs sm:text-sm font-black uppercase shadow-lg ${
                      isCorrect
                        ? 'bg-emerald-950/80 border-emerald-400 ring-4 ring-emerald-400/60 text-emerald-200 animate-pulse'
                        : 'bg-rose-950/80 border-rose-400 ring-4 ring-rose-400/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-white/60 text-[11px] font-bold uppercase shrink-0">Votre réponse :</span>
                      <span className={`font-black truncate ${!isCorrect ? 'line-through text-rose-200' : 'text-emerald-200'}`}>
                        {answeredCity || cashInput || 'Saisie validée'}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border shrink-0 ml-2 font-bold ${
                        isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          +{points} pts
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          0 pt
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Explicit banner for the correct answer when player made a mistake (works for BOTH Carré & Cash) */}
              {!isCorrect && (
                <div className="w-full bg-emerald-950/95 border-2 border-emerald-400 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 flex items-center justify-between text-xs sm:text-sm shadow-xl">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-200 font-extrabold uppercase text-[11px] sm:text-xs tracking-wide">
                      La bonne réponse était :
                    </span>
                  </div>
                  <span className="text-white font-black text-sm sm:text-base md:text-lg tracking-wider uppercase bg-emerald-600 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-emerald-300 shadow-md">
                    {question.capital}
                  </span>
                </div>
              )}

              {/* Humor punchline banner and next actions */}
              <div
                className={`w-full rounded-2xl p-3 sm:p-3.5 border shadow-2xl relative overflow-hidden backdrop-blur-md flex flex-col gap-2 ${
                  isCorrect
                    ? 'bg-emerald-950/85 border-emerald-400/60'
                    : 'bg-rose-950/85 border-rose-400/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {status === 'correct' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : status === 'minor_error' ? (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                      {status === 'correct'
                        ? 'Bonne réponse !'
                        : status === 'minor_error'
                        ? 'Accepté avec tolérance !'
                        : 'Raté !'}
                    </h3>
                  </div>

                  <div
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${
                      isCorrect
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {isCorrect ? `+${points} pts` : '0 pt'}
                  </div>
                </div>

                {/* Random Humor Message */}
                <div className="bg-black/35 border border-white/10 rounded-xl px-3 py-1.5 text-center">
                  <p className="text-xs sm:text-sm text-white/95 font-semibold italic leading-snug">
                    « {punchline} »
                  </p>
                </div>

                {/* Advance actions */}
                <div className="flex items-center justify-center gap-2 w-full pt-0.5">
                  <button
                    onClick={handleAdvanceToMap}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#FB923C] hover:brightness-110 text-[#1A1443] font-black text-xs sm:text-sm uppercase tracking-wider py-2 sm:py-2.5 rounded-xl shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Voir la carte</span>
                  </button>

                  <button
                    onClick={handleSkipMap}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/20 font-black text-xs sm:text-sm uppercase tracking-wider py-2 sm:py-2.5 rounded-xl shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Passer</span>
                  </button>
                </div>

                {onOpenLeaderboard && (
                  <button
                    onClick={onOpenLeaderboard}
                    className="text-[11px] text-white/60 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trophy className="w-3 h-3 text-[#FB923C]" />
                    <span>Consulter le classement</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })() : selectedMode === null ? (
          /* State 2: REQUIRED FIRST STEP -> Choose between CASH and CARRÉ (Zero scroll!) */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center gap-2 max-w-xl"
          >
            <div className="w-full flex items-center justify-start px-1">
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                Choisissez votre mode :
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full">
              {/* Option 1: CASH Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMode('cash')}
                className="flex flex-col items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border-2 border-white/20 hover:border-[#FB923C] shadow-lg text-left transition-all cursor-pointer group"
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#FB923C]/20 border border-[#FB923C]/40 flex items-center justify-center text-[#FB923C] group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <span className="bg-[#FB923C] text-[#1A1443] font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    100% pts
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight group-hover:text-[#FB923C] transition-colors">
                  CASH
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 font-medium leading-tight">
                  Saisie libre au clavier
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 w-full flex items-center justify-between text-[10px] sm:text-[11px] text-white/60 font-semibold">
                  <span>Tolérance orthographe</span>
                  <span className="text-[#FB923C] font-bold">Choisir →</span>
                </div>
              </motion.button>

              {/* Option 2: CARRÉ Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMode('carre')}
                className="flex flex-col items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border-2 border-white/20 hover:border-emerald-400 shadow-lg text-left transition-all cursor-pointer group"
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <span className="bg-emerald-400 text-[#1A1443] font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    50% pts
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                  CARRÉ
                </h3>
                <p className="text-[11px] text-white/70 mt-0.5 font-medium leading-tight">
                  4 propositions de villes
                </p>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 w-full flex items-center justify-between text-[10px] sm:text-[11px] text-white/60 font-semibold">
                  <span>4 choix</span>
                  <span className="text-emerald-400 font-bold">Choisir →</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : selectedMode === 'cash' ? (
          /* State 3: Mode Cash Active (Text Input) */
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCashSubmit}
            className="w-full max-w-xl bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-xs text-white/70 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-[#FB923C]">
                <Zap className="w-4 h-4 fill-current" />
                Mode Cash (100% des points)
              </span>
              <button
                type="button"
                onClick={handleResetMode}
                className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Changer</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <input
                id="cash-capital-input"
                ref={inputRef}
                type="text"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="Tapez la capitale..."
                autoComplete="off"
                autoCapitalize="words"
                className="flex-1 min-w-0 w-full bg-[#1A1443]/80 border-2 border-white/20 focus:border-white text-white text-sm sm:text-base md:text-lg font-black uppercase tracking-wide px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl outline-none transition-all placeholder:text-white/30 shadow-inner"
              />
              <button
                type="submit"
                disabled={!cashInput.trim()}
                className="bg-[#FB923C] hover:brightness-110 text-[#1A1443] font-black text-xs sm:text-sm uppercase tracking-wider px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Valider</span>
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </motion.form>
        ) : (
          /* State 4: Mode Carré Active (The 4 City Choices) */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-2 max-w-xl"
          >
            <div className="w-full flex items-center justify-between text-xs text-white/70 font-bold uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <LayoutGrid className="w-4 h-4" />
                Mode Carré : choisissez la bonne ville
              </span>
              <button
                type="button"
                onClick={handleResetMode}
                className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Passer en Cash</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
              {question.options.map((option, idx) => {
                const shape = SHAPES[idx % SHAPES.length];
                return (
                  <motion.button
                    key={option}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCarreSelect(option)}
                    className={`${shape.bgClass} hover:brightness-110 cursor-pointer rounded-xl sm:rounded-2xl px-3 py-3 sm:py-3.5 flex items-center justify-center text-center shadow-lg transition-all border border-white/15 min-h-[52px] sm:min-h-[58px] active:scale-95`}
                  >
                    <span className="text-sm sm:text-base md:text-lg font-black uppercase text-white truncate tracking-wide">
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </footer>
    </div>
  );
};
