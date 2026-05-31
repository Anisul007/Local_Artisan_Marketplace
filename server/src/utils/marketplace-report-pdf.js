import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BRAND = {
  primary: "#4b0082",
  accent: "#6d28d9",
  muted: "#6b7280",
  border: "#e5e7eb",
  headerBg: "#f5f3ff",
  rowAlt: "#fafafa",
};

const VENDOR_SALES_COLUMNS = [
  { key: "orderNumber", label: "Order ID", width: 82 },
  { key: "date", label: "Date", width: 58 },
  { key: "status", label: "Status", width: 54 },
  { key: "product", label: "Product", width: 158 },
  { key: "quantity", label: "Qty", width: 30, align: "right" },
  { key: "unitPrice", label: "Unit (AUD)", width: 50, align: "right" },
  { key: "lineTotal", label: "Line total (AUD)", width: 57, align: "right" },
];

const PLATFORM_ORDER_COLUMNS = [
  { key: "orderNumber", label: "Order ID", width: 130 },
  { key: "date", label: "Date", width: 85 },
  { key: "status", label: "Status", width: 90 },
  { key: "total", label: "Order total (AUD)", width: 95, align: "right" },
];

function formatReportDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAddress(addr = {}) {
  const parts = [
    addr.line1,
    addr.line2,
    [addr.city, addr.state].filter(Boolean).join(" "),
    addr.postcode,
    addr.country && addr.country !== "AU" ? addr.country : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function audFromCents(cents) {
  return `A$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function prettyStatus(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  return s.replace(/\b\w/g, (c) => c.toUpperCase()) || "—";
}

async function loadBrandLogoBuffer() {
  const candidates = [
    path.resolve(__dirname, "../../../Public/images/logo.webp"),
    path.resolve(process.cwd(), "Public/images/logo.webp"),
    path.resolve(process.cwd(), "../Public/images/logo.webp"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return sharp(filePath).resize(240, 240, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    }
  }
  return null;
}

function columnsWidth(columns) {
  return columns.reduce((sum, c) => sum + c.width, 0);
}

function drawTableHeader(doc, x, y, columns) {
  const w = columnsWidth(columns);
  doc.save();
  doc.rect(x, y, w, 22).fill(BRAND.headerBg);
  doc.restore();

  let cx = x;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BRAND.primary);
  for (const col of columns) {
    doc.text(col.label, cx + 4, y + 7, {
      width: col.width - 8,
      align: col.align || "left",
      lineBreak: false,
    });
    cx += col.width;
  }

  doc.moveTo(x, y + 22).lineTo(x + w, y + 22).strokeColor(BRAND.accent).lineWidth(1).stroke();
  return y + 22;
}

function rowHeight(doc, row, columns, wrapKey) {
  if (!wrapKey) return 20;
  const col = columns.find((c) => c.key === wrapKey);
  if (!col) return 20;
  const text = String(row[wrapKey] ?? "");
  return Math.max(20, doc.heightOfString(text, { width: col.width - 8 }) + 10);
}

function drawTableRow(doc, x, y, row, columns, shaded, wrapKey) {
  const rowH = rowHeight(doc, row, columns, wrapKey);
  const w = columnsWidth(columns);

  if (shaded) {
    doc.save();
    doc.rect(x, y, w, rowH).fill(BRAND.rowAlt);
    doc.restore();
  }

  let cx = x;
  doc.font("Helvetica").fontSize(8).fillColor("#111827");
  for (const col of columns) {
    const text = String(row[col.key] ?? "");
    doc.text(text, cx + 4, y + 6, {
      width: col.width - 8,
      align: col.align || "left",
      lineBreak: wrapKey === col.key,
    });
    cx += col.width;
  }

  doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).strokeColor(BRAND.border).lineWidth(0.5).stroke();
  return y + rowH;
}

function renderDataTable(doc, { x, y, columns, rows, pageBottom, wrapKey, emptyMessage }) {
  const renderHeader = () => {
    y = drawTableHeader(doc, x, y, columns);
  };

  renderHeader();

  if (!rows.length) {
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text(emptyMessage, x, y + 8);
    return y + 28;
  }

  rows.forEach((row, idx) => {
    const h = rowHeight(doc, row, columns, wrapKey);
    if (y + h > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      renderHeader();
    }
    y = drawTableRow(doc, x, y, row, columns, idx % 2 === 1, wrapKey);
  });

  return y;
}

function addPageFooters(doc, label) {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i += 1) {
    doc.switchToPage(i);
    const footerY = doc.page.height - 36;
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.muted);
    doc.text(
      `Artisan Avenue · ${label} · Page ${i + 1} of ${total}`,
      doc.page.margins.left,
      footerY,
      { align: "center", width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    );
  }
}

function drawInfoBox(doc, left, top, contentW, boxTitle, lines) {
  const lineH = 11;
  const boxH = 28 + lines.length * lineH;
  doc.save();
  doc.roundedRect(left, top, contentW, boxH, 6).fillAndStroke(BRAND.headerBg, "#ddd6fe");
  doc.restore();

  let vy = top + 12;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.primary).text(boxTitle, left + 14, vy);
  vy += 16;

  for (const [label, value] of lines) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151").text(`${label}:`, left + 14, vy, { width: 100 });
    doc.font("Helvetica").fontSize(8).fillColor("#111827").text(String(value), left + 118, vy, {
      width: contentW - 132,
    });
    vy += lineH;
  }

  return top + boxH;
}

function drawSummaryStrip(doc, left, y, contentW, title, body) {
  doc.save();
  doc.roundedRect(left, y, contentW, 36, 4).fillAndStroke("#ecfdf5", "#a7f3d0");
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#065f46").text(title, left + 12, y + 10);
  doc.font("Helvetica").fontSize(9).fillColor("#047857").text(body, left + 12, y + 22, { width: contentW - 24 });
  return y + 48;
}

async function runPdfBuild(title, footerLabel, buildContent) {
  const logoBuf = await loadBrandLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: { Title: title, Author: "Artisan Avenue" },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const left = doc.page.margins.left;
      const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const rightEdge = doc.page.width - doc.page.margins.right;
      const pageBottom = doc.page.height - doc.page.margins.bottom - 48;

      if (logoBuf) {
        doc.image(logoBuf, rightEdge - 72, 42, { width: 72, height: 72 });
      }

      buildContent({ doc, left, contentW, pageBottom, logoBuf });
      addPageFooters(doc, footerLabel);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function buildVendorSalesPdf({ vendor = {}, user = {}, period = {}, rows = [] }) {
  const tableRows = rows.map((r) => ({
    orderNumber: String(r.orderNumber || "—"),
    date: formatReportDate(r.createdAt),
    status: String(r.statusLabel || r.status || "—"),
    product: String(r.title || "Item"),
    quantity: String(Number(r.quantity) || 0),
    unitPrice: audFromCents(r.priceCents),
    lineTotal: audFromCents(r.lineTotalCents),
  }));

  const totalLineCents = rows.reduce((sum, r) => sum + Number(r.lineTotalCents || 0), 0);
  const totalUnits = rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  return runPdfBuild("Vendor Sales Report", "Confidential vendor report", ({ doc, left, contentW, pageBottom }) => {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(BRAND.primary).text("Vendor Sales Report", left, 48, {
      width: contentW - 90,
    });
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("Artisan Avenue Marketplace", left, 76);

    const businessName = vendor.businessName || user.name || "Vendor";
    const boxBottom = drawInfoBox(doc, left, 108, contentW, "Vendor details", [
      ["Business", businessName],
      ["Contact email", vendor.contactEmail || user.email || "—"],
      ["Phone", vendor.phone || "—"],
      ["Website", vendor.website || "—"],
      ["Address", formatAddress(vendor.address)],
      ["Report period", `${formatReportDate(period.from)} – ${formatReportDate(period.to)}`],
      ["Generated", formatReportDate(new Date())],
    ]);

    let y = boxBottom + 20;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Sales detail", left, y);
    y += 18;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(
        `${tableRows.length} line item${tableRows.length === 1 ? "" : "s"} · ${totalUnits} units · ${audFromCents(totalLineCents)} gross line total`,
        left,
        y
      );
    y += 16;

    y = renderDataTable(doc, {
      x: left,
      y,
      columns: VENDOR_SALES_COLUMNS,
      rows: tableRows,
      pageBottom,
      wrapKey: "product",
      emptyMessage: "No sales in this period.",
    });

    y += 12;
    if (y + 40 > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    drawSummaryStrip(
      doc,
      left,
      y,
      contentW,
      "Summary",
      `Line items: ${tableRows.length}   ·   Units sold: ${totalUnits}   ·   Gross line total: ${audFromCents(totalLineCents)}`
    );
  });
}

export async function buildPlatformReportPdf({ period = {}, metrics = {}, orders = [] }) {
  const tableRows = orders.map((o) => ({
    orderNumber: String(o.orderNumber || "—"),
    date: formatReportDate(o.createdAt),
    status: String(o.statusLabel || prettyStatus(o.status)),
    total: audFromCents(o.totalCents),
  }));

  const revenueCents = Number(metrics.revenueCents ?? 0);
  const orderCount = Number(metrics.orderCount ?? orders.length);
  const userCount = Number(metrics.userCount ?? 0);
  const vendorCount = Number(metrics.vendorCount ?? 0);

  return runPdfBuild("Platform Report", "Confidential platform report", ({ doc, left, contentW, pageBottom }) => {
    doc.font("Helvetica-Bold").fontSize(20).fillColor(BRAND.primary).text("Platform Report", left, 48, {
      width: contentW - 90,
    });
    doc.font("Helvetica").fontSize(10).fillColor(BRAND.muted).text("Artisan Avenue Marketplace", left, 76);

    const boxBottom = drawInfoBox(doc, left, 108, contentW, "Report overview", [
      ["Report period", `${formatReportDate(period.from)} – ${formatReportDate(period.to)}`],
      ["Generated", formatReportDate(new Date())],
      ["New customers", userCount],
      ["New vendors", vendorCount],
      ["Orders in period", orderCount],
      ["Gross order value", audFromCents(revenueCents)],
    ]);

    let y = boxBottom + 20;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Orders", left, y);
    y += 18;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(`${tableRows.length} order${tableRows.length === 1 ? "" : "s"} in selected period`, left, y);
    y += 16;

    y = renderDataTable(doc, {
      x: left,
      y,
      columns: PLATFORM_ORDER_COLUMNS,
      rows: tableRows,
      pageBottom,
      wrapKey: null,
      emptyMessage: "No orders in this period.",
    });

    y += 12;
    if (y + 40 > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    drawSummaryStrip(
      doc,
      left,
      y,
      contentW,
      "Summary",
      `Orders: ${orderCount}   ·   Gross order value: ${audFromCents(revenueCents)}   ·   New customers: ${userCount}   ·   New vendors: ${vendorCount}`
    );
  });
}
