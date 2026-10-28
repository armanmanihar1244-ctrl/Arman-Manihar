import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  GameMode,
  WeaponId,
  WeaponSpec,
  UpgradeId,
  GridCell,
  SandboxTool,
  EnemyEntity,
  ProjectileEntity,
  BarrelEntity,
  TurretEntity,
  ParticleEntity,
  FloatingText,
  SessionStats,
} from '../types/game';
import { WEAPON_SPECS } from '../data/gameData';
import { soundFX } from '../utils/sound';
import {
  Flame,
  Snowflake,
  Crosshair,
  Zap,
  Shield,
  Wind,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  gameMode: GameMode;
  stats: SessionStats;
  unlockedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  upgrades: UpgradeId[];
  onSelectWeapon: (id: WeaponId) => void;
  onUpdateStats: React.Dispatch<React.SetStateAction<SessionStats>>;
  onWaveComplete: () => void;
  onGameOver: (victory: boolean) => void;
  onTogglePause: () => void;
  onOpenArmory: () => void;
}

const CANVAS_W = 960;
const CANVAS_H = 560;
const CELL_SIZE = 20;
const GRID_COLS = CANVAS_W / CELL_SIZE; // 48
const GRID_ROWS = CANVAS_H / CELL_SIZE; // 28
const CORE_X = CANVAS_W / 2;
const CORE_Y = CANVAS_H / 2;
const CORE_RADIUS = 38;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  gameMode,
  stats,
  unlockedWeapons,
  equippedWeapon,
  upgrades,
  onSelectWeapon,
  onUpdateStats,
  onWaveComplete,
  onGameOver,
  onTogglePause,
  onOpenArmory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sandbox Controls State
  const [sandboxTool, setSandboxTool] = useState<SandboxTool>('ignite');
  const [sandboxInteractMode, setSandboxInteractMode] = useState<'paint' | 'combat'>('paint');
  const [windSpeed, setWindSpeed] = useState<number>(14); // knots
  const [windAngleDeg, setWindAngleDeg] = useState<number>(35); // degrees
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeFireCellsCount, setActiveFireCellsCount] = useState<number>(0);
  const [weaponHeat, setWeaponHeat] = useState<number>(0);
  const [overheated, setOverheated] = useState<boolean>(false);
  const [abilityCooldowns, setAbilityCooldowns] = useState<{ dash: number; nova: number }>({
    dash: 0,
    nova: 0,
  });

  // Mutable simulation refs for 60fps loop without React re-render lag
  const gridRef = useRef<GridCell[][]>([]);
  const playerRef = useRef({
    x: CORE_X,
    y: CORE_Y + 75,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 14,
    heat: 0,
    overheated: false,
    lastShotTime: 0,
    dashTimer: 0,
    dashCooldown: 0,
    novaCooldown: 0,
    invulnTimer: 0,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({
    x: CORE_X + 120,
    y: CORE_Y,
    isDown: false,
  });

  const enemiesRef = useRef<EnemyEntity[]>([]);
  const projectilesRef = useRef<ProjectileEntity[]>([]);
  const barrelsRef = useRef<BarrelEntity[]>([]);
  const turretsRef = useRef<TurretEntity[]>([]);
  const particlesRef = useRef<ParticleEntity[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const waveDirectorRef = useRef({
    waveInProgress: false,
    enemiesRemainingToSpawn: 0,
    spawnTimer: 0,
    nextEntityId: 1,
    lastFireStepTime: 0,
    lastHudSyncTime: 0,
  });

  // Upgrade multipliers helper
  const getUpgradeLevel = useCallback(
    (id: UpgradeId['id']) => {
      const found = upgrades.find((u) => u.id === id);
      return found ? found.level : 1;
    },
    [upgrades]
  );

  // Initialize or reset terrain grid & arena objects
  const initArena = useCallback(
    (waveNum: number, preserveStructures = false) => {
      const newGrid: GridCell[][] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        const row: GridCell[] = [];
        for (let c = 0; c < GRID_COLS; c++) {
          const cx = c * CELL_SIZE + CELL_SIZE / 2;
          const cy = r * CELL_SIZE + CELL_SIZE / 2;
          const distToCore = Math.hypot(cx - CORE_X, cy - CORE_Y);

          let material: GridCell['material'] = 'dirt';
          let fuel = 0;
          let hp = 0;
          let maxHp = 0;

          if (distToCore < CORE_RADIUS + 34) {
            // Concrete/Steel apron around Outpost Core
            material = 'dirt';
          } else {
            // Procedural patches of dry brush, timber barricades, and oil slicks
            const noise =
              Math.sin(c * 0.35 + waveNum) * Math.cos(r * 0.35 - waveNum * 0.5) +
              Math.sin((c + r) * 0.2);

            if (
              (Math.abs(c - GRID_COLS / 2) === 7 && r >= 9 && r <= 18 && r !== 13 && r !== 14) ||
              (Math.abs(r - GRID_ROWS / 2) === 6 && c >= 17 && c <= 30 && c !== 23 && c !== 24)
            ) {
              material = 'timber';
              fuel = 85;
              hp = 120;
              maxHp = 120;
            } else if (noise > 0.65) {
              material = 'brush';
              fuel = 60;
            } else if (noise < -1.15 && distToCore > 150) {
              material = 'oil';
              fuel = 95;
            }
          }

          row.push({
            material,
            fuel,
            temperature: 22,
            fireIntensity: 0,
            wetness: 0,
            hp,
            maxHp,
          });
        }
        newGrid.push(row);
      }

      if (!preserveStructures || gridRef.current.length === 0) {
        gridRef.current = newGrid;
      } else {
        // Replenish some brush & clear scorched tiles lightly between waves
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const cell = gridRef.current[r][c];
            cell.fireIntensity = 0;
            cell.temperature = 22;
            if (cell.material === 'scorched' && Math.random() < 0.35) {
              cell.material = 'brush';
              cell.fuel = 55;
            }
          }
        }
      }

      // Spawn tactical barrels around perimeter
      const newBarrels: BarrelEntity[] = [
        { id: 101, x: CORE_X - 210, y: CORE_Y - 120, hp: 50, maxHp: 50, type: 'fuel', ignitedTimer: 0 },
        { id: 102, x: CORE_X + 210, y: CORE_Y - 120, hp: 50, maxHp: 50, type: 'fuel', ignitedTimer: 0 },
        { id: 103, x: CORE_X - 210, y: CORE_Y + 120, hp: 50, maxHp: 50, type: 'fuel', ignitedTimer: 0 },
        { id: 104, x: CORE_X + 210, y: CORE_Y + 120, hp: 50, maxHp: 50, type: 'fuel', ignitedTimer: 0 },
        { id: 105, x: CORE_X, y: CORE_Y - 165, hp: 50, maxHp: 50, type: 'cryo', ignitedTimer: 0 },
        { id: 106, x: CORE_X, y: CORE_Y + 165, hp: 50, maxHp: 50, type: 'cryo', ignitedTimer: 0 },
      ];
      barrelsRef.current = newBarrels;

      // Setup wave spawn queue if not Sandbox
      if (gameMode !== 'SANDBOX') {
        const difficultyMult =
          stats.difficulty === 'Inferno' ? 1.4 : stats.difficulty === 'Veteran' ? 1.2 : 1.0;
        const baseCount = Math.round((8 + waveNum * 4) * difficultyMult);
        waveDirectorRef.current.enemiesRemainingToSpawn = baseCount;
        waveDirectorRef.current.waveInProgress = true;
        waveDirectorRef.current.spawnTimer = 45;
      } else {
        waveDirectorRef.current.enemiesRemainingToSpawn = 0;
        waveDirectorRef.current.waveInProgress = false;
      }
    },
    [gameMode, stats.difficulty]
  );

  // Initialize arena when starting or changing wave
  useEffect(() => {
    if (gameState === 'PLAYING') {
      initArena(stats.wave, stats.wave > 1);
    }
  }, [gameState, stats.wave, initArena]);

  // Add floating combat text
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: waveDirectorRef.current.nextEntityId++,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.1,
    });
  };

  // Ignite or apply Cryo to a specific grid coordinate
  const modifyCellAtPixel = useCallback(
    (px: number, py: number, effect: 'pyro' | 'cryo' | 'scorch', radiusCells = 1) => {
      const centerCol = Math.floor(px / CELL_SIZE);
      const centerRow = Math.floor(py / CELL_SIZE);
      const cryoLevel = getUpgradeLevel('cryo_synthesis');
      const effectiveRadius =
        effect === 'cryo' ? radiusCells + Math.floor(cryoLevel / 2) : radiusCells;

      let extinguishedCount = 0;

      for (let r = centerRow - effectiveRadius; r <= centerRow + effectiveRadius; r++) {
        for (let c = centerCol - effectiveRadius; c <= centerCol + effectiveRadius; c++) {
          if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
          const dist = Math.hypot(r - centerRow, c - centerCol);
          if (dist > effectiveRadius + 0.35) continue;

          const cell = gridRef.current[r]?.[c];
          if (!cell) continue;

          if (effect === 'pyro') {
            if (cell.material === 'cryo_foam') {
              cell.material = 'water';
              cell.wetness = 45;
              cell.temperature = 35;
            } else if (cell.material !== 'steel') {
              cell.temperature = Math.min(750, cell.temperature + 260);
              if (cell.material === 'dirt' || cell.material === 'scorched') {
                cell.material = 'fire';
                cell.fuel = Math.max(cell.fuel, 28);
                cell.fireIntensity = 75;
              } else if (
                cell.material === 'brush' ||
                cell.material === 'oil' ||
                cell.material === 'timber'
              ) {
                cell.fireIntensity = 95;
              }
            }
          } else if (effect === 'cryo') {
            if (cell.fireIntensity > 0 || cell.material === 'fire') {
              extinguishedCount++;
            }
            cell.fireIntensity = 0;
            cell.temperature = -30;
            cell.wetness = 100;
            if (cell.material !== 'steel' && cell.material !== 'timber') {
              cell.material = 'cryo_foam';
              cell.fuel = 0;
            }
          }
        }
      }

      if (extinguishedCount > 0) {
        onUpdateStats((prev) => ({
          ...prev,
          firesExtinguished: prev.firesExtinguished + extinguishedCount,
          score: prev.score + extinguishedCount * 5,
        }));
      }
    },
    [getUpgradeLevel, onUpdateStats]
  );

  // Trigger an explosion (Barrel, Napalm Mortar, or Thermal Shock)
  const triggerExplosion = useCallback(
    (
      x: number,
      y: number,
      radius: number,
      damage: number,
      element: 'pyro' | 'cryo' | 'shock'
    ) => {
      soundFX.playExplosion();

      // Particle burst
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 5.5;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 4 + Math.random() * 6,
          alpha: 1,
          decay: 0.025 + Math.random() * 0.02,
          color:
            element === 'cryo'
              ? '#38BDF8'
              : element === 'shock'
              ? '#FDE047'
              : i % 2 === 0
              ? '#F97316'
              : '#EF4444',
          type: 'spark',
        });
      }

      // Modify underlying terrain cells
      modifyCellAtPixel(
        x,
        y,
        element === 'cryo' ? 'cryo' : 'pyro',
        Math.ceil(radius / CELL_SIZE)
      );

      // Damage enemies in blast radius
      enemiesRef.current.forEach((enemy) => {
        const d = Math.hypot(enemy.x - x, enemy.y - y);
        if (d <= radius + enemy.radius) {
          const falloff = Math.max(0.35, 1 - d / (radius + 40));
          const finalDmg = Math.round(damage * falloff);
          enemy.hp -= finalDmg;

          if (element === 'pyro') {
            enemy.burnStacks = Math.min(100, enemy.burnStacks + 65);
          } else if (element === 'cryo') {
            enemy.chillStacks = Math.min(100, enemy.chillStacks + 75);
          }

          // Knockback
          const kbAngle = Math.atan2(enemy.y - y, enemy.x - x);
          enemy.x += Math.cos(kbAngle) * 14;
          enemy.y += Math.sin(kbAngle) * 14;
        }
      });

      // Chain-detonate nearby barrels
      barrelsRef.current.forEach((b) => {
        if (b.hp > 0 && Math.hypot(b.x - x, b.y - y) < radius) {
          b.hp = 0;
        }
      });
    },
    [modifyCellAtPixel]
  );

  // Spawn an enemy on the arena perimeter
  const spawnEnemy = useCallback(
    (forcedType?: EnemyEntity['type'], customX?: number, customY?: number) => {
      const wave = stats.wave;
      const side = Math.floor(Math.random() * 4);
      let x = customX ?? 0;
      let y = customY ?? 0;

      if (customX === undefined || customY === undefined) {
        if (side === 0) {
          x = Math.random() * CANVAS_W;
          y = 18;
        } else if (side === 1) {
          x = CANVAS_W - 18;
          y = Math.random() * CANVAS_H;
        } else if (side === 2) {
          x = Math.random() * CANVAS_W;
          y = CANVAS_H - 18;
        } else {
          x = 18;
          y = Math.random() * CANVAS_H;
        }
      }

      let type: EnemyEntity['type'] = forcedType || 'stalker';
      if (!forcedType) {
        const roll = Math.random();
        if ((wave === 5 || wave === 10) && waveDirectorRef.current.enemiesRemainingToSpawn === 1) {
          type = 'colossus';
        } else if (wave >= 4 && roll < 0.2) {
          type = 'bombardier';
        } else if (wave >= 3 && roll < 0.42) {
          type = 'bruiser';
        } else if (wave >= 2 && roll < 0.68) {
          type = 'swarmer';
        } else {
          type = 'stalker';
        }
      }

      const scale = 1 + (wave - 1) * 0.14;

      const templates: Record<
        EnemyEntity['type'],
        {
          name: string;
          hp: number;
          speed: number;
          radius: number;
          damage: number;
          scrap: number;
          score: number;
          color: string;
        }
      > = {
        stalker: {
          name: 'Cinder Stalker',
          hp: Math.round(65 * scale),
          speed: 2.05,
          radius: 12,
          damage: 9,
          scrap: 12,
          score: 50,
          color: '#F59E0B',
        },
        swarmer: {
          name: 'Volatile Swarmer',
          hp: Math.round(45 * scale),
          speed: 2.65,
          radius: 10,
          damage: 14,
          scrap: 14,
          score: 65,
          color: '#FB923C',
        },
        bruiser: {
          name: 'Slag Juggernaut',
          hp: Math.round(250 * scale),
          speed: 1.05,
          radius: 18,
          damage: 22,
          scrap: 28,
          score: 140,
          color: '#EF4444',
        },
        bombardier: {
          name: 'Pyro Bombardier',
          hp: Math.round(135 * scale),
          speed: 1.3,
          radius: 15,
          damage: 16,
          scrap: 24,
          score: 120,
          color: '#F43F5E',
        },
        colossus: {
          name: 'Inferno Colossus',
          hp: Math.round(1350 * scale),
          speed: 0.78,
          radius: 28,
          damage: 38,
          scrap: 120,
          score: 1000,
          color: '#DC2626',
        },
      };

      const t = templates[type];
      enemiesRef.current.push({
        id: waveDirectorRef.current.nextEntityId++,
        type,
        name: t.name,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: t.radius,
        hp: t.hp,
        maxHp: t.hp,
        speed: t.speed,
        damage: t.damage,
        burnStacks: 0,
        chillStacks: 0,
        attackCooldown: 60,
        rewardScrap: t.scrap,
        rewardScore: t.score,
        color: t.color,
        angle: Math.atan2(CORE_Y - y, CORE_X - x),
      });
    },
    [stats.wave]
  );

  // Deploy Auto-Turret (Key E or HUD button)
  const handleDeployTurret = useCallback(() => {
    const turretCost = 35;
    if (stats.scrap < turretCost) {
      addFloatingText(playerRef.current.x, playerRef.current.y - 20, 'NEED 35 SCRAP', '#F87171');
      return;
    }
    const turretLvl = getUpgradeLevel('turret_mk2');
    const maxAmmo = 65 + (turretLvl - 1) * 35;

    turretsRef.current.push({
      id: waveDirectorRef.current.nextEntityId++,
      x: playerRef.current.x,
      y: playerRef.current.y,
      angle: playerRef.current.angle,
      hp: 140,
      maxHp: 140,
      cooldown: 0,
      mode: equippedWeapon === 'cryo' ? 'cryo' : 'kinetic',
      ammo: maxAmmo,
      maxAmmo,
    });

    soundFX.playUpgrade();
    addFloatingText(
      playerRef.current.x,
      playerRef.current.y - 24,
      equippedWeapon === 'cryo' ? 'CRYO SENTRY DEPLOYED' : 'AUTO-SENTRY DEPLOYED',
      '#38BDF8'
    );

    onUpdateStats((prev) => ({
      ...prev,
      scrap: prev.scrap - turretCost,
    }));
  }, [equippedWeapon, getUpgradeLevel, onUpdateStats, stats.scrap]);

  // Trigger Jet-Dash (Spacebar or HUD button)
  const handleJetDash = useCallback(() => {
    const p = playerRef.current;
    if (p.dashCooldown > 0) return;
    p.dashTimer = 14;
    p.dashCooldown = 140;
    p.invulnTimer = 24;
    soundFX.playShot('pyro');
    addFloatingText(p.x, p.y - 18, 'JET-DASH', '#FBBF24');
  }, []);

  // Trigger Thermal Nova / Airburst (Key Q or HUD button)
  const handleThermalNova = useCallback(() => {
    const p = playerRef.current;
    if (p.novaCooldown > 0) return;
    p.novaCooldown = 260;
    p.heat = 0;
    p.overheated = false;

    // Extinguish fires around player & Core while blasting enemies back
    modifyCellAtPixel(p.x, p.y, 'cryo', 4);
    modifyCellAtPixel(CORE_X, CORE_Y, 'cryo', 3);
    triggerExplosion(p.x, p.y, 135, 65, 'shock');
    addFloatingText(p.x, p.y - 24, 'THERMAL PULSE VENTED', '#38BDF8');
  }, [modifyCellAtPixel, triggerExplosion]);

  // Paint sandbox tool at canvas coordinates
  const applySandboxToolAt = useCallback(
    (cx: number, cy: number) => {
      const col = Math.floor(cx / CELL_SIZE);
      const row = Math.floor(cy / CELL_SIZE);
      if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

      if (sandboxTool === 'barrel') {
        const exists = barrelsRef.current.some((b) => Math.hypot(b.x - cx, b.y - cy) < 28);
        if (!exists) {
          barrelsRef.current.push({
            id: waveDirectorRef.current.nextEntityId++,
            x: cx,
            y: cy,
            hp: 50,
            maxHp: 50,
            type: 'fuel',
            ignitedTimer: 0,
          });
        }
        return;
      }

      if (sandboxTool === 'spawn_swarmer') {
        const exists = enemiesRef.current.some((e) => Math.hypot(e.x - cx, e.y - cy) < 25);
        if (!exists) spawnEnemy('swarmer', cx, cy);
        return;
      }

      if (sandboxTool === 'spawn_colossus') {
        const exists = enemiesRef.current.some((e) => Math.hypot(e.x - cx, e.y - cy) < 45);
        if (!exists) spawnEnemy('colossus', cx, cy);
        return;
      }

      // Paint 2x2 brush for terrain tools
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
          const cell = gridRef.current[r]?.[c];
          if (!cell) continue;

          if (sandboxTool === 'ignite') {
            cell.material = 'fire';
            cell.fireIntensity = 95;
            cell.temperature = 650;
            cell.fuel = Math.max(cell.fuel, 60);
          } else if (sandboxTool === 'oil') {
            cell.material = 'oil';
            cell.fuel = 100;
            cell.fireIntensity = 0;
            cell.temperature = 25;
          } else if (sandboxTool === 'brush') {
            cell.material = 'brush';
            cell.fuel = 70;
            cell.fireIntensity = 0;
            cell.temperature = 22;
          } else if (sandboxTool === 'timber') {
            cell.material = 'timber';
            cell.fuel = 90;
            cell.hp = 120;
            cell.maxHp = 120;
            cell.fireIntensity = 0;
          } else if (sandboxTool === 'cryo_foam') {
            cell.material = 'cryo_foam';
            cell.fuel = 0;
            cell.fireIntensity = 0;
            cell.temperature = -35;
            cell.wetness = 100;
          } else if (sandboxTool === 'steel') {
            cell.material = 'steel';
            cell.fuel = 0;
            cell.fireIntensity = 0;
            cell.hp = 500;
            cell.maxHp = 500;
          } else if (sandboxTool === 'erase') {
            cell.material = 'dirt';
            cell.fuel = 0;
            cell.fireIntensity = 0;
            cell.temperature = 22;
            cell.wetness = 0;
          }
        }
      }
    },
    [sandboxTool, spawnEnemy]
  );

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;

      if (gameState !== 'PLAYING') return;

      if (key === '1') onSelectWeapon('carbine');
      if (key === '2') onSelectWeapon('scorcher');
      if (key === '3') onSelectWeapon('cryo');
      if (key === '4' && unlockedWeapons.includes('railgun')) onSelectWeapon('railgun');
      if (key === '5' && unlockedWeapons.includes('mortar')) onSelectWeapon('mortar');

      if (key === 'e') handleDeployTurret();
      if (key === 'q') handleThermalNova();
      if (key === ' ') {
        e.preventDefault();
        handleJetDash();
      }
      if (key === 'p' || key === 'escape') {
        onTogglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    gameState,
    unlockedWeapons,
    onSelectWeapon,
    handleDeployTurret,
    handleThermalNova,
    handleJetDash,
    onTogglePause,
  ]);

  // Main 60FPS Game Loop & Cellular Fire Physics Engine
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animationFrameId: number;

    const weaponSpec =
      WEAPON_SPECS.find((w) => w.id === equippedWeapon) || WEAPON_SPECS[0];
    const dmgMultiplier = 1 + (getUpgradeLevel('weapon_overclock') - 1) * 0.18;
    const rateMultiplier = 1 - (getUpgradeLevel('weapon_overclock') - 1) * 0.07;
    const shockMultiplier = 1 + (getUpgradeLevel('thermal_capacitors') - 1) * 0.35;
    const heatResist = 1 - (getUpgradeLevel('hull_plating') - 1) * 0.15;
    const cryoRepairBonus = getUpgradeLevel('cryo_synthesis') * 0.35;

    const stepSimulation = (timestamp: number) => {
      const p = playerRef.current;
      const windRad = (windAngleDeg * Math.PI) / 180;
      const windVx = Math.cos(windRad) * (windSpeed / 18);
      const windVy = Math.sin(windRad) * (windSpeed / 18);

      // 1. CELLULAR AUTOMATA FIRE STEP (Every 110ms)
      if (timestamp - waveDirectorRef.current.lastFireStepTime > 110) {
        waveDirectorRef.current.lastFireStepTime = timestamp;
        let burningCount = 0;

        const grid = gridRef.current;
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const cell = grid[r]?.[c];
            if (!cell) continue;

            if (cell.fireIntensity > 0 || cell.material === 'fire') {
              burningCount++;
              cell.fuel -= 1.6;
              cell.temperature = Math.min(800, cell.temperature + 18);

              // Emit ambient ember or smoke particle
              if (Math.random() < 0.22) {
                particlesRef.current.push({
                  x: c * CELL_SIZE + Math.random() * CELL_SIZE,
                  y: r * CELL_SIZE + Math.random() * CELL_SIZE,
                  vx: windVx * 1.4 + (Math.random() - 0.5) * 0.8,
                  vy: windVy * 1.4 - 0.9,
                  size: 2.5 + Math.random() * 3,
                  alpha: 0.85,
                  decay: 0.025,
                  color: Math.random() < 0.7 ? '#F97316' : '#FDE047',
                  type: 'ember',
                });
              }

              // Spread heat to neighbors, biased by wind vector!
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  const nr = r + dr;
                  const nc = c + dc;
                  if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
                  const neighbor = grid[nr][nc];
                  if (neighbor.material === 'steel' || neighbor.material === 'cryo_foam') {
                    continue;
                  }

                  // Dot product between neighbor offset and wind vector
                  const alignment = dc * windVx + dr * windVy;
                  const windFactor = Math.max(0.25, 1 + alignment * 1.35);
                  const heatTransfer = 26 * windFactor;
                  neighbor.temperature += heatTransfer;

                  const ignitionThreshold =
                    neighbor.material === 'oil'
                      ? 110
                      : neighbor.material === 'brush'
                      ? 175
                      : neighbor.material === 'timber'
                      ? 260
                      : 9999;

                  if (
                    neighbor.temperature >= ignitionThreshold &&
                    neighbor.fireIntensity === 0 &&
                    neighbor.fuel > 0
                  ) {
                    neighbor.fireIntensity = 85;
                  }
                }
              }

              // Damage timber wall or burn out into scorched earth
              if (cell.material === 'timber') {
                cell.hp -= 2.2;
                if (cell.hp <= 0) {
                  cell.material = 'scorched';
                  cell.fireIntensity = 0;
                  cell.fuel = 0;
                }
              } else if (cell.fuel <= 0) {
                cell.material = 'scorched';
                cell.fireIntensity = 0;
                cell.temperature = 65;
              }
            } else {
              // Cool down gradually
              if (cell.temperature > 22) {
                cell.temperature = Math.max(22, cell.temperature - 6);
              } else if (cell.temperature < 22 && cell.material === 'cryo_foam') {
                cell.temperature += 0.35;
                if (cell.temperature >= 10) {
                  cell.material = 'water';
                }
              }
            }
          }
        }

        setActiveFireCellsCount(burningCount);
      }

      // 2. PLAYER MOVEMENT & AIM
      let moveX = 0;
      let moveY = 0;
      if (keysRef.current['w'] || keysRef.current['arrowup']) moveY -= 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) moveY += 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) moveX -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        moveX /= len;
        moveY /= len;
      }

      const baseSpeed = p.dashTimer > 0 ? 7.8 : 3.4;
      const nextX = Math.max(20, Math.min(CANVAS_W - 20, p.x + moveX * baseSpeed));
      const nextY = Math.max(20, Math.min(CANVAS_H - 20, p.y + moveY * baseSpeed));

      // Check collision with steel/timber walls
      const checkCol = Math.floor(nextX / CELL_SIZE);
      const checkRow = Math.floor(nextY / CELL_SIZE);
      const targetCell = gridRef.current[checkRow]?.[checkCol];
      if (
        !targetCell ||
        (targetCell.material !== 'timber' && targetCell.material !== 'steel')
      ) {
        p.x = nextX;
        p.y = nextY;
      }

      p.angle = Math.atan2(mouseRef.current.y - p.y, mouseRef.current.x - p.x);

      if (p.dashTimer > 0) p.dashTimer--;
      if (p.dashCooldown > 0) p.dashCooldown--;
      if (p.novaCooldown > 0) p.novaCooldown--;
      if (p.invulnTimer > 0) p.invulnTimer--;

      // Cool weapon heat
      if (!mouseRef.current.isDown || p.overheated) {
        p.heat = Math.max(0, p.heat - (p.overheated ? 0.85 : 1.15));
        if (p.overheated && p.heat <= 15) {
          p.overheated = false;
        }
      }

      // Check if player is standing on fire
      const playerCell =
        gridRef.current[Math.floor(p.y / CELL_SIZE)]?.[Math.floor(p.x / CELL_SIZE)];
      if (
        playerCell &&
        (playerCell.fireIntensity > 0 || playerCell.material === 'fire') &&
        p.invulnTimer === 0
      ) {
        onUpdateStats((prev) => ({
          ...prev,
          playerHp: Math.max(0, prev.playerHp - 0.14 * heatResist),
        }));
      }

      // 3. PLAYER FIRING OR SANDBOX PAINTING
      if (mouseRef.current.isDown) {
        if (gameMode === 'SANDBOX' && sandboxInteractMode === 'paint') {
          applySandboxToolAt(mouseRef.current.x, mouseRef.current.y);
        } else if (!p.overheated) {
          const effectiveFireRate = weaponSpec.fireRateMs * rateMultiplier;
          if (timestamp - p.lastShotTime >= effectiveFireRate) {
            p.lastShotTime = timestamp;
            p.heat = Math.max(0, Math.min(100, p.heat + weaponSpec.heatGenerated * 0.45));
            if (p.heat >= 100) {
              p.overheated = true;
              addFloatingText(p.x, p.y - 22, 'WEAPON OVERHEATED!', '#F87171');
            }

            soundFX.playShot(weaponSpec.element);

            const count = weaponSpec.id === 'scorcher' || weaponSpec.id === 'cryo' ? 2 : 1;
            for (let i = 0; i < count; i++) {
              const spread = (Math.random() - 0.5) * weaponSpec.spreadAngle * 2;
              const shotAngle = p.angle + spread;
              const speed = weaponSpec.projectileSpeed * (0.92 + Math.random() * 0.16);

              projectilesRef.current.push({
                id: waveDirectorRef.current.nextEntityId++,
                x: p.x + Math.cos(p.angle) * 18,
                y: p.y + Math.sin(p.angle) * 18,
                vx: Math.cos(shotAngle) * speed,
                vy: Math.sin(shotAngle) * speed,
                radius:
                  weaponSpec.id === 'railgun'
                    ? 5
                    : weaponSpec.id === 'mortar'
                    ? 7
                    : 4,
                damage: Math.round(weaponSpec.damage * dmgMultiplier),
                element: weaponSpec.element,
                fromPlayer: true,
                life: 0,
                maxLife:
                  weaponSpec.id === 'scorcher' || weaponSpec.id === 'cryo' ? 28 : 75,
                pierceCount: weaponSpec.id === 'railgun' ? 4 : 1,
              });
            }
          }
        }
      }

      // 4. UPDATE AUTO-TURRETS
      const turretDmgBonus = 1 + (getUpgradeLevel('turret_mk2') - 1) * 0.25;
      turretsRef.current.forEach((turret) => {
        if (turret.cooldown > 0) turret.cooldown--;
        if (turret.ammo <= 0 || turret.cooldown > 0) return;

        // Find nearest enemy within 260px
        let nearest: EnemyEntity | null = null;
        let minDist = 260;
        for (const e of enemiesRef.current) {
          const d = Math.hypot(e.x - turret.x, e.y - turret.y);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        }

        if (nearest) {
          turret.angle = Math.atan2(nearest.y - turret.y, nearest.x - turret.x);
          turret.cooldown = 16;
          turret.ammo--;

          projectilesRef.current.push({
            id: waveDirectorRef.current.nextEntityId++,
            x: turret.x + Math.cos(turret.angle) * 14,
            y: turret.y + Math.sin(turret.angle) * 14,
            vx: Math.cos(turret.angle) * 11,
            vy: Math.sin(turret.angle) * 11,
            radius: 3.5,
            damage: Math.round(16 * turretDmgBonus),
            element: turret.mode === 'cryo' ? 'cryo' : 'kinetic',
            fromPlayer: true,
            life: 0,
            maxLife: 45,
            pierceCount: 1,
          });
        }
      });
      turretsRef.current = turretsRef.current.filter((t) => t.ammo > 0 && t.hp > 0);

      // 5. UPDATE PROJECTILES
      const survivingProjectiles: ProjectileEntity[] = [];
      for (const proj of projectilesRef.current) {
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.life++;

        if (
          proj.x < 0 ||
          proj.x > CANVAS_W ||
          proj.y < 0 ||
          proj.y > CANVAS_H ||
          proj.life >= proj.maxLife
        ) {
          if (proj.element === 'explosive' || proj.element === 'enemy_mortar') {
            triggerExplosion(proj.x, proj.y, 68, proj.damage, 'pyro');
          }
          continue;
        }

        // Interaction with Terrain Cells for Pyro / Cryo streams
        if (proj.element === 'pyro' && Math.random() < 0.35) {
          modifyCellAtPixel(proj.x, proj.y, 'pyro', 0);
        } else if (proj.element === 'cryo') {
          modifyCellAtPixel(proj.x, proj.y, 'cryo', 1);
          // Cryo-Repair on Outpost Core!
          if (Math.hypot(proj.x - CORE_X, proj.y - CORE_Y) < CORE_RADIUS + 12) {
            onUpdateStats((prev) => ({
              ...prev,
              coreHp: Math.min(prev.coreMaxHp, prev.coreHp + 0.45 + cryoRepairBonus),
            }));
          }
        }

        // Check Barrel Hits
        let hitBarrel = false;
        for (const barrel of barrelsRef.current) {
          if (barrel.hp > 0 && Math.hypot(proj.x - barrel.x, proj.y - barrel.y) < 18) {
            barrel.hp -= proj.damage;
            hitBarrel = true;
            break;
          }
        }
        if (hitBarrel && proj.element !== 'pierce') continue;

        // Enemy Mortar hitting Core or Player
        if (!proj.fromPlayer) {
          if (Math.hypot(proj.x - CORE_X, proj.y - CORE_Y) < CORE_RADIUS) {
            triggerExplosion(proj.x, proj.y, 55, proj.damage, 'pyro');
            onUpdateStats((prev) => ({
              ...prev,
              coreHp: Math.max(0, prev.coreHp - proj.damage),
            }));
            continue;
          }
          if (Math.hypot(proj.x - p.x, proj.y - p.y) < p.radius + 6 && p.invulnTimer === 0) {
            triggerExplosion(proj.x, proj.y, 45, proj.damage, 'pyro');
            onUpdateStats((prev) => ({
              ...prev,
              playerHp: Math.max(0, prev.playerHp - proj.damage * heatResist),
            }));
            continue;
          }
          survivingProjectiles.push(proj);
          continue;
        }

        // Player Projectile hitting Enemies
        let consumed = false;
        for (const enemy of enemiesRef.current) {
          if (
            enemy.hp > 0 &&
            Math.hypot(proj.x - enemy.x, proj.y - enemy.y) <= enemy.radius + proj.radius + 3
          ) {
            if (proj.element === 'explosive') {
              triggerExplosion(proj.x, proj.y, 75, proj.damage, 'pyro');
              consumed = true;
              break;
            }

            enemy.hp -= proj.damage;

            // Elemental Stacks & Thermal Shock Combo!
            if (proj.element === 'pyro' || proj.element === 'pierce') {
              if (enemy.chillStacks >= 35) {
                // THERMAL SHOCK!
                const shockDmg = Math.round(proj.damage * 2.8 * shockMultiplier);
                enemy.hp -= shockDmg;
                enemy.chillStacks = 0;
                soundFX.playThermalShock();
                triggerExplosion(enemy.x, enemy.y, 72, shockDmg * 0.6, 'shock');
                addFloatingText(
                  enemy.x,
                  enemy.y - 24,
                  `THERMAL SHOCK! -${shockDmg}`,
                  '#38BDF8'
                );
                onUpdateStats((prev) => ({
                  ...prev,
                  thermalShocksTriggered: prev.thermalShocksTriggered + 1,
                  score: prev.score + 75,
                }));
              } else {
                enemy.burnStacks = Math.min(100, enemy.burnStacks + 28);
              }
            } else if (proj.element === 'cryo') {
              if (enemy.burnStacks >= 35) {
                const shockDmg = Math.round(proj.damage * 2.8 * shockMultiplier);
                enemy.hp -= shockDmg;
                enemy.burnStacks = 0;
                soundFX.playThermalShock();
                triggerExplosion(enemy.x, enemy.y, 72, shockDmg * 0.6, 'shock');
                addFloatingText(
                  enemy.x,
                  enemy.y - 24,
                  `CRYO SHATTER! -${shockDmg}`,
                  '#FDE047'
                );
                onUpdateStats((prev) => ({
                  ...prev,
                  thermalShocksTriggered: prev.thermalShocksTriggered + 1,
                  score: prev.score + 75,
                }));
              } else {
                enemy.chillStacks = Math.min(100, enemy.chillStacks + 34);
              }
            }

            proj.pierceCount--;
            if (proj.pierceCount <= 0) {
              consumed = true;
              break;
            }
          }
        }

        if (!consumed) {
          survivingProjectiles.push(proj);
        }
      }
      projectilesRef.current = survivingProjectiles;

      // 6. CHECK BARREL DETONATIONS
      const survivingBarrels: BarrelEntity[] = [];
      for (const barrel of barrelsRef.current) {
        const bCell =
          gridRef.current[Math.floor(barrel.y / CELL_SIZE)]?.[
            Math.floor(barrel.x / CELL_SIZE)
          ];
        if (bCell && bCell.fireIntensity > 0) {
          barrel.hp -= 1.2;
        }
        if (barrel.hp <= 0) {
          triggerExplosion(
            barrel.x,
            barrel.y,
            105,
            155,
            barrel.type === 'cryo' ? 'cryo' : 'pyro'
          );
          addFloatingText(
            barrel.x,
            barrel.y - 18,
            barrel.type === 'cryo' ? 'CRYO DRUM RUPTURE!' : 'FUEL DRUM DETONATION!',
            barrel.type === 'cryo' ? '#38BDF8' : '#F97316'
          );
          onUpdateStats((prev) => ({
            ...prev,
            barrelsDetonated: prev.barrelsDetonated + 1,
          }));
        } else {
          survivingBarrels.push(barrel);
        }
      }
      barrelsRef.current = survivingBarrels;

      // 7. SPAWN WAVE ENEMIES
      if (
        waveDirectorRef.current.waveInProgress &&
        waveDirectorRef.current.enemiesRemainingToSpawn > 0
      ) {
        waveDirectorRef.current.spawnTimer--;
        if (waveDirectorRef.current.spawnTimer <= 0) {
          spawnEnemy();
          waveDirectorRef.current.enemiesRemainingToSpawn--;
          waveDirectorRef.current.spawnTimer = Math.max(
            26,
            78 - stats.wave * 5
          );
        }
      }

      // 8. UPDATE ENEMIES
      const survivingEnemies: EnemyEntity[] = [];
      for (const enemy of enemiesRef.current) {
        // Check underlying cell effects
        const eCell =
          gridRef.current[Math.floor(enemy.y / CELL_SIZE)]?.[
            Math.floor(enemy.x / CELL_SIZE)
          ];
        if (eCell) {
          if (eCell.fireIntensity > 0 || eCell.material === 'fire') {
            enemy.burnStacks = Math.min(100, enemy.burnStacks + 1.2);
          } else if (eCell.material === 'cryo_foam') {
            enemy.chillStacks = Math.min(100, enemy.chillStacks + 1.5);
          }
        }

        // Burn damage over time
        if (enemy.burnStacks > 0) {
          enemy.hp -= 0.22 + (enemy.burnStacks / 100) * 0.45;
          enemy.burnStacks = Math.max(0, enemy.burnStacks - 0.18);
        }
        if (enemy.chillStacks > 0) {
          enemy.chillStacks = Math.max(0, enemy.chillStacks - 0.22);
        }

        if (enemy.hp <= 0) {
          // Death handling
          if (enemy.type === 'swarmer' || enemy.type === 'colossus') {
            modifyCellAtPixel(
              enemy.x,
              enemy.y,
              'pyro',
              enemy.type === 'colossus' ? 3 : 1
            );
          }
          for (let i = 0; i < 10; i++) {
            const ang = Math.random() * Math.PI * 2;
            particlesRef.current.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(ang) * (1 + Math.random() * 3),
              vy: Math.sin(ang) * (1 + Math.random() * 3),
              size: 3 + Math.random() * 4,
              alpha: 1,
              decay: 0.035,
              color: enemy.color,
              type: 'spark',
            });
          }
          addFloatingText(
            enemy.x,
            enemy.y - 12,
            `+${enemy.rewardScrap} SCRAP`,
            '#FBBF24'
          );
          onUpdateStats((prev) => ({
            ...prev,
            scrap: prev.scrap + enemy.rewardScrap,
            score: prev.score + enemy.rewardScore,
            enemiesDefeated: prev.enemiesDefeated + 1,
          }));
          continue;
        }

        // AI Target selection: chase Player if close, otherwise advance toward Outpost Core
        const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        const distToCore = Math.hypot(CORE_X - enemy.x, CORE_Y - enemy.y);
        const targetX = distToPlayer < 175 ? p.x : CORE_X;
        const targetY = distToPlayer < 175 ? p.y : CORE_Y;

        enemy.angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
        const chillSlow = enemy.chillStacks > 0 ? 0.42 : 1.0;

        // Ranged Bombardier stops at 230px from Core to lob incendiary shells
        if (enemy.type === 'bombardier' && distToCore < 245) {
          enemy.attackCooldown--;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 135;
            projectilesRef.current.push({
              id: waveDirectorRef.current.nextEntityId++,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(enemy.angle) * 4.5,
              vy: Math.sin(enemy.angle) * 4.5,
              radius: 6,
              damage: enemy.damage,
              element: 'enemy_mortar',
              fromPlayer: false,
              life: 0,
              maxLife: Math.floor(distToCore / 4.5),
              pierceCount: 1,
            });
          }
        } else {
          enemy.x += Math.cos(enemy.angle) * enemy.speed * chillSlow;
          enemy.y += Math.sin(enemy.angle) * enemy.speed * chillSlow;
        }

        // Cinder Stalker & Inferno Colossus ignite dry brush beneath them
        if (
          (enemy.type === 'stalker' || enemy.type === 'colossus') &&
          eCell &&
          eCell.material === 'brush' &&
          Math.random() < 0.06
        ) {
          eCell.fireIntensity = 80;
          eCell.temperature = 400;
        }

        // Melee collision with Player
        if (distToPlayer < enemy.radius + p.radius && p.invulnTimer === 0) {
          p.invulnTimer = 28;
          onUpdateStats((prev) => ({
            ...prev,
            playerHp: Math.max(0, prev.playerHp - enemy.damage * heatResist),
          }));
          addFloatingText(p.x, p.y - 16, `-${Math.round(enemy.damage * heatResist)} HP`, '#EF4444');
        }

        // Melee collision with Outpost Core
        if (distToCore < enemy.radius + CORE_RADIUS) {
          enemy.attackCooldown--;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 45;
            onUpdateStats((prev) => ({
              ...prev,
              coreHp: Math.max(0, prev.coreHp - enemy.damage),
            }));
            addFloatingText(CORE_X, CORE_Y - 28, `CORE HIT -${enemy.damage}`, '#F87171');
          }
          // Push slightly back outside core radius
          const pushAng = Math.atan2(enemy.y - CORE_Y, enemy.x - CORE_X);
          enemy.x = CORE_X + Math.cos(pushAng) * (CORE_RADIUS + enemy.radius + 2);
          enemy.y = CORE_Y + Math.sin(pushAng) * (CORE_RADIUS + enemy.radius + 2);
        }

        survivingEnemies.push(enemy);
      }
      enemiesRef.current = survivingEnemies;

      // 9. CHECK CORE THERMAL DAMAGE FROM ADJACENT FIRES
      const coreRow = Math.floor(CORE_Y / CELL_SIZE);
      const coreCol = Math.floor(CORE_X / CELL_SIZE);
      let adjacentFires = 0;
      for (let r = coreRow - 2; r <= coreRow + 2; r++) {
        for (let c = coreCol - 2; c <= coreCol + 2; c++) {
          const cell = gridRef.current[r]?.[c];
          if (cell && (cell.fireIntensity > 0 || cell.material === 'fire')) {
            adjacentFires++;
          }
        }
      }
      if (adjacentFires > 0) {
        onUpdateStats((prev) => ({
          ...prev,
          coreHp: Math.max(0, prev.coreHp - adjacentFires * 0.04),
        }));
      }

      // 10. CHECK WAVE CLEAR OR GAME OVER
      if (
        gameMode !== 'SANDBOX' &&
        waveDirectorRef.current.waveInProgress &&
        waveDirectorRef.current.enemiesRemainingToSpawn === 0 &&
        enemiesRef.current.length === 0
      ) {
        waveDirectorRef.current.waveInProgress = false;
        soundFX.playWaveClear();
        if (gameMode === 'CAMPAIGN' && stats.wave >= stats.maxWaves) {
          onGameOver(true);
        } else {
          onWaveComplete();
        }
        return;
      }

      // 11. UPDATE PARTICLES & FLOATING TEXTS
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
      });
      particlesRef.current = particlesRef.current.filter((pt) => pt.alpha > 0.02);

      floatingTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.alpha -= 0.022;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0.02);

      // Sync React HUD state every 100ms
      if (timestamp - waveDirectorRef.current.lastHudSyncTime > 100) {
        waveDirectorRef.current.lastHudSyncTime = timestamp;
        setWeaponHeat(Math.round(p.heat));
        setOverheated(p.overheated);
        setAbilityCooldowns({
          dash: p.dashCooldown,
          nova: p.novaCooldown,
        });
      }

      // 12. RENDER ARENA ON HTML5 CANVAS
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw Cellular Terrain Grid
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const cell = gridRef.current[r]?.[c];
            if (!cell) continue;
            const x = c * CELL_SIZE;
            const y = r * CELL_SIZE;

            if (cell.material === 'dirt') {
              ctx.fillStyle = (r + c) % 2 === 0 ? '#0F172A' : '#111A2E';
            } else if (cell.material === 'brush') {
              ctx.fillStyle = '#14332B';
            } else if (cell.material === 'oil') {
              ctx.fillStyle = '#1E1B2E';
            } else if (cell.material === 'timber') {
              ctx.fillStyle = '#78350F';
            } else if (cell.material === 'scorched') {
              ctx.fillStyle = '#090D16';
            } else if (cell.material === 'cryo_foam') {
              ctx.fillStyle = '#0369A1';
            } else if (cell.material === 'water') {
              ctx.fillStyle = '#0C4A6E';
            } else if (cell.material === 'steel') {
              ctx.fillStyle = '#475569';
            } else {
              ctx.fillStyle = '#0F172A';
            }
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

            // Subtle grid line
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

            // Active Fire Overlay
            if (cell.fireIntensity > 0 || cell.material === 'fire') {
              const flicker = 0.65 + Math.sin(timestamp * 0.02 + r * 3 + c * 5) * 0.25;
              ctx.fillStyle = `rgba(234, 88, 12, ${flicker})`;
              ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

              ctx.fillStyle = '#FDE047';
              ctx.fillRect(x + 5, y + 5, CELL_SIZE - 10, CELL_SIZE - 10);
            } else if (cell.material === 'cryo_foam') {
              ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
              ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }
          }
        }

        // Draw Outpost Aegis Core
        ctx.save();
        ctx.translate(CORE_X, CORE_Y);
        ctx.beginPath();
        ctx.arc(0, 0, CORE_RADIUS + 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, CORE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner hexagon core
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3 + timestamp * 0.001;
          const hx = Math.cos(ang) * 20;
          const hy = Math.sin(ang) * 20;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#7DD3FC';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#E0F2FE';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', 0, 4);
        ctx.restore();

        // Draw Explosive Barrels
        barrelsRef.current.forEach((b) => {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fillStyle = b.type === 'cryo' ? '#0284C7' : '#B91C1C';
          ctx.fill();
          ctx.strokeStyle = b.type === 'cryo' ? '#7DD3FC' : '#FCA5A5';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(b.type === 'cryo' ? 'CRYO' : 'FUEL', 0, 3);
          ctx.restore();
        });

        // Draw Deployed Auto-Turrets
        turretsRef.current.forEach((t) => {
          ctx.save();
          ctx.translate(t.x, t.y);
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#1E293B';
          ctx.fill();
          ctx.strokeStyle = t.mode === 'cryo' ? '#38BDF8' : '#F59E0B';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.rotate(t.angle);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(4, -3, 12, 6);
          ctx.restore();
        });

        // Draw Enemies
        enemiesRef.current.forEach((e) => {
          ctx.save();
          ctx.translate(e.x, e.y);

          // Status ring if Burning or Chilled
          if (e.chillStacks >= 35) {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (e.burnStacks >= 35) {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#F97316';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#1E1B24';
          ctx.fill();
          ctx.strokeStyle = e.color;
          ctx.lineWidth = e.type === 'colossus' ? 3.5 : 2.5;
          ctx.stroke();

          // Inner core indicator
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = e.chillStacks >= 35 ? '#38BDF8' : e.color;
          ctx.fill();

          // Health bar above enemy
          const hpPct = Math.max(0, e.hp / e.maxHp);
          const barW = e.radius * 2.2;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(-barW / 2, -e.radius - 10, barW, 4);
          ctx.fillStyle = e.chillStacks >= 35 ? '#38BDF8' : '#F59E0B';
          ctx.fillRect(-barW / 2, -e.radius - 10, barW * hpPct, 4);

          ctx.restore();
        });

        // Draw Projectiles
        projectilesRef.current.forEach((pr) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
          ctx.fillStyle =
            pr.element === 'cryo'
              ? '#38BDF8'
              : pr.element === 'pyro'
              ? '#F97316'
              : pr.element === 'pierce'
              ? '#F43F5E'
              : '#FDE047';
          ctx.fill();
          ctx.restore();
        });

        // Draw Player Operator
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 3) % 2 === 0) {
          ctx.globalAlpha = 0.55;
        }
        ctx.rotate(p.angle);

        // Gun Barrel
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(8, -4, 15, 8);

        // Operator Hull
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1E293B';
        ctx.fill();
        ctx.strokeStyle = weaponSpec.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Visor
        ctx.fillStyle = weaponSpec.color;
        ctx.fillRect(2, -5, 7, 10);
        ctx.restore();

        // Draw Particles
        particlesRef.current.forEach((pt) => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.alpha);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Draw Floating Combat Texts
        floatingTextsRef.current.forEach((ft) => {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.fillStyle = ft.color;
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        });

        // Draw Tactical Aim Reticle
        ctx.save();
        ctx.translate(mouseRef.current.x, mouseRef.current.y);
        ctx.strokeStyle = p.overheated ? '#EF4444' : weaponSpec.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-17, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0);
        ctx.lineTo(17, 0);
        ctx.moveTo(0, -17);
        ctx.lineTo(0, -8);
        ctx.moveTo(0, 8);
        ctx.lineTo(0, 17);
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(stepSimulation);
    };

    animationFrameId = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    gameState,
    gameMode,
    equippedWeapon,
    windSpeed,
    windAngleDeg,
    sandboxInteractMode,
    stats.wave,
    stats.maxWaves,
    getUpgradeLevel,
    modifyCellAtPixel,
    triggerExplosion,
    spawnEnemy,
    applySandboxToolAt,
    onUpdateStats,
    onWaveComplete,
    onGameOver,
  ]);

  // Monitor Player / Core HP for Defeat trigger
  useEffect(() => {
    if (gameState === 'PLAYING' && gameMode !== 'SANDBOX') {
      if (stats.coreHp <= 0 || stats.playerHp <= 0) {
        onGameOver(false);
      }
    }
  }, [stats.coreHp, stats.playerHp, gameState, gameMode, onGameOver]);

  // Pointer coordinates helper
  const updateMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    mouseRef.current.x = (e.clientX - rect.left) * scaleX;
    mouseRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
  };

  const coreIntegrityPct = Math.round((stats.coreHp / stats.coreMaxHp) * 100);
  const playerHpPct = Math.round((stats.playerHp / stats.playerMaxHp) * 100);

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 md:px-6 py-4 space-y-4">
      {/* Unobtrusive Tactical HUD Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[#111A2E] border border-slate-800 items-center">
        {/* Zone 1: Hull & Core Integrity Meters (Non-Hue-Only Affordances) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-slate-300 font-semibold">OPERATOR HULL</span>
              <span className="text-amber-400">
                HP: {Math.ceil(stats.playerHp)}/{stats.playerMaxHp} ·{' '}
                {playerHpPct > 50 ? 'STABLE' : playerHpPct > 25 ? 'DAMAGED' : 'CRITICAL'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-500 transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${Math.max(0, playerHpPct / 100)})` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-slate-300 font-semibold">OUTPOST CORE</span>
              <span className="text-sky-300">
                HP: {Math.ceil(stats.coreHp)}/{stats.coreMaxHp} ·{' '}
                {coreIntegrityPct > 60 ? 'INTACT' : coreIntegrityPct > 30 ? 'ALERT' : 'BREACH'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded overflow-hidden border border-slate-800">
              <div
                className="h-full bg-sky-400 transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${Math.max(0, coreIntegrityPct / 100)})` }}
              />
            </div>
          </div>
        </div>

        {/* Zone 2: Telemetry & Wind Vector Metadata (Clean unboxed text with separators) */}
        <div className="lg:col-span-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono-tabular text-slate-300">
          <span className="text-amber-400 font-semibold">
            {gameMode === 'SANDBOX'
              ? 'PHYSICS LAB'
              : `WAVE ${stats.wave}/${stats.maxWaves}`}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>SCRAP: {stats.scrap}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>SCORE: {stats.score}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-orange-300">FIRES: {activeFireCellsCount}</span>
        </div>

        {/* Zone 3: Quick Mission Controls */}
        <div className="lg:col-span-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onOpenArmory}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Armory ({stats.scrap})</span>
          </button>

          <button
            type="button"
            onClick={() => initArena(stats.wave, false)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            title="Reset Arena Terrain"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors shrink-0 cursor-pointer"
            aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {gameState === 'PAUSED' ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sandbox Physics Toolbar (Visible when in Fire Physics Lab Mode) */}
      {gameMode === 'SANDBOX' && (
        <div className="p-3.5 rounded-xl bg-[#111A2E] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 mr-2">
              <button
                type="button"
                onClick={() => setSandboxInteractMode('paint')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sandboxInteractMode === 'paint'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Brush / Spawn Mode
              </button>
              <button
                type="button"
                onClick={() => setSandboxInteractMode('combat')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sandboxInteractMode === 'combat'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fire Weapons Mode
              </button>
            </div>

            {(
              [
                { id: 'ignite', label: 'Ignite Fire' },
                { id: 'oil', label: 'Fuel Oil' },
                { id: 'brush', label: 'Dry Brush' },
                { id: 'timber', label: 'Timber Wall' },
                { id: 'cryo_foam', label: 'Cryo Foam' },
                { id: 'steel', label: 'Steel Bunker' },
                { id: 'barrel', label: 'Fuel Barrel' },
                { id: 'spawn_swarmer', label: '+Swarmer' },
                { id: 'spawn_colossus', label: '+Boss Colossus' },
                { id: 'erase', label: 'Clear Dirt' },
              ] as { id: SandboxTool; label: string }[]
            ).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setSandboxTool(tool.id);
                  setSandboxInteractMode('paint');
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sandboxInteractMode === 'paint' && sandboxTool === tool.id
                    ? 'bg-slate-100 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Wind Speed & Angle Controls */}
          <div className="flex items-center gap-4 text-xs font-mono-tabular text-slate-300">
            <label className="flex items-center gap-2 whitespace-nowrap">
              <Wind className="w-3.5 h-3.5 text-amber-400" />
              <span>Wind: {windSpeed} kt</span>
              <input
                type="range"
                min={0}
                max={40}
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-20 accent-amber-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center gap-2 whitespace-nowrap">
              <span>Dir: {windAngleDeg}°</span>
              <input
                type="range"
                min={0}
                max={359}
                value={windAngleDeg}
                onChange={(e) => setWindAngleDeg(Number(e.target.value))}
                className="w-20 accent-sky-400 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* Interactive Tactical Arena Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0B111E] shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onMouseMove={updateMousePos}
          onMouseDown={(e) => {
            updateMousePos(e);
            mouseRef.current.isDown = true;
            if (gameMode === 'SANDBOX' && sandboxInteractMode === 'paint') {
              applySandboxToolAt(mouseRef.current.x, mouseRef.current.y);
            }
          }}
          onMouseUp={() => {
            mouseRef.current.isDown = false;
          }}
          onMouseLeave={() => {
            mouseRef.current.isDown = false;
          }}
          className="w-full h-auto block cursor-crosshair select-none"
        />

        {/* Paused Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <p className="text-xs font-mono-tabular text-amber-400 mb-2">
              TACTICAL COMMAND PAUSED
            </p>
            <h3 className="text-3xl font-bold text-slate-100 mb-2">
              Mission Standby
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Review your thermal weapon loadout or resume defense of the Outpost Aegis Core.
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onTogglePause}
                className="px-6 py-2.5 text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Resume Mission
              </button>
              <button
                type="button"
                onClick={onOpenArmory}
                className="px-6 py-2.5 text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Armory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ordnance Hotbar & Tactical Abilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[#111A2E] border border-slate-800 items-center">
        {/* Weapon Slots 1-5 */}
        <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
          {WEAPON_SPECS.map((w, idx) => {
            const unlocked = unlockedWeapons.includes(w.id);
            const active = equippedWeapon === w.id;
            return (
              <button
                key={w.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  onSelectWeapon(w.id);
                  if (gameMode === 'SANDBOX') setSandboxInteractMode('combat');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold cursor-pointer'
                    : unlocked
                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800 cursor-pointer'
                    : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                }`}
              >
                <span className="font-mono-tabular opacity-75">[{idx + 1}]</span>
                <span>{w.name.replace(/^(M42 |Helios |Zero-K |Vulcan |Brimstone )/, '')}</span>
              </button>
            );
          })}
        </div>

        {/* Weapon Thermal Gauge & Active Abilities */}
        <div className="lg:col-span-5 flex flex-wrap items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-2 text-xs font-mono-tabular">
            <span className={overheated ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              HEAT: {weaponHeat}% · {overheated ? 'OVERHEATED' : 'NOMINAL'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDeployTurret}
            disabled={stats.scrap < 35}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              stats.scrap >= 35
                ? 'bg-slate-800 text-sky-300 hover:bg-slate-700 border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            [E] Sentry (35 Scrap)
          </button>

          <button
            type="button"
            onClick={handleThermalNova}
            disabled={abilityCooldowns.nova > 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              abilityCooldowns.nova === 0
                ? 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            [Q] Thermal Pulse {abilityCooldowns.nova > 0 ? `(${Math.ceil(abilityCooldowns.nova / 60)}s)` : ''}
          </button>

          <button
            type="button"
            onClick={handleJetDash}
            disabled={abilityCooldowns.dash > 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              abilityCooldowns.dash === 0
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            [Space] Jet-Dash
          </button>
        </div>
      </div>
    </div>
  );
};
