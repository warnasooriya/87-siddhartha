import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type ChangeEvent } from 'react'
import { useSnackbar } from 'notistack'

import { FULL_ACCESS_ROLES } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import { deleteDocumentRemote, insertAuditLogRemote, insertDocumentRemote, refreshDataFromSupabase } from '../../services/supabaseMutations'
import type { DocumentRecord, DocumentType } from '../../types/domain'

const allowedTypes: DocumentType[] = [
  'NIC',
  'Birth Certificate',
  'Marriage Certificate',
  'Membership Application',
  'Other',
]

const DocumentsPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const { documents, members } = useAppSelector((state) => state.data)
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [documentType, setDocumentType] = useState<DocumentType>('NIC')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [documentToDelete, setDocumentToDelete] = useState<DocumentRecord | null>(null)
  const canManageDocuments = auth.hasRole(FULL_ACCESS_ROLES)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      enqueueSnackbar('ගොනුව 10MB ඉක්මවා ඇත', { variant: 'error' })
      return
    }
    setSelectedFileName(file.name)
  }

  const handleUpload = async () => {
    if (!currentUser || !memberId || !selectedFileName) {
      return
    }
    if (!canManageDocuments) {
      enqueueSnackbar('ලේඛන වෙනස් කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const document: DocumentRecord = {
      id: crypto.randomUUID(),
      memberId,
      documentType,
      fileName: selectedFileName,
      fileUrl: '#',
      uploadedBy: currentUser.fullName,
      uploadedAt: new Date().toISOString(),
      version: 1,
    }

    try {
      await insertDocumentRemote(document, currentUser.id)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'UPLOAD_DOCUMENT', 'DOCUMENT', document.id, 'ලේඛනයක් උඩුගත කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('ලේඛනය සාර්ථකව සටහන් කරන ලදි', { variant: 'success' })
      setSelectedFileName('')
    } catch {
      enqueueSnackbar('Supabase වෙත ලේඛනය සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!currentUser) {
      return
    }
    if (!canManageDocuments) {
      enqueueSnackbar('ලේඛන ඉවත් කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }
    try {
      await deleteDocumentRemote(documentId)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'DELETE', 'DOCUMENT', documentId, 'ලේඛනය ඉවත් කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('ලේඛනය ඉවත් කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('Supabase වෙතින් ලේඛනය ඉවත් කිරීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const confirmDelete = async () => {
    if (!documentToDelete) {
      return
    }
    await handleDelete(documentToDelete.id)
    setDocumentToDelete(null)
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          ලේඛන කළමනාකරණය
        </Typography>
        <Typography color="text.secondary">
          PDF, JPG, PNG ගොනු 10MB දක්වා, version tracking සහ Supabase Storage සඳහා සූදානම් metadata
          flow.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  select
                  label="සාමාජිකයා"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  fullWidth
                >
                  {members.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.fullName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="ලේඛන වර්ගය"
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                  fullWidth
                >
                  {allowedTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <Button component="label" variant="outlined" startIcon={<FileUploadOutlinedIcon />}>
                  ගොනුව තෝරන්න
                  <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  තෝරාගත් ගොනුව: {selectedFileName || 'නොමැත'}
                </Typography>
                <Button variant="contained" onClick={handleUpload} disabled={!selectedFileName || !canManageDocuments}>
                  උඩුගත කිරීම සටහන් කරන්න
                </Button>
                {!canManageDocuments ? (
                  <Typography variant="body2" color="text.secondary">
                    මෙම පිටුව ඔබට view only ආකාරයෙන් පෙන්වයි.
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            {documents.map((document) => (
              <Card key={document.id}>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
                  >
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{document.fileName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {document.documentType} | version {document.version} | {document.uploadedBy}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {document.uploadedAt}
                      </Typography>
                    </Stack>
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      onClick={() => setDocumentToDelete(document)}
                      disabled={!canManageDocuments}
                    >
                      ඉවත් කරන්න
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={Boolean(documentToDelete)} onClose={() => setDocumentToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>ලේඛනය ඉවත් කරන්නද?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {documentToDelete ? `"${documentToDelete.fileName}" ලේඛනය ස්ථිරව ඉවත් කිරීමට අවශ්‍යද?` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentToDelete(null)}>අවලංගු කරන්න</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            ඉවත් කරන්න
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default DocumentsPage
