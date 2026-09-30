import { db } from "@/lib/db";
import { orders, orderItems, products, productVariants, vendors, taxRates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSiteConfig } from "@/lib/config";

export interface InvoiceViewer {
  userId: string;
  role: "admin" | "customer" | "vendor";
  vendorId?: number;
}

interface Party {
  name: string;
  address: string;
  state: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
}

interface InvoiceLine {
  name: string;
  hsn: string | null;
  qty: number;
  unit: number;
  gross: number;
  taxable: number;
  rateBp: number;
  cgst: number;
  sgst: number;
  igst: number;
  seller: string;
}

export type InvoiceResult =
  | { ok: true; html: string; invoiceNumber: string }
  | { ok: false; status: number; error: string };

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const inr = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export async function buildInvoice(orderId: string, viewer: InvoiceViewer): Promise<InvoiceResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.isDeleted) return { ok: false, status: 404, error: "Order not found" };
  if (viewer.role === "customer" && order.userId !== viewer.userId) {
    return { ok: false, status: 404, error: "Order not found" };
  }

  const [siteName, siteAddress, siteEmail, sitePhone, siteGstin, siteState] = await Promise.all([
    getSiteConfig("site_name"), getSiteConfig("site_address"), getSiteConfig("site_email"),
    getSiteConfig("site_phone"), getSiteConfig("site_gstin"), getSiteConfig("site_state"),
  ]);
  const platform: Party = {
    name: siteName || "BuyWell Marketplace",
    address: siteAddress || "",
    state: siteState || "Kerala",
    gstin: siteGstin || null,
    phone: sitePhone || null,
    email: siteEmail || null,
  };

  const rows = await db
    .select({
      snapshot: orderItems.productSnapshot,
      quantity: orderItems.quantity,
      unitPriceInr: orderItems.unitPriceInr,
      totalInr: orderItems.totalInr,
      hsnCode: products.hsnCode,
      vendorId: products.vendorId,
      totalRate: taxRates.totalRate,
      storeName: vendors.storeName,
      vAddress: vendors.address,
      vCity: vendors.city,
      vState: vendors.state,
      vPincode: vendors.pincode,
      vGstin: vendors.gstin,
      vPhone: vendors.phone,
      vEmail: vendors.email,
    })
    .from(orderItems)
    .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .leftJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(taxRates, eq(taxRates.id, products.taxRateId))
    .leftJoin(vendors, eq(vendors.id, products.vendorId))
    .where(eq(orderItems.orderId, order.id));

  const visible = viewer.role === "vendor" ? rows.filter((r) => r.vendorId === viewer.vendorId) : rows;
  if (viewer.role === "vendor" && visible.length === 0) {
    return { ok: false, status: 404, error: "Order not found" };
  }

  const addr = (order.addressSnapshot ?? {}) as Record<string, string>;
  const buyerState = norm(addr.state);

  const sellers = new Map<string, Party>();
  const lines: InvoiceLine[] = visible.map((r) => {
    const seller: Party = r.vendorId && r.storeName
      ? {
          name: r.storeName,
          address: [r.vAddress, r.vCity, r.vPincode].filter(Boolean).join(", "),
          state: r.vState ?? "",
          gstin: r.vGstin,
          phone: r.vPhone,
          email: r.vEmail,
        }
      : platform;
    sellers.set(seller.name, seller);

    const rateBp = r.totalRate ?? 0; // basis points, prices are GST-inclusive
    const taxable = rateBp ? Math.round((r.totalInr * 10000) / (10000 + rateBp)) : r.totalInr;
    const tax = r.totalInr - taxable;
    const intraState = !!buyerState && buyerState === norm(seller.state);
    const cgst = intraState ? Math.floor(tax / 2) : 0;
    const sgst = intraState ? tax - cgst : 0;
    const igst = intraState ? 0 : tax;
    const snap = (r.snapshot ?? {}) as Record<string, string>;
    const name = [snap.productName, snap.variantName && snap.variantName !== snap.productName ? snap.variantName : ""]
      .filter(Boolean).join(" — ");
    return { name, hsn: r.hsnCode, qty: r.quantity, unit: r.unitPriceInr, gross: r.totalInr, taxable, rateBp, cgst, sgst, igst, seller: seller.name };
  });

  const includeShipping = viewer.role !== "vendor";
  const shipping = includeShipping ? order.shippingInr : 0;
  const sum = (k: "taxable" | "cgst" | "sgst" | "igst" | "gross") => lines.reduce((s, l) => s + l[k], 0);
  const grandTotal = sum("gross") + shipping - (includeShipping ? order.discountInr : 0);
  const invoiceNumber = `INV-${order.orderNumber}`;
  const showSplit = lines.some((l) => l.cgst || l.sgst);
  const showIgst = lines.some((l) => l.igst);

  const sellerBlocks = [...sellers.values()].map((s) => `
    <div class="party"><h4>Sold by</h4>
      <strong>${esc(s.name)}</strong><br>${esc(s.address)}${s.state ? `<br>${esc(s.state)}` : ""}
      ${s.gstin ? `<br>GSTIN: ${esc(s.gstin)}` : ""}${s.phone ? `<br>${esc(s.phone)}` : ""}${s.email ? `<br>${esc(s.email)}` : ""}
    </div>`).join("");

  const taxHead = `${showSplit ? "<th class=r>CGST</th><th class=r>SGST</th>" : ""}${showIgst ? "<th class=r>IGST</th>" : ""}`;
  const lineRows = lines.map((l, i) => `
    <tr><td>${i + 1}</td><td>${esc(l.name)}${sellers.size > 1 ? `<div class="sub">Sold by ${esc(l.seller)}</div>` : ""}</td>
    <td>${esc(l.hsn ?? "—")}</td><td class=r>${l.qty}</td><td class=r>${inr(l.unit)}</td>
    <td class=r>${inr(l.taxable)}</td><td class=r>${(l.rateBp / 100).toFixed(2)}%</td>
    ${showSplit ? `<td class=r>${inr(l.cgst)}</td><td class=r>${inr(l.sgst)}</td>` : ""}${showIgst ? `<td class=r>${inr(l.igst)}</td>` : ""}
    <td class=r>${inr(l.gross)}</td></tr>`).join("");

  const paid = order.paymentStatus === "verified";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Invoice ${esc(invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;margin:0;background:#f3f4f6}
.sheet{max-width:900px;margin:24px auto;background:#fff;padding:36px;border-radius:8px;box-shadow:0 1px 8px rgba(0,0,0,.08)}
.top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:2px solid #111;padding-bottom:16px}
h1{margin:0;font-size:26px;letter-spacing:.04em}.meta{text-align:right;font-size:13px;line-height:1.6}
.parties{display:flex;gap:24px;flex-wrap:wrap;margin:20px 0}.party{flex:1;min-width:220px;font-size:13px;line-height:1.55}
.party h4{margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280}
table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.r{text-align:right}.sub{color:#6b7280;font-size:11px}
.totals{margin:16px 0 0 auto;width:320px;font-size:13px}.totals div{display:flex;justify-content:space-between;padding:4px 0}
.totals .grand{border-top:2px solid #111;margin-top:6px;padding-top:8px;font-weight:700;font-size:15px}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${paid ? "#dcfce7" : "#fef3c7"};color:${paid ? "#166534" : "#92400e"}}
.foot{margin-top:28px;font-size:11.5px;color:#6b7280}.actions{max-width:900px;margin:16px auto 0;text-align:right}
button{background:#111;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer}
@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;padding:0;max-width:none}.actions{display:none}}
@media(max-width:640px){.sheet{padding:16px;overflow-x:auto}.meta{text-align:left}}
</style></head><body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
  <div class="top"><div><h1>TAX INVOICE</h1><div class="sub">${esc(platform.name)}</div></div>
  <div class="meta"><strong>${esc(invoiceNumber)}</strong><br>Order: ${esc(order.orderNumber)}<br>
  Date: ${esc(new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))}<br>
  Payment: <span class="badge">${paid ? "PAID" : esc(String(order.paymentStatus).toUpperCase())}</span>${order.paymentGateway ? ` (${esc(order.paymentGateway)})` : ""}</div></div>
  <div class="parties">${sellerBlocks}
    <div class="party"><h4>Bill / Ship to</h4><strong>${esc(addr.name ?? order.guestName ?? "Customer")}</strong><br>
    ${esc([addr.line1, addr.line2].filter(Boolean).join(", "))}<br>${esc([addr.city, addr.state, addr.pincode].filter(Boolean).join(", "))}
    ${addr.phone ? `<br>${esc(addr.phone)}` : ""}</div></div>
  <table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class=r>Qty</th><th class=r>Rate</th><th class=r>Taxable</th><th class=r>GST</th>${taxHead}<th class=r>Amount</th></tr></thead>
  <tbody>${lineRows}</tbody></table>
  <div class="totals">
    <div><span>Taxable value</span><span>${inr(sum("taxable"))}</span></div>
    ${showSplit ? `<div><span>CGST</span><span>${inr(sum("cgst"))}</span></div><div><span>SGST</span><span>${inr(sum("sgst"))}</span></div>` : ""}
    ${showIgst ? `<div><span>IGST</span><span>${inr(sum("igst"))}</span></div>` : ""}
    ${includeShipping ? `<div><span>Shipping</span><span>${inr(shipping)}</span></div>` : ""}
    ${includeShipping && order.discountInr ? `<div><span>Discount</span><span>-${inr(order.discountInr)}</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${inr(grandTotal)}</span></div>
  </div>
  <div class="foot">Item prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.</div>
</div></body></html>`;

  return { ok: true, html, invoiceNumber };
}
