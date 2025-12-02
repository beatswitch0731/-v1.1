
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../constants';
import { Entity, GameState, MapType, ItemType } from '../types';
import { AudioSystem } from '../services/audioSystem';

export const spawnEnemy = (
    enemies: Entity[], 
    player: Entity, 
    stats: GameState, 
    lastSpawnTime: number, 
    now: number
): number => { // Returns new lastSpawnTime
    
    // Spawn Rate logic
    const spawnRate = (1800 - (stats.wave * 20));
    if (now - lastSpawnTime < spawnRate) return lastSpawnTime;
    if (enemies.length >= 60) return lastSpawnTime;

    const playerX = player.pos.x;
    const playerY = player.pos.y;
    const spawnRadius = 800;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.max(50, Math.min(MAP_WIDTH * TILE_SIZE - 50, playerX + Math.cos(angle) * spawnRadius));
    const y = Math.max(50, Math.min(MAP_HEIGHT * TILE_SIZE - 50, playerY + Math.sin(angle) * spawnRadius));

    const typeRoll = Math.random();
    let type: 'CHASER' | 'SHOOTER' | 'TANK' | 'ICE_SLIME' | 'YETI' = 'CHASER';
    const isIce = stats.currentMapType === MapType.ICE_WORLD;
    const difficultyTier = Math.floor(stats.level / 3);
    const scaleMult = 1 + (difficultyTier * 0.4);

    let hp = 90 * scaleMult;
    let radius = 24;
    let baseColor = '#5d4037';
    let attackTimer = 0;

    if (isIce) {
        baseColor = '#3b82f6';
        if (typeRoll > 0.85) { type = 'YETI'; hp = 300 * scaleMult; radius = 35; baseColor = '#cbd5e1'; }
        else { type = 'ICE_SLIME'; hp = 110 * scaleMult; }
    } else {
        if (typeRoll > 0.85) { type = 'TANK'; hp = 400 * scaleMult; radius = 35; baseColor = '#334155'; }
        else if (typeRoll > 0.65) { type = 'SHOOTER'; hp = 60 * scaleMult; baseColor = '#166534'; attackTimer = Math.random() * 100; }
    }

    let isElite = false;
    let eliteAffix: 'SPEED' | 'TANK' | 'EXPLOSIVE' | undefined;
    if (Math.random() < 0.05 && stats.level > 2) {
        isElite = true;
        hp *= 2.5;
        const affixRoll = Math.random();
        if (affixRoll < 0.33) eliteAffix = 'SPEED';
        else if (affixRoll < 0.66) eliteAffix = 'TANK';
        else eliteAffix = 'EXPLOSIVE';
        
        if (eliteAffix === 'TANK') { hp *= 1.5; radius *= 1.3; }
        if (isElite) baseColor = eliteAffix === 'SPEED' ? '#3b82f6' : eliteAffix === 'EXPLOSIVE' ? '#ef4444' : '#facc15';
    }

    enemies.push({
        id: Math.random().toString(),
        type: 'enemy',
        enemyType: type,
        pos: { x, y },
        velocity: { x: 0, y: 0 },
        radius,
        color: baseColor,
        hp,
        maxHp: hp,
        animFrame: Math.random() * 100,
        hitFlash: 0,
        facing: 1,
        deathTimer: 0,
        isElite,
        eliteAffix,
        specialAttackTimer: attackTimer
    });

    return now;
};

export const spawnBoss = (
    enemies: Entity[], 
    player: Entity, 
    stats: GameState, 
    bossType: 'BOSS_GRASS' | 'BOSS_ICE', 
    triggerShake: any, 
    addFloatingText: any
) => {
    const name = bossType === 'BOSS_GRASS' ? '剧毒泰坦' : '极寒领主';
    const element = bossType === 'BOSS_GRASS' ? 'NATURE' : 'ICE';
    const scaleMult = 1 + (stats.level * 0.2);
    const hp = 3000 * scaleMult;

    stats.bossName = name;
    stats.bossElement = element;
    stats.bossHp = hp;
    stats.bossMaxHp = hp;

    addFloatingText("⚠ BOSS 出现 ⚠", player.pos.x, player.pos.y - 100, '#ef4444', 3);
    triggerShake(50, 40);

    enemies.push({
        id: 'BOSS',
        type: 'enemy',
        enemyType: bossType,
        pos: { x: MAP_WIDTH * TILE_SIZE - 200, y: MAP_HEIGHT * TILE_SIZE - 200 },
        velocity: { x: 0, y: 0 },
        radius: 80,
        color: '#000',
        hp: hp,
        maxHp: hp,
        facing: -1,
        deathTimer: 0,
        specialAttackTimer: 180
    });
};

export const updateEnemies = (
    enemies: Entity[],
    player: Entity,
    timeScale: number,
    stats: GameState,
    projectiles: Entity[],
    audioManager: AudioSystem,
    addFloatingText: any,
    spawnItem: (pos: {x:number,y:number}) => void,
    spawnDeathParticles: any,
    triggerShake: any,
    onGameOver: (score: number) => void
) => {
    // We iterate backwards to allow removal
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        // 1. Status Effects
        if (e.burnTimer && e.burnTimer > 0) {
            e.burnTimer -= timeScale;
            e.burnTickTimer = (e.burnTickTimer || 0) + timeScale;
            if (e.burnTickTimer >= 30) {
                const burnDmg = stats.currentDamage * 0.1;
                e.hp -= burnDmg;
                addFloatingText(burnDmg.toFixed(0), e.pos.x, e.pos.y - 40, '#f97316');
                e.burnTickTimer = 0;
            }
        }

        // 2. Stun & Death Checks
        if (e.stunTimer && e.stunTimer > 0) {
            e.stunTimer -= timeScale;
            if (e.hp <= 0 && (!e.deathTimer || e.deathTimer === 0)) {
                handleEnemyDeath(enemies, i, e, stats, audioManager, spawnItem, spawnDeathParticles);
                continue;
            }
            if (e.deathTimer && e.deathTimer > 0) {
                e.deathTimer -= timeScale;
                if (e.deathTimer <= 0) enemies.splice(i, 1);
                continue;
            }
            continue; // Skip movement/attack if stunned
        }

        // 3. Boss Special Attacks
        if (e.enemyType?.startsWith('BOSS') && e.specialAttackTimer !== undefined) {
            e.specialAttackTimer -= timeScale;
            if (e.specialAttackTimer <= 0) {
                e.specialAttackTimer = 240;
                if (e.enemyType === 'BOSS_GRASS') {
                    addFloatingText("荆棘缠绕!", e.pos.x, e.pos.y - 80, '#22c55e', 2);
                    for (let k = 0; k < 5; k++) {
                        const angle = (k / 5) * Math.PI * 2;
                        const dist = 60 + Math.random() * 40;
                        projectiles.push({
                            id: Math.random().toString(), type: 'projectile', projectileType: 'VINE',
                            pos: { x: player.pos.x + Math.cos(angle) * dist, y: player.pos.y + Math.sin(angle) * dist },
                            velocity: { x: 0, y: 0 }, radius: 25, color: '#15803d', hp: 999, maxHp: 999, duration: 300
                        });
                    }
                } else if (e.enemyType === 'BOSS_ICE') {
                    addFloatingText("暴风雪!", e.pos.x, e.pos.y - 80, '#bae6fd', 2);
                    projectiles.push({
                        id: Math.random().toString(), type: 'projectile', projectileType: 'BLIZZARD',
                        pos: { x: player.pos.x, y: player.pos.y }, velocity: { x: 0, y: 0 },
                        radius: 180, color: '#bae6fd', hp: 999, maxHp: 999, duration: 300
                    });
                }
            }
        }

        if (e.isElite && e.eliteAffix === 'SPEED') {
            e.velocity.x *= 1.1; e.velocity.y *= 1.1;
        }

        // 4. Death Check
        if (e.hp <= 0 && (!e.deathTimer || e.deathTimer === 0)) {
            handleEnemyDeath(enemies, i, e, stats, audioManager, spawnItem, spawnDeathParticles);
            // Elite Explosion
            if (e.isElite && e.eliteAffix === 'EXPLOSIVE') {
                projectiles.push({
                    id: Math.random().toString(), type: 'projectile', projectileType: 'EXPLOSIVE',
                    pos: { ...e.pos }, velocity: { x: 0, y: 0 }, radius: 60, color: '#ef4444',
                    hp: 1, maxHp: 1, damage: 30, duration: 30
                });
            }
            continue;
        }
        if (e.deathTimer && e.deathTimer > 0) {
            e.deathTimer -= timeScale;
            if (e.deathTimer <= 0) enemies.splice(i, 1);
            continue;
        }

        // 5. Movement Logic
        if (e.hitFlash > 0) e.hitFlash -= timeScale;
        const dx = player.pos.x - e.pos.x;
        const dy = player.pos.y - e.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dx > 0) e.facing = 1; else e.facing = -1;

        if (e.hitFlash && e.hitFlash > 0) {
            const friction = Math.pow(0.85, timeScale);
            e.velocity.x *= friction; e.velocity.y *= friction;
        } else {
            const baseSpeed = 0.8 + (stats.level * 0.05);
            let goalX = 0; let goalY = 0;

            if (e.enemyType === 'SHOOTER') {
                const desiredDist = 250;
                if (dist < desiredDist) { goalX = -dx / dist; goalY = -dy / dist; }
                else if (dist > desiredDist + 50) { goalX = dx / dist; goalY = dy / dist; }

                if (dist < 400 && e.specialAttackTimer !== undefined) {
                    e.specialAttackTimer -= timeScale;
                    if (e.specialAttackTimer <= 0) {
                        e.specialAttackTimer = 180;
                        const shotAngle = Math.atan2(dy, dx);
                        projectiles.push({
                            id: Math.random().toString(), type: 'projectile', owner: 'enemy',
                            pos: { ...e.pos }, velocity: { x: Math.cos(shotAngle) * 8, y: Math.sin(shotAngle) * 8 },
                            radius: 8, color: '#ef4444', hp: 1, maxHp: 1, damage: 15, duration: 80
                        });
                        audioManager.playShoot('GUN');
                    }
                }
            } else if (e.enemyType === 'TANK') {
                const tankSpeed = 0.4;
                goalX = (dx / dist) * tankSpeed;
                goalY = (dy / dist) * tankSpeed;
            } else {
                // Flocking / Separation
                let sepX = 0; let sepY = 0;
                // Note: Full O(N^2) here, relies on outer scope spatial hash ideally, but simple loop for now
                // Optimization: Just check a few random neighbors or rely on spatial hash if passed
                // For separate file purity, we'll keep the loop but it's heavier. 
                // Passed enemies[] is usually limited < 60 so it's fine.
                for (const other of enemies) {
                    if (other === e) continue;
                    const odx = e.pos.x - other.pos.x;
                    const ody = e.pos.y - other.pos.y;
                    const odistSq = odx * odx + ody * ody;
                    const space = e.radius + other.radius;
                    if (odistSq < space * space) {
                        const odist = Math.sqrt(odistSq);
                        const pushStrength = (space - odist) / space;
                        sepX += (odx / odist) * pushStrength * 2.0;
                        sepY += (ody / odist) * pushStrength * 2.0;
                    }
                }
                goalX = (dx / dist) + sepX * 1.5;
                goalY = (dy / dist) + sepY * 1.5;
            }

            e.velocity.x += goalX * 0.15 * timeScale;
            e.velocity.y += goalY * 0.15 * timeScale;

            const currentSpeed = Math.hypot(e.velocity.x, e.velocity.y);
            let maxSpeed = baseSpeed;
            if (e.enemyType === 'SHOOTER') maxSpeed *= 0.8;
            if (e.enemyType === 'TANK') maxSpeed *= 0.5;

            if (currentSpeed > maxSpeed) {
                e.velocity.x = (e.velocity.x / currentSpeed) * maxSpeed;
                e.velocity.y = (e.velocity.y / currentSpeed) * maxSpeed;
            } else {
                const friction = Math.pow(0.95, timeScale);
                e.velocity.x *= friction;
                e.velocity.y *= friction;
            }
        }

        e.pos.x += e.velocity.x * timeScale;
        e.pos.y += e.velocity.y * timeScale;

        // 6. Player Collision (Damage)
        if (dist < player.radius + e.radius) {
            const isInvuln = (player.dashTimer && player.dashTimer > 0) || (player.buffs?.['invuln'] && player.buffs['invuln'] > Date.now());
            let blocked = false;
            
            if (!isInvuln && player.modifiers?.blockChance && Math.random() < player.modifiers.blockChance) {
                blocked = true;
                addFloatingText("格挡!", player.pos.x, player.pos.y - 40, '#bae6fd');
                audioManager.playParry();
                triggerShake(5, 5);
                e.hp -= 20;
            }
            
            if (!isInvuln && !blocked) {
                player.hp -= 0.5 * timeScale;
                stats.playerHp = player.hp;
                
                // Audio throttling logic should be in GameCanvas or passed context, simpler here:
                if (Math.random() < 0.1) {
                    // shakeRef.current = 3; // Trigger shake via callback
                    audioManager.playImpact();
                }

                if (player.hp <= 0) {
                    stats.isGameOver = true;
                    audioManager.playExplosion();
                    onGameOver(stats.score);
                }
            }
        }
    }
};

const handleEnemyDeath = (
    enemies: Entity[], 
    index: number, 
    e: Entity, 
    stats: GameState, 
    audioManager: AudioSystem, 
    spawnItem: (pos: {x:number,y:number}) => void,
    spawnDeathParticles: any
) => {
    audioManager.playExplosion();
    spawnItem(e.pos);
    
    let score = e.enemyType?.startsWith('BOSS') ? 1000 : 10;
    let xp = e.enemyType?.startsWith('BOSS') ? 500 : 10;
    
    if (e.isElite) {
        score *= 5;
        xp *= 5;
        spawnItem({ x: e.pos.x + 20, y: e.pos.y });
    }
    
    stats.score += score;
    stats.enemiesKilled++;
    stats.xp += xp;
    
    spawnDeathParticles(e.pos, e.color, e.radius, e.enemyType?.startsWith('BOSS'));
    enemies.splice(index, 1);
};
