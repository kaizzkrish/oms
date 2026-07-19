import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Project, Reference } from '../../generated/prisma/client';
import type { OrganizationsService } from '../organizations/organizations.service';
import type { OrganizationWithOfficeCount } from '../organizations/entities/organization.entity';
import type { ProjectsService } from '../projects/projects.service';
import { ReferencesRepository } from './references.repository';
import { ReferencesService } from './references.service';

function createReferenceFixture(overrides: Partial<Reference> = {}): Reference {
  return {
    id: 'reference-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    name: 'Design System Figma',
    url: 'https://figma.com/file/example',
    description: null,
    type: 'DESIGN',
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

describe('ReferencesService', () => {
  let repository: jest.Mocked<ReferencesRepository>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let service: ReferencesService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByProjectAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findMany: jest.fn(),
    } as unknown as jest.Mocked<ReferencesRepository>;

    organizationsService = {
      getOrganizationOrThrow: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsService>;

    projectsService = {
      getProjectOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    service = new ReferencesService(
      repository,
      organizationsService,
      projectsService,
    );
  });

  describe('createReference', () => {
    it('creates a reference once the organization and project are verified', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(createReferenceFixture());

      const result = await service.createReference(
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Design System Figma',
          url: 'https://figma.com/file/example',
        },
        'admin-1',
      );

      expect(organizationsService.getOrganizationOrThrow).toHaveBeenCalledWith(
        'org-1',
      );
      expect(projectsService.getProjectOrThrow).toHaveBeenCalledWith(
        'project-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
          createdBy: 'admin-1',
        }),
      );
      expect(result.name).toBe('Design System Figma');
    });

    it('propagates NotFoundException when the organization does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockRejectedValue(
        new NotFoundException('Organization with id "org-1" not found'),
      );

      await expect(
        service.createReference({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Design System Figma',
          url: 'https://figma.com/file/example',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when the project does not exist', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockRejectedValue(
        new NotFoundException('Project with id "project-1" not found'),
      );

      await expect(
        service.createReference({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Design System Figma',
          url: 'https://figma.com/file/example',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('validates the project belongs to the same organization', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ organizationId: 'other-org' }),
      );

      await expect(
        service.createReference({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Design System Figma',
          url: 'https://figma.com/file/example',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the name is already taken in this project', async () => {
      organizationsService.getOrganizationOrThrow.mockResolvedValue(
        createOrgFixture(),
      );
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture(),
      );
      repository.findByProjectAndName.mockResolvedValue(
        createReferenceFixture(),
      );

      await expect(
        service.createReference({
          organizationId: 'org-1',
          projectId: 'project-1',
          name: 'Design System Figma',
          url: 'https://figma.com/file/example',
        }),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateReference', () => {
    it('updates a reference when found and name is free', async () => {
      repository.findById.mockResolvedValue(createReferenceFixture());
      repository.findByProjectAndName.mockResolvedValue(null);
      repository.update.mockResolvedValue(
        createReferenceFixture({ url: 'https://figma.com/file/updated' }),
      );

      const result = await service.updateReference(
        'reference-1',
        { url: 'https://figma.com/file/updated' },
        'admin-1',
      );

      expect(repository.update).toHaveBeenCalledWith(
        'reference-1',
        expect.objectContaining({ url: 'https://figma.com/file/updated' }),
      );
      expect(result.url).toBe('https://figma.com/file/updated');
    });

    it('throws NotFoundException when the reference does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateReference('missing', { url: 'https://example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the new name belongs to another reference in the same project', async () => {
      repository.findById.mockResolvedValue(createReferenceFixture());
      repository.findByProjectAndName.mockResolvedValue(
        createReferenceFixture({ id: 'other-reference' }),
      );

      await expect(
        service.updateReference('reference-1', { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates a reassigned project belongs to the same organization', async () => {
      repository.findById.mockResolvedValue(createReferenceFixture());
      projectsService.getProjectOrThrow.mockResolvedValue(
        createProjectFixture({ id: 'project-2', organizationId: 'other-org' }),
      );

      await expect(
        service.updateReference('reference-1', { projectId: 'project-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteReference', () => {
    it('soft-deletes a reference', async () => {
      repository.findById.mockResolvedValue(createReferenceFixture());
      repository.softDelete.mockResolvedValue(
        createReferenceFixture({ isActive: false }),
      );

      await service.deleteReference('reference-1', 'admin-1');

      expect(repository.softDelete).toHaveBeenCalledWith(
        'reference-1',
        'admin-1',
      );
    });

    it('throws NotFoundException when the reference does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteReference('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restoreReference', () => {
    it('restores a soft-deleted reference', async () => {
      repository.findById.mockResolvedValue(
        createReferenceFixture({ isActive: false, deletedAt: new Date() }),
      );
      repository.restore.mockResolvedValue(createReferenceFixture());

      const result = await service.restoreReference('reference-1', 'admin-1');

      expect(repository.restore).toHaveBeenCalledWith('reference-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });
});
