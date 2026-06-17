import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isNotNull, desc } from "drizzle-orm";

export default async function LinkedAccountsReport() {
  const linkedUsers = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    bwUserId: users.bwUserId,
    bwLinkedAt: users.bwLinkedAt,
  })
  .from(users)
  .where(isNotNull(users.bwUserId))
  .orderBy(desc(users.bwLinkedAt));

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "1.5rem" }}>Linked BuyWell Global Accounts</h1>
      
      <div style={{ background: "var(--bg-secondary)", borderRadius: "0.75rem", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-primary)", textAlign: "left" }}>
              <th style={{ padding: "1rem" }}>User</th>
              <th style={{ padding: "1rem" }}>Email</th>
              <th style={{ padding: "1rem" }}>BW Global ID</th>
              <th style={{ padding: "1rem" }}>Linked At</th>
            </tr>
          </thead>
          <tbody>
            {linkedUsers.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "1rem" }}>{u.firstName} {u.lastName}</td>
                <td style={{ padding: "1rem" }}>{u.email}</td>
                <td style={{ padding: "1rem" }}>{u.bwUserId}</td>
                <td style={{ padding: "1rem" }}>{u.bwLinkedAt ? u.bwLinkedAt.toLocaleDateString("en-IN") : "N/A"}</td>
              </tr>
            ))}
            {linkedUsers.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No accounts linked yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
