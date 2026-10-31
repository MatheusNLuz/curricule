import fs from 'node:fs';
import sharp from 'sharp';

// Mechanical slicing only. Artwork and alpha were produced with imagegen.
const source = 'design/mascot/rig/parts-clean.png';
const target = 'public/mascot/rig';
fs.mkdirSync(target, { recursive: true });
const regions = {
  body: [55, 42, 445, 600], wave: [608, 161, 424, 395],
  document: [1071, 190, 440, 370], eyes: [105, 820, 355, 126], brows: [105, 748, 355, 72],
  smile: [662, 832, 243, 88], point: [1077, 741, 430, 194],
};
for (const [name, [left, top, width, height]] of Object.entries(regions)) {
  let image = sharp(source).extract({ left, top, width, height });
  if (name === 'wave' || name === 'point') {
    const bytes = await image.resize({ width: 300, height: 280, fit: 'inside' }).png().toBuffer();
    const metadata = await sharp(bytes).metadata();
    image = sharp({ create: { width: 320, height: 320, channels: 4, background: '#00000000' } }).composite([{ input: bytes, left: 10, top: 320 - metadata.height }]);
  }
  await image.webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`${target}/${name}.webp`);
  console.log(name, fs.statSync(`${target}/${name}.webp`).size);
}
