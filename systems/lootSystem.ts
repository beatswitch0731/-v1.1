
import { Entity, ItemType } from '../types';

export const spawnItem = (items: Entity[], pos: {x: number, y: number}) => {
    const rand = Math.random();
    if (rand > 0.4) {
        let itemType = ItemType.XP_CRYSTAL;
        let color = '#facc15';
        if (Math.random() > 0.95) {
            itemType = ItemType.HEALTH_POTION;
            color = '#ef4444';
        } else if (Math.random() > 0.95) {
            itemType = ItemType.COOLDOWN_ORB;
            color = '#38bdf8';
        }
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        
        items.push({
            id: Math.random().toString(),
            type: 'item',
            itemType: itemType,
            pos: { ...pos },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            z: 0,
            zVelocity: 6 + Math.random() * 2,
            radius: 12,
            color: color,
            hp: 0, maxHp: 0
        });
    }
};

export const updateItems = (
    items: Entity[], 
    player: Entity, 
    timeScale: number, 
    stats: any, 
    addFloatingText: any, 
    audioManager: any,
    now: number
) => {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        
        // Magnet effect
        const dx = player.pos.x - item.pos.x;
        const dy = player.pos.y - item.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
            const speed = 15 * (1 - dist / 150) + 2;
            item.velocity.x += (dx / dist) * speed * timeScale * 0.1;
            item.velocity.y += (dy / dist) * speed * timeScale * 0.1;
        }
        
        // Physics
        item.pos.x += item.velocity.x * timeScale;
        item.pos.y += item.velocity.y * timeScale;
        item.velocity.x *= 0.9;
        item.velocity.y *= 0.9;
        
        // Pickup
        if (dist < player.radius + item.radius) {
            if (item.itemType === 'HEALTH_POTION') {
                const heal = player.maxHp * 0.2;
                player.hp = Math.min(player.maxHp, player.hp + heal);
                stats.playerHp = player.hp;
                addFloatingText(`+${heal.toFixed(0)}`, player.pos.x, player.pos.y - 40, '#22c55e');
                audioManager.playUpgradeSelect();
            } else if (item.itemType === 'COOLDOWN_ORB') {
                addFloatingText("技能冷却缩减!", player.pos.x, player.pos.y - 40, '#38bdf8', 1.5);
                audioManager.playUpgradeSelect();
                if (player.cooldowns) {
                    for (const key in player.cooldowns) {
                        const readyTime = player.cooldowns[key];
                        const remaining = readyTime - now;
                        if (remaining > 0) {
                            player.cooldowns[key] = now + (remaining * 0.7);
                        }
                    }
                }
            } else {
                stats.xp += 20;
                addFloatingText("+20 XP", player.pos.x, player.pos.y - 40, '#facc15');
                audioManager.playUpgradeSelect();
            }
            items.splice(i, 1);
        }
    }
};
