import { apiSlice } from '../../shared/api/apiSlice';
import { axiosInstance } from '../../shared/api/axiosInstance';

export const DOCUMENT_TYPES = ['CONTRACT', 'INVOICE', 'REPORT', 'SPECIFICATION', 'OTHER'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface DocumentRecord {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  type: DocumentType;
  isActive: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedDocuments {
  items: DocumentRecord[];
  meta: PaginationMeta;
}

export interface ListDocumentsParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  organizationId?: string;
  projectId?: string;
  type?: DocumentType;
  sortBy: 'name' | 'sizeBytes' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface CreateDocumentInput {
  organizationId: string;
  projectId: string;
  name?: string;
  description?: string;
  type?: DocumentType;
  file: File;
}

export interface UpdateDocumentBody {
  organizationId?: string;
  projectId?: string;
  name?: string;
  description?: string;
  type?: DocumentType;
  isActive?: boolean;
}

function buildDocumentFormData(input: CreateDocumentInput): FormData {
  const formData = new FormData();
  formData.append('organizationId', input.organizationId);
  formData.append('projectId', input.projectId);
  if (input.name) formData.append('name', input.name);
  if (input.description) formData.append('description', input.description);
  if (input.type) formData.append('type', input.type);
  formData.append('file', input.file);
  return formData;
}

export const documentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    listDocuments: builder.query<PaginatedDocuments, ListDocumentsParams>({
      query: (params) => ({ url: '/documents', method: 'GET', params }),
      providesTags: (result) => [
        { type: 'Document' as const, id: 'LIST' },
        ...(result?.items.map((document) => ({
          type: 'Document' as const,
          id: document.id,
        })) ?? []),
      ],
    }),
    createDocument: builder.mutation<DocumentRecord, CreateDocumentInput>({
      query: (input) => ({
        url: '/documents',
        method: 'POST',
        data: buildDocumentFormData(input),
      }),
      invalidatesTags: [{ type: 'Document', id: 'LIST' }],
    }),
    updateDocument: builder.mutation<DocumentRecord, { id: string; body: UpdateDocumentBody }>({
      query: ({ id, body }) => ({
        url: `/documents/${id}`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id },
      ],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id },
      ],
    }),
    restoreDocument: builder.mutation<DocumentRecord, string>({
      query: (id) => ({ url: `/documents/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id },
      ],
    }),
  }),
});

export const {
  useListDocumentsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useRestoreDocumentMutation,
} = documentsApi;

/**
 * The download endpoint returns a raw binary stream, not the JSON envelope
 * every other endpoint uses, so it's a plain axios call (with the auth
 * header attached by the shared interceptor) rather than an RTK Query
 * endpoint — the result is turned into a client-side download via an
 * object URL instead of being cached in the store.
 */
export async function downloadDocument(id: string, fileName: string): Promise<void> {
  const response = await axiosInstance.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
