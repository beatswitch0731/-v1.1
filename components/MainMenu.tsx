
import React from 'react';
import { CharacterClass } from '../types';
import { CLASS_STATS } from '../constants';
import { Sword, Crosshair, Flame, Play } from 'lucide-react';

interface MainMenuProps {
  onSelectClass: (c: CharacterClass) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectClass }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 bg-[url('https://picsum.photos/1920/1080?blur=5')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <div className="relative z-10 max-w-5xl w-full">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 tracking-tighter text-center">
          霓虹游侠
        </h1>
        <p className="text-center text-slate-400 mb-12 font-mono tracking-widest">协议：起源 // 选择干员</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Samurai */}
          <button 
            onClick={() => onSelectClass(CharacterClass.SAMURAI)}
            className="group relative bg-slate-800/50 border border-slate-700 hover:border-red-500 hover:bg-slate-800 transition-all duration-300 rounded-xl p-8 flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border-2 border-slate-600 group-hover:border-red-500 shadow-lg shadow-black">
              <Sword size={36} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">赛博武士</h3>
            <p className="text-slate-400 text-sm mb-6 min-h-[40px]">{CLASS_STATS[CharacterClass.SAMURAI].description}</p>
            <div className="mt-auto w-full">
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>速度</span><span>高</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full mb-3"><div className="w-[90%] h-full bg-red-500 rounded-full"></div></div>
               
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>射程</span><span>近战</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full"><div className="w-[10%] h-full bg-red-500 rounded-full"></div></div>
            </div>
          </button>

          {/* Gunner */}
          <button 
            onClick={() => onSelectClass(CharacterClass.GUNNER)}
            className="group relative bg-slate-800/50 border border-slate-700 hover:border-yellow-500 hover:bg-slate-800 transition-all duration-300 rounded-xl p-8 flex flex-col items-center text-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-yellow-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border-2 border-slate-600 group-hover:border-yellow-500 shadow-lg shadow-black">
              <Crosshair size={36} className="text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">重装枪手</h3>
            <p className="text-slate-400 text-sm mb-6 min-h-[40px]">{CLASS_STATS[CharacterClass.GUNNER].description}</p>
            <div className="mt-auto w-full">
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>速度</span><span>低</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full mb-3"><div className="w-[40%] h-full bg-yellow-500 rounded-full"></div></div>
               
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>防御</span><span>高</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full"><div className="w-[100%] h-full bg-yellow-500 rounded-full"></div></div>
            </div>
          </button>

          {/* Mage */}
          <button 
            onClick={() => onSelectClass(CharacterClass.MAGE)}
            className="group relative bg-slate-800/50 border border-slate-700 hover:border-purple-500 hover:bg-slate-800 transition-all duration-300 rounded-xl p-8 flex flex-col items-center text-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border-2 border-slate-600 group-hover:border-purple-500 shadow-lg shadow-black">
              <Flame size={36} className="text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">科技法师</h3>
            <p className="text-slate-400 text-sm mb-6 min-h-[40px]">{CLASS_STATS[CharacterClass.MAGE].description}</p>
            <div className="mt-auto w-full">
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>速度</span><span>中</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full mb-3"><div className="w-[60%] h-full bg-purple-500 rounded-full"></div></div>
               
               <div className="flex justify-between text-xs text-slate-500 uppercase font-bold mb-1"><span>范围</span><span>极高</span></div>
               <div className="w-full h-1 bg-slate-700 rounded-full"><div className="w-[95%] h-full bg-purple-500 rounded-full"></div></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
