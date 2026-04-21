import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/appex-logo.svg');
const outDir = resolve(root, 'public/logo');

const SIZES = [64, 128, 256, 512, 1024];

async function main() {
  await mkdir(outDir, { recursive: true });
  const svg = await readFile(svgPath);
  for (const size of SIZES) {
    const file = resolve(outDir, `appex-logo-${size}.png`);
    await sharp(svg)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(file);
    console.log(`✓ ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
