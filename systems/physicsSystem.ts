
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

        if (player.onBoat) {
            // --- BOAT PHYSICS (Drift / Inertia) ---
            const acceleration = 0.2;
            const friction = 0.96; // Low friction for fluid feel
            const maxBoatSpeed = 8.0;

            if (dx !== 0 || dy !== 0) {
                // Normalize input
                const len = Math.sqrt(dx*dx + dy*dy);
                const ax = (dx / len) * acceleration * timeScale;
                const ay = (dy / len) * acceleration * timeScale;
                
                player.velocity.x += ax;
                player.velocity.y += ay;
                
                // Cap speed
                const currentSpeed = Math.sqrt(player.velocity.x**2 + player.velocity.y**2);
                if (currentSpeed > maxBoatSpeed) {
                    player.velocity.x = (player.velocity.x / currentSpeed) * maxBoatSpeed;
                    player.velocity.y = (player.velocity.y / currentSpeed) * maxBoatSpeed;
                }
            } else {
                // Drift when no input
                player.velocity.x *= friction;
                player.velocity.y *= friction;
                if (Math.abs(player.velocity.x) < 0.05) player.velocity.x = 0;
                if (Math.abs(player.velocity.y) < 0.05) player.velocity.y = 0;
            }
            
            // Boat Rotation (Align to velocity)
            if (Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.y) > 0.5) {
                // Smooth rotation toward velocity
                const targetRotation = Math.atan2(player.velocity.y, player.velocity.x);
                // We'll store rotation in the player object temporarily if on boat, 
                // but usually Entity doesn't use rotation for player. 
                // Let's use `rotation` property.
                if (player.rotation === undefined) player.rotation = 0;
                
                // Shortest angle interpolation
                let diff = targetRotation - player.rotation;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                
                player.rotation += diff * 0.1 * timeScale;
            }

        } else {
            // --- LAND PHYSICS (Snappy) ---
            if (dx !== 0 || dy !== 0) {
                let speed = stats.speed * (player.modifiers?.speedMult || 1);
                if (currentMapType === MapType.ICE_WORLD) speed *= 1.1;

                // Blizzard Slow
                const inBlizzard = projectiles.some(p => p.projectileType === 'BLIZZARD' && Math.hypot(p.pos.x - player.pos.x, p.pos.y - player.pos.y) < p.radius);
                if (inBlizzard) speed *= 0.5;

                const length = Math.sqrt(dx * dx + dy * dy);
                player.velocity = { x: (dx / length) * speed, y: (dy / length) * speed };

                // Footsteps
                const pTileX = Math.floor(player.pos.x/TILE_SIZE); 
                const pTileY = Math.floor(player.pos.y/TILE_SIZE); 
                const inWater = map[pTileY]?.[pTileX] === TileType.WATER;

                if (!inWater) {
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
    }

    // 3. Apply Velocity & Collision
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
        const nextX = player.pos.x + player.velocity.x * timeScale;
        const nextY = player.pos.y + player.velocity.y * timeScale;
        const tileX = Math.floor(nextX / TILE_SIZE);
        const tileY = Math.floor(nextY / TILE_SIZE);

        let collides = false;
        
        // Edge check allowed if on boat (to trigger map transition)
        // If NOT on boat, strictly bound to map
        if (!player.onBoat) {
            if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) collides = true;
        }

        if (!collides) {
            const tile = map[tileY]?.[tileX];
            
            // If checking collision within map bounds
            if (tile !== undefined) {
                if (player.onBoat) {
                    // Boat logic: Can collide with Land
                    // Allowed: Water, Ice (Deep Water)
                    // Blocked: Grass, Snow, Mountain, Sand, etc.
                    // EXCEPT: If we are close to the DOCK/Boat anchor point? 
                    // No, simpler to just allow Water/Ice/DeepWater.
                    // Map boundary logic handles transition.
                    
                    const isWater = tile === TileType.WATER || tile === TileType.ICE; // Ice here represents frozen water/deep water
                    if (!isWater) collides = true;
                } else {
                    // Land Logic
                    if (currentMapType === MapType.ICE_WORLD) {
                        // In Ice world, 'ICE' tile is the slick surface (walkable), 'MOUNTAIN' is wall.
                        // 'SNOW' is standard.
                        // Wait, mapSystem says: if n < -0.5 row.push(TileType.ICE). 
                        // Let's assume ICE is walkable but slippery? Or water?
                        // Usually Ice world has: Snow (Ground), Mountain (Wall), Ice (Frozen Water/Pits?).
                        // Let's treat Mountain as only collider.
                        if (tile === TileType.MOUNTAIN) collides = true;
                    } else {
                        // Grassland
                        if (tile === TileType.WATER || tile === TileType.MOUNTAIN) collides = true;
                    }
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
                boat.rotation = player.rotation; // Sync rotation
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
    
    // Boat wake or footsteps
    if ((inWater || inPuddle || player.onBoat) && (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.1) && Math.floor(timeRef) % 5 === 0) {
        const rSize = player.onBoat ? 20 : 10;
        ripples.push({x: player.pos.x, y: player.pos.y + 10, r: 0, maxR: rSize, life: 30});
    }
};
