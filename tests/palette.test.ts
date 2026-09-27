import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../src/config/gameConfig';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('palette single source of truth', () => {
  for (const [key, value] of Object.entries(PALETTE)) {
    it(`--color-${kebab(key)} matches gameConfig`, () => {
      const match = css.match(new RegExp(`--color-${kebab(key)}:\\s*(#[0-9a-fA-F]{3,8})`));
      expect(match?.[1]?.toLowerCase()).toBe(value.toLowerCase());
    });
  }
});
