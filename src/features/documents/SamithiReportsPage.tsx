import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type ChangeEvent } from 'react'
import { useSnackbar } from 'notistack'

import { FULL_ACCESS_ROLES } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import { insertAuditLogRemote, insertSamithiReportRemote, refreshDataFromSupabase } from '../../services/supabaseMutations'
import type { SamithiReport } from '../../types/domain'

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read report file.'))
    reader.readAsDataURL(file)
  })

const SamithiReportsPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const reports = useAppSelector((state) => state.data.samithiReports)
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [description, setDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const canManageReports = auth.hasRole(FULL_ACCESS_ROLES)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      enqueueSnackbar('වාර්තා ගොනුව 10MB ඉක්මවා ඇත', { variant: 'error' })
      event.target.value = ''
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFileName(file.name)
      setFileUrl(dataUrl)
      enqueueSnackbar('වාර්තා ගොනුව තෝරා ගන්නා ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ගොනුව පූරණය කළ නොහැකි විය', { variant: 'error' })
    } finally {
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!currentUser || !title || !meetingDate || !fileName || !fileUrl) {
      enqueueSnackbar('අවශ්‍ය තොරතුරු සම්පූර්ණ කරන්න', { variant: 'warning' })
      return
    }
    if (!canManageReports) {
      enqueueSnackbar('සමිති වාර්තා සුරැකීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const report: SamithiReport = {
      id: crypto.randomUUID(),
      title,
      meetingDate,
      description,
      fileName,
      fileUrl,
      uploadedBy: currentUser.fullName,
      uploadedAt: new Date().toISOString(),
    }

    try {
      await insertSamithiReportRemote(report)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'UPLOAD_REPORT', 'SAMITHI_REPORT', report.id, 'සමිති වාර්තාව උඩුගත කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('සමිති වාර්තාව සුරකින ලදි', { variant: 'success' })
      setTitle('')
      setMeetingDate('')
      setDescription('')
      setFileName('')
      setFileUrl('')
    } catch {
      enqueueSnackbar('Supabase වෙත සමිති වාර්තාව සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          සමිති වාර්තා
        </Typography>
        <Typography color="text.secondary">
          මාසික රැස්වීම් වාර්තා, තීරණ, ගිණුම් සාරාංශ සහ PDF/පින්තූර ගොනු උඩුගත කර බලන්න.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField label="වාර්තා මාතෘකාව" value={title} onChange={(event) => setTitle(event.target.value)} />
                <TextField
                  label="රැස්වීම් දිනය"
                  type="date"
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="සටහන"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  multiline
                  minRows={3}
                />
                <Button component="label" variant="outlined" disabled={!canManageReports}>
                  වාර්තා ගොනුව තෝරන්න
                  <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  තෝරාගත් ගොනුව: {fileName || 'නොමැත'}
                </Typography>
                <Button variant="contained" onClick={handleSave} disabled={!canManageReports}>
                  වාර්තාව සුරකින්න
                </Button>
                {!canManageReports ? (
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
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
                  >
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{report.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.meetingDate} | {report.fileName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.description || 'විස්තර නැත'}
                      </Typography>
                    </Stack>
                    <Button
                      component="a"
                      href={report.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                    >
                      බලන්න
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default SamithiReportsPage
