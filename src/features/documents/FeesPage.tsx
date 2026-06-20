import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
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
import { buildMonthlyFeeSummaryMap, getMonthlyFeeMemberSummary } from '../../utils/monthlyFees'

const currentMonth = new Date().toISOString().slice(0, 7)
const formatCurrency = (value: number) => `රු. ${value.toLocaleString()}`

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
  const [paymentAmount, setPaymentAmount] = useState('')

  const requiredAmount = activeConfig?.amount ?? 0
  const feeSummaryMap = useMemo(
    () => buildMonthlyFeeSummaryMap(monthlyFeePayments, selectedMonth, requiredAmount),
    [monthlyFeePayments, requiredAmount, selectedMonth],
  )
  const selectedMember = members.find((member) => member.id === selectedMemberId)
  const selectedMemberSummary = useMemo(
    () =>
      selectedMemberId
        ? feeSummaryMap.get(selectedMemberId) ??
          getMonthlyFeeMemberSummary(monthlyFeePayments, selectedMemberId, selectedMonth, requiredAmount)
        : null,
    [feeSummaryMap, monthlyFeePayments, requiredAmount, selectedMemberId, selectedMonth],
  )

  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0].id)
    }
  }, [members, selectedMemberId])

  useEffect(() => {
    if (!activeConfig || !selectedMemberId) {
      setPaymentAmount('')
      return
    }

    if ((selectedMemberSummary?.remainingBalance ?? 0) > 0) {
      setPaymentAmount(String(selectedMemberSummary?.remainingBalance ?? activeConfig.amount))
      return
    }

    setPaymentAmount('')
  }, [activeConfig, selectedMemberId, selectedMemberSummary?.remainingBalance])

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

  const handleCollectFee = async (memberId: string, amountToCollect = Number(paymentAmount)) => {
    if (!currentUser || !activeConfig) {
      enqueueSnackbar('ගාස්තු සැකසුමක් පළමුව සුරකින්න', { variant: 'warning' })
      return
    }
    if (!canManageFees) {
      enqueueSnackbar('මාසික ගාස්තු සටහන් කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const memberSummary =
      feeSummaryMap.get(memberId) ?? getMonthlyFeeMemberSummary(monthlyFeePayments, memberId, selectedMonth, activeConfig.amount)
    if (memberSummary.remainingBalance <= 0) {
      enqueueSnackbar('මෙම මාසයට ගාස්තුව දැනටමත් සම්පූර්ණයෙන් ගෙවා ඇත', { variant: 'info' })
      return
    }

    const requestedAmount = amountToCollect
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      enqueueSnackbar('ගෙවූ මුදල නිවැරදිව ඇතුළත් කරන්න', { variant: 'warning' })
      return
    }

    if (requestedAmount > memberSummary.remainingBalance) {
      enqueueSnackbar(`ඉතිරි ශේෂය ${formatCurrency(memberSummary.remainingBalance)} ක් පමණි`, { variant: 'warning' })
      return
    }

    const nextPaidTotal = memberSummary.paidTotal + requestedAmount
    const paymentStatus: MonthlyFeePayment['status'] = nextPaidTotal >= activeConfig.amount ? 'PAID' : 'PARTIAL'
    const payment: MonthlyFeePayment = {
      id: crypto.randomUUID(),
      memberId,
      configId: activeConfig.id,
      feeMonth: selectedMonth,
      amount: Number(requestedAmount.toFixed(2)),
      paidDate: new Date().toISOString(),
      status: paymentStatus,
      collectedBy: currentUser.fullName,
      note:
        paymentStatus === 'PAID'
          ? memberSummary.paidTotal > 0
            ? 'හිඟ ගාස්තු ශේෂය ලබා ගන්නා ලදි'
            : 'මාසික ගාස්තුව සම්පූර්ණයෙන් ලබා ගන්නා ලදි'
          : 'මාසික ගාස්තුව කොටස් වශයෙන් ලබා ගන්නා ලදි',
    }

    try {
      await upsertMonthlyFeePaymentRemote(payment)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'COLLECT_FEE', 'FEE_PAYMENT', payment.id, 'මාසික ගාස්තුව ලබා ගන්නා ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar(
        paymentStatus === 'PAID'
          ? 'මාසික ගාස්තුව සම්පූර්ණ ගෙවීමක් ලෙස සටහන් කරන ලදි'
          : 'මාසික ගාස්තුව කොටස් ගෙවීමක් ලෙස සටහන් කරන ලදි',
        { variant: 'success' },
      )
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
          ගාස්තු මුදල සැකසීම, අදාළ මාසය තෝරා ගැනීම සහ කොටස් වශයෙන් හෝ සම්පූර්ණ ගෙවීම් සටහන් කිරීම.
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
                  <TextField
                    label="ගෙවූ මුදල"
                    type="number"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    fullWidth
                    disabled={!activeConfig || !selectedMemberId || (selectedMemberSummary?.remainingBalance ?? 0) <= 0}
                  />
                  <Button
                    variant="contained"
                    startIcon={<PaidOutlinedIcon />}
                    onClick={() => handleCollectFee(selectedMemberId)}
                    disabled={
                      !selectedMemberId ||
                      !canManageFees ||
                      !activeConfig ||
                      (selectedMemberSummary?.remainingBalance ?? 0) <= 0
                    }
                  >
                    {selectedMemberSummary?.status === 'PARTIAL' ? 'ශේෂ ගෙවීම සටහන් කරන්න' : 'ගෙවීම සටහන් කරන්න'}
                  </Button>
                </Stack>

                {activeConfig && selectedMember ? (
                  <Alert severity={selectedMemberSummary?.status === 'PAID' ? 'success' : selectedMemberSummary?.status === 'PARTIAL' ? 'warning' : 'info'}>
                    {`${selectedMember.fullName} සඳහා අනිවාර්ය ගාස්තුව ${formatCurrency(activeConfig.amount)} යි. ගෙවා ඇති මුදල ${formatCurrency(
                      selectedMemberSummary?.paidTotal ?? 0,
                    )} | ඉතිරි ශේෂය ${formatCurrency(selectedMemberSummary?.remainingBalance ?? activeConfig.amount)}`}
                  </Alert>
                ) : null}

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedMonth} ගාස්තු තත්ත්වය
                </Typography>

                <Grid container spacing={2}>
                  {members.map((member) => {
                    const memberSummary =
                      feeSummaryMap.get(member.id) ??
                      getMonthlyFeeMemberSummary(monthlyFeePayments, member.id, selectedMonth, requiredAmount)
                    const chipColor =
                      memberSummary.status === 'PAID' ? 'success' : memberSummary.status === 'PARTIAL' ? 'warning' : 'default'
                    const actionColor =
                      memberSummary.status === 'PAID' ? 'success' : memberSummary.status === 'PARTIAL' ? 'warning' : 'primary'
                    return (
                      <Grid key={member.id} size={{ xs: 12, md: 6 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography sx={{ fontWeight: 700 }}>{member.fullName}</Typography>
                                <Chip
                                  label={
                                    memberSummary.status === 'PAID'
                                      ? 'සම්පූර්ණයි'
                                      : memberSummary.status === 'PARTIAL'
                                        ? 'කොටස් ගෙවීම'
                                        : 'තවම ගෙවා නැත'
                                  }
                                  color={chipColor}
                                  variant={memberSummary.status === 'PAID' ? 'filled' : 'outlined'}
                                  size="small"
                                />
                              </Stack>
                              <Stack spacing={0.5}>
                                <Typography variant="body2" color="text.secondary">
                                  {activeConfig ? `අනිවාර්ය ගාස්තුව ${formatCurrency(activeConfig.amount)}` : 'ගාස්තු සැකසුම නැත'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {`ගෙවා ඇත ${formatCurrency(memberSummary.paidTotal)} | ශේෂය ${formatCurrency(memberSummary.remainingBalance)}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {`ගෙවීම් වාර ${memberSummary.paymentCount}${memberSummary.lastPaidDate ? ` | අවසන් ගෙවීම ${new Date(memberSummary.lastPaidDate).toLocaleDateString()}` : ''}`}
                                </Typography>
                              </Stack>
                              <Button
                                variant={memberSummary.status === 'PAID' ? 'outlined' : 'contained'}
                                color={actionColor}
                                onClick={() => {
                                  setSelectedMemberId(member.id)
                                  setPaymentAmount(String(memberSummary.remainingBalance))
                                  handleCollectFee(member.id, memberSummary.remainingBalance)
                                }}
                                disabled={!canManageFees || memberSummary.remainingBalance <= 0}
                              >
                                {memberSummary.status === 'PAID'
                                  ? 'ගෙවා ඇත'
                                  : memberSummary.status === 'PARTIAL'
                                    ? 'ශේෂය ලබාගන්න'
                                    : 'සම්පූර්ණ ගාස්තුව ලබාගන්න'}
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
