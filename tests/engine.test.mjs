import assert from "node:assert/strict";
import { monthlyRateFromAnnual } from "../src/engine/rates.mjs";
import { analyzePortfolio } from "../src/engine/payoff.mjs";
import { compareRefinance } from "../src/engine/refinance.mjs";

assert.equal(monthlyRateFromAnnual("APR", 24).toFixed(6), "0.020000");
assert.equal(monthlyRateFromAnnual("TEA", 24).toFixed(6), "0.018088");
assert.equal(monthlyRateFromAnnual("TCEA", 57.3).toFixed(6), "0.038470");
assert.equal(monthlyRateFromAnnual("ZERO", 0), 0);

const portfolio = {
  extraPayment: 150,
  debts: [
    { id: "card", label: "Credit card", type: "CARD", balance: 5000, rateType: "APR", annualRate: 24, minimumPayment: 150, recurringFee: 0, earlyPaymentAllowed: true },
    { id: "loan", label: "Personal loan", type: "LOAN", balance: 3500, rateType: "EAR", annualRate: 16, minimumPayment: 130, recurringFee: 0, earlyPaymentAllowed: true },
    { id: "bnpl", label: "BNPL plan", type: "BNPL", balance: 400, rateType: "ZERO", annualRate: 0, minimumPayment: 100, recurringFee: 0, remainingInstallments: 4, paymentFrequency: "BIWEEKLY", nextDueDate: "2026-08-20", earlyPaymentAllowed: false }
  ]
};

const result = analyzePortfolio(portfolio);
assert.equal(result.portfolio.debtCount, 3);
assert.ok(result.baseline.months > result.avalanche.months);
assert.ok(result.avalanche.financeCost <= result.baseline.financeCost);
assert.equal(result.bnpl.items.length, 4);
assert.ok(result.warnings.some((warning) => warning.includes("0% BNPL")));

const negative = analyzePortfolio({
  extraPayment: 0,
  debts: [{ label: "Underpaying card", type: "CARD", balance: 1000, rateType: "APR", annualRate: 36, minimumPayment: 10, recurringFee: 0 }]
});
assert.ok(negative.baseline.negativeAmortization);

const refi = compareRefinance({
  principal: 9000,
  annualRate: 12,
  rateType: "APR",
  termMonths: 60,
  originationFee: 300,
  feeFinanced: true,
  baseline: { monthlyPayment: 470, financeCost: 6100 }
});
assert.ok(refi.monthlyPayment > 0);
assert.ok(refi.warnings.some((warning) => warning.includes("Hypothetical")));

console.log("engine tests passed");
