import { describe, it, expect } from 'vitest';
import { getIconSet } from '../src/lib/icons';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const tmpDir = resolve(import.meta.dirname, 'fixtures/icons-test');

describe('getIconSet', () => {
  it('returns item IDs from SVG filenames', () => {
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(resolve(tmpDir, 'wood.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'stone.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'deer-hide.svg'), '<svg></svg>');

    const result = getIconSet(tmpDir);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has('wood')).toBe(true);
    expect(result.has('stone')).toBe(true);
    expect(result.has('deer-hide')).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('ignores non-SVG files', () => {
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(resolve(tmpDir, 'wood.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'readme.txt'), 'nope');
    writeFileSync(resolve(tmpDir, '.DS_Store'), '');

    const result = getIconSet(tmpDir);

    expect(result.size).toBe(1);
    expect(result.has('wood')).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('returns empty set when directory does not exist', () => {
    const result = getIconSet(resolve(tmpDir, 'nonexistent'));
    expect(result.size).toBe(0);
  });
});
