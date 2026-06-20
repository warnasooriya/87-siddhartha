import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

import type { BirthdayReminderEntry, CommunityMember } from '../types/domain'

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const exportMembersToCsv = (members: CommunityMember[]) => {
  const rows = [
    ['Member Number', 'Full Name', 'NIC', 'Phone', 'Email', 'Area'],
    ...members.map((member) => [
      member.memberNumber,
      member.fullName,
      member.nic,
      member.phoneNumber,
      member.email,
      member.area,
    ]),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  downloadBlob(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }), 'members-report.csv')
}

export const exportBirthdaysToPdf = (birthdays: BirthdayReminderEntry[]) => {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Birthday Reminder Report', 10, 10)

  birthdays.slice(0, 12).forEach((entry, index) => {
    doc.text(`${index + 1}. ${entry.name} - ${entry.birthday} - ${entry.relationship}`, 10, 20 + index * 8)
  })

  doc.save('birthday-report.pdf')
}

export const exportMembersToExcel = (members: CommunityMember[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    members.map((member) => ({
      MemberNumber: member.memberNumber,
      Name: member.fullName,
      NIC: member.nic,
      Area: member.area,
      Status: member.activeStatus ? 'Active' : 'Inactive',
    })),
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Members')
  XLSX.writeFile(workbook, 'members-report.xlsx')
}
