"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { CmsSection } from "@/lib/db/schema";
import styles from "./cms.module.css";

const SECTION_LABELS: Record<string, string> = {
  hero:         "🎥 Hero Section",
  marquee:      "📜 Marquee Strip",
  promise:      "🛡️ APRAS Promise",
  purity:       "✨ Purity Banner",
  products:     "🍯 Products Section",
  ghee:         "🥛 A2 Ghee Section",
  gallery:      "🖼️ Gallery",
  leadership:   "🏆 Leadership Callout",
  testimonials: "💬 Testimonials",
  how_it_works: "📋 How It Works",
  mission:      "🌿 Mission Quote",
  faq:          "❓ FAQ",
  cta:          "📣 Call-to-Action",
};

export default function CMSClient() {
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSections(d.data); })
      .finally(() => setLoading(false));
  }, []);

  async function toggleSection(sectionKey: string, isEnabled: boolean) {
    setToggling(sectionKey);
    await fetch(`/api/admin/cms/${sectionKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    setSections((prev) => prev.map((s) => s.sectionKey === sectionKey ? { ...s, isEnabled } : s));
    setToggling(null);
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1 className="admin-page-title">Landing Page CMS</h1>
          <p className="admin-page-subtitle">Enable, disable, and configure all landing page sections</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm">🌐 Preview Site</Button>
        </a>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size="lg" /></div>
      ) : (
        <div className={styles.sectionList}>
          {sections.map((section) => (
            <div key={section.sectionKey} className={styles.sectionRow}>
              <div className={styles.sectionInfo}>
                <span className={styles.sectionName}>{SECTION_LABELS[section.sectionKey] ?? section.sectionKey}</span>
                <span className={styles.sectionKey}>#{section.sortOrder}</span>
              </div>
              <div className={styles.sectionActions}>
                <Link href={`/admin/cms/${section.sectionKey}`} className={styles.editBtn}>✏️ Edit</Link>
                <button
                  className={[styles.toggle, section.isEnabled ? styles.toggleOn : styles.toggleOff].join(" ")}
                  onClick={() => toggleSection(section.sectionKey, !section.isEnabled)}
                  disabled={toggling === section.sectionKey}
                >
                  {toggling === section.sectionKey ? "..." : section.isEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
