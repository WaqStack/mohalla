import { describe, it, expect } from 'vitest';
import { keysetPagination, locale, pakistaniMobile, validate } from './index.js';

describe('keysetPagination', () => {
  it('defaults limit to 20 and leaves cursor absent', () => {
    const r = validate(keysetPagination, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.limit).toBe(20);
  });

  it('caps limit at 50 so a client cannot ask for an unbounded page', () => {
    const r = validate(keysetPagination, { limit: 500 });
    expect(r.ok).toBe(false);
  });

  it('coerces a query-string limit, since query params arrive as strings', () => {
    const r = validate(keysetPagination, { limit: '10' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.limit).toBe(10);
  });
});

describe('locale', () => {
  it('accepts both peer languages', () => {
    expect(validate(locale, 'en').ok).toBe(true);
    expect(validate(locale, 'ur').ok).toBe(true);
  });

  it('rejects a third language rather than silently falling back', () => {
    expect(validate(locale, 'fr').ok).toBe(false);
  });
});

describe('pakistaniMobile', () => {
  it('accepts E.164 Pakistani mobile', () => {
    expect(validate(pakistaniMobile, '+923001234567').ok).toBe(true);
  });

  it.each(['03001234567', '+92300123456', '+13001234567', '+9230012345678'])(
    'rejects %s',
    (bad) => {
      expect(validate(pakistaniMobile, bad).ok).toBe(false);
    },
  );
});

describe('validate', () => {
  it('never echoes the rejected value back in an issue', () => {
    const r = validate(pakistaniMobile, 'secret-looking-value');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      for (const issue of r.issues) {
        expect(issue.message).not.toContain('secret-looking-value');
      }
    }
  });
});
