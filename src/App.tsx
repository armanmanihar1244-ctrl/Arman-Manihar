import React, { useState, useCallback } from 'react';
import {
  GameState,
  GameMode,
  ActiveTab,
  WeaponId,
  WeaponSpec,
  UpgradeId,
  SessionStats,
} from './types/game';
import { INITIAL_UPGRADES } from './data/gameData';
import { HeroArenaIllustration, CommanderPortraitSVG } from './components/GameArtwork';
import { GameCanvas } from './components/GameCanvas';
import { ArmoryModal } from './components/ArmoryModal';
import { FieldManual } from './components/FieldManual';
import { soundFX } from './utils/sound';
import { Flame, Shield, Zap, Wind, Play, RotateCcw } from 'lucide-react';

const DEFAULT_STATS: SessionStats = {
  score: 0,
  scrap: 90,
  wave: 1,
  maxWaves: 10,
  enemiesDefeated: 0,
  firesExtinguished: 0,
  thermalShocksTriggered: 0,
  barrelsDetonated: 0,
  coreHp: 500,
  coreMaxHp: 500,
  playerHp: 120,
  playerMaxHp: 120,
  difficulty: 'Standard',
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [activeTab, setActiveTab] = useState<ActiveTab>('arena');
  const [victory, setVictory] = useState<boolean>(false);

  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponId[]>([
    'carbine',
    'scorcher',
    'cryo',
  ]);
  const [equippedWeapon, setEquippedWeapon] = useState<WeaponId>('carbine');
  const [upgrades, setUpgrades] = useState<UpgradeId[]>(INITIAL_UPGRADES);

  // Start or Restart a Mission cleanly
  const handleStartGame = useCallback(
    (selectedMode?: GameMode, selectedDifficulty?: SessionStats['difficulty']) => {
      const modeToUse = selectedMode || gameMode;
      const diffToUse = selectedDifficulty || stats.difficulty;

      setGameMode(modeToUse);
      setVictory(false);
      setUpgrades(INITIAL_UPGRADES.map((u) => ({ ...u, level: 1 })));
      setUnlockedWeapons(
        modeToUse === 'SANDBOX'
          ? ['carbine', 'scorcher', 'cryo', 'railgun', 'mortar']
          : ['carbine', 'scorcher', 'cryo']
      );
      setEquippedWeapon('carbine');
      setStats({
        ...DEFAULT_STATS,
        scrap: modeToUse === 'SANDBOX' ? 999 : 90,
        maxWaves: modeToUse === 'ENDLESS' ? 99 : 10,
        difficulty: diffToUse,
      });
      setActiveTab(modeToUse === 'SANDBOX' ? 'sandbox' : 'arena');
      setGameState('PLAYING');
      soundFX.playUpgrade();
    },
    [gameMode, stats.difficulty]
  );

  // Unlock a new weapon in the Armory
  const handleUnlockWeapon = useCallback(
    (weapon: WeaponSpec) => {
      if (stats.scrap < weapon.unlockCost || unlockedWeapons.includes(weapon.id)) return;
      soundFX.playUpgrade();
      setStats((prev) => ({
        ...prev,
        scrap: prev.scrap - weapon.unlockCost,
      }));
      setUnlockedWeapons((prev) => [...prev, weapon.id]);
      setEquippedWeapon(weapon.id);
    },
    [stats.scrap, unlockedWeapons]
  );

  // Purchase an Exosuit or Outpost upgrade
  const handlePurchaseUpgrade = useCallback(
    (upgradeId: UpgradeId['id']) => {
      const target = upgrades.find((u) => u.id === upgradeId);
      if (!target || target.level >= target.maxLevel) return;

      const cost = Math.round(
        target.baseCost * Math.pow(target.costMultiplier, target.level - 1)
      );
      if (stats.scrap < cost) return;

      soundFX.playUpgrade();

      setUpgrades((prev) =>
        prev.map((u) => (u.id === upgradeId ? { ...u, level: u.level + 1 } : u))
      );

      setStats((prev) => {
        const next = { ...prev, scrap: prev.scrap - cost };
        if (upgradeId === 'hull_plating') {
          next.playerMaxHp += 30;
          next.playerHp = Math.min(next.playerMaxHp, next.playerHp + 35);
        } else if (upgradeId === 'core_shielding') {
          next.coreMaxHp += 120;
          next.coreHp = Math.min(next.coreMaxHp, next.coreHp + 120);
        }
        return next;
      });
    },
    [upgrades, stats.scrap]
  );

  // Emergency Core Repair
  const handleRepairCore = useCallback(() => {
    const repairCost = 45;
    if (stats.scrap < repairCost || stats.coreHp >= stats.coreMaxHp) return;
    soundFX.playUpgrade();
    setStats((prev) => ({
      ...prev,
      scrap: prev.scrap - repairCost,
      coreHp: Math.min(prev.coreMaxHp, prev.coreHp + 120),
    }));
  }, [stats.scrap, stats.coreHp, stats.coreMaxHp]);

  // Wave Complete -> Transition to ROUND_SUMMARY
  const handleWaveComplete = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      scrap: prev.scrap + 45 + prev.wave * 10,
      playerHp: Math.min(prev.playerMaxHp, prev.playerHp + 35),
    }));
    setGameState('ROUND_SUMMARY');
  }, []);

  // Deploy Next Wave from ROUND_SUMMARY
  const handleNextWave = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      wave: prev.wave + 1,
    }));
    setActiveTab('arena');
    setGameState('PLAYING');
    soundFX.playUpgrade();
  }, []);

  // Game Over / Victory handler
  const handleGameOver = useCallback((isVictory: boolean) => {
    setVictory(isVictory);
    setGameState('GAME_OVER');
  }, []);

  // Toggle Pause
  const handleTogglePause = useCallback(() => {
    setGameState((prev) => (prev === 'PAUSED' ? 'PLAYING' : 'PAUSED'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B111E] text-slate-100">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0B111E]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('arena');
            setGameState('TITLE_MENU');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          Pyroclast
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a
            href="#arena"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('arena');
              if (gameMode === 'SANDBOX') setGameMode('CAMPAIGN');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 hover:underline underline-offset-8 ${
              activeTab === 'arena' ? 'text-slate-100 underline decoration-amber-500' : ''
            }`}
          >
            Battle Arena
          </a>
          <a
            href="#armory"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('armory');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 hover:underline underline-offset-8 ${
              activeTab === 'armory' ? 'text-slate-100 underline decoration-amber-500' : ''
            }`}
          >
            Armory & Loadout
          </a>
          <a
            href="#sandbox"
            onClick={(e) => {
              e.preventDefault();
              handleStartGame('SANDBOX', stats.difficulty);
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 hover:underline underline-offset-8 ${
              activeTab === 'sandbox' ? 'text-slate-100 underline decoration-amber-500' : ''
            }`}
          >
            Fire Physics Lab
          </a>
          <a
            href="#manual"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('manual');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 hover:underline underline-offset-8 ${
              activeTab === 'manual' ? 'text-slate-100 underline decoration-amber-500' : ''
            }`}
          >
            Field Manual
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              if (gameState === 'TITLE_MENU' || gameState === 'GAME_OVER') {
                handleStartGame('CAMPAIGN', stats.difficulty);
              } else {
                setActiveTab('arena');
                setGameState('PLAYING');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {gameState === 'PLAYING' || gameState === 'PAUSED'
              ? 'Active Combat'
              : 'Start Game'}
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1">
        {activeTab === 'armory' ? (
          <ArmoryModal
            stats={stats}
            unlockedWeapons={unlockedWeapons}
            equippedWeapon={equippedWeapon}
            upgrades={upgrades}
            onUnlockWeapon={handleUnlockWeapon}
            onSelectWeapon={setEquippedWeapon}
            onPurchaseUpgrade={handlePurchaseUpgrade}
            onRepairCore={handleRepairCore}
            isBetweenWaves={gameState === 'ROUND_SUMMARY'}
            onNextWave={() => {
              setActiveTab('arena');
              if (gameState === 'ROUND_SUMMARY') {
                handleNextWave();
              } else {
                setGameState('PLAYING');
              }
            }}
          />
        ) : activeTab === 'manual' ? (
          <FieldManual
            onStartMission={() => {
              setActiveTab('arena');
              if (gameState === 'TITLE_MENU') {
                handleStartGame('CAMPAIGN', stats.difficulty);
              }
            }}
          />
        ) : gameState === 'TITLE_MENU' ? (
          /* TITLE_MENU State View */
          <div className="w-full max-w-[1280px] mx-auto px-6 py-10 space-y-10">
            {/* 2-Column Hero Split (items-stretch) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column: Mission Setup & Launch */}
              <div className="lg:col-span-6 flex flex-col justify-between p-8 rounded-2xl bg-[#111A2E] border border-slate-800 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-mono-tabular">
                    <span>SECTOR 07 OUTPOST</span>
                    <span aria-hidden="true">·</span>
                    <span>CELLULAR THERMODYNAMICS</span>
                    <span aria-hidden="true">·</span>
                    <span>10 WAVES</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 tracking-tight leading-[1.1]">
                    Command the Advance Fire Perimeter.
                  </h1>

                  <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                    Deploy into a real-time cellular fire battlefield. Wield high-velocity kinetic rifles, plasma scorchers, and sub-zero Cryo-Foam suppressors to shatter armored juggernauts and shield the Outpost Aegis Core from wind-driven infernos.
                  </p>
                </div>

                {/* Interactive Difficulty & Mode Selectors */}
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-400">
                      Select Operational Mode
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                      {(
                        [
                          { id: 'CAMPAIGN', label: '10-Wave Campaign' },
                          { id: 'ENDLESS', label: 'Endless Blitz' },
                          { id: 'SANDBOX', label: 'Fire Physics Lab' },
                        ] as { id: GameMode; label: string }[]
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setGameMode(m.id)}
                          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            gameMode === m.id
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-400">
                      Threat Intensity
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                      {(['Standard', 'Veteran', 'Inferno'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() =>
                            setStats((prev) => ({ ...prev, difficulty: diff }))
                          }
                          className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            stats.difficulty === diff
                              ? 'bg-slate-800 text-amber-400 border border-slate-700'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Launch CTA & Secondary Manual Button */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleStartGame(gameMode, stats.difficulty)}
                    className="px-6 py-3 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {gameMode === 'SANDBOX' ? 'Launch Physics Lab' : 'Start Game'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-5 py-3 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Read Field Manual
                  </button>
                </div>
              </div>

              {/* Right Column: Tactical Arena Preview Illustration */}
              <div className="lg:col-span-6 flex flex-col">
                <HeroArenaIllustration className="w-full h-full min-h-[340px] rounded-2xl flex-1" />
              </div>
            </div>

            {/* Full-Width 4-Column Tactical Capabilities Strip Below Hero Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-tabular text-amber-400">
                  <span>SYSTEM 01</span>
                  <Flame className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-100">
                  Cellular Fire Propagation
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time 1,344-cell thermodynamic grid. Dry brush, timber barricades, and fuel slicks ignite and spread flames along live wind vectors.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-tabular text-sky-400">
                  <span>SYSTEM 02</span>
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-100">
                  3.0x Thermal Shock Combo
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Freeze heavy Slag Juggernauts with Zero-K Cryo-Foam, then detonate them with Plasma or Railgun fire for 300% shatter damage.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-tabular text-emerald-400">
                  <span>SYSTEM 03</span>
                  <Shield className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-100">
                  Outpost Aegis Defense
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Construct Cryo firebreaks, deploy autonomous tracking turrets, and trigger Fuel Drum chain reactions to protect the central core.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 flex items-center gap-4">
                <CommanderPortraitSVG className="w-16 h-16 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <div className="text-xs font-mono-tabular text-amber-400">
                    COMMANDER VANCE
                  </div>
                  <div className="text-sm font-bold text-slate-100">
                    &ldquo;Watch the wind.&rdquo;
                  </div>
                  <p className="text-xs text-slate-400">
                    Use WASD to move, Mouse to aim, Keys 1–5 for weapons, E for Sentry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : gameState === 'ROUND_SUMMARY' ? (
          /* ROUND_SUMMARY Between-Wave Armory View */
          <ArmoryModal
            stats={stats}
            unlockedWeapons={unlockedWeapons}
            equippedWeapon={equippedWeapon}
            upgrades={upgrades}
            onUnlockWeapon={handleUnlockWeapon}
            onSelectWeapon={setEquippedWeapon}
            onPurchaseUpgrade={handlePurchaseUpgrade}
            onRepairCore={handleRepairCore}
            isBetweenWaves={true}
            onNextWave={handleNextWave}
          />
        ) : gameState === 'GAME_OVER' ? (
          /* GAME_OVER Victory / Defeat Modal View */
          <div className="w-full max-w-[760px] mx-auto px-6 py-16">
            <div className="p-8 rounded-2xl bg-[#111A2E] border border-slate-800 text-center space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-mono-tabular text-amber-400">
                  {victory
                    ? 'SECTOR 07 SECURED · ALL HOSTILE WAVES ELIMINATED'
                    : 'OUTPOST PERIMETER BREACHED · MISSION TERMINATED'}
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-100">
                  {victory ? 'Tactical Victory Achieved' : 'Outpost Core Lost'}
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  {victory
                    ? 'Your command of thermal reactions and fire suppression held the line against the Inferno Colossus.'
                    : 'Spreading flames and heavy siege units overwhelmed the sector defenses.'}
                </p>
              </div>

              {/* Tabular Debrief Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-left font-mono-tabular">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">FINAL SCORE</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {stats.score}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">WAVES COMPLETED</div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {victory ? stats.maxWaves : Math.max(0, stats.wave - 1)} / {stats.maxWaves}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">HOSTILES DEFEATED</div>
                  <div className="text-2xl font-bold text-slate-100 mt-1">
                    {stats.enemiesDefeated}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">THERMAL SHOCKS</div>
                  <div className="text-xl font-bold text-sky-300 mt-1">
                    {stats.thermalShocksTriggered}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">FIRES SUPPRESSED</div>
                  <div className="text-xl font-bold text-sky-300 mt-1">
                    {stats.firesExtinguished}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400">DRUMS DETONATED</div>
                  <div className="text-xl font-bold text-orange-400 mt-1">
                    {stats.barrelsDetonated}
                  </div>
                </div>
              </div>

              {/* Single-Line Play Again & Menu Controls */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => handleStartGame(gameMode, stats.difficulty)}
                  className="px-6 py-3 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameState('TITLE_MENU')}
                  className="px-6 py-3 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Return to Title Menu
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PLAYING & PAUSED Active Arena View */
          <GameCanvas
            gameState={gameState}
            gameMode={gameMode}
            stats={stats}
            unlockedWeapons={unlockedWeapons}
            equippedWeapon={equippedWeapon}
            upgrades={upgrades}
            onSelectWeapon={setEquippedWeapon}
            onUpdateStats={setStats}
            onWaveComplete={handleWaveComplete}
            onGameOver={handleGameOver}
            onTogglePause={handleTogglePause}
            onOpenArmory={() => {
              setGameState('PAUSED');
              setActiveTab('armory');
            }}
          />
        )}
      </main>
    </div>
  );
}
