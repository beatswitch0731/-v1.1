
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private sfxVolume: number = 0.5; // 默认音效音量

  init() {
    if (this.ctx) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.warn("Audio resume failed", e));
        }
        return;
    }
    
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.sfxVolume; // 使用存储的音量
        this.masterGain.connect(this.ctx.destination);

        const duration = 2.0;
        const bufferSize = this.ctx.sampleRate * duration;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } catch (e) {
        console.error("Web Audio API not supported", e);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      // 静音归零，否则恢复到设定音量
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.sfxVolume, t + 0.1);
    }
  }

  // 新增：单独设置音效音量
  setSfxVolume(volume: number) {
      this.sfxVolume = volume;
      if (this.masterGain && this.ctx && !this.isMuted) {
          const t = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(t);
          this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
          this.masterGain.gain.linearRampToValueAtTime(volume, t + 0.1);
      }
  }

  private createNoiseNode(): AudioBufferSourceNode | null {
      if (!this.ctx || !this.noiseBuffer) return null;
      const node = this.ctx.createBufferSource();
      node.buffer = this.noiseBuffer;
      node.loop = true; 
      return node;
  }

  // 修改：草地行走音效 (ASMR / Natural Texture)
  // 核心目标：自然、扎实 (Solid & Grounded)，去除刺耳高频
  playGrassWalk() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const noise = this.createNoiseNode();
      if (!noise) return;

      const gain = this.ctx.createGain();
      
      // 概率分布：50% 柔和, 30% 摩擦, 20% 顿挫
      const rand = Math.random();
      let type: 'SOFT' | 'BRUSH' | 'THUD';
      if (rand < 0.5) type = 'SOFT';
      else if (rand < 0.8) type = 'BRUSH';
      else type = 'THUD';

      // --- 滤波器链 ---
      // Filter 1: 塑形 (Shaping)
      // Filter 2: 驯化 (Taming) - 全局去噪
      const shapeFilter = this.ctx.createBiquadFilter(); 
      const tamingFilter = this.ctx.createBiquadFilter(); 

      // UPDATED: 降低到 900Hz 以彻底消除刺耳高频 (原 2200Hz)
      tamingFilter.type = 'lowpass';
      tamingFilter.frequency.setValueAtTime(900, t); 
      tamingFilter.Q.value = 0.5; 

      noise.connect(shapeFilter);
      shapeFilter.connect(tamingFilter);
      tamingFilter.connect(gain);
      gain.connect(this.masterGain!);

      // 通用随机微调
      const pitchJitter = (Math.random() - 0.5) * 0.1;

      if (type === 'SOFT') {
          // 变体 A: "踏" (基础步)
          noise.playbackRate.value = 0.5 + pitchJitter; 

          // 保持低沉
          shapeFilter.type = 'lowpass';
          shapeFilter.frequency.setValueAtTime(500, t); 

          // 包络 (降低音量: 0.5 -> 0.25)
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.25, t + 0.05); 
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); 

          noise.start(t);
          noise.stop(t + 0.3);

      } else if (type === 'BRUSH') {
          // 变体 B: "沙" (草叶摩擦)
          noise.playbackRate.value = 0.7 + pitchJitter; 

          // 带通：中频摩擦声 (降低频率 1200 -> 700)
          shapeFilter.type = 'bandpass';
          shapeFilter.frequency.setValueAtTime(700 + Math.random() * 100, t); 
          shapeFilter.Q.value = 0.8; 

          // 包络 (降低音量: 0.4 -> 0.2)
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

          noise.start(t);
          noise.stop(t + 0.25);

      } else {
          // 变体 C: "顿" 
          noise.playbackRate.value = 0.4 + pitchJitter;

          // 峰值滤波器：强调中低频 (500Hz)
          shapeFilter.type = 'peaking';
          shapeFilter.frequency.setValueAtTime(500, t); 
          shapeFilter.gain.value = 4; 
          shapeFilter.Q.value = 1.0;

          // 包络 (降低音量: 0.5 -> 0.3)
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.3, t + 0.02); 
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

          noise.start(t);
          noise.stop(t + 0.2);
      }
  }

  // 新增：居合蓄力完成的风声
  playChargeReady() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const noise = this.createNoiseNode();
    if (!noise) return;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // 模拟风声：使用带通滤波器扫频
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t); // 起始频率
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.5); // 快速上升
    filter.Q.value = 1.0; // 宽带通

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.2); // 淡入
    gain.gain.linearRampToValueAtTime(0, t + 0.8); // 淡出

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(t);
    noise.stop(t + 0.8);
  }

  // Add electromagnetic sound for Funnel impacts
  playElectricImpact() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // 1. Zap sound (Sawtooth drop)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);

    // 2. Static Burst (High freq noise)
    const noise = this.createNoiseNode();
    if (noise) {
        const nGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain!);
        nGain.gain.setValueAtTime(0.1, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        noise.start(t);
        noise.stop(t + 0.05);
    }
  }

  playShoot(mode: 'GUN' | 'MAGIC' | 'MELEE' = 'GUN') {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); }
    if (this.isMuted) return;

    const t = this.ctx.currentTime;

    if (mode === 'GUN') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t); 
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);

        const noise = this.createNoiseNode();
        if (noise) {
            const noiseGain = this.ctx.createGain();
            noise.connect(noiseGain);
            noiseGain.connect(this.masterGain!);
            noiseGain.gain.setValueAtTime(0.4, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            noise.start(t);
            noise.stop(t + 0.05);
        }

    } else if (mode === 'MAGIC') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 0.2);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.masterGain!);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1500, t);
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc2.start(t);
        osc2.stop(t + 0.3);

    } else {
        // SAMURAI - "Bamboo Cut" - Crisp, High-Frequency Snap
        
        // 1. The "Blade Air" (High Hiss)
        // Emphasizes the sharpness of the edge moving through air/target
        // High-pass filter > 3000Hz to remove all mud
        const hiss = this.createNoiseNode();
        if (hiss) {
            const hissGain = this.ctx.createGain();
            const hissFilter = this.ctx.createBiquadFilter();
            
            hiss.connect(hissFilter);
            hissFilter.connect(hissGain);
            hissGain.connect(this.masterGain!);
            
            hissFilter.type = 'highpass';
            hissFilter.frequency.setValueAtTime(3000, t); 
            
            hissGain.gain.setValueAtTime(0, t);
            hissGain.gain.linearRampToValueAtTime(0.5, t + 0.005);
            hissGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            
            hiss.start(t);
            hiss.stop(t + 0.12);
        }

        // 2. The "Snap" (Fast Frequency Sweep)
        // Simulates the material breaking/cutting instantly
        // Ultra fast sine drop (5000Hz -> 500Hz in 30ms) = Sharp Tick
        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.connect(snapGain);
        snapGain.connect(this.masterGain!);
        
        snapOsc.type = 'sine'; 
        snapOsc.frequency.setValueAtTime(5000, t); // Start extremely high
        snapOsc.frequency.exponentialRampToValueAtTime(500, t + 0.03); 
        
        snapGain.gain.setValueAtTime(0, t);
        snapGain.gain.linearRampToValueAtTime(0.6, t + 0.002);
        snapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
        
        snapOsc.start(t);
        snapOsc.stop(t + 0.03);
    }
  }

  playIaidoSlash() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Heavy Low Boom (Wind Pressure)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain!);
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(150, t);
    boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    boomGain.gain.setValueAtTime(0.6, t);
    boomGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    boomOsc.start(t);
    boomOsc.stop(t + 0.3);

    // 2. Sharp "Shing" (Blade)
    const bladeOsc = this.ctx.createOscillator();
    const bladeGain = this.ctx.createGain();
    bladeOsc.connect(bladeGain);
    bladeGain.connect(this.masterGain!);
    bladeOsc.type = 'sawtooth';
    bladeOsc.frequency.setValueAtTime(2000, t);
    bladeOsc.frequency.linearRampToValueAtTime(500, t + 0.1); // Pitch drop for 'cut'
    bladeGain.gain.setValueAtTime(0.2, t);
    bladeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    bladeOsc.start(t);
    bladeOsc.stop(t + 0.15);

    // 3. Extended Noise (Wind Rush)
    const noise = this.createNoiseNode();
    if (noise) {
        const noiseGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain!);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.linearRampToValueAtTime(1500, t + 0.1); // Filter sweep
        filter.frequency.linearRampToValueAtTime(100, t + 0.4);

        noiseGain.gain.setValueAtTime(0.6, t);
        noiseGain.gain.linearRampToValueAtTime(0, t + 0.4);
        
        noise.start(t);
        noise.stop(t + 0.4);
    }
  }

  playImpact() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playParry() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. High Metallic Ring (Sine fundamental)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(this.masterGain!);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.5, t + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.2); // Long tail ring
    osc1.start(t);
    osc1.stop(t + 1.2);

    // 2. Overtone (Discordant high pitch for metal texture)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(3200, t); 
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc2.start(t);
    osc2.stop(t + 0.6);

    // 3. Impact Click (Sharp attack)
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(this.masterGain!);
    osc3.type = 'square';
    osc3.frequency.setValueAtTime(500, t);
    osc3.frequency.exponentialRampToValueAtTime(5000, t + 0.05); // Zip up
    gain3.gain.setValueAtTime(0.2, t);
    gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc3.start(t);
    osc3.stop(t + 0.05);
  }

  playDash() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const noise = this.createNoiseNode();
      if (!noise) return;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(100, t + 0.3);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(t);
      noise.stop(t + 0.3);
  }

  playExplosion() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const noise = this.createNoiseNode();
      if (!noise) return;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.exponentialRampToValueAtTime(10, t + 0.8);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      noise.start(t);
      noise.stop(t + 0.8);
  }
  
  playLevelUp() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const playNote = (freq: number, offset: number) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, t + offset);
          gain.gain.setValueAtTime(0.15, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.2);
          osc.start(t + offset);
          osc.stop(t + offset + 0.2);
      };
      playNote(523.25, 0); 
      playNote(659.25, 0.1); 
      playNote(783.99, 0.2); 
      playNote(1046.50, 0.3); 
  }

  playSkill(index: number) {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      if (index === 3) { 
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.linearRampToValueAtTime(50, t + 1.5);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.linearRampToValueAtTime(0, t + 1.5);
          osc.start(t);
          osc.stop(t + 1.5);
      } else {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.type = 'square';
          osc.frequency.setValueAtTime(440 + index * 100, t);
          osc.frequency.exponentialRampToValueAtTime(880 + index * 100, t + 0.1);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
          osc.start(t);
          osc.stop(t + 0.1);
      }
  }

  // New: Crisp, Heavy Single Shot for High Noon
  // INCREASED VOLUME as requested
  playHighNoonBang() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // 1. The Kick (Low Boom)
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain!);
    
    kickOsc.frequency.setValueAtTime(120, t);
    kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    
    // Volume Boosted
    kickGain.gain.setValueAtTime(2.0, t);
    kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    kickOsc.start(t);
    kickOsc.stop(t+0.3);

    // 2. The Crack (High Burst Noise)
    const noise = this.createNoiseNode();
    if (noise) {
        const nGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Highpass to ensure crispness
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, t);

        // Volume Boosted
        nGain.gain.setValueAtTime(1.5, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.masterGain!);
        noise.start(t);
        noise.stop(t+0.15);
    }
  }

  // New: Lasso Impact - "Pa!" + Sizzle
  playLassoImpact() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. "Pa!" - Sharp Snap/Pop
    // White Noise burst with tight envelope
    const noise = this.createNoiseNode();
    if (noise) {
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Highpass/Bandpass to get the "snap" character
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.Q.value = 0.5;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.8, t + 0.005); // Super fast attack
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1); // Short decay

        noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
        noise.start(t); noise.stop(t+0.1);
    }

    // 2. Sizzle - Electric Current
    const sizzle = this.createNoiseNode();
    if (sizzle) {
        const sGain = this.ctx.createGain();
        const sFilter = this.ctx.createBiquadFilter();

        sFilter.type = 'highpass';
        sFilter.frequency.setValueAtTime(3000, t);

        sGain.gain.setValueAtTime(0.3, t);
        sGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        sizzle.connect(sFilter); sFilter.connect(sGain); sGain.connect(this.masterGain!);
        sizzle.start(t); sizzle.stop(t+0.5);
    }
  }

  // New Western/Gunner specific SFX
  playWesternSkill(index: number) {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      if (index === 0) {
          // ELECTRO-LASSO: Throw sound (Whoosh)
          const noise = this.createNoiseNode();
          if (noise) {
              const gain = this.ctx.createGain();
              const filter = this.ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(400, t);
              filter.frequency.linearRampToValueAtTime(1200, t + 0.2);
              
              gain.gain.setValueAtTime(0.4, t);
              gain.gain.linearRampToValueAtTime(0, t + 0.3);

              noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
              noise.start(t); noise.stop(t+0.3);
          }

      } else if (index === 1) {
          // FAN THE HAMMER: Rapid fire
          // Burst of 5 quick shots
          for(let i=0; i<6; i++) {
              const st = t + i * 0.05;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(600, st);
              osc.frequency.exponentialRampToValueAtTime(100, st + 0.04);
              gain.gain.setValueAtTime(0.2, st);
              gain.gain.exponentialRampToValueAtTime(0.01, st + 0.04);
              osc.connect(gain); gain.connect(this.masterGain!);
              osc.start(st); osc.stop(st + 0.04);
          }

      } else if (index === 2) {
          // TNT: Fuse Hiss -> Boom
          // Hiss
          const noise = this.createNoiseNode();
          if (noise) {
              const gain = this.ctx.createGain();
              const filter = this.ctx.createBiquadFilter();
              filter.type = 'bandpass'; filter.frequency.value = 2000;
              gain.gain.setValueAtTime(0.1, t);
              gain.gain.linearRampToValueAtTime(0, t + 0.5);
              noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
              noise.start(t); noise.stop(t+0.5);
          }
          // Boom (Delayed)
          setTimeout(() => this.playExplosion(), 500);

      } else if (index === 3) {
          // HIGH NOON: Bell (Buildup only)
          // Removed Eagle Screech

          // 2. Bell (FM Synth)
          const carrier = this.ctx.createOscillator();
          const modulator = this.ctx.createOscillator();
          const modGain = this.ctx.createGain();
          const master = this.ctx.createGain();
          
          carrier.frequency.value = 440; // A4
          modulator.frequency.value = 600; // Bell overtone
          modGain.gain.value = 1000;
          
          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(master);
          master.connect(this.masterGain!);
          
          master.gain.setValueAtTime(0, t);
          master.gain.linearRampToValueAtTime(0.5, t + 0.02);
          master.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
          
          carrier.start(t); carrier.stop(t+2.5);
          modulator.start(t); modulator.stop(t+2.5);
      }
  }

  playUiSelect() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  playUpgradeSelect() {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const freqs = [880, 1108, 1318, 1760];
      freqs.forEach((f, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + i * 0.05);
          const startTime = t + i * 0.05;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
      });
  }

  playPortal() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(800, t + 2.0);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 2.0);
    osc.start(t);
    osc.stop(t + 2.0);
    lfo.start(t);
    lfo.stop(t + 2.0);
  }
}

export const audioManager = new AudioSystem();
