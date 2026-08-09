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
  return `${day}.${month}.${year}`;
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

function addPdfPageHeading(doc, title) {
  doc.setFillColor(153, 31, 42);
  doc.rect(0, 0, 210, 3.5, "F");
  doc.setTextColor(153, 31, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, 15, 13);
  doc.setDrawColor(205, 210, 216);
  doc.line(15, 16, 195, 16);
  doc.setTextColor(32, 37, 43);
  return 22;
}

function ensurePdfSpace(doc, currentY, requiredHeight, heading) {
  if (currentY + requiredHeight <= 278) return currentY;
  doc.addPage();
  return addPdfPageHeading(doc, heading);
}

function drawPdfFooter(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(215, 219, 224);
    doc.line(15, 286, 195, 286);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(115, 122, 130);
    doc.text("Atlas Tiling & Bathroom Renovations", 15, 291);
    doc.text(`Page ${page} of ${pageCount}`, 195, 291, { align: "right" });
  }
}

async function getReadyLogo() {
  const logo = document.querySelector(".brand-logo");
  if (!(logo instanceof HTMLImageElement)) return null;
  if (!logo.complete) {
    await Promise.race([
      new Promise(resolve => logo.addEventListener("load", resolve, { once: true })),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);
  }
  return logo.naturalWidth > 0 ? logo : null;
}

async function downloadPdfLegacy() {
  const JsPdf = window.jspdf?.jsPDF;
  if (typeof JsPdf !== "function") {
    throw new Error("The PDF generator did not load.");
  }

  const totals = calculateTotals();
  const quoteNumber = get("quoteNumber").value.trim();
  const customerName = get("customerName").value.trim();
  const safeQuoteNumber = quoteNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCustomer = customerName.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `Atlas-Quotation-${safeQuoteNumber}-${safeCustomer}.pdf`;
  const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(153, 31, 42);
  doc.rect(0, 0, pageWidth, 4, "F");

  const logo = await getReadyLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 15, 11, 66, 25, undefined, "FAST");
    } catch (error) {
      console.warn("Logo could not be added to PDF", error);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(25);
    doc.setTextColor(153, 31, 42);
    doc.text("ATLAS", 15, 27);
  }

  doc.setTextColor(25, 29, 34);
  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.text("QUOTATION", 195, 16, { align: "right" });
  doc.setDrawColor(90, 96, 103);
  doc.line(128, 19, 195, 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(153, 31, 42);
  doc.text("Atlas Tiling", 128, 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(85, 92, 100);
  [
    "Licence: CPC 31311",
    "Insurance: 2674838",
    "ABN: 72 353 120 200",
    "Mill Point Rd, South Perth WA 6152"
  ].forEach((line, index) => doc.text(line, 128, 30 + index * 4));

  doc.setFillColor(247, 248, 249);
  doc.roundedRect(15, 49, 180, 15, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(112, 120, 129);
  doc.text("DATE", 20, 54);
  doc.text("QUOTATION NUMBER", 78, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 35, 40);
  doc.text(formatDateForQuote(get("quoteDate").value), 20, 60);
  doc.text(quoteNumber, 78, 60);

  const customerLines = [
    customerName,
    get("customerPhone").value.trim() ? `Mobile: ${get("customerPhone").value.trim()}` : "",
    get("customerEmail").value.trim() ? `Email: ${get("customerEmail").value.trim()}` : "",
    get("customerAddress").value.trim() ? `Address: ${get("customerAddress").value.trim()}` : ""
  ].filter(Boolean);
  const wrappedCustomer = customerLines.flatMap((line, index) =>
    index === 0 ? [line] : doc.splitTextToSize(line, 165)
  );
  const customerHeight = Math.max(23, 11 + wrappedCustomer.length * 4);
  doc.setFillColor(251, 246, 247);
  doc.roundedRect(15, 69, 180, customerHeight, 2, 2, "F");
  doc.setFillColor(153, 31, 42);
  doc.rect(15, 69, 1.4, customerHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(112, 120, 129);
  doc.text("PREPARED FOR", 20, 75);
  let customerY = 81;
  wrappedCustomer.forEach((line, index) => {
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(index === 0 ? 11 : 8.2);
    doc.setTextColor(index === 0 ? 28 : 82, index === 0 ? 33 : 90, index === 0 ? 39 : 99);
    doc.text(line, 20, customerY);
    customerY += index === 0 ? 5 : 4;
  });

  let tableY = 69 + customerHeight + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(105, 112, 120);
  doc.text("SCOPE OF WORK", 15, tableY);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(153, 31, 42);
  doc.text("Shower re-tiling", 195, tableY, { align: "right" });
  tableY += 4;

  if (typeof doc.autoTable !== "function") {
    throw new Error("The PDF table generator did not load.");
  }

  doc.autoTable({
    startY: tableY,
    margin: { left: 15, right: 15, top: 20, bottom: 15 },
    head: [["No.", "Description", "Qty", "Unit price", "Total"]],
    body: totals.selected.map((item, index) => [
      String(index + 1),
      `${item.title}\n${item.detail}`,
      String(item.quantity),
      formatMoney(item.price),
      formatMoney(lineTotal(item))
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.4,
      cellPadding: 2.5,
      lineColor: [220, 224, 228],
      lineWidth: 0.2,
      textColor: [52, 59, 67],
      overflow: "linebreak",
      valign: "top"
    },
    headStyles: {
      fillColor: [153, 31, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2
    },
    columnStyles: {
      0: { cellWidth: 11, halign: "center" },
      1: { cellWidth: 99 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 27, halign: "right" },
      4: { cellWidth: 28, halign: "right", fontStyle: "bold" }
    },
    showHead: "everyPage"
  });

  let y = (doc.lastAutoTable?.finalY || tableY) + 7;
  y = ensurePdfSpace(doc, y, 54, "QUOTE SUMMARY");

  const supplyText = get("supplyNote").value.trim() || "Not specified.";
  const extraText = get("additionalNotes").value.trim();
  const supplyLines = doc.splitTextToSize(supplyText, 96);
  const extraLines = extraText ? doc.splitTextToSize(extraText, 96) : [];
  const notesHeight = Math.max(38, 13 + (supplyLines.length + extraLines.length) * 3.6 + (extraLines.length ? 8 : 0));
  const summaryHeight = Math.max(notesHeight, get("includeGst").checked ? 43 : 35);

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(216, 220, 225);
  doc.roundedRect(15, y, 108, summaryHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(153, 31, 42);
  doc.text("SUPPLY INCLUDED", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(79, 87, 96);
  doc.text(supplyLines, 20, y + 12);

  if (extraLines.length) {
    const extraY = y + 15 + supplyLines.length * 3.6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(153, 31, 42);
    doc.text("ADDITIONAL NOTES", 20, extraY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 87, 96);
    doc.text(extraLines, 20, extraY + 5);
  }

  const totalX = 128;
  const totalWidth = 67;
  const totalRows = [
    ["Subtotal", formatMoney(totals.subtotal)],
    ...(get("includeGst").checked ? [["GST (10%)", formatMoney(totals.gst)]] : []),
    ["TOTAL", formatMoney(totals.total)],
    [`Deposit (${totals.depositPercent}%)`, formatMoney(totals.deposit)]
  ];
  totalRows.forEach((row, index) => {
    const rowY = y + index * 10;
    const isTotal = row[0] === "TOTAL";
    doc.setFillColor(...(isTotal ? [153, 31, 42] : [248, 249, 250]));
    doc.setDrawColor(216, 220, 225);
    doc.rect(totalX, rowY, totalWidth, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isTotal ? 9 : 7.5);
    doc.setTextColor(...(isTotal ? [255, 255, 255] : [62, 69, 77]));
    doc.text(row[0], totalX + 4, rowY + 6.5);
    doc.text(row[1], totalX + totalWidth - 4, rowY + 6.5, { align: "right" });
  });

  y += summaryHeight + 8;
  y = ensurePdfSpace(doc, y, 54, "TERMS AND CONDITIONS");
  doc.setDrawColor(55, 61, 67);
  doc.line(15, y, 195, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(31, 36, 41);
  doc.text("TERMS AND CONDITIONS", 15, y + 6);
  y += 11;

  const terms = [
    "A 10% deposit is required before work commences unless otherwise agreed.",
    "Removal of waste is by the client unless included in the selected scope.",
    "Changes or additions to the agreed work will be charged separately.",
    "Final payment is due within 2 days after completion of work.",
    "All materials remain the property of Atlas Tiling until the final invoice is paid.",
    "This quotation is valid for 30 days from the quotation date.",
    "A cancellation deposit is non-refundable once materials, scheduling or other preliminary work has been arranged."
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(76, 84, 93);
  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, 170);
    if (y + lines.length * 3.5 > 276) {
      doc.addPage();
      y = addPdfPageHeading(doc, "TERMS AND CONDITIONS");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(76, 84, 93);
    }
    doc.setFillColor(153, 31, 42);
    doc.circle(18, y - 1, 0.7, "F");
    doc.text(lines, 22, y);
    y += lines.length * 3.5 + 1.5;
  });

  y = ensurePdfSpace(doc, y + 4, 34, "PAYMENT & CONTACT");
  doc.setDrawColor(105, 112, 119);
  doc.line(15, y, 195, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(35, 40, 46);
  doc.text("Payment details", 15, y + 7);
  doc.text("Sam", 118, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(79, 87, 96);
  ["Bank: NAB", "BSB: 086-479", "Account: 146577347"].forEach((line, index) => doc.text(line, 15, y + 12 + index * 4));
  ["Mobile: 0450 418 618", "Email: atlastiling@live.com.au", "Web: atlasbathroomrenovations.com.au"].forEach((line, index) => doc.text(line, 118, y + 12 + index * 4));
  doc.setFont("times", "bolditalic");
  doc.setFontSize(11);
  doc.setTextColor(153, 31, 42);
  doc.text("PERFECTION IS OUR STANDARD", pageWidth / 2, y + 29, { align: "center" });

  drawPdfFooter(doc);
  doc.save(filename);
}

function addReferenceStyleHeader(doc, logo) {
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 25, 11, 68, 28, undefined, "FAST");
    } catch (error) {
      console.warn("Logo could not be added to PDF", error);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(27);
    doc.setTextColor(176, 46, 52);
    doc.text("ATLAS", 25, 29);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(22);
  doc.text("Quotation", 148, 25);
  doc.setLineWidth(0.55);
  doc.line(147, 27, 190, 27);

  doc.setTextColor(112, 112, 112);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(13);
  doc.text("Atlas Tiling", 148, 34);
  doc.setFont("times", "italic");
  doc.setFontSize(8.2);
  [
    "Licence:   CPC 31311",
    "Insurance:   2674838",
    "ABN: 72 353 120 200",
    "Mill Point Rd,",
    "South Perth WA6152"
  ].forEach((line, index) => doc.text(line, 148, 39 + index * 4));
}

function addReferenceContinuationHeader(doc) {
  return 18;
}

function addReferenceTerms(doc, startY) {
  const terms = [
    "If the quote is accepted, then 10% deposit will be required before commencement of work.",
    "Removal of waste is either by Client or as agreed by quotation only with the Company.",
    "Any changes or additions will be charges accordingly.",
    "Final payment must be paid within 2 days after completion of work.",
    "All materials remain the property of Atlas Tiling until Final Invoice is paid.",
    "Prices in this quotation is valid for a period of 30 days from the date of quotation.",
    "If a client wishes to cancel the project before the job commences, please note that the deposit paid will not be refundable. The deposit serves as a security of booking and covers any preliminary expenses incurred by our company, such as securing materials, scheduling contractors, and reserving the necessary resources for the project."
  ];

  let y = startY;
  if (y > 263) {
    doc.addPage();
    y = addReferenceContinuationHeader(doc);
  }

  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.45);
  doc.line(25, y, 190, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text("TERMS AND CONDITIONS:", 25, y);
  y += 5;

  doc.setFont("times", "normal");
  doc.setFontSize(8.2);
  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, 153);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      if (y > 276) {
        doc.addPage();
        y = addReferenceContinuationHeader(doc);
        doc.setFont("times", "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(30, 30, 30);
      }
      if (lineIndex === 0) {
        doc.setFillColor(0, 0, 0);
        doc.circle(31, y - 1.1, 0.65, "F");
      }
      doc.text(lines[lineIndex], 37, y);
      y += 3.8;
    }
    y += 0.8;
  });

  return y;
}

function addReferenceContactFooter(doc, startY) {
  let y = startY + 4;
  if (y + 43 > 280) {
    doc.addPage();
    y = addReferenceContinuationHeader(doc);
  }

  doc.setDrawColor(90, 90, 90);
  doc.setLineWidth(0.45);
  doc.line(25, y, 190, y);
  y += 10;

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(35, 35, 35);
  doc.text("Atlas Tiling", 25, y);
  doc.text("Sam", 125, y);
  doc.text("Bank:   NAB", 25, y + 5);
  doc.text("Mob:   0450 418 618", 125, y + 5);
  doc.text("BSB:    086-479", 25, y + 10);
  doc.text("Email:  atlastiling@live.com.au", 125, y + 10);
  doc.text("ACC:    146577347", 25, y + 15);
  doc.text("Web:    atlasbathroomrenovations.com.au", 125, y + 15);

  doc.setFont("times", "bolditalic");
  doc.setFontSize(12);
  doc.setTextColor(183, 48, 52);
  doc.text("PERFECTION IS OUR STANDARD", 105, y + 29, { align: "center" });
}

async function downloadPdf() {
  const JsPdf = window.jspdf?.jsPDF;
  if (typeof JsPdf !== "function") {
    throw new Error("The PDF generator did not load.");
  }

  const totals = calculateTotals();
  const quoteNumber = get("quoteNumber").value.trim();
  const customerName = get("customerName").value.trim();
  const safeQuoteNumber = quoteNumber.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeCustomer = customerName.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `Atlas-Quotation-${safeQuoteNumber}-${safeCustomer}.pdf`;
  const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await getReadyLogo();

  addReferenceStyleHeader(doc, logo);

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Date:", 25, 56);
  doc.setFont("times", "bold");
  doc.text(formatDateForQuote(get("quoteDate").value), 36, 56);
  doc.setFont("times", "normal");
  doc.text("Quotation No:", 25, 61);
  doc.setFont("times", "bold");
  doc.text(quoteNumber, 49, 61);

  doc.setFont("times", "normal");
  doc.text("To:", 25, 76);
  doc.setFont("times", "bold");
  doc.text(customerName, 36, 76);
  doc.setFont("times", "bold");
  doc.text("Mob:", 25, 87);
  doc.setFont("times", "normal");
  doc.text(get("customerPhone").value.trim() || "", 36, 87);
  doc.setFont("times", "bold");
  doc.text("Email:", 25, 93);
  doc.setFont("times", "normal");
  doc.text(get("customerEmail").value.trim() || "", 40, 93);
  doc.setFont("times", "bold");
  doc.text("Add:", 25, 99);
  doc.setFont("times", "normal");
  const addressLines = doc.splitTextToSize(get("customerAddress").value.trim() || "", 148);
  doc.text(addressLines, 36, 99);

  if (typeof doc.autoTable !== "function") {
    throw new Error("The PDF table generator did not load.");
  }

  const tableStartY = 105 + Math.max(0, addressLines.length - 1) * 4;
  const additionalNotes = get("additionalNotes").value.trim();
  const tableBody = [
    [{ content: "", styles: { halign: "center" } }, { content: "Shower Re-Tiling", styles: { fontStyle: "bold", fontSize: 10 } }, ""],
    ...totals.selected.map((item, index) => [
      String(index + 1),
      `${item.title}\n${item.detail}\nQuantity: ${item.quantity}    Unit price: ${formatMoney(item.price)}`,
      formatMoney(lineTotal(item))
    ]),
    ["", { content: `Supply: ${get("supplyNote").value.trim() || "Not specified."}`, styles: { fontStyle: "bold" } }, ""],
    ...(additionalNotes ? [["", { content: `Additional notes: ${additionalNotes}`, styles: { fontStyle: "italic" } }, ""]] : [])
  ];

  doc.autoTable({
    startY: tableStartY,
    margin: { left: 25, right: 20, top: 18, bottom: 16 },
    head: [["Number", "Description", "Price"]],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "times",
      fontSize: 8.2,
      cellPadding: 2.4,
      lineColor: [105, 105, 105],
      lineWidth: 0.25,
      textColor: [32, 32, 32],
      overflow: "linebreak",
      valign: "top"
    },
    headStyles: {
      fillColor: [190, 207, 229],
      textColor: [38, 45, 53],
      fontStyle: "bold",
      fontSize: 8.6,
      halign: "center",
      cellPadding: 1.8
    },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 121 },
      2: { cellWidth: 26, halign: "right" }
    },
    showHead: "everyPage"
  });

  let y = (doc.lastAutoTable?.finalY || tableStartY) + 5;
  const priceRows = [
    ["SUBTOTAL", formatMoney(totals.subtotal)],
    ["GST", formatMoney(totals.gst)],
    ["TOTAL", formatMoney(totals.total)],
    [`Deposit Required ${totals.depositPercent}%`, formatMoney(totals.deposit)]
  ];
  const summaryHeight = priceRows.length * 8;
  if (y + summaryHeight + 5 > 278) {
    doc.addPage();
    y = addReferenceContinuationHeader(doc);
  }

  priceRows.forEach((row, index) => {
    const rowY = y + index * 8;
    doc.setFont("times", "bold");
    doc.setFontSize(index === 3 ? 9.5 : 9);
    doc.setTextColor(35, 35, 35);
    doc.text(row[0], 153, rowY + 5.5, { align: "right" });
    doc.setFillColor(90, 204, 237);
    doc.setDrawColor(105, 105, 105);
    doc.rect(164, rowY, 31, 8, "FD");
    doc.text(row[1], 192, rowY + 5.5, { align: "right" });
  });

  y += summaryHeight + 7;
  y = addReferenceTerms(doc, y);
  addReferenceContactFooter(doc, y);
  doc.save(filename);
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
  get("supplyNote").value = "Adhesive, sand, cement, primer, waterproof membrane and floor waste are included in the quote.";
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
