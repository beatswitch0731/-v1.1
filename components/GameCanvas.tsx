
import React, { useRef, useEffect, useState } from 'react';
import { TILE_SIZE, CLASS_STATS, MAP_WIDTH, MAP_HEIGHT, INTERNAL_WIDTH, INTERNAL_HEIGHT, MAP_PALETTES, SPRITE_PALETTES, ALL_UPGRADES, IAIDO_CHARGE_FRAMES, GUNNER_EVOLUTIONS, SAMURAI_EVOLUTIONS } from '../constants';
import { Vector2, TileType, Entity, CharacterClass, GameState, WeatherType, FloatingText, ItemType, MapType, Upgrade, Decoration, DecorationType, ShrineType, BossType, PropType } from '../types';
import { ChevronsUp, Settings, Volume2, VolumeX, Music, Zap, X, Disc, SkipForward, SkipBack, Anchor } from 'lucide-react';
import { audioManager } from '../services/audioSystem';
import NewAudioManager from '../services/AudioManager'; 
import UpgradeModal from './UpgradeModal';
import { generateMapData } from '../systems/mapSystem';
import { SpatialHash } from '../systems/spatialHash';
import * as RenderSystem from '../systems/renderSystem';
import * as CombatSystem from '../systems/combatSystem';
import { handleWindEndures } from '../systems/combatSystem';
import UIOverlay from './UIOverlay'; 

// New Systems
import { useGameInput } from '../hooks/useGameInput';
import * as PhysicsSystem from '../systems/physicsSystem';
import * as EnemySystem from '../systems/enemySystem';
import * as LootSystem from '../systems/lootSystem';
import * as BossSystem from '../systems/boss/bossSystem';
import * as EventSystem from '../systems/eventSystem'; // Import Event System
import { getBossForMap } from '../data/bosses/bossData';

interface GameCanvasProps {
  characterClass: CharacterClass;
  weather: WeatherType;
  isPaused: boolean;
  onTogglePause: () => void;
  onGameOver: (score: number) => void;
  onStatsUpdate: (stats: GameState) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  bgmVolume: number;
  onSetBgmVolume: (v: number) => void;
  sfxVolume: number;
  onSetSfxVolume: (v: number) => void;
  bgmSource: 'INTERNAL' | 'EXTERNAL';
  onSetBgmSource: (source: 'INTERNAL' | 'EXTERNAL') => void;
  currentTrackName: string;
  onNextTrack: () => void;
  onPrevTrack: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    characterClass, weather, isPaused, onTogglePause, onGameOver, onStatsUpdate,
    isMuted, onToggleMute, bgmVolume, onSetBgmVolume, sfxVolume, onSetSfxVolume,
    bgmSource, onSetBgmSource,
    currentTrackName, onNextTrack, onPrevTrack
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelUpOptions, setLevelUpOptions] = useState<Upgrade[] | null>(null);
  const [evolutionOptions, setEvolutionOptions] = useState<Upgrade[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [playerAmmo, setPlayerAmmo] = useState<number>(14);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  
  // Transition State
  const [transition, setTransition] = useState<{ active: boolean, opacity: number, text: string }>({ active: false, opacity: 0, text: '' });
  const isTransitioningRef = useRef<boolean>(false);

  const statsRef = useRef<GameState>({
    isPlaying: true, isPaused: false, isGameOver: false, score: 0, wave: 1, enemiesKilled: 0, timeElapsed: 0, level: 1, xp: 0, xpToNextLevel: 100, weather: weather, playerHp: CLASS_STATS[characterClass].maxHp, playerMaxHp: CLASS_STATS[characterClass].maxHp, activeCooldowns: {0:0, 1:0, 2:0, 3:0}, currentDamage: CLASS_STATS[characterClass].damage, currentMapType: MapType.GRASSLAND, bossHp: 0, bossMaxHp: 0, dashCooldownPct: 100, activeEvent: null
  });

  const playerRef = useRef<Entity>({
    id: 'player', type: 'player', pos: { x: MAP_WIDTH * TILE_SIZE / 2, y: MAP_HEIGHT * TILE_SIZE / 2 }, velocity: { x: 0, y: 0 }, radius: 20, color: CLASS_STATS[characterClass].color, hp: CLASS_STATS[characterClass].maxHp, maxHp: CLASS_STATS[characterClass].maxHp, animFrame: 0, hitFlash: 0, attackAnim: 0, maxAttackAnim: 0, chargeTimer: 0, cooldowns: {}, buffs: {}, vampiricCharges: 0, facing: 1, onBoat: false, dashTimer: 0, dashCooldownTimer: 0, maxDashTimer: 10, dashDir: {x:0, y:0}, stationaryTimer: 0, isIaidoCharged: false, footstepTimer: 0, funnelCooldowns: [], 
    modifiers: { 
        damageMult: 1.0, fireRateMult: 1.0, speedMult: 1.0, rangeMult: 1.0, maxHpMult: 1.0, extraProjectiles: 0, blockChance: 0, executionThreshold: 0, funnelCount: 0, funnelFireRateMult: 1.0, funnelElectricChance: 0, funnelBurnChance: 0, knockbackMult: 1.0, ricochetCount: 0,
        iaidoMultiplier: 0
    },
    ammo: 14, maxAmmo: 14, reloading: false, reloadTimer: 0, quickDrawStacks: 0, quickReloadBuffTimer: 0
  });

  // Entities & World
  const boatRef = useRef<Entity | null>(null);
  const portalRef = useRef<Entity | null>(null);
  const enemiesRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Entity[]>([]);
  const itemsRef = useRef<Entity[]>([]);
  const decorationsRef = useRef<Entity[]>([]);
  const shrinesRef = useRef<Entity[]>([]);
  const propsRef = useRef<Entity[]>([]); // NEW: Interactive props
  const textsRef = useRef<FloatingText[]>([]);
  
  // World Details
  const weatherParticlesRef = useRef<{x: number, y: number, speed: number, len: number, offset: number}[]>([]);
  const puddlesRef = useRef<{x: number, y: number, w: number, h: number}[]>([]);
  const ripplesRef = useRef<{x: number, y: number, r: number, maxR: number, life: number}[]>([]); 
  const lightShaftsRef = useRef<{x: number, width: number, alpha: number, speed: number}[]>([]);
  const groundDecorationsRef = useRef<Decoration[][]>([]);
  const mapRef = useRef<TileType[][]>([]);
  const mapSeedsRef = useRef<number[][]>([]);

  const spatialHashRef = useRef<SpatialHash>(new SpatialHash(200));

  // Loop State
  const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
  const shakeRef = useRef<number>(0); 
  const lastTimeRef = useRef<number>(Date.now());
  const passiveXpTimerRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const lastEnemySpawnTimeRef = useRef<number>(0);
  const timeRef = useRef<number>(0); 
  const skill2HoldTimeRef = useRef<number>(0);
  const wasSkill2HeldRef = useRef<boolean>(false);
  const swordOrbitProgressRef = useRef<number>(0);

  // Audio Init
  useEffect(() => {
    NewAudioManager.init();
    NewAudioManager.setSfxVolume(sfxVolume);
    NewAudioManager.setBgmVolume(bgmVolume);
    return () => { NewAudioManager.stopBGM(); };
  }, []);

  useEffect(() => { if (bgmSource === 'INTERNAL') NewAudioManager.startSunflowerBGM(); else NewAudioManager.stopBGM(); }, [bgmSource]);
  useEffect(() => { NewAudioManager.setMuted(isMuted); }, [isMuted]);
  useEffect(() => { NewAudioManager.setSfxVolume(sfxVolume); }, [sfxVolume]);
  useEffect(() => { NewAudioManager.setBgmVolume(bgmVolume); }, [bgmVolume]);

  // --- HELPERS ---
  const addFloatingText = (text: string, x: number, y: number, color: string, scale: number = 1) => {
      textsRef.current.push({ id: Math.random().toString(), text, x, y, color, life: 90, maxLife: 90, velocity: { x: (Math.random() - 0.5) * 1, y: -1.5 - Math.random() * scale } });
  };
  const triggerShake = (intensity: number, duration: number) => { shakeRef.current = Math.max(shakeRef.current, intensity); };
  
  const spawnDeathParticles = (pos: Vector2, color: string, radius: number, isBoss: boolean = false) => {
      // Impact Burst
      particlesRef.current.push({
          id: Math.random().toString(), type: 'particle', particleType: 'SHOCKWAVE',
          pos: { ...pos }, velocity: {x:0, y:0}, radius: 1, color: color, hp: 0, maxHp: 0, duration: isBoss ? 40 : 20, maxDuration: isBoss ? 40 : 20
      });
      // Debris
      const count = isBoss ? 30 : 10; const speed = isBoss ? 12 : 6;
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2; const dist = Math.random() * speed;
          particlesRef.current.push({
              id: Math.random().toString(), type: 'particle', particleType: 'DEBRIS',
              pos: { x: pos.x + (Math.random()-0.5)*radius, y: pos.y + (Math.random()-0.5)*radius },
              velocity: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }, radius: Math.random() * (radius * 0.4) + 2, color: color, hp: 0, maxHp: 0, duration: 30 + Math.random() * 20, rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.5
          });
      }
      
      if (isBoss) {
          BossSystem.spawnBossReward(pos, shrinesRef.current);
          addFloatingText("BOSS 已被击败!", pos.x, pos.y - 150, '#facc15', 4.0);
          statsRef.current.weather = WeatherType.SUNNY; // Reset weather
      }
  };

  const spawnParticle = (pos: Vector2, color: string, count: number, speed: number, size: number = 3) => {
    for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const vel = Math.random() * speed; particlesRef.current.push({ id: Math.random().toString(), type: 'particle', pos: { ...pos }, velocity: { x: Math.cos(angle) * vel, y: Math.sin(angle) * vel }, radius: Math.random() * size + 1, color: color, hp: 0, maxHp: 0, duration: 20 + Math.random() * 20, maxDuration: 40 }); }
  };

  const initWeatherParticles = () => {
    weatherParticlesRef.current = []; lightShaftsRef.current = [];
    if (weather === WeatherType.RAIN) { for(let i=0; i<300; i++) weatherParticlesRef.current.push({ x: Math.random() * INTERNAL_WIDTH, y: Math.random() * INTERNAL_HEIGHT, speed: 25 + Math.random() * 10, len: 20 + Math.random() * 10, offset: Math.random() * 100 }); }
    else if (weather === WeatherType.NEON_NIGHT) { for(let i=0; i<60; i++) weatherParticlesRef.current.push({ x: Math.random() * INTERNAL_WIDTH, y: Math.random() * INTERNAL_HEIGHT, speed: 0.2 + Math.random() * 0.4, len: 2, offset: Math.random() * 100 }); }
    else if (weather === WeatherType.SUNNY) { for(let i=0; i<8; i++) lightShaftsRef.current.push({ x: Math.random() * INTERNAL_WIDTH, width: 80 + Math.random() * 150, alpha: 0.1 + Math.random() * 0.15, speed: 0.05 + Math.random() * 0.1 }); }
  };

  const generateMap = (mapType: MapType) => {
    const data = generateMapData(mapType, weather);
    mapRef.current = data.map; mapSeedsRef.current = data.seeds; decorationsRef.current = data.trees; puddlesRef.current = data.puddles; groundDecorationsRef.current = data.groundDetails; shrinesRef.current = data.shrines; boatRef.current = data.boat; ripplesRef.current = []; 
    propsRef.current = data.props || []; // Load props
    initWeatherParticles();
  };

  // --- ACTIONS (PASSED TO INPUT HOOK) ---
  const handleTriggerSkill = (slot: number) => {
    const ctx: CombatSystem.CombatContext = { player: playerRef.current, enemies: enemiesRef.current, projectiles: projectilesRef.current, particles: particlesRef.current, props: propsRef.current, stats: statsRef.current, mouse: mouseRef.current, mouseRef, camera: cameraRef.current, audioManager, addFloatingText, triggerShake, lastShotTime: lastShotTimeRef.current, setLastShotTime: (t) => lastShotTimeRef.current = t };
    CombatSystem.triggerSkill(ctx, slot, characterClass);
  };

  const handleTriggerDash = () => {
      const player = playerRef.current; 
      if (player.dashCooldownTimer && player.dashCooldownTimer > 0) return; 
      if (player.dashTimer && player.dashTimer > 0) return;
      
      const dashSpeed = 15; 
      let dirX = 0; let dirY = 0; 
      if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) dirY -= 1; 
      if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) dirY += 1; 
      if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) dirX -= 1; 
      if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) dirX += 1;
      
      if (dirX === 0 && dirY === 0) dirX = player.facing || 1; 
      else { const len = Math.sqrt(dirX*dirX + dirY*dirY); dirX /= len; dirY /= len; }
      
      player.dashTimer = player.maxDashTimer; 
      player.dashCooldownTimer = 45; 
      player.dashDir = { x: dirX * dashSpeed, y: dirY * dashSpeed }; 
      audioManager.playDash(); 
      spawnParticle(player.pos, '#fff', 5, 2);
      
      if (characterClass === CharacterClass.SAMURAI && player.modifiers?.thunderDash) {
          projectilesRef.current.push({
              id: Math.random().toString(), type: 'projectile', projectileType: 'EXPLOSIVE',
              pos: { ...player.pos }, velocity: {x:0,y:0}, radius: 80, color: '#bae6fd', 
              hp: 1, maxHp: 1, damage: statsRef.current.currentDamage * 3.0, duration: 40
          });
          particlesRef.current.push({
               id: Math.random().toString(), type: 'player', pos: { ...player.pos }, velocity: {x:0,y:0}, radius: player.radius, color: '#bae6fd', hp:0, maxHp:0, duration: 30, alpha: 0.8, facing: player.facing
          });
          addFloatingText("雷切!", player.pos.x, player.pos.y - 60, '#bae6fd', 1.5);
      }

      if (characterClass === CharacterClass.GUNNER) { if (player.upgradeCounts?.['quick_draw_prep']) { player.quickDrawStacks = 3; player.quickReloadBuffTimer = 3000; addFloatingText("速射准备!", player.pos.x, player.pos.y - 60, '#facc15', 1.2); } }
  };

  const handleInteract = () => {
    const player = playerRef.current;
    
    // Portal & Boat
    if (portalRef.current && Math.hypot(player.pos.x - portalRef.current.pos.x, player.pos.y - portalRef.current.pos.y) < 80) { 
        triggerShake(20, 30); audioManager.playPortal(); statsRef.current.currentMapType = MapType.ICE_WORLD; generateMap(MapType.ICE_WORLD); player.pos = { x: TILE_SIZE * 4, y: TILE_SIZE * 4 }; portalRef.current = null; enemiesRef.current = []; projectilesRef.current = []; addFloatingText("欢迎来到极寒废土", player.pos.x, player.pos.y - 50, '#bae6fd', 2); 
        return; 
    }
    if (boatRef.current && Math.hypot(player.pos.x - boatRef.current.pos.x, player.pos.y - boatRef.current.pos.y) < 60) { player.onBoat = !player.onBoat; addFloatingText(player.onBoat ? "已登船" : "已下船", player.pos.x, player.pos.y - 30, '#fff'); if(player.onBoat) player.pos = {...boatRef.current.pos}; else player.pos.y += 40; return; }
    
    // Props Interaction (Chests)
    const interactablePropIndex = propsRef.current.findIndex(p => p.propType === PropType.CHEST && p.propActive && Math.hypot(player.pos.x - p.pos.x, player.pos.y - p.pos.y) < 50);
    if (interactablePropIndex !== -1) {
        const chest = propsRef.current[interactablePropIndex];
        chest.propActive = false; // Disable interaction
        audioManager.playUpgradeSelect();
        
        // Spawn Loot
        for(let i=0; i<5; i++) {
            LootSystem.spawnItem(itemsRef.current, {x: chest.pos.x + (Math.random()-0.5)*30, y: chest.pos.y + (Math.random()-0.5)*30});
        }
        addFloatingText("宝藏!", chest.pos.x, chest.pos.y - 40, '#facc15', 1.5);
        spawnParticle(chest.pos, '#facc15', 20, 5);
        propsRef.current.splice(interactablePropIndex, 1);
        return;
    }

    // Boss Altar
    const tileX = Math.floor(player.pos.x / TILE_SIZE);
    const tileY = Math.floor(player.pos.y / TILE_SIZE);
    for(let oy = -1; oy <= 1; oy++) {
        for(let ox = -1; ox <= 1; ox++) {
            const tx = tileX + ox;
            const ty = tileY + oy;
            if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                const decor = groundDecorationsRef.current[ty][tx];
                if (decor && decor.type === DecorationType.BOSS_ALTAR && decor.active !== false) {
                     const bossType = getBossForMap(statsRef.current.currentMapType);
                     decor.active = false; // Disable Altar
                     BossSystem.spawnBoss(bossType, {x: tx * TILE_SIZE + TILE_SIZE/2, y: ty * TILE_SIZE + TILE_SIZE/2}, enemiesRef.current, statsRef.current, triggerShake, addFloatingText, audioManager);
                     return;
                }
            }
        }
    }

    // Shrines
    const nearbyShrine = shrinesRef.current.find(s => !s.shrineUsed && Math.hypot(player.pos.x - s.pos.x, player.pos.y - s.pos.y) < 60);
    if (nearbyShrine) {
        nearbyShrine.shrineUsed = true; audioManager.playUpgradeSelect(); triggerShake(10, 10); spawnParticle(nearbyShrine.pos, nearbyShrine.color, 30, 8);
        if (nearbyShrine.shrineType === ShrineType.LEGENDARY) {
            if (!player.modifiers) player.modifiers = { damageMult: 1 } as any;
            player.modifiers!.damageMult += 0.3;
            player.modifiers!.maxHpMult += 0.3;
            player.maxHp *= 1.3;
            player.hp = player.maxHp;
            addFloatingText("传说之力: 全属性大幅提升!", player.pos.x, player.pos.y - 60, '#facc15', 3);
        }
        else if (nearbyShrine.shrineType === ShrineType.HEAL) { player.hp = player.maxHp; statsRef.current.playerHp = player.hp; addFloatingText("完全恢复!", player.pos.x, player.pos.y - 50, '#22c55e', 2); } 
        else if (nearbyShrine.shrineType === ShrineType.BLOOD) { const dmg = player.maxHp * 0.2; player.hp = Math.max(1, player.hp - dmg); statsRef.current.playerHp = player.hp; if (!player.modifiers) player.modifiers = { damageMult: 1 } as any; player.modifiers!.damageMult += 0.15; addFloatingText("鲜血祭祀: 伤害 +15%", player.pos.x, player.pos.y - 50, '#ef4444', 2); } 
        else { const r = Math.random(); if (r < 0.4) { statsRef.current.xp += 300; addFloatingText("意外之财! +300 XP", player.pos.x, player.pos.y - 50, '#facc15', 2); } else if (r < 0.7) { EnemySystem.spawnEnemy(enemiesRef.current, player, statsRef.current, 0, Date.now()); EnemySystem.spawnEnemy(enemiesRef.current, player, statsRef.current, 0, Date.now()); addFloatingText("陷阱!", player.pos.x, player.pos.y - 50, '#ef4444', 2); } else { if (!player.modifiers) player.modifiers = { speedMult: 1 } as any; player.modifiers!.speedMult += 0.2; addFloatingText("神速之力!", player.pos.x, player.pos.y - 50, '#bae6fd', 2); } }
    }
  };

  // --- USE HOOKS ---
  const { keysRef, mouseRef } = useGameInput(
    canvasRef, isPaused, levelUpOptions, evolutionOptions, onTogglePause, characterClass, playerRef,
    addFloatingText, audioManager, handleTriggerSkill, handleTriggerDash, handleInteract, cameraRef
  );

  const triggerLevelUp = () => {
      audioManager.playLevelUp(); statsRef.current.isPaused = true; 
      const availableUpgrades = ALL_UPGRADES.filter(u => {
          if (u.maxStacks) { const currentCount = playerRef.current.upgradeCounts?.[u.id] || 0; if (currentCount >= u.maxStacks) return false; }
          if (u.classSpecific && u.classSpecific !== characterClass) return false;
          if (u.prerequisite) {
              const hasPrereq = (playerRef.current.upgradeCounts?.[u.prerequisite] || 0) > 0;
              if (!hasPrereq) return false;
          }
          return true;
      });
      setLevelUpOptions([...availableUpgrades].sort(() => 0.5 - Math.random()).slice(0, 3));
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
      NewAudioManager.playUiSelect(); 
      const p = playerRef.current;
      if (p.modifiers) {
          upgrade.apply(p.modifiers); 
          if (!p.upgradeCounts) p.upgradeCounts = {}; 
          p.upgradeCounts[upgrade.id] = (p.upgradeCounts[upgrade.id] || 0) + 1;
          if (upgrade.stat === 'maxHp' || upgrade.id === 'hp_boost') { 
              const baseMaxHp = CLASS_STATS[characterClass].maxHp * (1 + (statsRef.current.level * 0.1)); 
              p.maxHp = baseMaxHp * p.modifiers.maxHpMult; 
              p.hp = p.maxHp; 
              statsRef.current.playerMaxHp = p.maxHp; 
              statsRef.current.playerHp = p.hp; 
              addFloatingText("最大生命值提升!", p.pos.x, p.pos.y - 60, '#22c55e', 2); 
          }
      }
      const newLevel = statsRef.current.level + 1;
      statsRef.current.level = newLevel; 
      statsRef.current.xp = 0; 
      statsRef.current.xpToNextLevel = Math.floor(statsRef.current.xpToNextLevel * 1.4);
      if (upgrade.id !== 'hp_boost') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2); statsRef.current.playerHp = p.hp; }
      
      setLevelUpOptions(null); 
      if (newLevel % 2 === 0) {
          const currentUpgrades = p.upgradeCounts || {};
          let availableEvolutions: Upgrade[] = [];
          if (characterClass === CharacterClass.GUNNER) availableEvolutions = GUNNER_EVOLUTIONS.filter(u => !currentUpgrades[u.id]);
          else if (characterClass === CharacterClass.SAMURAI) availableEvolutions = SAMURAI_EVOLUTIONS.filter(u => !currentUpgrades[u.id]);
          if (availableEvolutions.length > 0) { setEvolutionOptions(availableEvolutions); return; }
      }
      statsRef.current.isPaused = false;
  };

  const handleSelectEvolution = (upgrade: Upgrade) => {
      NewAudioManager.playUpgradeSelect();
      const p = playerRef.current;
      if (p.modifiers) {
          upgrade.apply(p.modifiers);
          if (!p.upgradeCounts) p.upgradeCounts = {};
          p.upgradeCounts[upgrade.id] = 1;
      }
      addFloatingText("技能进化!", p.pos.x, p.pos.y - 80, '#facc15', 2.5);
      setEvolutionOptions(null);
      statsRef.current.isPaused = false;
  };

  // --- TRANSITION LOGIC ---
  const performMapTransition = (newMapType: MapType, playerPos: Vector2) => {
      const destName = newMapType === MapType.ICE_WORLD ? "极寒海域 (Frozen Seas)" : "无尽草原 (Endless Plains)";
      isTransitioningRef.current = true;
      setTransition({ active: true, opacity: 0, text: `正在前往: ${destName}` });
      
      // 1. Fade Out
      setTimeout(() => setTransition(prev => ({ ...prev, opacity: 1 })), 50);
      audioManager.playChargeReady(); // Wind/Travel Sound

      // 2. Switch (Hidden)
      setTimeout(() => {
          statsRef.current.currentMapType = newMapType;
          generateMap(newMapType);
          
          enemiesRef.current = [];
          projectilesRef.current = [];
          itemsRef.current = [];
          propsRef.current = [];
          
          // Teleport Player to opposite side
          if (playerPos.x < 0) playerRef.current.pos.x = MAP_WIDTH * TILE_SIZE - TILE_SIZE * 2;
          else if (playerPos.x > MAP_WIDTH * TILE_SIZE) playerRef.current.pos.x = TILE_SIZE * 2;
          if (playerPos.y < 0) playerRef.current.pos.y = MAP_HEIGHT * TILE_SIZE - TILE_SIZE * 2;
          else if (playerPos.y > MAP_HEIGHT * TILE_SIZE) playerRef.current.pos.y = TILE_SIZE * 2;
          
          boatRef.current = {
                id: 'boat', type: 'boat',
                pos: { ...playerRef.current.pos },
                velocity: {x:0, y:0}, radius: 30, color: '#8b4513', hp: 999, maxHp: 999,
                rotation: playerRef.current.rotation
          };

          // 3. Fade In
          setTimeout(() => {
              setTransition(prev => ({ ...prev, opacity: 0 }));
              setTimeout(() => {
                  setTransition(prev => ({ ...prev, active: false }));
                  isTransitioningRef.current = false;
              }, 1000);
          }, 500);

      }, 1500); // Wait for full fade out
  };

  // Initial Map
  useEffect(() => { generateMap(MapType.GRASSLAND); lastTimeRef.current = Date.now(); }, [characterClass, isPaused, levelUpOptions, evolutionOptions]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) return; canvas.width = INTERNAL_WIDTH; canvas.height = INTERNAL_HEIGHT; let animationFrameId: number; lastTimeRef.current = Date.now();

    const gameLoop = () => {
        const now = Date.now(); 
        
        // Ensure loop keeps running to handle transitions
        animationFrameId = requestAnimationFrame(gameLoop);

        // Pause Check
        if (statsRef.current.isGameOver) return; 
        if (isPaused || statsRef.current.isPaused) return;
        
        // Transition Check (Pause Logic Updates)
        if (isTransitioningRef.current) return;

        const rawDelta = now - lastTimeRef.current; lastTimeRef.current = now; const timeScale = Math.min(rawDelta / 16.667, 4.0);
        
        passiveXpTimerRef.current += rawDelta; if (passiveXpTimerRef.current >= 1000) { statsRef.current.xp += 1; passiveXpTimerRef.current = 0; const player = playerRef.current; const stats = CLASS_STATS[characterClass]; const mods = player.modifiers || { damageMult: 1 }; const dmgMult = (1 + (statsRef.current.level * 0.1)) * mods.damageMult; statsRef.current.currentDamage = stats.damage * dmgMult; }
        timeRef.current += timeScale; const currentPalette = MAP_PALETTES[statsRef.current.currentMapType][statsRef.current.weather];
        if(shakeRef.current > 0) shakeRef.current *= Math.pow(0.9, timeScale); const shakeX = (Math.random() - 0.5) * shakeRef.current; const shakeY = (Math.random() - 0.5) * shakeRef.current;
        
        spatialHashRef.current.clear(); for (const enemy of enemiesRef.current) { spatialHashRef.current.insert(enemy); }

        const combatCtx: CombatSystem.CombatContext = { player: playerRef.current, enemies: enemiesRef.current, projectiles: projectilesRef.current, particles: particlesRef.current, props: propsRef.current, stats: statsRef.current, mouse: mouseRef.current, mouseRef: mouseRef, camera: cameraRef.current, audioManager, addFloatingText, triggerShake, lastShotTime: lastShotTimeRef.current, setLastShotTime: (t) => lastShotTimeRef.current = t };
        CombatSystem.updateFunnels(combatCtx, now, characterClass);
        CombatSystem.updateElementalSwords(combatCtx, now); 
        
        // --- RANDOM EVENTS UPDATE ---
        EventSystem.updateEvents(statsRef.current, playerRef.current, enemiesRef.current, itemsRef.current, propsRef.current, timeScale, audioManager, addFloatingText, triggerShake);

        // --- BOAT MAP TRANSITION CHECK ---
        const player = playerRef.current;
        if (player.onBoat && !isTransitioningRef.current) {
            const margin = TILE_SIZE; 
            if (player.pos.x < -margin || player.pos.x > MAP_WIDTH * TILE_SIZE + margin || player.pos.y < -margin || player.pos.y > MAP_HEIGHT * TILE_SIZE + margin) {
                const newMap = statsRef.current.currentMapType === MapType.GRASSLAND ? MapType.ICE_WORLD : MapType.GRASSLAND;
                performMapTransition(newMap, player.pos);
            }
        }

        // --- SAMURAI SKILL 2 HOLD ---
        if (characterClass === CharacterClass.SAMURAI) {
            const isHoldingSkill2 = keysRef.current.has('Digit2');
            const activeSwords = projectilesRef.current.filter(p => p.projectileType === 'SPIRIT_SWORD' && p.element);
            
            if (isHoldingSkill2) {
                if (activeSwords.length === 0) CombatSystem.triggerSkill(combatCtx, 1, characterClass);
                else {
                     skill2HoldTimeRef.current += rawDelta;
                     playerRef.current.isSkill2Charging = true;
                     wasSkill2HeldRef.current = true;
                     const chargeProgress = Math.min(1.0, skill2HoldTimeRef.current / 3000);
                     const targetSpd = 0.08 * (0.6 + chargeProgress); 
                     activeSwords.forEach(s => { s.isCharging = true; s.orbitSpeed = targetSpd; s.attackSpeedMult = 1.0 + chargeProgress * 2.0; });
                     if (chargeProgress >= 1.0) { triggerShake(2, 2); if (Math.random() > 0.8) spawnParticle(playerRef.current.pos, '#bae6fd', 1, 5, 2); }
                     NewAudioManager.startChargeHum();
                }
            } else {
                if (wasSkill2HeldRef.current) {
                    wasSkill2HeldRef.current = false;
                    playerRef.current.isSkill2Charging = false;
                    NewAudioManager.stopChargeHum();
                    const s2Skill = CLASS_STATS[CharacterClass.SAMURAI].skills[1];
                    if (!playerRef.current.cooldowns) playerRef.current.cooldowns = {};
                    playerRef.current.cooldowns[s2Skill.id] = now + s2Skill.cooldown;
                    activeSwords.forEach(s => { s.isCharging = false; });
                    skill2HoldTimeRef.current = 0;
                }
            }
        }

        let prompt = null;
        if (player.quickReloadBuffTimer && player.quickReloadBuffTimer > 0) { player.quickReloadBuffTimer -= rawDelta; }
        if (player.reloading && player.reloadTimer && player.reloadTimer > 0) { player.reloadTimer -= rawDelta; if (player.reloadTimer <= 0) { player.reloading = false; player.ammo = player.maxAmmo; addFloatingText("装弹完成!", player.pos.x, player.pos.y - 50, '#ffffff', 1.0); } }
        
        // --- INTERACTION PROMPTS ---
        if (portalRef.current && Math.hypot(player.pos.x - portalRef.current.pos.x, player.pos.y - portalRef.current.pos.y) < 80) prompt = "E: 进入传送门"; 
        else if (boatRef.current && Math.hypot(player.pos.x - boatRef.current.pos.x, player.pos.y - boatRef.current.pos.y) < 60) prompt = player.onBoat ? "E: 下船" : "E: 驾驶"; 
        else { 
            // Scan nearby tiles for Altar
            const tileX = Math.floor(player.pos.x / TILE_SIZE);
            const tileY = Math.floor(player.pos.y / TILE_SIZE);
            let altarFound = false;
            
            for(let oy = -1; oy <= 1; oy++) {
                for(let ox = -1; ox <= 1; ox++) {
                    const tx = tileX + ox; const ty = tileY + oy;
                    if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                        const decor = groundDecorationsRef.current[ty][tx];
                        if (decor && decor.type === DecorationType.BOSS_ALTAR && decor.active !== false) {
                            altarFound = true;
                        }
                    }
                }
            }

            if (altarFound) {
                prompt = "BOSS_TRIGGER"; // Special flag for render
            } else {
                // Props Check
                const nearbyProp = propsRef.current.find(p => p.propType === PropType.CHEST && p.propActive && Math.hypot(player.pos.x - p.pos.x, player.pos.y - p.pos.y) < 50);
                if (nearbyProp) {
                    prompt = "E: 打开补给箱";
                } else {
                    const s = shrinesRef.current.find(s => !s.shrineUsed && Math.hypot(player.pos.x - s.pos.x, player.pos.y - s.pos.y) < 60); 
                    if (s) { 
                        if (s.shrineType === ShrineType.BLOOD) prompt = "E: 鲜血祭祀 (HP <-> DMG)"; 
                        else if (s.shrineType === ShrineType.HEAL) prompt = "E: 治愈祷言"; 
                        else if (s.shrineType === ShrineType.LEGENDARY) prompt = "E: 拾取传说之力";
                        else prompt = "E: 触摸神龛"; 
                    }
                }
            }
        } 
        setInteractionPrompt(prompt);

        // --- BOSS LOGIC ---
        const boss = enemiesRef.current.find(e => e.enemyType?.startsWith('BOSS') || (e.bossType && e.bossType !== BossType.NONE)); if (boss) { statsRef.current.bossHp = boss.hp; statsRef.current.bossMaxHp = boss.maxHp; } else { statsRef.current.bossHp = 0; }
        
        if (player.dashCooldownTimer && player.dashCooldownTimer > 0) { player.dashCooldownTimer -= timeScale; }
        if (statsRef.current.weather === WeatherType.RAIN && Math.random() > 0.8) { const rx = Math.random() * MAP_WIDTH * TILE_SIZE; const ry = Math.random() * MAP_HEIGHT * TILE_SIZE; const tileX = Math.floor(rx/TILE_SIZE); const tileY = Math.floor(ry/TILE_SIZE); if (mapRef.current[tileY]?.[tileX] === TileType.WATER || puddlesRef.current.some(p => rx > p.x && rx < p.x + p.w && ry > p.y && ry < p.y + p.h)) { ripplesRef.current.push({x: rx, y: ry, r: 0, maxR: 5 + Math.random()*5, life: 20}); } }
        const pTileX = Math.floor(player.pos.x/TILE_SIZE); const pTileY = Math.floor(player.pos.y/TILE_SIZE); const inWater = mapRef.current[pTileY]?.[pTileX] === TileType.WATER; const inPuddle = !inWater && puddlesRef.current.some(p => player.pos.x > p.x && player.pos.x < p.x+p.w && player.pos.y > p.y && player.pos.y < p.y+p.h); if ((inWater || inPuddle) && (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1) && Math.floor(timeRef.current) % 5 === 0) { ripplesRef.current.push({x: player.pos.x, y: player.pos.y + 10, r: 0, maxR: 10, life: 30}); } 
        for (let i = ripplesRef.current.length - 1; i >= 0; i--) { const r = ripplesRef.current[i]; r.r += 0.2 * timeScale; r.life -= timeScale; if (r.life <= 0) ripplesRef.current.splice(i, 1); }

        if (characterClass === CharacterClass.SAMURAI && player.modifiers?.iaidoMultiplier) { if (!player.isIaidoCharged) { player.stationaryTimer = (player.stationaryTimer || 0) + timeScale; if (Math.floor(player.stationaryTimer) % 5 === 0) { const angle = Math.random() * Math.PI * 2; const r = 40; particlesRef.current.push({ id: Math.random().toString(), type: 'particle', pos: {x: player.pos.x + Math.cos(angle)*r, y: player.pos.y + Math.sin(angle)*r}, velocity: {x: -Math.cos(angle)*2, y: -Math.sin(angle)*2}, radius: 2, color: '#bae6fd', hp:0, maxHp:0, duration: 20 }); } if (player.stationaryTimer >= IAIDO_CHARGE_FRAMES) { player.isIaidoCharged = true; triggerShake(10, 5); spawnParticle(player.pos, '#bae6fd', 30, 8); addFloatingText("⚡ 居合准备 ⚡", player.pos.x, player.pos.y - 70, '#bae6fd', 1.5); audioManager.playChargeReady(); } } else { const currentLeaves = particlesRef.current.filter(p => p.particleType === 'LEAF' && p.leafType === 'ORBIT').length; if (currentLeaves < 12 && Math.floor(timeRef.current) % 5 === 0) { particlesRef.current.push({ id: Math.random().toString(), type: 'particle', particleType: 'LEAF', leafType: 'ORBIT', pos: {x: 0, y: 0}, velocity: {x:0, y:0}, radius: 4, color: '#22c55e', hp:0, maxHp:0, duration: 9999, orbitAngle: Math.random() * Math.PI * 2, orbitRadius: 40 + Math.random() * 20, orbitSpeed: 0.05 + Math.random() * 0.05 }); } } }
        if (player.chargeTimer && player.chargeTimer > 0) { player.chargeTimer -= timeScale; if (player.chargeTimer <= 0) { const damageMult = 1 + (statsRef.current.level * 0.1); const angle = Math.atan2(mouseRef.current.y + cameraRef.current.y - player.pos.y, mouseRef.current.x + cameraRef.current.x - player.pos.x); projectilesRef.current.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'DRAGON', owner: 'player', pos: { ...player.pos }, velocity: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }, radius: 200, color: '#10b981', hp: 999, maxHp: 999, damage: 300 * damageMult * 2.0, duration: 600 }); triggerShake(60, 60); } }
        
        // --- PHYSICS SYSTEM CALL ---
        PhysicsSystem.updatePlayerMovement(player, keysRef, mouseRef, cameraRef, mapRef.current, statsRef.current.currentMapType, decorationsRef.current, boatRef.current, puddlesRef.current, ripplesRef.current, timeRef.current, timeScale, projectilesRef.current, audioManager, CLASS_STATS[characterClass]);
        
        // Attack Animation decay
        if(player.attackAnim && player.attackAnim > 0) player.attackAnim -= timeScale;

        // Dash particle logic
        if (player.dashTimer && player.dashTimer > 0) {
            if (Math.floor(timeRef.current) % 3 === 0) {
                 if (characterClass === CharacterClass.GUNNER) { particlesRef.current.push({ id: Math.random().toString(), type: 'player', pos: { ...player.pos }, velocity: {x:0,y:0}, radius: player.radius, color: '#fff', hp: 0, maxHp: 0, duration: 12, alpha: 0.3, facing: player.facing, attackAnim: player.attackAnim }); spawnParticle({x: player.pos.x, y: player.pos.y + 10}, '#d6d3d1', 2, 1, 3); } 
                 else if (characterClass === CharacterClass.MAGE) { particlesRef.current.push({ id: Math.random().toString(), type: 'player', pos: { ...player.pos }, velocity: {x:0,y:0}, radius: player.radius, color: '#a855f7', hp: 0, maxHp: 0, duration: 12, alpha: 0.4, facing: player.facing }); } 
                 else { particlesRef.current.push({ id: Math.random().toString(), type: 'particle', pos: { ...player.pos }, velocity: {x:0,y:0}, radius: 20, color: '#fff', hp: 0, maxHp: 0, duration: 15, alpha: 0.5, particleType: 'SLASH' }); }
                 const nearby = spatialHashRef.current.query(player.pos, 50); nearby.forEach(e => { 
                     if (Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < 50) { 
                         const dmg = statsRef.current.currentDamage * 0.5; 
                         if (!e.hitFlash) { 
                             e.hp -= dmg; e.hitFlash = 10; addFloatingText(dmg.toFixed(0), e.pos.x, e.pos.y, '#fff', 0.8); 
                             if (characterClass === CharacterClass.SAMURAI) audioManager.playImpact();
                             handleWindEndures(player, e, statsRef.current, addFloatingText, particlesRef.current, audioManager);
                         } 
                     } 
                });
            }
        }

        const worldMouseX = mouseRef.current.x + cameraRef.current.x; if (worldMouseX < player.pos.x) player.facing = -1; else player.facing = 1; 
        if (keysRef.current.has('MOUSE_LEFT')) CombatSystem.fireWeapon(combatCtx, now, characterClass); 
        
        // --- ENEMY SPAWN ---
        lastEnemySpawnTimeRef.current = EnemySystem.spawnEnemy(enemiesRef.current, player, statsRef.current, lastEnemySpawnTimeRef.current, now);

        // --- BOSS UPDATE ---
        BossSystem.updateBosses(enemiesRef.current, player, projectilesRef.current, particlesRef.current, statsRef.current, audioManager, addFloatingText, triggerShake);

        // --- SWORD ORBITS ---
        const activeSwords = projectilesRef.current.filter(p => p.projectileType === 'SPIRIT_SWORD');
        if (activeSwords.length > 0) {
            const angleStep = (Math.PI * 2) / activeSwords.length;
            const leadSword = activeSwords[0];
            const currentSpeed = leadSword.orbitSpeed || 0.08;
            swordOrbitProgressRef.current += currentSpeed * timeScale;
            activeSwords.forEach((sword, i) => { (sword as any).targetOrbitAngle = swordOrbitProgressRef.current + i * angleStep; });
        }
        
        // --- PROJECTILES LOOP ---
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
             const p = projectilesRef.current[i];
             p.pos.x += p.velocity.x * timeScale; p.pos.y += p.velocity.y * timeScale;
             
             // --- PROP COLLISION (HOISTED) ---
             // Check for prop collision for ALL damaging projectiles before specific type logic
             if (p.damage && p.damage > 0 && p.owner !== 'enemy') {
                 for (let k = propsRef.current.length - 1; k >= 0; k--) {
                     const prop = propsRef.current[k];
                     if (prop.propType === PropType.BARREL && prop.propActive && Math.hypot(p.pos.x - prop.pos.x, p.pos.y - prop.pos.y) < prop.radius + p.radius) {
                         prop.propActive = false; // Exploded
                         
                         // Create huge explosion
                         projectilesRef.current.push({
                             id: Math.random().toString(), type: 'projectile', projectileType: 'EXPLOSIVE',
                             pos: { ...prop.pos }, velocity: {x:0,y:0}, radius: 100, color: '#f97316', 
                             hp: 1, maxHp: 1, damage: statsRef.current.currentDamage * 5.0, duration: 40
                         });
                         addFloatingText("BOOM!", prop.pos.x, prop.pos.y - 60, '#f97316', 2.5);
                         spawnParticle(prop.pos, '#f97316', 30, 8);
                         audioManager.playExplosion();
                         triggerShake(30, 20);
                         
                         // Remove barrel
                         propsRef.current.splice(k, 1);
                         
                         // Projectile destruction logic
                         if (!p.piercing && p.projectileType !== 'VOID_SLASH' && p.projectileType !== 'SLASH_WAVE') { 
                             p.hp = 0; // Mark for removal 
                             projectilesRef.current.splice(i, 1); 
                         }
                         break; // Hit one prop per frame per projectile max
                     }
                 }
                 if (p.hp <= 0 && !p.piercing && p.projectileType !== 'EXPLOSIVE') continue; // If destroyed by prop, skip
             }

             if (p.owner === 'enemy') {
                 if (p.duration) { p.duration -= timeScale; if(p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } }
                 const distToPlayer = Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y);
                 if (distToPlayer < p.radius + player.radius) { player.hp -= (p.damage || 10); statsRef.current.playerHp = player.hp; triggerShake(5, 5); spawnParticle(player.pos, '#ef4444', 5, 5); projectilesRef.current.splice(i, 1); }
                 continue; 
             }
             
             // ... Keep all other projectile types (ELEMENTAL_STAB, SLASH_WAVE, VOID_SLASH, etc.) ...
             if (p.projectileType === 'SPIRIT_SWORD') {
                 const isSamuraiIaido = characterClass === CharacterClass.SAMURAI && player.isIaidoCharged;
                 if (!isSamuraiIaido) { p.duration! -= timeScale; if (p.duration! <= 0) { projectilesRef.current.splice(i, 1); continue; } }
                 let target = null; let minDist = 500;
                 if (!p.isCharging) {
                     const nearby = spatialHashRef.current.query(p.pos, 500); const cam = cameraRef.current;
                     for (const e of nearby) {
                         if (e.type !== 'enemy' || e.deathTimer) continue;
                         const isVisible = e.pos.x > cam.x && e.pos.x < cam.x + INTERNAL_WIDTH && e.pos.y > cam.y && e.pos.y < cam.y + INTERNAL_HEIGHT;
                         if (!isVisible) continue;
                         const d = Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y);
                         if (d < minDist) { minDist = d; target = e; }
                     }
                 }
                 if (target) {
                     const angle = Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x);
                     const speed = 12; const inertia = 0.92;
                     p.velocity.x = p.velocity.x * inertia + Math.cos(angle) * speed * (1-inertia);
                     p.velocity.y = p.velocity.y * inertia + Math.sin(angle) * speed * (1-inertia);
                 } else {
                     const targetAngle = (p as any).targetOrbitAngle || 0;
                     let currentAngle = p.orbitAngle || targetAngle;
                     let angleDiff = targetAngle - currentAngle;
                     while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                     while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                     currentAngle += angleDiff * 0.2 * timeScale;
                     p.orbitAngle = currentAngle;
                     const r = p.orbitRadius || 150;
                     const destX = player.pos.x + Math.cos(p.orbitAngle) * r;
                     const destY = player.pos.y + Math.sin(p.orbitAngle) * r;
                     const dx = destX - p.pos.x; const dy = destY - p.pos.y;
                     p.velocity.x += dx * 0.1 * timeScale; p.velocity.y += dy * 0.1 * timeScale;
                     p.velocity.x *= 0.8; p.velocity.y *= 0.8;
                 }
                 p.rotation = Math.atan2(p.velocity.y, p.velocity.x) + Math.PI/2;
                 const nearbyEnemies = spatialHashRef.current.query(p.pos, p.radius + 30);
                 for (const e of nearbyEnemies) {
                     if (e.deathTimer || (e.hitFlash && e.hitFlash > 0)) continue;
                     if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < p.radius + e.radius) {
                         const contactDmg = p.damage! * 0.5; e.hp -= contactDmg; e.hitFlash = 12; 
                         addFloatingText(Math.floor(contactDmg).toString(), e.pos.x, e.pos.y - 20, p.color);
                         spawnParticle(e.pos, p.color, 3, 4);
                         const pushAngle = Math.atan2(e.pos.y - player.pos.y, e.pos.x - player.pos.x); e.velocity.x += Math.cos(pushAngle) * 5; e.velocity.y += Math.sin(pushAngle) * 5;
                         handleWindEndures(player, e, statsRef.current, addFloatingText, particlesRef.current, audioManager);
                     }
                 }
                 continue;
             }
             
             if (p.projectileType === 'ELEMENTAL_STAB') {
                 p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; }
                 const nearby = spatialHashRef.current.query(p.pos, p.radius + 30);
                 for (const e of nearby) {
                     if (e.deathTimer) continue; if (e.hitFlash && e.hitFlash > 0) continue; 
                     if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < p.radius + e.radius) {
                         let dmg = p.damage!;
                         if (p.element === 'METAL') { dmg *= 1.5; spawnParticle(e.pos, '#facc15', 8, 5); addFloatingText("CRIT!", e.pos.x, e.pos.y - 40, '#facc15', 1.5); } 
                         else if (p.element === 'WOOD') { player.hp = Math.min(player.maxHp, player.hp + 2); statsRef.current.playerHp = player.hp; addFloatingText("+2", player.pos.x, player.pos.y - 40, '#4ade80', 1.0); } 
                         else if (p.element === 'WATER') { e.velocity.x *= 0.2; e.velocity.y *= 0.2; addFloatingText("Slow", e.pos.x, e.pos.y - 40, '#38bdf8', 1.0); } 
                         else if (p.element === 'FIRE') { e.burnTimer = 180; addFloatingText("Burn", e.pos.x, e.pos.y - 40, '#ef4444', 1.0); } 
                         else if (p.element === 'EARTH') { e.stunTimer = 40; addFloatingText("Stun", e.pos.x, e.pos.y - 40, '#d97706', 1.0); const pushAngle = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x); e.velocity.x += Math.cos(pushAngle) * 20; e.velocity.y += Math.sin(pushAngle) * 20; }
                         e.hp -= dmg; e.hitFlash = 10; addFloatingText(Math.floor(dmg).toString(), e.pos.x, e.pos.y - 20, p.color);
                         handleWindEndures(player, e, statsRef.current, addFloatingText, particlesRef.current, audioManager);
                         projectilesRef.current.splice(i, 1); break; 
                     }
                 }
                 continue;
             }
             if (p.projectileType === 'SLASH_WAVE' || p.projectileType === 'VOID_SLASH') { 
                 p.duration! -= timeScale; 
                 if (p.projectileType === 'VOID_SLASH') { p.radius *= 1.02; } 
                 else { p.radius *= Math.pow(1.02, timeScale); const friction = Math.pow(0.95, timeScale); p.velocity.x *= friction; p.velocity.y *= friction; }
                 const nearbyEnemies = spatialHashRef.current.query(p.pos, p.radius);
                 for (const e of nearbyEnemies) { 
                     if (e.deathTimer) continue; 
                     if (p.projectileType === 'VOID_SLASH') { if (!p.hitList) p.hitList = []; if (p.hitList.includes(e.id)) continue; }
                     if (Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y) < p.radius + e.radius) {
                         if (p.projectileType === 'VOID_SLASH') p.hitList!.push(e.id); 
                         e.hp -= p.damage!; e.hitFlash = 5; addFloatingText(Math.floor(p.damage!).toString(), e.pos.x, e.pos.y - 20, '#aaa'); e.velocity.x += p.velocity.x * 0.5; e.velocity.y += p.velocity.y * 0.5; 
                         handleWindEndures(player, e, statsRef.current, addFloatingText, particlesRef.current, audioManager);
                     } 
                } 
                 if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } 
             }
             else if (p.projectileType === 'ELECTRO_LASSO_THROW') {
                 p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; }
                 const nearby = spatialHashRef.current.query(p.pos, p.radius + 30);
                 let hitEnemy = null; for (const e of nearby) { if (e.deathTimer) continue; if (Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y) < p.radius + e.radius) { hitEnemy = e; break; } }
                 if (hitEnemy) {
                     triggerShake(20, 20); audioManager.playLassoImpact(); addFloatingText("电磁场!", hitEnemy.pos.x, hitEnemy.pos.y - 40, '#06b6d4', 2.0);
                     hitEnemy.hp -= p.damage!; hitEnemy.hitFlash = 15; hitEnemy.stunTimer = 120; hitEnemy.stunType = 'ELECTRIC';
                     projectilesRef.current.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'MAGNETIC_FIELD', pos: { ...hitEnemy.pos }, velocity: {x:0, y:0}, radius: 200, color: '#06b6d4', hp: 1, maxHp: 1, damage: 0.5, duration: 120, owner: 'player', teslaDetonation: p.teslaDetonation });
                     projectilesRef.current.splice(i, 1); continue;
                 } continue;
             }
             else if (p.projectileType === 'MAGNETIC_FIELD') {
                 p.duration! -= timeScale;
                 if (p.duration <= 0) { 
                     if (p.teslaDetonation) {
                         projectilesRef.current.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'ELECTRO_BLAST', pos: {...p.pos}, velocity: {x:0,y:0}, radius: p.radius, color: '#a855f7', hp:1, maxHp:1, duration: 30 });
                         const blastDmg = statsRef.current.currentDamage * 1.8;
                         const victims = spatialHashRef.current.query(p.pos, p.radius);
                         victims.forEach(e => { if (e.deathTimer) return; if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < p.radius) { e.hp -= blastDmg; addFloatingText(blastDmg.toFixed(0), e.pos.x, e.pos.y - 40, '#a855f7', 2.0); e.stunTimer = 60; } });
                         triggerShake(20, 10); NewAudioManager.playWaterBalloonPop(); 
                     }
                     projectilesRef.current.splice(i, 1); continue; 
                 }
                 const nearby = spatialHashRef.current.query(p.pos, p.radius);
                 const hasTeslaUpgrade = player.modifiers?.lassoShock;
                 if (hasTeslaUpgrade && Math.random() > 0.92) { const rx = p.pos.x + (Math.random()-0.5) * p.radius * 1.5; const ry = p.pos.y + (Math.random()-0.5) * p.radius * 1.5; spawnParticle({x: rx, y: ry}, '#a855f7', 1, 0, 2); }
                 for (const e of nearby) {
                     if (e.deathTimer) continue; const dist = Math.hypot(p.pos.x - e.pos.x, p.pos.y - e.pos.y);
                     if (dist < p.radius && dist > 15) {
                         const angle = Math.atan2(p.pos.y - e.pos.y, p.pos.x - e.pos.x); const force = 1.2 * timeScale; e.velocity.x += Math.cos(angle) * force; e.velocity.y += Math.sin(angle) * force;
                         if (Math.random() > 0.95) { e.hp -= 2; addFloatingText("2", e.pos.x, e.pos.y, '#bae6fd', 0.8); }
                         if (hasTeslaUpgrade && Math.random() > 0.9) { const zapDmg = statsRef.current.currentDamage * 0.2; e.hp -= zapDmg; addFloatingText(zapDmg.toFixed(0), e.pos.x, e.pos.y - 20, '#a855f7', 1.0); }
                     }
                 } continue;
             }
             else if (p.projectileType === 'BEAM' || p.projectileType === 'SNIPER_HIT' || p.projectileType === 'HIGH_NOON_IMPACT' || p.projectileType === 'ELECTRO_BLAST') { 
                 p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } 
             }
             else if (p.projectileType === 'INK_PUDDLE') {
                 p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; }
                 const nearby = spatialHashRef.current.query(p.pos, p.radius);
                 if (Math.random() > 0.8) { spawnParticle({x: p.pos.x + (Math.random()-0.5)*p.radius*2, y: p.pos.y + (Math.random()-0.5)*p.radius*2}, '#000', 1, 0.2, 2); }
                 for(const e of nearby) {
                     if (e.deathTimer) continue;
                     if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < p.radius) { e.velocity.x *= 0.5; e.velocity.y *= 0.5; if (Math.random() > 0.9) { e.hp -= 5; addFloatingText("5", e.pos.x, e.pos.y, '#94a3b8', 0.8); } }
                 } continue;
             }
             else if (p.projectileType === 'VINE') { p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } if (Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y) < p.radius + player.radius) { player.hp -= 0.5 * timeScale; statsRef.current.playerHp = player.hp; if(Math.floor(timeRef.current) % 10 === 0) triggerShake(2, 2); } }
             else if (p.projectileType === 'BLIZZARD') { p.duration! -= timeScale; if (p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } if (Math.random() > 0.5) { const r = Math.random() * p.radius; const theta = Math.random() * Math.PI * 2; particlesRef.current.push({ id: Math.random().toString(), type: 'particle', pos: {x: p.pos.x + r * Math.cos(theta), y: p.pos.y + r * Math.sin(theta)}, velocity: {x: -2 + Math.random()*4, y: 2 + Math.random()*4}, radius: 2, color: '#e0f2fe', hp:0, maxHp:0, duration: 20 }); } }
             else if (p.projectileType === 'EXPLOSIVE') { 
                 p.duration! -= timeScale; const friction = Math.pow(0.9, timeScale); p.velocity.x *= friction; p.velocity.y *= friction; 
                 if (p.duration > 20) continue; 
                 const nearby = spatialHashRef.current.query(p.pos, p.radius + 10);
                 let impact = false; 
                 if (Math.hypot(p.velocity.x, p.velocity.y) < 0.1) { for (let e of nearby) { if (e.deathTimer) continue; if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < e.radius + p.radius) { impact = true; break; } } } else { for (let e of nearby) { if (e.deathTimer) continue; if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < e.radius + p.radius) { impact = true; break; } } }
                 if (p.duration <= 0 || impact) { 
                     spawnParticle(p.pos, '#f97316', 30, 10); spawnParticle(p.pos, '#fff', 15, 5); 
                     triggerShake(15, 10); audioManager.playExplosion(); 
                    const blastRadius = 120; const victims = spatialHashRef.current.query(p.pos, blastRadius);
                    victims.forEach(e => { if (Math.hypot(e.pos.x - p.pos.x, e.pos.y - p.pos.y) < blastRadius) { e.hp -= p.damage!; e.hitFlash = 10; addFloatingText(p.damage!.toFixed(0), e.pos.x, e.pos.y, '#f97316', 1.5); } }); projectilesRef.current.splice(i, 1); continue; } 
             }
             else {
                 if (p.duration) { p.duration -= timeScale; if(p.duration <= 0) { projectilesRef.current.splice(i, 1); continue; } }
                 if (p.damage && p.damage > 0) {
                    let hitEnemy = false;
                    const possibleTargets = spatialHashRef.current.query(p.pos, p.radius + 40); 
                    for (const e of possibleTargets) {
                        if (e.deathTimer && e.deathTimer > 0) continue;
                        if (p.piercing && e.hitFlash && e.hitFlash > 0) continue;
                        if (Math.abs(p.pos.x - e.pos.x) < e.radius + p.radius && Math.abs(p.pos.y - e.pos.y) < e.radius + p.radius) {
                            if (player.modifiers?.explosiveShots && Math.random() < 0.2) {
                                projectilesRef.current.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'EXPLOSIVE', pos: { ...e.pos }, velocity: { x:0, y:0 }, radius: 80, color: '#ef4444', hp: 1, maxHp: 1, damage: p.damage * 1.5, duration: 10 });
                                NewAudioManager.playCoinPing(); addFloatingText("BOOM!", e.pos.x, e.pos.y - 60, '#ef4444', 2.0); hitEnemy = true; break; 
                            }
                            e.hp -= p.damage; e.hitFlash = 8; 
                            const pSpeed = Math.hypot(p.velocity.x, p.velocity.y); 
                            let kbStrength = 8 * (player.modifiers?.knockbackMult || 1.0); if (e.enemyType === 'TANK' || e.enemyType?.startsWith('BOSS') || (e.bossType && e.bossType !== BossType.NONE)) kbStrength *= 0.2; if (e.isElite) kbStrength *= 0.5;
                            if (pSpeed > 0) { e.velocity.x = (p.velocity.x / pSpeed) * kbStrength; e.velocity.y = (p.velocity.y / pSpeed) * kbStrength; }
                            if (p.isFunnelShot) { if (player.modifiers?.funnelElectricChance && Math.random() < player.modifiers.funnelElectricChance) e.stunTimer = 60; if (player.modifiers?.funnelBurnChance && Math.random() < player.modifiers.funnelBurnChance) e.burnTimer = 180; }
                            if (p.isInferno) e.burnTimer = 120;
                            spawnParticle(e.pos, '#ffffff', 5, 4, 2); spawnParticle(e.pos, e.color || '#991b1b', 6, 3, 3);
                            addFloatingText(Math.floor(p.damage).toString(), e.pos.x, e.pos.y - 30, '#fff');
                            if (p.projectileType === 'FUNNEL_SHOT') audioManager.playElectricImpact(); else audioManager.playImpact();
                            hitEnemy = true;
                            handleWindEndures(player, e, statsRef.current, addFloatingText, particlesRef.current, audioManager);
                            if (p.ricochetsLeft && p.ricochetsLeft > 0) { p.ricochetsLeft--; let closest = null; let minD = 400; for (const other of enemiesRef.current) { if (other === e || other.deathTimer) continue; const d = Math.hypot(other.pos.x - e.pos.x, other.pos.y - e.pos.y); if (d < minD) { minD = d; closest = other; } } if (closest) { const angle = Math.atan2(closest.pos.y - e.pos.y, closest.pos.x - e.pos.x); p.velocity.x = Math.cos(angle) * 15; p.velocity.y = Math.sin(angle) * 15; p.pos.x = e.pos.x; p.pos.y = e.pos.y; p.duration = 40; hitEnemy = false; } }
                            if (p.piercing) { hitEnemy = false; }
                            if (hitEnemy && p.projectileType !== 'DRAGON' && p.projectileType !== 'TORNADO' && p.projectileType !== 'VOID_SLASH') { projectilesRef.current.splice(i, 1); break; }
                        }
                    }
                }
             }
        }
        
        // --- LOOT SYSTEM ---
        LootSystem.spawnItem(itemsRef.current, {x:0, y:0}); 
        LootSystem.updateItems(itemsRef.current, player, timeScale, statsRef.current, addFloatingText, audioManager, now);

        // --- ENEMY AI LOOP ---
        EnemySystem.updateEnemies(
            enemiesRef.current, player, timeScale, statsRef.current, projectilesRef.current, audioManager, addFloatingText,
            (pos) => LootSystem.spawnItem(itemsRef.current, pos),
            spawnDeathParticles,
            triggerShake,
            onGameOver
        );

        if (characterClass === CharacterClass.SAMURAI && player.isIaidoCharged) {
             const activeSwords = projectilesRef.current.filter(p => p.projectileType === 'SPIRIT_SWORD');
             if (activeSwords.length > 0) {
                 const s2Skill = CLASS_STATS[CharacterClass.SAMURAI].skills[1]; 
                 if (s2Skill) {
                     if (!player.cooldowns) player.cooldowns = {};
                     player.cooldowns[s2Skill.id] = now + s2Skill.cooldown;
                 }
             }
        }

        if (statsRef.current.xp >= statsRef.current.xpToNextLevel) { triggerLevelUp(); }

        // Render Logic (Keep in View)
        const targetCamX = player.pos.x - INTERNAL_WIDTH / 2; const targetCamY = player.pos.y - INTERNAL_HEIGHT / 2; cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1 * timeScale; cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1 * timeScale; cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, MAP_WIDTH * TILE_SIZE - INTERNAL_WIDTH)); cameraRef.current.y = Math.max(0, Math.min(cameraRef.current.y, MAP_HEIGHT * TILE_SIZE - INTERNAL_HEIGHT));
        ctx.fillStyle = currentPalette.BG; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (statsRef.current.currentMapType === MapType.ICE_WORLD && statsRef.current.weather === WeatherType.NEON_NIGHT) { RenderSystem.drawAurora(ctx, timeRef.current); }
        ctx.save(); ctx.translate(-Math.floor(cameraRef.current.x) + shakeX, -Math.floor(cameraRef.current.y) + shakeY);
        const startCol = Math.floor(cameraRef.current.x / TILE_SIZE); const endCol = startCol + (INTERNAL_WIDTH / TILE_SIZE) + 1; const startRow = Math.floor(cameraRef.current.y / TILE_SIZE); const endRow = startRow + (INTERNAL_HEIGHT / TILE_SIZE) + 1; 
        for (let y = Math.max(0, startRow); y <= Math.min(MAP_HEIGHT - 1, endRow); y++) { for (let x = Math.max(0, startCol); x <= Math.min(MAP_WIDTH - 1, endCol); x++) { const tile = mapRef.current[y][x]; const seed = mapSeedsRef.current[y][x]; const decoration = groundDecorationsRef.current[y][x]; RenderSystem.drawTileDetail(ctx, x, y, tile, seed, decoration, currentPalette, timeRef.current, puddlesRef.current, statsRef.current.weather); } }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ripplesRef.current.forEach(r => { ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke(); });

        const viewBuffer = 150; const minX = cameraRef.current.x - viewBuffer; const maxX = cameraRef.current.x + INTERNAL_WIDTH + viewBuffer; const minY = cameraRef.current.y - viewBuffer; const maxY = cameraRef.current.y + INTERNAL_HEIGHT + viewBuffer;
        const visibleEnemies = enemiesRef.current.filter(e => e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY);
        const visibleDecor = decorationsRef.current.filter(e => e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY);
        const visibleItems = itemsRef.current.filter(e => e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY);
        const visibleShrines = shrinesRef.current.filter(e => !e.shrineUsed && e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY);
        const visibleProps = propsRef.current.filter(e => e.propActive && e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY);
        
        const renderList: Entity[] = [player, ...visibleEnemies, ...visibleDecor, ...visibleItems, ...visibleShrines, ...visibleProps];
        if(boatRef.current) renderList.push(boatRef.current); if(portalRef.current) renderList.push(portalRef.current);
        for(let i=0; i<particlesRef.current.length; i++) { if(particlesRef.current[i].type === 'player') renderList.push(particlesRef.current[i]); }
        renderList.sort((a, b) => a.pos.y - b.pos.y); 
        renderList.forEach(e => { if (e.type === 'tree') RenderSystem.drawDetailedTree(ctx, e, currentPalette, timeRef.current, statsRef.current.currentMapType); else if (e.type === 'shrine') RenderSystem.drawShrine(ctx, e, timeRef.current); else RenderSystem.drawPixelSprite(ctx, e, currentPalette, timeRef.current, characterClass); });
        
        const visibleProjectiles = projectilesRef.current.filter(p => p.projectileType === 'BEAM' || (p.pos.x > minX && p.pos.x < maxX && p.pos.y > minY && p.pos.y < maxY));
        RenderSystem.batchRenderProjectiles(ctx, visibleProjectiles, timeRef.current, cameraRef.current);
        
        for (let i = particlesRef.current.length - 1; i >= 0; i--) { 
             const p = particlesRef.current[i]; 
             if (p.type === 'player') { if (p.duration) p.duration -= timeScale; if(p.alpha) p.alpha -= 0.05 * timeScale; }
             else if (p.particleType === 'LEAF') { if (p.leafType === 'ORBIT') { p.orbitAngle = (p.orbitAngle || 0) + (p.orbitSpeed || 0.05) * timeScale; p.pos.x = player.pos.x + Math.cos(p.orbitAngle) * (p.orbitRadius || 40); p.pos.y = player.pos.y + Math.sin(p.orbitAngle) * (p.orbitRadius || 40); } else if (p.particleType === 'LEAF' && p.leafType === 'SUCTION') { const dx = player.pos.x - p.pos.x; const dy = player.pos.y - p.pos.y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist > 5) { p.pos.x += dx * 0.15 * timeScale; p.pos.y += dy * 0.15 * timeScale; } } } else if (p.particleType === 'DEBRIS') { p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.1) * timeScale; p.velocity.x *= 0.92; p.velocity.y *= 0.92; p.pos.x += p.velocity.x * timeScale; p.pos.y += p.velocity.y * timeScale; } else { p.pos.x += p.velocity.x * timeScale; p.pos.y += p.velocity.y * timeScale; }
             if (p.duration) p.duration -= timeScale; if (p.duration <= 0) particlesRef.current.splice(i, 1);
        }
        const visibleParticles = particlesRef.current.filter(p => p.pos.x > minX && p.pos.x < maxX && p.pos.y > minY && p.pos.y < maxY);
        RenderSystem.batchRenderParticles(ctx, visibleParticles, timeRef.current);
        
        if (weatherParticlesRef.current.length > 0) { ctx.fillStyle = statsRef.current.weather === WeatherType.NEON_NIGHT ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.4)'; const windX = statsRef.current.weather === WeatherType.NEON_NIGHT ? 0.2 : -1.5; weatherParticlesRef.current.forEach(wp => { wp.y += wp.speed * timeScale * 0.1; wp.x += windX * timeScale; if (wp.y > INTERNAL_HEIGHT) { wp.y = -10; wp.x = Math.random() * INTERNAL_WIDTH; } if (wp.x < -10) wp.x = INTERNAL_WIDTH + 10; if (statsRef.current.weather === WeatherType.NEON_NIGHT) { const alpha = 0.5 + Math.sin(timeRef.current * 0.05 + wp.offset) * 0.5; ctx.globalAlpha = alpha; ctx.fillRect(wp.x, wp.y, 2, 2); } else { ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(wp.x + windX * 5, wp.y + wp.len); ctx.stroke(); } ctx.globalAlpha = 1.0; }); }
        if (player.dashCooldownTimer && player.dashCooldownTimer > 0) { const w = 40; const h = 4; const pct = 1 - (player.dashCooldownTimer / 45); ctx.fillStyle = '#1e293b'; ctx.fillRect(player.pos.x - w/2, player.pos.y + 35, w, h); ctx.fillStyle = '#bae6fd'; ctx.fillRect(player.pos.x - w/2, player.pos.y + 35, w * pct, h); }
        ctx.font = '900 24px "Arial Black", sans-serif'; ctx.textAlign = 'center'; textsRef.current.forEach(t => { ctx.globalAlpha = Math.min(1.0, t.life / 20); ctx.fillStyle = 'black'; ctx.fillText(t.text, t.x + 2, t.y + 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); ctx.globalAlpha = 1.0; t.life -= timeScale; t.x += t.velocity.x * timeScale; t.y += t.velocity.y * timeScale; }); textsRef.current = textsRef.current.filter(t => t.life > 0);
        ctx.restore();
        ctx.fillStyle = currentPalette.TINT; ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
        
        if (interactionPrompt) {
            const isDanger = interactionPrompt === "BOSS_TRIGGER" || interactionPrompt.includes("危险");
            const displayText = interactionPrompt === "BOSS_TRIGGER" ? "E: 解除封印 (危险!)" : interactionPrompt;
            
            const width = ctx.measureText(displayText).width + 40; const px = INTERNAL_WIDTH / 2; const py = INTERNAL_HEIGHT * 0.8;
            
            ctx.fillStyle = isDanger ? 'rgba(69, 10, 10, 0.9)' : 'rgba(0,0,0,0.7)'; 
            ctx.roundRect(px - width/2, py, width, 40, 10); ctx.fill(); 
            ctx.strokeStyle = isDanger ? '#ef4444' : 'rgba(255,255,255,0.2)'; 
            ctx.lineWidth = isDanger ? 3 : 2; ctx.stroke(); 
            ctx.fillStyle = isDanger ? '#fecaca' : '#fff'; 
            ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; 
            ctx.fillText(displayText, px, py + 26);
        }

        if (Math.floor(timeRef.current) % 5 === 0) { 
            const cds: Record<number, number> = {}; 
            const skills = CLASS_STATS[characterClass].skills;
            skills.forEach((s, i) => {
                const ready = player.cooldowns?.[s.id] || 0;
                const rem = Math.max(0, ready - now);
                if (rem > 0) cds[i] = rem;
            });
            statsRef.current.activeCooldowns = cds; 
            onStatsUpdate({...statsRef.current}); 
            setPlayerAmmo(player.ammo || 0); setIsReloading(!!player.reloading); 
        }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [characterClass, isPaused, levelUpOptions, evolutionOptions]);

  return (
    <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full bg-slate-900" />
        
        {/* --- MAP TRANSITION OVERLAY --- */}
        {transition.active && (
            <div 
                className="absolute inset-0 bg-slate-950 z-[60] flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-auto"
                style={{ opacity: transition.opacity }}
            >
                <div className="relative">
                    <Anchor size={64} className="text-blue-400 mb-6 animate-bounce" />
                    <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-2 drop-shadow-lg">{transition.text}</h2>
                <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4 border border-slate-700">
                    <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{width: '50%'}}></div>
                </div>
            </div>
        )}

        <div className="absolute bottom-32 left-6 z-50 pointer-events-auto flex flex-col items-start gap-2">
            {showSettings && (
                <div className="bg-slate-900/95 border border-slate-600 p-4 rounded-lg backdrop-blur-md shadow-xl w-60 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1"><Settings size={12}/> 系统设置</span>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="mb-4">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-2"><span className="flex items-center gap-1"><Disc size={10}/> 背景音乐源</span></div>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => onSetBgmSource('INTERNAL')} className={`flex-1 text-[10px] py-1.5 rounded transition-all ${bgmSource === 'INTERNAL' ? 'bg-yellow-500 text-black font-bold shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>内置 (R&B)</button>
                            <button onClick={() => onSetBgmSource('EXTERNAL')} className={`flex-1 text-[10px] py-1.5 rounded transition-all ${bgmSource === 'EXTERNAL' ? 'bg-yellow-500 text-black font-bold shadow-sm' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>本地 (MP3)</button>
                        </div>
                        {bgmSource === 'EXTERNAL' && (
                            <div className="bg-slate-800/50 rounded p-2 border border-slate-700 flex flex-col gap-2">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">正在播放</div>
                                <div className="text-xs text-yellow-400 font-mono truncate border-b border-slate-700 pb-1 mb-1" title={currentTrackName}>
                                    {currentTrackName}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <button onClick={onPrevTrack} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"><SkipBack size={14} /></button>
                                    <span className="text-[9px] text-slate-500">SWITCH</span>
                                    <button onClick={onNextTrack} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"><SkipForward size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mb-4"><span className="text-xs text-slate-400">静音</span><button onClick={onToggleMute} className="text-slate-200 hover:text-yellow-400">{isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}</button></div>
                    <div className="mb-3"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span className="flex items-center gap-1"><Music size={10}/> BGM 音量</span><span>{Math.round(bgmVolume * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={bgmVolume} onChange={(e) => onSetBgmVolume(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" /></div>
                    <div className="mb-1"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span className="flex items-center gap-1"><Zap size={10}/> SFX 音量</span><span>{Math.round(sfxVolume * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(e) => onSetSfxVolume(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400" /></div>
                    <div className="mt-4 pt-3 border-t border-slate-700">
                        <button onClick={() => { triggerLevelUp(); setShowSettings(false); }} className="w-full bg-slate-800 hover:bg-slate-700 text-xs text-yellow-500 font-bold py-2 rounded border border-slate-600 flex items-center justify-center gap-2 transition-colors hover:shadow-md hover:border-yellow-500/50"><ChevronsUp size={14} /> 测试升级 (DEBUG)</button>
                    </div>
                </div>
            )}
            <button onClick={() => setShowSettings(!showSettings)} className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 p-2 rounded-full border border-slate-600 backdrop-blur-sm transition-all shadow-lg"><Settings size={20} className={showSettings ? "text-yellow-400" : ""} /></button>
        </div>
        {levelUpOptions && (<UpgradeModal options={levelUpOptions} onSelect={handleSelectUpgrade} title="系统升级" />)}
        {evolutionOptions && (<UpgradeModal options={evolutionOptions} onSelect={handleSelectEvolution} title="技能进化" />)}
        <div className="absolute inset-0 pointer-events-none">
            <UIOverlay 
                stats={statsRef.current}
                characterClass={characterClass}
                playerHp={statsRef.current.playerHp}
                playerAmmo={playerAmmo}
                playerMaxAmmo={playerRef.current.maxAmmo}
                isReloading={isReloading}
            />
        </div>
    </div>
  );
};

export default GameCanvas;
