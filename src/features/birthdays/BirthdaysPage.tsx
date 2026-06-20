import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState, type ReactNode } from 'react'

import { useAppSelector } from '../../store'
import type { BirthdayReminderEntry } from '../../types/domain'

const parseBirthday = (birthday: string) => {
  const parsed = new Date(birthday)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const calculateAge = (birthday: string) => {
  const birthDate = parseBirthday(birthday)
  if (!birthDate) {
    return 0
  }

  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }
  return age
}

const daysUntil = (birthday: string) => {
  const parsedBirthday = parseBirthday(birthday)
  if (!parsedBirthday) {
    return Number.POSITIVE_INFINITY
  }

  const today = new Date()
  const upcoming = new Date(parsedBirthday)
  upcoming.setFullYear(today.getFullYear())
  if (upcoming < today) {
    upcoming.setFullYear(today.getFullYear() + 1)
  }

  return Math.ceil((upcoming.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const getMonthDayKey = (birthday: string) => {
  const date = parseBirthday(birthday)
  if (!date) {
    return ''
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}-${day}`
}

const formatMonthName = (monthIndex: number) =>
  new Intl.DateTimeFormat('si-LK', { month: 'long' }).format(new Date(2026, monthIndex, 1))

const formatBirthdayDate = (birthday: string) =>
  new Intl.DateTimeFormat('si-LK', { month: 'short', day: 'numeric' }).format(parseBirthday(birthday) ?? new Date())

const getCountdownLabel = (birthday: string) => {
  const distance = daysUntil(birthday)
  if (distance === 0) {
    return 'අද'
  }
  if (distance === 1) {
    return 'හෙට'
  }
  return `තවත් දින ${distance}`
}

const getFirstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const weekdayLabels = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා']
const monthLabels = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: monthIndex,
  label: formatMonthName(monthIndex),
}))

const getBirthdayOwnerLabel = (entry: BirthdayReminderEntry, memberNameMap: Map<string, string>) => {
  if (entry.relationship === 'සාමාජිකයා') {
    return 'ප්‍රධාන සාමාජිකයා'
  }

  return memberNameMap.get(entry.memberId)
    ? `${memberNameMap.get(entry.memberId)}ගේ පවුල`
    : 'පවුල් සාමාජිකයා'
}

const BirthdaysPage = () => {
  const members = useAppSelector((state) => state.data.members)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedEntry, setSelectedEntry] = useState<BirthdayReminderEntry | null>(null)
  const memberNameMap = new Map(members.map((member) => [member.id, member.fullName]))

  const entries: BirthdayReminderEntry[] = members
    .flatMap((member) => [
      {
        id: member.id,
        name: member.fullName,
        relationship: 'සාමාජිකයා',
        age: calculateAge(member.dateOfBirth),
        address: member.address,
        birthday: member.dateOfBirth,
        photoUrl: member.photoUrl,
        memberId: member.id,
      },
      ...member.familyMembers.map((familyMember) => ({
        id: familyMember.id,
        name: familyMember.fullName,
        relationship: familyMember.relationshipType,
        age: calculateAge(familyMember.dateOfBirth),
        address: familyMember.address,
        birthday: familyMember.dateOfBirth,
        photoUrl: familyMember.photoUrl,
        memberId: member.id,
      })),
    ])
    .filter((entry) => parseBirthday(entry.birthday))
    .sort((left, right) => daysUntil(left.birthday) - daysUntil(right.birthday))

  const todaysBirthdays = entries.filter((entry) => daysUntil(entry.birthday) === 0)
  const upcomingSevenDays = entries.filter((entry) => daysUntil(entry.birthday) > 0 && daysUntil(entry.birthday) <= 7)
  const monthEntries = entries
    .filter((entry) => parseBirthday(entry.birthday)?.getMonth() === selectedMonth)
    .sort((left, right) => {
      const leftDate = parseBirthday(left.birthday)
      const rightDate = parseBirthday(right.birthday)
      return (leftDate?.getDate() ?? 0) - (rightDate?.getDate() ?? 0)
    })
  const thisMonthEntries = entries.filter((entry) => parseBirthday(entry.birthday)?.getMonth() === new Date().getMonth())
  const upcomingHighlights = entries.slice(0, 8)
  const monthEntryMap = new Map<string, BirthdayReminderEntry[]>()

  monthEntries.forEach((entry) => {
    const key = getMonthDayKey(entry.birthday)
    monthEntryMap.set(key, [...(monthEntryMap.get(key) ?? []), entry])
  })

  const mobileAgendaDays = Array.from(monthEntryMap.entries())
    .map(([key, dayEntries]) => ({
      key,
      dayEntries,
      dayNumber: Number.parseInt(key.split('-')[1] ?? '0', 10),
    }))
    .sort((left, right) => left.dayNumber - right.dayNumber)

  const calendarDays = (() => {
    const year = new Date().getFullYear()
    const firstDay = new Date(year, selectedMonth, 1)
    const lastDay = new Date(year, selectedMonth + 1, 0)
    const leadingEmptyDays = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const cells: Array<{ dayNumber?: number; entries: BirthdayReminderEntry[] }> = []

    for (let index = 0; index < leadingEmptyDays; index += 1) {
      cells.push({ entries: [] })
    }

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      const key = `${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
      cells.push({
        dayNumber,
        entries: monthEntryMap.get(key) ?? [],
      })
    }

    return cells
  })()

  const selectedMonthToday = new Date().getMonth() === selectedMonth ? new Date().getDate() : -1
  const selectedMemberRecord = selectedEntry ? members.find((member) => member.id === selectedEntry.memberId) ?? null : null
  const selectedFamilyRecord =
    selectedEntry && selectedEntry.relationship !== 'සාමාජිකයා' && selectedMemberRecord
      ? selectedMemberRecord.familyMembers.find((familyMember) => familyMember.id === selectedEntry.id) ?? null
      : null

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          උපන්දිනයන් දෘශ්‍යකරණය
        </Typography>
        
      </Stack>

      <Card
        sx={{
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}22 0%, ${theme.palette.secondary.light}22 100%)`,
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack spacing={0.75}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {formatMonthName(selectedMonth)} උපන්දිනයන්
                </Typography>
                 
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip color="primary" label={`මෙම මාසය ${monthEntries.length}`} />
                <Chip color="warning" label={`ඉදිරි 7 දින ${upcomingSevenDays.length}`} />
                <Chip color="success" label={`අද ${todaysBirthdays.length}`} />
              </Stack>
            </Stack>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                pb: 0.5,
                scrollbarWidth: 'thin',
              }}
            >
              {monthLabels.map((month) => (
                <Chip
                  key={month.value}
                  label={month.label}
                  color={month.value === selectedMonth ? 'primary' : 'default'}
                  variant={month.value === selectedMonth ? 'filled' : 'outlined'}
                  onClick={() => setSelectedMonth(month.value)}
                  sx={{ flexShrink: 0, fontWeight: month.value === selectedMonth ? 700 : 500 }}
                />
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="අද උපන්දිනයන්"
            value={todaysBirthdays.length}
            caption="අද දිනයේ සැමරුම්"
            icon={<CelebrationOutlinedIcon color="success" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="ඉදිරි දින 7"
            value={upcomingSevenDays.length}
            caption="සූදානම් විය යුතු උපන්දිනයන්"
            icon={<EventAvailableOutlinedIcon color="warning" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="මෙම මාසය"
            value={thisMonthEntries.length}
            caption="මෙම මාසයේ සියලුම වාර්තා"
            icon={<CalendarMonthOutlinedIcon color="primary" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {isMobile ? 'මාසික උපන්දිනය ලැයිස්තුව' : 'මාසික උපන්දිනය දිනදර්ශනය'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isMobile
                        ? `${formatMonthName(selectedMonth)} මාසයේ උපන්දිනයන් දිනය අනුව පහසුවෙන් බලන්න.`
                        : `${formatMonthName(selectedMonth)} මාසයේ උපන්දිනයන් දින අනුව බලන්න.`}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton color="primary" onClick={() => setSelectedMonth((current) => (current === 0 ? 11 : current - 1))}>
                      <ChevronLeftOutlinedIcon />
                    </IconButton>
                    <Chip label={formatMonthName(selectedMonth)} color="primary" sx={{ minWidth: 120 }} />
                    <IconButton color="primary" onClick={() => setSelectedMonth((current) => (current === 11 ? 0 : current + 1))}>
                      <ChevronRightOutlinedIcon />
                    </IconButton>
                  </Stack>
                </Stack>

                {isMobile ? (
                  <Stack spacing={1.5}>
                    {mobileAgendaDays.length === 0 ? (
                      <Box
                        sx={{
                          borderRadius: 3,
                          border: `1px dashed ${theme.palette.divider}`,
                          px: 2,
                          py: 4,
                          textAlign: 'center',
                        }}
                      >
                        <Typography color="text.secondary">මෙම මාසය සඳහා උපන්දිනයන් නොමැත.</Typography>
                      </Box>
                    ) : (
                      mobileAgendaDays.map((group) => (
                        <Card
                          key={group.key}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            borderColor: group.dayNumber === selectedMonthToday ? 'success.main' : 'divider',
                          }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            <Stack spacing={1.25}>
                              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Stack spacing={0.25}>
                                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                    {group.dayNumber}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatMonthName(selectedMonth)}
                                  </Typography>
                                </Stack>
                                <Chip
                                  size="small"
                                  color={group.dayNumber === selectedMonthToday ? 'success' : 'primary'}
                                  label={`${group.dayEntries.length} දෙනෙක්`}
                                />
                              </Stack>

                              {group.dayEntries.map((entry) => (
                                <Stack
                                  key={entry.id}
                                  direction="row"
                                  spacing={1.25}
                                  onClick={() => setSelectedEntry(entry)}
                                  sx={{
                                    alignItems: 'center',
                                    borderRadius: 2,
                                    bgcolor: 'action.hover',
                                    px: 1.25,
                                    py: 1,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Avatar src={entry.photoUrl} sx={{ width: 42, height: 42 }}>
                                    <CakeOutlinedIcon />
                                  </Avatar>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontWeight: 700 }} noWrap>
                                      {getFirstName(entry.name)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                      {entry.relationship}
                                    </Typography>
                                  </Box>
                                  <Chip size="small" variant="outlined" label={getCountdownLabel(entry.birthday)} />
                                </Stack>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Stack>
                ) : (
                  <>
                    <Grid container spacing={1}>
                      {weekdayLabels.map((label) => (
                        <Grid key={label} size={{ xs: 12 / 7 }}>
                          <Box
                            sx={{
                              borderRadius: 2,
                              bgcolor: 'action.hover',
                              px: 1,
                              py: 1.25,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              {label}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    <Grid container spacing={1}>
                      {calendarDays.map((cell, index) => {
                        const isToday = cell.dayNumber === selectedMonthToday
                        return (
                          <Grid key={`${cell.dayNumber ?? 'empty'}-${index}`} size={{ xs: 12, sm: 6, md: 12 / 7 }}>
                            <Card
                              variant="outlined"
                              sx={{
                                height: '100%',
                                minHeight: 164,
                                borderRadius: 3,
                                bgcolor: isToday ? 'success.light' : undefined,
                                borderColor: isToday ? 'success.main' : 'divider',
                                boxShadow: cell.entries.length > 0 ? 1 : 0,
                              }}
                            >
                              <CardContent sx={{ p: 1.5 }}>
                                {cell.dayNumber ? (
                                  <Stack spacing={1}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography sx={{ fontWeight: 700 }}>{cell.dayNumber}</Typography>
                                      {cell.entries.length > 0 ? (
                                        <Chip size="small" color={isToday ? 'success' : 'primary'} label={cell.entries.length} />
                                      ) : null}
                                    </Stack>
                                    {cell.entries.length === 0 ? (
                                      <Typography variant="caption" color="text.secondary">
                                        වාර්තා නොමැත
                                      </Typography>
                                    ) : (
                                      cell.entries.slice(0, 3).map((entry) => (
                                        <Stack
                                          key={entry.id}
                                          direction="row"
                                          spacing={1}
                                          onClick={() => setSelectedEntry(entry)}
                                          sx={{
                                            alignItems: 'center',
                                            borderRadius: 2,
                                            bgcolor: 'action.hover',
                                            px: 1,
                                            py: 0.75,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <Avatar src={entry.photoUrl} sx={{ width: 30, height: 30 }}>
                                            <CakeOutlinedIcon sx={{ fontSize: 16 }} />
                                          </Avatar>
                                          <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
                                              {getFirstName(entry.name)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                              {entry.relationship}
                                            </Typography>
                                          </Box>
                                        </Stack>
                                      ))
                                    )}
                                    {cell.entries.length > 3 ? (
                                      <Typography variant="caption" color="text.secondary">
                                        තවත් {cell.entries.length - 3} දෙනෙක්
                                      </Typography>
                                    ) : null}
                                  </Stack>
                                ) : null}
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })}
                    </Grid>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 4 }}>
          <Stack spacing={3}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      අද සහ ළඟදීම
                    </Typography>
                    <Chip color="warning" label={`${upcomingHighlights.length} වාර්තා`} />
                  </Stack>
                  {upcomingHighlights.length === 0 ? (
                    <Typography color="text.secondary">උපන්දිනය වාර්තා නොමැත.</Typography>
                  ) : (
                    upcomingHighlights.map((entry, index) => (
                      <Stack key={entry.id} spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          onClick={() => setSelectedEntry(entry)}
                          sx={{ alignItems: 'center', cursor: 'pointer' }}
                        >
                          <Avatar src={entry.photoUrl} sx={{ width: 52, height: 52 }}>
                            <CakeOutlinedIcon />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }} noWrap>
                              {entry.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {entry.relationship} | {formatBirthdayDate(entry.birthday)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getCountdownLabel(entry.birthday)} | වයස {entry.age}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                              {getBirthdayOwnerLabel(entry, memberNameMap)}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            color={daysUntil(entry.birthday) === 0 ? 'success' : 'warning'}
                            label={getCountdownLabel(entry.birthday)}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                        </Stack>
                        {index < upcomingHighlights.length - 1 ? <Divider /> : null}
                      </Stack>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatMonthName(selectedMonth)} මාසයේ සැමරුම් ලැයිස්තුව
                  </Typography>
                  {monthEntries.length === 0 ? (
                    <Typography color="text.secondary">මෙම මාසය සඳහා වාර්තා නොමැත.</Typography>
                  ) : (
                    monthEntries.map((entry) => (
                      <Stack
                        key={`month-${entry.id}`}
                        direction="row"
                        spacing={1.5}
                        onClick={() => setSelectedEntry(entry)}
                        sx={{
                          alignItems: 'center',
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          p: 1.5,
                          cursor: 'pointer',
                        }}
                      >
                        <Avatar src={entry.photoUrl} sx={{ width: 44, height: 44 }}>
                          <CakeOutlinedIcon />
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 700 }} noWrap>
                            {entry.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatBirthdayDate(entry.birthday)} | {entry.relationship}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                            {getBirthdayOwnerLabel(entry, memberNameMap)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {entry.address}
                          </Typography>
                        </Box>
                        <Chip size="small" variant="outlined" label={getCountdownLabel(entry.birthday)} />
                      </Stack>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={Boolean(selectedEntry)} onClose={() => setSelectedEntry(null)} fullWidth maxWidth="md">
        <DialogTitle>උපන්දිනය විස්තර</DialogTitle>
        <DialogContent>
          {selectedEntry ? (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <PersonInfoCard
                title={selectedEntry.relationship === 'සාමාජිකයා' ? 'සාමාජික තොරතුරු' : 'පවුල් සාමාජික තොරතුරු'}
                name={selectedEntry.name}
                subtitle={
                  selectedEntry.relationship === 'සාමාජිකයා'
                    ? 'ප්‍රධාන සාමාජිකයා'
                    : `${selectedEntry.relationship} | ${getBirthdayOwnerLabel(selectedEntry, memberNameMap)}`
                }
                birthday={selectedEntry.birthday}
                age={selectedEntry.age}
                address={selectedEntry.address}
                photoUrl={selectedEntry.photoUrl}
                metaRows={
                  selectedFamilyRecord
                    ? [
                        { label: 'සම්බන්ධතාවය', value: selectedFamilyRecord.relationshipType },
                        { label: 'NIC', value: selectedFamilyRecord.nic || 'NIC නොමැත' },
                      ]
                    : selectedMemberRecord
                      ? [
                          { label: 'සාමාජික අංකය', value: selectedMemberRecord.memberNumber },
                          { label: 'දුරකථනය', value: selectedMemberRecord.phoneNumber || 'දුරකථන අංකය නොමැත' },
                          { label: 'විද්‍යුත් තැපෑල', value: selectedMemberRecord.email || 'විද්‍යුත් තැපෑල නොමැත' },
                        ]
                      : []
                }
              />

              {selectedFamilyRecord && selectedMemberRecord ? (
                <PersonInfoCard
                  title="අදාළ ප්‍රධාන සාමාජික තොරතුරු"
                  name={selectedMemberRecord.fullName}
                  subtitle="මෙම පවුල් සාමාජිකයා අයත් වන සාමාජිකයා"
                  birthday={selectedMemberRecord.dateOfBirth}
                  age={calculateAge(selectedMemberRecord.dateOfBirth)}
                  address={selectedMemberRecord.address}
                  photoUrl={selectedMemberRecord.photoUrl}
                  metaRows={[
                    { label: 'සාමාජික අංකය', value: selectedMemberRecord.memberNumber },
                    { label: 'NIC', value: selectedMemberRecord.nic || 'NIC නොමැත' },
                    { label: 'දුරකථනය', value: selectedMemberRecord.phoneNumber || 'දුරකථන අංකය නොමැත' },
                    { label: 'විද්‍යුත් තැපෑල', value: selectedMemberRecord.email || 'විද්‍යුත් තැපෑල නොමැත' },
                    { label: 'ප්‍රදේශය', value: selectedMemberRecord.area },
                  ]}
                />
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}

const PersonInfoCard = ({
  title,
  name,
  subtitle,
  birthday,
  age,
  address,
  photoUrl,
  metaRows,
}: {
  title: string
  name: string
  subtitle: string
  birthday: string
  age: number
  address: string
  photoUrl?: string
  metaRows: Array<{ label: string; value: string }>
}) => (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent>
      <Stack spacing={2.5}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Avatar src={photoUrl} sx={{ width: 88, height: 88 }}>
            <CakeOutlinedIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {name}
            </Typography>
            <Typography color="text.secondary">{subtitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatBirthdayDate(birthday)} | වයස {age}
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          {metaRows.map((row) => (
            <Grid key={`${row.label}-${row.value}`} size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {row.label}
              </Typography>
              <Typography>{row.value}</Typography>
            </Grid>
          ))}
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary">
              ලිපිනය
            </Typography>
            <Typography>{address || 'ලිපිනය නොමැත'}</Typography>
          </Grid>
        </Grid>
      </Stack>
    </CardContent>
  </Card>
)

const StatCard = ({
  title,
  value,
  caption,
  icon,
}: {
  title: string
  value: number
  caption: string
  icon: ReactNode
}) => (
  <Card sx={{ height: '100%', borderRadius: 4 }}>
    <CardContent>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: 'action.hover', width: 56, height: 56 }}>{icon}</Avatar>
      </Stack>
    </CardContent>
  </Card>
)

export default BirthdaysPage
