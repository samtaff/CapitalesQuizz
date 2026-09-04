import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Crown,
  Play,
  LogOut,
  X,
  Settings,
  Dices,
  Sparkles,
} from 'lucide-react';
import { DifficultySelection, GameMode, PartyDoc, Player } from '../types';
import {
  kickPlayer,
  startPartyGame,
  updatePartySettings,
} from '../services/gameService';
import { sounds } from '../utils/soundEffects';

interface LobbyProps {
  party: PartyDoc;
  currentPlayerId: string;
  onLeave: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  party,
  currentPlayerId,
  onLeave,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isHost = party.hostId === currentPlayerId;
  const playersList: Player[] = (Object.values(party.players || {}) as Player[]).sort(
    (a, b) => a.joinedAt - b.joinedAt
  );
  const currentPlayer = party.players?.[currentPlayerId];

  const handleCopyCode = async () => {
    sounds.playClick();
    await navigator.clipboard.writeText(party.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    sounds.playClick();
    const joinUrl = `${window.location.origin}${window.location.pathname}?code=${party.code}`;
    await navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDifficultyChange = async (diff: DifficultySelection) => {
    sounds.playClick();
    await updatePartySettings(party.code, diff, party.totalRounds, party.gameMode || 'classic');
  };

  const handleRoundsChange = async (rounds: number) => {
    sounds.playClick();
    await updatePartySettings(party.code, party.difficultySetting, rounds, party.gameMode || 'classic');
  };

  const handleGameModeChange = async (mode: GameMode) => {
    sounds.playClick();
    await updatePartySettings(party.code, party.difficultySetting, party.totalRounds, mode);
  };

  const handleStartGame = async () => {
    if (!isHost || isStarting) return;
    sounds.playClick();
    setIsStarting(true);
    try {
      await startPartyGame(party.code);
    } catch (err) {
      console.error('Erreur démarrage partie:', err);
      setIsStarting(false);
    }
  };

  const handleKick = async (targetPlayerId: string) => {
    sounds.playClick();
    await kickPlayer(party.code, targetPlayerId);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 px-4 py-6 select-none">
      {/* Top Header & Actions */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 text-white/70 hover:text-white px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Quitter</span>
        </button>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs text-white/80">
          <Users className="w-4 h-4 text-[#FB923C]" />
          <span className="font-black text-white">{playersList.length}</span>
          <span className="uppercase tracking-wider font-bold">
            joueur{playersList.length > 1 ? 's' : ''} connecté{playersList.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Big Code Box (Artistic Flair Style) */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -inset-8 bg-[#FB923C]/20 blur-3xl rounded-full pointer-events-none" />

        <p className="text-xs uppercase tracking-widest text-white/60 mb-2 font-bold">
          Code du Salon
        </p>

        {/* 4-letter Huge Code */}
        <div className="flex items-center justify-center my-3">
          <span className="text-6xl sm:text-8xl font-black tracking-widest text-[#FB923C] drop-shadow-md font-mono">
            {party.code}
          </span>
        </div>

        <p className="text-xs uppercase tracking-wider text-white/60 mb-6 font-semibold">
          Rejoignez la partie en direct avec ce code à 4 lettres
        </p>

        {/* Share buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-[#1A1443] font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Code copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier le code</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 bg-[#1A1443]/80 hover:bg-[#1A1443] border border-white/20 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Partager le lien direct</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Host Configuration Panel */}
      {isHost ? (
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Settings className="w-4 h-4 text-[#FB923C]" />
            <span className="uppercase tracking-wider font-black">Paramètres de la partie</span>
            <span className="text-[10px] font-bold text-white/60 ml-auto bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Hôte
            </span>
          </div>

          {/* Mode de jeu selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-white/70 font-black flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-amber-400" />
                <span>Mode de jeu</span>
              </p>
              <span className="text-[11px] text-amber-300/90 font-bold bg-amber-400/15 border border-amber-400/25 px-2 py-0.5 rounded-md">
                {party.gameMode === 'wheel' ? 'Roue équitable par cycle' : 'Tour par tour simultané'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Classic */}
              <button
                type="button"
                onClick={() => handleGameModeChange('classic')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  (party.gameMode || 'classic') === 'classic'
                    ? 'bg-white text-[#1A1443] border-white shadow-lg ring-2 ring-white/30'
                    : 'bg-[#1A1443]/60 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Classique (Tous ensemble)
                  </span>
                  {(party.gameMode || 'classic') === 'classic' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className={`text-[11px] leading-snug ${
                  (party.gameMode || 'classic') === 'classic' ? 'text-[#1A1443]/70 font-semibold' : 'text-white/50'
                }`}>
                  Tous les joueurs répondent en même temps à chaque question. Chacun son chrono.
                </p>
              </button>

              {/* Option 2: Wheel Mode */}
              <button
                type="button"
                onClick={() => handleGameModeChange('wheel')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
                  party.gameMode === 'wheel'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-400 text-[#1A1443] border-amber-300 shadow-xl ring-2 ring-amber-300/50'
                    : 'bg-[#1A1443]/60 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Dices className="w-3.5 h-3.5" />
                    Mode Roue (Tirage au sort)
                  </span>
                  <span className="bg-[#1A1443] text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    NOUVEAU
                  </span>
                </div>
                <p className={`text-[11px] leading-snug ${
                  party.gameMode === 'wheel' ? 'text-[#1A1443]/80 font-semibold' : 'text-white/50'
                }`}>
                  Une roue tourne avant chaque question ! Équité garantie : un passage par joueur par cycle.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Difficulty selection */}
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60 mb-2 font-bold">
                Difficulté
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'facile', label: 'Facile' },
                    { id: 'moyen', label: 'Moyen' },
                    { id: 'difficile', label: 'Difficile' },
                    { id: 'mix', label: 'Mix' },
                  ] as const
                ).map((d) => {
                  const isSelected = party.difficultySetting === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleDifficultyChange(d.id)}
                      className={`text-xs font-black uppercase tracking-wider py-2.5 px-3 rounded-xl border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#1A1443] border-white shadow-md'
                          : 'bg-[#1A1443]/60 text-white/80 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rounds selection with Paire / Impaire support */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-widest text-white/60 font-bold flex items-center gap-1.5">
                  <span>Nombre de manches</span>
                </p>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                    party.totalRounds % 2 === 0
                      ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {party.totalRounds % 2 === 0 ? 'Paire' : 'Impaire'} ({party.totalRounds})
                </span>
              </div>

              {/* Paire vs Impaire Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#1A1443]/60 rounded-xl border border-white/10 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (party.totalRounds % 2 !== 0) {
                      handleRoundsChange(party.totalRounds + 1);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                    party.totalRounds % 2 === 0
                      ? 'bg-emerald-500 text-[#1A1443] shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Paire
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (party.totalRounds % 2 === 0) {
                      handleRoundsChange(Math.max(3, party.totalRounds - 1));
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                    party.totalRounds % 2 !== 0
                      ? 'bg-amber-400 text-[#1A1443] shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Impaire
                </button>
              </div>

              {/* Preset buttons corresponding to current parity */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                {(party.totalRounds % 2 === 0
                  ? [4, 6, 8, 10, 12, 16]
                  : [3, 5, 7, 9, 11, 15]
                ).map((rounds) => {
                  const isSelected = party.totalRounds === rounds;
                  return (
                    <button
                      key={rounds}
                      type="button"
                      onClick={() => handleRoundsChange(rounds)}
                      className={`text-xs font-black py-2 px-1 rounded-xl border transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#1A1443] border-white shadow-md'
                          : 'bg-[#1A1443]/60 text-white/80 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {rounds}
                    </button>
                  );
                })}
              </div>

              {/* Stepper for precise custom number */}
              <div className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <span className="text-white/60 font-semibold text-[11px]">
                  {party.gameMode === 'wheel' ? 'Mode Roue :' : 'Réglage précis :'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoundsChange(Math.max(2, party.totalRounds - 1))}
                    disabled={party.totalRounds <= 2}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black flex items-center justify-center disabled:opacity-30 cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <span className="font-black text-white px-1.5 text-xs sm:text-sm">
                    {party.totalRounds} manches
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRoundsChange(Math.min(30, party.totalRounds + 1))}
                    disabled={party.totalRounds >= 30}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black flex items-center justify-center disabled:opacity-30 cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Guest Mode Info Card */
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300">
              {party.gameMode === 'wheel' ? <Dices className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs text-white/60 uppercase tracking-wider font-bold block">
                Mode de jeu configuré par l'hôte
              </span>
              <span className="text-sm font-black uppercase tracking-wide text-white">
                {party.gameMode === 'wheel' ? 'Mode Roue (Tirage au sort)' : 'Classique (Tous ensemble)'}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-black uppercase bg-white/15 px-3 py-1 rounded-full border border-white/20">
            {party.totalRounds} manches ({party.totalRounds % 2 === 0 ? 'Paire' : 'Impaire'}) • {party.difficultySetting}
          </span>
        </div>
      )}

      {/* Players List Grid */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs uppercase tracking-widest text-white/60 font-bold">
            Joueurs dans le salon ({playersList.length})
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <AnimatePresence>
            {playersList.map((player) => {
              const isCurrent = player.id === currentPlayerId;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-white/20 border-white/40 shadow-xl ring-2 ring-white/30'
                      : 'bg-white/10 backdrop-blur-md border-white/15'
                  }`}
                >
                  {/* Colored Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 uppercase border-2 border-[#1A1443]"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.nickname.charAt(0)}
                  </div>

                  {/* Nickname & info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-sm font-bold truncate">
                        {player.nickname}
                      </span>
                      {player.isHost && (
                        <Crown className="w-3.5 h-3.5 text-[#FB923C] shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-white/60 uppercase tracking-wider font-semibold block">
                      {isCurrent ? 'Vous' : player.isHost ? 'Hôte' : 'Joueur'}
                    </span>
                  </div>

                  {/* Kick button for host (not on self) */}
                  {isHost && !player.isHost && (
                    <button
                      onClick={() => handleKick(player.id)}
                      title="Exclure ce joueur"
                      className="text-white/40 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Start Button or Waiting Status Banner */}
      <div className="w-full max-w-md mt-2 flex flex-col items-center">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={isStarting}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-[#1A1443] font-black text-base py-4 px-8 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isStarting ? 'Lancement...' : 'Lancer la partie !'}</span>
          </button>
        ) : (
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 px-6 text-center text-white/80 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FB923C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FB923C]"></span>
            </span>
            <span>En attente que l'hôte lance la partie...</span>
          </div>
        )}
      </div>
    </div>
  );
};
