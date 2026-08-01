const SHEET_ID = "19_oqOHcci1Ba1LdQ1xozQCGElqGH6Yd3Kn6YMmF75qQ";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
const APPROVAL_URL = "https://script.google.com/macros/s/AKfycbxyTHVMazwgUfxHxFsicecKzsxAo9jXht_q_c47-_dQ7Vn356Qt2GtxsVnc6nfS4fTxoA/exec";

const columns = ["Date","Actual Time","Invoice Time","Extra Time/Difference","Amount","Status"];
const durationColumns = new Set(["Actual Time","Invoice Time","Extra Time/Difference"]);

let records = [];
let filtered = [];
let sortKey = "";
let sortDirection = 1;
let adminPassword = sessionStorage.getItem("atlasAdminPassword") || "";

const $ = selector => document.querySelector(selector);
const head = $("#dataTable thead");
const body = $("#dataTable tbody");
const search = $("#searchInput");
const filter = $("#statusFilter");
const messageBox = $("#messageBox");

function parseCSV(text) {
  const rows=[]; let row=[], value="", quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i], n=text[i+1];
    if(c === '"' && quoted && n === '"') { value += '"'; i++; }
    else if(c === '"') quoted = !quoted;
    else if(c === "," && !quoted) { row.push(value); value=""; }
    else if((c === "\n" || c === "\r") && !quoted) {
      if(c === "\r" && n === "\n") i++;
      row.push(value);
      if(row.some(x=>x.trim()!=="")) rows.push(row);
      row=[]; value="";
    } else value += c;
  }
  if(value!=="" || row.length) { row.push(value); if(row.some(x=>x.trim()!=="")) rows.push(row); }
  return rows;
}

function esc(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function money(value) {
  const n=Number(String(value??"").replace(/[$,]/g,""))||0;
  return new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(n);
}

function duration(value) {
  if(!value) return "—";
  const parts=String(value).split(":");
  if(parts.length<2) return value;
  const h=parseInt(parts[0],10)||0;
  const m=parseInt(parts[1],10)||0;
  if(h===0) return `${m} min`;
  if(m===0) return `${h} hrs`;
  return `${h} hrs ${m} min`;
}

function statusClass(value) {
  const s=String(value||"").trim().toLowerCase();
  return ["pending","approved","completed","paid","returned"].includes(s)?s:"other";
}

function showMessage(text,type="") {
  messageBox.hidden=false;
  messageBox.className=`message-box ${type}`;
  messageBox.textContent=text;
}
function hideMessage() { messageBox.hidden=true; }

function setAdminUI() {
  const loggedIn=Boolean(adminPassword);
  $("#loginBtn").hidden=loggedIn;
  $("#logoutBtn").hidden=!loggedIn;
  $("#adminBadge").hidden=!loggedIn;
}

function renderHeader() {
  const displayColumns=[...columns, ...(adminPassword?["Actions"]:[])];
  head.innerHTML=`<tr>${displayColumns.map(c=>`<th data-key="${esc(c)}">${esc(c)} ${sortKey===c?(sortDirection===1?"↑":"↓"):""}</th>`).join("")}</tr>`;
  head.querySelectorAll("th[data-key]").forEach(th=>{
    if(th.dataset.key!=="Actions") th.onclick=()=>sortBy(th.dataset.key);
  });
}

function render() {
  renderHeader();
  if(!filtered.length) {
    body.innerHTML=`<tr><td class="empty" colspan="${columns.length+(adminPassword?1:0)}">No matching records found.</td></tr>`;
  } else {
    body.innerHTML=filtered.map((r,i)=>{
      const cells=columns.map(c=>{
        if(c==="Amount") return `<td class="amount" data-label="${esc(c)}">${money(r[c])}</td>`;
        if(c==="Status") return `<td data-label="${esc(c)}"><span class="status ${statusClass(r[c])}">${esc(r[c]||"Not set")}</span></td>`;
        if(durationColumns.has(c)) return `<td data-label="${esc(c)}">${esc(duration(r[c]))}</td>`;
        return `<td data-label="${esc(c)}">${esc(r[c]||"—")}</td>`;
      }).join("");

      const actions=adminPassword
        ? `<td class="actions-cell" data-label="Actions">${String(r.Status).toLowerCase()==="pending"
            ? `<button class="approve-button" data-row="${r.__rowNumber}">Approve</button>`
            : "—"}</td>`
        : "";

      return `<tr data-index="${i}">${cells}${actions}</tr>`;
    }).join("");

    body.querySelectorAll(".approve-button").forEach(btn=>btn.onclick=()=>approveRow(Number(btn.dataset.row),btn));
  }

  $("#resultCount").textContent=`Showing ${filtered.length} of ${records.length} record${records.length===1?"":"s"}`;
  updateStats();
}

function updateStats() {
  $("#totalRecords").textContent=filtered.length;
  $("#pendingRecords").textContent=filtered.filter(r=>String(r.Status).toLowerCase()==="pending").length;
  $("#completedRecords").textContent=filtered.filter(r=>["approved","completed","paid","returned"].includes(String(r.Status).toLowerCase())).length;
}

function applyFilters() {
  const q=search.value.toLowerCase(), s=filter.value.toLowerCase();
  filtered=records.filter(r=>Object.values(r).join(" ").toLowerCase().includes(q)&&(!s||String(r.Status).toLowerCase()===s));
  if(sortKey) sortData();
  render();
}

function sortData() {
  filtered.sort((a,b)=>{
    if(sortKey==="Amount") return ((Number(String(a[sortKey]).replace(/[$,]/g,""))||0)-(Number(String(b[sortKey]).replace(/[$,]/g,""))||0))*sortDirection;
    return String(a[sortKey]||"").localeCompare(String(b[sortKey]||""),undefined,{numeric:true})*sortDirection;
  });
}

function sortBy(key) {
  if(sortKey===key) sortDirection*=-1; else {sortKey=key;sortDirection=1;}
  sortData(); render();
}

async function loadSheet() {
  try {
    hideMessage();
    $("#resultCount").textContent="Loading Google Sheet…";
    const res=await fetch(`${CSV_URL}&cache=${Date.now()}`,{cache:"no-store"});
    if(!res.ok) throw new Error("Could not load Google Sheet");
    const rows=parseCSV(await res.text());
    const headers=rows[0].map(x=>x.trim());
    const missing=columns.filter(c=>!headers.includes(c));
    if(missing.length) throw new Error(`Missing heading(s): ${missing.join(", ")}`);

    records=rows.slice(1).map((cells,index)=>{
      const raw={}; headers.forEach((h,i)=>raw[h]=(cells[i]??"").trim());
      const row=Object.fromEntries(columns.map(c=>[c,raw[c]??""]));
      row.__rowNumber=index+2;
      return row;
    }).filter(r=>columns.some(c=>String(r[c]).trim()!==""));

    filtered=[...records];
    filter.innerHTML='<option value="">All statuses</option>';
    [...new Set(records.map(r=>r.Status).filter(Boolean))].sort().forEach(s=>{
      const o=document.createElement("option");o.value=s;o.textContent=s;filter.appendChild(o);
    });
    render();
  } catch(err) {
    showMessage(err.message,"error");
    body.innerHTML=`<tr><td class="empty" colspan="7">Google Sheet data could not be loaded.</td></tr>`;
    $("#resultCount").textContent="Load failed";
  }
}

async function approveRow(rowNumber,button) {
  if(!adminPassword) return;
  if(!confirm("Change this record from Pending to Approved?")) return;

  button.disabled=true;
  button.textContent="Approving…";
  hideMessage();

  try {
    const payload={action:"approve",rowNumber,password:adminPassword};
    const res=await fetch(APPROVAL_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload),
      redirect:"follow"
    });
    const result=await res.json();
    if(!result.success) throw new Error(result.error||"Approval failed");

    showMessage("Status changed to Approved.","success");
    await new Promise(r=>setTimeout(r,700));
    await loadSheet();
  } catch(err) {
    showMessage(err.message||"Could not approve this record.","error");
    button.disabled=false;
    button.textContent="Approve";
  }
}

$("#loginBtn").onclick=()=>$("#loginDialog").showModal();
$("#loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  const value=$("#passwordInput").value.trim();
  if(!value) return;
  adminPassword=value;
  sessionStorage.setItem("atlasAdminPassword",adminPassword);
  $("#passwordInput").value="";
  $("#loginDialog").close();
  setAdminUI();
  render();
});
$("#logoutBtn").onclick=()=>{
  adminPassword="";
  sessionStorage.removeItem("atlasAdminPassword");
  setAdminUI();
  render();
};
$("#clearBtn").onclick=()=>{search.value="";filter.value="";applyFilters();};
search.addEventListener("input",applyFilters);
filter.addEventListener("change",applyFilters);
$("#themeToggle").onclick=e=>{document.body.classList.toggle("dark");e.currentTarget.textContent=document.body.classList.contains("dark")?"☀":"☾";};
$("#closeDialog").onclick=()=>$("#detailsDialog").close();

setAdminUI();
loadSheet();
