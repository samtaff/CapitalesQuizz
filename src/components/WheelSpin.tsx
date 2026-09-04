import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Crown, ArrowRight, Dices, Users, Volume2, VolumeX } from 'lucide-react';
import { PartyDoc, Player, WheelState } from '../types';
import { startWheelQuestion } from '../services/gameService';
import { sounds } from '../utils/soundEffects';

interface WheelSpinProps {
  party: PartyDoc;
  currentPlayerId: string;
  onLeave?: () => void;
}

export const WheelSpin: React.FC<WheelSpinProps> = ({
  party,
  currentPlayerId,
}) => {
  const isHost = party.hostId === currentPlayerId;
  const wheelState: WheelState = party.wheelState || {
    activePlayerId: party.hostId,
    eligiblePlayerIds: Object.keys(party.players || {}),
    remainingPlayerIds: [],
    cycleNumber: 1,
    targetPlayerId: party.hostId,
    spinTargetAngle: 2160,
    spinStartTime: Date.now(),
    spinDuration: 4500,
  };

  const eligibleIds = wheelState.eligiblePlayerIds || [];
  const playersMap = party.players || {};
  const targetPlayer: Player | undefined = playersMap[wheelState.targetPlayerId];
  const isTargetCurrent = wheelState.targetPlayerId === currentPlayerId;

  const [hasStartedSpin, setHasStartedSpin] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showWinnerReveal, setShowWinnerReveal] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(3);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Sound ticking management
  const tickIntervalsRef = useRef<number[]>([]);
  const hasPlayedWinSoundRef = useRef(false);

  // Start spinning animation
  useEffect(() => {
    // Small delay before spin starts for dramatic visual cue
    const startTimeout = window.setTimeout(() => {
      setHasStartedSpin(true);
      setRotationDegrees(wheelState.spinTargetAngle);

      // Simulate realistic mechanical ticking sound with deceleration
      const duration = wheelState.spinDuration || 4500;
      const numTicks = 34; // Number of ticks during spin
      tickIntervalsRef.current.forEach((id) => window.clearTimeout(id));
      tickIntervalsRef.current = [];

      for (let i = 0; i < numTicks; i++) {
        // Non-linear easing for ticking intervals (frequent at start, spread out at end)
        const progress = i / numTicks;
        // Cubic easing for timing
        const delay = Math.pow(progress, 2.4) * (duration - 300);
        const pitchMultiplier = 1.2 - progress * 0.5;

        const timeoutId = window.setTimeout(() => {
          sounds.playWheelTick(pitchMultiplier);
        }, delay);

        tickIntervalsRef.current.push(timeoutId);
      }
    }, 350);

    // End of spin
    const endTimeout = window.setTimeout(() => {
      setIsSpinning(false);
      setShowWinnerReveal(true);

      if (!hasPlayedWinSoundRef.current) {
        hasPlayedWinSoundRef.current = true;
        sounds.playWheelWin();
      }
    }, (wheelState.spinDuration || 4500) + 400);

    return () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(endTimeout);
      tickIntervalsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, [wheelState.spinTargetAngle, wheelState.spinDuration]);

  // Winner countdown before transitioning to question
  useEffect(() => {
    if (!showWinnerReveal) return;

    const timer = window.setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          // Auto advance by host
          if (isHost && !isAdvancing) {
            setIsAdvancing(true);
            startWheelQuestion(party.code).catch(console.error);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showWinnerReveal, isHost, party.code, isAdvancing]);

  const handleManualStartQuestion = async () => {
    if (!isHost || isAdvancing) return;
    setIsAdvancing(true);
    sounds.playClick();
    await startWheelQuestion(party.code);
  };

  // SVG Wheel geometry calculations
  const numSegments = Math.max(1, eligibleIds.length);
  const sliceAngle = 360 / numSegments;
  const radius = 170;
  const center = 200;

  // Helper to calculate SVG arc path
  const getSlicePath = (index: number) => {
    if (numSegments === 1) {
      // Full circle
      return `M ${center},${center - radius} A ${radius},${radius} 0 1,1 ${center},${center + radius} A ${radius},${radius} 0 1,1 ${center},${center - radius} Z`;
    }

    const startAngle = (index * sliceAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * sliceAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    return `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between p-3 sm:p-5 select-none max-w-4xl mx-auto">
      {/* Top Bar: Title, Round and Cycle Info */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-[#1e174b]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 mb-3 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Dices className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-sm sm:text-base uppercase tracking-wider">
                Mode Roue • Tirage au sort
              </span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full">
                Cycle {wheelState.cycleNumber}
              </span>
            </div>
            <p className="text-white/60 text-xs font-semibold">
              Manche {party.currentRoundIndex + 1} sur {party.totalRounds} • {eligibleIds.length} joueur{eligibleIds.length > 1 ? 's' : ''} en lice
            </p>
          </div>
        </div>

        {/* Status of players in cycle */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10">
          <span className="text-[10px] text-white/50 uppercase font-bold px-1.5">Cycle :</span>
          {(Object.values(playersMap) as Player[]).map((p) => {
            const isEligible = eligibleIds.includes(p.id);
            return (
              <div
                key={p.id}
                title={`${p.nickname} : ${isEligible ? 'Sur la roue ce tour' : 'Déjà interrogé ce cycle'}`}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border uppercase transition-all ${
                  isEligible
                    ? 'border-white text-white shadow-md scale-105'
                    : 'border-white/20 text-white/30 bg-black/40 opacity-40'
                }`}
                style={{ backgroundColor: isEligible ? p.color : undefined }}
              >
                {p.nickname.charAt(0)}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Main Center Area: The Wheel & Flapper */}
      <div className="relative flex-1 flex flex-col items-center justify-center py-2 min-h-[360px] sm:min-h-[420px] w-full">
        {/* Fixed Top Needle / Flapper (Pointer pointing down into the wheel at 12h) */}
        <div className="relative z-30 flex flex-col items-center -mb-4">
          <motion.div
            animate={
              isSpinning && hasStartedSpin
                ? {
                    rotate: [0, -12, 10, -6, 0],
                    transition: { repeat: Infinity, duration: 0.12 },
                  }
                : { rotate: 0 }
            }
            className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[34px] border-t-amber-400 drop-shadow-[0_4px_10px_rgba(251,146,60,0.8)] filter"
          />
          <div className="w-4 h-4 -mt-9 rounded-full bg-white border-2 border-amber-500 shadow-md" />
        </div>

        {/* Outer Wheel Container with Golden Frame */}
        <div className="relative p-3 rounded-full bg-gradient-to-b from-amber-500/40 via-purple-900/40 to-black/60 shadow-[0_0_50px_rgba(251,146,60,0.3)] border-4 border-amber-400/40">
          {/* Animated Rotating Wheel Canvas / SVG */}
          <div
            className="w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full overflow-hidden relative shadow-2xl"
            style={{
              transform: `rotate(${rotationDegrees}deg)`,
              transition: hasStartedSpin
                ? `transform ${wheelState.spinDuration || 4500}ms cubic-bezier(0.12, 0.88, 0.25, 1)`
                : 'none',
            }}
          >
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full transform origin-center"
            >
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Slices */}
              {eligibleIds.map((playerId, index) => {
                const player = playersMap[playerId];
                const color = player?.color || '#3B82F6';
                const midAngle = (index + 0.5) * sliceAngle;
                const radians = (midAngle - 90) * (Math.PI / 180);
                const textDist = radius * 0.65;
                const textX = center + textDist * Math.cos(radians);
                const textY = center + textDist * Math.sin(radians);

                return (
                  <g key={playerId}>
                    {/* Slice Path */}
                    <path
                      d={getSlicePath(index)}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    {/* Radial Player Label */}
                    <g
                      transform={`translate(${textX}, ${textY}) rotate(${midAngle})`}
                      className="select-none pointer-events-none"
                    >
                      {/* White text background for high readability */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize={numSegments > 6 ? '12' : numSegments > 3 ? '14' : '17'}
                        fontWeight="900"
                        letterSpacing="1px"
                        filter="url(#shadow)"
                        className="uppercase font-black"
                      >
                        {player?.nickname ? player.nickname.slice(0, 11) : `J${index + 1}`}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Outer Golden Pegs */}
              {Array.from({ length: Math.max(12, numSegments * 2) }).map((_, i, arr) => {
                const angle = (i * 360) / arr.length;
                const rad = (angle - 90) * (Math.PI / 180);
                const pegDist = radius - 6;
                const px = center + pegDist * Math.cos(rad);
                const py = center + pegDist * Math.sin(rad);
                return (
                  <circle
                    key={i}
                    cx={px}
                    cy={py}
                    r="3"
                    fill="#FDE047"
                    stroke="#1E174B"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>

            {/* Wheel Center Cap */}
            <div className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1A1443] border border-amber-300/60 flex items-center justify-center text-amber-300 font-black text-xs shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Subtitle / Suspense */}
        <div className="mt-4 text-center">
          {isSpinning ? (
            <p className="text-white/80 font-extrabold text-sm sm:text-base uppercase tracking-widest animate-pulse flex items-center gap-2 justify-center">
              <span className="inline-block animate-spin text-amber-400">⚡</span>
              La roue tourne... Qui sera le joueur interrogé ?
            </p>
          ) : (
            <p className="text-emerald-400 font-extrabold text-sm sm:text-base uppercase tracking-widest">
              Tirage au sort terminé !
            </p>
          )}
        </div>
      </div>

      {/* Winner Reveal Modal Overlay */}
      <AnimatePresence>
        {showWinnerReveal && targetPlayer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-[#140e36]/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none"
          >
            <div className="w-full max-w-md bg-[#1e174b] border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(251,146,60,0.4)] flex flex-col items-center text-center gap-5 relative overflow-hidden">
              {/* Background ambient glow in player color */}
              <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundColor: targetPlayer.color }}
              />
              <div
                className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundColor: targetPlayer.color }}
              />

              {/* Tag */}
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Tirage au sort de la Roue
              </span>

              {/* Big Player Avatar with Glowing Halo */}
              <div className="relative">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-2xl uppercase border-4 border-white/80 ring-8 ring-white/10"
                  style={{ backgroundColor: targetPlayer.color }}
                >
                  {targetPlayer.nickname.charAt(0)}
                </div>
                {targetPlayer.isHost && (
                  <div className="absolute -top-2 -right-2 bg-amber-400 text-[#1A1443] p-1.5 rounded-full shadow-lg">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>

              {/* Winner Announcement & Name in HUGE font */}
              <div className="space-y-1">
                <p className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest">
                  C'est au tour de
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase break-words">
                  {targetPlayer.nickname}
                </h2>
                <p className="text-amber-300 font-extrabold text-sm sm:text-base mt-2">
                  {isTargetCurrent
                    ? '🎯 C’est votre tour ! Choisissez votre mode (Cash ou Carré).'
                    : `Préparez-vous à l'encourager ! (${targetPlayer.nickname} répond pour marquer des points)`}
                </p>
              </div>

              {/* Countdown Progress */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-1">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex items-center gap-3 mt-1">
                {isHost ? (
                  <button
                    onClick={handleManualStartQuestion}
                    disabled={isAdvancing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-[#1A1443] font-black text-sm uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Lancer la question</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : (
                  <div className="w-full text-center text-xs text-white/60 font-semibold">
                    Lancement de la question dans {countdownRemaining}s...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
