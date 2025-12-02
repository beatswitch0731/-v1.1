

import { CharacterClass, PlayerStats, WeatherType, Skill, MapType, Upgrade } from './types';

// High Definition Pixel Art Scale
export const TILE_SIZE = 48; 
export const MAP_WIDTH = 100; // Expanded Map Size
export const MAP_HEIGHT = 100;

// HD Internal resolution
export const INTERNAL_WIDTH = 1280;
export const INTERNAL_HEIGHT = 720;

export const IAIDO_CHARGE_FRAMES = 120; // 2.0 seconds at 60fps

// --- SKILLS ---

const SAMURAI_SKILLS: Skill[] = [
  { id: 's1', name: '墨流·断空', description: '挥出带有水墨剑气的圆斩，造成 280% 伤害并清除弹幕。', cooldown: 4000, unlockLevel: 1, icon: 'sword' },
  { id: 's2', name: '御剑·千机', description: '召唤 5 把灵体飞剑向外螺旋扩散，穿透沿途敌人。', cooldown: 8000, unlockLevel: 3, icon: 'zap' },
  { id: 's3', name: '风神腿', description: '化作疾风向前突进，并在路径上留下切割真空。', cooldown: 6000, unlockLevel: 5, icon: 'wind' },
  { id: 's4', name: '绝技·昙花一现', description: '刹那间冻结时间，斩出万千刀光，纳刀时引发全屏毁灭性伤害。', cooldown: 20000, unlockLevel: 9, icon: 'moon' },
];

const GUNNER_SKILLS: Skill[] = [
  { id: 'g1', name: '电磁套索', description: '投掷力场陷阱，将敌人强行吸附至中心并眩晕。', cooldown: 8000, unlockLevel: 3, icon: 'zap' },
  { id: 'g2', name: '亡命连射', description: '扇形连发 12 枚重型子弹，清空前方区域。', cooldown: 6000, unlockLevel: 5, icon: 'crosshair' },
  { id: 'g3', name: 'TNT 快递', description: '投掷滚动的炸药桶，引发毁灭性大爆炸。', cooldown: 12000, unlockLevel: 7, icon: 'bomb' },
  { id: 'g4', name: '午时已到', description: '标记屏幕内所有敌人，一秒后造成 320% 的致命伤害。', cooldown: 15000, unlockLevel: 9, icon: 'skull' },
];

const MAGE_SKILLS: Skill[] = [
  { id: 'm1', name: '冰霜符咒', description: '冻结周围的敌人。', cooldown: 6000, unlockLevel: 3, icon: 'snowflake' },
  { id: 'm2', name: '金钟罩', description: '短时间内获得无敌护盾。', cooldown: 15000, unlockLevel: 5, icon: 'shield' },
  { id: 'm3', name: '八卦爆破', description: '释放爆炸性能量符文。', cooldown: 5000, unlockLevel: 7, icon: 'flame' },
  { id: 'm4', name: '星辰陨落', description: '召唤坠落的星辰。', cooldown: 12000, unlockLevel: 9, icon: 'moon' },
];

// Rebalanced Stats
export const CLASS_STATS: Record<CharacterClass, PlayerStats> = {
  [CharacterClass.SAMURAI]: {
    maxHp: 200,
    speed: 3.8, 
    damage: 55, 
    fireRate: 450,
    range: 140,
    cooldown: 0, 
    skillName: '',
    description: '东方剑客。以意御剑，以气化形。',
    color: '#0d9488', 
    skills: SAMURAI_SKILLS
  },
  [CharacterClass.GUNNER]: {
    maxHp: 250,
    speed: 2.7, 
    damage: 45, // Slightly buffed damage to compensate for slower fire rate
    fireRate: 660, // 1.5 shots per second approx
    range: 600,
    cooldown: 0,
    skillName: '',
    description: '赏金猎人。来自荒野的西部双枪客。',
    color: '#d97706', 
    skills: GUNNER_SKILLS
  },
  [CharacterClass.MAGE]: {
    maxHp: 120,
    speed: 3.0, 
    damage: 50, 
    fireRate: 550,
    range: 500,
    cooldown: 0,
    skillName: '',
    description: '科技法师。操控元素与符咒之力。',
    color: '#7c3aed', 
    skills: MAGE_SKILLS
  },
};

// --- UPGRADES ---

// Universal Upgrades (All classes)
const SHARED_UPGRADES: Upgrade[] = [
    { id: 'dmg_boost', name: '强化合金', description: '伤害 +20%', rarity: 'COMMON', icon: 'sword', apply: (m) => m.damageMult += 0.2 },
    { id: 'speed_boost', name: '赛博义肢', description: '移动速度 +15%', rarity: 'COMMON', icon: 'wind', apply: (m) => m.speedMult += 0.15 },
    { id: 'hp_boost', name: '纳米外壳', description: '最大生命 +30% 并完全回复', rarity: 'RARE', icon: 'shield', stat: 'maxHp', apply: (m) => m.maxHpMult += 0.3 },
    { id: 'glass_cannon', name: '玻璃大炮', description: '伤害 +100%, 最大生命 -50%', rarity: 'LEGENDARY', icon: 'sword', apply: (m) => { m.damageMult += 1.0; m.maxHpMult *= 0.5; } },
    { id: 'ricochet_rounds', name: '跳弹计算', description: '子弹命中后弹射 1 次', rarity: 'RARE', icon: 'copy', apply: (m) => m.ricochetCount = (m.ricochetCount || 0) + 1 },
];

// Gunner Specific - General Pool
const GUNNER_UPGRADES: Upgrade[] = [
    { id: 'rate_boost', name: '极速扳机', description: '射速 +15%', rarity: 'COMMON', icon: 'zap', classSpecific: CharacterClass.GUNNER, apply: (m) => m.fireRateMult *= 0.85 },
    { id: 'range_boost', name: '智能瞄准镜', description: '射程 +25%', rarity: 'COMMON', icon: 'crosshair', classSpecific: CharacterClass.GUNNER, apply: (m) => m.rangeMult += 0.25 },
    { id: 'multi_shot', name: '分裂膛室', description: '投射物 +1, 伤害 -15%', rarity: 'EPIC', icon: 'copy', classSpecific: CharacterClass.GUNNER, apply: (m) => { m.extraProjectiles += 1; m.damageMult *= 0.85; } },
    { id: 'sniper', name: '磁轨炮模组', description: '伤害 +50%, 射速 -20%', rarity: 'EPIC', icon: 'target', classSpecific: CharacterClass.GUNNER, apply: (m) => { m.damageMult += 0.5; m.fireRateMult *= 1.2; } },
    { id: 'depleted_uranium', name: '贫铀穿甲弹', description: '伤害 +40%, 击退大幅提升', rarity: 'EPIC', icon: 'bomb', classSpecific: CharacterClass.GUNNER, apply: (m) => { m.damageMult += 0.4; m.knockbackMult = (m.knockbackMult || 1.0) + 1.5; } },

    // Legendary: Funnel System
    { id: 'funnel_system', name: '浮游炮阵列', description: '增加 1 个悬浮僚机 (自动索敌)', rarity: 'LEGENDARY', icon: 'zap', classSpecific: CharacterClass.GUNNER, maxStacks: 5, apply: (m) => m.funnelCount = (m.funnelCount || 0) + 1 },
    
    // Funnel Upgrades (Require Funnel System)
    { id: 'funnel_overclock', name: '智械超频', description: '浮游炮攻速 +50%', rarity: 'RARE', icon: 'wind', classSpecific: CharacterClass.GUNNER, prerequisite: 'funnel_system', apply: (m) => m.funnelFireRateMult = (m.funnelFireRateMult || 1.0) * 1.5 },
    { id: 'funnel_tesla', name: '特斯拉线圈', description: '浮游炮附带 30% 麻痹几率', rarity: 'EPIC', icon: 'zap', classSpecific: CharacterClass.GUNNER, prerequisite: 'funnel_system', maxStacks: 3, apply: (m) => m.funnelElectricChance = (m.funnelElectricChance || 0) + 0.3 },
    { id: 'funnel_napalm', name: '白磷弹头', description: '浮游炮附带 30% 灼烧几率', rarity: 'EPIC', icon: 'flame', classSpecific: CharacterClass.GUNNER, prerequisite: 'funnel_system', maxStacks: 3, apply: (m) => m.funnelBurnChance = (m.funnelBurnChance || 0) + 0.3 },
];

// Gunner Exclusive Evolution Pool
export const GUNNER_EVOLUTIONS: Upgrade[] = [
    { id: 'explosive_rounds', name: '亡命徒协议', description: '【专属】普通射击有几率触发爆炸(AoE)。子弹命中敌人后产生小范围爆破。', rarity: 'LEGENDARY', icon: 'bomb', classSpecific: CharacterClass.GUNNER, maxStacks: 1, apply: (m) => m.explosiveShots = true },
    { id: 'inferno_fan', name: '地狱枪管', description: '【专属】亡命连射变为100发穿透弹幕，模拟14发弹夹伤害循环(含暴击)，附带动态火光。', rarity: 'LEGENDARY', icon: 'flame', classSpecific: CharacterClass.GUNNER, maxStacks: 1, apply: (m) => m.fanFire = true },
    { id: 'tesla_lasso', name: '雷霆警长', description: '【专属】电磁套索持续放电，结束时引爆电磁场造成180%范围伤害 (白黄紫特效)。', rarity: 'LEGENDARY', icon: 'zap', classSpecific: CharacterClass.GUNNER, maxStacks: 1, apply: (m) => m.lassoShock = true },
    { id: 'quick_draw_prep', name: '速射准备', description: '【专属】冲刺后立即填装 3 发极速射击子弹，且 3 秒内换弹时间减半。', rarity: 'LEGENDARY', icon: 'wind', classSpecific: CharacterClass.GUNNER, maxStacks: 1, apply: (m) => {} }, // Logic handled in GameCanvas
];

// Samurai Specific - General Pool
const SAMURAI_UPGRADES: Upgrade[] = [
    // Common / Stat Tweaks
    { id: 'blade_hone', name: '名刀研磨', description: '攻击范围 +20%', rarity: 'COMMON', icon: 'sword', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.rangeMult += 0.2 },
    { id: 'lightweight_grip', name: '轻量化刀柄', description: '攻击速度 +15%', rarity: 'COMMON', icon: 'wind', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.fireRateMult *= 0.85 },

    // Rare Mechanics
    { id: 'zanshin', name: '残心 (格挡)', description: '15% 几率完全格挡伤害并反击', rarity: 'RARE', icon: 'shield', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.blockChance = (m.blockChance || 0) + 0.15 },
    
    // Epic Mechanics
    { id: 'seppuku_cull', name: '介错 (斩杀)', description: '立即处决生命值低于 20% 的非BOSS敌人', rarity: 'EPIC', icon: 'skull', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.executionThreshold = 0.2 },
    { id: 'kendo_sweetspot', name: '剑道 (剑气)', description: '刀尖(外圈20%)造成 200% 暴击伤害', rarity: 'EPIC', icon: 'crosshair', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.hasSweetSpot = true },
    
    // Legendary Mechanics
    { id: 'ink_wave', name: '墨流 (剑气)', description: '挥刀时斩出飞行的墨水剑气 (继承攻击特效)', rarity: 'LEGENDARY', icon: 'wind', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.hasBladeWave = true },
    { id: 'niten_ichiryu', name: '二天一流', description: '额外触发一次斩击 (多重攻击)', rarity: 'LEGENDARY', icon: 'copy', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.extraProjectiles += 1 },
];

// Samurai Exclusive Evolution Pool (New)
export const SAMURAI_EVOLUTIONS: Upgrade[] = [
    { id: 'iaido_cyclone', name: '居合·龙卷', description: '【专属】居合状态下，【墨流·断空】化为一道向前移动的龙卷风，持续吸附并切割路径上的敌人。', rarity: 'LEGENDARY', icon: 'wind', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.iaidoCyclone = true },
    { id: 'blade_dance', name: '万剑归宗', description: '【专属】御剑数量 +5，大幅提升剑阵火力。', rarity: 'LEGENDARY', icon: 'sword', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.bladeDance = true },
    { id: 'thunder_flash', name: '雷切·残影', description: '【专属】风神腿冲刺起点留下一道带电的残影，短暂延迟后爆炸造成范围伤害。', rarity: 'LEGENDARY', icon: 'zap', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.thunderDash = true },
    { id: 'wind_endures', name: '风难熄', description: '【专属】每造成 4 次伤害，触发一次风刃追击 (80% 伤害)。', rarity: 'LEGENDARY', icon: 'wind', classSpecific: CharacterClass.SAMURAI, apply: (m) => m.windEndures = true },
    { id: 'iaido_master', name: '居合·极意', description: '【专属】解锁居合架势：静止 2 秒后，下一次斩击造成 250% 伤害 (范围大幅提升)。', rarity: 'LEGENDARY', icon: 'target', classSpecific: CharacterClass.SAMURAI, maxStacks: 1, apply: (m) => m.iaidoMultiplier = 2.5 },
];

export const ALL_UPGRADES = [...SHARED_UPGRADES, ...GUNNER_UPGRADES, ...SAMURAI_UPGRADES];

// --- SPRITE PALETTES ---
export const SPRITE_PALETTES = {
  MAGE: { OUTLINE: '#2e1065', ROBE_DARK: '#581c87', ROBE_BASE: '#7e22ce', ROBE_LIGHT: '#a855f7', SKIN: '#fde047', HAIR_DARK: '#1e3a8a', HAIR_LIGHT: '#60a5fa', ACCENT: '#ffffff', RUNE: '#facc15' },
  SAMURAI: { 
      OUTLINE: '#022c22', 
      ROBE_DARK: '#0f766e', // Dark Teal
      ROBE_BASE: '#14b8a6', // Teal Base
      ROBE_INNER: '#ffffff', // Clean White Inner
      ACCENT: '#facc15', // Gold Trim
      HAIR: '#1a1a1a', // Black Hair
      SKIN: '#ffe4c4', // Fair Skin (Bisque)
      GOURD: '#a3e635', // Yellow-Green/Chartreuse for high contrast vs Teal
      SWORD: '#475569', // Slate Sword
      SWORD_HILT: '#b45309' // Wood Hilt
  },
  GUNNER: { 
      // Cowboy Palette
      OUTLINE: '#271c19', 
      HAT_DARK: '#3f2c20', 
      HAT_BASE: '#6d4c41', 
      HAT_LIGHT: '#8d6e63',
      COAT_DARK: '#3e2723', 
      COAT_BASE: '#5d4037', // Brown Duster
      SHIRT: '#ffedd5', // Off-white/Cream
      SCARF: '#dc2626', // Red
      PANTS: '#1e3a8a', // Dark Blue Jeans
      BELT: '#271c19', 
      BADGE: '#fbbf24', // Gold Star
      BOOTS: '#271c19',
      SKIN: '#fde047', 
      HAIR: '#1a1a1a',
      GUN_METAL: '#cbd5e1', // Silver
      GUN_HANDLE: '#3f2c20'
  },
  
  // ENEMIES
  ENEMY_BASIC: { OUTLINE: '#271c19', BODY_DARK: '#5d4037', BODY_BASE: '#8d6e63', BODY_LIGHT: '#d7ccc8', BAND_DARK: '#1e3a8a', BAND_LIGHT: '#60a5fa', SPIKE: '#ffcc80' },
  
  // New: Ranged Enemy (Greenish/Hunter)
  ENEMY_SHOOTER: { 
      OUTLINE: '#022c22', 
      BODY_DARK: '#14532d', 
      BODY_BASE: '#166534', 
      BODY_LIGHT: '#4ade80', 
      HOOD_DARK: '#064e3b', 
      HOOD_LIGHT: '#22c55e', 
      WEAPON: '#78350f' 
  },
  
  // New: Tank Enemy (Armored/Grey)
  ENEMY_TANK: { 
      OUTLINE: '#0f172a', 
      BODY_DARK: '#1e293b', 
      BODY_BASE: '#334155', 
      BODY_LIGHT: '#64748b', 
      SHIELD_DARK: '#334155', 
      SHIELD_BASE: '#475569', 
      SHIELD_LIGHT: '#94a3b8',
      GLOW: '#ef4444' // Red eye
  },

  // Ice Variations
  ENEMY_ICE: { OUTLINE: '#1e3a8a', BODY_DARK: '#1e40af', BODY_BASE: '#3b82f6', BODY_LIGHT: '#93c5fd', BAND_DARK: '#1e293b', BAND_LIGHT: '#64748b', SPIKE: '#e0f2fe' },
  BOSS_GRASS: { OUTLINE: '#022c22', DARK: '#14532d', BASE: '#166534', LIGHT: '#22c55e', ACCENT: '#fcd34d' },
  BOSS_ICE: { OUTLINE: '#0c4a6e', DARK: '#0369a1', BASE: '#0ea5e9', LIGHT: '#7dd3fc', ACCENT: '#f0f9ff' },
};

// --- MAP & WEATHER PALETTES ---

export const MAP_PALETTES: Record<MapType, Record<WeatherType, any>> = {
  [MapType.GRASSLAND]: {
    [WeatherType.SUNNY]: {
      BG: '#3b82f6', 
      // Optimized Grass Palette
      GRASS_VARIANTS: ['#4d7c0f', '#528014', '#47730e', '#568418', '#4f7d11'],
      
      GRASS: '#4d7c0f',       
      GRASS_LIGHT: '#65a30d', 
      GRASS_SHADOW: '#365314',
      
      DIRT: '#b45309', 
      DIRT_LIGHT: '#d97706', 
      DIRT_SPEC: '#57534e', // Stone Grey (Lighter than before)
      PEBBLE: '#78716c', // Stone 500
      
      // New Decoration Palettes
      LEAF_VARIANTS: ['#d97706', '#b45309', '#65a30d', '#a16207', '#84cc16'], // Autumn/Dry leaves
      FLOWER_VARIANTS: ['#fef08a', '#fecaca', '#e9d5ff', '#fed7aa'], // Pastel flowers
      
      WATER: '#0ea5e9', 
      WATER_LIGHT: '#7dd3fc', 
      WATER_DEEP: '#0369a1',
      WATER_SHORE: '#7dd3fc',
      WATER_FOAM: 'rgba(255,255,255,0.3)',

      MOUNTAIN: '#475569',          
      MOUNTAIN_SHADOW: '#334155',   
      MOUNTAIN_LIGHT: '#64748b',    
      MOUNTAIN_HIGHLIGHT: '#f1f5f9',
      MOUNTAIN_SIDE: '#475569', 
      MOUNTAIN_TOP: '#64748b', 
      
      TREE_DARK: '#1e293b', 
      TREE_LIGHT: '#65a30d',
      TREE_TRUNK: '#365314', // Mossy Green Trunk
      
      TINT: 'rgba(255, 240, 200, 0.05)' 
    },
    [WeatherType.RAIN]: {
       BG: '#1e293b', 
       GRASS_VARIANTS: ['#3f6212', '#3a5a11', '#426813'], 
       GRASS: '#3f6212', 
       GRASS_LIGHT: '#4d7c0f', 
       GRASS_SHADOW: '#020617',
       DIRT: '#78350f', DIRT_LIGHT: '#92400e', DIRT_SPEC: '#1e293b', PEBBLE: '#475569',
       LEAF_VARIANTS: ['#3f6212', '#14532d'],
       FLOWER_VARIANTS: ['#93c5fd'],
       WATER: '#1d4ed8', WATER_LIGHT: '#3b82f6', WATER_DEEP: '#1e3a8a', WATER_SHORE: '#3b82f6', WATER_FOAM: 'rgba(255,255,255,0.2)',
       MOUNTAIN: '#1e293b', MOUNTAIN_SHADOW: '#0f172a', MOUNTAIN_LIGHT: '#334155', MOUNTAIN_HIGHLIGHT: '#94a3b8', MOUNTAIN_SIDE: '#1e293b', MOUNTAIN_TOP: '#334155',
       TREE_DARK: '#0f172a', TREE_LIGHT: '#3f6212', TREE_TRUNK: '#14532d',
       TINT: 'rgba(10, 20, 40, 0.3)' 
    },
    [WeatherType.NEON_NIGHT]: { 
       BG: '#020617', 
       GRASS_VARIANTS: ['#0f172a', '#11192e', '#0d1526'], 
       GRASS: '#0f172a', 
       GRASS_LIGHT: '#1e293b', 
       GRASS_SHADOW: '#000000',
       DIRT: '#334155', DIRT_LIGHT: '#475569', DIRT_SPEC: '#000', PEBBLE: '#1e293b',
       LEAF_VARIANTS: ['#1e1b4b', '#312e81'],
       FLOWER_VARIANTS: ['#4c1d95'],
       WATER: '#312e81', WATER_LIGHT: '#4338ca', WATER_DEEP: '#1e1b4b', WATER_SHORE: '#4338ca', WATER_FOAM: 'rgba(129, 140, 248, 0.1)',
       MOUNTAIN: '#0f172a', MOUNTAIN_SHADOW: '#020617', MOUNTAIN_LIGHT: '#1e293b', MOUNTAIN_HIGHLIGHT: '#374151', MOUNTAIN_SIDE: '#020617', MOUNTAIN_TOP: '#1e1b4b',
       TREE_DARK: '#000000', TREE_LIGHT: '#172554', TREE_TRUNK: '#020617',
       TINT: 'rgba(0, 0, 0, 0.5)'
    },
    [WeatherType.BLOOD_MOON]: {
       BG: '#2a0a0a', 
       GRASS_VARIANTS: ['#450a0a', '#5c1010', '#3b0606'], 
       GRASS: '#450a0a', 
       GRASS_LIGHT: '#7f1d1d', 
       GRASS_SHADOW: '#000000',
       DIRT: '#450a0a', DIRT_LIGHT: '#7f1d1d', DIRT_SPEC: '#991b1b', PEBBLE: '#222',
       LEAF_VARIANTS: ['#991b1b', '#ef4444'],
       FLOWER_VARIANTS: ['#ef4444'],
       WATER: '#7f1d1d', WATER_LIGHT: '#ef4444', WATER_DEEP: '#2a0a0a', WATER_SHORE: '#ef4444', WATER_FOAM: 'rgba(239, 68, 68, 0.2)',
       MOUNTAIN: '#2a0a0a', MOUNTAIN_SHADOW: '#000', MOUNTAIN_LIGHT: '#450a0a', MOUNTAIN_HIGHLIGHT: '#ef4444', MOUNTAIN_SIDE: '#2a0a0a', MOUNTAIN_TOP: '#450a0a',
       TREE_DARK: '#000', TREE_LIGHT: '#7f1d1d', TREE_TRUNK: '#2a0a0a',
       TINT: 'rgba(100, 0, 0, 0.3)' 
    }
  },
  [MapType.ICE_WORLD]: {
      [WeatherType.SUNNY]: {
          BG: '#f0f9ff', 
          GRASS_VARIANTS: ['#cbd5e1', '#d1d9e6', '#c4cbd9'],
          GRASS: '#cbd5e1', GRASS_SHADOW: '#94a3b8', GRASS_LIGHT: '#f1f5f9', 
          DIRT: '#64748b', DIRT_LIGHT: '#94a3b8', DIRT_SPEC: '#475569', PEBBLE: '#334155',
          LEAF_VARIANTS: ['#94a3b8'], FLOWER_VARIANTS: ['#e0f2fe'],
          WATER: '#bae6fd', WATER_SHORE: '#e0f2fe', WATER_DEEP: '#7dd3fc', WATER_LIGHT: '#e0f2fe', WATER_FOAM: 'rgba(255,255,255,0.5)',
          MOUNTAIN: '#475569', MOUNTAIN_SHADOW: '#334155', MOUNTAIN_LIGHT: '#64748b', MOUNTAIN_HIGHLIGHT: '#ffffff', MOUNTAIN_SIDE: '#475569', MOUNTAIN_TOP: '#f8fafc',
          TREE_DARK: '#1e293b', TREE_LIGHT: '#cbd5e1', TREE_TRUNK: '#475569',
          TINT: 'rgba(255, 255, 255, 0.0)'
      },
       [WeatherType.RAIN]: { 
           BG: '#e2e8f0', 
           GRASS_VARIANTS: ['#94a3b8', '#99aabf', '#8f9db0'],
           GRASS: '#94a3b8', GRASS_SHADOW: '#64748b', GRASS_LIGHT: '#cbd5e1', DIRT_SPEC: '#334155', PEBBLE: '#1e293b',
           DIRT: '#475569', DIRT_LIGHT: '#64748b',
           LEAF_VARIANTS: ['#64748b'], FLOWER_VARIANTS: ['#bae6fd'],
           WATER: '#7dd3fc', WATER_SHORE: '#bae6fd', WATER_DEEP: '#38bdf8', WATER_LIGHT: '#bae6fd', WATER_FOAM: 'rgba(255,255,255,0.4)',
           MOUNTAIN: '#1e293b', MOUNTAIN_SHADOW: '#0f172a', MOUNTAIN_LIGHT: '#334155', MOUNTAIN_HIGHLIGHT: '#cbd5e1', MOUNTAIN_SIDE: '#1e293b', MOUNTAIN_TOP: '#334155',
           TREE_DARK: '#0f172a', TREE_LIGHT: '#94a3b8', TREE_TRUNK: '#1e293b',
           TINT: 'rgba(200, 220, 255, 0.1)' 
        },
       [WeatherType.NEON_NIGHT]: { 
           BG: '#020617', 
           GRASS_VARIANTS: ['#0f172a', '#11192e'],
           GRASS: '#0f172a', GRASS_SHADOW: '#020617', GRASS_LIGHT: '#1e293b', DIRT_SPEC: '#000', PEBBLE: '#000',
           DIRT: '#334155', DIRT_LIGHT: '#475569',
           LEAF_VARIANTS: ['#1e1b4b'], FLOWER_VARIANTS: ['#172554'],
           WATER: '#1d4ed8', WATER_SHORE: '#3b82f6', WATER_DEEP: '#172554', WATER_LIGHT: '#3b82f6', WATER_FOAM: 'rgba(59, 130, 246, 0.2)',
           MOUNTAIN: '#020617', MOUNTAIN_SHADOW: '#000', MOUNTAIN_LIGHT: '#1e293b', MOUNTAIN_HIGHLIGHT: '#374151', MOUNTAIN_SIDE: '#020617', MOUNTAIN_TOP: '#1e3a8a',
           TREE_DARK: '#000000', TREE_LIGHT: '#1e3a8a', TREE_TRUNK: '#020617',
           TINT: 'rgba(2, 6, 23, 0.4)' 
        },
      [WeatherType.BLOOD_MOON]: {
           BG: '#2a0a0a', 
           GRASS_VARIANTS: ['#450a0a', '#5c1010'],
           GRASS: '#450a0a', GRASS_SHADOW: '#1a0505', GRASS_LIGHT: '#5c1010', DIRT_SPEC: '#000', PEBBLE: '#000',
           DIRT: '#2a0a0a', DIRT_LIGHT: '#450a0a',
           LEAF_VARIANTS: ['#7f1d1d'], FLOWER_VARIANTS: ['#ef4444'],
           WATER: '#450a0a', WATER_SHORE: '#7f1d1d', WATER_DEEP: '#2a0a0a', WATER_LIGHT: '#7f1d1d', WATER_FOAM: 'rgba(239, 68, 68, 0.4)',
           MOUNTAIN: '#1a0505', MOUNTAIN_SHADOW: '#000', MOUNTAIN_LIGHT: '#450a0a', MOUNTAIN_HIGHLIGHT: '#ef4444', MOUNTAIN_SIDE: '#1a0505', MOUNTAIN_TOP: '#450a0a',
           TREE_DARK: '#000', TREE_LIGHT: '#7f1d1d', TREE_TRUNK: '#1a0505',
           TINT: 'rgba(100, 0, 0, 0.4)' 
      }
  }
};