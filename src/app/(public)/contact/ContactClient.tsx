"use client";
import React, { useState } from "react";
import styles from "./contact.module.css";

const SUBJECTS = [
  "Order & Delivery",
  "Returns & Refunds",
  "Product Enquiry",
  "Vendor / Seller Support",
  "Payment Issue",
  "Technical Support",
  "General Enquiry",
];

export default function ContactClient() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrMsg("");
    try {
      const res  = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setErrMsg(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrMsg("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Get in Touch</p>
          <h1 className={styles.heroTitle}>Contact Us</h1>
          <p className={styles.heroSub}>We're here to help. Reach out for any queries — we respond within 24 hours.</p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Left — Info + Map */}
          <div className={styles.infoCol}>
            <div className={styles.infoCard}>
              <h2 className={styles.infoTitle}>BuyWell Online Shopping India Pvt Ltd</h2>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📍</span>
                <div>
                  <p className={styles.infoLabel}>Office Address</p>
                  <p className={styles.infoValue}>Bheemanpadi, Kottayam West<br />Kottayam, Kerala – 686003<br />India</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>✉️</span>
                <div>
                  <p className={styles.infoLabel}>Email</p>
                  <a href="mailto:support@buywell.in" className={styles.infoLink}>support@buywell.in</a>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📱</span>
                <div>
                  <p className={styles.infoLabel}>WhatsApp / Phone</p>
                  <a href="https://wa.me/919999999999" className={styles.infoLink}>+91 99999 99999</a>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🕐</span>
                <div>
                  <p className={styles.infoLabel}>Support Hours</p>
                  <p className={styles.infoValue}>Mon – Sat: 9:00 AM – 6:00 PM IST</p>
                </div>
              </div>
            </div>

            {/* Google Maps embed */}
            <div className={styles.mapWrap}>
              <iframe
                title="BuyWell Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3934.7!2d76.5167!3d9.5916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b062b9b2b7b7b7b%3A0x1b2b3b4b5b6b7b8b!2sBheemanpadi%2C%20Kottayam%20West%2C%20Kottayam%2C%20Kerala%20686003!5e0!3m2!1sen!2sin!4v1718000000000!5m2!1sen!2sin"
                width="100%"
                height="280"
                style={{ border: 0, borderRadius: 12 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className={styles.formCol}>
            <div className={styles.formCard}>
              <h2 className={styles.formTitle}>Send Us a Message</h2>

              {status === "success" ? (
                <div className={styles.successBox}>
                  <div className={styles.successIcon}>✅</div>
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. We'll get back to you at <strong>{form.email || "your email"}</strong> within 24 hours.</p>
                  <button className={styles.resetBtn} onClick={() => setStatus("idle")}>Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Full Name <span className={styles.req}>*</span></label>
                      <input
                        className={styles.input}
                        type="text"
                        placeholder="Rahul Sharma"
                        value={form.name}
                        onChange={set("name")}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email <span className={styles.req}>*</span></label>
                      <input
                        className={styles.input}
                        type="email"
                        placeholder="you@email.com"
                        value={form.email}
                        onChange={set("email")}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Phone (Optional)</label>
                      <input
                        className={styles.input}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Subject</label>
                      <select className={styles.select} value={form.subject} onChange={set("subject")}>
                        <option value="">Select a subject…</option>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Message <span className={styles.req}>*</span></label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Describe your query in detail…"
                      rows={6}
                      value={form.message}
                      onChange={set("message")}
                      required
                    />
                  </div>

                  {status === "error" && (
                    <div className={styles.errorBox}>⚠️ {errMsg}</div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
