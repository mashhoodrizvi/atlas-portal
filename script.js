const workItems = [
  {
    id: 1,
    title: "Remove existing shower screen",
    detail: "Carefully dismantle the current shower screen before demolition work begins."
  },
  {
    id: 2,
    title: "Strip shower wall and floor tiles",
    detail: "Remove existing shower wall and floor tiles. Off-site waste disposal is not included unless selected separately."
  },
  {
    id: 3,
    title: "Render shower walls",
    detail: "Prepare and render shower walls to create a sound, level surface for waterproofing and tiling."
  },
  {
    id: 4,
    title: "Screed shower floor and install puddle flange",
    detail: "Screed the floor with correct falls to the waste and install a compatible puddle flange."
  },
  {
    id: 5,
    title: "Apply waterproof membrane",
    detail: "Apply a compliant waterproofing system throughout the shower area in accordance with building requirements."
  },
  {
    id: 6,
    title: "Tile and grout shower area",
    detail: "Install wall and floor tiles and complete grouting throughout the required shower area."
  },
  {
    id: 7,
    title: "Seal internal corners",
    detail: "Apply new flexible waterproof sealant to all internal corners and movement joints."
  },
  {
    id: 8,
    title: "Supply and install frameless shower screen",
    detail: "Custom-made safety-glass frameless shower screen with bright-silver hardware."
  },
  {
    id: 9,
    title: "Silicone around shower screen",
    detail: "Apply sanitary-grade silicone around the newly installed shower screen."
  },
  {
    id: 10,
    title: "Dispose of existing shower screen off-site",
    detail: "Load, transport and dispose of the removed shower screen away from the work site."
  }
];

const moneyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD"
});

const state = workItems.map(item => ({
  ...item,
  selected: false,
  quantity: 1,
  price: ""
}));

const get = id => document.getElementById(id);
const itemsList = get("itemsList");
const quoteForm = get("quoteForm");
const formMessage = get("formMessage");
const downloadButton = get("downloadBtn");

function safeNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatMoney(value) {
  return moneyFormatter.format(safeNumber(value));
}

function lineTotal(item) {
  return item.selected ? safeNumber(item.quantity) * safeNumber(item.price) : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderItems() {
  itemsList.innerHTML = state.map((item, index) => `
    <article class="item-row ${item.selected ? "is-selected" : ""}" data-item-id="${item.id}">
      <label class="item-check-wrap" aria-label="Include ${escapeHtml(item.title)}">
        <input class="item-check" type="checkbox" data-action="select" data-index="${index}" ${item.selected ? "checked" : ""} />
        <span class="checkmark"></span>
      </label>
      <div class="item-description">
        <strong>${String(item.id).padStart(2, "0")} · ${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
      <label class="item-input-wrap">
        <span class="mobile-label">Quantity</span>
        <input
          class="item-input quantity-input"
          type="number"
          min="0.01"
          step="0.01"
          inputmode="decimal"
          data-action="quantity"
          data-index="${index}"
          value="${escapeHtml(item.quantity)}"
          ${item.selected ? "" : "disabled"}
          aria-label="Quantity for ${escapeHtml(item.title)}"
        />
      </label>
      <label class="item-input-wrap">
        <span class="mobile-label">Unit price</span>
        <span class="price-wrap">
          <input
            class="item-input price-input"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            data-action="price"
            data-index="${index}"
            value="${escapeHtml(item.price)}"
            placeholder="0.00"
            ${item.selected ? "" : "disabled"}
            aria-label="Unit price for ${escapeHtml(item.title)}"
          />
        </span>
      </label>
      <strong class="item-amount">${formatMoney(lineTotal(item))}</strong>
    </article>
  `).join("");
}

function calculateTotals() {
  const selected = state.filter(item => item.selected);
  const subtotal = selected.reduce((sum, item) => sum + lineTotal(item), 0);
  const gst = get("includeGst").checked ? subtotal * 0.1 : 0;
  const total = subtotal + gst;
  const depositPercent = Math.min(100, safeNumber(get("depositPercent").value));
  const deposit = total * (depositPercent / 100);

  get("selectedCount").textContent = String(selected.length);
  get("subtotalDisplay").textContent = formatMoney(subtotal);
  get("gstDisplay").textContent = formatMoney(gst);
  get("totalDisplay").textContent = formatMoney(total);
  get("depositDisplay").textContent = formatMoney(deposit);

  return { selected, subtotal, gst, total, depositPercent, deposit };
}

function updateItem(index, action, value) {
  const item = state[index];
  if (!item) return;

  if (action === "select") {
    item.selected = Boolean(value);
  } else if (action === "quantity") {
    item.quantity = value;
  } else if (action === "price") {
    item.price = value;
  }

  renderItems();
  calculateTotals();

  if (action === "quantity" || action === "price") {
    const selector = action === "quantity" ? ".quantity-input" : ".price-input";
    const target = itemsList.querySelector(`${selector}[data-index="${index}"]`);
    if (target) {
      target.focus();
    }
  }
}

itemsList.addEventListener("change", event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  if (action === "select") updateItem(index, action, target.checked);
  if (action === "quantity" || action === "price") updateItem(index, action, target.value);
});

itemsList.addEventListener("input", event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const index = Number(target.dataset.index);
  const action = target.dataset.action;
  if (action !== "quantity" && action !== "price") return;
  state[index][action] = target.value;
  const row = target.closest(".item-row");
  const amount = row?.querySelector(".item-amount");
  if (amount) amount.textContent = formatMoney(lineTotal(state[index]));
  calculateTotals();
});

get("selectAllBtn").addEventListener("click", () => {
  state.forEach(item => { item.selected = true; });
  renderItems();
  calculateTotals();
});

get("clearItemsBtn").addEventListener("click", () => {
  state.forEach(item => { item.selected = false; });
  renderItems();
  calculateTotals();
});

get("includeGst").addEventListener("change", calculateTotals);
get("depositPercent").addEventListener("input", calculateTotals);

function showMessage(message, type = "error") {
  formMessage.hidden = false;
  formMessage.className = `form-message ${type === "success" ? "success" : ""}`;
  formMessage.textContent = message;
  formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = "";
}

function validateQuote() {
  hideMessage();
  document.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));
  const missingFields = [];

  [
    ["quoteNumber", "quotation number"],
    ["quoteDate", "quotation date"],
    ["customerName", "customer name"]
  ].forEach(([id, label]) => {
    const input = get(id);
    if (!input.value.trim()) {
      input.classList.add("invalid");
      missingFields.push(label);
    }
  });

  const selected = state.filter(item => item.selected);
  if (!selected.length) {
    showMessage("Select at least one work item before creating the PDF.");
    return false;
  }

  const invalidItems = selected.filter(item => {
    const rawPrice = Number.parseFloat(item.price);
    return safeNumber(item.quantity) <= 0 || item.price === "" || !Number.isFinite(rawPrice) || rawPrice < 0;
  });
  invalidItems.forEach(item => {
    const index = state.indexOf(item);
    if (safeNumber(item.quantity) <= 0) {
      itemsList.querySelector(`.quantity-input[data-index="${index}"]`)?.classList.add("invalid");
    }
    if (item.price === "") {
      itemsList.querySelector(`.price-input[data-index="${index}"]`)?.classList.add("invalid");
    }
  });

  if (missingFields.length) {
    showMessage(`Please enter the ${missingFields.join(", ")}.`);
    get(missingFields[0] === "quotation number" ? "quoteNumber" : missingFields[0] === "quotation date" ? "quoteDate" : "customerName").focus();
    return false;
  }

  if (invalidItems.length) {
    showMessage("Every selected item needs a quantity greater than zero and a unit price.");
    return false;
  }

  return true;
}

function formatDateForQuote(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function setText(id, value, fallback = "") {
  get(id).textContent = value || fallback;
}

function buildPdfDocument() {
  const totals = calculateTotals();
  setText("pdfDate", formatDateForQuote(get("quoteDate").value), "—");
  setText("pdfQuoteNumber", get("quoteNumber").value.trim(), "—");
  setText("pdfCustomerName", get("customerName").value.trim(), "—");
  setText("pdfCustomerPhone", get("customerPhone").value.trim() ? `Mobile: ${get("customerPhone").value.trim()}` : "");
  setText("pdfCustomerEmail", get("customerEmail").value.trim() ? `Email: ${get("customerEmail").value.trim()}` : "");
  setText("pdfCustomerAddress", get("customerAddress").value.trim() ? `Address: ${get("customerAddress").value.trim()}` : "");

  get("pdfItems").innerHTML = totals.selected.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${formatMoney(item.price)}</td>
      <td><strong>${formatMoney(lineTotal(item))}</strong></td>
    </tr>
  `).join("");

  setText("pdfSupplyNote", get("supplyNote").value.trim(), "Not specified.");
  const extraNotes = get("additionalNotes").value.trim();
  get("pdfExtraNoteBlock").hidden = !extraNotes;
  setText("pdfAdditionalNotes", extraNotes);
  setText("pdfSubtotal", formatMoney(totals.subtotal));
  setText("pdfGst", formatMoney(totals.gst));
  get("pdfGstRow").hidden = !get("includeGst").checked;
  setText("pdfTotal", formatMoney(totals.total));
  setText("pdfDepositLabel", `Deposit (${totals.depositPercent}%)`);
  setText("pdfDeposit", formatMoney(totals.deposit));

  return totals;
}

async function downloadPdf() {
  buildPdfDocument();
  const quoteNumber = get("quoteNumber").value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  const customer = get("customerName").value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `Atlas-Quotation-${quoteNumber}-${customer}.pdf`;
  const element = get("pdfDocument");

  if (typeof window.html2pdf !== "function") {
    window.print();
    return;
  }

  document.body.classList.add("pdf-exporting");
  element.setAttribute("aria-hidden", "false");

  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    await window.html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      })
      .from(element)
      .save();
  } finally {
    document.body.classList.remove("pdf-exporting");
    element.setAttribute("aria-hidden", "true");
  }
}

quoteForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateQuote()) return;

  downloadButton.disabled = true;
  downloadButton.querySelector("span:last-child").textContent = "Creating PDF…";

  try {
    await downloadPdf();
    showMessage("Your quotation PDF has been created.", "success");
  } catch (error) {
    console.error(error);
    showMessage("The PDF could not be created. Please try again.");
  } finally {
    downloadButton.disabled = false;
    downloadButton.querySelector("span:last-child").textContent = "Download quotation PDF";
  }
});

get("resetBtn").addEventListener("click", () => {
  if (!window.confirm("Clear all customer details, prices and selections?")) return;
  quoteForm.reset();
  get("quoteDate").valueAsDate = new Date();
  get("includeGst").checked = true;
  get("depositPercent").value = "10";
  get("supplyNote").value = "Adhesive, sand, cement, primer, waterproof membrane and floor waste are included in this quote.";
  state.forEach(item => {
    item.selected = false;
    item.quantity = 1;
    item.price = "";
  });
  hideMessage();
  renderItems();
  calculateTotals();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

get("quoteDate").valueAsDate = new Date();
renderItems();
calculateTotals();
