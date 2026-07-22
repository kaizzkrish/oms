import { createReadStream } from 'node:fs';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { MAX_DOCUMENT_SIZE_BYTES } from './constants/document-upload.constants';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermissions('Documents.Create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        organizationId: { type: 'string' },
        projectId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new document' })
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DocumentEntity> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const document = await this.documentsService.createDocument(
      dto,
      file,
      currentUser.sub,
    );
    return DocumentEntity.fromPrisma(document);
  }

  @Get()
  @RequirePermissions('Documents.View')
  @ApiOperation({
    summary:
      'List documents with pagination, search, filtering (by organization/project/type), and sorting',
  })
  @ApiPaginatedResponse(DocumentEntity)
  async findAll(
    @Query() query: QueryDocumentsDto,
  ): Promise<{ items: DocumentEntity[]; meta: unknown }> {
    const result = await this.documentsService.listDocuments(query);
    return {
      items: result.items.map((document) =>
        DocumentEntity.fromPrisma(document),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('Documents.View')
  @ApiOperation({ summary: 'Get a document by id' })
  async findOne(@Param('id') id: string): Promise<DocumentEntity> {
    const document = await this.documentsService.getDocumentOrThrow(id);
    return DocumentEntity.fromPrisma(document);
  }

  @Get(':id/download')
  @RequirePermissions('Documents.View')
  @SkipTransform()
  @ApiOperation({ summary: 'Download the original uploaded file' })
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const { absolutePath, fileName, mimeType } =
      await this.documentsService.getDownloadInfo(id);
    return new StreamableFile(createReadStream(absolutePath), {
      type: mimeType,
      disposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });
  }

  @Patch(':id')
  @RequirePermissions('Documents.Update')
  @ApiOperation({ summary: 'Update a document (metadata only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DocumentEntity> {
    const document = await this.documentsService.updateDocument(
      id,
      dto,
      currentUser.sub,
    );
    return DocumentEntity.fromPrisma(document);
  }

  @Delete(':id')
  @RequirePermissions('Documents.Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a document' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<void> {
    await this.documentsService.deleteDocument(id, currentUser.sub);
  }

  @Patch(':id/restore')
  @RequirePermissions('Documents.Update')
  @ApiOperation({ summary: 'Restore a soft-deleted document' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<DocumentEntity> {
    const document = await this.documentsService.restoreDocument(
      id,
      currentUser.sub,
    );
    return DocumentEntity.fromPrisma(document);
  }
}
