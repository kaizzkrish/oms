import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Document, Project } from '../../generated/prisma/client';
import type { StorageService } from '../../common/storage/storage.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import { DocumentsRepository } from './documents.repository';
import {
  DocumentsService,
  type UploadedDocumentFile,
} from './documents.service';

function createDocumentFixture(overrides: Partial<Document> = {}): Document {
  return {
    id: 'document-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    name: 'Master Services Agreement',
    fileName: 'msa.pdf',
    storagePath: 'documents/org-1/uuid-msa.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    description: null,
    type: 'CONTRACT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

function createOrgFixture(
  overrides: Partial<OrganizationWithOfficeCount> = {},
): OrganizationWithOfficeCount {
  return {
    id: 'org-1',
    name: 'Acme Corporation',
    legalName: null,
    registrationNumber: null,
    industry: null,
    website: null,
    email: null,
    phone: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    _count: { offices: 0 },
    ...overrides,
  };
}

function createProjectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organizationId: 'org-1',
    clientId: null,
    departmentId: null,
    projectManagerId: null,
    teamId: null,
    name: 'Website Redesign',
    code: 'WEB-RD',
    description: null,
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
    budget: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    ...overrides,
  };
}

function createFileFixture(
  overrides: Partial<UploadedDocumentFile> = {},
): UploadedDocumentFile {
  return {
    originalname: 'msa.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf-bytes'),
    ...overrides,
  };
}

describe('DocumentsService', () => {
  let repository: jest.Mocked<DocumentsRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let storageService: jest.Mocked<StorageService>;
  let service: DocumentsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<DocumentsRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    storageService = {
      save: jest.fn(),
      getAbsolutePath: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    service = new DocumentsService(
      repository,
      organizationsService,
      projectsService,
      storageService,
    );
  });

  describe('createDocument', () => {
    it('saves the file and creates a document once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      storageService.save.mockResolvedValue('documents/org-1/uuid-msa.pdf');
      repository.create.mockResolvedValue(createDocumentFixture());

      const result = await service.createDocument(
        { organizationId: 'org-1', projectId: 'project-1' },
        createFileFixture(),
        'admin-1',
      );

      expect(storageService.save).toHaveBeenCalledWith(
        expect.any(Buffer),
        'documents/org-1',
        'msa.pdf',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'msa.pdf',
          fileName: 'msa.pdf',
          storagePath: 'documents/org-1/uuid-msa.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Master Services Agreement');
    });

    it('defaults the document name to the original file name when not provided', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      storageService.save.mockResolvedValue('documents/org-1/uuid-msa.pdf');
      repository.create.mockResolvedValue(createDocumentFixture());

      await service.createDocument(
        { organizationId: 'org-1', projectId: 'project-1' },
        createFileFixture({ originalname: 'contract-v2.pdf' }),
      );

      expect(repository.findByProjectAndName).toHaveBeenCalledWith(
        'project-1',
        'contract-v2.pdf',
      );
    });

    it('rejects a file larger than the configured maximum', async () => {
      await expect(
        service.createDocument(
          { organizationId: 'org-1', projectId: 'project-1' },
          createFileFixture({ size: 100 * 1024 * 1024 }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        organizationsService.getOrganizationOrThrow,
      ).not.toHaveBeenCalled();
      expect(storageService.save).not.toHaveBeenCalled();
    });

    it('rejects a disallowed mime type', async () => {
      await expect(
        service.createDocument(
          { organizationId: 'org-1', projectId: 'project-1' },
          createFileFixture({
            mimetype: 'application/x-msdownload',
            originalname: 'setup.exe',
          }),
        ),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(storageService.save).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createDocument(
          { organizationId: 'org-1', projectId: 'project-1' },
          createFileFixture(),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(storageService.save).not.toHaveBeenCalled();
    });

    it('validates the project belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createDocument(
          { organizationId: 'org-1', projectId: 'project-1' },
          createFileFixture(),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(storageService.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(
        createDocumentFixture(),
      );

      await expect(
        service.createDocument(
          { organizationId: 'org-1', projectId: 'project-1' },
          createFileFixture(),
        ),
      ).rejects.toThrow(ConflictException);
      expect(storageService.save).not.toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('updates document metadata when found and name is free', async () => {
      repository.findById.mockResolvedValue(createDocumentFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createDocumentFixture({ description: 'Updated' }),
      );

      const result = await service.updateDocument(
        'document-1',
        { description: 'Updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'document-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result.description).toBe('Updated');
    });

    it('throws NotFoundException when the document does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateDocument('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another document in the same project', async () => {
      repository.findById.mockResolvedValue(createDocumentFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createDocumentFixture({ id: 'other-document' }),
      );

      await expect(
        service.updateDocument('document-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteDocument', () => {
    it('soft-deletes a document', async () => {
      repository.findById.mockResolvedValue(createDocumentFixture());
      repository.softDelete.mockResolvedValue(
        createDocumentFixture({ isActive: false }),
      );

      await service.deleteDocument('document-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'document-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the document does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteDocument('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreDocument', () => {
    it('restores a soft-deleted document', async () => {
      repository.findById.mockResolvedValue(
        createDocumentFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createDocumentFixture());

      const result = await service.restoreDocument('document-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('document-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('getDownloadInfo', () => {
    it('returns the absolute path, file name, and mime type', async () => {
      repository.findById.mockResolvedValue(createDocumentFixture());
      storageService.getAbsolutePath.mockReturnValue(
        '/app/storage/documents/org-1/uuid-msa.pdf',
      );

      const result = await service.getDownloadInfo('document-1');

      expect(storageService.getAbsolutePath).toHaveBeenCalledWith(
        'documents/org-1/uuid-msa.pdf',
      );
      expect(result).toEqual({
        absolutePath: '/app/storage/documents/org-1/uuid-msa.pdf',
        fileName: 'msa.pdf',
        mimeType: 'application/pdf',
      });
    });

    it('throws NotFoundException when the document does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getDownloadInfo('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
