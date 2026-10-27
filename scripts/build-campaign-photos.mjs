// Builds optimised WebP assets from the second batch of campaign photos + the official Uttarakhand Rajya logo.
//   node scripts/build-campaign-photos.mjs "C:\path\to\photos"
// Source files are numbered as received (3.jpg … 29.jpg). Exact / near duplicates (15, 18, 21, 22) are skipped on purpose.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node scripts/build-campaign-photos.mjs <photo folder>"); process.exit(1); }
const OUT = join("public", "img");
mkdirSync(OUT, { recursive: true });

const PHOTOS = {
  3: "p-couple", 4: "p-young-group", 5: "p-booth-woman", 7: "p-mrf-pilgrim", 8: "p-cyclist-assam",
  6: "j-booth-deposit", 17: "j-mrf-building", 20: "j-tractor", 14: "j-baler", 16: "j-bales",
  23: "d-temple-drive", 10: "d-om-team", 13: "d-team-mountains", 24: "d-gps-hill", 25: "d-gps-officials", 27: "d-gps-meadow",
  11: "t-temple-bags", 12: "t-sorting", 19: "t-rain-tractor", 26: "t-bins", 28: "t-porters", 29: "t-construction",
};

let total = 0;
for (const [n, name] of Object.entries(PHOTOS)) {
  const dest = join(OUT, `${name}.webp`);
  await sharp(join(SRC, `${n}.jpg`)).rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .modulate({ saturation: 1.06 }).sharpen({ sigma: 0.6 })
    .webp({ quality: 70, effort: 6 }).toFile(dest);
  const kb = statSync(dest).size / 1024; total += kb;
  console.log(`${name.padEnd(20)} ${kb.toFixed(0).padStart(4)} KB`);
}

// Official logo (9.jpg arrives on a faint checkerboard): light, unsaturated pixels → transparent, then trim.
// The screenshot has a grey border strip from x≈1069; crop it off before keying.
const { data, info } = await sharp(join(SRC, "9.jpg")).extract({ left: 0, top: 0, width: 1060, height: 983 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const min = Math.min(r, g, b), max = Math.max(r, g, b);
  // Unsaturated light pixels are paper/checkerboard: fully clear above 215, soft ramp 190–215 keeps anti-aliased edges.
  const grey = max - min < 26;
  rgba[j] = r; rgba[j + 1] = g; rgba[j + 2] = b;
  rgba[j + 3] = !grey || min <= 190 ? 255 : min > 215 ? 0 : Math.round(((215 - min) / 25) * 255);
}
const logo = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 8 });
const trimmed = await logo.png().toBuffer();
await sharp(trimmed).resize({ width: 480 }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT, "uttarakhand.webp"));
// 300px = 3× the certificate emblem width (sharp in the 3× PDF export); palette PNG keeps it small.
await sharp(trimmed).resize({ width: 300 }).png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 }).toFile(join("public", "uttarakhand-logo.png"));

// Email copy: flattened on white (mail clients handle opaque PNG best), 2× the 88px display width, embedded as base64.
const email = await sharp(trimmed).flatten({ background: "#ffffff" }).resize({ width: 176 }).png({ compressionLevel: 9, palette: true, quality: 95 }).toBuffer();
const { width: ew, height: eh } = await sharp(email).metadata();
writeFileSync(join("src", "lib", "emblem-png.ts"), `// Official Uttarakhand Rajya logo (${ew}x${eh}, on white), sent inline in emails because mail clients block SVG/remote images.
// Regenerate with scripts/build-campaign-photos.mjs.
export const EMBLEM_PNG_BASE64 =
  "${email.toString("base64")}";
export const EMBLEM_PNG_SIZE = { width: ${ew}, height: ${eh} } as const;
`);
console.log(`\nPhotos: ${Object.keys(PHOTOS).length} files, ${total.toFixed(0)} KB · logo written (web, png, email)`);
