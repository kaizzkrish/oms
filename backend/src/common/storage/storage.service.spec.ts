import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';

function createConfigService(driver: string, root: string): ConfigService {
  return {
    get: () => ({ driver, root }),
  } as unknown as ConfigService;
}

describe('StorageService', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'oms-storage-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('writes a buffer under the storage root and returns a relative path', async () => {
    const service = new StorageService(createConfigService('local', tempRoot));

    const relativePath = await service.save(
      Buffer.from('hello world'),
      'documents/org-1',
      'Report.pdf',
    );

    expect(relativePath.startsWith(path.posix.join('documents', 'org-1'))).toBe(
      true,
    );
    expect(relativePath.endsWith('-Report.pdf')).toBe(true);

    const absolutePath = service.getAbsolutePath(relativePath);
    const contents = await fs.readFile(absolutePath, 'utf-8');
    expect(contents).toBe('hello world');
  });

  it('sanitizes unsafe characters in the original file name', async () => {
    const service = new StorageService(createConfigService('local', tempRoot));

    const relativePath = await service.save(
      Buffer.from('data'),
      'documents/org-1',
      '../../etc/passwd',
    );

    expect(relativePath).not.toContain('..');
    expect(path.basename(relativePath)).toMatch(/^[a-f0-9-]+-passwd$/);
  });

  it('throws when the configured driver is not local', () => {
    const service = new StorageService(createConfigService('s3', tempRoot));

    expect(() => service.getAbsolutePath('documents/org-1/file.pdf')).toThrow(
      InternalServerErrorException,
    );
  });
});
