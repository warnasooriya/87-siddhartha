import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

import type {
  AppUser,
  AuditLog,
  CommunityMember,
  DocumentRecord,
  EmailRecipient,
  FinanceEntry,
  MemberProfileUpdateRequest,
  MonthlyFeeConfig,
  MonthlyFeePayment,
  SamithiConstitution,
  SamithiReport,
  SystemSetting,
  UserRole,
} from '../types/domain'
import { DEFAULT_LOGIN_EMAILS, ROLE_LABELS } from '../constants/roles'
import { createAuditLog, getEmptyAppData } from '../utils/storage'

const storedThemeMode = localStorage.getItem('theme-mode')
const persistedData = getEmptyAppData()

type AuthState = {
  currentUser: AppUser | null
  isAuthenticated: boolean
}

type ThemeState = {
  mode: 'light' | 'dark'
}

export type AppDataState = {
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

const demoUsers: Record<string, { email: string; role: UserRole }> = {
  admin: { email: DEFAULT_LOGIN_EMAILS.admin, role: 'ADMIN' },
  president: { email: DEFAULT_LOGIN_EMAILS.president, role: 'PRESIDENT' },
  secretary: { email: DEFAULT_LOGIN_EMAILS.secretary, role: 'SECRETARY' },
  treasurer: { email: DEFAULT_LOGIN_EMAILS.treasurer, role: 'TREASURER' },
  member: { email: DEFAULT_LOGIN_EMAILS.member, role: 'MEMBER' },
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    currentUser: null,
    isAuthenticated: false,
  } as AuthState,
  reducers: {
    signInAsDemo: (state, action: PayloadAction<keyof typeof demoUsers>) => {
      const credential = demoUsers[action.payload]
      state.currentUser = {
        id: credential.email,
        fullName: ROLE_LABELS[credential.role],
        email: credential.email,
        role: credential.role,
        activeStatus: true,
        createdAt: new Date().toISOString(),
      }
      state.isAuthenticated = true
    },
    setCurrentUser: (state, action: PayloadAction<AppUser | null>) => {
      state.currentUser = action.payload
      state.isAuthenticated = Boolean(action.payload)
    },
    signOut: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
    },
  },
})

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: storedThemeMode === 'dark' ? 'dark' : 'light',
  } as ThemeState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme-mode', state.mode)
    },
  },
})

const dataSlice = createSlice({
  name: 'data',
  initialState: persistedData as AppDataState,
  reducers: {
    replaceData: (_, action: PayloadAction<AppDataState>) => action.payload,
    upsertMember: (state, action: PayloadAction<CommunityMember>) => {
      const existingIndex = state.members.findIndex((member) => member.id === action.payload.id)
      if (existingIndex >= 0) {
        state.members[existingIndex] = action.payload
      } else {
        state.members.unshift(action.payload)
      }
    },
    deleteMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter((member) => member.id !== action.payload)
      state.documents = state.documents.filter((document) => document.memberId !== action.payload)
    },
    addDocument: (state, action: PayloadAction<DocumentRecord>) => {
      state.documents.unshift(action.payload)
    },
    deleteDocument: (state, action: PayloadAction<string>) => {
      state.documents = state.documents.filter((document) => document.id !== action.payload)
    },
    addAuditLog: (state, action: PayloadAction<AuditLog>) => {
      state.auditLogs.unshift(action.payload)
    },
    updateSettings: (state, action: PayloadAction<SystemSetting[]>) => {
      state.settings = action.payload
    },
    addSamithiReport: (state, action: PayloadAction<SamithiReport>) => {
      state.samithiReports.unshift(action.payload)
    },
    upsertMonthlyFeeConfig: (state, action: PayloadAction<MonthlyFeeConfig>) => {
      const existingIndex = state.monthlyFeeConfigs.findIndex((item) => item.id === action.payload.id)
      if (existingIndex >= 0) {
        state.monthlyFeeConfigs[existingIndex] = action.payload
      } else {
        state.monthlyFeeConfigs.unshift(action.payload)
      }
    },
    collectMonthlyFee: (state, action: PayloadAction<MonthlyFeePayment>) => {
      const existingIndex = state.monthlyFeePayments.findIndex((item) => item.id === action.payload.id)
      if (existingIndex >= 0) {
        state.monthlyFeePayments[existingIndex] = action.payload
      } else {
        state.monthlyFeePayments.unshift(action.payload)
      }
    },
    addFinanceEntry: (state, action: PayloadAction<FinanceEntry>) => {
      state.financeEntries.unshift(action.payload)
    },
  },
})

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    theme: themeSlice.reducer,
    data: dataSlice.reducer,
  },
})

export const { signInAsDemo, signOut } = authSlice.actions
export const { setCurrentUser } = authSlice.actions
export const { toggleTheme } = themeSlice.actions
export const {
  addAuditLog,
  addDocument,
  addSamithiReport,
  addFinanceEntry,
  collectMonthlyFee,
  deleteDocument,
  deleteMember,
  replaceData,
  updateSettings,
  upsertMember,
  upsertMonthlyFeeConfig,
} = dataSlice.actions

export const buildAuditEntry = (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
) => createAuditLog(userId, action, entityType, entityId, description)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
