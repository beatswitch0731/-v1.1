

class AudioManager {
    private context: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private isMuted: boolean = false;
    
    // Gain Nodes for mixing
    private masterGain: GainNode | null = null;
    private bgmGainNode: GainNode | null = null;
    private sfxGainNode: GainNode | null = null;

    private noiseBuffer: AudioBuffer | null = null;
    
    // BGM Sequencing
    private bgmInterval: number | null = null;
    private bgmStep: number = 0;
    private bgmTempo: number = 86; // Chill R&B Tempo
    private isSwing: boolean = true; 

    // For stateful sounds like charge hum
    private chargeHum: { osc: AudioBufferSourceNode, gain: GainNode } | null = null;

    // 单例模式
    private static instance: AudioManager;

    private constructor() {}

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public init() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
            
            // Create Mixer Structure
            this.masterGain = this.context.createGain();
            this.bgmGainNode = this.context.createGain();
            this.sfxGainNode = this.context.createGain();

            // Connect: Source -> BGM/SFX Gain -> Master Gain -> Destination
            this.masterGain.connect(this.context.destination);
            this.bgmGainNode.connect(this.masterGain);
            this.sfxGainNode.connect(this.masterGain);
            
            // Default Levels
            this.bgmGainNode.gain.value = 0.4;
            this.sfxGainNode.gain.value = 0.5;
            
            this.generateHeavyMagnumSound();
            this.generateNoiseBuffer();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    // --- VOLUME CONTROL ---

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.masterGain && this.context) {
            const t = this.context.currentTime;
            this.masterGain.gain.cancelScheduledValues(t);
            this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, t, 0.1);
        }
    }

    public setBgmVolume(volume: number) {
        if (this.bgmGainNode && this.context) {
            const t = this.context.currentTime;
            this.bgmGainNode.gain.cancelScheduledValues(t);
            this.bgmGainNode.gain.setTargetAtTime(volume, t, 0.1);
        }
    }

    public setSfxVolume(volume: number) {
        if (this.sfxGainNode && this.context) {
            const t = this.context.currentTime;
            this.sfxGainNode.gain.cancelScheduledValues(t);
            this.sfxGainNode.gain.setTargetAtTime(volume, t, 0.1);
        }
    }

    // --- ASSETS ---

    private generateNoiseBuffer() {
         if (!this.context) return;
         const duration = 2.0;
         const sampleRate = this.context.sampleRate;
         this.noiseBuffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
         const data = this.noiseBuffer.getChannelData(0);
         for (let i = 0; i < sampleRate * duration; i++) {
             data[i] = Math.random() * 2 - 1;
         }
    }

    private createNoiseNode(): AudioBufferSourceNode | null {
        if (!this.context || !this.noiseBuffer) return null;
        const node = this.context.createBufferSource();
        node.buffer = this.noiseBuffer;
        node.loop = true;
        return node;
    }

    // --- STATEFUL SFX ---

    public startChargeHum() {
        if (this.chargeHum || !this.context || !this.sfxGainNode || this.isMuted) return;
        
        const t = this.context.currentTime;
        const osc = this.createNoiseNode()!;
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        // Wind/Energy hum
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, t); 
        filter.Q.value = 1.5;

        // Oscillate frequency slightly
        const lfo = this.context.createOscillator();
        lfo.frequency.value = 8;
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 100;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.5); // Fade in

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(t);
        
        this.chargeHum = { osc, gain };
    }

    public stopChargeHum() {
        if (!this.chargeHum || !this.context) return;

        const t = this.context.currentTime;
        this.chargeHum.gain.gain.cancelScheduledValues(t);
        this.chargeHum.gain.gain.setTargetAtTime(0, t, 0.2); // Fade out
        this.chargeHum.osc.stop(t + 0.3);

        this.chargeHum = null;
    }


    // --- PROCEDURAL BGM: PROGRESSIVE R&B ---
    public startSunflowerBGM() {
        if (this.bgmInterval) return;
        if (!this.context) this.init();
        
        // 16th note steps
        const stepTime = (60 / this.bgmTempo) / 4 * 1000;
        
        this.bgmInterval = window.setInterval(() => {
            if (this.isMuted) return;
            this.playProgressiveBGMStep(this.bgmStep);
            this.bgmStep = (this.bgmStep + 1) % 64; // 4 bar loop
        }, stepTime);
    }

    public stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    private playProgressiveBGMStep(step: number) {
        if (!this.context || !this.bgmGainNode) return;
        const t = this.context.currentTime;
        
        // Swing logic: Delay even 16th notes slightly
        let swingOffset = 0;
        if (this.isSwing && (step % 2 !== 0)) {
            swingOffset = 0.025; 
        }
        const time = t + swingOffset;

        // --- LAYER CONTROL ---
        // Bar 1 (0-15): Intro - Chords only
        // Bar 2 (16-31): Add Bass & Snap
        // Bar 3 (32-47): Add Melody & Kick
        // Bar 4 (48-63): Full Mix (Strings Pad)
        
        const hasBass = step >= 16;
        const hasMelody = step >= 32;
        const hasKick = step >= 32;
        const hasFullTexture = step >= 48;

        // 1. CHORDS (Electric Piano) - Foundation, plays every bar
        // Progression: Cmaj9 -> Am9 -> Fmaj7 -> G13
        if (step % 16 === 0) {
            let chordFreqs: number[] = [];
            const bar = Math.floor(step / 16);
            if (bar === 0) chordFreqs = [261.63, 329.63, 392.00, 493.88]; // Cmaj7
            else if (bar === 1) chordFreqs = [220.00, 261.63, 329.63, 392.00]; // Am7
            else if (bar === 2) chordFreqs = [349.23, 440.00, 523.25, 659.25]; // Fmaj7
            else chordFreqs = [392.00, 493.88, 587.33, 698.46]; // G Dominant

            chordFreqs.forEach((f, i) => {
                const osc = this.context!.createOscillator();
                osc.type = 'triangle'; // Soft tone
                osc.frequency.setValueAtTime(f, time);

                const g = this.context!.createGain();
                const vel = 0.05 - (i * 0.005); 
                
                g.gain.setValueAtTime(0, time);
                g.gain.linearRampToValueAtTime(vel, time + 0.05); 
                g.gain.exponentialRampToValueAtTime(vel * 0.1, time + 2.0); 
                g.gain.linearRampToValueAtTime(0, time + 3.8); 

                const filter = this.context!.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 600; // Even warmer (was 800) to reduce buzz

                osc.connect(filter); filter.connect(g); g.connect(this.bgmGainNode!);
                osc.start(time); osc.stop(time+3.8);
            });
        }

        // 2. BASS (Sine) - Starts Bar 2
        if (hasBass && (step % 16 === 0 || step % 16 === 10)) {
             const osc = this.context.createOscillator();
             osc.type = 'sine';
             const bar = Math.floor(step / 16);
             const root = bar === 1 ? 55.00 : (bar === 2 ? 87.31 : (bar === 3 ? 98.00 : 65.41)); // A1, F2, G2, C2
             osc.frequency.setValueAtTime(root, time);
             
             const g = this.context.createGain();
             g.gain.setValueAtTime(0.3, time);
             g.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
             
             osc.connect(g); g.connect(this.bgmGainNode);
             osc.start(time); osc.stop(time + 0.8);
        }

        // 3. MAIN MELODY (Lead) - Starts Bar 3
        // New Neo-Soul/Jazz Lick
        if (hasMelody) {
            const melodyStep = step % 32; // Loop melody over 2 bars (Bar 3 & 4)
            
            // Map step to frequency
            // Bar 3: E - G - A - C(high) - B
            // Bar 4: G - E - D - C
            const melodyMap: Record<number, number> = {
                0: 659.25,  // E5
                3: 783.99,  // G5
                6: 880.00,  // A5
                10: 1046.50, // C6 (Peak)
                14: 987.77,  // B5
                16: 783.99,  // G5 (Start of Bar 4)
                18: 659.25,  // E5
                22: 587.33,  // D5
                26: 523.25,  // C5 (Resolve)
            };

            if (melodyMap[melodyStep]) {
                const freq = melodyMap[melodyStep];
                const osc = this.context.createOscillator();
                osc.type = 'sine'; // Bell-like
                osc.frequency.setValueAtTime(freq, time);
                
                const g = this.context.createGain();
                g.gain.setValueAtTime(0, time);
                g.gain.linearRampToValueAtTime(0.06, time + 0.05); // Smooth attack
                g.gain.exponentialRampToValueAtTime(0.001, time + 0.5); // Clean decay
                
                // Very slight vibrato for richness
                const vib = this.context.createOscillator();
                vib.frequency.value = 4; 
                const vibGain = this.context.createGain();
                vibGain.gain.value = 3;
                vib.connect(vibGain); vibGain.connect(osc.frequency);
                vib.start(time); vib.stop(time + 0.6);

                osc.connect(g); g.connect(this.bgmGainNode);
                osc.start(time); osc.stop(time + 0.6);
            }
        }

        // 4. DRUMS & PERCUSSION
        // Kick (Starts Bar 3 for full groove)
        if (hasKick && (step % 32 === 0 || step % 32 === 10)) {
            const osc = this.context.createOscillator();
            const g = this.context.createGain();
            osc.frequency.setValueAtTime(100, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
            g.gain.setValueAtTime(0.6, time);
            g.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            osc.connect(g); g.connect(this.bgmGainNode);
            osc.start(time); osc.stop(time+0.15);
        }

        // Snap/Rim (Starts Bar 2)
        if (hasBass && (step % 8 === 4)) {
            const noise = this.createNoiseNode();
            if(noise) {
                const f = this.context.createBiquadFilter();
                f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 1;
                const g = this.context.createGain();
                g.gain.setValueAtTime(0.1, time);
                g.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
                noise.connect(f); f.connect(g); g.connect(this.bgmGainNode);
                noise.start(time); noise.stop(time+0.05);
            }
        }

        // 5. WARM PAD (Only Bar 4) - Replaces High Strings
        // Used to be C6 (1046Hz), now G4 (392Hz) for warmth/no buzz
        if (hasFullTexture && step % 16 === 0) {
             const osc = this.context.createOscillator();
             osc.type = 'sine'; // Pure sine for pad
             osc.frequency.setValueAtTime(392.00, time); // G4
             
             const g = this.context.createGain();
             g.gain.setValueAtTime(0, time);
             g.gain.linearRampToValueAtTime(0.04, time + 1.0); // Slow swell
             g.gain.linearRampToValueAtTime(0, time + 3.5);
             
             osc.connect(g); g.connect(this.bgmGainNode);
             osc.start(time); osc.stop(time + 3.5);
        }
    }

    private generateHeavyMagnumSound() {
        if (!this.context) return;
        const duration = 0.4; 
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        const delaySamples = Math.floor(sampleRate * 0.012); 
        const delayBuffer = new Float32Array(delaySamples).fill(0);
        let delayIndex = 0;
        let hpIn = 0, hpOut = 0;
        let smooth = 0;

        for (let i = 0; i < sampleRate * duration; i++) {
            const t = i / sampleRate;
            let click = 0;
            if (t < 0.002) click = Math.sin(t * 15000) * 0.5;
            const white = Math.random() * 2 - 1;
            const env = Math.exp(-t * 50); 
            let signal = (white * 0.7 + click * 0.3) * env;
            
            // Highpass
            const hpCoeff = 0.9; 
            hpOut = hpCoeff * (hpOut + signal - hpIn);
            hpIn = signal;
            signal = hpOut;
            
            // Feedback Delay
            const delayed = delayBuffer[delayIndex];
            signal += delayed * 0.4; 
            delayBuffer[delayIndex] = signal * 0.4; 
            
            delayIndex++;
            if (delayIndex >= delaySamples) delayIndex = 0;
            
            // Lowpass Smoothing
            smooth += (signal - smooth) * 0.4;
            signal = smooth;
            
            // Volume Reduction
            signal *= 0.8; 
            
            // Soft Clip
            if (signal > 0.9) signal = 0.9;
            if (signal < -0.9) signal = -0.9;
            
            data[i] = signal * (1 - t/duration);
        }
        this.buffers.set('shoot', buffer);
    }

    public async loadSound(key: string, url: string): Promise<void> {
        if (!this.context) this.init();
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
            this.buffers.set(key, audioBuffer);
        } catch (error) {
            console.error(`[Audio] Failed to load ${key}:`, error);
        }
    }

    public playSFX(key: string, volume: number = 1.0, randomPitch: boolean = false) {
        if (this.isMuted || !this.context || !this.sfxGainNode) return;
        const buffer = this.buffers.get(key);
        if (!buffer) { return; }
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        if (randomPitch) {
            const drift = 0.08; 
            source.playbackRate.value = 1.0 - drift + Math.random() * (drift * 2);
        }
        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.sfxGainNode); 
        source.start(0);
    }

    public playCoinPing() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const osc = this.context.createOscillator(); const gain = this.context.createGain(); osc.connect(gain); gain.connect(this.sfxGainNode); osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.exponentialRampToValueAtTime(3000, t + 0.1); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5); osc.start(t); osc.stop(t + 0.5); }
    
    // Updated: Deep Adult Male "Hmph" (Sawtooth + Lowpass)
    public playHum() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;

        // 1. Voice Source - Deep Sawtooth for rich vocal timbre
        const osc = this.context.createOscillator();
        osc.type = 'sawtooth';
        // Pitch: Deep male range (around 90Hz), slight drop for assertiveness
        osc.frequency.setValueAtTime(90, t); 
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.3);

        // 2. Throat Filter (Lowpass) - Muffled "Mmm" sound
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t); // F1 formant area for /m/
        filter.Q.value = 2.0; // Resonant to emphasize the 'voice' body

        // 3. Main Amplitude Envelope
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1.5, t + 0.05); // Fast assertive attack
        gain.gain.setValueAtTime(1.5, t + 0.1); // Hold briefly
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3); // Short decay

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(t);
        osc.stop(t + 0.3);

        // 4. Breath/Exhale for texture
        const noise = this.createNoiseNode();
        if(noise) {
            const nFilter = this.context.createBiquadFilter();
            nFilter.type = 'bandpass';
            nFilter.frequency.value = 1200;
            const nGain = this.context.createGain();
            nGain.gain.setValueAtTime(0.2, t);
            nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            noise.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(this.sfxGainNode);
            noise.start(t);
            noise.stop(t + 0.1);
        }
    }
    
    // New: Sharp metallic unsheathe for Wuxia
    public playSwordUnsheathe() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;
        
        // High frequency scrape (Noise)
        const noise = this.createNoiseNode();
        if(noise) {
            const f = this.context.createBiquadFilter();
            f.type = 'highpass'; f.frequency.value = 3000;
            const g = this.context.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.5, t+0.05);
            g.gain.exponentialRampToValueAtTime(0.01, t+0.3);
            noise.connect(f); f.connect(g); g.connect(this.sfxGainNode);
            noise.start(t); noise.stop(t+0.3);
        }
        
        // Metallic Ring (Sine)
        const osc = this.context.createOscillator();
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(4000, t+0.1);
        const g2 = this.context.createGain();
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.3, t+0.02);
        g2.gain.exponentialRampToValueAtTime(0.01, t+0.2);
        osc.connect(g2); g2.connect(this.sfxGainNode);
        osc.start(t); osc.stop(t+0.2);
    }
    
    // New: Dragon Roar (Deep Wind + Growl)
    public playDragonRoar() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;

        // Low Rumble (Sawtooth)
        const osc = this.context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t+1.5);
        const g = this.context.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.01, t+1.5);
        osc.connect(g); g.connect(this.sfxGainNode);
        osc.start(t); osc.stop(t+1.5);
        
        // Wind Noise
        const noise = this.createNoiseNode();
        if(noise) {
            const f = this.context.createBiquadFilter();
            f.type = 'lowpass'; 
            f.frequency.setValueAtTime(400, t);
            f.frequency.linearRampToValueAtTime(1000, t+0.5);
            f.frequency.linearRampToValueAtTime(200, t+2.0);
            
            const g2 = this.context.createGain();
            g2.gain.setValueAtTime(0.6, t);
            g2.gain.linearRampToValueAtTime(0, t+2.0);
            
            noise.connect(f); f.connect(g2); g2.connect(this.sfxGainNode);
            noise.start(t); noise.stop(t+2.0);
        }
    }

    public playWindTornado() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;
        const duration = 2.5;
    
        // Create the noise source
        const noise = this.createNoiseNode();
        if (!noise) return;
    
        // Main gain for overall volume control and fade out
        const mainGain = this.context.createGain();
        mainGain.gain.setValueAtTime(0, t);
        mainGain.gain.linearRampToValueAtTime(0.5, t + 0.2); // Fade in
        mainGain.gain.linearRampToValueAtTime(0, t + duration); // Fade out
    
        // Create a filter to shape the noise into wind
        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass'; // Bandpass is great for wind sounds
        filter.Q.value = 0.8; // Not too narrow, not too wide
    
        // LFO to modulate the filter frequency for the "whoosh"
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 6; // How fast the whoosh is
    
        // LFO Gain to control the depth of the frequency modulation
        const lfoGain = this.context.createGain();
        lfoGain.gain.setValueAtTime(400, t); // Modulation depth in Hz
        lfoGain.gain.linearRampToValueAtTime(800, t + duration); // Make it more intense over time
    
        // Set the base frequency of the wind sound
        filter.frequency.setValueAtTime(800, t); // Start in the mids
    
        // Connect the nodes: LFO -> LFO Gain -> Filter Frequency
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        // Connect the main audio path: Noise -> Filter -> Main Gain -> SFX Output
        noise.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(this.sfxGainNode);
    
        // Start oscillators
        noise.start(t);
        noise.stop(t + duration);
        lfo.start(t);
        lfo.stop(t + duration);
    }

    public playWaterBalloonPop() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const noise = this.createNoiseNode(); if(noise){ const g = this.context.createGain(); const f = this.context.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(2.0, t+0.01); g.gain.exponentialRampToValueAtTime(0.01, t+0.15); noise.connect(f); f.connect(g); g.connect(this.sfxGainNode); noise.start(t); noise.stop(t+0.15); } }
    public playGatlingShot() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const noise = this.createNoiseNode(); if(noise) { const g = this.context.createGain(); const f = this.context.createBiquadFilter(); f.type='highpass'; f.frequency.value=1000; g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.08); noise.connect(f); f.connect(g); g.connect(this.sfxGainNode); noise.start(t); noise.stop(t+0.08); } }
    public playHighNoonBang() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const kick = this.context.createOscillator(); const kg = this.context.createGain(); kick.frequency.setValueAtTime(120, t); kick.frequency.exponentialRampToValueAtTime(40, t+0.1); kg.gain.setValueAtTime(2.0, t); kg.gain.exponentialRampToValueAtTime(0.01, t+0.3); kick.connect(kg); kg.connect(this.sfxGainNode); kick.start(t); kick.stop(t+0.3); }
    public playLassoImpact() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const n = this.createNoiseNode(); if(n){ const g = this.context.createGain(); g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.1); n.connect(g); g.connect(this.sfxGainNode); n.start(t); n.stop(t+0.1); } }
    public playWesternSkill(index: number) { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); } 
    public playUiSelect() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const o = this.context.createOscillator(); const g = this.context.createGain(); o.type='sine'; o.frequency.setValueAtTime(1200, t); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.1); o.connect(g); g.connect(this.sfxGainNode); o.start(t); o.stop(t+0.1); }
    public playUpgradeSelect() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playPortal() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playExplosion() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const n = this.createNoiseNode(); if(n){ const g = this.context.createGain(); g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.8); n.connect(g); g.connect(this.sfxGainNode); n.start(t); n.stop(t+0.8); } }
    public playChargeReady() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playElectricImpact() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playShoot(mode: 'GUN' | 'MAGIC' | 'MELEE' = 'GUN') { if(mode==='GUN') this.playSFX('shoot', 1.0, true); else this.playIaidoSlash(); }
    public playIaidoSlash() { if (!this.context || this.isMuted || !this.sfxGainNode) return; const t = this.context.currentTime; const n = this.createNoiseNode(); if(n){ const g = this.context.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.3); n.connect(g); g.connect(this.sfxGainNode); n.start(t); n.stop(t+0.3); } }
    public playImpact() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    
    // UPDATED: Much quieter and softer parry sound
    public playParry() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;

        // 1. High Metallic Ring (Sine fundamental) - Reduced Gain
        const osc1 = this.context.createOscillator();
        const gain1 = this.context.createGain();
        osc1.connect(gain1);
        gain1.connect(this.sfxGainNode);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1000, t); // Lower pitch slightly (was 1200)
        gain1.gain.setValueAtTime(0, t);
        gain1.gain.linearRampToValueAtTime(0.15, t + 0.01); // Reduced from 0.5
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.5); // Shorter tail
        osc1.start(t);
        osc1.stop(t + 0.5);

        // 2. Overtone - Reduced Gain & Dissonance
        const osc2 = this.context.createOscillator();
        const gain2 = this.context.createGain();
        osc2.connect(gain2);
        gain2.connect(this.sfxGainNode);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2200, t); // Smoother harmonic (was 3200)
        gain2.gain.setValueAtTime(0, t);
        gain2.gain.linearRampToValueAtTime(0.08, t + 0.01); // Reduced from 0.3
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc2.start(t);
        osc2.stop(t + 0.3);

        // 3. Impact Click - Reduced
        const osc3 = this.context.createOscillator();
        const gain3 = this.context.createGain();
        osc3.connect(gain3);
        gain3.connect(this.sfxGainNode);
        osc3.type = 'square';
        osc3.frequency.setValueAtTime(300, t);
        osc3.frequency.exponentialRampToValueAtTime(1500, t + 0.05); 
        gain3.gain.setValueAtTime(0.05, t); // Reduced from 0.2
        gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc3.start(t);
        osc3.stop(t + 0.05);
    }

    public playDash() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playGrassWalk() { if (!this.context || this.isMuted || !this.sfxGainNode) return; }
    public playLevelUp() { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }
    public playSkill(index: number) { if (!this.context || this.isMuted || !this.sfxGainNode) return; this.playUiSelect(); }

    // New: Flying Sword "Xiu" Attack (Fast, sharp wind cut)
    public playFlyingSwordAttack() {
        if (!this.context || this.isMuted || !this.sfxGainNode) return;
        const t = this.context.currentTime;
        
        // 1. The "Xiu" - High pitch sine sweep
        const osc = this.context.createOscillator();
        osc.frequency.setValueAtTime(2500, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.15); // Drop pitch fast
        
        const g = this.context.createGain();
        g.gain.setValueAtTime(0.15, t); // Lower volume
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.connect(g); g.connect(this.sfxGainNode);
        osc.start(t); osc.stop(t+0.15);

        // 2. Air Cut - filtered noise
        const noise = this.createNoiseNode();
        if(noise) {
            const f = this.context.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.setValueAtTime(3000, t); // High freq wind
            
            const ng = this.context.createGain();
            ng.gain.setValueAtTime(0.2, t); // Lower volume
            ng.gain.linearRampToValueAtTime(0, t+0.1); // Short duration
            
            noise.connect(f); f.connect(ng); ng.connect(this.sfxGainNode);
            noise.start(t); noise.stop(t+0.1);
        }
    }
}

export const audioManager = AudioManager.getInstance(); 
export default AudioManager.getInstance();