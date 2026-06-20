import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
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

import { StatCard } from '../../components/common/StatCard'
import { FINANCE_ACCESS_ROLES } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import { insertAuditLogRemote, insertFinanceEntryRemote, refreshDataFromSupabase } from '../../services/supabaseMutations'
import type { FinanceEntry, FinanceEntryType } from '../../types/domain'

const currentMonth = new Date().toISOString().slice(0, 7)

const formatCurrency = (value: number) => `රු. ${value.toLocaleString()}`

const FinancePage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const { financeEntries, monthlyFeePayments } = useAppSelector((state) => state.data)
  const canManageFinance = auth.hasRole(FINANCE_ACCESS_ROLES)

  const [entryType, setEntryType] = useState<FinanceEntryType>('OTHER_INCOME')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [receivedBy, setReceivedBy] = useState(currentUser?.fullName ?? '')

  const feeIncomeTotal = useMemo(
    () => monthlyFeePayments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0),
    [monthlyFeePayments],
  )
  const monthlyFeeIncome = useMemo(
    () =>
      monthlyFeePayments
        .filter((payment) => payment.status === 'PAID' && payment.feeMonth === currentMonth)
        .reduce((sum, payment) => sum + payment.amount, 0),
    [monthlyFeePayments],
  )
  const otherIncomeTotal = useMemo(
    () =>
      financeEntries
        .filter((entry) => entry.entryType === 'OTHER_INCOME')
        .reduce((sum, entry) => sum + entry.amount, 0),
    [financeEntries],
  )
  const expensesTotal = useMemo(
    () =>
      financeEntries
        .filter((entry) => entry.entryType === 'EXPENSE')
        .reduce((sum, entry) => sum + entry.amount, 0),
    [financeEntries],
  )
  const currentBalance = feeIncomeTotal + otherIncomeTotal - expensesTotal

  const handleSaveEntry = async () => {
    if (!currentUser || !title || !amount || !category || !entryDate) {
      enqueueSnackbar('අවශ්‍ය මූල්‍ය තොරතුරු සම්පූර්ණ කරන්න', { variant: 'warning' })
      return
    }
    if (!canManageFinance) {
      enqueueSnackbar('මූල්‍ය සටහන් සුරැකීමට ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    const entry: FinanceEntry = {
      id: crypto.randomUUID(),
      entryType,
      title,
      amount: Number(amount),
      entryDate,
      category,
      note,
      receivedBy: entryType === 'OTHER_INCOME' ? receivedBy || currentUser.fullName : undefined,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
    }

    try {
      await insertFinanceEntryRemote(entry)
      await insertAuditLogRemote(
        buildAuditEntry(
          currentUser.id,
          entryType === 'OTHER_INCOME' ? 'ADD_INCOME' : 'ADD_EXPENSE',
          'FINANCE_ENTRY',
          entry.id,
          entryType === 'OTHER_INCOME' ? 'වෙනත් ආදායමක් සටහන් කරන ලදි' : 'වියදමක් සටහන් කරන ලදි',
        ),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar(entryType === 'OTHER_INCOME' ? 'ආදායම සුරකින ලදි' : 'වියදම සුරකින ලදි', { variant: 'success' })
      setTitle('')
      setAmount('')
      setCategory('')
      setNote('')
    } catch {
      enqueueSnackbar('Supabase වෙත මූල්‍ය සටහන සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          මූල්‍ය කළමනාකරණය
        </Typography>
        <Typography color="text.secondary">
          මාසික ගාස්තු සමඟ වෙනත් ආදායම්, වියදම් සහ වත්මන් ගිණුම් ශේෂය එකම තැනක බලන්න.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මාසික ගාස්තු ලැබීම්" value={formatCurrency(monthlyFeeIncome)} caption={`${currentMonth} මාසය`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="වෙනත් ආදායම්" value={formatCurrency(otherIncomeTotal)} caption="සියලුම අනෙකුත් මුදල් ලැබීම්" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මුළු වියදම්" value={formatCurrency(expensesTotal)} caption="සියලුම වියදම් එකතුව" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="වත්මන් ශේෂය" value={formatCurrency(currentBalance)} caption="ගාස්තු + ආදායම් - වියදම්" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  මුදල් සටහනක් එක්කරන්න
                </Typography>
                <TextField
                  select
                  label="සටහන වර්ගය"
                  value={entryType}
                  onChange={(event) => setEntryType(event.target.value as FinanceEntryType)}
                >
                  <MenuItem value="OTHER_INCOME">වෙනත් ආදායම</MenuItem>
                  <MenuItem value="EXPENSE">වියදම</MenuItem>
                </TextField>
                <TextField label="මාතෘකාව" value={title} onChange={(event) => setTitle(event.target.value)} />
                <TextField label="මුදල" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <TextField
                  label="දිනය"
                  type="date"
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField label="වර්ගීකරණය" value={category} onChange={(event) => setCategory(event.target.value)} />
                {entryType === 'OTHER_INCOME' ? (
                  <TextField label="මුදල් ලබාදුන්/ලැබූ අය" value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
                ) : null}
                <TextField label="සටහන" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={3} />
                <Button
                  variant="contained"
                  startIcon={entryType === 'OTHER_INCOME' ? <TrendingUpOutlinedIcon /> : <TrendingDownOutlinedIcon />}
                  onClick={handleSaveEntry}
                  disabled={!canManageFinance}
                >
                  {entryType === 'OTHER_INCOME' ? 'ආදායම සුරකින්න' : 'වියදම සුරකින්න'}
                </Button>
                {!canManageFinance ? (
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  මූල්‍ය සටහන්
                </Typography>
                {financeEntries.map((entry) => (
                  <Card key={entry.id} variant="outlined">
                    <CardContent>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
                      >
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontWeight: 700 }}>{entry.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.entryDate} | {entry.category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.note || 'සටහනක් නොමැත'}
                          </Typography>
                        </Stack>
                        <Stack spacing={0.5} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              color: entry.entryType === 'OTHER_INCOME' ? 'success.main' : 'error.main',
                            }}
                          >
                            {entry.entryType === 'OTHER_INCOME' ? '+' : '-'} {formatCurrency(entry.amount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.entryType === 'OTHER_INCOME'
                              ? `ලැබූවේ: ${entry.receivedBy ?? entry.createdBy}`
                              : `සටහන් කළේ: ${entry.createdBy}`}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default FinancePage
