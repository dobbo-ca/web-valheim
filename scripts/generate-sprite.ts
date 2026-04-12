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

const ICONS_DIR = resolve(import.meta.dirname, '../public/icons/items');
const OUTPUT_DIR = resolve(import.meta.dirname, '../public/icons');
const MANIFEST = join(OUTPUT_DIR, 'sprite-manifest.json');

const files = readdirSync(ICONS_DIR)
  .filter((f) => f.endsWith('.svg'))
  .sort();

const symbols: string[] = [];

for (const file of files) {
  const id = file.slice(0, -4); // strip .svg
  const raw = readFileSync(join(ICONS_DIR, file), 'utf8');

  // Extract inner content, strip comments and collapse whitespace
  const inner = raw
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '')   // strip comments
    .replace(/\s+/g, ' ')              // collapse whitespace
    .replace(/>\s+</g, '><')           // remove space between tags
    .trim();

  symbols.push(`<symbol id="${id}" viewBox="0 0 48 48">${inner}</symbol>`);
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
console.log(`Sprite generated: ${files.length} icons → ${kb}KB → ${filename}`);
