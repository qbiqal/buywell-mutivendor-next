"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./CustomerHeader.module.css";
import { LogoIcon, LeafLogo } from "@/components/ui/Logo";

export interface PublicNavItem {
  label: string;
  href: string;
}

const NAV_LINKS: PublicNavItem[] = [
  { label: "Shop",   href: "/shop" },
  { label: "Blog",   href: "/blog" },
  { label: "About",  href: "/#promise" },
];

interface CustomerHeaderProps {
  user?: { firstName: string; email: string; role: string } | null;
  navLinks?: PublicNavItem[];
  ecommerceEnabled?: boolean;
  cartSlot?: React.ReactNode;
}

export function CustomerHeader({ user, navLinks = NAV_LINKS, ecommerceEnabled = true, cartSlot = null }: CustomerHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
    <header className={[styles.header, scrolled ? styles.scrolled : ""].join(" ")}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <LogoIcon size={36} />
          <span>APRAS <span className={styles.logoAccent}>Naturals</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={[styles.navLink, pathname.startsWith(l.href) ? styles.active : ""].join(" ")}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className={styles.actions}>
          {ecommerceEnabled && cartSlot}

          {user ? (
            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                className={styles.userBtn}
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
              >
                <div className={styles.avatar}>{user.firstName[0].toUpperCase()}</div>
                <span className={styles.userName}>{user.firstName}</span>
                <span className={styles.chevron}>{dropdownOpen ? "▴" : "▾"}</span>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdown}>
                  {ecommerceEnabled && (
                    <>
                      <Link href="/orders" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>📦 My Orders</Link>
                      <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>👤 Profile</Link>
                    </>
                  )}
                  <Link href="/notifications" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>🔔 Notifications</Link>
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>⚙️ Admin Panel</Link>
                  )}
                  <div className={styles.dropdownDivider} />
                  <button onClick={handleLogout} className={[styles.dropdownItem, styles.logoutBtn].join(" ")}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authBtns}>
              <Link href="/login" className={styles.loginBtn}>Login</Link>
              <Link href="/register" className={styles.registerBtn}>Get Started</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className={styles.mobileMenu} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={styles.mobileDrawer}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              {ecommerceEnabled && (
                <>
                  <Link href="/orders" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>My Orders</Link>
                  <Link href="/profile" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Profile</Link>
                </>
              )}
              <Link href="/notifications" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Notifications</Link>
              <button onClick={handleLogout} className={styles.mobileLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </header>

    </>
  );
}
