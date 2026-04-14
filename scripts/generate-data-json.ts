#!/usr/bin/env node
/**
 * Generates public/data/recipes-full.json from the YAML source data.
 * Must run BEFORE astro build so the file is copied to dist/.
 *
 * Run: node --import tsx scripts/generate-data-json.ts
 */

import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadAll } from '../src/lib/loader';

const dataRoot = resolve(import.meta.dirname, '../src/data');
const outDir = resolve(import.meta.dirname, '../public/data');

const data = await loadAll(dataRoot);
mkdirSync(outDir, { recursive: true });

const json = JSON.stringify(data);
writeFileSync(resolve(outDir, 'recipes-full.json'), json, 'utf8');

const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`Data JSON generated: ${data.recipes.length} recipes → ${kb}KB → public/data/recipes-full.json`);
