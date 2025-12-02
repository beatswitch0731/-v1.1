
export interface Vector2 {
  x: number;
  y: number;
}

export enum CharacterClass {
  SAMURAI = 'SAMURAI',
  GUNNER = 'GUNNER',
  MAGE = 'MAGE'
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAIN = 'RAIN',
  NEON_NIGHT = 'NEON_NIGHT',
  BLOOD_MOON = 'BLOOD_MOON' // New boss weather
}

export enum MapType {
  GRASSLAND = 'GRASSLAND',
  ICE_WORLD = 'ICE_WORLD'
}

export enum TileType {
  GRASS = 'GRASS',
  WATER = 'WATER',
  MOUNTAIN = 'MOUNTAIN',
  SNOW = 'SNOW',
  ICE = 'ICE',
  SAND = 'SAND'
}

export enum ItemType {
  HEALTH_POTION = 'HEALTH_POTION',
  XP_CRYSTAL = 'XP_CRYSTAL',
  COOLDOWN_ORB = 'COOLDOWN_ORB'
}

export enum DecorationType {
    FLOWER_RED = 'FLOWER_RED',
    FLOWER_YELLOW = 'FLOWER_YELLOW',
    PEBBLE = 'PEBBLE',
    ROCK = 'ROCK',
    GRASS_TUFT = 'GRASS_TUFT',
    BOSS_ALTAR = 'BOSS_ALTAR', // New Trigger
    DOCK = 'DOCK' // New: Boat Dock
}

export enum ShrineType {
    BLOOD = 'BLOOD',   
    HEAL = 'HEAL',     
    GAMBLE = 'GAMBLE', 
    COOLDOWN = 'COOLDOWN',
    LEGENDARY = 'LEGENDARY' // Boss Reward
}

// New: Map Props
export enum PropType {
    BARREL = 'BARREL', // Explodes when hit
    CHEST = 'CHEST'    // Drops items when interacted
}

export enum BossState {
    INTRO = 'INTRO',
    PHASE_1 = 'PHASE_1',
    PHASE_2 = 'PHASE_2',
    DYING = 'DYING'
}

export enum BossType {
    SHOGUN = 'SHOGUN',
    CONSTRUCT = 'CONSTRUCT',
    NONE = 'NONE'
}

// NEW: Random Events
export enum GameEventType {
    BLOOD_MOON_RISING = 'BLOOD_MOON_RISING',
    MONSTER_AMBUSH = 'MONSTER_AMBUSH',
    GOLDEN_RAIN = 'GOLDEN_RAIN'
}

export interface ActiveGameEvent {
    type: GameEventType;
    name: string;
    description: string;
    timeLeft: number; // in ms
    totalDuration: number;
    color: string; // Hex for UI
}

// New: Five Elements
export type ElementalType = 'METAL' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH';

export interface Decoration {
    type: DecorationType;
    x: number;
    y: number;
    scale: number;
    active?: boolean; // For Altar state
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  unlockLevel: number;
  icon: string;
}

export interface PlayerStats {
  maxHp: number;
  speed: number;
  damage: number;
  fireRate: number;
  range: number;
  cooldown: number;
  skillName: string;
  description: string;
  color: string;
  skills: Skill[];
}

export interface PlayerModifiers {
    damageMult: number;
    fireRateMult: number;
    speedMult: number;
    rangeMult: number;
    maxHpMult: number;
    extraProjectiles: number;
    blockChance?: number;
    executionThreshold?: number;
    funnelCount?: number;
    funnelFireRateMult?: number;
    funnelElectricChance?: number;
    funnelBurnChance?: number;
    knockbackMult?: number;
    ricochetCount?: number;
    iaidoMultiplier?: number;
    explosiveShots?: boolean;
    fanFire?: boolean;
    lassoShock?: boolean;
    hasSweetSpot?: boolean;
    hasBladeWave?: boolean;
    iaidoCyclone?: boolean;
    bladeDance?: boolean;
    thunderDash?: boolean;
    windEndures?: boolean;
    inkTrail?: boolean;
    dragonFury?: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  icon: string;
  apply: (modifiers: any) => void;
  classSpecific?: CharacterClass;
  prerequisite?: string;
  maxStacks?: number;
  stat?: string;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  velocity: Vector2;
  size?: number;
}

export interface GameState {
    isPlaying: boolean;
    isPaused: boolean;
    isGameOver: boolean;
    score: number;
    wave: number;
    enemiesKilled: number;
    timeElapsed: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    weather: WeatherType;
    playerHp: number;
    playerMaxHp: number;
    activeCooldowns: Record<number, number>;
    currentDamage: number;
    currentMapType: MapType;
    bossHp: number;
    bossMaxHp: number;
    bossName?: string;
    bossElement?: string;
    dashCooldownPct: number;
    activeEvent?: ActiveGameEvent | null; // New field
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'projectile' | 'particle' | 'item' | 'tree' | 'boat' | 'portal' | 'shrine' | 'prop';
  
  pos: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  hp: number;
  maxHp: number;

  // Optional Properties
  enemyType?: 'CHASER' | 'SHOOTER' | 'TANK' | 'BOSS_GRASS' | 'BOSS_ICE' | 'ICE_SLIME' | 'YETI'; // Legacy types kept for compatibility
  bossType?: BossType; // New strict type
  bossState?: BossState;
  
  owner?: 'player' | 'enemy';
  shrineType?: ShrineType;
  shrineUsed?: boolean;
  
  // Prop Specific
  propType?: PropType;
  propActive?: boolean;

  isElite?: boolean;
  eliteAffix?: 'SPEED' | 'TANK' | 'EXPLOSIVE';
  
  duration?: number;
  maxDuration?: number;
  rotation?: number;
  rotationSpeed?: number;
  alpha?: number;
  facing?: number;
  animFrame?: number;
  attackAnim?: number;
  maxAttackAnim?: number;
  
  // Player Specific
  chargeTimer?: number;
  cooldowns?: Record<string, number>;
  modifiers?: PlayerModifiers;
  upgradeCounts?: Record<string, number>;
  ammo?: number;
  maxAmmo?: number;
  reloading?: boolean;
  reloadTimer?: number;
  quickReloadBuffTimer?: number;
  quickDrawStacks?: number;
  comboStage?: number;
  comboHitCount?: number;
  buffs?: Record<string, number>;
  vampiricCharges?: number;
  funnelCooldowns?: number[];
  isSkill2Charging?: boolean;
  isIaidoCharged?: boolean;
  windEnduresCounter?: number;
  dashTimer?: number;
  dashCooldownTimer?: number;
  maxDashTimer?: number;
  dashDir?: Vector2;
  footstepTimer?: number;
  stationaryTimer?: number;

  // Projectile/Particle/Skill Specific
  swordAttackTimer?: number;
  attackSpeedMult?: number;
  isCharging?: boolean;
  element?: ElementalType;
  projectileType?: string;
  particleType?: string;
  leafType?: string;
  trail?: Vector2[];
  orbitAngle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  scale?: number;
  hitList?: string[]; // Tracks unique enemies hit by this projectile
  
  ricochetsLeft?: number;
  piercing?: boolean;
  teslaDetonation?: boolean;
  isFunnelShot?: boolean;
  isInferno?: boolean;
  
  // Item specific
  z?: number;
  zVelocity?: number;
  itemType?: ItemType;
  
  // Other
  onBoat?: boolean;
  hitFlash?: number;
  pullTimer?: number;
  stunTimer?: number;
  stunType?: string;
  burnTimer?: number;
  burnTickTimer?: number;
  specialAttackTimer?: number;
  damage?: number;
  deathTimer?: number;
}