import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useSnackbar } from 'notistack'

import { ROLE_LABELS } from '../constants/roles'
import { useAppDispatch, useAppSelector } from '../store'
import { refreshDataFromSupabase, updateSettingsRemote } from '../services/supabaseMutations'

const SettingsPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const settings = useAppSelector((state) => state.data.settings)
  const users = useAppSelector((state) => state.data.users)
  const [draft, setDraft] = useState(() =>
    settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.settingKey] = setting.settingValue
      return acc
    }, {}),
  )

  const handleSave = async () => {
    try {
      await updateSettingsRemote(
        settings.map((setting) => ({
          ...setting,
          settingValue: draft[setting.settingKey] ?? '',
        })),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('සැකසුම් යාවත්කාලීන කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('Supabase වෙත සැකසුම් සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          පද්ධති සැකසුම්
        </Typography>
        <Typography color="text.secondary">
          SendGrid, reminder schedule, sender profile සහ භූමිකාවන් මෙතැනින් කළමනාකරණය කරන්න.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Sender Email"
                  value={draft.sender_email ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, sender_email: event.target.value }))}
                />
                <TextField
                  label="Sender Name"
                  value={draft.sender_name ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, sender_name: event.target.value }))}
                />
                <TextField
                  label="Reminder Schedule"
                  value={draft.reminder_schedule ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, reminder_schedule: event.target.value }))
                  }
                  helperText="උදා: 30,14,7,3,1,0"
                />
                <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={handleSave}>
                  සැකසුම් සුරකින්න
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  පද්ධති පරිශීලකයන්
                </Typography>
                {users.map((user) => (
                  <Stack key={user.id} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>{user.fullName}</Typography>
                    <Typography color="text.secondary">{ROLE_LABELS[user.role]}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default SettingsPage
