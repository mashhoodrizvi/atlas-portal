const records = [
  {
    "Date": "29/07/2026",
    "Actual Time": "21:40",
    "Invoice Time": "35:00",
    "Extra Time/Difference": "13:20",
    "Amount": 381.3333333333333,
    "Invoice Paid Date": "",
    "Return Date": "",
    "Status": "Pending"
  }
];

const columns = ["Date","Actual Time","Invoice Time","Extra Time/Difference","Amount","Invoice Paid Date","Return Date","Status"];
let filtered = [...records];
let sortKey = "";
let sortDirection = 1;

const tableHead = document.querySelector("#dataTable thead");
const tableBody = document.querySelector("#dataTable tbody");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const detailsDialog = document.querySelector("#detailsDialog");
const detailGrid = document.querySelector("#detailGrid");

function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-AU", {style:"currency",currency:"AUD"}).format(number);
}

function statusClass(value) {
  const s = String(value || "").toLowerCase();
  return ["pending","completed","returned","paid"].includes(s) ? s : "other";
}

function renderHeader() {
  tableHead.innerHTML = `<tr>${columns.map(c => `<th data-key="${c}">${c} ${sortKey===c ? (sortDirection===1?"↑":"↓") : ""}</th>`).join("")}</tr>`;
  tableHead.querySelectorAll("th").forEach(th => th.onclick = () => sortBy(th.dataset.key));
}

function renderTable() {
  renderHeader();
  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No matching records found.</td></tr>`;
  } else {
    tableBody.innerHTML = filtered.map((row, index) => `
      <tr data-index="${index}">
        ${columns.map(c => {
          if(c==="Amount") return `<td class="amount">${money(row[c])}</td>`;
          if(c==="Status") return `<td><span class="status ${statusClass(row[c])}">${row[c] || "Not set"}</span></td>`;
          return `<td>${row[c] || "—"}</td>`;
        }).join("")}
      </tr>`).join("");
    tableBody.querySelectorAll("tr[data-index]").forEach(tr => tr.onclick = () => openDetails(filtered[Number(tr.dataset.index)]));
  }
  document.querySelector("#resultCount").textContent = `Showing ${filtered.length} of ${records.length} record${records.length===1?"":"s"}`;
  updateStats();
}

function updateStats() {
  document.querySelector("#totalRecords").textContent = filtered.length;
  document.querySelector("#pendingRecords").textContent = filtered.filter(r => String(r.Status).toLowerCase()==="pending").length;
  document.querySelector("#completedRecords").textContent = filtered.filter(r => ["completed","returned","paid"].includes(String(r.Status).toLowerCase())).length;
  document.querySelector("#totalAmount").textContent = money(filtered.reduce((sum,r)=>sum+Number(r.Amount||0),0));
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value.toLowerCase();
  filtered = records.filter(row => {
    const matchesSearch = Object.values(row).join(" ").toLowerCase().includes(q);
    const matchesStatus = !status || String(row.Status).toLowerCase() === status;
    return matchesSearch && matchesStatus;
  });
  if(sortKey) sortData();
  renderTable();
}

function sortData() {
  filtered.sort((a,b) => {
    const av=a[sortKey], bv=b[sortKey];
    if(sortKey==="Amount") return (Number(av)-Number(bv))*sortDirection;
    return String(av||"").localeCompare(String(bv||""),undefined,{numeric:true})*sortDirection;
  });
}

function sortBy(key) {
  if(sortKey===key) sortDirection*=-1; else {sortKey=key;sortDirection=1;}
  sortData(); renderTable();
}

function openDetails(row) {
  detailGrid.innerHTML = columns.map(c => `<div class="detail-item"><span>${c}</span><strong>${c==="Amount"?money(row[c]):(row[c]||"—")}</strong></div>`).join("");
  detailsDialog.showModal();
}

function exportCsv() {
  const escape = v => `"${String(v??"").replaceAll('"','""')}"`;
  const csv = [columns.map(escape).join(","), ...filtered.map(r=>columns.map(c=>escape(r[c])).join(","))].join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  const a=document.createElement("a");a.href=url;a.download="atlas-returns-filtered.csv";a.click();URL.revokeObjectURL(url);
}

[...new Set(records.map(r=>r.Status).filter(Boolean))].sort().forEach(s => {
  const o=document.createElement("option");o.value=s;o.textContent=s;statusFilter.appendChild(o);
});
searchInput.addEventListener("input",applyFilters);
statusFilter.addEventListener("change",applyFilters);
document.querySelector("#clearBtn").onclick=()=>{searchInput.value="";statusFilter.value="";sortKey="";applyFilters();};
document.querySelector("#exportBtn").onclick=exportCsv;
document.querySelector("#closeDialog").onclick=()=>detailsDialog.close();
detailsDialog.addEventListener("click",e=>{if(e.target===detailsDialog)detailsDialog.close();});
document.querySelector("#themeToggle").onclick=()=>{
  document.body.classList.toggle("dark");
  document.querySelector("#themeToggle").textContent=document.body.classList.contains("dark")?"☀":"☾";
};
renderTable();
