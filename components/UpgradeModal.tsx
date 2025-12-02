import React from 'react';
import { Upgrade } from '../types';
import { Sword, Wind, Zap, Crosshair, Shield, Copy, Skull, Target } from 'lucide-react';

interface UpgradeModalProps {
  options: Upgrade[];
  onSelect: (upgrade: Upgrade) => void;
  title?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ options, onSelect, title }) => {
  const getIcon = (icon: string, size: number) => {
    switch(icon) {
      case 'sword': return <Sword size={size} />;
      case 'wind': return <Wind size={size} />;
      case 'zap': return <Zap size={size} />;
      case 'crosshair': return <Crosshair size={size} />;
      case 'shield': return <Shield size={size} />;
      case 'copy': return <Copy size={size} />;
      case 'skull': return <Skull size={size} />;
      case 'target': return <Target size={size} />;
      default: return <Zap size={size} />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'LEGENDARY': return 'border-orange-500 bg-orange-950/80 shadow-orange-500/50';
      case 'EPIC': return 'border-purple-500 bg-purple-950/80 shadow-purple-500/50';
      case 'RARE': return 'border-blue-500 bg-blue-950/80 shadow-blue-500/50';
      default: return 'border-slate-500 bg-slate-900/80 shadow-slate-500/50';
    }
  };

  const getRarityText = (rarity: string) => {
    switch(rarity) {
      case 'LEGENDARY': return 'text-orange-400';
      case 'EPIC': return 'text-purple-400';
      case 'RARE': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  // Helper to translate rarity enum to Chinese
  const getRarityLabel = (rarity: string) => {
      switch(rarity) {
          case 'LEGENDARY': return '传说';
          case 'EPIC': return '史诗';
          case 'RARE': return '稀有';
          default: return '普通';
      }
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300 cursor-auto">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 tracking-tight drop-shadow-sm">
          {title || "系统升级"}
        </h2>
        <p className="text-slate-400 font-mono text-sm tracking-widest mt-2">{title === "技能进化" ? "选择专属技能强化" : "选择强化模块"}</p>
      </div>

      <div className="flex gap-6 max-w-5xl w-full px-8 justify-center items-stretch">
        {options.map((option, idx) => (
          <button
            key={option.id + idx}
            onClick={() => onSelect(option)}
            className={`
              group relative flex-1 p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:-translate-y-2
              flex flex-col items-center text-center shadow-lg
              ${getRarityColor(option.rarity)}
            `}
          >
            <div className={`
              w-20 h-20 rounded-full bg-black/50 flex items-center justify-center mb-4 
              border border-white/10 group-hover:border-white/50 transition-colors
              ${getRarityText(option.rarity)}
            `}>
              {getIcon(option.icon, 40)}
            </div>
            
            <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${getRarityText(option.rarity)}`}>
              {getRarityLabel(option.rarity)}
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-yellow-200 transition-colors">
              {option.name}
            </h3>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              {option.description}
            </p>

            <div className="mt-auto pt-6 w-full opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="bg-white/20 text-white text-xs font-bold py-2 rounded uppercase">
                 安装模块
               </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UpgradeModal;