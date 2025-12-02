
import { Entity, BossType, BossState } from '../../types';
import { AudioSystem } from '../../services/audioSystem';

export const performBossAttack = (
    boss: Entity, 
    player: Entity, 
    projectiles: Entity[], 
    particles: Entity[], 
    audioManager: AudioSystem,
    addFloatingText: any,
    triggerShake: any
) => {
    const now = Date.now();
    
    // Safety check
    if (!boss.specialAttackTimer) boss.specialAttackTimer = 0;
    boss.specialAttackTimer -= 16; // approximate delta

    if (boss.specialAttackTimer > 0) return;

    // Reset timer based on boss type and phase
    const isPhase2 = boss.bossState === BossState.PHASE_2;
    const baseCooldown = isPhase2 ? 1500 : 2500;
    boss.specialAttackTimer = baseCooldown + Math.random() * 1000;

    if (boss.bossType === BossType.SHOGUN) {
        performShogunAttack(boss, player, projectiles, particles, audioManager, addFloatingText, triggerShake, isPhase2);
    } else if (boss.bossType === BossType.CONSTRUCT) {
        performConstructAttack(boss, player, projectiles, particles, audioManager, addFloatingText, triggerShake, isPhase2);
    }
};

const performShogunAttack = (
    boss: Entity, player: Entity, projectiles: Entity[], particles: Entity[], 
    audioManager: AudioSystem, addFloatingText: any, triggerShake: any, isPhase2: boolean
) => {
    const roll = Math.random();

    // Attack 1: Void Slash (Linear massive damage)
    if (roll < 0.4) {
        addFloatingText("断!", boss.pos.x, boss.pos.y - 80, '#ef4444', 2.0);
        audioManager.playIaidoSlash();
        triggerShake(10, 10);
        
        const angle = Math.atan2(player.pos.y - boss.pos.y, player.pos.x - boss.pos.x);
        projectiles.push({
            id: Math.random().toString(), type: 'projectile', owner: 'enemy',
            projectileType: 'VOID_SLASH', // Reusing the visual
            pos: { ...boss.pos }, velocity: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
            radius: 80, color: '#7f1d1d', hp: 999, maxHp: 999, damage: 40, duration: 60, rotation: angle
        });
    } 
    // Attack 2: Summon Spirits (Circular)
    else if (roll < 0.7) {
        addFloatingText("醒来!", boss.pos.x, boss.pos.y - 80, '#581c87', 2.0);
        const count = isPhase2 ? 12 : 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            projectiles.push({
                id: Math.random().toString(), type: 'projectile', owner: 'enemy',
                projectileType: 'BULLET',
                pos: { x: boss.pos.x, y: boss.pos.y }, 
                velocity: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 },
                radius: 8, color: '#581c87', hp: 1, maxHp: 1, damage: 15, duration: 120
            });
        }
    }
    // Attack 3: Shadow Dash (Phase 2 only)
    else if (isPhase2) {
        addFloatingText("瞬步!", boss.pos.x, boss.pos.y - 80, '#000', 2.0);
        // Teleport behind player
        for(let i=0; i<10; i++) {
             particles.push({ id: Math.random().toString(), type: 'particle', pos: {...boss.pos}, velocity: {x:(Math.random()-0.5)*5, y:(Math.random()-0.5)*5}, radius: 5, color: '#000', hp:0,maxHp:0,duration:20});
        }
        const angle = Math.random() * Math.PI * 2;
        boss.pos.x = player.pos.x + Math.cos(angle) * 150;
        boss.pos.y = player.pos.y + Math.sin(angle) * 150;
        audioManager.playDash();
    }
};

const performConstructAttack = (
    boss: Entity, player: Entity, projectiles: Entity[], particles: Entity[], 
    audioManager: AudioSystem, addFloatingText: any, triggerShake: any, isPhase2: boolean
) => {
    const roll = Math.random();

    // Attack 1: Laser Sweep
    if (roll < 0.5) {
        addFloatingText("歼灭模式", boss.pos.x, boss.pos.y - 80, '#38bdf8', 1.5);
        audioManager.playChargeReady();
        // 3 Beams rotating
        const beams = isPhase2 ? 4 : 2;
        const offset = Math.random() * Math.PI;
        for(let i=0; i<beams; i++) {
            const a = offset + (i/beams) * Math.PI * 2;
            projectiles.push({
                id: Math.random().toString(), type: 'projectile', owner: 'enemy',
                projectileType: 'BEAM', // Visual beam
                pos: { ...boss.pos }, velocity: { x: Math.cos(a)*2, y: Math.sin(a)*2 }, // Slow move for rotation sim? actually Beam logic needs update in render
                radius: 10, color: '#38bdf8', hp: 999, maxHp: 999, damage: 1, duration: 60
            });
            // Shoot actual damaging projectiles in that line
            for(let k=0; k<5; k++) {
                projectiles.push({
                    id: Math.random().toString(), type: 'projectile', owner: 'enemy',
                    projectileType: 'BULLET',
                    pos: { ...boss.pos }, velocity: { x: Math.cos(a)*(5+k*2), y: Math.sin(a)*(5+k*2) },
                    radius: 6, color: '#bae6fd', hp: 1, maxHp: 1, damage: 20, duration: 60
                });
            }
        }
    } 
    // Attack 2: Ice Wall / Barrage
    else {
        addFloatingText("核心过载", boss.pos.x, boss.pos.y - 80, '#fff', 1.5);
        const count = 16;
        for(let i=0; i<count; i++) {
            const angle = (i/count) * Math.PI * 2 + (Math.random()*0.2);
            const speed = 4 + Math.random() * 4;
            projectiles.push({
                id: Math.random().toString(), type: 'projectile', owner: 'enemy',
                projectileType: 'BLIZZARD', // Visual
                pos: { x: boss.pos.x, y: boss.pos.y }, 
                velocity: { x: Math.cos(angle)*speed, y: Math.sin(angle)*speed },
                radius: 15, color: '#e0f2fe', hp: 999, maxHp: 999, damage: 15, duration: 100
            });
        }
    }
};
