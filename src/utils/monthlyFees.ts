import type { MonthlyFeePayment } from '../types/domain'

export type MonthlyFeeCollectionStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export interface MonthlyFeeMemberSummary {
  paidTotal: number
  remainingBalance: number
  status: MonthlyFeeCollectionStatus
  paymentCount: number
  lastPaidDate?: string
}

const isCollectedPayment = (payment: MonthlyFeePayment) => payment.status !== 'PENDING'

export const createMonthlyFeeMemberSummary = (
  payments: MonthlyFeePayment[],
  requiredAmount: number,
): MonthlyFeeMemberSummary => {
  const collectedPayments = payments.filter(isCollectedPayment)
  const paidTotal = collectedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingBalance = Math.max(requiredAmount - paidTotal, 0)

  let status: MonthlyFeeCollectionStatus = 'UNPAID'
  if (paidTotal > 0 && remainingBalance > 0) {
    status = 'PARTIAL'
  } else if (paidTotal > 0 && remainingBalance === 0) {
    status = 'PAID'
  }

  return {
    paidTotal,
    remainingBalance,
    status,
    paymentCount: collectedPayments.length,
    lastPaidDate: collectedPayments[0]?.paidDate,
  }
}

export const getMonthlyFeeMemberSummary = (
  payments: MonthlyFeePayment[],
  memberId: string,
  feeMonth: string,
  requiredAmount: number,
) =>
  createMonthlyFeeMemberSummary(
    payments.filter((payment) => payment.memberId === memberId && payment.feeMonth === feeMonth),
    requiredAmount,
  )

export const buildMonthlyFeeSummaryMap = (
  payments: MonthlyFeePayment[],
  feeMonth: string,
  requiredAmount: number,
) => {
  const groupedPayments = new Map<string, MonthlyFeePayment[]>()

  payments.forEach((payment) => {
    if (payment.feeMonth !== feeMonth) {
      return
    }

    const existingPayments = groupedPayments.get(payment.memberId) ?? []
    existingPayments.push(payment)
    groupedPayments.set(payment.memberId, existingPayments)
  })

  const summaryMap = new Map<string, MonthlyFeeMemberSummary>()
  groupedPayments.forEach((memberPayments, memberId) => {
    summaryMap.set(memberId, createMonthlyFeeMemberSummary(memberPayments, requiredAmount))
  })

  return summaryMap
}

export const sumCollectedMonthlyFees = (payments: MonthlyFeePayment[], feeMonth?: string) =>
  payments
    .filter((payment) => isCollectedPayment(payment) && (!feeMonth || payment.feeMonth === feeMonth))
    .reduce((sum, payment) => sum + payment.amount, 0)
