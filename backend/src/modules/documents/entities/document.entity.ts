import { ApiProperty } from '@nestjs/swagger';
import type { Document } from '../../../generated/prisma/client';
import type { DocumentType } from '../constants/document-type';

export class DocumentEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  sizeBytes: number;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  type: DocumentType;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(props: DocumentEntity) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.name = props.name;
    this.fileName = props.fileName;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.description = props.description;
    this.type = props.type;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
  }

  static fromPrisma(document: Document): DocumentEntity {
    return new DocumentEntity({
      id: document.id,
      organizationId: document.organizationId,
      projectId: document.projectId,
      name: document.name,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      description: document.description,
      type: document.type as DocumentType,
      isActive: document.isActive,
      createdAt: document.createdAt,
    });
  }
}
