import { useMemo } from 'react'
import { Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

import { StatCard } from '../../components/common/StatCard'
import { useAppSelector } from '../../store'
import { buildMonthlyFeeSummaryMap, sumCollectedMonthlyFees } from '../../utils/monthlyFees'

const DashboardPage = () => {
  const { members, auditLogs, financeEntries, monthlyFeeConfigs, monthlyFeePayments, samithiReports } = useAppSelector(
    (state) => state.data,
  )

  const totalFamilies = members.reduce((sum, member) => sum + member.familyMembers.length, 0)
  const currentMonthLabel = new Date().toISOString().slice(0, 7)
  const birthdaysThisMonth =
    members.filter((member) => new Date(member.dateOfBirth).getMonth() === new Date().getMonth()).length +
    members.reduce(
      (count, member) =>
        count + member.familyMembers.filter((familyMember) => new Date(familyMember.dateOfBirth).getMonth() === new Date().getMonth()).length,
      0,
    )
  const activeFeeConfig = monthlyFeeConfigs.find((item) => item.isActive)
  const monthSummaryMap = useMemo(
    () => buildMonthlyFeeSummaryMap(monthlyFeePayments, currentMonthLabel, activeFeeConfig?.amount ?? 0),
    [activeFeeConfig?.amount, currentMonthLabel, monthlyFeePayments],
  )
  const paidMembersThisMonth = useMemo(
    () => members.filter((member) => (monthSummaryMap.get(member.id)?.status ?? 'UNPAID') === 'PAID').length,
    [members, monthSummaryMap],
  )
  const partiallyPaidMembersThisMonth = useMemo(
    () => members.filter((member) => (monthSummaryMap.get(member.id)?.status ?? 'UNPAID') === 'PARTIAL').length,
    [members, monthSummaryMap],
  )
  const collectedMembersThisMonth = useMemo(
    () => paidMembersThisMonth + partiallyPaidMembersThisMonth,
    [paidMembersThisMonth, partiallyPaidMembersThisMonth],
  )
  const monthlyFeeIncome = useMemo(
    () => sumCollectedMonthlyFees(monthlyFeePayments, currentMonthLabel),
    [currentMonthLabel, monthlyFeePayments],
  )
  const otherIncomeTotal = financeEntries
    .filter((item) => item.entryType === 'OTHER_INCOME')
    .reduce((sum, item) => sum + item.amount, 0)
  const expensesTotal = financeEntries
    .filter((item) => item.entryType === 'EXPENSE')
    .reduce((sum, item) => sum + item.amount, 0)
  const totalFeeIncome = useMemo(() => sumCollectedMonthlyFees(monthlyFeePayments), [monthlyFeePayments])
  const currentBalance = totalFeeIncome + otherIncomeTotal - expensesTotal

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මුළු සාමාජිකයන්" value={members.length} caption="ප්‍රධාන සාමාජික වාර්තා" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="පවුල් වාර්තා" value={totalFamilies} caption="සම්බන්ධතා හා දරුවන් ඇතුළුව" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මාසික ගාස්තු" value={activeFeeConfig ? `රු. ${activeFeeConfig.amount}` : 'නැත'} caption="දැනට සක්‍රීය ගාස්තු සැකසුම" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මෙම මාසයේ උපන්දිනයන්" value={birthdaysThisMonth} caption="සාමාජික සහ පවුල් උපන්දිනයන්" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="ගාස්තු ලැබීම්" value={`රු. ${monthlyFeeIncome.toLocaleString()}`} caption={`${currentMonthLabel} මාසික සාමාජික ගාස්තු`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="වෙනත් ආදායම්" value={`රු. ${otherIncomeTotal.toLocaleString()}`} caption="පරිත්‍යාග සහ වෙනත් ලැබීම්" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="මුළු වියදම්" value={`රු. ${expensesTotal.toLocaleString()}`} caption="සියලුම වියදම් එකතුව" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <StatCard title="වත්මන් ශේෂය" value={`රු. ${currentBalance.toLocaleString()}`} caption="ගිණුමේ පවතින ශේෂය" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                සමිති වාර්තා
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>උඩුගත කළ වාර්තා</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{samithiReports.length}</Typography>
                </Stack>
                <Typography color="text.secondary">
                  රැස්වීම් සටහන්, ගිණුම් සාරාංශ සහ සමිති ලේඛන එකම තැනක තබාගන්න.
                </Typography>
                <Button component={RouterLink} to="/samithi-reports" variant="outlined">
                  සමිති වාර්තා බලන්න
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                මූල්‍ය උපකරණ පුවරුව
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>{currentMonthLabel} ගාස්තු ගෙවීම් සටහන් වූ සාමාජිකයන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{collectedMembersThisMonth}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>සම්පූර්ණ ගෙවූ සාමාජිකයන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{paidMembersThisMonth}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>කොටස් ගෙවීම් කළ සාමාජිකයන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{partiallyPaidMembersThisMonth}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>වෙනත් ආදායම් සටහන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {financeEntries.filter((item) => item.entryType === 'OTHER_INCOME').length}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>වියදම් සටහන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {financeEntries.filter((item) => item.entryType === 'EXPENSE').length}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>විගණන සටහන්</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{auditLogs.length}</Typography>
                </Stack>
                <Button component={RouterLink} to="/finance" variant="outlined">
                  මූල්‍ය පිටුවට යන්න
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default DashboardPage
