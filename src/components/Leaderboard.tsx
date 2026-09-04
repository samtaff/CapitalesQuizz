import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Crown, Trophy, ArrowRight, Flag, LogOut, Sparkles, Skull } from 'lucide-react';
import { PartyDoc, Player } from '../types';
import { nextRoundOrEnd } from '../services/gameService';
import { sounds } from '../utils/soundEffects';
import {
  getRandomLeaderPunchline,
  getRandomLastPlacePunchline,
} from '../utils/humorMessages';

interface LeaderboardProps {
  party: PartyDoc;
  currentPlayerId: string;
  onLeave?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  party,
  currentPlayerId,
  onLeave,
}) => {
  const isHost = party.hostId === currentPlayerId;
  const isLastRound = party.currentRoundIndex + 1 >= party.questions.length;

  // Sort players by total score descending
  const sortedPlayers: Player[] = (Object.values(party.players || {}) as Player[]).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  // Dedicated punchlines for leader and last place (stable per round & player)
  const leaderMessage = useMemo(() => {
    return getRandomLeaderPunchline();
  }, [party.currentRoundIndex, sortedPlayers[0]?.id]);

  const lastPlaceMessage = useMemo(() => {
    return getRandomLastPlacePunchline();
  }, [party.currentRoundIndex, sortedPlayers[sortedPlayers.length - 1]?.id]);

  const handleNextRound = async () => {
    sounds.playClick();
    await nextRoundOrEnd(party.code);
  };

  const formattedRound = String(party.currentRoundIndex + 1).padStart(2, '0');
  const formattedTotal = String(party.questions.length).padStart(2, '0');

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 px-3 py-6 select-none">
      {/* Title (Artistic Flair) */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-white/60 mb-1 font-bold">
          Manche {formattedRound}/{formattedTotal} terminée
        </p>
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-[#FB923C]" />
          <span>Classement</span>
        </h2>
      </div>

      {/* Players Standings List */}
      <div className="w-full flex flex-col gap-3">
        {sortedPlayers.map((player, index) => {
          const isLeader = index === 0;
          const isLastPlace = sortedPlayers.length > 1 && index === sortedPlayers.length - 1;
          const isCurrent = player.id === currentPlayerId;
          const delta = player.lastRoundDelta || 0;

          return (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.08 }}
              className={`relative flex flex-col gap-2.5 p-4 rounded-2xl border transition-all ${
                isLeader
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-white/10 backdrop-blur-md border-amber-400/80 shadow-2xl shadow-amber-500/15 ring-2 ring-amber-400/60'
                  : isLastPlace
                  ? 'bg-white/10 backdrop-blur-md border-rose-400/40'
                  : isCurrent
                  ? 'bg-white/15 backdrop-blur-md border-white/40 ring-1 ring-white/30'
                  : 'bg-white/10 backdrop-blur-md border-white/10'
              }`}
            >
              {/* Top Row: Rank, Avatar, Nickname & Scores */}
              <div className="flex items-center justify-between w-full">
                {/* Left: Rank, Avatar, Nickname */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  {/* Rank number or Crown for 1st */}
                  <div className="w-6 sm:w-8 flex items-center justify-center font-black text-base sm:text-xl text-white/70 shrink-0">
                    {isLeader ? (
                      <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    ) : isLastPlace ? (
                      <span className="text-white/40">#{index + 1}</span>
                    ) : (
                      <span>#{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm shrink-0 uppercase border-2 ${
                      isLeader ? 'border-amber-300 ring-2 ring-amber-400/40' : 'border-[#1A1443]'
                    }`}
                    style={{ backgroundColor: player.color }}
                  >
                    {player.nickname.charAt(0)}
                  </div>

                  {/* Nickname & Label */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white font-bold text-sm sm:text-lg truncate">
                        {player.nickname}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] sm:text-[10px] bg-white/20 text-white font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          Vous
                        </span>
                      )}
                      {isLeader && (
                        <span className="text-[9px] sm:text-[10px] bg-amber-400/25 text-amber-200 border border-amber-400/40 font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 fill-amber-300" />
                          1er
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-white/50 uppercase tracking-wider font-semibold block">
                      {player.isHost ? 'Hôte' : 'Joueur'}
                    </span>
                  </div>
                </div>

                {/* Right: Score and Delta */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 pl-2">
                  {/* Score Delta (+X pts in animated green) */}
                  {delta > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="text-emerald-400 font-black text-[11px] sm:text-sm bg-emerald-950/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-emerald-500/40"
                    >
                      +{delta}
                    </motion.span>
                  )}

                  {/* Total Score */}
                  <div className="text-right min-w-[50px] sm:min-w-[70px]">
                    <div
                      className={`font-black text-lg sm:text-2xl tracking-tight ${
                        isLeader ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {player.totalScore}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-widest font-black">
                      PTS
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-width Humorous punchline for leader */}
              {isLeader && (
                <motion.div
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex items-start gap-2 text-xs sm:text-sm text-amber-100 font-medium bg-amber-500/15 border border-amber-400/35 px-3 py-2 rounded-xl shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="italic leading-relaxed whitespace-normal break-words flex-1 text-left">
                    « {leaderMessage} »
                  </p>
                </motion.div>
              )}

              {/* Full-width Humorous punchline for last place */}
              {isLastPlace && (
                <motion.div
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex items-start gap-2 text-xs sm:text-sm text-rose-100 font-medium bg-rose-500/15 border border-rose-400/35 px-3 py-2 rounded-xl shadow-sm"
                >
                  <Skull className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="italic leading-relaxed whitespace-normal break-words flex-1 text-left">
                    « {lastPlaceMessage} »
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Host Action or Waiting for Host Banner */}
      <div className="w-full max-w-sm mt-4 flex flex-col items-center gap-3">
        {isHost ? (
          <button
            onClick={handleNextRound}
            className="w-full flex items-center justify-center gap-2 bg-[#FB923C] hover:brightness-110 text-[#1A1443] font-black text-base py-4 px-6 rounded-2xl shadow-xl shadow-[#FB923C]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          >
            {isLastRound ? (
              <>
                <Flag className="w-5 h-5" />
                <span>Voir le podium final !</span>
              </>
            ) : (
              <>
                <span>Manche suivante</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 px-5 text-center text-white/80 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-ping" />
            <span>
              {isLastRound
                ? "En attente du podium final..."
                : "En attente que l'hôte lance la manche suivante..."}
            </span>
          </div>
        )}

        {onLeave && (
          <button
            onClick={onLeave}
            className="text-xs text-white/60 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer py-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Quitter la partie</span>
          </button>
        )}
      </div>
    </div>
  );
};
