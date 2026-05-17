import type { SoundMap } from "virtual:hengband-xtra/sounds";

export class SoundEngine {
  private context: AudioContext;
  private soundMap: SoundMap;
  private bufferCache = new Map<string, AudioBuffer[]>();
  private currentSource: AudioBufferSourceNode | null = null;
  private enabled = false;

  constructor(soundMap: SoundMap) {
    this.context = new AudioContext();
    this.soundMap = soundMap;
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
    if (!this.enabled) return;
    const buffers = this.bufferCache.get(name);
    if (!buffers || buffers.length === 0) return;

    const buffer = buffers[Math.floor(Math.random() * buffers.length)];
    if (this.currentSource) {
      this.currentSource.stop();
    }

    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.context.destination);
    node.start();
    this.currentSource = node;
    node.onended = () => {
      if (this.currentSource === node) {
        this.currentSource = null;
      }
    };
  }

  enable(): void {
    this.enabled = true;
    this.context.resume();
  }

  disable(): void {
    this.enabled = false;
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.context.suspend();
  }

  dispose(): void {
    this.context.close();
    this.bufferCache.clear();
  }
}
