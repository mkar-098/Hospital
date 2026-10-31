// src/audio/SoundEngine.js
// Multi-channel Procedural Web Audio Engine (Music, Ambient, SFX buses; Calm, Uncanny, Chase, Relief states; Life/Death stingers)

class SoundEngine {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.ctx = null;
    this.musicBus = null;
    this.ambientBus = null;
    this.sfxBus = null;

    this.initialized = false;
    this.isMuted = false;
    this.currentState = 'calm'; // 'calm' | 'uncanny' | 'chase' | 'relief'

    this.loopTimer = null;
    this.stepTimer = 0;
  }

  init() {
    if (
      typeof navigator !== 'undefined' &&
      navigator.userActivation &&
      !navigator.userActivation.hasBeenActive
    ) {
      return;
    }

    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.applySettingsVolumes();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.musicBus = this.ctx.createGain();
      this.ambientBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();

      this.musicBus.connect(this.ctx.destination);
      this.ambientBus.connect(this.ctx.destination);
      this.sfxBus.connect(this.ctx.destination);

      this.applySettingsVolumes();
      this.startAmbientBed();
      this.startGenerativeMusicLoop();
      this.initialized = true;
    } catch (e) {
      console.warn('SoundEngine init warning:', e);
    }
  }

  applySettingsVolumes() {
    if (!this.ctx) return;
    const s = this.saveSystem?.data?.settings || {
      musicVol: 0.7,
      ambientVol: 0.75,
      sfxVol: 0.85
    };
    const mult = this.isMuted ? 0 : 1;
    const now = this.ctx.currentTime;
    const mGain = (s.musicVol ?? 0.7) * 0.35 * mult;
    const aGain = (s.ambientVol ?? 0.75) * 0.25 * mult;
    const xGain = (s.sfxVol ?? 0.85) * 0.45 * mult;

    this.musicBus.gain.cancelScheduledValues?.(now);
    this.ambientBus.gain.cancelScheduledValues?.(now);
    this.sfxBus.gain.cancelScheduledValues?.(now);

    this.musicBus.gain.value = mGain;
    this.ambientBus.gain.value = aGain;
    this.sfxBus.gain.value = xGain;

    this.musicBus.gain.setTargetAtTime(mGain, now, 0.05);
    this.ambientBus.gain.setTargetAtTime(aGain, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(xGain, now, 0.05);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.applySettingsVolumes();
    return this.isMuted;
  }

  startAmbientBed() {
    if (!this.ctx) return;
    // Soft lowpass-filtered hospital ventilation & room tone (not a harsh sawtooth!)
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 60; // Subtle 60Hz mains hum
    filter.type = 'lowpass';
    filter.frequency.value = 110;
    gain.gain.value = 0.08;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientBus);
    osc.start();
  }

  startGenerativeMusicLoop() {
    if (this.loopTimer) clearInterval(this.loopTimer);

    // Generative interval scheduler
    const calmNotes = [261.63, 329.63, 392.0, 493.88, 587.33]; // Cmaj9 / Am9 soft piano
    const uncannyNotes = [220.0, 233.08, 311.13, 466.16, 622.25]; // Unsettling minor/diminished
    const reliefNotes = [261.63, 329.63, 392.0, 523.25, 659.25]; // Warm C major resolution

    let tick = 0;
    this.loopTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      tick++;

      if (this.currentState === 'calm') {
        if (tick % 4 === 0) {
          const freq = calmNotes[tick % calmNotes.length];
          this.playPianoNote(freq, 2.4, 0.22);
        }
      } else if (this.currentState === 'uncanny') {
        if (tick % 5 === 0) {
          const freq = uncannyNotes[tick % uncannyNotes.length];
          this.playGlassTone(freq, 2.8, 0.18);
        }
      } else if (this.currentState === 'chase') {
        // Driving 130 BPM chase pulse
        this.playChasePulse(tick);
      } else if (this.currentState === 'relief') {
        if (tick % 2 === 0) {
          const freq = reliefNotes[tick % reliefNotes.length];
          this.playPianoNote(freq, 2.8, 0.28);
        }
      }
    }, 460);
  }

  canPlayAudio() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      if (
        typeof navigator !== 'undefined' &&
        navigator.userActivation &&
        !navigator.userActivation.hasBeenActive
      ) {
        return false;
      }
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  setAudioState(state) {
    const prevState = this.currentState;
    this.currentState = state;
    if (prevState === 'death' && state !== 'death') {
      this.applySettingsVolumes();
    }
  }

  playPianoNote(freq, duration = 2.2, volume = 0.2) {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playGlassTone(freq, duration = 2.5, volume = 0.15) {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.985, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playChasePulse(tick) {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 0.22);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(now);
    osc.stop(now + 0.24);

    if (tick % 3 === 0) {
      this.playGlassTone(311.13 + (tick % 2) * 18, 0.4, 0.16);
    }
  }

  playLifeLostStinger(isFinalLife = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Duck background music for 4 seconds per Section 8.2
    if (this.musicBus && !this.isMuted) {
      const baseGain = (this.saveSystem?.data?.settings?.musicVol ?? 0.7) * 0.35;
      this.musicBus.gain.cancelScheduledValues?.(now);
      this.musicBus.gain.value = baseGain * 0.18;
      this.musicBus.gain.setValueAtTime(baseGain * 0.18, now);
      if (this.musicBus.gain.linearRampToValueAtTime) {
        this.musicBus.gain.setValueAtTime(baseGain * 0.18, now + 3.4);
        this.musicBus.gain.linearRampToValueAtTime(baseGain, now + 4.0);
      }
    }

    if (!this.canPlayAudio()) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isFinalLife ? 260 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.9);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  playPlayerDeathSound() {
    this.currentState = 'death';
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Fade out normal hospital music loop per Section 8.2
    if (this.musicBus) {
      this.musicBus.gain.cancelScheduledValues?.(now);
      this.musicBus.gain.value = 0.02;
      this.musicBus.gain.setValueAtTime(0.02, now);
    }

    if (!this.canPlayAudio()) return;

    const freqs = [110, 116.5, 164.8];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 0.5, now + 1.8);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 1.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now);
      osc.stop(now + 1.9);
    }
  }

  updateFootsteps(dt, isMoving, isRunning) {
    if (!isMoving) {
      this.stepTimer = 0;
      return;
    }
    const interval = isRunning ? 0.31 : 0.48;
    this.stepTimer += dt;
    if (this.stepTimer >= interval) {
      this.stepTimer = 0;
      this.playFootstep(isRunning);
    }
  }

  playFootstep(isRunning = false) {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isRunning ? 130 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);

    gain.gain.setValueAtTime(isRunning ? 0.14 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playDoorSFX(isOpen) {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOpen ? 180 : 240, now);
    osc.frequency.exponentialRampToValueAtTime(isOpen ? 290 : 120, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playShutterSFX() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.35);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playFlashlightClick() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.035);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playScanBeep() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.07);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playTaskCompleteSFX() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  playPowerDownSFX() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.65);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  playPowerRestoreSFX() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.45);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  playAlarmStinger() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.linearRampToValueAtTime(720, now + 0.25);
    osc.frequency.linearRampToValueAtTime(480, now + 0.5);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.55);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  playReliefChime() {
    this.playTaskCompleteSFX();
  }

  playUIClick() {
    if (!this.canPlayAudio()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.003, now + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.035);
  }
}
