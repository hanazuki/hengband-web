import type { MusicMap } from "virtual:hengband-xtra/music";
import type { SoundMap } from "virtual:hengband-xtra/sounds";

const TERM_XTRA_MUSIC_BASIC = 14;
const TERM_XTRA_MUSIC_DUNGEON = 15;
const TERM_XTRA_MUSIC_QUEST = 16;
const TERM_XTRA_MUSIC_TOWN = 17;
const TERM_XTRA_MUSIC_MONSTER = 18;
const TERM_XTRA_MUSIC_MUTE = 19;

const BASIC_NAMES = [
  "new_game",
  "gameover",
  "exit",
  "town",
  "field1",
  "field2",
  "field3",
  "dun_low",
  "dun_med",
  "dun_high",
  "feel1",
  "feel2",
  "winner",
  "build",
  "wild",
  "quest",
  "arena",
  "battle",
  "quest_clear",
  "final_quest_clear",
  "ambush",
  "unique",
  "shadower",
  "unk_monster",
  "hl_monster",
];

function typeValToKey(type: number, val: number): string | null {
  switch (type) {
    case TERM_XTRA_MUSIC_BASIC:
      return BASIC_NAMES[val] ?? null;
    case TERM_XTRA_MUSIC_DUNGEON:
      return `dungeon${val.toString().padStart(3, "0")}`;
    case TERM_XTRA_MUSIC_QUEST:
      return `quest${val.toString().padStart(3, "0")}`;
    case TERM_XTRA_MUSIC_TOWN:
      return `town${val.toString().padStart(3, "0")}`;
    case TERM_XTRA_MUSIC_MONSTER:
      return `monster${val.toString().padStart(4, "0")}`;
    default:
      return null;
  }
}

export class SoundEngine {
  private context: AudioContext;
  private soundMap: SoundMap;
  private musicMap: MusicMap;
  private bufferCache = new Map<string, AudioBuffer[]>();
  private currentSource: AudioBufferSourceNode | null = null;

  private effectsMasterGain: GainNode;
  private musicMasterGain: GainNode;

  private currentMusicUrl: string | null = null;
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;
  private musicGeneration = 0;

  constructor(soundMap: SoundMap, musicMap: MusicMap) {
    this.context = new AudioContext();
    this.soundMap = soundMap;
    this.musicMap = musicMap;

    this.effectsMasterGain = this.context.createGain();
    this.effectsMasterGain.gain.value = 0;
    this.effectsMasterGain.connect(this.context.destination);

    this.musicMasterGain = this.context.createGain();
    this.musicMasterGain.gain.value = 1;
    this.musicMasterGain.connect(this.context.destination);
  }

  async preloadAll(): Promise<void> {
    const urlCache = new Map<string, Promise<AudioBuffer | null>>();

    const decode = (url: string): Promise<AudioBuffer | null> =>
      urlCache.getOrInsertComputed(url, async () => {
        try {
          const r = await fetch(url);
          const ab = await r.arrayBuffer();
          return await this.context.decodeAudioData(ab);
        } catch (e) {
          console.warn(`Failed to load sound ${url}:`, e);
          return null;
        }
      });

    const tasks: Promise<void>[] = [];

    for (const [key, urls] of this.soundMap.entries()) {
      tasks.push(
        Promise.all(urls.map(decode)).then((buffers) => {
          const valid = buffers.filter((b): b is AudioBuffer => b !== null);
          if (valid.length > 0) {
            this.bufferCache.set(key, valid);
          }
        }),
      );
    }

    await Promise.allSettled(tasks);
  }

  playSound(name: string): void {
    if (this.effectsMasterGain.gain.value === 0) return;
    const buffers = this.bufferCache.get(name);
    if (!buffers || buffers.length === 0) return;

    const buffer = buffers[Math.floor(Math.random() * buffers.length)];
    if (this.currentSource) {
      this.currentSource.stop();
    }

    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.effectsMasterGain);
    node.start();
    this.currentSource = node;
    node.onended = () => {
      if (this.currentSource === node) {
        this.currentSource = null;
      }
    };
  }

  enableAudio(): void {
    this.context.resume();
  }

  setEffectsEnabled(enabled: boolean): void {
    this.effectsMasterGain.gain.value = enabled ? 1 : 0;
    if (!enabled && this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicMasterGain.gain.value = enabled ? 1 : 0;
  }

  playMusic(type: number, val: number): void {
    if (type === TERM_XTRA_MUSIC_MUTE) {
      this.stopMusic();
      return;
    }
    const key = typeValToKey(type, val);
    if (!key) return;
    const url = this.musicMap.pick(key);
    if (!url) return;
    if (url === this.currentMusicUrl) return;
    this.crossfadeTo(url);
  }

  playMusicScene(scene: [number, number][]): void {
    for (const [type, val] of scene) {
      if (type === TERM_XTRA_MUSIC_MUTE) {
        this.stopMusic();
        return;
      }
      const key = typeValToKey(type, val);
      if (!key) continue;
      const url = this.musicMap.pick(key);
      if (!url) continue;
      if (url === this.currentMusicUrl) return;
      this.crossfadeTo(url);
      return;
    }
  }

  private stopMusic(): void {
    this.musicGeneration++;
    if (this.currentMusicSource && this.currentMusicGain) {
      this.fadeOutAndStop(this.currentMusicSource, this.currentMusicGain);
    }
    this.currentMusicUrl = null;
    this.currentMusicSource = null;
    this.currentMusicGain = null;
  }

  private fadeOutAndStop(source: AudioBufferSourceNode, gain: GainNode): void {
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 2);
    setTimeout(() => {
      try {
        source.stop();
      } catch {}
    }, 2100);
  }

  private crossfadeTo(url: string): void {
    if (this.currentMusicSource && this.currentMusicGain) {
      this.fadeOutAndStop(this.currentMusicSource, this.currentMusicGain);
    }
    this.currentMusicUrl = url;
    this.currentMusicSource = null;
    this.currentMusicGain = null;
    const generation = ++this.musicGeneration;
    this.fetchAndPlay(url, generation);
  }

  private async fetchAndPlay(url: string, generation: number): Promise<void> {
    let buffer: AudioBuffer;
    try {
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      buffer = await this.context.decodeAudioData(ab);
    } catch (e) {
      console.warn(`Failed to load music ${url}:`, e);
      return;
    }

    if (generation !== this.musicGeneration) return;

    const gain = this.context.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicMasterGain);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 2);

    this.currentMusicSource = source;
    this.currentMusicGain = gain;
  }

  dispose(): void {
    this.musicGeneration++;
    if (this.currentMusicSource) {
      try {
        this.currentMusicSource.stop();
      } catch {}
    }
    this.context.close();
    this.bufferCache.clear();
  }
}
