import { monthlyRateFromAnnual, money } from "./rates.mjs";

export function compareRefinance({ principal, annualRate, rateType, termMonths, originationFee = 0, feeFinanced = true, prepaymentPenalty = 0, recurringFee = 0, baseline }) {
  const monthlyRate = monthlyRateFromAnnual(rateType, annualRate);
  const upfrontCash = feeFinanced ? prepaymentPenalty : Number(originationFee) + Number(prepaymentPenalty);
  const financedPrincipal = Number(principal) + (feeFinanced ? Number(originationFee) : 0);
  const payment = monthlyRate > 0
    ? financedPrincipal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -Number(termMonths)))
    : financedPrincipal / Number(termMonths);
  const totalPaid = payment * Number(termMonths) + upfrontCash + Number(recurringFee) * Number(termMonths);
  const financeCost = totalPaid - Number(principal);
  const monthlyDelta = baseline ? payment - baseline.monthlyPayment : 0;
  const costDelta = baseline ? financeCost - baseline.financeCost : 0;
  return {
    monthlyPayment: money(payment + Number(recurringFee)),
    totalPaid: money(totalPaid),
    financeCost: money(financeCost),
    upfrontCash: money(upfrontCash),
    monthlyDelta: money(monthlyDelta),
    costDelta: money(costDelta),
    warnings: [
      monthlyDelta < 0 && costDelta > 0 ? "Lower monthly payment, higher total modeled cost." : null,
      "Hypothetical only: this is not a lender recommendation or eligibility estimate."
    ].filter(Boolean)
  };
}
