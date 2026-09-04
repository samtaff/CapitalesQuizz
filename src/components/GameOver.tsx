import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Crown, RotateCcw, Home, Sparkles, Medal, Skull } from 'lucide-react';
import { PartyDoc, Player } from '../types';
import { restartParty } from '../services/gameService';
import { sounds } from '../utils/soundEffects';
import {
  getRandomLeaderPunchline,
  getRandomLastPlacePunchline,
  getRandomRunnerUpPunchline,
  getRandomBronzePunchline,
  getRandomSoloDefeatPunchline,
  getRandomFailurePunchline,
  getPlayerRankingPunchline,
} from '../utils/humorMessages';

interface GameOverProps {
  party: PartyDoc;
  currentPlayerId: string;
  onHome: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  party,
  currentPlayerId,
  onHome,
}) => {
  const isHost = party.hostId === currentPlayerId;

  // Sorted players by total score
  const rankedPlayers: Player[] = (Object.values(party.players || {}) as Player[]).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  const winner = rankedPlayers[0];
  const second = rankedPlayers[1];
  const third = rankedPlayers[2];
  const lastPlayer =
    rankedPlayers.length > 2
      ? rankedPlayers[rankedPlayers.length - 1]
      : winner?.totalScore === 0
      ? winner
      : null;

  const myIndex = rankedPlayers.findIndex((p) => p.id === currentPlayerId);
  const myRank = myIndex !== -1 ? myIndex + 1 : 1;
  const myPlayer = rankedPlayers[myIndex] || party.players?.[currentPlayerId];
  const isSolo = rankedPlayers.length <= 1;

  // Did I win or lose?
  const isSoloDefeat = isSolo && (winner ? winner.totalScore === 0 : true);
  const didIWin = myIndex === 0 && !isSoloDefeat;
  // If only 2 players, 2nd place is RUNNER UP with silver medal, NOT last place wooden spoon!
  const isMySecond = !isSolo && myIndex === 1;
  const isMyThird = !isSolo && myIndex === 2;
  const isMyLastPlace = isSolo ? isSoloDefeat : (rankedPlayers.length > 2 && myIndex === rankedPlayers.length - 1);

  // Stable punchlines per player ID
  const winnerPunchline = useMemo(() => getRandomLeaderPunchline(), [winner?.id]);
  const runnerUpPunchline = useMemo(
    () => getRandomRunnerUpPunchline(),
    [second?.id]
  );
  const bronzePunchline = useMemo(
    () => getRandomBronzePunchline(),
    [third?.id]
  );
  const lastPlacePunchline = useMemo(
    () => getRandomLastPlacePunchline(),
    [lastPlayer?.id]
  );
  const soloDefeatPunchline = useMemo(
    () => getRandomSoloDefeatPunchline(),
    [winner?.id]
  );
  const myFailurePunchline = useMemo(
    () => getRandomFailurePunchline(),
    [currentPlayerId]
  );

  // Which punchline is addressed directly to ME
  const myVerdictPunchline = useMemo(() => {
    if (didIWin) return winnerPunchline;
    if (isSoloDefeat) return soloDefeatPunchline;
    if (isMySecond) return runnerUpPunchline;
    if (isMyThird) return bronzePunchline;
    if (isMyLastPlace) return lastPlacePunchline;
    return myFailurePunchline;
  }, [
    didIWin,
    isSoloDefeat,
    isMySecond,
    isMyThird,
    isMyLastPlace,
    winnerPunchline,
    soloDefeatPunchline,
    runnerUpPunchline,
    bronzePunchline,
    lastPlacePunchline,
    myFailurePunchline,
  ]);

  const handleRestart = async () => {
    sounds.playClick();
    await restartParty(party.code);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-5 px-3 py-6 select-none">
      {/* Top Banner */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center relative"
      >
        <div className="absolute -inset-8 bg-[#FB923C]/20 blur-3xl rounded-full pointer-events-none" />

        <p className="text-xs uppercase tracking-widest text-[#FB923C] mb-1 font-bold flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>Partie terminée !</span>
          <Sparkles className="w-4 h-4" />
        </p>
        <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight">
          Le Podium Final
        </h2>
      </motion.div>

      {/* PERSONAL VERDICT BANNER */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={`w-full max-w-xl p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 text-center border-2 ${
          didIWin
            ? 'bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 border-amber-400 shadow-amber-500/20 ring-2 ring-amber-400/40'
            : isMySecond
            ? 'bg-gradient-to-r from-slate-400/25 via-indigo-500/20 to-slate-400/25 border-slate-300 shadow-slate-400/20 ring-2 ring-slate-300/40'
            : isMyThird
            ? 'bg-gradient-to-r from-amber-700/25 via-orange-700/20 to-amber-700/25 border-amber-600 shadow-amber-700/20 ring-2 ring-amber-600/40'
            : isMyLastPlace
            ? 'bg-gradient-to-r from-rose-500/25 via-pink-500/20 to-rose-500/25 border-rose-400 shadow-rose-500/20 ring-2 ring-rose-400/40'
            : 'bg-gradient-to-r from-purple-500/20 via-slate-500/20 to-purple-500/20 border-purple-400/60 shadow-purple-500/10'
        }`}
      >
        {/* Banner Title */}
        <div className="flex items-center gap-2 font-black uppercase text-sm sm:text-base tracking-wider">
          {didIWin ? (
            <>
              <Crown className="w-6 h-6 fill-amber-400 text-amber-300 drop-shadow" />
              <span className="text-amber-300">🏆 VICTOIRE ÉCLATANTE ! TU AS GAGNÉ !</span>
            </>
          ) : isMySecond ? (
            <>
              <Medal className="w-6 h-6 text-slate-200 drop-shadow" />
              <span className="text-slate-200">🥈 MÉDAILLE D'ARGENT ! 2ÈME DU PODIUM</span>
            </>
          ) : isMyThird ? (
            <>
              <Medal className="w-6 h-6 text-amber-500 drop-shadow" />
              <span className="text-amber-400">🥉 MÉDAILLE DE BRONZE ! SUR LE PODIUM</span>
            </>
          ) : isMyLastPlace ? (
            <>
              <Skull className="w-6 h-6 text-rose-400 drop-shadow" />
              <span className="text-rose-300">💀 DÉFAITE CUISANTE ! CUILLÈRE DE BOIS</span>
            </>
          ) : (
            <>
              <Trophy className="w-6 h-6 text-purple-300 drop-shadow" />
              <span className="text-purple-300">
                RÉSULTAT : #{myRank} SUR {rankedPlayers.length} JOUEURS
              </span>
            </>
          )}
        </div>

        {/* Banner Details */}
        <p className="text-white/90 text-sm sm:text-base font-semibold">
          {didIWin ? (
            <>
              Bravo <span className="text-amber-300 font-black">{myPlayer?.nickname || 'Champion'}</span>, tu domines le classement avec{' '}
              <span className="text-amber-300 font-black">{myPlayer?.totalScore || 0} pts</span> !
            </>
          ) : isMySecond ? (
            <>
              Magnifique <span className="text-slate-200 font-black">{myPlayer?.nickname}</span> ! Tu es sur la 2ème marche du podium avec{' '}
              <span className="text-slate-200 font-black">{myPlayer?.totalScore || 0} pts</span>.
            </>
          ) : isMyThird ? (
            <>
              Bravo <span className="text-amber-400 font-black">{myPlayer?.nickname}</span> ! Tu décroches la 3ème place sur le podium avec{' '}
              <span className="text-amber-400 font-black">{myPlayer?.totalScore || 0} pts</span>.
            </>
          ) : isMyLastPlace ? (
            <>
              Aïe <span className="text-rose-300 font-black">{myPlayer?.nickname}</span>, c'est la douche froide... Tu finis bon dernier avec{' '}
              <span className="text-rose-300 font-black">{myPlayer?.totalScore || 0} pts</span>.
            </>
          ) : (
            <>
              Bien joué <span className="text-purple-200 font-black">{myPlayer?.nickname}</span> ! Belle partie avec{' '}
              <span className="text-purple-200 font-black">{myPlayer?.totalScore || 0} pts</span>.
            </>
          )}
        </p>

        {/* The Humor Punchline */}
        <div
          className={`w-full mt-1 px-3.5 py-2.5 rounded-xl border flex items-start justify-center gap-2 ${
            didIWin
              ? 'bg-amber-400/15 border-amber-400/40 text-amber-100'
              : isMySecond
              ? 'bg-slate-400/15 border-slate-400/40 text-slate-100'
              : isMyThird
              ? 'bg-amber-800/25 border-amber-700/40 text-amber-100'
              : isMyLastPlace
              ? 'bg-rose-500/15 border-rose-400/40 text-rose-100'
              : 'bg-purple-500/15 border-purple-400/40 text-purple-100'
          }`}
        >
          {didIWin ? (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : isMySecond ? (
            <Medal className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
          ) : isMyThird ? (
            <Medal className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          ) : isMyLastPlace ? (
            <Skull className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          )}
          <p className="text-xs sm:text-sm font-medium italic whitespace-normal break-words leading-relaxed text-center">
            « {myVerdictPunchline} »
          </p>
        </div>
      </motion.div>

      {/* 3D-styled Kahoot Podium for Top 3 */}
      <div className="w-full max-w-xl grid grid-cols-3 gap-2 sm:gap-4 items-end pt-2 pb-2">
        {/* 2nd Place */}
        {second ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center min-w-0"
          >
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-slate-300 relative mb-2"
              style={{ backgroundColor: second.color }}
            >
              {second.nickname.charAt(0)}
              <div className="absolute -top-1.5 -right-1.5 bg-slate-300 text-slate-900 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                2
              </div>
            </div>
            <span className="text-white font-bold text-xs sm:text-sm truncate max-w-[90px] text-center">
              {second.nickname}
            </span>
            <span className="text-white/70 text-xs font-bold mb-1.5">
              {second.totalScore} pts
            </span>

            {/* Podium phrase under 2nd place */}
            <div className="mb-2 px-2 py-1.5 bg-slate-400/20 border border-slate-400/35 rounded-xl text-[10px] sm:text-xs text-slate-200 font-medium italic text-center w-full shadow-sm">
              <span className="leading-snug block break-words">« {runnerUpPunchline} »</span>
            </div>

            <div className="w-full h-28 sm:h-36 bg-gradient-to-b from-slate-300/30 to-[#1A1443] rounded-t-2xl border-t-2 border-slate-300/60 flex items-center justify-center">
              <Medal className="w-8 h-8 text-slate-300" />
            </div>
          </motion.div>
        ) : (
          <div />
        )}

        {/* 1st Place (Champion) */}
        {winner ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center min-w-0"
          >
            <div className="relative mb-2">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#FB923C]"
              >
                <Crown className="w-8 h-8 fill-[#FB923C] filter drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
              </motion.div>
              <div
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-2xl border-3 border-[#FB923C]"
                style={{ backgroundColor: winner.color }}
              >
                {winner.nickname.charAt(0)}
              </div>
            </div>
            <span className="text-white font-black text-sm sm:text-base truncate max-w-[110px] text-center">
              {winner.nickname}
            </span>
            <span className="text-[#FB923C] text-xs sm:text-sm font-black mb-1.5">
              {winner.totalScore} pts
            </span>

            {/* Podium phrase under 1st place */}
            <div className="mb-2 px-2 py-1.5 bg-amber-400/25 border border-amber-400/40 rounded-xl text-[10px] sm:text-xs text-amber-200 font-medium italic text-center w-full shadow-sm">
              <span className="leading-snug block break-words">« {winnerPunchline} »</span>
            </div>

            <div className="w-full h-40 sm:h-48 bg-gradient-to-b from-[#FB923C]/40 to-[#1A1443] rounded-t-2xl border-t-3 border-[#FB923C] flex items-center justify-center shadow-lg shadow-[#FB923C]/20">
              <Trophy className="w-10 h-10 text-[#FB923C] drop-shadow" />
            </div>
          </motion.div>
        ) : null}

        {/* 3rd Place */}
        {third ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center min-w-0"
          >
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-amber-700 relative mb-2"
              style={{ backgroundColor: third.color }}
            >
              {third.nickname.charAt(0)}
              <div className="absolute -top-1.5 -right-1.5 bg-amber-700 text-amber-100 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
                3
              </div>
            </div>
            <span className="text-white font-bold text-xs sm:text-sm truncate max-w-[80px] text-center">
              {third.nickname}
            </span>
            <span className="text-white/70 text-xs font-bold mb-1.5">
              {third.totalScore} pts
            </span>

            {/* Podium phrase under 3rd place */}
            <div className="mb-2 px-2 py-1.5 bg-amber-800/30 border border-amber-700/40 rounded-xl text-[10px] sm:text-xs text-amber-200 font-medium italic text-center w-full shadow-sm">
              <span className="leading-snug block break-words">« {bronzePunchline} »</span>
            </div>

            <div className="w-full h-20 sm:h-28 bg-gradient-to-b from-amber-700/30 to-[#1A1443] rounded-t-2xl border-t-2 border-amber-700/60 flex items-center justify-center">
              <Medal className="w-7 h-7 text-amber-600" />
            </div>
          </motion.div>
        ) : (
          <div />
        )}
      </div>

      {/* DEDICATED LAST PLACE CARD (Cuillère de bois) when playing multiplayer (3+ players) */}
      {lastPlayer && rankedPlayers.length > 2 && (
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-xl p-3.5 sm:p-4 bg-gradient-to-r from-rose-500/20 via-pink-500/10 to-rose-500/20 border border-rose-400/60 rounded-2xl shadow-xl flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/30 border border-rose-400/40 flex items-center justify-center shrink-0">
            <Skull className="w-5 h-5 text-rose-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-300 bg-rose-500/30 px-2 py-0.5 rounded-md border border-rose-400/30">
                Cuillère de bois
              </span>
              <span className="text-white font-bold text-xs sm:text-sm">
                {lastPlayer.nickname} ({lastPlayer.totalScore} pts)
              </span>
              {lastPlayer.id === currentPlayerId && (
                <span className="text-[10px] bg-rose-400 text-rose-950 font-black px-1.5 py-0.2 rounded uppercase">
                  Vous
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-rose-100 font-medium italic mt-1 whitespace-normal break-words leading-relaxed">
              « {lastPlacePunchline} »
            </p>
          </div>
        </motion.div>
      )}

      {/* Full Scoreboard list */}
      <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl">
        <p className="text-xs uppercase tracking-widest text-white/60 font-bold mb-3 px-1">
          Tous les scores
        </p>

        <div className="flex flex-col gap-2.5">
          {rankedPlayers.map((player, idx) => {
            const isLeader = idx === 0;
            const isSecondPlace = idx === 1;
            const isThirdPlace = idx === 2;
            const isLastPlaceRow =
              rankedPlayers.length > 2 && idx === rankedPlayers.length - 1;
            const isCurrent = player.id === currentPlayerId;

            // Stable tailored punchline for EVERY player
            const playerPunchline = getPlayerRankingPunchline(
              idx + 1,
              rankedPlayers.length,
              player.id
            );

            return (
              <div
                key={player.id}
                className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? isLeader
                      ? 'bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-white/10 border-amber-400 shadow-md ring-2 ring-amber-400'
                      : isSecondPlace
                      ? 'bg-gradient-to-r from-slate-400/25 via-indigo-500/15 to-white/10 border-slate-300 shadow-md ring-2 ring-slate-300'
                      : isThirdPlace
                      ? 'bg-gradient-to-r from-amber-700/25 via-orange-700/15 to-white/10 border-amber-600 shadow-md ring-2 ring-amber-600'
                      : isLastPlaceRow
                      ? 'bg-gradient-to-r from-rose-500/25 via-pink-500/15 to-white/10 border-rose-400 shadow-md ring-2 ring-rose-400'
                      : 'bg-white/15 border-purple-400 ring-2 ring-purple-400/60'
                    : isLeader
                    ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-white/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                    : isSecondPlace
                    ? 'bg-white/10 border-slate-400/40'
                    : isThirdPlace
                    ? 'bg-white/10 border-amber-700/40'
                    : isLastPlaceRow
                    ? 'bg-white/5 border-rose-400/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 font-black text-xs text-white/60 shrink-0">
                      {isLeader ? (
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400 inline" />
                      ) : isSecondPlace ? (
                        <Medal className="w-4 h-4 text-slate-300 inline" />
                      ) : isThirdPlace ? (
                        <Medal className="w-4 h-4 text-amber-600 inline" />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs border shrink-0 ${
                        isLeader
                          ? 'border-amber-300 ring-1 ring-amber-400/50'
                          : isSecondPlace
                          ? 'border-slate-300'
                          : isThirdPlace
                          ? 'border-amber-600'
                          : 'border-[#1A1443]'
                      }`}
                      style={{ backgroundColor: player.color }}
                    >
                      {player.nickname.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-white font-bold text-sm truncate">
                        {player.nickname}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                          Vous
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`font-black text-sm sm:text-base shrink-0 pl-2 ${
                      isLeader ? 'text-amber-300' : isSecondPlace ? 'text-slate-200' : isThirdPlace ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    {player.totalScore} pts
                  </span>
                </div>

                {/* Tailored punchline for EVERY player in the scoreboard */}
                <div
                  className={`w-full flex items-start gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border ${
                    isLeader
                      ? 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                      : isSecondPlace
                      ? 'bg-slate-400/15 border-slate-400/35 text-slate-200'
                      : isThirdPlace
                      ? 'bg-amber-800/20 border-amber-700/35 text-amber-200'
                      : isLastPlaceRow
                      ? 'bg-rose-500/15 border-rose-400/30 text-rose-200'
                      : 'bg-purple-500/15 border-purple-400/25 text-purple-200'
                  }`}
                >
                  {isLeader ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : isSecondPlace ? (
                    <Medal className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                  ) : isThirdPlace ? (
                    <Medal className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  ) : isLastPlaceRow ? (
                    <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0 mt-0.5" />
                  )}
                  <p className="italic leading-relaxed whitespace-normal break-words flex-1 text-left">
                    « {playerPunchline} »
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex items-center justify-center gap-4 flex-wrap mt-2">
        {isHost && (
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 bg-[#FB923C] hover:brightness-110 text-[#1A1443] font-black text-sm uppercase tracking-wider py-3.5 px-6 rounded-2xl shadow-xl shadow-[#FB923C]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rejouer ensemble (même salon)</span>
          </button>
        )}

        <button
          onClick={onHome}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold text-sm uppercase tracking-wider py-3.5 px-6 rounded-2xl transition-all active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Accueil</span>
        </button>
      </div>
    </div>
  );
};
