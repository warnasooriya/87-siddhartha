import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import {
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'

import { FINANCE_ACCESS_ROLES } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import {
  insertAuditLogRemote,
  refreshDataFromSupabase,
  upsertMonthlyFeeConfigRemote,
  upsertMonthlyFeePaymentRemote,
} from '../../services/supabaseMutations'
import type { MonthlyFeeConfig, MonthlyFeePayment } from '../../types/domain'

const currentMonth = new Date().toISOString().slice(0, 7)

const FeesPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const { members, monthlyFeeConfigs, monthlyFeePayments } = useAppSelector((state) => state.data)
  const canManageFees = auth.hasRole(FINANCE_ACCESS_ROLES)

  const activeConfig = monthlyFeeConfigs.find((item) => item.isActive) ?? monthlyFeeConfigs[0] ?? null

  const [configTitle, setConfigTitle] = useState(activeConfig?.title ?? 'සාමාජික මාසික ගාස්තුව')
  const [configAmount, setConfigAmount] = useState(String(activeConfig?.amount ?? 250))
  const [dueDay, setDueDay] = useState(String(activeConfig?.dueDay ?? 10))
  const [effectiveMonth, setEffectiveMonth] = useState(activeConfig?.effectiveMonth ?? currentMonth)
  const [notes, setNotes] = useState(activeConfig?.notes ?? '')
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? '')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const paidMemberIds = useMemo(
    () =>
      new Set(
        monthlyFeePayments.filter((payment) => payment.feeMonth === selectedMonth && payment.status === 'PAID').map((payment) => payment.memberId),
      ),
    [monthlyFeePayments, selectedMonth],
  )

  const handleSaveConfig = async () => {
    if (!currentUser) {
      return
    }
    if (!canManageFees) {
      enqueueSnackbar('ගාස්තු සැකසුම් වෙනස් කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const config: MonthlyFeeConfig = {
      id: activeConfig?.id ?? crypto.randomUUID(),
      title: configTitle,
      amount: Number(configAmount),
      dueDay: Number(dueDay),
      effectiveMonth,
      notes,
      isActive: true,
    }

    try {
      await upsertMonthlyFeeConfigRemote(config)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'UPDATE_FEE_CONFIG', 'FEE_CONFIG', config.id, 'මාසික ගාස්තු සැකසුම යාවත්කාලීන කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('මාසික ගාස්තු සැකසුම සුරකින ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('Supabase වෙත ගාස්තු සැකසුම සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleCollectFee = async (memberId: string) => {
    if (!currentUser || !activeConfig) {
      enqueueSnackbar('ගාස්තු සැකසුමක් පළමුව සුරකින්න', { variant: 'warning' })
      return
    }
    if (!canManageFees) {
      enqueueSnackbar('මාසික ගාස්තු සටහන් කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const payment: MonthlyFeePayment = {
      id: crypto.randomUUID(),
      memberId,
      configId: activeConfig.id,
      feeMonth: selectedMonth,
      amount: activeConfig.amount,
      paidDate: new Date().toISOString(),
      status: 'PAID',
      collectedBy: currentUser.fullName,
      note: 'ගාස්තු ලබා ගන්නා ලදි',
    }

    try {
      await upsertMonthlyFeePaymentRemote(payment)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'COLLECT_FEE', 'FEE_PAYMENT', payment.id, 'මාසික ගාස්තුව ලබා ගන්නා ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('මාසික ගාස්තුව සටහන් කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('Supabase වෙත ගාස්තු ගෙවීම සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          මාසික ගාස්තු
        </Typography>
        <Typography color="text.secondary">
          ගාස්තු මුදල සැකසීම, අදාළ මාසය තෝරා ගැනීම සහ සාමාජික ගෙවීම් සටහන් කිරීම.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ගාස්තු සැකසුම
                </Typography>
                <TextField label="සැකසුම් නම" value={configTitle} onChange={(event) => setConfigTitle(event.target.value)} />
                <TextField label="මුදල" type="number" value={configAmount} onChange={(event) => setConfigAmount(event.target.value)} />
                <TextField label="ගෙවීම් අවසන් දිනය" type="number" value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
                <TextField
                  label="අදාළ මාසය"
                  type="month"
                  value={effectiveMonth}
                  onChange={(event) => setEffectiveMonth(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField label="සටහන්" value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={3} />
                <Button variant="contained" onClick={handleSaveConfig} disabled={!canManageFees}>
                  ගාස්තු සැකසුම සුරකින්න
                </Button>
                {!canManageFees ? (
                  <Typography variant="body2" color="text.secondary">
                    මෙම පිටුව ඔබට view only ආකාරයෙන් පෙන්වයි.
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    select
                    label="සාමාජිකයා"
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    fullWidth
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.fullName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="ගාස්තු මාසය"
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    startIcon={<PaidOutlinedIcon />}
                    onClick={() => handleCollectFee(selectedMemberId)}
                    disabled={!selectedMemberId || !canManageFees}
                  >
                    ගාස්තු ලබාගත් ලෙස සටහන් කරන්න
                  </Button>
                </Stack>

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedMonth} ගාස්තු තත්ත්වය
                </Typography>

                <Grid container spacing={2}>
                  {members.map((member) => {
                    const isPaid = paidMemberIds.has(member.id)
                    return (
                      <Grid key={member.id} size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <Stack spacing={0.5}>
                                <Typography sx={{ fontWeight: 700 }}>{member.fullName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {activeConfig ? `රු. ${activeConfig.amount}` : 'ගාස්තු සැකසුම නැත'}
                                </Typography>
                              </Stack>
                              <Button
                                variant={isPaid ? 'outlined' : 'contained'}
                                color={isPaid ? 'success' : 'primary'}
                                onClick={() => handleCollectFee(member.id)}
                                disabled={!canManageFees}
                              >
                                {isPaid ? 'ගෙවා ඇත' : 'ගාස්තු ලබාගන්න'}
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default FeesPage
