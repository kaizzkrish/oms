import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { showToast } from '../../app/notificationsSlice';
import { getErrorMessage } from '../../shared/api/getErrorMessage';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useHasPermission } from '../../shared/hooks/usePermissions';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { DocumentFormDialog, type DocumentFormValues } from './DocumentFormDialog';
import {
  DOCUMENT_TYPES,
  downloadDocument,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useListDocumentsQuery,
  useRestoreDocumentMutation,
  useUpdateDocumentMutation,
  type DocumentRecord,
  type DocumentType,
  type ListDocumentsParams,
} from './documentsApi';

type SortableField = ListDocumentsParams['sortBy'];

const columns: { field: SortableField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'sizeBytes', label: 'Size' },
  { field: 'createdAt', label: 'Created' },
];

const TYPE_LABELS: Record<DocumentType, string> = {
  CONTRACT: 'Contract',
  INVOICE: 'Invoice',
  REPORT: 'Report',
  SPECIFICATION: 'Specification',
  OTHER: 'Other',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsListPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = useHasPermission('Documents.Create');
  const canUpdate = useHasPermission('Documents.Update');
  const canDelete = useHasPermission('Documents.Delete');

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [organizationFilter, setOrganizationFilter] = useState(
    searchParams.get('organizationId') ?? '',
  );
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') ?? '');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [sortBy, setSortBy] = useState<SortableField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | undefined>(undefined);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: organizationsData } = useListOrganizationsQuery({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const organizationNameById = useMemo(
    () => new Map((organizationsData?.items ?? []).map((o) => [o.id, o.name])),
    [organizationsData],
  );

  const { data: projectsData } = useListProjectsQuery({
    page: 1,
    limit: 100,
    organizationId: organizationFilter || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const projectNameById = useMemo(
    () => new Map((projectsData?.items ?? []).map((p) => [p.id, p.name])),
    [projectsData],
  );

  const { data, isLoading, error } = useListDocumentsQuery({
    page: page + 1,
    limit,
    search: search || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    organizationId: organizationFilter || undefined,
    projectId: projectFilter || undefined,
    type: typeFilter || undefined,
    sortBy,
    sortOrder,
  });

  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation();
  const [updateDocument, { isLoading: isUpdating }] = useUpdateDocumentMutation();
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();
  const [restoreDocument] = useRestoreDocumentMutation();
  const [downloadingId, setDownloadingId] = useState<string | undefined>(undefined);

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingDocument(undefined);
    setFormOpen(true);
  };

  const openEditForm = (document: DocumentRecord) => {
    setEditingDocument(document);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: DocumentFormValues, file: File | null) => {
    try {
      if (editingDocument) {
        await updateDocument({
          id: editingDocument.id,
          body: {
            organizationId: values.organizationId,
            projectId: values.projectId,
            name: values.name || undefined,
            description: values.description || undefined,
            type: values.type,
            isActive: values.isActive,
          },
        }).unwrap();
        dispatch(showToast('Document updated successfully.', 'success'));
      } else {
        if (!file) return;
        await createDocument({
          organizationId: values.organizationId,
          projectId: values.projectId,
          name: values.name || undefined,
          description: values.description || undefined,
          type: values.type,
          file,
        }).unwrap();
        dispatch(showToast('Document uploaded successfully.', 'success'));
      }
      setFormOpen(false);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to save document.'), 'error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDocument(pendingDelete.id).unwrap();
      dispatch(showToast('Document deleted.', 'success'));
      setPendingDelete(undefined);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to delete document.'), 'error'));
    }
  };

  const handleRestore = async (document: DocumentRecord) => {
    try {
      await restoreDocument(document.id).unwrap();
      dispatch(showToast('Document restored.', 'success'));
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to restore document.'), 'error'));
    }
  };

  const handleDownload = async (document: DocumentRecord) => {
    setDownloadingId(document.id);
    try {
      await downloadDocument(document.id, document.fileName);
    } catch (err) {
      dispatch(showToast(getErrorMessage(err, 'Failed to download document.'), 'error'));
    } finally {
      setDownloadingId(undefined);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Documents
        </Typography>
        {canCreate ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            New Document
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          placeholder="Search by name or file name"
          size="small"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: 280 }}
        />
        <TextField
          select
          label="Organization"
          size="small"
          value={organizationFilter}
          onChange={(event) => {
            const value = event.target.value;
            setOrganizationFilter(value);
            setProjectFilter('');
            setPage(0);
            setSearchParams(value ? { organizationId: value } : {});
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All organizations</MenuItem>
          {(organizationsData?.items ?? []).map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Project"
          size="small"
          value={projectFilter}
          onChange={(event) => {
            setProjectFilter(event.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All projects</MenuItem>
          {(projectsData?.items ?? []).map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          size="small"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as DocumentType | '');
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {DOCUMENT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter);
            setPage(0);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </Stack>

      {error ? <Alert severity="error">Failed to load documents.</Alert> : null}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.field}>
                    <TableSortLabel
                      active={sortBy === column.field}
                      direction={sortBy === column.field ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.field)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>Project</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell>
                    <Typography variant="body2">{document.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {organizationNameById.get(document.organizationId) ?? '—'} ·{' '}
                      {document.fileName}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatBytes(document.sizeBytes)}</TableCell>
                  <TableCell>{new Date(document.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{projectNameById.get(document.projectId) ?? '—'}</TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[document.type]} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Download">
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Download ${document.name}`}
                          disabled={downloadingId === document.id}
                          onClick={() => void handleDownload(document)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {canUpdate ? (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${document.name}`}
                          onClick={() => openEditForm(document)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canDelete && document.isActive ? (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          aria-label={`Delete ${document.name}`}
                          onClick={() => setPendingDelete(document)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {canUpdate && !document.isActive ? (
                      <Tooltip title="Restore">
                        <IconButton
                          size="small"
                          aria-label={`Restore ${document.name}`}
                          onClick={() => void handleRestore(document)}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography color="text.secondary">No documents found.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.meta.total ?? 0}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <DocumentFormDialog
        open={formOpen}
        mode={editingDocument ? 'edit' : 'create'}
        document={editingDocument}
        defaultOrganizationId={organizationFilter || undefined}
        defaultProjectId={projectFilter || undefined}
        submitting={isCreating || isUpdating}
        onSubmit={(values, file) => void handleFormSubmit(values, file)}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete document"
        message={`Are you sure you want to delete "${pendingDelete?.name ?? ''}"?`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(undefined)}
      />
    </Stack>
  );
}
