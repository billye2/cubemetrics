// Pure debt-payoff math: balances, per-debt payoff projection (months + total
// interest), portfolio totals, and snowball/avalanche ordering. Kept free of
// React/DB so it can be unit-tested. Dates are YYYY-MM-DD strings (date-only).

export interface DebtRow {
  id: number;
  name: string;
  original_balance: number;
  current_balance: number;
  apr: number; // annual % rate, e.g. 19.99
  min_payment: number; // monthly minimum
  status: string; // 'active' | 'paid'
  created_at: string;
}

export interface PaymentRow {
  id: number;
  debt_id: number;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

/** Sum of payment amounts made against a debt (its derived paid-off total). */
export function totalPaid(payments: PaymentRow[]): number {
  return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

/**
 * Current balance derived from original_balance minus payments, floored at 0.
 * This is the source of truth for the bar — the DB column is kept in sync.
 */
export function balanceRemaining(original: number, payments: PaymentRow[]): number {
  const rem = (Number(original) || 0) - totalPaid(payments);
  return Math.max(0, Math.round(rem * 100) / 100);
}

/**
 * Paid-down progress 0..1: how much of the ORIGINAL balance is gone.
 * Debt direction: this climbs toward 1 as the balance falls toward 0.
 */
export function paidFraction(original: number, balance: number): number {
  const o = Number(original) || 0;
  if (o <= 0) return balance <= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, (o - balance) / o));
}

export interface Projection {
  /** Whole months to reach a $0 balance, or null when it never pays off. */
  months: number | null;
  /** Total interest paid over the life of the payoff, or null when unknowable. */
  totalInterest: number | null;
  /** YYYY-MM-01 of the debt-free month, or null. */
  payoffMonth: string | null;
  /** True when the monthly payment doesn't even cover the first month's interest. */
  neverPaysOff: boolean;
}

/**
 * Amortize a balance at a monthly payment, accruing interest at apr/12 each
 * month, until it hits zero. Returns months + total interest. If the payment
 * can't cover the monthly interest, the debt never pays off.
 *
 * @param balance  current balance owed
 * @param apr      annual percentage rate (e.g. 19.99 for 19.99%)
 * @param payment  planned monthly payment
 */
export function projectPayoff(
  balance: number,
  apr: number,
  payment: number,
  now: Date = new Date()
): Projection {
  const empty: Projection = {
    months: null,
    totalInterest: null,
    payoffMonth: null,
    neverPaysOff: false,
  };
  const bal0 = Number(balance) || 0;
  if (bal0 <= 0) {
    return { months: 0, totalInterest: 0, payoffMonth: null, neverPaysOff: false };
  }
  const pay = Number(payment) || 0;
  if (pay <= 0) return empty;

  const monthlyRate = (Number(apr) || 0) / 100 / 12;

  // No interest: simple division.
  if (monthlyRate <= 0) {
    const months = Math.ceil(bal0 / pay);
    return {
      months,
      totalInterest: 0,
      payoffMonth: addMonths(now, months),
      neverPaysOff: false,
    };
  }

  // Payment must exceed the first month's interest or the balance grows forever.
  const firstInterest = bal0 * monthlyRate;
  if (pay <= firstInterest) {
    return { ...empty, neverPaysOff: true };
  }

  let bal = bal0;
  let interest = 0;
  let months = 0;
  // Cap iterations so a pathological input can't loop forever (~83 years).
  while (bal > 0 && months < 1000) {
    const accrued = bal * monthlyRate;
    interest += accrued;
    bal = bal + accrued - pay;
    months += 1;
    if (bal < 0) bal = 0;
  }
  if (months >= 1000 && bal > 0) {
    return { ...empty, neverPaysOff: true };
  }
  return {
    months,
    totalInterest: Math.round(interest * 100) / 100,
    payoffMonth: addMonths(now, months),
    neverPaysOff: false,
  };
}

/** YYYY-MM-01 `n` whole months after `now`'s month. */
export function addMonths(now: Date, n: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-01`;
}

/** "Mar 2027" from a YYYY-MM-DD string. */
export function monthLabel(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export interface DebtStats {
  paid: number;
  balance: number;
  fraction: number; // paid-down 0..1
  complete: boolean;
  projection: Projection;
}

/** One debt's full derived stats from its payment rows (projection uses min_payment). */
export function statsFor(
  debt: DebtRow,
  payments: PaymentRow[],
  now: Date = new Date()
): DebtStats {
  const paid = totalPaid(payments);
  const balance = balanceRemaining(debt.original_balance, payments);
  return {
    paid,
    balance,
    fraction: paidFraction(debt.original_balance, balance),
    complete: balance <= 0,
    projection: projectPayoff(balance, debt.apr, debt.min_payment, now),
  };
}

export type Strategy = "snowball" | "avalanche";

/**
 * Order the still-active debts by strategy:
 *  - snowball:  smallest current balance first (quick wins)
 *  - avalanche: highest APR first (least interest paid)
 * Ties break on the other dimension, then id for stability.
 */
export function orderByStrategy(
  debts: { id: number; balance: number; apr: number }[],
  strategy: Strategy
): { id: number; balance: number; apr: number }[] {
  const arr = [...debts];
  arr.sort((a, b) => {
    if (strategy === "snowball") {
      if (a.balance !== b.balance) return a.balance - b.balance;
      if (a.apr !== b.apr) return b.apr - a.apr;
    } else {
      if (a.apr !== b.apr) return b.apr - a.apr;
      if (a.balance !== b.balance) return a.balance - b.balance;
    }
    return a.id - b.id;
  });
  return arr;
}

export interface PortfolioTotals {
  totalBalance: number;
  totalOriginal: number;
  totalPaid: number;
  combinedMinimums: number;
  /** Debt-free month assuming each debt is paid at its own minimum. */
  debtFreeMonth: string | null;
  activeCount: number;
  paidCount: number;
}

/**
 * Portfolio-wide totals across all debts. debtFreeMonth is the latest single-debt
 * payoff month (each paid at its minimum) — null if any active debt never pays off.
 */
export function portfolioTotals(
  debts: DebtRow[],
  paymentsByDebt: Map<number, PaymentRow[]>,
  now: Date = new Date()
): PortfolioTotals {
  let totalBalance = 0;
  let totalOriginal = 0;
  let totalPaidAll = 0;
  let combinedMinimums = 0;
  let activeCount = 0;
  let paidCount = 0;
  let maxMonths: number | null = 0;

  for (const d of debts) {
    const payments = paymentsByDebt.get(d.id) ?? [];
    const balance = balanceRemaining(d.original_balance, payments);
    totalOriginal += Number(d.original_balance) || 0;
    totalPaidAll += totalPaid(payments);
    if (balance <= 0) {
      paidCount += 1;
      continue;
    }
    activeCount += 1;
    totalBalance += balance;
    combinedMinimums += Number(d.min_payment) || 0;
    const proj = projectPayoff(balance, d.apr, d.min_payment, now);
    if (proj.months === null) {
      maxMonths = null; // one debt never pays off → portfolio date unknown
    } else if (maxMonths !== null) {
      maxMonths = Math.max(maxMonths, proj.months);
    }
  }

  return {
    totalBalance: Math.round(totalBalance * 100) / 100,
    totalOriginal: Math.round(totalOriginal * 100) / 100,
    totalPaid: Math.round(totalPaidAll * 100) / 100,
    combinedMinimums: Math.round(combinedMinimums * 100) / 100,
    debtFreeMonth:
      maxMonths === null ? null : maxMonths === 0 ? null : addMonths(now, maxMonths),
    activeCount,
    paidCount,
  };
}
