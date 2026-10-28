import React from 'react';
import { WeaponId, WeaponSpec, UpgradeId, SessionStats } from '../types/game';
import { WEAPON_SPECS } from '../data/gameData';
import { Shield, Flame, Snowflake, Zap, Crosshair, ArrowUpRight, Check } from 'lucide-react';

interface ArmoryModalProps {
  stats: SessionStats;
  unlockedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  upgrades: UpgradeId[];
  onUnlockWeapon: (weapon: WeaponSpec) => void;
  onSelectWeapon: (id: WeaponId) => void;
  onPurchaseUpgrade: (upgradeId: UpgradeId['id']) => void;
  onRepairCore: () => void;
  isBetweenWaves?: boolean;
  onNextWave?: () => void;
}

export const ArmoryModal: React.FC<ArmoryModalProps> = ({
  stats,
  unlockedWeapons,
  equippedWeapon,
  upgrades,
  onUnlockWeapon,
  onSelectWeapon,
  onPurchaseUpgrade,
  onRepairCore,
  isBetweenWaves = false,
  onNextWave,
}) => {
  const repairCost = 45;
  const canRepairCore = stats.scrap >= repairCost && stats.coreHp < stats.coreMaxHp;

  const getWeaponIcon = (element: WeaponSpec['element']) => {
    switch (element) {
      case 'kinetic':
        return <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'pyro':
        return <Flame className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'cryo':
        return <Snowflake className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'pierce':
        return <Zap className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'explosive':
        return <Flame className="w-4 h-4 text-amber-500 shrink-0" />;
    }
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-6 py-8 space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <p className="text-xs font-medium text-amber-400 mb-2">
            {isBetweenWaves
              ? `Wave ${stats.wave} Cleared · Tactical Resupply Window`
              : 'Ordnance & Exosuit Engineering Bay'}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
            {isBetweenWaves ? `Prepare for Wave ${stats.wave + 1}` : 'Armory & Thermal Loadout'}
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Invest recovered Thermal Scrap into high-velocity weaponry, Cryo-Foam suppression nanites, and Outpost Core shielding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">Available Scrap</div>
            <div className="text-2xl font-bold text-amber-400 font-mono-tabular">
              {stats.scrap} SCRAP
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Outpost Core Integrity</div>
            <div className="text-lg font-semibold text-sky-300 font-mono-tabular">
              {Math.ceil(stats.coreHp)} / {stats.coreMaxHp} HP
            </div>
          </div>

          <button
            type="button"
            onClick={onRepairCore}
            disabled={!canRepairCore}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              canRepairCore
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-200 hover:bg-sky-900/70 cursor-pointer'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            Emergency Core Repair (+120 HP · {repairCost} Scrap)
          </button>

          {isBetweenWaves && onNextWave && (
            <button
              type="button"
              onClick={onNextWave}
              className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Deploy Wave {stats.wave + 1}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Weapons Arsenal */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            01. Primary Tactical Ordnance
          </h3>
          <span className="text-xs text-slate-400 font-mono-tabular">
            Hotkeys 1–5 During Combat · {unlockedWeapons.length} of {WEAPON_SPECS.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {WEAPON_SPECS.map((weapon, index) => {
            const isUnlocked = unlockedWeapons.includes(weapon.id);
            const isEquipped = equippedWeapon === weapon.id;
            const canAfford = stats.scrap >= weapon.unlockCost;

            return (
              <div
                key={weapon.id}
                className={`p-5 rounded-xl bg-[#111A2E] border transition-colors flex flex-col justify-between ${
                  isEquipped
                    ? 'border-amber-500/80'
                    : isUnlocked
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/60 opacity-90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                    <span>SLOT 0{index + 1} · {weapon.element.toUpperCase()}</span>
                    {getWeaponIcon(weapon.element)}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-100">{weapon.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{weapon.role}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {weapon.description}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs font-mono-tabular text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Base Damage</span>
                      <span>{weapon.damage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fire Rate</span>
                      <span>{(1000 / weapon.fireRateMs).toFixed(1)} / sec</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Magazine</span>
                      <span>{weapon.ammoCapacity === -1 ? 'Infinite' : `${weapon.ammoCapacity} rds`}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800">
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onSelectWeapon(weapon.id)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isEquipped
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped Primary</span>
                        </>
                      ) : (
                        <span>Equip Slot 0{index + 1}</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onUnlockWeapon(weapon)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        canAfford
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 cursor-pointer'
                          : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      Unlock Ordnance · {weapon.unlockCost} Scrap
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Exosuit & Outpost Upgrades */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            02. Exosuit & Outpost Engineering
          </h3>
          <span className="text-xs text-slate-400">
            Permanent upgrades persist across all waves in the current deployment
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upgrades.map((upg) => {
            const cost = Math.round(upg.baseCost * Math.pow(upg.costMultiplier, upg.level - 1));
            const isMax = upg.level >= upg.maxLevel;
            const canAfford = !isMax && stats.scrap >= cost;

            return (
              <div
                key={upg.id}
                className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                    <span>{upg.category}</span>
                    <span className="text-amber-400">
                      LVL {upg.level} / {upg.maxLevel}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-100">{upg.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{upg.description}</p>
                  <p className="text-xs text-sky-300 font-medium pt-1">
                    {upg.effectPerLevel}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: upg.maxLevel }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-5 rounded-sm ${
                          i < upg.level ? 'bg-amber-400' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford || isMax}
                    onClick={() => onPurchaseUpgrade(upg.id)}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isMax
                        ? 'bg-slate-900 text-emerald-400 border border-slate-800 cursor-default'
                        : canAfford
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'Max Level' : `Upgrade · ${cost} Scrap`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
