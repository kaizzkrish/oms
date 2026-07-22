import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'file';
}

@Injectable()
export class StorageService {
  private readonly driver: string;
  private readonly root: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const storageConfig = configService.get('storage', { infer: true });
    this.driver = storageConfig.driver;
    this.root = path.resolve(process.cwd(), storageConfig.root);
  }

  private assertLocalDriver(): void {
    if (this.driver !== 'local') {
      throw new InternalServerErrorException(
        `Storage driver "${this.driver}" is not implemented`,
      );
    }
  }

  /**
   * Writes a buffer under `<root>/<subdirectory>/<uuid>-<sanitized name>`
   * and returns the path relative to the storage root, which is what gets
   * persisted so the storage root can move between environments.
   */
  async save(
    buffer: Buffer,
    subdirectory: string,
    fileName: string,
  ): Promise<string> {
    this.assertLocalDriver();
    const uniqueName = `${randomUUID()}-${sanitizeFileName(fileName)}`;
    const relativePath = path.posix.join(subdirectory, uniqueName);
    const absolutePath = path.join(this.root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
    return relativePath;
  }

  getAbsolutePath(relativePath: string): string {
    this.assertLocalDriver();
    return path.join(this.root, relativePath);
  }
}
