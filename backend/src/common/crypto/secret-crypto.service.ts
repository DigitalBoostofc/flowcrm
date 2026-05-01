import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encrypt/decrypt para secrets sensíveis (ex: API keys de provedores IA do
 * cliente). AES-256-GCM com nonce aleatório por mensagem; chave derivada
 * via scrypt do JWT_SECRET com salt fixo no app (rotação de JWT_SECRET
 * invalida todos os ciphertexts — comportamento desejado).
 *
 * Formato do output: "v1:<nonceHex>:<authTagHex>:<ciphertextHex>"
 */
@Injectable()
export class SecretCryptoService {
  private readonly logger = new Logger(SecretCryptoService.name);
  private readonly key: Buffer;
  private static readonly SALT = Buffer.from('flowcrm-secret-crypto-v1');

  constructor(config: ConfigService) {
    const jwtSecret = config.getOrThrow<string>('JWT_SECRET');
    this.key = crypto.scryptSync(jwtSecret, SecretCryptoService.SALT, 32);
  }

  encrypt(plain: string): string {
    if (!plain) throw new Error('Cannot encrypt empty value');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid ciphertext format');
    }
    const [, ivHex, tagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  }

  /** Mascara uma API key pra exibição segura na UI (mostra só os 4 últimos chars). */
  static mask(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${'•'.repeat(20)}${key.slice(-4)}`;
  }
}
