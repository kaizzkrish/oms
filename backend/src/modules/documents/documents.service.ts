import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Document } from '../../generated/prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta } from '../../common/interfaces/paginated-result.interface';
import { StorageService } from '../../common/storage/storage.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { ProjectsService } from '../projects/projects.service';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from './constants/document-upload.constants';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { QueryDocumentsDto } from './dto/query-documents.dto';
import type { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsRepository } from './documents.repository';

export interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface DocumentDownloadInfo {
  absolutePath: string;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly projectsService: ProjectsService,
    private readonly storageService: StorageService,
  ) {}

  async getDocumentOrThrow(id: string): Promise<Document> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with id "${id}" not found`);
    }
    return document;
  }

  async listDocuments(
    query: QueryDocumentsDto,
  ): Promise<PaginatedResult<Document>> {
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.documentsRepository.findMany({
      skip,
      take: query.limit,
      search: query.search,
      isActive: query.isActive,
      organizationId: query.organizationId,
      projectId: query.projectId,
      type: query.type,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private async assertProjectBelongsToOrganization(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectsService.getProjectOrThrow(projectId);
    if (project.organizationId !== organizationId) {
      throw new BadRequestException(
        'The selected project does not belong to this organization',
      );
    }
  }

  private assertValidFile(file: UploadedDocumentFile): void {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the maximum allowed size of ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB`,
      );
    }
    if (
      !ALLOWED_DOCUMENT_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
      )
    ) {
      throw new UnsupportedMediaTypeException(
        `File type "${file.mimetype}" is not allowed`,
      );
    }
  }

  async createDocument(
    dto: CreateDocumentDto,
    file: UploadedDocumentFile,
    createdBy?: string,
  ): Promise<Document> {
    this.assertValidFile(file);

    await this.organizationsService.getOrganizationOrThrow(dto.organizationId);
    await this.assertProjectBelongsToOrganization(
      dto.projectId,
      dto.organizationId,
    );

    const name = dto.name ?? file.originalname;
    const existing = await this.documentsRepository.findByProjectAndName(
      dto.projectId,
      name,
    );
    if (existing) {
      throw new ConflictException(
        'A document with this name already exists in this project',
      );
    }

    const storagePath = await this.storageService.save(
      file.buffer,
      `documents/${dto.organizationId}`,
      file.originalname,
    );

    return this.documentsRepository.create({
      ...dto,
      name,
      fileName: file.originalname,
      storagePath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdBy,
    });
  }

  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
    updatedBy?: string,
  ): Promise<Document> {
    const existing = await this.getDocumentOrThrow(id);
    const organizationId = dto.organizationId ?? existing.organizationId;
    const projectId = dto.projectId ?? existing.projectId;

    if (dto.organizationId) {
      await this.organizationsService.getOrganizationOrThrow(
        dto.organizationId,
      );
    }
    if (dto.projectId) {
      await this.assertProjectBelongsToOrganization(
        dto.projectId,
        organizationId,
      );
    }

    if (dto.name) {
      const nameOwner = await this.documentsRepository.findByProjectAndName(
        projectId,
        dto.name,
      );
      if (nameOwner && nameOwner.id !== id) {
        throw new ConflictException(
          'A document with this name already exists in this project',
        );
      }
    }

    return this.documentsRepository.update(id, { ...dto, updatedBy });
  }

  async deleteDocument(id: string, deletedBy?: string): Promise<void> {
    await this.getDocumentOrThrow(id);
    await this.documentsRepository.softDelete(id, deletedBy);
  }

  async restoreDocument(id: string, updatedBy?: string): Promise<Document> {
    await this.getDocumentOrThrow(id);
    return this.documentsRepository.restore(id, updatedBy);
  }

  async getDownloadInfo(id: string): Promise<DocumentDownloadInfo> {
    const document = await this.getDocumentOrThrow(id);
    return {
      absolutePath: this.storageService.getAbsolutePath(document.storagePath),
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }
}
