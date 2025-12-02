import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
// UIOverlay moved inside GameCanvas
import MainMenu from './components/MainMenu';
import { CharacterClass, GameState, WeatherType, MapType } from './types';
import { generateMissionBriefing } from './services/geminiService';
import { audioManager } from './services/audioSystem';
import { Loader2, RefreshCcw, LogOut, Pause, Play, Save } from 'lucide-react';

// BGM Playlist Configuration
const BGM_PLAYLIST = [
  { title: "Sunflower - Post Malone", url: "/music/post%20malone-swae%20lee-sunflower(1).mp3" },
  // 现在可以使用相对路径了 (会自动沿用第一首歌的目录 /music/)
  { title: "Neon Drive (Demo)", url: "neon_drive_demo.mp3" }, 
  { title: "Night City (Demo)", url: "night_city_demo.mp3" }  
];

// Helper: Resolve URL (handles relative paths based on the first track)
const resolveTrackUrl = (index: number) => {
    const track = BGM_PLAYLIST[index];
    if (!track) return '';

    const url = track.url;
    // If it's absolute path or external link, use as is
    if (url.startsWith('/') || url.startsWith('http')) {
        return url;
    }

    // Otherwise, attempt to resolve relative to the first track's directory
    const baseTrack = BGM_PLAYLIST[0];
    if (baseTrack && (baseTrack.url.startsWith('/') || baseTrack.url.startsWith('http'))) {
        const lastSlashIndex = baseTrack.url.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            const baseUrl = baseTrack.url.substring(0, lastSlashIndex + 1);
            return baseUrl + url;
        }
    }

    return url; // Fallback
};

enum AppPhase {
  MENU = 'MENU',
  LOADING = 'LOADING',
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.MENU);
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.SAMURAI);
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(WeatherType.SUNNY);
  const [lore, setLore] = useState<string>('');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bgmVolume, setBgmVolume] = useState<number>(0.4);
  const [sfxVolume, setSfxVolume] = useState<number>(0.5);
  // New: BGM Source State
  const [bgmSource, setBgmSource] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  // New: Track State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    wave: 1,
    enemiesKilled: 0,
    timeElapsed: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    weather: WeatherType.SUNNY,
    playerHp: 100,
    playerMaxHp: 100,
    activeCooldowns: {},
    currentMapType: MapType.GRASSLAND,
    bossHp: 0,
    bossMaxHp: 0,
    dashCooldownPct: 100,
    currentDamage: 0
  });

  // --- AUDIO LOGIC ---
  
  // Effect to update Audio Source when track changes
  useEffect(() => {
      if (audioRef.current) {
          const resolvedUrl = resolveTrackUrl(currentTrackIndex);
          // Only update src if it changed to avoid reloading if logic reruns
          if (audioRef.current.getAttribute('src') !== resolvedUrl) {
              audioRef.current.src = resolvedUrl;
              // If we are already playing external audio, the source change stops it, so we need to resume if active
              if (phase === AppPhase.GAME && bgmSource === 'EXTERNAL' && !isPaused) {
                  audioRef.current.play().catch(e => console.log("Track switch play prevented:", e));
              }
          }
      }
  }, [currentTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only play external BGM if source is EXTERNAL
    if (phase === AppPhase.GAME && bgmSource === 'EXTERNAL') {
        audio.volume = isMuted ? 0 : bgmVolume; 
        if (!isPaused) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented until interaction:", error);
                });
            }
        } else {
            audio.pause();
        }
    } else {
        // Pause if Menu, Loading, GameOver OR if Internal Source selected
        audio.pause();
        if (phase === AppPhase.MENU) {
            audio.currentTime = 0;
            // Reset track on menu return? Optional.
        }
    }
  }, [phase, isMuted, bgmVolume, isPaused, bgmSource, currentTrackIndex]);

  useEffect(() => {
      audioManager.setMuted(isMuted);
      audioManager.setSfxVolume(sfxVolume);
      if (audioRef.current) {
          audioRef.current.muted = isMuted;
          audioRef.current.volume = bgmVolume;
      }
  }, [isMuted, sfxVolume, bgmVolume]);

  const handleStartGame = async (charClass: CharacterClass) => {
    audioManager.init();
    audioManager.setSfxVolume(sfxVolume);

    setSelectedClass(charClass);
    setPhase(AppPhase.LOADING);
    setIsPaused(false);
    
    const pickedWeather = WeatherType.SUNNY; 
    setCurrentWeather(pickedWeather);

    const seed = Math.floor(Math.random() * 9999);
    const briefing = await generateMissionBriefing(charClass, seed);
    setLore(briefing);
    
    setTimeout(() => {
        setPhase(AppPhase.GAME);
    }, 2000);
  };

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setPhase(AppPhase.GAME_OVER);
    setIsPaused(false);
  }, []);
  
  const handleStatsUpdate = useCallback((stats: GameState) => {
      setGameState(stats);
  }, []);

  const handleTogglePause = useCallback(() => {
      setIsPaused(prev => !prev);
  }, []);

  const handleSaveGame = () => {
      alert("游戏已保存! (Mock functionality)");
  };

  const handleNextTrack = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % BGM_PLAYLIST.length);
  };

  const handlePrevTrack = () => {
      setCurrentTrackIndex((prev) => (prev - 1 + BGM_PLAYLIST.length) % BGM_PLAYLIST.length);
  };

  const handleReturnToMenu = () => {
    setPhase(AppPhase.MENU);
    setIsPaused(false);
    setGameState({ 
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
      wave: 1,
      enemiesKilled: 0,
      timeElapsed: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      weather: WeatherType.SUNNY,
      playerHp: 100,
      playerMaxHp: 100,
      activeCooldowns: {},
      currentMapType: MapType.GRASSLAND,
      bossHp: 0,
      bossMaxHp: 0,
      dashCooldownPct: 100,
      currentDamage: 0
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-200 font-sans text-slate-900">
      
      <audio ref={audioRef} src={resolveTrackUrl(0)} loop />

      {phase === AppPhase.MENU && (
        <MainMenu onSelectClass={handleStartGame} />
      )}

      {phase === AppPhase.LOADING && (
        <div className="flex flex-col items-center justify-center h-full bg-sky-100 text-center p-8">
           <Loader2 className="animate-spin text-blue-500 mb-6" size={64} />
           <h2 className="text-2xl font-bold text-blue-600 mb-4 animate-pulse">准备部署中...</h2>
           <div className="text-gray-500 mb-2">环境: {currentWeather}</div>
           <div className="max-w-xl bg-white border border-blue-200 p-6 rounded-lg shadow-xl">
              <div className="text-xs text-blue-400 uppercase tracking-widest mb-2 border-b border-blue-100 pb-2">任务简报</div>
              <p className="font-mono text-slate-700 leading-relaxed type-writer">
                 {lore || "初始化中..."}
              </p>
           </div>
        </div>
      )}

      {phase === AppPhase.GAME && (
        <>
          <GameCanvas 
            characterClass={selectedClass} 
            weather={currentWeather}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onGameOver={handleGameOver} 
            onStatsUpdate={handleStatsUpdate}
            // Pass Audio Props
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            bgmVolume={bgmVolume}
            onSetBgmVolume={setBgmVolume}
            sfxVolume={sfxVolume}
            onSetSfxVolume={setSfxVolume}
            bgmSource={bgmSource}
            onSetBgmSource={setBgmSource}
            // Pass Track Props
            currentTrackName={BGM_PLAYLIST[currentTrackIndex].title}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
          />
          {/* UIOverlay is now rendered INSIDE GameCanvas to react faster to high-frequency state like ammo */}
          
          {/* Pause Menu Overlay */}
          {isPaused && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center cursor-auto">
                 <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-2xl w-80 shadow-2xl">
                     <div className="flex items-center justify-center text-white mb-8 gap-2">
                        <Pause size={32} />
                        <h2 className="text-3xl font-black tracking-widest">已暂停</h2>
                     </div>
                     <div className="flex flex-col gap-4">
                        <button onClick={handleTogglePause} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors">
                            <Play size={20} /> 继续游戏
                        </button>
                         <button onClick={handleSaveGame} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors">
                            <Save size={20} /> 保存游戏
                        </button>
                        <button onClick={handleReturnToMenu} className="bg-red-900/50 hover:bg-red-900 text-red-200 font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors">
                            <LogOut size={20} /> 返回主菜单
                        </button>
                     </div>
                 </div>
             </div>
          )}
        </>
      )}

      {phase === AppPhase.GAME_OVER && (
        <div className="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center z-50 cursor-auto">
           <div className="bg-white border-2 border-red-500 p-12 rounded-2xl text-center shadow-2xl max-w-lg w-full">
              <h2 className="text-6xl font-black text-red-500 mb-2">任务失败</h2>
              <div className="text-xl text-gray-500 mb-8 uppercase tracking-[0.2em]">行动终止</div>
              
              <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-500">最终得分</div>
                  <div className="text-right font-bold text-slate-800 text-xl">{finalScore}</div>
                  <div className="text-gray-500">击杀敌人</div>
                  <div className="text-right font-bold text-slate-800 text-xl">{gameState.enemiesKilled}</div>
                  <div className="text-gray-500">达成等级</div>
                  <div className="text-right font-bold text-slate-800 text-xl">{gameState.level}</div>
              </div>

              <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => handleStartGame(selectedClass)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors shadow-lg"
                  >
                    <RefreshCcw size={20} /> 重试
                  </button>
                  <button 
                    onClick={handleReturnToMenu}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded font-bold transition-colors"
                  >
                    <LogOut size={20} /> 菜单
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;