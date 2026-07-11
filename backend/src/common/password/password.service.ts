import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import type { AppConfig } from '../../config/configuration';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async hash(plainText: string): Promise<string> {
    const { algorithm } = this.configService.get('passwordHash', {
      infer: true,
    });
    return algorithm === 'bcrypt'
      ? bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS)
      : argon2.hash(plainText);
  }

  /**
   * Detects the hashing algorithm from the hash's own prefix rather than
   * trusting the current config, so verification keeps working for any
   * hashes created before PASSWORD_HASH_ALGORITHM was last changed.
   */
  async verify(hash: string, plainText: string): Promise<boolean> {
    if (hash.startsWith('$argon2')) {
      return argon2.verify(hash, plainText);
    }
    if (hash.startsWith('$2')) {
      return bcrypt.compare(plainText, hash);
    }
    return false;
  }
}
