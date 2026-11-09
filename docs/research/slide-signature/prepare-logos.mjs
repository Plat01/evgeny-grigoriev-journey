// Deterministic preparation of the supplied logos; originals remain in assets/logotips.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const logos = [
  { source: 'Sk_logo.png', name: 'skolkovo', crop: [63, 46, 697, 197], width: 240 },
  { source: 'Россети_лого.png', name: 'rosseti', crop: [72, 40, 778, 227], width: 240 },
  { source: 'Tetra.png', name: 'tetra-trans', crop: [76, 58, 2199, 390], width: 336 },
  { source: 'Sk_logo_2.png', name: 'skolkovo-school', crop: [10, 13, 2402, 750], width: 296 },
];

await mkdir('src/assets/logotips', { recursive: true });
for (const { source, name, crop: [left, top, width, height], width: outputWidth } of logos) {
  const { data, info } = await sharp(`assets/logotips/${source}`)
    .ensureAlpha().extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    // Keep the dark Sk letters as a knockout in the formerly green square.
    // Flattening both original colors into ink would erase the initials.
    if (name === 'skolkovo' && (i / 4) % info.width < 197) {
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, Math.min(1, (data[i + 1] - 84) / 145)));
    }
    data[i] = 35;
    data[i + 1] = 61;
    data[i + 2] = 64;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: outputWidth }).webp({ lossless: true })
    .toFile(`src/assets/logotips/${name}.webp`);
}
