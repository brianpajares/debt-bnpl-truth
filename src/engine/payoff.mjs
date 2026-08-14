import { monthlyRateFromAnnual, money, monthLabelFromOffset } from "./rates.mjs";
import { generateBnplCalendar } from "./bnpl-calendar.mjs";

const EPSILON = 0.01;
const HORIZON_MONTHS = 600;

function cloneDebt(debt, index) {
  const cloned = {
    id: debt.id || `debt-${index + 1}`,
    label: debt.label || `Debt ${index + 1}`,
    type: debt.type || "CARD",
    balance: Number(debt.balance || 0),
    rateType: debt.rateType || "APR",
    annualRate: Number(debt.annualRate || 0),
    minimumPayment: Number(debt.minimumPayment || 0),
    recurringFee: Number(debt.recurringFee || 0),
    remainingInstallments: Number(debt.remainingInstallments || 0),
    paymentFrequency: debt.paymentFrequency || "MONTHLY",
    nextDueDate: debt.nextDueDate,
    earlyPaymentAllowed: debt.earlyPaymentAllowed !== false
  };
  cloned.balanceStart = Number(debt.balanceStart ?? cloned.balance);
  return cloned;
}

function chooseTarget(active, strategy) {
  const eligible = active.filter((debt) => debt.earlyPaymentAllowed);
  if (!eligible.length) return null;
  if (strategy === "snowball") {
    return eligible.sort((a, b) => a.balance - b.balance || b.monthlyRate - a.monthlyRate || a.id.localeCompare(b.id))[0];
  }
  return eligible.sort((a, b) => b.monthlyRate - a.monthlyRate || b.balance - a.balance || a.id.localeCompare(b.id))[0];
}

function minToReduce(balance, monthlyRate, recurringFee) {
  return money(balance * monthlyRate + recurringFee + 1);
}

export function simulateStrategy(inputDebts, options = {}) {
  const strategy = options.strategy || "baseline";
  const extraPayment = Number(options.extraPayment || 0);
  const debts = inputDebts.map(cloneDebt).filter((debt) => debt.balance > EPSILON);
  const warnings = [];
  const order = [];
  const monthlyRows = [];
  let totalInterest = 0;
  let totalFees = 0;
  let totalPaid = 0;
  let firstClosed = null;
  let negativeAmortization = false;

  for (const debt of debts) {
    debt.monthlyRate = monthlyRateFromAnnual(debt.rateType, debt.annualRate);
    debt.initialMinimum = debt.minimumPayment;
    if (debt.minimumPayment <= debt.balance * debt.monthlyRate + debt.recurringFee && debt.balance > EPSILON) {
      negativeAmortization = true;
      warnings.push(`${debt.label}: minimum payment may not reduce principal. Minimum modeled start: ${minToReduce(debt.balance, debt.monthlyRate, debt.recurringFee)}.`);
    }
  }

  const initialBudget = debts.reduce((sum, debt) => sum + debt.initialMinimum, 0) + (strategy === "baseline" ? 0 : extraPayment);

  for (let month = 1; month <= HORIZON_MONTHS; month += 1) {
    const active = debts.filter((debt) => debt.balance > EPSILON);
    if (!active.length) {
      return summarize({ strategy, month: month - 1, debts, totalInterest, totalFees, totalPaid, order, monthlyRows, firstClosed, warnings, negativeAmortization });
    }

    const row = { month, label: monthLabelFromOffset(month), paid: 0, interest: 0, fees: 0, balances: {} };
    let remainingBudget = strategy === "baseline"
      ? active.reduce((sum, debt) => sum + debt.initialMinimum, 0)
      : initialBudget;

    for (const debt of active) {
      const interest = debt.balance * debt.monthlyRate;
      const fees = debt.recurringFee;
      debt.balance = debt.balance + interest + fees;
      totalInterest += interest;
      totalFees += fees;
      row.interest += interest;
      row.fees += fees;

      const scheduled = Math.min(debt.initialMinimum, debt.balance, remainingBudget);
      debt.balance = money(debt.balance - scheduled);
      totalPaid += scheduled;
      row.paid += scheduled;
      remainingBudget = money(remainingBudget - scheduled);
      if (debt.balance <= EPSILON && !debt.closedMonth) {
        debt.closedMonth = month;
        firstClosed ||= { label: debt.label, month };
        order.push(debt.label);
      }
    }

    while (strategy !== "baseline" && remainingBudget > EPSILON) {
      const target = chooseTarget(debts.filter((debt) => debt.balance > EPSILON), strategy);
      if (!target) break;
      const payment = Math.min(remainingBudget, target.balance);
      target.balance = money(target.balance - payment);
      totalPaid += payment;
      row.paid += payment;
      remainingBudget = money(remainingBudget - payment);
      if (target.balance <= EPSILON && !target.closedMonth) {
        target.closedMonth = month;
        firstClosed ||= { label: target.label, month };
        order.push(target.label);
      }
    }

    for (const debt of debts) row.balances[debt.label] = money(debt.balance);
    monthlyRows.push(row);
  }

  warnings.push("NO_PAYOFF_WITHIN_HORIZON: With these terms, payoff was not reached within 600 months.");
  return summarize({ strategy, month: HORIZON_MONTHS, debts, totalInterest, totalFees, totalPaid, order, monthlyRows, firstClosed, warnings, negativeAmortization, noPayoff: true });
}

function summarize(result) {
  const principal = result.debts.reduce((sum, debt) => sum + Number(debt.balanceStart || 0), 0);
  return {
    strategy: result.strategy,
    months: result.month,
    debtFreeLabel: result.noPayoff ? "No payoff within 600 months" : monthLabelFromOffset(result.month),
    financeCost: money(result.totalInterest + result.totalFees),
    totalInterest: money(result.totalInterest),
    totalFees: money(result.totalFees),
    totalPaid: money(result.totalPaid),
    paymentOrder: result.order,
    firstClosed: result.firstClosed,
    warnings: [...new Set(result.warnings)],
    negativeAmortization: result.negativeAmortization,
    noPayoff: Boolean(result.noPayoff),
    monthlyRows: result.monthlyRows.slice(0, 84),
    principal: money(principal)
  };
}

export function analyzePortfolio(portfolio) {
  const debts = portfolio.debts.map((debt, index) => ({ ...cloneDebt(debt, index), balanceStart: Number(debt.balance || 0) }));
  const extraPayment = Number(portfolio.extraPayment || 0);
  const baseline = simulateStrategy(debts, { strategy: "baseline", extraPayment: 0 });
  const avalanche = simulateStrategy(debts, { strategy: "avalanche", extraPayment });
  const snowball = simulateStrategy(debts, { strategy: "snowball", extraPayment });
  const bnpl = generateBnplCalendar(debts);
  const principal = debts.reduce((sum, debt) => sum + debt.balanceStart, 0);

  for (const scenario of [avalanche, snowball]) {
    scenario.savingsVsBaseline = money(baseline.financeCost - scenario.financeCost);
    scenario.monthsSaved = baseline.noPayoff || scenario.noPayoff ? null : baseline.months - scenario.months;
  }

  const warnings = [...baseline.warnings, ...avalanche.warnings, ...snowball.warnings];
  if (bnpl.maxOverlap14d >= 2) warnings.push(`BNPL stacking: ${bnpl.maxOverlap14d} installments fall inside a 14-day window.`);
  if (bnpl.peakMonth && bnpl.peakMonth.amount > extraPayment && extraPayment > 0) warnings.push(`Peak BNPL month exceeds declared extra-payment budget.`);
  if (debts.some((debt) => debt.rateType === "ZERO" && debt.type === "BNPL")) warnings.push("0% BNPL means 0% interest under the terms entered; external fees are not invented.");

  return {
    modelVersion: "FREE_BETA_V1.0",
    portfolio: {
      principal: money(principal),
      monthlyBudget: money(debts.reduce((sum, debt) => sum + debt.minimumPayment, 0) + extraPayment),
      debtCount: debts.length
    },
    baseline,
    avalanche,
    snowball,
    bnpl,
    warnings: [...new Set(warnings)]
  };
}
