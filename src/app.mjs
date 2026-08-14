import { analyzePortfolio } from "./engine/payoff.mjs";
import { compareRefinance } from "./engine/refinance.mjs";

const state = {
  country: "US",
  currency: "USD",
  extraPayment: 150,
  chartScenario: "avalanche",
  debts: [
    { id: "d1", label: "Credit card", type: "CARD", balance: 5000, rateType: "APR", annualRate: 24, minimumPayment: 150, recurringFee: 0, remainingInstallments: 0, paymentFrequency: "MONTHLY", nextDueDate: "2026-09-01", earlyPaymentAllowed: true },
    { id: "d2", label: "Personal loan", type: "LOAN", balance: 3500, rateType: "EAR", annualRate: 16, minimumPayment: 130, recurringFee: 0, remainingInstallments: 0, paymentFrequency: "MONTHLY", nextDueDate: "2026-09-05", earlyPaymentAllowed: true },
    { id: "d3", label: "BNPL plan", type: "BNPL", balance: 400, rateType: "ZERO", annualRate: 0, minimumPayment: 100, recurringFee: 0, remainingInstallments: 4, paymentFrequency: "BIWEEKLY", nextDueDate: "2026-08-20", earlyPaymentAllowed: false }
  ]
};

const $ = (selector) => document.querySelector(selector);
const fmt = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: state.currency, maximumFractionDigits: 0 }).format(Number(value || 0));
const fmt2 = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: state.currency, maximumFractionDigits: 2 }).format(Number(value || 0));

function debtTemplate(debt, index) {
  return `
    <article class="debt-card" data-index="${index}">
      <header>
        <input data-field="label" value="${escapeAttr(debt.label)}" aria-label="Debt label">
        <button class="remove-debt" type="button" title="Remove debt">×</button>
      </header>
      <div class="field-row">
        <label>Type
          <select data-field="type">
            ${option("CARD", "Credit card", debt.type)}
            ${option("LOAN", "Loan", debt.type)}
            ${option("BNPL", "BNPL", debt.type)}
            ${option("STORE", "Store financing", debt.type)}
            ${option("LINE", "Line of credit", debt.type)}
          </select>
        </label>
        <label>Rate type
          <select data-field="rateType">
            ${option("APR", "APR", debt.rateType)}
            ${option("EAR", "EAR/TEA", debt.rateType)}
            ${option("TCEA", "TCEA", debt.rateType)}
            ${option("ZERO", "0%", debt.rateType)}
          </select>
        </label>
      </div>
      <div class="field-row">
        <label>Balance <input data-field="balance" type="number" min="0" step="10" value="${debt.balance}"></label>
        <label>Annual rate % <input data-field="annualRate" type="number" min="0" step="0.1" value="${debt.annualRate}"></label>
      </div>
      <div class="field-row">
        <label>Minimum / installment <input data-field="minimumPayment" type="number" min="0" step="5" value="${debt.minimumPayment}"></label>
        <label>Monthly fees <input data-field="recurringFee" type="number" min="0" step="1" value="${debt.recurringFee}"></label>
      </div>
      <div class="field-row">
        <label>Installments <input data-field="remainingInstallments" type="number" min="0" step="1" value="${debt.remainingInstallments}"></label>
        <label>Frequency
          <select data-field="paymentFrequency">
            ${option("MONTHLY", "Monthly", debt.paymentFrequency)}
            ${option("BIWEEKLY", "Biweekly", debt.paymentFrequency)}
            ${option("WEEKLY", "Weekly", debt.paymentFrequency)}
          </select>
        </label>
      </div>
      <label>Next due date <input data-field="nextDueDate" type="date" value="${debt.nextDueDate || ""}"></label>
      <label class="checkbox-row"><input data-field="earlyPaymentAllowed" type="checkbox" ${debt.earlyPaymentAllowed ? "checked" : ""}> Allows early payment in strategy allocation</label>
    </article>
  `;
}

function option(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function renderDebts() {
  $("#debtList").innerHTML = state.debts.map(debtTemplate).join("");
}

function scenarioCard(title, scenario, accent) {
  const first = scenario.firstClosed ? `${scenario.firstClosed.label} · M${scenario.firstClosed.month}` : "None";
  const saved = scenario.monthsSaved == null ? "n/a" : `${scenario.monthsSaved} mo`;
  return `
    <span>${accent}</span>
    <h3>${title}</h3>
    <dl>
      <dt>Debt-free</dt><dd>${scenario.debtFreeLabel}</dd>
      <dt>Months</dt><dd>${scenario.noPayoff ? "600+" : scenario.months}</dd>
      <dt>Interest + fees</dt><dd>${fmt2(scenario.financeCost)}</dd>
      <dt>Savings vs current</dt><dd>${scenario.savingsVsBaseline == null ? "—" : fmt2(scenario.savingsVsBaseline)}</dd>
      <dt>Months saved</dt><dd>${saved}</dd>
      <dt>First debt closed</dt><dd>${first}</dd>
    </dl>
  `;
}

function renderResults() {
  const result = analyzePortfolio(state);
  $("#principal").textContent = fmt(result.portfolio.principal);
  $("#budget").textContent = fmt(result.portfolio.monthlyBudget);
  const best = Math.max(result.avalanche.savingsVsBaseline || 0, result.snowball.savingsVsBaseline || 0);
  $("#bestSavings").textContent = fmt2(best);
  $("#heroTruth").textContent = `${fmt(state.extraPayment)} extra: avalanche saves ${fmt2(result.avalanche.savingsVsBaseline)} and ${result.avalanche.monthsSaved ?? "n/a"} months vs current.`;
  $("#baselineCard").innerHTML = scenarioCard("Current", result.baseline, "Minimum path");
  $("#avalancheCard").innerHTML = scenarioCard("Avalanche", result.avalanche, "Highest rate first");
  $("#snowballCard").innerHTML = scenarioCard("Snowball", result.snowball, "Smallest balance first");
  renderCalendar(result);
  renderWarnings(result);
  renderRefi(result);
  drawChart(result[state.chartScenario] || result.avalanche);
}

function renderCalendar(result) {
  const bnpl = result.bnpl;
  $("#peakMonth").textContent = bnpl.peakMonth ? `${bnpl.peakMonth.month} · ${fmt2(bnpl.peakMonth.amount)}` : "No BNPL";
  $("#bnplList").innerHTML = bnpl.items.length
    ? bnpl.items.slice(0, 18).map((item) => `<div class="calendar-item"><time>${item.date.slice(5)}</time><span>${item.label}</span><strong>${fmt2(item.amount)}</strong></div>`).join("")
    : "<p>No active BNPL installments.</p>";
}

function renderWarnings(result) {
  $("#warnings").innerHTML = result.warnings.length
    ? result.warnings.map((warning) => `<li>${warning}</li>`).join("")
    : "<li>Educational estimate based only on the terms entered.</li>";
}

function renderRefi(result) {
  const refi = compareRefinance({
    principal: result.portfolio.principal,
    annualRate: Number($("#refiRate").value || 0),
    rateType: $("#refiRateType").value,
    termMonths: Number($("#refiTerm").value || 1),
    originationFee: Number($("#refiFee").value || 0),
    feeFinanced: true,
    prepaymentPenalty: state.country === "PE" ? 0 : 0,
    baseline: {
      monthlyPayment: state.debts.reduce((sum, debt) => sum + Number(debt.minimumPayment || 0), 0),
      financeCost: result.baseline.financeCost
    }
  });
  $("#refiResult").innerHTML = `
    <strong>${fmt2(refi.monthlyPayment)} monthly modeled payment</strong>
    <span>Total modeled cost: ${fmt2(refi.financeCost)}</span>
    <span>Cost delta vs current: ${fmt2(refi.costDelta)}</span>
    <small>${refi.warnings.join(" ")}</small>
  `;
}

function drawChart(scenario) {
  const canvas = $("#balanceChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7faf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const totals = scenario.monthlyRows.map((row) => Object.values(row.balances).reduce((sum, value) => sum + value, 0));
  const max = Math.max(...totals, 1);
  const pad = 32;
  ctx.strokeStyle = "#d8e0dc";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = pad + i * ((canvas.height - pad * 2) / 4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvas.width - pad, y);
    ctx.stroke();
  }
  ctx.strokeStyle = scenario.strategy === "avalanche" ? "#157154" : scenario.strategy === "snowball" ? "#315c96" : "#a76514";
  ctx.lineWidth = 4;
  ctx.beginPath();
  totals.forEach((total, index) => {
    const x = pad + (index / Math.max(totals.length - 1, 1)) * (canvas.width - pad * 2);
    const y = canvas.height - pad - (total / max) * (canvas.height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#10251f";
  ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText(`${scenario.strategy.toUpperCase()} · ${scenario.noPayoff ? "600+ months" : `${scenario.months} months`}`, pad, 28);
}

function bindEvents() {
  $("#addDebt").addEventListener("click", () => {
    state.debts.push({ id: crypto.randomUUID(), label: "New debt", type: "CARD", balance: 1000, rateType: "APR", annualRate: 20, minimumPayment: 50, recurringFee: 0, remainingInstallments: 0, paymentFrequency: "MONTHLY", nextDueDate: "2026-09-01", earlyPaymentAllowed: true });
    renderDebts();
    renderResults();
  });
  $("#extraPayment").addEventListener("input", (event) => {
    state.extraPayment = Number(event.target.value);
    $("#extraValue").textContent = fmt(state.extraPayment);
    renderResults();
  });
  $("#currency").addEventListener("change", (event) => {
    state.currency = event.target.value;
    renderResults();
  });
  $("#country").addEventListener("change", (event) => {
    state.country = event.target.value;
    renderResults();
  });
  $("#debtList").addEventListener("input", updateDebtFromEvent);
  $("#debtList").addEventListener("change", updateDebtFromEvent);
  $("#debtList").addEventListener("click", (event) => {
    if (!event.target.classList.contains("remove-debt")) return;
    const card = event.target.closest(".debt-card");
    state.debts.splice(Number(card.dataset.index), 1);
    renderDebts();
    renderResults();
  });
  document.querySelectorAll("[data-chart]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-chart]").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      state.chartScenario = button.dataset.chart;
      renderResults();
    });
  });
  ["refiRate", "refiTerm", "refiFee", "refiRateType"].forEach((id) => {
    $(`#${id}`).addEventListener("input", renderResults);
    $(`#${id}`).addEventListener("change", renderResults);
  });
}

function updateDebtFromEvent(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  const card = event.target.closest(".debt-card");
  const debt = state.debts[Number(card.dataset.index)];
  if (event.target.type === "checkbox") debt[field] = event.target.checked;
  else if (event.target.type === "number") debt[field] = Number(event.target.value || 0);
  else debt[field] = event.target.value;
  if (field === "rateType" && debt.rateType === "ZERO") debt.annualRate = 0;
  renderResults();
}

renderDebts();
bindEvents();
$("#extraValue").textContent = fmt(state.extraPayment);
renderResults();
