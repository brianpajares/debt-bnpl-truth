export function monthlyRateFromAnnual(rateType, annualRatePercent) {
  const annual = Number(annualRatePercent || 0) / 100;
  if (rateType === "ZERO") return 0;
  if (rateType === "APR") return annual / 12;
  if (rateType === "EAR" || rateType === "TEA" || rateType === "TCEA") {
    return Math.pow(1 + annual, 1 / 12) - 1;
  }
  throw new Error(`Unsupported rate type: ${rateType}`);
}

export function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function monthLabelFromOffset(offset, start = new Date()) {
  const d = addMonths(start, offset);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
