export type Sound =
  | "click"
  | "hover"
  | "open"
  | "close"
  | "select"
  | "confirm"
  | "error"
  | "release"
  | "event"
  | "pause";
export type AudioChannel = "music" | "effects" | "ambience";
export interface AudioSettings {
  music: number;
  effects: number;
  ambience: number;
  muted: boolean;
}
export interface AudioSnapshot extends AudioSettings {
  status: "locked" | "running" | "suspended" | "unavailable";
}
const STORAGE_KEY = "studio-zero-audio";
const defaults: AudioSettings = {
  music: 0.42,
  effects: 0.6,
  ambience: 0.3,
  muted: false,
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function readAudioSettings(value: string | null): AudioSettings {
  try {
    const parsed = JSON.parse(value ?? "null");
    if (!parsed || typeof parsed !== "object") return { ...defaults };
    const settings = { ...defaults };
    for (const key of ["music", "effects", "ambience"] as const) {
      if (typeof parsed[key] === "number" && Number.isFinite(parsed[key]))
        settings[key] = clamp(parsed[key]);
    }
    if (typeof parsed.muted === "boolean") settings.muted = parsed.muted;
    return settings;
  } catch {
    return { ...defaults };
  }
}
function initialSettings() {
  try {
    return readAudioSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...defaults };
  }
}
const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);
const chords = [
  [50, 57, 60, 65, 69],
  [46, 53, 57, 60, 65],
  [53, 60, 64, 67, 72],
  [48, 55, 58, 62, 67],
  [50, 57, 60, 64, 69],
  [46, 53, 57, 62, 65],
  [53, 60, 64, 69, 72],
  [48, 55, 58, 62, 65],
];
const melody = [
  77,
  null,
  76,
  72,
  null,
  69,
  72,
  null,
  74,
  null,
  72,
  null,
  69,
  65,
  null,
  69,
  76,
  null,
  77,
  79,
  null,
  76,
  72,
  null,
  74,
  null,
  72,
  70,
  null,
  67,
  65,
  null,
];

/** Original, continuously scheduled studio soundtrack. No remote audio or autoplay. */
export class StudioAudio {
  private snapshot: AudioSnapshot = { ...initialSettings(), status: "locked" };
  private listeners = new Set<() => void>();
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<AudioChannel, GainNode> | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private noise: AudioBuffer | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private step = 0;
  private menuOpen = false;
  private suspended = false;
  private lastHover = 0;
  private lastEvent = 0;
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(values: Partial<AudioSnapshot>) {
    this.snapshot = { ...this.snapshot, ...values };
    this.listeners.forEach((listener) => listener());
  }
  set(channel: AudioChannel, value: number) {
    if (!Number.isFinite(value)) return;
    this.update({ [channel]: clamp(value) });
    this.save();
    this.applyVolumes();
  }
  toggleMute() {
    this.update({ muted: !this.snapshot.muted });
    this.save();
    this.applyVolumes();
  }
  private save() {
    const { music, effects, ambience, muted } = this.snapshot;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ music, effects, ambience, muted }),
      );
    } catch {
      /* Session preferences still work. */
    }
  }
  private applyVolumes() {
    if (!this.context || !this.master || !this.buses) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.snapshot.muted ? 0 : 0.78, now, 0.06);
    this.buses.music.gain.setTargetAtTime(
      this.snapshot.music * (this.menuOpen ? 0.72 : 1),
      now,
      0.18,
    );
    this.buses.effects.gain.setTargetAtTime(this.snapshot.effects, now, 0.04);
    this.buses.ambience.gain.setTargetAtTime(this.snapshot.ambience, now, 0.2);
  }
  async activate() {
    if (this.snapshot.status === "unavailable" || this.suspended) return;
    try {
      if (!this.context) this.create();
      if (!this.context) return;
      // Called synchronously by the gesture listener before awaiting the result.
      if (this.context.state !== "running") await this.context.resume();
      if (this.context.state === "running" && !this.suspended) {
        if (this.snapshot.status !== "running")
          this.update({ status: "running" });
        this.startScheduler();
      }
    } catch {
      this.update({ status: this.context ? "locked" : "unavailable" });
    }
  }
  private create() {
    const AudioConstructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioConstructor) throw new Error("Audio unavailable");
    const c = new AudioConstructor();
    this.context = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 16;
    limiter.ratio.value = 3;
    this.master.connect(limiter);
    limiter.connect(c.destination);
    this.buses = {
      music: c.createGain(),
      effects: c.createGain(),
      ambience: c.createGain(),
    };
    this.musicFilter = c.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 3600;
    this.buses.music.connect(this.musicFilter);
    this.musicFilter.connect(this.master);
    this.buses.effects.connect(this.master);
    this.buses.ambience.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = this.noise.getChannelData(0);
    let seed = 1990;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < samples.length; i++) samples[i] = random() * 2 - 1;
    const impulse = c.createBuffer(
      2,
      Math.floor(c.sampleRate * 1.8),
      c.sampleRate,
    );
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++)
        data[i] = (random() * 2 - 1) * (1 - i / data.length) ** 3 * 0.45;
    }
    this.reverb = c.createConvolver();
    this.reverb.buffer = impulse;
    const wet = c.createGain();
    wet.gain.value = 0.23;
    this.reverb.connect(wet);
    wet.connect(this.buses.music);
    this.wind = c.createBufferSource();
    this.wind.buffer = this.noise;
    this.wind.loop = true;
    const air = c.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = 280;
    air.Q.value = 0.3;
    const airGain = c.createGain();
    airGain.gain.value = 0.065;
    this.wind.connect(air);
    air.connect(airGain);
    airGain.connect(this.buses.ambience);
    this.wind.start();
    this.applyVolumes();
  }
  setMenu(open: boolean) {
    this.menuOpen = open;
    if (this.context && this.musicFilter)
      this.musicFilter.frequency.setTargetAtTime(
        open ? 1700 : 3600,
        this.context.currentTime,
        0.3,
      );
    this.applyVolumes();
  }
  setHidden(hidden: boolean) {
    this.suspended = hidden;
    if (!this.context) return;
    if (hidden) {
      this.stopScheduler();
      this.update({ status: "suspended" });
      void this.context.suspend().catch(() => {});
    } else void this.activate();
  }
  private startScheduler() {
    if (!this.context || this.timer) return;
    this.nextBeat = this.context.currentTime + 0.12;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 100);
  }
  private stopScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private schedule() {
    if (!this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    // Never burst delayed notes after a throttled tab or sleeping device.
    if (this.nextBeat < now) this.nextBeat = now + 0.06;
    while (this.nextBeat < now + 0.24) {
      if (!this.snapshot.muted && this.snapshot.music > 0)
        this.musicStep(this.step, this.nextBeat);
      this.step = (this.step + 1) % 128;
      this.nextBeat += 60 / 78 / 2;
    }
  }
  private musicStep(step: number, at: number) {
    const bar = Math.floor(step / 8),
      beat = step % 8;
    const chord = chords[Math.floor(bar / 2) % chords.length];
    if (beat === 0) {
      chord
        .slice(1)
        .forEach((note, i) =>
          this.tone(
            note,
            at + i * 0.023,
            3.4,
            0.038,
            "sine",
            "music",
            800,
            true,
          ),
        );
      this.tone(chord[0] - 12, at, 1.5, 0.14, "sine", "music", 500);
    }
    if (beat === 5)
      this.tone(chord[0] - 12, at + 0.016, 0.7, 0.095, "sine", "music", 500);
    if ([0, 3, 6].includes(beat)) {
      const note = chord[1 + ((bar + beat) % 4)];
      this.tone(
        note + 12,
        at + (beat % 2 ? 0.028 : 0),
        1.1,
        0.085,
        "triangle",
        "music",
        2200,
        true,
      );
    }
    if (bar % 4 >= 2) {
      const note = melody[step % melody.length];
      if (note)
        this.tone(note, at + 0.04, 1.25, 0.052, "sine", "music", 2600, true);
    }
    if (beat === 0 || beat === 4) this.kick(at, beat === 0 ? 0.13 : 0.07);
    if (beat === 2 || beat === 6) this.brush(at + 0.014, 0.055, 1100, 0.15);
    if (beat % 2 || beat === 4)
      this.brush(at + 0.018, beat % 2 ? 0.012 : 0.009, 5200, 0.055);
  }
  private tone(
    note: number,
    at: number,
    duration: number,
    volume: number,
    wave: OscillatorType,
    channel: AudioChannel,
    cutoff: number,
    reverb = false,
  ) {
    const c = this.context,
      bus = this.buses?.[channel];
    if (!c || !bus) return;
    const osc = c.createOscillator(),
      gain = c.createGain(),
      filter = c.createBiquadFilter();
    osc.type = wave;
    osc.frequency.value = frequency(note);
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.45;
    const attack = channel === "music" && duration > 3 ? 0.45 : 0.012;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    if (reverb && this.reverb) gain.connect(this.reverb);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  private kick(at: number, volume: number) {
    const c = this.context,
      bus = this.buses?.music;
    if (!c || !bus) return;
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.frequency.setValueAtTime(95, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.15);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + 0.21);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  private brush(at: number, volume: number, cutoff: number, duration: number) {
    const c = this.context,
      bus = this.buses?.music;
    if (!c || !bus || !this.noise) return;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain();
    source.buffer = this.noise;
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start(at, (this.step % 7) * 0.17);
    source.stop(at + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  play(sound: Sound) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.snapshot.muted ||
      this.suspended ||
      !this.snapshot.effects
    )
      return;
    const now = c.currentTime;
    if (sound === "hover") {
      if (now - this.lastHover < 0.09) return;
      this.lastHover = now;
    }
    if (sound === "event") {
      if (now - this.lastEvent < 1.2) return;
      this.lastEvent = now;
    }
    const cues: Record<
      Sound,
      { notes: number[]; duration: number; volume: number; spacing: number }
    > = {
      hover: { notes: [81], duration: 0.065, volume: 0.018, spacing: 0 },
      click: { notes: [72, 79], duration: 0.09, volume: 0.07, spacing: 0.035 },
      select: { notes: [74, 81], duration: 0.16, volume: 0.08, spacing: 0.065 },
      open: {
        notes: [62, 69, 74],
        duration: 0.22,
        volume: 0.055,
        spacing: 0.052,
      },
      close: {
        notes: [74, 69, 62],
        duration: 0.12,
        volume: 0.045,
        spacing: 0.035,
      },
      confirm: {
        notes: [65, 69, 72, 77],
        duration: 0.4,
        volume: 0.09,
        spacing: 0.09,
      },
      error: { notes: [55, 54], duration: 0.18, volume: 0.065, spacing: 0.09 },
      release: {
        notes: [62, 65, 69, 74, 77, 81, 86],
        duration: 0.85,
        volume: 0.095,
        spacing: 0.095,
      },
      event: {
        notes: [77, 81, 84],
        duration: 0.3,
        volume: 0.07,
        spacing: 0.08,
      },
      pause: { notes: [69, 62], duration: 0.12, volume: 0.05, spacing: 0.065 },
    };
    const cue = cues[sound];
    cue.notes.forEach((note, i) =>
      this.tone(
        note,
        now + 0.005 + i * cue.spacing,
        cue.duration,
        cue.volume,
        "sine",
        "effects",
        3600,
      ),
    );
  }
  dispose() {
    this.stopScheduler();
    this.wind?.stop();
    this.wind?.disconnect();
    this.wind = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.master = null;
    this.buses = null;
    this.musicFilter = null;
    this.reverb = null;
    this.noise = null;
    this.update({ status: "locked" });
  }
}
export const studioAudio = new StudioAudio();
if (import.meta.hot) import.meta.hot.dispose(() => studioAudio.dispose());
