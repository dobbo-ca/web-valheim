#!/usr/bin/env node
/**
 * Generates a content-hashed SVG sprite sheet from individual icon files.
 *
 * Input:  public/icons/items/*.svg  (individual 48×48 pixel-art icons)
 * Output: public/icons/sprite.{hash}.svg  (cache-busted sprite)
 *         public/icons/sprite-manifest.json  (maps to current filename)
 *
 * Run: pnpm icons
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ITEMS_DIR = resolve(import.meta.dirname, '../public/icons/items');
const FILTERS_DIR = resolve(import.meta.dirname, '../public/icons/filters');
const OUTPUT_DIR = resolve(import.meta.dirname, '../public/icons');
const MANIFEST = join(OUTPUT_DIR, 'sprite-manifest.json');

// Collect icons from multiple directories with optional ID prefix
const iconSources: { dir: string; prefix: string }[] = [
  { dir: ITEMS_DIR, prefix: '' },
  { dir: FILTERS_DIR, prefix: 'filter-' },
];

const symbols: string[] = [];
let totalCount = 0;

for (const { dir, prefix } of iconSources) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
  for (const file of files) {
    const id = prefix + file.slice(0, -4); // strip .svg, add prefix
    const raw = readFileSync(join(dir, file), 'utf8');

    // Extract viewBox or default to 48x48
    const vbMatch = raw.match(/viewBox="([^"]+)"/);
    const viewBox = vbMatch ? vbMatch[1] : '0 0 48 48';

    // Extract inner content, strip comments and collapse whitespace
    const inner = raw
      .replace(/<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();

    symbols.push(`<symbol id="${id}" viewBox="${viewBox}">${inner}</symbol>`);
    totalCount++;
  }
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>`;

// Content hash (first 8 chars of sha256)
const hash = createHash('sha256').update(sprite).digest('hex').slice(0, 8);
const filename = `sprite.${hash}.svg`;
const outputPath = join(OUTPUT_DIR, filename);

// Remove old sprite files
for (const f of readdirSync(OUTPUT_DIR)) {
  if (f.startsWith('sprite.') && f.endsWith('.svg')) {
    unlinkSync(join(OUTPUT_DIR, f));
  }
}

writeFileSync(outputPath, sprite, 'utf8');
writeFileSync(MANIFEST, JSON.stringify({ filename }), 'utf8');

const kb = (Buffer.byteLength(sprite) / 1024).toFixed(1);
console.log(`Sprite generated: ${totalCount} icons → ${kb}KB → ${filename}`);
