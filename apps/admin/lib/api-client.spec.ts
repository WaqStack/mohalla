import { describe, it, expect } from 'vitest';
import { buildUrl } from './api-client';

describe('buildUrl', () => {
  it('joins base and path with exactly one slash', () => {
    expect(buildUrl('/health', 'https://api.example.org')).toBe('https://api.example.org/health');
    expect(buildUrl('health', 'https://api.example.org')).toBe('https://api.example.org/health');
    expect(buildUrl('/health', 'https://api.example.org/')).toBe('https://api.example.org/health');
  });

  it('never emits a double slash between base and path', () => {
    const url = buildUrl('///health', 'https://api.example.org///');
    expect(url).toBe('https://api.example.org/health');
  });
});
