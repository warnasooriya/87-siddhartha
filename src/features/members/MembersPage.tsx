import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Step,
  StepButton,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form'
import { useSnackbar } from 'notistack'
import * as yup from 'yup'

import { ALL_USER_ROLES, FULL_ACCESS_ROLES, ROLE_LABELS } from '../../constants/roles'
import { useAuth } from '../../hooks/useAuth'
import { buildAuditEntry, useAppDispatch, useAppSelector } from '../../store'
import {
  deleteMemberRemote,
  insertAuditLogRemote,
  refreshDataFromSupabase,
  upsertMemberRemote,
} from '../../services/supabaseMutations'
import type { CommunityMember, FamilyMember, Gender, MemberWizardValues, RelationshipType } from '../../types/domain'
import { exportMembersToCsv, exportMembersToExcel } from '../../utils/export'

const steps = [
  'සාමාජිකයා',
  'ජීවිත සහකරු/සහකාරිය',
  'මව',
  'පියා',
  'සහකරුගේ මව',
  'සහකරුගේ පියා',
  'දරුවන්',
  'සමාලෝචනය',
]

const relationshipStepMap: Array<{
  key: keyof Omit<MemberWizardValues, 'member' | 'children'>
  label: string
  relationshipType: RelationshipType
}> = [
  { key: 'spouse', label: 'ජීවිත සහකරු/සහකාරිය', relationshipType: 'SPOUSE' },
  { key: 'memberMother', label: 'සාමාජික මව', relationshipType: 'MOTHER' },
  { key: 'memberFather', label: 'සාමාජික පියා', relationshipType: 'FATHER' },
  { key: 'spouseMother', label: 'සහකරුගේ මව', relationshipType: 'SPOUSE_MOTHER' },
  { key: 'spouseFather', label: 'සහකරුගේ පියා', relationshipType: 'SPOUSE_FATHER' },
]

type RelativeDraft = {
  id?: string
  createdAt?: string
  updatedAt?: string
  fullName: string
  nic: string
  dateOfBirth: string
  address: string
  photoUrl?: string
}

type MemberFormValues = {
  member: MemberWizardValues['member']
  loginPassword: string
  confirmLoginPassword: string
  spouse: RelativeDraft
  memberMother: RelativeDraft
  memberFather: RelativeDraft
  spouseMother: RelativeDraft
  spouseFather: RelativeDraft
  children: RelativeDraft[]
}

const emptyRelative = (): RelativeDraft => ({
  fullName: '',
  nic: '',
  dateOfBirth: '',
  address: '',
  photoUrl: '',
})

const defaultValues: MemberFormValues = {
  member: {
    memberNumber: '',
    fullName: '',
    nic: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    phoneNumber: '',
    email: '',
    photoUrl: '',
    activeStatus: true,
    area: '',
    systemRole: 'MEMBER',
  },
  loginPassword: '',
  confirmLoginPassword: '',
  spouse: emptyRelative(),
  memberMother: emptyRelative(),
  memberFather: emptyRelative(),
  spouseMother: emptyRelative(),
  spouseFather: emptyRelative(),
  children: [emptyRelative()],
}

const optionalPasswordField = yup
  .string()
  .transform((value) => {
    const trimmedValue = typeof value === 'string' ? value.trim() : value
    return trimmedValue ? trimmedValue : undefined
  })
  .min(6, 'මුරපදය අවම වශයෙන් අක්ෂර 6ක් විය යුතුය')
  .optional()

const schema = yup.object({
  member: yup.object({
    memberNumber: yup.string().required('අවශ්‍ය වේ'),
    fullName: yup.string().required('අවශ්‍ය වේ'),
    nic: yup.string().required('අවශ්‍ය වේ'),
    dateOfBirth: yup.string().required('අවශ්‍ය වේ'),
    gender: yup.mixed<Gender>().required(),
    address: yup.string().required('අවශ්‍ය වේ'),
    phoneNumber: yup.string().required('අවශ්‍ය වේ'),
    email: yup
      .string()
      .transform((value) => {
        const trimmedValue = typeof value === 'string' ? value.trim() : value
        return trimmedValue ?? ''
      })
      .test('valid-email-when-provided', 'වලංගු නොවේ', (value) => !value || yup.string().email().isValidSync(value)),
    photoUrl: yup.string().optional(),
    activeStatus: yup.boolean().required(),
    area: yup.string().required('අවශ්‍ය වේ'),
    systemRole: yup.mixed<CommunityMember['systemRole']>().required('අවශ්‍ය වේ'),
  }),
  loginPassword: optionalPasswordField,
  confirmLoginPassword: yup
    .string()
    .transform((value) => {
      const trimmedValue = typeof value === 'string' ? value.trim() : value
      return trimmedValue ? trimmedValue : undefined
    })
    .oneOf([yup.ref('loginPassword')], 'මුරපද දෙක සමාන විය යුතුය')
    .optional(),
  spouse: yup.object().optional(),
  memberMother: yup.object().optional(),
  memberFather: yup.object().optional(),
  spouseMother: yup.object().optional(),
  spouseFather: yup.object().optional(),
  children: yup.array().of(yup.object()).required(),
})

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

const buildFamilyMember = (
  memberId: string,
  relationshipType: RelationshipType,
  relative: RelativeDraft | undefined,
  timestamp: string,
): FamilyMember | null => {
  if (!relative?.fullName) {
    return null
  }

  return {
    id: relative.id ?? crypto.randomUUID(),
    memberId,
    relationshipType,
    fullName: relative.fullName,
    nic: relative.nic,
    dateOfBirth: relative.dateOfBirth,
    address: relative.address,
    photoUrl: relative.photoUrl,
    createdAt: relative.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

const getRelative = (member: CommunityMember, relationshipType: RelationshipType) =>
  member.familyMembers.find((item) => item.relationshipType === relationshipType)

const mapMemberToValues = (member: CommunityMember): MemberFormValues => ({
  member: {
    memberNumber: member.memberNumber,
    fullName: member.fullName,
    nic: member.nic,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    address: member.address,
    phoneNumber: member.phoneNumber,
    email: member.email,
    photoUrl: member.photoUrl,
    activeStatus: member.activeStatus,
    area: member.area,
    systemRole: member.systemRole,
  },
  loginPassword: '',
  confirmLoginPassword: '',
  spouse: getRelative(member, 'SPOUSE') ?? emptyRelative(),
  memberMother: getRelative(member, 'MOTHER') ?? emptyRelative(),
  memberFather: getRelative(member, 'FATHER') ?? emptyRelative(),
  spouseMother: getRelative(member, 'SPOUSE_MOTHER') ?? emptyRelative(),
  spouseFather: getRelative(member, 'SPOUSE_FATHER') ?? emptyRelative(),
  children:
    member.familyMembers.filter((item) => item.relationshipType === 'CHILD').map((child) => ({
      id: child.id,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
      fullName: child.fullName,
      nic: child.nic,
      dateOfBirth: child.dateOfBirth,
      address: child.address,
      photoUrl: child.photoUrl,
    })) || [emptyRelative()],
})

const RelativeFields = ({
  controlPrefix,
  title,
}: {
  controlPrefix: keyof Omit<MemberFormValues, 'member' | 'children'>
  title: string
}) => (
  <Grid container spacing={2}>
    <Grid size={{ xs: 12 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <ControllerText name={`${controlPrefix}.fullName`} label="සම්පූර්ණ නම" />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <ControllerText name={`${controlPrefix}.nic`} label="NIC" />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <ControllerText name={`${controlPrefix}.dateOfBirth`} label="උපන්දිනය" type="date" />
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <ImageUploadField name={`${controlPrefix}.photoUrl`} label={`${title} ඡායාරූපය`} />
    </Grid>
    <Grid size={{ xs: 12 }}>
      <ControllerText name={`${controlPrefix}.address`} label="ලිපිනය" multiline minRows={3} />
    </Grid>
  </Grid>
)

const ControllerText = ({
  name,
  label,
  ...rest
}: {
  name: string
  label: string
  type?: string
  multiline?: boolean
  minRows?: number
}) => {
  const { control } = useFormContextWithAssertion()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          fullWidth
          type={rest.type}
          multiline={rest.multiline}
          minRows={rest.minRows}
          slotProps={{
            inputLabel: rest.type === 'date' ? { shrink: true } : undefined,
          }}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        />
      )}
    />
  )
}

const ImageUploadField = ({
  name,
  label,
}: {
  name: string
  label: string
}) => {
  const { control, setValue } = useFormContextWithAssertion()
  const { enqueueSnackbar } = useSnackbar()

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
      setValue(name as never, imageDataUrl as never, {
        shouldDirty: true,
        shouldTouch: true,
      })
      enqueueSnackbar('ඡායාරූපය සාර්ථකව තෝරා ගන්නා ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('ඡායාරූපය පූරණය කළ නොහැකි විය', { variant: 'error' })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">{label}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Avatar src={field.value} sx={{ width: 88, height: 88 }}>
              {label.charAt(0)}
            </Avatar>
            <Stack spacing={1}>
              <Button component="label" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />}>
                ඡායාරූපය තෝරන්න
                <input hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
              </Button>
              <Button
                variant="text"
                color="inherit"
                onClick={() =>
                  setValue(name as never, '' as never, {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
                disabled={!field.value}
              >
                ඡායාරූපය ඉවත් කරන්න
              </Button>
              <Typography variant="caption" color="text.secondary">
                උපරිම 5MB | JPG, JPEG, PNG, WEBP
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      )}
    />
  )
}

const useFormContextWithAssertion = () => {
  const methods = useFormContext()
  if (!methods) {
    throw new Error('Form context is missing')
  }
  return methods
}

const PhotoThumbnail = ({
  src,
  alt,
  fallback,
  size = 72,
  onClick,
}: {
  src?: string
  alt: string
  fallback: string
  size?: number
  onClick: () => void
}) => (
  <Avatar
    src={src}
    alt={alt}
    onClick={onClick}
    sx={{
      width: size,
      height: size,
      cursor: 'pointer',
      border: '2px solid',
      borderColor: 'divider',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'scale(1.03)',
        boxShadow: 3,
      },
    }}
  >
    {fallback}
  </Avatar>
)

const MembersPage = () => {
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const auth = useAuth()
  const members = useAppSelector((state) => state.data.members)
  const users = useAppSelector((state) => state.data.users)
  const currentUser = useAppSelector((state) => state.auth.currentUser)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>(members[0]?.id ?? '')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<{ src?: string; title: string } | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<CommunityMember | null>(null)

  const methods = useForm<MemberFormValues>({
    defaultValues,
  })
  const { control, handleSubmit, reset, setError } = methods
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'children',
  })

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        [member.fullName, member.nic, member.memberNumber, member.address, member.area].some((value) =>
          value.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    [members, query],
  )

  const selectedMember =
    members.find((member) => member.id === selectedId) ?? filteredMembers[0] ?? members[0] ?? null

  const openCreateDialog = () => {
    setEditingMemberId(null)
    setActiveStep(0)
    reset(defaultValues)
    setIsDialogOpen(true)
  }

  const openEditDialog = (member: CommunityMember) => {
    setEditingMemberId(member.id)
    setActiveStep(0)
    reset(mapMemberToValues(member))
    setIsDialogOpen(true)
  }

  const openViewer = (memberId: string) => {
    setSelectedId(memberId)
    setIsViewerOpen(true)
  }

  const openPhotoPreview = (src: string | undefined, title: string) => {
    setPreviewPhoto({ src, title })
  }

  const handleSave = async (values: MemberFormValues) => {
    if (!currentUser || !auth.hasRole(FULL_ACCESS_ROLES)) {
      enqueueSnackbar('මෙම ක්‍රියාව සඳහා ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }

    try {
      schema.validateSync(values, { abortEarly: false })
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((issue) => {
          if (issue.path) {
            setError(issue.path as never, {
              type: 'manual',
              message: issue.message,
            })
          }
        })
        setActiveStep(0)
        return
      }
    }

    if (!editingMemberId && !values.loginPassword) {
      setError('loginPassword', {
        type: 'manual',
        message: 'නව පරිශීලක පිවිසුම සඳහා මුරපදයක් අවශ්‍ය වේ',
      })
      setActiveStep(0)
      return
    }

    const duplicateNic = members.find(
      (member) => member.nic === values.member.nic && member.id !== editingMemberId,
    )
    const normalizedEmail = values.member.email.trim().toLowerCase()
    const duplicateEmail = normalizedEmail
      ? members.find((member) => member.email.trim().toLowerCase() === normalizedEmail && member.id !== editingMemberId)
      : undefined
    const duplicateUserEmail = normalizedEmail
      ? users.find((user) => user.email.trim().toLowerCase() === normalizedEmail && user.memberId !== editingMemberId)
      : undefined

    if (duplicateNic) {
      setError('member.nic', {
        type: 'manual',
        message: 'මෙම NIC අංකය දැනටමත් පවතී',
      })
      setActiveStep(0)
      return
    }

    if (duplicateEmail) {
      setError('member.email', {
        type: 'manual',
        message: 'මෙම විද්‍යුත් තැපෑල වෙනත් සාමාජිකයෙකුට අයත්ය',
      })
      setActiveStep(0)
      return
    }

    if (duplicateUserEmail) {
      setError('member.email', {
        type: 'manual',
        message: 'මෙම විද්‍යුත් තැපෑල වෙනත් පරිශීලක ගිණුමකට අයත්ය',
      })
      setActiveStep(0)
      return
    }

    const memberId = editingMemberId ?? crypto.randomUUID()
    const timestamp = new Date().toISOString()

    const familyMembers = [
      ...relationshipStepMap
        .map(({ key, relationshipType }) => buildFamilyMember(memberId, relationshipType, values[key], timestamp))
        .filter((relative): relative is FamilyMember => Boolean(relative)),
      ...values.children
        .filter((child) => child.fullName)
        .map(
          (child) =>
            ({
              id: child.id ?? crypto.randomUUID(),
              memberId,
              relationshipType: 'CHILD',
              fullName: child.fullName,
              nic: child.nic,
              dateOfBirth: child.dateOfBirth,
              address: child.address,
              photoUrl: child.photoUrl,
              createdAt: child.createdAt ?? timestamp,
              updatedAt: timestamp,
            }) satisfies FamilyMember,
        ),
    ]

    const existingMember = members.find((member) => member.id === editingMemberId)

    const payload: CommunityMember = {
      id: memberId,
      familyMembers,
      createdAt: existingMember?.createdAt ?? timestamp,
      updatedAt: timestamp,
      ...values.member,
    }

    try {
      await upsertMemberRemote(payload, values.loginPassword || undefined)
      await insertAuditLogRemote(
        buildAuditEntry(
          currentUser.id,
          editingMemberId ? 'UPDATE' : 'CREATE',
          'MEMBER',
          memberId,
          editingMemberId ? 'සාමාජික වාර්තාව යාවත්කාලීන කරන ලදි' : 'නව සාමාජික වාර්තාවක් සුරකින ලදි',
        ),
      )
      await refreshDataFromSupabase(dispatch)
      enqueueSnackbar(editingMemberId ? 'සාමාජික දත්ත යාවත්කාලීන කරන ලදි' : 'සාමාජික දත්ත සුරකින ලදි', {
        variant: 'success',
      })
      setSelectedId(memberId)
      setIsDialogOpen(false)
    } catch {
      enqueueSnackbar('Supabase වෙත සාමාජික දත්ත සුරැකීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const handleDelete = async (memberId: string) => {
    if (!currentUser || !auth.hasRole(FULL_ACCESS_ROLES)) {
      enqueueSnackbar('මෙම ක්‍රියාව සඳහා ඔබට අවසර නොමැත', { variant: 'warning' })
      return
    }
    try {
      await deleteMemberRemote(memberId)
      await insertAuditLogRemote(buildAuditEntry(currentUser.id, 'DELETE', 'MEMBER', memberId, 'සාමාජිකයා ඉවත් කරන ලදි'))
      const remoteData = await refreshDataFromSupabase(dispatch)
      if (selectedId === memberId) {
        setSelectedId(remoteData.members[0]?.id ?? '')
      }
      enqueueSnackbar('සාමාජිකයා ඉවත් කරන ලදි', { variant: 'success' })
    } catch {
      enqueueSnackbar('Supabase වෙතින් සාමාජිකයා ඉවත් කිරීමට නොහැකි විය', { variant: 'error' })
    }
  }

  const confirmDelete = async () => {
    if (!memberToDelete) {
      return
    }
    await handleDelete(memberToDelete.id)
    setMemberToDelete(null)
  }

  const canMutate = auth.hasRole(FULL_ACCESS_ROLES)
  const canDelete = auth.hasRole(FULL_ACCESS_ROLES)
  const watchedValues = useWatch({ control, defaultValue: defaultValues })
  const reviewMember = watchedValues.member ?? defaultValues.member
  const reviewChildren = watchedValues.children ?? defaultValues.children

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' } }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            සාමාජිකයන් සහ පවුල් කළමනාකරණය
          </Typography>
          <Typography color="text.secondary">
            CRUD, wizard registration, family tree, NIC duplicate detection සහ responsive card/table
            දසුන.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => exportMembersToCsv(filteredMembers)}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => exportMembersToExcel(filteredMembers)}
          >
            Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreateDialog}
            disabled={!canMutate}
          >
            නව සාමාජිකයෙක්
          </Button>
        </Stack>
      </Stack>

      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="නම, NIC, සාමාජික අංකය, ලිපිනය හෝ ප්‍රදේශය"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {isMobile ? (
            <Stack spacing={2}>
              {filteredMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={2}>
                          <Avatar src={member.photoUrl}>{member.fullName.charAt(0)}</Avatar>
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontWeight: 700 }}>{member.fullName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.memberNumber} | {member.nic}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.area}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {ROLE_LABELS[member.systemRole]}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Chip label={member.activeStatus ? 'සක්‍රීය' : 'අක්‍රීය'} color="success" />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => openViewer(member.id)}>
                          බලන්න
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => openEditDialog(member)}
                          disabled={!canMutate}
                        >
                          සංස්කරණය
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Card>
              <CardContent sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>සාමාජික අංකය</TableCell>
                      <TableCell>නම</TableCell>
                      <TableCell>NIC</TableCell>
                      <TableCell>ප්‍රදේශය</TableCell>
                      <TableCell>භූමිකාව</TableCell>
                      <TableCell>තත්ත්වය</TableCell>
                      <TableCell align="right">ක්‍රියා</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id} hover selected={member.id === selectedId}>
                        <TableCell onClick={() => setSelectedId(member.id)}>{member.memberNumber}</TableCell>
                        <TableCell onClick={() => setSelectedId(member.id)}>{member.fullName}</TableCell>
                        <TableCell>{member.nic}</TableCell>
                        <TableCell>{member.area}</TableCell>
                        <TableCell>{ROLE_LABELS[member.systemRole]}</TableCell>
                        <TableCell>
                          <Chip label={member.activeStatus ? 'සක්‍රීය' : 'අක්‍රීය'} color="success" size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => openViewer(member.id)}>
                            <VisibilityOutlinedIcon />
                          </IconButton>
                          <IconButton disabled={!canMutate} onClick={() => openEditDialog(member)}>
                            <EditOutlinedIcon />
                          </IconButton>
                          <IconButton disabled={!canDelete} onClick={() => setMemberToDelete(member)}>
                            <DeleteOutlineOutlinedIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    පවුල් ව්‍යුහය
                  </Typography>
                  {selectedMember && (
                    <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => openViewer(selectedMember.id)}>
                      Single View
                    </Button>
                  )}
                </Stack>
                {selectedMember ? (
                  <>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <PhotoThumbnail
                        src={selectedMember.photoUrl}
                        alt={selectedMember.fullName}
                        fallback={selectedMember.fullName.charAt(0)}
                        size={80}
                        onClick={() => openPhotoPreview(selectedMember.photoUrl, selectedMember.fullName)}
                      />
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 700 }}>{selectedMember.fullName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedMember.memberNumber} | {selectedMember.nic}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedMember.phoneNumber} | {selectedMember.email || 'විද්‍යුත් තැපෑල නොමැත'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedMember.address}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {ROLE_LABELS[selectedMember.systemRole]}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Divider />
                    {selectedMember.familyMembers.map((familyMember) => (
                      <Stack
                        key={familyMember.id}
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems: 'center',
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          px: 2,
                          py: 1.5,
                        }}
                      >
                        <PhotoThumbnail
                          src={familyMember.photoUrl}
                          alt={familyMember.fullName}
                          fallback={familyMember.fullName.charAt(0)}
                          onClick={() => openPhotoPreview(familyMember.photoUrl, familyMember.fullName)}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>{familyMember.fullName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {familyMember.relationshipType}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {familyMember.dateOfBirth} | {familyMember.nic || 'NIC නොමැත'}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </>
                ) : (
                  <Typography color="text.secondary">සාමාජිකයෙකු තෝරන්න.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{editingMemberId ? 'සාමාජික සංස්කරණය' : 'නව සාමාජික ලියාපදිංචිය'}</DialogTitle>
        <DialogContent>
          <FormProvider {...methods}>
            <Stack component="form" spacing={3} onSubmit={handleSubmit(handleSave)} sx={{ pt: 1 }}>
              <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'}>
                {steps.map((step, index) => (
                  <Step key={step}>
                    <StepButton onClick={() => setActiveStep(index)}>
                      <StepLabel>{step}</StepLabel>
                    </StepButton>
                  </Step>
                ))}
              </Stepper>

              {activeStep === 0 && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.memberNumber" label="සාමාජික අංකය" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.fullName" label="සම්පූර්ණ නම" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.nic" label="NIC" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.dateOfBirth" label="උපන්දිනය" type="date" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="member.gender"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="ස්ත්‍රී/පුරුෂභාවය" fullWidth>
                          <MenuItem value="MALE">පිරිමි</MenuItem>
                          <MenuItem value="FEMALE">ගැහැණු</MenuItem>
                          <MenuItem value="OTHER">වෙනත්</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.area" label="ප්‍රදේශය" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="member.systemRole"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="භූමිකාව" fullWidth>
                          {ALL_USER_ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText name="member.phoneNumber" label="දුරකථන අංකය" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 12 }}>
                    <ControllerText name="member.email" label="විද්‍යුත් තැපෑල (විකල්ප)" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText
                      name="loginPassword"
                      label={editingMemberId ? 'නව පිවිසුම් මුරපදය (වෙනස් කරන්නේ නම්)' : 'පිවිසුම් මුරපදය'}
                      type="password"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ControllerText
                      name="confirmLoginPassword"
                      label={editingMemberId ? 'නව මුරපදය තහවුරු කරන්න' : 'මුරපදය තහවුරු කරන්න'}
                      type="password"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <ImageUploadField name="member.photoUrl" label="සාමාජික ඡායාරූපය" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <ControllerText name="member.address" label="ලිපිනය" multiline minRows={3} />
                  </Grid>
                </Grid>
              )}

              {activeStep > 0 && activeStep < 6 && (
                <RelativeFields
                  controlPrefix={relationshipStepMap[activeStep - 1].key}
                  title={relationshipStepMap[activeStep - 1].label}
                />
              )}

              {activeStep === 6 && (
                <Stack spacing={2}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      දරුවන්
                    </Typography>
                    <Button onClick={() => append(emptyRelative())}>නව දරුවෙකු එක් කරන්න</Button>
                  </Stack>
                  {fields.map((field, index) => (
                    <Card key={field.id} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <ControllerText name={`children.${index}.fullName`} label="නම" />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <ControllerText name={`children.${index}.nic`} label="NIC" />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <ControllerText name={`children.${index}.dateOfBirth`} label="උපන්දිනය" type="date" />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <ImageUploadField name={`children.${index}.photoUrl`} label={`දරුවා ${index + 1} ඡායාරූපය`} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <ControllerText name={`children.${index}.address`} label="ලිපිනය" multiline minRows={2} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Button color="error" onClick={() => remove(index)} disabled={fields.length === 1}>
                              දරුවා ඉවත් කරන්න
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}

              {activeStep === 7 && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        සුරැකීමට පෙර සමාලෝචනය
                      </Typography>
                      <Typography>{reviewMember.fullName}</Typography>
                      <Typography color="text.secondary">
                        {reviewMember.memberNumber} | {reviewMember.nic} | {reviewMember.area} | {ROLE_LABELS[reviewMember.systemRole ?? 'MEMBER']}
                      </Typography>
                      <Typography color="text.secondary">
                        {watchedValues.loginPassword ? 'නව පිවිසුම් මුරපදය සකසා ඇත' : editingMemberId ? 'පවතින මුරපදය එලෙසම තබයි' : 'පිවිසුම් මුරපදය සකසා නැත'}
                      </Typography>
                      <Typography color="text.secondary">
                        පවුල් වාර්තා: {relationshipStepMap.filter(({ key }) => watchedValues[key]?.fullName).length +
                          reviewChildren.filter((child) => child.fullName).length}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0}>
                  පෙර
                </Button>
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setIsDialogOpen(false)}>අවලංගු කරන්න</Button>
                  {activeStep === steps.length - 1 ? (
                    <Button type="submit" variant="contained">
                      සුරකින්න
                    </Button>
                  ) : (
                    <Button variant="contained" onClick={() => setActiveStep((current) => Math.min(current + 1, steps.length - 1))}>
                      ඊළඟ
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewerOpen} onClose={() => setIsViewerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>සාමාජික හා පවුල් තොරතුරු - Single View</DialogTitle>
        <DialogContent>
          {selectedMember ? (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                    <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'center' } }}>
                      <PhotoThumbnail
                        src={selectedMember.photoUrl}
                        alt={selectedMember.fullName}
                        fallback={selectedMember.fullName.charAt(0)}
                        size={120}
                        onClick={() => openPhotoPreview(selectedMember.photoUrl, selectedMember.fullName)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Click photo to view clearly
                      </Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          සම්පූර්ණ නම
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>{selectedMember.fullName}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          සාමාජික අංකය / NIC
                        </Typography>
                        <Typography>
                          {selectedMember.memberNumber} / {selectedMember.nic}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          උපන්දිනය / ස්ත්‍රී පුරුෂභාවය
                        </Typography>
                        <Typography>
                          {selectedMember.dateOfBirth} / {selectedMember.gender}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          දුරකථන / විද්‍යුත් තැපෑල
                        </Typography>
                        <Typography>
                          {selectedMember.phoneNumber} / {selectedMember.email || 'විද්‍යුත් තැපෑල නොමැත'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          ප්‍රදේශය / තත්ත්වය
                        </Typography>
                        <Typography>
                          {selectedMember.area} / {ROLE_LABELS[selectedMember.systemRole]} / {selectedMember.activeStatus ? 'සක්‍රීය' : 'අක්‍රීය'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          ලිපිනය
                        </Typography>
                        <Typography>{selectedMember.address}</Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  පවුල් සාමාජිකයන්
                </Typography>
                <Grid container spacing={2}>
                  {selectedMember.familyMembers.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography color="text.secondary">පවුල් වාර්තා නොමැත.</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {selectedMember.familyMembers.map((familyMember) => (
                    <Grid key={familyMember.id} size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                              <PhotoThumbnail
                                src={familyMember.photoUrl}
                                alt={familyMember.fullName}
                                fallback={familyMember.fullName.charAt(0)}
                                onClick={() => openPhotoPreview(familyMember.photoUrl, familyMember.fullName)}
                              />
                              <Typography variant="caption" color="text.secondary">
                                View photo
                              </Typography>
                            </Stack>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{familyMember.fullName}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {familyMember.relationshipType}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {familyMember.dateOfBirth} | {familyMember.nic || 'NIC නොමැත'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {familyMember.address}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Stack>
          ) : (
            <Typography color="text.secondary">සාමාජික තොරතුරු නොමැත.</Typography>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewPhoto)} onClose={() => setPreviewPhoto(null)} fullWidth maxWidth="sm">
        <DialogTitle>{previewPhoto?.title ?? 'Photo Preview'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, alignItems: 'center' }}>
            {previewPhoto?.src ? (
              <Box
                component="img"
                src={previewPhoto.src}
                alt={previewPhoto.title}
                sx={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                }}
              />
            ) : (
              <Stack
                sx={{
                  width: '100%',
                  minHeight: 320,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">No uploaded photo available for this person.</Typography>
              </Stack>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(memberToDelete)} onClose={() => setMemberToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>සාමාජික වාර්තාව ඉවත් කරන්නද?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {memberToDelete
              ? `"${memberToDelete.fullName}" ට අදාළ සාමාජික සහ සම්බන්ධිත වාර්තා ඉවත් කිරීමට අවශ්‍යද?`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberToDelete(null)}>අවලංගු කරන්න</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            ඉවත් කරන්න
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default MembersPage
