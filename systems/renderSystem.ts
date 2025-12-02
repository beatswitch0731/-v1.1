
import { TILE_SIZE, INTERNAL_WIDTH, INTERNAL_HEIGHT, SPRITE_PALETTES, MAP_WIDTH, MAP_HEIGHT, IAIDO_CHARGE_FRAMES } from '../constants';
import { Entity, TileType, WeatherType, FloatingText, Decoration, DecorationType, MapType, CharacterClass, ShrineType, BossType, PropType, Vector2 } from '../types';

// Helper to draw rectangles
const r = (ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) => { 
    ctx.fillStyle = c; 
    ctx.fillRect(x, y, w, h); 
};

// ... (Keep existing treeCache and getCachedTree) ...
const treeCache: Map<string, HTMLCanvasElement> = new Map();
const getCachedTree = (palette: any, mapType: MapType): HTMLCanvasElement => {
    const key = `${palette.TREE_LIGHT}-${palette.TREE_DARK}-${palette.TREE_TRUNK}-${mapType}`;
    if (treeCache.has(key)) return treeCache.get(key)!;
    const canvas = document.createElement('canvas'); const size = 120; canvas.width = size; canvas.height = size; const ctx = canvas.getContext('2d')!; const cx = size / 2; const cy = size - 20; const scale = 1.0;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 18 * scale, 6 * scale, 0, 0, Math.PI*2); ctx.fill();
    const trunkColor = palette.TREE_TRUNK || '#365314'; ctx.fillStyle = trunkColor; ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 15, cy + 12); ctx.lineTo(cx - 4, cy + 10); ctx.lineTo(cx, cy); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 15, cy + 12); ctx.lineTo(cx + 4, cy + 10); ctx.lineTo(cx, cy); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 14); ctx.lineTo(cx + 3, cy + 10); ctx.lineTo(cx, cy); ctx.fill(); ctx.fillRect(cx - 5 * scale, cy - 20 * scale, 10 * scale, 25 * scale);
    ctx.fillStyle = palette.GRASS_LIGHT || '#65a30d'; ctx.globalAlpha = 0.3; ctx.fillRect(cx - 4, cy - 10, 3, 4); ctx.fillRect(cx + 2, cy - 15, 2, 3); ctx.globalAlpha = 1.0;
    const leafColor = palette.TREE_LIGHT || '#65a30d'; const leafDark = palette.TREE_DARK || '#1e293b';
    ctx.fillStyle = leafDark; ctx.beginPath(); ctx.arc(cx, cy - 25 * scale, 22 * scale, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = leafColor; ctx.beginPath(); ctx.arc(cx, cy - 35 * scale, 18 * scale, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = leafColor; ctx.filter = 'brightness(1.1)'; ctx.beginPath(); ctx.arc(cx, cy - 42 * scale, 14 * scale, 0, Math.PI*2); ctx.fill(); ctx.filter = 'none';
    if (mapType === MapType.ICE_WORLD) { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(cx, cy - 42 * scale, 8 * scale, 0, Math.PI*2); ctx.fill(); }
    treeCache.set(key, canvas); return canvas;
};

export const drawMountain = (ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, palette: any) => {
    const heightVar = (seed * 100) % 15; const widthVar = (seed * 50) % 10; const offsetX = (seed * 20) % 10 - 5; const offsetY = (seed * 20) % 10 - 5;
    const baseX = x - 5 + offsetX; const baseY = y + 10 + offsetY; const w = TILE_SIZE + 10 + widthVar; const h = TILE_SIZE + 20 + heightVar; const peakX = baseX + w / 2; const peakY = baseY - h;
    ctx.fillStyle = palette.MOUNTAIN_SHADOW; ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(peakX, peakY); ctx.lineTo(peakX, baseY + 5); ctx.fill();
    ctx.fillStyle = palette.MOUNTAIN_LIGHT; ctx.beginPath(); ctx.moveTo(peakX, peakY); ctx.lineTo(baseX + w, baseY); ctx.lineTo(peakX, baseY + 5); ctx.fill();
    ctx.fillStyle = palette.MOUNTAIN_HIGHLIGHT; ctx.beginPath(); ctx.moveTo(peakX, peakY); ctx.lineTo(peakX + w * 0.25, peakY + h * 0.25); ctx.lineTo(peakX, peakY + h * 0.2); ctx.lineTo(peakX - w * 0.25, peakY + h * 0.25); ctx.fill();
    ctx.fillStyle = palette.MOUNTAIN_SHADOW; ctx.beginPath(); ctx.arc(baseX + 5, baseY - 2, 4, 0, Math.PI*2); ctx.arc(baseX + w - 8, baseY - 3, 5, 0, Math.PI*2); ctx.fill();
};

const drawBossAltar = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number, active: boolean) => {
    ctx.translate(x, y);
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.ellipse(0, 15, 30, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.fillRect(-20, -10, 40, 20);
    ctx.fillStyle = '#475569'; ctx.fillRect(-20, -30, 8, 30); ctx.fillRect(12, -30, 8, 30);
    const hover = Math.sin(time * 0.05) * 4; ctx.translate(0, hover - 25);
    if (active) {
        const pulse = 1 + Math.sin(time * 0.1) * 0.2; ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.fill(); ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(-5, 5, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -5, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.translate(0, -(hover - 25)); ctx.translate(-x, -y);
};

// NEW: Draw Dock Decoration
const drawDock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.translate(x, y);
    
    // Wooden Planks
    ctx.fillStyle = '#78350f'; // Dark wood
    ctx.fillRect(-20, -20, 40, 40); // Main platform
    
    // Plank details
    ctx.fillStyle = '#92400e'; 
    ctx.fillRect(-18, -20, 4, 40);
    ctx.fillRect(-8, -20, 4, 40);
    ctx.fillRect(2, -20, 4, 40);
    ctx.fillRect(12, -20, 4, 40);
    
    // Posts
    ctx.fillStyle = '#451a03';
    ctx.beginPath(); ctx.arc(-20, -20, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -20, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, 20, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI*2); ctx.fill();
    
    ctx.translate(-x, -y);
};

export const drawTileDetail = (ctx: CanvasRenderingContext2D, x: number, y: number, tile: TileType, seed: number, decoration: Decoration, palette: any, time: number, puddles: {x: number, y: number, w: number, h: number}[], weather: WeatherType) => {
    const px = x * TILE_SIZE; const py = y * TILE_SIZE;
    if (tile === TileType.WATER) { ctx.fillStyle = palette.WATER; ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1); if (seed > 0.7) { const offset = Math.sin(time * 0.05 + x + y) * 3; ctx.fillStyle = palette.WATER_LIGHT; ctx.fillRect(px + 10, py + 10 + offset, 15, 2); } }
    else if (tile === TileType.MOUNTAIN) { ctx.fillStyle = palette.MOUNTAIN; ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1); drawMountain(ctx, px, py, seed, palette); }
    else if (tile === TileType.GRASS || tile === TileType.SNOW || tile === TileType.SAND) {
        ctx.fillStyle = palette.GRASS; if (tile === TileType.SNOW) ctx.fillStyle = palette.GRASS; if (tile === TileType.SAND) ctx.fillStyle = palette.GRASS; ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1);
        const variantIndex = Math.floor(seed * palette.GRASS_VARIANTS.length); ctx.fillStyle = palette.GRASS_VARIANTS[variantIndex]; ctx.globalAlpha = 0.4; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.globalAlpha = 1.0;
        if (tile === TileType.GRASS) {
             const density = 2 + Math.floor((seed * 100) % 4); for(let i=0; i<density; i++) { const localSeed = ((seed * 13) + (i * 7.1)) % 1; const ox = 4 + Math.floor(localSeed * (TILE_SIZE - 8)); const oy = 4 + Math.floor(((localSeed * 10) % 1) * (TILE_SIZE - 8)); if (localSeed > 0.85) { ctx.fillStyle = palette.PEBBLE || '#78716c'; const size = 2; ctx.fillRect(px + ox, py + oy, size, size - 1); } else { ctx.fillStyle = (i % 2 === 0) ? palette.GRASS_LIGHT : palette.GRASS_SHADOW; ctx.globalAlpha = 0.6; const h = 3 + Math.floor(localSeed * 3); ctx.fillRect(px + ox, py + oy, 1, h); if (localSeed < 0.4) { ctx.fillRect(px + ox + 2, py + oy + 1, 1, h - 2); ctx.fillRect(px + ox - 2, py + oy + 1, 1, h - 2); } ctx.globalAlpha = 1.0; } }
             if (palette.LEAF_VARIANTS && palette.LEAF_VARIANTS.length > 0) { const leafCount = Math.floor((seed * 100) % 3); for (let k = 0; k < leafCount; k++) { const lx = px + ((seed * (k+1) * 37) % (TILE_SIZE - 6)); const ly = py + ((seed * (k+1) * 53) % (TILE_SIZE - 6)); const colorIdx = Math.floor((seed * (k+1) * 10) % palette.LEAF_VARIANTS.length); ctx.fillStyle = palette.LEAF_VARIANTS[colorIdx]; ctx.fillRect(lx, ly, 3, 2); } }
             if (palette.FLOWER_VARIANTS && palette.FLOWER_VARIANTS.length > 0) { if ((seed * 100) % 20 < 1) { const fx = px + ((seed * 99) % (TILE_SIZE - 6)); const fy = py + ((seed * 77) % (TILE_SIZE - 6)); const colorIdx = Math.floor((seed * 44) % palette.FLOWER_VARIANTS.length); ctx.fillStyle = palette.FLOWER_VARIANTS[colorIdx]; ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill(); } }
             const seamBlades = 3; for (let j=0; j<seamBlades; j++) { const localSeed = ((seed * 17) + (j * 9.3)) % 1; const ox = Math.floor(localSeed * TILE_SIZE); const oy = -3 - Math.floor(localSeed * 4); ctx.fillStyle = palette.GRASS; ctx.globalAlpha = 0.8; ctx.fillRect(px + ox, py + oy, 2, 6); } ctx.globalAlpha = 1.0;
        } else if (tile === TileType.SNOW) { if (seed > 0.5) { const ox = 5 + (seed * 20) % (TILE_SIZE - 10); const oy = 5 + (seed * 40) % (TILE_SIZE - 10); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.4 + Math.sin(time * 0.1 + seed * 10) * 0.2; ctx.fillRect(px + ox, py + oy, 2, 2); ctx.globalAlpha = 1.0; } }
        
        if (decoration && decoration.type) {
            const dx = px + decoration.x; const dy = py + decoration.y;
            if (decoration.type === DecorationType.BOSS_ALTAR) {
                drawBossAltar(ctx, dx, dy, time, !!decoration.active);
            }
            else if (decoration.type === DecorationType.DOCK) {
                drawDock(ctx, dx, dy);
            }
            else if (decoration.type === DecorationType.GRASS_TUFT) { ctx.fillStyle = palette.GRASS_SHADOW; ctx.fillRect(dx, dy, 4, 3); ctx.fillStyle = palette.GRASS_LIGHT; ctx.fillRect(dx + 1, dy - 2, 2, 4); }
            else if (decoration.type === DecorationType.FLOWER_RED || decoration.type === DecorationType.FLOWER_YELLOW) { ctx.fillStyle = palette.GRASS_LIGHT; ctx.fillRect(dx, dy, 2, 4); ctx.fillStyle = decoration.type === DecorationType.FLOWER_RED ? '#ef4444' : '#facc15'; ctx.beginPath(); ctx.arc(dx + 1, dy, 2.5 * decoration.scale, 0, Math.PI*2); ctx.fill(); }
            else if (decoration.type === DecorationType.PEBBLE) { ctx.fillStyle = palette.PEBBLE || '#78716c'; ctx.beginPath(); ctx.arc(dx, dy, 3 * decoration.scale, 0, Math.PI*2); ctx.fill(); }
            else if (decoration.type === DecorationType.ROCK) { ctx.fillStyle = palette.PEBBLE || '#78716c'; ctx.beginPath(); ctx.arc(dx, dy, 6 * decoration.scale, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = palette.DIRT_LIGHT; ctx.beginPath(); ctx.arc(dx-2, dy-2, 3 * decoration.scale, 0, Math.PI*2); ctx.fill(); }
        }
        if (weather === WeatherType.RAIN) { for (const p of puddles) { if (p.x >= px && p.x < px + TILE_SIZE && p.y >= py && p.y < py + TILE_SIZE) { ctx.fillStyle = palette.WATER; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.w/2, p.h/2, 0, 0, Math.PI*2); ctx.fill(); } } }
    } else if (tile === TileType.ICE) { ctx.fillStyle = palette.GRASS; ctx.fillRect(px, py, TILE_SIZE + 1, TILE_SIZE + 1); if (seed > 0.5) { ctx.fillStyle = palette.GRASS_SHADOW; ctx.fillRect(px + 5, py + 5, 10, 2); } }
};

export const drawDetailedTree = (ctx: CanvasRenderingContext2D, t: Entity, palette: any, time: number, mapType: MapType) => {
    const cachedCanvas = getCachedTree(palette, mapType); const sway = Math.sin(time * 0.05 + t.pos.x * 0.1) * 3; const scale = t.scale || 1;
    ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.translate(sway, 0); ctx.scale(scale, scale); ctx.drawImage(cachedCanvas, -60, -100); ctx.restore();
};

export const drawShrine = (ctx: CanvasRenderingContext2D, s: Entity, time: number) => {
    ctx.save(); ctx.translate(s.pos.x, s.pos.y);
    const glow = Math.sin(time * 0.1) * 5; ctx.shadowBlur = 15 + glow; ctx.shadowColor = s.color;
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.ellipse(0, 10, 25, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#334155'; ctx.fillRect(-10, -30, 20, 40);
    ctx.fillStyle = s.color; const hover = Math.sin(time * 0.05) * 4; ctx.translate(0, hover);
    if (s.shrineType === ShrineType.LEGENDARY) {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(15, -20); ctx.lineTo(-15, -20); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -35, 5, 0, Math.PI*2); ctx.fill();
    }
    else if (s.shrineType === ShrineType.BLOOD) { ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(10, -40); ctx.lineTo(0, -30); ctx.lineTo(-10, -40); ctx.fill(); } 
    else if (s.shrineType === ShrineType.HEAL) { ctx.fillRect(-4, -50, 8, 20); ctx.fillRect(-10, -44, 20, 8); } 
    else { ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -40, 12, 0, Math.PI*2); ctx.stroke(); }
    ctx.restore();
};

export const drawElectroBlast = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const maxDur = 25; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); const r = p.radius + (progress * 80); ctx.lineWidth = 4 * (1-progress); ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2 * (1-progress); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI*2); ctx.stroke(); if (progress < 0.3) { ctx.fillStyle = '#bae6fd'; ctx.globalAlpha = 0.8 * (1 - progress * 3); ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI*2); ctx.fill(); } ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2; ctx.globalAlpha = 1.0 - progress; const arcs = 6; for(let i=0; i<arcs; i++) { const angle = (i/arcs) * Math.PI*2 + time * 0.5; ctx.beginPath(); ctx.moveTo(0,0); const midX = Math.cos(angle) * r * 0.5 + (Math.random()-0.5)*10; const midY = Math.sin(angle) * r * 0.5 + (Math.random()-0.5)*10; const endX = Math.cos(angle) * r; const endY = Math.sin(angle) * r; ctx.lineTo(midX, midY); ctx.lineTo(endX, endY); ctx.stroke(); } ctx.restore(); };
export const drawTeslaDetonation = (ctx: CanvasRenderingContext2D, p: Entity) => { const maxDur = 30; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); const r = p.radius + (progress * 150); ctx.globalAlpha = 1 - progress; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 10 * (1 - progress); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; const sparks = 12; for(let i=0; i<sparks; i++) { const angle = (i / sparks) * Math.PI * 2 + Math.random(); const dist = r * 0.8; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist); ctx.stroke(); } ctx.restore(); };
export const drawDetailedBullet = (ctx: CanvasRenderingContext2D, p: Entity) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const angle = Math.atan2(p.velocity.y, p.velocity.x); ctx.rotate(angle); const casingColor = '#facc15'; const rimColor = '#854d0e'; const warheadColor = '#cbd5e1'; const highlight = 'rgba(255,255,255,0.7)'; const glowColor = p.color; ctx.shadowBlur = 10; ctx.shadowColor = glowColor; ctx.fillStyle = casingColor; ctx.fillRect(-6, -3, 8, 6); ctx.fillStyle = rimColor; ctx.fillRect(-8, -3, 2, 6); ctx.fillStyle = warheadColor; ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(6, -2); ctx.lineTo(8, 0); ctx.lineTo(6, 2); ctx.lineTo(2, 3); ctx.fill(); ctx.fillStyle = highlight; ctx.fillRect(-6, -1, 10, 1); ctx.shadowBlur = 0; ctx.restore(); };
export const drawElectroLasso = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const t = time; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.fillStyle = '#0ea5e9'; ctx.shadowBlur = 20; ctx.shadowColor = '#0ea5e9'; ctx.beginPath(); ctx.arc(0,0, 10, 0, Math.PI*2); ctx.fill(); ctx.rotate(t * 0.5); ctx.fillStyle = '#facc15'; ctx.fillRect(-4, -15, 8, 30); ctx.fillRect(-15, -4, 30, 8); ctx.restore(); };
export const drawMagneticField = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const r = p.radius; const pulse = 0.5 + Math.sin(time * 0.2) * 0.2; const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r); grad.addColorStop(0, 'rgba(34, 211, 238, 0)'); grad.addColorStop(0.7, `rgba(6, 182, 212, ${0.1 + pulse * 0.1})`); grad.addColorStop(1, `rgba(250, 204, 21, ${0.3 + pulse * 0.2})`); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.rotate(time * 0.05); ctx.shadowBlur = 15; ctx.shadowColor = '#22d3ee'; ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 6; ctx.setLineDash([15, 10]); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.rotate(time * -0.15); ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); const segments = 5; ctx.strokeStyle = 'rgba(165, 243, 252, 0.5)'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.shadowBlur = 5; ctx.shadowColor = '#67e8f9'; for (let i = 0; i < segments; i++) { const angle = (time * 0.1) + (i / segments) * Math.PI * 2; const startX = Math.cos(angle) * r; const startY = Math.sin(angle) * r; const jitterX = (Math.random() - 0.5) * 30; const jitterY = (Math.random() - 0.5) * 30; ctx.beginPath(); ctx.moveTo(startX, startY); const midX = (startX + jitterX) / 2 + (Math.random() - 0.5) * 20; const midY = (startY + jitterY) / 2 + (Math.random() - 0.5) * 20; ctx.lineTo(midX, midY); ctx.lineTo(jitterX, jitterY); ctx.stroke(); } ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.arc(0, 0, 10 + Math.random() * 5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
export const drawTNTBarrel = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const distTraveled = Math.hypot(p.velocity.x, p.velocity.y) * time; ctx.rotate(distTraveled * 0.05); ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke(); ctx.translate(0, -16); ctx.fillStyle = '#ef4444'; if (Math.random() > 0.5) ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill(); ctx.restore(); };
export const drawHighNoonTarget = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y - p.radius - 20); const scale = 1.0 + Math.sin(time * 0.2) * 0.2; ctx.scale(scale, scale); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-4, 2); ctx.moveTo(4, -2); ctx.lineTo(4, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -5); ctx.moveTo(0, 5); ctx.lineTo(0, 15); ctx.moveTo(-15, 0); ctx.lineTo(-5, 0); ctx.moveTo(5, 0); ctx.lineTo(15, 0); ctx.stroke(); ctx.restore(); };
export const drawHighNoonImpact = (ctx: CanvasRenderingContext2D, p: Entity) => { const maxDur = 10; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.fillStyle = '#facc15'; ctx.globalAlpha = Math.max(0, 1 - progress * 1.5); ctx.beginPath(); ctx.arc(0, 0, 60 * progress, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = Math.max(0, 1 - progress); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; const cracks = 8; for(let i=0; i<cracks; i++) { const angle = (i / cracks) * Math.PI * 2; const dist = 30 + progress * 20; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(angle)*dist*0.5 + (Math.random()-0.5)*10, Math.sin(angle)*dist*0.5 + (Math.random()-0.5)*10); ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist); ctx.stroke(); } ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4 * (1-progress); ctx.beginPath(); ctx.arc(0, 0, 40 + progress * 40, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
export const drawMuzzleFlash = (ctx: CanvasRenderingContext2D, p: Entity) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const size = p.radius; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, size * 0.4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(0, 0, size * 0.7, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.globalAlpha = 0.6; const spikes = 5; ctx.beginPath(); for(let i=0; i<spikes*2; i++) { const a = (i / (spikes*2)) * Math.PI*2; const r = (i % 2 === 0) ? size : size * 0.5; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.fill(); ctx.restore(); };
export const drawVoidSlash = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const maxDur = 45; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation || 0); const w = p.radius * (1 + progress); const h = 40 * (1 - progress * 0.5); ctx.fillStyle = 'rgba(0,0,0,0.6)'; const trails = 8; for(let i=0; i<trails; i++) { const offset = -i * 15 * progress; const spread = (Math.random()-0.5) * w; const size = Math.random() * 10 + 5; ctx.fillRect(offset - 20, spread, size, size); } ctx.shadowBlur = 20; ctx.shadowColor = '#22d3ee'; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-10, -w/2); ctx.quadraticCurveTo(10, 0, -10, w/2); ctx.quadraticCurveTo(30, 0, -10, -w/2); ctx.fill(); ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -w/2); ctx.lineTo(20 + Math.random()*10, 0); ctx.lineTo(-10, w/2); ctx.stroke(); ctx.restore(); };
export const drawInkSlash = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const maxDur = 25; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation || 0); const r = p.radius * (0.8 + progress * 0.2); ctx.fillStyle = '#000000'; ctx.beginPath(); const points = 30; for(let i=0; i<=points; i++) { const a = (i/points) * Math.PI * 2; const offset = Math.sin(a * 10 + time * 0.5) * 10; ctx.lineTo(Math.cos(a) * (r + offset), Math.sin(a) * (r + offset)); } ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * (1 - progress); ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.lineTo(r * 1.2, 0); ctx.stroke(); ctx.fillStyle = '#1e293b'; for(let i=0; i<8; i++) { const a = Math.random() * Math.PI * 2; const d = r + Math.random() * 30; const s = 4 + Math.random() * 6; ctx.fillRect(Math.cos(a)*d, Math.sin(a)*d, s, s); } ctx.restore(); };
export const drawElementalSword = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation || 0); const length = 40; const width = 8; const element = p.element || 'METAL'; const drawHandle = (color: string, guardColor: string, gripColor: string) => { ctx.fillStyle = guardColor; ctx.beginPath(); ctx.moveTo(-width, 0); ctx.lineTo(width, 0); ctx.lineTo(0, 4); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(-2, 2, 4, 12); ctx.fillStyle = gripColor; ctx.fillRect(-2, 5, 4, 1); ctx.fillRect(-2, 9, 4, 1); ctx.fillStyle = guardColor; ctx.beginPath(); ctx.arc(0, 14, 3, 0, Math.PI*2); ctx.fill(); }; if (element === 'METAL') { ctx.shadowBlur = 10; ctx.shadowColor = '#facc15'; drawHandle('#e2e8f0', '#facc15', '#94a3b8'); const grad = ctx.createLinearGradient(0, -length, 0, 0); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#e2e8f0'); grad.addColorStop(1, '#94a3b8'); ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, -length); ctx.lineTo(width, 0); ctx.lineTo(0, 5); ctx.lineTo(-width, 0); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.fillRect(-1, -length * 0.8, 2, length * 0.8); if (Math.floor(time * 0.2) % 10 === 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -length * 0.8, 3, 0, Math.PI*2); ctx.fill(); } } else if (element === 'WOOD') { ctx.shadowBlur = 5; ctx.shadowColor = '#22c55e'; ctx.fillStyle = '#78350f'; ctx.fillRect(-2, 0, 4, 14); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(-5, 2, 4, 8, Math.PI/4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, 2, 4, 8, -Math.PI/4, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(width, -10, 0, -length); ctx.quadraticCurveTo(-width, -10, 0, 0); ctx.stroke(); ctx.fillStyle = '#4ade80'; ctx.fill(); ctx.fillStyle = '#facc15'; for(let i=0; i<3; i++) { ctx.beginPath(); ctx.moveTo(width, -10 -i*10); ctx.lineTo(width+4, -10 -i*10 - 2); ctx.lineTo(width, -10 -i*10 - 4); ctx.fill(); } ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(0, -length/2, 4, 8, Math.PI/4, 0, Math.PI*2); ctx.fill(); } else if (element === 'WATER') { ctx.shadowBlur = 8; ctx.shadowColor = '#38bdf8'; drawHandle('#0c4a6e', '#38bdf8', '#0ea5e9'); ctx.fillStyle = 'rgba(56, 189, 248, 0.8)'; ctx.beginPath(); ctx.moveTo(0, -length); for(let y = -length; y < 0; y+=5) { const wave = Math.sin(y * 0.3 + time * 0.2) * 3; ctx.lineTo(width + wave, y); } ctx.lineTo(0, 5); for(let y = 0; y > -length; y-=5) { const wave = Math.sin(y * 0.3 + time * 0.2) * 3; ctx.lineTo(-width + wave, y); } ctx.fill(); ctx.fillStyle = '#fff'; if (Math.random() > 0.8) { ctx.beginPath(); ctx.arc((Math.random()-0.5)*10, -length/2 + (Math.random()-0.5)*20, 2, 0, Math.PI*2); ctx.fill(); } } else if (element === 'FIRE') { ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444'; drawHandle('#1c1917', '#7f1d1d', '#b91c1c'); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(0, -length); ctx.lineTo(width * 1.5, 0); ctx.lineTo(0, 5); ctx.lineTo(-width * 1.5, 0); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); const flick = Math.sin(time * 0.5) * 2; ctx.moveTo(0, -length - 5 + flick); ctx.lineTo(width, -length/2); ctx.lineTo(width + flick, 0); ctx.lineTo(0, 5); ctx.lineTo(-width - flick, 0); ctx.lineTo(-width, -length/2); ctx.fill(); ctx.fillStyle = '#fef08a'; ctx.fillRect(-2, -length/2, 4, length/2); } else if (element === 'EARTH') { ctx.shadowBlur = 5; ctx.shadowColor = '#000'; drawHandle('#78350f', '#92400e', '#573010'); ctx.fillStyle = '#78350f'; ctx.fillRect(-width, -length, width * 2, length); ctx.fillStyle = '#b45309'; ctx.fillRect(-width + 2, -length + 2, width * 2 - 4, length - 4); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-width + 4, -length + 10); ctx.lineTo(0, -length + 20); ctx.lineTo(-2, -length + 25); ctx.stroke(); } ctx.restore(); };
export const drawWindDragon = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { if (!p.trail) p.trail = []; p.trail.unshift({x: p.pos.x, y: p.pos.y}); if (p.trail.length > 30) p.trail.pop(); ctx.save(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = p.radius; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (p.trail.length > 2) { ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y); for(let i=1; i<p.trail.length; i++) { const point = p.trail[i]; const size = p.radius * (1 - i/p.trail.length); ctx.lineWidth = size; ctx.lineTo(point.x, point.y); if (i % 3 === 0) { ctx.save(); ctx.translate(point.x, point.y); ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, Math.PI*2); ctx.fill(); ctx.restore(); } } ctx.shadowBlur = 15; ctx.shadowColor = '#22c55e'; ctx.stroke(); ctx.shadowBlur = 0; } ctx.translate(p.pos.x, p.pos.y); const angle = Math.atan2(p.velocity.y, p.velocity.x); ctx.rotate(angle); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -15); ctx.lineTo(-5, 0); ctx.lineTo(-10, 15); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI*2); ctx.arc(5, 5, 2, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#ecfccb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 5); ctx.quadraticCurveTo(20, 10, 5, 20); ctx.moveTo(10, -5); ctx.quadraticCurveTo(20, -10, 5, -20); ctx.stroke(); ctx.restore(); };
export const drawSlash = (ctx: CanvasRenderingContext2D, p: Entity, isProjectile: boolean = false) => { const maxDur = p.maxDuration || 15; const isBlood = p.color === '#ef4444'; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation || 0); if (isProjectile) { const r = p.radius || 60; const arcLength = Math.PI / 3; const steps = 30; ctx.fillStyle = isBlood ? '#fca5a5' : '#fff'; for(let i=0; i<steps; i++) { const angle = -arcLength/2 + (i/steps)*arcLength; const x = Math.cos(angle) * r; const y = Math.sin(angle) * r; ctx.fillRect(x, y, 4, 6); } ctx.fillStyle = isBlood ? '#7f1d1d' : '#000'; for(let j=0; j<3; j++) { const layerR = r - (j * 5 + 5); for(let i=0; i<steps; i++) { if(Math.random() > 0.8) continue; const angle = -arcLength/2 + (i/steps)*arcLength; const x = Math.cos(angle) * layerR; const y = Math.sin(angle) * layerR; const size = 4 + Math.random() * 4; ctx.fillRect(x - size/2, y - size/2, size, size); } } if (Math.random() > 0.3) { const angle = -arcLength/2 + Math.random()*arcLength; const dist = r - Math.random() * 30; const size = 2 + Math.random() * 3; ctx.fillStyle = isBlood ? '#ef4444' : (Math.random() > 0.6 ? '#000' : 'rgba(0,0,0,0.5)'); ctx.fillRect(Math.cos(angle)*dist - 10 - Math.random()*40, Math.sin(angle)*dist, size, size); } } else { if (p.alpha) ctx.globalAlpha = p.alpha; const progress = 1 - (p.duration! / maxDur); const swingProgress = 1 - Math.pow(1 - progress, 3); const totalArc = Math.PI / 2; const startAngle = -totalArc / 2; const endAngle = totalArc / 2; const currentEndAngle = startAngle + (endAngle - startAngle) * swingProgress; const r = p.radius; const drawKatana = (angle: number, alpha: number, type: 'SHADOW' | 'NORMAL' | 'GHOST') => { ctx.save(); ctx.rotate(angle); ctx.globalAlpha = alpha; const handleOffset = 10; const hiltLen = 20; const guardPos = handleOffset + hiltLen; const bladeLen = r - guardPos - 15; if (type === 'SHADOW') { ctx.fillStyle = isBlood ? 'rgba(50, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(guardPos + 2, -2, bladeLen, 6); ctx.fillRect(handleOffset, -3, hiltLen, 6); } else if (type === 'GHOST') { const grad = ctx.createLinearGradient(guardPos, 0, guardPos + bladeLen, 0); if (isBlood) { grad.addColorStop(0, 'rgba(239, 68, 68, 0)'); grad.addColorStop(0.1, 'rgba(239, 68, 68, 0.3)'); grad.addColorStop(0.5, 'rgba(255, 200, 200, 0.1)'); grad.addColorStop(1, 'rgba(239, 68, 68, 0)'); } else { grad.addColorStop(0, 'rgba(255, 255, 255, 0)'); grad.addColorStop(0.1, 'rgba(186, 230, 253, 0.3)'); grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)'); grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); } ctx.fillStyle = grad; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(guardPos + 5, -2); ctx.lineTo(guardPos + bladeLen, -4); ctx.lineTo(guardPos + bladeLen + 15, 0); ctx.lineTo(guardPos + bladeLen, 4); ctx.lineTo(guardPos + 5, 2); ctx.fill(); } else { ctx.fillStyle = '#e2e8f0'; ctx.fillRect(handleOffset, -3, hiltLen, 6); ctx.fillStyle = '#0f172a'; for(let k=0; k<4; k++) { const hx = handleOffset + 2 + k*5; ctx.beginPath(); ctx.moveTo(hx, -3); ctx.lineTo(hx+2, 3); ctx.lineTo(hx+3, 3); ctx.lineTo(hx+1, -3); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx, 3); ctx.lineTo(hx+2, -3); ctx.lineTo(hx+3, -3); ctx.lineTo(hx+1, 3); ctx.fill(); } ctx.fillStyle = '#f59e0b'; ctx.fillRect(handleOffset - 2, -3, 2, 6); ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.ellipse(guardPos, 0, 3, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.ellipse(guardPos, 0, 1.5, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#b45309'; ctx.fillRect(guardPos + 1, -2, 4, 4); const grad = ctx.createLinearGradient(0, -5, 0, 5); if (isBlood) { grad.addColorStop(0, '#7f1d1d'); grad.addColorStop(0.5, '#ef4444'); grad.addColorStop(1, '#7f1d1d'); } else { grad.addColorStop(0, '#94a3b8'); grad.addColorStop(0.3, '#cbd5e1'); grad.addColorStop(0.5, '#f8fafc'); grad.addColorStop(0.6, '#e2e8f0'); grad.addColorStop(1, '#ffffff'); } ctx.fillStyle = grad; const bStart = guardPos + 5; ctx.beginPath(); ctx.moveTo(bStart, -2); ctx.lineTo(bStart + bladeLen, -1); ctx.lineTo(bStart + bladeLen + 8, 0); ctx.lineTo(bStart + bladeLen, 3); ctx.lineTo(bStart, 3); ctx.fill(); ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; for(let k=0; k<bladeLen; k+=3) { const wave = (k % 6 === 0) ? 1 : 0; ctx.fillRect(bStart + k, 1 + wave, 2, 1); } const glintPos = (swingProgress * 2) % 1.5; if (glintPos < 1.0) { const glintX = bStart + bladeLen * glintPos; ctx.save(); ctx.beginPath(); ctx.rect(bStart, -3, bladeLen, 8); ctx.clip(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 3; ctx.shadowBlur = 5; ctx.shadowColor = 'white'; ctx.beginPath(); ctx.moveTo(glintX, -5); ctx.lineTo(glintX - 15, 5); ctx.stroke(); ctx.restore(); } if (swingProgress < 0.8) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bStart + 10, -12, bladeLen * 0.6, 1); ctx.fillRect(bStart + 20, 10, bladeLen * 0.4, 1); } } ctx.restore(); }; for(let i=1; i<=5; i++) { const lag = i * 0.05; const shadowAngle = currentEndAngle - lag; if (shadowAngle < startAngle) continue; const shadowAlpha = (1 - swingProgress) * 0.3 * (1 - i/6); drawKatana(shadowAngle, shadowAlpha, 'SHADOW'); } if (swingProgress > 0.1 && swingProgress < 0.95) { for(let i=1; i<=3; i++) { const ghostAngle = currentEndAngle - (i * 0.06); if (ghostAngle > startAngle) { drawKatana(ghostAngle, 0.4 - (i * 0.1), 'GHOST'); } } } const steps = 120; const stepSize = (currentEndAngle - startAngle) / steps; for (let i = 0; i < steps; i++) { const angle = startAngle + i * stepSize; if (angle > currentEndAngle) continue; const globalPos = i / steps; const distFromTip = Math.abs(currentEndAngle - angle); let baseColor; if (isBlood) { if (distFromTip < 0.15) baseColor = '#fff'; else if (distFromTip < 0.35) baseColor = '#ef4444'; else baseColor = '#450a0a'; } else { if (distFromTip < 0.15) { baseColor = '#ffffff'; } else if (distFromTip < 0.35) { baseColor = Math.random() > 0.3 ? '#e2e8f0' : '#bae6fd'; } else { baseColor = '#000000'; } } let thickness = Math.sin(globalPos * Math.PI) * 50; if (thickness < 2) thickness = 2; if (Math.random() > 0.92) continue; const cx = Math.cos(angle) * r; const cy = Math.sin(angle) * r; const px = Math.cos(angle + Math.PI / 2); const py = Math.sin(angle + Math.PI / 2); const bleedWidth = thickness + 20; ctx.fillStyle = baseColor; ctx.globalAlpha = p.alpha ?? 0.7; for (let j = 0; j < 6; j++) { const offset = (Math.random() - 0.5) * bleedWidth; const size = Math.random() * 4 + 1; const jitterX = (Math.random() - 0.5) * 4; const jitterY = (Math.random() - 0.5) * 4; ctx.fillRect(cx + px * offset + jitterX, cy + py * offset + jitterY, size, size); } if (distFromTip < 0.3) ctx.fillStyle = '#ffffff'; else ctx.fillStyle = baseColor; ctx.globalAlpha = 1.0; for (let j = 0; j < 3; j++) { const offset = (Math.random() - 0.5) * thickness; ctx.fillRect(cx + px * offset, cy + py * offset, 2, 2); } if (Math.random() > 0.9) { const sprayDist = bleedWidth * 0.8 + Math.random() * 20; const sprayOffset = (Math.random() > 0.5 ? 1 : -1) * sprayDist; ctx.fillStyle = isBlood ? '#7f1d1d' : '#000000'; ctx.globalAlpha = 0.6; ctx.fillRect(cx + px * sprayOffset, cy + py * sprayOffset, 2, 2); } } let mainSwordAlpha = 1.0; if (swingProgress > 0.4) { mainSwordAlpha = Math.max(0, 1.0 - Math.pow((swingProgress - 0.4) * 1.6, 2)); } drawKatana(currentEndAngle, mainSwordAlpha, 'NORMAL'); if (swingProgress > 0.1 && swingProgress < 0.8) { const speedFactor = Math.sin(swingProgress * Math.PI); const shakeCount = Math.floor(speedFactor * 12) + 3; for(let k=0; k < shakeCount; k++) { const distAlongBlade = 20 + Math.random() * (r - 20); const particleX = Math.cos(currentEndAngle) * distAlongBlade; const particleY = Math.sin(currentEndAngle) * distAlongBlade; const tangent = currentEndAngle + Math.PI/2; const jitterAmt = (Math.random() - 0.5) * 40 * speedFactor; const lagAmt = -Math.random() * 30 * speedFactor; const px = particleX + Math.cos(tangent) * jitterAmt + Math.cos(currentEndAngle) * lagAmt; const py = particleY + Math.sin(tangent) * jitterAmt + Math.sin(currentEndAngle) * lagAmt; const size = Math.random() * 3 + 1; let pColor = Math.random() > 0.6 ? '#000000' : '#ffffff'; if (isBlood) pColor = Math.random() > 0.6 ? '#7f1d1d' : '#ef4444'; ctx.fillStyle = pColor; ctx.globalAlpha = Math.random() * 0.8 + 0.2; ctx.fillRect(px, py, size, size); } } if (swingProgress < 0.9) { const tipAngle = currentEndAngle; const tipX = Math.cos(tipAngle) * r; const tipY = Math.sin(tipAngle) * r; ctx.fillStyle = isBlood ? '#450a0a' : '#000'; for(let k=0; k<4; k++) { if(Math.random() > 0.4) { const scatterD = Math.random() * 60; const scatterA = tipAngle + (Math.random() - 0.5) * 0.8; const sx = tipX + Math.cos(scatterA) * scatterD; const sy = tipY + Math.sin(scatterA) * scatterD; const s = Math.random() * 4 + 1; ctx.fillRect(sx, sy, s, s); } } if (swingProgress > 0.1 && swingProgress < 0.6) { ctx.fillStyle = '#fff'; const sx = Math.cos(tipAngle) * (r * 0.8); const sy = Math.sin(tipAngle) * (r * 0.8); ctx.fillRect(sx + (Math.random()-0.5)*20, sy + (Math.random()-0.5)*20, 2, 2); } } } ctx.restore(); };
export const drawInkCyclone = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const maxDur = 25; const progress = 1 - (p.duration! / maxDur); const t = time; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(t * 0.5); const r = p.radius * (0.5 + progress * 0.5); ctx.fillStyle = '#000'; const spikes = 24; ctx.beginPath(); for(let i=0; i<=spikes; i++) { const angle = (i/spikes) * Math.PI * 2; const jitter = Math.sin(t + i*5) * 10; const dist = r + jitter; ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = '#000'; for(let i=0; i<8; i++) { const a = Math.random() * Math.PI * 2; const d = r + Math.random() * 40; const s = 4 + Math.random() * 6; ctx.fillRect(Math.cos(a)*d, Math.sin(a)*d, s, s); } ctx.restore(); };
export const drawBloodRitual = (ctx: CanvasRenderingContext2D, p: Entity) => { const maxDur = 40; const progress = 1 - (p.duration! / maxDur); ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.globalAlpha = 1 - progress; ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 3; const r = progress * 100; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke(); for(let i=0; i<10; i++) { const yOff = -progress * 80 - Math.random() * 20; const xOff = (Math.random()-0.5) * 60; ctx.fillRect(xOff, yOff, 4, 4); } ctx.restore(); };
export const drawBlizzard = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { const t = time; ctx.save(); ctx.translate(p.pos.x, p.pos.y); const lines = 12; const r = p.radius; ctx.rotate(t * 0.05); ctx.strokeStyle = 'rgba(186, 230, 253, 0.15)'; ctx.lineWidth = 40; ctx.beginPath(); for(let i=0; i<lines; i++) { const angle = (i / lines) * Math.PI * 2; const dist = r * 0.6 + Math.sin(t * 0.1 + i) * (r * 0.2); const x = Math.cos(angle) * dist; const y = Math.sin(angle) * dist; ctx.moveTo(x, y); ctx.arc(0, 0, dist, angle, angle + 0.5); } ctx.stroke(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = '#fff'; const particles = 20; for(let i=0; i<particles; i++) { const pAngle = (i / particles) * Math.PI * 2 + (t * 0.1 * (i%2===0?1:-0.5)); const pDist = (r * 0.2) + ((t * 20 + i * 50) % (r * 0.8)); const px = Math.cos(pAngle) * pDist; const py = Math.sin(pAngle) * pDist; const size = (Math.sin(t * 0.2 + i) + 1.5) * 2; ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI*2); ctx.fill(); } ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; ctx.lineWidth = 2; ctx.setLineDash([10, 20]); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
export const drawAurora = (ctx: CanvasRenderingContext2D, time: number) => { const t = time * 0.001; const gradient = ctx.createLinearGradient(0, 0, 0, INTERNAL_HEIGHT * 0.6); gradient.addColorStop(0, 'rgba(56, 189, 248, 0.0)'); gradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.15)'); gradient.addColorStop(0.6, 'rgba(168, 85, 247, 0.15)'); gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)'); ctx.save(); ctx.fillStyle = gradient; ctx.globalCompositeOperation = 'screen'; ctx.beginPath(); ctx.moveTo(0, INTERNAL_HEIGHT); for (let x = 0; x <= INTERNAL_WIDTH; x += 10) { const y = (INTERNAL_HEIGHT * 0.2) + Math.sin(x * 0.005 + t) * 50 + Math.sin(x * 0.01 + t * 2) * 30; ctx.lineTo(x, y); } ctx.lineTo(INTERNAL_WIDTH, 0); ctx.lineTo(0, 0); ctx.fill(); ctx.restore(); };
export const drawDragon = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const angle = Math.atan2(p.velocity.y, p.velocity.x); ctx.rotate(angle); ctx.fillStyle = '#10b981'; ctx.shadowBlur = 15; ctx.shadowColor = '#10b981'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-10, -15); ctx.lineTo(-5, 0); ctx.lineTo(-10, 15); ctx.fill(); ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'; ctx.beginPath(); ctx.arc(-15, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(5, -5, 2, 0, Math.PI*2); ctx.arc(5, 5, 2, 0, Math.PI*2); ctx.fill(); ctx.restore(); };
export const drawTornado = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const duration = 240; const progress = 1 - ((p.duration || 0) / duration); const height = 150; const baseRadius = p.radius * 0.8; const topRadius = p.radius * 0.2; const leafCount = 50; for (let i = 0; i < leafCount; i++) { const leafProgress = (time * 0.02 + i * 0.37) % 1; const y = -leafProgress * height; const radius = baseRadius - (baseRadius - topRadius) * leafProgress; const angle = time * 0.2 + i * 1.3; const x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius * 0.4; const scale = 0.5 + leafProgress * 0.8; ctx.save(); ctx.translate(x, y + z); ctx.scale(scale, scale); ctx.rotate(angle); const colorRoll = i % 5; let leafColor = '#d97706'; if (colorRoll === 1) leafColor = '#b45309'; else if (colorRoll === 2) leafColor = '#f97316'; else if (colorRoll === 3) leafColor = '#78350f'; ctx.fillStyle = leafColor; ctx.globalAlpha = 0.8 * (1 - leafProgress); ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } const lineCount = 15; ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < lineCount; i++) { ctx.beginPath(); const startAngle = time * 0.3 + i * (Math.PI * 2 / lineCount); const x1 = Math.cos(startAngle) * baseRadius; const z1 = Math.sin(startAngle) * baseRadius * 0.4; ctx.moveTo(x1, z1); const endAngle = startAngle + 2.0; const x2 = Math.cos(endAngle) * topRadius; const z2 = Math.sin(endAngle) * topRadius * 0.4; ctx.quadraticCurveTo(0, -height / 2, x2, -height + z2); ctx.lineWidth = 1 + Math.random() * 2; ctx.strokeStyle = `rgba(217, 119, 6, ${0.1 + Math.random() * 0.2})`; ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; ctx.restore(); };
export const drawLeaf = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); const rotation = (p.rotation || 0) + time * 0.05 + (p.id ? parseFloat(p.id.substring(2)) || 0 : 0); ctx.rotate(rotation); ctx.fillStyle = p.color || '#22c55e'; ctx.beginPath(); ctx.ellipse(0, 0, p.radius, p.radius * 0.5, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); };
export const drawImpactBurst = (ctx: CanvasRenderingContext2D, p: Entity) => { const maxDur = p.maxDuration || 20; const progress = 1 - (p.duration! / maxDur); const r = p.radius + progress * 20; ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.strokeStyle = p.color; ctx.lineWidth = 2 * (1 - progress); ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); ctx.stroke(); ctx.restore(); };
export const drawDebris = (ctx: CanvasRenderingContext2D, p: Entity) => { ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation || 0); ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha ?? 1; ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2); ctx.restore(); };
export const drawHanLiSprite = (ctx: CanvasRenderingContext2D, entity: Entity, palette: any, time: number) => { const t = time * 0.05; const isAttacking = entity.attackAnim && entity.attackAnim > 0; const hover = Math.sin(t) * 2 - 6; ctx.translate(0, hover); const robeSway = Math.sin(t * 1.5) * 1.5; const hairSway = Math.sin(t * 2.0 + 1) * 2; const headRadius = 9; const neckHeight = 3; const torsoHeight = 24; const legHeight = 10; const footY = 16; const torsoTop = footY - legHeight - torsoHeight; const headCenterY = torsoTop - neckHeight - headRadius + 1; ctx.save(); ctx.translate(0, footY + 8); const cloudAlpha = 0.7 + Math.sin(t * 3) * 0.2; ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`; ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-10, -2, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -3, 7, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 2, 8, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = `rgba(186, 230, 253, 0.6)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 22, t, t + 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 16, t + Math.PI, t + Math.PI + 1.2); ctx.stroke(); ctx.restore(); ctx.save(); ctx.translate(0, torsoTop + 10); ctx.rotate(-Math.PI / 6); const scabbardLen = 38; ctx.fillStyle = '#334155'; ctx.fillRect(-3, -scabbardLen/2, 6, scabbardLen); ctx.fillStyle = palette.ACCENT; ctx.fillRect(-3, scabbardLen/2 - 4, 6, 4); if (!isAttacking) { ctx.fillStyle = '#94a3b8'; ctx.fillRect(-2, -scabbardLen/2 - 12, 4, 12); ctx.fillStyle = palette.ACCENT; ctx.fillRect(-5, -scabbardLen/2, 10, 3); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -scabbardLen/2 - 12); ctx.quadraticCurveTo(5 + hairSway, -scabbardLen/2 - 5, 2 + hairSway, -scabbardLen/2); ctx.stroke(); } ctx.restore(); ctx.fillStyle = palette.HAIR; ctx.beginPath(); ctx.moveTo(-9, headCenterY); ctx.quadraticCurveTo(-14 + hairSway, torsoTop + 10, -10 + hairSway, torsoTop + 30); ctx.lineTo(10 + hairSway, torsoTop + 30); ctx.quadraticCurveTo(14 + hairSway, torsoTop + 10, 9, headCenterY); ctx.fill(); ctx.fillStyle = palette.SKIN; ctx.fillRect(-3, torsoTop - neckHeight, 6, neckHeight + 2); const bootHeight = 12; const bootWidth = 7; const bootTop = footY - bootHeight; ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-9, bootTop, bootWidth, bootHeight); ctx.fillRect(-11, footY - 4, bootWidth + 2, 6); ctx.fillStyle = '#262626'; ctx.fillRect(-11, footY - 4, 2, 6); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(2, bootTop, bootWidth, bootHeight); ctx.fillRect(2, footY - 4, bootWidth + 2, 6); ctx.fillStyle = '#262626'; ctx.fillRect(9, footY - 4, 2, 6); ctx.fillStyle = palette.ROBE_INNER; ctx.beginPath(); ctx.moveTo(-5, torsoTop); ctx.lineTo(5, torsoTop); ctx.lineTo(0, torsoTop + 10); ctx.fill(); ctx.fillStyle = palette.ROBE_BASE; ctx.beginPath(); ctx.moveTo(-9, torsoTop); ctx.lineTo(-4, torsoTop); ctx.lineTo(-4, torsoTop + torsoHeight + 4); ctx.lineTo(-10 + robeSway, torsoTop + torsoHeight + 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, torsoTop); ctx.lineTo(4, torsoTop); ctx.lineTo(4, torsoTop + torsoHeight + 4); ctx.lineTo(10 + robeSway, torsoTop + torsoHeight + 4); ctx.fill(); ctx.fillStyle = palette.ACCENT; ctx.fillRect(-4, torsoTop, 1, torsoHeight + 4); ctx.fillRect(3, torsoTop, 1, torsoHeight + 4); const beltY = torsoTop + torsoHeight * 0.6; ctx.fillStyle = palette.ROBE_DARK; ctx.fillRect(-9, beltY, 18, 5); ctx.fillStyle = '#a7f3d0'; ctx.fillRect(-2, beltY, 4, 5); ctx.fillStyle = palette.ROBE_BASE; ctx.beginPath(); ctx.moveTo(-9, torsoTop + 4); ctx.lineTo(-15, torsoTop + 16); ctx.lineTo(-11, torsoTop + 22); ctx.lineTo(-9, torsoTop + 18); ctx.fill(); ctx.fillStyle = palette.ACCENT; ctx.fillRect(-15, torsoTop + 16, 4, 2); ctx.fillStyle = palette.ROBE_BASE; ctx.beginPath(); ctx.moveTo(9, torsoTop + 4); ctx.lineTo(15, torsoTop + 16); ctx.lineTo(11, torsoTop + 22); ctx.lineTo(9, torsoTop + 18); ctx.fill(); ctx.fillStyle = palette.ACCENT; ctx.fillRect(11, torsoTop + 16, 4, 2); ctx.save(); ctx.translate(10, beltY + 2); const breath = Math.sin(t * 3); const scale = 1.0 + breath * 0.1; ctx.scale(scale, scale); ctx.rotate(Math.PI / 8 + Math.sin(t * 2) * 0.1); ctx.fillStyle = palette.GOURD || '#a3e635'; ctx.beginPath(); ctx.arc(0, 3, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-2, 1, 2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-1, -6, 2, 2); ctx.restore(); ctx.fillStyle = palette.SKIN; ctx.beginPath(); ctx.ellipse(0, headCenterY, headRadius, headRadius + 1, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = palette.HAIR; ctx.beginPath(); ctx.arc(0, headCenterY - 10, 5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = palette.ACCENT; ctx.fillRect(-6, headCenterY - 10, 12, 1); ctx.fillStyle = palette.HAIR; ctx.beginPath(); ctx.moveTo(-9, headCenterY - 6); ctx.lineTo(-10, headCenterY + 4); ctx.lineTo(-8, headCenterY + 8); ctx.lineTo(-6, headCenterY - 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, headCenterY - 6); ctx.lineTo(10, headCenterY + 4); ctx.lineTo(8, headCenterY + 8); ctx.lineTo(6, headCenterY - 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, headCenterY - 7, 10, 0, Math.PI, false); ctx.fill(); ctx.fillStyle = '#0f172a'; ctx.fillRect(-5, headCenterY - 1, 2, 2); ctx.fillRect(3, headCenterY - 1, 2, 2); ctx.fillStyle = '#854d0e'; ctx.fillRect(-1, headCenterY + 3, 2, 1); };

export const drawProp = (ctx: CanvasRenderingContext2D, p: Entity, time: number) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    
    if (p.propType === PropType.BARREL) {
        // --- 3D EXPLOSIVE BARREL ---
        const pulse = Math.sin(time * 0.1) * 2;
        
        // 1. Cylinder Body Gradient (Left to Right: Dark -> Light -> Dark)
        const grad = ctx.createLinearGradient(-14, 0, 14, 0);
        grad.addColorStop(0, '#7f1d1d'); // Dark Red Shadow
        grad.addColorStop(0.4, '#ef4444'); // Main Red
        grad.addColorStop(0.6, '#f87171'); // Highlight
        grad.addColorStop(1, '#991b1b'); // Dark Edge
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Barrel shape: slightly bulging sides
        ctx.moveTo(-14, -18);
        ctx.quadraticCurveTo(-16, 0, -14, 18);
        ctx.lineTo(14, 18);
        ctx.quadraticCurveTo(16, 0, 14, -18);
        ctx.closePath();
        ctx.fill();
        
        // 2. Iron Bands (Dark Metallic Blue/Grey)
        ctx.fillStyle = '#1e293b'; // Slate 800
        // Top Band
        ctx.fillRect(-15, -15, 30, 4);
        // Bottom Band
        ctx.fillRect(-15, 11, 30, 4);
        
        // 3. Hazard Symbol (Yellow Triangle + Icon)
        ctx.save();
        ctx.shadowBlur = 0;
        // Sticker Background
        ctx.fillStyle = '#facc15'; // Yellow
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(7, 6);
        ctx.lineTo(-7, 6);
        ctx.fill();
        // Skull / Exclamation
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 1, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillRect(-2, 3, 4, 1.5); // Bones
        ctx.restore();
        
        // 4. Top Lid (Perspective Ellipse)
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(0, -18, 14, 4, 0, 0, Math.PI*2);
        ctx.fill();
        // Lid Rim highlight
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 5. Pulsing Warning Glow
        ctx.shadowColor = '#ef4444'; 
        ctx.shadowBlur = 15 + pulse;
        ctx.strokeStyle = 'rgba(254, 202, 202, 0.5)'; 
        ctx.lineWidth = 1;
        ctx.strokeRect(-16, -20, 32, 40); // Hitbox hint
        
    } 
    else if (p.propType === PropType.CHEST) {
        // --- TREASURE CHEST ---
        // Animation: Subtle bounce/wobble if active
        const wobble = p.propActive ? Math.sin(time * 0.05) * 1.5 : 0;
        ctx.translate(0, wobble);
        
        const width = 36;
        const height = 24;
        const depth = 8; // Lid height
        
        // 1. Base Box (Wood Texture)
        ctx.fillStyle = '#78350f'; // Dark Oak
        ctx.fillRect(-width/2, -height/2, width, height);
        
        // Wood grain lines
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-width/2, -5, width, 1);
        ctx.fillRect(-width/2, 5, width, 1);
        
        // 2. Reinforced Corners (Gold/Brass)
        ctx.fillStyle = '#f59e0b'; // Amber 500
        const cSize = 4;
        // Top Left
        ctx.fillRect(-width/2, -height/2, cSize, height);
        // Top Right
        ctx.fillRect(width/2 - cSize, -height/2, cSize, height);
        
        // 3. Arched Lid
        const lidGrad = ctx.createLinearGradient(0, -height/2 - depth, 0, -height/2);
        lidGrad.addColorStop(0, '#a16207'); // Lighter top
        lidGrad.addColorStop(1, '#713f12'); // Darker bottom
        ctx.fillStyle = lidGrad;
        ctx.beginPath();
        ctx.arc(0, -height/2, width/2, Math.PI, 0); // Semicircle top
        ctx.fill();
        
        // Lid Band (Center)
        ctx.fillStyle = '#fcd34d'; // Gold Light
        ctx.fillRect(-4, -height/2 - depth + 2, 8, height + depth - 2);
        
        // 4. Lock (Big and shiny)
        ctx.fillStyle = '#1e293b'; // Dark Iron backing
        ctx.beginPath();
        ctx.arc(0, -2, 6, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#fbbf24'; // Gold Lock Body
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI*2);
        ctx.fill();
        
        // Keyhole
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, -3, 1.5, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -3); ctx.lineTo(1.5, 1); ctx.lineTo(-1.5, 1);
        ctx.fill();

        // 5. Sparkles (If active)
        if (p.propActive && Math.random() > 0.92) {
            ctx.fillStyle = '#fff';
            const sx = (Math.random()-0.5) * width * 1.2;
            const sy = (Math.random()-0.5) * height * 1.5 - 10;
            ctx.beginPath();
            ctx.moveTo(sx, sy-2); ctx.lineTo(sx+1, sy); ctx.lineTo(sx, sy+2); ctx.lineTo(sx-1, sy);
            ctx.fill();
        }
    }
    
    ctx.restore();
};

export const drawPixelSprite = (ctx: CanvasRenderingContext2D, entity: Entity, palette: any, time: number, characterClass: CharacterClass) => {
    // Intercept prop drawing
    if (entity.type === 'prop') {
        drawProp(ctx, entity, time);
        return;
    }

    const { pos, type, facing, deathTimer } = entity; const x = Math.floor(pos.x); const y = Math.floor(pos.y); ctx.save(); ctx.translate(x, y); if (entity.alpha !== undefined) ctx.globalAlpha = entity.alpha; 
    
    // ... (rest of the existing logic) ...
    if (entity.isElite) {
        ctx.scale(1.3, 1.3);
        ctx.shadowColor = entity.eliteAffix === 'SPEED' ? '#3b82f6' : entity.eliteAffix === 'EXPLOSIVE' ? '#ef4444' : '#facc15';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = ctx.shadowColor; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + Math.sin(time * 0.2) * 0.3; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = entity.alpha !== undefined ? entity.alpha : 1.0;
    }

    if (type === 'item') {
        const bob = Math.sin(time * 0.1 + entity.id.charCodeAt(0)) * 3; const zHeight = entity.z || 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 5, 6, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.translate(0, -zHeight + bob); 
        ctx.shadowBlur = 10; ctx.shadowColor = entity.color;
        ctx.fillStyle = entity.color; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.shadowColor = 'black'; ctx.shadowBlur = 2;
        if (entity.itemType === 'HEALTH_POTION') ctx.fillText('HP', 0, -8); else if (entity.itemType === 'COOLDOWN_ORB') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(3,0); ctx.stroke(); ctx.fillText('CD', 0, 10); } else ctx.fillText('XP', 0, -8);
        ctx.restore(); return;
    }

    if (type === 'portal') { const t = time; ctx.fillStyle = `hsl(${t % 360}, 70%, 50%)`; ctx.beginPath(); ctx.arc(0, 0, 40 + Math.sin(t*0.2)*5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill(); ctx.restore(); return; } 
    
    // UPDATED: BOAT RENDERER with Rotation
    if (type === 'boat') { 
        if (entity.rotation) ctx.rotate(entity.rotation - Math.PI / 2); // Align sprite: Sprite is horizontal, we want forward is right
        r(ctx, '#3f2c22', -25, -10, 50, 20); 
        r(ctx, '#8b4513', -25, -20, 50, 10); // Deck
        r(ctx, '#fff', -5, -45, 10, 30); // Sail
        r(ctx, '#5d4037', 0, -45, 2, 30); // Mast
        ctx.restore();
        return;
    }

    const isMoving = Math.abs(entity.velocity.x) > 0.1 || Math.abs(entity.velocity.y) > 0.1; const bob = isMoving ? Math.sin(time * 0.3) * 2 : 0; if (entity.onBoat) ctx.translate(0, Math.sin(time * 0.1) * 2); if (entity.hitFlash && entity.hitFlash > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -15, entity.radius, 0, Math.PI*2); ctx.fill(); ctx.restore(); return; } ctx.translate(0, bob); ctx.scale(facing || 1, 1); 
    
    if (type === 'enemy') {
        if (entity.pullTimer && entity.pullTimer > 0) {
            ctx.rotate(Math.sin(time * 0.5) * 0.3); // Wobble when pulled
        }
        if (entity.stunTimer && entity.stunTimer > 0) {
           const t = time;
           if (entity.stunType === 'ELECTRIC') {
               ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 2; ctx.beginPath(); const h = entity.radius * 2; const w = entity.radius * 1.5; ctx.moveTo(-w/2, -h/2); for(let i=0; i<5; i++) { ctx.lineTo(-w/2 + (Math.random() * w), -h/2 + (i/5)*h); } ctx.stroke(); ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 10;
           } else {
               if (Math.floor(t / 2) % 2 === 0) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(0, -30); ctx.lineTo(10, -20); ctx.stroke(); }
           }
           ctx.shadowBlur = 0; 
        }
        if (entity.burnTimer && entity.burnTimer > 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; ctx.beginPath(); ctx.arc(0, -15, entity.radius, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; if (Math.random() > 0.7) { ctx.fillStyle = '#f97316'; ctx.fillRect((Math.random()-0.5)*20, -10 - Math.random()*20, 3, 3); } }
        if (entity.particleType === 'TARGETED') { drawHighNoonTarget(ctx, entity, time); }

        // NEW BOSS RENDERER
        if (entity.bossType === BossType.SHOGUN) {
            const scale = 3.0;
            ctx.scale(scale, scale);
            // Samurai Armor Style
            ctx.fillStyle = '#4a0404'; // Dark red Armor
            ctx.fillRect(-10, -25, 20, 25);
            ctx.fillStyle = '#000'; // Inner
            ctx.fillRect(-4, -25, 8, 25);
            
            // Helmet
            ctx.fillStyle = '#1f2937';
            ctx.beginPath(); ctx.moveTo(-12, -25); ctx.lineTo(12, -25); ctx.lineTo(0, -35); ctx.fill();
            // Horns
            ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.moveTo(-8, -28); ctx.quadraticCurveTo(-15, -40, -5, -45); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, -28); ctx.quadraticCurveTo(15, -40, 5, -45); ctx.stroke();
            
            // Glowing Eyes
            const eyeGlow = Math.sin(time * 0.2) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(239, 68, 68, ${eyeGlow})`;
            ctx.fillRect(-5, -30, 3, 1); ctx.fillRect(2, -30, 3, 1);
            
            ctx.restore(); // IMPORTANT: Restore context before returning to avoid stack leak
            return; 
        } else if (entity.bossType === BossType.CONSTRUCT) {
             const scale = 3.0;
             ctx.scale(scale, scale);
             // Floating Monolith
             const float = Math.sin(time * 0.1) * 2;
             ctx.translate(0, float);
             
             // Core
             ctx.fillStyle = '#0ea5e9';
             ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(15, 0); ctx.lineTo(0, 20); ctx.lineTo(-15, 0); ctx.fill();
             
             // Rings
             ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1;
             ctx.beginPath(); ctx.ellipse(0, 0, 20, 5, time * 0.1, 0, Math.PI*2); ctx.stroke();
             ctx.beginPath(); ctx.ellipse(0, 0, 25, 8, -time * 0.15, 0, Math.PI*2); ctx.stroke();
             
             // Eye
             ctx.fillStyle = '#fff';
             ctx.shadowBlur = 10; ctx.shadowColor = '#0ea5e9';
             ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
             
             ctx.restore(); // IMPORTANT: Restore context before returning to avoid stack leak
             return;
        }
    }

    if (type === 'player') {
       if (characterClass === CharacterClass.SAMURAI && entity.modifiers?.iaidoMultiplier) { if ((entity.stationaryTimer && entity.stationaryTimer > 0) || entity.isIaidoCharged) { const chargePct = Math.min(1.0, (entity.stationaryTimer || 0) / IAIDO_CHARGE_FRAMES); ctx.save(); ctx.scale(facing || 1, 1); if (entity.isIaidoCharged) { const pulse = Math.sin(time * 0.2) * 2; ctx.shadowBlur = 10; ctx.shadowColor = '#4ade80'; ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -20, 30 + pulse, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0; } else { ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + chargePct * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 30, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * chargePct)); ctx.stroke(); if (Math.random() > 0.6) { const angle = Math.random() * Math.PI * 2; const dist = 40; ctx.fillStyle = '#bae6fd'; ctx.fillRect(Math.cos(angle)*dist, Math.sin(angle)*dist - 20, 2, 2); } ctx.fillStyle = `rgba(255, 255, 255, ${chargePct * 0.3})`; ctx.globalCompositeOperation = 'overlay'; ctx.beginPath(); ctx.arc(0, -20, 20, 0, Math.PI*2); ctx.fill(); } ctx.restore(); } }
       
       if (characterClass === CharacterClass.MAGE) { 
           const p = SPRITE_PALETTES.MAGE; r(ctx, p.OUTLINE, -14, -38, 28, 42); r(ctx, p.ROBE_BASE, -12, -30, 24, 18); r(ctx, p.SKIN, -8, -34, 16, 12); 
       } else if (characterClass === CharacterClass.SAMURAI) { 
           // Use the new Han Li Sprite Renderer
           drawHanLiSprite(ctx, entity, SPRITE_PALETTES.SAMURAI, time);
       } else {
           // GUNNER (Cowboy) - Unchanged but scaled
           const p = SPRITE_PALETTES.GUNNER; const breathe = Math.sin(time * 0.1) * 1;
           const coatSway = Math.sin(time * 0.2) * 3; ctx.fillStyle = p.COAT_DARK; ctx.beginPath(); ctx.moveTo(-14, -25); ctx.lineTo(14, -25); ctx.lineTo(18 + coatSway, -5); ctx.lineTo(-18 + coatSway, -5); ctx.fill();
           const armY = -38 + breathe; let recoil = (entity.attackAnim && entity.attackAnim > 0) ? -6 : 0;
           ctx.save(); r(ctx, p.COAT_DARK, 4, armY + 2, 12, 5); r(ctx, p.SKIN, 16, armY + 2, 4, 4); r(ctx, p.GUN_HANDLE, 16 + recoil, armY + 3, 4, 5); r(ctx, p.GUN_METAL, 18 + recoil, armY + 1, 14, 4); r(ctx, '#000', 32 + recoil, armY + 1, 1, 4); ctx.restore();
           r(ctx, p.BOOTS, -11, -6, 8, 6); r(ctx, p.BOOTS, 3, -6, 8, 6); r(ctx, p.PANTS, -10, -24, 7, 18); r(ctx, p.PANTS, 3, -24, 7, 18);
           r(ctx, p.SHIRT, -9, -44 + breathe, 18, 22); r(ctx, p.BELT, -10, -26 + breathe, 20, 4); r(ctx, '#9ca3af', -3, -26 + breathe, 6, 4);
           r(ctx, p.COAT_BASE, -12, -44 + breathe, 4, 20); r(ctx, p.COAT_BASE, 8, -44 + breathe, 4, 20);
           ctx.fillStyle = p.BADGE; ctx.beginPath(); ctx.arc(-4, -36 + breathe, 3, 0, Math.PI*2); ctx.fill();
           ctx.fillStyle = p.SCARF; ctx.beginPath(); ctx.moveTo(-8, -42 + breathe); ctx.lineTo(8, -42 + breathe); ctx.lineTo(0, -34 + breathe); ctx.fill();
           r(ctx, p.COAT_BASE, 6, -32 + breathe, 12, 6); r(ctx, p.SKIN, 18, -32 + breathe, 4, 4); r(ctx, p.GUN_HANDLE, 18 + recoil, -32 + breathe + 2, 4, 5); r(ctx, p.GUN_METAL, 20 + recoil, -32 + breathe, 14, 4);
           const headY = -54 + breathe; r(ctx, p.SKIN, -4, -44 + breathe, 8, 4); r(ctx, p.SKIN, -8, headY, 16, 12); r(ctx, p.HAIR, -9, headY, 2, 8); r(ctx, p.HAIR, 7, headY, 2, 8);
           ctx.fillStyle = '#000'; ctx.fillRect(-4, headY + 4, 2, 2); ctx.fillRect(2, headY + 4, 2, 2); ctx.fillRect(-2, headY + 8, 4, 1);
           const hatY = headY - 4; ctx.fillStyle = p.HAT_BASE; ctx.beginPath(); ctx.ellipse(0, hatY + 2, 22, 5, 0, Math.PI, 0); ctx.fill(); r(ctx, p.HAT_DARK, -10, hatY - 10, 20, 10); r(ctx, p.HAT_BASE, -10, hatY - 10, 20, 4);
           const funnelCount = entity.modifiers?.funnelCount || 0; if (funnelCount > 0) { const orbitR = 45; const t = time * 0.05; for(let i=0; i<funnelCount; i++) { const fAngle = t + (i / funnelCount) * Math.PI * 2; const fx = Math.cos(fAngle) * orbitR; const fy = Math.sin(fAngle) * orbitR; ctx.save(); ctx.translate(fx, fy); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 15, 6, 3, 0, 0, Math.PI*2); ctx.fill(); const hover = Math.sin(t * 4 + i) * 2; ctx.translate(0, hover); ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(4, 6); ctx.lineTo(-4, 6); ctx.fill(); ctx.fillStyle = i % 2 === 0 ? '#3b82f6' : '#a855f7'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#60a5fa'; ctx.shadowBlur = 4; ctx.shadowColor = '#60a5fa'; ctx.fillRect(-2, -2, 4, 4); ctx.shadowBlur = 0; ctx.fillStyle = '#93c5fd'; ctx.fillRect(-8, -2, 2, 4); ctx.fillRect(6, -2, 2, 4); ctx.restore(); } }
       }
    } else if (type === 'enemy') { 
        if (entity.enemyType === 'ICE_SLIME') { r(ctx, '#3b82f6', -15, -15, 30, 15); r(ctx, '#93c5fd', -10, -20, 20, 10); r(ctx, '#fff', -5, -18, 4, 4); } else if (entity.enemyType === 'YETI') { r(ctx, '#cbd5e1', -25, -50, 50, 50); r(ctx, '#94a3b8', -20, -40, 40, 30); r(ctx, '#000', -10, -35, 6, 6); r(ctx, '#000', 4, -35, 6, 6); r(ctx, '#ef4444', -10, -20, 20, 5); } else if (entity.enemyType === 'BOSS_GRASS' || entity.enemyType === 'BOSS_ICE') { const p = entity.enemyType === 'BOSS_GRASS' ? SPRITE_PALETTES.BOSS_GRASS : SPRITE_PALETTES.BOSS_ICE; const s = 2; r(ctx, p.OUTLINE, -40*s, -40*s, 80*s, 80*s); r(ctx, p.DARK, -35*s, -35*s, 70*s, 70*s); r(ctx, p.BASE, -30*s, -30*s, 60*s, 40*s); r(ctx, p.LIGHT, -20*s, -60*s, 40*s, 30*s); r(ctx, p.ACCENT, -10*s, -50*s, 5*s, 5*s); r(ctx, p.ACCENT, 5*s, -50*s, 5*s, 5*s); } else if (entity.enemyType === 'SHOOTER') { const p = SPRITE_PALETTES.ENEMY_SHOOTER; r(ctx, p.OUTLINE, -14, -32, 28, 30); r(ctx, p.HOOD_DARK, -12, -30, 24, 28); r(ctx, p.BODY_BASE, -10, -28, 20, 24); r(ctx, '#000', -6, -26, 12, 6); r(ctx, '#ef4444', -3, -24, 2, 2); r(ctx, '#ef4444', 1, -24, 2, 2); r(ctx, p.WEAPON, 8, -20, 20, 6); r(ctx, '#9ca3af', 20, -24, 2, 14); } else if (entity.enemyType === 'TANK') { const p = SPRITE_PALETTES.ENEMY_TANK; r(ctx, p.OUTLINE, -22, -36, 44, 34); r(ctx, p.BODY_BASE, -20, -34, 40, 30); r(ctx, p.BODY_LIGHT, -15, -34, 30, 10); r(ctx, p.GLOW, -8, -30, 16, 2); const shieldOffset = -5; r(ctx, '#000', 8 + shieldOffset, -30, 4, 30); r(ctx, p.SHIELD_DARK, 12 + shieldOffset, -35, 8, 40); r(ctx, p.SHIELD_BASE, 20 + shieldOffset, -40, 15, 50); r(ctx, p.SHIELD_LIGHT, 25 + shieldOffset, -35, 5, 40); } else { const p = SPRITE_PALETTES.ENEMY_BASIC; r(ctx, p.OUTLINE, -18, -32, 36, 34); r(ctx, p.BODY_BASE, -16, -30, 32, 16); r(ctx, p.BAND_LIGHT, -17, -14, 34, 2); } 
        if (!deathTimer && entity.hp < entity.maxHp) { const hpPct = Math.max(0, entity.hp / entity.maxHp); r(ctx, '#000', -20, -50, 40, 6); r(ctx, hpPct > 0.5 ? '#22c55e' : '#ef4444', -19, -49, 38 * hpPct, 4); } 
    } ctx.restore();
};

export const batchRenderProjectiles = (ctx: CanvasRenderingContext2D, projectiles: Entity[], time: number, camera: Vector2) => {
    projectiles.forEach(p => {
        if (p.projectileType === 'BULLET') drawDetailedBullet(ctx, p);
        else if (p.projectileType === 'ELECTRO_LASSO_THROW') drawElectroLasso(ctx, p, time);
        else if (p.projectileType === 'MAGNETIC_FIELD') drawMagneticField(ctx, p, time);
        else if (p.projectileType === 'ELECTRO_BLAST') drawElectroBlast(ctx, p, time);
        else if (p.projectileType === 'TNT_BARREL') drawTNTBarrel(ctx, p, time);
        else if (p.projectileType === 'HIGH_NOON_IMPACT') drawHighNoonImpact(ctx, p);
        else if (p.projectileType === 'VOID_SLASH') drawVoidSlash(ctx, p, time);
        else if (p.projectileType === 'INK_PUDDLE') drawInkSlash(ctx, p, time);
        else if (p.projectileType === 'SPIRIT_SWORD') drawElementalSword(ctx, p, time);
        else if (p.projectileType === 'ELEMENTAL_STAB') drawElementalSword(ctx, p, time);
        else if (p.projectileType === 'WIND_DRAGON') drawWindDragon(ctx, p, time);
        else if (p.projectileType === 'SLASH_WAVE') drawSlash(ctx, p, true);
        else if (p.projectileType === 'INK_CYCLONE') drawInkCyclone(ctx, p, time);
        else if (p.projectileType === 'BLOOD_RITUAL') drawBloodRitual(ctx, p);
        else if (p.projectileType === 'BLIZZARD') drawBlizzard(ctx, p, time);
        else if (p.projectileType === 'DRAGON') drawDragon(ctx, p, time);
        else if (p.projectileType === 'TORNADO') drawTornado(ctx, p, time);
        else if (p.projectileType === 'BEAM') {
             ctx.save();
             ctx.strokeStyle = p.color;
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(p.pos.x, p.pos.y);
             ctx.lineTo(p.pos.x + Math.cos(time * 0.1) * 1000, p.pos.y + Math.sin(time * 0.1) * 1000);
             ctx.stroke();
             ctx.restore();
        }
        else if (p.projectileType === 'FUNNEL_SHOT') {
             ctx.save();
             ctx.translate(p.pos.x, p.pos.y);
             ctx.fillStyle = p.color;
             ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.fill();
             ctx.restore();
        }
        else if (p.projectileType === 'VINE') {
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            ctx.fillStyle = '#15803d';
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        else if (p.projectileType === 'EXPLOSIVE') {
             drawElectroBlast(ctx, p, time);
        }
    });
};

export const batchRenderParticles = (ctx: CanvasRenderingContext2D, particles: Entity[], time: number) => {
    particles.forEach(p => {
        if (p.particleType === 'MUZZLE_FLASH') drawMuzzleFlash(ctx, p);
        else if (p.particleType === 'TARGETED') drawHighNoonTarget(ctx, p, time);
        else if (p.particleType === 'LEAF') drawLeaf(ctx, p, time);
        else if (p.particleType === 'SHOCKWAVE') drawImpactBurst(ctx, p);
        else if (p.particleType === 'DEBRIS') drawDebris(ctx, p);
        else if (p.particleType === 'SLASH') drawSlash(ctx, p);
        else {
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });
};
