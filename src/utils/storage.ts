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
  SamithiConstitution,
  SamithiReport,
  SystemSetting,
} from '../types/domain'

type StorageShape = {
  members: CommunityMember[]
  documents: DocumentRecord[]
  auditLogs: AuditLog[]
  users: AppUser[]
  emailRecipients: EmailRecipient[]
  settings: SystemSetting[]
  samithiReports: SamithiReport[]
  samithiConstitutions: SamithiConstitution[]
  monthlyFeeConfigs: MonthlyFeeConfig[]
  monthlyFeePayments: MonthlyFeePayment[]
  financeEntries: FinanceEntry[]
  profileUpdateRequests: MemberProfileUpdateRequest[]
}

const STORAGE_KEY = 'community-family-management-system'

const now = new Date().toISOString()

const family = (
  id: string,
  memberId: string,
  relationshipType: FamilyMember['relationshipType'],
  fullName: string,
  nic: string,
  dateOfBirth: string,
  address: string,
): FamilyMember => ({
  id,
  memberId,
  relationshipType,
  fullName,
  nic,
  dateOfBirth,
  address,
  createdAt: now,
  updatedAt: now,
})

const seedMembers: CommunityMember[] = [
  {
    id: 'member-1',
    memberNumber: 'SAM-0001',
    fullName: 'අනුරාධ ජයසිංහ',
    nic: '880123456V',
    dateOfBirth: '1988-07-12',
    gender: 'MALE',
    address: 'ගාල්ල පාර, මොරටුව',
    phoneNumber: '0711234567',
    email: 'anuradha@example.com',
    photoUrl:
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20Sri%20Lankan%20community%20leader%20portrait%2C%20formal%20shirt%2C%20natural%20lighting&image_size=square_hd',
    activeStatus: true,
    area: 'මොරටුව',
    systemRole: 'MEMBER',
    createdAt: now,
    updatedAt: now,
    familyMembers: [
      family('family-1', 'member-1', 'SPOUSE', 'සචිනි ජයසිංහ', '907654321V', '1990-10-03', 'ගාල්ල පාර, මොරටුව'),
      family('family-2', 'member-1', 'MOTHER', 'මංගලා ජයසිංහ', '616789123V', '1961-03-20', 'මොරටුව'),
      family('family-3', 'member-1', 'FATHER', 'නිමල් ජයසිංහ', '585555444V', '1958-11-08', 'මොරටුව'),
      family('family-4', 'member-1', 'CHILD', 'හේෂාන් ජයසිංහ', '202001200123', '2020-01-20', 'මොරටුව'),
    ],
  },
  {
    id: 'member-2',
    memberNumber: 'SAM-0002',
    fullName: 'දුලානි පෙරේරා',
    nic: '927700123V',
    dateOfBirth: '1992-04-22',
    gender: 'FEMALE',
    address: 'කඩවත, ගම්පහ',
    phoneNumber: '0775552211',
    email: 'dulani@example.com',
    photoUrl:
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20Sri%20Lankan%20woman%20portrait%2C%20community%20management%20staff%2C%20soft%20natural%20light&image_size=square_hd',
    activeStatus: true,
    area: 'ගම්පහ',
    systemRole: 'MEMBER',
    createdAt: now,
    updatedAt: now,
    familyMembers: [
      family('family-5', 'member-2', 'MOTHER', 'කුසුම් පෙරේරා', '657770000V', '1965-09-16', 'ගම්පහ'),
      family('family-6', 'member-2', 'FATHER', 'ජයන්ත පෙරේරා', '607771234V', '1960-08-01', 'ගම්පහ'),
    ],
  },
]

const seedUsers: AppUser[] = [
  {
    id: 'user-1',
    fullName: 'ප්‍රධාන පරිපාලක',
    email: 'admin@samithiya.lk',
    role: 'ADMIN',
    activeStatus: true,
    createdAt: now,
  },
  {
    id: 'user-2',
    fullName: 'සභාපති',
    email: 'president@samithiya.lk',
    role: 'PRESIDENT',
    activeStatus: true,
    createdAt: now,
  },
  {
    id: 'user-3',
    fullName: 'ලේකම්',
    email: 'secretary@samithiya.lk',
    role: 'SECRETARY',
    activeStatus: true,
    createdAt: now,
  },
  {
    id: 'user-4',
    fullName: 'භාණ්ඩාගාරික',
    email: 'treasurer@samithiya.lk',
    role: 'TREASURER',
    activeStatus: true,
    createdAt: now,
  },
  {
    id: 'user-5',
    memberId: 'member-1',
    fullName: 'අනුරාධ ජයසිංහ',
    email: 'anuradha@example.com',
    role: 'MEMBER',
    activeStatus: true,
    createdAt: now,
  },
  {
    id: 'user-6',
    memberId: 'member-2',
    fullName: 'දුලානි පෙරේරා',
    email: 'dulani@example.com',
    role: 'MEMBER',
    activeStatus: true,
    createdAt: now,
  },
]

const seedDocuments: DocumentRecord[] = [
  {
    id: 'doc-1',
    memberId: 'member-1',
    documentType: 'NIC',
    fileName: 'anuradha-nic.pdf',
    fileUrl: '#',
    uploadedBy: 'ප්‍රධාන පරිපාලක',
    uploadedAt: now,
    version: 1,
  },
  {
    id: 'doc-2',
    memberId: 'member-2',
    documentType: 'Membership Application',
    fileName: 'dulani-membership.pdf',
    fileUrl: '#',
    uploadedBy: 'දත්ත ඇතුළත් කිරීමේ නිලධාරී',
    uploadedAt: now,
    version: 2,
  },
]

const seedAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'user-1',
    action: 'LOGIN',
    entityType: 'AUTH',
    entityId: 'user-1',
    description: 'පරිපාලක පද්ධතියට පිවිසියේය',
    createdAt: now,
  },
  {
    id: 'audit-2',
    userId: 'user-1',
    action: 'CREATE',
    entityType: 'MEMBER',
    entityId: 'member-1',
    description: 'නව සාමාජික වාර්තාවක් සුරකින ලදි',
    createdAt: now,
  },
]

const seedEmailRecipients: EmailRecipient[] = [
  { id: 'recipient-1', email: 'committee@samithiya.lk', enabled: true, createdAt: now },
  { id: 'recipient-2', email: 'birthdays@samithiya.lk', enabled: true, createdAt: now },
]

const seedSettings: SystemSetting[] = [
  { id: 'setting-1', settingKey: 'sender_email', settingValue: 'no-reply@samithiya.lk' },
  { id: 'setting-2', settingKey: 'sender_name', settingValue: 'සමිතිකරණ පද්ධතිය' },
  { id: 'setting-3', settingKey: 'reminder_schedule', settingValue: '30,14,7,3,1,0' },
]

const seedSamithiReports: SamithiReport[] = [
  {
    id: 'report-1',
    title: 'මාසික සමිති වාර්තාව - ජනවාරි',
    meetingDate: '2026-01-15',
    description: 'මාසික රැස්වීමේ තීරණ සහ වියදම් සාරාංශය.',
    fileName: 'samithi-january-report.pdf',
    fileUrl: '#',
    uploadedBy: 'ප්‍රධාන පරිපාලක',
    uploadedAt: now,
  },
]

const seedSamithiConstitutions: SamithiConstitution[] = []

const seedMonthlyFeeConfigs: MonthlyFeeConfig[] = [
  {
    id: 'fee-config-1',
    title: 'සාමාජික මාසික ගාස්තුව',
    amount: 250,
    dueDay: 10,
    effectiveMonth: '2026-01',
    notes: 'සියලුම ප්‍රධාන සාමාජිකයන් සඳහා අදාළයි.',
    isActive: true,
  },
]

const seedMonthlyFeePayments: MonthlyFeePayment[] = [
  {
    id: 'payment-1',
    memberId: 'member-1',
    configId: 'fee-config-1',
    feeMonth: '2026-06',
    amount: 250,
    paidDate: now,
    status: 'PAID',
    collectedBy: 'ප්‍රධාන පරිපාලක',
    note: 'මුදල් ලබා ගන්නා ලදි',
  },
]

const seedFinanceEntries: FinanceEntry[] = [
  {
    id: 'finance-1',
    entryType: 'OTHER_INCOME',
    title: 'පරිත්‍යාග මුදල',
    amount: 1500,
    entryDate: '2026-06-05',
    category: 'පරිත්‍යාග',
    note: 'ගමේ හිතවතෙකුගෙන් ලැබුණු දායක මුදල',
    receivedBy: 'ප්‍රධාන පරිපාලක',
    createdBy: 'ප්‍රධාන පරිපාලක',
    createdAt: now,
  },
  {
    id: 'finance-2',
    entryType: 'EXPENSE',
    title: 'රැස්වීම් අලෙවිකරණ වියදම',
    amount: 600,
    entryDate: '2026-06-12',
    category: 'සභා වියදම්',
    note: 'පානීය ජලය සහ සැහැල්ලු ආහාර',
    createdBy: 'ප්‍රධාන පරිපාලක',
    createdAt: now,
  },
]

const seedProfileUpdateRequests: MemberProfileUpdateRequest[] = []

const defaultData: StorageShape = {
  members: seedMembers,
  documents: seedDocuments,
  auditLogs: seedAuditLogs,
  users: seedUsers,
  emailRecipients: seedEmailRecipients,
  settings: seedSettings,
  samithiReports: seedSamithiReports,
  samithiConstitutions: seedSamithiConstitutions,
  monthlyFeeConfigs: seedMonthlyFeeConfigs,
  monthlyFeePayments: seedMonthlyFeePayments,
  financeEntries: seedFinanceEntries,
  profileUpdateRequests: seedProfileUpdateRequests,
}

export const getDefaultAppData = (): StorageShape => JSON.parse(JSON.stringify(defaultData)) as StorageShape

export const getEmptyAppData = (): StorageShape => ({
  members: [],
  documents: [],
  auditLogs: [],
  users: [],
  emailRecipients: [],
  settings: [],
  samithiReports: [],
  samithiConstitutions: [],
  monthlyFeeConfigs: [],
  monthlyFeePayments: [],
  financeEntries: [],
  profileUpdateRequests: [],
})

const mergeWithDefaultData = (rawData: Partial<StorageShape>): StorageShape => ({
  members: rawData.members ?? defaultData.members,
  documents: rawData.documents ?? defaultData.documents,
  auditLogs: rawData.auditLogs ?? defaultData.auditLogs,
  users: rawData.users ?? defaultData.users,
  emailRecipients: rawData.emailRecipients ?? defaultData.emailRecipients,
  settings: rawData.settings ?? defaultData.settings,
  samithiReports: rawData.samithiReports ?? defaultData.samithiReports,
  samithiConstitutions: rawData.samithiConstitutions ?? defaultData.samithiConstitutions,
  monthlyFeeConfigs: rawData.monthlyFeeConfigs ?? defaultData.monthlyFeeConfigs,
  monthlyFeePayments: rawData.monthlyFeePayments ?? defaultData.monthlyFeePayments,
  financeEntries: rawData.financeEntries ?? defaultData.financeEntries,
  profileUpdateRequests: rawData.profileUpdateRequests ?? defaultData.profileUpdateRequests,
})

export const loadAppData = (): StorageShape => {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData))
    return getDefaultAppData()
  }

  try {
    return mergeWithDefaultData(JSON.parse(raw) as Partial<StorageShape>)
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData))
    return getDefaultAppData()
  }
}

export const saveAppData = (data: StorageShape) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const createAuditLog = (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
): AuditLog => ({
  id: crypto.randomUUID(),
  userId,
  action,
  entityType,
  entityId,
  description,
  createdAt: new Date().toISOString(),
})
