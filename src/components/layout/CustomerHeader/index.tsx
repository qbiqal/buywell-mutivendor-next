"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./CustomerHeader.module.css";
import { useCart } from "@/components/shop/Cart/CartContext";
import { LogoIcon, LeafLogo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { label: "Shop",   href: "/shop" },
  { label: "Blog",   href: "/blog" },
  { label: "About",  href: "/#promise" },
];

interface CustomerHeaderProps {
  user?: { firstName: string; email: string; role: string } | null;
}

export function CustomerHeader({ user }: CustomerHeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { itemCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className={[styles.header, scrolled ? styles.scrolled : ""].join(" ")}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <LogoIcon size={36} />
          <span>APRAS <span className={styles.logoAccent}>Naturals</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={[styles.navLink, pathname.startsWith(l.href) ? styles.active : ""].join(" ")}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className={styles.actions}>
          {/* Cart */}
          <Link href="/checkout" className={styles.cartBtn} aria-label="Cart">
            <span className={styles.cartIcon}>🛒</span>
            {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </Link>

          {user ? (
            <div className={styles.userMenu}>
              <button className={styles.userBtn}>
                <div className={styles.avatar}>{user.firstName[0].toUpperCase()}</div>
                <span className={styles.userName}>{user.firstName}</span>
                <span className={styles.chevron}>▾</span>
              </button>
              <div className={styles.dropdown}>
                <Link href="/orders" className={styles.dropdownItem}>📦 My Orders</Link>
                <Link href="/profile" className={styles.dropdownItem}>👤 Profile</Link>
                {user.role === "admin" && (
                  <Link href="/admin/dashboard" className={styles.dropdownItem}>⚙️ Admin Panel</Link>
                )}
                <div className={styles.dropdownDivider} />
                <button onClick={handleLogout} className={[styles.dropdownItem, styles.logoutBtn].join(" ")}>
                  🚪 Logout
                </button>
              </div>
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
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/orders" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>My Orders</Link>
              <Link href="/profile" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Profile</Link>
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
  );
}
