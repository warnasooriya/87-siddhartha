import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined'
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

import { ALL_USER_ROLES, FULL_ACCESS_ROLES } from './roles'
import type { UserRole } from '../types/domain'

export interface NavigationItem {
  label: string
  path: string
  icon: SvgIconComponent
  roles: UserRole[]
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'උපකරණ පුවරුව',
    path: '/',
    icon: DashboardOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'සාමාජිකයන්',
    path: '/members',
    icon: Groups2OutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'උපන්දිනයන්',
    path: '/birthdays',
    icon: TodayOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'ලේඛන',
    path: '/documents',
    icon: DescriptionOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'සමිති වාර්තා',
    path: '/samithi-reports',
    icon: FolderSharedOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'ව්‍යවස්ථාව',
    path: '/constitution',
    icon: GavelOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'මාසික ගාස්තු',
    path: '/fees',
    icon: PaymentsOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'මූල්‍ය',
    path: '/finance',
    icon: AccountBalanceWalletOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'මගේ පැතිකඩ',
    path: '/profile',
    icon: PersonOutlineOutlinedIcon,
    roles: ALL_USER_ROLES,
  },
  {
    label: 'විගණන සටහන්',
    path: '/audit',
    icon: FactCheckOutlinedIcon,
    roles: FULL_ACCESS_ROLES,
  },
  {
    label: 'සැකසුම්',
    path: '/settings',
    icon: SettingsOutlinedIcon,
    roles: FULL_ACCESS_ROLES,
  },
]
