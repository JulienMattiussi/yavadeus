import { describe, expect, it } from 'vitest';

import { parseEnvText } from '../src/config';

describe('parseEnvText', () => {
  it('parses KEY=value pairs', () => {
    expect(parseEnvText('GITHUB_USER=JulienMattiussi\nSITE_URL=https://x.dev')).toEqual({
      GITHUB_USER: 'JulienMattiussi',
      SITE_URL: 'https://x.dev',
    });
  });
  it('skips comments and blank lines', () => {
    expect(parseEnvText('# a comment\n\nKEY=value\n  # indented comment\n')).toEqual({
      KEY: 'value',
    });
  });
  it('strips surrounding quotes and trims whitespace', () => {
    expect(parseEnvText('A="quoted"\nB= spaced \nC=\'single\'')).toEqual({
      A: 'quoted',
      B: 'spaced',
      C: 'single',
    });
  });
  it('returns an empty object for empty input', () => {
    expect(parseEnvText('')).toEqual({});
  });
});
