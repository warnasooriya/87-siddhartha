import type { AppDispatch, AppDataState } from '../store'
import { replaceData } from '../store'
import { supabase } from './supabase'
import { fetchAppDataFromSupabase } from './supabaseData'
import type {
  AppUser,
  AuditLog,
  CommunityMember,
  DocumentRecord,
  FinanceEntry,
  MemberProfileUpdateRequest,
  MonthlyFeeConfig,
  MonthlyFeePayment,
  SamithiReport,
  SystemSetting,
} from '../types/domain'

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

const buildInternalLoginEmail = (member: CommunityMember) => {
  const normalizedMemberNumber = member.memberNumber
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const fallbackKey = normalizedMemberNumber ? `${normalizedMemberNumber}-${member.id}` : member.id
  return `${fallbackKey}@members.samithiya.local`
}

export const refreshDataFromSupabase = async (dispatch: AppDispatch): Promise<AppDataState> => {
  const remoteData = await fetchAppDataFromSupabase()
  dispatch(replaceData(remoteData))
  return remoteData
}

export const setUserPasswordRemote = async (userId: string, password: string) => {
  const client = requireSupabase()
  const { error } = await client.rpc('set_user_password', {
    p_user_id: userId,
    p_password: password,
  })

  if (error) {
    throw error
  }
}

export const authenticateUserRemote = async (email: string, password: string): Promise<AppUser | null> => {
  const client = requireSupabase()
  const { data, error } = await client.rpc('verify_user_login', {
    p_email: email,
    p_password: password,
  })

  if (error) {
    throw error
  }

  const row = data?.[0]
  if (!row) {
    return null
  }

  return {
    id: row.id,
    memberId: row.member_id ?? undefined,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    activeStatus: row.active_status,
    createdAt: row.created_at,
    passwordConfigured: true,
  }
}

export const insertAuditLogRemote = async (auditLog: AuditLog) => {
  const client = requireSupabase()
  const { error } = await client.from('audit_logs').insert({
    id: auditLog.id,
    user_id: auditLog.userId || null,
    action: auditLog.action,
    entity_type: auditLog.entityType,
    entity_id: auditLog.entityId,
    description: auditLog.description,
    created_at: auditLog.createdAt,
  })
  if (error) {
    throw error
  }
}

export const upsertMemberRemote = async (member: CommunityMember, loginPassword?: string) => {
  const client = requireSupabase()
  const normalizedMemberEmail = member.email.trim()

  const { error: memberError } = await client.from('members').upsert({
    id: member.id,
    member_number: member.memberNumber,
    full_name: member.fullName,
    nic: member.nic,
    date_of_birth: member.dateOfBirth,
    gender: member.gender,
    address: member.address,
    phone_number: member.phoneNumber,
    email: normalizedMemberEmail,
    area: member.area,
    system_role: member.systemRole,
    photo_url: member.photoUrl ?? null,
    active_status: member.activeStatus,
    created_at: member.createdAt,
    updated_at: member.updatedAt,
  })

  if (memberError) {
    throw memberError
  }

  const { data: existingUserRows, error: existingUserError } = await client
    .from('users')
    .select('id, email, created_at')
    .eq('member_id', member.id)
    .limit(1)

  if (existingUserError) {
    throw existingUserError
  }

  let existingUser = existingUserRows?.[0]

  if (!existingUser && normalizedMemberEmail) {
    const { data: matchingEmailUsers, error: matchingEmailUserError } = await client
      .from('users')
      .select('id, email, created_at')
      .ilike('email', normalizedMemberEmail)
      .limit(1)

    if (matchingEmailUserError) {
      throw matchingEmailUserError
    }

    existingUser = matchingEmailUsers?.[0]
  }

  const nextUserEmail = normalizedMemberEmail || existingUser?.email || buildInternalLoginEmail(member)
  const nextUser: AppUser = {
    id: existingUser?.id ?? crypto.randomUUID(),
    memberId: member.id,
    fullName: member.fullName,
    email: nextUserEmail,
    role: member.systemRole,
    activeStatus: member.activeStatus,
    createdAt: existingUser?.created_at ?? member.createdAt,
  }

  const { error: userError } = await client.from('users').upsert(nextUser && {
    id: nextUser.id,
    member_id: nextUser.memberId,
    full_name: nextUser.fullName,
    email: nextUser.email,
    role: nextUser.role,
    active_status: nextUser.activeStatus,
    created_at: nextUser.createdAt,
  })

  if (userError) {
    throw userError
  }

  if (loginPassword) {
    await setUserPasswordRemote(nextUser.id, loginPassword)
  }

  const { data: existingFamilyRows, error: existingFamilyError } = await client
    .from('family_members')
    .select('id')
    .eq('member_id', member.id)

  if (existingFamilyError) {
    throw existingFamilyError
  }

  if (member.familyMembers.length > 0) {
    const { error: familyError } = await client.from('family_members').upsert(
      member.familyMembers.map((familyMember) => ({
        id: familyMember.id,
        member_id: member.id,
        relationship_type: familyMember.relationshipType,
        full_name: familyMember.fullName,
        nic: familyMember.nic || null,
        date_of_birth: familyMember.dateOfBirth || null,
        address: familyMember.address || null,
        photo_url: familyMember.photoUrl ?? null,
        created_at: familyMember.createdAt,
        updated_at: familyMember.updatedAt,
      })),
      { onConflict: 'id' },
    )
    if (familyError) {
      throw familyError
    }
  }

  const nextFamilyIds = new Set(member.familyMembers.map((familyMember) => familyMember.id))
  const familyIdsToDelete = (existingFamilyRows ?? [])
    .map((row) => String(row.id))
    .filter((existingId) => !nextFamilyIds.has(existingId))

  if (familyIdsToDelete.length > 0) {
    const { error: deleteFamilyError } = await client.from('family_members').delete().in('id', familyIdsToDelete)
    if (deleteFamilyError) {
      throw deleteFamilyError
    }
  }
}

export const deleteMemberRemote = async (memberId: string) => {
  const client = requireSupabase()
  const { error: userDeleteError } = await client.from('users').delete().eq('member_id', memberId)
  if (userDeleteError) {
    throw userDeleteError
  }
  const { error } = await client.from('members').delete().eq('id', memberId)
  if (error) {
    throw error
  }
}

export const insertDocumentRemote = async (document: DocumentRecord, uploadedByUserId: string) => {
  const client = requireSupabase()
  const { error } = await client.from('documents').insert({
    id: document.id,
    member_id: document.memberId,
    family_member_id: document.familyMemberId ?? null,
    document_type: document.documentType,
    file_name: document.fileName,
    file_url: document.fileUrl,
    uploaded_by: uploadedByUserId,
    uploaded_at: document.uploadedAt,
    version: document.version,
  })
  if (error) {
    throw error
  }
}

export const deleteDocumentRemote = async (documentId: string) => {
  const client = requireSupabase()
  const { error } = await client.from('documents').delete().eq('id', documentId)
  if (error) {
    throw error
  }
}

export const insertSamithiReportRemote = async (report: SamithiReport) => {
  const client = requireSupabase()
  const { error } = await client.from('samithi_reports').insert({
    id: report.id,
    title: report.title,
    meeting_date: report.meetingDate,
    description: report.description,
    file_name: report.fileName,
    file_url: report.fileUrl,
    uploaded_by: report.uploadedBy,
    uploaded_at: report.uploadedAt,
  })
  if (error) {
    throw error
  }
}

export const upsertMonthlyFeeConfigRemote = async (config: MonthlyFeeConfig) => {
  const client = requireSupabase()
  const { error } = await client.from('monthly_fee_configs').upsert({
    id: config.id,
    title: config.title,
    amount: config.amount,
    due_day: config.dueDay,
    effective_month: config.effectiveMonth,
    notes: config.notes,
    is_active: config.isActive,
  })
  if (error) {
    throw error
  }
}

export const upsertMonthlyFeePaymentRemote = async (payment: MonthlyFeePayment) => {
  const client = requireSupabase()
  const { error } = await client.from('monthly_fee_payments').upsert({
    id: payment.id,
    member_id: payment.memberId,
    config_id: payment.configId,
    fee_month: payment.feeMonth,
    amount: payment.amount,
    paid_date: payment.paidDate,
    status: payment.status,
    collected_by: payment.collectedBy,
    note: payment.note ?? null,
  })
  if (error) {
    throw error
  }
}

export const insertFinanceEntryRemote = async (entry: FinanceEntry) => {
  const client = requireSupabase()
  const { error } = await client.from('finance_entries').insert({
    id: entry.id,
    entry_type: entry.entryType,
    title: entry.title,
    amount: entry.amount,
    entry_date: entry.entryDate,
    category: entry.category,
    note: entry.note ?? null,
    received_by: entry.receivedBy ?? null,
    created_by: entry.createdBy,
    created_at: entry.createdAt,
  })
  if (error) {
    throw error
  }
}

export const updateSettingsRemote = async (settings: SystemSetting[]) => {
  const client = requireSupabase()
  const { error } = await client.from('system_settings').upsert(
    settings.map((setting) => ({
      id: setting.id,
      setting_key: setting.settingKey,
      setting_value: setting.settingValue,
    })),
  )
  if (error) {
    throw error
  }
}

export const insertMemberProfileUpdateRequestRemote = async (request: MemberProfileUpdateRequest) => {
  const client = requireSupabase()
  const { error } = await client.from('member_profile_update_requests').insert({
    id: request.id,
    member_id: request.memberId,
    requested_by_user_id: request.requestedByUserId,
    requested_by_name: request.requestedByName,
    full_name: request.fullName,
    date_of_birth: request.dateOfBirth,
    phone_number: request.phoneNumber,
    email: request.email,
    address: request.address,
    area: request.area,
    photo_url: request.photoUrl ?? null,
    status: request.status,
    reviewed_by_user_id: request.reviewedByUserId ?? null,
    reviewed_at: request.reviewedAt ?? null,
    created_at: request.createdAt,
  })
  if (error) {
    throw error
  }
}

export const approveMemberProfileUpdateRequestRemote = async (
  request: MemberProfileUpdateRequest,
  reviewerUserId: string,
) => {
  const client = requireSupabase()
  const reviewedAt = new Date().toISOString()

  const { data: memberRow, error: memberLookupError } = await client
    .from('members')
    .select('id, member_number, nic, gender, active_status, created_at')
    .eq('id', request.memberId)
    .single()

  if (memberLookupError) {
    throw memberLookupError
  }

  const { error: memberError } = await client
    .from('members')
    .update({
      full_name: request.fullName,
      date_of_birth: request.dateOfBirth,
      phone_number: request.phoneNumber,
      email: request.email,
      address: request.address,
      area: request.area,
      photo_url: request.photoUrl ?? null,
      updated_at: reviewedAt,
    })
    .eq('id', request.memberId)

  if (memberError) {
    throw memberError
  }

  const { data: linkedUsers, error: userLookupError } = await client
    .from('users')
    .select('id, role, active_status, created_at')
    .eq('member_id', request.memberId)

  if (userLookupError) {
    throw userLookupError
  }

  const linkedUser = linkedUsers?.[0]
  const { error: userError } = await client.from('users').upsert({
    id: linkedUser?.id ?? request.requestedByUserId,
    member_id: request.memberId,
    full_name: request.fullName,
    email: request.email,
    role: linkedUser?.role ?? 'MEMBER',
    active_status: linkedUser?.active_status ?? memberRow.active_status,
    created_at: linkedUser?.created_at ?? memberRow.created_at,
  })

  if (userError) {
    throw userError
  }

  const { error: requestError } = await client
    .from('member_profile_update_requests')
    .update({
      status: 'APPROVED',
      reviewed_by_user_id: reviewerUserId,
      reviewed_at: reviewedAt,
    })
    .eq('id', request.id)

  if (requestError) {
    throw requestError
  }
}

export const rejectMemberProfileUpdateRequestRemote = async (requestId: string, reviewerUserId: string) => {
  const client = requireSupabase()
  const { error } = await client
    .from('member_profile_update_requests')
    .update({
      status: 'REJECTED',
      reviewed_by_user_id: reviewerUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) {
    throw error
  }
}
