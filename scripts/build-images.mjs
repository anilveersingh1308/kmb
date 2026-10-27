// Builds optimised, high-contrast WebP assets for the website from the raw campaign photos.
//   node scripts/build-images.mjs ["C:\path\to\kmb pics"]
// Output goes to public/img/. Near-duplicate photos are intentionally skipped.
import { mkdirSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "C:\\Users\\Anil\\Downloads\\kmb pics";
const OUT = join("public", "img");
mkdirSync(OUT, { recursive: true });

const WA = (t) => `WhatsApp Image 2026-10-05 at ${t}.jpeg`;

/** @type {{src:string,out:string,width:number,height?:number,fit?:"cover"|"inside",pos?:string,q?:number,enhance?:boolean,trim?:boolean}[]} */
const JOBS = [
  // Hero (snow peaks + pilgrims with bags) — two widths for srcset
  { src: WA("21.59.07"), out: "hero.webp",     width: 1440, height: 900,  fit: "cover", pos: "top", q: 60, enhance: true },
  { src: WA("21.59.07"), out: "hero-sm.webp",  width: 720,  height: 960,  fit: "cover", pos: "top", q: 60, enhance: true },
  // Secondary hero / story — two women with bags under the peaks
  { src: WA("21.58.35"), out: "story.webp",    width: 1200, height: 800,  fit: "cover", pos: "top", q: 60, enhance: true },
  // Story panel — booth at Gaurikund
  { src: WA("21.58.58"), out: "booth.webp",    width: 1000, height: 667,  fit: "cover", pos: "centre",    q: 62, enhance: true },
  // Team
  { src: "team.jpeg",    out: "team.webp",     width: 1000, height: 750,  fit: "cover", pos: "attention", q: 62, enhance: true },
  // Poster (portrait, keep whole)
  { src: "campaign poster.jpeg", out: "poster.webp", width: 640, fit: "inside", q: 74 },
  // Logos — trimmed, transparent-ish backgrounds kept white
  { src: "campaign logo.jpeg",   out: "healing-himalayas.webp", width: 480, fit: "inside", q: 82, trim: true },
  { src: "government logo.jpeg", out: "uttarakhand.webp",       width: 480, fit: "inside", q: 82, trim: true },
  // Gallery (portrait 3:4, 480px wide — rendered ≤ 420px)
  { src: WA("21.58.35"), out: "g-women-peaks.webp",  width: 480, height: 640, fit: "cover", pos: "top", q: 60, enhance: true },
  { src: WA("21.59.04"), out: "g-man-peaks.webp",    width: 480, height: 640, fit: "cover", pos: "top", q: 60, enhance: true },
  { src: WA("21.59.05"), out: "g-backpack.webp",     width: 480, height: 640, fit: "cover", pos: "top", q: 60, enhance: true },
  { src: WA("21.58.46"), out: "g-boy-bag.webp",      width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  { src: WA("21.59.02"), out: "g-woman-trail.webp",  width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  { src: WA("21.59.17"), out: "g-deposit.webp",      width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  { src: WA("21.59.20"), out: "g-smile.webp",        width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  { src: WA("21.59.09"), out: "g-rain.webp",         width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  { src: WA("21.59.22"), out: "g-friends.webp",      width: 480, height: 640, fit: "cover", pos: "attention", q: 60, enhance: true },
  // OG image (1200x630) from hero
  { src: WA("21.59.07"), out: "og.jpg", width: 1200, height: 630, fit: "cover", pos: "top", q: 66, enhance: true },
];

/** Logos arrive as JPEGs on white / checkerboard; make low-saturation light pixels transparent, then trim. */
async function knockoutBackground(img, width) {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const light = min > 150, grey = max - min < 28;
    if (light && grey) {
      // fade alpha near the threshold for smooth edges
      const a = Math.max(0, Math.min(255, Math.round((255 - min) * 2.2 - 60)));
      data[i + 3] = a;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .flatten({ background: "#ffffff" })
    .resize({ width, fit: "inside", withoutEnlargement: true });
}

let total = 0;
for (const j of JOBS) {
  let img = sharp(join(SRC, j.src)).rotate();
  if (j.trim) img = await knockoutBackground(img, j.width);
  else img = img.resize({ width: j.width, height: j.height, fit: j.fit ?? "cover", position: j.pos ?? "centre", withoutEnlargement: true });
  if (j.enhance) img = img.modulate({ saturation: 1.12 }).linear(1.08, -8).median(1).sharpen({ sigma: 0.7 });
  const dest = join(OUT, j.out);
  if (j.out.endsWith(".jpg")) await img.jpeg({ quality: j.q ?? 72, mozjpeg: true }).toFile(dest);
  else await img.webp({ quality: j.q ?? 68, effort: 6 }).toFile(dest);
  const kb = statSync(dest).size / 1024;
  total += kb;
  console.log(`${j.out.padEnd(26)} ${kb.toFixed(0).padStart(4)} KB`);
}
console.log(`\nTotal: ${total.toFixed(0)} KB across ${JOBS.length} files`);
console.log("Files in public/img:", readdirSync(OUT).length);
