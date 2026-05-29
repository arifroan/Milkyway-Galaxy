// Procedural space soundscapes and spatial feedback synthesized using Web Audio API
class SpaceSynthesizer {
  private ctx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isAmbientPlaying = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a beautiful, low-frequency atmospheric cosmic hum
  public startAmbientHum() {
    try {
      this.initContext();
      if (this.isAmbientPlaying || !this.ctx) return;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Deep space low frequency drone
      osc1.type = 'sawtooth';
      osc1.frequency.value = 55; // A1 Note

      osc2.type = 'triangle';
      osc2.frequency.value = 55.4; // Slightly detuned

      filter.type = 'lowpass';
      filter.frequency.value = 120; // Cut off high harsh frequencies
      filter.Q.value = 1;

      gain.gain.value = 0.05; // Soft cosmic background level

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientOsc = osc1;
      this.ambientGain = gain;
      this.filter = filter;
      this.isAmbientPlaying = true;

      // Softly modulate the filter freq to suggest dynamic solar winds
      this.modulateWind();
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  }

  private modulateWind() {
    if (!this.isAmbientPlaying || !this.filter || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const targetFreq = 120 + Math.random() * 50;
      this.filter.frequency.exponentialRampToValueAtTime(targetFreq, now + 4);
      setTimeout(() => this.modulateWind(), 4000);
    } catch (e) {}
  }

  public stopAmbientHum() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientGain?.disconnect();
      } catch (e) {}
      this.ambientOsc = null;
      this.isAmbientPlaying = false;
    }
  }

  // Synthesize a gorgeous resonant bell, pitch-matched to the temperature (spectral type) of the star!
  // Blue stars (O/B type) trigger sparkling high-pitched glass tones; Red giants (M/K type) trigger warm low bells.
  public playStarClick(temperature: number) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const sineMod = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const feedback = this.ctx.createGain();

      // Map temperature (3k to 40k Kelvin) to a pleasant pentatonic frequency spectrum
      let baseFreq = 220; // Default A3
      if (temperature > 0) {
        if (temperature < 4000) baseFreq = 130.81; // C3 (Warm Red)
        else if (temperature < 6000) baseFreq = 196.00; // G3 (Comfortable Sun)
        else if (temperature < 10000) baseFreq = 329.63; // E4 (Brilliant White)
        else if (temperature < 20000) baseFreq = 440.00; // A4 (Luminous blue)
        else baseFreq = 659.25; // E5 (Ultra-hot blue O-type)
      } else {
        // Black holes or deep nebulae
        baseFreq = 65.41; // C2 (deep mysterious bass resonance)
      }

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.3);

      // Low frequency modulation for celestial sweep
      sineMod.frequency.value = 4;
      const modGain = this.ctx.createGain();
      modGain.gain.value = 15;

      // Echo filter
      delay.delayTime.value = 0.25;
      feedback.gain.value = 0.35;

      gainNode.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

      // Connect modules
      sineMod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gainNode);

      // Delay loop for starry space feedback
      gainNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.ctx.destination);

      gainNode.connect(this.ctx.destination);

      sineMod.start();
      osc.start();

      sineMod.stop(this.ctx.currentTime + 1.3);
      osc.stop(this.ctx.currentTime + 1.3);
    } catch (e) {
      console.warn("Failed to play stellar feedback tone:", e);
    }
  }

  // Synthesize a beautiful, procedurally generated "radio pulsar" chirp/blip
  public playPulsarBlip(distanceToTarget: number) {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 16;
      
      // Sweep frequency from high to low mimicking realistic astrophysical dispersion sweep
      const startFreq = 1800;
      const endFreq = 260;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

      // Noise component to emulate space radiation/static hiss
      const bufferSize = this.ctx.sampleRate * 0.08; // 80ms duration
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const gain = this.ctx.createGain();
      // Increase volume dynamically the closer the vessel / sensor gets
      const proximityVolume = Math.max(0.01, Math.min(0.22, 220 / (distanceToTarget + 5)));
      gain.gain.setValueAtTime(proximityVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      osc.connect(filter);
      noiseNode.connect(filter);
      
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      noiseNode.start(now);

      osc.stop(now + 0.080);
      noiseNode.stop(now + 0.080);
    } catch (e) {
      console.warn("Pulsar audio synthesis failed:", e);
    }
  }

  // Synthesize high-octane warp propulsion swoosh for fast transit
  public playWarpSwoosh() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc1 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, this.ctx.currentTime);
      // Exponentially rise up and then decay down representing acceleration and Doppler effect
      osc1.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.6);
      osc1.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 1.5);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.5);
      filter.Q.value = 2.5;

      gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, this.ctx.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

      osc1.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start();
      osc1.stop(this.ctx.currentTime + 1.6);
    } catch (e) {}
  }
}

export const spaceSynths = new SpaceSynthesizer();
