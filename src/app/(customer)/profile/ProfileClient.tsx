"use client";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import styles from "./profile.module.css";

interface Address {
  id: string; label?: string; name: string; phone: string;
  line1: string; line2?: string; city: string; state: string; pincode: string; isDefault: boolean;
}

interface Profile {
  id: string; email: string; firstName: string; lastName?: string;
  phone?: string; avatarUrl?: string; createdAt: string;
  deletionRequestedAt?: string | null;
  addresses: Address[];
}

const EMPTY_ADDRESS = { label: "", name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", isDefault: false };

export default function ProfileClient() {
  const { success, error: showError } = useToast();
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [addrModal,  setAddrModal]  = useState(false);
  const [pwModal,    setPwModal]    = useState(false);
  const [addrForm,   setAddrForm]   = useState({ ...EMPTY_ADDRESS });
  const [pw,          setPw]          = useState({ current: "", newPw: "", confirm: "" });
  const [showPwFields, setShowPwFields] = useState({ current: false, newPw: false, confirm: false });
  const [savingAddr,    setSavingAddr]    = useState(false);
  const [savingPw,      setSavingPw]      = useState(false);
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deletingAcct,  setDeletingAcct]  = useState(false);
  const [cancellingDel, setCancellingDel] = useState(false);

  useEffect(() => {
    fetch("/api/customer/profile")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.data); })
      .finally(() => setLoading(false));
  }, []);

  function setField(k: keyof typeof addrForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setAddrForm((p) => ({ ...p, [k]: e.target.value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const res  = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone }),
      });
      const data = await res.json();
      if (data.success) { success("Profile updated!"); setProfile((p) => p ? { ...p, ...data.data } : p); }
      else showError(data.error ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const res  = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addrForm),
      });
      const data = await res.json();
      if (data.success) {
        success("Address added!");
        setProfile((p) => p ? { ...p, addresses: [...p.addresses, data.data] } : p);
        setAddrModal(false);
        setAddrForm({ ...EMPTY_ADDRESS });
      } else {
        showError(data.error ?? "Failed to add address");
      }
    } finally {
      setSavingAddr(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm("Remove this address?")) return;
    const res  = await fetch(`/api/customer/addresses?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      success("Address removed");
      setProfile((p) => p ? { ...p, addresses: p.addresses.filter((a) => a.id !== id) } : p);
    } else {
      showError("Failed to remove address");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.newPw !== pw.confirm) { showError("Passwords do not match"); return; }
    if (pw.newPw.length < 8) { showError("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const res  = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.newPw }),
      });
      const data = await res.json();
      if (data.success) { success("Password changed!"); setPwModal(false); setPw({ current: "", newPw: "", confirm: "" }); }
      else showError(data.error ?? "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  }

  async function requestAccountDeletion() {
    setDeletingAcct(true);
    try {
      const res = await fetch("/api/customer/delete-account", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        success("Account deletion scheduled. You have 60 days to change your mind.");
        setProfile((p) => p ? { ...p, deletionRequestedAt: new Date().toISOString() } : p);
        setDeleteModal(false);
      } else {
        showError(data.error ?? "Failed to schedule deletion");
      }
    } finally {
      setDeletingAcct(false);
    }
  }

  async function cancelAccountDeletion() {
    setCancellingDel(true);
    try {
      const res = await fetch("/api/customer/delete-account", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        success("Account restored! Glad to have you back.");
        setProfile((p) => p ? { ...p, deletionRequestedAt: null } : p);
      } else {
        showError(data.error ?? "Failed to cancel deletion");
      }
    } finally {
      setCancellingDel(false);
    }
  }

  if (loading) return <div className={styles.page}><Spinner size="lg" /></div>;
  if (!profile) return <div className={styles.page}><p>Failed to load profile.</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>My Profile</h1>

        <div className={styles.grid}>
          {/* Personal info */}
          <Card padding="none">
            <CardHeader><h2 className={styles.cardTitle}>Personal Information</h2></CardHeader>
            <form onSubmit={saveProfile}>
              <CardBody className={styles.fields}>
                <div className={styles.row}>
                  <Input
                    label="First Name"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => p ? { ...p, firstName: e.target.value } : p)}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={profile.lastName ?? ""}
                    onChange={(e) => setProfile((p) => p ? { ...p, lastName: e.target.value } : p)}
                  />
                </div>
                <Input label="Email" value={profile.email} disabled />
                <Input
                  label="Phone"
                  value={profile.phone ?? ""}
                  onChange={(e) => setProfile((p) => p ? { ...p, phone: e.target.value } : p)}
                  placeholder="+91 9876543210"
                />
                <p className={styles.memberSince}>
                  Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </p>
              </CardBody>
              <CardFooter>
                <div className={styles.footerRow}>
                  <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setPwModal(true)}>Change Password</Button>
                </div>
              </CardFooter>
            </form>
          </Card>

          {/* Addresses */}
          <Card padding="none">
            <CardHeader>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>Saved Addresses</h2>
                <Button type="button" variant="secondary" size="sm" onClick={() => setAddrModal(true)}>+ Add</Button>
              </div>
            </CardHeader>
            <CardBody>
              {profile.addresses.length === 0 ? (
                <div className={styles.noAddresses}>
                  <p>No addresses saved yet.</p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAddrModal(true)}>Add Address</Button>
                </div>
              ) : (
                <div className={styles.addressList}>
                  {profile.addresses.map((addr) => (
                    <div key={addr.id} className={[styles.addressCard, addr.isDefault ? styles.defaultAddr : ""].join(" ")}>
                      <div className={styles.addrTop}>
                        <div>
                          {addr.label && <span className={styles.addrLabel}>{addr.label}</span>}
                          {addr.isDefault && <span className={styles.defaultBadge}>Default</span>}
                        </div>
                        <button onClick={() => deleteAddress(addr.id)} className={styles.removeAddrBtn}>✕ Remove</button>
                      </div>
                      <p className={styles.addrName}>{addr.name}</p>
                      <p className={styles.addrText}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                      <p className={styles.addrText}>{addr.city}, {addr.state} — {addr.pincode}</p>
                      <p className={styles.addrPhone}>📞 {addr.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Account Deletion Zone */}
        <div className={styles.dangerZone}>
          <h2 className={styles.dangerTitle}>Danger Zone</h2>
          {profile.deletionRequestedAt ? (
            <div className={styles.deletionPending}>
              <p className={styles.deletionPendingText}>
                ⚠️ Your account is scheduled for deletion on{" "}
                <strong>
                  {new Date(new Date(profile.deletionRequestedAt).getTime() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </strong>
                . Until then, your data is preserved.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={cancelAccountDeletion}
                disabled={cancellingDel}
              >
                {cancellingDel ? "Restoring…" : "Cancel Deletion & Restore Account"}
              </Button>
            </div>
          ) : (
            <div className={styles.deleteAccountRow}>
              <div>
                <p className={styles.deleteAccountDesc}>
                  Permanently delete your account and all associated data. You will have a <strong>60-day window</strong> to restore it before all personal data is anonymised. Pending orders will still be fulfilled.
                </p>
              </div>
              <Button type="button" variant="ghost" className={styles.deleteAccountBtn} onClick={() => setDeleteModal(true)}>
                Delete My Account
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      <Modal isOpen={addrModal} onClose={() => setAddrModal(false)} title="Add New Address">
        <form onSubmit={addAddress} className={styles.modalForm}>
          <Input label="Label (optional)" value={addrForm.label} onChange={setField("label")} placeholder="Home / Office" />
          <div className={styles.row}>
            <Input label="Full Name *" value={addrForm.name} onChange={setField("name")} required />
            <Input label="Phone *" value={addrForm.phone} onChange={setField("phone")} required />
          </div>
          <Input label="Address Line 1 *" value={addrForm.line1} onChange={setField("line1")} placeholder="House/Flat No, Street" required />
          <Input label="Address Line 2" value={addrForm.line2} onChange={setField("line2")} placeholder="Area, Landmark" />
          <div className={styles.row}>
            <Input label="City *" value={addrForm.city} onChange={setField("city")} required />
            <Input label="State *" value={addrForm.state} onChange={setField("state")} required />
          </div>
          <Input label="Pincode *" value={addrForm.pincode} onChange={setField("pincode")} required />
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm((p) => ({ ...p, isDefault: e.target.checked }))} />
            Set as default address
          </label>
          <div className={styles.modalFooter}>
            <Button type="button" variant="ghost" onClick={() => setAddrModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={savingAddr}>{savingAddr ? "Saving…" : "Add Address"}</Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={pwModal} onClose={() => setPwModal(false)} title="Change Password">
        <form onSubmit={changePassword} className={styles.modalForm}>
          {(["current", "newPw", "confirm"] as const).map((field) => (
            <div key={field} style={{ position: "relative" }}>
              <Input
                label={field === "current" ? "Current Password *" : field === "newPw" ? "New Password *" : "Confirm Password *"}
                type={showPwFields[field] ? "text" : "password"}
                value={pw[field]}
                onChange={(e) => setPw((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={field === "newPw" ? "Min 8 characters" : ""}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwFields(p => ({ ...p, [field]: !p[field] }))}
                style={{
                  position: "absolute", right: 12, bottom: 13,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-secondary, #888)", padding: 4, display: "flex", alignItems: "center",
                }}
                tabIndex={-1}
              >
                <span className="material-icons" style={{ fontSize: 20 }}>
                  {showPwFields[field] ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          ))}
          <div className={styles.modalFooter}>
            <Button type="button" variant="ghost" onClick={() => setPwModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={savingPw}>{savingPw ? "Saving…" : "Change Password"}</Button>
          </div>
        </form>
      </Modal>

      {/* Account Deletion Confirm Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account">
        <div className={styles.modalForm}>
          <p style={{ marginBottom: 16, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
            Are you sure you want to delete your account? Your account will be <strong>deactivated immediately</strong> and permanently deleted after <strong>60 days</strong>.
          </p>
          <p style={{ marginBottom: 20, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
            You can restore it anytime within 60 days by logging back in. After 60 days, all your personal data will be anonymised and cannot be recovered.
          </p>
          <div className={styles.modalFooter}>
            <Button type="button" variant="ghost" onClick={() => setDeleteModal(false)}>Keep My Account</Button>
            <Button
              type="button"
              variant="ghost"
              className={styles.deleteAccountBtn}
              disabled={deletingAcct}
              onClick={requestAccountDeletion}
            >
              {deletingAcct ? "Scheduling…" : "Yes, Delete My Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
