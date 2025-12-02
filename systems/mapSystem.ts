
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { TileType, MapType, Entity, Decoration, DecorationType, WeatherType, ShrineType, PropType } from '../types';

export const generateMapData = (mapType: MapType, weather: WeatherType) => {
    const map: TileType[][] = [];
    const seeds: number[][] = []; 
    const trees: Entity[] = [];
    const puddles: {x: number, y: number, w: number, h: number}[] = [];
    const groundDetails: Decoration[][] = [];
    const shrines: Entity[] = [];
    const props: Entity[] = [];
    let boat: Entity | null = null;

    const noise = (nx: number, ny: number) => {
        return Math.sin(nx * 0.1) * Math.cos(ny * 0.1) + Math.sin(nx * 0.3 + ny * 0.2) * 0.5;
    };

    const isIce = mapType === MapType.ICE_WORLD;
    let altarSpawned = false;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: TileType[] = [];
      const seedRow: number[] = [];
      const detailRow: Decoration[] = [];

      for (let x = 0; x < MAP_WIDTH; x++) {
          const n = noise(x, y);
          seedRow.push(Math.random());
          
          if (isIce) {
              if (n < -0.5) row.push(TileType.ICE); 
              else if (n > 0.8) row.push(TileType.MOUNTAIN); 
              else row.push(TileType.SNOW);
          } else {
              if (n < -0.6) row.push(TileType.WATER); 
              else if (n < -0.3) row.push(TileType.WATER); 
              else if (n < -0.15) row.push(TileType.SAND); 
              else if (n > 0.85) row.push(TileType.MOUNTAIN); 
              else row.push(TileType.GRASS);
          }

          const tile = row[x];
          // BOSS ALTAR LOGIC (One per map, far from center)
          const distFromCenter = Math.sqrt(Math.pow(x - MAP_WIDTH/2, 2) + Math.pow(y - MAP_HEIGHT/2, 2));
          if (!altarSpawned && distFromCenter > 20 && (tile === TileType.GRASS || tile === TileType.SNOW) && Math.random() > 0.995) {
               detailRow.push({
                   type: DecorationType.BOSS_ALTAR,
                   x: TILE_SIZE/2,
                   y: TILE_SIZE/2,
                   scale: 1.0,
                   active: true
               });
               altarSpawned = true;
          }
          else if ((tile === TileType.GRASS || tile === TileType.SNOW || tile === TileType.SAND) && Math.random() > 0.85) {
               let type = DecorationType.GRASS_TUFT;
               if (tile === TileType.GRASS) {
                   const r = Math.random();
                   if (r > 0.9) type = DecorationType.FLOWER_RED;
                   else if (r > 0.8) type = DecorationType.FLOWER_YELLOW;
                   else if (r > 0.6) type = DecorationType.PEBBLE;
                   else type = DecorationType.GRASS_TUFT;
               } else if (tile === TileType.SAND) {
                   type = Math.random() > 0.5 ? DecorationType.PEBBLE : DecorationType.ROCK;
               } else if (tile === TileType.SNOW) {
                   type = DecorationType.PEBBLE;
               }
               detailRow.push({
                   type,
                   x: Math.random() * (TILE_SIZE - 8) + 4,
                   y: Math.random() * (TILE_SIZE - 8) + 4,
                   scale: 0.8 + Math.random() * 0.4
               });
          } else {
               detailRow.push({ type: DecorationType.PEBBLE, x: -1, y: -1, scale: 0 });
          }
      }
      map.push(row);
      seeds.push(seedRow);
      groundDetails.push(detailRow);
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tile = map[y][x];
            const hasAltar = groundDetails[y][x].type === DecorationType.BOSS_ALTAR;
            
            if (hasAltar) continue;

            // Tree Logic
            if (tile === TileType.GRASS || tile === TileType.SNOW) {
                const treeNoise = Math.sin(x * 0.5) * Math.cos(y * 0.5);
                if (treeNoise > 0.65 && Math.random() > 0.4) {
                     trees.push({
                        id: `tree-${x}-${y}`,
                        type: 'tree',
                        pos: { x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2 },
                        velocity: { x: 0, y: 0 },
                        radius: 20, 
                        color: '', 
                        hp: 999,
                        maxHp: 999,
                        scale: 0.8 + Math.random() * 0.4
                    });
                }
            }
            // Puddle Logic
            if (!isIce && weather === WeatherType.RAIN && tile === TileType.GRASS && Math.random() > 0.98) {
                puddles.push({
                    x: x * TILE_SIZE + Math.random() * TILE_SIZE,
                    y: y * TILE_SIZE + Math.random() * TILE_SIZE,
                    w: 20 + Math.random() * 25,
                    h: 15 + Math.random() * 15
                });
            }
            
            // Shrine & Prop Logic (Shared probability space)
            if ((tile === TileType.GRASS || tile === TileType.SNOW || tile === TileType.SAND) && Math.random() > 0.985) {
                const px = x * TILE_SIZE + TILE_SIZE/2;
                const py = y * TILE_SIZE + TILE_SIZE/2;
                const hasTree = trees.some(t => Math.hypot(t.pos.x - px, t.pos.y - py) < 40);
                
                if (!hasTree) {
                    const r = Math.random();
                    // 10% Shrine
                    if (r < 0.10) {
                        let sType = ShrineType.GAMBLE;
                        let color = '#a855f7';
                        if (Math.random() < 0.33) { sType = ShrineType.BLOOD; color = '#ef4444'; }
                        else if (Math.random() < 0.66) { sType = ShrineType.HEAL; color = '#22c55e'; }

                        shrines.push({
                            id: `shrine-${x}-${y}`,
                            type: 'shrine',
                            shrineType: sType,
                            pos: { x: px, y: py },
                            velocity: {x:0,y:0},
                            radius: 25,
                            color: color,
                            hp: 1, maxHp: 1,
                            shrineUsed: false
                        });
                    } 
                    // 40% Barrel (Common Hazard)
                    else if (r < 0.50) {
                        props.push({
                            id: `barrel-${x}-${y}`,
                            type: 'prop',
                            propType: PropType.BARREL,
                            pos: { x: px, y: py },
                            velocity: {x:0, y:0},
                            radius: 18,
                            color: '#ef4444',
                            hp: 1, maxHp: 1,
                            propActive: true
                        });
                    }
                    // 5% Chest (Rare Reward)
                    else if (r < 0.55) {
                        props.push({
                            id: `chest-${x}-${y}`,
                            type: 'prop',
                            propType: PropType.CHEST,
                            pos: { x: px, y: py },
                            velocity: {x:0, y:0},
                            radius: 20,
                            color: '#facc15',
                            hp: 1, maxHp: 1,
                            propActive: true
                        });
                    }
                }
            }
        }
    }

    const cx = Math.floor(MAP_WIDTH / 2);
    const cy = Math.floor(MAP_HEIGHT / 2);
    for(let y = cy - 4; y <= cy + 4; y++) {
        for(let x = cx - 4; x <= cx + 4; x++) {
            map[y][x] = isIce ? TileType.SNOW : TileType.GRASS;
            const idx = trees.findIndex(t => Math.floor(t.pos.x/TILE_SIZE) === x && Math.floor(t.pos.y/TILE_SIZE) === y);
            if(idx !== -1) trees.splice(idx, 1);
            const sIdx = shrines.findIndex(t => Math.floor(t.pos.x/TILE_SIZE) === x && Math.floor(t.pos.y/TILE_SIZE) === y);
            if(sIdx !== -1) shrines.splice(sIdx, 1);
            const pIdx = props.findIndex(t => Math.floor(t.pos.x/TILE_SIZE) === x && Math.floor(t.pos.y/TILE_SIZE) === y);
            if(pIdx !== -1) props.splice(pIdx, 1);
            if (groundDetails[y] && groundDetails[y][x]) groundDetails[y][x] = { type: DecorationType.PEBBLE, x: -1, y: -1, scale: 0 };
        }
    }

    // BOAT & DOCK GENERATION
    if (!isIce) {
        let boatSpawned = false;
        // Search near center first for better gameplay flow? No, random exploration.
        // Actually, scanning from top-left (1,1) is fine.
        for (let y = 1; y < MAP_HEIGHT - 1; y++) {
            if(boatSpawned) break;
            for (let x = 1; x < MAP_WIDTH - 1; x++) {
                if (map[y][x] === TileType.WATER) {
                    // Check for adjacent land to place DOCK
                    if (map[y+1][x] === TileType.GRASS || map[y+1][x] === TileType.SAND) {
                        // Found a spot: Boat at (x,y) [Water], Dock at (x, y+1) [Land]
                        
                        // Spawn Boat
                        boat = {
                            id: 'boat', type: 'boat',
                            pos: { x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2 },
                            velocity: {x:0, y:0}, radius: 30, color: '#8b4513', hp: 999, maxHp: 999,
                            rotation: Math.PI / 2 // Face South (away from dock)
                        };
                        
                        // Spawn Dock Decoration
                        groundDetails[y+1][x] = {
                            type: DecorationType.DOCK,
                            x: TILE_SIZE/2,
                            y: TILE_SIZE/2,
                            scale: 1.0
                        };

                        boatSpawned = true;
                        break;
                    }
                }
            }
        }
    } else {
        // Ice world boat logic (Frozen in ice? Or just at edge water?)
        // For now, let's say Ice World has a boat at the edge if we want to allow travel back.
        // Or simply: Boat exists in Ice World too, allowing travel back to Grassland.
        let boatSpawned = false;
        for (let y = 1; y < MAP_HEIGHT - 1; y++) {
            if(boatSpawned) break;
            for (let x = 1; x < MAP_WIDTH - 1; x++) {
                if (map[y][x] === TileType.ICE || map[y][x] === TileType.WATER) {
                     if (map[y+1][x] === TileType.SNOW) {
                        boat = {
                            id: 'boat', type: 'boat',
                            pos: { x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2 },
                            velocity: {x:0, y:0}, radius: 30, color: '#8b4513', hp: 999, maxHp: 999,
                            rotation: Math.PI / 2
                        };
                        groundDetails[y+1][x] = { type: DecorationType.DOCK, x: TILE_SIZE/2, y: TILE_SIZE/2, scale: 1.0 };
                        boatSpawned = true;
                        break;
                     }
                }
            }
        }
    }

    return { map, seeds, trees, puddles, groundDetails, boat, shrines, props };
};
