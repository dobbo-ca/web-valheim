#!/usr/bin/env node
/**
 * Generates a single SVG sprite sheet from individual icon files.
 *
 * Input:  public/icons/items/*.svg  (individual 48×48 pixel-art icons)
 * Output: public/icons/sprite.svg   (one <symbol> per icon, referenced via <use>)
 *
 * Run: pnpm icons
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ICONS_DIR = resolve(import.meta.dirname, '../public/icons/items');
const OUTPUT = resolve(import.meta.dirname, '../public/icons/sprite.svg');

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

writeFileSync(OUTPUT, sprite, 'utf8');
const kb = (Buffer.byteLength(sprite) / 1024).toFixed(1);
console.log(`Sprite generated: ${files.length} icons → ${kb}KB → ${OUTPUT}`);
