export type UserRole = 'ADMIN' | 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'MEMBER'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export type RelationshipType =
  | 'SPOUSE'
  | 'MOTHER'
  | 'FATHER'
  | 'SPOUSE_MOTHER'
  | 'SPOUSE_FATHER'
  | 'CHILD'

export type DocumentType =
  | 'NIC'
  | 'Birth Certificate'
  | 'Marriage Certificate'
  | 'Membership Application'
  | 'Other'

export interface FamilyMember {
  id: string
  memberId: string
  relationshipType: RelationshipType
  fullName: string
  nic: string
  dateOfBirth: string
  address: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CommunityMember {
  id: string
  memberNumber: string
  fullName: string
  nic: string
  dateOfBirth: string
  gender: Gender
  address: string
  phoneNumber: string
  email: string
  photoUrl?: string
  activeStatus: boolean
  area: string
  systemRole: UserRole
  createdAt: string
  updatedAt: string
  familyMembers: FamilyMember[]
}

export interface DocumentRecord {
  id: string
  memberId: string
  familyMemberId?: string
  documentType: DocumentType
  fileName: string
  fileUrl: string
  uploadedBy: string
  uploadedAt: string
  version: number
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  description: string
  createdAt: string
}

export interface AppUser {
  id: string
  memberId?: string
  fullName: string
  email: string
  role: UserRole
  activeStatus: boolean
  createdAt: string
  passwordConfigured?: boolean
}

export type ProfileUpdateRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface MemberProfileUpdateRequest {
  id: string
  memberId: string
  requestedByUserId: string
  requestedByName: string
  fullName: string
  dateOfBirth: string
  phoneNumber: string
  email: string
  address: string
  area: string
  photoUrl?: string
  status: ProfileUpdateRequestStatus
  reviewedByUserId?: string
  reviewedAt?: string
  createdAt: string
}

export interface EmailRecipient {
  id: string
  email: string
  enabled: boolean
  createdAt: string
}

export interface SystemSetting {
  id: string
  settingKey: string
  settingValue: string
}

export interface SamithiReport {
  id: string
  title: string
  meetingDate: string
  description: string
  fileName: string
  fileUrl: string
  uploadedBy: string
  uploadedAt: string
}

export interface MonthlyFeeConfig {
  id: string
  title: string
  amount: number
  dueDay: number
  effectiveMonth: string
  notes: string
  isActive: boolean
}

export type MonthlyFeePaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING'

export interface MonthlyFeePayment {
  id: string
  memberId: string
  configId: string
  feeMonth: string
  amount: number
  paidDate: string
  status: MonthlyFeePaymentStatus
  collectedBy: string
  note?: string
}

export type FinanceEntryType = 'OTHER_INCOME' | 'EXPENSE'

export interface FinanceEntry {
  id: string
  entryType: FinanceEntryType
  title: string
  amount: number
  entryDate: string
  category: string
  note?: string
  receivedBy?: string
  createdBy: string
  createdAt: string
}

export interface BirthdayReminderEntry {
  id: string
  name: string
  relationship: string
  age: number
  address: string
  birthday: string
  photoUrl?: string
  memberId: string
}

export interface MemberWizardValues {
  member: Omit<CommunityMember, 'id' | 'createdAt' | 'updatedAt' | 'familyMembers'>
  spouse?: Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>
  memberMother?: Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>
  memberFather?: Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>
  spouseMother?: Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>
  spouseFather?: Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>
  children: Array<Omit<FamilyMember, 'id' | 'memberId' | 'relationshipType' | 'createdAt' | 'updatedAt'>>
}
