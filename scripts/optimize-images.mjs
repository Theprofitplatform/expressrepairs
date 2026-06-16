// Recompress the photographic JPEGs in public/images in place.
//
// They ship at 1600px but are displayed much smaller (hero ~600px, cards less),
// and several are 0.5–0.75 MB — heavy for a marketing/LCP image. This resizes to
// a sane max width and re-encodes with mozjpeg, only overwriting a file when the
// result is actually smaller. Run with `npm run optimize:images`. Requires sharp
// (already a transitive Astro dependency). Originals are recoverable via git.
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/images';
const MAX_WIDTH = 1400;
const QUALITY = 78;

const kb = (n) => (n / 1024).toFixed(0) + 'KB';
let before = 0;
let after = 0;

for (const file of readdirSync(DIR).filter((f) => /\.jpe?g$/i.test(f))) {
  const path = join(DIR, file);
  const origSize = statSync(path).size;
  before += origSize;

  // Read into a buffer first so sharp does not hold the file handle when we
  // write the result back to the same path (Windows file-lock).
  const out = await sharp(readFileSync(path))
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();

  if (out.length < origSize) {
    writeFileSync(path, out);
    after += out.length;
    console.log(`${file.padEnd(22)} ${kb(origSize)} -> ${kb(out.length)}`);
  } else {
    after += origSize;
    console.log(`${file.padEnd(22)} ${kb(origSize)} (kept — already optimal)`);
  }
}

console.log(`\nTotal: ${kb(before)} -> ${kb(after)} (saved ${kb(before - after)})`);
