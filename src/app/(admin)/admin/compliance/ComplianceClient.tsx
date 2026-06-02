"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "../workflows.module.css";

type Tab = "gdpr" | "dpdp" | "policies" | "modules";

interface ComplianceCheck {
  id: string;
  complianceKey: string;
  moduleKey: string;
  title: string;
  description: string | null;
  status: string;
  evidence: string | null;
  updatedAt: string;
}

interface PolicyPage {
  id: string;
  title: string;
  slug: string;
  moduleKey: string;
  policyType: string | null;
  status: string;
}

export default function ComplianceClient() {
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("gdpr");
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [policies, setPolicies] = useState<PolicyPage[]>([]);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const json = await fetch("/api/admin/compliance").then((res) => res.json());
    if (json.success) {
      setChecks(json.data.checks);
      setPolicies(json.data.policies);
      setModules(json.data.modules);
    }
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const visibleChecks = useMemo(() => checks.filter((check) => check.complianceKey === tab), [checks, tab]);

  async function update(check: ComplianceCheck, status: string) {
    const evidence = prompt("Evidence / notes", check.evidence ?? "") ?? check.evidence ?? "";
    const json = await fetch("/api/admin/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: check.id, status, evidence }),
    }).then((res) => res.json());
    if (!json.success) { showError(json.error ?? "Compliance update failed"); return; }
    success("Compliance item updated");
    setChecks((current) => current.map((row) => row.id === check.id ? json.data : row));
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Compliance</h1>
          <p className="admin-page-subtitle">Track GDPR and DPDP readiness, evidence, and module-specific policy coverage.</p>
        </div>
      </div>
      <div className={styles.tabs}>
        {(["gdpr", "dpdp", "policies", "modules"] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? styles.active : ""} onClick={() => setTab(item)}>
            {item.toUpperCase()}
          </button>
        ))}
      </div>
      {loading ? <Spinner size="lg" /> : tab === "policies" ? (
        <table className={styles.table}>
          <thead><tr><th>Policy</th><th>Module</th><th>Type</th><th>Status</th><th>Links</th></tr></thead>
          <tbody>{policies.map((page) => (
            <tr key={page.id}>
              <td>{page.title}</td>
              <td>{page.moduleKey}</td>
              <td>{page.policyType ?? "regular"}</td>
              <td><span className={styles.badge}>{page.status}</span></td>
              <td><Link href={`/${page.slug}`} target="_blank">View</Link> · <Link href={`/admin/cms/pages/${page.id}/edit`}>Edit</Link></td>
            </tr>
          ))}</tbody>
        </table>
      ) : tab === "modules" ? (
        <table className={styles.table}>
          <thead><tr><th>Module</th><th>Enabled</th></tr></thead>
          <tbody>{Object.entries(modules).map(([key, enabled]) => (
            <tr key={key}><td>{key}</td><td><span className={styles.badge}>{enabled ? "enabled" : "disabled"}</span></td></tr>
          ))}</tbody>
        </table>
      ) : visibleChecks.length === 0 ? <div className={styles.empty}>No compliance checks found.</div> : (
        <div className={styles.grid}>
          {visibleChecks.map((check) => (
            <article key={check.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.title}>{check.title}</p>
                  <p className={styles.meta}>{check.moduleKey} · Updated {new Date(check.updatedAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={styles.badge}>{check.status}</span>
              </div>
              {check.description && <p className={styles.body}>{check.description}</p>}
              {check.evidence && <p className={styles.meta}>{check.evidence}</p>}
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={() => update(check, "fulfilled")}>Fulfilled</button>
                <button className={styles.actionBtn} onClick={() => update(check, "partial")}>Partial</button>
                <button className={styles.actionBtn} onClick={() => update(check, "missing")}>Missing</button>
                <button className={styles.actionBtn} onClick={() => update(check, "not_applicable")}>N/A</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
