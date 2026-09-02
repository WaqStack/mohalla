import { describe, it, expect } from 'vitest';
import { parseAdminEnv } from './env';

describe('parseAdminEnv', () => {
  it('applies safe development defaults when nothing is set', () => {
    const env = parseAdminEnv({});
    expect(env.NEXT_PUBLIC_ENVIRONMENT).toBe('development');
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('http://127.0.0.1:3000');
  });

  it('strips a trailing slash so path joining cannot double up', () => {
    const env = parseAdminEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.org/' });
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('https://api.example.org');
  });

  it('rejects a non-URL API base rather than shipping a broken console', () => {
    expect(() => parseAdminEnv({ NEXT_PUBLIC_API_BASE_URL: 'not a url' })).toThrow(
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  });

  it('rejects an unknown environment', () => {
    expect(() => parseAdminEnv({ NEXT_PUBLIC_ENVIRONMENT: 'prod' })).toThrow();
  });
});
