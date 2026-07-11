import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

function createService(algorithm: 'argon2' | 'bcrypt'): PasswordService {
  const configService = {
    get: () => ({ algorithm }),
  } as unknown as ConfigService;
  return new PasswordService(configService);
}

describe('PasswordService', () => {
  it('hashes and verifies a password using argon2 by default', async () => {
    const service = createService('argon2');
    const hash = await service.hash('Sup3rSecret!');

    expect(hash).toMatch(/^\$argon2/);
    await expect(service.verify(hash, 'Sup3rSecret!')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('hashes and verifies a password using bcrypt when configured', async () => {
    const service = createService('bcrypt');
    const hash = await service.hash('Sup3rSecret!');

    expect(hash).toMatch(/^\$2/);
    await expect(service.verify(hash, 'Sup3rSecret!')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('verifies a bcrypt hash even when the configured algorithm is argon2', async () => {
    const bcryptService = createService('bcrypt');
    const hash = await bcryptService.hash('Sup3rSecret!');

    const argon2Service = createService('argon2');
    await expect(argon2Service.verify(hash, 'Sup3rSecret!')).resolves.toBe(
      true,
    );
  });

  it('returns false for an unrecognized hash format', async () => {
    const service = createService('argon2');
    await expect(service.verify('not-a-real-hash', 'anything')).resolves.toBe(
      false,
    );
  });
});
