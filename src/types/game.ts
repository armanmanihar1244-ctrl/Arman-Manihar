export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'GAME_OVER';

export type GameMode = 'CAMPAIGN' | 'ENDLESS' | 'SANDBOX';

export type ActiveTab = 'arena' | 'armory' | 'sandbox' | 'manual';

export type WeaponId = 'carbine' | 'scorcher' | 'cryo' | 'railgun' | 'mortar';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  role: string;
  damage: number;
  fireRateMs: number;
  projectileSpeed: number;
  spreadAngle: number;
  ammoCapacity: number; // -1 for infinite
  reloadTimeMs: number;
  heatGenerated: number;
  element: 'kinetic' | 'pyro' | 'cryo' | 'pierce' | 'explosive';
  description: string;
  color: string;
  unlockedByDefault: boolean;
  unlockCost: number;
}

export interface UpgradeId {
  id: 'hull_plating' | 'weapon_overclock' | 'cryo_synthesis' | 'turret_mk2' | 'core_shielding' | 'thermal_capacitors';
  name: string;
  category: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: string;
}

export type CellMaterial =
  | 'dirt'
  | 'brush'
  | 'timber'
  | 'oil'
  | 'fire'
  | 'scorched'
  | 'cryo_foam'
  | 'steel'
  | 'water';

export interface GridCell {
  material: CellMaterial;
  fuel: number;       // 0 - 100
  temperature: number; // -50 to 800
  fireIntensity: number; // 0 - 100
  wetness: number;    // 0 - 100
  hp: number;         // for timber/steel walls
  maxHp: number;
}

export type SandboxTool =
  | 'ignite'
  | 'oil'
  | 'brush'
  | 'timber'
  | 'cryo_foam'
  | 'steel'
  | 'barrel'
  | 'spawn_swarmer'
  | 'spawn_colossus'
  | 'erase';

export type EnemyType = 'stalker' | 'bruiser' | 'bombardier' | 'swarmer' | 'colossus';

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  burnStacks: number; // 0 - 100
  chillStacks: number; // 0 - 100
  attackCooldown: number;
  rewardScrap: number;
  rewardScore: number;
  color: string;
  angle: number;
}

export interface ProjectileEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  element: 'kinetic' | 'pyro' | 'cryo' | 'pierce' | 'explosive' | 'enemy_mortar';
  fromPlayer: boolean;
  life: number;
  maxLife: number;
  targetX?: number;
  targetY?: number;
  pierceCount: number;
}

export interface BarrelEntity {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'fuel' | 'cryo';
  ignitedTimer: number;
}

export interface TurretEntity {
  id: number;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  mode: 'kinetic' | 'cryo';
  ammo: number;
  maxAmmo: number;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  type: 'ember' | 'smoke' | 'cryo' | 'spark' | 'shockwave';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface SessionStats {
  score: number;
  scrap: number;
  wave: number;
  maxWaves: number;
  enemiesDefeated: number;
  firesExtinguished: number;
  thermalShocksTriggered: number;
  barrelsDetonated: number;
  coreHp: number;
  coreMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  difficulty: 'Standard' | 'Veteran' | 'Inferno';
}
