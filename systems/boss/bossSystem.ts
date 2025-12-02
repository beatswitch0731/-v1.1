
import { Entity, GameState, DecorationType, BossType, BossState, TileType, ShrineType } from '../../types';
import { BOSS_DEFINITIONS, getBossForMap } from '../../data/bosses/bossData';
import { performBossAttack } from './bossAttacks';
import { AudioSystem } from '../../services/audioSystem';

export const checkBossTriggers = (
    player: Entity, 
    decorations: Entity[], // decorations from mapSystem converted to entities or raw
    enemies: Entity[],
    stats: GameState,
    triggerShake: any,
    addFloatingText: any,
    audioManager: AudioSystem
) => {
    // Only spawn if no boss exists
    if (enemies.some(e => e.bossType && e.bossType !== BossType.NONE)) return;

    // Check distance to any BOSS_ALTAR decoration
    // Note: In mapSystem, decorations are stored as simple objects {type, x, y}. 
    // We need to pass the raw decoration array or ensure they are entities. 
    // Current GameCanvas passes 'decorationsRef.current' which are entities.
    // Wait, in GameCanvas decorationsRef are Entities? No, in mapSystem they are {type, x, y}.
    // In GameCanvas.tsx: decorationsRef.current = data.trees (Entities)
    // groundDecorationsRef.current = data.groundDetails (2D array of Decoration objects)
    
    // We need to check groundDecorationsRef.
    // However, to simplify, let's assume we iterate the surrounding tiles of the player.
    
    // Refactored approach: We scan the mapRef logic in GameCanvas or pass a specific list of active altars.
    // To minimize GameCanvas change, let's inject a "BossTrigger" entity into the world if we generate one.
    // But the request asked for "walking into area".
    
    // Let's assume the Altar is a specific Entity in 'shrinesRef' or similar? 
    // Let's use 'decorationsRef' (Trees) for now? No.
    // We will look at `shrinesRef` which now includes BOSS_ALTAR items if we modify mapSystem.
};

export const spawnBoss = (
    bossType: BossType,
    pos: {x: number, y: number},
    enemies: Entity[],
    stats: GameState,
    triggerShake: any,
    addFloatingText: any,
    audioManager: AudioSystem
) => {
    const config = BOSS_DEFINITIONS[bossType];
    const hp = config.hpMultiplier * (1 + stats.level * 0.5);

    addFloatingText(`⚠ ${config.title} ⚠`, pos.x, pos.y - 120, config.themeColor, 3.0);
    triggerShake(60, 60);
    audioManager.playExplosion();

    enemies.push({
        id: `BOSS_${Math.random()}`,
        type: 'enemy',
        enemyType: bossType === BossType.SHOGUN ? 'BOSS_GRASS' : 'BOSS_ICE', // Legacy fallback
        bossType: bossType,
        bossState: BossState.INTRO,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        radius: config.radius,
        color: config.color,
        hp: hp,
        maxHp: hp,
        facing: 1,
        deathTimer: 0,
        specialAttackTimer: 2000, // Initial delay
        alpha: 0 // Start invisible for intro effect
    });

    stats.bossName = config.name;
    stats.bossHp = hp;
    stats.bossMaxHp = hp;
    stats.bossElement = bossType === BossType.SHOGUN ? 'UNDEAD' : 'MACHINE';
};

export const updateBosses = (
    enemies: Entity[],
    player: Entity,
    projectiles: Entity[],
    particles: Entity[],
    stats: GameState,
    audioManager: AudioSystem,
    addFloatingText: any,
    triggerShake: any
) => {
    const boss = enemies.find(e => e.bossType && e.bossType !== BossType.NONE);
    if (!boss) return;

    // Boss State Machine
    if (boss.bossState === BossState.INTRO) {
        // Intro animation logic could go here (e.g., invulnerable, rising from ground)
        if (boss.alpha === undefined) boss.alpha = 0;
        boss.alpha += 0.02;
        if (boss.alpha >= 1) {
            boss.alpha = 1;
            boss.bossState = BossState.PHASE_1;
            addFloatingText("开战!", boss.pos.x, boss.pos.y - 100, '#fff', 2.0);
        }
        return; // Skip attack logic during intro
    }

    // Phase Transitions
    const hpPct = boss.hp / boss.maxHp;
    const config = BOSS_DEFINITIONS[boss.bossType!];
    
    if (boss.bossState === BossState.PHASE_1 && config.phases[0] && hpPct < config.phases[0]) {
        boss.bossState = BossState.PHASE_2;
        addFloatingText("第二阶段!", boss.pos.x, boss.pos.y - 100, '#facc15', 2.5);
        triggerShake(30, 30);
        audioManager.playLevelUp(); // Sound effect for phase change
        
        // Push player away
        const angle = Math.atan2(player.pos.y - boss.pos.y, player.pos.x - boss.pos.x);
        player.velocity.x += Math.cos(angle) * 30;
        player.velocity.y += Math.sin(angle) * 30;
    }

    // AI & Attacks
    performBossAttack(boss, player, projectiles, particles, audioManager, addFloatingText, triggerShake);
};

export const spawnBossReward = (pos: {x: number, y: number}, shrines: Entity[]) => {
    shrines.push({
        id: `shrine_legendary_${Math.random()}`,
        type: 'shrine',
        shrineType: ShrineType.LEGENDARY,
        pos: { ...pos },
        velocity: {x:0, y:0},
        radius: 30,
        color: '#facc15',
        hp: 1, maxHp: 1,
        shrineUsed: false
    });
};
