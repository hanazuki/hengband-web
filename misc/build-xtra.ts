import { mkdir, readdir, stat } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { $ } from "zx";

const DIRS = [
  { src: "hengband/lib/xtra/sound", dst: "xtra/sound", bitrate: "64k", mono: true },
  { src: "hengband/lib/xtra/music", dst: "xtra/music", bitrate: "128k", mono: false },
];

const scriptMtimeMs = (await stat(new URL(import.meta.url))).mtimeMs;

async function upToDate(src: string, dst: string): Promise<boolean> {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dst)]);
    return d.mtimeMs >= s.mtimeMs && d.mtimeMs >= scriptMtimeMs;
  } catch {
    return false;
  }
}

async function convert(src: string, dst: string, bitrate: string, mono: boolean): Promise<void> {
  console.log(`Transcoding ${src}`);
  await mkdir(path.dirname(dst), { recursive: true });
  const channels = mono ? ["-ac", "1"] : [];
  await $`ffmpeg -y -loglevel error -i ${src} -c:a libopus -b:a ${bitrate} ${channels} -vn ${dst}`;
}

type Job = { src: string; dst: string; bitrate: string; mono: boolean };
const jobs: Job[] = [];

for (const { src, dst, bitrate, mono } of DIRS) {
  const entries = await readdir(src);
  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (ext !== ".mp3" && ext !== ".wav") continue;
    jobs.push({
      src: path.join(src, entry),
      dst: path.join(dst, `${path.basename(entry, ext)}.webm`),
      bitrate,
      mono,
    });
  }
}

let converted = 0;
let skipped = 0;
const queue = jobs[Symbol.iterator]();

await Promise.all(
  Array.from({ length: availableParallelism() }, async () => {
    for (const job of queue) {
      if (await upToDate(job.src, job.dst)) {
        skipped++;
      } else {
        await convert(job.src, job.dst, job.bitrate, job.mono);
        converted++;
      }
    }
  }),
);

console.log(`Done: ${converted} converted, ${skipped} skipped.`);
