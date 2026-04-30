import { describe, it, expect } from 'vitest';
import { maskCep } from './cep';

describe('maskCep', () => {
  it('returns empty string when input has no digits', () => {
    expect(maskCep('abc')).toBe('');
  });

  it('keeps less than 5 digits without dash', () => {
    expect(maskCep('123')).toBe('123');
    expect(maskCep('12345')).toBe('12345');
  });

  it('inserts dash after the 5th digit', () => {
    expect(maskCep('12345678')).toBe('12345-678');
  });

  it('strips non-digit characters before masking', () => {
    expect(maskCep('12.345-678')).toBe('12345-678');
  });

  it('truncates anything beyond 8 digits', () => {
    expect(maskCep('123456789999')).toBe('12345-678');
  });
});
