


import React from 'react';
import { CLASS_STATS, INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../constants';
import { Entity, CharacterClass, GameState, Vector2, ElementalType } from '../types';
import { AudioSystem } from '../services/audioSystem';
import NewAudioManager from '../services/AudioManager'; // Import the new singleton

export interface CombatContext {
    player: Entity;
    enemies: Entity[];
    projectiles: Entity[];
    particles: Entity[];
    stats: GameState;
    mouse: Vector2;
    mouseRef?: React.MutableRefObject<Vector2>; 
    camera: Vector2;
    audioManager: AudioSystem;
    addFloatingText: (text: string, x: number, y: number, color: string, scale?: number) => void;
    triggerShake: (intensity: number, duration: number) => void;
    lastShotTime: number;
    setLastShotTime: (t: number) => void;
}

const spawnParticle = (particles: Entity[], pos: Vector2, color: string, count: number, speed: number, size: number = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * speed;
      particles.push({
        id: Math.random().toString(), type: 'particle',
        pos: { ...pos },
        velocity: { x: Math.cos(angle) * vel, y: Math.sin(angle) * vel },
        radius: Math.random() * size + 1,
        color: color, hp: 0, maxHp: 0, duration: 20 + Math.random() * 20, maxDuration: 40
      });
    }
};

export const handleWindEndures = (
    player: Entity,
    enemy: Entity,
    stats: GameState,
    addFloatingText: (text: string, x: number, y: number, color: string, scale?: number) => void,
    particles: Entity[],
    audioManager: AudioSystem
) => {
    if (player.modifiers?.windEndures) {
        player.windEnduresCounter = (player.windEnduresCounter || 0) + 1;
        if (player.windEnduresCounter >= 4) {
            player.windEnduresCounter = 0;
            const dmg = stats.currentDamage * 0.8;
            enemy.hp -= dmg;
            enemy.hitFlash = 10;
            addFloatingText("嗒！", enemy.pos.x, enemy.pos.y - 70, '#4ade80', 1.5); // Green text
            
            // Spawn wind particles
            for(let i=0; i<8; i++) {
                 const angle = Math.random() * Math.PI * 2;
                 const speed = 2 + Math.random() * 4;
                 particles.push({
                     id: Math.random().toString(), type: 'particle',
                     pos: { ...enemy.pos },
                     velocity: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
                     radius: Math.random() * 3 + 2,
                     color: '#4ade80',
                     hp: 0, maxHp: 0, duration: 25
                 });
            }
        }
    }
};

export const updateFunnels = (ctx: CombatContext, now: number, characterClass: CharacterClass) => {
    const { player, enemies, projectiles, particles, stats, audioManager } = ctx;
    const mods = player.modifiers;
    if (!mods || !mods.funnelCount || mods.funnelCount <= 0) return;

    if (!player.funnelCooldowns) player.funnelCooldowns = [];
    const baseStats = CLASS_STATS[characterClass];
    const damageMult = (1 + (stats.level * 0.1)) * mods.damageMult;
    const fireRateMult = mods.funnelFireRateMult || 1.0;
    const baseCooldown = 800; 

    for (let i = 0; i < mods.funnelCount; i++) {
        if (!player.funnelCooldowns[i]) player.funnelCooldowns[i] = 0;
        if (now < player.funnelCooldowns[i]) continue;

        let target: Entity | null = null;
        let minDist = 600; 
        for (const e of enemies) {
            if (e.deathTimer) continue;
            const dist = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
            if (dist < minDist) { minDist = dist; target = e; }
        }

        if (target) {
            const fAngle = (now * 0.002) + (i / mods.funnelCount) * Math.PI * 2; 
            const orbitR = 45;
            const fx = player.pos.x + Math.cos(fAngle) * orbitR;
            const fy = player.pos.y + Math.sin(fAngle) * orbitR;
            const angle = Math.atan2(target.pos.y - fy, target.pos.x - fx);
            
            let pColor = '#22d3ee'; 
            if (mods.funnelBurnChance && mods.funnelBurnChance > 0) pColor = '#f97316'; 
            else if (mods.funnelElectricChance && mods.funnelElectricChance > 0) pColor = '#a855f7'; 

            projectiles.push({
                id: Math.random().toString(), type: 'projectile', projectileType: 'FUNNEL_SHOT', 
                pos: { x: fx, y: fy }, velocity: { x: Math.cos(angle) * 18, y: Math.sin(angle) * 18 },
                radius: 5, color: pColor, hp: 1, maxHp: 1, damage: baseStats.damage * damageMult * 0.4, duration: 60, isFunnelShot: true
            });
            particles.push({ id: Math.random().toString(), type: 'particle', pos: {x: fx, y: fy}, velocity: {x:0, y:0}, radius: 4, color: 'rgba(255,255,255,0.8)', hp:0, maxHp:0, duration: 3 });
            player.funnelCooldowns[i] = now + (baseCooldown / fireRateMult);
        }
    }
};

// New: Update Logic for Five Element Swords (Automatic Attacks)
export const updateElementalSwords = (ctx: CombatContext, now: number) => {
    const { player, enemies, projectiles, particles, stats, audioManager, addFloatingText } = ctx;

    // Filter out the swords from projectiles
    const swords = projectiles.filter(p => p.projectileType === 'SPIRIT_SWORD' && p.element);

    // If player is charging, swords do not attack.
    // ALSO: If swords themselves are in charge mode (isCharging), they do not attack.
    if (player.isSkill2Charging) {
        return;
    }

    swords.forEach(sword => {
        // Skip attack if this sword is currently being charged by the user
        if (sword.isCharging) return;

        // Initialize attack timer if missing
        if (!sword.swordAttackTimer) sword.swordAttackTimer = 0;
        
        const baseAttackCooldown = 1500; // 1.5 seconds
        // Calculate dynamic cooldown based on sword's current speed/intensity state
        const attackCooldown = baseAttackCooldown / (sword.attackSpeedMult || 1.0);

        if (now > sword.swordAttackTimer) {
             // Find nearest enemy within range
             let target: Entity | null = null;
             let minDist = 350; // Attack range

             for (const e of enemies) {
                 if (e.deathTimer) continue;
                 const dist = Math.hypot(e.pos.x - sword.pos.x, e.pos.y - sword.pos.y);
                 if (dist < minDist) {
                     minDist = dist;
                     target = e;
                 }
             }

             if (target) {
                 // Attack!
                 sword.swordAttackTimer = now + attackCooldown;
                 
                 const angle = Math.atan2(target.pos.y - sword.pos.y, target.pos.x - sword.pos.x);
                 
                 // Spawn a "Stab" projectile (Phantom Copy)
                 // This projectile travels quickly to the target
                 projectiles.push({
                     id: Math.random().toString(),
                     type: 'projectile',
                     projectileType: 'ELEMENTAL_STAB', // Special type for render
                     element: sword.element, // Inherit element
                     pos: { x: sword.pos.x, y: sword.pos.y },
                     velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
                     radius: 15, // Hitbox size
                     color: sword.color,
                     hp: 1, maxHp: 1,
                     damage: sword.damage, // Inherit damage
                     duration: 40, // Short life
                     rotation: angle, // Point towards enemy
                     piercing: true
                 });

                 // Visual feedback on the launcher sword
                 spawnParticle(particles, sword.pos, sword.color, 5, 2);
                 NewAudioManager.playFlyingSwordAttack(); // OPTIMIZED SOUND
             }
        }
    });
};

export const triggerSkill = (ctx: CombatContext, slotIndex: number, characterClass: CharacterClass) => {
    const { player, enemies, projectiles, particles, stats, mouse, camera, audioManager, addFloatingText, triggerShake } = ctx;
    if (player.chargeTimer && player.chargeTimer > 0) return; 

    const baseStats = CLASS_STATS[characterClass];
    const skill = baseStats.skills[slotIndex];
    if (stats.level < skill.unlockLevel) { addFloatingText("未解锁", player.pos.x, player.pos.y - 40, '#9ca3af'); return; }

    const now = Date.now();
    const readyAt = player.cooldowns?.[skill.id] || 0;
    if (now < readyAt) return; 

    // Samurai S2 logic check: 
    // If attempting to trigger S2 but swords already exist, DO NOT spawn new ones (logic handled in GameCanvas hold).
    if (characterClass === CharacterClass.SAMURAI && slotIndex === 1) {
        const activeSwords = projectiles.filter(p => p.projectileType === 'SPIRIT_SWORD' && p.element).length;
        if (activeSwords > 0) return; // Exit if swords already exist
    }

    // Standard Cooldown Setting
    // Samurai S2 cooldown is special (set on release in GameCanvas), but we set a default here just in case.
    if (!player.cooldowns) player.cooldowns = {};
    player.cooldowns[skill.id] = now + skill.cooldown;
    
    // Define mods, rangeMult, and ensure damageMult is let
    const mods = player.modifiers || {} as any;
    let damageMult = 1 + (stats.level * 0.1) * (mods.damageMult || 1); 
    const rangeMult = mods.rangeMult || 1.0;

    const worldMouseX = mouse.x + camera.x;
    const worldMouseY = mouse.y + camera.y;
    
    // Play specialized skill sounds
    if (characterClass === CharacterClass.GUNNER) {
        audioManager.playWesternSkill(slotIndex);
    } else {
        if (characterClass === CharacterClass.SAMURAI && slotIndex === 3) {
            NewAudioManager.playDragonRoar(); // New S4 sound
        } else if (characterClass === CharacterClass.SAMURAI && slotIndex === 1) {
             NewAudioManager.playSwordUnsheathe();
        } else {
            audioManager.playSkill(slotIndex);
        }
    }
    
     if (characterClass === CharacterClass.GUNNER) {
        // ... (GUNNER CODE UNCHANGED) ...
        if (slotIndex === 0) { 
             addFloatingText("电磁套索!", player.pos.x, player.pos.y - 30, '#38bdf8', 1.5);
             const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
             const hasTesla = player.modifiers?.lassoShock;
             if (hasTesla) addFloatingText("雷霆警长!", player.pos.x, player.pos.y - 50, '#a855f7', 1.5);
             projectiles.push({
                id: Math.random().toString(), type: 'projectile', projectileType: 'ELECTRO_LASSO_THROW',
                pos: { ...player.pos }, velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
                radius: 12, color: '#38bdf8', hp: 1, maxHp: 1, damage: baseStats.damage * 2.4 * damageMult, duration: 100, teslaDetonation: hasTesla 
            });
        } else if (slotIndex === 1) { 
             const isInferno = player.modifiers?.fanFire;
             const baseAngle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
             if (isInferno) {
                 addFloatingText("地狱枪管!", player.pos.x, player.pos.y - 70, '#f97316', 2.5);
                 addFloatingText("哼!", player.pos.x + 20, player.pos.y - 90, '#fff', 3.0);
                 NewAudioManager.playHum();
                 triggerShake(40, 120); 
                 const totalShots = 200; const shotsPerTick = 2; const delayPerTick = 40; let shotIndex = 0;
                 const interval = setInterval(() => {
                     if (shotIndex >= totalShots) { clearInterval(interval); return; }
                     NewAudioManager.playGatlingShot();
                     let currentAngle = baseAngle;
                     if (ctx.mouseRef && ctx.mouseRef.current) { const mx = ctx.mouseRef.current.x + camera.x; const my = ctx.mouseRef.current.y + camera.y; currentAngle = Math.atan2(my - player.pos.y, mx - player.pos.x); }
                     for (let k = 0; k < shotsPerTick; k++) {
                         if (shotIndex >= totalShots) break;
                         const cyclePos = shotIndex % 14; let currentDmgMult = 0.4; let visualColor = '#f97316'; let radius = 6;
                         if (cyclePos >= 7 && cyclePos < 11) { currentDmgMult += 0.4; visualColor = '#ef4444'; radius = 7; } else if (cyclePos >= 11) { currentDmgMult += 0.6; visualColor = '#b91c1c'; radius = 9; }
                         const spread = Math.PI / 2; const a = currentAngle - spread/2 + Math.random() * spread;
                         if (k === 0) { 
                             // Corrected Muzzle Flash Position for Inferno
                             const f = player.facing || 1;
                             particles.push({ 
                                 id: Math.random().toString(), 
                                 type: 'particle', 
                                 particleType: 'MUZZLE_FLASH', 
                                 pos: {x: player.pos.x + (35 * f), y: player.pos.y - 34}, 
                                 velocity: {x: 0, y: 0}, 
                                 radius: 12, 
                                 color: '#f97316', 
                                 hp:0, maxHp:0, duration: 4 
                             }); 
                         }
                         projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'BULLET', pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: Math.cos(a) * 22, y: Math.sin(a) * 22 }, radius: radius, color: visualColor, hp: 1, maxHp: 1, damage: baseStats.damage * currentDmgMult * damageMult, duration: 50, piercing: true, isInferno: true });
                         shotIndex++;
                     }
                 }, delayPerTick);
             } else {
                 addFloatingText("亡命连射!", player.pos.x, player.pos.y - 50, '#facc15', 2.0);
                 const fanCount = 12; const spread = Math.PI / 3; triggerShake(20, 20); 
                 // Updated position for Fan Fire particles
                 const f = player.facing || 1;
                 spawnParticle(particles, {x: player.pos.x + (35 * f), y: player.pos.y - 34}, '#facc15', 20, 10);
                 for(let i=0; i<fanCount; i++) { setTimeout(() => { const a = baseAngle - spread/2 + Math.random() * spread; projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'BULLET', pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: Math.cos(a) * 25, y: Math.sin(a) * 25 }, radius: 5, color: '#facc15', hp: 1, maxHp: 1, damage: baseStats.damage * 0.8 * damageMult, duration: 40, ricochetsLeft: 1 }); }, i * 30); }
             }
        } else if (slotIndex === 2) { 
             addFloatingText("TNT快递!", player.pos.x, player.pos.y - 50, '#ef4444', 1.5);
             const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
             projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'TNT_BARREL', pos: { ...player.pos }, velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 }, radius: 20, color: '#78350f', hp: 100, maxHp: 100, damage: baseStats.damage * 8.0 * damageMult, duration: 120 });
        } else if (slotIndex === 3) { 
             addFloatingText("午时已到...", player.pos.x, player.pos.y - 80, '#ef4444', 3.0);
             triggerShake(5, 60);
             const viewBuffer = 100; const minX = camera.x - viewBuffer; const maxX = camera.x + INTERNAL_WIDTH + viewBuffer; const minY = camera.y - viewBuffer; const maxY = camera.y + INTERNAL_HEIGHT + viewBuffer;
             const visibleEnemies = enemies.filter(e => { return e.pos.x > minX && e.pos.x < maxX && e.pos.y > minY && e.pos.y < maxY; });
             visibleEnemies.forEach(e => { particles.push({ id: Math.random().toString(), type: 'particle', particleType: 'TARGETED', pos: e.pos, velocity: e.velocity, radius: 20, color: '#ef4444', hp:0, maxHp:0, duration: 60 }); });
             setTimeout(() => { triggerShake(50, 30); audioManager.playHighNoonBang(); visibleEnemies.forEach((e) => { if (e.hp > 0) { projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'HIGH_NOON_IMPACT', pos: { x: player.pos.x, y: player.pos.y }, velocity: {x:0,y:0}, radius: 2, color: '#ef4444', hp:1,maxHp:1, damage: 0, duration: 8 }); const dmg = baseStats.damage * 3.2 * damageMult; e.hp -= dmg; e.hitFlash = 20; spawnParticle(particles, e.pos, '#ef4444', 20, 10); addFloatingText(dmg.toFixed(0), e.pos.x, e.pos.y - 40, '#ef4444', 2.0); } }); }, 1000); 
        }

    } else if (characterClass === CharacterClass.SAMURAI) {
        
        // --- SAMURAI NEW SKILLS ---

        if (slotIndex === 0) { // S1: 墨流·虚空断 (Ink Flow · Void Severance) - REDESIGNED
            addFloatingText("虚空斩!", player.pos.x, player.pos.y - 50, '#bae6fd', 2.0);
            triggerShake(15, 10);
            
            const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
            
            // Spawn Giant Linear Void Slash
            // Travels forward and widens
            projectiles.push({
                id: Math.random().toString(), type: 'projectile', projectileType: 'VOID_SLASH',
                pos: { x: player.pos.x, y: player.pos.y }, 
                velocity: { x: Math.cos(angle) * 16, y: Math.sin(angle) * 16 }, // Fast projectile
                radius: 60 * rangeMult, // Starting width
                color: '#ffffff', 
                hp: 1, maxHp: 1, 
                damage: baseStats.damage * 3.5 * damageMult, 
                duration: 45, // Lasts for distance
                rotation: angle,
                piercing: true,
                hitList: [] // Initialize hitList for unique hits
            });

            // EVOLUTION: Ink Mastery (Leave a damaging puddle)
            if (mods.inkTrail) {
                addFloatingText("绝境!", player.pos.x, player.pos.y - 80, '#000000', 1.5);
                projectiles.push({
                    id: Math.random().toString(), type: 'projectile', projectileType: 'INK_PUDDLE',
                    pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: 0, y: 0 },
                    radius: 100 * rangeMult, color: '#000000', 
                    hp: 1, maxHp: 1, damage: baseStats.damage * 0.5 * damageMult, duration: 300 // 5 seconds duration
                });
            }
            
            // Clear bullets in front
             projectiles.forEach(p => { 
                if (p.owner === 'enemy' && Math.abs(p.rotation! - angle) < 1.0 && Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y) < 200) p.duration = 0; 
            });

        } else if (slotIndex === 1) { // S2: 御剑·千机 (Spirit Swords - Five Elements)
             addFloatingText("五行剑阵!", player.pos.x, player.pos.y - 60, '#bae6fd', 2.0);
             triggerShake(5, 5);
             
             // Base: 5 Swords (Five Elements)
             // Evolution: +5 Swords
             const extraSwords = mods.bladeDance ? 5 : 0;
             const swordCount = 5 + extraSwords;
             
             if (mods.bladeDance) addFloatingText("万剑归宗!", player.pos.x, player.pos.y - 80, '#facc15', 2.5);

             // Five Elements: Metal (Jin), Wood (Mu), Water (Shui), Fire (Huo), Earth (Tu)
             const elements: ElementalType[] = ['METAL', 'WOOD', 'WATER', 'FIRE', 'EARTH'];
             // Colors associated with elements
             const colors = {
                 METAL: '#f8fafc', // White/Silver
                 WOOD: '#4ade80',  // Green
                 WATER: '#38bdf8', // Blue
                 FIRE: '#ef4444',  // Red
                 EARTH: '#d97706'  // Brown/Gold
             };

             for(let i=0; i<swordCount; i++) {
                 const angleOffset = (i / swordCount) * Math.PI * 2;
                 const element = elements[i % 5];
                 const color = colors[element];
                 
                 // Orbital Properties
                 const orbitRadius = 100 * rangeMult;
                 
                 // Calculate initial position relative to player
                 const startX = player.pos.x + Math.cos(angleOffset) * orbitRadius;
                 const startY = player.pos.y + Math.sin(angleOffset) * orbitRadius;

                 projectiles.push({
                     id: Math.random().toString(), type: 'projectile', projectileType: 'SPIRIT_SWORD',
                     pos: { x: startX, y: startY }, 
                     velocity: { x: 0, y: 0 }, 
                     radius: 15, 
                     color: color, 
                     element: element, // Assign Element
                     hp: 999, maxHp: 999, 
                     damage: baseStats.damage * 1.5 * damageMult, 
                     duration: 600, // INCREASED DURATION to 10 Seconds (was 300)
                     
                     // Orbital Logic
                     orbitAngle: angleOffset,
                     orbitRadius: orbitRadius,
                     orbitSpeed: 0.08, 
                     rotation: 0, // Vertical orientation
                     
                     piercing: true,
                     ricochetsLeft: 0,
                     swordAttackTimer: now + (Math.random() * 500), // Stagger attacks slightly
                     attackSpeedMult: 1.0, // Default attack speed multiplier
                 });
             }

        } else if (slotIndex === 2) { // S3: 风神腿 (Wind Dash / Kick)
            addFloatingText("风神!", player.pos.x, player.pos.y - 50, '#22c55e', 1.5);
            player.dashTimer = 20; 
            player.dashCooldownTimer = 60;
            const moveAngle = Math.atan2(player.velocity.y || (player.facing === 1 ? 0 : 0), player.velocity.x || (player.facing === 1 ? 1 : -1));
            player.dashDir = { x: Math.cos(moveAngle)*25, y: Math.sin(moveAngle)*25 };
            
            projectiles.push({
                id: Math.random().toString(), type: 'projectile', projectileType: 'SLASH_WAVE',
                pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: Math.cos(moveAngle)*10, y: Math.sin(moveAngle)*10 },
                radius: 60, color: '#4ade80', hp:1, maxHp:1, damage: baseStats.damage * 1.5 * damageMult, duration: 40,
                rotation: moveAngle
            });
            
            if (mods.thunderDash) {
                 addFloatingText("雷切!", player.pos.x, player.pos.y - 70, '#facc15', 2.0);
                 projectiles.push({
                    id: Math.random().toString(), type: 'projectile', projectileType: 'EXPLOSIVE',
                    pos: { ...player.pos }, velocity: {x:0,y:0}, radius: 80, color: '#bae6fd', 
                    hp: 1, maxHp: 1, damage: stats.currentDamage * 3.0, duration: 40 
                });
                particles.push({
                     id: Math.random().toString(), type: 'player', pos: { ...player.pos }, velocity: {x:0,y:0}, radius: player.radius, color: '#bae6fd', hp:0, maxHp:0, duration: 30, alpha: 0.8, facing: player.facing
                });
            }

        } else if (slotIndex === 3) { // S4: 绝技·苍龙出水 (Azure Dragon Ascends)
            addFloatingText("苍龙出水!", player.pos.x, player.pos.y - 80, '#22c55e', 3.0);
            triggerShake(60, 100);
            
            const worldMouseX = mouse.x + camera.x;
            const worldMouseY = mouse.y + camera.y;
            const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
            
            let duration = 200;
            let finalDmg = baseStats.damage * 5.0 * damageMult;
            
            if (mods.dragonFury) {
                duration = 300;
                finalDmg *= 1.3;
                addFloatingText("龙魂觉醒!", player.pos.x, player.pos.y - 110, '#facc15', 3.5);
                NewAudioManager.playDragonRoar(); 
                
                for(let k=0; k<5; k++) {
                     setTimeout(() => {
                         const lx = player.pos.x + (Math.random()-0.5)*300;
                         const ly = player.pos.y + (Math.random()-0.5)*300;
                         projectiles.push({
                             id: Math.random().toString(), type: 'projectile', projectileType: 'ELECTRO_BLAST',
                             pos: { x: lx, y: ly }, velocity: {x:0, y:0}, radius: 60, color: '#facc15', 
                             hp: 1, maxHp: 1, damage: finalDmg * 0.5, duration: 20
                         });
                     }, k * 200);
                }
            }

            projectiles.push({
                id: Math.random().toString(), type: 'projectile', projectileType: 'WIND_DRAGON',
                pos: { x: player.pos.x, y: player.pos.y }, 
                velocity: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
                radius: 80, color: '#4ade80', 
                hp: 9999, maxHp: 9999, 
                damage: finalDmg, 
                duration: duration, 
                piercing: true,
                trail: [] 
            });
        }
    } else {
        // MAGE LOGIC
        player.attackAnim = 24; player.maxAttackAnim = 24;
        const worldMouseX = mouse.x + camera.x;
        const worldMouseY = mouse.y + camera.y;
        const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
        const muzzleX = player.pos.x + Math.cos(angle) * 30;
        const muzzleY = player.pos.y + Math.sin(angle) * 30;
        audioManager.playShoot('MAGIC');
        const shotCount = 1 + mods.extraProjectiles;
        const spreadTotal = 0.3;
        for(let i=0; i<shotCount; i++) {
             const offset = shotCount > 1 ? (i / (shotCount - 1) - 0.5) * spreadTotal : 0;
             const finalAngle = angle + offset;
             spawnParticle(particles, {x: muzzleX, y: muzzleY}, '#a855f7', 10, 8); 
             projectiles.push({
                id: Math.random().toString(), type: 'projectile',
                pos: { x: muzzleX, y: muzzleY }, velocity: { x: Math.cos(finalAngle) * 16, y: Math.sin(finalAngle) * 16 },
                radius: 12, color: '#a855f7', hp: 1, maxHp: 1, damage: baseStats.damage * damageMult, duration: 60 * rangeMult
            });
        }
    }
};

export const fireWeapon = (ctx: CombatContext, now: number, characterClass: CharacterClass) => {
    const { player, enemies, projectiles, particles, stats, mouse, camera, audioManager, addFloatingText, triggerShake, lastShotTime, setLastShotTime } = ctx;
    if (player.chargeTimer && player.chargeTimer > 0) return; 
    if (player.dashTimer && player.dashTimer > 0) return;
    if (player.reloading) return; 

    const baseStats = CLASS_STATS[characterClass];
    const mods = player.modifiers || { damageMult: 1, fireRateMult: 1, speedMult: 1, rangeMult: 1, maxHpMult: 1, extraProjectiles: 0, funnelCount: 0 };
    
    // Default rate logic
    let rate = baseStats.fireRate * (characterClass === CharacterClass.GUNNER ? 1.0 : mods.fireRateMult); 
    
    // Gunner overrides
    if (characterClass === CharacterClass.GUNNER) {
        rate = 660; 
        if (mods.fireRateMult) rate /= mods.fireRateMult; 
        if (player.quickDrawStacks && player.quickDrawStacks > 0) {
            rate = 200; 
        }
    }
    // Samurai overrides (Combo & Passive)
    if (characterClass === CharacterClass.SAMURAI) {
        // Finisher has longer recovery
        if (player.comboStage === 2) {
             rate *= 1.5;
        } else {
             rate *= 0.8; // Faster rapid slashes
        }

        // PASSIVE: Attack Speed Buff Check
        // If buff exists and is active, reduce rate (increase speed)
        if (player.buffs?.['attackSpeed'] && player.buffs['attackSpeed'] > now) {
            rate *= 0.7; // 30% faster
        }
    }

    if (player.buffs?.['rapidfire'] && player.buffs['rapidfire'] > now) rate /= 2.5;

    if (now - lastShotTime < rate) return;
    
    // Reset combo if idle too long
    if (characterClass === CharacterClass.SAMURAI) {
        if (now - lastShotTime > 1200) {
            player.comboStage = 0;
        }
    }
    
    setLastShotTime(now);
    
    let damageMult = (1 + (stats.level * 0.1)) * mods.damageMult;
    const rangeMult = mods.rangeMult;

    if (characterClass === CharacterClass.GUNNER) {
        // ... (Gunner firing logic omitted for brevity, same as previous) ...
        const desiredShots = 1 + mods.extraProjectiles;
        const actualShots = Math.min((player.ammo || 0), desiredShots);
        
        if (actualShots <= 0) {
            player.reloading = true;
            const isFastReload = player.quickReloadBuffTimer && player.quickReloadBuffTimer > 0;
            player.reloadTimer = isFastReload ? 1000 : 2000;
            if (isFastReload) addFloatingText("快速装填!", player.pos.x, player.pos.y - 70, '#38bdf8', 1.2);
            else addFloatingText("装弹中...", player.pos.x, player.pos.y - 50, '#9ca3af', 1.2);
            return;
        }
        player.ammo = (player.ammo || 14) - actualShots;
        if (player.quickDrawStacks && player.quickDrawStacks > 0) player.quickDrawStacks--;
        NewAudioManager.playSFX('shoot', 0.8, true);
        
        let visualColor = '#facc15'; let bulletRadius = 7; let shakeIntensity = 4;
        if (player.ammo <= 3) { damageMult *= 2.0; visualColor = '#ef4444'; bulletRadius = 10; shakeIntensity = 8; addFloatingText("⚡⚡", player.pos.x, player.pos.y - 50, '#ef4444', 1.5); } 
        else if (player.ammo <= 8) { damageMult *= 1.5; visualColor = '#f97316'; bulletRadius = 8; shakeIntensity = 6; addFloatingText("⚡", player.pos.x, player.pos.y - 40, '#f97316', 1.2); }

        triggerShake(shakeIntensity, shakeIntensity);
        player.attackAnim = 24; player.maxAttackAnim = 24;
        const worldMouseX = mouse.x + camera.x; const worldMouseY = mouse.y + camera.y;
        const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
        
        // --- GUNNER MUZZLE FIX ---
        // Match the Gunner Sprite's gun position
        // Sprite drawing: Gun tip is at approx 32px horizontally (relative to center)
        // Gun height: Approx 34px above pivot (y = -34 relative to player center)
        const facing = player.facing || 1;
        const muzzleX = player.pos.x + (35 * facing);
        const muzzleY = player.pos.y - 34;

        const spreadTotal = 0.1 + (actualShots * 0.05);
        
        for (let i = 0; i < actualShots; i++) {
            const offset = actualShots > 1 ? (i / (actualShots - 1) - 0.5) * spreadTotal : 0;
            const finalAngle = angle + offset;
            
            // Spawn reduced size Muzzle Flash
            particles.push({ 
                id: Math.random().toString(), 
                type: 'particle', 
                particleType: 'MUZZLE_FLASH', 
                pos: {x: muzzleX, y: muzzleY}, 
                velocity: {x: 0, y: 0}, 
                radius: bulletRadius * 1.3, // Reduced from * 2
                color: visualColor, 
                hp:0, maxHp:0, duration: 6 
            });

            projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'BULLET', pos: { x: muzzleX, y: muzzleY }, velocity: { x: Math.cos(finalAngle) * 20, y: Math.sin(finalAngle) * 20 }, radius: bulletRadius, color: visualColor, hp: 1, maxHp: 1, damage: baseStats.damage * damageMult, duration: 50 * rangeMult, ricochetsLeft: mods.ricochetCount || 0 });
        }

    } else if (characterClass === CharacterClass.SAMURAI) {
         // Standard Samurai Attack (Basic Slash with Combo)
         let isIaidoStrike = false;
        if (mods.iaidoMultiplier && player.isIaidoCharged) {
            damageMult *= mods.iaidoMultiplier;
            addFloatingText("居合!", player.pos.x, player.pos.y - 60, '#facc15', 2.0);
            isIaidoStrike = true;
            triggerShake(20, 10);
            spawnParticle(particles, player.pos, '#fff', 20, 10);
            // Iaido resets combo
            player.comboStage = 2;
        } else {
            triggerShake(2, 2);
        }
        
        // PASSIVE: Count attacks
        if (!player.comboHitCount) player.comboHitCount = 0;
        player.comboHitCount++;
        
        // PASSIVE: Trigger Buff after 4 attacks
        if (player.comboHitCount >= 4) {
             player.comboHitCount = 0;
             if (!player.buffs) player.buffs = {};
             player.buffs['attackSpeed'] = now + 3000; // 3 Seconds
             addFloatingText("疾风! (Spd Up)", player.pos.x, player.pos.y - 80, '#22d3ee', 1.5);
             spawnParticle(particles, player.pos, '#22d3ee', 10, 5);
        }

        if (player.isIaidoCharged) { for(let i = particles.length-1; i>=0; i--) { if(particles[i].particleType === 'LEAF') particles.splice(i, 1); } }
        player.stationaryTimer = 0; player.isIaidoCharged = false;
        player.attackAnim = 24; player.maxAttackAnim = 24;
        const worldMouseX = mouse.x + camera.x; const worldMouseY = mouse.y + camera.y;
        const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
        
        if (isIaidoStrike) { audioManager.playIaidoSlash(); } else { audioManager.playShoot('MELEE'); }
        
        const baseRadius = 120;
        const hasVampiric = player.vampiricCharges && player.vampiricCharges > 0;
        const slashColor = hasVampiric ? '#ef4444' : '#ffffff';
        
        // --- COMBO LOGIC ---
        let currentStage = player.comboStage || 0;
        let slashCount = 1;
        let angleOffset = 0;
        let comboDmgMod = 1.0;
        let comboRangeMod = 1.0;

        switch(currentStage) {
            case 0: // Horizontal Slash
                comboRangeMod = 1.0;
                comboDmgMod = 1.0;
                break;
            case 1: // Vertical / Thrust Slash
                comboRangeMod = 1.25;
                comboDmgMod = 1.2;
                break;
            case 2: // Double Slash (Cross) Finisher
                slashCount = 2;
                comboRangeMod = 1.1;
                comboDmgMod = 1.5;
                angleOffset = Math.PI / 4; // 45 degrees
                triggerShake(6, 6); // More shake
                break;
        }

        const effectiveRange = baseRadius * rangeMult * comboRangeMod * (isIaidoStrike ? 2.0 : 1.0);
        
        // Create Visuals
        for(let i=0; i<slashCount; i++) {
             let finalAngle = angle;
             if (slashCount === 2) {
                 finalAngle = angle + (i === 0 ? -angleOffset : angleOffset);
             }
             particles.push({ 
                 id: Math.random().toString(), 
                 type: 'particle', 
                 particleType: 'SLASH', 
                 pos: { x: player.pos.x, y: player.pos.y }, 
                 velocity: { x: 0, y: 0 }, 
                 radius: effectiveRange, 
                 color: slashColor, 
                 rotation: finalAngle, 
                 hp: 0, maxHp: 0, duration: 24, maxDuration: 24 
             });
        }
        
        if (mods.hasBladeWave || mods.extraProjectiles > 0) {
            const waves = 1 + mods.extraProjectiles; const spreadArc = Math.PI / 4; 
            for(let w=0; w<waves; w++) {
                let waveOffset = 0; if (waves > 1) { waveOffset = -spreadArc/2 + (w / (waves-1)) * spreadArc; }
                const waveAngle = angle + waveOffset;
                projectiles.push({ id: Math.random().toString(), type: 'projectile', projectileType: 'SLASH_WAVE', pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: Math.cos(waveAngle) * 18, y: Math.sin(waveAngle) * 18 }, rotation: waveAngle, radius: 60, color: slashColor, hp: 1, maxHp: 1, damage: baseStats.damage * damageMult * 0.5, duration: 50 });
            }
        }
        
        const coneHalfAngle = (Math.PI / 3); 
        let didHeal = false;
        if (player.vampiricCharges && player.vampiricCharges > 0) { player.vampiricCharges--; const heal = player.maxHp * 0.20; player.hp = Math.min(player.maxHp, player.hp + heal); stats.playerHp = player.hp; addFloatingText(`+${heal.toFixed(0)}`, player.pos.x, player.pos.y - 40, '#22c55e'); spawnParticle(particles, player.pos, '#22c55e', 10, 5); didHeal = true; }
        
        let hitAny = false; 

        enemies.forEach(e => {
            if (e.deathTimer && e.deathTimer > 0) return;
            const dx = e.pos.x - player.pos.x; const dy = e.pos.y - player.pos.y; const dist = Math.sqrt(dx*dx + dy*dy);
            const angleToEnemy = Math.atan2(dy, dx); let angleDiff = angleToEnemy - angle; while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Hit Check
            if (dist < (effectiveRange) + e.radius && Math.abs(angleDiff) < coneHalfAngle) {
                 hitAny = true; 
                 const hits = slashCount; 
                 
                 for(let h=0; h<hits; h++) {
                     if (mods.executionThreshold && !e.enemyType?.startsWith('BOSS')) { if (e.hp / e.maxHp <= mods.executionThreshold) { e.hp = 0; addFloatingText("斩!", e.pos.x, e.pos.y - 40, '#ef4444', 2.0); spawnParticle(particles, e.pos, '#ef4444', 20, 8); audioManager.playImpact(); return; } }
                     
                     let finalDamage = baseStats.damage * damageMult * comboDmgMod;
                     
                     if (mods.hasSweetSpot) { const sweetSpotStart = effectiveRange * 0.8; if (dist > sweetSpotStart) { finalDamage *= 2.0; addFloatingText("完美一击!", e.pos.x, e.pos.y - 50, '#facc15', 1.5); for(let k=0; k<12; k++) { const rAngle = (k/12)*Math.PI*2; particles.push({ id: Math.random().toString(), type: 'particle', pos: {x: e.pos.x, y: e.pos.y}, velocity: {x: Math.cos(rAngle)*5, y: Math.sin(rAngle)*5}, radius: 2, color: '#facc15', hp:0, maxHp:0, duration: 20 }); } } }
                     
                     e.hp -= finalDamage; 
                     e.hitFlash = 8; 
                     e.velocity.x += Math.cos(angle) * (15 / hits); 
                     e.velocity.y += Math.sin(angle) * (15 / hits); 
                     
                     if (h===0) audioManager.playImpact();
                     
                     const color = (mods.hasSweetSpot && dist > effectiveRange * 0.8) ? '#facc15' : '#fff'; 
                     addFloatingText(Math.floor(finalDamage).toString(), e.pos.x, e.pos.y - 20 - (h*15), color); 
                     spawnParticle(particles, e.pos, didHeal ? '#22c55e' : '#991b1b', 6, 4); 
                     
                     handleWindEndures(player, e, stats, addFloatingText, particles, audioManager);
                 }
            }
         });
         
         if (hitAny) {
             const mark = currentStage === 0 ? "•" : currentStage === 1 ? "••" : "•••";
             const color = currentStage === 0 ? '#fff' : currentStage === 1 ? '#facc15' : '#ef4444';
             addFloatingText(mark, player.pos.x, player.pos.y - 60, color, 1.2);
         }

         // Cycle Stage
         player.comboStage = (currentStage + 1) % 3;

    } else {
        // MAGE LOGIC
        player.attackAnim = 24; player.maxAttackAnim = 24;
        const worldMouseX = mouse.x + camera.x;
        const worldMouseY = mouse.y + camera.y;
        const angle = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
        const muzzleX = player.pos.x + Math.cos(angle) * 30;
        const muzzleY = player.pos.y + Math.sin(angle) * 30;
        audioManager.playShoot('MAGIC');
        const shotCount = 1 + mods.extraProjectiles;
        const spreadTotal = 0.3;
        for(let i=0; i<shotCount; i++) {
             const offset = shotCount > 1 ? (i / (shotCount - 1) - 0.5) * spreadTotal : 0;
             const finalAngle = angle + offset;
             spawnParticle(particles, {x: muzzleX, y: muzzleY}, '#a855f7', 10, 8); 
             projectiles.push({
                id: Math.random().toString(), type: 'projectile',
                pos: { x: muzzleX, y: muzzleY }, velocity: { x: Math.cos(finalAngle) * 16, y: Math.sin(finalAngle) * 16 },
                radius: 12, color: '#a855f7', hp: 1, maxHp: 1, damage: baseStats.damage * damageMult, duration: 60 * rangeMult
            });
        }
    }
};
