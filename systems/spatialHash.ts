
import { Entity, Vector2 } from '../types';

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Entity[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  // Generate a unique key for the grid cell
  private getKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  // Clear the grid for the new frame
  clear() {
    this.grid.clear();
  }

  // Add an entity to the grid (can span multiple cells if large)
  insert(entity: Entity) {
    const startX = Math.floor((entity.pos.x - entity.radius) / this.cellSize);
    const endX = Math.floor((entity.pos.x + entity.radius) / this.cellSize);
    const startY = Math.floor((entity.pos.y - entity.radius) / this.cellSize);
    const endY = Math.floor((entity.pos.y + entity.radius) / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(entity);
      }
    }
  }

  // Retrieve potential collisions for a specific area/entity
  query(pos: Vector2, radius: number): Entity[] {
    const results = new Set<Entity>();
    const startX = Math.floor((pos.x - radius) / this.cellSize);
    const endX = Math.floor((pos.x + radius) / this.cellSize);
    const startY = Math.floor((pos.y - radius) / this.cellSize);
    const endY = Math.floor((pos.y + radius) / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            results.add(cell[i]);
          }
        }
      }
    }

    return Array.from(results);
  }
}
