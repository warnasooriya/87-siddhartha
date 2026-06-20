import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import { Button, Card, CardContent, Chip, Grid, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'

import { FULL_ACCESS_ROLES, ROLE_LABELS } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../store'
import {
  approveMemberProfileUpdateRequestRemote,
  insertAuditLogRemote,
  insertMemberProfileUpdateRequestRemote,
  refreshDataFromSupabase,
  rejectMemberProfileUpdateRequestRemote,
} from '../services/supabaseMutations'

const ProfilePage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const { members, profileUpdateRequests } = useAppSelector((state) => state.data)

  const linkedMember =
    members.find((member) => member.id === currentUser?.memberId) ??
    members.find((member) => member.email === currentUser?.email) ??
    null

  const [fullName, setFullName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    if (!linkedMember) {
      return
    }

    setFullName(linkedMember.fullName)
    setDateOfBirth(linkedMember.dateOfBirth)
    setPhoneNumber(linkedMember.phoneNumber)
    setEmail(linkedMember.email)
    setAddress(linkedMember.address)
    setArea(linkedMember.area)
    setPhotoUrl(linkedMember.photoUrl ?? '')
  }, [linkedMember])

  const myRequests = useMemo(
    () =>
      profileUpdateRequests.filter(
        (request) => request.memberId === linkedMember?.id || request.requestedByUserId === currentUser?.id,
      ),
    [currentUser?.id, linkedMember?.id, profileUpdateRequests],
  )

  const pendingRequests = useMemo(
    () => profileUpdateRequests.filter((request) => request.status === 'PENDING'),
    [profileUpdateRequests],
  )

  const handleSubmitRequest = async () => {
    if (!currentUser || !linkedMember) {
      return
    }

    if (currentUser.role !== 'MEMBER') {
      enqueueSnackbar('මෙම ඉල්ලීම් ප්‍රවාහය සාමාජික ගිණුම් සඳහා පමණි', { variant: 'warning' })
      return
    }

    if (!fullName || !dateOfBirth || !phoneNumber || !email || !address || !area) {
      enqueueSnackbar('පැතිකඩ යාවත්කාලීන කිරීමට අවශ්‍ය සියලු තොරතුරු ඇතුළත් කරන්න', { variant: 'warning' })
      return
    }

    if (myRequests.some((request) => request.status === 'PENDING')) {
      enqueueSnackbar('ඔබට දැනටමත් අනුමැතිය බලාපොරොත්තුවෙන් පවතින ඉල්ලීමක් ඇත', { variant: 'warning' })
      return
    }

    const request = {
      id: crypto.randomUUID(),
      memberId: linkedMember.id,
      requestedByUserId: currentUser.id,
      requestedByName: currentUser.fullName,
      fullName,
      dateOfBirth,
      phoneNumber,
      email,
      address,
      area,
      photoUrl: photoUrl || undefined,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    }

    try {
      await insertMemberProfileUpdateRequestRemote(request)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'REQUEST_PROFILE_UPDATE', 'MEMBER_PROFILE_REQUEST', request.id, 'සාමාජික පැතිකඩ යාවත්කාලීන ඉල්ලීමක් යොමු කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('පැතිකඩ යාවත්කාලීන ඉල්ලීම යොමු කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('පැතිකඩ ඉල්ලීම Supabase වෙත යැවීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!currentUser || !auth.hasRole(FULL_ACCESS_ROLES)) {
      return
    }

    const request = profileUpdateRequests.find((item) => item.id === requestId)
    if (!request) {
      return
    }

    try {
      await approveMemberProfileUpdateRequestRemote(request, currentUser.id)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'APPROVE_PROFILE_UPDATE', 'MEMBER_PROFILE_REQUEST', request.id, 'සාමාජික පැතිකඩ යාවත්කාලීන ඉල්ලීම අනුමත කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('පැතිකඩ යාවත්කාලීන ඉල්ලීම අනුමත කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ඉල්ලීම අනුමත කිරීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleReject = async (requestId: string) => {
    if (!currentUser || !auth.hasRole(FULL_ACCESS_ROLES)) {
      return
    }

    try {
      await rejectMemberProfileUpdateRequestRemote(requestId, currentUser.id)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'REJECT_PROFILE_UPDATE', 'MEMBER_PROFILE_REQUEST', requestId, 'සාමාජික පැතිකඩ යාවත්කාලීන ඉල්ලීම ප්‍රතික්ෂේප කරන ලදි'),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar('පැතිකඩ යාවත්කාලීන ඉල්ලීම ප්‍රතික්ෂේප කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ඉල්ලීම ප්‍රතික්ෂේප කිරීමට නොහැකි විය', { variant: 'error' })
    }
  }

  return (
    <Stack spacing={3}>
      <BoxHeader />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <PersonOutlineOutlinedIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    මගේ පැතිකඩ
                  </Typography>
                </Stack>
                {currentUser ? (
                  <>
                    <Typography sx={{ fontWeight: 700 }}>{currentUser.fullName}</Typography>
                    <Typography color="text.secondary">{currentUser.email}</Typography>
                    <Chip label={ROLE_LABELS[currentUser.role]} color="primary" sx={{ width: 'fit-content' }} />
                    {linkedMember ? (
                      <Typography color="text.secondary">
                        සාමාජික අංකය: {linkedMember.memberNumber}
                      </Typography>
                    ) : (
                      <Typography color="text.secondary">
                        මෙම ගිණුමට සම්බන්ධ සාමාජික වාර්තාවක් නොමැත.
                      </Typography>
                    )}
                  </>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <PendingActionsOutlinedIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    පැතිකඩ යාවත්කාලීන ඉල්ලීම
                  </Typography>
                </Stack>
                {!linkedMember ? (
                  <Typography color="text.secondary">
                    සම්බන්ධිත සාමාජික වාර්තාවක් ඇති පරිශීලකයන්ට පමණක් පැතිකඩ යාවත්කාලීන ඉල්ලීම් යොමු කළ හැක.
                  </Typography>
                ) : currentUser?.role !== 'MEMBER' ? (
                  <Typography color="text.secondary">
                    සාමාජික භූමිකාව ඇති පරිශීලකයන්ට පමණක් තමන්ගේ පැතිකඩ සඳහා යාවත්කාලීන ඉල්ලීම් යොමු කළ හැක.
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="සම්පූර්ණ නම" fullWidth value={fullName} onChange={(event) => setFullName(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="උපන්දිනය"
                        type="date"
                        fullWidth
                        value={dateOfBirth}
                        onChange={(event) => setDateOfBirth(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="දුරකථන අංකය" fullWidth value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="විද්‍යුත් තැපෑල" fullWidth value={email} onChange={(event) => setEmail(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="ප්‍රදේශය" fullWidth value={area} onChange={(event) => setArea(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label="ඡායාරූප URL / Data URL" fullWidth value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="ලිපිනය"
                        fullWidth
                        multiline
                        minRows={3}
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button variant="contained" onClick={handleSubmitRequest}>
                        යාවත්කාලීන ඉල්ලීම යොමු කරන්න
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              මගේ ඉල්ලීම්
            </Typography>
            {myRequests.length === 0 ? (
              <Typography color="text.secondary">තවම පැතිකඩ යාවත්කාලීන ඉල්ලීම් නොමැත.</Typography>
            ) : (
              myRequests.map((request) => (
                <Stack
                  key={request.id}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{ justifyContent: 'space-between', borderRadius: 2, bgcolor: 'action.hover', p: 2 }}
                >
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 700 }}>{request.fullName}</Typography>
                    <Typography color="text.secondary">
                      {request.email} | {request.phoneNumber} | {request.area}
                    </Typography>
                    <Typography color="text.secondary">ඉල්ලීම: {new Date(request.createdAt).toLocaleString()}</Typography>
                  </Stack>
                  <Chip
                    label={request.status === 'PENDING' ? 'අනුමැතිය බලාපොරොත්තුවෙන්' : request.status === 'APPROVED' ? 'අනුමතයි' : 'ප්‍රතික්ෂේපයි'}
                    color={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : 'error'}
                    sx={{ alignSelf: 'flex-start' }}
                  />
                </Stack>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>

      {auth.hasRole(FULL_ACCESS_ROLES) ? (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                පැතිකඩ ඉල්ලීම් අනුමැතිය
              </Typography>
              {pendingRequests.length === 0 ? (
                <Typography color="text.secondary">අනුමත කිරීමට ඉල්ලීම් නොමැත.</Typography>
              ) : (
                pendingRequests.map((request) => (
                  <Stack
                    key={request.id}
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={2}
                    sx={{ justifyContent: 'space-between', borderRadius: 2, bgcolor: 'action.hover', p: 2 }}
                  >
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{request.requestedByName}</Typography>
                      <Typography color="text.secondary">
                        {request.fullName} | {request.email} | {request.phoneNumber}
                      </Typography>
                      <Typography color="text.secondary">
                        {request.area} | {request.address}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleOutlineOutlinedIcon />}
                        onClick={() => handleApprove(request.id)}
                      >
                        අනුමත කරන්න
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<ThumbDownOutlinedIcon />}
                        onClick={() => handleReject(request.id)}
                      >
                        ප්‍රතික්ෂේප කරන්න
                      </Button>
                    </Stack>
                  </Stack>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  )
}

const BoxHeader = () => (
  <Stack spacing={0.5}>
    <Typography variant="h4" sx={{ fontWeight: 800 }}>
      පැතිකඩ සහ අනුමැති ඉල්ලීම්
    </Typography>
    <Typography color="text.secondary">
      සාමාජිකයන්ට තමන්ගේ පැතිකඩ සඳහා යාවත්කාලීන ඉල්ලීමක් යොමු කළ හැකි අතර පූර්ණ ප්‍රවේශ භූමිකාවන්ට
      එය අනුමත හෝ ප්‍රතික්ෂේප කළ හැක.
    </Typography>
  </Stack>
)

export default ProfilePage
