// ---------- helpers ----------
const kes = n => "KES " + Number(n).toLocaleString("en-KE",
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// rules: [field name, label, min, max, whole number?]
function validate(form, rules) {
  let ok = true;
  for (const [name, label, min, max, whole] of rules) {
    const el = form.elements[name];
    const v = parseFloat(el.value);
    let msg = "";
    if (el.value.trim() === "" || isNaN(v)) msg = `${label} is required.`;
    else if (v < min) msg = min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${min}.`;
    else if (name !== "rate" && v === 0) msg = `${label} must be greater than 0.`;
    else if (v > max) msg = `${label} must be ${max.toLocaleString("en-KE")} or less.`;
    else if (whole && !Number.isInteger(v)) msg = `${label} must be a whole number.`;
    el.classList.toggle("invalid", !!msg);
    el.parentElement.querySelector(".err").textContent = msg;
    if (msg) ok = false;
  }
  return ok;
}

const val = (form, n) => parseFloat(form.elements[n].value);

// ---------- tabs ----------
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", t === tab);
    });
    document.querySelectorAll(".panel").forEach(p =>
      p.classList.toggle("active", p.id === tab.getAttribute("aria-controls")));
  });
});

// ---------- savings ----------
let chart;
const saveForm = document.querySelector("#save form");

function runSavings() {
  if (!validate(saveForm, [["monthly", "Monthly contribution", 0, 1e9],
                           ["rate", "Interest rate", 0, 100],
                           ["years", "Saving period", 1, 50, true]])) return;
  const c = val(saveForm, "monthly"), i = val(saveForm, "rate") / 100 / 12, years = val(saveForm, "years");
  const balances = [0], contributed = [0];
  let bal = 0;
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + i) + c;                 // interest on balance, then month-end deposit
    if (m % 12 === 0) { balances.push(bal); contributed.push(c * m); }
  }
  const total = c * years * 12;
  document.getElementById("save-result").innerHTML = `
    <p class="label">You will have</p>
    <p class="big">${kes(bal)}</p>
    <div class="stats">
      <div class="stat"><span class="label">You contribute</span><b>${kes(total)}</b></div>
      <div class="stat"><span class="label">Interest earned</span><b>${kes(bal - total)}</b></div>
    </div>`;
  drawChart(balances, contributed, years);
}

function drawChart(balances, contributed, years) {
  const box = document.querySelector(".chart-box");
  if (typeof Chart === "undefined") {
    box.innerHTML = '<p class="label">The chart could not load. Check your internet connection.</p>';
    return;
  }
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels: Array.from({ length: years + 1 }, (_, y) => "Year " + y),
      datasets: [
        { label: "Savings with interest", data: balances, borderColor: "#1b6b3a",
          backgroundColor: "rgba(27,107,58,.15)", fill: true, tension: .25, pointRadius: 2 },
        { label: "Contributions only", data: contributed, borderColor: "#7a8f81",
          borderDash: [6, 4], pointRadius: 0 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${kes(c.parsed.y)}` } } },
      scales: { y: { ticks: { callback: v => Number(v).toLocaleString("en-KE") },
                     title: { display: true, text: "KES" } } },
    },
  });
}

saveForm.addEventListener("submit", e => { e.preventDefault(); runSavings(); });

// ---------- loan ----------
const loanForm = document.querySelector("#loan form");

function runLoan() {
  if (!validate(loanForm, [["amount", "Loan amount", 0, 1e10],
                           ["rate", "Interest rate", 0, 100],
                           ["months", "Repayment period", 1, 360, true]])) return;
  const P = val(loanForm, "amount"), i = val(loanForm, "rate") / 100 / 12, n = val(loanForm, "months");
  const pay = i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n));
  let bal = P, rows = "";
  for (let m = 1; m <= n; m++) {
    const interest = bal * i;
    const principal = m === n ? bal : pay - interest;   // last month clears rounding drift
    bal = m === n ? 0 : bal - principal;
    rows += `<tr><td>${m}</td><td>${kes(principal + interest)}</td><td>${kes(principal)}</td><td>${kes(interest)}</td><td>${kes(bal)}</td></tr>`;
  }
  document.getElementById("loan-result").innerHTML = `
    <p class="label">Monthly repayment</p>
    <p class="big">${kes(pay)}</p>
    <div class="stats">
      <div class="stat"><span class="label">Total interest</span><b>${kes(pay * n - P)}</b></div>
      <div class="stat"><span class="label">Total to repay</span><b>${kes(pay * n)}</b></div>
    </div>`;
  document.getElementById("schedule").innerHTML = rows;
}

loanForm.addEventListener("submit", e => { e.preventDefault(); runLoan(); });

// Show results for the default values on first load
runSavings();
runLoan();
