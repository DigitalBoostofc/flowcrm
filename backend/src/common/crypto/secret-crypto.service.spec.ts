import { ConfigService } from '@nestjs/config';
import { SecretCryptoService } from './secret-crypto.service';

describe('SecretCryptoService', () => {
  let service: SecretCryptoService;

  beforeEach(() => {
    const config = { getOrThrow: () => 'test-jwt-secret-with-min-16-chars' } as unknown as ConfigService;
    service = new SecretCryptoService(config);
  });

  it('encrypts and decrypts roundtrip', () => {
    const plain = 'sk-ant-api03-AbCdEf1234567890';
    const cipher = service.encrypt(plain);
    expect(cipher).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(service.decrypt(cipher)).toBe(plain);
  });

  it('produces different ciphertexts for the same input (random nonce)', () => {
    const plain = 'sk-ant-foo';
    const a = service.encrypt(plain);
    const b = service.encrypt(plain);
    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe(plain);
    expect(service.decrypt(b)).toBe(plain);
  });

  it('rejects tampered ciphertext (auth tag check)', () => {
    const cipher = service.encrypt('hello');
    const tampered = cipher.slice(0, -2) + (cipher.endsWith('00') ? 'ff' : '00');
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('rejects malformed payload', () => {
    expect(() => service.decrypt('not-a-cipher')).toThrow(/Invalid ciphertext format/);
    expect(() => service.decrypt('v2:aa:bb:cc')).toThrow(/Invalid ciphertext format/);
  });

  it('throws on empty plain text', () => {
    expect(() => service.encrypt('')).toThrow(/Cannot encrypt empty value/);
  });

  it('different secrets produce different keys (cross-secret decrypt fails)', () => {
    const cfg2 = { getOrThrow: () => 'different-secret-still-16chars' } as unknown as ConfigService;
    const service2 = new SecretCryptoService(cfg2);
    const cipher = service.encrypt('hello');
    expect(() => service2.decrypt(cipher)).toThrow();
  });

  describe('mask', () => {
    it('masks a key showing only last 4 chars', () => {
      expect(SecretCryptoService.mask('sk-ant-api03-AbCdEf1234')).toBe(`${'•'.repeat(20)}1234`);
    });

    it('returns **** for very short input', () => {
      expect(SecretCryptoService.mask('')).toBe('****');
      expect(SecretCryptoService.mask('abc')).toBe('****');
    });
  });
});
