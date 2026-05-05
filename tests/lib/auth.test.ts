import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from '@/lib/auth';

describe('isAllowedEmail', () => {
  it('true si está en la lista', () => {
    expect(isAllowedEmail('user@a.com', 'user@a.com,other@b.com')).toBe(true);
    expect(isAllowedEmail('other@b.com', 'user@a.com,other@b.com')).toBe(true);
  });

  it('false si no está', () => {
    expect(isAllowedEmail('intruso@x.com', 'user@a.com,other@b.com')).toBe(false);
  });

  it('case-insensitive', () => {
    expect(isAllowedEmail('USER@a.com', 'user@a.com')).toBe(true);
  });

  it('ignora espacios alrededor', () => {
    expect(isAllowedEmail('user@a.com', ' user@a.com , other@b.com ')).toBe(true);
  });

  it('false si la lista está vacía', () => {
    expect(isAllowedEmail('user@a.com', '')).toBe(false);
    expect(isAllowedEmail('user@a.com', undefined)).toBe(false);
  });
});
