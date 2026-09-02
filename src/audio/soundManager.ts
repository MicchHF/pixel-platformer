// Web Audio API procedural retro chiptune sound generator

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxVolume: number = 0.6;
  private bgmVolume: number = 0.3;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBgm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  // Jump sound: rapid rising pitch square wave
  public playJump() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      const now = this.ctx.currentTime;

      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio context might be restricted
    }
  }

  // Wall jump sound: snappy two-tone chirp
  public playWallJump() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const now = this.ctx.currentTime;

      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.09);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Air Dash: punchy white-noise whoosh + frequency drop
  public playDash() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Tone osc
      const osc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);

      toneGain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(toneGain);
      toneGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);

      // Noise burst for punch
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.08);
    } catch {}
  }

  // Death explosion: crunchy low-fi explosion sound
  public playDeath() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // White noise explosion
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.28);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.28);

      // Low bass drop
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(140, now);
      bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
      bassGain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.22);
    } catch {}
  }

  // Spring bounce: high boing effect
  public playSpring() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // Dash Crystal Pickup: crystalline sparkle chime
  public playCrystalPickup() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);

        gain.gain.setValueAtTime(this.sfxVolume * 0.2, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.03);
        osc.stop(now + idx * 0.03 + 0.12);
      });
    } catch {}
  }

  // Key Pickup: bright triumphant 2-note chime
  public playKeyPickup() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.08); // A5

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // Level Clear / Portal Victory: triumphant arpeggio
  public playWin() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major arpeggio
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } catch {}
  }

  // Button click / UI tap
  public playClick() {
    if (this.isMuted || this.sfxVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  // Procedural Chiptune Arpeggio BGM loop
  public toggleBgm() {
    if (this.isBgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public startBgm() {
    if (this.isBgmPlaying || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // Bassline and lead note sequence (D minor / Cyberpunk dark synth)
    const melody = [
      220, 261.63, 293.66, 349.23, 293.66, 261.63,
      220, 261.63, 329.63, 392.00, 329.63, 261.63,
      196, 246.94, 293.66, 349.23, 293.66, 246.94,
      174.61, 220, 261.63, 329.63, 261.63, 220
    ];

    const bass = [110, 110, 146.83, 146.83, 98, 98, 87.31, 87.31];

    const stepDuration = 140; // ms per 16th note

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted || this.bgmVolume <= 0) return;

      try {
        const now = this.ctx.currentTime;
        const noteFreq = melody[this.bgmStep % melody.length];
        const bassFreq = bass[Math.floor(this.bgmStep / 3) % bass.length];

        // Lead synth
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(noteFreq, now);

        leadGain.gain.setValueAtTime(this.bgmVolume * 0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.12);

        // Bass synth on downbeats
        if (this.bgmStep % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(this.bgmVolume * 0.15, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(this.ctx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.22);
        }

        this.bgmStep++;
      } catch {}
    }, stepDuration);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public isMusicPlaying(): boolean {
    return this.isBgmPlaying;
  }
}

export const sounds = new SoundManager();
