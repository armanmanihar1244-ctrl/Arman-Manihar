import React from 'react';

export const HeroArenaIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-[#0F172A] border border-slate-800 ${className}`}>
    <svg
      viewBox="0 0 800 450"
      className="w-full h-full object-cover"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tactical overview of Sector 07 Outpost defense against advancing fire units"
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#0284C7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fireFront" cx="75%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#DC2626" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>
        <pattern id="tacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Base Terrain & Tactical Grid */}
      <rect width="800" height="450" fill="#0B111E" />
      <rect width="800" height="450" fill="url(#tacticalGrid)" />
      <rect width="800" height="450" fill="url(#coreGlow)" />
      <rect width="800" height="450" fill="url(#fireFront)" />

      {/* Topographic Contour Lines */}
      <path
        d="M -20 120 Q 180 90 340 160 T 820 110"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />
      <path
        d="M -20 340 Q 260 390 480 310 T 820 360"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />

      {/* Advancing Fire Cellular Zones (Right/Top-Right) */}
      <g opacity="0.9">
        <rect x="480" y="60" width="40" height="40" fill="#7C2D12" fillOpacity="0.45" stroke="#EA580C" strokeWidth="1" />
        <rect x="520" y="60" width="40" height="40" fill="#9A3412" fillOpacity="0.65" stroke="#F97316" strokeWidth="1" />
        <rect x="560" y="60" width="40" height="40" fill="#C2410C" fillOpacity="0.7" stroke="#FB923C" strokeWidth="1" />
        <rect x="520" y="100" width="40" height="40" fill="#C2410C" fillOpacity="0.75" stroke="#F59E0B" strokeWidth="1.5" />
        <rect x="560" y="100" width="40" height="40" fill="#EA580C" fillOpacity="0.85" stroke="#FDE047" strokeWidth="1.5" />
        <rect x="600" y="100" width="40" height="40" fill="#9A3412" fillOpacity="0.6" stroke="#F97316" strokeWidth="1" />
        <rect x="560" y="140" width="40" height="40" fill="#9A3412" fillOpacity="0.65" stroke="#F97316" strokeWidth="1" />
        <rect x="600" y="140" width="40" height="40" fill="#C2410C" fillOpacity="0.75" stroke="#F59E0B" strokeWidth="1" />
        <rect x="640" y="140" width="40" height="40" fill="#7C2D12" fillOpacity="0.5" stroke="#EA580C" strokeWidth="1" />
      </g>

      {/* Cryo Firebreak Barrier (Center-Right Arc) */}
      <g opacity="0.85">
        <rect x="400" y="140" width="40" height="40" fill="#0369A1" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="1.2" />
        <rect x="400" y="180" width="40" height="40" fill="#0284C7" fillOpacity="0.5" stroke="#7DD3FC" strokeWidth="1.2" />
        <rect x="440" y="180" width="40" height="40" fill="#0369A1" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="1.2" />
        <rect x="440" y="220" width="40" height="40" fill="#0284C7" fillOpacity="0.5" stroke="#38BDF8" strokeWidth="1.2" />
        <rect x="400" y="260" width="40" height="40" fill="#0369A1" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="1.2" />
      </g>

      {/* Outpost Aegis Core (Left-Center Anchor) */}
      <g transform="translate(220, 235)">
        <circle r="58" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" strokeDasharray="8 4" />
        <circle r="42" fill="#1E293B" stroke="#0EA5E9" strokeWidth="2.5" />
        <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="#0284C7" fillOpacity="0.35" stroke="#7DD3FC" strokeWidth="2" />
        <circle r="12" fill="#38BDF8" />
        <circle r="5" fill="#E0F2FE" />
      </g>

      {/* Advance Fire Operator Unit & Plasma Beam */}
      <g transform="translate(345, 225)">
        {/* Targeting Laser & Plasma Stream */}
        <line x1="14" y1="-8" x2="215" y2="-85" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
        <line x1="14" y1="-8" x2="215" y2="-85" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />
        {/* Operator Chassis */}
        <circle r="20" fill="#1E293B" stroke="#F59E0B" strokeWidth="2.5" />
        <circle cx="4" cy="-3" r="8" fill="#F59E0B" />
        <rect x="10" y="-9" width="18" height="6" rx="2" transform="rotate(-20 10 -9)" fill="#94A3B8" />
      </g>

      {/* Enemy Units Advancing */}
      <g transform="translate(575, 130)">
        <circle r="26" fill="#450A0A" stroke="#EF4444" strokeWidth="3" />
        <polygon points="0,-16 14,0 0,16 -14,0" fill="#F97316" />
        <circle r="6" fill="#FEF08A" />
      </g>
      <g transform="translate(645, 225)">
        <circle r="18" fill="#450A0A" stroke="#F97316" strokeWidth="2" />
        <circle r="7" fill="#FB923C" />
      </g>
      <g transform="translate(540, 290)">
        <circle r="18" fill="#450A0A" stroke="#F97316" strokeWidth="2" />
        <circle r="7" fill="#FB923C" />
      </g>

      {/* Floating Ember Particles */}
      <circle cx="490" cy="95" r="3" fill="#FDE047" />
      <circle cx="620" cy="80" r="2.5" fill="#FB923C" />
      <circle cx="530" cy="175" r="3.5" fill="#F59E0B" />
      <circle cx="465" cy="145" r="2" fill="#38BDF8" />
      <circle cx="390" cy="205" r="2.5" fill="#7DD3FC" />

      {/* Clean Technical Overlay Callouts inside SVG */}
      <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#94A3B8">
        <text x="165" y="315" fill="#7DD3FC">OUTPOST CORE · SHIELD 100%</text>
        <text x="485" y="45" fill="#FDBA74">THERMAL FRONT · 680°C</text>
        <text x="365" y="330" fill="#38BDF8">CRYO FIREBREAK ZONE</text>
      </g>
    </svg>
  </div>
);

export const CommanderPortraitSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    className={`bg-[#0F172A] border border-slate-700 ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Commander Vance tactical portrait"
  >
    <rect width="120" height="120" fill="#0F172A" />
    <circle cx="60" cy="60" r="52" stroke="#1E293B" strokeWidth="2" />
    {/* Shoulder Armor */}
    <path d="M18 115 C18 84 36 74 60 74 C84 74 102 84 102 115" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
    <path d="M36 82 L60 104 L84 82" stroke="#F59E0B" strokeWidth="2.5" />
    {/* Helmet */}
    <rect x="38" y="26" width="44" height="46" rx="14" fill="#334155" stroke="#64748B" strokeWidth="2.5" />
    {/* Reflective Amber Tactical Visor */}
    <path d="M43 44 H77 L73 56 H47 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
    {/* Respirator Grille */}
    <rect x="52" y="61" width="16" height="6" rx="2" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
  </svg>
);
