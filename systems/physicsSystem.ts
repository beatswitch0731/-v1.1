
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { Entity, TileType, MapType, Vector2 } from '../types';

export const updatePlayerMovement = (
  player: Entity,
  keysRef: React.MutableRefObject<Set<string>>,
  mouseRef: React.MutableRefObject<Vector2>,
  cameraRef: React.MutableRefObject<Vector2>,
  map: TileType[][],
  currentMapType: MapType,
  decorations: Entity[], // trees
  boat: Entity | null,
  puddles: {x:number, y:number, w:number, h:number}[],
  ripples: any[],
  timeRef: number,
  timeScale: number,
  projectiles: Entity[],
  audioManager: any,
  stats: any
) => {
    // 1. Dash Logic
    if (player.dashTimer && player.dashTimer > 0) {
        player.dashTimer -= timeScale;
        player.velocity = { ...player.dashDir! };
        // Dash particle logic handled in combat/render usually, but velocity is set here
    } else if (!player.chargeTimer || player.chargeTimer <= 0) {
        // 2. Normal Movement
        let dx = 0; let dy = 0;
        if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) dy -= 1;
        if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) dy += 1;
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) dx -= 1;
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) dx += 1;

        if (dx !== 0 || dy !== 0) {
            let speed = stats.speed * (player.modifiers?.speedMult || 1);
            if (player.onBoat) speed *= 1.5;
            if (currentMapType === MapType.ICE_WORLD && !player.onBoat) speed *= 1.1;

            // Blizzard Slow
            const inBlizzard = projectiles.some(p => p.projectileType === 'BLIZZARD' && Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y) < p.radius);
            if (inBlizzard) speed *= 0.5;

            const length = Math.sqrt(dx * dx + dy * dy);
            player.velocity = { x: (dx / length) * speed, y: (dy / length) * speed };

            // Footsteps
            const pTileX = Math.floor(player.pos.x/TILE_SIZE); 
            const pTileY = Math.floor(player.pos.y/TILE_SIZE); 
            const inWater = map[pTileY]?.[pTileX] === TileType.WATER;

            if (!player.onBoat && !inWater) {
                const moveDist = Math.sqrt((player.velocity.x * timeScale) ** 2 + (player.velocity.y * timeScale) ** 2);
                player.footstepTimer = (player.footstepTimer || 0) + moveDist;
                if (player.footstepTimer >= 48) {
                    audioManager.playGrassWalk();
                    player.footstepTimer = 0;
                }
            } else {
                player.footstepTimer = 0;
            }
        } else {
            player.velocity = { x: 0, y: 0 };
            player.footstepTimer = 0;
        }
    }

    // 3. Apply Velocity & Collision
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
        const nextX = player.pos.x + player.velocity.x * timeScale;
        const nextY = player.pos.y + player.velocity.y * timeScale;
        const tileX = Math.floor(nextX / TILE_SIZE);
        const tileY = Math.floor(nextY / TILE_SIZE);

        let collides = false;
        if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) collides = true;

        if (!collides) {
            const tile = map[tileY]?.[tileX];
            if (player.onBoat) {
                if (tile !== TileType.WATER && tile !== TileType.ICE) collides = true;
            } else {
                if (currentMapType === MapType.ICE_WORLD) {
                    if (tile === TileType.ICE || tile === TileType.MOUNTAIN) collides = true;
                } else {
                    if (tile === TileType.WATER || tile === TileType.MOUNTAIN) collides = true;
                }
            }
        }

        if (!collides && !player.onBoat) {
            const playerRad = player.radius * 0.8;
            for (let i = 0; i < decorations.length; i++) {
                const t = decorations[i];
                const dx = nextX - t.pos.x;
                const dy = nextY - t.pos.y;
                if (dx * dx + dy * dy < (playerRad + t.radius) * (playerRad + t.radius)) {
                    collides = true;
                    break;
                }
            }
        }

        if (!collides) {
            player.pos.x = nextX;
            player.pos.y = nextY;
            if (player.onBoat && boat) {
                boat.pos.x = nextX;
                boat.pos.y = nextY;
            }
        }
    }

    // 4. Facing
    const worldMouseX = mouseRef.current.x + cameraRef.current.x;
    if (worldMouseX < player.pos.x) player.facing = -1;
    else player.facing = 1;

    // 5. Environmental Effects (Ripples)
    const pTileX = Math.floor(player.pos.x/TILE_SIZE);
    const pTileY = Math.floor(player.pos.y/TILE_SIZE);
    const inWater = map[pTileY]?.[pTileX] === TileType.WATER;
    const inPuddle = !inWater && puddles.some(p => player.pos.x > p.x && player.pos.x < p.x+p.w && player.pos.y > p.y && player.pos.y < p.y+p.h);
    
    if ((inWater || inPuddle) && (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1) && Math.floor(timeRef) % 5 === 0) {
        ripples.push({x: player.pos.x, y: player.pos.y + 10, r: 0, maxR: 10, life: 30});
    }
};
