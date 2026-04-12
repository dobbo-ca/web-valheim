import { readdirSync } from 'node:fs';

export function getIconSet(dir: string): Set<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return new Set();
  }
  const ids = entries
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4));
  return new Set(ids);
}
