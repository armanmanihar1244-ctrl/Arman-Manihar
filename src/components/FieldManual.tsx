import React from 'react';
import { ENEMY_DOSSIER } from '../data/gameData';
import { Flame, Snowflake, Zap, Shield, Wind } from 'lucide-react';

interface FieldManualProps {
  onStartMission: () => void;
}

export const FieldManual: React.FC<FieldManualProps> = ({ onStartMission }) => {
  return (
    <div className="w-full max-w-[1280px] mx-auto px-6 py-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <p className="text-xs font-medium text-amber-400 mb-2">
            Tactical Doctrine · Thermodynamics & Hostile Threat Intelligence
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
            Advance Fire Field Manual
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Master cellular fire propagation, wind vectors, and Cryo-Thermal Shock reactions to defend the Outpost Core against escalating hostile waves.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartMission}
          className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Enter Battle Arena
        </button>
      </div>

      {/* Section 1: Core Thermodynamics & Elemental Combos */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">
          01. Elemental Synergy & Cellular Fire Physics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#111A2E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-400 font-mono-tabular">
              <span>REACTION 01 · 3.0X DAMAGE</span>
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Thermal Shock Shatter
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Coat armored enemies in sub-zero foam with the <strong className="text-sky-300">Zero-K Cryo Suppressor</strong>, then strike them with <strong className="text-orange-400">Solar Scorcher</strong> plasma or the <strong className="text-rose-400">Vulcan Railgun</strong>. Rapid thermal expansion shatters heavy armor for 300% burst damage in a 75m radius.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111A2E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-orange-400 font-mono-tabular">
              <span>MECHANIC 02 · WIND & FUEL</span>
              <Wind className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Wind-Driven Cellular Fire
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every tile in the arena tracks temperature, fuel, and moisture. Dry brush, timber walls, and fuel pools ignite and spread fire rapidly downwind. Monitor the <strong className="text-amber-300">Wind Compass</strong> in your HUD so flames push toward advancing enemies rather than your Outpost Core.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111A2E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-sky-400 font-mono-tabular">
              <span>DEFENSE 03 · CRYO FIREBREAKS</span>
              <Snowflake className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Fire Suppression & Core Cooling
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unchecked brush fires that reach the central <strong className="text-sky-300">Outpost Aegis Core</strong> deal continuous thermal damage. Spray Cryo-Foam around the Core perimeter to extinguish flames, create fireproof ice trenches, and repair thermal hull fractures.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Controls & Tactical Systems */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">
          02. Operative Controls & Tactical Abilities
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-1.5">
            <div className="text-xs font-mono-tabular text-amber-400">W A S D / ARROW KEYS</div>
            <div className="text-sm font-bold text-slate-100">Omnidirectional Thrusters</div>
            <p className="text-xs text-slate-400">
              Navigate terrain, kite Slag Juggernauts through burning oil slicks, and reposition around barricades.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-1.5">
            <div className="text-xs font-mono-tabular text-amber-400">MOUSE AIM + LEFT CLICK</div>
            <div className="text-sm font-bold text-slate-100">Directional Fire & Suppression</div>
            <p className="text-xs text-slate-400">
              Hold left-click to fire equipped ordnance. Keys 1–5 switch weapons instantly without reload penalty.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-1.5">
            <div className="text-xs font-mono-tabular text-sky-400">KEY E · TACTICAL SENTRY</div>
            <div className="text-sm font-bold text-slate-100">Deploy Automated Turret</div>
            <p className="text-xs text-slate-400">
              Costs 35 Scrap. Deploys a 360-degree autonomous turret that intercepts fast Cinder Stalkers and Swarmers.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111A2E] border border-slate-800 space-y-1.5">
            <div className="text-xs font-mono-tabular text-orange-400">SPACE / KEY Q · OVERDRIVE</div>
            <div className="text-sm font-bold text-slate-100">Jet-Dash & Thermal Pulse</div>
            <p className="text-xs text-slate-400">
              Press Space to jet-dash out of danger. Press Q to unleash a radial shockwave that knocks back enemies and vents weapon heat.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Hostile Threat Dossier */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">
          03. Hostile Threat Dossier
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111A2E]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 font-mono-tabular">
                <th className="py-3.5 px-5">UNIT DESIGNATION</th>
                <th className="py-3.5 px-5">CLASSIFICATION</th>
                <th className="py-3.5 px-5">BASE HULL</th>
                <th className="py-3.5 px-5">VELOCITY</th>
                <th className="py-3.5 px-5">TACTICAL THREAT & COUNTER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {ENEMY_DOSSIER.map((enemy) => (
                <tr key={enemy.type} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 px-5 font-bold text-slate-100 whitespace-nowrap">
                    {enemy.name}
                  </td>
                  <td className="py-4 px-5 text-xs text-slate-400 whitespace-nowrap">
                    {enemy.classification}
                  </td>
                  <td className="py-4 px-5 font-mono-tabular text-amber-400 whitespace-nowrap">
                    {enemy.hp} HP
                  </td>
                  <td className="py-4 px-5 font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                    {enemy.speed}
                  </td>
                  <td className="py-4 px-5 text-xs text-slate-300 space-y-1">
                    <div>{enemy.threat}</div>
                    <div className="text-sky-300">Counter: {enemy.counter}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
