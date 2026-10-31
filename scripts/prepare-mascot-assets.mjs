import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function main() {
  const source = path.resolve('design/mascot/poses');
  const target = path.resolve('public/mascot');
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(path.join(target, 'source'), { recursive: true });
  for (const pose of ['welcome', 'explain', 'read', 'think', 'verify', 'celebrate']) {
    const input = path.join(source, pose + '.png');
    const output = path.join(target, pose + '.webp');
    fs.copyFileSync(input, path.join(target, 'source', pose + '.png'));
    await sharp(input).resize({ width: 640, height: 660, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(output);
    const metadata = await sharp(output).metadata();
    if (!metadata.hasAlpha) throw new Error('A transparência foi perdida: ' + pose);
    console.log(pose, Math.round(fs.statSync(output).size / 1024) + ' KiB');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
