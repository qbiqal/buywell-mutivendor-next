import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { desc, gt, eq } from "drizzle-orm";

export default async function WalletTransactionsReport() {
  const walletOrders = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    totalInr: orders.totalInr,
    bwWalletAmount: orders.bwWalletAmount,
    bwWalletTransactionId: orders.bwWalletTransactionId,
    createdAt: orders.createdAt,
    customerName: users.firstName,
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id))
  .where(gt(orders.bwWalletAmount, 0))
  .orderBy(desc(orders.createdAt));

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "1.5rem" }}>Wallet Payment Transactions</h1>
      
      <div style={{ background: "var(--bg-secondary)", borderRadius: "0.75rem", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-primary)", textAlign: "left" }}>
              <th style={{ padding: "1rem" }}>Date</th>
              <th style={{ padding: "1rem" }}>Order</th>
              <th style={{ padding: "1rem" }}>Customer</th>
              <th style={{ padding: "1rem" }}>Wallet Amt</th>
              <th style={{ padding: "1rem" }}>BW Txn ID</th>
            </tr>
          </thead>
          <tbody>
            {walletOrders.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "1rem" }}>{o.createdAt.toLocaleDateString("en-IN")}</td>
                <td style={{ padding: "1rem" }}><strong>{o.orderNumber}</strong></td>
                <td style={{ padding: "1rem" }}>{o.customerName || "Guest"}</td>
                <td style={{ padding: "1rem" }}>₹{(Number(o.bwWalletAmount) / 100).toFixed(2)}</td>
                <td style={{ padding: "1rem" }}><code style={{ fontSize: "0.75rem" }}>{o.bwWalletTransactionId}</code></td>
              </tr>
            ))}
            {walletOrders.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No wallet transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
