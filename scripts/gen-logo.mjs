import sharp from "sharp";
import { writeFileSync } from "fs";

const SRC = process.argv[2] || "C:/Users/billy/Desktop/m3_logo2.png";

// ensureAlpha(): the source is RGB; Next's Turbopack ICO/icon decoder requires RGBA.
await sharp(SRC).resize(144, 144).ensureAlpha().png().toFile("public/brand-mark.png");
await sharp(SRC).resize(144, 144).ensureAlpha().png().toFile("src/app/icon.png");
await sharp(SRC).resize(180, 180).ensureAlpha().png().toFile("src/app/apple-icon.png");

const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(SRC).resize(s, s).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
const entries = [];
let offset = 6 + 16 * sizes.length;
sizes.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s >= 256 ? 0 : s, 0);
  e.writeUInt8(s >= 256 ? 0 : s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  entries.push(e);
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));
console.log("Wrote: public/brand-mark.png, src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico");

// ── Open Graph / social share image (1200×630) ───────────────────────────────
// Dark app background (#1a1918, the dark themeColor) + the m³ mark + wordmark.
const OG_W = 1200, OG_H = 630;
const logoOg = await sharp(SRC).resize(220, 220).png().toBuffer();
const og = `
<svg width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="22%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#0e2a33"/>
      <stop offset="55%" stop-color="#1a1918"/>
      <stop offset="100%" stop-color="#1a1918"/>
    </radialGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#glow)"/>
  <rect x="0" y="${OG_H - 10}" width="${OG_W}" height="10" fill="#06b6d4"/>
  <text x="470" y="296" font-family="Segoe UI, Arial, sans-serif" font-size="76" font-weight="800" fill="#fafafa">Cubemetrics</text>
  <text x="472" y="356" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#a1a1aa">Your personal productivity hub</text>
  <text x="472" y="416" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" fill="#22d3ee">cubemetrics.com</text>
</svg>`;
await sharp(Buffer.from(og))
  .composite([{ input: logoOg, left: 200, top: 205 }])
  .png()
  .toFile("src/app/opengraph-image.png");
console.log("Wrote: src/app/opengraph-image.png");
