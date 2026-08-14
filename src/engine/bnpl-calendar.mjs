import { money, addMonths } from "./rates.mjs";

function advance(date, frequency, index) {
  const d = new Date(date);
  if (frequency === "WEEKLY") d.setDate(d.getDate() + 7 * index);
  else if (frequency === "BIWEEKLY") d.setDate(d.getDate() + 14 * index);
  else d.setTime(addMonths(d, index).getTime());
  return d;
}

export function generateBnplCalendar(debts) {
  const items = debts
    .filter((debt) => debt.type === "BNPL")
    .flatMap((debt) => {
      const count = Math.max(0, Number(debt.remainingInstallments || 0));
      const amount = Number(debt.minimumPayment || 0);
      const due = debt.nextDueDate || new Date().toISOString().slice(0, 10);
      return Array.from({ length: count }, (_, index) => {
        const date = advance(due, debt.paymentFrequency || "BIWEEKLY", index);
        return {
          debtId: debt.id,
          label: debt.label,
          date: date.toISOString().slice(0, 10),
          month: date.toISOString().slice(0, 7),
          amount: money(amount)
        };
      });
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthlyLoads = {};
  for (const item of items) {
    monthlyLoads[item.month] = money((monthlyLoads[item.month] || 0) + item.amount);
  }
  const peak = Object.entries(monthlyLoads).sort((a, b) => b[1] - a[1])[0] || null;

  let maxOverlap14d = 0;
  for (let i = 0; i < items.length; i += 1) {
    const start = new Date(items[i].date);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    const overlap = items.filter((item) => {
      const d = new Date(item.date);
      return d >= start && d <= end;
    }).length;
    maxOverlap14d = Math.max(maxOverlap14d, overlap);
  }

  return {
    items,
    monthlyLoads,
    peakMonth: peak ? { month: peak[0], amount: peak[1] } : null,
    maxOverlap14d
  };
}
