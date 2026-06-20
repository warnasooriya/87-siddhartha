import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import { Avatar, Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'

import {
  FULL_ACCESS_ROLES,
  ROLE_LABELS,
  canApproveProfileUpdateRequest,
  getProfileUpdateApproverRoles,
} from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../store'
import {
  approveMemberProfileUpdateRequestRemote,
  insertAuditLogRemote,
  insertMemberProfileUpdateRequestRemote,
  refreshDataFromSupabase,
  rejectMemberProfileUpdateRequestRemote,
} from '../services/supabaseMutations'
import type { FamilyMember, RelationshipType } from '../types/domain'

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  SPOUSE: 'ජීවිත සහකරු/සහකාරිය',
  MOTHER: 'සාමාජික මව',
  FATHER: 'සාමාජික පියා',
  SPOUSE_MOTHER: 'සහකරුගේ මව',
  SPOUSE_FATHER: 'සහකරුගේ පියා',
  CHILD: 'දරුවා',
}

const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_LABELS) as Array<[RelationshipType, string]>

const photoUploadConfig = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
}

const readImageFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read image file.'))
    reader.readAsDataURL(file)
  })

const cloneFamilyMember = (familyMember: FamilyMember): FamilyMember => ({
  ...familyMember,
})

const createEmptyFamilyMember = (memberId: string): FamilyMember => {
  const timestamp = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    memberId,
    relationshipType: 'CHILD',
    fullName: '',
    nic: '',
    dateOfBirth: '',
    address: '',
    photoUrl: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const ProfilePage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const auth = useAuth()
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const { members, profileUpdateRequests, users } = useAppSelector((state) => state.data)

  const linkedMember =
    members.find((member) => member.id === currentUser?.memberId) ??
    members.find((member) => member.email === currentUser?.email) ??
    null

  const [fullName, setFullName] = useState('')
  const [nic, setNic] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [familyMembersDraft, setFamilyMembersDraft] = useState<FamilyMember[]>([])

  useEffect(() => {
    if (!linkedMember) {
      return
    }

    setFullName(linkedMember.fullName)
    setNic(linkedMember.nic)
    setDateOfBirth(linkedMember.dateOfBirth)
    setPhoneNumber(linkedMember.phoneNumber)
    setEmail(linkedMember.email)
    setAddress(linkedMember.address)
    setArea(linkedMember.area)
    setPhotoUrl(linkedMember.photoUrl ?? '')
    setFamilyMembersDraft(linkedMember.familyMembers.map(cloneFamilyMember))
  }, [linkedMember])

  const myRequests = useMemo(
    () =>
      profileUpdateRequests.filter(
        (request) => request.memberId === linkedMember?.id || request.requestedByUserId === currentUser?.id,
      ),
    [currentUser?.id, linkedMember?.id, profileUpdateRequests],
  )

  const memberRoleMap = useMemo(() => new Map(members.map((member) => [member.id, member.systemRole])), [members])
  const userRoleMap = useMemo(() => new Map(users.map((user) => [user.id, user.role])), [users])

  const getRequestRole = (request: (typeof profileUpdateRequests)[number]) =>
    userRoleMap.get(request.requestedByUserId) ?? memberRoleMap.get(request.memberId) ?? 'MEMBER'

  const pendingRequests = useMemo(
    () => profileUpdateRequests.filter((request) => request.status === 'PENDING'),
    [profileUpdateRequests],
  )

  const approvableRequests = useMemo(
    () =>
      pendingRequests.filter((request) => {
        if (!currentUser) {
          return false
        }

        return canApproveProfileUpdateRequest(
          currentUser.role,
          getRequestRole(request),
          request.requestedByUserId === currentUser.id,
        )
      }),
    [currentUser, pendingRequests, userRoleMap, memberRoleMap],
  )

  const myApproverRoles = useMemo(
    () => (currentUser ? getProfileUpdateApproverRoles(currentUser.role) : []),
    [currentUser],
  )

  const handleSubmitRequest = async () => {
    if (!currentUser || !linkedMember) {
      return
    }

    if (!fullName || !nic || !dateOfBirth || !phoneNumber || !address || !area) {
      enqueueSnackbar('පැතිකඩ යාවත්කාලීන කිරීමට අවශ්‍ය සියලු තොරතුරු ඇතුළත් කරන්න', { variant: 'warning' })
      return
    }

    if (myRequests.some((request) => request.status === 'PENDING')) {
      enqueueSnackbar('ඔබට දැනටමත් අනුමැතිය බලාපොරොත්තුවෙන් පවතින ඉල්ලීමක් ඇත', { variant: 'warning' })
      return
    }

    if (familyMembersDraft.some((familyMember) => !familyMember.fullName.trim())) {
      enqueueSnackbar('පවුල් සාමාජික තොරතුරු වල නම අනිවාර්ය වේ', { variant: 'warning' })
      return
    }

    const request = {
      id: crypto.randomUUID(),
      memberId: linkedMember.id,
      requestedByUserId: currentUser.id,
      requestedByName: currentUser.fullName,
      fullName,
      nic,
      dateOfBirth,
      phoneNumber,
      email,
      address,
      area,
      photoUrl: photoUrl || undefined,
      requestedFamilyMembers: familyMembersDraft.map((familyMember) => ({
        ...familyMember,
        memberId: linkedMember.id,
        fullName: familyMember.fullName.trim(),
        nic: familyMember.nic.trim(),
        dateOfBirth: familyMember.dateOfBirth,
        address: familyMember.address.trim(),
        photoUrl: familyMember.photoUrl?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      })),
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    }

    try {
      await insertMemberProfileUpdateRequestRemote(request)
      await insertAuditLogRemote(
        buildAuditEntry(currentUser.id, 'REQUEST_PROFILE_UPDATE', 'MEMBER_PROFILE_REQUEST', request.id, 'පැතිකඩ යාවත්කාලීන ඉල්ලීමක් යොමු කරන ලදි'),
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

    const requesterRole = getRequestRole(request)
    const canApproveRequest = canApproveProfileUpdateRequest(
      currentUser.role,
      requesterRole,
      request.requestedByUserId === currentUser.id,
    )
    if (!canApproveRequest) {
      enqueueSnackbar('මෙම පැතිකඩ ඉල්ලීම අනුමත කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
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

    const request = profileUpdateRequests.find((item) => item.id === requestId)
    if (!request) {
      return
    }

    const requesterRole = getRequestRole(request)
    const canRejectRequest = canApproveProfileUpdateRequest(
      currentUser.role,
      requesterRole,
      request.requestedByUserId === currentUser.id,
    )
    if (!canRejectRequest) {
      enqueueSnackbar('මෙම පැතිකඩ ඉල්ලීම ප්‍රතික්ෂේප කිරීමට ඔබට අවසර නොමැත', { variant: 'warning' })
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

  const handleFamilyMemberChange = <K extends keyof FamilyMember>(familyMemberId: string, field: K, value: FamilyMember[K]) => {
    setFamilyMembersDraft((currentDraft) =>
      currentDraft.map((familyMember) =>
        familyMember.id === familyMemberId
          ? {
              ...familyMember,
              [field]: value,
              updatedAt: new Date().toISOString(),
            }
          : familyMember,
      ),
    )
  }

  const handleAddFamilyMember = () => {
    if (!linkedMember) {
      return
    }

    setFamilyMembersDraft((currentDraft) => [...currentDraft, createEmptyFamilyMember(linkedMember.id)])
  }

  const handleRemoveFamilyMember = (familyMemberId: string) => {
    setFamilyMembersDraft((currentDraft) => currentDraft.filter((familyMember) => familyMember.id !== familyMemberId))
  }

  const handleProfilePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!photoUploadConfig.allowedTypes.includes(file.type)) {
      enqueueSnackbar('JPG, JPEG, PNG හෝ WEBP පමණක් භාවිතා කරන්න', { variant: 'error' })
      event.target.value = ''
      return
    }

    if (file.size > photoUploadConfig.maxSizeBytes) {
      enqueueSnackbar('ඡායාරූපය 5MB ඉක්මවා ඇත', { variant: 'error' })
      event.target.value = ''
      return
    }

    try {
      setPhotoUrl(await readImageFileAsDataUrl(file))
      enqueueSnackbar('පැතිකඩ ඡායාරූපය සාර්ථකව තෝරා ගන්නා ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ඡායාරූපය පූරණය කළ නොහැකි විය', { variant: 'error' })
    } finally {
      event.target.value = ''
    }
  }

  const handleFamilyPhotoUpload = async (familyMemberId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!photoUploadConfig.allowedTypes.includes(file.type)) {
      enqueueSnackbar('JPG, JPEG, PNG හෝ WEBP පමණක් භාවිතා කරන්න', { variant: 'error' })
      event.target.value = ''
      return
    }

    if (file.size > photoUploadConfig.maxSizeBytes) {
      enqueueSnackbar('ඡායාරූපය 5MB ඉක්මවා ඇත', { variant: 'error' })
      event.target.value = ''
      return
    }

    try {
      const imageDataUrl = await readImageFileAsDataUrl(file)
      handleFamilyMemberChange(familyMemberId, 'photoUrl', imageDataUrl)
      enqueueSnackbar('පවුල් සාමාජික ඡායාරූපය සාර්ථකව තෝරා ගන්නා ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ඡායාරූපය පූරණය කළ නොහැකි විය', { variant: 'error' })
    } finally {
      event.target.value = ''
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
                ) : (
                  <Stack spacing={2}>
                    <Typography color="text.secondary">
                      {`ඔබගේ ඉල්ලීම අනුමත කළ හැක්කේ: ${myApproverRoles.map((role) => ROLE_LABELS[role]).join(', ')}`}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="සම්පූර්ණ නම" fullWidth value={fullName} onChange={(event) => setFullName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="ජා.හැ.අංකය" fullWidth value={nic} onChange={(event) => setNic(event.target.value)} />
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
                        <Stack spacing={1.5}>
                          <Typography variant="body2" color="text.secondary">
                            පැතිකඩ ඡායාරූපය
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <Avatar src={photoUrl} sx={{ width: 64, height: 64 }}>
                              {fullName.charAt(0)}
                            </Avatar>
                            <Stack direction="row" spacing={1}>
                              <Button component="label" variant="outlined">
                                ඡායාරූපය උඩුගත කරන්න
                                <input hidden accept="image/jpeg,image/jpg,image/png,image/webp" type="file" onChange={handleProfilePhotoUpload} />
                              </Button>
                              {photoUrl ? (
                                <Button color="error" variant="text" onClick={() => setPhotoUrl('')}>
                                  ඉවත් කරන්න
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                        </Stack>
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
                        <Stack spacing={2}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              පවුල් සාමාජික තොරතුරු
                            </Typography>
                            <Button variant="outlined" onClick={handleAddFamilyMember}>
                              පවුල් සාමාජිකයෙකු එක් කරන්න
                            </Button>
                          </Stack>
                          {familyMembersDraft.length === 0 ? (
                            <Typography color="text.secondary">දැනට පවුල් සාමාජික වාර්තා නොමැත.</Typography>
                          ) : (
                            familyMembersDraft.map((familyMember, index) => (
                              <Card key={familyMember.id} variant="outlined">
                                <CardContent>
                                  <Stack spacing={2}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography sx={{ fontWeight: 700 }}>{`පවුල් සාමාජික ${index + 1}`}</Typography>
                                      <Button color="error" variant="text" onClick={() => handleRemoveFamilyMember(familyMember.id)}>
                                        ඉවත් කරන්න
                                      </Button>
                                    </Stack>
                                    <Grid container spacing={2}>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                          select
                                          label="සම්බන්ධතාවය"
                                          fullWidth
                                          value={familyMember.relationshipType}
                                          onChange={(event) =>
                                            handleFamilyMemberChange(
                                              familyMember.id,
                                              'relationshipType',
                                              event.target.value as RelationshipType,
                                            )
                                          }
                                        >
                                          {RELATIONSHIP_OPTIONS.map(([value, label]) => (
                                            <MenuItem key={value} value={value}>
                                              {label}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                          label="සම්පූර්ණ නම"
                                          fullWidth
                                          value={familyMember.fullName}
                                          onChange={(event) => handleFamilyMemberChange(familyMember.id, 'fullName', event.target.value)}
                                        />
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                          label="ජා.හැ.අංකය"
                                          fullWidth
                                          value={familyMember.nic}
                                          onChange={(event) => handleFamilyMemberChange(familyMember.id, 'nic', event.target.value)}
                                        />
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                          label="උපන්දිනය"
                                          type="date"
                                          fullWidth
                                          value={familyMember.dateOfBirth}
                                          onChange={(event) => handleFamilyMemberChange(familyMember.id, 'dateOfBirth', event.target.value)}
                                          slotProps={{ inputLabel: { shrink: true } }}
                                        />
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <Stack spacing={1.5}>
                                          <Typography variant="body2" color="text.secondary">
                                            පවුල් සාමාජික ඡායාරූපය
                                          </Typography>
                                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                            <Avatar src={familyMember.photoUrl} sx={{ width: 56, height: 56 }}>
                                              {familyMember.fullName.charAt(0)}
                                            </Avatar>
                                            <Stack direction="row" spacing={1}>
                                              <Button component="label" variant="outlined">
                                                උඩුගත කරන්න
                                                <input
                                                  hidden
                                                  accept="image/jpeg,image/jpg,image/png,image/webp"
                                                  type="file"
                                                  onChange={(event) => void handleFamilyPhotoUpload(familyMember.id, event)}
                                                />
                                              </Button>
                                              {familyMember.photoUrl ? (
                                                <Button
                                                  color="error"
                                                  variant="text"
                                                  onClick={() => handleFamilyMemberChange(familyMember.id, 'photoUrl', '')}
                                                >
                                                  ඉවත් කරන්න
                                                </Button>
                                              ) : null}
                                            </Stack>
                                          </Stack>
                                        </Stack>
                                      </Grid>
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                          label="ලිපිනය"
                                          fullWidth
                                          value={familyMember.address}
                                          onChange={(event) => handleFamilyMemberChange(familyMember.id, 'address', event.target.value)}
                                        />
                                      </Grid>
                                    </Grid>
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button variant="contained" onClick={handleSubmitRequest}>
                          යාවත්කාලීන ඉල්ලීම යොමු කරන්න
                        </Button>
                      </Grid>
                    </Grid>
                  </Stack>
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
                    <Typography color="text.secondary">{`ජා.හැ.අංකය: ${request.nic}`}</Typography>
                    <Typography color="text.secondary">භූමිකාව: {ROLE_LABELS[getRequestRole(request)]}</Typography>
                    <Typography color="text.secondary">{`පවුල් වාර්තා: ${request.requestedFamilyMembers.length}`}</Typography>
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
              {approvableRequests.length === 0 ? (
                <Typography color="text.secondary">අනුමත කිරීමට ඉල්ලීම් නොමැත.</Typography>
              ) : (
                approvableRequests.map((request) => (
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
                      <Typography color="text.secondary">{`ජා.හැ.අංකය: ${request.nic}`}</Typography>
                      <Typography color="text.secondary">
                        {request.area} | {request.address}
                      </Typography>
                      <Typography color="text.secondary">
                        {`ඉල්ලුම්කරුගේ භූමිකාව: ${ROLE_LABELS[getRequestRole(request)]}`}
                      </Typography>
                      <Typography color="text.secondary">{`පවුල් වාර්තා: ${request.requestedFamilyMembers.length}`}</Typography>
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
      සියලුම භූමිකාවන්ට තමන්ගේ පැතිකඩ තොරතුරු යාවත්කාලීන ඉල්ලීමක් යොමු කළ හැකි අතර අදාළ
      භූමිකාවට සුදුසු වෙනත් බලයලත් පරිශීලකයෙකු විසින් එය අනුමත හෝ ප්‍රතික්ෂේප කළ යුතුය.
    </Typography>
  </Stack>
)

export default ProfilePage
