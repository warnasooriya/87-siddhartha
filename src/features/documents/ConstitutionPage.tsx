import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Button, Card, CardContent, Divider, Grid, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState, type ChangeEvent } from 'react'
import { useSnackbar } from 'notistack'

import { CONSTITUTION_MANAGE_ROLES } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { insertAuditLogRemote, insertSamithiConstitutionRemote, refreshDataFromSupabase } from '../../services/supabaseMutations'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import type { SamithiConstitution } from '../../types/domain'

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read constitution file.'))
    reader.readAsDataURL(file)
  })

const buildBlobFromDataUrl = (dataUrl: string) => {
  const [metadata, base64Content] = dataUrl.split(',')
  const mimeTypeMatch = metadata.match(/data:(.*?);base64/)
  const mimeType = mimeTypeMatch?.[1] ?? 'application/octet-stream'
  const binary = window.atob(base64Content)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

const ConstitutionPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const constitutions = useAppSelector((state) => state.data.samithiConstitutions)
  const canManageConstitution = auth.hasRole(CONSTITUTION_MANAGE_ROLES)
  const [title, setTitle] = useState('87 සිද්ධාර්ථ සමිතියේ ව්‍යවස්ථාව')
  const [versionLabel, setVersionLabel] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [description, setDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  const latestConstitution = useMemo(() => constitutions[0], [constitutions])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      enqueueSnackbar('ව්‍යවස්ථා ගොනුව 10MB ඉක්මවා ඇත', { variant: 'error' })
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFileName(file.name)
      setFileUrl(dataUrl)
      enqueueSnackbar('ව්‍යවස්ථා ගොනුව තෝරා ගන්නා ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ගොනුව පූරණය කළ නොහැකි විය', { variant: 'error' })
    } finally {
      event.target.value = ''
    }
  }

  const handleViewConstitution = (constitution: SamithiConstitution) => {
    if (!constitution.fileUrl || constitution.fileUrl === '#') {
      enqueueSnackbar('මෙම ව්‍යවස්ථා වාර්තාව සඳහා ගොනුවක් නොමැත', { variant: 'warning' })
      return
    }

    try {
      if (constitution.fileUrl.startsWith('data:')) {
        const objectUrl = URL.createObjectURL(buildBlobFromDataUrl(constitution.fileUrl))
        window.open(objectUrl, '_blank', 'noopener,noreferrer')
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
        return
      }

      window.open(constitution.fileUrl, '_blank', 'noopener,noreferrer')
    } catch {
      enqueueSnackbar('ව්‍යවස්ථා ගොනුව විවෘත කිරීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleSave = async () => {
    if (!currentUser || !title || !versionLabel || !effectiveDate || !fileName || !fileUrl) {
      enqueueSnackbar('අවශ්‍ය තොරතුරු සම්පූර්ණ කරන්න', { variant: 'warning' })
      return
    }

    if (!canManageConstitution) {
      enqueueSnackbar('ව්‍යවස්ථාව යාවත්කාලීන කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const constitution: SamithiConstitution = {
      id: crypto.randomUUID(),
      title,
      versionLabel,
      effectiveDate,
      description,
      fileName,
      fileUrl,
      uploadedBy: currentUser.fullName,
      uploadedAt: new Date().toISOString(),
    }

    try {
      await insertSamithiConstitutionRemote(constitution)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'UPLOAD_CONSTITUTION', 'SAMITHI_CONSTITUTION', constitution.id, 'සමිති ව්‍යවස්ථාව යාවත්කාලීන කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('ව්‍යවස්ථාව සාර්ථකව සුරකින ලදි', { variant: 'success' })
      setVersionLabel('')
      setEffectiveDate('')
      setDescription('')
      setFileName('')
      setFileUrl('')
    } catch {
      enqueueSnackbar('Supabase වෙත ව්‍යවස්ථාව සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          සමිති ව්‍යවස්ථාව
        </Typography>
        <Typography color="text.secondary">
          සමිතියේ ව්‍යවස්ථාවේ නව සංස්කරණ සුරකින්න, පෙර සංස්කරණ පරීක්ෂා කරන්න, සහ සියලු පරිශීලකයන්ට කියවීමට සලසන්න.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700 }}>ව්‍යවස්ථා යාවත්කාලීනය</Typography>
                <TextField label="මාතෘකාව" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
                <TextField
                  label="සංස්කරණ අංකය"
                  placeholder="උදා: v1.0 / 2026 සංස්කරණය"
                  value={versionLabel}
                  onChange={(event) => setVersionLabel(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="බලපැවැත්වෙන දිනය"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
                <TextField
                  label="සංශෝධන සටහන"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
                <Button component="label" variant="outlined" startIcon={<FileUploadOutlinedIcon />} disabled={!canManageConstitution}>
                  ව්‍යවස්ථා ගොනුව තෝරන්න
                  <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  තෝරාගත් ගොනුව: {fileName || 'නොමැත'}
                </Typography>
                <Button variant="contained" onClick={handleSave} disabled={!canManageConstitution}>
                  ව්‍යවස්ථා සංස්කරණය සුරකින්න
                </Button>
                <Typography variant="body2" color="text.secondary">
                  යාවත්කාලීන කළ හැක්කේ පරිපාලක සහ ලේකම් පමණි.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <GavelOutlinedIcon color="primary" />
                    <Typography sx={{ fontWeight: 700 }}>දැනට ක්‍රියාත්මක සංස්කරණය</Typography>
                  </Stack>
                  {latestConstitution ? (
                    <Stack spacing={1.5}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {latestConstitution.title}
                      </Typography>
                      <Typography color="text.secondary">
                        {latestConstitution.versionLabel} | {latestConstitution.effectiveDate}
                      </Typography>
                      <Typography color="text.secondary">{latestConstitution.description || 'සංශෝධන සටහන නොමැත'}</Typography>
                      <Typography color="text.secondary">
                        {latestConstitution.fileName} | {latestConstitution.uploadedBy}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => handleViewConstitution(latestConstitution)}>
                          බලන්න
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">තවම ව්‍යවස්ථා සංස්කරණයක් සුරකින ලදී නොමැත.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <HistoryEduOutlinedIcon color="primary" />
                    <Typography sx={{ fontWeight: 700 }}>සංස්කරණ ඉතිහාසය</Typography>
                  </Stack>
                  {constitutions.length > 0 ? (
                    constitutions.map((constitution, index) => (
                      <Stack key={constitution.id} spacing={1.5}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
                        >
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontWeight: 700 }}>{constitution.versionLabel}</Typography>
                            <Typography color="text.secondary">
                              {constitution.effectiveDate} | {constitution.fileName}
                            </Typography>
                            <Typography color="text.secondary">{constitution.description || 'සංශෝධන සටහන නොමැත'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {constitution.uploadedBy} | {constitution.uploadedAt}
                            </Typography>
                          </Stack>
                          <Button variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => handleViewConstitution(constitution)}>
                            බලන්න
                          </Button>
                        </Stack>
                        {index < constitutions.length - 1 ? <Divider /> : null}
                      </Stack>
                    ))
                  ) : (
                    <Typography color="text.secondary">සංස්කරණ ඉතිහාසය තවම නොමැත.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default ConstitutionPage
