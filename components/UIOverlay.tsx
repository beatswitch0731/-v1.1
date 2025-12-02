
import React from 'react';
import { GameState, CharacterClass, GameEventType } from '../types';
import { CLASS_STATS } from '../constants';
import { Shield, Skull, Heart, Lock, Zap, Crosshair, Bomb, Snowflake, Flame, Wind, Sword, Moon, Trophy, Flag, AlertTriangle } from 'lucide-react';

interface UIOverlayProps {
  stats: GameState;
  characterClass: CharacterClass;
  playerHp: number;
  playerAmmo?: number;
  playerMaxAmmo?: number;
  isReloading?: boolean;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, characterClass, playerAmmo = 14, playerMaxAmmo = 14, isReloading }) => {
  const classStats = CLASS_STATS[characterClass];
  
  // Calculate percentages for SVG ring
  const xpPct = Math.min(100, (stats.xp / stats.xpToNextLevel) * 100);
  const hpPct = Math.min(100, (stats.playerHp / stats.playerMaxHp) * 100);

  // Circle constants
  const circleRadius = 24;
  const circumference = 2 * Math.PI * circleRadius;
  const xpOffset = circumference - (xpPct / 100) * circumference;

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'cyclone': return <Wind />;
          case 'sword': return <Sword />;
          case 'heart': return <Heart />;
          case 'wind': return <Wind />;
          case 'bomb': return <Bomb />;
          case 'zap': return <Zap />;
          case 'crosshair': return <Crosshair />;
          case 'skull': return <Skull />;
          case 'snowflake': return <Snowflake />;
          case 'shield': return <Shield />;
          case 'flame': return <Flame />;
          case 'moon': return <Moon />;
          default: return <Zap />;
      }
  };

  const getClassIcon = () => {
    switch (characterClass) {
        case CharacterClass.SAMURAI: return <Sword size={22} className="text-sky-400" />;
        case CharacterClass.GUNNER: return <Crosshair size={22} className="text-orange-400" />;
        case CharacterClass.MAGE: return <Flame size={22} className="text-purple-400" />;
        default: return <Sword />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      
      {/* --- EVENT BANNER --- */}
      {stats.activeEvent && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-top-4 fade-in duration-500">
              <div 
                className="px-6 py-2 rounded-b-xl border-t-0 border-x-2 border-b-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center gap-3"
                style={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    borderColor: stats.activeEvent.color,
                    boxShadow: `0 0 15px ${stats.activeEvent.color}40`
                }}
              >
                  <AlertTriangle className="animate-pulse" color={stats.activeEvent.color} size={24} />
                  <div className="flex flex-col items-center">
                      <h3 className="text-lg font-black uppercase tracking-widest text-white leading-none mb-1">
                          {stats.activeEvent.name}
                      </h3>
                      <p className="text-xs font-mono text-white/80 uppercase">
                          {stats.activeEvent.description}
                      </p>
                  </div>
                  <AlertTriangle className="animate-pulse" color={stats.activeEvent.color} size={24} />
              </div>
              
              {/* Duration Bar */}
              <div className="w-full h-1 mt-1 bg-black/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-100 ease-linear"
                    style={{ 
                        width: `${(stats.activeEvent.timeLeft / stats.activeEvent.totalDuration) * 100}%`,
                        backgroundColor: stats.activeEvent.color
                    }}
                  />
              </div>
          </div>
      )}

      {/* BOSS HP BAR */}
      {stats.bossHp > 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-1/2 z-40 animate-in fade-in duration-500">
              <div className="flex justify-between text-white font-black text-lg mb-1 drop-shadow-md">
                  <span className="tracking-widest">{stats.bossName || 'BOSS'}</span>
                  <span className="text-red-400 font-mono">{stats.bossElement}</span>
              </div>
              <div className="h-4 w-full bg-slate-900/80 border border-slate-500 rounded-full relative overflow-hidden backdrop-blur-sm">
                   <div 
                      className="h-full bg-gradient-to-r from-red-800 to-red-600 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                      style={{ width: `${(stats.bossHp / stats.bossMaxHp) * 100}%` }}
                   />
              </div>
          </div>
      )}

      {/* Unified Top-Left Stats Panel */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg p-3 shadow-xl flex items-center gap-6 text-white min-w-[280px]">
            
            {/* Score */}
            <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <Trophy size={10} className="text-yellow-500"/> 分数
                </div>
                <div className="text-xl font-mono font-bold text-white leading-none">
                    {stats.score.toString().padStart(6, '0')}
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-700"></div>

            {/* Kills */}
            <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <Skull size={10} className="text-red-500"/> 击杀
                </div>
                <div className="text-xl font-mono font-bold text-red-100 leading-none">
                    {stats.enemiesKilled}
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-700"></div>

            {/* Wave */}
            <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    <Flag size={10} className="text-cyan-500"/> 波次
                </div>
                <div className="text-xl font-mono font-bold text-cyan-100 leading-none">
                    {stats.wave}
                </div>
            </div>
        </div>
      </div>

      {/* --- PLAYER HUD (Bottom Left) --- */}
      <div className="absolute bottom-4 left-4 flex items-end gap-3 pointer-events-auto">
        
        {/* Avatar & Circular XP Bar */}
        <div className="relative w-20 h-20 flex-shrink-0">
            {/* Level Badge */}
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 z-20 shadow-md">
                {stats.level}
            </div>

            {/* Circular Progress SVG */}
            <svg className="w-full h-full -rotate-90 drop-shadow-lg" viewBox="0 0 80 80">
                {/* Background Ring */}
                <circle
                    cx="40" cy="40" r={circleRadius}
                    fill="rgba(15, 23, 42, 0.6)"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="4"
                />
                {/* XP Progress Ring */}
                <circle
                    cx="40" cy="40" r={circleRadius}
                    fill="transparent"
                    stroke="#facc15"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={xpOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>

            {/* Class Icon (Centered) */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-slate-800/90 flex items-center justify-center backdrop-blur-sm shadow-inner ring-1 ring-white/10">
                    {getClassIcon()}
                </div>
            </div>
        </div>

        {/* Stats Panel (Glassmorphism) */}
        <div className="flex flex-col gap-1 mb-2">
            
            {/* --- GUNNER AMMO BAR --- */}
            {characterClass === CharacterClass.GUNNER && (
                <div className="mb-2 bg-slate-900/80 backdrop-blur-md border border-slate-600 rounded-md p-1.5 shadow-lg flex gap-1 items-center">
                    {isReloading ? (
                         <div className="text-xs font-bold text-yellow-500 animate-pulse px-2 uppercase tracking-widest">Reloading...</div>
                    ) : (
                        Array.from({ length: playerMaxAmmo }).map((_, i) => {
                            const isActive = i < playerAmmo;
                            
                            // Color logic:
                            // Last 3 bullets (index 0, 1, 2) => RED
                            // Next 5 bullets (index 3-7) => ORANGE
                            // Rest (index 8-13) => YELLOW
                            
                            let barColor = 'bg-yellow-400';
                            let glow = '';
                            
                            if (i < 3) {
                                barColor = 'bg-red-500';
                                if (isActive) glow = 'shadow-[0_0_5px_rgba(239,68,68,0.8)]';
                            } else if (i < 8) {
                                barColor = 'bg-orange-500';
                                if (isActive) glow = 'shadow-[0_0_4px_rgba(249,115,22,0.6)]';
                            }
                            
                            return (
                                <div 
                                    key={i}
                                    className={`
                                        w-1.5 h-3 rounded-sm transition-all duration-200
                                        ${!isActive ? 'bg-slate-700' : `${barColor} ${glow}`}
                                    `}
                                />
                            )
                        })
                    )}
                </div>
            )}

            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg p-2 pr-4 shadow-lg flex flex-col gap-1 min-w-[140px]">
                
                {/* HP Row */}
                <div className="flex items-center gap-2">
                    <Heart size={14} className="text-red-500 fill-red-500" />
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${hpPct}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-white font-mono min-w-[50px] text-right">
                        {Math.ceil(stats.playerHp)}
                    </span>
                </div>

                {/* Attack Row */}
                <div className="flex items-center gap-2">
                    <Sword size={14} className="text-sky-400" />
                    <span className="text-[10px] text-sky-200 uppercase tracking-wider flex-1">攻击力</span>
                    <span className="text-xs font-bold text-sky-400 font-mono">
                        {Math.floor(stats.currentDamage)}
                    </span>
                </div>
            </div>
        </div>

        {/* Skills (Compact) */}
        <div className="flex gap-3 ml-4 mb-1">
            {classStats.skills.map((skill, idx) => {
                const isLocked = stats.level < skill.unlockLevel;
                const remaining = stats.activeCooldowns[idx] || 0;
                const onCooldown = remaining > 0;
                
                return (
                    <div key={skill.id} className="relative group">
                        <div className={`
                             w-12 h-12 rounded-lg border flex items-center justify-center shadow-lg transition-all duration-200
                             ${isLocked ? 'bg-slate-800/80 border-slate-700 grayscale' : 'bg-slate-900/60 border-slate-500 backdrop-blur-md'}
                             ${!isLocked && !onCooldown ? 'hover:border-yellow-400 hover:scale-105 hover:bg-slate-800 cursor-pointer' : ''}
                        `}>
                            {isLocked ? <Lock size={16} className="text-slate-600" /> : <div className="text-slate-200">{getIcon(skill.icon)}</div>}
                            
                            {/* Key Hint */}
                            <div className="absolute -bottom-2 right-1/2 translate-x-1/2 text-[9px] font-bold text-slate-400 bg-black/80 px-1.5 rounded-full border border-slate-700">
                                {idx + 1}
                            </div>

                            {/* Cooldown Overlay */}
                            {onCooldown && (
                                <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-xs font-bold font-mono">
                                    {(remaining / 1000).toFixed(0)}
                                </div>
                            )}
                        </div>
                         {/* Tooltip */}
                         <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-40 bg-black/90 border border-slate-700 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                            <div className="font-bold text-yellow-400 mb-1">{skill.name}</div>
                            <div className="text-slate-400 leading-tight">{skill.description}</div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

    </div>
  );
};

export default UIOverlay;
