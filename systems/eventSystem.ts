
import { GameState, Entity, GameEventType, WeatherType, PropType, ItemType } from '../types';
import { AudioSystem } from '../services/audioSystem';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../constants';

let eventTimer = 0;
let previousWeather: WeatherType = WeatherType.SUNNY;

export const updateEvents = (
    stats: GameState,
    player: Entity,
    enemies: Entity[],
    items: Entity[],
    props: Entity[],
    timeScale: number,
    audioManager: AudioSystem,
    addFloatingText: (text: string, x: number, y: number, color: string, scale?: number) => void,
    triggerShake: (intensity: number, duration: number) => void
) => {
    // 1. If Event is Active, process it
    if (stats.activeEvent) {
        stats.activeEvent.timeLeft -= (16.6 * timeScale); // approx ms

        // Event Specific Update Logic
        if (stats.activeEvent.type === GameEventType.BLOOD_MOON_RISING) {
            // Constant aggression boost handled in enemySystem or purely by weather flag
            if (Math.random() > 0.98) {
                // Random lightning/red particles during blood moon
                triggerShake(2, 2);
            }
        }

        // End Event
        if (stats.activeEvent.timeLeft <= 0) {
            endEvent(stats, addFloatingText);
        }
        return;
    }

    // 2. No Event Active - Check for Random Trigger
    // Approx 1 check per second if running at 60fps
    eventTimer += timeScale;
    if (eventTimer > 300) { // ~5 seconds check interval
        eventTimer = 0;
        
        // 5% chance every 5 seconds to trigger an event
        if (Math.random() < 0.05 && stats.level > 2) {
            triggerRandomEvent(stats, player, enemies, items, props, audioManager, addFloatingText, triggerShake);
        }
    }
};

const triggerRandomEvent = (
    stats: GameState,
    player: Entity,
    enemies: Entity[],
    items: Entity[],
    props: Entity[],
    audioManager: AudioSystem,
    addFloatingText: any,
    triggerShake: any
) => {
    const roll = Math.random();
    
    if (roll < 0.4) {
        // 40% Chance: MONSTER AMBUSH
        startAmbush(stats, player, enemies, audioManager, addFloatingText, triggerShake);
    } else if (roll < 0.7) {
        // 30% Chance: BLOOD MOON (Weather Change)
        startBloodMoon(stats, audioManager, addFloatingText);
    } else {
        // 30% Chance: GOLDEN RAIN (Loot)
        startGoldenRain(stats, player, items, props, audioManager, addFloatingText);
    }
};

const startAmbush = (
    stats: GameState, player: Entity, enemies: Entity[], 
    audioManager: AudioSystem, addFloatingText: any, triggerShake: any
) => {
    stats.activeEvent = {
        type: GameEventType.MONSTER_AMBUSH,
        name: '突袭',
        description: '大批敌人正在接近!',
        timeLeft: 5000, // Short banner duration, effect is instant
        totalDuration: 5000,
        color: '#ef4444'
    };

    audioManager.playExplosion(); // Reuse explosion sound as "Alarm"
    triggerShake(20, 20);
    addFloatingText("⚠ 伏击! ⚠", player.pos.x, player.pos.y - 120, '#ef4444', 3.0);

    // Spawn 8-12 enemies around player
    const count = 8 + Math.floor(Math.random() * 4);
    const radius = 300;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const ex = player.pos.x + Math.cos(angle) * radius;
        const ey = player.pos.y + Math.sin(angle) * radius;
        
        // Basic Chaser Stats
        enemies.push({
            id: `ambush_${Math.random()}`,
            type: 'enemy',
            enemyType: 'CHASER',
            pos: { x: ex, y: ey },
            velocity: { x: 0, y: 0 },
            radius: 20,
            color: '#7f1d1d', // Dark red for ambushers
            hp: 80 * (1 + stats.level * 0.2),
            maxHp: 80 * (1 + stats.level * 0.2),
            facing: 1,
            hitFlash: 0,
            deathTimer: 0,
            // Elite properties for fun
            isElite: Math.random() > 0.8,
            eliteAffix: 'SPEED'
        });
    }
};

const startBloodMoon = (stats: GameState, audioManager: AudioSystem, addFloatingText: any) => {
    if (stats.weather === WeatherType.BLOOD_MOON) return; // Already active

    previousWeather = stats.weather;
    stats.weather = WeatherType.BLOOD_MOON;
    
    stats.activeEvent = {
        type: GameEventType.BLOOD_MOON_RISING,
        name: '血月升起',
        description: '敌人变得更加狂暴...',
        timeLeft: 20000, // 20 seconds
        totalDuration: 20000,
        color: '#991b1b'
    };

    audioManager.playChargeReady(); // Spooky sound
    addFloatingText("☽ 血月降临 ☾", stats.score, 0, '#ef4444', 2.0); // Coordinates ignored for HUD text usually, but simple here
};

const startGoldenRain = (
    stats: GameState, player: Entity, items: Entity[], props: Entity[],
    audioManager: AudioSystem, addFloatingText: any
) => {
    stats.activeEvent = {
        type: GameEventType.GOLDEN_RAIN,
        name: '天降横财',
        description: '附近发现了宝藏!',
        timeLeft: 5000,
        totalDuration: 5000,
        color: '#facc15'
    };

    audioManager.playUpgradeSelect();
    addFloatingText("$$ 宝藏出现 $$", player.pos.x, player.pos.y - 120, '#facc15', 2.5);

    // Spawn 1 Rare Chest
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 100;
    props.push({
        id: `event_chest_${Math.random()}`,
        type: 'prop',
        propType: PropType.CHEST,
        pos: { x: player.pos.x + Math.cos(angle) * dist, y: player.pos.y + Math.sin(angle) * dist },
        velocity: {x:0, y:0},
        radius: 25,
        color: '#facc15',
        hp: 1, maxHp: 1,
        propActive: true
    });

    // Spawn some XP clusters
    for(let i=0; i<5; i++) {
        const itemAngle = Math.random() * Math.PI * 2;
        const itemDist = 50 + Math.random() * 50;
        items.push({
            id: `event_xp_${Math.random()}`,
            type: 'item',
            itemType: ItemType.XP_CRYSTAL,
            pos: { x: player.pos.x + Math.cos(itemAngle) * itemDist, y: player.pos.y + Math.sin(itemAngle) * itemDist },
            velocity: {x:0,y:0}, radius: 8, color: '#facc15', hp:0,maxHp:0,
            z: 200, zVelocity: -10 // Drop from sky
        });
    }
};

const endEvent = (stats: GameState, addFloatingText: any) => {
    if (!stats.activeEvent) return;

    if (stats.activeEvent.type === GameEventType.BLOOD_MOON_RISING) {
        stats.weather = previousWeather;
        addFloatingText("血月消散...", 0, 0, '#fff'); // Placeholder position, relying on text system
    }

    stats.activeEvent = null;
};
