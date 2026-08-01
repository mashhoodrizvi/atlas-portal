const SHEET_ID = "19_oqOHcci1Ba1LdQ1xozQCGElqGH6Yd3Kn6YMmF75qQ";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

const columns = [
  "Date",
  "Actual Time",
  "Invoice Time",
  "Extra Time/Difference",
  "Amount",
  "Status"
];

const durationColumns = new Set([
  "Actual Time",
  "Invoice Time",
  "Extra Time/Difference"
]);

let records = [], filtered = [], sortKey = "", sortDirection = 1;
const $ = selector => document.querySelector(selector);
const head = $("#dataTable thead");
const body = $("#dataTable tbody");
const search = $("#searchInput");
const filter = $("#statusFilter");
const dialog = $("#detailsDialog");
const details = $("#detailGrid");
const errorBox = $("#errorBox");

function parseCSV(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(value);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = []; value = "";
    } else value += char;
  }
  if (value !== "" || row.length) {
    row.push(value);
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  const number = Number(String(value ?? "").replace(/[$,]/g, "")) || 0;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(number);
}

function formatDuration(value) {
  const text = String(value ?? "").trim();
  if (!text) return "—";

  const match = text.match(/^(\d+):(\d{1,2})(?::\d{1,2})?$/);
  if (!match) return text;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours === 0 && minutes === 0) return "0 min";
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours} hrs ${minutes} min`;
}

function displayValue(column, value) {
  if (column === "Amount") return money(value);
  if (durationColumns.has(column)) return formatDuration(value);
  return value || "—";
}

function statusClass(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["pending", "completed", "returned", "paid", "approved"].includes(status) ? status : "other";
}

function renderHead() {
  head.innerHTML = `<tr>${columns.map(column =>
    `<th data-key="${esc(column)}">${esc(column)} ${sortKey === column ? (sortDirection === 1 ? "↑" : "↓") : ""}</th>`
  ).join("")}</tr>`;
  head.querySelectorAll("th").forEach(th => th.onclick = () => sortBy(th.dataset.key));
}

function render() {
  renderHead();

  body.innerHTML = filtered.length
    ? filtered.map((row, index) => `<tr data-i="${index}">${columns.map(column => {
        if (column === "Status") {
          return `<td><span class="status ${statusClass(row[column])}">${esc(row[column] || "Not set")}</span></td>`;
        }
        const cssClass = column === "Amount" ? ' class="amount"' : "";
        return `<td${cssClass}>${esc(displayValue(column, row[column]))}</td>`;
      }).join("")}</tr>`).join("")
    : `<tr><td class="empty" colspan="${columns.length}">No matching records found.</td></tr>`;

  body.querySelectorAll("tr[data-i]").forEach(tr => {
    tr.onclick = () => openDetails(filtered[Number(tr.dataset.i)]);
  });

  $("#resultCount").textContent = `Showing ${filtered.length} of ${records.length} record${records.length === 1 ? "" : "s"}`;
  updateStats();
}

function updateStats() {
  $("#totalRecords").textContent = filtered.length;
  $("#pendingRecords").textContent = filtered.filter(row => row.Status.toLowerCase() === "pending").length;
  $("#completedRecords").textContent = filtered.filter(row =>
    ["approved", "completed", "returned", "paid"].includes(row.Status.toLowerCase())
  ).length;
  $("#totalAmount").textContent = money(filtered.reduce((sum, row) =>
    sum + (Number(String(row.Amount).replace(/[$,]/g, "")) || 0), 0));
}

function apply() {
  const query = search.value.trim().toLowerCase();
  const selectedStatus = filter.value.toLowerCase();
  filtered = records.filter(row =>
    Object.values(row).join(" ").toLowerCase().includes(query) &&
    (!selectedStatus || row.Status.toLowerCase() === selectedStatus)
  );
  if (sortKey) sortData();
  render();
}

function sortData() {
  filtered.sort((a, b) => {
    if (sortKey === "Amount") {
      const av = Number(String(a[sortKey]).replace(/[$,]/g, "")) || 0;
      const bv = Number(String(b[sortKey]).replace(/[$,]/g, "")) || 0;
      return (av - bv) * sortDirection;
    }
    return String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""), undefined, { numeric: true }) * sortDirection;
  });
}

function sortBy(key) {
  if (sortKey === key) sortDirection *= -1;
  else { sortKey = key; sortDirection = 1; }
  sortData();
  render();
}

function openDetails(row) {
  details.innerHTML = columns.map(column =>
    `<div class="detail-item"><span>${esc(column)}</span><strong>${esc(displayValue(column, row[column]))}</strong></div>`
  ).join("");
  dialog.showModal();
}

async function load() {
  try {
    errorBox.hidden = true;
    const response = await fetch(`${CSV_URL}&cache=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google returned ${response.status}`);

    const rows = parseCSV(await response.text());
    if (!rows.length) throw new Error("The Google Sheet is empty");

    const headers = rows[0].map(value => value.trim());
    const missing = columns.filter(column => !headers.includes(column));
    if (missing.length) throw new Error(`Missing heading(s): ${missing.join(", ")}`);

    records = rows.slice(1).map(cells => {
      const raw = {};
      headers.forEach((header, index) => raw[header] = (cells[index] ?? "").trim());
      return Object.fromEntries(columns.map(column => [column, raw[column] ?? ""]));
    }).filter(row => Object.values(row).some(value => String(value).trim() !== ""));

    filtered = [...records];
    filter.innerHTML = '<option value="">All statuses</option>';
    [...new Set(records.map(row => row.Status).filter(Boolean))].sort().forEach(status => {
      const option = document.createElement("option");
      
      option.value = status;
      option.textContent = status;
      filter.appendChild(option);
    });
    render();
  } catch (error) {
    console.error(error);
    renderHead();
    body.innerHTML = `<tr><td class="empty" colspan="${columns.length}">Google Sheet data could not be loaded.</td></tr>`;
    $("#resultCount").textContent = "Google Sheet could not be loaded";
    errorBox.hidden = false;
    errorBox.innerHTML = `<strong>Check your Google Sheet:</strong> Use exactly these six headings: Date, Actual Time, Invoice Time, Extra Time/Difference, Amount, Status.<br><small>${esc(error.message)}</small>`;
    updateStats();
  }
}

search.oninput = apply;
filter.onchange = apply;
$("#clearBtn").onclick = () => {
  search.value = "";
  filter.value = "";
  sortKey = "";
  filtered = [...records];
  render();
};
$("#closeDialog").onclick = () => dialog.close();
dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
$("#themeToggle").onclick = event => {
  document.body.classList.toggle("dark");
  event.currentTarget.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
};

load();
