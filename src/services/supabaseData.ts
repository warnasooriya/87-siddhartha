import type {
  AppUser,
  AuditLog,
  CommunityMember,
  DocumentRecord,
  EmailRecipient,
  FamilyMember,
  FinanceEntry,
  MemberProfileUpdateRequest,
  MonthlyFeeConfig,
  MonthlyFeePayment,
  SamithiReport,
  SystemSetting,
} from '../types/domain'
import type { AppDataState } from '../store'
import { isSupabaseConfigured, supabase } from './supabase'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const emptyDataState = (): AppDataState => ({
  members: [],
  documents: [],
  auditLogs: [],
  users: [],
  emailRecipients: [],
  settings: [],
  samithiReports: [],
  monthlyFeeConfigs: [],
  monthlyFeePayments: [],
  financeEntries: [],
  profileUpdateRequests: [],
})

const isUuid = (value: string) => uuidPattern.test(value)

const buildIdMap = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, isUuid(item.id) ? item.id : crypto.randomUUID()]))

export const hasMeaningfulSupabaseData = (data: AppDataState) =>
  Object.values(data).some((value) => Array.isArray(value) && value.length > 0)

export const normalizeAppDataForSupabase = (data: AppDataState): AppDataState => {
  const userIdMap = buildIdMap(data.users)
  const memberIdMap = buildIdMap(data.members)
  const familyMembers = data.members.flatMap((member) => member.familyMembers)
  const familyIdMap = buildIdMap(familyMembers)
  const documentIdMap = buildIdMap(data.documents)
  const emailRecipientIdMap = buildIdMap(data.emailRecipients)
  const settingIdMap = buildIdMap(data.settings)
  const auditIdMap = buildIdMap(data.auditLogs)
  const reportIdMap = buildIdMap(data.samithiReports)
  const feeConfigIdMap = buildIdMap(data.monthlyFeeConfigs)
  const feePaymentIdMap = buildIdMap(data.monthlyFeePayments)
  const financeIdMap = buildIdMap(data.financeEntries)
  const profileUpdateRequestIdMap = buildIdMap(data.profileUpdateRequests)

  const users = data.users.map((user) => ({
    ...user,
    id: userIdMap.get(user.id) ?? user.id,
    memberId: user.memberId ? memberIdMap.get(user.memberId) ?? user.memberId : undefined,
  }))

  const members = data.members.map((member) => {
    const nextMemberId = memberIdMap.get(member.id) ?? member.id
    return {
      ...member,
      id: nextMemberId,
      familyMembers: member.familyMembers.map((familyMember) => ({
        ...familyMember,
        id: familyIdMap.get(familyMember.id) ?? familyMember.id,
        memberId: nextMemberId,
      })),
    }
  })

  const documents = data.documents.map((document) => ({
    ...document,
    id: documentIdMap.get(document.id) ?? document.id,
    memberId: memberIdMap.get(document.memberId) ?? document.memberId,
    familyMemberId: document.familyMemberId
      ? familyIdMap.get(document.familyMemberId) ?? document.familyMemberId
      : undefined,
  }))

  const auditLogs = data.auditLogs.map((auditLog) => ({
    ...auditLog,
    id: auditIdMap.get(auditLog.id) ?? auditLog.id,
    userId: userIdMap.get(auditLog.userId) ?? auditLog.userId,
  }))

  const monthlyFeeConfigs = data.monthlyFeeConfigs.map((config) => ({
    ...config,
    id: feeConfigIdMap.get(config.id) ?? config.id,
  }))

  const monthlyFeePayments = data.monthlyFeePayments.map((payment) => ({
    ...payment,
    id: feePaymentIdMap.get(payment.id) ?? payment.id,
    memberId: memberIdMap.get(payment.memberId) ?? payment.memberId,
    configId: feeConfigIdMap.get(payment.configId) ?? payment.configId,
  }))

  return {
    members,
    documents,
    auditLogs,
    users,
    emailRecipients: data.emailRecipients.map((item) => ({
      ...item,
      id: emailRecipientIdMap.get(item.id) ?? item.id,
    })),
    settings: data.settings.map((item) => ({
      ...item,
      id: settingIdMap.get(item.id) ?? item.id,
    })),
    samithiReports: data.samithiReports.map((item) => ({
      ...item,
      id: reportIdMap.get(item.id) ?? item.id,
    })),
    monthlyFeeConfigs,
    monthlyFeePayments,
    financeEntries: data.financeEntries.map((item) => ({
      ...item,
      id: financeIdMap.get(item.id) ?? item.id,
    })),
    profileUpdateRequests: data.profileUpdateRequests.map((item) => ({
      ...item,
      id: profileUpdateRequestIdMap.get(item.id) ?? item.id,
      memberId: memberIdMap.get(item.memberId) ?? item.memberId,
      requestedByUserId: userIdMap.get(item.requestedByUserId) ?? item.requestedByUserId,
      reviewedByUserId: item.reviewedByUserId ? userIdMap.get(item.reviewedByUserId) ?? item.reviewedByUserId : undefined,
    })),
  }
}

export const fetchAppDataFromSupabase = async (): Promise<AppDataState> => {
  if (!isSupabaseConfigured || !supabase) {
    return emptyDataState()
  }

  const [
    usersResult,
    membersResult,
    familyMembersResult,
    documentsResult,
    emailRecipientsResult,
    settingsResult,
    auditLogsResult,
    samithiReportsResult,
    monthlyFeeConfigsResult,
    monthlyFeePaymentsResult,
    financeEntriesResult,
    profileUpdateRequestsResult,
  ] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: true }),
    supabase.from('members').select('*').order('created_at', { ascending: false }),
    supabase.from('family_members').select('*').order('created_at', { ascending: true }),
    supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('email_recipients').select('*').order('created_at', { ascending: true }),
    supabase.from('system_settings').select('*').order('setting_key', { ascending: true }),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('samithi_reports').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('monthly_fee_configs').select('*').order('effective_month', { ascending: false }),
    supabase.from('monthly_fee_payments').select('*').order('paid_date', { ascending: false }),
    supabase.from('finance_entries').select('*').order('entry_date', { ascending: false }),
    supabase.from('member_profile_update_requests').select('*').order('created_at', { ascending: false }),
  ])

  const firstError = [
    usersResult.error,
    membersResult.error,
    familyMembersResult.error,
    documentsResult.error,
    emailRecipientsResult.error,
    settingsResult.error,
    auditLogsResult.error,
    samithiReportsResult.error,
    monthlyFeeConfigsResult.error,
    monthlyFeePaymentsResult.error,
    financeEntriesResult.error,
    profileUpdateRequestsResult.error,
  ].find(Boolean)

  if (firstError) {
    throw firstError
  }

  const users = (usersResult.data ?? []).map(
    (row): AppUser => ({
      id: row.id,
      memberId: row.member_id ?? undefined,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      activeStatus: row.active_status,
      createdAt: row.created_at,
      passwordConfigured: Boolean(row.password_hash),
    }),
  )
  const userNameById = new Map(users.map((user) => [user.id, user.fullName]))
  const familyMembers = (familyMembersResult.data ?? []).map(
    (row): FamilyMember => ({
      id: row.id,
      memberId: row.member_id,
      relationshipType: row.relationship_type,
      fullName: row.full_name,
      nic: row.nic ?? '',
      dateOfBirth: row.date_of_birth ?? '',
      address: row.address ?? '',
      photoUrl: row.photo_url ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  )
  const familyByMemberId = new Map<string, FamilyMember[]>()
  familyMembers.forEach((familyMember) => {
    familyByMemberId.set(familyMember.memberId, [...(familyByMemberId.get(familyMember.memberId) ?? []), familyMember])
  })

  return {
    users,
    members: (membersResult.data ?? []).map(
      (row): CommunityMember => ({
        id: row.id,
        memberNumber: row.member_number,
        fullName: row.full_name,
        nic: row.nic,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        address: row.address,
        phoneNumber: row.phone_number,
        email: row.email,
        photoUrl: row.photo_url ?? undefined,
        activeStatus: row.active_status,
        area: row.area,
        systemRole: row.system_role ?? 'MEMBER',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        familyMembers: familyByMemberId.get(row.id) ?? [],
      }),
    ),
    documents: (documentsResult.data ?? []).map(
      (row): DocumentRecord => ({
        id: row.id,
        memberId: row.member_id,
        familyMemberId: row.family_member_id ?? undefined,
        documentType: row.document_type,
        fileName: row.file_name,
        fileUrl: row.file_url,
        uploadedBy: userNameById.get(row.uploaded_by ?? '') ?? '',
        uploadedAt: row.uploaded_at,
        version: row.version,
      }),
    ),
    auditLogs: (auditLogsResult.data ?? []).map(
      (row): AuditLog => ({
        id: row.id,
        userId: row.user_id ?? '',
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        description: row.description,
        createdAt: row.created_at,
      }),
    ),
    emailRecipients: (emailRecipientsResult.data ?? []).map(
      (row): EmailRecipient => ({
        id: row.id,
        email: row.email,
        enabled: row.enabled,
        createdAt: row.created_at,
      }),
    ),
    settings: (settingsResult.data ?? []).map(
      (row): SystemSetting => ({
        id: row.id,
        settingKey: row.setting_key,
        settingValue: row.setting_value,
      }),
    ),
    samithiReports: (samithiReportsResult.data ?? []).map(
      (row): SamithiReport => ({
        id: row.id,
        title: row.title,
        meetingDate: row.meeting_date,
        description: row.description,
        fileName: row.file_name,
        fileUrl: row.file_url,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
      }),
    ),
    monthlyFeeConfigs: (monthlyFeeConfigsResult.data ?? []).map(
      (row): MonthlyFeeConfig => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        dueDay: row.due_day,
        effectiveMonth: row.effective_month,
        notes: row.notes,
        isActive: row.is_active,
      }),
    ),
    monthlyFeePayments: (monthlyFeePaymentsResult.data ?? []).map(
      (row): MonthlyFeePayment => ({
        id: row.id,
        memberId: row.member_id,
        configId: row.config_id,
        feeMonth: row.fee_month,
        amount: Number(row.amount),
        paidDate: row.paid_date,
        status: row.status,
        collectedBy: row.collected_by,
        note: row.note ?? undefined,
      }),
    ),
    financeEntries: (financeEntriesResult.data ?? []).map(
      (row): FinanceEntry => ({
        id: row.id,
        entryType: row.entry_type,
        title: row.title,
        amount: Number(row.amount),
        entryDate: row.entry_date,
        category: row.category,
        note: row.note ?? undefined,
        receivedBy: row.received_by ?? undefined,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }),
    ),
    profileUpdateRequests: (profileUpdateRequestsResult.data ?? []).map(
      (row): MemberProfileUpdateRequest => ({
        id: row.id,
        memberId: row.member_id,
        requestedByUserId: row.requested_by_user_id,
        requestedByName: row.requested_by_name,
        fullName: row.full_name,
        dateOfBirth: row.date_of_birth,
        phoneNumber: row.phone_number,
        email: row.email,
        address: row.address,
        area: row.area,
        photoUrl: row.photo_url ?? undefined,
        status: row.status,
        reviewedByUserId: row.reviewed_by_user_id ?? undefined,
        reviewedAt: row.reviewed_at ?? undefined,
        createdAt: row.created_at,
      }),
    ),
  }
}

const reconcileTable = async (table: string, rows: Record<string, unknown>[]) => {
  if (!supabase) {
    return
  }

  const { data: existingRows, error: existingError } = await supabase.from(table).select('id')
  if (existingError) {
    // #region debug-point B:reconcile-select-error
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:325:${table}`, msg: '[DEBUG] reconcile select failed', data: { table, error: existingError.message }, ts: Date.now() }) }).catch(() => {})
    // #endregion
    throw existingError
  }

  const existingIds = (existingRows ?? []).map((row) => String(row.id))
  const nextIds = rows.map((row) => String(row.id))
  const idsToDelete = existingIds.filter((id) => !nextIds.includes(id))
  // #region debug-point B:reconcile-plan
  fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:333:${table}`, msg: '[DEBUG] reconcile plan prepared', data: { table, existingCount: existingIds.length, nextCount: nextIds.length, deleteCount: idsToDelete.length }, ts: Date.now() }) }).catch(() => {})
  // #endregion

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
    if (error) {
      // #region debug-point B:reconcile-upsert-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:339:${table}`, msg: '[DEBUG] reconcile upsert failed', data: { table, error: error.message, rowCount: rows.length }, ts: Date.now() }) }).catch(() => {})
      // #endregion
      throw error
    }
    // #region debug-point B:reconcile-upsert-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:343:${table}`, msg: '[DEBUG] reconcile upsert succeeded', data: { table, rowCount: rows.length }, ts: Date.now() }) }).catch(() => {})
    // #endregion
  }

  if (idsToDelete.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', idsToDelete)
    if (error) {
      // #region debug-point B:reconcile-delete-error
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:349:${table}`, msg: '[DEBUG] reconcile delete failed', data: { table, error: error.message, deleteCount: idsToDelete.length }, ts: Date.now() }) }).catch(() => {})
      // #endregion
      throw error
    }
    // #region debug-point B:reconcile-delete-success
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'supabase-sync-bug', runId: 'pre-fix', hypothesisId: 'B', location: `supabaseData.ts:353:${table}`, msg: '[DEBUG] reconcile delete succeeded', data: { table, deleteCount: idsToDelete.length }, ts: Date.now() }) }).catch(() => {})
    // #endregion
  }
}

export const syncAppDataToSupabase = async (data: AppDataState) => {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const users = data.users.map((user) => ({
    id: user.id,
    member_id: user.memberId ?? null,
    full_name: user.fullName,
    email: user.email,
    role: user.role,
    active_status: user.activeStatus,
    created_at: user.createdAt,
  }))
  const userIdByName = new Map(users.map((user) => [user.full_name, user.id]))

  const members = data.members.map((member) => ({
    id: member.id,
    member_number: member.memberNumber,
    full_name: member.fullName,
    nic: member.nic,
    date_of_birth: member.dateOfBirth,
    gender: member.gender,
    address: member.address,
    phone_number: member.phoneNumber,
    email: member.email,
    area: member.area,
    system_role: member.systemRole,
    photo_url: member.photoUrl ?? null,
    active_status: member.activeStatus,
    created_at: member.createdAt,
    updated_at: member.updatedAt,
  }))
  const familyMembers = data.members.flatMap((member) =>
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
  )
  const documents = data.documents.map((document) => ({
    id: document.id,
    member_id: document.memberId,
    family_member_id: document.familyMemberId ?? null,
    document_type: document.documentType,
    file_name: document.fileName,
    file_url: document.fileUrl,
    uploaded_by: userIdByName.get(document.uploadedBy) ?? null,
    uploaded_at: document.uploadedAt,
    version: document.version,
  }))
  const emailRecipients = data.emailRecipients.map((item) => ({
    id: item.id,
    email: item.email,
    enabled: item.enabled,
    created_at: item.createdAt,
  }))
  const settings = data.settings.map((item) => ({
    id: item.id,
    setting_key: item.settingKey,
    setting_value: item.settingValue,
  }))
  const samithiReports = data.samithiReports.map((item) => ({
    id: item.id,
    title: item.title,
    meeting_date: item.meetingDate,
    description: item.description,
    file_name: item.fileName,
    file_url: item.fileUrl,
    uploaded_by: item.uploadedBy,
    uploaded_at: item.uploadedAt,
  }))
  const monthlyFeeConfigs = data.monthlyFeeConfigs.map((item) => ({
    id: item.id,
    title: item.title,
    amount: item.amount,
    due_day: item.dueDay,
    effective_month: item.effectiveMonth,
    notes: item.notes,
    is_active: item.isActive,
  }))
  const monthlyFeePayments = data.monthlyFeePayments.map((item) => ({
    id: item.id,
    member_id: item.memberId,
    config_id: item.configId,
    fee_month: item.feeMonth,
    amount: item.amount,
    paid_date: item.paidDate,
    status: item.status,
    collected_by: item.collectedBy,
    note: item.note ?? null,
  }))
  const financeEntries = data.financeEntries.map((item) => ({
    id: item.id,
    entry_type: item.entryType,
    title: item.title,
    amount: item.amount,
    entry_date: item.entryDate,
    category: item.category,
    note: item.note ?? null,
    received_by: item.receivedBy ?? null,
    created_by: item.createdBy,
    created_at: item.createdAt,
  }))
  const auditLogs = data.auditLogs.map((item) => ({
    id: item.id,
    user_id: item.userId || null,
    action: item.action,
    entity_type: item.entityType,
    entity_id: item.entityId,
    description: item.description,
    created_at: item.createdAt,
  }))
  const profileUpdateRequests = data.profileUpdateRequests.map((item) => ({
    id: item.id,
    member_id: item.memberId,
    requested_by_user_id: item.requestedByUserId,
    requested_by_name: item.requestedByName,
    full_name: item.fullName,
    date_of_birth: item.dateOfBirth,
    phone_number: item.phoneNumber,
    email: item.email,
    address: item.address,
    area: item.area,
    photo_url: item.photoUrl ?? null,
    status: item.status,
    reviewed_by_user_id: item.reviewedByUserId ?? null,
    reviewed_at: item.reviewedAt ?? null,
    created_at: item.createdAt,
  }))

  await reconcileTable('users', users)
  await reconcileTable('members', members)
  await reconcileTable('family_members', familyMembers)
  await reconcileTable('documents', documents)
  await reconcileTable('email_recipients', emailRecipients)
  await reconcileTable('system_settings', settings)
  await reconcileTable('samithi_reports', samithiReports)
  await reconcileTable('monthly_fee_configs', monthlyFeeConfigs)
  await reconcileTable('monthly_fee_payments', monthlyFeePayments)
  await reconcileTable('finance_entries', financeEntries)
  await reconcileTable('audit_logs', auditLogs)
  await reconcileTable('member_profile_update_requests', profileUpdateRequests)
}
