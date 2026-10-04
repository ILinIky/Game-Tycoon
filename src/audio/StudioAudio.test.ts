import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioAudio, readAudioSettings } from "./StudioAudio";

class AudioParamStub {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
}
class AudioNodeStub {
  gain = new AudioParamStub();
  frequency = new AudioParamStub();
  Q = new AudioParamStub();
  threshold = new AudioParamStub();
  knee = new AudioParamStub();
  ratio = new AudioParamStub();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class AudioContextStub {
  static instances: AudioContextStub[] = [];
  state = "suspended";
  currentTime = 0;
  sampleRate = 8000;
  destination = new AudioNodeStub();
  gains: AudioNodeStub[] = [];
  oscillators: AudioNodeStub[] = [];
  sources: AudioNodeStub[] = [];
  constructor() {
    AudioContextStub.instances.push(this);
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain() {
    const n = new AudioNodeStub();
    this.gains.push(n);
    return n;
  }
  createOscillator() {
    const n = new AudioNodeStub();
    this.oscillators.push(n);
    return n;
  }
  createBufferSource() {
    const n = new AudioNodeStub();
    this.sources.push(n);
    return n;
  }
  createBiquadFilter() {
    return new AudioNodeStub();
  }
  createDynamicsCompressor() {
    return new AudioNodeStub();
  }
  createConvolver() {
    return new AudioNodeStub();
  }
  createBuffer(channels: number, length: number) {
    const data = Array.from(
      { length: channels },
      () => new Float32Array(length),
    );
    return { getChannelData: (channel: number) => data[channel] };
  }
}
describe("studio audio lifecycle", () => {
  let audio: StudioAudio;
  let storage: Map<string, string>;
  beforeEach(() => {
    vi.useFakeTimers();
    AudioContextStub.instances = [];
    storage = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("window", { AudioContext: AudioContextStub });
    audio = new StudioAudio();
  });
  afterEach(() => {
    audio.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("does not create audio or play before a user gesture", () => {
    audio.play("click");
    audio.set("music", 0.2);
    audio.setMenu(true);
    expect(AudioContextStub.instances).toHaveLength(0);
    expect(audio.getSnapshot().status).toBe("locked");
  });
  it("starts once, suspends in the background, and resumes without duplicate schedulers", async () => {
    await audio.activate();
    await audio.activate();
    expect(AudioContextStub.instances).toHaveLength(1);
    expect(audio.getSnapshot().status).toBe("running");
    expect(vi.getTimerCount()).toBe(1);
    audio.setHidden(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(audio.getSnapshot().status).toBe("suspended");
    audio.setHidden(false);
    await audio.activate();
    expect(vi.getTimerCount()).toBe(1);
    expect(audio.getSnapshot().status).toBe("running");
    audio.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(AudioContextStub.instances[0].close).toHaveBeenCalledOnce();
  });
  it("persists individual levels and mutes both soundtrack and interaction sounds", async () => {
    audio.set("music", 0.2);
    audio.set("effects", 0.7);
    audio.set("ambience", 0.1);
    await audio.activate();
    const context = AudioContextStub.instances[0];
    audio.toggleMute();
    const before = context.oscillators.length;
    audio.play("release");
    expect(context.oscillators).toHaveLength(before);
    expect(context.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(
      0,
      0,
      0.06,
    );
    audio.toggleMute();
    audio.set("effects", 0);
    audio.play("click");
    expect(context.oscillators).toHaveLength(before);
    audio.set("effects", 0.7);
    audio.play("click");
    expect(context.oscillators.length).toBeGreaterThan(before);
    expect(new StudioAudio().getSnapshot()).toMatchObject({
      music: 0.2,
      effects: 0.7,
      ambience: 0.1,
      muted: false,
      status: "locked",
    });
  });
  it("skips missed beats instead of playing a burst after device sleep", async () => {
    await audio.activate();
    const context = AudioContextStub.instances[0],
      before = context.oscillators.length;
    context.currentTime = 600;
    vi.advanceTimersByTime(100);
    expect(context.oscillators.length - before).toBeLessThanOrEqual(7);
  });
  it("keeps the game usable if Web Audio is unavailable", async () => {
    vi.stubGlobal("window", {});
    await audio.activate();
    expect(audio.getSnapshot().status).toBe("unavailable");
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe("saved mixer settings", () => {
  it("rejects corrupt values and clamps valid levels", () => {
    expect(
      readAudioSettings(
        '{"music":4,"effects":-1,"ambience":1e999,"muted":"yes"}',
      ),
    ).toEqual({ music: 1, effects: 0, ambience: 0.3, muted: false });
    expect(readAudioSettings("corrupt")).toEqual(readAudioSettings(null));
  });
});
