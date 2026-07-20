import { zodResolver } from '@hookform/resolvers/zod';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useListOrganizationsQuery } from '../organizations/organizationsApi';
import { useListProjectsQuery } from '../projects/projectsApi';
import { DOCUMENT_TYPES, type DocumentRecord } from './documentsApi';

const TYPE_LABELS: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  CONTRACT: 'Contract',
  INVOICE: 'Invoice',
  REPORT: 'Report',
  SPECIFICATION: 'Specification',
  OTHER: 'Other',
};

const schema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  projectId: z.string().min(1, 'Select a project'),
  name: z.string().max(150),
  description: z.string().max(500),
  type: z.enum(DOCUMENT_TYPES),
  isActive: z.boolean(),
});

export type DocumentFormValues = z.infer<typeof schema>;

interface DocumentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  document?: DocumentRecord;
  defaultOrganizationId?: string;
  defaultProjectId?: string;
  submitting?: boolean;
  onSubmit: (values: DocumentFormValues, file: File | null) => void;
  onClose: () => void;
}

export function DocumentFormDialog({
  open,
  mode,
  document,
  defaultOrganizationId,
  defaultProjectId,
  submitting = false,
  onSubmit,
  onClose,
}: DocumentFormDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFile(null);
      setFileError(undefined);
    }
  }

  const { data: organizationsData } = useListOrganizationsQuery(
    { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
    { skip: !open },
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: '',
      projectId: '',
      name: '',
      description: '',
      type: 'OTHER',
      isActive: true,
    },
  });

  const selectedOrganizationId = useWatch({ control, name: 'organizationId' });

  const { data: projectsData } = useListProjectsQuery(
    {
      page: 1,
      limit: 100,
      isActive: true,
      organizationId: selectedOrganizationId || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    { skip: !open || !selectedOrganizationId },
  );

  useEffect(() => {
    if (open) {
      reset({
        organizationId: document?.organizationId ?? defaultOrganizationId ?? '',
        projectId: document?.projectId ?? defaultProjectId ?? '',
        name: document?.name ?? '',
        description: document?.description ?? '',
        type: document?.type ?? 'OTHER',
        isActive: document?.isActive ?? true,
      });
    }
  }, [open, document, defaultOrganizationId, defaultProjectId, reset]);

  const handleFormSubmit = (values: DocumentFormValues) => {
    if (mode === 'create' && !file) {
      setFileError('Select a file to upload');
      return;
    }
    onSubmit(values, file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'New Document' : 'Edit Document'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          component="form"
          id="document-form"
          onSubmit={(event) => void handleSubmit(handleFormSubmit)(event)}
        >
          <Stack spacing={2}>
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Organization"
                  error={Boolean(errors.organizationId)}
                  helperText={errors.organizationId?.message}
                >
                  {(organizationsData?.items ?? []).map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Project"
                  disabled={!selectedOrganizationId}
                  error={Boolean(errors.projectId)}
                  helperText={errors.projectId?.message}
                >
                  {(projectsData?.items ?? []).map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {mode === 'create' ? (
              <Box>
                <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
                  {file ? file.name : 'Choose file'}
                  <input
                    type="file"
                    hidden
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setFile(nextFile);
                      if (nextFile) setFileError(undefined);
                    }}
                  />
                </Button>
                {fileError ? (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {fileError}
                  </Typography>
                ) : null}
              </Box>
            ) : (
              <Alert severity="info">
                To replace the file, delete this document and upload a new one.
              </Alert>
            )}
            <TextField
              label="Name"
              placeholder="Defaults to the file name"
              error={Boolean(errors.name)}
              helperText={errors.name?.message ?? 'Optional'}
              {...register('name')}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Type">
                  {DOCUMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Description"
              multiline
              minRows={2}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label="Active"
                />
              )}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" form="document-form" variant="contained" disabled={submitting}>
          {mode === 'create' ? 'Upload' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
