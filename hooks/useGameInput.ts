
import { useEffect, useRef } from 'react';
import { Vector2 } from '../types';
import { INTERNAL_WIDTH, INTERNAL_HEIGHT } from '../constants';

export const useGameInput = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isPaused: boolean,
  levelUpOptions: any,
  evolutionOptions: any,
  onTogglePause: () => void,
  characterClass: string,
  playerRef: React.MutableRefObject<any>,
  addFloatingText: (text: string, x: number, y: number, color: string, scale?: number) => void,
  audioManager: any,
  triggerSkill: (slot: number) => void,
  triggerDash: () => void,
  interact: () => void,
  cameraRef: React.MutableRefObject<Vector2>
) => {
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<Vector2>({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);

      if (e.key === 'Escape') onTogglePause();
      if (isPaused || levelUpOptions || evolutionOptions) return;

      if (e.code === 'KeyR' && characterClass === 'GUNNER') {
        const player = playerRef.current;
        if (player.ammo! < player.maxAmmo! && !player.reloading) {
          player.reloading = true;
          const isFastReload = player.quickReloadBuffTimer && player.quickReloadBuffTimer > 0;
          player.reloadTimer = isFastReload ? 1000 : 2000;
          if (isFastReload) addFloatingText("快速装填!", player.pos.x, player.pos.y - 70, '#38bdf8', 1.2);
          else addFloatingText("装弹中...", player.pos.x, player.pos.y - 50, '#9ca3af', 1.2);
        }
      }

      if (e.key === '1') triggerSkill(0);
      if (e.key === '2') {
         // Skill 2 logic is special for Samurai (Hold), handled in update loop via keysRef check
         // But we trigger the initial press here for others or Samurai start
         triggerSkill(1);
      }
      if (e.key === '3') triggerSkill(2);
      if (e.key === '4') triggerSkill(3);

      if (e.code === 'Space') triggerDash();
      if (e.code === 'KeyE') interact();
    };

    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current = {
          x: (e.clientX - rect.left) * (INTERNAL_WIDTH / rect.width),
          y: (e.clientY - rect.top) * (INTERNAL_HEIGHT / rect.height)
        };
      }
    };

    const handleMouseDown = () => keysRef.current.add('MOUSE_LEFT');
    const handleMouseUp = () => keysRef.current.delete('MOUSE_LEFT');

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPaused, levelUpOptions, evolutionOptions, characterClass, onTogglePause]);

  return { keysRef, mouseRef };
};
